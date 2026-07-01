import realEstateBalance from "../../../data/real_estate_balance.json";
import realEstateBuildingAssets from "../../../data/real_estate_building_assets.json";
import realEstateCityLayout from "../../../data/real_estate_city_layout.json";
import realEstateDistrictAssets from "../../../data/real_estate_district_assets.json";
import realEstateDistrictGrowthAssets from "../../../data/real_estate_district_growth_assets.json";
import realEstateRankRewards from "../../../data/real_estate_rank_rewards.json";
import realEstateScaleTiers from "../../../data/real_estate_scale_tiers.json";
import realEstates from "../../../data/real_estates.json";

const MIN_REAL_ESTATE_BUILDING_SLOT_COUNT = 16;
const REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT = 10;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function assertObject(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} 데이터가 객체가 아닙니다.`);
}

function assertArray(source, path) {
  assert(Array.isArray(source), `${path} 데이터가 배열이 아닙니다.`);
}

function assertString(value, path) {
  assert(typeof value === "string" && value.length > 0, `${path} 값이 문자열이 아닙니다.`);
}

function finiteNumber(value, path) {
  const number = Number(value);
  assert(Number.isFinite(number), `${path} 값이 숫자가 아닙니다.`);
  return number;
}

function positiveNumber(value, path) {
  const number = finiteNumber(value, path);
  assert(number > 0, `${path} 값은 0보다 커야 합니다.`);
  return number;
}

function nonNegativeNumber(value, path) {
  const number = finiteNumber(value, path);
  assert(number >= 0, `${path} 값은 0 이상이어야 합니다.`);
  return number;
}

function integerAtLeast(value, path, min) {
  const number = finiteNumber(value, path);
  assert(Number.isInteger(number), `${path} 값은 정수여야 합니다.`);
  assert(number >= min, `${path} 값은 ${min} 이상이어야 합니다.`);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function validateHelp(source, path, keys) {
  assertObject(source.help, `${path}.help`);
  for (const key of keys) {
    assertString(source.help[key], `${path}.help.${key}`);
    assert(!/�|\?{2,}/.test(source.help[key]), `${path}.help.${key} 값에 인코딩이 깨진 문자가 있습니다(연속된 ? 또는 �). UTF-8 한글로 다시 작성하세요.`);
  }
}

function validateProperty(property, index, ids) {
  const path = `real_estates.json.properties[${index}]`;
  assertObject(property, path);
  assertString(property.id, `${path}.id`);
  assert(!ids.has(property.id), `${path}.id 값이 중복되었습니다: ${property.id}`);
  ids.add(property.id);
  assertString(property.name, `${path}.name`);
  assertString(property.description, `${path}.description`);
  integerAtLeast(property.unlockStage, `${path}.unlockStage`, 1);
  positiveNumber(property.basePrice, `${path}.basePrice`);
  assert(positiveNumber(property.priceGrowth, `${path}.priceGrowth`) > 1, `${path}.priceGrowth 값은 1보다 커야 합니다.`);
  positiveNumber(property.baseIncomePerMinute, `${path}.baseIncomePerMinute`);
  positiveNumber(property.assetValue, `${path}.assetValue`);
  assert(positiveNumber(property.assetValueGrowth, `${path}.assetValueGrowth`) > 1, `${path}.assetValueGrowth 값은 1보다 커야 합니다.`);
  assert(["early", "mid", "late"].includes(property.artStage), `${path}.artStage 값이 올바르지 않습니다: ${property.artStage}`);
  validateHelp(property, path, ["unlockStage", "basePrice", "priceGrowth", "baseIncomePerMinute", "assetValue", "assetValueGrowth", "artStage"]);
}

function validateScaleTier(tier, index, ids) {
  const path = `real_estate_scale_tiers.json.tiers[${index}]`;
  assertObject(tier, path);
  assertString(tier.id, `${path}.id`);
  assert(!ids.has(tier.id), `${path}.id 값이 중복되었습니다: ${tier.id}`);
  ids.add(tier.id);
  integerAtLeast(tier.minCount, `${path}.minCount`, 1);
  assertString(tier.label, `${path}.label`);
  assertString(tier.portfolioLabel, `${path}.portfolioLabel`);
  validateHelp(tier, path, ["minCount", "label", "portfolioLabel"]);
}

function validateRankReward(reward, index, ids) {
  const path = `real_estate_rank_rewards.json.rewards[${index}]`;
  assertObject(reward, path);
  assertString(reward.id, `${path}.id`);
  assert(!ids.has(reward.id), `${path}.id 값이 중복되었습니다: ${reward.id}`);
  ids.add(reward.id);
  assertString(reward.label, `${path}.label`);
  integerAtLeast(reward.diamonds, `${path}.diamonds`, 0);
  const hasRank = hasOwn(reward, "rankMax");
  const hasPercentile = hasOwn(reward, "percentileMax");
  if (hasRank) {
    integerAtLeast(reward.rankMax, `${path}.rankMax`, 1);
    validateHelp(reward, path, ["rankMax", "diamonds"]);
  } else if (hasPercentile) {
    const percentile = positiveNumber(reward.percentileMax, `${path}.percentileMax`);
    assert(percentile <= 1, `${path}.percentileMax 값은 1 이하여야 합니다.`);
    validateHelp(reward, path, ["percentileMax", "diamonds"]);
  } else {
    validateHelp(reward, path, ["diamonds"]);
  }
}

function validateArtStage(stage, index, ids) {
  const path = `real_estate_balance.json.artStages[${index}]`;
  assertObject(stage, path);
  assertString(stage.id, `${path}.id`);
  assert(!ids.has(stage.id), `${path}.id 값이 중복되었습니다: ${stage.id}`);
  ids.add(stage.id);
  integerAtLeast(stage.minAssetValue, `${path}.minAssetValue`, 0);
  assertString(stage.asset, `${path}.asset`);
  assertString(stage.label, `${path}.label`);
  validateHelp(stage, path, ["minAssetValue", "asset", "label"]);
}

function validateCoordinatePair(pair, path) {
  assertArray(pair, path);
  assert(pair.length === 2, `${path} 좌표는 [x, y] 2개 값이어야 합니다.`);
  const x = finiteNumber(pair[0], `${path}[0]`);
  const y = finiteNumber(pair[1], `${path}[1]`);
  assert(x >= 0 && x <= 100, `${path}[0] 값은 0~100 사이여야 합니다.`);
  assert(y >= 0 && y <= 100, `${path}[1] 값은 0~100 사이여야 합니다.`);
}

function validateCoordinateList(list, path, minLength) {
  assertArray(list, path);
  assert(list.length >= minLength, `${path} 좌표는 ${minLength}개 이상이어야 합니다.`);
  list.forEach((pair, index) => validateCoordinatePair(pair, `${path}[${index}]`));
}

function validateCityDistrict(district, index, ids, expectedId) {
  const path = `real_estate_city_layout.json.districts[${index}]`;
  assertObject(district, path);
  assertString(district.id, `${path}.id`);
  assert(district.id === expectedId, `${path}.id 순서가 real_estates.json과 다릅니다: ${district.id} !== ${expectedId}`);
  assert(!ids.has(district.id), `${path}.id 값이 중복되었습니다: ${district.id}`);
  ids.add(district.id);
  validateCoordinateList(district.polygon, `${path}.polygon`, 4);
  validateCoordinatePair(district.labelAnchor, `${path}.labelAnchor`);
  validateCoordinatePair(district.detailFocus, `${path}.detailFocus`);
  validateCoordinateList(district.buildingSlots, `${path}.buildingSlots`, MIN_REAL_ESTATE_BUILDING_SLOT_COUNT);
  validateHelp(district, path, ["id", "polygon", "labelAnchor", "detailFocus", "buildingSlots"]);
}

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

function validateBuildingAsset(asset, index, ids) {
  const path = `real_estate_building_assets.json.assets[${index}]`;
  assertObject(asset, path);
  assertString(asset.id, `${path}.id`);
  assert(!ids.has(asset.id), `${path}.id 값이 중복되었습니다: ${asset.id}`);
  ids.add(asset.id);
  assertString(asset.file, `${path}.file`);
  assert(asset.file.startsWith("real-estate-buildings/") && asset.file.endsWith(".png"), `${path}.file 값은 real-estate-buildings/*.png 형식이어야 합니다.`);
  assert(!asset.file.includes("..") && !asset.file.includes("\\"), `${path}.file 값이 올바르지 않습니다: ${asset.file}`);
  assertString(asset.districtId, `${path}.districtId`);
  assertString(asset.theme, `${path}.theme`);
  assert(districtAssetThemes.has(asset.theme), `${path}.theme 값이 올바르지 않습니다: ${asset.theme}`);
  assertString(asset.variant, `${path}.variant`);
  assert(districtAssetPadVariants.has(asset.variant), `${path}.variant 값이 올바르지 않습니다: ${asset.variant}`);
  positiveNumber(asset.displayWidth, `${path}.displayWidth`);
  positiveNumber(asset.displayHeight, `${path}.displayHeight`);
  const anchorX = finiteNumber(asset.anchorX, `${path}.anchorX`);
  const anchorY = finiteNumber(asset.anchorY, `${path}.anchorY`);
  assert(anchorX >= 0 && anchorX <= 100, `${path}.anchorX 값은 0~100 사이여야 합니다.`);
  assert(anchorY >= 0 && anchorY <= 100, `${path}.anchorY 값은 0~100 사이여야 합니다.`);
  assertString(asset.shadow, `${path}.shadow`);
  assert(districtAssetShadows.has(asset.shadow), `${path}.shadow 값이 올바르지 않습니다: ${asset.shadow}`);
  validateHelp(asset, path, ["file", "districtId", "theme", "variant", "displayWidth", "displayHeight", "anchorX", "anchorY", "shadow"]);
}

function validateDistrictDetailPad(pad, index, districtPath, districtId, districtTheme, buildingAssetByIdForValidation) {
  const path = `${districtPath}.detailPads[${index}]`;
  assertObject(pad, path);
  assertString(pad.id, `${path}.id`);
  const x = finiteNumber(pad.x, `${path}.x`);
  const y = finiteNumber(pad.y, `${path}.y`);
  assert(x >= 0 && x <= 100, `${path}.x 값은 0~100 사이여야 합니다.`);
  assert(y >= 0 && y <= 100, `${path}.y 값은 0~100 사이여야 합니다.`);
  positiveNumber(pad.scale, `${path}.scale`);
  positiveNumber(pad.width, `${path}.width`);
  positiveNumber(pad.height, `${path}.height`);
  integerAtLeast(pad.z, `${path}.z`, 1);
  const rotation = finiteNumber(pad.rotation, `${path}.rotation`);
  assert(rotation >= -30 && rotation <= 30, `${path}.rotation 값은 -30~30 사이여야 합니다.`);
  assertString(pad.variant, `${path}.variant`);
  assert(districtAssetPadVariants.has(pad.variant), `${path}.variant 값이 올바르지 않습니다: ${pad.variant}`);
  assertString(pad.buildingAsset, `${path}.buildingAsset`);
  const buildingAsset = buildingAssetByIdForValidation.get(pad.buildingAsset);
  assert(buildingAsset, `${path}.buildingAsset 참조를 찾을 수 없습니다: ${pad.buildingAsset}`);
  assert(buildingAsset.districtId === districtId, `${path}.buildingAsset districtId가 지역과 다릅니다: ${buildingAsset.districtId} !== ${districtId}`);
  assert(buildingAsset.theme === districtTheme, `${path}.buildingAsset theme가 지역 theme와 다릅니다: ${buildingAsset.theme} !== ${districtTheme}`);
  assert(buildingAsset.variant === pad.variant, `${path}.buildingAsset variant가 pad variant와 다릅니다: ${buildingAsset.variant} !== ${pad.variant}`);
}

function validateDistrictResidentPath(pathData, index, districtPath) {
  const path = `${districtPath}.futureResidentPaths[${index}]`;
  assertObject(pathData, path);
  assertString(pathData.id, `${path}.id`);
  assertString(pathData.depth, `${path}.depth`);
  assert(districtAssetPathDepths.has(pathData.depth), `${path}.depth 값이 올바르지 않습니다: ${pathData.depth}`);
  validateCoordinateList(pathData.points, `${path}.points`, 2);
}

function validateDistrictAsset(asset, index, ids, expectedId, expectedSlotCount, buildingAssetByIdForValidation) {
  const path = `real_estate_district_assets.json.districts[${index}]`;
  assertObject(asset, path);
  assertString(asset.id, `${path}.id`);
  assert(asset.id === expectedId, `${path}.id 순서가 real_estates.json과 다릅니다: ${asset.id} !== ${expectedId}`);
  assert(!ids.has(asset.id), `${path}.id 값이 중복되었습니다: ${asset.id}`);
  ids.add(asset.id);
  assertString(asset.backgroundAsset, `${path}.backgroundAsset`);
  assert(asset.backgroundAsset.endsWith(".png"), `${path}.backgroundAsset 값은 png 파일명이어야 합니다.`);
  assert(!asset.backgroundAsset.includes("/") && !asset.backgroundAsset.includes("\\"), `${path}.backgroundAsset 값은 파일명만 허용합니다.`);
  assertString(asset.buildingTheme, `${path}.buildingTheme`);
  assert(districtAssetThemes.has(asset.buildingTheme), `${path}.buildingTheme 값이 올바르지 않습니다: ${asset.buildingTheme}`);
  assertString(asset.speechTone, `${path}.speechTone`);
  assertArray(asset.detailPads, `${path}.detailPads`);
  assert(expectedSlotCount >= MIN_REAL_ESTATE_BUILDING_SLOT_COUNT, `${path}.detailPads 기준 도시 슬롯 수가 부족합니다: ${expectedSlotCount}`);
  assert(asset.detailPads.length === expectedSlotCount, `${path}.detailPads 수는 도시 buildingSlots 수와 같아야 합니다: ${asset.detailPads.length} !== ${expectedSlotCount}`);
  const padIds = new Set();
  asset.detailPads.forEach((pad, padIndex) => {
    validateDistrictDetailPad(pad, padIndex, path, asset.id, asset.buildingTheme, buildingAssetByIdForValidation);
    assert(!padIds.has(pad.id), `${path}.detailPads id 값이 중복되었습니다: ${pad.id}`);
    padIds.add(pad.id);
  });
  assertArray(asset.futureResidentPaths, `${path}.futureResidentPaths`);
  assert(asset.futureResidentPaths.length >= 3, `${path}.futureResidentPaths 수는 3개 이상이어야 합니다.`);
  const residentPathIds = new Set();
  asset.futureResidentPaths.forEach((pathData, pathIndex) => {
    validateDistrictResidentPath(pathData, pathIndex, path);
    assert(!residentPathIds.has(pathData.id), `${path}.futureResidentPaths id 값이 중복되었습니다: ${pathData.id}`);
    residentPathIds.add(pathData.id);
  });
  validateHelp(asset, path, ["backgroundAsset", "buildingTheme", "detailPads", "futureResidentPaths", "speechTone", "buildingAsset", "rotation"]);
}

function validateDistrictGrowthUnlock(unlock, path, index, propertiesForValidation) {
  assertObject(unlock, path);
  assertString(unlock.type, `${path}.type`);
  if (index === 0) {
    assert(unlock.type === "expeditionStage", `${path}.type 첫 부동산은 expeditionStage여야 합니다.`);
    integerAtLeast(unlock.stage, `${path}.stage`, 1);
    validateHelp(unlock, path, ["type", "stage"]);
    return;
  }
  assert(unlock.type === "previousMaxOwned", `${path}.type 두 번째 이후 부동산은 previousMaxOwned여야 합니다.`);
  assertString(unlock.previousDistrictId, `${path}.previousDistrictId`);
  const expectedPreviousId = propertiesForValidation[index - 1].id;
  assert(unlock.previousDistrictId === expectedPreviousId, `${path}.previousDistrictId 값이 직전 매물과 다릅니다: ${unlock.previousDistrictId} !== ${expectedPreviousId}`);
  validateHelp(unlock, path, ["type", "previousDistrictId"]);
}

function validateDistrictGrowthAsset(asset, index, ids, propertiesForValidation) {
  const path = `real_estate_district_growth_assets.json.districts[${index}]`;
  assertObject(asset, path);
  assertString(asset.id, `${path}.id`);
  const expectedId = propertiesForValidation[index].id;
  assert(asset.id === expectedId, `${path}.id 순서가 real_estates.json과 다릅니다: ${asset.id} !== ${expectedId}`);
  assert(!ids.has(asset.id), `${path}.id 값이 중복되었습니다: ${asset.id}`);
  ids.add(asset.id);
  assertString(asset.sourceBackground, `${path}.sourceBackground`);
  positiveNumber(asset.width, `${path}.width`);
  positiveNumber(asset.height, `${path}.height`);
  const maxOwnedCount = integerAtLeast(asset.maxOwnedCount, `${path}.maxOwnedCount`, 1);
  validateDistrictGrowthUnlock(asset.unlock, `${path}.unlock`, index, propertiesForValidation);
  assertArray(asset.stages, `${path}.stages`);
  assert(asset.stages.length === REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT, `${path}.stages는 ${REAL_ESTATE_DISTRICT_GROWTH_STAGE_COUNT}개여야 합니다: ${asset.stages.length}`);
  let baseStageFile = null;
  let lastMinOwnedCount = -1;
  asset.stages.forEach((stage, stageIndex) => {
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
    assert(stage.file.startsWith("real-estate-district-growth/") && stage.file.endsWith(".png"), `${stagePath}.file 값이 올바르지 않습니다: ${stage.file}`);
    if (stageIndex === 0) baseStageFile = stage.file;
    if (stageIndex === 1) {
      assert(minOwnedCount === 1, `${stagePath}.minOwnedCount 첫 구매 단계는 1이어야 합니다.`);
      assert(stage.file !== baseStageFile, `${stagePath}.file 첫 구매 단계는 0단계와 다른 PNG여야 합니다: ${stage.file}`);
    }
    validateHelp(stage, stagePath, ["growthStage", "minOwnedCount", "file"]);
  });
  validateHelp(asset, path, ["id", "sourceBackground", "width", "height", "maxOwnedCount", "unlock", "stages"]);
}

export function validateRealEstateConfig() {
  assertObject(realEstates, "real_estates.json");
  integerAtLeast(realEstates.version, "real_estates.json.version", 1);
  assertArray(realEstates.properties, "real_estates.json.properties");
  assert(realEstates.properties.length === 10, `real_estates.json.properties 수는 10개여야 합니다: ${realEstates.properties.length}`);
  const propertyIds = new Set();
  realEstates.properties.forEach((property, index) => validateProperty(property, index, propertyIds));
  validateHelp(realEstates, "real_estates.json", ["version", "properties"]);

  assertObject(realEstateCityLayout, "real_estate_city_layout.json");
  integerAtLeast(realEstateCityLayout.version, "real_estate_city_layout.json.version", 1);
  assertArray(realEstateCityLayout.districts, "real_estate_city_layout.json.districts");
  assert(realEstateCityLayout.districts.length === realEstates.properties.length, `real_estate_city_layout.json.districts 수는 매물 수와 같아야 합니다: ${realEstateCityLayout.districts.length}`);
  const districtIds = new Set();
  realEstateCityLayout.districts.forEach((district, index) => validateCityDistrict(district, index, districtIds, realEstates.properties[index].id));
  validateHelp(realEstateCityLayout, "real_estate_city_layout.json", ["version", "districts"]);

  assertObject(realEstateBuildingAssets, "real_estate_building_assets.json");
  integerAtLeast(realEstateBuildingAssets.version, "real_estate_building_assets.json.version", 1);
  assertArray(realEstateBuildingAssets.assets, "real_estate_building_assets.json.assets");
  assert(realEstateBuildingAssets.assets.length >= realEstates.properties.length * 6, `real_estate_building_assets.json.assets 수가 부족합니다: ${realEstateBuildingAssets.assets.length}`);
  const buildingAssetIds = new Set();
  realEstateBuildingAssets.assets.forEach((asset, index) => validateBuildingAsset(asset, index, buildingAssetIds));
  const buildingAssetByIdForValidation = new Map(realEstateBuildingAssets.assets.map((asset) => [asset.id, asset]));
  validateHelp(realEstateBuildingAssets, "real_estate_building_assets.json", ["version", "assets"]);

  assertObject(realEstateDistrictAssets, "real_estate_district_assets.json");
  integerAtLeast(realEstateDistrictAssets.version, "real_estate_district_assets.json.version", 1);
  assertArray(realEstateDistrictAssets.districts, "real_estate_district_assets.json.districts");
  assert(realEstateDistrictAssets.districts.length === realEstates.properties.length, `real_estate_district_assets.json.districts 수는 매물 수와 같아야 합니다: ${realEstateDistrictAssets.districts.length}`);
  const districtAssetIds = new Set();
  const districtAssetFiles = new Set();
  realEstateDistrictAssets.districts.forEach((asset, index) => {
    validateDistrictAsset(asset, index, districtAssetIds, realEstates.properties[index].id, realEstateCityLayout.districts[index].buildingSlots.length, buildingAssetByIdForValidation);
    assert(!districtAssetFiles.has(asset.backgroundAsset), `real_estate_district_assets.json.backgroundAsset 값이 중복되었습니다: ${asset.backgroundAsset}`);
    districtAssetFiles.add(asset.backgroundAsset);
  });
  validateHelp(realEstateDistrictAssets, "real_estate_district_assets.json", ["version", "districts"]);

  assertObject(realEstateDistrictGrowthAssets, "real_estate_district_growth_assets.json");
  integerAtLeast(realEstateDistrictGrowthAssets.version, "real_estate_district_growth_assets.json.version", 2);
  positiveNumber(realEstateDistrictGrowthAssets.outputScale, "real_estate_district_growth_assets.json.outputScale");
  assertArray(realEstateDistrictGrowthAssets.districts, "real_estate_district_growth_assets.json.districts");
  assert(realEstateDistrictGrowthAssets.districts.length === realEstates.properties.length, `real_estate_district_growth_assets.json.districts 수는 매물 수와 같아야 합니다: ${realEstateDistrictGrowthAssets.districts.length}`);
  const districtGrowthAssetIds = new Set();
  realEstateDistrictGrowthAssets.districts.forEach((asset, index) => validateDistrictGrowthAsset(asset, index, districtGrowthAssetIds, realEstates.properties));
  validateHelp(realEstateDistrictGrowthAssets, "real_estate_district_growth_assets.json", ["version", "outputScale", "districts"]);

  assertObject(realEstateScaleTiers, "real_estate_scale_tiers.json");
  integerAtLeast(realEstateScaleTiers.version, "real_estate_scale_tiers.json.version", 1);
  assertArray(realEstateScaleTiers.tiers, "real_estate_scale_tiers.json.tiers");
  assert(realEstateScaleTiers.tiers.length === 6, `real_estate_scale_tiers.json.tiers 수는 6개여야 합니다: ${realEstateScaleTiers.tiers.length}`);
  const tierIds = new Set();
  realEstateScaleTiers.tiers.forEach((tier, index) => validateScaleTier(tier, index, tierIds));
  validateHelp(realEstateScaleTiers, "real_estate_scale_tiers.json", ["version", "tiers"]);

  assertObject(realEstateBalance, "real_estate_balance.json");
  integerAtLeast(realEstateBalance.version, "real_estate_balance.json.version", 1);
  assertObject(realEstateBalance.currency, "real_estate_balance.json.currency");
  assertString(realEstateBalance.currency.id, "real_estate_balance.json.currency.id");
  assertString(realEstateBalance.currency.name, "real_estate_balance.json.currency.name");
  assertString(realEstateBalance.currency.unit, "real_estate_balance.json.currency.unit");
  validateHelp(realEstateBalance.currency, "real_estate_balance.json.currency", ["id", "name", "unit"]);
  assertObject(realEstateBalance.rent, "real_estate_balance.json.rent");
  positiveNumber(realEstateBalance.rent.tickMs, "real_estate_balance.json.rent.tickMs");
  positiveNumber(realEstateBalance.rent.offlineCapHours, "real_estate_balance.json.rent.offlineCapHours");
  validateHelp(realEstateBalance.rent, "real_estate_balance.json.rent", ["tickMs", "offlineCapHours"]);
  assertObject(realEstateBalance.expeditionRewards, "real_estate_balance.json.expeditionRewards");
  for (const key of ["stageBaseCash", "stageGrowthRate", "midBossMultiplier", "chapterBossMultiplier", "idleBaseCashPerHour", "idleStageFactor", "idleCapHours"]) {
    positiveNumber(realEstateBalance.expeditionRewards[key], `real_estate_balance.json.expeditionRewards.${key}`);
  }
  assert(Number(realEstateBalance.expeditionRewards.stageGrowthRate) > 1, "real_estate_balance.json.expeditionRewards.stageGrowthRate 값은 1보다 커야 합니다.");
  validateHelp(realEstateBalance.expeditionRewards, "real_estate_balance.json.expeditionRewards", ["stageBaseCash", "stageGrowthRate", "midBossMultiplier", "chapterBossMultiplier", "idleBaseCashPerHour", "idleStageFactor", "idleCapHours"]);
  assertObject(realEstateBalance.ranking, "real_estate_balance.json.ranking");
  integerAtLeast(realEstateBalance.ranking.population, "real_estate_balance.json.ranking.population", 1);
  nonNegativeNumber(realEstateBalance.ranking.cashAssetWeight, "real_estate_balance.json.ranking.cashAssetWeight");
  positiveNumber(realEstateBalance.ranking.previewPower, "real_estate_balance.json.ranking.previewPower");
  positiveNumber(realEstateBalance.ranking.previewScale, "real_estate_balance.json.ranking.previewScale");
  integerAtLeast(realEstateBalance.ranking.minimumWeeklyAssetGainForClaim, "real_estate_balance.json.ranking.minimumWeeklyAssetGainForClaim", 0);
  validateHelp(realEstateBalance.ranking, "real_estate_balance.json.ranking", ["population", "cashAssetWeight", "previewPower", "previewScale", "minimumWeeklyAssetGainForClaim"]);
  assertArray(realEstateBalance.artStages, "real_estate_balance.json.artStages");
  const artIds = new Set();
  realEstateBalance.artStages.forEach((stage, index) => validateArtStage(stage, index, artIds));
  validateHelp(realEstateBalance, "real_estate_balance.json", ["version", "currency", "rent", "expeditionRewards", "ranking", "artStages"]);

  assertObject(realEstateRankRewards, "real_estate_rank_rewards.json");
  integerAtLeast(realEstateRankRewards.version, "real_estate_rank_rewards.json.version", 1);
  assertArray(realEstateRankRewards.rewards, "real_estate_rank_rewards.json.rewards");
  const rewardIds = new Set();
  realEstateRankRewards.rewards.forEach((reward, index) => validateRankReward(reward, index, rewardIds));
  validateHelp(realEstateRankRewards, "real_estate_rank_rewards.json", ["version", "rewards"]);
}

validateRealEstateConfig();

const properties = realEstates.properties;
const propertyById = new Map(properties.map((property) => [property.id, property]));
const cityDistricts = realEstateCityLayout.districts;
const cityDistrictById = new Map(cityDistricts.map((district) => [district.id, district]));
const buildingAssets = realEstateBuildingAssets.assets;
const buildingAssetById = new Map(buildingAssets.map((asset) => [asset.id, asset]));
const districtAssets = realEstateDistrictAssets.districts;
const districtAssetById = new Map(districtAssets.map((asset) => [asset.id, asset]));
const districtGrowthAssets = realEstateDistrictGrowthAssets.districts;
const districtGrowthAssetById = new Map(districtGrowthAssets.map((asset) => [asset.id, asset]));
const scaleTiers = realEstateScaleTiers.tiers.slice().sort((a, b) => Number(a.minCount) - Number(b.minCount));
const artStages = realEstateBalance.artStages.slice().sort((a, b) => Number(a.minAssetValue) - Number(b.minAssetValue));

export const realEstateAutoTickMs = Number(realEstateBalance.rent.tickMs);

export function createDefaultRealEstateState(createdAt = Date.now()) {
  const weekStart = weekStartAt(createdAt);
  return {
    cash: 0,
    properties: {},
    rentCarry: 0,
    lastRentAt: createdAt,
    lastExpeditionFundAt: createdAt,
    weeklyAssetGain: 0,
    lastWeeklyResetAt: weekStart,
    claimedWeeklyRewardWeek: null,
    lastAssetValueSnapshot: 0,
  };
}

function validateOwnedProperty(owned, path) {
  assertObject(owned, path);
  integerAtLeast(owned.count, `${path}.count`, 0);
}

export function validateRealEstateState(realEstate, path = "save.realEstate") {
  assertObject(realEstate, path);
  nonNegativeNumber(realEstate.cash, `${path}.cash`);
  assertObject(realEstate.properties, `${path}.properties`);
  for (const [propertyId, owned] of Object.entries(realEstate.properties)) {
    assertString(propertyId, `${path}.properties key`);
    assert(propertyById.has(propertyId), `${path}.properties에 카탈로그에 없는 매물 id가 있습니다: ${propertyId}`);
    validateOwnedProperty(owned, `${path}.properties.${propertyId}`);
  }
  const carry = nonNegativeNumber(realEstate.rentCarry, `${path}.rentCarry`);
  assert(carry < 1, `${path}.rentCarry 값은 1보다 작아야 합니다.`);
  integerAtLeast(realEstate.lastRentAt, `${path}.lastRentAt`, 0);
  integerAtLeast(realEstate.lastExpeditionFundAt, `${path}.lastExpeditionFundAt`, 0);
  nonNegativeNumber(realEstate.weeklyAssetGain, `${path}.weeklyAssetGain`);
  integerAtLeast(realEstate.lastWeeklyResetAt, `${path}.lastWeeklyResetAt`, 0);
  assert(realEstate.claimedWeeklyRewardWeek === null || typeof realEstate.claimedWeeklyRewardWeek === "string", `${path}.claimedWeeklyRewardWeek 값이 올바르지 않습니다.`);
  nonNegativeNumber(realEstate.lastAssetValueSnapshot, `${path}.lastAssetValueSnapshot`);
}

export function normalizeRealEstateState(realEstate) {
  validateRealEstateState(realEstate);
  const ownedProperties = {};
  for (const [propertyId, owned] of Object.entries(realEstate.properties)) {
    const count = Math.floor(Number(owned.count));
    if (count > 0) ownedProperties[propertyId] = { count };
  }
  return {
    cash: Math.max(0, Number(realEstate.cash)),
    properties: ownedProperties,
    rentCarry: Number(realEstate.rentCarry),
    lastRentAt: Math.floor(Number(realEstate.lastRentAt)),
    lastExpeditionFundAt: Math.floor(Number(realEstate.lastExpeditionFundAt)),
    weeklyAssetGain: Math.max(0, Number(realEstate.weeklyAssetGain)),
    lastWeeklyResetAt: Math.floor(Number(realEstate.lastWeeklyResetAt)),
    claimedWeeklyRewardWeek: realEstate.claimedWeeklyRewardWeek,
    lastAssetValueSnapshot: Math.max(0, Number(realEstate.lastAssetValueSnapshot)),
  };
}

function propertyForId(propertyId) {
  const property = propertyById.get(propertyId);
  assert(property, `real_estates.json에서 매물을 찾을 수 없습니다: ${propertyId}`);
  return property;
}

function ownedCount(realEstate, propertyId) {
  const owned = realEstate.properties[propertyId];
  return owned ? Math.floor(Number(owned.count)) : 0;
}

function districtGrowthAssetForId(propertyId) {
  const asset = districtGrowthAssetById.get(propertyId);
  assert(asset, `real_estate_district_growth_assets.json에서 성장 테이블을 찾을 수 없습니다: ${propertyId}`);
  return asset;
}

function maxOwnedCountForPropertyId(propertyId) {
  return Number(districtGrowthAssetForId(propertyId).maxOwnedCount);
}

function effectiveGrowthCount(propertyId, count) {
  return Math.max(0, Math.min(Math.floor(Number(count)), maxOwnedCountForPropertyId(propertyId)));
}

function realEstateUnlockInfo(realEstate, propertyId, highestStage) {
  const asset = districtGrowthAssetForId(propertyId);
  const unlock = asset.unlock;
  const count = ownedCount(realEstate, propertyId);
  if (count > 0) {
    return {
      unlocked: true,
      label: "보유 중",
      hint: "이미 보유 중인 부동산입니다.",
    };
  }
  if (unlock.type === "expeditionStage") {
    const stage = Number(unlock.stage);
    return {
      unlocked: highestStage >= stage,
      label: `Stage ${stage}`,
      hint: `원정대 Stage ${stage} 돌파 후 이용할 수 있습니다.`,
    };
  }
  const previousPropertyId = unlock.previousDistrictId;
  const previousProperty = propertyForId(previousPropertyId);
  const previousMaxOwnedCount = maxOwnedCountForPropertyId(previousPropertyId);
  const previousCount = ownedCount(realEstate, previousPropertyId);
  return {
    unlocked: previousCount >= previousMaxOwnedCount,
    label: `${previousProperty.name} 최대 개발`,
    hint: `${previousProperty.name} ${previousMaxOwnedCount}채 최대 개발 후 이용할 수 있습니다.`,
    previousPropertyId,
    previousMaxOwnedCount,
    previousCount,
  };
}

function isRealEstatePropertyUnlocked(state, propertyId) {
  assertObject(state.expedition, "save.expedition");
  const highestStage = integerAtLeast(state.expedition.highestStage, "save.expedition.highestStage", 0);
  return realEstateUnlockInfo(state.realEstate, propertyId, highestStage).unlocked;
}

function nextPurchaseCost(property, owned) {
  const value = Number(property.basePrice) * Number(property.priceGrowth) ** owned;
  assert(Number.isFinite(value), `${property.id} 구매가 계산값이 올바르지 않습니다.`);
  return Math.max(1, Math.floor(value));
}

function purchaseCostForCount(property, currentCount, quantity) {
  const count = integerAtLeast(quantity, `${property.id}.purchaseQuantity`, 1);
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += nextPurchaseCost(property, currentCount + index);
  }
  return Math.floor(total);
}

function maxPurchaseCount(property, currentCount, cash, limit = 10000) {
  let available = Math.max(0, Math.floor(Number(cash)));
  let count = 0;
  const maxCount = Math.max(0, Math.floor(Number(limit)));
  while (count < maxCount) {
    const cost = nextPurchaseCost(property, currentCount + count);
    if (available < cost) break;
    available -= cost;
    count += 1;
  }
  return count;
}

function assetValueForCount(property, count) {
  if (count <= 0) return 0;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Number(property.assetValue) * Number(property.assetValueGrowth) ** index;
  }
  assert(Number.isFinite(total), `${property.id} 자산가치 계산값이 올바르지 않습니다.`);
  return Math.floor(total);
}

function rentPerMinuteForState(realEstate) {
  validateRealEstateState(realEstate);
  return properties.reduce((sum, property) => sum + ownedCount(realEstate, property.id) * Number(property.baseIncomePerMinute), 0);
}

function portfolioAssetValue(realEstate) {
  validateRealEstateState(realEstate);
  return properties.reduce((sum, property) => sum + assetValueForCount(property, ownedCount(realEstate, property.id)), 0);
}

function totalAssetValueForState(realEstate) {
  const cashWeight = Number(realEstateBalance.ranking.cashAssetWeight);
  return portfolioAssetValue(realEstate) + Math.floor(Number(realEstate.cash) * cashWeight);
}

function weekStartAt(time) {
  const date = new Date(Math.max(0, Number(time)));
  const dayOffset = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - dayOffset);
  return date.getTime();
}

function weekKeyAt(time) {
  return String(weekStartAt(time));
}

function syncWeekForState(state, now) {
  validateRealEstateState(state.realEstate);
  const weekStart = weekStartAt(now);
  if (Number(state.realEstate.lastWeeklyResetAt) < weekStart) {
    state.realEstate.weeklyAssetGain = 0;
    state.realEstate.lastWeeklyResetAt = weekStart;
    state.realEstate.claimedWeeklyRewardWeek = null;
    state.realEstate.lastAssetValueSnapshot = totalAssetValueForState(state.realEstate);
  }
}

function syncWeeklyAssetGain(state, now) {
  syncWeekForState(state, now);
  const assetValue = totalAssetValueForState(state.realEstate);
  const previous = Number(state.realEstate.lastAssetValueSnapshot);
  if (assetValue > previous) state.realEstate.weeklyAssetGain += assetValue - previous;
  state.realEstate.lastAssetValueSnapshot = assetValue;
}

function stageRewardForStage(stage) {
  assertObject(stage, "원정대 부동산 보상 stage");
  integerAtLeast(stage.globalStage, "원정대 부동산 보상 stage.globalStage", 1);
  const base = Number(realEstateBalance.expeditionRewards.stageBaseCash) * Number(realEstateBalance.expeditionRewards.stageGrowthRate) ** (Number(stage.globalStage) - 1);
  const multiplier = stage.isChapterBoss ? Number(realEstateBalance.expeditionRewards.chapterBossMultiplier) : stage.isMidBoss ? Number(realEstateBalance.expeditionRewards.midBossMultiplier) : 1;
  return Math.max(1, Math.floor(base * multiplier));
}

function idleExpeditionRewardPerHour(state) {
  assertObject(state.expedition, "save.expedition");
  const highestStage = Math.max(0, Math.floor(finiteNumber(state.expedition.highestStage, "save.expedition.highestStage 값이 올바르지 않습니다.")));
  return Math.max(0, Number(realEstateBalance.expeditionRewards.idleBaseCashPerHour) * (1 + highestStage * Number(realEstateBalance.expeditionRewards.idleStageFactor)));
}

function accrueRentIntoState(state, now) {
  validateRealEstateState(state.realEstate);
  const rentPerMinute = rentPerMinuteForState(state.realEstate);
  const elapsedMs = Math.max(0, Number(now) - Number(state.realEstate.lastRentAt));
  const capMs = Number(realEstateBalance.rent.offlineCapHours) * 60 * 60 * 1000;
  const effectiveMs = Math.min(elapsedMs, capMs);
  if (rentPerMinute <= 0 || effectiveMs <= 0) {
    state.realEstate.lastRentAt = Number(now);
    return 0;
  }
  const pending = Number(state.realEstate.rentCarry) + (rentPerMinute * effectiveMs) / 60000;
  const earned = Math.floor(pending);
  state.realEstate.rentCarry = pending - earned;
  state.realEstate.lastRentAt = Number(now);
  if (earned > 0) state.realEstate.cash += earned;
  return earned;
}

function accrueExpeditionFundsIntoState(state, now) {
  validateRealEstateState(state.realEstate);
  assertObject(state.expedition, "save.expedition");
  assertArray(state.expedition.partyMemberIds, "save.expedition.partyMemberIds");
  if (state.expedition.partyMemberIds.length === 0 || Number(state.expedition.highestStage) <= 0) {
    state.realEstate.lastExpeditionFundAt = Number(now);
    return 0;
  }
  const elapsedMs = Math.max(0, Number(now) - Number(state.realEstate.lastExpeditionFundAt));
  const capMs = Number(realEstateBalance.expeditionRewards.idleCapHours) * 60 * 60 * 1000;
  const effectiveMs = Math.min(elapsedMs, capMs);
  if (effectiveMs <= 0) return 0;
  const earned = Math.floor((idleExpeditionRewardPerHour(state) * effectiveMs) / 3600000);
  if (earned <= 0) return 0;
  state.realEstate.cash += earned;
  state.realEstate.lastExpeditionFundAt = Number(now);
  return earned;
}

export function accrueRealEstateIncome(state, now = Date.now()) {
  const next = cloneState(state);
  validateRealEstateState(next.realEstate);
  syncWeekForState(next, now);
  const rentEarned = accrueRentIntoState(next, now);
  if (rentEarned > 0) syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function realEstateExpeditionStageReward(stage) {
  return stageRewardForStage(stage);
}

export function grantRealEstateExpeditionPendingCash(state, amount, now = Date.now()) {
  const next = cloneState(state);
  validateRealEstateState(next.realEstate);
  const reward = integerAtLeast(amount, "원정대 pending 부동산 보상", 0);
  if (reward <= 0) return next;
  syncWeekForState(next, now);
  next.realEstate.cash += reward;
  next.realEstate.lastExpeditionFundAt = Number(now);
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function grantRealEstateExpeditionStageReward(state, stage, now = Date.now()) {
  const next = cloneState(state);
  validateRealEstateState(next.realEstate);
  syncWeekForState(next, now);
  const reward = stageRewardForStage(stage);
  next.realEstate.cash += reward;
  next.realEstate.lastExpeditionFundAt = Number(now);
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return { state: next, reward };
}

export function purchaseRealEstateProperty(state, propertyId, quantity, now = Date.now()) {
  const next = accrueRealEstateIncome(state, now);
  const property = propertyForId(propertyId);
  if (!isRealEstatePropertyUnlocked(next, propertyId)) return next;
  const count = ownedCount(next.realEstate, propertyId);
  const remainingCount = Math.max(0, maxOwnedCountForPropertyId(propertyId) - count);
  if (remainingCount <= 0) return next;
  const amount = Math.min(integerAtLeast(quantity, `${propertyId}.quantity`, 1), remainingCount);
  const cost = purchaseCostForCount(property, count, amount);
  if (Number(next.realEstate.cash) < cost) return next;
  next.realEstate.cash -= cost;
  next.realEstate.properties[propertyId] = { count: count + amount };
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function purchaseMaxRealEstateProperty(state, propertyId, now = Date.now()) {
  const next = accrueRealEstateIncome(state, now);
  const property = propertyForId(propertyId);
  if (!isRealEstatePropertyUnlocked(next, propertyId)) return next;
  const count = ownedCount(next.realEstate, propertyId);
  const remainingCount = Math.max(0, maxOwnedCountForPropertyId(propertyId) - count);
  const amount = maxPurchaseCount(property, count, next.realEstate.cash, remainingCount);
  if (amount <= 0) return next;
  const cost = purchaseCostForCount(property, count, amount);
  next.realEstate.cash -= cost;
  next.realEstate.properties[propertyId] = { count: count + amount };
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

function scaleTierForCount(count) {
  let tier = scaleTiers[0];
  for (const candidate of scaleTiers) {
    if (count >= Number(candidate.minCount)) tier = candidate;
  }
  return tier;
}

function developmentLevelForGrowthCount(propertyId, count) {
  const maxOwnedCount = maxOwnedCountForPropertyId(propertyId);
  const growthCount = effectiveGrowthCount(propertyId, count);
  if (growthCount <= 0) return 0;
  return Math.max(1, Math.min(scaleTiers.length, Math.ceil((growthCount / maxOwnedCount) * scaleTiers.length)));
}

function detailPadsForDistrictAsset(districtAsset) {
  return districtAsset.detailPads.map((pad) => {
    const buildingAsset = buildingAssetById.get(pad.buildingAsset);
    assert(buildingAsset, `real_estate_building_assets.json에서 건물 리소스를 찾을 수 없습니다: ${pad.buildingAsset}`);
    return {
      ...pad,
      buildingAssetId: buildingAsset.id,
      buildingAssetFile: buildingAsset.file,
      buildingDisplayWidth: Number(buildingAsset.displayWidth),
      buildingDisplayHeight: Number(buildingAsset.displayHeight),
      buildingAnchorX: Number(buildingAsset.anchorX),
      buildingAnchorY: Number(buildingAsset.anchorY),
      buildingShadow: buildingAsset.shadow,
      rotation: Number(pad.rotation),
    };
  });
}

function visibleBuildingSlotCountForCount(propertyId, count, totalSlots) {
  if (count <= 0) return 0;
  const maxOwnedCount = maxOwnedCountForPropertyId(propertyId);
  const growthCount = effectiveGrowthCount(propertyId, count);
  return Math.max(1, Math.min(totalSlots, Math.floor((growthCount / maxOwnedCount) * totalSlots)));
}

function visibleBuildingSlotsForDistrict(district, detailPads, count) {
  const totalSlots = district.buildingSlots.length;
  assert(detailPads.length === totalSlots, `부동산 도시 건물 슬롯과 상세 pad 수가 다릅니다: ${district.id}`);
  const visibleCount = visibleBuildingSlotCountForCount(district.id, count, totalSlots);
  return district.buildingSlots.slice(0, visibleCount).map((slot, index) => {
    const pad = detailPads[index];
    assert(pad, `부동산 상세 pad를 찾을 수 없습니다: ${district.id} ${index}`);
    return {
      id: `${district.id}-${index}`,
      x: Number(slot[0]),
      y: Number(slot[1]),
      buildingAssetId: pad.buildingAssetId,
      buildingAssetFile: pad.buildingAssetFile,
      buildingDisplayWidth: pad.buildingDisplayWidth,
      buildingDisplayHeight: pad.buildingDisplayHeight,
      buildingVariant: pad.variant,
      rotation: pad.rotation,
    };
  });
}

function districtGrowthStageForCount(districtId, count) {
  const growthAsset = districtGrowthAssetById.get(districtId);
  if (!growthAsset) return null;
  const growthCount = effectiveGrowthCount(districtId, count);
  let stage = growthAsset.stages[0];
  for (const candidate of growthAsset.stages) {
    if (growthCount >= Number(candidate.minOwnedCount)) stage = candidate;
  }
  assert(stage, `부동산 baked 성장 PNG stage를 찾을 수 없습니다: ${districtId} ${growthCount}`);
  return stage;
}

function nextScaleTier(count) {
  return scaleTiers.find((tier) => count < Number(tier.minCount)) || null;
}

function artStageForAssetValue(assetValue) {
  let stage = artStages[0];
  for (const candidate of artStages) {
    if (assetValue >= Number(candidate.minAssetValue)) stage = candidate;
  }
  return stage;
}

function rankingRewardForRank(rank) {
  const population = Number(realEstateBalance.ranking.population);
  const percentile = rank / Math.max(1, population);
  for (const reward of realEstateRankRewards.rewards) {
    if (hasOwn(reward, "rankMax") && rank <= Number(reward.rankMax)) return reward;
    if (hasOwn(reward, "percentileMax") && percentile <= Number(reward.percentileMax)) return reward;
  }
  return realEstateRankRewards.rewards[realEstateRankRewards.rewards.length - 1];
}

function previewRankForWeeklyGain(weeklyAssetGain) {
  const population = Number(realEstateBalance.ranking.population);
  if (weeklyAssetGain <= 0) return population;
  const power = Math.log10(weeklyAssetGain + 10) ** Number(realEstateBalance.ranking.previewPower);
  const rank = Math.ceil(population / (1 + power * Number(realEstateBalance.ranking.previewScale)));
  return Math.max(1, Math.min(population, rank));
}

function activeWeeklyAssetGain(realEstate, now) {
  validateRealEstateState(realEstate);
  if (Number(realEstate.lastWeeklyResetAt) < weekStartAt(now)) return 0;
  return Math.max(0, Number(realEstate.weeklyAssetGain));
}

function weeklyRewardStatus(realEstate, now, allowEmptyGain) {
  validateRealEstateState(realEstate);
  const weekKey = weekKeyAt(now);
  const weeklyAssetGain = activeWeeklyAssetGain(realEstate, now);
  const minimumGain = Number(realEstateBalance.ranking.minimumWeeklyAssetGainForClaim);
  const rewardClaimed = realEstate.claimedWeeklyRewardWeek === weekKey;
  const gainReady = allowEmptyGain || weeklyAssetGain >= minimumGain;
  return {
    weekKey,
    weeklyAssetGain,
    minimumGain,
    rewardClaimed,
    canClaim: !rewardClaimed && gainReady,
  };
}

function claimRealEstateWeeklyRewardIntoState(state, now, allowEmptyGain) {
  const next = accrueRealEstateIncome(state, now);
  syncWeekForState(next, now);
  const status = weeklyRewardStatus(next.realEstate, now, allowEmptyGain);
  if (!status.canClaim) return next;
  const rank = previewRankForWeeklyGain(status.weeklyAssetGain);
  const reward = rankingRewardForRank(rank);
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + Number(reward.diamonds);
  next.realEstate.claimedWeeklyRewardWeek = status.weekKey;
  validateRealEstateState(next.realEstate);
  return next;
}

export function claimRealEstateWeeklyReward(state, now = Date.now()) {
  return claimRealEstateWeeklyRewardIntoState(state, now, false);
}

export function claimDebugRealEstateWeeklyReward(state, now = Date.now()) {
  return claimRealEstateWeeklyRewardIntoState(state, now, true);
}

export function debugGrantRealEstateCash(state, amount, now = Date.now()) {
  const next = accrueRealEstateIncome(state, now);
  const cash = integerAtLeast(amount, "debug.realEstate.cash", 1);
  next.realEstate.cash += cash;
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function debugUnlockRealEstateStages(state, highestStage = 100, now = Date.now()) {
  const next = accrueRealEstateIncome(state, now);
  assertObject(next.expedition, "save.expedition");
  const stage = integerAtLeast(highestStage, "debug.realEstate.highestStage", 0);
  next.expedition.highestStage = Math.max(Number(next.expedition.highestStage), stage);
  next.expedition.clearedStageCount = Math.max(Number(next.expedition.clearedStageCount), stage);
  validateRealEstateState(next.realEstate);
  return next;
}

export function debugSetAllRealEstateCounts(state, count, now = Date.now()) {
  const next = debugUnlockRealEstateStages(state, 100, now);
  const amount = integerAtLeast(count, "debug.realEstate.count", 0);
  next.realEstate.properties = {};
  for (const property of properties) {
    const maxOwnedCount = maxOwnedCountForPropertyId(property.id);
    const targetCount = amount >= 1000 ? maxOwnedCount : Math.min(amount, maxOwnedCount);
    if (targetCount > 0) next.realEstate.properties[property.id] = { count: targetCount };
  }
  if (amount >= 1000) next.realEstate.cash = Math.max(Number(next.realEstate.cash), 1000000000);
  if (amount > 0 && amount < 1000) next.realEstate.cash = Math.max(Number(next.realEstate.cash), 1000000);
  syncWeeklyAssetGain(next, now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function debugResetRealEstateState(state, now = Date.now()) {
  const next = cloneState(state);
  next.realEstate = createDefaultRealEstateState(now);
  validateRealEstateState(next.realEstate);
  return next;
}

export function createRealEstateViewModel(state) {
  assertObject(state.expedition, "save.expedition");
  validateRealEstateState(state.realEstate);
  const now = Date.now();
  const totalAssetValue = totalAssetValueForState(state.realEstate);
  const portfolioValue = portfolioAssetValue(state.realEstate);
  const rentPerMinute = rentPerMinuteForState(state.realEstate);
  const artStage = artStageForAssetValue(totalAssetValue);
  const rewardStatus = weeklyRewardStatus(state.realEstate, now, false);
  const rank = previewRankForWeeklyGain(rewardStatus.weeklyAssetGain);
  const reward = rankingRewardForRank(rank);
  const highestStage = integerAtLeast(state.expedition.highestStage, "save.expedition.highestStage", 0);
  const weeklyRewardButtonLabel = rewardStatus.rewardClaimed ? "수령 완료" : rewardStatus.canClaim ? "주간 보상 수령" : "증가 필요";
  const weeklyRewardHint = rewardStatus.rewardClaimed
    ? "이번 주 보상을 이미 수령했습니다."
    : rewardStatus.canClaim
      ? `${reward.label} · ${Number(reward.diamonds)} 다이아`
      : `주간 증가 ${Math.floor(rewardStatus.minimumGain)} 이상 필요`;
  const cards = properties.map((property) => {
    const count = ownedCount(state.realEstate, property.id);
    const district = cityDistrictById.get(property.id);
    assert(district, `real_estate_city_layout.json에서 지역을 찾을 수 없습니다: ${property.id}`);
    const districtAsset = districtAssetById.get(property.id);
    assert(districtAsset, `real_estate_district_assets.json에서 지역 리소스를 찾을 수 없습니다: ${property.id}`);
    const unlockInfo = realEstateUnlockInfo(state.realEstate, property.id, highestStage);
    const unlocked = unlockInfo.unlocked;
    const maxOwnedCount = maxOwnedCountForPropertyId(property.id);
    const growthCount = effectiveGrowthCount(property.id, count);
    const remainingCount = Math.max(0, maxOwnedCount - count);
    const isMaxed = remainingCount <= 0;
    const scale = count > 0 ? scaleTierForCount(count) : null;
    const nextCost = remainingCount > 0 ? nextPurchaseCost(property, count) : 0;
    const buyTenCount = Math.min(10, remainingCount);
    const cost10 = buyTenCount > 0 ? purchaseCostForCount(property, count, buyTenCount) : 0;
    const maxBuyCount = maxPurchaseCount(property, count, state.realEstate.cash, remainingCount);
    const maxBuyCost = maxBuyCount > 0 ? purchaseCostForCount(property, count, maxBuyCount) : 0;
    const nextScaleProgress = Math.min(100, Math.floor((growthCount / maxOwnedCount) * 100));
    const developmentLevel = developmentLevelForGrowthCount(property.id, count);
    const developmentRatio = nextScaleProgress;
    const districtDetailPads = detailPadsForDistrictAsset(districtAsset);
    const visibleSlotCount = visibleBuildingSlotCountForCount(property.id, count, district.buildingSlots.length);
    const visibleBuildingSlots = visibleBuildingSlotsForDistrict(district, districtDetailPads, count);
    const districtGrowthStage = districtGrowthStageForCount(property.id, count);
    return {
      id: property.id,
      name: property.name,
      description: property.description,
      unlockStage: Number(property.unlockStage),
      unlockLabel: unlockInfo.label,
      unlockHint: unlockInfo.hint,
      unlocked,
      count,
      maxOwnedCount,
      growthCount,
      remainingCount,
      isMaxed,
      scaleLabel: scale ? scale.label : "미보유",
      portfolioLabel: scale ? scale.portfolioLabel : "아직 보유 없음",
      nextScaleLabel: isMaxed ? "최대 개발" : `${growthCount}/${maxOwnedCount}채`,
      nextScaleProgress,
      rentPerMinute: count * Number(property.baseIncomePerMinute),
      assetValue: assetValueForCount(property, count),
      nextCost,
      buyTenCount,
      cost10,
      maxBuyCount,
      maxBuyCost,
      developmentLevel,
      developmentRatio,
      districtPolygon: district.polygon,
      districtLabelAnchor: district.labelAnchor,
      districtDetailFocus: district.detailFocus,
      buildingSlots: district.buildingSlots,
      visibleBuildingSlots,
      districtBackgroundAsset: districtAsset.backgroundAsset,
      districtGrowthStageAsset: districtGrowthStage ? districtGrowthStage.file : "",
      usesBakedDistrictGrowth: Boolean(districtGrowthStage),
      districtBuildingTheme: districtAsset.buildingTheme,
      districtDetailPads,
      districtFutureResidentPaths: districtAsset.futureResidentPaths,
      districtSpeechTone: districtAsset.speechTone,
      canBuyOne: unlocked && remainingCount > 0 && Number(state.realEstate.cash) >= nextCost,
      canBuyTen: unlocked && buyTenCount > 0 && Number(state.realEstate.cash) >= cost10,
      canBuyMax: unlocked && maxBuyCount > 0,
    };
  });
  const ownedTotal = cards.reduce((sum, card) => sum + card.count, 0);
  const representative = cards.slice().sort((a, b) => b.assetValue - a.assetValue || b.count - a.count)[0];
  return {
    currency: realEstateBalance.currency,
    cash: Math.floor(Number(state.realEstate.cash)),
    totalAssetValue,
    portfolioValue,
    rentPerMinute,
    weeklyAssetGain: Math.floor(rewardStatus.weeklyAssetGain),
    rank,
    rankPopulation: Number(realEstateBalance.ranking.population),
    rewardLabel: reward.label,
    rewardDiamonds: Number(reward.diamonds),
    rewardClaimed: rewardStatus.rewardClaimed,
    canClaimWeeklyReward: rewardStatus.canClaim,
    weeklyRewardMinGain: Math.floor(rewardStatus.minimumGain),
    weeklyRewardButtonLabel,
    weeklyRewardHint,
    highestStage,
    idleCashPerHour: Math.floor(idleExpeditionRewardPerHour(state)),
    ownedTotal,
    ownedKinds: cards.filter((card) => card.count > 0).length,
    totalKinds: cards.length,
    artStage,
    representativeLabel: representative && representative.count > 0 ? representative.portfolioLabel : "첫 매입 대기",
    cards,
  };
}
