// 수능 결과 시뮬레이터
//   data/suneung_balance.json + data/universities.json 만 읽어 결과 분포를 예측한다.
//   사용 예:
//     node tools/suneung-sim.mjs                         (기본 리포트: 환율·곡선·밴드·분포)
//     node tools/suneung-sim.mjs --days 14 --packs 5     (단일 프로필 분포)
//     node tools/suneung-sim.mjs --days 14 --retake 1 --trials 200000 --seed 7
//
//  ESD 환산: profile{ days, packs(₩30,000), edu(레벨), equip(ESD), aptitude(회차) } → ESD → 예상점수
//  → [컨디션] 하락 분산(상위일수록 작음, N수로 축소) → 최종점수 → 대학.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  admitUniversity,
  bandMaxPenalty,
  computeEsd,
  effectiveMaxPenalty,
  makeSeededRng,
  predictedScoreFromEsd,
  rankForScore,
  resolveSuneung,
  validateSuneungBalance,
} from "../src/react/game/suneung.js";

const balance = JSON.parse(readFileSync(resolve("data/suneung_balance.json"), "utf8"));
const universities = JSON.parse(readFileSync(resolve("data/universities.json"), "utf8"));
validateSuneungBalance(balance);

const uniByRank = new Map(universities.map((u) => [Number(u.gameRank), u]));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = Number.isNaN(Number(next)) ? next : Number(next);
      i += 1;
    }
  }
  return args;
}

function uniName(rank) {
  const u = uniByRank.get(Math.round(rank));
  return u ? u.name : "낙방";
}

function percentile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

function pad(text, width, right = false) {
  const s = String(text);
  // 한글 폭 보정(한글 1글자 ≈ 2칸)
  const visual = [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  const fill = " ".repeat(Math.max(0, width - visual));
  return right ? fill + s : s + fill;
}

// 프로필 → 시행 분포
function simulate(profile, trials, seed) {
  const rng = makeSeededRng(seed);
  const esd = computeEsd(profile, balance).total;
  const predictedScore = predictedScoreFromEsd(esd, balance);
  const predictedRank = rankForScore(predictedScore, universities);
  const ranks = [];
  let snu = 0; // 서울대(rank1)
  let top10 = 0;
  let fail = 0;
  for (let t = 0; t < trials; t += 1) {
    const r = resolveSuneung(profile, { balance, universities }, rng);
    const rank = r.finalUniversity ? r.finalUniversity.gameRank : universities.length + 1;
    ranks.push(rank);
    if (r.finalUniversity && r.finalUniversity.gameRank === 1) snu += 1;
    if (r.finalUniversity && r.finalUniversity.gameRank <= 10) top10 += 1;
    if (!r.finalUniversity) fail += 1;
  }
  ranks.sort((a, b) => a - b);
  return {
    esd,
    predictedScore,
    predictedRank: Math.round(predictedRank),
    predictedUni: admitUniversity(predictedScore, universities),
    maxPenalty: bandMaxPenalty(predictedRank, balance),
    effMax: effectiveMaxPenalty(bandMaxPenalty(predictedRank, balance), profile.retakeCount || 0, balance),
    lucky10: percentile(ranks, 0.10), // 운 좋은 10%(낮은 등수)
    median: percentile(ranks, 0.50),
    unlucky10: percentile(ranks, 0.90), // 운 나쁜 10%(높은 등수)
    snuPct: (snu / trials) * 100,
    top10Pct: (top10 / trials) * 100,
    failPct: (fail / trials) * 100,
    trials,
  };
}

function printDistributionRow(label, profile, trials, seed) {
  const r = simulate(profile, trials, seed);
  const predicted = `${r.predictedScore}점 ${r.predictedUni ? r.predictedUni.name : "낙방"}(${r.predictedRank}위)`;
  const band = `±하락 ${(r.effMax * 100).toFixed(1)}%`;
  const result = `${uniName(r.lucky10)}(${r.lucky10}) ~ [${uniName(r.median)}(${r.median})] ~ ${uniName(r.unlucky10)}(${r.unlucky10})`;
  const tail = `서울대 ${r.snuPct.toFixed(1)}% · top10 ${r.top10Pct.toFixed(1)}%${r.failPct > 0 ? ` · 낙방 ${r.failPct.toFixed(1)}%` : ""}`;
  console.log(
    `${pad(label, 16)} ESD ${pad(r.esd.toFixed(1), 5, true)} | 예상 ${pad(predicted, 26)} | ${pad(band, 12)} | 운10%~[중앙]~운10%: ${pad(result, 42)} | ${tail}`,
  );
}

function header(title) {
  console.log("\n" + "─".repeat(8) + " " + title + " " + "─".repeat(8));
}

function reportHeadline() {
  const s = balance.score;
  const src = balance.esdSources;
  const packsForMax = Math.round(s.esdMax / src.purchasePackEsd);
  console.log("═".repeat(96));
  console.log("수능 결과 시뮬레이터");
  console.log(
    `환율: 무과금 ${s.esdMax}일 = 만점 | 결제팩 1회(₩${Number(src.purchasePackPriceKrw).toLocaleString("ko-KR")}) = ${src.purchasePackEsd} ESD → 만점 ${packsForMax}결제(₩${(packsForMax * src.purchasePackPriceKrw).toLocaleString("ko-KR")})`,
  );
  console.log(`점수: floor ${s.floor} ~ max ${s.max}, esdMax ${s.esdMax}, gamma ${s.gamma}`);
}

function reportCurve() {
  header("ESD → 예상점수 → 대학 (결정론)");
  for (const esd of [0, 1, 3, 5, 7, 10, 14, 18, 21, 25, 30]) {
    const score = predictedScoreFromEsd(esd, balance);
    const uni = admitUniversity(score, universities);
    const rank = Math.round(rankForScore(score, universities));
    console.log(`  ESD ${pad(esd, 3, true)} → ${pad(score + "점", 7)} → ${pad(uni ? uni.name : "낙방", 18)} (${rank}위)`);
  }
}

function reportBands() {
  header("컨디션 밴드 (예상 등수별 최대 하락폭)");
  for (const band of balance.resultVariance.bands) {
    console.log(`  예상 ~${pad(band.maxPredictedRank + "위", 7)} → 최대 -${(band.maxPenaltyPct * 100).toFixed(0)}%`);
  }
  console.log(`  skewPower ${balance.resultVariance.skewPower} (대부분 예상 근접) · N수당 ×${balance.resultVariance.retakeVarianceMultiplier} · 하한 ${(balance.resultVariance.minMaxPenalty * 100).toFixed(1)}%`);
}

function main() {
  const args = parseArgs(process.argv);
  const trials = Number(args.trials) || 50000;
  const seed = Number(args.seed) || 12345;

  // 단일 프로필 모드
  if (args.days !== undefined || args.packs !== undefined || args.edu !== undefined || args.equip !== undefined || args.aptitude !== undefined) {
    const profile = {
      days: Number(args.days) || 0,
      packs: Number(args.packs) || 0,
      eduLevels: Number(args.edu) || 0,
      equipEsd: Number(args.equip) || 0,
      aptitudeRuns: Number(args.aptitude) || 0,
      retakeCount: Number(args.retake) || 0,
    };
    reportHeadline();
    header("단일 프로필 분포");
    printDistributionRow("입력값", profile, trials, seed);
    return;
  }

  // 기본 종합 리포트
  reportHeadline();
  reportCurve();
  reportBands();

  header(`시간축(무과금) 분포  trials=${trials}`);
  for (const days of [3, 7, 14, 21, 30]) {
    printDistributionRow(`${days}일 무과금`, { days, retakeCount: 0 }, trials, seed);
  }

  header("과금축(순수 결제) 분포");
  for (const packs of [1, 3, 5, 10]) {
    printDistributionRow(`${packs}결제`, { packs, retakeCount: 0 }, trials, seed);
  }

  header("N수 효과 (14일 고정, 분산 축소)");
  for (const retake of [0, 1, 2]) {
    printDistributionRow(`14일 N수${retake}`, { days: 14, retakeCount: retake }, trials, seed);
  }

  header("혼합 예시");
  printDistributionRow("14일+5결제", { days: 14, packs: 5, retakeCount: 0 }, trials, seed);
  printDistributionRow("7일+3결제+N수1", { days: 7, packs: 3, retakeCount: 1 }, trials, seed);

  console.log("\n" + "═".repeat(96));
}

main();
