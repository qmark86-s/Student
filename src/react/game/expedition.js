import careers from "../../../data/careers.json";
import expeditionBalance from "../../../data/expedition_balance.json";
import expeditionBosses from "../../../data/expedition_bosses.json";
import expeditionChapters from "../../../data/expedition_chapters.json";
import expeditionPromotions from "../../../data/expedition_promotions.json";
import expeditionSegments from "../../../data/expedition_stages.json";
import expeditionLevels from "../../../data/expedition_unit_levels.json";
import { grantRealEstateExpeditionStageReward } from "./realEstate.js";

const subjectIds = ["korean", "english", "math", "social", "science"];
const subjectLabels = {
  korean: "국어",
  english: "영어",
  math: "수학",
  social: "사회",
  science: "과학",
};
const subjectShortLabels = {
  korean: "국",
  english: "영",
  math: "수",
  social: "사",
  science: "과",
};

const chapterByNumber = new Map(expeditionChapters.map((chapter) => [Number(chapter.chapter), chapter]));
const careerById = new Map(careers.map((career) => [career.id, career]));
const levelByLevel = new Map(expeditionLevels.map((level) => [Number(level.level), level]));
const promotionById = new Map(expeditionPromotions.map((promotion) => [promotion.id, promotion]));
const promotionByOrder = new Map(expeditionPromotions.map((promotion) => [Number(promotion.order), promotion]));
const segmentByKey = new Map(expeditionSegments.map((segment) => [`${Number(segment.chapter)}:${Number(segment.segment)}`, segment]));
const midBossByKey = new Map(
  expeditionBosses
    .filter((boss) => boss.bossType === "mid")
    .map((boss) => [`${Number(boss.chapter)}:${Number(boss.segment)}`, boss]),
);
const chapterBossByChapter = new Map(
  expeditionBosses
    .filter((boss) => boss.bossType === "chapter")
    .map((boss) => [Number(boss.chapter), boss]),
);

export const expeditionPartySize = expeditionBalance.partySize;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function assertObject(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} 데이터가 객체가 아닙니다.`);
}

function requireOwn(source, key, path) {
  assertObject(source, path);
  assert(hasOwn(source, key), `${path}.${key} 값이 없습니다.`);
  return source[key];
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function now() {
  return Date.now();
}

function statMap(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} 데이터가 객체가 아닙니다.`);
  return Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(source[subject], `${path}.${subject} 값이 올바르지 않습니다.`)]));
}

function blankStats() {
  return Object.fromEntries(subjectIds.map((subject) => [subject, 0]));
}

function addStats(target, source) {
  for (const subject of subjectIds) target[subject] += finiteNumber(source[subject], `원정대 합산 stats.${subject} 값이 올바르지 않습니다.`);
}

function pushExpeditionLog(expedition, text, tone = "info") {
  assert(Array.isArray(expedition.log), "save.expedition.log 데이터가 배열이 아닙니다.");
  expedition.log = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
      text,
      tone,
    },
    ...expedition.log,
  ].slice(0, 40);
}

function createChapterRun(currentStage, tempExp = 0) {
  const stage = stageCoordinates(currentStage);
  const exp = Math.max(0, Math.floor(finiteNumber(tempExp, "원정대 chapterRun.tempExp 값이 올바르지 않습니다.")));
  const expPerLevel = finiteNumber(expeditionBalance.chapterRunExpPerLevel, "expedition_balance.json chapterRunExpPerLevel 값이 올바르지 않습니다.");
  return {
    chapter: stage.chapter,
    tempLevel: Math.max(1, Math.floor(exp / expPerLevel) + 1),
    tempExp: exp,
    boostMultiplier: Math.round((1 + Math.max(0, Math.floor(exp / expPerLevel)) * 0.01) * 1000) / 1000,
  };
}

export function createDefaultExpeditionState(createdAt = now()) {
  return {
    members: [],
    partyMemberIds: [],
    currentStage: 1,
    highestStage: 0,
    claimedBossStages: [],
    trainingExp: 0,
    chapterRun: createChapterRun(1, 0),
    lastResolvedAt: createdAt,
    log: [],
    stageIndex: 0,
    clearedStageCount: 0,
    lastStageId: null,
  };
}

function validatePromotionId(id, path) {
  assert(typeof id === "string" && promotionById.has(id), `${path} 값이 지원하지 않는 승급 단계입니다: ${id}`);
}

function validateExpeditionMember(member, path) {
  assert(member && typeof member === "object" && !Array.isArray(member), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof member.id === "string" && member.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof member.sourceKey === "string" && member.sourceKey.length > 0, `${path}.sourceKey 값이 없습니다.`);
  assertNumberInteger(member.sourceRunNumber, `${path}.sourceRunNumber`, 0);
  assert(typeof member.sourceCareerId === "string" && careerById.has(member.sourceCareerId), `${path}.sourceCareerId 값이 올바르지 않습니다: ${member.sourceCareerId}`);
  assert(typeof member.careerName === "string" && member.careerName.length > 0, `${path}.careerName 값이 없습니다.`);
  assert(typeof member.sourceUniversity === "string" && member.sourceUniversity.length > 0, `${path}.sourceUniversity 값이 없습니다.`);
  assertNumberInteger(member.level, `${path}.level`, 1);
  assertNumberInteger(member.exp, `${path}.exp`, 0);
  validatePromotionId(member.promotionTier, `${path}.promotionTier`);
  statMap(member.baseStats, `${path}.baseStats`);
  assert(typeof member.locked === "boolean", `${path}.locked 값이 boolean이 아닙니다.`);
  assertNumberInteger(member.createdAt, `${path}.createdAt`, 0);
  assert(member.avatarGender === "male" || member.avatarGender === "female", `${path}.avatarGender 값이 올바르지 않습니다: ${member.avatarGender}`);
}

function assertNumberInteger(value, path, min) {
  const number = finiteNumber(value, `${path} 값이 올바르지 않습니다.`);
  assert(Number.isInteger(number), `${path} 값은 정수여야 합니다.`);
  assert(number >= min, `${path} 값은 ${min} 이상이어야 합니다.`);
}

function validateLogEntry(entry, path) {
  assert(entry && typeof entry === "object" && !Array.isArray(entry), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof entry.id === "string" && entry.id.length > 0, `${path}.id 값이 없습니다.`);
  assertNumberInteger(entry.time, `${path}.time`, 0);
  assert(typeof entry.text === "string" && entry.text.length > 0, `${path}.text 값이 없습니다.`);
  assert(typeof entry.tone === "string" && entry.tone.length > 0, `${path}.tone 값이 없습니다.`);
}

export function validateExpeditionState(expedition, path = "save.expedition") {
  assert(expedition && typeof expedition === "object" && !Array.isArray(expedition), `${path} 데이터가 객체가 아닙니다.`);
  assert(Array.isArray(expedition.members), `${path}.members 데이터가 배열이 아닙니다.`);
  expedition.members.forEach((member, index) => validateExpeditionMember(member, `${path}.members[${index}]`));
  const memberIds = new Set(expedition.members.map((member) => member.id));
  assert(memberIds.size === expedition.members.length, `${path}.members id가 중복되었습니다.`);

  assert(Array.isArray(expedition.partyMemberIds), `${path}.partyMemberIds 데이터가 배열이 아닙니다.`);
  assert(expedition.partyMemberIds.length <= expeditionPartySize, `${path}.partyMemberIds 편성 수가 파티 크기를 초과했습니다.`);
  const partyUnique = new Set(expedition.partyMemberIds);
  assert(partyUnique.size === expedition.partyMemberIds.length, `${path}.partyMemberIds 값이 중복되었습니다.`);
  for (const id of expedition.partyMemberIds) {
    assert(typeof id === "string" && memberIds.has(id), `${path}.partyMemberIds에서 원정대원을 찾을 수 없습니다: ${id}`);
  }

  assertNumberInteger(expedition.currentStage, `${path}.currentStage`, 1);
  assert(Number(expedition.currentStage) <= expeditionBalance.maxStage, `${path}.currentStage 값이 최대 Stage를 초과했습니다.`);
  assertNumberInteger(expedition.highestStage, `${path}.highestStage`, 0);
  assert(Number(expedition.highestStage) <= expeditionBalance.maxStage, `${path}.highestStage 값이 최대 Stage를 초과했습니다.`);
  assert(Array.isArray(expedition.claimedBossStages), `${path}.claimedBossStages 데이터가 배열이 아닙니다.`);
  for (const stage of expedition.claimedBossStages) assertNumberInteger(stage, `${path}.claimedBossStages[]`, 1);
  assertNumberInteger(expedition.trainingExp, `${path}.trainingExp`, 0);
  assert(expedition.chapterRun && typeof expedition.chapterRun === "object", `${path}.chapterRun 데이터가 객체가 아닙니다.`);
  assertNumberInteger(expedition.chapterRun.chapter, `${path}.chapterRun.chapter`, 1);
  assertNumberInteger(expedition.chapterRun.tempLevel, `${path}.chapterRun.tempLevel`, 1);
  assertNumberInteger(expedition.chapterRun.tempExp, `${path}.chapterRun.tempExp`, 0);
  finiteNumber(expedition.chapterRun.boostMultiplier, `${path}.chapterRun.boostMultiplier 값이 올바르지 않습니다.`);
  assertNumberInteger(expedition.lastResolvedAt, `${path}.lastResolvedAt`, 0);
  assert(Array.isArray(expedition.log), `${path}.log 데이터가 배열이 아닙니다.`);
  expedition.log.forEach((entry, index) => validateLogEntry(entry, `${path}.log[${index}]`));

  assertNumberInteger(expedition.stageIndex, `${path}.stageIndex`, 0);
  assertNumberInteger(expedition.clearedStageCount, `${path}.clearedStageCount`, 0);
  assert(Number(expedition.stageIndex) === Number(expedition.currentStage) - 1, `${path}.stageIndex 값이 currentStage와 일치하지 않습니다.`);
  assert(Number(expedition.clearedStageCount) === Number(expedition.highestStage), `${path}.clearedStageCount 값이 highestStage와 일치하지 않습니다.`);
  assert(expedition.lastStageId === null || typeof expedition.lastStageId === "string", `${path}.lastStageId 값이 올바르지 않습니다.`);
}

function lastStageIdForAliases(expedition) {
  const lastStageId = requireOwn(expedition, "lastStageId", "save.expedition");
  assert(lastStageId === null || typeof lastStageId === "string", "save.expedition.lastStageId 값이 올바르지 않습니다.");
  return lastStageId;
}

function expeditionAliases(expedition, lastStageId) {
  const resolvedLastStageId = arguments.length >= 2 ? lastStageId : lastStageIdForAliases(expedition);
  assert(resolvedLastStageId === null || typeof resolvedLastStageId === "string", "save.expedition.lastStageId 값이 올바르지 않습니다.");
  return {
    ...expedition,
    stageIndex: Number(expedition.currentStage) - 1,
    clearedStageCount: Number(expedition.highestStage),
    lastStageId: resolvedLastStageId,
  };
}

function stageCoordinates(currentStage) {
  const globalStage = clamp(Math.floor(finiteNumber(currentStage, "원정대 currentStage 값이 올바르지 않습니다.")), 1, expeditionBalance.maxStage);
  const chapterSize = finiteNumber(expeditionBalance.chapterSize, "expedition_balance.json chapterSize 값이 올바르지 않습니다.");
  const segmentSize = finiteNumber(expeditionBalance.segmentSize, "expedition_balance.json segmentSize 값이 올바르지 않습니다.");
  const chapter = Math.floor((globalStage - 1) / chapterSize) + 1;
  const stageInChapter = ((globalStage - 1) % chapterSize) + 1;
  const segmentInChapter = Math.floor((stageInChapter - 1) / segmentSize) + 1;
  const stageInSegment = ((stageInChapter - 1) % segmentSize) + 1;
  const microStep = Math.floor((stageInSegment - 1) / 10) + 1;
  const isChapterBoss = stageInChapter === chapterSize;
  const isMidBoss = !isChapterBoss && stageInSegment === segmentSize;
  return {
    globalStage,
    chapter,
    stageInChapter,
    segmentInChapter,
    stageInSegment,
    microStep,
    isMidBoss,
    isChapterBoss,
    isBoss: isMidBoss || isChapterBoss,
  };
}

function uniqueSubjects(...groups) {
  const values = [];
  for (const group of groups) {
    assert(Array.isArray(group), "원정대 subject 그룹이 배열이 아닙니다.");
    for (const subject of group) {
      assert(subjectLabels[subject], `원정대 subject 라벨 누락: ${subject}`);
      if (!values.includes(subject)) values.push(subject);
    }
  }
  return values;
}

function withoutSubjects(subjects, remove) {
  return subjects.filter((subject) => !remove.includes(subject));
}

export function createStageView(currentStage) {
  assert(expeditionSegments.length > 0, "expedition_stages.json이 비어 있어 원정대를 표시할 수 없습니다.");
  assert(expeditionBosses.length > 0, "expedition_bosses.json이 비어 있어 보스 Stage를 표시할 수 없습니다.");
  const coords = stageCoordinates(currentStage);
  const chapter = chapterByNumber.get(coords.chapter);
  assert(chapter, `expedition_chapters.json에서 챕터를 찾을 수 없습니다: ${coords.chapter}`);
  const segment = segmentByKey.get(`${coords.chapter}:${coords.segmentInChapter}`);
  assert(segment, `expedition_stages.json에서 세그먼트를 찾을 수 없습니다: ${coords.chapter}:${coords.segmentInChapter}`);
  const boss = coords.isChapterBoss ? chapterBossByChapter.get(coords.chapter) : coords.isMidBoss ? midBossByKey.get(`${coords.chapter}:${coords.segmentInChapter}`) : null;
  if (coords.isBoss) assert(boss, `expedition_bosses.json에서 보스를 찾을 수 없습니다: ${coords.chapter}:${coords.segmentInChapter}`);
  const source = boss || segment;
  const weakSubjects = uniqueSubjects(chapter.weakSubjects, source.weakSubjects);
  const resistSubjects = withoutSubjects(uniqueSubjects(chapter.resistSubjects, source.resistSubjects), weakSubjects);
  const enemyNames = Array.isArray(segment.normalEnemyNames) && segment.normalEnemyNames.length > 0 ? segment.normalEnemyNames : [segment.enemyName];
  const enemyCount = boss ? 1 : 1 + ((coords.globalStage + coords.microStep + coords.segmentInChapter) % 3);
  const enemyAsset = boss ? boss.bossAsset : segment.enemyAsset;
  assert(enemyAsset, `원정대 적 asset이 비어 있습니다: ${source.id}`);

  return {
    ...coords,
    id: `${chapter.id}:${source.id}`,
    name: source.name,
    enemyName: boss ? boss.enemyName : enemyNames[(coords.stageInSegment + coords.microStep - 2) % enemyNames.length],
    normalEnemyNames: boss ? [boss.enemyName] : enemyNames,
    enemyCount,
    enemyAsset,
    enemyVariant: Number(segment.enemyVariant),
    chapterName: chapter.name,
    chapterSubtitle: chapter.subtitle,
    backdropClass: chapter.backdropClass,
    segmentName: segment.name,
    focusSubjects: uniqueSubjects(chapter.focusSubjects, source.focusSubjects),
    weakSubjects,
    resistSubjects,
    difficultyMultiplier: Math.round(finiteNumber(chapter.difficultyMultiplier, `expedition_chapters.json difficultyMultiplier 값이 올바르지 않습니다: ${chapter.id}`) * finiteNumber(source.difficultyMultiplier, `원정대 difficultyMultiplier 값이 올바르지 않습니다: ${source.id}`) * 1000) / 1000,
    description: boss ? source.description : `${chapter.subtitle} · ${segment.description}`,
    progressPercent: Math.max(0, Math.min(100, Math.round((coords.stageInChapter / expeditionBalance.chapterSize) * 100))),
    nextBossStageCount: coords.isBoss ? 0 : expeditionBalance.segmentSize - coords.stageInSegment,
  };
}

function stageStartForBoss(currentStage) {
  const coords = stageCoordinates(currentStage);
  if (!coords.isBoss) return coords.globalStage;
  const chapterBase = (coords.chapter - 1) * expeditionBalance.chapterSize;
  const segmentBase = Math.floor((coords.stageInChapter - 1) / expeditionBalance.segmentSize) * expeditionBalance.segmentSize;
  return chapterBase + segmentBase + 1;
}

function promotionMultiplier(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  return finiteNumber(promotion.combatMultiplier, `expedition_promotions.json combatMultiplier 값이 올바르지 않습니다: ${promotionId}`);
}

export function promotionName(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  return promotion.name;
}

function nextPromotionId(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  const next = promotionByOrder.get(Number(promotion.order) + 1);
  return next ? next.id : null;
}

export function expeditionLevelCost(member) {
  validateExpeditionMember(member, "원정대원");
  const configured = levelByLevel.get(Number(member.level));
  if (configured) return finiteNumber(configured.expCost, `expedition_unit_levels.json expCost 값이 올바르지 않습니다: ${member.level}`);
  const lastLevel = expeditionLevels.at(-1);
  assert(lastLevel, "expedition_unit_levels.json이 비어 있습니다.");
  const extraLevels = Math.max(0, Number(member.level) - Number(lastLevel.level));
  return Math.round(finiteNumber(lastLevel.expCost, "expedition_unit_levels.json 마지막 expCost 값이 올바르지 않습니다.") * 1.12 ** extraLevels);
}

function memberCombatStats(member) {
  validateExpeditionMember(member, "원정대원");
  const tierMultiplier = promotionMultiplier(member.promotionTier);
  const levelMultiplier = 1 + Math.max(0, Number(member.level) - 1) * 0.04;
  return Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(member.baseStats[subject], `원정대원 baseStats.${subject} 값이 올바르지 않습니다.`) * tierMultiplier * levelMultiplier]));
}

function memberPower(member) {
  const stats = memberCombatStats(member);
  return subjectIds.reduce((sum, subject) => sum + stats[subject], 0);
}

function partyMembers(expedition) {
  validateExpeditionState(expedition, "save.expedition");
  return expedition.partyMemberIds.map((id) => {
    const member = expedition.members.find((candidate) => candidate.id === id);
    assert(member, `원정대 편성 동료를 찾을 수 없습니다: ${id}`);
    return member;
  });
}

function partyPowerForStage(expedition, stageView) {
  const stats = blankStats();
  for (const member of partyMembers(expedition)) addStats(stats, memberCombatStats(member));
  const boost = finiteNumber(expedition.chapterRun.boostMultiplier, "save.expedition.chapterRun.boostMultiplier 값이 올바르지 않습니다.");
  return subjectIds.reduce((sum, subject) => {
    let multiplier = 1;
    if (stageView.focusSubjects.includes(subject)) multiplier *= expeditionBalance.focusMultiplier;
    if (stageView.weakSubjects.includes(subject)) multiplier *= expeditionBalance.weakMultiplier;
    if (stageView.resistSubjects.includes(subject)) multiplier *= expeditionBalance.resistMultiplier;
    return sum + stats[subject] * multiplier;
  }, 0) * boost;
}

function requiredPowerForStage(currentStage) {
  const stageView = createStageView(currentStage);
  const bossMultiplier = stageView.isChapterBoss ? expeditionBalance.chapterBossPowerMultiplier : stageView.isMidBoss ? expeditionBalance.midBossPowerMultiplier : 1;
  const value =
    expeditionBalance.baseRequiredPower *
    expeditionBalance.chapterPowerGrowth ** (stageView.chapter - 1) *
    expeditionBalance.segmentPowerGrowth ** (stageView.segmentInChapter - 1) *
    expeditionBalance.stagePowerGrowth ** (stageView.stageInSegment - 1) *
    stageView.difficultyMultiplier *
    bossMultiplier;
  return Math.round(value * 10) / 10;
}

export function expeditionStageExpReward(currentStage) {
  const stageView = createStageView(currentStage);
  const bossMultiplier = stageView.isChapterBoss ? 8 : stageView.isMidBoss ? 4 : 1;
  const reward = (5 + stageView.chapter * 2 + stageView.segmentInChapter) * bossMultiplier * stageView.difficultyMultiplier;
  return Math.max(1, Math.round(reward));
}

function expeditionMoneyReward(currentStage) {
  createStageView(currentStage);
  return 0;
}

function createBaseStatsFromRawStats(rawStats, careerId, powerMultiplier, path) {
  const career = careerById.get(careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
  assert(career.statWeights && typeof career.statWeights === "object", `careers.json statWeights 값이 없습니다: ${careerId}`);
  const stats = statMap(rawStats, path);
  const tier = finiteNumber(career.tier, `careers.json tier 값이 올바르지 않습니다: ${careerId}`);
  const tierFactor = 1 + Math.max(0, 4 - tier) * 0.08;
  const averageWeight = subjectIds.reduce((sum, subject) => sum + finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${careerId}`), 0) / subjectIds.length;
  const multiplier = Math.max(0.25, finiteNumber(powerMultiplier, `원정대 powerMultiplier 값이 올바르지 않습니다: ${careerId}`));
  return Object.fromEntries(subjectIds.map((subject) => {
    const stat = Math.log10(Math.max(0, stats[subject]) + 10) ** 2 * 2.6;
    const weight = finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${careerId}`) / Math.max(0.1, averageWeight);
    return [subject, Math.round(stat * (0.55 + weight * 0.55) * tierFactor * multiplier * 10) / 10];
  }));
}

export function createExpeditionMemberFromCompanion(companion, createdAt = now()) {
  assert(companion && typeof companion === "object" && !Array.isArray(companion), "동료 데이터가 객체가 아닙니다.");
  assert(typeof companion.id === "string" && companion.id.length > 0, "동료 id 값이 없습니다.");
  assert(typeof companion.careerId === "string" && careerById.has(companion.careerId), `원정대 등록 가능한 직업을 찾을 수 없습니다: ${companion.careerId}`);
  assert(companion.avatarGender === "male" || companion.avatarGender === "female", `동료 avatarGender 값이 올바르지 않습니다: ${companion.id}`);
  const career = careerById.get(companion.careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${companion.careerId}`);
  assert(typeof companion.careerName === "string" && companion.careerName.length > 0, `동료 careerName 값이 없습니다: ${companion.id}`);
  assert(typeof companion.sourceUniversity === "string" && companion.sourceUniversity.length > 0, `동료 sourceUniversity 값이 없습니다: ${companion.id}`);
  assert(hasOwn(companion, "createdRun"), `동료 createdRun 값이 없습니다: ${companion.id}`);
  return {
    id: `expedition-member-${companion.id}`,
    sourceKey: `companion:${companion.id}`,
    sourceRunNumber: Math.max(0, Math.floor(finiteNumber(companion.createdRun, `동료 createdRun 값이 올바르지 않습니다: ${companion.id}`))),
    sourceCareerId: companion.careerId,
    careerName: companion.careerName,
    sourceUniversity: companion.sourceUniversity,
    level: 1,
    exp: 0,
    promotionTier: "staff",
    baseStats: createBaseStatsFromRawStats(companion.stats, companion.careerId, companion.powerMultiplier, `동료 ${companion.id}.stats`),
    locked: false,
    createdAt,
    avatarGender: companion.avatarGender,
  };
}

function createDebugRawStats(career, debugIndex) {
  assert(career && typeof career === "object" && !Array.isArray(career), "DEBUG 원정대 직업 데이터가 객체가 아닙니다.");
  assert(typeof career.id === "string" && careerById.has(career.id), `DEBUG 원정대 직업을 찾을 수 없습니다: ${career.id}`);
  assert(career.statWeights && typeof career.statWeights === "object", `careers.json statWeights 값이 없습니다: ${career.id}`);
  const tier = finiteNumber(career.tier, `careers.json tier 값이 올바르지 않습니다: ${career.id}`);
  const index = Math.max(0, Math.floor(finiteNumber(debugIndex, `DEBUG 원정대 index 값이 올바르지 않습니다: ${debugIndex}`)));
  const base = 1800 + Math.max(0, 5 - tier) * 180 + index * 35;
  return Object.fromEntries(subjectIds.map((subject) => {
    const weight = finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${career.id}`);
    return [subject, Math.round(base * (0.74 + weight * 0.32))];
  }));
}

export function createDebugExpeditionMember(career, debugIndex, createdAt = now()) {
  assert(career && typeof career === "object" && !Array.isArray(career), "DEBUG 원정대 직업 데이터가 객체가 아닙니다.");
  assert(typeof career.id === "string" && careerById.has(career.id), `DEBUG 원정대 직업을 찾을 수 없습니다: ${career.id}`);
  assert(typeof career.name === "string" && career.name.length > 0, `careers.json name 값이 없습니다: ${career.id}`);
  const index = Math.max(0, Math.floor(finiteNumber(debugIndex, `DEBUG 원정대 index 값이 올바르지 않습니다: ${debugIndex}`)));
  const timestamp = Math.max(0, Math.floor(finiteNumber(createdAt, `DEBUG 원정대 createdAt 값이 올바르지 않습니다: ${createdAt}`)));
  const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
  return {
    id: `expedition-debug-${timestamp}-${career.id}-${index}`,
    sourceKey: `debug:${timestamp}:${career.id}:${index}`,
    sourceRunNumber: 0,
    sourceCareerId: career.id,
    careerName: career.name,
    sourceUniversity: "디버그 아카데미",
    level: 1,
    exp: 0,
    promotionTier: "staff",
    baseStats: createBaseStatsFromRawStats(createDebugRawStats(career, index), career.id, powerMultiplier, `DEBUG 원정대 ${career.id}.stats`),
    locked: false,
    createdAt: timestamp,
    avatarGender: "male",
  };
}

export function migrateLegacyExpeditionState(expedition, companions = [], createdAt = now()) {
  assertObject(expedition, "legacy expedition");
  assert(Array.isArray(companions), "legacy companions 데이터가 배열이 아닙니다.");
  finiteNumber(createdAt, "legacy expedition createdAt 값이 올바르지 않습니다.");
  const currentStage = Math.max(1, Math.floor(finiteNumber(requireOwn(expedition, "currentStage", "legacy expedition"), "legacy expedition currentStage 값이 올바르지 않습니다.")));
  const highestStage = Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "highestStage", "legacy expedition"), "legacy expedition highestStage 값이 올바르지 않습니다.")));
  const members = requireOwn(expedition, "members", "legacy expedition");
  assert(Array.isArray(members), "legacy expedition.members 데이터가 배열이 아닙니다.");
  const memberBySourceKey = new Map(members.map((member) => [member.sourceKey, member]));
  const rawPartyMemberIds = requireOwn(expedition, "partyMemberIds", "legacy expedition");
  assert(Array.isArray(rawPartyMemberIds), "legacy expedition.partyMemberIds 데이터가 배열이 아닙니다.");
  const partyMemberIds = rawPartyMemberIds
    .map((id) => {
      assert(typeof id === "string" && id.length > 0, `legacy expedition.partyMemberIds 값이 올바르지 않습니다: ${id}`);
      if (members.some((member) => member.id === id)) return id;
      const member = memberBySourceKey.get(`companion:${id}`);
      assert(member, `legacy expedition.partyMemberIds에서 원정대원을 찾을 수 없습니다: ${id}`);
      return member.id;
    })
    .slice(0, expeditionPartySize);
  const migrated = expeditionAliases({
    members,
    partyMemberIds,
    currentStage,
    highestStage,
    claimedBossStages: requireOwn(expedition, "claimedBossStages", "legacy expedition"),
    trainingExp: Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "trainingExp", "legacy expedition"), "legacy expedition trainingExp 값이 올바르지 않습니다."))),
    chapterRun: requireOwn(expedition, "chapterRun", "legacy expedition"),
    lastResolvedAt: Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "lastResolvedAt", "legacy expedition"), "legacy expedition lastResolvedAt 값이 올바르지 않습니다."))),
    log: requireOwn(expedition, "log", "legacy expedition"),
  }, requireOwn(expedition, "lastStageId", "legacy expedition"));
  validateExpeditionState(migrated, "save.expedition");
  return migrated;
}

export function registerExpeditionMembersFromCompanions(state, companions, { autoParty = true } = {}) {
  assert(Array.isArray(companions), "등록할 원정대 동료 목록이 배열이 아닙니다.");
  const next = cloneState(state);
  validateExpeditionState(next.expedition, "save.expedition");
  const existingSourceKeys = new Set(next.expedition.members.map((member) => member.sourceKey));
  const added = [];
  for (const companion of companions) {
    assertObject(companion, "등록할 원정대 동료");
    assert(typeof companion.careerId === "string" && companion.careerId.length > 0, `등록할 원정대 동료 careerId 값이 없습니다: ${companion.id}`);
    const member = createExpeditionMemberFromCompanion(companion, now() + added.length);
    if (existingSourceKeys.has(member.sourceKey)) continue;
    next.expedition.members.push(member);
    existingSourceKeys.add(member.sourceKey);
    added.push(member);
    if (autoParty && next.expedition.partyMemberIds.length < expeditionPartySize) next.expedition.partyMemberIds.push(member.id);
  }
  if (added.length > 0) pushExpeditionLog(next.expedition, `원정대원 ${added.length}명이 등록되었다.`, "good");
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return { state: next, added };
}

export function addDebugExpeditionMembers(state, count, { autoParty = true } = {}) {
  assert(careers.length > 0, "careers.json이 비어 있어 DEBUG 원정대 동료를 추가할 수 없습니다.");
  const additionCount = finiteNumber(count, `DEBUG 원정대 동료 추가 수가 올바르지 않습니다: ${count}`);
  assert(Number.isInteger(additionCount) && additionCount > 0, `DEBUG 원정대 동료 추가 수는 1 이상의 정수여야 합니다: ${count}`);
  const next = cloneState(state);
  validateExpeditionState(next.expedition, "save.expedition");
  const existingSourceKeys = new Set(next.expedition.members.map((member) => member.sourceKey));
  const existingDebugCount = next.expedition.members.filter((member) => member.sourceKey.startsWith("debug:")).length;
  const createdAt = now();
  const added = [];
  for (let index = 0; index < additionCount; index += 1) {
    const careerIndex = Math.abs(Math.floor(Math.random() * careers.length) + index) % careers.length;
    const member = createDebugExpeditionMember(careers[careerIndex], existingDebugCount + index, createdAt);
    if (existingSourceKeys.has(member.sourceKey)) continue;
    next.expedition.members.push(member);
    existingSourceKeys.add(member.sourceKey);
    added.push(member);
    if (autoParty && next.expedition.partyMemberIds.length < expeditionPartySize) next.expedition.partyMemberIds.push(member.id);
  }
  if (added.length > 0) pushExpeditionLog(next.expedition, `디버그 동료 ${added.length}명이 합류했다.`, "good");
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return { state: next, added };
}

export function normalizeExpeditionState(state) {
  const next = cloneState(state);
  validateExpeditionState(next.expedition, "save.expedition");
  next.expedition = expeditionAliases(next.expedition);
  return next;
}

function memberView(member, stageView, slot = null) {
  const career = careerById.get(member.sourceCareerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${member.sourceCareerId}`);
  assert(typeof career.battleProp === "string" && career.battleProp.length > 0, `careers.json battleProp 값이 없습니다: ${career.id}`);
  const stats = memberCombatStats(member);
  const topSubjects = subjectIds
    .slice()
    .sort((a, b) => stats[b] - stats[a])
    .slice(0, 2);
  return {
    ...member,
    career,
    careerId: member.sourceCareerId,
    careerName: member.careerName,
    slot,
    tierName: promotionName(member.promotionTier),
    nextPromotionId: nextPromotionId(member.promotionTier),
    levelCost: expeditionLevelCost(member),
    power: Math.round(memberPower(member)),
    stagePower: stageView ? Math.round(partyPowerForStage({ ...createDefaultExpeditionState(), members: [member], partyMemberIds: [member.id], currentStage: stageView.globalStage, highestStage: 0, claimedBossStages: [], trainingExp: 0, chapterRun: createChapterRun(stageView.globalStage, 0), lastResolvedAt: now(), log: [], stageIndex: stageView.globalStage - 1, clearedStageCount: 0, lastStageId: null }, stageView)) : Math.round(memberPower(member)),
    battleProp: career.battleProp,
    topSubjectLabels: topSubjects.map((subject) => subjectLabels[subject]),
    topSubjectShortLabels: topSubjects.map((subject) => subjectShortLabels[subject]),
  };
}

export function createExpeditionViewModel(state) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const stage = createStageView(expedition.currentStage);
  const party = partyMembers(expedition).map((member, index) => memberView(member, stage, index + 1));
  const partyPower = Math.round(partyPowerForStage(expedition, stage));
  const enemyPower = requiredPowerForStage(expedition.currentStage);
  const rewardExp = expeditionStageExpReward(expedition.currentStage);
  const rewardMoney = expeditionMoneyReward(expedition.currentStage);
  const bossReward = stage.isChapterBoss ? Math.round(expeditionBalance.chapterBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stage.chapter - 1)) : Math.round(expeditionBalance.midBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stage.chapter - 1));

  return {
    stage,
    stageIndex: expedition.currentStage - 1,
    stageTotal: expeditionBalance.maxStage,
    stageLabel: `${stage.chapter}-${String(stage.segmentInChapter).padStart(2, "0")}`,
    currentStage: expedition.currentStage,
    highestStage: expedition.highestStage,
    progressPercent: stage.progressPercent,
    partyMembers: party,
    partyPower,
    enemyPower,
    rewardExp,
    rewardMoney,
    bossReward,
    bossRewardClaimed: expedition.claimedBossStages.includes(expedition.currentStage),
    ready: party.length > 0,
    canClear: party.length > 0 && partyPower >= enemyPower,
    focusLabels: stage.focusSubjects.map((subject) => subjectLabels[subject]),
    weakLabels: stage.weakSubjects.map((subject) => subjectLabels[subject]),
    resistLabels: stage.resistSubjects.map((subject) => subjectLabels[subject]),
  };
}

function fusionCandidateGroups(expedition) {
  validateExpeditionState(expedition, "save.expedition");
  const partyIds = new Set(expedition.partyMemberIds);
  const groups = new Map();
  for (const member of expedition.members) {
    if (partyIds.has(member.id) || member.locked || !nextPromotionId(member.promotionTier)) continue;
    const key = `${member.sourceCareerId}:${member.promotionTier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(member);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([key, members]) => {
      const [careerId, tier] = key.split(":");
      const nextTier = nextPromotionId(tier);
      const career = careerById.get(careerId);
      assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
      return {
        key,
        careerId,
        careerName: career.name,
        tier,
        tierName: promotionName(tier),
        nextTier,
        nextTierName: promotionName(nextTier),
        eligibleMemberIds: members.map((member) => member.id),
      };
    })
    .sort((a, b) => b.eligibleMemberIds.length - a.eligibleMemberIds.length || a.careerName.localeCompare(b.careerName));
}

export function createExpeditionManagementViewModel(state) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const stage = createStageView(expedition.currentStage);
  const partyIds = new Set(expedition.partyMemberIds);
  const members = expedition.members.map((member, index) => ({ ...memberView(member, stage, partyIds.has(member.id) ? expedition.partyMemberIds.indexOf(member.id) + 1 : null), rosterIndex: index }));
  const party = expedition.partyMemberIds.map((id, index) => {
    const member = expedition.members.find((candidate) => candidate.id === id);
    assert(member, `원정대 편성 동료를 찾을 수 없습니다: ${id}`);
    return memberView(member, stage, index + 1);
  });
  const growthMembers = party;
  const upgradeableCount = growthMembers.filter((member) => expedition.trainingExp >= member.levelCost).length;
  const fusionCandidates = fusionCandidateGroups(expedition);
  const visibleLog = expedition.log.filter((entry, index, list) => index === 0 || entry.text !== list[index - 1].text);
  return {
    stage,
    partySize: expeditionPartySize,
    party,
    partyIds,
    partySlots: Array.from({ length: expeditionPartySize }, (_, index) => (index < party.length ? party[index] : null)),
    members,
    roster: members,
    growthMembers,
    upgradeableCount,
    fusionCandidates,
    trainingExp: expedition.trainingExp,
    log: visibleLog,
    currentStage: expedition.currentStage,
    highestStage: expedition.highestStage,
    partyPower: Math.round(partyPowerForStage(expedition, stage)),
    enemyPower: requiredPowerForStage(expedition.currentStage),
  };
}

export function createExpeditionSummary(state) {
  const view = createExpeditionViewModel(state);
  const expedition = state.expedition;
  validateExpeditionState(expedition, "save.expedition");
  return {
    headerPrefix: `CH.${view.stage.chapter} · 최고 Stage ${expedition.highestStage}`,
    stage: expedition.currentStage,
    partyCount: view.partyMembers.length,
    partySize: expeditionPartySize,
    partyPower: view.partyPower,
    enemyPower: view.enemyPower,
    trainingExp: expedition.trainingExp,
    diamonds: Number(state.diamonds),
  };
}

export function assignExpeditionMember(state, memberId, slotIndex = expeditionPartySize) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const member = expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  if (expedition.partyMemberIds.includes(memberId)) return next;
  const slot = clamp(Math.floor(finiteNumber(slotIndex, "원정대 편성 슬롯 값이 올바르지 않습니다.")), 0, expeditionPartySize - 1);
  if (slot < expedition.partyMemberIds.length) expedition.partyMemberIds[slot] = memberId;
  else {
    assert(expedition.partyMemberIds.length < expeditionPartySize, "원정대 파티가 가득 찼습니다.");
    expedition.partyMemberIds.push(memberId);
  }
  pushExpeditionLog(expedition, `${member.careerName} 동료를 파티에 편성했다.`, "info");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function removeExpeditionMemberFromParty(state, memberId) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const before = expedition.partyMemberIds.length;
  expedition.partyMemberIds = expedition.partyMemberIds.filter((id) => id !== memberId);
  if (expedition.partyMemberIds.length < before) {
    const member = expedition.members.find((candidate) => candidate.id === memberId);
    assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
    pushExpeditionLog(expedition, `${member.careerName}를 파티에서 해제했다.`, "info");
  }
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function levelUpExpeditionMember(state, memberId) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const member = expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  const cost = expeditionLevelCost(member);
  assert(expedition.trainingExp >= cost, `${member.careerName} 성장에 필요한 EXP가 부족합니다.`);
  expedition.trainingExp -= cost;
  member.level += 1;
  pushExpeditionLog(expedition, `${member.careerName} 동료가 Lv.${member.level}로 성장했다. EXP ${cost} 사용.`, "good");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function toggleExpeditionMemberLock(state, memberId) {
  const next = normalizeExpeditionState(state);
  const member = next.expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  member.locked = !member.locked;
  pushExpeditionLog(next.expedition, `${member.careerName} 동료를 ${member.locked ? "잠금" : "잠금 해제"} 처리했다.`, "info");
  next.expedition = expeditionAliases(next.expedition);
  return next;
}

export function fuseExpeditionMembers(state, careerId, promotionTier) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const nextTier = nextPromotionId(promotionTier);
  assert(nextTier, `다음 승급 단계를 찾을 수 없습니다: ${promotionTier}`);
  const partyIds = new Set(expedition.partyMemberIds);
  const candidates = expedition.members
    .filter((member) => member.sourceCareerId === careerId && member.promotionTier === promotionTier && !member.locked && !partyIds.has(member.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  assert(candidates.length >= 2, "합성 가능한 동료가 부족합니다.");
  const consumed = candidates.slice(0, 2);
  const consumedIds = new Set(consumed.map((member) => member.id));
  const baseStats = blankStats();
  for (const subject of subjectIds) baseStats[subject] = Math.round(((consumed[0].baseStats[subject] + consumed[1].baseStats[subject]) / 2) * 10) / 10;
  const createdAt = now();
  const career = careerById.get(careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
  const fused = {
    id: `expedition-fusion-${createdAt}-${careerId}-${promotionTier}`,
    sourceKey: `fusion:${createdAt}:${careerId}:${promotionTier}:${consumed.map((member) => member.id).join("+")}`,
    sourceRunNumber: 0,
    sourceCareerId: careerId,
    careerName: career.name,
    sourceUniversity: "동료 관리",
    level: Math.max(consumed[0].level, consumed[1].level),
    exp: 0,
    promotionTier: nextTier,
    baseStats,
    locked: false,
    createdAt,
    avatarGender: consumed[0].avatarGender,
  };
  expedition.members = expedition.members.filter((member) => !consumedIds.has(member.id));
  expedition.members.push(fused);
  pushExpeditionLog(expedition, `${fused.careerName} ${promotionName(promotionTier)} 2명을 ${promotionName(nextTier)} 1명으로 합성했다.`, "good");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function completeExpeditionStage(state) {
  const next = normalizeExpeditionState(state);
  const view = createExpeditionViewModel(next);
  assert(view.ready, "원정대에 편성된 동료가 없어 Stage를 돌파할 수 없습니다.");

  const expedition = next.expedition;
  const currentStage = expedition.currentStage;
  if (!view.canClear) {
    const retryStage = view.stage.isBoss ? stageStartForBoss(currentStage) : currentStage;
    expedition.currentStage = retryStage;
    expedition.lastResolvedAt = now();
    expedition.chapterRun = createChapterRun(retryStage, expedition.chapterRun.tempExp);
    pushExpeditionLog(expedition, `${currentStage} Stage ${view.stage.enemyName} 돌파 실패: 전투력 부족`, "warn");
    next.expedition = expeditionAliases(expedition, view.stage.id);
    validateExpeditionState(next.expedition, "save.expedition");
    return next;
  }

  const nextStage = clamp(currentStage + 1, 1, expeditionBalance.maxStage);
  next.money = finiteNumber(next.money, "save.money 값이 올바르지 않습니다.") + view.rewardMoney;
  expedition.trainingExp += view.rewardExp;
  expedition.chapterRun = createChapterRun(nextStage, view.stage.isChapterBoss ? 0 : expedition.chapterRun.tempExp + view.rewardExp);
  expedition.currentStage = nextStage;
  expedition.highestStage = Math.max(expedition.highestStage, currentStage);
  expedition.lastResolvedAt = now();
  if (view.stage.isBoss && !expedition.claimedBossStages.includes(currentStage)) {
    expedition.claimedBossStages.push(currentStage);
    next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + view.bossReward;
  }
  pushExpeditionLog(expedition, `${currentStage} Stage ${view.stage.enemyName} 돌파: EXP ${view.rewardExp} 획득`, "good");
  next.expedition = expeditionAliases(expedition, view.stage.id);
  const funded = grantRealEstateExpeditionStageReward(next, view.stage);
  pushExpeditionLog(funded.state.expedition, `부동산 자금 ${funded.reward} 획득`, "good");
  validateExpeditionState(funded.state.expedition, "save.expedition");
  return funded.state;
}
