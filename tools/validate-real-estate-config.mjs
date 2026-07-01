import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT = 10;

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

function assertNoMojibake(value, path) {
  assert(!/�|\?{2,}/.test(value), `${path} 값에 인코딩이 깨진 문자가 있습니다(연속된 ? 또는 �). UTF-8 한글로 다시 작성하세요.`);
}

function help(source, path, keys) {
  assertObject(source.help, `${path}.help`);
  for (const key of keys) {
    assertString(source.help[key], `${path}.help.${key}`);
    assertNoMojibake(source.help[key], `${path}.help.${key}`);
  }
}

function uniqueId(source, ids, path) {
  assertString(source.id, `${path}.id`);
  assert(!ids.has(source.id), `${path}.id 값이 중복되었습니다: ${source.id}`);
  ids.add(source.id);
}

const catalog = readJson("data/real_estates.json");
const buildingAssets = readJson("data/real_estate_building_assets.json");
const cityLayout = readJson("data/real_estate_city_layout.json");
const districtAssets = readJson("data/real_estate_district_assets.json");
const districtGrowthAssets = readJson("data/real_estate_district_growth_assets.json");
const tiers = readJson("data/real_estate_scale_tiers.json");
const balance = readJson("data/real_estate_balance.json");
const rankRewards = readJson("data/real_estate_rank_rewards.json");

const minBuildingSlotCount = 16;

const districtAssetThemes = new Set([
  "starter_lowrise",
  "residential_lowrise",
  "villa_green",
  "mixed_midrise",
  "local_commercial",
  "compact_commercial",
  "apartment_single",
  "apartment_complex",
  "office_core",
  "landmark_mixed",
]);

const districtAssetPadVariants = new Set([
  "lowrise_roof",
  "rental_block",
  "villa_block",
  "garden_villa",
  "officetel_block",
  "midrise_glass",
  "shopfront",
  "market_row",
  "compact_building",
  "apartment_slab",
  "tower_podium",
  "complex_tower",
  "office_tower",
  "glass_podium",
  "mixed_podium",
  "landmark_tower",
]);

const districtAssetPathDepths = new Set(["near", "mid", "far"]);
const districtAssetShadows = new Set(["soft_ground"]);

function coordinatePair(pair, path) {
  assertArray(pair, path);
  assert(pair.length === 2, `${path} 좌표는 [x, y] 2개 값이어야 합니다.`);
  const x = number(pair[0], `${path}[0]`);
  const y = number(pair[1], `${path}[1]`);
  assert(x >= 0 && x <= 100, `${path}[0] 값은 0~100 사이여야 합니다.`);
  assert(y >= 0 && y <= 100, `${path}[1] 값은 0~100 사이여야 합니다.`);
}

function coordinateList(list, path, minLength) {
  assertArray(list, path);
  assert(list.length >= minLength, `${path} 좌표는 ${minLength}개 이상이어야 합니다.`);
  for (const [index, pair] of list.entries()) coordinatePair(pair, `${path}[${index}]`);
}

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

assertObject(cityLayout, "real_estate_city_layout.json");
integerAtLeast(cityLayout.version, "real_estate_city_layout.json.version", 1);
assertArray(cityLayout.districts, "real_estate_city_layout.json.districts");
assert(cityLayout.districts.length === catalog.properties.length, `도시 지역 수는 매물 수와 같아야 합니다: ${cityLayout.districts.length}`);
help(cityLayout, "real_estate_city_layout.json", ["version", "districts"]);
const districtIds = new Set();
for (const [index, district] of cityLayout.districts.entries()) {
  const path = `real_estate_city_layout.json.districts[${index}]`;
  assertObject(district, path);
  uniqueId(district, districtIds, path);
  assert(district.id === catalog.properties[index].id, `${path}.id 순서가 real_estates.json과 다릅니다: ${district.id} !== ${catalog.properties[index].id}`);
  coordinateList(district.polygon, `${path}.polygon`, 4);
  coordinatePair(district.labelAnchor, `${path}.labelAnchor`);
  coordinatePair(district.detailFocus, `${path}.detailFocus`);
  coordinateList(district.buildingSlots, `${path}.buildingSlots`, minBuildingSlotCount);
  help(district, path, ["id", "polygon", "labelAnchor", "detailFocus", "buildingSlots"]);
}

function percentageNumber(value, path) {
  const numeric = number(value, path);
  assert(numeric >= 0 && numeric <= 100, `${path} 값은 0~100 사이여야 합니다.`);
  return numeric;
}

function validateDetailPad(pad, index, districtPath, districtId, districtTheme, buildingAssetById) {
  const path = `${districtPath}.detailPads[${index}]`;
  assertObject(pad, path);
  uniqueId(pad, validateDetailPad.ids, path);
  percentageNumber(pad.x, `${path}.x`);
  percentageNumber(pad.y, `${path}.y`);
  positiveNumber(pad.scale, `${path}.scale`);
  positiveNumber(pad.width, `${path}.width`);
  positiveNumber(pad.height, `${path}.height`);
  integerAtLeast(pad.z, `${path}.z`, 1);
  const rotation = number(pad.rotation, `${path}.rotation`);
  assert(rotation >= -30 && rotation <= 30, `${path}.rotation 값은 -30~30 사이여야 합니다.`);
  assertString(pad.variant, `${path}.variant`);
  assert(districtAssetPadVariants.has(pad.variant), `${path}.variant 값이 올바르지 않습니다: ${pad.variant}`);
  assertString(pad.buildingAsset, `${path}.buildingAsset`);
  const buildingAsset = buildingAssetById.get(pad.buildingAsset);
  assert(buildingAsset, `${path}.buildingAsset 참조를 찾을 수 없습니다: ${pad.buildingAsset}`);
  assert(buildingAsset.districtId === districtId, `${path}.buildingAsset districtId가 지역과 다릅니다: ${buildingAsset.districtId} !== ${districtId}`);
  assert(buildingAsset.theme === districtTheme, `${path}.buildingAsset theme가 지역 theme와 다릅니다: ${buildingAsset.theme} !== ${districtTheme}`);
  assert(buildingAsset.variant === pad.variant, `${path}.buildingAsset variant가 pad variant와 다릅니다: ${buildingAsset.variant} !== ${pad.variant}`);
}

function validateResidentPath(pathData, index, districtPath) {
  const path = `${districtPath}.futureResidentPaths[${index}]`;
  assertObject(pathData, path);
  uniqueId(pathData, validateResidentPath.ids, path);
  assertString(pathData.depth, `${path}.depth`);
  assert(districtAssetPathDepths.has(pathData.depth), `${path}.depth 값이 올바르지 않습니다: ${pathData.depth}`);
  coordinateList(pathData.points, `${path}.points`, 2);
}

assertObject(buildingAssets, "real_estate_building_assets.json");
integerAtLeast(buildingAssets.version, "real_estate_building_assets.json.version", 1);
assertArray(buildingAssets.assets, "real_estate_building_assets.json.assets");
assert(buildingAssets.assets.length >= catalog.properties.length * 6, `건물 PNG 리소스 수가 부족합니다: ${buildingAssets.assets.length}`);
help(buildingAssets, "real_estate_building_assets.json", ["version", "assets"]);
const buildingAssetIds = new Set();
const buildingAssetFiles = new Set();
const buildingAssetById = new Map();
const buildingAssetCountByDistrict = new Map();
const buildingAssetVariantsByDistrict = new Map();
for (const [index, asset] of buildingAssets.assets.entries()) {
  const path = `real_estate_building_assets.json.assets[${index}]`;
  assertObject(asset, path);
  uniqueId(asset, buildingAssetIds, path);
  assertString(asset.file, `${path}.file`);
  assert(asset.file.startsWith("real-estate-buildings/") && asset.file.endsWith(".png"), `${path}.file 값은 real-estate-buildings/*.png 형식이어야 합니다.`);
  assert(!asset.file.includes("..") && !asset.file.includes("\\"), `${path}.file 값이 올바르지 않습니다: ${asset.file}`);
  assert(existsSync(resolve("src/snapshot/assets", asset.file)), `${path}.file 파일이 없습니다: ${asset.file}`);
  assert(!buildingAssetFiles.has(asset.file), `${path}.file 값이 중복되었습니다: ${asset.file}`);
  buildingAssetFiles.add(asset.file);
  assertString(asset.districtId, `${path}.districtId`);
  assert(propertyIds.has(asset.districtId), `${path}.districtId 값이 매물 id와 맞지 않습니다: ${asset.districtId}`);
  assertString(asset.theme, `${path}.theme`);
  assert(districtAssetThemes.has(asset.theme), `${path}.theme 값이 올바르지 않습니다: ${asset.theme}`);
  assertString(asset.variant, `${path}.variant`);
  assert(districtAssetPadVariants.has(asset.variant), `${path}.variant 값이 올바르지 않습니다: ${asset.variant}`);
  buildingAssetCountByDistrict.set(asset.districtId, (buildingAssetCountByDistrict.get(asset.districtId) || 0) + 1);
  if (!buildingAssetVariantsByDistrict.has(asset.districtId)) buildingAssetVariantsByDistrict.set(asset.districtId, new Set());
  buildingAssetVariantsByDistrict.get(asset.districtId).add(asset.variant);
  positiveNumber(asset.displayWidth, `${path}.displayWidth`);
  positiveNumber(asset.displayHeight, `${path}.displayHeight`);
  percentageNumber(asset.anchorX, `${path}.anchorX`);
  percentageNumber(asset.anchorY, `${path}.anchorY`);
  assertString(asset.shadow, `${path}.shadow`);
  assert(districtAssetShadows.has(asset.shadow), `${path}.shadow 값이 올바르지 않습니다: ${asset.shadow}`);
  help(asset, path, ["file", "districtId", "theme", "variant", "displayWidth", "displayHeight", "anchorX", "anchorY", "shadow"]);
  buildingAssetById.set(asset.id, asset);
}
for (const property of catalog.properties) {
  const count = buildingAssetCountByDistrict.get(property.id) || 0;
  const variantCount = buildingAssetVariantsByDistrict.get(property.id)?.size || 0;
  assert(count >= 6, `지역별 건물 PNG 리소스 수가 부족합니다: ${property.id} ${count}`);
  assert(variantCount >= 2, `지역별 건물 variant 수가 부족합니다: ${property.id} ${variantCount}`);
}

assertObject(districtAssets, "real_estate_district_assets.json");
integerAtLeast(districtAssets.version, "real_estate_district_assets.json.version", 1);
assertArray(districtAssets.districts, "real_estate_district_assets.json.districts");
assert(districtAssets.districts.length === catalog.properties.length, `지역 리소스 수는 매물 수와 같아야 합니다: ${districtAssets.districts.length}`);
help(districtAssets, "real_estate_district_assets.json", ["version", "districts"]);
const districtAssetIds = new Set();
const validateDistrictAssetFiles = new Set();
for (const [index, asset] of districtAssets.districts.entries()) {
  const path = `real_estate_district_assets.json.districts[${index}]`;
  assertObject(asset, path);
  uniqueId(asset, districtAssetIds, path);
  assert(asset.id === catalog.properties[index].id, `${path}.id 순서가 real_estates.json과 다릅니다: ${asset.id} !== ${catalog.properties[index].id}`);
  assertString(asset.backgroundAsset, `${path}.backgroundAsset`);
  assert(asset.backgroundAsset.endsWith(".png"), `${path}.backgroundAsset 값은 png 파일명이어야 합니다.`);
  assert(!asset.backgroundAsset.includes("/") && !asset.backgroundAsset.includes("\\"), `${path}.backgroundAsset 값은 파일명만 허용합니다.`);
  assert(existsSync(resolve("src/snapshot/assets", asset.backgroundAsset)), `${path}.backgroundAsset 파일이 없습니다: ${asset.backgroundAsset}`);
  assert(!validateDistrictAssetFiles.has(asset.backgroundAsset), `${path}.backgroundAsset 값이 중복되었습니다: ${asset.backgroundAsset}`);
  validateDistrictAssetFiles.add(asset.backgroundAsset);
  assertString(asset.buildingTheme, `${path}.buildingTheme`);
  assert(districtAssetThemes.has(asset.buildingTheme), `${path}.buildingTheme 값이 올바르지 않습니다: ${asset.buildingTheme}`);
  assertString(asset.speechTone, `${path}.speechTone`);
  assertArray(asset.detailPads, `${path}.detailPads`);
  const expectedSlotCount = cityLayout.districts[index].buildingSlots.length;
  assert(expectedSlotCount >= minBuildingSlotCount, `${path}.detailPads 기준 도시 슬롯 수가 부족합니다: ${expectedSlotCount}`);
  assert(asset.detailPads.length === expectedSlotCount, `${path}.detailPads 수는 도시 buildingSlots 수와 같아야 합니다: ${asset.detailPads.length} !== ${expectedSlotCount}`);
  validateDetailPad.ids = new Set();
  for (const [padIndex, pad] of asset.detailPads.entries()) validateDetailPad(pad, padIndex, path, asset.id, asset.buildingTheme, buildingAssetById);
  assertArray(asset.futureResidentPaths, `${path}.futureResidentPaths`);
  assert(asset.futureResidentPaths.length >= 3, `${path}.futureResidentPaths 수는 3개 이상이어야 합니다.`);
  validateResidentPath.ids = new Set();
  for (const [pathIndex, pathData] of asset.futureResidentPaths.entries()) validateResidentPath(pathData, pathIndex, path);
  help(asset, path, ["backgroundAsset", "buildingTheme", "detailPads", "futureResidentPaths", "speechTone", "buildingAsset", "rotation"]);
}

assertObject(districtGrowthAssets, "real_estate_district_growth_assets.json");
integerAtLeast(districtGrowthAssets.version, "real_estate_district_growth_assets.json.version", 2);
positiveNumber(districtGrowthAssets.outputScale, "real_estate_district_growth_assets.json.outputScale");
assertArray(districtGrowthAssets.districts, "real_estate_district_growth_assets.json.districts");
assert(districtGrowthAssets.districts.length === catalog.properties.length, `real_estate_district_growth_assets.json.districts 수는 매물 수와 같아야 합니다: ${districtGrowthAssets.districts.length}`);
help(districtGrowthAssets, "real_estate_district_growth_assets.json", ["version", "outputScale", "districts"]);
const districtGrowthIds = new Set();
const availableDistrictGrowthFiles = new Set(readdirSync(resolve("src/snapshot/assets/real-estate-district-growth"))
  .filter((file) => file.endsWith(".png"))
  .map((file) => `real-estate-district-growth/${file}`));
const linkedDistrictGrowthFiles = new Set();
for (const [index, asset] of districtGrowthAssets.districts.entries()) {
  const path = `real_estate_district_growth_assets.json.districts[${index}]`;
  assertObject(asset, path);
  uniqueId(asset, districtGrowthIds, path);
  assert(asset.id === catalog.properties[index].id, `${path}.id 순서가 real_estates.json과 다릅니다: ${asset.id} !== ${catalog.properties[index].id}`);
  assertString(asset.sourceBackground, `${path}.sourceBackground`);
  assert(existsSync(resolve("src/snapshot/assets", asset.sourceBackground)), `${path}.sourceBackground 파일이 없습니다: ${asset.sourceBackground}`);
  positiveNumber(asset.width, `${path}.width`);
  positiveNumber(asset.height, `${path}.height`);
  const maxOwnedCount = integerAtLeast(asset.maxOwnedCount, `${path}.maxOwnedCount`, 1);
  assertObject(asset.unlock, `${path}.unlock`);
  assertString(asset.unlock.type, `${path}.unlock.type`);
  if (index === 0) {
    assert(asset.unlock.type === "expeditionStage", `${path}.unlock.type 첫 부동산은 expeditionStage여야 합니다.`);
    integerAtLeast(asset.unlock.stage, `${path}.unlock.stage`, 1);
    help(asset.unlock, `${path}.unlock`, ["type", "stage"]);
  } else {
    assert(asset.unlock.type === "previousMaxOwned", `${path}.unlock.type 두 번째 이후 부동산은 previousMaxOwned여야 합니다.`);
    assertString(asset.unlock.previousDistrictId, `${path}.unlock.previousDistrictId`);
    assert(asset.unlock.previousDistrictId === catalog.properties[index - 1].id, `${path}.unlock.previousDistrictId 값이 직전 매물과 다릅니다: ${asset.unlock.previousDistrictId} !== ${catalog.properties[index - 1].id}`);
    help(asset.unlock, `${path}.unlock`, ["type", "previousDistrictId"]);
  }
  assertArray(asset.stages, `${path}.stages`);
  assert(asset.stages.length === REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT, `${path}.stages는 ${REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT}개여야 합니다: ${asset.stages.length}`);
  const stageFiles = new Set();
  let baseStageFile = null;
  let lastMinOwnedCount = -1;
  for (const [stageIndex, stage] of asset.stages.entries()) {
    const stagePath = `${path}.stages[${stageIndex}]`;
    assertObject(stage, stagePath);
    const growthStage = integerAtLeast(stage.growthStage, `${stagePath}.growthStage`, 0);
    assert(growthStage === stageIndex, `${stagePath}.growthStage 값은 stages 배열 순서와 같아야 합니다: ${growthStage} !== ${stageIndex}`);
    const minOwnedCount = integerAtLeast(stage.minOwnedCount, `${stagePath}.minOwnedCount`, 0);
    assert(minOwnedCount > lastMinOwnedCount, `${stagePath}.minOwnedCount 값은 이전 단계보다 커야 합니다.`);
    assert(minOwnedCount <= maxOwnedCount, `${stagePath}.minOwnedCount 값이 maxOwnedCount를 넘었습니다: ${minOwnedCount} > ${maxOwnedCount}`);
    if (stageIndex === 0) assert(minOwnedCount === 0, `${stagePath}.minOwnedCount 첫 단계는 0이어야 합니다.`);
    lastMinOwnedCount = minOwnedCount;
    assertString(stage.file, `${stagePath}.file`);
    assert(stage.file.startsWith("real-estate-district-growth/") && stage.file.endsWith(".png"), `${stagePath}.file 값은 real-estate-district-growth/*.png 형식이어야 합니다.`);
    assert(!stage.file.includes("..") && !stage.file.includes("\\"), `${stagePath}.file 값이 올바르지 않습니다: ${stage.file}`);
    if (stageIndex === 0) baseStageFile = stage.file;
    if (stageIndex === 1) {
      assert(minOwnedCount === 1, `${stagePath}.minOwnedCount 첫 구매 단계는 1이어야 합니다.`);
      assert(stage.file !== baseStageFile, `${stagePath}.file 첫 구매 단계는 0단계와 다른 PNG여야 합니다: ${stage.file}`);
    }
    stageFiles.add(stage.file);
    assert(existsSync(resolve("src/snapshot/assets", stage.file)), `${stagePath}.file 파일이 없습니다: ${stage.file}`);
    linkedDistrictGrowthFiles.add(stage.file);
    help(stage, stagePath, ["growthStage", "minOwnedCount", "file"]);
  }
  const districtGrowthPrefix = `real-estate-district-growth/${asset.id.replaceAll("_", "-")}-growth-`;
  const unlinkedDistrictFiles = Array.from(availableDistrictGrowthFiles)
    .filter((file) => file.startsWith(districtGrowthPrefix) && !stageFiles.has(file))
    .sort();
  assert(unlinkedDistrictFiles.length === 0, `${path}.stages에 연결되지 않은 성장 PNG가 있습니다: ${unlinkedDistrictFiles.join(", ")}`);
  help(asset, path, ["id", "sourceBackground", "width", "height", "maxOwnedCount", "unlock", "stages"]);
}
const unlinkedGrowthFiles = Array.from(availableDistrictGrowthFiles)
  .filter((file) => !linkedDistrictGrowthFiles.has(file))
  .sort();
assert(unlinkedGrowthFiles.length === 0, `real-estate-district-growth 폴더에 데이터와 연결되지 않은 PNG가 있습니다: ${unlinkedGrowthFiles.join(", ")}`);

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

console.log(`부동산 데이터 검증 완료: 매물 ${catalog.properties.length}종, 도시 지역 ${cityLayout.districts.length}종, 상세 리소스 ${districtAssets.districts.length}종, baked 성장 리소스 ${districtGrowthAssets.districts.length}종, 건물 PNG ${buildingAssets.assets.length}종, 규모 ${tiers.tiers.length}종, 랭킹 보상 ${rankRewards.rewards.length}종`);
