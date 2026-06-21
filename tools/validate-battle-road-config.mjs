import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve("data/battle_road_config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function hasUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) fail(`${label} ids must be unique`);
  ids.forEach((id, index) => {
    if (!id || typeof id !== "string") fail(`${label}[${index}] is missing id`);
  });
}

if (config.version !== 1) fail("version must be 1");

for (const key of ["playerAnchorX", "combatAnchorX", "enemyMeetX", "enemySpawnX", "parallaxDistancePx"]) {
  if (!isPositiveNumber(config.camera?.[key])) fail(`camera.${key} must be a positive number`);
}

for (const key of ["travelMs", "approachMs", "combatLoopMs", "clearHoldMs"]) {
  if (!isPositiveNumber(config.timing?.[key])) fail(`timing.${key} must be a positive number`);
}

const presentation = config.presentation ?? {};
const backdrop = presentation.backdrop ?? {};
for (const key of ["panWidthPercent", "panDurationSec"]) {
  if (!isPositiveNumber(backdrop[key])) fail(`presentation.backdrop.${key} must be a positive number`);
}
if (!isFiniteNumber(backdrop.panLoopPercent) || backdrop.panLoopPercent >= 0 || backdrop.panLoopPercent < -100) {
  fail("presentation.backdrop.panLoopPercent must be between -100 and 0");
}
for (const key of ["travelFilter", "defaultFilter"]) {
  if (typeof backdrop[key] !== "string" || backdrop[key].trim().length === 0) {
    fail(`presentation.backdrop.${key} must be a non-empty string`);
  }
}

const display = presentation.studentDisplay ?? {};
for (const key of [
  "scaleMultiplier",
  "baseBottomPercent",
  "elementaryBottomPercent",
  "middleBottomPercent",
  "highBottomPercent",
  "repeaterBottomPercent",
  "helperBottomPercent",
]) {
  if (!isPositiveNumber(display[key])) fail(`presentation.studentDisplay.${key} must be a positive number`);
}

const attack = presentation.studentAttack ?? {};
for (const key of ["windupPx", "dashPx", "recoverPx", "dustPx", "slashPx"]) {
  if (!isFiniteNumber(attack[key]) || attack[key] < 0) fail(`presentation.studentAttack.${key} must be a non-negative number`);
}
if ((attack.dashPx ?? 999) > 40) fail("presentation.studentAttack.dashPx should stay short for close melee readability");

const enemySlots = presentation.enemySlots ?? {};
for (const [slotKey, expectedLength] of [
  ["school", 3],
  ["suneungSingle", 1],
  ["suneungPair", 2],
]) {
  const slots = enemySlots[slotKey];
  if (!Array.isArray(slots) || slots.length !== expectedLength) {
    fail(`presentation.enemySlots.${slotKey} must contain ${expectedLength} slot entries`);
    continue;
  }
  slots.forEach((slot, index) => {
    if (!Array.isArray(slot) || slot.length !== 3) {
      fail(`presentation.enemySlots.${slotKey}[${index}] must be [left, top, scale]`);
      return;
    }
    const [left, top, scale] = slot;
    if (!isFiniteNumber(left) || left < 0 || left > 130) fail(`presentation.enemySlots.${slotKey}[${index}].left is outside 0..130`);
    if (!isFiniteNumber(top) || top < 0 || top > 100) fail(`presentation.enemySlots.${slotKey}[${index}].top is outside 0..100`);
    if (!isPositiveNumber(scale) || scale > 2) fail(`presentation.enemySlots.${slotKey}[${index}].scale is outside 0..2`);
  });
}

const schoolEncounters = config.schoolYear?.encounters ?? [];
if (schoolEncounters.length !== 4) fail(`schoolYear.encounters must contain 4 encounters, got ${schoolEncounters.length}`);
hasUniqueIds(schoolEncounters, "schoolYear.encounters");

schoolEncounters.forEach((encounter, index) => {
  const prefix = `schoolYear.encounters[${index}]`;
  if (!encounter.label) fail(`${prefix}.label is required`);
  if (!Array.isArray(encounter.monthRange) || encounter.monthRange.length !== 2) fail(`${prefix}.monthRange must have 2 months`);
  if (!Array.isArray(encounter.normalMonths) || encounter.normalMonths.length !== 2) fail(`${prefix}.normalMonths must have 2 months`);
  if (!Number.isInteger(encounter.bossMonth)) fail(`${prefix}.bossMonth must be an integer`);
  if (!encounter.bossKey) fail(`${prefix}.bossKey is required`);

  const months = [...(encounter.monthRange ?? []), ...(encounter.normalMonths ?? []), encounter.bossMonth].filter((month) => month !== undefined);
  months.forEach((month) => {
    if (!Number.isInteger(month) || month < 1 || month > 12) fail(`${prefix} month ${month} is outside 1..12`);
  });
});

const suneungEncounters = config.suneung?.encounters ?? [];
if (suneungEncounters.length !== 4) fail(`suneung.encounters must contain 4 encounters, got ${suneungEncounters.length}`);
hasUniqueIds(suneungEncounters, "suneung.encounters");

const subjectIds = new Set();
suneungEncounters.forEach((encounter, index) => {
  const prefix = `suneung.encounters[${index}]`;
  if (!encounter.label) fail(`${prefix}.label is required`);
  if (!Array.isArray(encounter.enemies) || encounter.enemies.length < 1) fail(`${prefix}.enemies must contain at least 1 enemy`);
  hasUniqueIds(encounter.enemies ?? [], `${prefix}.enemies`);
  (encounter.enemies ?? []).forEach((enemy, enemyIndex) => {
    const enemyPrefix = `${prefix}.enemies[${enemyIndex}]`;
    if (!enemy.label) fail(`${enemyPrefix}.label is required`);
    if (!Array.isArray(enemy.subjects) || enemy.subjects.length < 1) fail(`${enemyPrefix}.subjects must contain at least 1 subject`);
    if (!Number.isInteger(enemy.visualMonth) || enemy.visualMonth < 1 || enemy.visualMonth > 5) {
      fail(`${enemyPrefix}.visualMonth must be in 1..5`);
    }
    (enemy.subjects ?? []).forEach((subjectId) => subjectIds.add(subjectId));
  });
});

for (const subjectId of ["korean", "math", "english", "social", "science"]) {
  if (!subjectIds.has(subjectId)) fail(`suneung subject ${subjectId} is missing`);
}

if ((suneungEncounters.at(-1)?.enemies ?? []).length !== 2) {
  fail("suneung final encounter must contain social and science together");
}

if (failures.length > 0) {
  console.error(JSON.stringify({ configPath, failures }, null, 2));
  console.error(`BATTLE_ROAD_CONFIG_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(
  `BATTLE_ROAD_CONFIG_OK schoolEncounters=${schoolEncounters.length} suneungEncounters=${suneungEncounters.length}`,
);
