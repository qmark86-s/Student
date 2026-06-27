import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const stages = JSON.parse(readFileSync(resolve("data/expedition_stages.json"), "utf8"));
const bosses = JSON.parse(readFileSync(resolve("data/expedition_bosses.json"), "utf8"));
const promotions = JSON.parse(readFileSync(resolve("data/expedition_promotions.json"), "utf8"));
const combat = JSON.parse(readFileSync(resolve("data/expedition_combat_balance.json"), "utf8"));

const failures = [];
const roleIds = new Set(["tank", "dealer", "healer"]);
const statKeys = ["hp", "attack", "defense", "healing", "attackSpeed"];
const hangulPattern = /[가-힣]/;

function fail(path, message) {
  failures.push(`${path}: ${message}`);
}

function objectAt(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "객체여야 합니다.");
    return null;
  }
  return value;
}

function arrayAt(value, path) {
  if (!Array.isArray(value)) {
    fail(path, "배열이어야 합니다.");
    return [];
  }
  return value;
}

function numberAt(value, path, { positive = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    fail(path, "유한 숫자여야 합니다.");
    return 0;
  }
  if (positive && number <= 0) fail(path, "0보다 커야 합니다.");
  if (!positive && number < 0) fail(path, "0 이상이어야 합니다.");
  return number;
}

function helpAt(source, path, keys) {
  const help = objectAt(source?.help, `${path}.help`);
  if (!help) return;
  for (const key of keys) {
    if (typeof help[key] !== "string" || !hangulPattern.test(help[key])) {
      fail(`${path}.help.${key}`, "한글 도움말이 필요합니다.");
    }
  }
}

objectAt(combat, "expedition_combat_balance.json");
helpAt(combat, "expedition_combat_balance.json", ["version", "timing", "roleLabels", "roleHelp", "promotionMultipliers", "careerStats", "enemyStats"]);

const timing = objectAt(combat.timing, "timing");
if (timing) {
  helpAt(timing, "timing", ["normalSeconds", "midBossSeconds", "chapterBossSeconds", "offlineCapHours", "onlineTickMs", "maxBattlesPerResolution"]);
  for (const key of ["normalSeconds", "midBossSeconds", "chapterBossSeconds", "offlineCapHours", "onlineTickMs", "maxBattlesPerResolution"]) {
    numberAt(timing[key], `timing.${key}`, { positive: true });
  }
  if (!Number.isInteger(Number(timing.maxBattlesPerResolution))) {
    fail("timing.maxBattlesPerResolution", "정수여야 합니다.");
  }
  if (Number(timing.maxBattlesPerResolution) > 480) {
    fail("timing.maxBattlesPerResolution", "오프라인 폭주 방지를 위해 480전투 이하여야 합니다.");
  }
}

for (const role of roleIds) {
  if (typeof combat.roleLabels?.[role] !== "string" || !hangulPattern.test(combat.roleLabels[role])) fail(`roleLabels.${role}`, "한글 역할명이 필요합니다.");
  if (typeof combat.roleHelp?.[role] !== "string" || !hangulPattern.test(combat.roleHelp[role])) fail(`roleHelp.${role}`, "한글 역할 설명이 필요합니다.");
}

for (const promotion of promotions) {
  numberAt(combat.promotionMultipliers?.[promotion.id], `promotionMultipliers.${promotion.id}`, { positive: true });
}

const careerStats = objectAt(combat.careerStats, "careerStats") || {};
const careerIds = new Set(careers.map((career) => career.id));
for (const id of Object.keys(careerStats)) {
  if (!careerIds.has(id)) fail(`careerStats.${id}`, "careers.json에 없는 직업입니다.");
}
for (const career of careers) {
  const entry = objectAt(careerStats[career.id], `careerStats.${career.id}`);
  if (!entry) continue;
  helpAt(entry, `careerStats.${career.id}`, ["role", "hp", "attack", "defense", "healing", "attackSpeed", "levelGrowth"]);
  if (!roleIds.has(entry.role)) fail(`careerStats.${career.id}.role`, `지원하지 않는 역할입니다: ${entry.role}`);
  for (const key of statKeys) numberAt(entry[key], `careerStats.${career.id}.${key}`, { positive: key !== "defense" && key !== "healing" });
  const growth = objectAt(entry.levelGrowth, `careerStats.${career.id}.levelGrowth`);
  if (growth) for (const key of statKeys) numberAt(growth[key], `careerStats.${career.id}.levelGrowth.${key}`);
}

const segments = objectAt(combat.enemyStats?.segments, "enemyStats.segments") || {};
const bossStats = objectAt(combat.enemyStats?.bosses, "enemyStats.bosses") || {};
for (const stage of stages) {
  const entry = objectAt(segments[stage.id], `enemyStats.segments.${stage.id}`);
  if (!entry) continue;
  helpAt(entry, `enemyStats.segments.${stage.id}`, ["enemies", "hp", "attack", "defense", "attackSpeed"]);
  const enemies = arrayAt(entry.enemies, `enemyStats.segments.${stage.id}.enemies`);
  const expectedCount = Array.isArray(stage.normalEnemyNames) && stage.normalEnemyNames.length > 0 ? stage.normalEnemyNames.length : 1;
  if (enemies.length !== expectedCount) fail(`enemyStats.segments.${stage.id}.enemies`, `화면 몬스터 수와 같아야 합니다: ${enemies.length} !== ${expectedCount}`);
  validateEnemies(enemies, `enemyStats.segments.${stage.id}.enemies`);
}
for (const boss of bosses) {
  const entry = objectAt(bossStats[boss.id], `enemyStats.bosses.${boss.id}`);
  if (!entry) continue;
  helpAt(entry, `enemyStats.bosses.${boss.id}`, ["enemies", "hp", "attack", "defense", "attackSpeed"]);
  const enemies = arrayAt(entry.enemies, `enemyStats.bosses.${boss.id}.enemies`);
  if (enemies.length !== 1) fail(`enemyStats.bosses.${boss.id}.enemies`, "보스 Stage는 적 1명이어야 합니다.");
  validateEnemies(enemies, `enemyStats.bosses.${boss.id}.enemies`);
}

function validateEnemies(enemies, path) {
  enemies.forEach((enemy, index) => {
    const item = objectAt(enemy, `${path}[${index}]`);
    if (!item) return;
    if (typeof item.id !== "string" || item.id.length === 0) fail(`${path}[${index}].id`, "id가 필요합니다.");
    if (typeof item.name !== "string" || item.name.length === 0) fail(`${path}[${index}].name`, "name이 필요합니다.");
    numberAt(item.hp, `${path}[${index}].hp`, { positive: true });
    numberAt(item.attack, `${path}[${index}].attack`, { positive: true });
    numberAt(item.defense, `${path}[${index}].defense`);
    numberAt(item.attackSpeed, `${path}[${index}].attackSpeed`, { positive: true });
  });
}

if (Object.keys(segments).length !== stages.length) fail("enemyStats.segments", `세그먼트 수가 맞지 않습니다: ${Object.keys(segments).length} !== ${stages.length}`);
if (Object.keys(bossStats).length !== bosses.length) fail("enemyStats.bosses", `보스 수가 맞지 않습니다: ${Object.keys(bossStats).length} !== ${bosses.length}`);

if (failures.length > 0) {
  console.error(`EXPEDITION_COMBAT_BALANCE_INVALID failures=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`EXPEDITION_COMBAT_BALANCE_OK careers=${careers.length} segments=${stages.length} bosses=${bosses.length}`);
