import { courseBandForCurrent, courseLabelForCurrent, resolveGradeVisual } from "./grades.js";
import { educationPointMultiplier } from "./education.js";
import { activeLearningHelpers, helperPower } from "./companions.js";
import { createDefaultExpeditionState, migrateLegacyExpeditionState, validateExpeditionState } from "./expedition.js";
import { createDefaultRealEstateState, normalizeRealEstateState, validateRealEstateState } from "./realEstate.js";

export const SAVE_KEY = "student-idle-rpg-save-v1";
export const SAVE_SCHEMA_VERSION = 3;
export const CONTENT_REVISION = "lzg40t";

const defaultWeights = {
  korean: 100,
  english: 100,
  math: 100,
  social: 100,
  science: 100,
};

const defaultStats = {
  korean: 0,
  english: 0,
  math: 0,
  social: 0,
  science: 0,
};

const subjectDisplayBaseStats = {
  korean: 45,
  english: 42,
  math: 44,
  social: 41,
  science: 43,
};

const subjectDisplayOrder = [
  { id: "korean", label: "국어" },
  { id: "english", label: "영어" },
  { id: "math", label: "수학" },
  { id: "social", label: "사회" },
  { id: "science", label: "과학" },
];

function visibleSubjectDisplayOrder(current = {}) {
  const phase = resolveGradeVisual(current).phase;
  if (phase === "elementary") return subjectDisplayOrder.slice(0, 3);
  return subjectDisplayOrder;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, path) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${path} 데이터가 객체가 아닙니다.`);
  return value;
}

function assertArray(value, path) {
  assert(Array.isArray(value), `${path} 데이터가 배열이 아닙니다.`);
  return value;
}

function assertNumber(value, path) {
  assert(Number.isFinite(Number(value)), `${path} 값이 숫자가 아닙니다.`);
}

function assertBoolean(value, path) {
  assert(typeof value === "boolean", `${path} 값이 boolean이 아닙니다.`);
}

function assertString(value, path) {
  assert(typeof value === "string" && value.length > 0, `${path} 값이 문자열이 아닙니다.`);
}

function validateSubjectNumberMap(map, path) {
  assertObject(map, path);
  for (const subject of Object.keys(defaultStats)) assertNumber(map[subject], `${path}.${subject}`);
}

function validateStudyAllocationWeights(map, path) {
  assertObject(map, path);
  for (const subject of Object.keys(defaultWeights)) assertNumber(map[subject], `${path}.${subject}`);
}

function validateSparseNumberMap(map, path) {
  assertObject(map, path);
  for (const [key, value] of Object.entries(map)) {
    assertString(key, `${path} 키`);
    assertNumber(value, `${path}.${key}`);
  }
}

function sparseNumberOrZero(map, key, path) {
  if (!Object.prototype.hasOwnProperty.call(map, key)) return 0;
  const value = Number(map[key]);
  assert(Number.isFinite(value), `${path}.${key} 값이 숫자가 아닙니다.`);
  return value;
}

function validateBattleEnemy(enemy, path) {
  assertObject(enemy, path);
  assertString(enemy.id, `${path}.id`);
  assertString(enemy.label, `${path}.label`);
  assert(["normal", "boss", "suneung"].includes(enemy.kind), `${path}.kind 값이 올바르지 않습니다: ${enemy.kind}`);
  assertNumber(enemy.month, `${path}.month`);
  assertArray(enemy.subjects, `${path}.subjects`);
  for (const [index, subject] of enemy.subjects.entries()) assertString(subject, `${path}.subjects[${index}]`);
  if (enemy.kind === "boss") assertString(enemy.visualKey, `${path}.visualKey`);
  assertNumber(enemy.weight, `${path}.weight`);
  assertNumber(enemy.maxHp, `${path}.maxHp`);
  assertNumber(enemy.remainingHp, `${path}.remainingHp`);
  assertNumber(enemy.studyPointReward, `${path}.studyPointReward`);
  assertBoolean(enemy.rewardClaimed, `${path}.rewardClaimed`);
}

function validateBattleState(battle, path) {
  assertObject(battle, path);
  assertString(battle.gradeId, `${path}.gradeId`);
  assertNumber(battle.gradeOrder, `${path}.gradeOrder`);
  assert(["grade", "suneung"].includes(battle.kind), `${path}.kind 값이 올바르지 않습니다: ${battle.kind}`);
  assert(["school", "suneung"].includes(battle.roadMode), `${path}.roadMode 값이 올바르지 않습니다: ${battle.roadMode}`);
  assertNumber(battle.encounterIndex, `${path}.encounterIndex`);
  assertNumber(battle.encounterTotal, `${path}.encounterTotal`);
  assert(Number(battle.encounterTotal) > 0, `${path}.encounterTotal 값은 1 이상이어야 합니다.`);
  assertString(battle.encounterId, `${path}.encounterId`);
  assertString(battle.encounterLabel, `${path}.encounterLabel`);
  const roadTiming = assertObject(battle.roadTiming, `${path}.roadTiming`);
  assertNumber(roadTiming.travelMs, `${path}.roadTiming.travelMs`);
  assertNumber(roadTiming.approachMs, `${path}.roadTiming.approachMs`);
  const roadCamera = assertObject(battle.roadCamera, `${path}.roadCamera`);
  assertNumber(roadCamera.parallaxDistancePx, `${path}.roadCamera.parallaxDistancePx`);
  if (battle.kind === "grade") assertArray(battle.monthRange, `${path}.monthRange`);
  assertNumber(battle.elapsedMs, `${path}.elapsedMs`);
  assertNumber(battle.maxDurationMs, `${path}.maxDurationMs`);
  assertBoolean(battle.finished, `${path}.finished`);
  assertArray(battle.enemies, `${path}.enemies`);
  assert(battle.enemies.length > 0, `${path}.enemies 데이터가 비어 있습니다.`);
  battle.enemies.forEach((enemy, index) => validateBattleEnemy(enemy, `${path}.enemies[${index}]`));
}

function validateAdmission(admission, path) {
  assertObject(admission, path);
  assertString(admission.universityId, `${path}.universityId`);
  assertString(admission.name, `${path}.name`);
  assertNumber(admission.gameRank, `${path}.gameRank`);
  assertNumber(admission.adjustedScore, `${path}.adjustedScore`);
  assertNumber(admission.adjustedRank, `${path}.adjustedRank`);
  assertNumber(admission.minScore, `${path}.minScore`);
  assertNumber(admission.minNationalRank, `${path}.minNationalRank`);
  assertNumber(admission.prestige, `${path}.prestige`);
  assertString(admission.trackBias, `${path}.trackBias`);
  assertString(admission.line, `${path}.line`);
}

function validateCareerCandidate(candidate, path) {
  assertObject(candidate, path);
  assert(["male", "female"].includes(candidate.avatarGender), `${path}.avatarGender 값이 올바르지 않습니다: ${candidate.avatarGender}`);
  assertString(candidate.careerId, `${path}.careerId`);
  assertString(candidate.name, `${path}.name`);
  assertNumber(candidate.tier, `${path}.tier`);
  assertNumber(candidate.choiceRank, `${path}.choiceRank`);
  assertString(candidate.choiceBand, `${path}.choiceBand`);
  assertNumber(candidate.minPrestige, `${path}.minPrestige`);
  assertNumber(candidate.incomePerMinute, `${path}.incomePerMinute`);
  assertNumber(candidate.powerMultiplier, `${path}.powerMultiplier`);
  assertNumber(candidate.score, `${path}.score`);
  assertBoolean(candidate.selectable, `${path}.selectable`);
  assert(typeof candidate.lockedReason === "string", `${path}.lockedReason 값이 문자열이 아닙니다.`);
}

function validateOutcome(outcome, path) {
  assertObject(outcome, path);
  assert(["male", "female"].includes(outcome.avatarGender), `${path}.avatarGender 값이 올바르지 않습니다: ${outcome.avatarGender}`);
  assertNumber(outcome.suneungScore, `${path}.suneungScore`);
  assertNumber(outcome.suneungRank, `${path}.suneungRank`);
  assertObject(outcome.suneungReport, `${path}.suneungReport`);
  assertArray(outcome.suneungReport.subjects, `${path}.suneungReport.subjects`);
  assertArray(outcome.admissions, `${path}.admissions`);
  assert(outcome.admissions.length > 0, `${path}.admissions 데이터가 비어 있습니다.`);
  outcome.admissions.forEach((admission, index) => validateAdmission(admission, `${path}.admissions[${index}]`));
  assertArray(outcome.careerCandidates, `${path}.careerCandidates`);
  assert(outcome.careerCandidates.length > 0, `${path}.careerCandidates 데이터가 비어 있습니다.`);
  outcome.careerCandidates.forEach((candidate, index) => validateCareerCandidate(candidate, `${path}.careerCandidates[${index}]`));
  assertNumber(outcome.careerSelectableCount, `${path}.careerSelectableCount`);
  const selectableCount = outcome.careerCandidates.filter((candidate) => candidate.selectable).length;
  assert(Number(outcome.careerSelectableCount) === selectableCount, `${path}.careerSelectableCount 값이 후보 목록과 일치하지 않습니다.`);
  assertBoolean(outcome.forcedArchiveAvailable, `${path}.forcedArchiveAvailable`);
}

function validateRoadState(road, path) {
  assertObject(road, path);
  assert(["school", "suneung"].includes(road.mode), `${path}.mode 값이 올바르지 않습니다: ${road.mode}`);
  assertString(road.phase, `${path}.phase`);
  assertNumber(road.encounterIndex, `${path}.encounterIndex`);
  assertNumber(road.encounterTotal, `${path}.encounterTotal`);
  assert(Number(road.encounterTotal) > 0, `${path}.encounterTotal 값은 1 이상이어야 합니다.`);
  assertNumber(road.phaseStartedAt, `${path}.phaseStartedAt`);
  assert(road.lastCompletedEncounterId === null || typeof road.lastCompletedEncounterId === "string", `${path}.lastCompletedEncounterId 값이 올바르지 않습니다.`);
}

function validateCurrentState(current, path) {
  assertObject(current, path);
  assertString(current.gradeId, `${path}.gradeId`);
  assert(["male", "female"].includes(current.avatarGender), `${path}.avatarGender 값이 올바르지 않습니다: ${current.avatarGender}`);
  assertNumber(current.retakeCount, `${path}.retakeCount`);
  validateRoadState(current.road, `${path}.road`);
  assertNumber(current.monthIndex, `${path}.monthIndex`);
  assertNumber(current.waveProgressMs, `${path}.waveProgressMs`);
  assertNumber(current.waveRewardClaimedSteps, `${path}.waveRewardClaimedSteps`);
  assertNumber(current.unspentStudyPoints, `${path}.unspentStudyPoints`);
  assertNumber(current.totalStudyPoints, `${path}.totalStudyPoints`);
  validateSparseNumberMap(current.studyLevels, `${path}.studyLevels`);
  validateSubjectNumberMap(current.aptitude, `${path}.aptitude`);
  validateSparseNumberMap(current.educationLevels, `${path}.educationLevels`);
  assertBoolean(current.autoAllocateStudy, `${path}.autoAllocateStudy`);
  validateStudyAllocationWeights(current.studyAllocationWeights, `${path}.studyAllocationWeights`);
  assertBoolean(current.studyAllocationAdjusted, `${path}.studyAllocationAdjusted`);
  assertBoolean(current.pauseBeforeGate, `${path}.pauseBeforeGate`);
  assertBoolean(current.pausedAtGate, `${path}.pausedAtGate`);
  assertNumber(current.lastWaveKills, `${path}.lastWaveKills`);
  assertNumber(current.totalKills, `${path}.totalKills`);
  assertNumber(current.examIndex, `${path}.examIndex`);
  validateSubjectNumberMap(current.stats, `${path}.stats`);
  assertString(current.track, `${path}.track`);
  assertBoolean(current.trackLocked, `${path}.trackLocked`);
  assertArray(current.examResults, `${path}.examResults`);
  assertBoolean(current.awaitingDecision, `${path}.awaitingDecision`);
  const hasBattle = Object.prototype.hasOwnProperty.call(current, "battle") && current.battle !== undefined;
  if (hasBattle) validateBattleState(current.battle, `${path}.battle`);
  if (current.awaitingDecision) {
    assert(hasBattle, `${path}.battle 데이터가 없습니다. 결과 대기 상태는 완료된 전투를 보존해야 합니다.`);
    validateOutcome(current.outcome, `${path}.outcome`);
  } else {
    assert(current.outcome === null, `${path}.outcome 값은 결과 대기 상태가 아닐 때 null이어야 합니다.`);
  }
}

export function validateGameState(state) {
  assertObject(state, "save");
  assert(state.schemaVersion === SAVE_SCHEMA_VERSION, `지원하지 않는 저장 버전입니다: ${String(state.schemaVersion)}`);
  if (Object.prototype.hasOwnProperty.call(state, "contentRevision")) {
    assert(state.contentRevision === undefined || typeof state.contentRevision === "string", "save.contentRevision 값이 문자열이 아닙니다.");
  }
  assertNumber(state.runNumber, "save.runNumber");
  assertNumber(state.money, "save.money");
  assertNumber(state.diamonds, "save.diamonds");
  assertNumber(state.workSlots, "save.workSlots");
  assertNumber(state.lastIncomeAt, "save.lastIncomeAt");
  validateCurrentState(state.current, "save.current");
  assertArray(state.companions, "save.companions");
  validateExpeditionState(state.expedition, "save.expedition");
  validateRealEstateState(state.realEstate, "save.realEstate");
  assertArray(state.archive, "save.archive");
  assertArray(state.history, "save.history");
  assertArray(state.log, "save.log");
}

export function createDefaultGameState() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentRevision: CONTENT_REVISION,
    runNumber: 1,
    money: 1200,
    diamonds: 0,
    workSlots: 5,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "E1",
      avatarGender: "male",
      retakeCount: 0,
      road: {
        mode: "school",
        phase: "travel",
        encounterIndex: 0,
        encounterTotal: 4,
        phaseStartedAt: 0,
        lastCompletedEncounterId: null,
      },
      monthIndex: 0,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 0,
      studyLevels: {},
      aptitude: { ...defaultStats },
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { ...defaultWeights },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: { ...defaultStats },
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
    },
    companions: [],
    expedition: createDefaultExpeditionState(),
    realEstate: createDefaultRealEstateState(),
    archive: [],
    history: [],
    log: [],
  };
}

export function loadGameState(storage = globalThis.localStorage) {
  if (!storage) {
    return { state: null, source: "unavailable", error: "localStorage를 사용할 수 없습니다.", fatal: true };
  }

  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { state: createDefaultGameState(), source: "default", error: null, fatal: false };

  try {
    const parsed = JSON.parse(raw);
    return { state: normalizeGameState(parsed), source: "localStorage", error: null };
  } catch (error) {
    return { state: null, source: "invalid", error: error instanceof Error ? error.message : String(error), fatal: true };
  }
}

export function saveGameState(state, storage = globalThis.localStorage) {
  if (!storage) throw new Error("localStorage를 사용할 수 없습니다.");
  validateGameState(state);
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

function migrateGameState(state) {
  assertObject(state, "save");
  if (state.schemaVersion === SAVE_SCHEMA_VERSION) return state;
  if (state.schemaVersion === 1) {
    assertArray(state.companions, "save.companions");
    return {
      ...state,
      schemaVersion: SAVE_SCHEMA_VERSION,
      expedition: migrateLegacyExpeditionState(state.expedition, state.companions),
      realEstate: createDefaultRealEstateState(),
    };
  }
  if (state.schemaVersion === 2) {
    return {
      ...state,
      schemaVersion: SAVE_SCHEMA_VERSION,
      realEstate: createDefaultRealEstateState(),
    };
  }
  throw new Error(`지원하지 않는 저장 버전입니다: ${String(state.schemaVersion)}`);
}

export function normalizeGameState(state) {
  const migrated = migrateGameState(state);
  validateGameState(migrated);
  const current = migrated.current;
  const hasContentRevision = Object.prototype.hasOwnProperty.call(migrated, "contentRevision");
  return {
    ...migrated,
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentRevision: hasContentRevision && typeof migrated.contentRevision === "string" ? migrated.contentRevision : undefined,
    current: {
      ...current,
      studyLevels: { ...current.studyLevels },
      aptitude: { ...current.aptitude },
      educationLevels: { ...current.educationLevels },
      studyAllocationWeights: { ...current.studyAllocationWeights },
      road: { ...current.road },
      stats: { ...current.stats },
      examResults: current.examResults,
    },
    companions: migrated.companions,
    expedition: {
      ...migrated.expedition,
      members: migrated.expedition.members.map((member) => ({
        ...member,
        baseStats: { ...member.baseStats },
      })),
      partyMemberIds: [...migrated.expedition.partyMemberIds],
      claimedBossStages: [...migrated.expedition.claimedBossStages],
      chapterRun: { ...migrated.expedition.chapterRun },
      log: migrated.expedition.log.map((entry) => ({ ...entry })),
    },
    realEstate: normalizeRealEstateState(migrated.realEstate),
    archive: migrated.archive,
    history: migrated.history,
    log: migrated.log,
  };
}

export function summarizeGameState(state) {
  validateGameState(state);
  const current = state.current;
  const retakeCount = Number(current.retakeCount);
  const grade = resolveGradeVisual(current);
  const activeHelpers = activeLearningHelpers(state);
  const totalCompanionPower = activeHelpers.reduce((sum, companion) => sum + helperPower(companion), 0);
  const koreanLevel = sparseNumberOrZero(current.studyLevels, "korean", "save.current.studyLevels");
  const displayStat = (subjectId) => {
    const stat = Number(current.stats[subjectId]);
    return stat === 0 ? subjectDisplayBaseStats[subjectId] : stat;
  };

  return {
    runNumber: Number(state.runNumber),
    courseLabel: courseLabelForCurrent(current),
    courseBand: courseBandForCurrent(current),
    age: retakeCount > 0 ? 19 + retakeCount : grade.age,
    avatarGender: current.avatarGender,
    money: Number(state.money),
    diamonds: Number(state.diamonds),
    unspentStudyPoints: Number(current.unspentStudyPoints),
    totalStudyPoints: Number(current.totalStudyPoints),
    totalKills: Number(current.totalKills),
    helperCount: activeHelpers.length,
    activeHelpers,
    helperPower: totalCompanionPower,
    educationMultiplier: educationPointMultiplier(state),
    nextStudyGain: 1 + Math.floor(koreanLevel / 4),
    allocationWeights: { ...current.studyAllocationWeights },
    autoAllocateStudy: current.autoAllocateStudy,
    koreanLevel,
    koreanStat: displayStat("korean"),
    koreanAptitude: Number(current.aptitude.korean),
    subjectStats: visibleSubjectDisplayOrder(current).map((subject) => ({
      id: subject.id,
      label: subject.label,
      level: sparseNumberOrZero(current.studyLevels, subject.id, "save.current.studyLevels"),
      stat: displayStat(subject.id),
      aptitude: Number(current.aptitude[subject.id]),
    })),
  };
}
