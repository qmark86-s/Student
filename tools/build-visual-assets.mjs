import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const outDir = resolve("src/snapshot/assets");
const cssPath = resolve("src/snapshot/visual-assets.css");
const manifestPath = resolve("src/snapshot/manifest.json");
const visualDataPath = resolve("data/visual_assets.json");
const reactAssetLoaderPath = resolve("src/react/game/assets.js");
const careersPath = resolve("data/careers.json");
const gradeVisualsPath = resolve("data/grade_visuals.json");
const battleRoadConfigPath = resolve("data/battle_road_config.json");
const characterAnimationManifestPath = resolve("data/character_animation_manifest.json");
const professionalSpriteManifestPath = resolve("data/professional_sprite_manifest.json");
const characterAxisReportPath = resolve("artifacts/visual-asset-samples/character-axis-report.json");
const professionalAxisReportPath = resolve("artifacts/visual-asset-samples/professional-axis-report.json");
const expeditionBackdropSourceRoot = resolve("assets/visual-source/expedition-backdrops");
const stagesPath = resolve("data/expedition_stages.json");
const bossesPath = resolve("data/expedition_bosses.json");
const mainMonsterSourcePath = resolve("assets/visual-source/main-monsters/main-monsters-green.png");
const matteDebugDir = resolve("artifacts/visual-asset-matte");
const chromaKeyGreen = { r: 0, g: 255, b: 0, a: 255 };

const companionSprites = [
  { id: "helper-book", color: "#818cf8", prop: "book", outfit: "scholar" },
  { id: "helper-bulb", color: "#fde047", prop: "bulb", outfit: "inventor" },
  { id: "helper-chart", color: "#10b981", prop: "chart", outfit: "analyst" },
  { id: "helper-chip", color: "#38bdf8", prop: "chip", outfit: "engineer" },
  { id: "helper-files", color: "#f59e0b", prop: "files", outfit: "office" },
  { id: "helper-flask", color: "#22c55e", prop: "flask", outfit: "lab" },
  { id: "helper-globe", color: "#38bdf8", prop: "globe", outfit: "traveler" },
  { id: "helper-judge", color: "#f4d35e", prop: "gavel", outfit: "legal" },
  { id: "helper-laptop", color: "#60a5fa", prop: "laptop", outfit: "tech" },
  { id: "helper-medic", color: "#7ad7ff", prop: "medic", outfit: "medic" },
  { id: "helper-mic", color: "#f472b6", prop: "mic", outfit: "media" },
  { id: "helper-palette", color: "#fb923c", prop: "palette", outfit: "artist" },
  { id: "helper-teacher", color: "#c4b5fd", prop: "teacher", outfit: "mentor" },
];

const enemyTones = [
  { id: "shelter", color: "#e05267", accent: "#facc15", prop: "files", motif: "rent" },
  { id: "studio", color: "#f97316", accent: "#f9a8d4", prop: "palette", motif: "deadline" },
  { id: "neighborhood", color: "#22c55e", accent: "#93c5fd", prop: "book", motif: "errand" },
  { id: "company", color: "#3b82f6", accent: "#f97316", prop: "laptop", motif: "inbox" },
  { id: "office", color: "#8b5cf6", accent: "#f0b84c", prop: "chart", motif: "meeting" },
  { id: "asset", color: "#10b981", accent: "#facc15", prop: "chart", motif: "market" },
  { id: "national", color: "#ef4444", accent: "#86efac", prop: "gavel", motif: "permit" },
  { id: "global", color: "#0ea5e9", accent: "#fde047", prop: "globe", motif: "passport" },
  { id: "future", color: "#6366f1", accent: "#67e8f9", prop: "chip", motif: "circuit" },
  { id: "summit", color: "#a855f7", accent: "#f0b84c", prop: "teacher", motif: "summit" },
];

const expeditionBackdropRoadProfile = "fixed-road-v2";
const expeditionBackdropTileCount = 10;
const expeditionBackdropStagesPerTile = 25;
const expeditionBackdropThemes = [
  { id: "shelter", timeOfDay: "dawn", landmark: "temporary-shelter-alley", skyTop: "#24384e", sky: "#52647f", horizon: "#c08a58", far: "#33455f", mid: "#52413d", floor: "#30313a", road: "#34343c", roadDark: "#171b24", accent: "#facc15", accent2: "#ef4444", light: "#ffd58a" },
  { id: "studio", timeOfDay: "deep-night", landmark: "studio-laundry-neon", skyTop: "#160f2f", sky: "#342052", horizon: "#6b315e", far: "#2b2741", mid: "#4b324f", floor: "#272637", road: "#262337", roadDark: "#11111f", accent: "#fb923c", accent2: "#f9a8d4", light: "#fef3c7" },
  { id: "neighborhood", timeOfDay: "clear-noon", landmark: "local-market-street", skyTop: "#7bbbe1", sky: "#9ed7ea", horizon: "#d8f2da", far: "#76a58d", mid: "#5f8f67", floor: "#314239", road: "#3c473f", roadDark: "#1d2926", accent: "#84cc16", accent2: "#f59e0b", light: "#fff7c2" },
  { id: "company", timeOfDay: "commute-morning", landmark: "newtown-glass-company", skyTop: "#8bd3ff", sky: "#bfe8ff", horizon: "#f5d39b", far: "#7ca7bd", mid: "#527d97", floor: "#293746", road: "#334456", roadDark: "#172434", accent: "#60a5fa", accent2: "#f97316", light: "#f8fafc" },
  { id: "office", timeOfDay: "rainy-evening", landmark: "professional-office-towers", skyTop: "#2d344c", sky: "#596078", horizon: "#798099", far: "#3b4056", mid: "#36374c", floor: "#252936", road: "#2a2d39", roadDark: "#111827", accent: "#c4b5fd", accent2: "#f0b84c", light: "#f5e7b2" },
  { id: "asset", timeOfDay: "golden-sunset", landmark: "asset-lounge-market-board", skyTop: "#194b4d", sky: "#23665b", horizon: "#f3a75f", far: "#335844", mid: "#255145", floor: "#20352e", road: "#243a32", roadDark: "#10211d", accent: "#34d399", accent2: "#facc15", light: "#fde68a" },
  { id: "national", timeOfDay: "overcast-day", landmark: "national-project-construction", skyTop: "#6d7d8f", sky: "#96a6b5", horizon: "#c6c7bf", far: "#66717f", mid: "#4a5565", floor: "#30343a", road: "#373a40", roadDark: "#1c2026", accent: "#f97316", accent2: "#ef4444", light: "#fef3c7" },
  { id: "global", timeOfDay: "harbor-sunrise", landmark: "airport-harbor-hub", skyTop: "#24547d", sky: "#5fb2d9", horizon: "#ffc27a", far: "#4b7891", mid: "#355f7c", floor: "#233548", road: "#273c4e", roadDark: "#101b29", accent: "#38bdf8", accent2: "#fde047", light: "#fff7ad" },
  { id: "future", timeOfDay: "midnight-cyber", landmark: "future-research-city", skyTop: "#0d1539", sky: "#24346f", horizon: "#4b3a88", far: "#1e2858", mid: "#2f3d70", floor: "#1b2543", road: "#20284a", roadDark: "#0c122b", accent: "#a78bfa", accent2: "#67e8f9", light: "#d9f99d" },
  { id: "summit", timeOfDay: "golden-summit", landmark: "world-influence-summit", skyTop: "#493169", sky: "#7960a3", horizon: "#f2b866", far: "#4b4475", mid: "#3a3464", floor: "#292641", road: "#302b48", roadDark: "#161427", accent: "#f0b84c", accent2: "#f5d76e", light: "#fff1a8" },
];

const battleRoadBackdropRows = [
  { id: "elementary", sceneClass: "scene-elementary", sourceRow: 0, sourceOffsetX: 740 },
  { id: "middle", sceneClass: "scene-middle", sourceRow: 1, sourceOffsetX: 1380 },
  { id: "high", sceneClass: "scene-high", sourceRow: 2, sourceOffsetX: 560 },
  { id: "repeater", sceneClass: "scene-repeater", sourceRow: 3, sourceOffsetX: 560 },
];

const battleRoadLaneThemes = {
  elementary: { road: "#d7924d", roadDark: "#8b5a31", trim: "#f5c46c", detail: "#fff0ba", shadow: "#4b3322", sparkle: "#9fd4c9" },
  middle: { road: "#6f8791", roadDark: "#344b55", trim: "#c9d8d7", detail: "#f5f7f1", shadow: "#23343b", sparkle: "#93c5fd" },
  high: { road: "#294f83", roadDark: "#142a4c", trim: "#78b9e7", detail: "#d8ebff", shadow: "#07162b", sparkle: "#ffd166" },
  repeater: { road: "#9a6c36", roadDark: "#4e321d", trim: "#f0b84c", detail: "#ffe3a1", shadow: "#26170f", sparkle: "#c4b5fd" },
};

function configObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 데이터가 객체가 아닙니다.`);
  return value;
}

function configNumber(value, label, min = -Infinity, max = Infinity) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} 값이 숫자가 아닙니다.`);
  return Math.max(min, Math.min(max, number));
}

function configString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} 값이 문자열이 아닙니다.`);
  return value;
}

function configBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} 값이 boolean이 아닙니다.`);
  return value;
}

function configArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} 데이터가 비어 있습니다.`);
  return value;
}

function cssNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function readBattleRoadConfig() {
  if (!existsSync(battleRoadConfigPath)) throw new Error(`battle_road_config.json 파일이 없습니다: ${battleRoadConfigPath}`);
  return JSON.parse(readFileSync(battleRoadConfigPath, "utf8"));
}

function battleRoadPresentation(config) {
  const presentation = configObject(config.presentation, "battle_road_config.presentation");
  const backdrop = configObject(presentation.backdrop, "battle_road_config.presentation.backdrop");
  const display = configObject(presentation.studentDisplay, "battle_road_config.presentation.studentDisplay");
  const attack = configObject(presentation.studentAttack, "battle_road_config.presentation.studentAttack");
  const enemyDisplay = configObject(presentation.enemyDisplay, "battle_road_config.presentation.enemyDisplay");
  const enemyReaction = configObject(presentation.enemyReaction, "battle_road_config.presentation.enemyReaction");
  const enemyHpBar = configObject(presentation.enemyHpBar, "battle_road_config.presentation.enemyHpBar");
  const enemySlots = configObject(presentation.enemySlots, "battle_road_config.presentation.enemySlots");
  const curriculumVfx = configObject(presentation.curriculumAttackVfx, "battle_road_config.presentation.curriculumAttackVfx");
  return {
    backdrop: {
      panWidthPercent: configNumber(backdrop.panWidthPercent, "backdrop.panWidthPercent", 400, 1200),
      panLoopPercent: configNumber(backdrop.panLoopPercent, "backdrop.panLoopPercent", -100, -1),
      panDurationSec: configNumber(backdrop.panDurationSec, "backdrop.panDurationSec", 12, 240),
      roadTopPercent: configNumber(backdrop.roadTopPercent, "backdrop.roadTopPercent", 35, 90),
      roadBottomPercent: configNumber(backdrop.roadBottomPercent, "backdrop.roadBottomPercent", 65, 100),
      roadOpacity: configNumber(backdrop.roadOpacity, "backdrop.roadOpacity", 0, 1),
      roadDetailPx: configNumber(backdrop.roadDetailPx, "backdrop.roadDetailPx", 36, 240),
      travelFilter: configString(backdrop.travelFilter, "backdrop.travelFilter"),
      defaultFilter: configString(backdrop.defaultFilter, "backdrop.defaultFilter"),
    },
    studentDisplay: {
      scaleMultiplier: configNumber(display.scaleMultiplier, "studentDisplay.scaleMultiplier", 0.45, 1.4),
      baseBottomPercent: configNumber(display.baseBottomPercent, "studentDisplay.baseBottomPercent", 0, 60),
      elementaryBottomPercent: configNumber(display.elementaryBottomPercent, "studentDisplay.elementaryBottomPercent", 0, 60),
      middleBottomPercent: configNumber(display.middleBottomPercent, "studentDisplay.middleBottomPercent", 0, 60),
      highBottomPercent: configNumber(display.highBottomPercent, "studentDisplay.highBottomPercent", 0, 60),
      repeaterBottomPercent: configNumber(display.repeaterBottomPercent, "studentDisplay.repeaterBottomPercent", 0, 60),
      helperPartyLeftPercent: configNumber(display.helperPartyLeftPercent, "studentDisplay.helperPartyLeftPercent", 0, 100),
      helperBottomPercent: configNumber(display.helperBottomPercent, "studentDisplay.helperBottomPercent", 0, 60),
      helperSizePx: configNumber(display.helperSizePx, "studentDisplay.helperSizePx", 36, 120),
    },
    studentAttack: {
      windupPx: configNumber(attack.windupPx, "studentAttack.windupPx", 0, 120),
      dashPx: configNumber(attack.dashPx, "studentAttack.dashPx", 0, 120),
      recoverPx: configNumber(attack.recoverPx, "studentAttack.recoverPx", 0, 120),
      dustPx: configNumber(attack.dustPx, "studentAttack.dustPx", 0, 120),
      slashPx: configNumber(attack.slashPx, "studentAttack.slashPx", 0, 140),
    },
    curriculumAttackVfx: {
      enabled: configBoolean(curriculumVfx.enabled, "curriculumAttackVfx.enabled"),
      cycleMs: configNumber(curriculumVfx.cycleMs, "curriculumAttackVfx.cycleMs", 120, 2400),
      durationMs: configNumber(curriculumVfx.durationMs, "curriculumAttackVfx.durationMs", 120, 1600),
      baseFontPx: configNumber(curriculumVfx.baseFontPx, "curriculumAttackVfx.baseFontPx", 10, 28),
      minWidthPx: configNumber(curriculumVfx.minWidthPx, "curriculumAttackVfx.minWidthPx", 20, 120),
      maxWidthPx: configNumber(curriculumVfx.maxWidthPx, "curriculumAttackVfx.maxWidthPx", 32, 160),
      sourceOffsetXPx: configNumber(curriculumVfx.sourceOffsetXPx, "curriculumAttackVfx.sourceOffsetXPx", -260, 40),
      sourceOffsetYPx: configNumber(curriculumVfx.sourceOffsetYPx, "curriculumAttackVfx.sourceOffsetYPx", -80, 160),
      impactOffsetXPx: configNumber(curriculumVfx.impactOffsetXPx, "curriculumAttackVfx.impactOffsetXPx", -80, 80),
      impactOffsetYPx: configNumber(curriculumVfx.impactOffsetYPx, "curriculumAttackVfx.impactOffsetYPx", -80, 80),
      normalTargetXOffsetPercent: configNumber(curriculumVfx.normalTargetXOffsetPercent, "curriculumAttackVfx.normalTargetXOffsetPercent", -50, 50),
      normalTargetYOffsetPercent: configNumber(curriculumVfx.normalTargetYOffsetPercent, "curriculumAttackVfx.normalTargetYOffsetPercent", 0, 80),
      bossTargetXOffsetPercent: configNumber(curriculumVfx.bossTargetXOffsetPercent, "curriculumAttackVfx.bossTargetXOffsetPercent", -50, 50),
      bossTargetYOffsetPercent: configNumber(curriculumVfx.bossTargetYOffsetPercent, "curriculumAttackVfx.bossTargetYOffsetPercent", 0, 80),
    },
    enemyDisplay: {
      normalSizePx: configNumber(enemyDisplay.normalSizePx, "enemyDisplay.normalSizePx", 24, 140),
      bossSizePx: configNumber(enemyDisplay.bossSizePx, "enemyDisplay.bossSizePx", 36, 160),
      suneungSizePx: configNumber(enemyDisplay.suneungSizePx, "enemyDisplay.suneungSizePx", 36, 160),
      mobileNormalSizePx: configNumber(enemyDisplay.mobileNormalSizePx, "enemyDisplay.mobileNormalSizePx", 24, 140),
      mobileBossSizePx: configNumber(enemyDisplay.mobileBossSizePx, "enemyDisplay.mobileBossSizePx", 36, 160),
      mobileSuneungSizePx: configNumber(enemyDisplay.mobileSuneungSizePx, "enemyDisplay.mobileSuneungSizePx", 36, 160),
      defeatedOpacity: configNumber(enemyDisplay.defeatedOpacity, "enemyDisplay.defeatedOpacity", 0, 1),
    },
    enemyReaction: {
      engagedTravelPx: configNumber(enemyReaction.engagedTravelPx, "enemyReaction.engagedTravelPx", 0, 40),
      hurtTravelPx: configNumber(enemyReaction.hurtTravelPx, "enemyReaction.hurtTravelPx", 0, 30),
      rimOpacity: configNumber(enemyReaction.rimOpacity, "enemyReaction.rimOpacity", 0, 1),
    },
    enemyHpBar: {
      widthPx: configNumber(enemyHpBar.widthPx, "enemyHpBar.widthPx", 24, 160),
      heightPx: configNumber(enemyHpBar.heightPx, "enemyHpBar.heightPx", 4, 24),
      topPx: configNumber(enemyHpBar.topPx, "enemyHpBar.topPx", -40, 20),
      mobileWidthPx: configNumber(enemyHpBar.mobileWidthPx, "enemyHpBar.mobileWidthPx", 24, 180),
      mobileHeightPx: configNumber(enemyHpBar.mobileHeightPx, "enemyHpBar.mobileHeightPx", 4, 28),
      mobileTopPx: configNumber(enemyHpBar.mobileTopPx, "enemyHpBar.mobileTopPx", -44, 20),
    },
    enemySlots: {
      school: configArray(enemySlots.school, "enemySlots.school"),
      suneungSingle: configArray(enemySlots.suneungSingle, "enemySlots.suneungSingle"),
      suneungPair: configArray(enemySlots.suneungPair, "enemySlots.suneungPair"),
    },
  };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizeClass(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, "");
}

function readProfessionalSpriteManifest() {
  if (!existsSync(professionalSpriteManifestPath)) throw new Error(`professional sprite manifest 파일이 없습니다: ${professionalSpriteManifestPath}`);
  return JSON.parse(readFileSync(professionalSpriteManifestPath, "utf8"));
}

function professionalFamilyItems(manifest, familyId) {
  const families = configArray(manifest.families, "professional_sprite_manifest.families");
  const family = families.find((entry) => entry?.id === familyId);
  if (!family) throw new Error(`professional sprite manifest family 누락: ${familyId}`);
  const items = configArray(family.items, `professional_sprite_manifest.${familyId}.items`);
  const seen = new Set();
  return items.map((item, index) => {
    const id = configString(item.id, `professional_sprite_manifest.${familyId}.items[${index}].id`);
    if (seen.has(id)) throw new Error(`professional sprite manifest id 중복: ${id}`);
    seen.add(id);
    return {
      ...item,
      id,
      index,
      familyId,
      name: configString(item.name, `professional_sprite_manifest.${familyId}.${id}.name`),
      tone: configString(item.tone, `professional_sprite_manifest.${familyId}.${id}.tone`),
      motif: configString(item.motif, `professional_sprite_manifest.${familyId}.${id}.motif`),
      form: configString(item.form, `professional_sprite_manifest.${familyId}.${id}.form`),
      icon: configString(item.icon, `professional_sprite_manifest.${familyId}.${id}.icon`),
      variant: configNumber(item.variant, `professional_sprite_manifest.${familyId}.${id}.variant`, 1),
      boss: Boolean(item.boss),
      type: item.type ?? (item.boss ? "boss" : "mob"),
      direction: item.direction ?? family.direction ?? "left",
    };
  });
}

function expeditionEnemyCatalog(manifest) {
  const items = professionalFamilyItems(manifest, "expeditionEnemies");
  const mobs = items.filter((item) => !item.boss);
  const bosses = items.filter((item) => item.boss);
  if (mobs.length === 0) throw new Error("professional sprite manifest expeditionEnemies 일반 몬스터가 비어 있습니다.");
  if (bosses.length === 0) throw new Error("professional sprite manifest expeditionEnemies 보스 몬스터가 비어 있습니다.");
  const tones = toneIdsFromEnemies(items);
  for (const tone of tones) {
    if (mobItemsForTone(items, tone).length === 0) throw new Error(`expeditionEnemies ${tone} 일반 몬스터가 없습니다.`);
    if (bossItemsForTone(items, tone).length === 0) throw new Error(`expeditionEnemies ${tone} 보스 몬스터가 없습니다.`);
  }
  return items;
}

function toneIdsFromEnemies(enemyItems) {
  return Array.from(new Set(enemyItems.map((item) => item.tone)));
}

function mobItemsForTone(enemyItems, tone) {
  return enemyItems
    .filter((item) => item.tone === tone && !item.boss)
    .sort((a, b) => Number(a.variant) - Number(b.variant) || a.id.localeCompare(b.id));
}

function bossItemsForTone(enemyItems, tone) {
  return enemyItems
    .filter((item) => item.tone === tone && item.boss)
    .sort((a, b) => Number(a.variant) - Number(b.variant) || a.id.localeCompare(b.id));
}

function assetRelativePath(path) {
  return relative(resolve("src/snapshot"), path).split(sep).join("/");
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
    a: 255,
  };
}

function mix(color, other, ratio) {
  return {
    r: Math.round(color.r * (1 - ratio) + other.r * ratio),
    g: Math.round(color.g * (1 - ratio) + other.g * ratio),
    b: Math.round(color.b * (1 - ratio) + other.b * ratio),
    a: Math.round((color.a ?? 255) * (1 - ratio) + (other.a ?? 255) * ratio),
  };
}

function alpha(color, a) {
  return { ...color, a };
}

function canvas(width, height) {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

function setPixel(target, x, y, color) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const i = (Math.floor(y) * target.width + Math.floor(x)) * 4;
  const a = (color.a ?? 255) / 255;
  const inv = 1 - a;
  target.pixels[i] = Math.round(color.r * a + target.pixels[i] * inv);
  target.pixels[i + 1] = Math.round(color.g * a + target.pixels[i + 1] * inv);
  target.pixels[i + 2] = Math.round(color.b * a + target.pixels[i + 2] * inv);
  target.pixels[i + 3] = Math.min(255, Math.round((color.a ?? 255) + target.pixels[i + 3] * inv));
}

function fillRect(target, x, y, w, h, color) {
  for (let yy = Math.floor(y); yy < Math.floor(y + h); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.floor(x + w); xx += 1) setPixel(target, xx, yy, color);
  }
}

function strokeRect(target, x, y, w, h, color, size = 2) {
  fillRect(target, x, y, w, size, color);
  fillRect(target, x, y + h - size, w, size, color);
  fillRect(target, x, y, size, h, color);
  fillRect(target, x + w - size, y, size, h, color);
}

function fillEllipse(target, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(target, x, y, color);
    }
  }
}

function fillPolygon(target, points, color) {
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y += 1) {
    const nodes = [];
    let j = points.length - 1;
    for (let i = 0; i < points.length; i += 1) {
      const pi = points[i];
      const pj = points[j];
      if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
        nodes.push(Math.round(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0])));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) {
      if (nodes[i + 1] === undefined) break;
      for (let x = nodes[i]; x < nodes[i + 1]; x += 1) setPixel(target, x, y, color);
    }
  }
}

function drawLine(target, x0, y0, x1, y1, color, size = 2) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(target, x - Math.floor(size / 2), y - Math.floor(size / 2), size, size, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function drawIsoBlock(target, x, y, w, h, base) {
  const outline = hexToRgb("#17212e");
  const light = mix(base, hexToRgb("#ffffff"), 0.28);
  const dark = mix(base, hexToRgb("#000000"), 0.34);
  fillPolygon(target, [[x, y + h * 0.25], [x + w * 0.52, y], [x + w, y + h * 0.25], [x + w * 0.48, y + h * 0.52]], outline);
  fillPolygon(target, [[x + 3, y + h * 0.25], [x + w * 0.52, y + 3], [x + w - 3, y + h * 0.25], [x + w * 0.48, y + h * 0.48]], light);
  fillPolygon(target, [[x, y + h * 0.25], [x + w * 0.48, y + h * 0.52], [x + w * 0.48, y + h], [x, y + h * 0.74]], base);
  fillPolygon(target, [[x + w, y + h * 0.25], [x + w * 0.48, y + h * 0.52], [x + w * 0.48, y + h], [x + w, y + h * 0.74]], dark);
}

function drawProp(target, type, x, y, baseColor) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const gold = hexToRgb("#facc15");
  const teal = hexToRgb("#67e8f9");
  const green = hexToRgb("#bbf7d0");
  const pink = hexToRgb("#f9a8d4");
  const accent = mix(baseColor, hexToRgb("#ffffff"), 0.24);
  switch (type) {
    case "book":
      fillRect(target, x, y, 22, 16, ink);
      fillRect(target, x + 3, y + 3, 8, 10, white);
      fillRect(target, x + 12, y + 3, 7, 10, mix(baseColor, white, 0.45));
      break;
    case "bulb":
      fillEllipse(target, x + 10, y + 8, 9, 9, gold);
      strokeRect(target, x + 6, y + 16, 9, 5, ink, 2);
      drawLine(target, x + 10, y - 4, x + 10, y - 12, gold, 2);
      break;
    case "chart":
      fillRect(target, x, y, 22, 16, ink);
      fillRect(target, x + 3, y + 10, 3, 3, green);
      fillRect(target, x + 8, y + 7, 3, 6, green);
      fillRect(target, x + 13, y + 4, 3, 9, green);
      break;
    case "chip":
      fillRect(target, x + 2, y + 2, 18, 18, ink);
      fillRect(target, x + 5, y + 5, 12, 12, teal);
      for (let i = 0; i < 4; i += 1) {
        fillRect(target, x - 1, y + 5 + i * 4, 4, 2, gold);
        fillRect(target, x + 19, y + 5 + i * 4, 4, 2, gold);
      }
      break;
    case "files":
      fillRect(target, x + 4, y, 18, 20, ink);
      fillRect(target, x + 1, y + 3, 18, 20, white);
      fillRect(target, x + 5, y + 8, 10, 2, baseColor);
      fillRect(target, x + 5, y + 13, 8, 2, baseColor);
      break;
    case "flask":
      fillRect(target, x + 8, y, 8, 8, ink);
      fillPolygon(target, [[x + 5, y + 8], [x + 19, y + 8], [x + 23, y + 22], [x + 1, y + 22]], ink);
      fillPolygon(target, [[x + 8, y + 10], [x + 16, y + 10], [x + 19, y + 19], [x + 5, y + 19]], green);
      break;
    case "globe":
      fillEllipse(target, x + 12, y + 11, 11, 11, ink);
      fillEllipse(target, x + 12, y + 11, 8, 8, teal);
      drawLine(target, x + 4, y + 11, x + 20, y + 11, ink, 2);
      drawLine(target, x + 12, y + 3, x + 12, y + 19, ink, 2);
      break;
    case "gavel":
      fillRect(target, x + 4, y + 4, 20, 7, ink);
      fillRect(target, x + 7, y + 2, 14, 7, gold);
      drawLine(target, x + 9, y + 12, x + 0, y + 22, ink, 4);
      break;
    case "laptop":
      fillRect(target, x + 1, y + 2, 21, 15, ink);
      fillRect(target, x + 4, y + 5, 15, 9, teal);
      fillRect(target, x - 1, y + 18, 25, 4, ink);
      break;
    case "medic":
      fillRect(target, x + 2, y + 4, 20, 16, white);
      strokeRect(target, x + 2, y + 4, 20, 16, ink, 2);
      fillRect(target, x + 10, y + 7, 4, 10, hexToRgb("#ef4444"));
      fillRect(target, x + 7, y + 10, 10, 4, hexToRgb("#ef4444"));
      break;
    case "mic":
      fillRect(target, x + 7, y + 2, 10, 15, ink);
      fillRect(target, x + 9, y + 4, 6, 11, pink);
      drawLine(target, x + 12, y + 17, x + 12, y + 23, ink, 3);
      break;
    case "palette":
      fillEllipse(target, x + 12, y + 11, 12, 10, ink);
      fillEllipse(target, x + 12, y + 11, 9, 7, mix(baseColor, white, 0.25));
      fillRect(target, x + 7, y + 8, 3, 3, hexToRgb("#ef4444"));
      fillRect(target, x + 13, y + 7, 3, 3, gold);
      fillRect(target, x + 17, y + 12, 3, 3, teal);
      break;
    case "teacher":
      fillRect(target, x, y + 2, 24, 17, ink);
      fillRect(target, x + 3, y + 5, 18, 10, hexToRgb("#d9f99d"));
      drawLine(target, x + 6, y + 17, x + 2, y + 23, ink, 2);
      drawLine(target, x + 18, y + 17, x + 22, y + 23, ink, 2);
      break;
    default:
      drawIsoBlock(target, x, y, 22, 22, accent);
  }
}

function companionById(id) {
  const sprite = companionSprites.find((candidate) => candidate.id === id);
  if (!sprite) throw new Error(`동료 스프라이트 정의를 찾을 수 없습니다: ${id}`);
  return sprite;
}

function careerVisualProfile(career, helper) {
  const id = career?.id ?? "";
  const prop = career?.battleProp ?? helper.prop;
  let family = helper.outfit;
  let bigProp = helper.prop;
  let hat = "none";

  if (/doctor|dentist|nurse|pharmacist|clinical_lab|veterinarian/.test(id)) {
    family = id === "pharmacist" ? "pharmacy" : "medic";
    bigProp = id === "dentist" ? "tooth" : id === "pharmacist" ? "pill" : id === "veterinarian" ? "paw" : "stethoscope";
    hat = id === "nurse" ? "nurse-cap" : "medic";
  } else if (/judge|prosecutor|attorney|patent_attorney/.test(id)) {
    family = "legal";
    bigProp = id === "judge" ? "gavel" : id === "prosecutor" ? "casefile" : "scales";
    hat = id === "judge" ? "judge" : "none";
  } else if (/software|ai_|data_|robotics|semiconductor|electrical|game_developer/.test(id)) {
    family = "tech";
    bigProp = /semiconductor|robotics|electrical/.test(id) ? "chip" : /game/.test(id) ? "gamepad" : "laptop";
    hat = "glasses";
  } else if (/finance|investment|accountant|tax_|actuary|economist|banker|consultant|product_manager/.test(id)) {
    family = "business";
    bigProp = /banker|finance|investment|economist|actuary/.test(id) ? "chart" : "briefcase";
    hat = "tie";
  } else if (/professor|teacher|librarian|writer|editor|policy_researcher|research_scientist/.test(id)) {
    family = "scholar";
    bigProp = /writer|editor/.test(id) ? "pen" : /librarian/.test(id) ? "book" : "board";
    hat = /professor|research/.test(id) ? "glasses" : "none";
  } else if (/pilot|airline_crew|diplomat/.test(id)) {
    family = "traveler";
    bigProp = id === "pilot" ? "airplane" : id === "airline_crew" ? "wing" : "globe";
    hat = id === "pilot" ? "pilot" : "none";
  } else if (/police|firefighter|military|public_officer|local_admin/.test(id)) {
    family = "uniform";
    bigProp = /firefighter/.test(id) ? "helmet" : /military/.test(id) ? "medal" : /police/.test(id) ? "shield" : "stamp";
    hat = /firefighter/.test(id) ? "fire" : /military/.test(id) ? "military" : /police/.test(id) ? "police" : "none";
  } else if (/chef/.test(id)) {
    family = "chef";
    bigProp = "pan";
    hat = "chef";
  } else if (/sports_coach/.test(id)) {
    family = "coach";
    bigProp = "whistle";
    hat = "cap";
  } else if (/creator|broadcaster|journalist|animation|designer|curator|marketer/.test(id)) {
    family = /designer|curator|animation/.test(id) ? "artist" : "media";
    bigProp = /designer|curator|animation/.test(id) ? "palette" : /journalist/.test(id) ? "camera" : "mic";
    hat = /creator|broadcaster/.test(id) ? "headset" : "none";
  } else if (/architect|civil_|mechanical_|environmental_|chemical_|bio_/.test(id)) {
    family = /chemical|bio|environmental/.test(id) ? "lab" : "engineer";
    bigProp = /architect|civil/.test(id) ? "blueprint" : /mechanical/.test(id) ? "wrench" : "flask";
    hat = /architect|civil|mechanical/.test(id) ? "hardhat" : "glasses";
  } else if (/psychologist|social_worker/.test(id)) {
    family = "mentor";
    bigProp = id === "psychologist" ? "heart" : "hands";
    hat = "none";
  } else if (prop === "판결봉") {
    family = "legal";
    bigProp = "gavel";
  } else if (prop === "청진기") {
    family = "medic";
    bigProp = "stethoscope";
  } else if (prop === "노트북") {
    family = "tech";
    bigProp = "laptop";
  }

  return { family, bigProp, hat };
}

function drawBigCareerProp(target, type, x, y, baseColor) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const gold = hexToRgb("#facc15");
  const red = hexToRgb("#ef4444");
  const cyan = hexToRgb("#67e8f9");
  const green = hexToRgb("#86efac");
  const pink = hexToRgb("#f9a8d4");
  const base = mix(baseColor, white, 0.12);
  switch (type) {
    case "stethoscope":
      drawLine(target, x + 5, y + 5, x + 5, y + 26, ink, 4);
      drawLine(target, x + 28, y + 5, x + 28, y + 25, ink, 4);
      drawLine(target, x + 5, y + 26, x + 17, y + 35, ink, 4);
      drawLine(target, x + 28, y + 25, x + 17, y + 35, ink, 4);
      fillEllipse(target, x + 18, y + 36, 7, 7, cyan);
      fillEllipse(target, x + 18, y + 36, 3, 3, white);
      break;
    case "tooth":
      fillEllipse(target, x + 17, y + 18, 18, 18, ink);
      fillEllipse(target, x + 17, y + 16, 15, 15, white);
      fillPolygon(target, [[x + 4, y + 22], [x + 15, y + 43], [x + 20, y + 24]], white);
      fillPolygon(target, [[x + 17, y + 24], [x + 27, y + 43], [x + 31, y + 22]], white);
      break;
    case "pill":
      fillEllipse(target, x + 15, y + 19, 17, 12, ink);
      fillRect(target, x + 2, y + 12, 28, 16, ink);
      fillEllipse(target, x + 13, y + 18, 12, 9, white);
      fillEllipse(target, x + 25, y + 18, 12, 9, red);
      fillRect(target, x + 13, y + 10, 13, 17, red);
      fillRect(target, x + 10, y + 10, 5, 17, white);
      break;
    case "paw":
      fillEllipse(target, x + 18, y + 27, 13, 10, ink);
      fillEllipse(target, x + 18, y + 26, 10, 8, green);
      [[9, 13], [17, 9], [25, 13], [12, 22], [24, 22]].forEach(([px, py]) => fillEllipse(target, x + px, y + py, 5, 5, green));
      break;
    case "gavel":
      fillRect(target, x + 5, y + 7, 34, 11, ink);
      fillRect(target, x + 9, y + 4, 26, 11, gold);
      fillRect(target, x + 13, y + 29, 30, 7, ink);
      drawLine(target, x + 16, y + 20, x + 2, y + 41, ink, 6);
      drawLine(target, x + 17, y + 20, x + 3, y + 40, gold, 3);
      break;
    case "scales":
      drawLine(target, x + 18, y + 3, x + 18, y + 40, ink, 4);
      drawLine(target, x + 3, y + 13, x + 34, y + 13, ink, 4);
      drawLine(target, x + 8, y + 13, x + 2, y + 28, ink, 2);
      drawLine(target, x + 28, y + 13, x + 34, y + 28, ink, 2);
      fillEllipse(target, x + 3, y + 30, 10, 4, gold);
      fillEllipse(target, x + 33, y + 30, 10, 4, gold);
      fillRect(target, x + 9, y + 39, 19, 5, ink);
      break;
    case "laptop":
      fillRect(target, x + 1, y + 5, 38, 25, ink);
      fillRect(target, x + 5, y + 9, 30, 17, cyan);
      fillRect(target, x - 2, y + 32, 44, 8, ink);
      fillRect(target, x + 14, y + 33, 12, 3, white);
      break;
    case "chip":
      fillRect(target, x + 5, y + 6, 31, 31, ink);
      fillRect(target, x + 10, y + 11, 21, 21, cyan);
      fillRect(target, x + 15, y + 16, 11, 11, mix(cyan, ink, 0.28));
      for (let i = 0; i < 5; i += 1) {
        fillRect(target, x, y + 10 + i * 5, 7, 3, gold);
        fillRect(target, x + 34, y + 10 + i * 5, 7, 3, gold);
      }
      break;
    case "gamepad":
      fillEllipse(target, x + 20, y + 24, 24, 14, ink);
      fillEllipse(target, x + 20, y + 23, 20, 10, mix(baseColor, white, 0.18));
      fillRect(target, x + 8, y + 21, 12, 4, ink);
      fillRect(target, x + 12, y + 17, 4, 12, ink);
      fillEllipse(target, x + 30, y + 20, 3, 3, red);
      fillEllipse(target, x + 35, y + 25, 3, 3, cyan);
      break;
    case "chart":
      fillRect(target, x + 2, y + 6, 39, 31, ink);
      fillRect(target, x + 6, y + 10, 31, 23, white);
      fillRect(target, x + 10, y + 25, 5, 5, green);
      fillRect(target, x + 18, y + 19, 5, 11, green);
      fillRect(target, x + 26, y + 14, 5, 16, green);
      drawLine(target, x + 10, y + 28, x + 30, y + 15, red, 2);
      break;
    case "briefcase":
      fillRect(target, x + 2, y + 13, 39, 28, ink);
      fillRect(target, x + 6, y + 17, 31, 20, base);
      fillRect(target, x + 16, y + 8, 12, 7, ink);
      fillRect(target, x + 18, y + 10, 8, 5, white);
      fillRect(target, x + 18, y + 25, 7, 5, gold);
      break;
    case "book":
      fillRect(target, x + 2, y + 7, 38, 31, ink);
      fillRect(target, x + 6, y + 11, 15, 22, white);
      fillRect(target, x + 22, y + 11, 14, 22, mix(baseColor, white, 0.42));
      drawLine(target, x + 21, y + 10, x + 21, y + 35, ink, 2);
      break;
    case "board":
      fillRect(target, x + 1, y + 7, 42, 28, ink);
      fillRect(target, x + 5, y + 11, 34, 20, hexToRgb("#bbf7d0"));
      drawLine(target, x + 10, y + 25, x + 29, y + 16, ink, 2);
      fillRect(target, x + 17, y + 35, 5, 9, ink);
      break;
    case "pen":
      drawLine(target, x + 6, y + 39, x + 34, y + 5, ink, 7);
      drawLine(target, x + 8, y + 37, x + 32, y + 7, gold, 4);
      fillPolygon(target, [[x + 4, y + 41], [x + 11, y + 36], [x + 9, y + 43]], ink);
      break;
    case "mic":
      fillEllipse(target, x + 20, y + 13, 11, 14, ink);
      fillEllipse(target, x + 20, y + 12, 7, 10, pink);
      drawLine(target, x + 20, y + 27, x + 20, y + 42, ink, 5);
      fillRect(target, x + 10, y + 41, 21, 5, ink);
      break;
    case "camera":
      fillRect(target, x + 3, y + 12, 39, 26, ink);
      fillRect(target, x + 8, y + 16, 29, 18, mix(baseColor, white, 0.16));
      fillEllipse(target, x + 24, y + 25, 10, 10, cyan);
      fillEllipse(target, x + 24, y + 25, 4, 4, ink);
      fillRect(target, x + 10, y + 7, 14, 7, ink);
      break;
    case "palette":
      fillEllipse(target, x + 21, y + 23, 22, 16, ink);
      fillEllipse(target, x + 20, y + 22, 17, 12, mix(baseColor, white, 0.2));
      fillEllipse(target, x + 15, y + 20, 4, 4, red);
      fillEllipse(target, x + 24, y + 17, 4, 4, gold);
      fillEllipse(target, x + 30, y + 25, 4, 4, cyan);
      fillEllipse(target, x + 14, y + 28, 4, 4, green);
      break;
    case "globe":
      fillEllipse(target, x + 21, y + 21, 20, 20, ink);
      fillEllipse(target, x + 21, y + 21, 15, 15, cyan);
      drawLine(target, x + 6, y + 21, x + 36, y + 21, ink, 3);
      drawLine(target, x + 21, y + 6, x + 21, y + 36, ink, 3);
      fillRect(target, x + 15, y + 39, 13, 5, ink);
      break;
    case "airplane":
    case "wing":
      fillPolygon(target, [[x + 1, y + 23], [x + 42, y + 8], [x + 31, y + 27], [x + 42, y + 37]], ink);
      fillPolygon(target, [[x + 6, y + 23], [x + 35, y + 13], [x + 27, y + 26], [x + 35, y + 33]], white);
      fillRect(target, x + 18, y + 22, 18, 4, cyan);
      break;
    case "shield":
      fillPolygon(target, [[x + 21, y + 4], [x + 39, y + 12], [x + 34, y + 35], [x + 21, y + 44], [x + 8, y + 35], [x + 3, y + 12]], ink);
      fillPolygon(target, [[x + 21, y + 8], [x + 34, y + 14], [x + 30, y + 32], [x + 21, y + 39], [x + 12, y + 32], [x + 8, y + 14]], gold);
      fillRect(target, x + 17, y + 17, 8, 17, cyan);
      break;
    case "helmet":
      fillEllipse(target, x + 21, y + 19, 21, 16, ink);
      fillEllipse(target, x + 21, y + 18, 17, 12, red);
      fillRect(target, x + 6, y + 23, 31, 7, ink);
      fillRect(target, x + 17, y + 8, 9, 22, gold);
      break;
    case "medal":
      fillRect(target, x + 14, y + 4, 8, 18, red);
      fillRect(target, x + 23, y + 4, 8, 18, cyan);
      fillEllipse(target, x + 23, y + 31, 14, 14, ink);
      fillEllipse(target, x + 23, y + 30, 10, 10, gold);
      break;
    case "stamp":
      fillRect(target, x + 12, y + 6, 20, 15, ink);
      fillRect(target, x + 16, y + 9, 12, 10, base);
      fillRect(target, x + 7, y + 22, 30, 12, ink);
      fillRect(target, x + 5, y + 35, 34, 6, red);
      break;
    case "pan":
      fillEllipse(target, x + 18, y + 25, 18, 11, ink);
      fillEllipse(target, x + 18, y + 23, 14, 7, hexToRgb("#334155"));
      drawLine(target, x + 31, y + 24, x + 46, y + 17, ink, 5);
      fillRect(target, x + 10, y + 11, 5, 8, gold);
      fillRect(target, x + 24, y + 9, 5, 9, red);
      break;
    case "whistle":
      fillEllipse(target, x + 19, y + 22, 18, 14, ink);
      fillEllipse(target, x + 18, y + 21, 13, 9, gold);
      fillRect(target, x + 28, y + 17, 15, 8, ink);
      fillEllipse(target, x + 17, y + 21, 4, 4, ink);
      break;
    case "blueprint":
      fillRect(target, x + 2, y + 8, 39, 31, ink);
      fillRect(target, x + 6, y + 12, 31, 23, hexToRgb("#93c5fd"));
      drawLine(target, x + 10, y + 29, x + 31, y + 15, white, 2);
      strokeRect(target, x + 12, y + 17, 14, 12, white, 2);
      break;
    case "wrench":
      drawLine(target, x + 10, y + 37, x + 34, y + 12, ink, 8);
      drawLine(target, x + 11, y + 36, x + 33, y + 13, hexToRgb("#cbd5e1"), 4);
      fillEllipse(target, x + 36, y + 10, 10, 8, ink);
      fillEllipse(target, x + 37, y + 9, 5, 4, hexToRgb("#cbd5e1"));
      break;
    case "flask":
      fillRect(target, x + 15, y + 4, 13, 12, ink);
      fillPolygon(target, [[x + 10, y + 16], [x + 33, y + 16], [x + 42, y + 42], [x + 1, y + 42]], ink);
      fillPolygon(target, [[x + 13, y + 19], [x + 30, y + 19], [x + 35, y + 37], [x + 8, y + 37]], green);
      fillEllipse(target, x + 25, y + 30, 3, 3, white);
      break;
    case "hardhat":
      fillEllipse(target, x + 21, y + 19, 21, 14, ink);
      fillEllipse(target, x + 21, y + 17, 17, 10, gold);
      fillRect(target, x + 5, y + 23, 33, 6, ink);
      break;
    case "heart":
      fillEllipse(target, x + 14, y + 18, 12, 11, red);
      fillEllipse(target, x + 27, y + 18, 12, 11, red);
      fillPolygon(target, [[x + 3, y + 22], [x + 38, y + 22], [x + 21, y + 43]], red);
      break;
    case "hands":
      fillEllipse(target, x + 13, y + 24, 12, 9, gold);
      fillEllipse(target, x + 29, y + 24, 12, 9, gold);
      drawLine(target, x + 9, y + 27, x + 19, y + 37, ink, 4);
      drawLine(target, x + 33, y + 27, x + 23, y + 37, ink, 4);
      break;
    default:
      drawProp(target, type, x + 6, y + 8, baseColor);
  }
}

function drawCareerHat(target, ox, oy, hat, base, hair, ink) {
  const white = hexToRgb("#f8fafc");
  const gold = hexToRgb("#facc15");
  if (hat === "medic") {
    fillRect(target, ox + 55, oy + 19, 38, 12, white);
    strokeRect(target, ox + 55, oy + 19, 38, 12, ink, 2);
    fillRect(target, ox + 71, oy + 21, 4, 8, hexToRgb("#ef4444"));
    fillRect(target, ox + 68, oy + 24, 10, 3, hexToRgb("#ef4444"));
  } else if (hat === "nurse-cap") {
    fillPolygon(target, [[ox + 57, oy + 20], [ox + 82, oy + 14], [ox + 95, oy + 25], [ox + 62, oy + 31]], white);
    strokeRect(target, ox + 68, oy + 21, 9, 8, hexToRgb("#ef4444"), 2);
  } else if (hat === "judge") {
    fillRect(target, ox + 54, oy + 18, 39, 7, gold);
    fillRect(target, ox + 65, oy + 11, 17, 12, gold);
    fillRect(target, ox + 61, oy + 14, 25, 4, mix(gold, white, 0.28));
  } else if (hat === "pilot") {
    fillRect(target, ox + 54, oy + 18, 41, 12, ink);
    fillRect(target, ox + 59, oy + 15, 30, 10, mix(base, white, 0.16));
    fillRect(target, ox + 68, oy + 17, 9, 5, gold);
  } else if (hat === "police") {
    fillRect(target, ox + 55, oy + 19, 38, 11, ink);
    fillRect(target, ox + 61, oy + 15, 27, 10, mix(base, white, 0.08));
    fillRect(target, ox + 70, oy + 18, 8, 5, gold);
  } else if (hat === "fire") {
    fillEllipse(target, ox + 74, oy + 23, 28, 14, ink);
    fillEllipse(target, ox + 74, oy + 21, 23, 10, hexToRgb("#ef4444"));
    fillRect(target, ox + 53, oy + 27, 42, 7, ink);
    fillRect(target, ox + 70, oy + 14, 8, 19, gold);
  } else if (hat === "military") {
    fillRect(target, ox + 56, oy + 18, 38, 11, ink);
    fillRect(target, ox + 62, oy + 14, 27, 10, hexToRgb("#4d7c0f"));
    fillRect(target, ox + 71, oy + 17, 7, 4, gold);
  } else if (hat === "chef") {
    fillEllipse(target, ox + 61, oy + 19, 12, 10, white);
    fillEllipse(target, ox + 75, oy + 16, 14, 12, white);
    fillEllipse(target, ox + 88, oy + 20, 12, 10, white);
    fillRect(target, ox + 58, oy + 24, 37, 12, white);
    strokeRect(target, ox + 58, oy + 28, 37, 4, ink, 2);
  } else if (hat === "hardhat") {
    fillEllipse(target, ox + 75, oy + 23, 28, 13, ink);
    fillEllipse(target, ox + 75, oy + 21, 23, 10, gold);
    fillRect(target, ox + 54, oy + 27, 43, 7, ink);
    fillRect(target, ox + 72, oy + 13, 6, 18, mix(gold, white, 0.25));
  } else if (hat === "cap") {
    fillRect(target, ox + 56, oy + 18, 35, 11, ink);
    fillRect(target, ox + 62, oy + 15, 24, 10, mix(base, white, 0.1));
    fillRect(target, ox + 86, oy + 24, 16, 5, ink);
  } else if (hat === "headset") {
    drawLine(target, ox + 56, oy + 33, ox + 56, oy + 51, ink, 4);
    drawLine(target, ox + 91, oy + 31, ox + 91, oy + 49, ink, 4);
    drawLine(target, ox + 57, oy + 28, ox + 91, oy + 28, ink, 4);
    fillRect(target, ox + 88, oy + 48, 16, 5, ink);
  } else if (hat === "glasses") {
    strokeRect(target, ox + 65, oy + 48, 11, 8, ink, 2);
    strokeRect(target, ox + 80, oy + 46, 11, 8, ink, 2);
    drawLine(target, ox + 76, oy + 51, ox + 80, oy + 50, ink, 2);
    fillRect(target, ox + 55, oy + 20, 36, 11, hair);
  } else if (hat === "tie") {
    fillRect(target, ox + 70, oy + 76, 8, 26, gold);
    fillPolygon(target, [[ox + 70, oy + 101], [ox + 78, oy + 101], [ox + 74, oy + 111]], gold);
  }
}

function drawPremiumCompanion(target, ox, oy, helper, variant = 0, career = null) {
  const profile = careerVisualProfile(career, helper);
  const base = hexToRgb(career?.auraColor ?? helper.color);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const skinSet = ["#ffd39b", "#efc08d", "#e6aa74", "#f4c7a1"];
  const skin = hexToRgb(skinSet[variant % skinSet.length]);
  const hairSet = ["#111827", "#2f2430", "#4a2f22", "#5b371c", "#1f2937", "#3b2f2f"];
  const hair = hexToRgb(hairSet[(variant + (career?.choiceRank ?? 0)) % hairSet.length]);
  const dark = mix(base, ink, 0.34);
  const mid = mix(base, white, 0.12);
  const light = mix(base, white, 0.36);
  const family = profile.family;

  fillEllipse(target, ox + 82, oy + 146, 47, 8, alpha(hexToRgb("#000000"), 78));
  fillEllipse(target, ox + 81, oy + 88, 56, 60, alpha(base, 34));

  fillRect(target, ox + 54, oy + 106, 13, 32, ink);
  fillRect(target, ox + 55, oy + 107, 9, 27, mix(dark, white, 0.06));
  fillRect(target, ox + 79, oy + 104, 14, 35, ink);
  fillRect(target, ox + 81, oy + 105, 9, 30, mix(dark, ink, 0.12));
  fillRect(target, ox + 48, oy + 135, 24, 7, ink);
  fillRect(target, ox + 76, oy + 136, 27, 8, ink);
  fillRect(target, ox + 53, oy + 138, 18, 4, mix(ink, white, 0.1));
  fillRect(target, ox + 82, oy + 139, 20, 4, mix(ink, white, 0.1));

  const torso = family === "legal" ? hexToRgb("#1e293b") : family === "uniform" ? mix(base, ink, 0.18) : family === "chef" ? white : mid;
  fillPolygon(target, [[ox + 49, oy + 63], [ox + 87, oy + 57], [ox + 111, oy + 78], [ox + 99, oy + 121], [ox + 54, oy + 119], [ox + 43, oy + 80]], ink);
  fillPolygon(target, [[ox + 53, oy + 67], [ox + 84, oy + 62], [ox + 105, oy + 80], [ox + 95, oy + 115], [ox + 58, oy + 114], [ox + 47, oy + 82]], torso);
  fillPolygon(target, [[ox + 87, oy + 62], [ox + 107, oy + 79], [ox + 96, oy + 115], [ox + 88, oy + 113]], dark);
  fillRect(target, ox + 60, oy + 70, 9, 40, light);
  fillRect(target, ox + 75, oy + 68, 6, 45, mix(base, ink, 0.16));

  if (["medic", "pharmacy", "lab", "scholar", "chef"].includes(family)) {
    fillPolygon(target, [[ox + 49, oy + 67], [ox + 72, oy + 63], [ox + 69, oy + 116], [ox + 53, oy + 116], [ox + 45, oy + 83]], white);
    fillPolygon(target, [[ox + 82, oy + 62], [ox + 106, oy + 80], [ox + 96, oy + 116], [ox + 83, oy + 113]], family === "chef" ? white : mix(white, base, 0.08));
    fillRect(target, ox + 70, oy + 74, 5, 34, family === "chef" ? hexToRgb("#ef4444") : base);
    if (family === "medic") {
      fillRect(target, ox + 88, oy + 83, 6, 16, hexToRgb("#ef4444"));
      fillRect(target, ox + 83, oy + 88, 16, 6, hexToRgb("#ef4444"));
    }
  } else if (family === "legal") {
    fillPolygon(target, [[ox + 49, oy + 67], [ox + 84, oy + 61], [ox + 111, oy + 80], [ox + 100, oy + 123], [ox + 56, oy + 119], [ox + 42, oy + 82]], hexToRgb("#111827"));
    fillRect(target, ox + 61, oy + 72, 25, 13, white);
    fillRect(target, ox + 72, oy + 73, 7, 35, hexToRgb("#facc15"));
  } else if (family === "tech" || family === "engineer") {
    fillRect(target, ox + 61, oy + 72, 30, 9, mix(base, white, 0.32));
    fillRect(target, ox + 58, oy + 88, 12, 11, hexToRgb("#67e8f9"));
    fillRect(target, ox + 81, oy + 86, 13, 13, hexToRgb("#facc15"));
    drawLine(target, ox + 64, oy + 94, ox + 88, oy + 91, ink, 2);
  } else if (family === "business") {
    fillRect(target, ox + 62, oy + 70, 29, 12, white);
    fillRect(target, ox + 72, oy + 72, 8, 35, hexToRgb("#22c55e"));
    fillRect(target, ox + 55, oy + 94, 43, 6, mix(ink, base, 0.1));
  } else if (family === "uniform") {
    fillRect(target, ox + 62, oy + 72, 29, 8, mix(base, white, 0.18));
    fillRect(target, ox + 66, oy + 86, 6, 6, hexToRgb("#facc15"));
    fillRect(target, ox + 82, oy + 86, 6, 6, hexToRgb("#facc15"));
    fillRect(target, ox + 56, oy + 101, 40, 5, mix(ink, base, 0.18));
  } else if (family === "artist" || family === "media") {
    fillPolygon(target, [[ox + 53, oy + 70], [ox + 86, oy + 63], [ox + 105, oy + 80], [ox + 87, oy + 101], [ox + 60, oy + 97]], mix(base, white, 0.18));
    fillRect(target, ox + 58, oy + 103, 36, 7, dark);
    fillRect(target, ox + 66, oy + 75, 6, 6, hexToRgb("#ef4444"));
    fillRect(target, ox + 78, oy + 74, 6, 6, hexToRgb("#facc15"));
    fillRect(target, ox + 88, oy + 80, 6, 6, hexToRgb("#67e8f9"));
  } else if (family === "traveler") {
    fillRect(target, ox + 58, oy + 72, 37, 9, white);
    fillRect(target, ox + 87, oy + 70, 10, 45, dark);
    fillRect(target, ox + 62, oy + 91, 20, 6, mix(base, white, 0.2));
  } else if (family === "coach") {
    fillRect(target, ox + 57, oy + 75, 40, 9, white);
    fillRect(target, ox + 60, oy + 87, 33, 7, mix(base, white, 0.22));
    fillRect(target, ox + 61, oy + 100, 31, 6, dark);
  }

  fillRect(target, ox + 37, oy + 73, 19, 36, ink);
  fillRect(target, ox + 41, oy + 77, 12, 28, mix(base, white, 0.05));
  drawLine(target, ox + 46, oy + 83, ox + 33, oy + 100, ink, 5);
  fillEllipse(target, ox + 31, oy + 102, 7, 6, skin);
  drawLine(target, ox + 96, oy + 78, ox + 122, oy + 93, ink, 6);
  fillEllipse(target, ox + 125, oy + 96, 7, 6, skin);

  fillEllipse(target, ox + 74, oy + 40, 27, 25, ink);
  fillEllipse(target, ox + 77, oy + 39, 22, 20, skin);
  fillRect(target, ox + 55, oy + 24, 42, 16, hair);
  fillRect(target, ox + 50, oy + 34, 12, 22, mix(hair, ink, 0.2));
  fillPolygon(target, [[ox + 75, oy + 22], [ox + 97, oy + 30], [ox + 92, oy + 43], [ox + 81, oy + 35]], mix(hair, white, 0.08));
  fillEllipse(target, ox + 98, oy + 43, 7, 6, skin);
  fillRect(target, ox + 88, oy + 48, 6, 6, ink);
  fillRect(target, ox + 90, oy + 49, 2, 2, white);
  fillRect(target, ox + 92, oy + 57, 12, 3, mix(skin, ink, 0.48));
  fillRect(target, ox + 63, oy + 62, 31, 5, mix(skin, white, 0.18));

  drawCareerHat(target, ox, oy, profile.hat, base, hair, ink);
  drawBigCareerProp(target, profile.bigProp, ox + 112, oy + 78, base);

  const tier = Math.max(1, Math.min(5, career?.tier ?? 3));
  const badgeColors = ["#fde047", "#38bdf8", "#22c55e", "#fb923c", "#94a3b8"];
  fillEllipse(target, ox + 50, oy + 66, 10, 10, ink);
  fillEllipse(target, ox + 50, oy + 66, 6, 6, hexToRgb(badgeColors[tier - 1]));
  fillRect(target, ox + 52, oy + 68, 14, 2, alpha(white, 80));
  fillRect(target, ox + 103, oy + 74, 6, 39, alpha(white, 42));
  fillEllipse(target, ox + 124, oy + 96, 28, 16, alpha(mix(base, white, 0.18), 38));
}

function drawCompanionOutfit(target, ox, oy, bodyX, bodyY, bodyW, bodyH, base, helper, career) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const accent = hexToRgb(career?.auraColor ?? helper.color);
  const dark = mix(base, ink, 0.28);
  const light = mix(base, white, 0.22);
  const outfit = helper.outfit;

  fillRect(target, ox + bodyX - 4, oy + bodyY - 4, bodyW + 8, bodyH + 8, ink);
  fillRect(target, ox + bodyX, oy + bodyY, bodyW, bodyH, base);
  fillPolygon(target, [[ox + bodyX + bodyW - 1, oy + bodyY], [ox + bodyX + bodyW + 9, oy + bodyY + 8], [ox + bodyX + bodyW + 7, oy + bodyY + bodyH - 3], [ox + bodyX + bodyW - 1, oy + bodyY + bodyH]], dark);
  fillRect(target, ox + bodyX + 5, oy + bodyY + 5, 8, bodyH - 11, light);

  if (["medic", "lab"].includes(outfit)) {
    fillRect(target, ox + bodyX + 4, oy + bodyY + 5, bodyW - 9, bodyH - 8, white);
    fillRect(target, ox + bodyX + 8, oy + bodyY + 9, 4, 18, accent);
    fillRect(target, ox + bodyX + 22, oy + bodyY + 9, 4, 18, accent);
    if (outfit === "medic") {
      fillRect(target, ox + bodyX + bodyW - 13, oy + bodyY + 14, 4, 12, hexToRgb("#ef4444"));
      fillRect(target, ox + bodyX + bodyW - 17, oy + bodyY + 18, 12, 4, hexToRgb("#ef4444"));
    }
  } else if (["legal", "office"].includes(outfit)) {
    fillRect(target, ox + bodyX + 5, oy + bodyY + 4, bodyW - 10, 11, white);
    fillRect(target, ox + bodyX + 16, oy + bodyY + 5, 5, bodyH - 11, outfit === "legal" ? hexToRgb("#facc15") : accent);
    fillRect(target, ox + bodyX + 4, oy + bodyY + 18, bodyW - 9, 5, dark);
  } else if (["tech", "engineer", "analyst"].includes(outfit)) {
    fillRect(target, ox + bodyX + 6, oy + bodyY + 7, bodyW - 14, 8, mix(accent, white, 0.16));
    fillRect(target, ox + bodyX + 8, oy + bodyY + 22, 7, 7, alpha(hexToRgb("#67e8f9"), 220));
    fillRect(target, ox + bodyX + 22, oy + bodyY + 21, 8, 8, alpha(hexToRgb("#facc15"), 210));
    drawLine(target, ox + bodyX + 11, oy + bodyY + 25, ox + bodyX + 26, oy + bodyY + 25, ink, 2);
  } else if (["artist", "media"].includes(outfit)) {
    fillPolygon(target, [[ox + bodyX + 3, oy + bodyY + 7], [ox + bodyX + 22, oy + bodyY + 4], [ox + bodyX + bodyW - 4, oy + bodyY + 18], [ox + bodyX + 7, oy + bodyY + bodyH - 5]], mix(accent, white, 0.1));
    fillRect(target, ox + bodyX + 12, oy + bodyY + 28, 18, 5, dark);
  } else if (["traveler", "mentor", "scholar"].includes(outfit)) {
    fillRect(target, ox + bodyX + 5, oy + bodyY + 8, bodyW - 11, 5, white);
    fillRect(target, ox + bodyX + 9, oy + bodyY + 19, bodyW - 18, 4, mix(accent, white, 0.2));
    fillRect(target, ox + bodyX + 26, oy + bodyY + 5, 8, bodyH - 12, dark);
  }

  const tier = Math.max(1, Math.min(5, career?.tier ?? 3));
  const badgeColors = ["#fde047", "#38bdf8", "#22c55e", "#fb923c", "#94a3b8"];
  fillRect(target, ox + bodyX + bodyW - 13, oy + bodyY + 5, 10, 10, ink);
  fillRect(target, ox + bodyX + bodyW - 11, oy + bodyY + 7, 6, 6, hexToRgb(badgeColors[tier - 1]));
}

function drawCompanionCharacter(target, ox, oy, helper, variant = 0, career = null) {
  const base = hexToRgb(career?.auraColor ?? helper.color);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const skin = hexToRgb(variant % 3 === 0 ? "#ffd39b" : variant % 3 === 1 ? "#f0c391" : "#eeb182");
  const hairSet = career ? ["#111827", "#263043", "#3b2f2f", "#5b371c", "#1f2937", "#4a2f22"] : ["#1f2937", "#3b2f2f", "#553c24", "#111827"];
  const hair = hexToRgb(hairSet[variant % hairSet.length]);
  const hairShade = mix(hair, ink, 0.24);
  const prop = helper.prop;

  fillEllipse(target, ox + 64, oy + 112, 37, 8, alpha(hexToRgb("#000000"), 72));
  fillRect(target, ox + 42, oy + 85, 10, 24, ink);
  fillRect(target, ox + 58, oy + 83, 10, 27, ink);
  fillRect(target, ox + 38, oy + 105, 20, 7, ink);
  fillRect(target, ox + 59, oy + 104, 22, 8, ink);
  fillRect(target, ox + 43, oy + 86, 7, 22, mix(base, ink, 0.16));
  fillRect(target, ox + 60, oy + 84, 7, 24, mix(base, ink, 0.28));
  fillRect(target, ox + 39, oy + 108, 18, 5, mix(ink, white, 0.08));
  fillRect(target, ox + 62, oy + 107, 20, 5, mix(ink, white, 0.08));

  drawCompanionOutfit(target, ox, oy, 40, 55, 38, 42, base, helper, career);

  fillRect(target, ox + 31, oy + 63, 13, 28, ink);
  fillRect(target, ox + 34, oy + 67, 9, 22, mix(base, ink, 0.08));
  fillRect(target, ox + 76, oy + 61, 18, 12, ink);
  fillRect(target, ox + 78, oy + 62, 18, 8, mix(base, white, 0.04));
  fillRect(target, ox + 89, oy + 68, 8, 7, skin);
  drawLine(target, ox + 39, oy + 69, ox + 29, oy + 80, ink, 4);
  drawLine(target, ox + 83, oy + 66, ox + 96, oy + 75, ink, 4);

  fillRect(target, ox + 45, oy + 20, 36, 34, ink);
  fillRect(target, ox + 49, oy + 24, 28, 27, skin);
  fillRect(target, ox + 76, oy + 34, 7, 5, skin);
  fillRect(target, ox + 80, oy + 37, 4, 3, mix(skin, ink, 0.34));
  fillRect(target, ox + 44, oy + 15, 36, 12, hair);
  fillRect(target, ox + 41, oy + 23, 10, 17, hairShade);
  fillRect(target, ox + 70, oy + 20, 11, 13, hair);
  fillRect(target, ox + 76, oy + 24, 7, 5, mix(hair, white, 0.12));
  fillRect(target, ox + 65, oy + 35, 5, 5, ink);
  fillRect(target, ox + 66, oy + 36, 1, 1, white);
  fillRect(target, ox + 72, oy + 42, 9, 2, mix(skin, ink, 0.52));
  fillRect(target, ox + 49, oy + 51, 30, 4, mix(skin, white, 0.18));

  if (["tech", "engineer"].includes(helper.outfit)) {
    strokeRect(target, ox + 61, oy + 33, 12, 8, ink, 2);
    drawLine(target, ox + 73, oy + 36, ox + 78, oy + 35, ink, 2);
  } else if (helper.outfit === "legal") {
    fillRect(target, ox + 48, oy + 13, 31, 4, hexToRgb("#facc15"));
    fillRect(target, ox + 67, oy + 10, 8, 8, hexToRgb("#facc15"));
  } else if (helper.outfit === "media") {
    fillRect(target, ox + 39, oy + 28, 8, 8, mix(base, white, 0.28));
    strokeRect(target, ox + 38, oy + 27, 10, 10, ink, 2);
  }

  drawProp(target, prop, ox + 85, oy + 72, base);
  fillRect(target, ox + 83, oy + 79, 6, 5, skin);
  fillRect(target, ox + 39, oy + 55, 41, 3, alpha(white, 70));
  fillRect(target, ox + 83, oy + 56, 4, 36, alpha(white, 42));
  fillEllipse(target, ox + 89, oy + 73, 22, 13, alpha(mix(base, white, 0.14), 34));
}

function drawCompanion(target, ox, oy, spec, variant = 0) {
  drawPremiumCompanion(target, ox, oy, spec, variant, null);
}

function drawCareerCompanion(target, ox, oy, career, index) {
  const helper = companionById(career.helperSprite);
  drawPremiumCompanion(target, ox, oy, helper, index, career);
}

function drawCareerPortrait(target, ox, oy, career, index, gender) {
  if (gender !== "male" && gender !== "female") throw new Error(`직업 초상 gender 값이 올바르지 않습니다: ${career.id} / ${gender}`);
  if (typeof career.auraColor !== "string" || career.auraColor.length === 0) throw new Error(`careers.json auraColor 값이 없습니다: ${career.id}`);
  const base = hexToRgb(career.auraColor);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const bg = mix(base, hexToRgb("#0f172a"), 0.34);
  const frame = mix(base, white, 0.24);
  const helper = companionById(career.helperSprite);
  const helperBase = hexToRgb(career.auraColor);
  const isFemale = gender === "female";
  const skin = hexToRgb(index % 3 === 0 ? "#ffd39b" : index % 3 === 1 ? "#f0c391" : "#e7b07c");
  const maleHair = ["#111827", "#263043", "#3b2f2f", "#5b371c", "#1f2937"];
  const femaleHair = ["#1f2937", "#3b2f2f", "#4a2f22", "#111827", "#6b3f24"];
  const hair = hexToRgb((isFemale ? femaleHair : maleHair)[index % 5]);
  const hairShade = mix(hair, ink, 0.18);

  fillRect(target, ox + 3, oy + 4, 58, 56, alpha(ink, 245));
  fillRect(target, ox + 5, oy + 6, 54, 52, alpha(bg, 235));
  fillRect(target, ox + 7, oy + 8, 50, 48, alpha(mix(base, white, 0.1), 58));
  fillPolygon(target, [[ox + 7, oy + 56], [ox + 58, oy + 56], [ox + 58, oy + 38], [ox + 44, oy + 56]], alpha(mix(base, ink, 0.45), 235));
  strokeRect(target, ox + 4, oy + 5, 56, 54, frame, 2);

  fillEllipse(target, ox + 31, oy + 58, 24, 5, alpha(hexToRgb("#000000"), 70));
  fillRect(target, ox + 15, oy + 40, 35, 18, ink);
  fillRect(target, ox + 18, oy + 42, 27, 14, helperBase);
  fillPolygon(target, [[ox + 45, oy + 42], [ox + 53, oy + 48], [ox + 53, oy + 56], [ox + 45, oy + 56]], mix(helperBase, ink, 0.35));
  fillRect(target, ox + 23, oy + 43, 4, 12, mix(helperBase, white, 0.35));
  fillRect(target, ox + 31, oy + 43, 4, 12, mix(helperBase, ink, 0.28));

  fillRect(target, ox + 20, oy + 18, 25, 22, ink);
  fillRect(target, ox + 23, oy + 21, 19, 17, skin);
  if (isFemale) {
    fillRect(target, ox + 18, oy + 16, 8, 25, hairShade);
    fillRect(target, ox + 39, oy + 17, 7, 23, hairShade);
    fillRect(target, ox + 21, oy + 13, 24, 11, hair);
    fillRect(target, ox + 24, oy + 31, 17, 7, hairShade);
    fillRect(target, ox + 41, oy + 15, 5, 6, mix(hair, white, 0.12));
    fillRect(target, ox + 17, oy + 26, 5, 5, mix(base, white, 0.28));
  } else {
    fillRect(target, ox + 21, oy + 14, 23, 9, hair);
    fillRect(target, ox + 18, oy + 20, 8, 9, hair);
    fillRect(target, ox + 39, oy + 20, 7, 8, hair);
    fillRect(target, ox + 36, oy + 14, 8, 5, mix(hair, white, 0.1));
  }
  fillRect(target, ox + 29, oy + 29, 3, 3, ink);
  fillRect(target, ox + 38, oy + 29, 4, 3, ink);
  fillRect(target, ox + 42, oy + 32, 3, 2, mix(skin, ink, 0.4));
  fillRect(target, ox + 32, oy + 36, 8, 2, mix(skin, ink, 0.55));

  drawProp(target, helper.prop, ox + 39, oy + 33, helperBase);
  fillRect(target, ox + 47, oy + 12, 8, 34, alpha(white, 44));
  fillRect(target, ox + 9, oy + 51, 16, 4, alpha(white, 78));

  const tierColors = ["#fde047", "#38bdf8", "#22c55e", "#f97316", "#94a3b8"];
  fillRect(target, ox + 7, oy + 8, 14, 14, ink);
  fillRect(target, ox + 9, oy + 10, 10, 10, hexToRgb(tierColors[Math.max(0, Math.min(4, career.tier - 1))]));
  fillRect(target, ox + 10, oy + 11, 8, 2, alpha(white, 86));
  const rankPips = Math.max(1, Math.min(4, 5 - career.tier));
  for (let i = 0; i < rankPips; i += 1) fillRect(target, ox + 9 + i * 4, oy + 24, 3, 3, frame);
}

function drawEnemyThemeProp(target, ox, oy, tone, size = "normal") {
  const base = hexToRgb(tone.color);
  const accent = hexToRgb(tone.accent);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const scale = size === "boss" ? 1.2 : 1;
  const x = ox;
  const y = oy;

  switch (tone.motif) {
    case "rent":
      drawProp(target, "files", x, y, accent);
      fillRect(target, x + 20, y + 12, Math.round(12 * scale), 9, ink);
      fillRect(target, x + 22, y + 14, Math.round(8 * scale), 5, hexToRgb("#facc15"));
      break;
    case "deadline":
      drawProp(target, "palette", x, y, accent);
      fillRect(target, x + 20, y + 4, 9, 18, ink);
      fillRect(target, x + 23, y + 7, 4, 12, white);
      break;
    case "errand":
      fillRect(target, x + 1, y + 2, 26, 20, ink);
      fillRect(target, x + 4, y + 5, 20, 14, mix(accent, white, 0.2));
      drawLine(target, x + 8, y + 17, x + 18, y + 7, base, 2);
      fillRect(target, x + 7, y + 8, 4, 4, hexToRgb("#ef4444"));
      break;
    case "inbox":
      drawProp(target, "laptop", x, y, accent);
      fillRect(target, x + 16, y - 2, 13, 12, ink);
      fillRect(target, x + 18, y, 9, 8, white);
      break;
    case "meeting":
      fillRect(target, x + 1, y + 1, 27, 22, ink);
      fillRect(target, x + 4, y + 5, 21, 15, white);
      fillRect(target, x + 4, y + 5, 21, 4, accent);
      for (let i = 0; i < 3; i += 1) fillRect(target, x + 7 + i * 6, y + 12, 3, 3, base);
      break;
    case "market":
      drawProp(target, "chart", x, y, accent);
      fillEllipse(target, x + 24, y + 18, 7, 7, ink);
      fillEllipse(target, x + 24, y + 18, 4, 4, hexToRgb("#facc15"));
      break;
    case "permit":
      drawProp(target, "gavel", x, y, accent);
      fillRect(target, x + 20, y + 13, 12, 10, ink);
      fillRect(target, x + 22, y + 15, 8, 6, mix(base, white, 0.2));
      break;
    case "passport":
      drawProp(target, "globe", x, y, accent);
      fillRect(target, x + 21, y + 4, 12, 18, ink);
      fillRect(target, x + 23, y + 7, 8, 12, base);
      break;
    case "circuit":
      drawProp(target, "chip", x, y, accent);
      drawLine(target, x + 25, y + 5, x + 34, y - 4, accent, 2);
      drawLine(target, x + 25, y + 14, x + 35, y + 21, accent, 2);
      break;
    default:
      drawProp(target, tone.prop ?? "book", x, y, accent);
      fillEllipse(target, x + 25, y + 5, 6, 6, alpha(white, 130));
  }
}

function drawLeftFacingEnemyFace(target, ox, oy, eyeY, mouthY, boss = false) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  fillRect(target, ox + (boss ? 37 : 35), oy + eyeY, boss ? 10 : 8, boss ? 10 : 8, ink);
  fillRect(target, ox + (boss ? 39 : 37), oy + eyeY + 2, 2, 2, white);
  fillRect(target, ox + (boss ? 55 : 52), oy + eyeY + 2, boss ? 7 : 6, boss ? 8 : 7, ink);
  fillRect(target, ox + (boss ? 33 : 31), oy + mouthY, boss ? 25 : 20, boss ? 5 : 4, ink);
  fillRect(target, ox + (boss ? 35 : 33), oy + mouthY + (boss ? 5 : 4), 5, 4, white);
}

function drawEnemy(target, ox, oy, tone, variant, boss = false) {
  const base = hexToRgb(tone.color);
  const accent = hexToRgb(tone.accent);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const dark = mix(base, ink, 0.32);
  const light = mix(base, white, 0.18);

  fillEllipse(target, ox + 56, oy + 100, boss ? 39 : 31, boss ? 9 : 7, alpha(hexToRgb("#000000"), boss ? 88 : 76));

  if (boss) {
    fillPolygon(target, [[ox + 26, oy + 37], [ox + 17, oy + 15], [ox + 43, oy + 30]], accent);
    fillPolygon(target, [[ox + 80, oy + 34], [ox + 91, oy + 14], [ox + 70, oy + 34]], mix(accent, white, 0.08));
    fillRect(target, ox + 24, oy + 32, 62, 55, ink);
    fillRect(target, ox + 30, oy + 37, 50, 43, base);
    fillPolygon(target, [[ox + 30, oy + 37], [ox + 19, oy + 49], [ox + 19, oy + 77], [ox + 30, oy + 80]], light);
    fillPolygon(target, [[ox + 80, oy + 37], [ox + 91, oy + 47], [ox + 90, oy + 78], [ox + 80, oy + 80]], dark);
    fillRect(target, ox + 34, oy + 40, 36, 5, alpha(white, 72));
    drawLeftFacingEnemyFace(target, ox, oy, 49, 70, true);
    fillRect(target, ox + 14, oy + 62, 19, 12, ink);
    fillRect(target, ox + 11, oy + 64, 20, 7, accent);
    fillRect(target, ox + 75, oy + 60, 13, 25, ink);
    fillRect(target, ox + 77, oy + 62, 9, 20, dark);
    drawEnemyThemeProp(target, ox + 12, oy + 39, tone, "boss");
    fillRect(target, ox + 47, oy + 22, 19, 8, ink);
    fillRect(target, ox + 50, oy + 19, 13, 12, accent);
    return;
  }

  if (variant === 0) {
    fillRect(target, ox + 27, oy + 35, 49, 48, ink);
    fillRect(target, ox + 33, oy + 40, 38, 38, base);
    fillPolygon(target, [[ox + 33, oy + 40], [ox + 23, oy + 50], [ox + 24, oy + 76], [ox + 33, oy + 78]], light);
    fillPolygon(target, [[ox + 71, oy + 40], [ox + 82, oy + 48], [ox + 81, oy + 77], [ox + 71, oy + 78]], dark);
    fillRect(target, ox + 38, oy + 28, 31, 18, ink);
    fillRect(target, ox + 42, oy + 31, 22, 12, mix(accent, white, 0.14));
    drawLeftFacingEnemyFace(target, ox, oy, 53, 70, false);
    fillRect(target, ox + 20, oy + 65, 18, 10, ink);
    fillRect(target, ox + 18, oy + 67, 17, 6, accent);
  } else if (variant === 1) {
    fillEllipse(target, ox + 54, oy + 60, 32, 28, ink);
    fillEllipse(target, ox + 55, oy + 59, 25, 22, base);
    fillEllipse(target, ox + 32, oy + 59, 12, 17, light);
    fillRect(target, ox + 79, oy + 48, 10, 23, ink);
    fillRect(target, ox + 81, oy + 51, 7, 16, dark);
    drawLeftFacingEnemyFace(target, ox, oy, 51, 70, false);
    fillRect(target, ox + 19, oy + 71, 20, 8, ink);
    fillRect(target, ox + 16, oy + 73, 19, 5, accent);
  } else {
    drawIsoBlock(target, ox + 28, oy + 37, 56, 50, base);
    fillPolygon(target, [[ox + 35, oy + 43], [ox + 24, oy + 54], [ox + 25, oy + 75], [ox + 35, oy + 78]], light);
    drawLeftFacingEnemyFace(target, ox, oy, 56, 74, false);
    fillRect(target, ox + 73, oy + 29, 23, 20, ink);
    fillRect(target, ox + 76, oy + 32, 16, 13, accent);
    fillRect(target, ox + 22, oy + 65, 20, 9, ink);
    fillRect(target, ox + 19, oy + 67, 18, 6, accent);
  }

  drawEnemyThemeProp(target, ox + 11, oy + 43, tone);
  fillRect(target, ox + 34, oy + 41, 30, 3, alpha(white, 72));
  fillRect(target, ox + 82, oy + 43, 4, 27, alpha(white, 46));
  fillRect(target, ox + 27, oy + 77, 9, 3, alpha(mix(base, ink, 0.28), 230));
}

function studentAgeProfile(visual) {
  const age = visual.age ?? 8;
  if (visual.phase === "elementary") {
    return age <= 9
      ? {
          band: "lower-elementary",
          head: [22, 18, 25, 24],
          hairY: 11,
          body: [23, 46, 22, 18],
          legsY: 64,
          legH: 11,
          footY: 75,
          bag: [7, 50, 15, 17],
          shirt: "#5aa7ff",
          vest: "#7cc3ff",
          pants: "#2563eb",
          accent: "#fde047",
          hair: "#7c2d12",
        }
      : {
          band: "upper-elementary",
          head: [22, 16, 24, 23],
          hairY: 9,
          body: [22, 43, 25, 21],
          legsY: 64,
          legH: 13,
          footY: 77,
          bag: [7, 49, 15, 20],
          shirt: "#38bdf8",
          vest: "#60a5fa",
          pants: "#2563eb",
          accent: "#f4d35e",
          hair: "#263043",
        };
  }
  if (visual.phase === "middle") {
    return {
      band: "middle",
      head: [23, 14, 23, 22],
      hairY: 8,
      body: [21, 41, 27, 25],
      legsY: 66,
      legH: 16,
      footY: 82,
      bag: [8, 47, 14, 24],
      shirt: "#e5e7eb",
      vest: "#31508f",
      pants: "#172554",
      accent: "#f472b6",
      hair: "#1f2937",
    };
  }
  if (visual.phase === "high") {
    return {
      band: "high",
      head: [23, 12, 23, 23],
      hairY: 6,
      body: [20, 40, 29, 27],
      legsY: 67,
      legH: 18,
      footY: 84,
      bag: [9, 50, 14, 28],
      shirt: "#f8fafc",
      vest: "#334155",
      pants: "#111827",
      accent: "#facc15",
      hair: "#111827",
    };
  }
  return {
    band: "repeater",
    head: [23, 12, 23, 23],
    hairY: 7,
    body: [19, 40, 30, 28],
    legsY: 68,
    legH: 18,
    footY: 85,
    bag: [8, 52, 15, 26],
    shirt: "#475569",
    vest: "#64748b",
    pants: "#17212e",
    accent: "#fb923c",
    hair: "#111827",
  };
}

function drawMainStudent(target, ox, oy, visual, gender = "male") {
  const index = visual.order - 1;
  const profile = studentAgeProfile(visual);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const isFemale = gender === "female";
  const skin = hexToRgb(index % 3 === 0 ? "#ffd39b" : index % 3 === 1 ? "#f0c391" : "#e7b07c");
  const shirt = hexToRgb(profile.shirt);
  const vest = hexToRgb(profile.vest);
  const pants = hexToRgb(profile.pants);
  const accent = hexToRgb(profile.accent);
  const femaleHair = ["#1f2937", "#3b2f2f", "#4a2f22", "#111827", "#6b3f24"];
  const hair = hexToRgb(isFemale ? femaleHair[index % femaleHair.length] : profile.hair);
  const hairShade = mix(hair, ink, 0.16);
  const body = profile.body;
  const head = profile.head;
  const isElementary = profile.band === "lower-elementary" || profile.band === "upper-elementary";

  fillEllipse(target, ox + 33, oy + profile.footY + 9, profile.band === "lower-elementary" ? 17 : 22, 5, alpha(hexToRgb("#000000"), 72));

  if (isElementary) {
    fillRect(target, ox + 23, oy + profile.legsY, 6, profile.legH, skin);
    fillRect(target, ox + 38, oy + profile.legsY, 6, profile.legH, skin);
    fillRect(target, ox + 22, oy + profile.footY - 2, 8, 3, white);
    fillRect(target, ox + 37, oy + profile.footY - 2, 8, 3, white);
    fillRect(target, ox + 18, oy + profile.footY, 14, 6, profile.band === "lower-elementary" ? accent : pants);
    fillRect(target, ox + 35, oy + profile.footY, 15, 6, profile.band === "lower-elementary" ? hexToRgb("#ef4444") : pants);
  } else if (profile.band === "middle") {
    fillRect(target, ox + 22, oy + profile.legsY, 7, profile.legH, isFemale ? skin : pants);
    fillRect(target, ox + 38, oy + profile.legsY, 7, profile.legH, isFemale ? skin : pants);
    fillRect(target, ox + 22, oy + profile.footY - 4, 7, 4, white);
    fillRect(target, ox + 38, oy + profile.footY - 4, 7, 4, white);
    if (isFemale) fillRect(target, ox + 20, oy + profile.legsY - 5, 28, 8, mix(vest, ink, 0.16));
    fillRect(target, ox + 18, oy + profile.footY, 14, 6, pants);
    fillRect(target, ox + 35, oy + profile.footY, 15, 6, pants);
  } else {
    fillRect(target, ox + 22, oy + profile.legsY, 7, profile.legH, isFemale && profile.band !== "repeater" ? skin : pants);
    fillRect(target, ox + 39, oy + profile.legsY, 7, profile.legH, isFemale && profile.band !== "repeater" ? skin : pants);
    if (isFemale && profile.band !== "repeater") fillRect(target, ox + 20, oy + profile.legsY - 6, 30, 9, mix(vest, ink, 0.14));
    fillRect(target, ox + 19, oy + profile.footY, 14, 6, profile.band === "repeater" ? hexToRgb("#0f172a") : pants);
    fillRect(target, ox + 36, oy + profile.footY, 15, 6, profile.band === "repeater" ? hexToRgb("#0f172a") : pants);
  }

  fillRect(target, ox + body[0] - 3, oy + body[1] - 3, body[2] + 7, body[3] + 5, ink);
  if (profile.band === "middle") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 6, 9, shirt);
    fillPolygon(target, [[ox + body[0] + 4, oy + body[1] + 4], [ox + body[0] + 12, oy + body[1] + 13], [ox + body[0] + 4, oy + body[1] + 15]], white);
    fillPolygon(target, [[ox + body[0] + body[2] - 4, oy + body[1] + 4], [ox + body[0] + 15, oy + body[1] + 13], [ox + body[0] + body[2] - 4, oy + body[1] + 15]], white);
    fillRect(target, ox + body[0] + 10, oy + body[1] + 12, 9, 4, accent);
    fillRect(target, ox + body[0] + 5, oy + body[1] + 20, 4, 4, mix(vest, white, 0.2));
    fillRect(target, ox + body[0] + 12, oy + body[1] + 20, 4, 4, mix(vest, white, 0.12));
    fillRect(target, ox + body[0] + 19, oy + body[1] + 20, 4, 4, mix(vest, white, 0.2));
  } else if (profile.band === "high") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 5, oy + body[1] + 3, body[2] - 10, 12, shirt);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 8, 5, body[3] - 12, mix(vest, white, 0.07));
    fillRect(target, ox + body[0] + body[2] - 8, oy + body[1] + 8, 5, body[3] - 12, mix(vest, white, 0.07));
    fillRect(target, ox + body[0] + 13, oy + body[1] + 5, 3, body[3] - 7, mix(vest, white, 0.22));
    fillRect(target, ox + body[0] + 7, oy + body[1] + 19, 6, 5, accent);
    fillRect(target, ox + body[0] + 20, oy + body[1] + 18, 5, 5, hexToRgb("#60a5fa"));
    fillRect(target, ox + body[0] + 7, oy + body[1] + 9, body[2] - 14, 3, mix(shirt, hexToRgb("#dbeafe"), 0.35));
  } else if (profile.band === "repeater") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 6, 9, shirt);
    fillPolygon(target, [[ox + body[0] + 4, oy + body[1]], [ox + body[0] + 14, oy + body[1] + 12], [ox + body[0] + 25, oy + body[1]]], mix(shirt, white, 0.08));
    fillRect(target, ox + body[0] + 8, oy + body[1] + 17, body[2] - 16, 6, mix(vest, ink, 0.28));
    fillRect(target, ox + body[0] + 12, oy + body[1] + 6, 2, 10, accent);
    fillRect(target, ox + body[0] + 18, oy + body[1] + 6, 2, 10, accent);
  } else {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], shirt);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 7, 5, mix(shirt, white, 0.22));
    fillRect(target, ox + body[0] + 5, oy + body[1] + body[3] - 5, body[2] - 10, 5, pants);
    fillRect(target, ox + body[0] + body[2] - 7, oy + body[1] + 6, 5, 6, vest);
    fillRect(target, ox + body[0] + 9, oy + body[1] + 8, 9, 3, accent);
  }

  const sleeveLeft = isElementary ? shirt : profile.band === "repeater" ? vest : mix(vest, white, 0.06);
  const sleeveRight = isElementary ? shirt : profile.band === "repeater" ? vest : mix(vest, white, 0.06);
  fillRect(target, ox + body[0] - 7, oy + body[1] + 7, 6, Math.max(11, body[3] - 11), mix(sleeveLeft, ink, 0.05));
  fillRect(target, ox + body[0] + body[2], oy + body[1] + 4, 8, Math.max(12, body[3] - 8), sleeveRight);
  fillRect(target, ox + body[0] - 8, oy + body[1] + body[3] - 3, 7, 5, skin);
  fillRect(target, ox + body[0] + body[2] + 4, oy + body[1] + body[3] - 5, 8, 5, skin);

  const bag = profile.bag;
  fillRect(target, ox + bag[0], oy + bag[1], bag[2], bag[3], ink);
  fillRect(target, ox + bag[0] + 2, oy + bag[1] + 3, bag[2] - 4, bag[3] - 6, profile.band === "lower-elementary" ? hexToRgb("#38bdf8") : mix(vest, white, 0.12));
  fillRect(target, ox + bag[0] + 4, oy + bag[1] + 7, Math.max(4, bag[2] - 8), 3, accent);

  fillRect(target, ox + head[0] - 4, oy + head[1] - 3, head[2] + 9, head[3] + 7, ink);
  fillRect(target, ox + head[0], oy + head[1], head[2], head[3], skin);
  fillRect(target, ox + head[0] + head[2] - 1, oy + head[1] + 10, 5, 4, skin);
  fillRect(target, ox + head[0] + head[2] + 1, oy + head[1] + 13, 3, 2, mix(skin, ink, 0.28));
  if (isFemale) {
    fillRect(target, ox + head[0] - 5, oy + head[1] + 2, 8, 22, hairShade);
    fillRect(target, ox + head[0] + head[2] - 4, oy + head[1] + 1, 8, 19, hairShade);
    fillRect(target, ox + head[0] - 2, oy + profile.hairY, head[2] + 6, 10, hair);
    fillRect(target, ox + head[0] + 2, oy + head[1] + head[3] - 1, 15, 6, hairShade);
    fillRect(target, ox + head[0] - 7, oy + head[1] + 12, 4, 5, accent);
  } else {
    fillRect(target, ox + head[0] - 3, oy + profile.hairY, head[2] + 6, 10, hair);
    fillRect(target, ox + head[0] - 5, oy + head[1] + 2, 8, 10, hair);
    fillRect(target, ox + head[0] + head[2] - 2, oy + head[1] + 1, 7, 9, hair);
    fillRect(target, ox + head[0] + head[2] - 5, oy + profile.hairY + 1, 7, 5, mix(hair, white, 0.1));
  }
  fillRect(target, ox + head[0] + 9, oy + head[1] + 9, 2, 3, mix(ink, skin, 0.08));
  fillRect(target, ox + head[0] + 18, oy + head[1] + 9, 4, 4, ink);
  fillRect(target, ox + head[0] + 19, oy + head[1] + 10, 1, 1, white);
  fillRect(target, ox + head[0] + 14, oy + head[1] + 17, 9, 2, mix(skin, ink, 0.55));

  if (profile.band === "lower-elementary") {
    fillRect(target, ox + head[0] - 2, oy + 4, head[2] + 5, 6, hexToRgb("#fde047"));
    fillRect(target, ox + head[0] + head[2] - 1, oy + 8, 12, 4, hexToRgb("#fde047"));
    fillRect(target, ox + 47, oy + 56, 16, 9, accent);
    fillRect(target, ox + 51, oy + 52, 4, 17, hexToRgb("#ef4444"));
  } else if (profile.band === "upper-elementary") {
    fillRect(target, ox + 47, oy + 54, 15, 12, white);
    strokeRect(target, ox + 47, oy + 54, 15, 12, ink, 2);
    fillRect(target, ox + 51, oy + 58, 7, 2, accent);
  } else if (profile.band === "middle") {
    fillRect(target, ox + 49, oy + 50, 13, 18, hexToRgb("#dbeafe"));
    strokeRect(target, ox + 49, oy + 50, 13, 18, ink, 2);
    fillRect(target, ox + 52, oy + 56, 7, 2, accent);
  } else if (profile.band === "high") {
    fillRect(target, ox + 48, oy + 49, 14, 21, hexToRgb("#e5e7eb"));
    strokeRect(target, ox + 48, oy + 49, 14, 21, ink, 2);
    fillRect(target, ox + 51, oy + 54, 8, 2, accent);
    fillRect(target, ox + 51, oy + 60, 7, 2, hexToRgb("#94a3b8"));
  } else {
    fillRect(target, ox + 21, oy + 7, 26, 4, accent);
    fillRect(target, ox + 48, oy + 53, 13, 16, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 48, oy + 53, 13, 16, ink, 2);
    fillRect(target, ox + 52, oy + 57, 6, 2, accent);
    fillRect(target, ox + 10, oy + 66, 12, 11, hexToRgb("#f59e0b"));
    fillRect(target, ox + 12, oy + 64, 8, 3, white);
  }
}

function drawMonsterFace(target, ox, oy, leftX, rightX, y, mouthY, ink) {
  fillRect(target, ox + leftX, oy + y, 5, 6, ink);
  fillRect(target, ox + rightX, oy + y, 5, 6, ink);
  fillRect(target, ox + Math.min(leftX, rightX) + 8, oy + mouthY, 15, 3, ink);
}

function drawPaperLines(target, ox, oy, color, ink, count = 3) {
  for (let i = 0; i < count; i += 1) fillRect(target, ox, oy + i * 7, 18 - i * 2, 2, i % 2 ? ink : color);
}

function drawSchoolMonsterBase(target, ox, oy, body, base, accent, ink) {
  fillEllipse(target, ox + 48, oy + 85, 28, 7, alpha(hexToRgb("#000000"), 76));
  fillRect(target, ox + body.x - 4, oy + body.y - 4, body.w + 8, body.h + 8, ink);
  fillRect(target, ox + body.x, oy + body.y, body.w, body.h, base);
  fillRect(target, ox + body.x + 4, oy + body.y + 4, Math.max(4, body.w - 12), 4, mix(base, hexToRgb("#ffffff"), 0.25));
  fillRect(target, ox + body.x + body.w - 8, oy + body.y + 6, 5, Math.max(7, body.h - 12), mix(base, ink, 0.18));
  fillRect(target, ox + body.x + 6, oy + body.y + body.h - 9, Math.max(6, body.w - 14), 3, accent);
}

function drawElementaryMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const palette = ["#f472b6", "#60a5fa", "#facc15", "#34d399", "#fb923c", "#a78bfa"];
  const base = hexToRgb(palette[(visual.order + variant) % palette.length]);
  const accent = hexToRgb(palette[(visual.order + variant + 2) % palette.length]);
  const paper = hexToRgb("#fff7ed");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 36, 8, alpha(hexToRgb("#000000"), 84));
    fillRect(target, ox + 18, oy + 23, 58, 48, ink);
    fillRect(target, ox + 23, oy + 28, 48, 38, paper);
    fillRect(target, ox + 25, oy + 31, 44, 7, base);
    drawPaperLines(target, ox + 31, oy + 44, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 35, 56, 47, 60, ink);
    fillRect(target, ox + 10, oy + 50, 18, 19, ink);
    fillRect(target, ox + 13, oy + 53, 12, 13, accent);
    fillRect(target, ox + 66, oy + 17, 12, 37, ink);
    fillRect(target, ox + 69, oy + 20, 6, 31, hexToRgb("#fde047"));
    fillRect(target, ox + 41, oy + 13, 16, 9, hexToRgb("#fde047"));
    return;
  }

  if (variant % 4 === 0) {
    drawSchoolMonsterBase(target, ox, oy, { x: 28, y: 35, w: 36, h: 37 }, paper, accent, ink);
    fillRect(target, ox + 32, oy + 39, 28, 5, base);
    drawMonsterFace(target, ox, oy, 37, 53, 50, 63, ink);
    fillRect(target, ox + 16, oy + 56, 18, 13, accent);
    strokeRect(target, ox + 16, oy + 56, 18, 13, ink, 2);
  } else if (variant % 4 === 1) {
    fillEllipse(target, ox + 47, oy + 56, 28, 22, ink);
    fillEllipse(target, ox + 47, oy + 55, 22, 17, base);
    drawMonsterFace(target, ox, oy, 36, 53, 48, 60, ink);
    for (let i = 0; i < 5; i += 1) {
      fillRect(target, ox + 23 + i * 9, oy + 26 + (i % 2) * 5, 5, 23, palette[(i + variant) % palette.length] ? hexToRgb(palette[(i + variant) % palette.length]) : accent);
    }
  } else if (variant % 4 === 2) {
    drawIsoBlock(target, ox + 25, oy + 36, 43, 38, base);
    drawMonsterFace(target, ox, oy, 39, 54, 52, 64, ink);
    fillRect(target, ox + 12, oy + 44, 20, 19, paper);
    strokeRect(target, ox + 12, oy + 44, 20, 19, ink, 2);
    fillRect(target, ox + 16, oy + 50, 11, 2, accent);
  } else {
    fillRect(target, ox + 30, oy + 30, 36, 43, ink);
    fillRect(target, ox + 34, oy + 34, 28, 35, base);
    fillRect(target, ox + 32, oy + 23, 31, 11, accent);
    drawMonsterFace(target, ox, oy, 39, 54, 49, 62, ink);
    fillPolygon(target, [[ox + 66, oy + 35], [ox + 79, oy + 42], [ox + 66, oy + 48]], paper);
    strokeRect(target, ox + 68, oy + 39, 8, 6, ink, 2);
  }
}

function drawMiddleMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#60a5fa" : "#818cf8");
  const accent = hexToRgb(variant % 3 ? "#f8fafc" : "#facc15");
  const uniform = hexToRgb("#263b73");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 35, 8, alpha(hexToRgb("#000000"), 84));
    drawIsoBlock(target, ox + 19, oy + 25, 56, 51, uniform);
    fillRect(target, ox + 28, oy + 33, 39, 31, hexToRgb("#e5e7eb"));
    fillRect(target, ox + 45, oy + 35, 5, 27, hexToRgb("#ef4444"));
    drawMonsterFace(target, ox, oy, 36, 57, 45, 60, ink);
    fillRect(target, ox + 13, oy + 45, 18, 24, ink);
    fillRect(target, ox + 16, oy + 49, 12, 15, base);
    fillRect(target, ox + 65, oy + 19, 18, 22, ink);
    fillRect(target, ox + 68, oy + 22, 12, 16, accent);
    return;
  }

  if (variant % 4 === 0) {
    drawSchoolMonsterBase(target, ox, oy, { x: 26, y: 32, w: 42, h: 41 }, uniform, accent, ink);
    fillRect(target, ox + 32, oy + 38, 30, 5, hexToRgb("#e5e7eb"));
    fillRect(target, ox + 44, oy + 43, 4, 18, hexToRgb("#ef4444"));
    drawMonsterFace(target, ox, oy, 37, 55, 51, 65, ink);
  } else if (variant % 4 === 1) {
    fillRect(target, ox + 25, oy + 31, 43, 44, ink);
    fillRect(target, ox + 29, oy + 35, 35, 36, base);
    for (let i = 0; i < 4; i += 1) fillRect(target, ox + 33, oy + 41 + i * 7, 23, 2, accent);
    drawMonsterFace(target, ox, oy, 38, 54, 50, 65, ink);
    fillRect(target, ox + 65, oy + 42, 13, 25, ink);
    fillRect(target, ox + 68, oy + 45, 7, 19, accent);
  } else if (variant % 4 === 2) {
    drawIsoBlock(target, ox + 25, oy + 34, 45, 39, base);
    fillRect(target, ox + 33, oy + 38, 28, 25, hexToRgb("#dbeafe"));
    drawMonsterFace(target, ox, oy, 39, 54, 50, 64, ink);
    fillRect(target, ox + 12, oy + 54, 18, 14, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 12, oy + 54, 18, 14, ink, 2);
  } else {
    fillRect(target, ox + 30, oy + 28, 36, 47, ink);
    fillRect(target, ox + 34, oy + 32, 28, 39, hexToRgb("#f8fafc"));
    fillRect(target, ox + 36, oy + 36, 24, 6, base);
    drawPaperLines(target, ox + 39, oy + 49, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 39, 54, 43, 65, ink);
  }
}

function drawHighMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#334155" : "#475569");
  const accent = hexToRgb(variant % 3 ? "#7aa2ff" : "#facc15");
  const paper = hexToRgb("#f8fafc");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 37, 8, alpha(hexToRgb("#000000"), 86));
    fillRect(target, ox + 19, oy + 20, 58, 54, ink);
    fillRect(target, ox + 24, oy + 25, 48, 44, paper);
    fillRect(target, ox + 27, oy + 29, 42, 7, base);
    fillRect(target, ox + 30, oy + 43, 8, 8, ink);
    fillRect(target, ox + 53, oy + 43, 8, 8, ink);
    fillRect(target, ox + 36, oy + 60, 22, 4, ink);
    fillRect(target, ox + 64, oy + 16, 17, 17, accent);
    fillRect(target, ox + 68, oy + 20, 9, 9, ink);
    fillRect(target, ox + 11, oy + 47, 21, 21, hexToRgb("#dbeafe"));
    strokeRect(target, ox + 11, oy + 47, 21, 21, ink, 2);
    return;
  }

  if (variant % 4 === 0) {
    fillRect(target, ox + 27, oy + 29, 42, 47, ink);
    fillRect(target, ox + 31, oy + 33, 34, 39, paper);
    fillRect(target, ox + 35, oy + 39, 25, 5, base);
    for (let i = 0; i < 4; i += 1) fillRect(target, ox + 36, oy + 50 + i * 5, 18, 2, accent);
    drawMonsterFace(target, ox, oy, 39, 55, 47, 65, ink);
  } else if (variant % 4 === 1) {
    drawIsoBlock(target, ox + 24, oy + 33, 46, 40, base);
    fillRect(target, ox + 36, oy + 37, 22, 26, paper);
    fillRect(target, ox + 40, oy + 42, 4, 4, ink);
    fillRect(target, ox + 51, oy + 42, 4, 4, ink);
    fillRect(target, ox + 41, oy + 57, 13, 3, ink);
    fillRect(target, ox + 64, oy + 23, 18, 17, accent);
    strokeRect(target, ox + 64, oy + 23, 18, 17, ink, 2);
  } else if (variant % 4 === 2) {
    fillEllipse(target, ox + 47, oy + 51, 29, 24, ink);
    fillEllipse(target, ox + 47, oy + 51, 23, 18, base);
    fillRect(target, ox + 38, oy + 40, 18, 18, paper);
    drawMonsterFace(target, ox, oy, 37, 54, 49, 64, ink);
    fillRect(target, ox + 16, oy + 54, 20, 15, paper);
    strokeRect(target, ox + 16, oy + 54, 20, 15, ink, 2);
  } else {
    fillRect(target, ox + 24, oy + 31, 44, 43, ink);
    fillRect(target, ox + 29, oy + 36, 34, 33, hexToRgb("#dbeafe"));
    fillRect(target, ox + 34, oy + 42, 6, 6, ink);
    fillRect(target, ox + 52, oy + 42, 6, 6, ink);
    fillRect(target, ox + 40, oy + 60, 15, 3, ink);
    fillRect(target, ox + 66, oy + 46, 12, 18, accent);
  }
}

function drawRepeaterMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#334155" : "#1f2937");
  const accent = hexToRgb(variant % 3 ? "#fb923c" : "#facc15");
  const lamp = hexToRgb("#fef3c7");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 38, 8, alpha(hexToRgb("#000000"), 88));
    fillRect(target, ox + 18, oy + 24, 60, 48, ink);
    fillRect(target, ox + 23, oy + 29, 50, 38, base);
    fillRect(target, ox + 28, oy + 33, 40, 8, accent);
    drawMonsterFace(target, ox, oy, 36, 57, 47, 60, ink);
    fillRect(target, ox + 12, oy + 43, 20, 25, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 12, oy + 43, 20, 25, ink, 2);
    fillRect(target, ox + 65, oy + 18, 12, 35, ink);
    fillRect(target, ox + 57, oy + 18, 28, 9, lamp);
    fillEllipse(target, ox + 71, oy + 32, 25, 9, alpha(accent, 70));
    return;
  }

  if (variant % 4 === 0) {
    fillRect(target, ox + 28, oy + 31, 39, 43, ink);
    fillRect(target, ox + 32, oy + 35, 31, 35, base);
    fillRect(target, ox + 34, oy + 40, 26, 6, accent);
    drawMonsterFace(target, ox, oy, 39, 54, 51, 64, ink);
    fillRect(target, ox + 65, oy + 48, 12, 18, hexToRgb("#f59e0b"));
    fillRect(target, ox + 67, oy + 46, 8, 3, lamp);
  } else if (variant % 4 === 1) {
    drawIsoBlock(target, ox + 24, oy + 35, 47, 38, base);
    fillRect(target, ox + 34, oy + 38, 26, 24, hexToRgb("#f8fafc"));
    drawMonsterFace(target, ox, oy, 38, 55, 48, 63, ink);
    fillRect(target, ox + 14, oy + 54, 20, 15, accent);
    strokeRect(target, ox + 14, oy + 54, 20, 15, ink, 2);
  } else if (variant % 4 === 2) {
    fillEllipse(target, ox + 47, oy + 53, 28, 24, ink);
    fillEllipse(target, ox + 47, oy + 52, 22, 18, base);
    fillRect(target, ox + 37, oy + 38, 20, 12, lamp);
    drawMonsterFace(target, ox, oy, 37, 54, 52, 64, ink);
    fillRect(target, ox + 62, oy + 25, 14, 33, ink);
    fillRect(target, ox + 65, oy + 28, 8, 27, accent);
  } else {
    fillRect(target, ox + 26, oy + 28, 43, 47, ink);
    fillRect(target, ox + 30, oy + 32, 35, 39, hexToRgb("#f8fafc"));
    fillRect(target, ox + 34, oy + 36, 27, 6, base);
    drawPaperLines(target, ox + 37, oy + 48, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 38, 55, 44, 65, ink);
    fillRect(target, ox + 67, oy + 53, 12, 13, hexToRgb("#f59e0b"));
  }
}

function drawAcademicMonsterFinish(target, ox, oy, visual, variant, boss) {
  const white = hexToRgb("#f8fafc");
  const ink = hexToRgb("#17212e");
  const palettes = {
    elementary: ["#fde047", "#fb7185", "#38bdf8", "#22c55e", "#a78bfa", "#fb923c"],
    middle: ["#60a5fa", "#facc15", "#ef4444", "#dbeafe", "#34d399", "#818cf8"],
    high: ["#7aa2ff", "#facc15", "#94a3b8", "#ef4444", "#dbeafe", "#22d3ee"],
    repeater: ["#fb923c", "#facc15", "#64748b", "#fef3c7", "#38bdf8", "#c084fc"],
  };
  const colors = palettes[visual.phase] ?? palettes.repeater;
  const offset = variant % 5;

  // Small study tabs/stickers keep each monster readable without turning it into a text card.
  fillRect(target, ox + 22 - (offset % 2), oy + 57, 5, 5, ink);
  fillRect(target, ox + 18 - (offset % 2), oy + 58, 6, 6, white);
  fillRect(target, ox + 68 + (offset % 2), oy + 57, 5, 5, ink);
  fillRect(target, ox + 72 + (offset % 2), oy + 58, 6, 6, white);
  fillRect(target, ox + 37, oy + 76, 6, 5, ink);
  fillRect(target, ox + 54, oy + 76, 6, 5, ink);
  fillRect(target, ox + 35, oy + 79, 11, 4, mix(ink, hexToRgb(colors[2]), 0.18));
  fillRect(target, ox + 52, oy + 79, 11, 4, mix(ink, hexToRgb(colors[2]), 0.18));
  fillRect(target, ox + 16 + offset, oy + 73, 8, 4, alpha(hexToRgb(colors[0]), 236));
  fillRect(target, ox + 24 + offset, oy + 77, 5, 3, hexToRgb(colors[1]));
  fillRect(target, ox + 67 - offset, oy + 70, 6, 5, alpha(hexToRgb(colors[2]), 230));
  fillRect(target, ox + 72 - offset, oy + 65, 3, 3, hexToRgb(colors[3]));
  fillRect(target, ox + 18, oy + 28 + offset, 4, 7, hexToRgb(colors[4]));
  fillRect(target, ox + 21, oy + 30 + offset, 2, 2, white);
  fillRect(target, ox + 76, oy + 39 + offset, 3, 7, hexToRgb(colors[5]));
  fillRect(target, ox + 78, oy + 37 + offset, 2, 2, mix(hexToRgb(colors[5]), white, 0.45));
  if (boss) {
    fillRect(target, ox + 39, oy + 9, 5, 5, hexToRgb(colors[0]));
    fillRect(target, ox + 49, oy + 8, 6, 6, hexToRgb(colors[1]));
    fillRect(target, ox + 60, oy + 10, 4, 5, mix(hexToRgb(colors[2]), ink, 0.12));
  }
}

function drawAcademicMonster(target, ox, oy, visual, variant, boss = false) {
  if (visual.phase === "elementary") drawElementaryMonster(target, ox, oy, visual, variant, boss);
  else if (visual.phase === "middle") drawMiddleMonster(target, ox, oy, visual, variant, boss);
  else if (visual.phase === "high") drawHighMonster(target, ox, oy, visual, variant, boss);
  else drawRepeaterMonster(target, ox, oy, visual, variant, boss);
  drawAcademicMonsterFinish(target, ox, oy, visual, variant, boss);
}

function loadPreparedStudentAnimations(frameCount) {
  if (!existsSync(characterAnimationManifestPath)) throw new Error(`학생 애니메이션 manifest가 없습니다: ${characterAnimationManifestPath}`);
  if (!existsSync(characterAxisReportPath)) throw new Error(`학생 축 QA report가 없습니다: ${characterAxisReportPath}`);
  const manifest = JSON.parse(readFileSync(characterAnimationManifestPath, "utf8"));
  const report = JSON.parse(readFileSync(characterAxisReportPath, "utf8"));
  if (!Array.isArray(report.characters)) throw new Error("학생 축 QA report.characters 데이터가 배열이 아닙니다.");
  if (!Array.isArray(manifest.characters)) throw new Error("학생 애니메이션 manifest.characters 데이터가 배열이 아닙니다.");
  const approvedIds = new Set(report.characters.filter((character) => character.status === "ok").map((character) => character.id));
  const entries = new Map();
  for (const character of manifest.characters) {
    if (!approvedIds.has(character.id)) continue;
    const frames = [];
    for (let index = 0; index < frameCount; index += 1) {
      const path = resolve(outDir, "individual", "students", sanitizeClass(character.id), `move_${index}.png`);
      if (!existsSync(path)) break;
      frames.push(readPngRgba(path));
    }
    if (frames.length === frameCount) {
      entries.set(`${character.gender}:${character.studentFrame}`, { character, frames });
    }
  }
  return entries;
}

function loadPreparedProfessionalAnimations(familyId, frameCount) {
  if (!existsSync(professionalAxisReportPath)) throw new Error(`전문 스프라이트 축 QA report가 없습니다: ${professionalAxisReportPath}`);
  const report = JSON.parse(readFileSync(professionalAxisReportPath, "utf8"));
  if (!Array.isArray(report.items)) throw new Error("전문 스프라이트 축 QA report.items 데이터가 배열이 아닙니다.");
  const entries = new Map();
  for (const item of report.items) {
    if (item.family !== familyId || item.status !== "ok") continue;
    if (!Array.isArray(item.frames) || item.frames.length < frameCount) throw new Error(`전문 스프라이트 프레임 목록이 부족합니다: ${item.id}:${item.variant ?? "default"}`);
    const frames = [];
    for (const framePath of item.frames.slice(0, frameCount)) {
      const path = resolve(framePath);
      if (!existsSync(path)) throw new Error(`전문 스프라이트 프레임 파일이 없습니다: ${path}`);
      frames.push(readPngRgba(path));
    }
    entries.set(`${item.id}:${item.variant ?? "default"}`, { item, frames });
  }
  return entries;
}

function atlasFrameSlot(globalFrame, columns) {
  return {
    index: globalFrame % columns,
    row: Math.floor(globalFrame / columns),
  };
}

function buildMainStudentAtlas(gradeVisuals) {
  const genders = ["male", "female"];
  const cell = 160;
  const height = 320;
  const framesPerCharacter = 4;
  const framesPerGender = 16;
  const columns = framesPerGender * framesPerCharacter;
  const rows = genders.length;
  const target = canvas(cell * columns, cell * rows);
  const prepared = loadPreparedStudentAnimations(framesPerCharacter);
  const sorted = gradeVisuals.slice().sort((a, b) => a.studentFrame - b.studentFrame);
  const items = [];
  genders.forEach((gender, genderIndex) => {
    sorted.forEach((visual) => {
      const frame = visual.studentFrame * framesPerCharacter;
      const row = genderIndex;
      const preparedEntry = prepared.get(`${gender}:${visual.studentFrame}`);
      if (!preparedEntry) throw new Error(`준비된 학생 애니메이션 프레임이 없습니다: ${gender}:${visual.studentFrame} / ${visual.studentTitle}`);
      const frames = preparedEntry.frames;
      frames.forEach((sprite, frameOffset) => {
        blitCanvas(target, sprite, (frame + frameOffset) * cell, row * cell);
      });
      items.push({
        id: gender === "male" ? `main-student-${String(visual.studentFrame).padStart(3, "0")}` : `main-student-female-${String(visual.studentFrame).padStart(3, "0")}`,
        frame,
        row,
        gradeOrder: visual.order,
        baseFrame: visual.studentFrame,
        animationFrames: Array.from({ length: framesPerCharacter }, (_unused, frameOffset) => frame + frameOffset),
        gender,
        phase: visual.phase,
        age: visual.age,
        title: `${visual.studentTitle} ${gender === "female" ? "여" : "남"}`,
        band: studentAgeProfile(visual).band,
        source: "prepared",
      });
    });
  });
  const path = resolve(outDir, "asset-002.png");
  writePng(path, target);
  writeChromaMattePreview(target, resolve(matteDebugDir, "asset-002-students-chroma.png"));
  return { path, width: target.width, height: target.height, cell, columns, rows, framesPerGender, framesPerCharacter, genders, items };
}

function buildMainMonsterAtlas(gradeVisuals) {
  const cell = 96;
  const columns = 192;
  const rows = 1;
  const target = canvas(cell * columns, cell);
  const items = [];
  const sourceSheet = loadMainMonsterSourceSheet(cell, columns);
  const drawMonsterFrame = (ox, frame) => {
    blitCrop(target, sourceSheet, frame * cell, 0, cell, cell, ox, 0);
  };
  for (const visual of gradeVisuals) {
    visual.normalMonsterFrames.forEach((frame, variant) => {
      const ox = frame * cell;
      drawMonsterFrame(ox, frame);
      items.push({
        id: `main-monster-${String(frame).padStart(3, "0")}`,
        frame,
        phase: visual.phase,
        age: visual.age,
        gradeTitle: visual.studentTitle,
        name: visual.normalMonsterNames[variant],
        type: "normal",
        direction: "left",
      });
    });
    for (const [type, frame] of Object.entries(visual.examMonsterFrames)) {
      const ox = frame * cell;
      drawMonsterFrame(ox, frame);
      items.push({
        id: `main-monster-${String(frame).padStart(3, "0")}`,
        frame,
        phase: visual.phase,
        age: visual.age,
        gradeTitle: visual.studentTitle,
        name: visual.examMonsterNames[type],
        type,
        direction: "left",
      });
    }
  }
  const path = resolve(outDir, "asset-003.png");
  writePng(path, target);
  writeChromaMattePreview(target, resolve(matteDebugDir, "asset-003-monsters-chroma.png"));
  items.sort((a, b) => a.frame - b.frame);
  return { path, width: target.width, height: target.height, cell, columns, rows, items };
}

function clearChromaKeyGreenMatte(source) {
  const target = canvas(source.width, source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const p = (y * source.width + x) * 4;
      const color = {
        r: source.pixels[p],
        g: source.pixels[p + 1],
        b: source.pixels[p + 2],
        a: source.pixels[p + 3],
      };
      const greenDominance = color.g - Math.max(color.r, color.b);
      const matteGreen = isChromaKeyGreen(color) || (color.g > 170 && color.r < 96 && color.b < 112 && greenDominance > 72);
      target.pixels[p] = color.r;
      target.pixels[p + 1] = color.g;
      target.pixels[p + 2] = color.b;
      target.pixels[p + 3] = matteGreen ? 0 : color.a;
    }
  }
  return target;
}

function loadMainMonsterSourceSheet(cell, expectedFrames) {
  if (!existsSync(mainMonsterSourcePath)) {
    throw new Error(`Main monster green source sheet is missing: ${relative(resolve("."), mainMonsterSourcePath)}. Run python tools/generate-main-monster-sources.py first.`);
  }
  const source = readPngRgba(mainMonsterSourcePath);
  const expectedWidth = cell * expectedFrames;
  if (source.width !== expectedWidth || source.height !== cell) {
    throw new Error(`Main monster green source sheet must be ${expectedWidth}x${cell}, got ${source.width}x${source.height}.`);
  }
  return clearChromaKeyGreenMatte(source);
}

function blitCrop(target, source, sx, sy, w, h, ox, oy) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const src = ((sy + y) * source.width + (sx + x)) * 4;
      const tx = ox + x;
      const ty = oy + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const dst = (ty * target.width + tx) * 4;
      target.pixels[dst] = source.pixels[src];
      target.pixels[dst + 1] = source.pixels[src + 1];
      target.pixels[dst + 2] = source.pixels[src + 2];
      target.pixels[dst + 3] = source.pixels[src + 3];
    }
  }
}

function blitCanvas(target, source, ox, oy) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sp = (y * source.width + x) * 4;
      const tx = ox + x;
      const ty = oy + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const dp = (ty * target.width + tx) * 4;
      target.pixels[dp] = source.pixels[sp];
      target.pixels[dp + 1] = source.pixels[sp + 1];
      target.pixels[dp + 2] = source.pixels[sp + 2];
      target.pixels[dp + 3] = source.pixels[sp + 3];
    }
  }
}

function writeIndividualSprite(kind, id, sprite) {
  const path = resolve(outDir, "individual", kind, `${sanitizeClass(id)}.png`);
  writePng(path, sprite);
  return assetRelativePath(path);
}

function writePng(path, target) {
  const raw = Buffer.alloc((target.width * 4 + 1) * target.height);
  for (let y = 0; y < target.height; y += 1) {
    const rowStart = y * (target.width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(target.pixels.subarray(y * target.width * 4, (y + 1) * target.width * 4)).copy(raw, rowStart + 1);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    chunk("IHDR", Buffer.concat([u32(target.width), u32(target.height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSyncWithRetry(path, Buffer.concat([signature, ...chunks]));
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeFileSyncWithRetry(path, data) {
  const transientCodes = new Set(["EBUSY", "EPERM", "UNKNOWN"]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      writeFileSync(path, data);
      return;
    } catch (error) {
      if (!transientCodes.has(error?.code) || attempt >= 4) throw error;
      sleepSync(80 * (attempt + 1));
    }
  }
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPngRgba(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 33 || buffer.slice(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${path} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString("ascii");
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`${path} must be 8-bit RGB/RGBA PNG`);

  const raw = inflateSync(Buffer.concat(idat));
  const sourceChannels = colorType === 6 ? 4 : 3;
  const channels = 4;
  const sourceRowBytes = width * sourceChannels;
  const rowBytes = width * channels;
  const decoded = new Uint8Array(width * height * sourceChannels);
  const pixels = new Uint8Array(width * height * channels);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const rowStart = y * sourceRowBytes;
    const prevRowStart = rowStart - sourceRowBytes;
    for (let x = 0; x < sourceRowBytes; x += 1) {
      const rawByte = raw[rawOffset++];
      const left = x >= sourceChannels ? decoded[rowStart + x - sourceChannels] : 0;
      const up = y > 0 ? decoded[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= sourceChannels ? decoded[prevRowStart + x - sourceChannels] : 0;
      let value = rawByte;
      if (filter === 1) value = (rawByte + left) & 255;
      else if (filter === 2) value = (rawByte + up) & 255;
      else if (filter === 3) value = (rawByte + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (rawByte + paethPredictor(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`${path} uses unsupported PNG filter ${filter}`);
      decoded[rowStart + x] = value;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * sourceChannels;
      const dst = (y * width + x) * channels;
      pixels[dst] = decoded[src];
      pixels[dst + 1] = decoded[src + 1];
      pixels[dst + 2] = decoded[src + 2];
      pixels[dst + 3] = sourceChannels === 4 ? decoded[src + 3] : 255;
    }
  }

  return { width, height, pixels };
}

function drawSourceScaled(target, source, dx, dy, dw, dh, options = {}) {
  const sourceOffsetX = options.sourceOffsetX ?? 0;
  const sourceOffsetY = options.sourceOffsetY ?? 0;
  const sourceWidth = options.sourceWidth ?? source.width;
  const sourceHeight = options.sourceHeight ?? source.height;
  for (let y = 0; y < dh; y += 1) {
    const rawSourceY = Math.floor((y / dh) * sourceHeight);
    const sy = Math.min(source.height - 1, Math.max(0, sourceOffsetY + rawSourceY));
    for (let x = 0; x < dw; x += 1) {
      const ratioX = x / dw;
      const rawSourceX = options.mirrorX ? sourceWidth - 1 - Math.floor(ratioX * sourceWidth) : Math.floor(ratioX * sourceWidth);
      const sx = (rawSourceX + sourceOffsetX + source.width) % source.width;
      const src = (sy * source.width + sx) * 4;
      setPixel(target, dx + x, dy + y, {
        r: source.pixels[src],
        g: source.pixels[src + 1],
        b: source.pixels[src + 2],
        a: source.pixels[src + 3],
      });
    }
  }
}

function drawSourceCover(target, source, dx, dy, dw, dh, options = {}) {
  const baseOffsetX = options.sourceOffsetX ?? 0;
  const baseOffsetY = options.sourceOffsetY ?? 0;
  const baseWidth = Math.max(1, Math.min(source.width, options.sourceWidth ?? source.width));
  const baseHeight = Math.max(1, Math.min(source.height, options.sourceHeight ?? source.height));
  const targetRatio = dw / Math.max(1, dh);
  const sourceRatio = baseWidth / Math.max(1, baseHeight);
  let cropW = baseWidth;
  let cropH = baseHeight;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  if (sourceRatio > targetRatio) {
    cropW = Math.max(1, Math.round(baseHeight * targetRatio));
    const availableX = Math.max(0, baseWidth - cropW);
    const focusX = Math.max(0, Math.min(1, options.focusX ?? 0.5));
    cropOffsetX = Math.round(availableX * focusX);
  } else {
    cropH = Math.max(1, Math.round(baseWidth / targetRatio));
    const availableY = Math.max(0, baseHeight - cropH);
    const focusY = Math.max(0, Math.min(1, options.focusY ?? 0.58));
    cropOffsetY = Math.round(availableY * focusY);
  }
  drawSourceScaled(target, source, dx, dy, dw, dh, {
    mirrorX: options.mirrorX,
    sourceOffsetX: baseOffsetX + cropOffsetX,
    sourceOffsetY: baseOffsetY + cropOffsetY,
    sourceWidth: cropW,
    sourceHeight: cropH,
  });
}

function readRgbaAt(image, x, y) {
  const sx = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const i = (sy * image.width + sx) * 4;
  return { r: image.pixels[i], g: image.pixels[i + 1], b: image.pixels[i + 2], a: image.pixels[i + 3] };
}

function copyCrop(source, rect) {
  const target = canvas(rect.w, rect.h);
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const src = ((rect.y + y) * source.width + (rect.x + x)) * 4;
      const dst = (y * rect.w + x) * 4;
      target.pixels[dst] = source.pixels[src];
      target.pixels[dst + 1] = source.pixels[src + 1];
      target.pixels[dst + 2] = source.pixels[src + 2];
      target.pixels[dst + 3] = source.pixels[src + 3];
    }
  }
  return target;
}

function isChromaKeyGreen(color) {
  return color.g > 215 && color.r < 72 && color.b < 92 && color.g - Math.max(color.r, color.b) > 130;
}

function writeChromaMattePreview(source, path) {
  const target = canvas(source.width, source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const p = (y * source.width + x) * 4;
      const color = source.pixels[p + 3] <= 8
        ? chromaKeyGreen
        : { r: source.pixels[p], g: source.pixels[p + 1], b: source.pixels[p + 2], a: source.pixels[p + 3] };
      setPixel(target, x, y, color);
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writePng(path, target);
}

function spriteBounds(sprite) {
  let minX = sprite.width;
  let minY = sprite.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < sprite.height; y += 1) {
    for (let x = 0; x < sprite.width; x += 1) {
      const a = sprite.pixels[(y * sprite.width + x) * 4 + 3];
      if (a <= 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return { x: 0, y: 0, w: sprite.width, h: sprite.height };
  const pad = 4;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: Math.min(sprite.width, maxX - minX + 1 + pad * 2),
    h: Math.min(sprite.height, maxY - minY + 1 + pad * 2),
  };
}

function sampleBilinear(image, x, y) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(image.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(image.height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const c00 = readRgbaAt(image, x0, y0);
  const c10 = readRgbaAt(image, x1, y0);
  const c01 = readRgbaAt(image, x0, y1);
  const c11 = readRgbaAt(image, x1, y1);
  const lerp = (a, b, t) => a * (1 - t) + b * t;
  return {
    r: Math.round(lerp(lerp(c00.r, c10.r, tx), lerp(c01.r, c11.r, tx), ty)),
    g: Math.round(lerp(lerp(c00.g, c10.g, tx), lerp(c01.g, c11.g, tx), ty)),
    b: Math.round(lerp(lerp(c00.b, c10.b, tx), lerp(c01.b, c11.b, tx), ty)),
    a: Math.round(lerp(lerp(c00.a, c10.a, tx), lerp(c01.a, c11.a, tx), ty)),
  };
}

function drawSpriteFitted(target, sprite, cellX, cellY, cellW, cellH, options = {}) {
  const bounds = spriteBounds(sprite);
  const maxW = options.maxW ?? Math.round(cellW * 0.86);
  const maxH = options.maxH ?? Math.round(cellH * 0.9);
  const scale = Math.min(maxW / bounds.w, maxH / bounds.h);
  const drawW = Math.max(1, Math.round(bounds.w * scale));
  const drawH = Math.max(1, Math.round(bounds.h * scale));
  const dx = cellX + Math.round((cellW - drawW) / 2) + (options.offsetX ?? 0);
  const dy = cellY + Math.round(cellH - drawH - (options.bottomPad ?? 5)) + (options.offsetY ?? 0);
  for (let y = 0; y < drawH; y += 1) {
    const sy = bounds.y + (y / Math.max(1, drawH - 1)) * Math.max(1, bounds.h - 1);
    for (let x = 0; x < drawW; x += 1) {
      const sxBase = bounds.x + (x / Math.max(1, drawW - 1)) * Math.max(1, bounds.w - 1);
      const sx = options.mirrorX ? bounds.x + bounds.w - 1 - (sxBase - bounds.x) : sxBase;
      let color = sampleBilinear(sprite, sx, sy);
      if (color.a <= 10) continue;
      if (options.tint) color = mix(color, options.tint, options.tintRatio ?? 0.12);
      setPixel(target, dx + x, dy + y, color);
    }
  }
}

function samplePixel(target, x, y) {
  const sx = Math.max(0, Math.min(target.width - 1, x));
  const sy = Math.max(0, Math.min(target.height - 1, y));
  const i = (sy * target.width + sx) * 4;
  return {
    r: target.pixels[i],
    g: target.pixels[i + 1],
    b: target.pixels[i + 2],
    a: target.pixels[i + 3],
  };
}

function writePixel(target, x, y, color) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const i = (y * target.width + x) * 4;
  target.pixels[i] = color.r;
  target.pixels[i + 1] = color.g;
  target.pixels[i + 2] = color.b;
  target.pixels[i + 3] = color.a;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(Buffer.concat([typeBuffer, data])))]); 
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildCompanionAtlas(careers) {
  const cell = 160;
  const framesPerItem = 4;
  const columns = 64;
  const genders = ["male", "female"];
  const orderedCareers = careers.slice().sort((a, b) => (a.choiceRank ?? 999) - (b.choiceRank ?? 999));
  const items = [
    ...orderedCareers.map((career, index) => ({
      id: `career-unit-${sanitizeClass(career.id)}`,
      type: "career",
      careerId: career.id,
      helperSprite: career.helperSprite,
      index,
      career,
    })),
    ...companionSprites.map((sprite, index) => ({
      id: sprite.id,
      type: "helper",
      helperId: sprite.id,
      prop: sprite.prop,
      index: orderedCareers.length + index,
      sprite,
    })),
  ];
  const prepared = loadPreparedProfessionalAnimations("companions", framesPerItem);
  const totalFrames = items.length * genders.length * framesPerItem;
  const rows = Math.ceil(totalFrames / columns);
  const target = canvas(cell * columns, cell * rows);
  items.forEach((item, itemIndex) => {
    genders.forEach((gender, genderIndex) => {
      const entry = prepared.get(`${item.id}:${gender}`);
      if (!entry) throw new Error(`Prepared companion sprite missing: ${item.id}:${gender}`);
      const frameBase = (genderIndex * items.length + itemIndex) * framesPerItem;
      entry.frames.forEach((sprite, frameOffset) => {
        const slot = atlasFrameSlot(frameBase + frameOffset, columns);
        blitCanvas(target, sprite, slot.index * cell, slot.row * cell);
      });
    });
  });
  const path = resolve(outDir, "visual-companions.png");
  writePng(path, target);
  return {
    path,
    width: target.width,
    height: target.height,
    cell,
    columns,
    rows,
    framesPerItem,
    genders,
    items: items.map((item, index) => ({
      id: item.id,
      name: item.career?.name ?? item.sprite?.name ?? item.id,
      title: item.career?.name ?? item.sprite?.name ?? item.id,
      index: atlasFrameSlot(index * framesPerItem, columns).index,
      row: atlasFrameSlot(index * framesPerItem, columns).row,
      frameBase: index * framesPerItem,
      animationFrames: Array.from({ length: framesPerItem }, (_unused, frameOffset) => index * framesPerItem + frameOffset),
      genderFrameBases: Object.fromEntries(genders.map((gender, genderIndex) => [gender, (genderIndex * items.length + index) * framesPerItem])),
      type: item.type,
      careerId: item.careerId,
      supportRole: item.career?.supportRole,
      battleProp: item.career?.battleProp ?? item.sprite?.prop,
      tier: item.career?.tier,
      helperId: item.helperId ?? item.helperSprite,
      direction: "right",
    })),
  };
}

function buildEnemyAtlas(enemyItems) {
  const cell = 160;
  const framesPerItem = 4;
  const columns = 64;
  const items = configArray(enemyItems, "expedition enemy catalog");
  const prepared = loadPreparedProfessionalAnimations("expeditionEnemies", framesPerItem);
  const totalFrames = items.length * framesPerItem;
  const rows = Math.ceil(totalFrames / columns);
  const target = canvas(cell * columns, cell * rows);
  items.forEach((item, index) => {
    const entry = prepared.get(`${item.id}:default`);
    if (!entry) throw new Error(`Prepared expedition enemy sprite missing: ${item.id}:default`);
    const frameBase = index * framesPerItem;
    entry.frames.forEach((sprite, frameOffset) => {
      const slot = atlasFrameSlot(frameBase + frameOffset, columns);
      blitCanvas(target, sprite, slot.index * cell, slot.row * cell);
    });
  });
  const path = resolve(outDir, "visual-enemies.png");
  writePng(path, target);
  return {
    path,
    width: target.width,
    height: target.height,
    cell,
    columns,
    rows,
    framesPerItem,
    items: items.map((item, index) => ({
      id: item.id,
      name: item.name,
      title: item.name,
      index: atlasFrameSlot(index * framesPerItem, columns).index,
      row: atlasFrameSlot(index * framesPerItem, columns).row,
      frameBase: index * framesPerItem,
      animationFrames: Array.from({ length: framesPerItem }, (_unused, frameOffset) => index * framesPerItem + frameOffset),
      tone: item.tone,
      motif: item.motif,
      form: item.form,
      icon: item.icon,
      variant: item.variant,
      boss: item.boss,
      type: item.type,
      direction: item.direction,
    })),
  };
}

function drawCareerPortraitFromPrepared(target, ox, oy, career, gender, prepared, frameOffset = 1) {
  const entry = prepared.get(`career-unit-${sanitizeClass(career.id)}:${gender}`);
  if (!entry) throw new Error(`준비된 직업 초상 프레임이 없습니다: ${career.id}:${gender}`);
  const source = entry.frames[frameOffset];
  if (!source) throw new Error(`직업 초상 frameOffset이 없습니다: ${career.id}:${gender}:${frameOffset}`);
  const bounds = spriteBounds(source);
  const focusX = Math.max(0, bounds.x - 8);
  const focusY = Math.max(0, bounds.y - 4);
  const focusW = Math.min(source.width - focusX, bounds.w + 16);
  const focusH = Math.min(source.height - focusY, Math.max(84, Math.round(bounds.h * 0.78)));
  const focus = copyCrop(source, { x: focusX, y: focusY, w: focusW, h: focusH });
  if (typeof career.auraColor !== "string" || career.auraColor.length === 0) throw new Error(`careers.json auraColor 값이 없습니다: ${career.id}`);
  const base = hexToRgb(career.auraColor);
  fillEllipse(target, ox + 32, oy + 38, 29, 23, alpha(base, 72));
  fillEllipse(target, ox + 32, oy + 40, 25, 19, alpha(hexToRgb("#0f172a"), 34));
  drawSpriteFitted(target, focus, ox, oy, 64, 64, {
    maxW: 62,
    maxH: 63,
    bottomPad: 1,
    offsetY: 1,
  });
  return true;
}

function buildCareerAtlas(careers) {
  const cell = 64;
  const genders = ["male", "female"];
  const ordered = careers.slice().sort((a, b) => configNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - configNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`));
  const target = canvas(cell * ordered.length * genders.length, cell);
  const items = [];
  const prepared = loadPreparedProfessionalAnimations("companions", 4);
  genders.forEach((gender, genderIndex) => {
    ordered.forEach((career, index) => {
      const atlasIndex = genderIndex * ordered.length + index;
      drawCareerPortraitFromPrepared(target, atlasIndex * cell, 0, career, gender, prepared, index % 4);
      items.push({
        id: gender === "male" ? `career-${career.id}` : `career-${career.id}-female`,
        careerId: career.id,
        gender,
        index: atlasIndex,
      });
    });
  });
  const path = resolve(outDir, "visual-careers.png");
  writePng(path, target);
  return { path, width: target.width, height: target.height, cell, genders, items };
}

function gradientRect(target, x, y, w, h, top, bottom) {
  for (let yy = 0; yy < h; yy += 1) {
    const ratio = h <= 1 ? 0 : yy / (h - 1);
    fillRect(target, x, y + yy, w, 1, mix(top, bottom, ratio));
  }
}

function deterministicRange(seed, min, max) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const unit = value - Math.floor(value);
  return min + unit * (max - min);
}

function drawBackdropBuilding(target, ox, oy, width, height, base, accent, seed, lit = 0.42) {
  const ink = hexToRgb("#101827");
  const side = mix(base, ink, 0.18);
  const light = mix(base, hexToRgb("#ffffff"), 0.08);
  fillRect(target, ox, oy - height, width, height, side);
  fillRect(target, ox + 3, oy - height + 3, Math.max(2, width - 7), Math.max(2, height - 6), base);
  fillRect(target, ox + width - 8, oy - height + 5, 6, Math.max(5, height - 10), mix(base, ink, 0.24));
  fillRect(target, ox + 3, oy - height + 3, Math.max(2, width - 10), 4, light);

  const windowW = width > 58 ? 5 : 4;
  const gapX = width > 58 ? 10 : 8;
  const gapY = 13;
  for (let y = oy - height + 13; y < oy - 8; y += gapY) {
    for (let x = ox + 8; x < ox + width - 8; x += gapX) {
      const on = deterministicRange(seed + x * 0.17 + y * 0.31, 0, 1) < lit;
      if (!on) {
        fillRect(target, x, y, windowW, 4, alpha(mix(base, ink, 0.34), 190));
        continue;
      }
      const glow = deterministicRange(seed + x * 0.07, 0, 1) > 0.65 ? hexToRgb("#67e8f9") : accent;
      fillRect(target, x, y, windowW, 4, glow);
      fillRect(target, x + 1, y + 1, Math.max(1, windowW - 2), 2, mix(glow, hexToRgb("#ffffff"), 0.35));
    }
  }
}

function drawBackdropSign(target, x, y, color, seed) {
  const ink = hexToRgb("#111827");
  const w = Math.round(deterministicRange(seed, 22, 42));
  const h = Math.round(deterministicRange(seed + 5, 9, 16));
  fillRect(target, x, y, w, h, ink);
  strokeRect(target, x, y, w, h, color, 2);
  fillRect(target, x + 5, y + Math.floor(h / 2), Math.max(7, w - 12), 2, mix(color, hexToRgb("#ffffff"), 0.22));
}

function drawBackdropRow(target, yOffset, theme, rowIndex, width, height) {
  const sky = hexToRgb(theme.sky);
  const horizon = hexToRgb(theme.horizon);
  const far = hexToRgb(theme.far);
  const mid = hexToRgb(theme.mid);
  const floor = hexToRgb(theme.floor);
  const accent = hexToRgb(theme.accent);
  const ink = hexToRgb("#111827");
  const white = hexToRgb("#f8fafc");

  gradientRect(target, 0, yOffset, width, height, sky, horizon);
  fillEllipse(target, Math.round(width * 0.74), yOffset + 28, 58, 24, alpha(mix(sky, white, 0.24), 44));
  fillEllipse(target, Math.round(width * 0.22), yOffset + 48, 78, 22, alpha(mix(horizon, white, 0.18), 34));
  fillRect(target, 0, yOffset + 86, width, 5, alpha(mix(accent, white, 0.08), 128));

  for (let x = -40; x < width + 80; x += Math.round(deterministicRange(rowIndex + x * 0.021, 50, 86))) {
    const buildingWidth = Math.round(deterministicRange(rowIndex * 17 + x, 38, 82));
    const buildingHeight = Math.round(deterministicRange(rowIndex * 29 + x, 34, 88));
    drawBackdropBuilding(target, x, yOffset + 102, buildingWidth, buildingHeight, mix(far, sky, 0.12), mix(accent, white, 0.18), rowIndex * 101 + x, 0.32);
  }

  for (let x = -70; x < width + 100; x += Math.round(deterministicRange(rowIndex + x * 0.037, 96, 158))) {
    const buildingWidth = Math.round(deterministicRange(rowIndex * 47 + x, 74, 138));
    const buildingHeight = Math.round(deterministicRange(rowIndex * 53 + x, 58, 122));
    drawBackdropBuilding(target, x, yOffset + 124, buildingWidth, buildingHeight, mid, accent, rowIndex * 211 + x, 0.48);
    if (deterministicRange(rowIndex * 67 + x, 0, 1) > 0.55) drawBackdropSign(target, x + buildingWidth - 34, yOffset + 61, accent, rowIndex * 71 + x);
  }

  fillRect(target, 0, yOffset + 119, width, 7, mix(floor, ink, 0.18));
  gradientRect(target, 0, yOffset + 126, width, height - 126, mix(floor, white, 0.03), mix(floor, ink, 0.28));
  fillRect(target, 0, yOffset + 132, width, 3, alpha(mix(accent, white, 0.12), 170));
  fillRect(target, 0, yOffset + 164, width, 8, alpha(ink, 72));

  for (let x = -30; x < width + 90; x += 88) {
    const shade = x % 176 === 0 ? mix(floor, white, 0.06) : mix(floor, ink, 0.03);
    fillPolygon(target, [[x, yOffset + 139], [x + 68, yOffset + 135], [x + 103, yOffset + height], [x - 30, yOffset + height]], alpha(shade, 185));
    fillRect(target, x + 16, yOffset + 151, 44, 3, alpha(mix(white, accent, 0.35), 56));
  }

  for (let x = 42; x < width; x += 245) {
    fillRect(target, x, yOffset + 91, 4, 40, ink);
    fillRect(target, x - 5, yOffset + 87, 14, 10, accent);
    fillRect(target, x - 2, yOffset + 89, 8, 6, mix(accent, white, 0.42));
    fillEllipse(target, x + 2, yOffset + 98, 24, 10, alpha(accent, 44));
  }

  for (let i = 0; i < 22; i += 1) {
    const x = Math.round(deterministicRange(rowIndex * 503 + i, 12, width - 80));
    const y = yOffset + Math.round(deterministicRange(rowIndex * 607 + i, 136, 164));
    const w = Math.round(deterministicRange(rowIndex * 709 + i, 18, 46));
    const h = Math.round(deterministicRange(rowIndex * 811 + i, 8, 22));
    const color = deterministicRange(rowIndex * 919 + i, 0, 1) > 0.5 ? accent : mix(mid, white, 0.16);
    drawIsoBlock(target, x, y, w, h, color);
  }
}

function drawExpeditionNeonPanel(target, x, y, w, h, accent, seed) {
  const ink = hexToRgb("#0f172a");
  const white = hexToRgb("#f8fafc");
  fillRect(target, x, y, w, h, alpha(ink, 215));
  strokeRect(target, x, y, w, h, alpha(accent, 230), 3);
  fillRect(target, x + 8, y + 8, Math.max(8, w - 16), 4, alpha(mix(accent, white, 0.34), 220));
  for (let i = 0; i < 3; i += 1) {
    const barW = Math.round(deterministicRange(seed + i * 13, w * 0.28, w * 0.78));
    fillRect(target, x + 9, y + 18 + i * 12, barW, 4, alpha(i % 2 === 0 ? accent : mix(accent, white, 0.42), 210));
  }
  fillEllipse(target, x + Math.round(w * 0.5), y + Math.round(h * 0.5), Math.round(w * 0.64), Math.round(h * 0.42), alpha(accent, 28));
}

function drawExpeditionAwning(target, x, y, w, accent, seed) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  fillRect(target, x, y, w, 24, alpha(ink, 220));
  for (let i = 0; i < 6; i += 1) {
    const stripeX = x + Math.round((w / 6) * i);
    const stripeW = Math.ceil(w / 6);
    fillRect(target, stripeX, y, stripeW, 18, alpha(i % 2 === 0 ? accent : mix(accent, white, 0.55), 230));
    fillPolygon(target, [[stripeX, y + 18], [stripeX + stripeW, y + 18], [stripeX + stripeW - 4, y + 26], [stripeX + 4, y + 26]], alpha(i % 2 === 0 ? mix(accent, ink, 0.08) : white, 210));
  }
  if (deterministicRange(seed, 0, 1) > 0.45) drawExpeditionNeonPanel(target, x + Math.round(w * 0.16), y - 35, Math.round(w * 0.5), 24, accent, seed + 41);
}

function drawExpeditionTree(target, x, y, accent, seed) {
  const trunk = hexToRgb("#3f2f26");
  const leaf = mix(accent, hexToRgb("#14532d"), 0.52);
  fillRect(target, x - 4, y - 34, 8, 42, alpha(trunk, 235));
  for (let i = 0; i < 5; i += 1) {
    const cx = x + Math.round(deterministicRange(seed + i * 7, -22, 22));
    const cy = y - Math.round(deterministicRange(seed + i * 11, 40, 70));
    fillEllipse(target, cx, cy, Math.round(deterministicRange(seed + i * 17, 17, 29)), Math.round(deterministicRange(seed + i * 19, 14, 24)), alpha(leaf, 210));
  }
}

function drawExpeditionCrane(target, x, y, accent) {
  const ink = hexToRgb("#111827");
  const light = mix(accent, hexToRgb("#ffffff"), 0.24);
  drawLine(target, x, y, x, y - 118, alpha(ink, 230), 5);
  drawLine(target, x - 62, y - 114, x + 138, y - 114, alpha(light, 220), 5);
  drawLine(target, x, y - 118, x + 82, y - 64, alpha(light, 190), 3);
  drawLine(target, x, y - 118, x - 42, y - 68, alpha(light, 190), 3);
  drawLine(target, x + 104, y - 114, x + 104, y - 72, alpha(ink, 210), 2);
  fillRect(target, x + 95, y - 71, 18, 14, alpha(accent, 220));
}

function drawExpeditionFlagLine(target, x, y, count, accent, seed) {
  const ink = hexToRgb("#0f172a");
  drawLine(target, x, y, x + count * 34, y - 18, alpha(ink, 180), 2);
  for (let i = 0; i < count; i += 1) {
    const px = x + i * 34;
    const py = y - Math.round((18 / Math.max(1, count - 1)) * i);
    const color = deterministicRange(seed + i * 9, 0, 1) > 0.48 ? accent : mix(accent, hexToRgb("#ffffff"), 0.55);
    fillPolygon(target, [[px, py], [px + 20, py + 4], [px + 2, py + 16]], alpha(color, 220));
  }
}

function drawExpeditionHologram(target, x, y, accent, seed) {
  const cyan = mix(accent, hexToRgb("#67e8f9"), 0.45);
  for (let i = 0; i < 4; i += 1) {
    const rx = 34 + i * 13;
    const ry = 12 + i * 5;
    fillEllipse(target, x, y - i * 16, rx, ry, alpha(cyan, 34));
    drawLine(target, x - rx, y - i * 16, x + rx, y - i * 16, alpha(cyan, 110), 2);
  }
  fillRect(target, x - 8, y - 85, 16, 72, alpha(cyan, 72));
  for (let i = 0; i < 5; i += 1) {
    fillRect(target, x - 42 + i * 21, y - Math.round(deterministicRange(seed + i, 34, 78)), 11, 6, alpha(cyan, 170));
  }
}

function drawExpeditionSummitTower(target, x, y, accent) {
  const ink = hexToRgb("#111827");
  const gold = mix(accent, hexToRgb("#fde68a"), 0.32);
  fillPolygon(target, [[x, y - 176], [x + 34, y], [x - 34, y]], alpha(ink, 225));
  fillPolygon(target, [[x, y - 164], [x + 18, y - 18], [x - 18, y - 18]], alpha(mix(gold, ink, 0.18), 230));
  fillRect(target, x - 5, y - 210, 10, 54, alpha(gold, 225));
  fillEllipse(target, x, y - 214, 36, 12, alpha(gold, 82));
  for (let i = 0; i < 5; i += 1) {
    fillRect(target, x - 11, y - 130 + i * 20, 22, 4, alpha(gold, 190));
  }
}

function drawExpeditionPixelCloud(target, x, y, w, color, seed) {
  const cloud = alpha(color, 62);
  fillRect(target, x - Math.round(w * 0.36), y - 5, Math.round(w * 0.72), 10, cloud);
  for (let i = 0; i < 5; i += 1) {
    const cx = x + Math.round(deterministicRange(seed + i * 17, -w * 0.42, w * 0.42));
    const cy = y + Math.round(deterministicRange(seed + i * 19, -7, 7));
    fillEllipse(target, cx, cy, Math.round(deterministicRange(seed + i * 23, w * 0.12, w * 0.24)), Math.round(deterministicRange(seed + i * 29, 5, 13)), cloud);
  }
}

function drawExpeditionVoxelBuilding(target, x, groundY, w, h, base, accent, seed, options = {}) {
  const ink = hexToRgb("#0f172a");
  const white = hexToRgb("#f8fafc");
  const roofH = Math.max(7, Math.round(h * 0.08));
  const sideW = Math.max(8, Math.round(w * 0.16));
  fillRect(target, x, groundY - h, w, h, alpha(mix(base, ink, options.darkness ?? 0.12), options.opacity ?? 238));
  fillRect(target, x + 4, groundY - h + 5, Math.max(2, w - sideW - 8), Math.max(2, h - 10), alpha(base, options.opacity ?? 235));
  fillRect(target, x + w - sideW, groundY - h + 6, sideW - 3, h - 11, alpha(mix(base, ink, 0.28), options.opacity ?? 230));
  fillPolygon(target, [[x - 4, groundY - h + roofH], [x + Math.round(w * 0.5), groundY - h - roofH], [x + w + 4, groundY - h + roofH], [x + w - sideW, groundY - h + roofH + 8], [x + sideW, groundY - h + roofH + 8]], alpha(mix(base, white, 0.18), options.opacity ?? 230));
  if (options.roof === "spire") {
    fillPolygon(target, [[x + Math.round(w * 0.5), groundY - h - 46], [x + Math.round(w * 0.72), groundY - h + 4], [x + Math.round(w * 0.28), groundY - h + 4]], alpha(mix(base, accent, 0.18), options.opacity ?? 230));
    fillRect(target, x + Math.round(w * 0.5) - 3, groundY - h - 70, 6, 31, alpha(accent, 220));
  }
  if (options.roof === "antenna") {
    drawLine(target, x + Math.round(w * 0.58), groundY - h - 44, x + Math.round(w * 0.58), groundY - h - 3, alpha(accent, 180), 2);
    fillRect(target, x + Math.round(w * 0.58) - 4, groundY - h - 47, 8, 8, alpha(accent, 210));
  }
  if (options.roof === "slope") {
    fillPolygon(target, [[x - 4, groundY - h + 12], [x + Math.round(w * 0.45), groundY - h - 28], [x + w + 5, groundY - h + 12]], alpha(mix(accent, ink, 0.18), options.opacity ?? 230));
  }
  if (options.windows !== false) {
    const windowW = Math.max(4, Math.round(w / 12));
    const gapX = Math.max(11, Math.round(w / 6));
    const gapY = Math.max(13, Math.round(h / 9));
    for (let yy = groundY - h + 24; yy < groundY - 14; yy += gapY) {
      for (let xx = x + 12; xx < x + w - sideW - 8; xx += gapX) {
        const on = deterministicRange(seed + xx * 0.11 + yy * 0.23, 0, 1) < (options.lit ?? 0.45);
        const color = on ? mix(accent, white, deterministicRange(seed + xx, 0.05, 0.35)) : mix(base, ink, 0.34);
        fillRect(target, xx, yy, windowW, 5, alpha(color, on ? 218 : 150));
      }
    }
  }
}

function drawExpeditionLowShop(target, x, groundY, w, h, body, accent, seed, options = {}) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  fillRect(target, x, groundY - h, w, h, alpha(body, 228));
  fillRect(target, x + 8, groundY - h + 12, w - 16, h - 18, alpha(mix(body, white, 0.06), 228));
  if (options.awning !== false) drawExpeditionAwning(target, x + 6, groundY - h + 8, w - 12, accent, seed);
  fillRect(target, x + 18, groundY - 42, Math.round(w * 0.34), 31, alpha(mix(ink, body, 0.18), 220));
  fillRect(target, x + Math.round(w * 0.58), groundY - 45, Math.round(w * 0.3), 28, alpha(mix(accent, white, 0.1), 190));
  strokeRect(target, x, groundY - h, w, h, alpha(ink, 180), 2);
}

function drawExpeditionMarketStall(target, x, groundY, w, accent, seed) {
  const ink = hexToRgb("#17212e");
  const wood = hexToRgb("#8b5a31");
  drawExpeditionAwning(target, x, groundY - 68, w, accent, seed);
  fillRect(target, x + 12, groundY - 45, w - 24, 38, alpha(wood, 226));
  for (let i = 0; i < 5; i += 1) {
    const px = x + 22 + i * Math.round((w - 44) / 5);
    fillEllipse(target, px, groundY - 30, 13, 8, alpha(i % 2 ? accent : mix(accent, hexToRgb("#f97316"), 0.45), 225));
  }
  fillRect(target, x + 10, groundY - 8, w - 20, 8, alpha(ink, 160));
}

function drawExpeditionBusStop(target, x, groundY, accent) {
  const ink = hexToRgb("#17212e");
  fillRect(target, x, groundY - 72, 118, 72, alpha(ink, 178));
  strokeRect(target, x, groundY - 72, 118, 72, alpha(accent, 220), 3);
  fillRect(target, x + 8, groundY - 60, 72, 42, alpha(hexToRgb("#e0f2fe"), 68));
  fillRect(target, x + 86, groundY - 62, 21, 45, alpha(accent, 205));
  fillRect(target, x + 8, groundY - 8, 96, 6, alpha(ink, 210));
}

function drawExpeditionSkyBridge(target, x, y, w, accent) {
  const ink = hexToRgb("#17212e");
  fillRect(target, x, y, w, 24, alpha(ink, 192));
  strokeRect(target, x, y, w, 24, alpha(accent, 190), 2);
  for (let px = x + 14; px < x + w - 12; px += 28) fillRect(target, px, y + 8, 14, 6, alpha(mix(accent, hexToRgb("#ffffff"), 0.34), 178));
}

function drawExpeditionHarborCrane(target, x, y, accent) {
  const ink = hexToRgb("#17212e");
  drawLine(target, x, y, x + 32, y - 108, alpha(ink, 230), 5);
  drawLine(target, x + 32, y - 108, x + 176, y - 102, alpha(accent, 220), 5);
  drawLine(target, x + 32, y - 108, x - 42, y - 76, alpha(accent, 195), 4);
  drawLine(target, x + 138, y - 104, x + 138, y - 45, alpha(ink, 200), 2);
  fillRect(target, x + 126, y - 45, 26, 18, alpha(accent, 215));
}

function drawExpeditionAircraft(target, x, y, accent) {
  const white = hexToRgb("#f8fafc");
  fillRect(target, x, y, 74, 8, alpha(white, 190));
  fillPolygon(target, [[x + 40, y + 3], [x + 16, y + 21], [x + 56, y + 9]], alpha(mix(accent, white, 0.28), 180));
  fillPolygon(target, [[x + 56, y + 2], [x + 80, y - 12], [x + 69, y + 8]], alpha(mix(accent, white, 0.18), 180));
}

function drawExpeditionMaglevRail(target, x, y, w, accent) {
  const ink = hexToRgb("#0f172a");
  drawLine(target, x, y, x + w, y - 26, alpha(mix(accent, ink, 0.08), 180), 7);
  drawLine(target, x, y + 12, x + w, y - 14, alpha(ink, 165), 4);
  fillRect(target, x + Math.round(w * 0.38), y - 38, 188, 28, alpha(mix(accent, hexToRgb("#67e8f9"), 0.36), 160));
  strokeRect(target, x + Math.round(w * 0.38), y - 38, 188, 28, alpha(accent, 220), 2);
}

function drawExpeditionSummitHall(target, x, groundY, w, accent) {
  const ink = hexToRgb("#17212e");
  const gold = mix(accent, hexToRgb("#fde68a"), 0.24);
  fillPolygon(target, [[x, groundY - 74], [x + Math.round(w * 0.5), groundY - 128], [x + w, groundY - 74]], alpha(gold, 230));
  fillRect(target, x + 16, groundY - 74, w - 32, 70, alpha(mix(gold, ink, 0.22), 235));
  for (let i = 0; i < 6; i += 1) fillRect(target, x + 38 + i * Math.round((w - 80) / 6), groundY - 64, 12, 58, alpha(mix(gold, hexToRgb("#fff7ad"), 0.2), 220));
  strokeRect(target, x + 16, groundY - 74, w - 32, 70, alpha(ink, 170), 2);
}

function drawExpeditionSky(target, theme, index, width, height) {
  const skyTop = hexToRgb(theme.skyTop ?? theme.sky);
  const sky = hexToRgb(theme.sky);
  const horizon = hexToRgb(theme.horizon);
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const white = hexToRgb("#f8fafc");
  const roadTop = Math.round(height * 0.54);
  gradientRect(target, 0, 0, width, roadTop + 8, skyTop, horizon);

  const night = theme.timeOfDay.includes("night") || theme.timeOfDay.includes("midnight");
  if (night) {
    for (let i = 0; i < 120; i += 1) {
      const x = Math.round(deterministicRange(index * 1301 + i * 17, 0, width - 1));
      const y = Math.round(deterministicRange(index * 1559 + i * 19, 8, 145));
      const size = deterministicRange(index * 1709 + i, 0, 1) > 0.86 ? 2 : 1;
      fillRect(target, x, y, size, size, alpha(mix(white, accent2, 0.16), 120));
    }
    fillEllipse(target, Math.round(width * 0.82), 58, 42, 42, alpha(mix(accent2, white, 0.45), 145));
    fillEllipse(target, Math.round(width * 0.82) - 12, 50, 36, 36, alpha(skyTop, 180));
  } else {
    const sunX = theme.timeOfDay.includes("sunset") || theme.timeOfDay.includes("summit") ? Math.round(width * 0.72) : Math.round(width * 0.2);
    const sunY = theme.timeOfDay.includes("noon") ? 58 : 96;
    fillEllipse(target, sunX, sunY, 52, 52, alpha(mix(accent2, white, 0.22), 150));
    fillEllipse(target, sunX, sunY, 31, 31, alpha(mix(accent2, white, 0.45), 210));
  }

  for (let i = 0; i < 10; i += 1) {
    const x = Math.round(deterministicRange(index * 701 + i * 31, 70, width - 70));
    const y = Math.round(deterministicRange(index * 811 + i * 37, 34, 136));
    const w = Math.round(deterministicRange(index * 929 + i * 41, 96, 210));
    drawExpeditionPixelCloud(target, x, y, w, mix(white, sky, night ? 0.52 : 0.2), index * 37 + i);
  }

  if (theme.timeOfDay === "rainy-evening") {
    for (let x = -20; x < width + 40; x += 42) drawLine(target, x, 18, x - 28, roadTop - 12, alpha(mix(white, sky, 0.3), 62), 1);
  }
}

function drawExpeditionFarLayer(target, theme, index, width, height) {
  const far = hexToRgb(theme.far);
  const mid = hexToRgb(theme.mid);
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const roadTop = Math.round(height * 0.54);
  const farGround = roadTop - 118;
  const midGround = roadTop - 72;

  if (theme.id === "neighborhood") {
    for (let x = -80; x < width + 120; x += 190) {
      fillEllipse(target, x + 82, farGround + 28, 180, 64, alpha(mix(far, hexToRgb("#84cc16"), 0.22), 210));
    }
  } else if (theme.id === "summit") {
    for (let x = -160; x < width + 220; x += 300) {
      fillPolygon(target, [[x, farGround + 90], [x + 150, farGround - 72], [x + 330, farGround + 90]], alpha(mix(far, accent, 0.08), 218));
      fillPolygon(target, [[x + 116, farGround - 36], [x + 150, farGround - 72], [x + 188, farGround - 33]], alpha(mix(accent2, hexToRgb("#ffffff"), 0.38), 185));
    }
  } else {
    for (let x = -60; x < width + 90; x += Math.round(deterministicRange(index * 97 + x * 0.019, 126, 220))) {
      const w = Math.round(deterministicRange(index * 31 + x, theme.id === "studio" ? 54 : 70, theme.id === "office" || theme.id === "company" ? 150 : 118));
      const h = Math.round(deterministicRange(index * 47 + x, 48, theme.id === "office" || theme.id === "company" || theme.id === "future" ? 176 : 118));
      const roof = theme.id === "future" ? "spire" : theme.id === "studio" ? "antenna" : "flat";
      drawExpeditionVoxelBuilding(target, x, farGround + 44, w, h, alpha(mix(far, hexToRgb(theme.sky), 0.08), 210), alpha(accent, 170), index * 991 + x, { lit: theme.timeOfDay.includes("night") ? 0.6 : 0.2, roof, opacity: 190 });
    }
  }

  for (let x = -120; x < width + 170; x += Math.round(deterministicRange(index * 177 + x * 0.023, 230, 390))) {
    const w = Math.round(deterministicRange(index * 211 + x, theme.id === "neighborhood" ? 150 : 96, theme.id === "company" || theme.id === "office" ? 236 : 178));
    const h = Math.round(deterministicRange(index * 223 + x, theme.id === "neighborhood" ? 46 : 78, theme.id === "office" || theme.id === "future" ? 230 : 160));
    const roof = theme.id === "national" ? "antenna" : theme.id === "neighborhood" || theme.id === "shelter" ? "slope" : theme.id === "future" ? "spire" : "flat";
    drawExpeditionVoxelBuilding(target, x, midGround + 34, w, h, alpha(mid, 226), alpha(accent, 205), index * 1223 + x, { lit: theme.timeOfDay.includes("night") || theme.timeOfDay.includes("evening") ? 0.62 : 0.34, roof, opacity: 222 });
  }

  if (theme.id === "national") {
    for (let x = 260; x < width; x += 680) drawExpeditionCrane(target, x, midGround + 12, accent);
  }
  if (theme.id === "global") {
    for (let x = 180; x < width; x += 760) drawExpeditionHarborCrane(target, x, midGround + 36, accent2);
    drawExpeditionAircraft(target, Math.round(width * 0.66), 72, accent);
  }
  if (theme.id === "future") {
    for (let x = 240; x < width; x += 790) drawExpeditionMaglevRail(target, x, midGround + 10, 460, accent2);
  }
}

function drawExpeditionRoad(target, theme, width, height) {
  const roadTop = Math.round(height * 0.54);
  const road = hexToRgb(theme.road ?? theme.floor);
  const roadDark = hexToRgb(theme.roadDark ?? "#111827");
  const floor = hexToRgb(theme.floor);
  const accent = hexToRgb(theme.accent);
  const white = hexToRgb("#f8fafc");
  const ink = hexToRgb("#0f172a");
  fillRect(target, 0, roadTop - 12, width, 10, alpha(mix(floor, ink, 0.2), 220));
  fillRect(target, 0, roadTop - 3, width, 3, alpha(mix(accent, white, 0.12), 165));
  gradientRect(target, 0, roadTop, width, height - roadTop, mix(road, white, 0.06), mix(roadDark, road, 0.12));
  fillRect(target, 0, roadTop + 24, width, 4, alpha(mix(accent, white, 0.15), 115));
  fillRect(target, 0, roadTop + 58, width, 7, alpha(ink, 74));
  fillRect(target, 0, height - 32, width, 32, alpha(roadDark, 96));
  for (let x = -48; x < width + 96; x += 88) {
    const shade = x % 176 === 0 ? mix(road, white, 0.1) : mix(road, ink, 0.06);
    fillPolygon(target, [[x, roadTop + 40], [x + 68, roadTop + 35], [x + 114, height], [x - 34, height]], alpha(shade, 135));
    fillRect(target, x + 18, roadTop + 58, 42, 3, alpha(mix(white, accent, 0.24), 62));
  }
  for (let x = 12; x < width; x += 176) {
    fillRect(target, x, roadTop + 6, 82, 2, alpha(mix(white, road, 0.28), 52));
    fillRect(target, x + 28, roadTop + 92, 118, 2, alpha(mix(ink, road, 0.2), 44));
  }
  for (let i = 0; i < 180; i += 1) {
    const x = Math.round(deterministicRange(theme.id.length * 809 + i * 31, 0, width - 24));
    const y = Math.round(deterministicRange(theme.id.length * 907 + i * 37, roadTop + 10, height - 16));
    const w = Math.round(deterministicRange(theme.id.length * 1013 + i, 8, 44));
    const h = Math.round(deterministicRange(theme.id.length * 1151 + i, 1, 4));
    const color = deterministicRange(theme.id.length * 1223 + i, 0, 1) > 0.55 ? mix(road, white, 0.12) : mix(roadDark, road, 0.22);
    fillRect(target, x, y, w, h, alpha(color, 34));
  }
  for (let i = 0; i < 48; i += 1) {
    const x = Math.round(deterministicRange(theme.id.length * 1373 + i * 17, 0, width - 80));
    const y = Math.round(deterministicRange(theme.id.length * 1459 + i * 19, roadTop + 44, height - 34));
    fillEllipse(target, x, y, Math.round(deterministicRange(i + 11, 18, 46)), Math.round(deterministicRange(i + 23, 3, 8)), alpha(mix(roadDark, hexToRgb(theme.sky), 0.2), theme.timeOfDay.includes("rain") ? 72 : 36));
  }
}

function drawExpeditionNearStrip(target, theme, index, width, height) {
  const roadTop = Math.round(height * 0.54);
  const segmentWidth = Math.round(width / 3);
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const mid = hexToRgb(theme.mid);
  const floor = hexToRgb(theme.floor);
  const ink = hexToRgb("#0f172a");
  const white = hexToRgb("#f8fafc");
  const baseY = roadTop - 4;

  fillRect(target, 0, roadTop - 82, width, 70, alpha(mix(floor, ink, 0.08), 180));
  fillRect(target, 0, roadTop - 19, width, 7, alpha(mix(accent, white, 0.12), 150));

  for (let segment = 0; segment < 3; segment += 1) {
    const offset = segment * segmentWidth;
    const seed = 2100 + index * 173 + segment * 47;
    switch (theme.id) {
      case "shelter":
        fillRect(target, offset + 70, baseY - 82, 420, 76, alpha(mix(mid, ink, 0.08), 230));
        for (let x = offset + 88; x < offset + 470; x += 42) {
          fillRect(target, x, baseY - 74, 24, 10, alpha(mix(mid, white, 0.09), 170));
          fillRect(target, x + 8, baseY - 41, 28, 8, alpha(mix(mid, ink, 0.16), 160));
        }
        fillPolygon(target, [[offset + 560, baseY - 4], [offset + 710, baseY - 72], [offset + 870, baseY - 4]], alpha(mix(accent2, ink, 0.15), 230));
        fillRect(target, offset + 612, baseY - 34, 205, 30, alpha(mix(accent2, white, 0.06), 190));
        for (let x = offset + 970; x < offset + 1490; x += 34) {
          drawLine(target, x, baseY - 76, x + 30, baseY - 8, alpha(mix(white, ink, 0.52), 92), 2);
          drawLine(target, x + 30, baseY - 76, x, baseY - 8, alpha(mix(white, ink, 0.52), 92), 2);
        }
        break;
      case "studio":
        for (let i = 0; i < 5; i += 1) {
          const x = offset + 80 + i * 250;
          fillRect(target, x, baseY - 106, 190, 102, alpha(mix(mid, ink, 0.08), 230));
          strokeRect(target, x, baseY - 106, 190, 102, alpha(mix(accent, white, 0.08), 190), 2);
          fillRect(target, x + 24, baseY - 78, 46, 46, alpha(hexToRgb("#dbeafe"), 76));
          fillEllipse(target, x + 47, baseY - 55, 18, 18, alpha(accent2, 160));
          drawExpeditionNeonPanel(target, x + 92, baseY - 88, 80, 26, i % 2 ? accent : accent2, seed + i);
        }
        for (let x = offset + 120; x < offset + 1510; x += 180) drawLine(target, x, baseY - 138, x + 150, baseY - 122, alpha(accent, 134), 2);
        break;
      case "neighborhood":
        for (let i = 0; i < 4; i += 1) drawExpeditionMarketStall(target, offset + 120 + i * 350, baseY - 2, 240, i % 2 ? accent : accent2, seed + i);
        for (let x = offset + 260; x < offset + 1530; x += 310) drawExpeditionTree(target, x, baseY + 2, accent, seed + x);
        fillRect(target, offset + 1040, baseY - 102, 270, 94, alpha(mix(mid, white, 0.05), 218));
        drawExpeditionAwning(target, offset + 1060, baseY - 84, 230, accent2, seed);
        break;
      case "company":
        fillRect(target, offset + 80, baseY - 108, 510, 103, alpha(mix(mid, hexToRgb("#dbeafe"), 0.08), 220));
        strokeRect(target, offset + 80, baseY - 108, 510, 103, alpha(accent, 190), 3);
        for (let x = offset + 110; x < offset + 560; x += 64) fillRect(target, x, baseY - 82, 34, 54, alpha(hexToRgb("#e0f2fe"), 80));
        drawExpeditionBusStop(target, offset + 700, baseY - 2, accent2);
        drawExpeditionSkyBridge(target, offset + 870, baseY - 128, 540, accent);
        fillRect(target, offset + 1180, baseY - 64, 250, 58, alpha(mix(accent, ink, 0.16), 160));
        break;
      case "office":
        fillRect(target, offset + 110, baseY - 118, 520, 112, alpha(mix(mid, ink, 0.04), 230));
        for (let i = 0; i < 8; i += 1) fillRect(target, offset + 140 + i * 58, baseY - 104, 18, 98, alpha(mix(accent2, white, 0.18), 190));
        drawExpeditionNeonPanel(target, offset + 720, baseY - 112, 260, 54, accent2, seed);
        fillRect(target, offset + 1090, baseY - 88, 320, 82, alpha(mix(accent, ink, 0.16), 196));
        strokeRect(target, offset + 1090, baseY - 88, 320, 82, alpha(accent2, 205), 4);
        break;
      case "asset":
        fillRect(target, offset + 100, baseY - 122, 450, 116, alpha(mix(mid, ink, 0.04), 226));
        drawExpeditionNeonPanel(target, offset + 132, baseY - 106, 380, 76, accent, seed);
        fillRect(target, offset + 670, baseY - 98, 330, 92, alpha(mix(accent2, ink, 0.26), 206));
        strokeRect(target, offset + 670, baseY - 98, 330, 92, alpha(accent2, 210), 4);
        for (let i = 0; i < 6; i += 1) fillRect(target, offset + 1120 + i * 42, baseY - 18 - i * 12, 26, 18 + i * 12, alpha(i % 2 ? accent : accent2, 218));
        break;
      case "national":
        for (let x = offset + 80; x < offset + 1580; x += 78) {
          fillPolygon(target, [[x, baseY - 2], [x + 58, baseY - 2], [x + 70, baseY + 32], [x - 12, baseY + 32]], alpha((x / 78) % 2 ? accent : accent2, 225));
          drawLine(target, x + 6, baseY + 24, x + 54, baseY + 2, alpha(ink, 95), 3);
        }
        fillRect(target, offset + 260, baseY - 126, 430, 46, alpha(mix(mid, ink, 0.12), 216));
        drawLine(target, offset + 200, baseY - 96, offset + 820, baseY - 132, alpha(mix(mid, white, 0.06), 230), 7);
        drawExpeditionCrane(target, offset + 1110, baseY - 4, accent);
        break;
      case "global":
        for (let i = 0; i < 7; i += 1) drawIsoBlock(target, offset + 80 + i * 116, baseY - 62 + (i % 2) * 18, 104, 58, i % 2 ? accent : accent2);
        drawExpeditionHarborCrane(target, offset + 960, baseY - 6, accent);
        fillRect(target, offset + 1230, baseY - 72, 300, 66, alpha(mix(mid, ink, 0.1), 200));
        drawExpeditionFlagLine(target, offset + 1240, baseY - 128, 8, accent2, seed);
        break;
      case "future":
        fillRect(target, offset + 80, baseY - 112, 430, 106, alpha(mix(mid, ink, 0.05), 210));
        strokeRect(target, offset + 80, baseY - 112, 430, 106, alpha(accent2, 180), 3);
        for (let i = 0; i < 7; i += 1) {
          const x = offset + 130 + i * 52;
          drawLine(target, x, baseY - 88, x + 34, baseY - 52, alpha(accent2, 150), 3);
          fillRect(target, x + 30, baseY - 56, 9, 9, alpha(accent, 220));
        }
        drawExpeditionMaglevRail(target, offset + 650, baseY - 58, 620, accent2);
        drawExpeditionHologram(target, offset + 1390, baseY - 6, accent, seed);
        break;
      case "summit":
        drawExpeditionSummitHall(target, offset + 120, baseY - 2, 520, accent2);
        drawExpeditionSummitTower(target, offset + 770, baseY - 2, accent);
        drawExpeditionFlagLine(target, offset + 1020, baseY - 136, 12, accent2, seed);
        fillRect(target, offset + 1210, baseY - 78, 280, 72, alpha(mix(accent, ink, 0.22), 190));
        strokeRect(target, offset + 1210, baseY - 78, 280, 72, alpha(accent2, 220), 3);
        break;
      default:
        drawExpeditionNeonPanel(target, offset + 320, baseY - 112, 180, 48, accent, seed);
        break;
    }
  }
}

function drawExpeditionMidStructures(target, theme, index, width, height) {
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const mid = hexToRgb(theme.mid);
  const ink = hexToRgb("#0f172a");
  const baseY = Math.round(height * 0.54) + 8;
  const seed = 900 + index * 173;
  const segmentWidth = Math.round(width / 3);

  for (let segment = 0; segment < 3; segment += 1) {
    const offset = segment * segmentWidth;
    const repeatSeed = seed + segment * 131;
    switch (theme.id) {
      case "shelter":
        drawExpeditionLowShop(target, offset + 250, baseY - 16, 250, 118, mix(mid, hexToRgb("#7c2d12"), 0.18), accent, repeatSeed, { awning: false });
        fillPolygon(target, [[offset + 600, baseY - 12], [offset + 740, baseY - 70], [offset + 880, baseY - 12]], alpha(mix(accent2, ink, 0.38), 220));
        fillRect(target, offset + 650, baseY - 50, 178, 48, alpha(mix(mid, accent, 0.1), 220));
        for (let x = offset + 980; x < offset + 1240; x += 46) fillRect(target, x, baseY - 42, 34, 30, alpha(mix(accent, ink, 0.28), 205));
        drawExpeditionNeonPanel(target, offset + 1220, baseY - 156, 180, 54, accent, repeatSeed);
        break;
      case "studio":
        for (let i = 0; i < 4; i += 1) drawExpeditionVoxelBuilding(target, offset + 230 + i * 142, baseY - 10, 96, 142 + i * 14, mix(mid, accent2, 0.08), accent, repeatSeed + i, { roof: "antenna", lit: 0.72 });
        drawExpeditionLowShop(target, offset + 830, baseY - 12, 275, 118, mid, accent, repeatSeed);
        drawExpeditionNeonPanel(target, offset + 1170, baseY - 164, 172, 58, accent2, repeatSeed);
        drawLine(target, offset + 1330, baseY - 42, offset + 1450, baseY - 42, alpha(accent, 220), 5);
        break;
      case "neighborhood":
        drawExpeditionMarketStall(target, offset + 210, baseY - 4, 250, accent2, repeatSeed);
        drawExpeditionLowShop(target, offset + 530, baseY - 12, 260, 105, mid, accent, repeatSeed + 1);
        drawExpeditionTree(target, offset + 930, baseY + 1, accent, repeatSeed + 2);
        drawExpeditionMarketStall(target, offset + 1120, baseY - 2, 270, accent, repeatSeed + 3);
        break;
      case "company":
        for (let i = 0; i < 4; i += 1) drawExpeditionVoxelBuilding(target, offset + 210 + i * 166, baseY - 10, 122, 210 + (i % 2) * 38, mix(mid, accent, 0.1), accent, repeatSeed + i, { lit: 0.54 });
        drawExpeditionSkyBridge(target, offset + 520, baseY - 192, 470, accent);
        drawExpeditionBusStop(target, offset + 1160, baseY - 6, accent2);
        drawExpeditionNeonPanel(target, offset + 1340, baseY - 128, 190, 42, accent, repeatSeed);
        break;
      case "office":
        for (let i = 0; i < 5; i += 1) drawExpeditionVoxelBuilding(target, offset + 180 + i * 130, baseY - 10, 92, 245 - i * 9, mix(mid, accent, 0.06), accent, repeatSeed + i, { lit: 0.66 });
        drawExpeditionNeonPanel(target, offset + 870, baseY - 124, 190, 48, accent2, repeatSeed);
        fillRect(target, offset + 1130, baseY - 88, 280, 76, alpha(mix(accent2, ink, 0.24), 204));
        strokeRect(target, offset + 1130, baseY - 88, 280, 76, alpha(accent2, 230), 3);
        break;
      case "asset":
        drawExpeditionNeonPanel(target, offset + 210, baseY - 148, 310, 86, accent, repeatSeed);
        for (let i = 0; i < 8; i += 1) {
          const x = offset + 670 + i * 42;
          const h = 20 + i * 10;
          fillRect(target, x, baseY - h, 28, h, alpha(i % 2 ? accent2 : accent, 214));
        }
        drawLine(target, offset + 650, baseY - 20, offset + 1010, baseY - 112, alpha(accent2, 235), 4);
        fillEllipse(target, offset + 1250, baseY - 56, 84, 42, alpha(mix(accent2, ink, 0.2), 205));
        strokeRect(target, offset + 1188, baseY - 98, 126, 92, alpha(accent2, 220), 4);
        break;
      case "national":
        drawExpeditionCrane(target, offset + 320, baseY - 4, accent);
        drawExpeditionCrane(target, offset + 1010, baseY - 6, accent2);
        for (let x = offset + 560; x < offset + 1460; x += 72) fillPolygon(target, [[x, baseY + 4], [x + 54, baseY + 4], [x + 64, baseY + 36], [x - 10, baseY + 36]], alpha((x / 72) % 2 ? accent : accent2, 218));
        drawLine(target, offset + 660, baseY - 82, offset + 1250, baseY - 104, alpha(mix(mid, ink, 0.08), 230), 8);
        break;
      case "global":
        drawExpeditionFlagLine(target, offset + 180, baseY - 130, 12, accent2, repeatSeed);
        drawExpeditionHarborCrane(target, offset + 620, baseY - 6, accent);
        for (let i = 0; i < 5; i += 1) drawIsoBlock(target, offset + 940 + i * 76, baseY - 44 + (i % 2) * 9, 70, 44, i % 2 ? accent : mix(accent2, hexToRgb("#ef4444"), 0.18));
        drawExpeditionNeonPanel(target, offset + 1290, baseY - 142, 210, 58, accent, repeatSeed);
        break;
      case "future":
        drawExpeditionHologram(target, offset + 310, baseY - 8, accent, repeatSeed);
        drawExpeditionMaglevRail(target, offset + 610, baseY - 98, 620, accent2);
        drawExpeditionHologram(target, offset + 1290, baseY - 14, accent2, repeatSeed + 4);
        for (let x = offset + 500; x < offset + 1050; x += 54) {
          drawLine(target, x, baseY - 70, x + 36, baseY - 112, alpha(accent2, 150), 3);
          fillRect(target, x + 33, baseY - 116, 9, 9, alpha(accent2, 210));
        }
        break;
      case "summit":
        drawExpeditionSummitTower(target, offset + 300, baseY + 2, accent);
        drawExpeditionSummitHall(target, offset + 660, baseY - 8, 420, accent2);
        drawExpeditionSummitTower(target, offset + 1240, baseY, accent2);
        drawExpeditionFlagLine(target, offset + 690, baseY - 152, 10, accent2, repeatSeed);
        fillEllipse(target, offset + 990, baseY - 86, 190, 38, alpha(mix(accent, hexToRgb("#ffffff"), 0.18), 46));
        break;
      default:
        drawExpeditionNeonPanel(target, offset + 320, baseY - 112, 180, 48, accent, repeatSeed);
        break;
    }
  }
}

function drawExpeditionForegroundProps(target, theme, index, width, height) {
  const roadTop = Math.round(height * 0.54);
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const ink = hexToRgb("#0f172a");
  for (let x = 128; x < width; x += 420) {
    fillRect(target, x, roadTop - 142, 5, 138, alpha(ink, 190));
    fillRect(target, x - 7, roadTop - 150, 19, 11, alpha(accent, 220));
    fillEllipse(target, x + 2, roadTop - 128, 42, 16, alpha(accent, 38));
  }
  for (let i = 0; i < 72; i += 1) {
    const x = Math.round(deterministicRange(index * 401 + i * 17, 8, width - 60));
    const y = Math.round(deterministicRange(index * 509 + i * 19, roadTop + 24, height - 44));
    const w = Math.round(deterministicRange(index * 607 + i, 18, 48));
    const h = Math.round(deterministicRange(index * 701 + i, 8, 22));
    const color = deterministicRange(index * 809 + i, 0, 1) > 0.5 ? accent : accent2;
    drawIsoBlock(target, x, y, w, h, mix(color, hexToRgb(theme.floor), 0.34));
  }
  if (theme.id === "office") {
    for (let x = 220; x < width; x += 520) drawLine(target, x, 20, x - 38, height - 10, alpha(hexToRgb("#f8fafc"), 48), 1);
  }
}

function drawExpeditionChapterBackdrop(target, theme, index, width, height) {
  drawExpeditionSky(target, theme, index, width, height);
  drawExpeditionFarLayer(target, theme, index, width, height);
  drawExpeditionMidStructures(target, theme, index, width, height);
  drawExpeditionNearStrip(target, theme, index, width, height);
  drawExpeditionRoad(target, theme, width, height);
  drawExpeditionForegroundProps(target, theme, index, width, height);
}

function expeditionBackdropSourcePath(theme, tileIndex) {
  return resolve(expeditionBackdropSourceRoot, theme.id, `source-${String(tileIndex).padStart(2, "0")}.png`);
}

function isExpeditionBackdropRawSource(image) {
  const aspect = image.width / Math.max(1, image.height);
  const isRuntimeTile = image.width === 5016 && image.height === 540;
  return image.width >= 1600 && image.height >= 650 && aspect >= 2.2 && aspect <= 3.4 && !isRuntimeTile;
}

function readExpeditionBackdropSourceInfo(path) {
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path).length;
  const image = readPngRgba(path);
  const aspect = image.width / Math.max(1, image.height);
  const reasons = [];
  if (image.width < 1600) reasons.push(`width ${image.width} < 1600`);
  if (image.height < 650) reasons.push(`height ${image.height} < 650`);
  if (aspect < 2.2 || aspect > 3.4) reasons.push(`aspect ${aspect.toFixed(2)} outside 2.2~3.4`);
  if (image.width === 5016 && image.height === 540) reasons.push("runtime tile size 5016x540");
  if (bytes < 500000) reasons.push(`file too small ${bytes} bytes`);
  return {
    bytes,
    image,
    reasons,
    valid: isExpeditionBackdropRawSource(image) && bytes >= 500000,
  };
}

function ensureExpeditionBackdropSourceSet() {
  const failures = [];
  expeditionBackdropThemes.forEach((theme) => {
    for (let tileIndex = 0; tileIndex < expeditionBackdropTileCount; tileIndex += 1) {
      const path = expeditionBackdropSourcePath(theme, tileIndex);
      const sourceInfo = readExpeditionBackdropSourceInfo(path);
      if (sourceInfo?.valid) continue;
      const label = relative(process.cwd(), path);
      const reason = sourceInfo ? sourceInfo.reasons.join(", ") : "missing";
      failures.push(`${label}: ${reason}`);
    }
  });
  if (failures.length > 0) {
    throw new Error(`원정대 생성형 배경 원본 검증 실패:\n${failures.join("\n")}`);
  }
}

function loadExpeditionBackdropSource(theme, tileIndex) {
  const exact = expeditionBackdropSourcePath(theme, tileIndex);
  if (existsSync(exact)) return { image: readPngRgba(exact), sourceIndex: tileIndex, derived: false };
  const base = expeditionBackdropSourcePath(theme, 0);
  if (!existsSync(base)) throw new Error(`원정대 생성형 배경 원본 누락: ${relative(process.cwd(), base)}`);
  return { image: readPngRgba(base), sourceIndex: 0, derived: tileIndex !== 0 };
}

function loadExpeditionBackdropSourceSet(theme) {
  const sources = [];
  for (let index = 0; index < expeditionBackdropTileCount; index += 1) {
    const path = expeditionBackdropSourcePath(theme, index);
    if (!existsSync(path)) return null;
    sources.push({
      index,
      path,
      image: readPngRgba(path),
    });
  }
  return sources;
}

function drawImageFitHeight(target, source, dx, dy, dh) {
  const dw = Math.max(1, Math.round((source.width / Math.max(1, source.height)) * dh));
  drawSourceScaled(target, source, dx, dy, dw, dh);
  return dw;
}

function buildExpeditionChapterPanorama(sources, rowHeight) {
  const sectionWidths = sources.map(({ image }) => Math.max(1, Math.round((image.width / Math.max(1, image.height)) * rowHeight)));
  const overlap = Math.max(180, Math.min(280, Math.round(Math.min(...sectionWidths) * 0.16)));
  const width = sectionWidths.reduce((sum, sectionWidth) => sum + sectionWidth, 0) - overlap * Math.max(0, sources.length - 1);
  const panorama = canvas(width, rowHeight);
  let cursorX = 0;
  sources.forEach(({ image }, sectionIndex) => {
    const section = canvas(sectionWidths[sectionIndex], rowHeight);
    drawImageFitHeight(section, image, 0, 0, rowHeight);
    for (let y = 0; y < rowHeight; y += 1) {
      for (let x = 0; x < section.width; x += 1) {
        const targetX = cursorX + x;
        if (targetX < 0 || targetX >= panorama.width) continue;
        const incoming = samplePixel(section, x, y);
        if (sectionIndex > 0 && x < overlap) {
          const t = x / Math.max(1, overlap - 1);
          const eased = t * t * (3 - 2 * t);
          const existing = samplePixel(panorama, targetX, y);
          writePixel(panorama, targetX, y, mix(existing, incoming, eased));
        } else {
          writePixel(panorama, targetX, y, incoming);
        }
      }
    }
    cursorX += section.width - overlap;
  });
  return panorama;
}

function drawExpeditionBackdropPanoramaTile(target, panorama, tileIndex) {
  const maxOffset = Math.max(0, panorama.width - target.width);
  const offsetX = expeditionBackdropTileCount <= 1 ? 0 : Math.round(maxOffset * (tileIndex / (expeditionBackdropTileCount - 1)));
  for (let y = 0; y < target.height; y += 1) {
    const sourceY = Math.max(0, Math.min(panorama.height - 1, y));
    for (let x = 0; x < target.width; x += 1) {
      const sourceX = Math.max(0, Math.min(panorama.width - 1, offsetX + x));
      writePixel(target, x, y, samplePixel(panorama, sourceX, sourceY));
    }
  }
}

function applyExpeditionBackdropTileGrade(target, theme, tileIndex) {
  const accent = hexToRgb(theme.accent);
  const accent2 = hexToRgb(theme.accent2 ?? theme.accent);
  const cool = hexToRgb(theme.skyTop ?? theme.sky);
  const warm = hexToRgb(theme.horizon);
  const shiftColor = tileIndex % 3 === 0 ? accent : tileIndex % 3 === 1 ? accent2 : warm;
  const shiftRatio = tileIndex === 0 ? 0 : 0.035 + (tileIndex % 4) * 0.008;
  const shadowRatio = 0.025 + (tileIndex % 5) * 0.004;
  for (let y = 0; y < target.height; y += 1) {
    const vertical = y / Math.max(1, target.height - 1);
    for (let x = 0; x < target.width; x += 1) {
      const i = (y * target.width + x) * 4;
      const edge = Math.abs((x / Math.max(1, target.width - 1)) - 0.5) * 2;
      let color = {
        r: target.pixels[i],
        g: target.pixels[i + 1],
        b: target.pixels[i + 2],
        a: target.pixels[i + 3],
      };
      color = mix(color, shiftColor, shiftRatio * (0.35 + vertical * 0.65));
      color = mix(color, cool, shadowRatio * Math.max(0, edge - 0.25));
      target.pixels[i] = color.r;
      target.pixels[i + 1] = color.g;
      target.pixels[i + 2] = color.b;
      target.pixels[i + 3] = color.a;
    }
  }
}

function drawGeneratedExpeditionBackdropTile(target, source, theme, tileIndex) {
  const segmentWidth = Math.round(target.width / 3);
  const cropScalePattern = [1, 0.94, 0.9, 0.96, 0.88, 0.92, 0.86, 0.91, 0.89, 0.97];
  const cropScale = cropScalePattern[tileIndex % cropScalePattern.length];
  const sourceWidth = Math.max(1, Math.round(source.width * cropScale));
  const availableX = Math.max(0, source.width - sourceWidth);
  const focusSeed = tileIndex * 211 + theme.id.length * 19;
  const focusX = tileIndex === 0 ? 0.5 : deterministicRange(focusSeed, 0.08, 0.92);
  const sourceOffsetX = Math.round(availableX * focusX);
  for (let segmentIndex = 0; segmentIndex < 3; segmentIndex += 1) {
    const dx = segmentIndex * segmentWidth;
    const dw = segmentIndex === 2 ? target.width - dx : segmentWidth;
    drawSourceCover(target, source, dx, 0, dw, target.height, {
      mirrorX: (tileIndex + segmentIndex) % 2 === 1,
      sourceOffsetX,
      sourceOffsetY: 0,
      sourceWidth,
      sourceHeight: source.height,
      focusX,
      focusY: 0.62,
    });
  }
  applyExpeditionBackdropTileGrade(target, theme, tileIndex);
}

function buildExpeditionBackdropAtlas() {
  const segmentWidth = 1672;
  const width = segmentWidth * 3;
  const rowHeight = 540;
  const path = resolve(outDir, "visual-expedition-backdrops.png");
  const items = [];
  expeditionBackdropThemes.forEach((theme, index) => {
    const independentSources = loadExpeditionBackdropSourceSet(theme);
    const chapterPanorama = independentSources ? buildExpeditionChapterPanorama(independentSources, rowHeight) : null;
    const tiles = [];
    for (let tileIndex = 0; tileIndex < expeditionBackdropTileCount; tileIndex += 1) {
      const target = canvas(width, rowHeight);
      const sourceEntry = independentSources?.[tileIndex] ?? null;
      let sourceIndex = tileIndex;
      let derived = false;
      let sourceMode = "chapter-panorama";
      if (chapterPanorama && sourceEntry) {
        drawExpeditionBackdropPanoramaTile(target, chapterPanorama, tileIndex);
      } else {
        const { image: source, sourceIndex: fallbackSourceIndex, derived: fallbackDerived } = loadExpeditionBackdropSource(theme, tileIndex);
        sourceIndex = fallbackSourceIndex;
        derived = fallbackDerived;
        sourceMode = "single-source-fallback";
        drawGeneratedExpeditionBackdropTile(target, source, theme, tileIndex);
      }
      const fileName = `visual-expedition-backdrop-${theme.id}-${String(tileIndex).padStart(2, "0")}.png`;
      const itemPath = resolve(outDir, fileName);
      writePng(itemPath, target);
      if (tileIndex === 0) {
        const compatibilityFileName = `visual-expedition-backdrop-${theme.id}.png`;
        writePng(resolve(outDir, compatibilityFileName), target);
        if (index === 0) writePng(path, target);
      }
      tiles.push({
        index: tileIndex,
        file: `assets/${fileName}`,
        source: `assets/visual-source/expedition-backdrops/${theme.id}/source-${String(sourceIndex).padStart(2, "0")}.png`,
        derived,
        sourceMode,
      });
    }
    items.push({
      id: `expedition-backdrop-${theme.id}`,
      backdrop: theme.id,
      file: tiles[0]?.file ?? `assets/visual-expedition-backdrop-${theme.id}-00.png`,
      compatibilityFile: `assets/visual-expedition-backdrop-${theme.id}.png`,
      tiles,
      sourceMode: chapterPanorama ? "chapter-panorama" : "single-source-fallback",
      tileCount: expeditionBackdropTileCount,
      stagesPerTile: expeditionBackdropStagesPerTile,
      timeOfDay: theme.timeOfDay,
      landmark: theme.landmark,
      roadProfile: expeditionBackdropRoadProfile,
      row: 0,
    });
  });
  return {
    path,
    width,
    height: rowHeight,
    rowHeight,
    items,
  };
}

function drawBattleRoadLane(target, rowId, options) {
  const theme = battleRoadLaneThemes[rowId] ?? battleRoadLaneThemes.elementary;
  const road = hexToRgb(theme.road);
  const roadDark = hexToRgb(theme.roadDark);
  const trim = hexToRgb(theme.trim);
  const detail = hexToRgb(theme.detail);
  const shadow = hexToRgb(theme.shadow);
  const sparkle = hexToRgb(theme.sparkle);
  const white = hexToRgb("#ffffff");
  const topY = Math.round(target.height * (options.roadTopPercent / 100));
  const bottomY = Math.round(target.height * (options.roadBottomPercent / 100));
  const height = Math.max(24, bottomY - topY);
  const opacity = options.roadOpacity;
  const detailStep = options.roadDetailPx;
  const width = target.width;

  fillRect(target, 0, topY - 9, width, 10, alpha(shadow, Math.round(74 * opacity)));
  fillRect(target, 0, topY - 3, width, 3, alpha(trim, Math.round(176 * opacity)));
  fillRect(target, 0, topY + 1, width, 3, alpha(mix(roadDark, white, 0.1), Math.round(96 * opacity)));

  for (let y = topY; y < bottomY; y += 1) {
    const t = (y - topY) / Math.max(1, height);
    const base = mix(mix(road, roadDark, t * 0.48), white, Math.max(0, 0.16 - t * 0.11));
    fillRect(target, 0, y, width, 1, alpha(base, Math.round((158 + t * 40) * opacity)));
  }

  fillRect(target, 0, bottomY - 16, width, 16, alpha(roadDark, Math.round(72 * opacity)));
  fillRect(target, 0, bottomY - 3, width, 3, alpha(mix(shadow, roadDark, 0.45), Math.round(132 * opacity)));

  for (let y = topY + Math.round(height * 0.22); y < bottomY - 8; y += Math.max(16, Math.round(detailStep * 0.22))) {
    const t = (y - topY) / Math.max(1, height);
    drawLine(target, 0, y, width, y - Math.round(4 + t * 8), alpha(mix(detail, road, 0.42), Math.round((45 + t * 24) * opacity)), 2);
  }

  for (let x = -detailStep; x < width + detailStep; x += detailStep) {
    const lean = Math.round(detailStep * 0.42);
    drawLine(target, x, topY + 4, x + lean, bottomY - 4, alpha(mix(detail, roadDark, 0.38), Math.round(36 * opacity)), 2);
    drawLine(target, x + Math.round(detailStep * 0.5), topY + 10, x + Math.round(detailStep * 0.5) - lean, bottomY - 10, alpha(mix(shadow, road, 0.35), Math.round(26 * opacity)), 1);
  }

  for (let x = 24; x < width; x += Math.round(detailStep * 1.7)) {
    const seed = x + rowId.length * 97;
    const markY = topY + Math.round(deterministicRange(seed, height * 0.28, height * 0.82));
    const markW = Math.round(deterministicRange(seed + 11, 18, 42));
    const markH = Math.round(deterministicRange(seed + 23, 3, 7));
    fillEllipse(target, x, markY, markW, markH, alpha(mix(sparkle, white, 0.16), Math.round(32 * opacity)));
  }

  const laneCenter = topY + Math.round(height * 0.54);
  fillRect(target, 0, laneCenter - 2, width, 4, alpha(mix(trim, white, 0.22), Math.round(44 * opacity)));
  fillRect(target, 0, laneCenter + 3, width, 2, alpha(shadow, Math.round(38 * opacity)));
}

function buildBattleRoadBackdropAtlas(config = {}) {
  const roadOptions = battleRoadPresentation(config).backdrop;
  const source = readPngRgba(resolve(outDir, "asset-004.png"));
  const segmentWidth = 1672;
  const width = segmentWidth * 4;
  const rowHeight = 300;
  const rowCount = battleRoadBackdropRows.length;
  const sourceRowHeight = Math.floor(source.height / rowCount);
  const items = battleRoadBackdropRows.map((row, rowIndex) => {
    const target = canvas(width, rowHeight);
    const sourceInsetY = 3;
    const rawSourceY = row.sourceRow * sourceRowHeight;
    const rawSourceHeight = row.sourceRow === rowCount - 1 ? source.height - rawSourceY : sourceRowHeight;
    const sourceY = rawSourceY + (row.sourceRow > 0 ? sourceInsetY : 0);
    const sourceHeight = Math.max(1, rawSourceHeight - sourceInsetY - (row.sourceRow > 0 ? sourceInsetY : 0));
    const sourceOffsetX = row.sourceOffsetX ?? 0;
    drawSourceScaled(target, source, 0, 0, segmentWidth, rowHeight, {
      mirrorX: false,
      sourceOffsetX,
      sourceOffsetY: sourceY,
      sourceHeight,
      sourceWidth: source.width,
    });
    drawSourceScaled(target, source, segmentWidth, 0, segmentWidth, rowHeight, {
      mirrorX: true,
      sourceOffsetX,
      sourceOffsetY: sourceY,
      sourceHeight,
      sourceWidth: source.width,
    });
    drawSourceScaled(target, source, segmentWidth * 2, 0, segmentWidth, rowHeight, {
      mirrorX: false,
      sourceOffsetX,
      sourceOffsetY: sourceY,
      sourceHeight,
      sourceWidth: source.width,
    });
    drawSourceScaled(target, source, segmentWidth * 3, 0, segmentWidth, rowHeight, {
      mirrorX: true,
      sourceOffsetX,
      sourceOffsetY: sourceY,
      sourceHeight,
      sourceWidth: source.width,
    });
    drawBattleRoadLane(target, row.id, roadOptions);
    const fileName = `visual-battle-road-backdrop-${row.id}.png`;
    const path = resolve(outDir, fileName);
    writePng(path, target);
    return {
      id: `battle-road-backdrop-${row.id}`,
      backdrop: row.id,
      sceneClass: row.sceneClass,
      row: rowIndex,
      token: `__STUDENT_ASSET_${String(11 + rowIndex).padStart(3, "0")}__`,
      file: `assets/${fileName}`,
      path,
      width: target.width,
      height: target.height,
      roadOverlay: {
        topPercent: roadOptions.roadTopPercent,
        bottomPercent: roadOptions.roadBottomPercent,
        opacity: roadOptions.roadOpacity,
        detailPx: roadOptions.roadDetailPx,
      },
    };
  });
  return {
    width,
    height: rowHeight * rowCount,
    rowHeight,
    items,
  };
}

function positionPercent(index, total) {
  return total <= 1 ? "0%" : `${(index / (total - 1) * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
}

function framePositionVars(prefix, frameBase, framesPerItem, columns, rows) {
  const names = ["a", "b", "c", "d"];
  const declarations = [];
  for (let offset = 0; offset < framesPerItem; offset += 1) {
    const slot = atlasFrameSlot(frameBase + offset, columns);
    declarations.push(`--${prefix}-frame-${names[offset] ?? offset}:${positionPercent(slot.index, columns)}`);
    declarations.push(`--${prefix}-frame-${names[offset] ?? offset}-y:${positionPercent(slot.row, rows)}`);
  }
  const firstSlot = atlasFrameSlot(frameBase, columns);
  declarations.push(`--${prefix}-x:${positionPercent(firstSlot.index, columns)}`);
  declarations.push(`--${prefix}-y:${positionPercent(firstSlot.row, rows)}`);
  return declarations.join(";");
}

function buildCss(companions, enemies, careers, mainStudents, mainMonsters, expeditionBackdrops, battleRoadBackdrops, battleRoadConfig = {}) {
  const battleRoad = battleRoadPresentation(battleRoadConfig);
  const battleBackdrop = battleRoad.backdrop;
  const studentDisplay = battleRoad.studentDisplay;
  const studentAttack = battleRoad.studentAttack;
  const curriculumVfx = battleRoad.curriculumAttackVfx;
  const enemyDisplay = battleRoad.enemyDisplay;
  const enemyReaction = battleRoad.enemyReaction;
  const enemyHpBar = battleRoad.enemyHpBar;
  const companionColumns = companions.columns ?? companions.items.length;
  const companionRows = companions.rows ?? 1;
  const companionFrames = companions.framesPerItem ?? 1;
  const enemyColumns = enemies.columns ?? enemies.items.length;
  const enemyRows = enemies.rows ?? 1;
  const enemyFrames = enemies.framesPerItem ?? 1;
  const companionBackgroundSize = `${companionColumns * 100}% ${companionRows * 100}%`;
  const enemyBackgroundSize = `${enemyColumns * 100}% ${enemyRows * 100}%`;
  const lines = [
    "/* generated by tools/build-visual-assets.mjs */",
    `.expedition-unit-avatar,.helper-sprite:not(.helper-robot){background-image:url(__STUDENT_ASSET_007__);background-repeat:no-repeat;background-size:${companionBackgroundSize};background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));image-rendering:auto;transform-origin:50% 100%}`,
    ".expedition-unit-avatar .unit-shadow,.expedition-unit-avatar .unit-leg,.expedition-unit-avatar .unit-arm,.expedition-unit-avatar .unit-head,.expedition-unit-avatar .unit-hair,.expedition-unit-avatar .unit-body,.expedition-unit-avatar .unit-prop,.helper-sprite:not(.helper-robot)>span{display:none}",
    `.helper-sprite:not(.helper-robot){filter:drop-shadow(4px 5px #00000045);background-size:${companionBackgroundSize}}`,
    ".expedition-empty-party-visual{z-index:3;max-width:148px;background:#0f172a78;backdrop-filter:blur(1px)}",
    ".expedition-party-visual{z-index:7;left:3%;bottom:21%;width:210px;height:104px;overflow:visible}",
    ".expedition-party-visual .expedition-unit-avatar.large{width:62px;height:62px;overflow:visible;flex:0 0 62px;background-color:transparent;background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%))}",
    ".expedition-arena{background:#111827;border-color:color-mix(in srgb,var(--stage-trim) 74%,#ffffff 8%);box-shadow:inset 0 0 0 1px #ffffff1f,0 12px 28px #0f172a2e}",
    ".expedition-background-sheet{display:none!important}",
    ".expedition-arena::before{content:\"\";z-index:0;pointer-events:none;position:absolute;top:0;left:0;width:360%;height:100%;background-image:url(__STUDENT_ASSET_010__);background-repeat:no-repeat;background-size:100% 100%;background-position:center center;filter:saturate(1.08) contrast(1.04);transform:translateX(0);animation:60s linear infinite expeditionBackdropPan}",
    ".expedition-arena::after{content:\"\";z-index:4;pointer-events:none;position:absolute;left:31%;bottom:10%;width:57%;height:32%;opacity:0;background:radial-gradient(ellipse at 35% 74%,#f8fafc52 0 8%,transparent 23%),radial-gradient(ellipse at 62% 68%,#bfdbfe4f 0 7%,transparent 21%),radial-gradient(ellipse at 83% 74%,#9fd4c94f 0 7%,transparent 20%);animation:1.28s steps(5,end) infinite expeditionDustBurst}",
    ".expedition-arena-info{background:#0f172a9c;border-color:#ffffff30;backdrop-filter:blur(1.5px)}",
    ".expedition-party-visual.running{animation:3.2s ease-in-out infinite expeditionPartyAdvance}",
    ".expedition-party-visual.running .expedition-unit-avatar.large{animation-duration:1.04s;animation-timing-function:step-end;animation-iteration-count:infinite}",
    ".expedition-party-visual.running .unit-1,.expedition-party-visual.running .unit-4{animation-name:expeditionAllyMeleeA}",
    ".expedition-party-visual.running .unit-2,.expedition-party-visual.running .unit-5{animation-name:expeditionAllyMeleeB;animation-delay:.16s}",
    ".expedition-party-visual.running .unit-3{animation-name:expeditionAllyMeleeC;animation-delay:.28s}",
    ".expedition-party-visual.running .expedition-unit-avatar.large::after{content:\"\";pointer-events:none;position:absolute;left:64%;top:40%;width:30px;height:10px;opacity:0;background:linear-gradient(90deg,transparent,#fff,#9fd4c9,transparent);clip-path:polygon(0 45%,76% 0,100% 50%,76% 100%,0 58%);filter:drop-shadow(0 0 5px #fff7);animation:1.04s steps(4,end) infinite expeditionAllySpark;animation-delay:inherit}",
    ".expedition-enemy-group{right:9%;bottom:21%;max-width:42%;overflow:visible}",
    ".expedition-enemy-visual{right:10%;bottom:26%;width:102px;min-height:104px;overflow:visible}",
    ".expedition-enemy-group,.expedition-enemy-visual{overflow:visible}",
    ".expedition-enemy-group .expedition-enemy-visual,.expedition-enemy-visual.boss{filter:drop-shadow(4px 5px #00000052)}",
    ".expedition-enemy-group .expedition-enemy-visual{animation:1.2s steps(4,end) infinite expeditionEnemyIdle}",
    ".expedition-enemy-group .expedition-enemy-visual::before,.expedition-enemy-visual.boss::before{transform-origin:50% 100%;animation:1.18s step-end infinite expeditionEnemySpriteIdle}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child{animation:.88s steps(4,end) infinite expeditionEnemyKnockback}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child::before,.expedition-enemy-visual.boss::before{animation:.88s step-end infinite expeditionEnemyHurtSprite}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child::after,.expedition-enemy-visual.boss::after{content:\"\";pointer-events:none;position:absolute;left:50%;top:50%;z-index:3;width:78%;height:76%;border:1px solid #fff8;border-radius:24px;opacity:0;transform:translate(-50%,-50%) scale(.96);box-shadow:inset 0 0 0 1px #fff5,0 0 8px #9fd4c980;animation:.88s steps(4,end) infinite expeditionEnemyShock}",
    ".expedition-impact{z-index:7;opacity:.55;background:linear-gradient(90deg,transparent,#fff 22%,#9fd4c9 62%,transparent);width:42px;height:14px;top:42%;left:55%;clip-path:polygon(0 45%,74% 0,100% 50%,74% 100%,0 58%);filter:drop-shadow(0 0 4px #fff5);animation:.88s steps(4,end) infinite expeditionImpactSlash}",
    ".expedition-impact.ready{opacity:.72;background:linear-gradient(90deg,transparent,#fff 16%,#bfdbfe 46%,#9fd4c9 74%,transparent)}",
  ];
  expeditionBackdrops.items.forEach((item) => {
    const imageUrl = item.backdrop === "shelter" ? "__STUDENT_ASSET_010__" : item.file;
    lines.push(`.expedition-scene.backdrop-${item.backdrop} .expedition-arena::before{background-image:url(${imageUrl})}`);
  });
  battleRoadBackdrops.items.forEach((item) => {
    lines.push(`.stage-scene.${item.sceneClass}{--battle-road-bg-y:50%}`);
    lines.push(`.stage-scene.${item.sceneClass} .pixel-arena::before{background-image:url(${item.token});background-repeat:no-repeat!important;background-size:100% 100%!important;background-position:center bottom!important}`);
  });
  companions.items.forEach((item) => {
    const maleFrameBase = item.genderFrameBases?.male ?? item.frameBase ?? 0;
    const femaleFrameBase = item.genderFrameBases?.female;
    const maleVars = framePositionVars("visual-unit", maleFrameBase, companionFrames, companionColumns, companionRows);
    if (item.type === "career") {
      lines.push(`.${item.id}{${maleVars}}`);
      if (Number.isFinite(femaleFrameBase)) lines.push(`.unit-gender-female.${item.id}{${framePositionVars("visual-unit", femaleFrameBase, companionFrames, companionColumns, companionRows)}}`);
      return;
    }
    const className = item.id.replace(/^helper-/, "");
    lines.push(`.sprite-${item.id},.${item.id}{${maleVars}}`);
    if (Number.isFinite(femaleFrameBase)) lines.push(`.unit-gender-female.sprite-${item.id},.unit-gender-female.${item.id}{${framePositionVars("visual-unit", femaleFrameBase, companionFrames, companionColumns, companionRows)}}`);
    lines.push(`.prop-${className}{${maleVars}}`);
  });

  lines.push(
    ".expedition-enemy-visual::before{content:none!important;display:none!important;background-image:none!important}",
    ".expedition-enemy-visual .enemy-body,.expedition-enemy-visual .enemy-eye,.expedition-enemy-visual .enemy-mouth,.expedition-enemy-visual .enemy-mark,.expedition-enemy-visual .enemy-horn,.expedition-enemy-visual .enemy-name,.expedition-enemy-visual>strong,.expedition-enemy-visual>small,.expedition-enemy-visual strong,.expedition-enemy-visual small{display:none!important}",
    ".expedition-enemy-visual .enemy-shadow{z-index:0}",
    ".expedition-boss-health{z-index:2}",
    ".expedition-enemy-group .expedition-enemy-visual{flex-basis:56px;width:56px;min-height:86px}",
    ".expedition-enemy-visual.boss{width:82px;flex-basis:82px;min-height:112px}",
  );
  enemies.items.forEach((item) => {
    const vars = framePositionVars("visual-enemy", item.frameBase ?? 0, enemyFrames, enemyColumns, enemyRows);
    const assetClass = `.expedition-enemy-visual.enemy-asset-${sanitizeClass(item.id)}`;
    lines.push(`${assetClass}{${vars}}`);
    if (item.boss) {
      lines.push(`.expedition-enemy-visual.boss-${item.variant}.enemy-tone-${item.tone}{${vars}}`);
      if (Number(item.variant) === 1) lines.push(`.expedition-enemy-visual.boss.enemy-tone-${item.tone}{${vars}}`);
    }
    else {
      const mob = item.id.split("-").at(-1);
      lines.push(`.expedition-enemy-visual.mob-${mob}.enemy-tone-${item.tone}{${vars}}`);
    }
  });

  lines.push(
    `.career-portrait{background-image:url(__STUDENT_ASSET_009__);background-repeat:no-repeat;background-size:${careers.items.length * 100}% 100%;background-position:var(--visual-career-x,0%) 0;image-rendering:auto;background-color:#eef2f7}`,
    ".career-choice.ranked{grid-template-columns:42px 36px minmax(0,1fr) minmax(76px,auto)}",
    ".career-choice-aura{border:1px solid #20293824;border-radius:8px;width:34px;height:34px;box-shadow:inset 0 -8px #00000024,0 2px 7px #0f172a1f}",
    `.career-emblem{background-size:${careers.items.length * 100}% 100%;background-position:var(--visual-career-x,0%) 0;box-shadow:inset 0 -8px #00000024,0 2px 7px #0f172a1f}`,
    "@media (width<=390px){.career-choice.ranked{grid-template-columns:36px 32px minmax(0,1fr);gap:7px}.career-choice-aura{width:32px;height:32px}.career-choice.ranked .career-choice-state{grid-column:3}}",
  );
  careers.items.forEach((item) => {
    const careerClass = `.career-${sanitizeClass(item.careerId)}`;
    const x = positionPercent(item.index, careers.items.length);
    if (item.gender === "female") {
      lines.push(`${careerClass}.career-gender-female,.career-gender-female ${careerClass}{--visual-career-x:${x}}`);
    } else {
      lines.push(`${careerClass}{--visual-career-x:${x}}`);
    }
  });

  lines.push(
    ".battle-enemy-card{grid-template-columns:32px minmax(0,1fr);align-items:center;column-gap:5px;overflow:hidden}",
    ".battle-enemy-card>.battle-enemy-monster{grid-column:1;grid-row:1/4}",
    ".battle-enemy-card>div:first-of-type,.battle-enemy-card>.enemy-hp-bar,.battle-enemy-card>small{grid-column:2}",
    ".battle-enemy-card>div:first-of-type{justify-content:space-between;align-items:center;gap:5px;min-width:0;display:flex}",
    ".battle-enemy-monster{width:32px;height:32px;display:block;background-image:url(__STUDENT_ASSET_003__);background-repeat:no-repeat;background-size:19200% 100%;background-position:var(--monster-frame-x,0%) 0;image-rendering:auto;filter:drop-shadow(2px 3px #00000052)}",
    ".battle-enemy-card.boss .battle-enemy-monster,.battle-enemy-card.suneung .battle-enemy-monster{width:36px;height:36px;margin-left:-3px;transform:scale(1.04)}",
    ".pixel-arena .battle-enemy-card{grid-template-columns:24px minmax(0,1fr);column-gap:2px;min-height:35px;padding:2px 3px}",
    ".pixel-arena .battle-enemy-card>.battle-enemy-monster{width:25px;height:25px;margin-left:-3px}",
    ".pixel-arena .battle-enemy-card.boss>.battle-enemy-monster,.pixel-arena .battle-enemy-card.suneung>.battle-enemy-monster{width:28px;height:28px;margin-left:-4px}",
    ".pixel-arena .battle-enemy-card>div:first-of-type{display:grid;gap:0}",
    ".pixel-arena .battle-enemy-card strong,.pixel-arena .battle-enemy-card span{line-height:1.05}",
    ".pixel-arena .enemy-stack{display:none}",
    ".pixel-arena .enemy-stack .encounter-name{display:none}",
    `.pixel-arena{--battle-road-pan-width:${cssNumber(battleBackdrop.panWidthPercent)}%;--battle-road-pan-duration:${cssNumber(battleBackdrop.panDurationSec)}s;--battle-road-filter:${battleBackdrop.defaultFilter};--student-display-scale:${cssNumber(studentDisplay.scaleMultiplier, 3)};--curriculum-vfx-duration:${cssNumber(curriculumVfx.durationMs)}ms;--curriculum-vfx-base-font:${cssNumber(curriculumVfx.baseFontPx)}px;--curriculum-vfx-min-width:${cssNumber(curriculumVfx.minWidthPx)}px;--curriculum-vfx-max-width:${cssNumber(curriculumVfx.maxWidthPx)}px;--curriculum-vfx-source-x:${cssNumber(curriculumVfx.sourceOffsetXPx)}px;--curriculum-vfx-source-y:${cssNumber(curriculumVfx.sourceOffsetYPx)}px;--curriculum-vfx-arc-x:${cssNumber(curriculumVfx.sourceOffsetXPx * 0.38)}px;--curriculum-vfx-arc-y:${cssNumber(curriculumVfx.impactOffsetYPx - 16)}px;--curriculum-vfx-impact-x:${cssNumber(curriculumVfx.impactOffsetXPx)}px;--curriculum-vfx-impact-y:${cssNumber(curriculumVfx.impactOffsetYPx)}px;--battle-normal-enemy-size:${cssNumber(enemyDisplay.normalSizePx)}px;--battle-boss-enemy-size:${cssNumber(enemyDisplay.bossSizePx)}px;--battle-suneung-enemy-size:${cssNumber(enemyDisplay.suneungSizePx)}px;--battle-defeated-opacity:${cssNumber(enemyDisplay.defeatedOpacity, 3)};background:#111827;overflow:hidden}`,
    ".pixel-arena .arena-background-sheet{display:none!important}",
    ".pixel-arena::before{content:\"\";display:block;z-index:0;pointer-events:none;position:absolute;top:0;left:0;width:var(--battle-road-pan-width);height:100%;background-repeat:no-repeat;background-size:100% 100%;background-position:center bottom;filter:var(--battle-road-filter);transform:translate3d(0,0,0);will-change:transform;animation:var(--battle-road-pan-duration) linear infinite battleRoadBackdropPan}",
    `.pixel-arena.road-travel{--battle-road-filter:${battleBackdrop.travelFilter}}`,
    `.pixel-arena.road-approach,.pixel-arena.road-combat{--battle-road-filter:${battleBackdrop.defaultFilter}}`,
    ".pixel-arena .arena-background-grid{display:none}",
    ".pixel-arena .pixel-floor{left:0;right:0;background:linear-gradient(180deg,transparent 0%,#0f172a54 82%,#0f172a7a 100%);animation:none;box-shadow:none}",
    ".pixel-arena .pencil-shot,.pixel-arena .pencil-shot.active{opacity:0;animation:none}",
    ".curriculum-attack-vfx-layer{position:absolute;inset:0;z-index:9;pointer-events:none;overflow:visible;contain:layout paint}",
    ".curriculum-attack-vfx-token{box-sizing:border-box;position:absolute;left:var(--curriculum-vfx-left,64%);top:var(--curriculum-vfx-top,42%);width:var(--curriculum-vfx-width,auto);min-width:var(--curriculum-vfx-min-width,34px);max-width:var(--curriculum-vfx-max-width,92px);padding:2px 5px;color:var(--curriculum-vfx-primary,#fde68a);font-family:Inter,Pretendard,\"Noto Sans KR\",system-ui,sans-serif;font-size:var(--curriculum-vfx-base-font,18px);font-weight:1000;line-height:1;letter-spacing:0;text-align:center;white-space:nowrap;text-shadow:0 1px 0 var(--curriculum-vfx-shadow,#1f2937),0 0 7px color-mix(in srgb,var(--curriculum-vfx-accent,#9fd4c9) 72%,#fff);filter:drop-shadow(0 2px 3px #0007);opacity:0;will-change:transform,opacity;animation:var(--curriculum-vfx-duration,900ms) steps(6,end) both curriculumVfxWord}",
    ".curriculum-vfx-glyph{font-size:calc(var(--curriculum-vfx-base-font,18px)*1.18);animation-name:curriculumVfxGlyph}",
    ".curriculum-vfx-word{animation-name:curriculumVfxWord}",
    ".curriculum-vfx-formula,.curriculum-attack-vfx-token.subject-math,.curriculum-attack-vfx-token.subject-science,.curriculum-attack-vfx-token.subject-social{font-family:Consolas,\"SFMono-Regular\",ui-monospace,monospace}",
    ".curriculum-vfx-formula{padding-inline:6px;color:#f8fafc;background:linear-gradient(90deg,#0000,color-mix(in srgb,var(--curriculum-vfx-primary,#93c5fd) 78%,#fff) 42%,var(--curriculum-vfx-accent,#c4b5fd) 70%,#0000);border-radius:5px;text-shadow:0 1px 0 var(--curriculum-vfx-shadow,#1e293b),0 0 6px #fff6;animation-name:curriculumVfxFormula}",
    ".curriculum-vfx-card{padding:4px 7px;color:var(--curriculum-vfx-shadow,#1f2937);background:linear-gradient(180deg,var(--curriculum-vfx-paper,#fff7d6),#fff 76%);border:1px solid color-mix(in srgb,var(--curriculum-vfx-primary,#f4d35e) 72%,#1f2937 20%);border-radius:6px;box-shadow:inset 0 -4px #00000012,0 2px 5px #0007;text-shadow:0 1px #fff;animation-name:curriculumVfxCard}",
    ".curriculum-vfx-burst{padding:3px 6px;color:#fff;background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--curriculum-vfx-accent,#7dd3fc) 80%,#fff),var(--curriculum-vfx-primary,#bfdbfe) 58%,#0000 62%);border-radius:50%;text-shadow:0 1px 0 var(--curriculum-vfx-shadow,#1f2937),0 0 7px #fff;animation-name:curriculumVfxBurst}",
    ".curriculum-attack-vfx-token.variant-1{animation-delay:.03s}.curriculum-attack-vfx-token.variant-2{animation-delay:.06s}.curriculum-attack-vfx-token.variant-3{animation-delay:.09s}",
    `.pixel-arena .student-sprite{--student-motion-scale:calc(var(--student-scale,1)*var(--student-display-scale,1));z-index:8;width:86px;height:124px;bottom:${cssNumber(studentDisplay.baseBottomPercent)}%;left:18%;animation:1.45s steps(6,end) infinite studentCombatLoop}`,
    `.pixel-arena .student-sprite.student-elementary{width:82px;height:118px;bottom:${cssNumber(studentDisplay.elementaryBottomPercent)}%;left:18%}`,
    `.pixel-arena .student-sprite.student-middle{width:86px;height:124px;bottom:${cssNumber(studentDisplay.middleBottomPercent)}%;left:19%}`,
    `.pixel-arena .student-sprite.student-high,.pixel-arena .student-sprite.student-repeater{width:90px;height:128px;bottom:${cssNumber(studentDisplay.highBottomPercent)}%;left:19%}`,
    `.pixel-arena .student-sprite.student-repeater{bottom:${cssNumber(studentDisplay.repeaterBottomPercent)}%}`,
    ".pixel-arena.road-travel .student-sprite{animation:.86s steps(4,end) infinite studentRoadRunLoop}",
    ".pixel-arena.road-approach .student-sprite{animation:1.08s steps(4,end) infinite studentRoadBrakeLoop}",
    ".pixel-arena .student-art{background-size:6400% 200%;background-position:var(--student-frame-a,var(--student-frame-x,0%)) var(--student-frame-y,0%);image-rendering:auto;transform-origin:50% 100%;animation:.64s steps(1,end) infinite studentMoveFrames}",
    ".pixel-arena .student-sprite::before{content:\"\";pointer-events:none;position:absolute;left:30%;bottom:-5px;width:48px;height:12px;opacity:0;background:radial-gradient(ellipse at 35% 62%,#f8fafc7a 0 17%,transparent 38%),radial-gradient(ellipse at 72% 56%,#9fd4c966 0 15%,transparent 36%);filter:blur(.15px);animation:1.45s steps(6,end) infinite studentDashDust}",
    ".pixel-arena.road-travel .student-sprite::before{animation:.86s steps(4,end) infinite roadRunDust}",
    ".pixel-arena.road-approach .student-sprite::before{animation:1.08s steps(4,end) infinite roadBrakeDust}",
    ".pixel-arena .student-sprite::after{content:\"\";pointer-events:none;position:absolute;left:58%;top:31%;width:44px;height:11px;opacity:0;background:linear-gradient(90deg,transparent,#f8fafc 24%,#9fd4c9 58%,#7dd3fc 80%,transparent);clip-path:polygon(0 46%,76% 6%,100% 50%,76% 94%,0 54%);transform-origin:left center;filter:drop-shadow(0 0 3px #f8fafc55);animation:1.45s steps(6,end) infinite studentMeleeSlash}",
    ".pixel-arena.road-travel .student-sprite::after{opacity:0;animation:none}",
    `.pixel-arena .helper-party{left:${cssNumber(studentDisplay.helperPartyLeftPercent)}%;bottom:${cssNumber(studentDisplay.helperBottomPercent)}%;z-index:7;gap:0;transform:translateX(-50%);overflow:visible}`,
    `.pixel-arena .helper-sprite{width:${cssNumber(studentDisplay.helperSizePx)}px;height:${cssNumber(studentDisplay.helperSizePx)}px;min-width:${cssNumber(studentDisplay.helperSizePx)}px;max-width:none;flex:0 0 ${cssNumber(studentDisplay.helperSizePx)}px;aspect-ratio:1/1;margin-left:-13px;display:block;animation:1.62s step-end infinite helperAllyLoop}`,
    ".pixel-arena.road-travel .helper-sprite{animation:.92s step-end infinite helperRoadRun}",
    ".pixel-arena.road-approach .helper-sprite{animation:1.12s step-end infinite helperRoadBrake}",
    ".pixel-arena .helper-slot-1{--helper-x:-12px;--helper-y:4px;--helper-scale:.9;animation-delay:.16s}",
    ".pixel-arena .helper-slot-2{--helper-x:1px;--helper-y:-7px;--helper-scale:.98;animation-delay:.34s}",
    ".pixel-arena .helper-slot-3{--helper-x:14px;--helper-y:3px;--helper-scale:.9;animation-delay:.52s}",
    ".pixel-arena .helper-sprite::after{content:\"\";pointer-events:none;position:absolute;left:61%;top:39%;width:30px;height:11px;opacity:0;background:linear-gradient(90deg,transparent,#9fd4c9,#fff,transparent);clip-path:polygon(0 42%,75% 0,100% 50%,75% 100%,0 58%);animation:1.62s steps(4,end) infinite helperAssistSpark;animation-delay:inherit}",
    ".pixel-arena.road-travel .helper-sprite::after,.pixel-arena.road-approach .helper-sprite::after{opacity:0;animation:none}",
    ".battle-scene-lineup{position:absolute;inset:0;z-index:5;pointer-events:none}",
    ".battle-road-lineup{will-change:transform;transform:translateX(0)}",
    ".battle-road-lineup.road-travel{animation:var(--road-travel-ms,2600ms) cubic-bezier(.16,.84,.32,1) both encounterPackTravel}",
    ".battle-road-lineup.road-approach{animation:var(--road-approach-ms,850ms) cubic-bezier(.16,.84,.32,1) both encounterPackApproach}",
    ".battle-road-lineup.road-combat{transform:translateX(0)}",
    ".battle-scene-lineup::before{content:\"\";pointer-events:none;position:absolute;left:34%;bottom:16%;width:60%;height:20%;opacity:0;background:radial-gradient(ellipse at 24% 76%,#f8fafc52 0 7%,transparent 21%),radial-gradient(ellipse at 52% 68%,#bfdbfe4f 0 6%,transparent 19%),radial-gradient(ellipse at 78% 72%,#9fd4c94f 0 6%,transparent 18%);animation:1.45s steps(6,end) infinite battleDustBurst}",
    ".battle-scene-lineup::after{content:\"\";pointer-events:none;position:absolute;left:34%;top:23%;width:58%;height:56%;opacity:0;background:radial-gradient(circle at 50% 50%,#fff5 0 8%,#93c5fd44 9% 18%,transparent 36%);animation:1.45s steps(6,end) infinite battleImpactFlash}",
    ".battle-scene-enemy{position:absolute;left:var(--scene-enemy-left,70%);top:var(--scene-enemy-top,70%);z-index:var(--scene-enemy-z,10);width:var(--battle-normal-enemy-size,80px);height:var(--battle-normal-enemy-size,80px);transform:translate(-50%,-100%) scale(var(--scene-enemy-scale,1));transform-origin:50% 100%;filter:drop-shadow(4px 7px #0000005c);animation:1.36s steps(4,end) infinite enemyCombatStep;animation-delay:var(--scene-enemy-delay,0s)}",
    ".battle-scene-enemy.boss{width:var(--battle-boss-enemy-size,94px);height:var(--battle-boss-enemy-size,94px);filter:drop-shadow(5px 8px #00000066)}",
    ".battle-scene-enemy.suneung{width:var(--battle-suneung-enemy-size,88px);height:var(--battle-suneung-enemy-size,88px);filter:drop-shadow(5px 8px #00000066)}",
    ".battle-scene-enemy.active{animation:.9s steps(4,end) infinite enemyEngagedStep}",
    `.battle-scene-enemy.active::before{content:"";pointer-events:none;position:absolute;inset:7%;z-index:2;border:1px solid #fff8;border-radius:18px;opacity:0;box-shadow:inset 0 0 0 1px #fff5,0 0 8px #9fd4c980;animation:.9s steps(4,end) infinite enemyShockRing;--enemy-rim-opacity:${cssNumber(enemyReaction.rimOpacity, 3)}}`,
    ".battle-scene-enemy.active::after{content:\"\";pointer-events:none;position:absolute;left:12%;top:22%;z-index:3;width:30%;height:46%;opacity:0;background:linear-gradient(180deg,transparent,#fff 22%,#9fd4c9 56%,transparent);border-radius:999px;filter:drop-shadow(0 0 4px #fff6);animation:.9s steps(4,end) infinite enemyHitSpark}",
    ".battle-scene-enemy.boss.active::after,.battle-scene-enemy.suneung.active::after{left:10%;top:20%;width:28%;height:48%}",
    ".battle-scene-enemy.defeated{opacity:var(--battle-defeated-opacity,0);filter:grayscale(.75) drop-shadow(2px 3px #00000040);animation:none}",
    ".battle-scene-enemy.defeated .battle-scene-monster-art{animation:none}",
    ".battle-scene-enemy.slot-1{--scene-enemy-delay:-.04s}.battle-scene-enemy.slot-2{--scene-enemy-delay:-.18s}.battle-scene-enemy.slot-3{--scene-enemy-delay:-.31s}.battle-scene-enemy.slot-4{--scene-enemy-delay:-.09s}.battle-scene-enemy.slot-5{--scene-enemy-delay:-.24s}.battle-scene-enemy.slot-6{--scene-enemy-delay:-.39s}.battle-scene-enemy.slot-7{--scene-enemy-delay:-.13s}.battle-scene-enemy.slot-8{--scene-enemy-delay:-.27s}.battle-scene-enemy.slot-9{--scene-enemy-delay:-.43s}.battle-scene-enemy.slot-10{--scene-enemy-delay:-.2s}.battle-scene-enemy.slot-11{--scene-enemy-delay:-.35s}.battle-scene-enemy.slot-12{--scene-enemy-delay:-.49s}",
    ".battle-scene-monster-art{position:absolute;inset:0;background-image:url(__STUDENT_ASSET_003__);background-repeat:no-repeat;background-size:19200% 100%;background-position:var(--monster-frame-x,0%) 0;image-rendering:auto;transform-origin:50% 100%;animation:1.18s steps(3,end) infinite enemyCombatBreath;animation-delay:inherit}",
    ".battle-scene-enemy.active .battle-scene-monster-art{animation:.9s steps(4,end) infinite enemyHurtLoop}",
    `.battle-scene-hp{position:absolute;left:50%;top:${cssNumber(enemyHpBar.topPx)}px;z-index:4;width:${cssNumber(enemyHpBar.widthPx)}px;height:${cssNumber(enemyHpBar.heightPx)}px;padding:2px;background:#17212ee8;border:1px solid #fff8;border-radius:999px;transform:translateX(-50%);box-shadow:0 2px 7px #0009;overflow:hidden}`,
    ".battle-scene-hp::after{content:\"\";position:absolute;inset:1px;width:55%;background:linear-gradient(90deg,transparent,#fff7,transparent);transform:translateX(-130%);animation:1.25s linear infinite bossHpShine}",
    ".battle-scene-hp i{display:block;height:100%;min-width:2px;background:linear-gradient(90deg,#ef476f,#ffd166);border-radius:inherit}",
    ".battle-scene-enemy.normal .battle-scene-hp{display:none}",
    ".battle-scene-lineup.suneung .battle-scene-enemy{width:var(--battle-suneung-enemy-size,88px);height:var(--battle-suneung-enemy-size,88px)}",
    ".phone-frame.reduced-effects .expedition-arena::before,.phone-frame.reduced-effects .expedition-arena::after,.phone-frame.reduced-effects .expedition-party-visual.running,.phone-frame.reduced-effects .expedition-unit-avatar.large,.phone-frame.reduced-effects .expedition-unit-avatar.large::after,.phone-frame.reduced-effects .expedition-enemy-visual,.phone-frame.reduced-effects .expedition-enemy-visual::before,.phone-frame.reduced-effects .expedition-enemy-visual::after,.phone-frame.reduced-effects .expedition-impact,.phone-frame.reduced-effects .pixel-arena::before,.phone-frame.reduced-effects .arena-background-sheet,.phone-frame.reduced-effects .arena-background-grid,.phone-frame.reduced-effects .pixel-floor,.phone-frame.reduced-effects .student-sprite,.phone-frame.reduced-effects .student-art,.phone-frame.reduced-effects .student-sprite::before,.phone-frame.reduced-effects .student-sprite::after,.phone-frame.reduced-effects .helper-sprite,.phone-frame.reduced-effects .helper-sprite::after,.phone-frame.reduced-effects .curriculum-attack-vfx-token,.phone-frame.reduced-effects .battle-road-lineup,.phone-frame.reduced-effects .battle-scene-lineup::before,.phone-frame.reduced-effects .battle-scene-lineup::after,.phone-frame.reduced-effects .battle-scene-enemy,.phone-frame.reduced-effects .battle-scene-enemy::before,.phone-frame.reduced-effects .battle-scene-enemy::after,.phone-frame.reduced-effects .battle-scene-monster-art,.phone-frame.reduced-effects .battle-scene-hp::after{animation-duration:.01ms;animation-iteration-count:1}",
    "@keyframes expeditionBackdropPan{0%{transform:translateX(0)}100%{transform:translateX(-58%)}}",
    `@keyframes battleRoadBackdropPan{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(${cssNumber(battleBackdrop.panLoopPercent)}%,0,0)}}`,
    "@keyframes expeditionPartyAdvance{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}",
    "@keyframes expeditionAllyMeleeA{0%,24.99%,75%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(0,0) rotate(-1deg)}25%,39.99%{background-position:var(--visual-unit-frame-b,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-b-y,var(--visual-unit-y,0%));transform:translate(8px,-3px) rotate(2deg)}40%,59.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(18px,-5px) rotate(4deg)}60%,74.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(6px,1px) rotate(-2deg)}}",
    "@keyframes expeditionAllyMeleeB{0%,24.99%,75%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(0,0) rotate(1deg)}25%,39.99%{background-position:var(--visual-unit-frame-b,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-b-y,var(--visual-unit-y,0%));transform:translate(9px,-4px) rotate(-2deg)}40%,59.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(20px,-7px) rotate(-5deg)}60%,74.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(7px,1px) rotate(2deg)}}",
    "@keyframes expeditionAllyMeleeC{0%,24.99%,75%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(0,0) scale(1)}25%,39.99%{background-position:var(--visual-unit-frame-b,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-b-y,var(--visual-unit-y,0%));transform:translate(10px,-2px) scale(1.02)}40%,59.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(22px,-4px) scale(1.04)}60%,74.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(8px,1px) scale(.98)}}",
    "@keyframes expeditionAllySpark{0%,30%,68%,100%{opacity:0;transform:translateX(-8px) scaleX(.45)}38%,52%{opacity:.95;transform:translateX(18px) scaleX(1.1)}}",
    "@keyframes expeditionEnemyIdle{0%,100%{transform:translate(0,0)}30%{transform:translate(-2px,-3px)}62%{transform:translate(2px,1px)}}",
    "@keyframes expeditionEnemySpriteIdle{0%,32.99%,100%{background-position:var(--visual-enemy-frame-a,var(--visual-enemy-x,0%)) var(--visual-enemy-frame-a-y,var(--visual-enemy-y,0%));filter:brightness(1);transform:translateY(0) scale(1)}33%,65.99%{background-position:var(--visual-enemy-frame-b,var(--visual-enemy-frame-a,var(--visual-enemy-x,0%))) var(--visual-enemy-frame-b-y,var(--visual-enemy-y,0%));filter:brightness(1.06);transform:translateY(-2px) scale(1.03,.98)}66%,99.99%{background-position:var(--visual-enemy-frame-c,var(--visual-enemy-frame-a,var(--visual-enemy-x,0%))) var(--visual-enemy-frame-c-y,var(--visual-enemy-y,0%));filter:brightness(1.08);transform:translateY(-3px) scale(1.04,.97)}}",
    "@keyframes expeditionEnemyKnockback{0%,100%{transform:translate(0,0) rotate(0)}30%{transform:translate(-5px,-2px) rotate(-2deg)}52%{transform:translate(3px,1px) rotate(1deg)}72%{transform:translate(-2px,0) rotate(-1deg)}}",
    "@keyframes expeditionEnemyHurtSprite{0%,24.99%,100%{background-position:var(--visual-enemy-frame-a,var(--visual-enemy-x,0%)) var(--visual-enemy-frame-a-y,var(--visual-enemy-y,0%));filter:brightness(1);transform:translateY(0) rotate(0) scale(1)}25%,49.99%{background-position:var(--visual-enemy-frame-c,var(--visual-enemy-frame-a,var(--visual-enemy-x,0%))) var(--visual-enemy-frame-c-y,var(--visual-enemy-y,0%));filter:brightness(1.22) drop-shadow(0 0 3px #fff8);transform:translate(-2px,-1px) rotate(-2deg) scale(.99,1.01)}50%,69.99%{background-position:var(--visual-enemy-frame-d,var(--visual-enemy-frame-a,var(--visual-enemy-x,0%))) var(--visual-enemy-frame-d-y,var(--visual-enemy-y,0%));filter:brightness(1.1);transform:translate(1px,0) rotate(1deg) scale(1.01,.99)}70%,99.99%{background-position:var(--visual-enemy-frame-b,var(--visual-enemy-frame-a,var(--visual-enemy-x,0%))) var(--visual-enemy-frame-b-y,var(--visual-enemy-y,0%));filter:brightness(1.04);transform:translate(-1px,0) rotate(-.5deg) scale(1)}}",
    "@keyframes expeditionEnemyShock{0%,24%,70%,100%{opacity:0;transform:translate(-50%,-50%) scale(.94)}34%,52%{opacity:.72;transform:translate(-50%,-50%) scale(1)}}",
    "@keyframes expeditionImpactSlash{0%,28%,68%,100%{opacity:0;transform:rotate(-12deg) translateX(-5px) scaleX(.45)}38%,52%{opacity:.58;transform:rotate(-12deg) translateX(5px) scaleX(.86)}}",
    "@keyframes expeditionDustBurst{0%,30%,64%,100%{opacity:0;transform:translateX(0) scale(.7)}40%,54%{opacity:.72;transform:translateX(-10px) scale(1.08)}}",
    "@keyframes arenaTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-24px)}}",
    "@keyframes gridTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-18px)}}",
    "@keyframes floorTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-28px)}}",
    "@keyframes encounterPackTravel{0%{transform:translateX(var(--road-parallax-px,180px));opacity:.72}62%{opacity:1}100%{transform:translateX(0);opacity:1}}",
    "@keyframes encounterPackApproach{0%{transform:translateX(58px)}100%{transform:translateX(0)}}",
    "@keyframes studentRoadRunLoop{0%,100%{transform:translateX(-50%) translate(0,0) scale(var(--student-motion-scale))}25%{transform:translateX(-50%) translate(-4px,-4px) scale(var(--student-motion-scale))}50%{transform:translateX(-50%) translate(8px,1px) scale(var(--student-motion-scale))}75%{transform:translateX(-50%) translate(2px,-2px) scale(var(--student-motion-scale))}}",
    "@keyframes studentRoadBrakeLoop{0%,100%{transform:translateX(-50%) translate(0,0) scale(var(--student-motion-scale))}36%{transform:translateX(-50%) translate(9px,-3px) scale(var(--student-motion-scale))}62%{transform:translateX(-50%) translate(4px,1px) scale(var(--student-motion-scale))}}",
    `@keyframes studentCombatLoop{0%,18%,72%,100%{transform:translateX(-50%) translate(0,0) scale(var(--student-motion-scale))}26%{transform:translateX(-50%) translate(${cssNumber(studentAttack.windupPx)}px,-3px) scale(var(--student-motion-scale))}38%,48%{transform:translateX(-50%) translate(${cssNumber(studentAttack.dashPx)}px,-6px) scale(var(--student-motion-scale))}60%{transform:translateX(-50%) translate(${cssNumber(studentAttack.recoverPx)}px,2px) scale(var(--student-motion-scale))}}`,
    "@keyframes studentMoveFrames{0%,24.99%{background-position:var(--student-frame-a,var(--student-frame-x,0%)) var(--student-frame-y,0%)}25%,49.99%{background-position:var(--student-frame-b,var(--student-frame-a,var(--student-frame-x,0%))) var(--student-frame-y,0%)}50%,74.99%{background-position:var(--student-frame-c,var(--student-frame-a,var(--student-frame-x,0%))) var(--student-frame-y,0%)}75%,100%{background-position:var(--student-frame-d,var(--student-frame-a,var(--student-frame-x,0%))) var(--student-frame-y,0%)}}",
    "@keyframes studentSpriteIdle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02,.98)}}",
    `@keyframes studentDashDust{0%,26%,64%,100%{opacity:0;transform:translate(0,0) scale(.38)}38%,50%{opacity:.42;transform:translate(${cssNumber(studentAttack.dustPx)}px,2px) scale(.86)}}`,
    "@keyframes roadRunDust{0%,35%,100%{opacity:0;transform:translate(6px,0) scale(.5)}48%,72%{opacity:.68;transform:translate(-30px,3px) scale(1)}}",
    "@keyframes roadBrakeDust{0%,34%,78%,100%{opacity:0;transform:translate(10px,0) scale(.42)}48%,62%{opacity:.58;transform:translate(-14px,3px) scale(.86)}}",
    `@keyframes studentMeleeSlash{0%,29%,58%,100%{opacity:0;transform:translate(6px,2px) rotate(-8deg) scaleX(.36)}38%,48%{opacity:.62;transform:translate(${cssNumber(studentAttack.slashPx)}px,-2px) rotate(-8deg) scaleX(.82)}}`,
    "@keyframes curriculumVfxGlyph{0%,14%{opacity:0;transform:translate(var(--curriculum-vfx-source-x),var(--curriculum-vfx-source-y)) scale(.68) rotate(-14deg)}30%,58%{opacity:1}60%{transform:translate(var(--curriculum-vfx-arc-x),var(--curriculum-vfx-arc-y)) scale(1.08) rotate(4deg)}78%{opacity:.96;transform:translate(var(--curriculum-vfx-impact-x),var(--curriculum-vfx-impact-y)) scale(1.18) rotate(-2deg)}100%{opacity:0;transform:translate(8px,-10px) scale(.82) rotate(7deg)}}",
    "@keyframes curriculumVfxWord{0%,13%{opacity:0;transform:translate(var(--curriculum-vfx-source-x),var(--curriculum-vfx-source-y)) scale(.78) rotate(-8deg)}28%,56%{opacity:1}62%{transform:translate(var(--curriculum-vfx-arc-x),var(--curriculum-vfx-arc-y)) scale(1.02) rotate(2deg)}82%{opacity:.95;transform:translate(var(--curriculum-vfx-impact-x),var(--curriculum-vfx-impact-y)) scale(1.06) rotate(0)}100%{opacity:0;transform:translate(9px,-7px) scale(.88) rotate(3deg)}}",
    "@keyframes curriculumVfxFormula{0%,12%{opacity:0;transform:translate(var(--curriculum-vfx-source-x),var(--curriculum-vfx-source-y)) scaleX(.72) rotate(-5deg)}26%,55%{opacity:1}62%{transform:translate(var(--curriculum-vfx-arc-x),var(--curriculum-vfx-arc-y)) scaleX(1.08) rotate(1deg)}80%{opacity:.98;transform:translate(var(--curriculum-vfx-impact-x),var(--curriculum-vfx-impact-y)) scaleX(1) rotate(0)}100%{opacity:0;transform:translate(11px,-5px) scaleX(.72) rotate(2deg)}}",
    "@keyframes curriculumVfxCard{0%,16%{opacity:0;transform:translate(var(--curriculum-vfx-source-x),var(--curriculum-vfx-source-y)) rotateY(62deg) rotate(-10deg) scale(.72)}32%,58%{opacity:1}64%{transform:translate(var(--curriculum-vfx-arc-x),var(--curriculum-vfx-arc-y)) rotateY(0) rotate(3deg) scale(1.02)}82%{opacity:.98;transform:translate(var(--curriculum-vfx-impact-x),var(--curriculum-vfx-impact-y)) rotateY(-12deg) rotate(-1deg) scale(1.04)}100%{opacity:0;transform:translate(6px,-8px) rotateY(-38deg) rotate(5deg) scale(.8)}}",
    "@keyframes curriculumVfxBurst{0%,18%{opacity:0;transform:translate(var(--curriculum-vfx-source-x),var(--curriculum-vfx-source-y)) scale(.42) rotate(-16deg)}34%,56%{opacity:1}64%{transform:translate(var(--curriculum-vfx-arc-x),var(--curriculum-vfx-arc-y)) scale(1.18) rotate(6deg)}78%{opacity:1;transform:translate(var(--curriculum-vfx-impact-x),var(--curriculum-vfx-impact-y)) scale(1.26) rotate(-2deg)}100%{opacity:0;transform:translate(12px,-12px) scale(.3) rotate(14deg)}}",
    "@keyframes helperRoadRun{0%,24.99%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(var(--helper-x),var(--helper-y)) scale(var(--helper-scale))}25%,49.99%{background-position:var(--visual-unit-frame-b,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-b-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) - 3px),calc(var(--helper-y) - 3px)) scale(var(--helper-scale))}50%,74.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 4px),calc(var(--helper-y) + 1px)) scale(var(--helper-scale))}75%,99.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 1px),calc(var(--helper-y) - 2px)) scale(var(--helper-scale))}}",
    "@keyframes helperRoadBrake{0%,33.99%,84%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(var(--helper-x),var(--helper-y)) scale(var(--helper-scale))}34%,63.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 8px),calc(var(--helper-y) - 3px)) scale(var(--helper-scale))}64%,83.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 3px),calc(var(--helper-y) + 1px)) scale(var(--helper-scale))}}",
    "@keyframes helperAllyLoop{0%,19.99%,75%,100%{background-position:var(--visual-unit-frame-a,var(--visual-unit-x,0%)) var(--visual-unit-frame-a-y,var(--visual-unit-y,0%));transform:translate(var(--helper-x),var(--helper-y)) scale(var(--helper-scale))}20%,34.99%{background-position:var(--visual-unit-frame-b,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-b-y,var(--visual-unit-y,0%));transform:translate(var(--helper-x),calc(var(--helper-y) - 3px)) scale(var(--helper-scale))}35%,54.99%{background-position:var(--visual-unit-frame-c,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-c-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 20px),calc(var(--helper-y) - 5px)) scale(var(--helper-scale))}55%,74.99%{background-position:var(--visual-unit-frame-d,var(--visual-unit-frame-a,var(--visual-unit-x,0%))) var(--visual-unit-frame-d-y,var(--visual-unit-y,0%));transform:translate(calc(var(--helper-x) + 6px),calc(var(--helper-y) + 1px)) scale(var(--helper-scale))}}",
    "@keyframes helperAssistSpark{0%,34%,62%,100%{opacity:0;transform:translate(0,0) scaleX(.5)}42%,52%{opacity:.82;transform:translate(22px,-3px) scaleX(1)}}",
    "@keyframes enemyCombatStep{0%,100%{transform:translate(-50%,-100%) translate(0,0) scale(var(--scene-enemy-scale,1))}24%{transform:translate(-50%,-100%) translate(-3px,-4px) scale(var(--scene-enemy-scale,1))}50%{transform:translate(-50%,-100%) translate(2px,1px) scale(var(--scene-enemy-scale,1))}74%{transform:translate(-50%,-100%) translate(-1px,-2px) scale(var(--scene-enemy-scale,1))}}",
    `@keyframes enemyEngagedStep{0%,100%{transform:translate(-50%,-100%) translate(0,0) scale(var(--scene-enemy-scale,1))}28%{transform:translate(-50%,-100%) translate(-${cssNumber(enemyReaction.engagedTravelPx)}px,-1px) scale(var(--scene-enemy-scale,1))}50%{transform:translate(-50%,-100%) translate(${cssNumber(enemyReaction.engagedTravelPx / 2)}px,1px) scale(var(--scene-enemy-scale,1))}70%{transform:translate(-50%,-100%) translate(-${cssNumber(enemyReaction.engagedTravelPx / 3)}px,0) scale(var(--scene-enemy-scale,1))}}`,
    "@keyframes enemyCombatBreath{0%,100%{filter:brightness(1);transform:translateY(0) scale(1)}50%{filter:brightness(1.08);transform:translateY(-3px) scale(1.05,.96)}}",
    `@keyframes enemyHurtLoop{0%,100%{filter:brightness(1);transform:translate(0,0) scale(1)}30%{filter:brightness(1.18) saturate(1.05) drop-shadow(0 0 3px #fff8);transform:translate(-${cssNumber(enemyReaction.hurtTravelPx)}px,0) scale(1)}52%{filter:brightness(1.08);transform:translate(${cssNumber(enemyReaction.hurtTravelPx / 2)}px,0) scale(1)}70%{filter:brightness(1.04);transform:translate(-${cssNumber(enemyReaction.hurtTravelPx / 3)}px,0) scale(1)}}`,
    "@keyframes enemyShockRing{0%,26%,72%,100%{opacity:0;transform:scale(.96)}34%,50%{opacity:var(--enemy-rim-opacity,.72);transform:scale(1)}}",
    "@keyframes enemyHitSpark{0%,26%,68%,100%{opacity:0;transform:translateX(-4px) scaleY(.7)}34%,50%{opacity:.62;transform:translateX(0) scaleY(1)}}",
    "@keyframes battleDustBurst{0%,30%,62%,100%{opacity:0;transform:translateX(0) scale(.72)}40%,52%{opacity:.62;transform:translateX(-8px) scale(1.08)}}",
    "@keyframes battleImpactFlash{0%,35%,58%,100%{opacity:0;transform:scale(.7)}44%,50%{opacity:.42;transform:scale(1)}}",
    "@keyframes bossHpShine{0%{transform:translateX(-130%)}100%{transform:translateX(210%)}}",
    "@media (width<=390px){.battle-enemy-grid.compact{gap:3px}.battle-enemy-card{grid-template-columns:28px minmax(0,1fr)}.battle-enemy-monster{width:29px;height:29px}.pixel-arena .battle-enemy-card{grid-template-columns:22px minmax(0,1fr);min-height:34px}.pixel-arena .battle-enemy-card>.battle-enemy-monster{width:23px;height:23px}}",
    `@media (width<=390px){.pixel-arena{--battle-normal-enemy-size:${cssNumber(enemyDisplay.mobileNormalSizePx)}px;--battle-boss-enemy-size:${cssNumber(enemyDisplay.mobileBossSizePx)}px;--battle-suneung-enemy-size:${cssNumber(enemyDisplay.mobileSuneungSizePx)}px}.battle-scene-hp{top:${cssNumber(enemyHpBar.mobileTopPx)}px;width:${cssNumber(enemyHpBar.mobileWidthPx)}px;height:${cssNumber(enemyHpBar.mobileHeightPx)}px}}`,
  );
  const studentColumns = mainStudents.columns ?? Math.max(1, Math.round(mainStudents.width / mainStudents.cell));
  const studentRows = mainStudents.rows ?? 1;
  mainStudents.items.forEach((item) => {
    const frames = item.animationFrames ?? [item.frame, item.frame + 1, item.frame + 2, item.frame + 3];
    const y = positionPercent(item.row ?? 0, studentRows);
    lines.push(
      `.student-gender-${item.gender}.student-grade-${item.gradeOrder} .student-art{--student-frame-a:${positionPercent(frames[0], studentColumns)};--student-frame-b:${positionPercent(frames[1] ?? frames[0], studentColumns)};--student-frame-c:${positionPercent(frames[2] ?? frames[0], studentColumns)};--student-frame-d:${positionPercent(frames[3] ?? frames[0], studentColumns)};--student-frame-y:${y}}`,
    );
  });
  const mainMonsterTotal = Math.max(1, Math.round(mainMonsters.width / mainMonsters.cell));
  mainMonsters.items.forEach((item) => {
    lines.push(`.${item.id}{--monster-frame-x:${positionPercent(item.frame, mainMonsterTotal)}}`);
  });
  return `${lines.join("\n")}\n`;
}

function upsertManifestAsset(manifest, token, file, atlas) {
  const buffer = readFileSync(atlas.path);
  const info = {
    token,
    file,
    mime: "image/png",
    bytes: buffer.length,
    sha256: sha256(buffer),
    width: atlas.width,
    height: atlas.height,
  };
  manifest.assets = (manifest.assets || []).filter((asset) => asset.token !== token);
  manifest.assets.push(info);
  manifest.assets.sort((a, b) => a.token.localeCompare(b.token));
  return info;
}

function refreshReactAssetLoaderMtime() {
  if (!existsSync(reactAssetLoaderPath)) throw new Error("React 자산 로더 파일이 없습니다: src/react/game/assets.js");
  const now = new Date();
  utimesSync(reactAssetLoaderPath, now, now);
}

function enrichCareers(careers, careerAtlas) {
  const byId = new Map(careerAtlas.items.filter((item) => item.gender !== "female").map((item) => [item.careerId, item]));
  return careers.map((career) => {
    const item = byId.get(career.id);
    const helper = sanitizeClass(career.helperSprite ?? "helper-files");
    return {
      ...career,
      portraitAsset: item?.id ?? `career-${career.id}`,
      spriteAsset: `career-unit-${sanitizeClass(career.id)}`,
      iconAsset: career.iconAsset ?? `icon-${helper.replace(/^helper-/, "")}`,
    };
  });
}

function toneForChapter(chapter, enemyItems) {
  const tones = toneIdsFromEnemies(enemyItems);
  if (tones.length === 0) throw new Error("원정대 몬스터 tone 목록이 비어 있습니다.");
  return tones[Math.max(0, Number(chapter) - 1) % tones.length];
}

function stageEnemyAssetsForSegment(stage, enemyItems) {
  const tone = toneForChapter(stage.chapter, enemyItems);
  const mobs = mobItemsForTone(enemyItems, tone);
  const enemyCount = Array.isArray(stage.normalEnemyNames) && stage.normalEnemyNames.length > 0 ? stage.normalEnemyNames.length : 1;
  if (mobs.length < enemyCount) throw new Error(`원정대 ${stage.id} ${tone} 몬스터 수가 부족합니다: ${mobs.length} < ${enemyCount}`);
  const start = Math.max(0, Number(stage.segment || 1) - 1) % mobs.length;
  const step = mobs.length >= enemyCount * 2 ? 2 : 1;
  const assets = Array.from({ length: enemyCount }, (_unused, index) => mobs[(start + index * step) % mobs.length]);
  return {
    tone,
    enemyAsset: assets[0].id,
    enemyAssets: assets.map((item) => item.id),
    enemyVariant: Number(assets[0].variant),
  };
}

function bossAssetForBoss(boss, enemyItems) {
  const tone = toneForChapter(boss.chapter, enemyItems);
  const bosses = bossItemsForTone(enemyItems, tone);
  if (bosses.length === 0) throw new Error(`원정대 ${boss.id} ${tone} 보스 몬스터가 없습니다.`);
  if (boss.bossType === "chapter") return bosses[bosses.length - 1].id;
  const index = Math.max(0, Number(boss.segment || 1) - 1) % bosses.length;
  return bosses[index].id;
}

function enrichStages(stages, enemyItems) {
  return stages.map((stage) => {
    const enemyAssets = stageEnemyAssetsForSegment(stage, enemyItems);
    return {
      ...stage,
      enemyAsset: enemyAssets.enemyAsset,
      enemyAssets: enemyAssets.enemyAssets,
      enemyVariant: enemyAssets.enemyVariant,
    };
  });
}

function enrichBosses(bosses, enemyItems) {
  return bosses.map((boss) => {
    return {
      ...boss,
      bossAsset: bossAssetForBoss(boss, enemyItems),
    };
  });
}

function enrichGradeVisuals(gradeVisuals) {
  return gradeVisuals.map((visual) => ({
    ...visual,
    studentAsset: `main-student-${String(visual.studentFrame).padStart(3, "0")}`,
    normalMonsterAssets: visual.normalMonsterFrames.map((frame) => `main-monster-${String(frame).padStart(3, "0")}`),
    examMonsterAssets: Object.fromEntries(
      Object.entries(visual.examMonsterFrames).map(([key, frame]) => [key, `main-monster-${String(frame).padStart(3, "0")}`]),
    ),
  }));
}

const careers = JSON.parse(readFileSync(careersPath, "utf8"));
const gradeVisuals = JSON.parse(readFileSync(gradeVisualsPath, "utf8"));
const stages = JSON.parse(readFileSync(stagesPath, "utf8"));
const bosses = JSON.parse(readFileSync(bossesPath, "utf8"));
const professionalSpriteManifest = readProfessionalSpriteManifest();
const expeditionEnemyItems = expeditionEnemyCatalog(professionalSpriteManifest);
const battleRoadConfig = readBattleRoadConfig();
const mainStudentAtlas = buildMainStudentAtlas(gradeVisuals);
const mainMonsterAtlas = buildMainMonsterAtlas(gradeVisuals);
const companionAtlas = buildCompanionAtlas(careers);
const enemyAtlas = buildEnemyAtlas(expeditionEnemyItems);
const careerAtlas = buildCareerAtlas(careers);
ensureExpeditionBackdropSourceSet();
const expeditionBackdropAtlas = buildExpeditionBackdropAtlas();
const battleRoadBackdropAtlas = buildBattleRoadBackdropAtlas(battleRoadConfig);

writeFileSync(cssPath, buildCss(companionAtlas, enemyAtlas, careerAtlas, mainStudentAtlas, mainMonsterAtlas, expeditionBackdropAtlas, battleRoadBackdropAtlas, battleRoadConfig), "utf8");
writeFileSync(careersPath, `${JSON.stringify(enrichCareers(careers, careerAtlas), null, 2)}\n`, "utf8");
writeFileSync(gradeVisualsPath, `${JSON.stringify(enrichGradeVisuals(gradeVisuals), null, 2)}\n`, "utf8");
writeFileSync(stagesPath, `${JSON.stringify(enrichStages(stages, expeditionEnemyItems), null, 2)}\n`, "utf8");
writeFileSync(bossesPath, `${JSON.stringify(enrichBosses(bosses, expeditionEnemyItems), null, 2)}\n`, "utf8");

const previousManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifest = {
  version: previousManifest.version ?? 1,
  generatedBy: "tools/build-visual-assets.mjs",
  assets: [],
};
const manifestAssets = [
  upsertManifestAsset(manifest, "__STUDENT_ASSET_002__", "assets/asset-002.png", mainStudentAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_003__", "assets/asset-003.png", mainMonsterAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_007__", "assets/visual-companions.png", companionAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_008__", "assets/visual-enemies.png", enemyAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_009__", "assets/visual-careers.png", careerAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_010__", "assets/visual-expedition-backdrops.png", expeditionBackdropAtlas),
  ...battleRoadBackdropAtlas.items.map((item) => upsertManifestAsset(manifest, item.token, item.file, item)),
];
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const visualData = {
  version: 1,
  style: "pixel-voxel",
  generatedBy: "tools/build-visual-assets.mjs",
  atlases: [
    { id: "mainStudents", token: "__STUDENT_ASSET_002__", file: "assets/asset-002.png", cell: mainStudentAtlas.cell, columns: mainStudentAtlas.columns, rows: mainStudentAtlas.rows, framesPerCharacter: mainStudentAtlas.framesPerCharacter, width: mainStudentAtlas.width, height: mainStudentAtlas.height, items: mainStudentAtlas.items },
    { id: "mainMonsters", token: "__STUDENT_ASSET_003__", file: "assets/asset-003.png", cell: mainMonsterAtlas.cell, columns: mainMonsterAtlas.columns, rows: mainMonsterAtlas.rows, width: mainMonsterAtlas.width, height: mainMonsterAtlas.height, items: mainMonsterAtlas.items },
    { id: "companions", token: "__STUDENT_ASSET_007__", file: "assets/visual-companions.png", cell: companionAtlas.cell, columns: companionAtlas.columns, rows: companionAtlas.rows, framesPerItem: companionAtlas.framesPerItem, genders: companionAtlas.genders, width: companionAtlas.width, height: companionAtlas.height, items: companionAtlas.items },
    { id: "enemies", token: "__STUDENT_ASSET_008__", file: "assets/visual-enemies.png", cell: enemyAtlas.cell, columns: enemyAtlas.columns, rows: enemyAtlas.rows, framesPerItem: enemyAtlas.framesPerItem, width: enemyAtlas.width, height: enemyAtlas.height, items: enemyAtlas.items },
    { id: "careers", token: "__STUDENT_ASSET_009__", file: "assets/visual-careers.png", cell: careerAtlas.cell, width: careerAtlas.width, height: careerAtlas.height, items: careerAtlas.items },
  ],
  backgrounds: [
    {
      id: "expeditionBackdrops",
      token: "__STUDENT_ASSET_010__",
      file: "assets/visual-expedition-backdrops.png",
      width: expeditionBackdropAtlas.width,
      height: expeditionBackdropAtlas.height,
      rowHeight: expeditionBackdropAtlas.rowHeight,
      items: expeditionBackdropAtlas.items,
    },
    {
      id: "battleRoadBackdrops",
      token: battleRoadBackdropAtlas.items[0]?.token ?? "__STUDENT_ASSET_011__",
      file: battleRoadBackdropAtlas.items[0]?.file ?? "assets/visual-battle-road-backdrop-elementary.png",
      width: battleRoadBackdropAtlas.width,
      height: battleRoadBackdropAtlas.height,
      rowHeight: battleRoadBackdropAtlas.rowHeight,
      items: battleRoadBackdropAtlas.items,
    },
  ],
};
mkdirSync(dirname(visualDataPath), { recursive: true });
writeFileSync(visualDataPath, `${JSON.stringify(visualData, null, 2)}\n`, "utf8");
refreshReactAssetLoaderMtime();

console.log(`VISUAL_ASSETS_BUILT students=${mainStudentAtlas.items.length} mainMonsters=${mainMonsterAtlas.items.length} companions=${companionAtlas.items.length} enemies=${enemyAtlas.items.length} careers=${careerAtlas.items.length} expeditionBackdrops=${expeditionBackdropAtlas.items.length} battleRoadBackdrops=${battleRoadBackdropAtlas.items.length}`);
console.log("REACT_ASSET_LOADER_REFRESHED src/react/game/assets.js");
for (const asset of manifestAssets) {
  console.log(`${asset.token} ${asset.file} ${asset.width}x${asset.height} bytes=${asset.bytes}`);
}
