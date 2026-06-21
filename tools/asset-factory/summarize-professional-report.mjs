import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("data/professional_sprite_manifest.json");
const reportPath = resolve(process.argv[2] ?? "artifacts/visual-asset-samples/professional-axis-report.json");

const failures = [];

function readJson(path, label) {
  if (!existsSync(path)) {
    failures.push(`${label} is missing: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const manifest = readJson(manifestPath, "professional sprite manifest");
const report = readJson(reportPath, "professional axis report");

if (!manifest || !report) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

const manifestItems = (manifest.families ?? []).flatMap((family) =>
  (family.items ?? []).flatMap((item) => {
    if (family.id === "companions") {
      return (item.genders ?? ["male", "female"]).map((gender) => `${family.id}:${item.id}:${gender}`);
    }
    return [`${family.id}:${item.id}:default`];
  }),
);
const expected = new Set(manifestItems);
const rows = report.items ?? [];
const minFrameDifference = manifest.minFrameDifference ?? report.minFrameDifference ?? 2.5;

for (const item of rows) {
  expected.delete(`${item.family}:${item.id}:${item.variant ?? "default"}`);
  if (item.status !== "ok") failures.push(`${item.family}/${item.id}/${item.variant ?? "default"} status is ${item.status}`);
  if (item.family === "companions" && item.direction !== "right") failures.push(`${item.id} companion must face right`);
  if (item.family === "expeditionEnemies" && item.direction !== "left") failures.push(`${item.id} enemy must face left`);
  if ((item.poseDelta?.minimum ?? 0) < minFrameDifference) failures.push(`${item.id} pose delta too small: ${item.poseDelta?.minimum}`);

  const metrics = item.metrics ?? [];
  const centerDeltas = metrics.map((metric) => Math.abs(metric.centerDelta ?? 999));
  const baselineDeltas = metrics.map((metric) => Math.abs(metric.baselineDelta ?? 999));
  const solidHeights = metrics.map((metric) => metric.solidHeight).filter(Number.isFinite);
  const solidWidths = metrics.map((metric) => metric.solidWidth).filter(Number.isFinite);
  const bboxHeights = metrics.map((metric) => metric.bboxHeight).filter(Number.isFinite);
  const bboxWidths = metrics.map((metric) => metric.bboxWidth).filter(Number.isFinite);
  const topMargins = metrics.map((metric) => metric.topMargin).filter(Number.isFinite);
  const bottomMargins = metrics.map((metric) => metric.bottomMargin).filter(Number.isFinite);
  const minSolidHeight = item.family === "companions" ? 120 : 96;
  const minSolidWidth = item.family === "companions" ? 90 : 64;
  const maxSolidHeightDrift = item.family === "companions" ? 12 : 10;
  const maxSolidWidthDrift = item.family === "companions" ? 30 : 24;
  const maxBboxHeightDrift = item.family === "companions" ? 14 : 12;
  const maxBboxWidthDrift = item.family === "companions" ? 34 : 28;

  if (Math.max(...centerDeltas) > 1) failures.push(`${item.id} center drift too high`);
  if (Math.max(...baselineDeltas) !== 0) failures.push(`${item.id} baseline drift too high`);
  if (Math.min(...solidHeights) < minSolidHeight) failures.push(`${item.id} solid height too small`);
  if (Math.min(...solidWidths) < minSolidWidth) failures.push(`${item.id} solid width too small`);
  if (solidHeights.length && Math.max(...solidHeights) - Math.min(...solidHeights) > maxSolidHeightDrift) failures.push(`${item.id} solid height drift too high`);
  if (solidWidths.length && Math.max(...solidWidths) - Math.min(...solidWidths) > maxSolidWidthDrift) failures.push(`${item.id} solid width drift too high`);
  if (bboxHeights.length && Math.max(...bboxHeights) - Math.min(...bboxHeights) > maxBboxHeightDrift) failures.push(`${item.id} bbox height drift too high`);
  if (bboxWidths.length && Math.max(...bboxWidths) - Math.min(...bboxWidths) > maxBboxWidthDrift) failures.push(`${item.id} bbox width drift too high`);
  if (topMargins.length && Math.min(...topMargins) < 8) failures.push(`${item.id} top margin too small`);
  if (bottomMargins.length && Math.min(...bottomMargins) < 8) failures.push(`${item.id} bottom margin too small`);
}

for (const missing of expected) failures.push(`${missing} missing report entry`);

const byFamily = new Map();
for (const item of rows) {
  const familyRows = byFamily.get(item.family) ?? [];
  familyRows.push(item);
  byFamily.set(item.family, familyRows);
}

function familySummary(items) {
  return {
    count: items.length,
    minPoseDelta: Math.min(...items.map((item) => item.poseDelta?.minimum ?? 0)),
    maxCenterDelta: Math.max(...items.flatMap((item) => (item.metrics ?? []).map((metric) => Math.abs(metric.centerDelta ?? 999)))),
    maxBaselineDelta: Math.max(...items.flatMap((item) => (item.metrics ?? []).map((metric) => Math.abs(metric.baselineDelta ?? 999)))),
    minSolidHeight: Math.min(...items.flatMap((item) => (item.metrics ?? []).map((metric) => metric.solidHeight).filter(Number.isFinite))),
    minSolidWidth: Math.min(...items.flatMap((item) => (item.metrics ?? []).map((metric) => metric.solidWidth).filter(Number.isFinite))),
    maxSolidHeightDrift: Math.max(
      ...items.map((item) => {
        const values = (item.metrics ?? []).map((metric) => metric.solidHeight).filter(Number.isFinite);
        return values.length ? Math.max(...values) - Math.min(...values) : 999;
      }),
    ),
    minTopMargin: Math.min(...items.flatMap((item) => (item.metrics ?? []).map((metric) => metric.topMargin).filter(Number.isFinite))),
    minBottomMargin: Math.min(...items.flatMap((item) => (item.metrics ?? []).map((metric) => metric.bottomMargin).filter(Number.isFinite))),
  };
}

const summary = {
  items: rows.length,
  expectedItems: manifestItems.length,
  families: Object.fromEntries([...byFamily.entries()].map(([family, items]) => [family, familySummary(items)])),
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.error(`ASSET_FACTORY_PROFESSIONAL_REPORT_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`ASSET_FACTORY_PROFESSIONAL_REPORT_OK items=${rows.length}`);
