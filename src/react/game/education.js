import { resolveGradeOrder, resolveGradeVisual } from "./grades.js";

export const EDUCATION_COST_MULTIPLIER = 1.8;

export const educationActions = [
  {
    id: "early_reading",
    name: "조기교육",
    category: "growth",
    eligiblePhases: ["elementary"],
    maxYear: 2,
    maxLevel: 30,
    baseCost: 450,
    costGrowth: 1.42,
    pointMultiplierPerLevel: 0.045,
    subjectIds: ["korean", "english", "math"],
  },
  {
    id: "advanced_learning",
    name: "선행학습",
    category: "growth",
    eligiblePhases: ["elementary", "middle", "high"],
    maxLevel: 60,
    baseCost: 900,
    costGrowth: 1.48,
    pointMultiplierPerLevel: 0.04,
    subjectIds: ["math", "english"],
  },
  {
    id: "private_elementary",
    name: "사립초 전학",
    category: "school",
    eligiblePhases: ["elementary"],
    minYear: 3,
    maxLevel: 50,
    baseCost: 1800,
    costGrowth: 1.5,
    pointMultiplierPerLevel: 0.038,
    subjectIds: ["korean", "english", "math"],
  },
  {
    id: "private_middle",
    name: "사립중 전학",
    category: "school",
    eligiblePhases: ["middle"],
    maxLevel: 55,
    baseCost: 3200,
    costGrowth: 1.52,
    pointMultiplierPerLevel: 0.04,
    subjectIds: ["korean", "english", "math", "social", "science"],
  },
  {
    id: "special_high",
    name: "특목고 전학",
    category: "school",
    eligiblePhases: ["high"],
    maxYear: 2,
    maxLevel: 55,
    baseCost: 6200,
    costGrowth: 1.56,
    pointMultiplierPerLevel: 0.045,
    subjectIds: ["english", "math", "science"],
  },
  {
    id: "humanities_studio",
    name: "논술 스튜디오",
    category: "track",
    eligiblePhases: ["high", "repeater"],
    maxLevel: 70,
    baseCost: 4200,
    costGrowth: 1.5,
    pointMultiplierPerLevel: 0.042,
    subjectIds: ["korean", "english", "social"],
  },
  {
    id: "science_lab_course",
    name: "과학 탐구반",
    category: "track",
    eligiblePhases: ["high", "repeater"],
    maxLevel: 70,
    baseCost: 4200,
    costGrowth: 1.5,
    pointMultiplierPerLevel: 0.042,
    subjectIds: ["math", "science"],
  },
  {
    id: "private_tutor",
    name: "N수 과외",
    category: "retake",
    eligiblePhases: ["repeater"],
    maxLevel: 100,
    baseCost: 7800,
    costGrowth: 1.46,
    pointMultiplierPerLevel: 0.05,
    subjectIds: ["korean", "english", "math", "social", "science"],
  },
  {
    id: "interview_clinic",
    name: "진로 컨설팅",
    category: "outcome",
    eligiblePhases: ["high", "repeater"],
    maxLevel: 40,
    baseCost: 2600,
    costGrowth: 1.44,
    pointMultiplierPerLevel: 0.025,
    subjectIds: ["korean", "english", "social"],
  },
];

export const educationCategoryLabels = {
  growth: "성장",
  school: "학교",
  track: "계열",
  retake: "N수",
  outcome: "결과",
};

export const subjectNameById = {
  korean: "국어",
  english: "영어",
  math: "수학",
  social: "사회",
  science: "과학",
};

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function currentYear(current) {
  assert(current && typeof current === "object", "save.current 데이터가 객체가 아닙니다.");
  const visual = resolveGradeVisual(current);
  if (visual.phase === "elementary") return resolveGradeOrder(current);
  if (visual.phase === "middle") return resolveGradeOrder(current) - 6;
  if (visual.phase === "high") return resolveGradeOrder(current) - 9;
  return Math.max(1, finiteNumber(current.retakeCount, "save.current.retakeCount 값이 올바르지 않습니다."));
}

function currentPhaseSubjects(current) {
  assert(current && typeof current === "object", "save.current 데이터가 객체가 아닙니다.");
  const phase = resolveGradeVisual(current).phase;
  if (phase === "elementary") return ["korean", "english", "math"];
  return ["korean", "english", "math", "social", "science"];
}

export function educationLevel(state, actionId) {
  assert(state.current && typeof state.current === "object", "save.current 데이터가 객체가 아닙니다.");
  assert(state.current.educationLevels && typeof state.current.educationLevels === "object", "save.current.educationLevels 데이터가 객체가 아닙니다.");
  if (!Object.prototype.hasOwnProperty.call(state.current.educationLevels, actionId)) return 0;
  return finiteNumber(state.current.educationLevels[actionId], `교육 레벨 값이 올바르지 않습니다: ${actionId}`);
}

export function educationCost(state, action) {
  const level = educationLevel(state, action.id);
  return Math.round(action.baseCost * EDUCATION_COST_MULTIPLIER * action.costGrowth ** level);
}

export function educationAvailable(state, action) {
  const current = state.current;
  assert(current && typeof current === "object", "save.current 데이터가 객체가 아닙니다.");
  const visual = resolveGradeVisual(current);
  const year = currentYear(current);
  return !(
    educationLevel(state, action.id) >= action.maxLevel ||
    !action.eligiblePhases.includes(visual.phase) ||
    (action.minYear !== undefined && year < action.minYear) ||
    (action.maxYear !== undefined && year > action.maxYear)
  );
}

export function educationSubjectsLabel(action) {
  return action.subjectIds.map((subjectId) => {
    assert(subjectNameById[subjectId], `교육 과목 라벨 누락: ${action.id} / ${subjectId}`);
    return subjectNameById[subjectId];
  }).join(" · ");
}

export function educationEffect(action, level = 1) {
  return action.pointMultiplierPerLevel * level;
}

export function formatEducationEffect(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function educationPointMultiplier(state, subjectIds = []) {
  const current = state.current;
  assert(current && typeof current === "object", "save.current 데이터가 객체가 아닙니다.");
  const activeSubjects = Array.isArray(subjectIds) && subjectIds.length > 0 ? subjectIds : currentPhaseSubjects(current);
  const phaseSubjects = currentPhaseSubjects(current);
  let bonus = 0;

  for (const action of educationActions) {
    const level = educationLevel(state, action.id);
    if (level <= 0 || !educationAvailable(state, action)) continue;
    const overlaps = action.subjectIds.some((subjectId) => activeSubjects.includes(subjectId) || phaseSubjects.includes(subjectId));
    if (overlaps) bonus += educationEffect(action, level);
  }

  return 1 + bonus;
}

export function upgradeEducation(state, actionId) {
  const action = educationActions.find((candidate) => candidate.id === actionId);
  if (!action) throw new Error(`교육 액션을 찾을 수 없습니다: ${actionId}`);
  if (!educationAvailable(state, action)) return state;

  const cost = educationCost(state, action);
  if (finiteNumber(state.money, "save.money 값이 올바르지 않습니다.") < cost) return state;

  const next = cloneState(state);
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.money = finiteNumber(next.money, "save.money 값이 올바르지 않습니다.") - cost;
  next.current.educationLevels = {
    ...next.current.educationLevels,
    [action.id]: educationLevel(next, action.id) + 1,
  };
  next.log = [
    {
      type: "good",
      message: `${action.name} Lv.${next.current.educationLevels[action.id]} 업그레이드`,
      createdAt: Date.now(),
    },
    ...next.log,
  ].slice(0, 100);
  return next;
}
