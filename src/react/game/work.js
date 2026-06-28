// 직장(work) 수입 적립. 졸업생(careerAlumni)의 incomePerMinute를 실시간/오프라인으로 money에 누적한다.
// 기존에 incomePerMinute는 직장 탭 표시에만 쓰이고 실제 적립 코드가 없었다(미구현). 이를 구현한다.

const WORK_OFFLINE_CAP_HOURS = 12;

export const workOfflineCapHours = WORK_OFFLINE_CAP_HOURS;

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

// 근무 중 졸업생 분당 수입 합계(현재는 모든 졸업생이 수입에 기여 — 직장 탭 표시와 동일).
export function workIncomePerMinute(state) {
  if (!Array.isArray(state.careerAlumni)) return 0;
  return state.careerAlumni.reduce((sum, alumni) => sum + Math.max(0, Number(alumni && alumni.incomePerMinute) || 0), 0);
}

// 직장 수입을 money에 적립한다. 남은 소수 단위는 lastIncomeAt을 덜 당기는 방식으로 시간 carry한다
// (초당 floor로 저소득이 0으로 새는 것을 막고, 새 세이브 필드도 만들지 않음). 오프라인 초과분은 버린다.
export function accrueWorkIncome(state, now = Date.now()) {
  const next = cloneState(state);
  const last = Number.isFinite(Number(next.lastIncomeAt)) ? Number(next.lastIncomeAt) : now;
  const elapsedMs = Math.max(0, now - last);
  const capMs = WORK_OFFLINE_CAP_HOURS * 60 * 60 * 1000;
  const effectiveMs = Math.min(elapsedMs, capMs);
  const perMinute = workIncomePerMinute(next);
  if (perMinute <= 0 || effectiveMs <= 0) {
    next.lastIncomeAt = now;
    return next;
  }
  const earned = Math.floor((perMinute * effectiveMs) / 60000);
  const consumedMs = (earned * 60000) / perMinute; // earned에 해당하는 정확한 소비 시간
  if (earned > 0) next.money = (Number(next.money) || 0) + earned;
  // 소비하지 못한 소수(effectiveMs - consumedMs)만 시간으로 carry. cap 초과분은 자동 폐기.
  next.lastIncomeAt = now - (effectiveMs - consumedMs);
  return next;
}
