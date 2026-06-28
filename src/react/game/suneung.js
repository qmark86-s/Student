// 수능 결과 코어 (3레이어 설계)
//   [1] ESD 레이어   : 공부·교육·장비·적성·결제를 유효성장일(ESD)로 합산 → 예상점수(결정론)
//   [2] 컨디션 레이어 : 예상점수에 하락-only 분산을 얹어 최종점수 산출(상위일수록 분산 축소, N수로 추가 축소)
//   [3] 진학 연결     : 최종점수 → 대학 사다리 보간 → 합격 대학/예상 등수
//
// 이 모듈은 의도적으로 JSON/React를 import하지 않는다. balance/universities를 인자로 주입받아
// React(Vite)와 Node 시뮬레이터(tools/suneung-sim.mjs) 양쪽에서 동일하게 동작한다.

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(finiteNumber(value, "수능 점수 반올림 값이 올바르지 않습니다."));
}

// ── 데이터 검증 ────────────────────────────────────────────────────────────────

export function validateSuneungBalance(balance) {
  assert(balance && typeof balance === "object" && !Array.isArray(balance), "suneung_balance.json 데이터가 객체가 아닙니다.");
  const score = balance.score;
  assert(score && typeof score === "object", "suneung_balance.json score 데이터가 없습니다.");
  const floor = finiteNumber(score.floor, "score.floor 값이 올바르지 않습니다.");
  const max = finiteNumber(score.max, "score.max 값이 올바르지 않습니다.");
  assert(max > floor, "score.max 값은 floor보다 커야 합니다.");
  assert(finiteNumber(score.esdMax, "score.esdMax 값이 올바르지 않습니다.") > 0, "score.esdMax 값은 0보다 커야 합니다.");
  assert(finiteNumber(score.gamma, "score.gamma 값이 올바르지 않습니다.") > 0, "score.gamma 값은 0보다 커야 합니다.");

  const sources = balance.esdSources;
  assert(sources && typeof sources === "object", "suneung_balance.json esdSources 데이터가 없습니다.");
  for (const key of ["studyPerDayTarget", "eduPerLevel", "equipmentCapEsd", "aptitudePerRun", "purchasePackEsd"]) {
    assert(finiteNumber(sources[key], `esdSources.${key} 값이 올바르지 않습니다.`) >= 0, `esdSources.${key} 값은 0 이상이어야 합니다.`);
  }

  const mapping = balance.esdMapping;
  assert(mapping && typeof mapping === "object", "suneung_balance.json esdMapping 데이터가 없습니다.");
  for (const key of ["studyEsdCap", "studyStatHalf", "eduEsdPerLevel", "eduEsdCap", "equipEsdPerPower", "equipmentCapEsd", "examFocusEsdScale", "studyGainEsdScale", "collectionEsdCap"]) {
    assert(finiteNumber(mapping[key], `esdMapping.${key} 값이 올바르지 않습니다.`) >= 0, `esdMapping.${key} 값은 0 이상이어야 합니다.`);
  }
  assert(finiteNumber(mapping.studyStatHalf, "esdMapping.studyStatHalf 값이 올바르지 않습니다.") > 0, "esdMapping.studyStatHalf 값은 0보다 커야 합니다.");
  assert(typeof mapping.purchaseStateField === "string" && mapping.purchaseStateField.length > 0, "esdMapping.purchaseStateField 값이 없습니다.");

  const variance = balance.resultVariance;
  assert(variance && typeof variance === "object", "suneung_balance.json resultVariance 데이터가 없습니다.");
  assert(finiteNumber(variance.skewPower, "resultVariance.skewPower 값이 올바르지 않습니다.") >= 1, "resultVariance.skewPower 값은 1 이상이어야 합니다.");
  const retakeMult = finiteNumber(variance.retakeVarianceMultiplier, "resultVariance.retakeVarianceMultiplier 값이 올바르지 않습니다.");
  assert(retakeMult > 0 && retakeMult <= 1, "resultVariance.retakeVarianceMultiplier 값은 0 초과 1 이하여야 합니다.");
  assert(finiteNumber(variance.minMaxPenalty, "resultVariance.minMaxPenalty 값이 올바르지 않습니다.") >= 0, "resultVariance.minMaxPenalty 값은 0 이상이어야 합니다.");
  assert(Array.isArray(variance.bands) && variance.bands.length > 0, "resultVariance.bands 데이터가 비어 있습니다.");
  let lastRank = 0;
  for (const band of variance.bands) {
    const rank = finiteNumber(band.maxPredictedRank, "resultVariance.bands.maxPredictedRank 값이 올바르지 않습니다.");
    assert(rank > lastRank, "resultVariance.bands.maxPredictedRank 값은 오름차순이어야 합니다.");
    lastRank = rank;
    const pct = finiteNumber(band.maxPenaltyPct, "resultVariance.bands.maxPenaltyPct 값이 올바르지 않습니다.");
    assert(pct >= 0 && pct < 1, "resultVariance.bands.maxPenaltyPct 값은 0 이상 1 미만이어야 합니다.");
  }
  assert(Array.isArray(variance.conditionLabels) && variance.conditionLabels.length > 0, "resultVariance.conditionLabels 데이터가 비어 있습니다.");
  for (const label of variance.conditionLabels) {
    finiteNumber(label.maxRatio, "conditionLabels.maxRatio 값이 올바르지 않습니다.");
    assert(typeof label.text === "string" && label.text.length > 0, "conditionLabels.text 값이 없습니다.");
  }
  return balance;
}

function sortedUniversitiesByMinScore(universities) {
  assert(Array.isArray(universities) && universities.length > 0, "universities.json 데이터가 비어 있습니다.");
  return universities
    .map((u) => ({
      id: u.id,
      name: u.name,
      gameRank: finiteNumber(u.gameRank, `universities.json gameRank 값이 올바르지 않습니다: ${u.id}`),
      minScore: finiteNumber(u.minScore, `universities.json minScore 값이 올바르지 않습니다: ${u.id}`),
      minNationalRank: finiteNumber(u.minNationalRank, `universities.json minNationalRank 값이 올바르지 않습니다: ${u.id}`),
      prestige: finiteNumber(u.prestige, `universities.json prestige 값이 올바르지 않습니다: ${u.id}`),
      line: u.line,
      trackBias: u.trackBias,
    }))
    .sort((a, b) => a.minScore - b.minScore); // 오름차순: 624 → 990
}

// ── [1] ESD 합산 + 예상점수 ─────────────────────────────────────────────────────

// profile: { days, packs, eduLevels, equipEsd, aptitudeRuns } — 각 성장원천을 ESD로 환산해 합산
export function computeEsd(profile, balance) {
  const s = balance.esdSources;
  const days = Math.max(0, finiteNumber(profile.days ?? 0, "profile.days 값이 올바르지 않습니다."));
  const packs = Math.max(0, finiteNumber(profile.packs ?? 0, "profile.packs 값이 올바르지 않습니다."));
  const eduLevels = Math.max(0, finiteNumber(profile.eduLevels ?? 0, "profile.eduLevels 값이 올바르지 않습니다."));
  const equipEsdRaw = Math.max(0, finiteNumber(profile.equipEsd ?? 0, "profile.equipEsd 값이 올바르지 않습니다."));
  const aptitudeRuns = Math.max(0, finiteNumber(profile.aptitudeRuns ?? 0, "profile.aptitudeRuns 값이 올바르지 않습니다."));

  const studyEsd = days * finiteNumber(s.studyPerDayTarget, "esdSources.studyPerDayTarget 값이 올바르지 않습니다.");
  const eduEsd = eduLevels * finiteNumber(s.eduPerLevel, "esdSources.eduPerLevel 값이 올바르지 않습니다.");
  const equipEsd = Math.min(equipEsdRaw, finiteNumber(s.equipmentCapEsd, "esdSources.equipmentCapEsd 값이 올바르지 않습니다."));
  const aptitudeEsd = aptitudeRuns * finiteNumber(s.aptitudePerRun, "esdSources.aptitudePerRun 값이 올바르지 않습니다.");
  const purchaseEsd = packs * finiteNumber(s.purchasePackEsd, "esdSources.purchasePackEsd 값이 올바르지 않습니다.");

  const total = studyEsd + eduEsd + equipEsd + aptitudeEsd + purchaseEsd;
  return { total, studyEsd, eduEsd, equipEsd, aptitudeEsd, purchaseEsd };
}

export function predictedScoreFromEsd(esd, balance) {
  const { floor, max, esdMax, gamma } = balance.score;
  const e = clamp(finiteNumber(esd, "ESD 값이 올바르지 않습니다."), 0, Number.POSITIVE_INFINITY);
  const frac = 1 - (1 - clamp(e / esdMax, 0, 1)) ** gamma;
  return round(floor + (max - floor) * frac);
}

// ── [3] 점수 → 대학/등수 ─────────────────────────────────────────────────────────

// 최종 점수로 합격 가능한 최고 대학(= minScore가 가장 높으면서 점수 이하인 대학). 낙방이면 null.
export function admitUniversity(score, universities) {
  const list = sortedUniversitiesByMinScore(universities);
  const value = finiteNumber(score, "수능 점수 값이 올바르지 않습니다.");
  let admitted = null;
  for (const uni of list) {
    if (value >= uni.minScore) admitted = uni;
  }
  return admitted;
}

// 점수 → 사다리 보간(minScore 기준으로 key 값을 선형 보간). key: gameRank | minNationalRank
function interpolateLadder(score, universities, key) {
  const list = sortedUniversitiesByMinScore(universities); // 오름차순 minScore
  const value = finiteNumber(score, "수능 점수 값이 올바르지 않습니다.");
  const top = list[list.length - 1]; // 최고 minScore (gameRank 1)
  const bottom = list[0]; // 최저 minScore (최하위)
  if (value >= top.minScore) return top[key];
  if (value < bottom.minScore) return bottom[key];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const hi = list[i];
    const lo = list[i - 1];
    if (value < hi.minScore && value >= lo.minScore) {
      const t = (value - lo.minScore) / Math.max(1e-9, hi.minScore - lo.minScore);
      return lo[key] + (hi[key] - lo[key]) * t;
    }
  }
  return bottom[key];
}

// 점수 → 연속 등수(밴드 선택·표시용).
export function rankForScore(score, universities) {
  return clamp(interpolateLadder(score, universities, "gameRank"), 1, universities.length);
}

// 점수 → 전국 석차(표시용, minNationalRank 사다리 보간).
export function nationalRankForScore(score, universities) {
  return Math.max(1, Math.round(interpolateLadder(score, universities, "minNationalRank")));
}

// ── [2] 컨디션(하락 분산) ────────────────────────────────────────────────────────

export function bandMaxPenalty(predictedRank, balance) {
  const bands = balance.resultVariance.bands;
  const rank = finiteNumber(predictedRank, "예상 등수 값이 올바르지 않습니다.");
  for (const band of bands) {
    if (rank <= finiteNumber(band.maxPredictedRank, "bands.maxPredictedRank 값이 올바르지 않습니다.")) {
      return finiteNumber(band.maxPenaltyPct, "bands.maxPenaltyPct 값이 올바르지 않습니다.");
    }
  }
  return finiteNumber(bands[bands.length - 1].maxPenaltyPct, "bands.maxPenaltyPct 값이 올바르지 않습니다.");
}

export function effectiveMaxPenalty(maxPenalty, retakeCount, balance) {
  const v = balance.resultVariance;
  const n = Math.max(0, Math.floor(finiteNumber(retakeCount ?? 0, "retakeCount 값이 올바르지 않습니다.")));
  const reduced = finiteNumber(maxPenalty, "maxPenalty 값이 올바르지 않습니다.") * finiteNumber(v.retakeVarianceMultiplier, "retakeVarianceMultiplier 값이 올바르지 않습니다.") ** n;
  return Math.max(finiteNumber(v.minMaxPenalty, "minMaxPenalty 값이 올바르지 않습니다."), reduced);
}

// 하락-only, skew로 대부분 0(예상 근접)에 몰림.
export function rollPenalty(effMaxPenalty, balance, rng) {
  const skew = finiteNumber(balance.resultVariance.skewPower, "skewPower 값이 올바르지 않습니다.");
  const roll = clamp(finiteNumber(rng(), "난수 값이 올바르지 않습니다."), 0, 0.999999999);
  return finiteNumber(effMaxPenalty, "effMaxPenalty 값이 올바르지 않습니다.") * roll ** skew;
}

export function conditionLabel(penalty, effMaxPenalty, balance) {
  const labels = balance.resultVariance.conditionLabels;
  const ratio = effMaxPenalty > 0 ? clamp(penalty / effMaxPenalty, 0, 1) : 0;
  for (const label of labels) {
    if (ratio <= finiteNumber(label.maxRatio, "conditionLabels.maxRatio 값이 올바르지 않습니다.")) return label.text;
  }
  return labels[labels.length - 1].text;
}

// ── 통합 파이프라인 ────────────────────────────────────────────────────────────

// 라이브 진입점: 게임에서 이미 산출한 총 ESD를 직접 받아 결과를 만든다.
// options: { retakeCount }
export function resolveSuneungFromEsd(esdTotal, options, { balance, universities }, rng = Math.random) {
  validateSuneungBalance(balance);
  const retakeCount = Math.max(0, Math.floor(finiteNumber(options?.retakeCount ?? 0, "retakeCount 값이 올바르지 않습니다.")));
  const predictedScore = predictedScoreFromEsd(esdTotal, balance);
  const predictedUniversity = admitUniversity(predictedScore, universities);
  const predictedRank = rankForScore(predictedScore, universities);

  const maxPenalty = bandMaxPenalty(predictedRank, balance);
  const effMax = effectiveMaxPenalty(maxPenalty, retakeCount, balance);
  const penalty = rollPenalty(effMax, balance, rng);
  const finalScore = round(predictedScore * (1 - penalty));

  const finalUniversity = admitUniversity(finalScore, universities);
  return {
    retakeCount,
    predictedScore,
    predictedRank,
    predictedUniversity,
    predictedNationalRank: nationalRankForScore(predictedScore, universities),
    maxPenalty,
    effMaxPenalty: effMax,
    penalty,
    finalScore,
    finalRank: rankForScore(finalScore, universities),
    finalNationalRank: nationalRankForScore(finalScore, universities),
    finalUniversity,
    admitted: Boolean(finalUniversity),
    conditionText: conditionLabel(penalty, effMax, balance),
  };
}

// 시뮬레이터 진입점: profile { days, packs, eduLevels, equipEsd, aptitudeRuns, retakeCount } → ESD → 결과
export function resolveSuneung(profile, deps, rng = Math.random) {
  const esd = computeEsd(profile, deps.balance);
  return { esd, ...resolveSuneungFromEsd(esd.total, { retakeCount: profile.retakeCount }, deps, rng) };
}

// 시드 RNG(시뮬레이터 재현용). mulberry32.
export function makeSeededRng(seed) {
  let a = (finiteNumber(seed, "RNG seed 값이 올바르지 않습니다.") >>> 0) || 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
