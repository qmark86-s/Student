import battleRoadConfig from "../../../data/battle_road_config.json";
import careerCollectionData from "../../../data/career_collection_effects.json";
import careers from "../../../data/careers.json";
import curriculumAttackVfx from "../../../data/curriculum_attack_vfx.json";
import growthLevels from "../../../data/growth_levels.json";
import studentProgression from "../../../data/student_progression_balance.json";
import suneungBalance from "../../../data/suneung_balance.json";
import universities from "../../../data/universities.json";
import { educationPointMultiplier } from "./education.js";
import { equippedEquipment, equippedEquipmentPower } from "./equipment.js";
import { resolveSuneungFromEsd } from "./suneung.js";
import { registerExpeditionMembersFromCompanions } from "./expedition.js";
import { createDefaultGameState } from "./save.js";
import { isRepeaterCurrent, nextSchoolGradeId, resolveGradeOrder, resolveGradeVisual } from "./grades.js";

const subjectsByMonth = [
  ["korean"],
  ["math"],
  ["english"],
  ["social"],
  ["science"],
  ["korean", "english"],
  ["math", "science"],
  ["social", "science"],
  ["korean", "social"],
  ["english", "math"],
  ["science", "korean"],
  ["exam"],
];

const progressionBalance = studentProgression.balance;
const progressionGradeById = new Map(studentProgression.grades.map((grade) => [grade.id, grade]));
const growthLevelByLevel = new Map(growthLevels.map((level) => [Number(level.level), level]));
const subjectIds = ["korean", "english", "math", "social", "science"];
const maxBattleDurationMs = Number(progressionBalance.maxBattleDurationMs);
export const studentAutoTickMs = Number(progressionBalance.autoTickMs);

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function hashText(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function battleRoadTotal(mode) {
  const table = mode === "suneung" ? battleRoadConfig.suneung.encounters : battleRoadConfig.schoolYear.encounters;
  assert(Array.isArray(table) && table.length > 0, `Battle Road ${mode} 조우 데이터가 비어 있습니다.`);
  return table.length;
}

export function createRoadState(mode = "school", encounterIndex = 0, lastCompletedEncounterId = null) {
  assert(mode === "school" || mode === "suneung", `지원하지 않는 road mode입니다: ${mode}`);
  const total = battleRoadTotal(mode);
  const requestedIndex = finiteNumber(encounterIndex, `road encounterIndex 값이 올바르지 않습니다: ${encounterIndex}`);
  return {
    mode,
    phase: "travel",
    encounterIndex: clamp(Math.floor(requestedIndex), 0, total - 1),
    encounterTotal: total,
    phaseStartedAt: Date.now(),
    lastCompletedEncounterId,
  };
}

export function normalizeRoadState(current) {
  assert(current && typeof current === "object", "current 데이터가 객체가 아닙니다.");
  assert(current.road && typeof current.road === "object", "current.road 데이터가 객체가 아닙니다.");
  const requestedMode = current.gradeId === "H3" ? "suneung" : current.road.mode;
  assert(requestedMode === "school" || requestedMode === "suneung", `지원하지 않는 road mode입니다: ${requestedMode}`);
  const mode = requestedMode === "suneung" ? "suneung" : "school";
  const total = battleRoadTotal(mode);
  const index = finiteNumber(current.road.encounterIndex, "current.road.encounterIndex 값이 올바르지 않습니다.");

  return {
    ...current,
    road: {
      ...createRoadState(mode, index),
      ...current.road,
      mode,
      encounterIndex: clamp(Math.floor(index), 0, total - 1),
      encounterTotal: total,
    },
  };
}

function subjectsForMonth(month) {
  return subjectsByMonth[(Math.max(1, month) - 1) % subjectsByMonth.length];
}

function progressionGradeForCurrent(current) {
  const gradeId = current.gradeId === "REPEATER" ? "REPEATER" : current.gradeId;
  const grade = progressionGradeById.get(gradeId);
  assert(grade, `student_progression_balance.json에서 학년을 찾을 수 없습니다: ${gradeId}`);
  assert(Array.isArray(grade.subjects) && grade.subjects.length > 0, `학년 과목 데이터가 비어 있습니다: ${gradeId}`);
  finiteNumber(grade.baseDifficulty, `학년 baseDifficulty 값이 올바르지 않습니다: ${gradeId}`);
  finiteNumber(grade.growthBase, `학년 growthBase 값이 올바르지 않습니다: ${gradeId}`);
  finiteNumber(grade.order, `학년 order 값이 올바르지 않습니다: ${gradeId}`);
  return grade;
}

function gradeGrowthFactor(state) {
  const grade = progressionGradeForCurrent(state.current);
  const retakeGrowth =
    grade.phase === "repeater"
      ? Math.min(
        finiteNumber(progressionBalance.retakePointGrowthCap, "retakePointGrowthCap 값이 올바르지 않습니다."),
        Math.max(0, finiteNumber(state.current.retakeCount, "current.retakeCount 값이 올바르지 않습니다.")) *
          finiteNumber(progressionBalance.retakePointGrowthExponent, "retakePointGrowthExponent 값이 올바르지 않습니다."),
      )
      : 0;
  const exponent = Math.max(0, finiteNumber(grade.order, `학년 order 값이 올바르지 않습니다: ${grade.id}`) - 1) + retakeGrowth;
  return finiteNumber(progressionBalance.gradeTierPointGrowth, "gradeTierPointGrowth 값이 올바르지 않습니다.") ** exponent;
}

function trackStatMultiplier(subject, state) {
  const grade = progressionGradeForCurrent(state.current);
  if (grade.phase !== "high" && grade.phase !== "repeater") return 1;
  const weights = studentProgression.subjectTrackWeights[subject];
  assert(weights, `과목 trackWeights 데이터가 없습니다: ${subject}`);
  const track = state.current.track;
  assert(typeof track === "string" && track.length > 0, "current.track 값이 없습니다.");
  assert(Object.prototype.hasOwnProperty.call(weights, track), `과목 trackWeights.${track} 데이터가 없습니다: ${subject}`);
  const value = weights[track];
  return finiteNumber(value, `과목 trackWeights 값이 올바르지 않습니다: ${subject} / ${track}`);
}

function studyLevelRow(level) {
  const row = growthLevelByLevel.get(Number(level));
  assert(row, `growth_levels.json에서 성장 레벨을 찾을 수 없습니다: ${level}`);
  finiteNumber(row.cost, `growth_levels.json cost 값이 올바르지 않습니다: ${level}`);
  finiteNumber(row.statGain, `growth_levels.json statGain 값이 올바르지 않습니다: ${level}`);
  return row;
}

function sparseStudyLevel(current, subject) {
  assert(current.studyLevels && typeof current.studyLevels === "object" && !Array.isArray(current.studyLevels), "current.studyLevels 데이터가 객체가 아닙니다.");
  const value = Object.prototype.hasOwnProperty.call(current.studyLevels, subject) ? current.studyLevels[subject] : 0;
  return Math.floor(finiteNumber(value, `current.studyLevels.${subject} 값이 올바르지 않습니다.`));
}

function nextStudyLevelCost(current, subject) {
  const level = sparseStudyLevel(current, subject) + 1;
  return finiteNumber(studyLevelRow(level).cost, `성장 비용이 올바르지 않습니다: ${subject} / ${level}`);
}

function investStudyLevel(state, subject) {
  assert(subjectIds.includes(subject), `지원하지 않는 과목입니다: ${subject}`);
  const current = state.current;
  const fromLevel = sparseStudyLevel(current, subject);
  const row = studyLevelRow(fromLevel + 1);
  const cost = finiteNumber(row.cost, `성장 비용이 올바르지 않습니다: ${subject} / ${fromLevel + 1}`);
  if (finiteNumber(current.unspentStudyPoints, "current.unspentStudyPoints 값이 올바르지 않습니다.") < cost) return false;
  current.unspentStudyPoints -= cost;
  current.studyLevels[subject] = fromLevel + 1;
  const statGain = finiteNumber(row.statGain, `성장 statGain 값이 올바르지 않습니다: ${subject} / ${fromLevel + 1}`) * trackStatMultiplier(subject, state);
  current.stats[subject] = finiteNumber(current.stats[subject], `current.stats.${subject} 값이 올바르지 않습니다.`) + statGain;
  return true;
}

function autoAllocateStudyPoints(state) {
  if (state.current.autoAllocateStudy === false) return;
  const grade = progressionGradeForCurrent(state.current);
  const maxIterations = grade.subjects.length * growthLevels.length;
  for (let index = 0; index < maxIterations; index += 1) {
    const candidate = grade.subjects
      .map((subject) => ({
        subject,
        level: sparseStudyLevel(state.current, subject),
        cost: nextStudyLevelCost(state.current, subject),
        weight: Math.max(0, finiteNumber(state.current.studyAllocationWeights[subject], `studyAllocationWeights.${subject} 값이 올바르지 않습니다.`)),
      }))
      .filter((entry) => entry.weight > 0 && entry.cost <= state.current.unspentStudyPoints)
      .sort((left, right) => left.level / Math.max(1, left.weight) - right.level / Math.max(1, right.weight) || left.cost - right.cost)[0];
    if (!candidate) return;
    if (!investStudyLevel(state, candidate.subject)) return;
  }
}

function effectiveStatsForBattle(state) {
  const stats = Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(state.current.stats[subject], `current.stats.${subject} 값이 올바르지 않습니다.`)]));
  const share = finiteNumber(progressionBalance.equipmentStatShare, "equipmentStatShare 값이 올바르지 않습니다.");
  for (const equipment of equippedEquipment(state)) {
    if (!equipment) continue;
    for (const subject of subjectIds) {
      stats[subject] += finiteNumber(equipment.stats[subject], `장비 stats.${subject} 값이 올바르지 않습니다: ${equipment.id}`) * share;
    }
  }
  return stats;
}

function averageSubjectValue(values, focusSubjects, grade) {
  const scopedSubjects = focusSubjects.filter((subject) => grade.subjects.includes(subject));
  const subjects = scopedSubjects.length > 0 ? scopedSubjects : grade.subjects;
  return subjects.reduce((sum, subject) => sum + finiteNumber(values[subject], `과목 값이 올바르지 않습니다: ${subject}`), 0) / subjects.length;
}

function enemyHpMultiplier(kind) {
  if (kind === "normal") return finiteNumber(progressionBalance.normalEnemyHpMultiplier, "normalEnemyHpMultiplier 값이 올바르지 않습니다.");
  if (kind === "boss") return finiteNumber(progressionBalance.bossEnemyHpMultiplier, "bossEnemyHpMultiplier 값이 올바르지 않습니다.");
  if (kind === "suneung") return finiteNumber(progressionBalance.suneungEnemyHpMultiplier, "suneungEnemyHpMultiplier 값이 올바르지 않습니다.");
  throw new Error(`지원하지 않는 전투 적 kind입니다: ${kind}`);
}

function enemyMaxHp(current, kind, month, subjects) {
  const grade = progressionGradeForCurrent(current);
  const monthValue = finiteNumber(month, `적 month 값이 올바르지 않습니다: ${kind}`);
  const subjectScale = 1 + Math.max(0, subjects.length - 1) * finiteNumber(progressionBalance.multiSubjectHpScale, "multiSubjectHpScale 값이 올바르지 않습니다.");
  const difficulty = finiteNumber(grade.baseDifficulty, `학년 baseDifficulty 값이 올바르지 않습니다: ${grade.id}`) * (1 + monthValue * finiteNumber(progressionBalance.monthDifficultyGrowth, "monthDifficultyGrowth 값이 올바르지 않습니다."));
  return Math.max(finiteNumber(progressionBalance.minEnemyHp, "minEnemyHp 값이 올바르지 않습니다."), Math.round(difficulty * enemyHpMultiplier(kind) * subjectScale));
}

function enemyStudyPointReward(state, weight) {
  const grade = progressionGradeForCurrent(state.current);
  const value = finiteNumber(grade.growthBase, `학년 growthBase 값이 올바르지 않습니다: ${grade.id}`) * finiteNumber(weight, "적 weight 값이 올바르지 않습니다.") * gradeGrowthFactor(state) * finiteNumber(progressionBalance.studyRewardScale, "studyRewardScale 값이 올바르지 않습니다.");
  return Math.max(1, Math.round(value));
}

function attackPowerForEnemy(state, enemy) {
  const grade = progressionGradeForCurrent(state.current);
  const stats = effectiveStatsForBattle(state);
  const aptitude = state.current.aptitude;
  const focusSubjects = Array.isArray(enemy.subjects) ? enemy.subjects : [];
  const statPower = averageSubjectValue(stats, focusSubjects, grade);
  const aptitudePower = averageSubjectValue(aptitude, focusSubjects, grade) * finiteNumber(progressionBalance.aptitudeExamRate, "aptitudeExamRate 값이 올바르지 않습니다.");
  return Math.max(1, statPower + aptitudePower);
}

function resolveEnemySubjects(current, rawSubjects, enemyId) {
  assert(Array.isArray(rawSubjects) && rawSubjects.length > 0, `적 subjects 데이터가 비어 있습니다: ${enemyId}`);
  const grade = progressionGradeForCurrent(current);
  const resolved = [];
  for (const subject of rawSubjects) {
    if (subject === "exam") {
      for (const gradeSubject of grade.subjects) {
        if (!resolved.includes(gradeSubject)) resolved.push(gradeSubject);
      }
      continue;
    }
    assert(subjectIds.includes(subject), `지원하지 않는 적 과목입니다: ${enemyId} / ${subject}`);
    if (!resolved.includes(subject)) resolved.push(subject);
  }
  assert(resolved.length > 0, `적 과목 해석 결과가 비어 있습니다: ${enemyId}`);
  return resolved;
}

function makeEnemy(state, { id, label, kind, month, subjects, visualKey, weight = 1 }) {
  const resolvedSubjects = resolveEnemySubjects(state.current, subjects, id);
  const maxHp = enemyMaxHp(state.current, kind, month, resolvedSubjects);
  return {
    id,
    label,
    kind,
    month,
    subjects: resolvedSubjects,
    subjectIds: resolvedSubjects,
    visualKey,
    weight,
    maxHp,
    remainingHp: maxHp,
    studyPointReward: enemyStudyPointReward(state, weight),
    rewardClaimed: false,
  };
}

function roadMeta(mode, encounterIndex, encounter) {
  return {
    roadMode: mode,
    encounterIndex,
    encounterTotal: battleRoadTotal(mode),
    encounterId: encounter.id,
    encounterLabel: encounter.label,
    roadTiming: battleRoadConfig.timing,
    roadCamera: battleRoadConfig.camera,
  };
}

export function createBattle(state) {
  const current = normalizeRoadState(state.current);
  const visual = resolveGradeVisual(current);
  const battleState = { ...state, current };

  if (current.gradeId === "H3" || current.road.mode === "suneung") {
    const encounters = battleRoadConfig.suneung.encounters;
    const encounterIndex = clamp(current.road.encounterIndex, 0, encounters.length - 1);
    const encounter = encounters[encounterIndex];
    return {
      gradeId: current.gradeId,
      gradeOrder: visual.order,
      kind: "suneung",
      ...roadMeta("suneung", encounterIndex, encounter),
      elapsedMs: 0,
      maxDurationMs: maxBattleDurationMs,
      finished: false,
      enemies: encounter.enemies.map((enemy, index) =>
        makeEnemy(battleState, {
          id: `suneung-${encounter.id}-${enemy.id}`,
          label: enemy.label,
          kind: "suneung",
          month: enemy.visualMonth,
          subjects: enemy.subjects,
          weight: 3.5,
        }),
      ),
    };
  }

  const encounters = battleRoadConfig.schoolYear.encounters;
  const encounterIndex = clamp(current.road.encounterIndex, 0, encounters.length - 1);
  const encounter = encounters[encounterIndex];
  const enemies = encounter.normalMonths.map((month) =>
    makeEnemy(battleState, {
      id: `${current.gradeId}-${encounter.id}-m${month}`,
      label: `${month}월 문제`,
      kind: "normal",
      month,
      subjects: subjectsForMonth(month),
    }),
  );

  enemies.push(
    makeEnemy(battleState, {
      id: `${current.gradeId}-${encounter.id}-boss`,
      label: `${encounter.bossMonth}월 보스`,
      kind: "boss",
      month: encounter.bossMonth,
      subjects: subjectsForMonth(encounter.bossMonth),
      visualKey: encounter.bossKey,
      weight: 2.8,
    }),
  );

  return {
    gradeId: current.gradeId,
    gradeOrder: visual.order,
    kind: "grade",
    ...roadMeta("school", encounterIndex, encounter),
    monthRange: encounter.monthRange,
    elapsedMs: 0,
    maxDurationMs: maxBattleDurationMs,
    finished: false,
    enemies,
  };
}

function battleMatchesCurrent(battle, current) {
  return Boolean(
    battle &&
      !battle.finished &&
      battle.gradeId === current.gradeId &&
      battle.roadMode === current.road.mode &&
      battle.encounterIndex === current.road.encounterIndex,
  );
}

export function ensureBattleState(state) {
  const next = cloneState(state);
  next.current = normalizeRoadState(next.current);
  if (!next.current.awaitingDecision && !battleMatchesCurrent(next.current.battle, next.current)) {
    next.current.battle = createBattle(next);
    next.current.road = createRoadState(next.current.battle.roadMode, next.current.battle.encounterIndex);
  }
  return next;
}

export function battleRoadVisualPhase(battle) {
  assert(battle.roadTiming, `전투 roadTiming 데이터가 없습니다: ${battle.encounterId}`);
  const timing = battle.roadTiming;
  const damaged = battle.enemies.some((enemy) => enemy.remainingHp < enemy.maxHp || enemy.remainingHp <= 0);
  if (battleRoadConfig.presentation.phasePolicy.damageStartsCombat !== false && damaged) return "combat";
  const elapsedMs = finiteNumber(battle.elapsedMs, `전투 elapsedMs 값이 올바르지 않습니다: ${battle.encounterId}`);
  if (elapsedMs < timing.travelMs) return "travel";
  if (elapsedMs < timing.travelMs + timing.approachMs) return "approach";
  return "combat";
}

export function activeEnemyForBattle(battle) {
  assert(Array.isArray(battle.enemies) && battle.enemies.length > 0, `전투 enemies 데이터가 비어 있습니다: ${battle.encounterId}`);
  const active = battle.enemies.find((enemy) => enemy.remainingHp > 0);
  if (active) return active;
  assert(battle.finished, `진행 중 전투에 활성 적이 없습니다: ${battle.encounterId}`);
  return battle.enemies[0];
}

function battleHasNext(battle) {
  return battle.encounterIndex + 1 < battle.encounterTotal;
}

const lowestUniversity = universities.slice().sort((a, b) => finiteNumber(b.gameRank, `universities.json gameRank 값이 올바르지 않습니다: ${b.id}`) - finiteNumber(a.gameRank, `universities.json gameRank 값이 올바르지 않습니다: ${a.id}`))[0];

const collectionEffectMaxStack = new Map(careerCollectionData.collectionEffects.map((effect) => [effect.id, finiteNumber(effect.maxStack, `career_collection_effects.json maxStack 값이 올바르지 않습니다: ${effect.id}`)]));
const careerCollectionEffectByCareerId = new Map(careerCollectionData.careerCollectionEffects.map((effect) => [effect.careerId, effect]));

// 도감(발견 직업) 영구 보너스 → ESD. 적성을 대체하는 메타.
// 발견 = careerAlumni + history + archive(history는 회차를 넘어 영구 보존됨).
function suneungCollectionEsd(state, mapping) {
  const discovered = new Set();
  for (const list of [state.careerAlumni, state.history, state.archive]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry && typeof entry.careerId === "string" && entry.careerId.length > 0) discovered.add(entry.careerId);
    }
  }
  let examFocus = 0;
  let studyGain = 0;
  for (const careerId of discovered) {
    const link = careerCollectionEffectByCareerId.get(careerId);
    if (!link) continue;
    if (link.effectId === "exam_focus") examFocus += finiteNumber(link.value, `도감 exam_focus 값이 올바르지 않습니다: ${careerId}`);
    else if (link.effectId === "study_gain") studyGain += finiteNumber(link.value, `도감 study_gain 값이 올바르지 않습니다: ${careerId}`);
  }
  examFocus = Math.min(collectionEffectMaxStack.get("exam_focus") || 0, examFocus);
  studyGain = Math.min(collectionEffectMaxStack.get("study_gain") || 0, studyGain);
  const raw = examFocus * finiteNumber(mapping.examFocusEsdScale, "esdMapping.examFocusEsdScale 값이 올바르지 않습니다.") + studyGain * finiteNumber(mapping.studyGainEsdScale, "esdMapping.studyGainEsdScale 값이 올바르지 않습니다.");
  return Math.min(finiteNumber(mapping.collectionEsdCap, "esdMapping.collectionEsdCap 값이 올바르지 않습니다."), raw);
}

// 게임 상태 → 유효성장일(ESD) 환산. 공부(누적 스탯)·교육(영구)·장비·도감(영구)·결제를 합산한다.
// studyStatHalf 등 상수는 data/suneung_balance.json esdMapping에서 조절(농사 속도 보정 대상).
function suneungEsdComponents(state) {
  const m = suneungBalance.esdMapping;
  const current = state.current;
  const sumStats = subjectIds.reduce((sum, subject) => sum + Math.max(0, finiteNumber(current.stats[subject], `current.stats.${subject} 값이 올바르지 않습니다.`)), 0);
  const studyEsd = (finiteNumber(m.studyEsdCap, "esdMapping.studyEsdCap 값이 올바르지 않습니다.") * sumStats) / (sumStats + finiteNumber(m.studyStatHalf, "esdMapping.studyStatHalf 값이 올바르지 않습니다."));
  const eduLevels = Object.values(current.educationLevels || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const eduEsd = Math.min(finiteNumber(m.eduEsdCap, "esdMapping.eduEsdCap 값이 올바르지 않습니다."), eduLevels * finiteNumber(m.eduEsdPerLevel, "esdMapping.eduEsdPerLevel 값이 올바르지 않습니다."));
  const equipEsd = Math.min(finiteNumber(m.equipmentCapEsd, "esdMapping.equipmentCapEsd 값이 올바르지 않습니다."), equippedEquipmentPower(state) * finiteNumber(m.equipEsdPerPower, "esdMapping.equipEsdPerPower 값이 올바르지 않습니다."));
  const collectionEsd = suneungCollectionEsd(state, m);
  const purchaseEsd = Math.max(0, Number(state[m.purchaseStateField]) || 0);
  const total = studyEsd + eduEsd + equipEsd + collectionEsd + purchaseEsd;
  const round2 = (value) => Math.round(value * 100) / 100;
  return {
    studyEsd: round2(studyEsd),
    eduEsd: round2(eduEsd),
    equipEsd: round2(equipEsd),
    collectionEsd: round2(collectionEsd),
    purchaseEsd: round2(purchaseEsd),
    total: round2(total),
  };
}

function makeSuneungResolution(state, rng = Math.random) {
  const esd = suneungEsdComponents(state);
  const retakeCount = finiteNumber(state.current.retakeCount, "current.retakeCount 값이 올바르지 않습니다.");
  const resolution = resolveSuneungFromEsd(esd.total, { retakeCount }, { balance: suneungBalance, universities }, rng);
  return { ...resolution, esd };
}

function makeExamResult(state, battle, resolution = null) {
  const isSuneung = battle.kind === "suneung";
  return {
    gradeId: state.current.gradeId,
    retakeCount: finiteNumber(state.current.retakeCount, "current.retakeCount 값이 올바르지 않습니다."),
    month: 12,
    examId: isSuneung ? "suneung" : "year_boss",
    examName: isSuneung ? "수능시험" : `${resolveGradeVisual(state.current).studentTitle} 학년 평가`,
    score: isSuneung ? (resolution ? resolution.finalScore : 995) : 930,
    rank: isSuneung ? (resolution ? resolution.finalNationalRank : 500) : 1200,
    studyPointReward: battle.enemies.length,
    createdAt: Date.now(),
  };
}

function makeCareerCandidates(state, university) {
  assert(careers.length > 0, "careers.json이 비어 있어 결과 후보를 만들 수 없습니다.");
  const prestige = finiteNumber(university.prestige, `universities.json prestige 값이 올바르지 않습니다: ${university.id}`);
  return careers
    .slice()
    .sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`))
    .map((career) => {
      const choiceRank = finiteNumber(career.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${career.id}`);
      const minPrestige = finiteNumber(career.minPrestige, `careers.json minPrestige 값이 올바르지 않습니다: ${career.id}`);
      const baseIncomePerMinute = finiteNumber(career.baseIncomePerMinute, `careers.json baseIncomePerMinute 값이 올바르지 않습니다: ${career.id}`);
      const prestigeIncomeRate = finiteNumber(career.prestigeIncomeRate, `careers.json prestigeIncomeRate 값이 올바르지 않습니다: ${career.id}`);
      const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
      const prestigePowerRate = finiteNumber(career.prestigePowerRate, `careers.json prestigePowerRate 값이 올바르지 않습니다: ${career.id}`);
      assert(career.choiceBand, `careers.json choiceBand 값이 없습니다: ${career.id}`);
      const gap = Math.max(0, prestige - minPrestige);
      const selectable = prestige >= minPrestige;
      return {
        avatarGender: state.current.avatarGender,
        careerId: career.id,
        name: career.name,
        tier: career.tier,
        choiceRank,
        choiceBand: career.choiceBand,
        minPrestige,
        incomePerMinute: baseIncomePerMinute + gap * prestigeIncomeRate,
        powerMultiplier: Math.round(powerMultiplier * (1 + gap * prestigePowerRate) * 1000) / 1000,
        score: 1000 - choiceRank,
        selectable,
        lockedReason: selectable ? "" : `명성 ${minPrestige} 필요`,
      };
    });
}

function makeOutcome(state, examResult, resolution) {
  assert(universities.length > 0, "universities.json이 비어 있어 수능 결과를 만들 수 없습니다.");
  assert(resolution && typeof resolution === "object", "수능 resolution 데이터가 없어 결과를 만들 수 없습니다.");
  // 최종 점수로 합격한 대학. 낙방권이면 최하위 대학으로 처리한다.
  const university = resolution.finalUniversity || lowestUniversity;
  const careerCandidates = makeCareerCandidates(state, university);
  return {
    avatarGender: state.current.avatarGender === "female" ? "female" : "male",
    suneungScore: examResult.score,
    suneungRank: examResult.rank,
    suneungCondition: resolution.conditionText,
    suneungEsd: resolution.esd,
    suneungReport: { topPercent: Math.round((examResult.rank / 300000) * 1000) / 1000, subjects: [] },
    admissions: [
      {
        universityId: university.id,
        name: university.name,
        gameRank: finiteNumber(university.gameRank, `universities.json gameRank 값이 올바르지 않습니다: ${university.id}`),
        adjustedScore: examResult.score,
        adjustedRank: examResult.rank,
        minScore: university.minScore,
        minNationalRank: university.minNationalRank,
        prestige: university.prestige,
        trackBias: university.trackBias,
        line: university.line,
      },
    ],
    careerCandidates,
    careerSelectableCount: careerCandidates.filter((career) => career.selectable).length,
    forcedArchiveAvailable: false,
  };
}

function claimEnemyReward(state, enemy) {
  if (enemy.rewardClaimed) return 0;
  const baseReward = finiteNumber(enemy.studyPointReward, `전투 studyPointReward 값이 올바르지 않습니다: ${enemy.id}`);
  const multiplier = educationPointMultiplier(state, enemy.subjects);
  const reward = Math.max(baseReward, Math.round(baseReward * multiplier));
  state.current.unspentStudyPoints = finiteNumber(state.current.unspentStudyPoints, "current.unspentStudyPoints 값이 올바르지 않습니다.") + reward;
  state.current.totalStudyPoints = finiteNumber(state.current.totalStudyPoints, "current.totalStudyPoints 값이 올바르지 않습니다.") + reward;
  enemy.rewardClaimed = true;
  autoAllocateStudyPoints(state);
  return reward;
}

function finishBattleProgress(state, battle) {
  battle.finished = true;
  const defeatedCount = battle.enemies.filter((enemy) => enemy.remainingHp <= 0).length;
  state.current.lastWaveKills = defeatedCount;
  state.current.totalKills = finiteNumber(state.current.totalKills, "current.totalKills 값이 올바르지 않습니다.") + defeatedCount;

  if (battleHasNext(battle)) {
    state.current.road = createRoadState(battle.roadMode, battle.encounterIndex + 1, battle.encounterId);
    if (battle.kind === "grade") {
      assert(Array.isArray(battle.monthRange) && Number.isFinite(Number(battle.monthRange[1])), `전투 monthRange 데이터가 올바르지 않습니다: ${battle.encounterId}`);
    }
    state.current.monthIndex = battle.kind === "grade" ? battle.monthRange[1] : 12;
    state.current.examIndex = Math.max(finiteNumber(state.current.examIndex, "current.examIndex 값이 올바르지 않습니다."), battle.encounterIndex + 1);
    state.current.battle = createBattle(state);
    return state;
  }

  const resolution = battle.kind === "suneung" ? makeSuneungResolution(state) : null;
  const examResult = makeExamResult(state, battle, resolution);
  assert(Array.isArray(state.current.examResults), "current.examResults 데이터가 배열이 아닙니다.");
  state.current.examResults = [...state.current.examResults, examResult];
  state.current.monthIndex = 12;
  state.current.examIndex = battle.encounterTotal;

  if (battle.kind === "suneung") {
    state.current.battle = battle;
    state.current.awaitingDecision = true;
    state.current.outcome = makeOutcome(state, examResult, resolution);
    state.current.pausedAtGate = false;
    return state;
  }

  if (isRepeaterCurrent(state.current)) {
    state.current.road = createRoadState("suneung", 0, null);
    state.current.battle = createBattle(state);
    state.current.pausedAtGate = false;
    return state;
  }

  state.current.gradeId = nextSchoolGradeId(state.current);
  state.current.road = createRoadState(state.current.gradeId === "H3" ? "suneung" : "school", 0, null);
  state.current.battle = createBattle(state);
  state.current.monthIndex = 0;
  state.current.examIndex = 0;
  return state;
}

export function advanceBattleByMs(state, deltaMs, rng = Math.random) {
  const next = ensureBattleState(state);
  if (next.current.awaitingDecision) return next;
  const battle = cloneState(next.current.battle);
  assert(Array.isArray(battle.enemies) && battle.enemies.length > 0, `전투 enemies 데이터가 비어 있습니다: ${battle.encounterId}`);
  let remainingMs = Math.max(0, finiteNumber(deltaMs, `전투 진행 deltaMs 값이 올바르지 않습니다: ${deltaMs}`));
  const maxDuration = finiteNumber(battle.maxDurationMs, `전투 maxDurationMs 값이 올바르지 않습니다: ${battle.encounterId}`);
  battle.elapsedMs = clamp(finiteNumber(battle.elapsedMs, `전투 elapsedMs 값이 올바르지 않습니다: ${battle.encounterId}`), 0, maxDuration);

  while (remainingMs > 0 && battle.elapsedMs < maxDuration) {
    const enemy = battle.enemies.find((candidate) => candidate.remainingHp > 0);
    if (!enemy) break;
    const randomFactor =
      finiteNumber(progressionBalance.damageRandomBase, "damageRandomBase 값이 올바르지 않습니다.") +
      finiteNumber(rng(), "전투 난수 값이 올바르지 않습니다.") * finiteNumber(progressionBalance.damageRandomRange, "damageRandomRange 값이 올바르지 않습니다.");
    const damagePerSecond = attackPowerForEnemy(next, enemy) * randomFactor;
    const timeToDefeatMs = Math.max(1, Math.ceil((finiteNumber(enemy.remainingHp, `적 remainingHp 값이 올바르지 않습니다: ${enemy.id}`) / damagePerSecond) * 1000));
    const stepMs = Math.min(remainingMs, maxDuration - battle.elapsedMs, timeToDefeatMs);
    enemy.remainingHp = Math.max(0, enemy.remainingHp - (damagePerSecond * stepMs) / 1000);
    battle.elapsedMs += stepMs;
    remainingMs -= stepMs;
    if (enemy.remainingHp <= 0.0001) {
      enemy.remainingHp = 0;
      claimEnemyReward(next, enemy);
    }
  }

  const allDefeated = battle.enemies.every((enemy) => enemy.remainingHp <= 0);
  if (allDefeated || battle.elapsedMs >= maxDuration) {
    battle.elapsedMs = Math.min(maxDuration, battle.elapsedMs);
    return finishBattleProgress(next, battle);
  }

  next.current.battle = battle;
  return next;
}

function cloneStats(stats) {
  return {
    korean: finiteNumber(stats.korean, "current.stats.korean 값이 올바르지 않습니다."),
    english: finiteNumber(stats.english, "current.stats.english 값이 올바르지 않습니다."),
    math: finiteNumber(stats.math, "current.stats.math 값이 올바르지 않습니다."),
    social: finiteNumber(stats.social, "current.stats.social 값이 올바르지 않습니다."),
    science: finiteNumber(stats.science, "current.stats.science 값이 올바르지 않습니다."),
  };
}

function graduatedAge(current) {
  const retakeCount = finiteNumber(current.retakeCount, "current.retakeCount 값이 올바르지 않습니다.");
  if (retakeCount > 0) return 20 + retakeCount;
  return resolveGradeVisual(current).age + 1;
}

function nextRunCurrent(previousCurrent) {
  const defaultCurrent = createDefaultGameState().current;
  return normalizeRoadState({
    ...defaultCurrent,
    avatarGender: previousCurrent.avatarGender,
    autoAllocateStudy: previousCurrent.autoAllocateStudy,
    studyAllocationWeights: {
      ...defaultCurrent.studyAllocationWeights,
      ...previousCurrent.studyAllocationWeights,
    },
    // 교육은 회차를 넘어 영구 누적되는 메타 → 졸업 후에도 보존한다.
    educationLevels: { ...(previousCurrent.educationLevels || {}) },
    road: createRoadState("school", 0, null),
    battle: undefined,
  });
}

export function acceptCareerChoice(state, { universityId, careerId } = {}) {
  const next = cloneState(state);
  const current = next.current;
  assert(current && typeof current === "object", "current 데이터가 객체가 아닙니다.");
  const outcome = current.outcome;
  assert(current.awaitingDecision, "수능 결과 대기 상태가 아니어서 직업을 수락할 수 없습니다.");
  assert(outcome, "수능 결과 데이터가 없어 직업을 수락할 수 없습니다.");
  assert(Array.isArray(outcome.admissions) && outcome.admissions.length > 0, "진학 후보가 없어 직업을 수락할 수 없습니다.");
  assert(Array.isArray(outcome.careerCandidates) && outcome.careerCandidates.length > 0, "직업 후보가 없어 직업을 수락할 수 없습니다.");

  const admission = outcome.admissions.find((candidate) => candidate.universityId === universityId);
  assert(admission, `진학 후보를 찾을 수 없습니다: ${universityId}`);
  const careerCandidate = outcome.careerCandidates.find((candidate) => candidate.careerId === careerId && candidate.selectable !== false);
  assert(careerCandidate, `선택 가능한 직업 후보를 찾을 수 없습니다: ${careerId}`);

  const career = careers.find((candidate) => candidate.id === careerCandidate.careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerCandidate.careerId}`);

  assert(current.avatarGender === "male" || current.avatarGender === "female", `current.avatarGender 값이 올바르지 않습니다: ${current.avatarGender}`);
  const avatarGender = current.avatarGender;
  const runNumber = finiteNumber(next.runNumber, "save.runNumber 값이 올바르지 않습니다.");
  const alumniId = `alumni-${runNumber}-${Date.now()}`;
  const age = graduatedAge(current);
  const alumniPowerMultiplier = finiteNumber(careerCandidate.powerMultiplier, `직업 후보 powerMultiplier 값이 올바르지 않습니다: ${careerCandidate.careerId}`);
  const alumniCareerRank = finiteNumber(careerCandidate.choiceRank, `직업 후보 choiceRank 값이 올바르지 않습니다: ${careerCandidate.careerId}`);
  const alumni = {
    id: alumniId,
    name: `${careerCandidate.name} 졸업생`,
    careerId: careerCandidate.careerId,
    careerName: careerCandidate.name,
    avatarGender,
    age,
    status: "idle",
    incomePerMinute: careerCandidate.incomePerMinute,
    powerMultiplier: alumniPowerMultiplier,
    careerRank: alumniCareerRank,
    stats: cloneStats(current.stats),
    createdRun: runNumber,
    source: "human",
    sourceUniversity: admission.name,
  };

  assert(Array.isArray(next.careerAlumni), "save.careerAlumni 데이터가 배열이 아닙니다.");
  assert(Array.isArray(next.history), "save.history 데이터가 배열이 아닙니다.");
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.careerAlumni = [...next.careerAlumni, alumni];
  const expeditionRegistration = registerExpeditionMembersFromCompanions(next, [alumni], { autoParty: true });
  next.expedition = expeditionRegistration.state.expedition;
  next.history = [
    {
      runNumber,
      universityName: admission.name,
      careerId: careerCandidate.careerId,
      careerName: careerCandidate.name,
      careerRank: alumniCareerRank,
      avatarGender,
      track: current.track,
      suneungScore: outcome.suneungScore,
      age,
      createdAt: Date.now(),
    },
    ...next.history,
  ].slice(0, 100);
  next.log = [
    {
      type: "good",
      message: `${admission.name} 진학 후 ${careerCandidate.name} 졸업생이 원정대원 후보로 등록되었다.`,
      createdAt: Date.now(),
    },
    ...next.log,
  ].slice(0, 100);
  next.runNumber = runNumber + 1;
  next.current = nextRunCurrent(current);

  return ensureBattleState(next);
}

export function completeCurrentBattle(state) {
  const next = ensureBattleState(state);
  if (next.current.awaitingDecision) return next;

  const battle = cloneState(next.current.battle);
  assert(Array.isArray(battle.enemies) && battle.enemies.length > 0, `전투 enemies 데이터가 비어 있습니다: ${battle.encounterId}`);
  battle.elapsedMs = finiteNumber(battle.maxDurationMs, `전투 maxDurationMs 값이 올바르지 않습니다: ${battle.encounterId}`);
  battle.enemies = battle.enemies.map((enemy) => ({ ...enemy, remainingHp: 0, rewardClaimed: false }));
  for (const enemy of battle.enemies) claimEnemyReward(next, enemy);
  return finishBattleProgress(next, battle);
}

export function startRetakeYear(state) {
  const next = cloneState(state);
  const current = next.current;
  assert(current && typeof current === "object", "current 데이터가 객체가 아닙니다.");
  const nextRetakeCount = Math.max(1, finiteNumber(current.retakeCount, "current.retakeCount 값이 올바르지 않습니다.") + 1);
  next.runNumber = finiteNumber(next.runNumber, "save.runNumber 값이 올바르지 않습니다.") + 1;
  next.current = normalizeRoadState({
    ...current,
    gradeId: "REPEATER",
    retakeCount: nextRetakeCount,
    monthIndex: 0,
    waveProgressMs: 0,
    waveRewardClaimedSteps: 0,
    pausedAtGate: false,
    awaitingDecision: false,
    outcome: null,
    examResults: [],
    road: createRoadState("school", 0, null),
    battle: undefined,
  });
  return ensureBattleState(next);
}

function curriculumSubjectSet(enemy) {
  assert(enemy && typeof enemy === "object", "교과 VFX 대상 enemy 데이터가 객체가 아닙니다.");
  assert(Array.isArray(enemy.subjects), `교과 VFX 대상 subjects 데이터가 배열이 아닙니다: ${enemy.id}`);
  const subjects = new Set(enemy.subjects);
  assert(curriculumAttackVfx.rules && typeof curriculumAttackVfx.rules === "object", "curriculum_attack_vfx.json rules 데이터가 없습니다.");
  assert(curriculumAttackVfx.rules.inquirySubjectAliases && typeof curriculumAttackVfx.rules.inquirySubjectAliases === "object", "curriculum_attack_vfx.json inquirySubjectAliases 데이터가 없습니다.");
  const aliases = curriculumAttackVfx.rules.inquirySubjectAliases;
  for (const subject of [...subjects]) {
    const aliasList = Object.prototype.hasOwnProperty.call(aliases, subject) ? aliases[subject] : [];
    assert(Array.isArray(aliasList), `교과 VFX alias 목록이 배열이 아닙니다: ${subject}`);
    for (const alias of aliasList) subjects.add(alias);
  }
  return subjects;
}

function curriculumWeightedPool(mapping, enemy, seed) {
  const subjects = curriculumSubjectSet(enemy);
  assert(subjects.size > 0, `교과 VFX 대상 과목이 비어 있습니다: ${String(enemy.id)}`);
  const pools = mapping.tokenPools.filter((pool) => subjects.has(pool.subject));
  assert(pools.length > 0, `교과 VFX 과목 토큰 풀이 없습니다: ${mapping.gradeLabel} / ${[...subjects].join(",")}`);

  const poolWeight = (pool) => {
    const weight = finiteNumber(pool.weight, `교과 VFX 토큰 풀 weight 값이 올바르지 않습니다: ${pool.id}`);
    assert(weight > 0, `교과 VFX 토큰 풀 weight 값은 0보다 커야 합니다: ${pool.id}`);
    return Math.floor(weight);
  };
  const totalWeight = pools.reduce((sum, pool) => sum + poolWeight(pool), 0);
  let cursor = hashText(seed) % totalWeight;
  for (const pool of pools) {
    cursor -= poolWeight(pool);
    if (cursor < 0) return pool;
  }
  throw new Error(`교과 VFX 토큰 풀 선택에 실패했습니다: ${mapping.gradeLabel} / ${enemy.id}`);
}

export function curriculumAttackVfxForBattle(battle, target) {
  const config = battleRoadConfig.presentation.curriculumAttackVfx;
  if (config.enabled === false || battle.finished || battleRoadVisualPhase(battle) !== "combat") return null;

  const mapping = curriculumAttackVfx.gradeMappings.find((candidate) => candidate.gradeOrder === battle.gradeOrder);
  assert(mapping, `curriculum_attack_vfx.json에서 ${battle.gradeOrder}번 학년 매핑을 찾을 수 없습니다.`);

  const pool = curriculumWeightedPool(mapping, target, `${battle.gradeId}|${battle.encounterId}|${target.id}`);
  assert(pool.tokens.length > 0, `교과 VFX 토큰 풀이 비어 있습니다: ${pool.id}`);

  const token = pool.tokens[hashText(`${target.id}|token`) % pool.tokens.length];
  let style = pool.style;
  if (target.visualKey && Object.prototype.hasOwnProperty.call(curriculumAttackVfx.bossStyleByVisualKey, target.visualKey)) {
    style = curriculumAttackVfx.bossStyleByVisualKey[target.visualKey];
  }
  assert(style, `교과 VFX style 데이터가 없습니다: ${pool.id}`);
  const palette = curriculumAttackVfx.palettes[mapping.palette];
  assert(palette, `교과 VFX 팔레트가 없습니다: ${mapping.palette}`);

  const slots =
    battle.kind === "suneung"
      ? battle.enemies.length > 1
        ? battleRoadConfig.presentation.enemySlots.suneungPair
        : battleRoadConfig.presentation.enemySlots.suneungSingle
      : battleRoadConfig.presentation.enemySlots.school;
  const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.id === target.id));
  const slot = slots[targetIndex];
  assert(slot, `교과 VFX 대상 슬롯이 없습니다: ${battle.encounterId} / targetIndex ${targetIndex}`);
  const isBossLike = target.kind === "boss" || target.kind === "suneung";
  const baseFontPx = finiteNumber(config.baseFontPx, "curriculumAttackVfx.baseFontPx 값이 올바르지 않습니다.");
  const minWidthPx = finiteNumber(config.minWidthPx, "curriculumAttackVfx.minWidthPx 값이 올바르지 않습니다.");
  const maxWidthPx = finiteNumber(config.maxWidthPx, "curriculumAttackVfx.maxWidthPx 값이 올바르지 않습니다.");

  return {
    token,
    style,
    subject: pool.subject,
    pool: pool.id,
    palette: mapping.palette,
    left: clamp(slot[0] + (isBossLike ? config.bossTargetXOffsetPercent : config.normalTargetXOffsetPercent), 34, 92),
    top: clamp(slot[1] - (isBossLike ? config.bossTargetYOffsetPercent : config.normalTargetYOffsetPercent), 14, 76),
    width: clamp(baseFontPx + String(token).length * 5, minWidthPx, maxWidthPx),
    colors: palette,
  };
}
