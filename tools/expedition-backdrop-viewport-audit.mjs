import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inflateSync } from "node:zlib";

const visualPath = resolve("data/visual_assets.json");
const appPath = resolve("src/react/App.jsx");
const smokeCapturePath = resolve("artifacts/visual-asset-smoke/expedition.png");
const reportPath = resolve("artifacts/expedition-backdrop-qa/viewport-audit.json");

const expectedStepPx = 80;
const expectedTileCount = 10;
const expectedStagesPerTile = 25;
const representativeArena = {
  help: "대표 모바일 원정대 arena CSS 크기. 한 tile 안 이동량이 이 렌더 폭을 넘으면 repeat-x가 플레이 중 드러날 수 있다.",
  width: 360,
  height: 234,
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function numberConstant(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9]+)\\s*;`));
  return match ? Number(match[1]) : null;
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
    pixels.set(raw.subarray(rawOffset + 1, rawOffset + 1 + rowBytes), y * rowBytes);
  }
  return { width, height, pixels };
}

function signature(image) {
  const cols = 32;
  const rows = 8;
  const values = [];
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const x0 = Math.floor((gx * image.width) / cols);
      const x1 = Math.floor(((gx + 1) * image.width) / cols);
      const y0 = Math.floor((gy * image.height) / rows);
      const y1 = Math.floor(((gy + 1) * image.height) / rows);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 8) {
        for (let x = x0; x < x1; x += 8) {
          const index = (y * image.width + x) * 4;
          r += image.pixels[index];
          g += image.pixels[index + 1];
          b += image.pixels[index + 2];
          count += 1;
        }
      }
      values.push(r / count, g / count, b / count);
    }
  }
  return values;
}

function signatureDiff(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index] - b[index]);
  return sum / Math.max(1, a.length);
}

const failures = [];
const warnings = [];
const visual = readJson(visualPath);
const appSource = readFileSync(appPath, "utf8");
const runtime = {
  stageStepPx: numberConstant(appSource, "EXPEDITION_STAGE_BACKDROP_STEP_PX"),
  tileCount: numberConstant(appSource, "EXPEDITION_BACKDROP_TILE_COUNT"),
  stagesPerTile: numberConstant(appSource, "EXPEDITION_BACKDROP_STAGES_PER_TILE"),
};

if (runtime.stageStepPx !== expectedStepPx) failures.push(`EXPEDITION_STAGE_BACKDROP_STEP_PX must be ${expectedStepPx}, got ${runtime.stageStepPx}`);
if (runtime.tileCount !== expectedTileCount) failures.push(`EXPEDITION_BACKDROP_TILE_COUNT must be ${expectedTileCount}, got ${runtime.tileCount}`);
if (runtime.stagesPerTile !== expectedStagesPerTile) failures.push(`EXPEDITION_BACKDROP_STAGES_PER_TILE must be ${expectedStagesPerTile}, got ${runtime.stagesPerTile}`);

const expeditionBackdrops = visual.backgrounds?.find((background) => background.id === "expeditionBackdrops");
if (!expeditionBackdrops) failures.push("expeditionBackdrops metadata is missing");

const chapters = [];
if (expeditionBackdrops) {
  const renderedTileWidth = expeditionBackdrops.width * (representativeArena.height / expeditionBackdrops.rowHeight);
  const maxTravelWithinTile = (expectedStagesPerTile - 1) * expectedStepPx;
  const repeatSafetyLimit = renderedTileWidth * 0.92;
  if (maxTravelWithinTile > repeatSafetyLimit) {
    failures.push(`one tile travel ${maxTravelWithinTile}px exceeds representative rendered width safety ${repeatSafetyLimit.toFixed(1)}px`);
  }
  if ((expeditionBackdrops.items?.length ?? 0) !== expectedTileCount) failures.push(`expected ${expectedTileCount} expedition backdrop chapters, got ${expeditionBackdrops.items?.length ?? 0}`);

  for (const item of expeditionBackdrops.items ?? []) {
    if (item.tileCount !== expectedTileCount) failures.push(`${item.backdrop} tileCount must be ${expectedTileCount}, got ${item.tileCount}`);
    if (item.stagesPerTile !== expectedStagesPerTile) failures.push(`${item.backdrop} stagesPerTile must be ${expectedStagesPerTile}, got ${item.stagesPerTile}`);
    if (item.sourceMode !== "chapter-panorama") failures.push(`${item.backdrop} sourceMode must be chapter-panorama`);
    const diffs = [];
    let previous = null;
    for (const tile of item.tiles ?? []) {
      if (tile.derived !== false) failures.push(`${item.backdrop} tile ${tile.index} must not be derived`);
      if (tile.sourceMode !== "chapter-panorama") failures.push(`${item.backdrop} tile ${tile.index} sourceMode must be chapter-panorama`);
      const path = resolve("src/snapshot", tile.file);
      if (!existsSync(path)) {
        failures.push(`${item.backdrop} tile ${tile.index} file missing: ${tile.file}`);
        continue;
      }
      const tileSignature = signature(readPng(path));
      if (previous) diffs.push(signatureDiff(previous, tileSignature));
      previous = tileSignature;
    }
    const minAdjacentDiff = diffs.length ? Math.min(...diffs) : 0;
    const avgAdjacentDiff = diffs.length ? diffs.reduce((sum, value) => sum + value, 0) / diffs.length : 0;
    if (minAdjacentDiff < 6.5) failures.push(`${item.backdrop} adjacent tile diversity too low: min ${minAdjacentDiff.toFixed(2)}`);
    if (avgAdjacentDiff < 9) failures.push(`${item.backdrop} adjacent tile diversity too low: avg ${avgAdjacentDiff.toFixed(2)}`);
    chapters.push({
      backdrop: item.backdrop,
      tileCount: item.tiles?.length ?? 0,
      minAdjacentDiff: Number(minAdjacentDiff.toFixed(2)),
      avgAdjacentDiff: Number(avgAdjacentDiff.toFixed(2)),
    });
  }
}

if (!existsSync(smokeCapturePath)) {
  warnings.push("visual smoke capture is not present yet; run npm run visual:smoke for human screenshot review");
}

const report = {
  ok: failures.length === 0,
  runtime,
  expected: {
    stageStepPx: expectedStepPx,
    tileCount: expectedTileCount,
    stagesPerTile: expectedStagesPerTile,
  },
  representativeArena,
  chapters,
  smokeCapturePresent: existsSync(smokeCapturePath),
  failures,
  warnings,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`EXPEDITION_BACKDROP_VIEWPORT_AUDIT_FAILED failures=${failures.length} report=${reportPath}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`EXPEDITION_BACKDROP_VIEWPORT_AUDIT_OK chapters=${chapters.length} stageStep=${runtime.stageStepPx}px stagesPerTile=${runtime.stagesPerTile} report=${reportPath}`);
if (warnings.length > 0) console.warn(`EXPEDITION_BACKDROP_VIEWPORT_AUDIT_WARNINGS ${warnings.join(" | ")}`);
