import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, path) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${path} 데이터가 객체가 아닙니다.`);
}

function assertArray(value, path) {
  assert(Array.isArray(value), `${path} 데이터가 배열이 아닙니다.`);
}

function assertString(value, path) {
  assert(typeof value === "string" && value.length > 0, `${path} 값이 문자열이 아닙니다.`);
}

function number(value, path) {
  const numeric = Number(value);
  assert(Number.isFinite(numeric), `${path} 값이 숫자가 아닙니다.`);
  return numeric;
}

function integerAtLeast(value, path, min) {
  const numeric = number(value, path);
  assert(Number.isInteger(numeric), `${path} 값은 정수여야 합니다.`);
  assert(numeric >= min, `${path} 값은 ${min} 이상이어야 합니다.`);
  return numeric;
}

function positiveNumber(value, path) {
  const numeric = number(value, path);
  assert(numeric > 0, `${path} 값은 0보다 커야 합니다.`);
  return numeric;
}

function help(source, path, keys) {
  assertObject(source.help, `${path}.help`);
  for (const key of keys) assertString(source.help[key], `${path}.help.${key}`);
}

function uniqueId(source, ids, path) {
  assertString(source.id, `${path}.id`);
  assert(!ids.has(source.id), `${path}.id 값이 중복되었습니다: ${source.id}`);
  ids.add(source.id);
}

const catalog = readJson("data/real_estates.json");
const tiers = readJson("data/real_estate_scale_tiers.json");
const balance = readJson("data/real_estate_balance.json");
const rankRewards = readJson("data/real_estate_rank_rewards.json");

assertObject(catalog, "real_estates.json");
integerAtLeast(catalog.version, "real_estates.json.version", 1);
assertArray(catalog.properties, "real_estates.json.properties");
assert(catalog.properties.length === 10, `부동산 매물은 10종이어야 합니다: ${catalog.properties.length}`);
help(catalog, "real_estates.json", ["version", "properties"]);

const propertyIds = new Set();
for (const [index, property] of catalog.properties.entries()) {
  const path = `real_estates.json.properties[${index}]`;
  assertObject(property, path);
  uniqueId(property, propertyIds, path);
  assertString(property.name, `${path}.name`);
  assertString(property.description, `${path}.description`);
  integerAtLeast(property.unlockStage, `${path}.unlockStage`, 1);
  positiveNumber(property.basePrice, `${path}.basePrice`);
  assert(positiveNumber(property.priceGrowth, `${path}.priceGrowth`) > 1, `${path}.priceGrowth 값은 1보다 커야 합니다.`);
  positiveNumber(property.baseIncomePerMinute, `${path}.baseIncomePerMinute`);
  positiveNumber(property.assetValue, `${path}.assetValue`);
  assert(positiveNumber(property.assetValueGrowth, `${path}.assetValueGrowth`) > 1, `${path}.assetValueGrowth 값은 1보다 커야 합니다.`);
  assert(["early", "mid", "late"].includes(property.artStage), `${path}.artStage 값이 올바르지 않습니다: ${property.artStage}`);
  help(property, path, ["unlockStage", "basePrice", "priceGrowth", "baseIncomePerMinute", "assetValue", "assetValueGrowth", "artStage"]);
}

assertObject(tiers, "real_estate_scale_tiers.json");
integerAtLeast(tiers.version, "real_estate_scale_tiers.json.version", 1);
assertArray(tiers.tiers, "real_estate_scale_tiers.json.tiers");
assert(tiers.tiers.length === 6, `부동산 규모 티어는 6종이어야 합니다: ${tiers.tiers.length}`);
help(tiers, "real_estate_scale_tiers.json", ["version", "tiers"]);
const tierIds = new Set();
let lastTierMin = 0;
for (const [index, tier] of tiers.tiers.entries()) {
  const path = `real_estate_scale_tiers.json.tiers[${index}]`;
  assertObject(tier, path);
  uniqueId(tier, tierIds, path);
  const minCount = integerAtLeast(tier.minCount, `${path}.minCount`, 1);
  assert(minCount > lastTierMin, `${path}.minCount 값은 이전 티어보다 커야 합니다.`);
  lastTierMin = minCount;
  assertString(tier.label, `${path}.label`);
  assertString(tier.portfolioLabel, `${path}.portfolioLabel`);
  help(tier, path, ["minCount", "label", "portfolioLabel"]);
}

assertObject(balance, "real_estate_balance.json");
integerAtLeast(balance.version, "real_estate_balance.json.version", 1);
assertObject(balance.currency, "real_estate_balance.json.currency");
assertString(balance.currency.id, "real_estate_balance.json.currency.id");
assertString(balance.currency.name, "real_estate_balance.json.currency.name");
assertString(balance.currency.unit, "real_estate_balance.json.currency.unit");
help(balance.currency, "real_estate_balance.json.currency", ["id", "name", "unit"]);
assertObject(balance.rent, "real_estate_balance.json.rent");
positiveNumber(balance.rent.tickMs, "real_estate_balance.json.rent.tickMs");
positiveNumber(balance.rent.offlineCapHours, "real_estate_balance.json.rent.offlineCapHours");
help(balance.rent, "real_estate_balance.json.rent", ["tickMs", "offlineCapHours"]);
assertObject(balance.expeditionRewards, "real_estate_balance.json.expeditionRewards");
for (const key of ["stageBaseCash", "stageGrowthRate", "midBossMultiplier", "chapterBossMultiplier", "idleBaseCashPerHour", "idleStageFactor", "idleCapHours"]) {
  positiveNumber(balance.expeditionRewards[key], `real_estate_balance.json.expeditionRewards.${key}`);
}
assert(Number(balance.expeditionRewards.stageGrowthRate) > 1, "stageGrowthRate 값은 1보다 커야 합니다.");
help(balance.expeditionRewards, "real_estate_balance.json.expeditionRewards", ["stageBaseCash", "stageGrowthRate", "midBossMultiplier", "chapterBossMultiplier", "idleBaseCashPerHour", "idleStageFactor", "idleCapHours"]);
assertObject(balance.ranking, "real_estate_balance.json.ranking");
integerAtLeast(balance.ranking.population, "real_estate_balance.json.ranking.population", 1);
assert(number(balance.ranking.cashAssetWeight, "real_estate_balance.json.ranking.cashAssetWeight") >= 0, "cashAssetWeight 값은 0 이상이어야 합니다.");
positiveNumber(balance.ranking.previewPower, "real_estate_balance.json.ranking.previewPower");
positiveNumber(balance.ranking.previewScale, "real_estate_balance.json.ranking.previewScale");
integerAtLeast(balance.ranking.minimumWeeklyAssetGainForClaim, "real_estate_balance.json.ranking.minimumWeeklyAssetGainForClaim", 0);
help(balance.ranking, "real_estate_balance.json.ranking", ["population", "cashAssetWeight", "previewPower", "previewScale", "minimumWeeklyAssetGainForClaim"]);
assertArray(balance.artStages, "real_estate_balance.json.artStages");
const artIds = new Set();
let lastAssetValue = -1;
for (const [index, stage] of balance.artStages.entries()) {
  const path = `real_estate_balance.json.artStages[${index}]`;
  assertObject(stage, path);
  uniqueId(stage, artIds, path);
  const minAssetValue = integerAtLeast(stage.minAssetValue, `${path}.minAssetValue`, 0);
  assert(minAssetValue > lastAssetValue, `${path}.minAssetValue 값은 이전 단계보다 커야 합니다.`);
  lastAssetValue = minAssetValue;
  assertString(stage.asset, `${path}.asset`);
  assertString(stage.label, `${path}.label`);
  help(stage, path, ["minAssetValue", "asset", "label"]);
}
help(balance, "real_estate_balance.json", ["version", "currency", "rent", "expeditionRewards", "ranking", "artStages"]);

assertObject(rankRewards, "real_estate_rank_rewards.json");
integerAtLeast(rankRewards.version, "real_estate_rank_rewards.json.version", 1);
assertArray(rankRewards.rewards, "real_estate_rank_rewards.json.rewards");
help(rankRewards, "real_estate_rank_rewards.json", ["version", "rewards"]);
const rewardIds = new Set();
for (const [index, reward] of rankRewards.rewards.entries()) {
  const path = `real_estate_rank_rewards.json.rewards[${index}]`;
  assertObject(reward, path);
  uniqueId(reward, rewardIds, path);
  assertString(reward.label, `${path}.label`);
  integerAtLeast(reward.diamonds, `${path}.diamonds`, 0);
  const hasRankMax = Object.prototype.hasOwnProperty.call(reward, "rankMax");
  const hasPercentileMax = Object.prototype.hasOwnProperty.call(reward, "percentileMax");
  assert(!(hasRankMax && hasPercentileMax), `${path}에는 rankMax와 percentileMax를 동시에 둘 수 없습니다.`);
  if (hasRankMax) {
    integerAtLeast(reward.rankMax, `${path}.rankMax`, 1);
    help(reward, path, ["rankMax", "diamonds"]);
  } else if (hasPercentileMax) {
    const percentile = positiveNumber(reward.percentileMax, `${path}.percentileMax`);
    assert(percentile <= 1, `${path}.percentileMax 값은 1 이하여야 합니다.`);
    help(reward, path, ["percentileMax", "diamonds"]);
  } else {
    help(reward, path, ["diamonds"]);
  }
}

console.log(`부동산 데이터 검증 완료: 매물 ${catalog.properties.length}종, 규모 ${tiers.tiers.length}종, 랭킹 보상 ${rankRewards.rewards.length}종`);
