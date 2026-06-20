import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("data/character_animation_manifest.json");
const reportPath = resolve(process.argv[2] ?? "artifacts/visual-asset-samples/character-axis-report.json");

const failures = [];

function readJson(path, label) {
  if (!existsSync(path)) {
    failures.push(`${label} is missing: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const manifest = readJson(manifestPath, "character manifest");
const report = readJson(reportPath, "character axis report");

if (!manifest || !report) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

const characters = manifest.characters ?? [];
const reportCharacters = report.characters ?? [];
const reportById = new Map(reportCharacters.map((character) => [character.id, character]));
const minFrameDifference = manifest.minFrameDifference ?? 2.5;
const maxCenterDelta = 1;
const maxBaselineDelta = 0;
const maxSolidHeightDrift = 3;
const minSolidHeight = 136;
const minSolidWidth = 45;

const rows = [];

for (const character of characters) {
  const item = reportById.get(character.id);
  if (!item) {
    failures.push(`${character.id} missing report entry`);
    continue;
  }
  if (character.direction !== "right") failures.push(`${character.id} must face right`);
  if (item.status !== "ok") failures.push(`${character.id} status is ${item.status}`);
  if ((item.poseDelta?.minimum ?? 0) < minFrameDifference) failures.push(`${character.id} pose delta too small: ${item.poseDelta?.minimum}`);

  const metrics = item.metrics ?? [];
  const centerDeltas = metrics.map((metric) => Math.abs(metric.centerDelta ?? 999));
  const baselineDeltas = metrics.map((metric) => Math.abs(metric.baselineDelta ?? 999));
  const solidHeights = metrics.map((metric) => metric.solidHeight).filter(Number.isFinite);
  const solidWidths = metrics.map((metric) => metric.solidWidth).filter(Number.isFinite);
  const solidHeightDrift = solidHeights.length ? Math.max(...solidHeights) - Math.min(...solidHeights) : 999;

  if (Math.max(...centerDeltas) > maxCenterDelta) failures.push(`${character.id} center drift too high`);
  if (Math.max(...baselineDeltas) !== maxBaselineDelta) failures.push(`${character.id} baseline drift too high`);
  if (solidHeightDrift > maxSolidHeightDrift) failures.push(`${character.id} solid height drift too high: ${solidHeights.join(",")}`);
  if (Math.min(...solidHeights) < minSolidHeight) failures.push(`${character.id} solid height too small`);
  if (Math.min(...solidWidths) < minSolidWidth) failures.push(`${character.id} solid width too small`);

  rows.push({
    id: character.id,
    gender: character.gender,
    gradeOrder: character.gradeOrder,
    sourceType: item.sourceType,
    minPoseDelta: item.poseDelta?.minimum ?? 0,
    maxCenterDelta: Math.max(...centerDeltas),
    maxBaselineDelta: Math.max(...baselineDeltas),
    solidHeightDrift,
    minSolidHeight: Math.min(...solidHeights),
    minSolidWidth: Math.min(...solidWidths),
  });
}

const worst = rows
  .slice()
  .sort((a, b) => b.solidHeightDrift - a.solidHeightDrift || a.minSolidHeight - b.minSolidHeight || a.minPoseDelta - b.minPoseDelta)
  .slice(0, 8);

const summary = {
  characters: rows.length,
  expectedCharacters: characters.length,
  reportCharacters: reportCharacters.length,
  minPoseDelta: Math.min(...rows.map((row) => row.minPoseDelta)),
  maxCenterDelta: Math.max(...rows.map((row) => row.maxCenterDelta)),
  maxBaselineDelta: Math.max(...rows.map((row) => row.maxBaselineDelta)),
  maxSolidHeightDrift: Math.max(...rows.map((row) => row.solidHeightDrift)),
  minSolidHeight: Math.min(...rows.map((row) => row.minSolidHeight)),
  minSolidWidth: Math.min(...rows.map((row) => row.minSolidWidth)),
  worst,
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.error(`ASSET_FACTORY_CHARACTER_REPORT_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`ASSET_FACTORY_CHARACTER_REPORT_OK characters=${rows.length}`);
