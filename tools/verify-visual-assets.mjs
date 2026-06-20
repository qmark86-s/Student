import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pngInfo, sha256 } from "./snapshot-utils.mjs";

const manifest = JSON.parse(readFileSync(resolve("src/snapshot/manifest.json"), "utf8"));
const visual = JSON.parse(readFileSync(resolve("data/visual_assets.json"), "utf8"));
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const gradeVisuals = JSON.parse(readFileSync(resolve("data/grade_visuals.json"), "utf8"));
const stages = JSON.parse(readFileSync(resolve("data/expedition_stages.json"), "utf8"));
const bosses = JSON.parse(readFileSync(resolve("data/expedition_bosses.json"), "utf8"));
const css = readFileSync(resolve("src/snapshot/visual-assets.css"), "utf8");
const characterManifestPath = resolve("data/character_animation_manifest.json");
const characterAxisReportPath = resolve("artifacts/visual-asset-samples/character-axis-report.json");

const failures = [];
const managedTokens = ["__STUDENT_ASSET_002__", "__STUDENT_ASSET_003__", "__STUDENT_ASSET_007__", "__STUDENT_ASSET_008__", "__STUDENT_ASSET_009__", "__STUDENT_ASSET_010__"];
for (const token of managedTokens) {
  const asset = manifest.assets.find((item) => item.token === token);
  if (!asset) {
    failures.push(`manifest missing ${token}`);
    continue;
  }
  const bytes = readFileSync(resolve("src/snapshot", asset.file));
  const info = pngInfo(bytes);
  if (info.width !== asset.width || info.height !== asset.height) failures.push(`${token} dimension mismatch`);
  if (bytes.length !== asset.bytes) failures.push(`${token} byte size mismatch`);
  if (sha256(bytes) !== asset.sha256) failures.push(`${token} sha mismatch`);
  if (token >= "__STUDENT_ASSET_007__" && !css.includes(token)) failures.push(`visual css does not reference ${token}`);
}
if (!css.includes(".battle-scene-enemy")) failures.push("battle scene enemy css is missing");
if (!css.includes(".battle-scene-hp")) failures.push("battle scene boss hp css is missing");
if (!css.includes("__STUDENT_ASSET_003__")) failures.push("battle scene enemy atlas token is missing from css");
if (!css.includes(".main-monster-191")) failures.push("main monster frame css mapping is incomplete");
if (!css.includes("@keyframes studentCombatLoop")) failures.push("student melee combat motion is missing");
if (!css.includes("@keyframes studentMoveFrames")) failures.push("student sprite frame animation is missing");
if (!css.includes("@keyframes enemyCombatStep")) failures.push("scene enemy idle combat motion is missing");
if (!css.includes("@keyframes enemyHitSpark")) failures.push("scene enemy hit impact motion is missing");
if (!css.includes("@keyframes enemyShockRing")) failures.push("scene enemy shock ring vfx is missing");
if (!css.includes("@keyframes helperAllyLoop")) failures.push("helper ally combat motion is missing");
if (!css.includes("@keyframes floorTreadmill")) failures.push("arena treadmill floor motion is missing");
if (!css.includes("@keyframes battleDustBurst")) failures.push("arena dust burst vfx is missing");
if (!css.includes("__STUDENT_ASSET_010__")) failures.push("expedition long backdrop token is missing from css");
if (!css.includes("@keyframes expeditionBackdropPan")) failures.push("expedition long backdrop pan motion is missing");
if (!css.includes("@keyframes expeditionAllyMeleeA")) failures.push("expedition ally melee motion is missing");
if (!css.includes("@keyframes expeditionEnemyShock")) failures.push("expedition enemy shock vfx is missing");

const atlasById = new Map(visual.atlases.map((atlas) => [atlas.id, atlas]));
if ((atlasById.get("mainStudents")?.items.length ?? 0) !== 32) failures.push("main student gender frame count mismatch");
if ((atlasById.get("mainMonsters")?.items.length ?? 0) !== 192) failures.push("main monster frame count mismatch");
if ((atlasById.get("companions")?.items.length ?? 0) < 13) failures.push("not enough companion sprites");
if ((atlasById.get("enemies")?.items.length ?? 0) < 40) failures.push("not enough enemy sprites");
if ((atlasById.get("careers")?.items.length ?? 0) !== careers.length * 2) failures.push("career gender portrait count mismatch");
const expeditionBackdrops = visual.backgrounds?.find((background) => background.id === "expeditionBackdrops");
if (!expeditionBackdrops) failures.push("expedition backdrop metadata is missing");
else {
  if (expeditionBackdrops.token !== "__STUDENT_ASSET_010__") failures.push("expedition backdrop token mismatch");
  if ((expeditionBackdrops.items?.length ?? 0) !== 10) failures.push("expedition backdrop row count mismatch");
  if (expeditionBackdrops.rowHeight < 160) failures.push("expedition backdrop row height is too small");
}
const mainStudentIds = new Set((atlasById.get("mainStudents")?.items ?? []).map((item) => item.id));
const mainMonsterIds = new Set((atlasById.get("mainMonsters")?.items ?? []).map((item) => item.id));
const enemyIds = new Set((atlasById.get("enemies")?.items ?? []).map((item) => item.id));

const mainStudents = atlasById.get("mainStudents");
if (mainStudents) {
  if (mainStudents.cell !== 160) failures.push(`main student cell should be 160, got ${mainStudents.cell}`);
  if (mainStudents.columns !== 64 || mainStudents.rows !== 2) failures.push("main student atlas should use 64 columns x 2 rows");
  for (const item of mainStudents.items ?? []) {
    if (item.source !== "prepared") failures.push(`${item.id} is not using prepared move-sheet frames`);
    if (!Array.isArray(item.animationFrames) || item.animationFrames.length !== 4) failures.push(`${item.id} missing 4 animation frames`);
    if (!["male", "female"].includes(item.gender)) failures.push(`${item.id} missing valid gender`);
    if (!Number.isInteger(item.gradeOrder) || item.gradeOrder < 1 || item.gradeOrder > 16) failures.push(`${item.id} missing valid gradeOrder`);
  }
}

if (!existsSync(characterManifestPath)) failures.push("character animation manifest is missing");
if (!existsSync(characterAxisReportPath)) failures.push("character axis report is missing; run npm run visual:build");
if (existsSync(characterManifestPath) && existsSync(characterAxisReportPath)) {
  const characterManifest = JSON.parse(readFileSync(characterManifestPath, "utf8"));
  const characterReport = JSON.parse(readFileSync(characterAxisReportPath, "utf8"));
  const characters = characterManifest.characters ?? [];
  const reportCharacters = characterReport.characters ?? [];
  const byId = new Map(reportCharacters.map((item) => [item.id, item]));
  const minFrameDifference = characterManifest.minFrameDifference ?? 2.5;
  if (characters.length !== 32) failures.push(`character manifest expected 32 students, got ${characters.length}`);
  for (const character of characters) {
    if (!character.moveSheet) failures.push(`${character.id} missing moveSheet`);
    else if (!existsSync(resolve(character.moveSheet))) failures.push(`${character.id} moveSheet file is missing`);
    if (character.direction !== "right") failures.push(`${character.id} must face right`);
    const reportItem = byId.get(character.id);
    if (!reportItem) {
      failures.push(`${character.id} missing axis report entry`);
      continue;
    }
    if (reportItem.status !== "ok") failures.push(`${character.id} axis report status is ${reportItem.status}`);
    if (reportItem.sourceType !== "moveSheet" && reportItem.sourceType !== "sourceFrames.move") failures.push(`${character.id} invalid source type ${reportItem.sourceType}`);
    if ((reportItem.poseDelta?.minimum ?? 0) < minFrameDifference) failures.push(`${character.id} pose delta is too small: ${reportItem.poseDelta?.minimum}`);
    const metrics = reportItem.metrics ?? [];
    const solidHeights = metrics.map((metric) => metric.solidHeight).filter(Number.isFinite);
    if (solidHeights.length === 4 && Math.max(...solidHeights) - Math.min(...solidHeights) > 3) {
      failures.push(`${character.id} solid body height drifts too much: ${solidHeights.join(",")}`);
    }
    for (const [index, metric] of metrics.entries()) {
      if (Math.abs(metric.centerDelta ?? 999) > 1) failures.push(`${character.id} frame ${index} center drift ${metric.centerDelta}`);
      if ((metric.baselineDelta ?? 999) !== 0) failures.push(`${character.id} frame ${index} baseline drift ${metric.baselineDelta}`);
      const width = (metric.bbox?.[2] ?? 0) - (metric.bbox?.[0] ?? 0);
      const height = (metric.bbox?.[3] ?? 0) - (metric.bbox?.[1] ?? 0);
      if (width < 45) failures.push(`${character.id} frame ${index} bounds too narrow: ${width}`);
      if (height < 100) failures.push(`${character.id} frame ${index} bounds too short: ${height}`);
      if ((metric.solidHeight ?? 0) < 136) failures.push(`${character.id} frame ${index} solid body too short: ${metric.solidHeight}`);
      if ((metric.solidWidth ?? 0) < 45) failures.push(`${character.id} frame ${index} solid body too narrow: ${metric.solidWidth}`);
    }
  }
}

for (const career of careers) {
  if (!career.portraitAsset || !career.spriteAsset || !career.iconAsset) failures.push(`${career.id} missing visual asset keys`);
  if (!css.includes(`.career-${career.id}`)) failures.push(`${career.id} missing css portrait mapping`);
  if (!css.includes(`career-${career.id}-female`) && !css.includes(`.career-gender-female .career-${career.id}`)) failures.push(`${career.id} missing female portrait mapping`);
}

for (const visualGrade of gradeVisuals) {
  if (!visualGrade.studentAsset || !mainStudentIds.has(visualGrade.studentAsset)) failures.push(`grade ${visualGrade.order} missing valid studentAsset`);
  for (const asset of visualGrade.normalMonsterAssets ?? []) {
    if (!mainMonsterIds.has(asset)) failures.push(`grade ${visualGrade.order} has invalid normal monster asset ${asset}`);
  }
  for (const asset of Object.values(visualGrade.examMonsterAssets ?? {})) {
    if (!mainMonsterIds.has(asset)) failures.push(`grade ${visualGrade.order} has invalid exam monster asset ${asset}`);
  }
}

for (const stage of stages) {
  if (!stage.enemyAsset || !enemyIds.has(stage.enemyAsset)) failures.push(`${stage.id} missing valid enemyAsset`);
  if (![1, 2, 3].includes(stage.enemyVariant)) failures.push(`${stage.id} missing valid enemyVariant`);
}

for (const boss of bosses) {
  if (!boss.bossAsset || !enemyIds.has(boss.bossAsset)) failures.push(`${boss.id} missing valid bossAsset`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  console.error(`VISUAL_ASSETS_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`VISUAL_ASSETS_OK students=${atlasById.get("mainStudents").items.length} mainMonsters=${atlasById.get("mainMonsters").items.length} companions=${atlasById.get("companions").items.length} enemies=${atlasById.get("enemies").items.length} careers=${careers.length}`);
