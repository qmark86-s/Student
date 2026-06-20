import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function replaceAssetTokens(parts, manifest) {
  const assetResults = [];
  const output = { ...parts };

  for (const asset of manifest.assets || []) {
    const bytes = readFileSync(resolve(snapshotSourceRoot, asset.file));
    const dataUri = `data:${asset.mime};base64,${bytes.toString("base64")}`;
    let replacements = 0;

    for (const key of Object.keys(output)) {
      const before = output[key];
      output[key] = before.split(asset.token).join(dataUri);
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
  const assets = replaceAssetTokens({ template, styles, script: injected.script }, manifest);
  const html = assets.parts.template
    .replace(styleToken, () => assets.parts.styles)
    .replace(scriptToken, () => assets.parts.script);
  const hash = sha256(html);
  const bytes = Buffer.byteLength(html);

  const outputs = [];
  if (!args.distOnly && !args.noRoot) {
    writeText(resolve("index.html"), html);
    outputs.push("index.html");
  }
  if (!args.distOnly && !args.noShare) {
    writeText(resolve("share/Student-Idle-RPG-mobile.html"), html);
    outputs.push("share/Student-Idle-RPG-mobile.html");
  }

  writeText(resolve("dist/index.html"), html);
  writeText(
    resolve("dist/build-metadata.json"),
    `${JSON.stringify(
      {
        source: snapshotSourceRoot,
        generatedAt: new Date().toISOString(),
        bytes,
        sha256: hash,
      },
      null,
      2,
    )}\n`,
  );
  outputs.push("dist/index.html");

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: snapshotSourceRoot,
    bytes,
    sha256: hash,
    outputs,
    injectedDataTables: injected.injected,
    assets: assets.assetResults,
  };

  writeText(resolve("artifacts/snapshot-build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`SNAPSHOT_BUILD_OK outputs=${outputs.join(",")} bytes=${bytes} sha256=${hash}`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildSnapshot(parseArgs(process.argv.slice(2)));
}
