import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import {
  assetTokenPrefix,
  classifyDataTable,
  pngInfo,
  readLiteral,
  scriptToken,
  sha256,
  snapshotSourceRoot,
  styleToken,
} from "./snapshot-utils.mjs";

const sourcePath = resolve(process.argv[2] || "reference/Student-Idle-RPG-mobile-3.html");
const sourceLabel = relative(process.cwd(), sourcePath) || "index.html";
const sourceRoot = resolve(snapshotSourceRoot);
const assetsRoot = resolve(sourceRoot, "assets");
const dataRoot = resolve("data");

function findInlineBlock(html, openPattern, closeTag, label) {
  const openMatch = html.match(openPattern);
  if (!openMatch || openMatch.index === undefined) {
    throw new Error(`${label} block not found`);
  }
  const contentStart = openMatch.index + openMatch[0].length;
  const contentEnd = html.indexOf(closeTag, contentStart);
  if (contentEnd === -1) {
    throw new Error(`${label} close tag not found`);
  }
  return { contentStart, contentEnd };
}

function extractDataTables(script) {
  mkdirSync(dataRoot, { recursive: true });

  const written = [];
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
          writeFileSync(resolve(dataRoot, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
          written.push({ fileName, count: value.length });
        }
      }
    } catch {
      // Ignore runtime JSON.parse calls that are not static content tables.
    }

    position = literal.end;
  }

  return written;
}

function extractAssets(parts) {
  rmSync(assetsRoot, { recursive: true, force: true });
  mkdirSync(assetsRoot, { recursive: true });

  const dataUriPattern = /data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/g;
  const assets = [];
  const seen = new Map();

  function replaceDataUris(text) {
    return text.replace(dataUriPattern, (dataUri, type, base64) => {
      if (!seen.has(dataUri)) {
        const index = assets.length + 1;
        const extension = type === "jpeg" ? "jpg" : type;
        const token = `${assetTokenPrefix}${String(index).padStart(3, "0")}__`;
        const fileName = `asset-${String(index).padStart(3, "0")}.${extension}`;
        const buffer = Buffer.from(base64, "base64");
        writeFileSync(resolve(assetsRoot, fileName), buffer);
        const asset = {
          token,
          file: `assets/${fileName}`,
          mime: `image/${type}`,
          bytes: buffer.length,
          sha256: sha256(buffer),
          ...pngInfo(buffer),
        };
        assets.push(asset);
        seen.set(dataUri, asset);
      }
      return seen.get(dataUri).token;
    });
  }

  return {
    assets,
    template: replaceDataUris(parts.template),
    styles: replaceDataUris(parts.styles),
    script: replaceDataUris(parts.script),
  };
}

const html = readFileSync(sourcePath, "utf8");
const styleBlock = findInlineBlock(html, /<style>\s*/i, "</style>", "style");
const scriptBlock = findInlineBlock(html, /<script\s+type=["']module["']>\s*/i, "</script>", "module script");

const styles = html.slice(styleBlock.contentStart, styleBlock.contentEnd);
const script = html.slice(scriptBlock.contentStart, scriptBlock.contentEnd);
const templateWithStyleToken = `${html.slice(0, styleBlock.contentStart)}${styleToken}${html.slice(styleBlock.contentEnd)}`;
const adjustedScriptBlock = findInlineBlock(templateWithStyleToken, /<script\s+type=["']module["']>\s*/i, "</script>", "module script");
const template = `${templateWithStyleToken.slice(0, adjustedScriptBlock.contentStart)}${scriptToken}${templateWithStyleToken.slice(adjustedScriptBlock.contentEnd)}`;

rmSync(sourceRoot, { recursive: true, force: true });
mkdirSync(sourceRoot, { recursive: true });

const extracted = extractAssets({ template, styles, script });
const dataTables = extractDataTables(script);

writeFileSync(resolve(sourceRoot, "index.template.html"), extracted.template, "utf8");
writeFileSync(resolve(sourceRoot, "styles.css"), `${extracted.styles}\n`, "utf8");
writeFileSync(resolve(sourceRoot, "app.bundle.js"), `${extracted.script}\n`, "utf8");

const manifest = {
  version: 1,
  source: sourceLabel,
  sourceSha256: sha256(html),
  bytes: Buffer.byteLength(html),
  styleChars: styles.length,
  scriptChars: script.length,
  assets: extracted.assets,
  dataTables,
};

const manifestPath = resolve(sourceRoot, "manifest.json");
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `SNAPSHOT_EXTRACT_OK source=${sourcePath} assets=${extracted.assets.length} data=${dataTables.length} sourceRoot=${snapshotSourceRoot}`,
);
