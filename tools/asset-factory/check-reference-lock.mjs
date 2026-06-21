import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const lockPath = resolve("data/sprite_reference_lock.json");
const reportPath = resolve(process.argv[2] ?? "artifacts/visual-asset-samples/character-axis-report.json");

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`${label} is missing: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

const lockPayload = readJson(lockPath, "sprite reference lock");
const report = readJson(reportPath, "character axis report");
const activeLockId = lockPayload.activeLock;
const activeLock = lockPayload.locks?.[activeLockId];

if (!activeLock) {
  throw new Error(`active sprite reference lock is missing: ${activeLockId}`);
}

const rules = activeLock.characters ?? {};
const failures = [];
const rows = [];

for (const character of report.characters ?? []) {
  if (character.status !== "ok") {
    failures.push(`${character.id} status is ${character.status}`);
    continue;
  }
  if (character.direction !== "right") failures.push(`${character.id} must face right`);
  if ((character.poseDelta?.minimum ?? 0) < rules.minPoseDelta) {
    failures.push(`${character.id} pose delta too small: ${character.poseDelta?.minimum}`);
  }

  const metrics = character.metrics ?? [];
  const solidHeights = metrics.map((metric) => metric.solidHeight).filter(Number.isFinite);
  const solidWidths = metrics.map((metric) => metric.solidWidth).filter(Number.isFinite);
  const centerDeltas = metrics.map((metric) => Math.abs(metric.centerDelta ?? 999));
  const baselineDeltas = metrics.map((metric) => Math.abs(metric.baselineDelta ?? 999));
  const minSolidHeight = Math.min(...solidHeights);
  const maxSolidHeight = Math.max(...solidHeights);
  const minSolidWidth = Math.min(...solidWidths);
  const heightDrift = maxSolidHeight - minSolidHeight;
  const maxCenterDelta = Math.max(...centerDeltas);
  const maxBaselineDelta = Math.max(...baselineDeltas);

  if (minSolidHeight < rules.minSolidHeight) {
    failures.push(`${character.id} full-body height below lock: ${minSolidHeight}px < ${rules.minSolidHeight}px`);
  }
  if (maxSolidHeight > rules.maxSolidHeight) {
    failures.push(`${character.id} full-body height above lock: ${maxSolidHeight}px > ${rules.maxSolidHeight}px`);
  }
  if (minSolidWidth < rules.minSolidWidth) {
    failures.push(`${character.id} width below lock: ${minSolidWidth}px < ${rules.minSolidWidth}px`);
  }
  if (heightDrift > rules.maxSolidHeightDrift) {
    failures.push(`${character.id} frame height drift above lock: ${heightDrift}px > ${rules.maxSolidHeightDrift}px`);
  }
  if (maxCenterDelta > rules.maxCenterDelta) {
    failures.push(`${character.id} center drift above lock: ${maxCenterDelta}px > ${rules.maxCenterDelta}px`);
  }
  if (maxBaselineDelta > rules.maxBaselineDelta) {
    failures.push(`${character.id} baseline drift above lock: ${maxBaselineDelta}px > ${rules.maxBaselineDelta}px`);
  }

  rows.push({
    id: character.id,
    minSolidHeight,
    maxSolidHeight,
    minSolidWidth,
    heightDrift,
    maxCenterDelta,
    maxBaselineDelta,
    minPoseDelta: character.poseDelta?.minimum ?? 0,
  });
}

const summary = {
  lock: activeLockId,
  reference: activeLock.reference,
  characters: rows.length,
  minSolidHeight: Math.min(...rows.map((row) => row.minSolidHeight)),
  maxSolidHeight: Math.max(...rows.map((row) => row.maxSolidHeight)),
  minSolidWidth: Math.min(...rows.map((row) => row.minSolidWidth)),
  maxHeightDrift: Math.max(...rows.map((row) => row.heightDrift)),
  worst: rows
    .slice()
    .sort((a, b) => a.minSolidHeight - b.minSolidHeight || b.heightDrift - a.heightDrift)
    .slice(0, 8),
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.error(`ASSET_FACTORY_REFERENCE_LOCK_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`ASSET_FACTORY_REFERENCE_LOCK_OK lock=${activeLockId} characters=${rows.length}`);
