import gradeVisuals from "../../../data/grade_visuals.json";

const gradeIdToOrder = new Map([
  ["E1", 1],
  ["E2", 2],
  ["E3", 3],
  ["E4", 4],
  ["E5", 5],
  ["E6", 6],
  ["M1", 7],
  ["M2", 8],
  ["M3", 9],
  ["H1", 10],
  ["H2", 11],
  ["H3", 12],
]);

const phaseLabels = {
  elementary: "초등",
  middle: "중등",
  high: "고등",
  repeater: "N수",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

export function gradeIdForOrder(order) {
  if (order >= 1 && order <= 6) return `E${order}`;
  if (order >= 7 && order <= 9) return `M${order - 6}`;
  if (order >= 10 && order <= 12) return `H${order - 9}`;
  return "REPEATER";
}

export function resolveGradeOrder(current) {
  assert(current && typeof current === "object", "현재 학년 데이터가 객체가 아닙니다.");
  const retakeCount = Math.max(0, finiteNumber(current.retakeCount, "current.retakeCount 값이 올바르지 않습니다."));
  if (current.gradeId === "REPEATER" || retakeCount > 0) {
    return Math.min(16, 12 + Math.max(1, retakeCount));
  }

  const order = gradeIdToOrder.get(current.gradeId);
  assert(order, `지원하지 않는 gradeId입니다: ${String(current.gradeId)}`);
  return order;
}

export function resolveGradeVisual(current) {
  const order = resolveGradeOrder(current);
  const visual = gradeVisuals.find((candidate) => candidate.order === order);
  assert(visual, `grade_visuals.json에서 ${order}번 학년 시각 정보를 찾을 수 없습니다.`);
  return visual;
}

export function courseBandForCurrent(current) {
  const visual = resolveGradeVisual(current);
  assert(phaseLabels[visual.phase], `학년 phase 라벨이 없습니다: ${visual.phase}`);
  return phaseLabels[visual.phase];
}

export function courseLabelForCurrent(current) {
  const retakeCount = Math.max(0, finiteNumber(current.retakeCount, "current.retakeCount 값이 올바르지 않습니다."));
  if (current.gradeId === "REPEATER" || retakeCount > 0) {
    return `${Math.max(1, retakeCount)}수`;
  }

  const visual = resolveGradeVisual(current);
  if (visual.phase === "elementary") return `초등학교 ${visual.order}학년`;
  if (visual.phase === "middle") return `중학교 ${visual.order - 6}학년`;
  if (visual.phase === "high") return `고등학교 ${visual.order - 9}학년`;
  return visual.studentTitle;
}

export function nextSchoolGradeId(current) {
  const order = resolveGradeOrder(current);
  return gradeIdForOrder(Math.min(12, order + 1));
}

export function isRepeaterCurrent(current) {
  return resolveGradeVisual(current).phase === "repeater" || current.gradeId === "REPEATER";
}
