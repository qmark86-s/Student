import { courseBandForCurrent, courseLabelForCurrent, resolveGradeVisual } from "./grades.js";
import battleRoadConfig from "../../../data/battle_road_config.json";
import careers from "../../../data/careers.json";
import studentProgression from "../../../data/student_progression_balance.json";
import { educationPointMultiplier } from "./education.js";
import { normalizeCareerAlumniList } from "./companions.js";
import {
  createDefaultEquipmentState,
  equippedEquipment,
  equippedEquipmentPower,
  isLegacyStudentHelper,
  legacyStudentHelperToEquipment,
  normalizeEquipmentState,
  validateEquipmentState,
} from "./equipment.js";
import { createDefaultExpeditionState, migrateLegacyExpeditionState, normalizeExpeditionState, validateExpeditionState } from "./expedition.js";
import { createDefaultRealEstateState, normalizeRealEstateState, validateRealEstateState } from "./realEstate.js";

export const SAVE_KEY = "student-idle-rpg-save-v1";
export const SAVE_SCHEMA_VERSION = 6;
export const CONTENT_REVISION = "expdispatchv1";

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
const careerById = new Map(careers.map((career) => [career.id, career]));
const maxBattleDurationMs = Number(studentProgression.balance.maxBattleDurationMs);

function visibleSubjectDisplayOrder(current = {}) {
  const phase = resolveGradeVisual(current).phase;
  if (phase === "elementary") return subjectDisplayOrder.slice(0, 3);
  return subjectDisplayOrder;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
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
  assertArray(state.careerAlumni, "save.careerAlumni");
  validateEquipmentState(state.equipment, "save.equipment");
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
    careerAlumni: [],
    equipment: createDefaultEquipmentState(),
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

function valueOrDefault(source, key, defaultValue) {
  return hasOwn(source, key) ? source[key] : defaultValue;
}

function objectOrDefault(source, key, defaultValue) {
  if (!hasOwn(source, key)) return { ...defaultValue };
  const value = source[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return { ...defaultValue, ...value };
}

function arrayOrDefault(source, key) {
  return hasOwn(source, key) ? source[key] : [];
}

function validGender(value, defaultGender = "male") {
  if (value === "female") return "female";
  if (value === "male") return "male";
  return defaultGender;
}

function battleRoadEncounterCount(mode) {
  const table = mode === "suneung" ? battleRoadConfig.suneung.encounters : battleRoadConfig.schoolYear.encounters;
  assert(Array.isArray(table) && table.length > 0, `Battle Road ${mode} 조우 데이터가 비어 있습니다.`);
  return table.length;
}

function legacyRoadState(current, defaultCurrent) {
  const rawRoad = current.road;
  if (hasOwn(current, "road") && (!rawRoad || typeof rawRoad !== "object" || Array.isArray(rawRoad))) return rawRoad;
  const hasRoad = rawRoad && typeof rawRoad === "object" && !Array.isArray(rawRoad);
  const battle = current.battle && typeof current.battle === "object" && !Array.isArray(current.battle) ? current.battle : {};
  const requestedMode =
    current.awaitingDecision === true || current.gradeId === "H3" || battle.kind === "suneung" || (hasRoad && rawRoad.mode === "suneung")
      ? "suneung"
      : "school";
  const total = battleRoadEncounterCount(requestedMode);
  const decisionIndex = current.awaitingDecision === true && requestedMode === "suneung" ? total - 1 : 0;
  const encounterIndex = hasRoad && hasOwn(rawRoad, "encounterIndex")
    ? rawRoad.encounterIndex
    : hasOwn(battle, "encounterIndex")
      ? battle.encounterIndex
      : decisionIndex;
  return {
    mode: requestedMode,
    phase: hasRoad && hasOwn(rawRoad, "phase") ? rawRoad.phase : defaultCurrent.road.phase,
    encounterIndex,
    encounterTotal: total,
    phaseStartedAt: hasRoad && hasOwn(rawRoad, "phaseStartedAt") ? rawRoad.phaseStartedAt : defaultCurrent.road.phaseStartedAt,
    lastCompletedEncounterId: hasRoad && hasOwn(rawRoad, "lastCompletedEncounterId") ? rawRoad.lastCompletedEncounterId : null,
  };
}

function legacyDecisionBattle(current) {
  const encounters = battleRoadConfig.suneung.encounters;
  assert(Array.isArray(encounters) && encounters.length > 0, "Battle Road 수능 조우 데이터가 비어 있습니다.");
  const encounterIndex = encounters.length - 1;
  const encounter = encounters[encounterIndex];
  assert(encounter && typeof encounter === "object", "Battle Road 수능 최종 조우 데이터가 객체가 아닙니다.");
  assert(Array.isArray(encounter.enemies) && encounter.enemies.length > 0, "Battle Road 수능 최종 조우 적 데이터가 비어 있습니다.");
  const gradeVisual = resolveGradeVisual(current);
  return {
    gradeId: current.gradeId,
    gradeOrder: gradeVisual.order,
    kind: "suneung",
    roadMode: "suneung",
    encounterIndex,
    encounterTotal: encounters.length,
    encounterId: encounter.id,
    encounterLabel: encounter.label,
    roadTiming: { ...battleRoadConfig.timing },
    roadCamera: { ...battleRoadConfig.camera },
    elapsedMs: maxBattleDurationMs,
    maxDurationMs: maxBattleDurationMs,
    finished: true,
    enemies: encounter.enemies.map((enemy) => ({
      id: `legacy-suneung-${enemy.id}`,
      label: enemy.label,
      kind: "suneung",
      month: enemy.visualMonth,
      subjects: Array.isArray(enemy.subjects) ? [...enemy.subjects] : enemy.subjects,
      weight: 1,
      maxHp: 1,
      remainingHp: 0,
      studyPointReward: 0,
      rewardClaimed: true,
    })),
  };
}

function legacyCareerCandidate(candidate, gender) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return candidate;
  const career = typeof candidate.careerId === "string" ? careerById.get(candidate.careerId) : null;
  return {
    ...candidate,
    avatarGender: validGender(candidate.avatarGender, gender),
    name: typeof candidate.name === "string" && candidate.name.length > 0 ? candidate.name : career ? career.name : undefined,
    tier: hasOwn(candidate, "tier") ? candidate.tier : career ? career.tier : undefined,
    choiceRank: hasOwn(candidate, "choiceRank") ? candidate.choiceRank : career ? career.choiceRank : undefined,
    choiceBand: typeof candidate.choiceBand === "string" && candidate.choiceBand.length > 0 ? candidate.choiceBand : career ? career.choiceBand : undefined,
    minPrestige: hasOwn(candidate, "minPrestige") ? candidate.minPrestige : career ? career.minPrestige : undefined,
    incomePerMinute: hasOwn(candidate, "incomePerMinute") ? candidate.incomePerMinute : career ? career.baseIncomePerMinute : undefined,
    powerMultiplier: hasOwn(candidate, "powerMultiplier") ? candidate.powerMultiplier : career ? career.powerMultiplier : undefined,
    score: hasOwn(candidate, "score") ? candidate.score : 0,
    selectable: typeof candidate.selectable === "boolean" ? candidate.selectable : false,
    lockedReason: typeof candidate.lockedReason === "string" ? candidate.lockedReason : "",
  };
}

function legacyOutcome(outcome, gender) {
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) return outcome;
  const careerCandidates = Array.isArray(outcome.careerCandidates)
    ? outcome.careerCandidates.map((candidate) => legacyCareerCandidate(candidate, gender))
    : outcome.careerCandidates;
  const selectableCount = Array.isArray(careerCandidates) ? careerCandidates.filter((candidate) => candidate && candidate.selectable === true).length : 0;
  return {
    ...outcome,
    avatarGender: validGender(outcome.avatarGender, gender),
    careerCandidates,
    careerSelectableCount: hasOwn(outcome, "careerSelectableCount") ? outcome.careerSelectableCount : selectableCount,
    forcedArchiveAvailable: hasOwn(outcome, "forcedArchiveAvailable") ? outcome.forcedArchiveAvailable : false,
  };
}

function legacyCurrentState(current) {
  if (!current || typeof current !== "object" || Array.isArray(current)) return current;
  const defaultCurrent = createDefaultGameState().current;
  const gender = validGender(current.avatarGender, defaultCurrent.avatarGender);
  const next = {
    ...defaultCurrent,
    ...current,
    avatarGender: gender,
    retakeCount: valueOrDefault(current, "retakeCount", defaultCurrent.retakeCount),
    road: legacyRoadState(current, defaultCurrent),
    studyLevels: objectOrDefault(current, "studyLevels", defaultCurrent.studyLevels),
    aptitude: objectOrDefault(current, "aptitude", defaultCurrent.aptitude),
    educationLevels: objectOrDefault(current, "educationLevels", defaultCurrent.educationLevels),
    studyAllocationWeights: objectOrDefault(current, "studyAllocationWeights", defaultCurrent.studyAllocationWeights),
    stats: objectOrDefault(current, "stats", defaultCurrent.stats),
    examResults: arrayOrDefault(current, "examResults"),
    outcome: current.awaitingDecision === true ? legacyOutcome(current.outcome, gender) : null,
  };
  if (current.awaitingDecision === true) {
    next.battle = legacyDecisionBattle(next);
  } else {
    next.battle = undefined;
  }
  return next;
}

function legacyTopLevelState(state) {
  const defaults = createDefaultGameState();
  const createdAt = Number.isFinite(Number(state.lastIncomeAt)) ? Number(state.lastIncomeAt) : Date.now();
  return {
    ...defaults,
    ...state,
    runNumber: valueOrDefault(state, "runNumber", defaults.runNumber),
    money: valueOrDefault(state, "money", defaults.money),
    diamonds: valueOrDefault(state, "diamonds", defaults.diamonds),
    workSlots: valueOrDefault(state, "workSlots", defaults.workSlots),
    lastIncomeAt: valueOrDefault(state, "lastIncomeAt", defaults.lastIncomeAt),
    current: legacyCurrentState(state.current),
    expedition: state.expedition && typeof state.expedition === "object" && !Array.isArray(state.expedition)
      ? state.expedition
      : createDefaultExpeditionState(createdAt),
    realEstate: state.realEstate && typeof state.realEstate === "object" && !Array.isArray(state.realEstate)
      ? state.realEstate
      : createDefaultRealEstateState(createdAt),
    archive: arrayOrDefault(state, "archive"),
    history: arrayOrDefault(state, "history"),
    log: arrayOrDefault(state, "log"),
  };
}

function migrateGameState(state) {
  assertObject(state, "save");
  const migrateLegacyPeopleAndEquipment = (source) => {
    const legacyPeople = Array.isArray(source.companions) ? source.companions : Array.isArray(source.careerAlumni) ? source.careerAlumni : [];
    const legacyEquipment = legacyPeople.filter((item) => isLegacyStudentHelper(item)).map((item, index) => legacyStudentHelperToEquipment(item, index));
    const careerAlumni = normalizeCareerAlumniList(legacyPeople.filter((item) => !isLegacyStudentHelper(item)));
    const currentEquipment = source.equipment && typeof source.equipment === "object" ? source.equipment : createDefaultEquipmentState();
    const equipment = normalizeEquipmentState({
      inventory: [...(Array.isArray(currentEquipment.inventory) ? currentEquipment.inventory : []), ...legacyEquipment],
      equipped: currentEquipment.equipped || {},
    });
    return { careerAlumni, equipment };
  };
  if (state.schemaVersion === SAVE_SCHEMA_VERSION) {
    if (Array.isArray(state.careerAlumni) && state.equipment) return state;
    const migratedLegacy = migrateLegacyPeopleAndEquipment(state);
    return {
      ...state,
      careerAlumni: migratedLegacy.careerAlumni,
      equipment: migratedLegacy.equipment,
    };
  }
  if (state.schemaVersion === 1) {
    const legacy = legacyTopLevelState(state);
    const migratedLegacy = migrateLegacyPeopleAndEquipment(legacy);
    return {
      ...legacy,
      schemaVersion: SAVE_SCHEMA_VERSION,
      careerAlumni: migratedLegacy.careerAlumni,
      equipment: migratedLegacy.equipment,
      expedition: state.expedition && typeof state.expedition === "object" && !Array.isArray(state.expedition)
        ? migrateLegacyExpeditionState(legacy.expedition, migratedLegacy.careerAlumni)
        : legacy.expedition,
      realEstate: state.realEstate && typeof state.realEstate === "object" && !Array.isArray(state.realEstate)
        ? normalizeRealEstateState(legacy.realEstate)
        : legacy.realEstate,
    };
  }
  if (state.schemaVersion === 2) {
    const legacy = legacyTopLevelState(state);
    const migratedLegacy = migrateLegacyPeopleAndEquipment(legacy);
    return {
      ...legacy,
      schemaVersion: SAVE_SCHEMA_VERSION,
      careerAlumni: migratedLegacy.careerAlumni,
      equipment: migratedLegacy.equipment,
      expedition: state.expedition && typeof state.expedition === "object" && !Array.isArray(state.expedition)
        ? migrateLegacyExpeditionState(legacy.expedition, migratedLegacy.careerAlumni)
        : legacy.expedition,
      realEstate: state.realEstate && typeof state.realEstate === "object" && !Array.isArray(state.realEstate)
        ? normalizeRealEstateState(legacy.realEstate)
        : legacy.realEstate,
    };
  }
  if (state.schemaVersion === 3 || state.schemaVersion === 4 || state.schemaVersion === 5) {
    const legacy = legacyTopLevelState(state);
    const migratedLegacy = migrateLegacyPeopleAndEquipment(legacy);
    return {
      ...legacy,
      schemaVersion: SAVE_SCHEMA_VERSION,
      careerAlumni: migratedLegacy.careerAlumni,
      equipment: migratedLegacy.equipment,
      expedition: state.expedition && typeof state.expedition === "object" && !Array.isArray(state.expedition)
        ? migrateLegacyExpeditionState(legacy.expedition, migratedLegacy.careerAlumni)
        : legacy.expedition,
      realEstate: state.realEstate && typeof state.realEstate === "object" && !Array.isArray(state.realEstate)
        ? normalizeRealEstateState(legacy.realEstate)
        : legacy.realEstate,
    };
  }
  throw new Error(`지원하지 않는 저장 버전입니다: ${String(state.schemaVersion)}`);
}

export function normalizeGameState(state) {
  const migratedRaw = migrateGameState(state);
  const migrated = {
    ...migratedRaw,
    expedition: normalizeExpeditionState(migratedRaw).expedition,
  };
  validateGameState(migrated);
  const current = migrated.current;
  const hasContentRevision = Object.prototype.hasOwnProperty.call(migrated, "contentRevision");
  const { companions: _legacyCompanions, ...stateWithoutLegacyCompanions } = migrated;
  return {
    ...stateWithoutLegacyCompanions,
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
    careerAlumni: normalizeCareerAlumniList(migrated.careerAlumni),
    equipment: normalizeEquipmentState(migrated.equipment),
    expedition: {
      ...migrated.expedition,
      members: migrated.expedition.members.map((member) => ({
        ...member,
        baseStats: { ...member.baseStats },
      })),
      partyMemberIds: [...migrated.expedition.partyMemberIds],
      claimedBossStages: [...migrated.expedition.claimedBossStages],
      chapterRun: { ...migrated.expedition.chapterRun },
      pendingReward: {
        ...migrated.expedition.pendingReward,
        lastBattle: migrated.expedition.pendingReward.lastBattle
          ? {
              ...migrated.expedition.pendingReward.lastBattle,
              events: migrated.expedition.pendingReward.lastBattle.events.map((event) => ({ ...event })),
            }
          : null,
      },
      dispatch: {
        assignments: migrated.expedition.dispatch.assignments.map((assignment) => ({
          ...assignment,
          memberIds: [...assignment.memberIds],
        })),
        history: migrated.expedition.dispatch.history.map((entry) => ({
          ...entry,
          memberIds: [...entry.memberIds],
          rewards: { ...entry.rewards },
        })),
      },
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
  const equippedItems = equippedEquipment(state);
  const totalEquipmentPower = equippedEquipmentPower(state);
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
    equipmentCount: equippedItems.filter(Boolean).length,
    equippedItems,
    equipmentPower: totalEquipmentPower,
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
