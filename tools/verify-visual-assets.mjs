import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pngInfo, sha256 } from "./asset-file-utils.mjs";

const manifest = JSON.parse(readFileSync(resolve("src/snapshot/manifest.json"), "utf8"));
const visual = JSON.parse(readFileSync(resolve("data/visual_assets.json"), "utf8"));
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const gradeVisuals = JSON.parse(readFileSync(resolve("data/grade_visuals.json"), "utf8"));
const stages = JSON.parse(readFileSync(resolve("data/expedition_stages.json"), "utf8"));
const bosses = JSON.parse(readFileSync(resolve("data/expedition_bosses.json"), "utf8"));
const battleRoadConfig = JSON.parse(readFileSync(resolve("data/battle_road_config.json"), "utf8"));
const professionalSpriteManifest = JSON.parse(readFileSync(resolve("data/professional_sprite_manifest.json"), "utf8"));
const css = readFileSync(resolve("src/snapshot/visual-assets.css"), "utf8");
const baseCss = readFileSync(resolve("src/snapshot/styles.css"), "utf8");
const combinedCss = `${baseCss}\n${css}`;
const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const characterManifestPath = resolve("data/character_animation_manifest.json");
const characterAxisReportPath = resolve("artifacts/visual-asset-samples/character-axis-report.json");
const professionalAxisReportPath = resolve("artifacts/visual-asset-samples/professional-axis-report.json");
const spriteReferenceLockPath = resolve("data/sprite_reference_lock.json");
const mainMonsterGreenSourcePath = resolve("assets/visual-source/main-monsters/main-monsters-green.png");

const failures = [];

function professionalFamily(id) {
  const family = (professionalSpriteManifest.families ?? []).find((entry) => entry?.id === id);
  if (!family) failures.push(`professional sprite manifest missing family ${id}`);
  return family;
}

function professionalReportEntryCount() {
  return (professionalSpriteManifest.families ?? []).reduce((sum, family) => {
    return sum + (family.items ?? []).reduce((itemSum, item) => {
      const variants = Array.isArray(item.genders) && item.genders.length > 0 ? item.genders.length : 1;
      return itemSum + variants;
    }, 0);
  }, 0);
}

const expeditionEnemyManifestItems = professionalFamily("expeditionEnemies")?.items ?? [];

function cssRule(selector) {
  const start = css.indexOf(selector);
  if (start < 0) return "";
  const end = css.indexOf("\n", start);
  return css.slice(start, end < 0 ? css.length : end);
}

function readCharacterReferenceRules() {
  if (!existsSync(spriteReferenceLockPath)) {
    return {
      minSolidHeight: 100,
      minSolidWidth: 90,
      maxSolidHeightDrift: 3,
      maxCenterDelta: 1,
      maxBaselineDelta: 0,
    };
  }
  const payload = JSON.parse(readFileSync(spriteReferenceLockPath, "utf8"));
  const activeLock = payload.locks?.[payload.activeLock];
  return {
    minSolidHeight: 100,
    minSolidWidth: 90,
    maxSolidHeightDrift: 3,
    maxCenterDelta: 1,
    maxBaselineDelta: 0,
    ...(activeLock?.characters ?? {}),
  };
}
const managedTokens = ["__STUDENT_ASSET_002__", "__STUDENT_ASSET_003__", "__STUDENT_ASSET_007__", "__STUDENT_ASSET_008__", "__STUDENT_ASSET_009__", "__STUDENT_ASSET_010__", "__STUDENT_ASSET_011__", "__STUDENT_ASSET_012__", "__STUDENT_ASSET_013__", "__STUDENT_ASSET_014__"];
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
  if (token >= "__STUDENT_ASSET_007__" && token !== "__STUDENT_ASSET_008__" && !css.includes(token)) failures.push(`visual css does not reference ${token}`);
}
if (!css.includes(".battle-scene-enemy")) failures.push("battle scene enemy css is missing");
if (!css.includes(".battle-scene-hp")) failures.push("battle scene boss hp css is missing");
if (!css.includes("__STUDENT_ASSET_003__")) failures.push("battle scene enemy atlas token is missing from css");
if (!css.includes(".main-monster-191")) failures.push("main monster frame css mapping is incomplete");
if (!existsSync(mainMonsterGreenSourcePath)) failures.push("main battle monster green source sheet is missing");
if (!packageJson.scripts?.["visual:build"]?.includes("generate-main-monster-sources.py")) failures.push("visual:build must regenerate the main battle monster green source sheet");
if (!css.includes("@keyframes studentCombatLoop")) failures.push("student melee combat motion is missing");
if (!css.includes("@keyframes studentMoveFrames")) failures.push("student sprite frame animation is missing");
if (!css.includes("@keyframes enemyCombatStep")) failures.push("scene enemy idle combat motion is missing");
if (!css.includes("@keyframes enemyHitSpark")) failures.push("scene enemy hit impact motion is missing");
if (!css.includes("@keyframes enemyShockRing")) failures.push("scene enemy shock ring vfx is missing");
if (!css.includes("@keyframes helperAllyLoop")) failures.push("helper ally combat motion is missing");
if (!css.includes("@keyframes floorTreadmill")) failures.push("arena treadmill floor motion is missing");
if (!css.includes("@keyframes battleDustBurst")) failures.push("arena dust burst vfx is missing");
if (!css.includes(".curriculum-attack-vfx-layer")) failures.push("curriculum attack VFX layer css is missing");
if (!css.includes(".curriculum-attack-vfx-token")) failures.push("curriculum attack VFX token css is missing");
for (const keyframe of ["curriculumVfxGlyph", "curriculumVfxWord", "curriculumVfxFormula", "curriculumVfxCard", "curriculumVfxBurst"]) {
  if (!css.includes(`@keyframes ${keyframe}`)) failures.push(`${keyframe} keyframe is missing`);
}
if (!css.includes("__STUDENT_ASSET_010__")) failures.push("expedition long backdrop token is missing from css");
if (!css.includes("@keyframes expeditionBackdropPan")) failures.push("expedition long backdrop pan motion is missing");
if (!css.includes("__STUDENT_ASSET_011__")) failures.push("battle road long backdrop token is missing from css");
if (!css.includes("@keyframes battleRoadBackdropPan")) failures.push("battle road long backdrop pan motion is missing");
const battlePresentation = battleRoadConfig.presentation ?? {};
const battleBackdrop = battlePresentation.backdrop ?? {};
const studentAttack = battlePresentation.studentAttack ?? {};
const studentDisplay = battlePresentation.studentDisplay ?? {};
const curriculumAttackVfx = battlePresentation.curriculumAttackVfx ?? {};
const enemyDisplay = battlePresentation.enemyDisplay ?? {};
const enemyReaction = battlePresentation.enemyReaction ?? {};
const enemyHpBar = battlePresentation.enemyHpBar ?? {};
if (!css.includes(`--battle-road-pan-width:${battleBackdrop.panWidthPercent}%`)) failures.push("battle road backdrop pan width is not config-driven");
if ((battleBackdrop.panWidthPercent ?? 9999) > 900) failures.push(`battle road backdrop pan width is too zoomed-in for student road view: ${battleBackdrop.panWidthPercent}%`);
if (!css.includes(`translate3d(${battleBackdrop.panLoopPercent}%`)) failures.push("battle road backdrop loop percent is not config-driven");
if (css.includes(".pixel-arena.road-travel::before{animation-duration")) failures.push("battle road phase should not override backdrop animation duration");
if (!css.includes(`translate(${studentAttack.dashPx}px,-6px)`)) failures.push("student attack dash distance is not config-driven");
if (css.includes("translate(76px,-6px)") || css.includes("translate(84px,-1px)")) failures.push("student attack still uses the old long dash distance");
if (!css.includes(`--curriculum-vfx-duration:${curriculumAttackVfx.durationMs}ms`)) failures.push("curriculum attack VFX duration is not config-driven");
if (!css.includes(`--curriculum-vfx-base-font:${curriculumAttackVfx.baseFontPx}px`)) failures.push("curriculum attack VFX font size is not config-driven");
if (!css.includes(`--curriculum-vfx-source-x:${curriculumAttackVfx.sourceOffsetXPx}px`)) failures.push("curriculum attack VFX source offset is not config-driven");
if (!css.includes(`--curriculum-vfx-source-y:${curriculumAttackVfx.sourceOffsetYPx}px`)) failures.push("curriculum attack VFX source Y offset is not config-driven");
if ((curriculumAttackVfx.sourceOffsetYPx ?? 0) > 0) failures.push("curriculum attack VFX should originate from the student body, not below the target");
if (!css.includes(".phone-frame.reduced-effects .curriculum-attack-vfx-token")) failures.push("curriculum attack VFX is missing reduced-effects rule");
if (!css.includes(`--battle-normal-enemy-size:${enemyDisplay.normalSizePx}px`)) failures.push("battle normal enemy display size is not config-driven");
if (!css.includes(`--battle-boss-enemy-size:${enemyDisplay.bossSizePx}px`)) failures.push("battle boss enemy display size is not config-driven");
if (!css.includes(`--battle-suneung-enemy-size:${enemyDisplay.suneungSizePx}px`)) failures.push("battle suneung enemy display size is not config-driven");
if (!css.includes(`--battle-defeated-opacity:${enemyDisplay.defeatedOpacity}`)) failures.push("battle defeated enemy opacity is not config-driven");
if (!css.includes(`width:${enemyHpBar.widthPx}px;height:${enemyHpBar.heightPx}px`)) failures.push("battle enemy HP bar size is not config-driven");
if (!css.includes(`width:${enemyHpBar.mobileWidthPx}px;height:${enemyHpBar.mobileHeightPx}px`)) failures.push("battle enemy mobile HP bar size is not config-driven");
if (!css.includes(`--enemy-rim-opacity:${enemyReaction.rimOpacity}`)) failures.push("battle enemy rim opacity is not config-driven");
if (css.includes("translate(-24px,-7px)") || css.includes("rotate(-9deg)") || css.includes("brightness(1.95)")) failures.push("battle enemy reaction still uses the old exaggerated hit motion");
if (!css.includes(`.pixel-arena .helper-sprite{width:${studentDisplay.helperSizePx}px;height:${studentDisplay.helperSizePx}px`)) failures.push("helper companion display size is not config-driven");
const studentSlashRule = cssRule(".pixel-arena .student-sprite::after");
for (const warmColor of ["#ef476f", "#f4d35e", "#f97316", "#ffd166"]) {
  if (studentSlashRule.includes(warmColor)) failures.push(`student attack slash should not use fire-like warm color ${warmColor}`);
}
const expeditionDustRule = cssRule(".expedition-arena::after");
for (const warmColor of ["#ef476f", "#f4d35e", "#f97316", "#ffd166", "#fef3c7"]) {
  if (expeditionDustRule.includes(warmColor)) failures.push(`expedition arena dust should not use fire-like warm color ${warmColor}`);
}
if (!css.includes("@keyframes expeditionAllyMeleeA")) failures.push("expedition ally melee motion is missing");
if (!css.includes("@keyframes expeditionEnemyShock")) failures.push("expedition enemy shock vfx is missing");
const expeditionEnemyLegacyHideRule = ".expedition-enemy-visual .enemy-body,.expedition-enemy-visual .enemy-eye,.expedition-enemy-visual .enemy-mouth,.expedition-enemy-visual .enemy-mark,.expedition-enemy-visual .enemy-horn,.expedition-enemy-visual .enemy-name,.expedition-enemy-visual>strong,.expedition-enemy-visual>small,.expedition-enemy-visual strong,.expedition-enemy-visual small{display:none!important}";
if (!combinedCss.includes(expeditionEnemyLegacyHideRule)) {
  failures.push("expedition enemy legacy body/text layers must be hidden");
}
const expeditionEnemySpriteFrameOnlyRule = ".expedition-enemy-visual::before{content:none!important;display:none!important;background-image:none!important}";
if (!combinedCss.includes(expeditionEnemySpriteFrameOnlyRule)) {
  failures.push("expedition enemy css pseudo-element body must be disabled; runtime must use individual PNG SpriteFrames");
}
if (css.includes("__STUDENT_ASSET_008__")) {
  failures.push("expedition enemy atlas token must not be referenced by visual css; runtime must use individual PNG SpriteFrames");
}

const atlasById = new Map(visual.atlases.map((atlas) => [atlas.id, atlas]));
if ((atlasById.get("mainStudents")?.items.length ?? 0) !== 32) failures.push("main student gender frame count mismatch");
if ((atlasById.get("mainMonsters")?.items.length ?? 0) !== 192) failures.push("main monster frame count mismatch");
if ((atlasById.get("companions")?.items.length ?? 0) !== careers.length + 13) failures.push("companion atlas should include career units plus helper sprites");
if ((atlasById.get("enemies")?.items.length ?? 0) !== expeditionEnemyManifestItems.length) failures.push(`enemy atlas should include ${expeditionEnemyManifestItems.length} manifest sprites`);
if ((atlasById.get("careers")?.items.length ?? 0) !== careers.length * 2) failures.push("career gender portrait count mismatch");
const expeditionBackdrops = visual.backgrounds?.find((background) => background.id === "expeditionBackdrops");
if (!expeditionBackdrops) failures.push("expedition backdrop metadata is missing");
else {
  if (expeditionBackdrops.token !== "__STUDENT_ASSET_010__") failures.push("expedition backdrop token mismatch");
  if ((expeditionBackdrops.items?.length ?? 0) !== 10) failures.push("expedition backdrop row count mismatch");
  if (expeditionBackdrops.rowHeight < 160) failures.push("expedition backdrop row height is too small");
  const files = new Set();
  const sourceFiles = new Set();
  const timesOfDay = new Set();
  const landmarks = new Set();
  for (const item of expeditionBackdrops.items ?? []) {
    if (!item.backdrop) failures.push("expedition backdrop item backdrop id is missing");
    if (!item.timeOfDay) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} timeOfDay is missing`);
    else timesOfDay.add(item.timeOfDay);
    if (!item.landmark) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} landmark is missing`);
    else landmarks.add(item.landmark);
    if (item.roadProfile !== "fixed-road-v2") failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} roadProfile mismatch`);
    if (item.tileCount !== 10) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tileCount mismatch`);
    if (item.stagesPerTile !== 25) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} stagesPerTile mismatch`);
    if (item.sourceMode !== "chapter-panorama") failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} must be built from chapter-panorama source mode`);
    if (!Array.isArray(item.tiles) || item.tiles.length !== 10) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tiles must contain 10 PNGs`);
    if (!item.file) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} file is missing`);
    else {
      files.add(item.file);
      const itemPath = resolve("src/snapshot", item.file);
      if (!existsSync(itemPath)) failures.push(`expedition backdrop file does not exist: ${item.file}`);
      else {
        const info = pngInfo(readFileSync(itemPath));
        if (info.width !== expeditionBackdrops.width) failures.push(`expedition backdrop ${item.file} width mismatch ${info.width}/${expeditionBackdrops.width}`);
        if (info.height !== expeditionBackdrops.rowHeight) failures.push(`expedition backdrop ${item.file} height mismatch ${info.height}/${expeditionBackdrops.rowHeight}`);
      }
    }
    for (const tile of item.tiles ?? []) {
      if (!Number.isInteger(tile.index) || tile.index < 0 || tile.index > 9) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tile index invalid`);
      if (tile.derived !== false) failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tile ${tile.index} must use an independent source, not a derived fallback`);
      if (tile.sourceMode !== "chapter-panorama") failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tile ${tile.index} must be cut from a blended chapter panorama`);
      if (!tile.source) {
        failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tile ${tile.index} source is missing`);
      } else {
        sourceFiles.add(tile.source);
        const sourcePath = resolve(tile.source);
        if (!existsSync(sourcePath)) failures.push(`expedition backdrop source does not exist: ${tile.source}`);
        else {
          const sourceBuffer = readFileSync(sourcePath);
          const sourceInfo = pngInfo(sourceBuffer);
          if (sourceInfo.width < 1600) failures.push(`expedition backdrop source ${tile.source} width is too small: ${sourceInfo.width}`);
          if (sourceInfo.height < 650) failures.push(`expedition backdrop source ${tile.source} height is too small for a generation original: ${sourceInfo.height}`);
          const sourceAspect = sourceInfo.width / Math.max(1, sourceInfo.height);
          if (sourceAspect < 2.2 || sourceAspect > 3.4) failures.push(`expedition backdrop source ${tile.source} aspect ratio must be a raw route source, got ${sourceAspect.toFixed(2)}`);
          if (sourceBuffer.length < 500000) failures.push(`expedition backdrop source ${tile.source} is too small for a high-quality generated original: ${sourceBuffer.length} bytes`);
          if (sourceInfo.width === expeditionBackdrops.width && sourceInfo.height === expeditionBackdrops.rowHeight) {
            failures.push(`expedition backdrop source ${tile.source} looks like a built runtime tile, not an independent generation original`);
          }
        }
      }
      if (!tile.file) {
        failures.push(`expedition backdrop ${item.backdrop ?? "unknown"} tile file is missing`);
        continue;
      }
      files.add(tile.file);
      const tilePath = resolve("src/snapshot", tile.file);
      if (!existsSync(tilePath)) failures.push(`expedition backdrop tile file does not exist: ${tile.file}`);
      else {
        const info = pngInfo(readFileSync(tilePath));
        if (info.width !== expeditionBackdrops.width) failures.push(`expedition backdrop tile ${tile.file} width mismatch ${info.width}/${expeditionBackdrops.width}`);
        if (info.height !== expeditionBackdrops.rowHeight) failures.push(`expedition backdrop tile ${tile.file} height mismatch ${info.height}/${expeditionBackdrops.rowHeight}`);
      }
    }
  }
  if (files.size < 100) failures.push(`expedition backdrop files must include 100 long-route tiles, got ${files.size}`);
  if (sourceFiles.size !== 100) failures.push(`expedition backdrop source files must include 100 independent PNGs, got ${sourceFiles.size}`);
  if (timesOfDay.size < 8) failures.push(`expedition backdrop timeOfDay should be diverse, got ${timesOfDay.size}`);
  if (landmarks.size !== 10) failures.push(`expedition backdrop landmarks must be unique per chapter, got ${landmarks.size}`);
}
const battleRoadBackdrops = visual.backgrounds?.find((background) => background.id === "battleRoadBackdrops");
if (!battleRoadBackdrops) failures.push("battle road backdrop metadata is missing");
else {
  if (battleRoadBackdrops.token !== "__STUDENT_ASSET_011__") failures.push("battle road backdrop token mismatch");
  if ((battleRoadBackdrops.items?.length ?? 0) !== 4) failures.push("battle road backdrop row count mismatch");
  if (battleRoadBackdrops.rowHeight < 160) failures.push("battle road backdrop row height is too small");
  for (const [index, sceneClass] of ["scene-elementary", "scene-middle", "scene-high", "scene-repeater"].entries()) {
    const item = battleRoadBackdrops.items.find((item) => item.sceneClass === sceneClass);
    if (!item) failures.push(`battle road backdrop missing ${sceneClass}`);
    else {
      const token = `__STUDENT_ASSET_${String(11 + index).padStart(3, "0")}__`;
      if (item.token !== token) failures.push(`${sceneClass} battle road backdrop token mismatch`);
      if (!item.file) failures.push(`${sceneClass} battle road backdrop file is missing`);
      if (!css.includes(token)) failures.push(`${sceneClass} battle road backdrop css token is missing`);
      const sceneBackdropRule = `.stage-scene.${sceneClass} .pixel-arena::before{background-image:url(${token});background-repeat:no-repeat!important;background-size:100% 100%!important;background-position:center bottom!important}`;
      if (!css.includes(sceneBackdropRule)) failures.push(`${sceneClass} battle road backdrop sizing rule is missing`);
      if (!item.roadOverlay) failures.push(`${sceneClass} battle road backdrop road overlay metadata is missing`);
      else {
        if (item.roadOverlay.topPercent !== battleBackdrop.roadTopPercent) failures.push(`${sceneClass} road overlay top percent mismatch`);
        if (item.roadOverlay.bottomPercent !== battleBackdrop.roadBottomPercent) failures.push(`${sceneClass} road overlay bottom percent mismatch`);
        if (item.roadOverlay.opacity !== battleBackdrop.roadOpacity) failures.push(`${sceneClass} road overlay opacity mismatch`);
        if (item.roadOverlay.detailPx !== battleBackdrop.roadDetailPx) failures.push(`${sceneClass} road overlay detail mismatch`);
      }
    }
  }
}
const mainStudentIds = new Set((atlasById.get("mainStudents")?.items ?? []).map((item) => item.id));
const mainMonsterIds = new Set((atlasById.get("mainMonsters")?.items ?? []).map((item) => item.id));
const enemyIds = new Set((atlasById.get("enemies")?.items ?? []).map((item) => item.id));
const companionItems = atlasById.get("companions")?.items ?? [];
const companionIds = new Set(companionItems.map((item) => item.id));
const companionAtlas = atlasById.get("companions");
if ((companionAtlas?.cell ?? 0) < 160) failures.push(`companion atlas cell should be at least 160, got ${companionAtlas?.cell}`);
if ((companionAtlas?.height ?? 0) < 160) failures.push(`companion atlas height should be at least 160, got ${companionAtlas?.height}`);
if ((companionAtlas?.framesPerItem ?? 0) !== 4) failures.push("companion atlas must use 4-frame move sprites");
if ((companionAtlas?.columns ?? 999) > 64) failures.push(`companion atlas columns should stay within 64, got ${companionAtlas?.columns}`);
if (!Array.isArray(companionAtlas?.genders) || !companionAtlas.genders.includes("male") || !companionAtlas.genders.includes("female")) failures.push("companion atlas must include male/female rows");
const enemyAtlas = atlasById.get("enemies");
if ((enemyAtlas?.cell ?? 0) < 160) failures.push(`enemy atlas cell should be at least 160, got ${enemyAtlas?.cell}`);
if ((enemyAtlas?.framesPerItem ?? 0) !== 4) failures.push("enemy atlas must use 4-frame move sprites");
if ((enemyAtlas?.columns ?? 999) > 64) failures.push(`enemy atlas columns should stay within 64, got ${enemyAtlas?.columns}`);
for (const career of careers) {
  if (!companionIds.has(`career-unit-${career.id}`)) failures.push(`${career.id} missing career unit companion sprite`);
}
for (const item of companionItems) {
  if (item.direction !== "right") failures.push(`${item.id} companion sprite should face right`);
  if (!Array.isArray(item.animationFrames) || item.animationFrames.length !== 4) failures.push(`${item.id} companion sprite missing 4 animation frames`);
  if (item.type === "career" && (!item.genderFrameBases || !Number.isInteger(item.genderFrameBases.male) || !Number.isInteger(item.genderFrameBases.female))) failures.push(`${item.id} companion sprite missing male/female frame bases`);
}
for (const item of atlasById.get("enemies")?.items ?? []) {
  if (item.direction !== "left") failures.push(`${item.id} enemy sprite should face left`);
  if (!Array.isArray(item.animationFrames) || item.animationFrames.length !== 4) failures.push(`${item.id} enemy sprite missing 4 animation frames`);
}

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

for (const item of atlasById.get("mainMonsters")?.items ?? []) {
  if (item.direction !== "left") failures.push(`${item.id} main battle monster should face left`);
}

if (!existsSync(characterManifestPath)) failures.push("character animation manifest is missing");
if (!existsSync(characterAxisReportPath)) failures.push("character axis report is missing; run npm run visual:build");
if (!existsSync(professionalAxisReportPath)) failures.push("professional sprite axis report is missing; run npm run visual:build");
if (existsSync(characterManifestPath) && existsSync(characterAxisReportPath)) {
  const referenceRules = readCharacterReferenceRules();
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
    if (solidHeights.length === 4 && Math.max(...solidHeights) - Math.min(...solidHeights) > referenceRules.maxSolidHeightDrift) {
      failures.push(`${character.id} solid body height drifts too much: ${solidHeights.join(",")}`);
    }
    for (const [index, metric] of metrics.entries()) {
      if (Math.abs(metric.centerDelta ?? 999) > referenceRules.maxCenterDelta) failures.push(`${character.id} frame ${index} center drift ${metric.centerDelta}`);
      if (Math.abs(metric.baselineDelta ?? 999) > referenceRules.maxBaselineDelta) failures.push(`${character.id} frame ${index} baseline drift ${metric.baselineDelta}`);
      const width = (metric.bbox?.[2] ?? 0) - (metric.bbox?.[0] ?? 0);
      const height = (metric.bbox?.[3] ?? 0) - (metric.bbox?.[1] ?? 0);
      if (width < referenceRules.minSolidWidth) failures.push(`${character.id} frame ${index} bounds too narrow: ${width}`);
      if (height < referenceRules.minSolidHeight) failures.push(`${character.id} frame ${index} bounds too short: ${height}`);
      if ((metric.solidHeight ?? 0) < referenceRules.minSolidHeight) failures.push(`${character.id} frame ${index} solid body too short: ${metric.solidHeight}`);
      if ((metric.solidWidth ?? 0) < referenceRules.minSolidWidth) failures.push(`${character.id} frame ${index} solid body too narrow: ${metric.solidWidth}`);
    }
  }
}

if (existsSync(professionalAxisReportPath)) {
  const professionalReport = JSON.parse(readFileSync(professionalAxisReportPath, "utf8"));
  const entries = professionalReport.items ?? [];
  const expectedProfessionalEntries = professionalReportEntryCount();
  if (entries.length !== expectedProfessionalEntries) failures.push(`professional sprite report expected ${expectedProfessionalEntries} entries, got ${entries.length}`);
  for (const entry of entries) {
    if (entry.status !== "ok") failures.push(`${entry.family}/${entry.id}/${entry.variant} status is ${entry.status}`);
    if ((entry.poseDelta?.minimum ?? 0) < (professionalReport.minFrameDifference ?? 2.5)) failures.push(`${entry.family}/${entry.id}/${entry.variant} pose delta too small: ${entry.poseDelta?.minimum}`);
    for (const [index, metric] of (entry.metrics ?? []).entries()) {
      if (Math.abs(metric.centerDelta ?? 999) > 1) failures.push(`${entry.family}/${entry.id}/${entry.variant} frame ${index} center drift ${metric.centerDelta}`);
      if ((metric.baselineDelta ?? 999) !== 0) failures.push(`${entry.family}/${entry.id}/${entry.variant} frame ${index} baseline drift ${metric.baselineDelta}`);
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
  const expectedCount = Array.isArray(stage.normalEnemyNames) && stage.normalEnemyNames.length > 0 ? stage.normalEnemyNames.length : 1;
  if (!Array.isArray(stage.enemyAssets)) failures.push(`${stage.id} missing enemyAssets`);
  else {
    if (stage.enemyAssets.length !== expectedCount) failures.push(`${stage.id} enemyAssets count mismatch`);
    if (stage.enemyAssets[0] !== stage.enemyAsset) failures.push(`${stage.id} enemyAsset must equal enemyAssets[0]`);
    for (const asset of stage.enemyAssets) {
      if (!enemyIds.has(asset)) failures.push(`${stage.id} has invalid enemy asset ${asset}`);
      if (!css.includes(`.expedition-enemy-visual.enemy-asset-${asset}`)) failures.push(`${stage.id} missing css mapping for ${asset}`);
    }
  }
  if (!Number.isInteger(Number(stage.enemyVariant)) || Number(stage.enemyVariant) < 1 || Number(stage.enemyVariant) > 6) failures.push(`${stage.id} missing valid enemyVariant`);
}

for (const boss of bosses) {
  if (!boss.bossAsset || !enemyIds.has(boss.bossAsset)) failures.push(`${boss.id} missing valid bossAsset`);
  if (boss.bossAsset && !css.includes(`.expedition-enemy-visual.enemy-asset-${boss.bossAsset}`)) failures.push(`${boss.id} missing css mapping for ${boss.bossAsset}`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  console.error(`VISUAL_ASSETS_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`VISUAL_ASSETS_OK students=${atlasById.get("mainStudents").items.length} mainMonsters=${atlasById.get("mainMonsters").items.length} companions=${atlasById.get("companions").items.length} enemies=${atlasById.get("enemies").items.length} careers=${careers.length}`);
