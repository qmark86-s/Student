import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assetTokenPrefix,
  classifyDataTable,
  dataTables,
  readLiteral,
  scriptToken,
  sha256,
  snapshotSourceRoot,
  styleToken,
} from "./snapshot-utils.mjs";

function parseArgs(argv) {
  return {
    distOnly: argv.includes("--dist-only"),
    noRoot: argv.includes("--no-root"),
    noShare: argv.includes("--no-share"),
    // 기본: dist(APK webDir)는 자산을 외부 파일로 분리한다.
    // --inline-dist 를 주면 예전처럼 dist도 단일 파일(base64 인라인)로 만든다.
    inlineDist: argv.includes("--inline-dist"),
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readSnapshotStyles() {
  const baseStyles = readFileSync(resolve(snapshotSourceRoot, "styles.css"), "utf8").replace(/\n$/, "");
  const visualStylesPath = resolve(snapshotSourceRoot, "visual-assets.css");
  if (!existsSync(visualStylesPath)) return baseStyles;
  const visualStyles = readFileSync(visualStylesPath, "utf8").replace(/\n$/, "");
  return `${baseStyles}\n${visualStyles}`;
}

function injectDataTables(script) {
  const replacements = [];
  const injected = [];
  let position = 0;

  while ((position = script.indexOf("JSON.parse(", position)) !== -1) {
    let literalStart = position + "JSON.parse(".length;
    while (/\s/.test(script[literalStart] || "")) literalStart += 1;

    const literal = readLiteral(script, literalStart);
    if (!literal) {
      position += "JSON.parse(".length;
      continue;
    }

    try {
      const value = JSON.parse(literal.value);
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
        const fileName = classifyDataTable(Object.keys(value[0]));
        if (fileName) {
          const table = readJson(resolve("data", fileName));
          const jsonText = JSON.stringify(table);
          replacements.push({
            start: literalStart,
            end: literal.end,
            replacement: JSON.stringify(jsonText),
          });
          injected.push({ fileName, count: table.length });
        }
      }
    } catch {
      // Ignore runtime JSON.parse calls that are not static content tables.
    }

    position = literal.end;
  }

  let output = script;
  for (const replacement of replacements.reverse()) {
    output = `${output.slice(0, replacement.start)}${replacement.replacement}${output.slice(replacement.end)}`;
  }

  const injectedNames = new Set(injected.map((item) => item.fileName));
  const missing = dataTables.filter((fileName) => !injectedNames.has(fileName));
  if (missing.length > 0) {
    throw new Error(`Data tables were not injected: ${missing.join(", ")}`);
  }

  return { script: output, injected };
}

// 빌드 시점에 data/*.json 을 번들에 주입할 config 토큰.
// app.bundle.js 에는 JSON.parse("<token>") 형태의 placeholder만 들어 있고,
// 실제 데이터는 여기서 채운다. (tools/apply-battle-road-patch.mjs 참고)
const configTokens = [
  { token: "__BATTLE_ROAD_CONFIG_JSON__", file: "battle_road_config.json" },
  { token: "__CURRICULUM_ATTACK_VFX_JSON__", file: "curriculum_attack_vfx.json" },
];

function injectConfigTokens(script) {
  let output = script;
  const injected = [];
  for (const { token, file } of configTokens) {
    const quoted = `"${token}"`;
    const count = output.split(quoted).length - 1;
    if (count === 0) {
      throw new Error(`Config token ${token} not found in bundle. Run \`npm run patch:battle-road\` first.`);
    }
    const data = readJson(resolve("data", file));
    // JSON.parse("<escaped json>") 에 넣을 수 있도록 JSON 텍스트를 JS 문자열 리터럴로 두 번 직렬화한다.
    const literal = JSON.stringify(JSON.stringify(data));
    output = output.split(quoted).join(literal);
    injected.push({ file, token, count, bytes: Buffer.byteLength(literal) });
  }
  return { script: output, injected };
}

// mode="inline": 토큰을 base64 data URI 로 치환(단일 파일 빌드).
// mode="external": 토큰을 상대 경로 URL(예: assets/visual-companions.png)로 치환.
//   외부 모드 산출물은 copyExternalAssets 로 자산 파일을 함께 배치해야 한다.
function replaceAssetTokens(parts, manifest, mode) {
  const assetResults = [];
  const output = { ...parts };

  for (const asset of manifest.assets || []) {
    const bytes = readFileSync(resolve(snapshotSourceRoot, asset.file));
    const replacement =
      mode === "external"
        ? asset.file // dist/index.html 기준 상대 경로 (dist/assets/... 로 복사됨)
        : `data:${asset.mime};base64,${bytes.toString("base64")}`;
    let replacements = 0;

    for (const key of Object.keys(output)) {
      const before = output[key];
      output[key] = before.split(asset.token).join(replacement);
      replacements += before.split(asset.token).length - 1;
    }

    assetResults.push({
      token: asset.token,
      file: asset.file,
      bytes: bytes.length,
      sha256: sha256(bytes),
      replacements,
    });
  }

  const unresolved = Object.values(output).flatMap((text) => text.match(new RegExp(`${assetTokenPrefix}\\d{3}__`, "g")) || []);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved asset tokens: ${[...new Set(unresolved)].join(", ")}`);
  }

  return { parts: output, assetResults };
}

function assembleHtml(parts) {
  return parts.template
    .replace(styleToken, () => parts.styles)
    .replace(scriptToken, () => parts.script);
}

// 외부 자산 모드에서 실제로 참조된(replacements>0) 자산 파일을 destRoot/assets/ 로 복사한다.
// destRoot/assets 는 통째로 새로 만들어 stale 자산이 남지 않게 한다.
function copyExternalAssets(destRoot, manifest, assetResults) {
  const assetsDir = resolve(destRoot, "assets");
  rmSync(assetsDir, { recursive: true, force: true });
  const copied = [];
  for (const asset of manifest.assets || []) {
    const result = assetResults.find((entry) => entry.token === asset.token);
    if (!result || result.replacements === 0) continue; // 참조되지 않는 자산은 APK에 싣지 않는다
    const source = resolve(snapshotSourceRoot, asset.file);
    const dest = resolve(destRoot, asset.file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(source, dest);
    copied.push({ file: asset.file, bytes: result.bytes });
  }
  return copied;
}

function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export async function buildSnapshot(options = {}) {
  const template = readFileSync(resolve(snapshotSourceRoot, "index.template.html"), "utf8");
  const styles = readSnapshotStyles();
  const sourceScript = readFileSync(resolve(snapshotSourceRoot, "app.bundle.js"), "utf8").replace(/\n$/, "");
  const manifest = readJson(resolve(snapshotSourceRoot, "manifest.json"));
  const args = { distOnly: false, noRoot: false, noShare: false, ...options };

  if (!template.includes(styleToken)) throw new Error(`Template is missing ${styleToken}`);
  if (!template.includes(scriptToken)) throw new Error(`Template is missing ${scriptToken}`);

  const injected = injectDataTables(sourceScript);
  const config = injectConfigTokens(injected.script);
  const baseParts = { template, styles, script: config.script };

  const outputs = [];

  // 1) 단일 파일 인라인 빌드 — root 실행본 + share 공유본 (base64 인라인, 자산 분리 없음)
  let inline = null;
  const needInline = (!args.distOnly && (!args.noRoot || !args.noShare)) || args.inlineDist;
  if (needInline) {
    const inlineAssets = replaceAssetTokens(baseParts, manifest, "inline");
    const inlineHtml = assembleHtml(inlineAssets.parts);
    inline = { html: inlineHtml, bytes: Buffer.byteLength(inlineHtml), sha256: sha256(inlineHtml), assets: inlineAssets.assetResults };
    if (!args.distOnly && !args.noRoot) {
      writeText(resolve("index.html"), inlineHtml);
      outputs.push("index.html");
    }
    if (!args.distOnly && !args.noShare) {
      writeText(resolve("share/Student-Idle-RPG-mobile.html"), inlineHtml);
      outputs.push("share/Student-Idle-RPG-mobile.html");
    }
  }

  // 2) APK webDir(dist) 빌드 — 기본은 외부 자산 분리, --inline-dist 면 인라인 재사용
  let dist;
  if (args.inlineDist) {
    writeText(resolve("dist/index.html"), inline.html);
    rmSync(resolve("dist/assets"), { recursive: true, force: true });
    dist = { mode: "inline", bytes: inline.bytes, sha256: inline.sha256, assets: inline.assets, copiedAssets: [] };
  } else {
    const externalAssets = replaceAssetTokens(baseParts, manifest, "external");
    const externalHtml = assembleHtml(externalAssets.parts);
    const copiedAssets = copyExternalAssets(resolve("dist"), manifest, externalAssets.assetResults);
    writeText(resolve("dist/index.html"), externalHtml);
    dist = {
      mode: "external",
      bytes: Buffer.byteLength(externalHtml),
      sha256: sha256(externalHtml),
      assets: externalAssets.assetResults,
      copiedAssets,
    };
  }
  outputs.push("dist/index.html");

  writeText(
    resolve("dist/build-metadata.json"),
    `${JSON.stringify(
      {
        source: snapshotSourceRoot,
        generatedAt: new Date().toISOString(),
        mode: dist.mode,
        bytes: dist.bytes,
        sha256: dist.sha256,
        assetCount: dist.copiedAssets.length,
        assetBytes: dist.copiedAssets.reduce((sum, item) => sum + item.bytes, 0),
      },
      null,
      2,
    )}\n`,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: snapshotSourceRoot,
    // 하위 호환: 최상위 bytes/sha256 은 APK 산출물(dist) 기준.
    bytes: dist.bytes,
    sha256: dist.sha256,
    outputs,
    injectedDataTables: injected.injected,
    injectedConfig: config.injected,
    inline: inline ? { bytes: inline.bytes, sha256: inline.sha256 } : null,
    dist: { mode: dist.mode, bytes: dist.bytes, sha256: dist.sha256, copiedAssets: dist.copiedAssets },
    assets: dist.assets,
  };

  writeText(resolve("artifacts/snapshot-build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const inlineNote = inline ? ` inline=${inline.bytes}` : "";
  const assetNote = dist.mode === "external" ? ` assets=${dist.copiedAssets.length}(${dist.copiedAssets.reduce((s, a) => s + a.bytes, 0)}B)` : "";
  console.log(`SNAPSHOT_BUILD_OK outputs=${outputs.join(",")} dist[${dist.mode}]=${dist.bytes}${inlineNote}${assetNote} sha256=${dist.sha256}`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildSnapshot(parseArgs(process.argv.slice(2)));
}
