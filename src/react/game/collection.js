// 직업 도감(collection) 메타. 발견한 직업(careerAlumni + history + archive)이 영구 보너스를 준다.
// 4효과를 각자의 실제 시스템에 적용한다:
//   study_gain  → 학생 전투 공부량(claimEnemyReward 배율)
//   work_income → 직장 수입(accrueWorkIncome 배율)
//   offline_cap → 직장 오프라인 적립 한도(+시간)
//   exam_focus  → 수능 결과(collectionEsd → 점수)
// 발견 기준이며 maxStack(career_collection_effects.json)으로 각 효과 상한이 정해진다.

import careerCollectionData from "../../../data/career_collection_effects.json";

export const collectionEffects = careerCollectionData.collectionEffects;

const effectById = new Map(collectionEffects.map((effect) => [effect.id, effect]));
const careerEffectByCareerId = new Map(careerCollectionData.careerCollectionEffects.map((effect) => [effect.careerId, effect]));

export const COLLECTION_EFFECT_IDS = ["study_gain", "work_income", "offline_cap", "exam_focus"];

export function careerCollectionEffect(careerId) {
  return careerEffectByCareerId.get(careerId) || null;
}

export function collectionEffectMaxStack(effectId) {
  const effect = effectById.get(effectId);
  return effect ? Number(effect.maxStack) : Number.POSITIVE_INFINITY;
}

// 발견한 직업 id 집합. history는 회차를 넘어 영구 보존되므로 졸업할수록 도감이 커진다.
export function discoveredCareerIds(state) {
  const ids = new Set();
  for (const list of [state?.careerAlumni, state?.history, state?.archive]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry && typeof entry.careerId === "string" && entry.careerId.length > 0) ids.add(entry.careerId);
    }
  }
  return ids;
}

// 발견 직업으로부터 효과별 합계(maxStack 상한 적용)를 계산한다.
export function collectionBonuses(state) {
  const discovered = discoveredCareerIds(state);
  const totals = Object.fromEntries(COLLECTION_EFFECT_IDS.map((id) => [id, 0]));
  for (const careerId of discovered) {
    const link = careerEffectByCareerId.get(careerId);
    if (!link) continue;
    const value = Number(link.value);
    if (!Number.isFinite(value)) continue;
    totals[link.effectId] = (totals[link.effectId] || 0) + value;
  }
  for (const id of COLLECTION_EFFECT_IDS) {
    totals[id] = Math.min(collectionEffectMaxStack(id), Math.max(0, totals[id]));
  }
  return totals;
}
