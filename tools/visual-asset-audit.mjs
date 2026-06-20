import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inflateSync } from "node:zlib";

const visualPath = resolve("data/visual_assets.json");
const gatesPath = resolve("data/visual_asset_quality_gates.json");
const reportPath = resolve("artifacts/visual-asset-audit/report.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readPng(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 33 || buffer.slice(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${path} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString("ascii");
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      if (bitDepth !== 8 || colorType !== 6) throw new Error(`${path} must be 8-bit RGBA PNG`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = width * 4;
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (rowBytes + 1);
    const filter = raw[rawOffset];
    if (filter !== 0) throw new Error(`${path} uses unsupported PNG filter ${filter}; regenerate with tools/build-visual-assets.mjs`);
    raw.subarray(rawOffset + 1, rawOffset + 1 + rowBytes).copy?.(pixels, y * rowBytes);
    if (!raw.subarray(rawOffset + 1, rawOffset + 1 + rowBytes).copy) {
      pixels.set(raw.subarray(rawOffset + 1, rawOffset + 1 + rowBytes), y * rowBytes);
    }
  }

  return { width, height, pixels };
}

function itemIndex(item) {
  if (Number.isInteger(item.index)) return item.index;
  if (Number.isInteger(item.frame)) return item.frame;
  return 0;
}

function inspectCell(image, atlas, item) {
  const cell = atlas.cell;
  const index = itemIndex(item);
  const startX = index * cell;
  const startY = (item.row ?? 0) * cell;
  const endX = Math.min(startX + cell, image.width);
  const endY = Math.min(startY + cell, image.height);
  const colors = new Set();
  let opaque = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const p = (y * image.width + x) * 4;
      const a = image.pixels[p + 3];
      if (a <= 8) continue;
      opaque += 1;
      colors.add(`${image.pixels[p]},${image.pixels[p + 1]},${image.pixels[p + 2]},${a}`);
      minX = Math.min(minX, x - startX);
      minY = Math.min(minY, y - startY);
      maxX = Math.max(maxX, x - startX);
      maxY = Math.max(maxY, y - startY);
    }
  }

  const total = cell * cell;
  const boundsWidth = maxX >= minX ? maxX - minX + 1 : 0;
  const boundsHeight = maxY >= minY ? maxY - minY + 1 : 0;
  return {
    id: item.id,
    index,
    coverage: Number((opaque / total).toFixed(4)),
    distinctColors: colors.size,
    boundsWidth,
    boundsHeight,
  };
}

function gateFor(gates, atlasId) {
  return { ...gates.defaults, ...(gates.atlases?.[atlasId] ?? {}) };
}

function inspectAtlas(atlas, gates) {
  const image = readPng(resolve("src/snapshot", atlas.file));
  const gate = gateFor(gates, atlas.id);
  const failures = [];
  const cells = atlas.items.map((item) => {
    const cell = inspectCell(image, atlas, item);
    if (cell.coverage < gate.minCoverage) failures.push(`${atlas.id}/${cell.id}: coverage ${cell.coverage} < ${gate.minCoverage}`);
    if (cell.coverage > gate.maxCoverage) failures.push(`${atlas.id}/${cell.id}: coverage ${cell.coverage} > ${gate.maxCoverage}`);
    if (cell.distinctColors < gate.minDistinctColors) failures.push(`${atlas.id}/${cell.id}: colors ${cell.distinctColors} < ${gate.minDistinctColors}`);
    if (cell.boundsWidth < gate.minBoundsWidth) failures.push(`${atlas.id}/${cell.id}: width ${cell.boundsWidth} < ${gate.minBoundsWidth}`);
    if (cell.boundsHeight < gate.minBoundsHeight) failures.push(`${atlas.id}/${cell.id}: height ${cell.boundsHeight} < ${gate.minBoundsHeight}`);
    return cell;
  });

  const summary = {
    id: atlas.id,
    file: atlas.file,
    itemCount: atlas.items.length,
    gate,
    minCoverage: Math.min(...cells.map((cell) => cell.coverage)),
    maxCoverage: Math.max(...cells.map((cell) => cell.coverage)),
    minDistinctColors: Math.min(...cells.map((cell) => cell.distinctColors)),
    maxDistinctColors: Math.max(...cells.map((cell) => cell.distinctColors)),
    minBoundsWidth: Math.min(...cells.map((cell) => cell.boundsWidth)),
    minBoundsHeight: Math.min(...cells.map((cell) => cell.boundsHeight)),
    failures,
  };
  return { summary, cells };
}

const visual = readJson(visualPath);
const gates = readJson(gatesPath);
const atlasReports = visual.atlases.map((atlas) => inspectAtlas(atlas, gates));
const failures = atlasReports.flatMap((atlasReport) => atlasReport.summary.failures);
const report = {
  generatedAt: new Date().toISOString(),
  gatesVersion: gates.version,
  atlases: atlasReports.map((atlasReport) => atlasReport.summary),
  failures,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(JSON.stringify({ failures: failures.slice(0, 60) }, null, 2));
  console.error(`VISUAL_ASSET_AUDIT_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(
  `VISUAL_ASSET_AUDIT_OK atlases=${report.atlases.length} cells=${atlasReports.reduce((sum, atlasReport) => sum + atlasReport.cells.length, 0)} report=${reportPath}`,
);
