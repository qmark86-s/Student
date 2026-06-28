// 학생 농사 시뮬 (결정론): 한 회차(E1→H2 학교 + H3 수능)에서 모든 적을 처치했을 때
//   누적 공부량과 자동분배 후 최종 누적 스탯(sumStats)을 실제 공식으로 계산한다.
//   목적: data/suneung_balance.json esdMapping.studyStatHalf 보정(시간=ESD 환산).
//
//   재현 대상(battleRoad.js):
//     enemyStudyPointReward = max(1, round(growthBase × weight × gradeTierPointGrowth^(order-1) × studyRewardScale))
//     autoAllocate: 학년 과목 중 레벨이 가장 낮은 과목에 1레벨씩 투자(가중치 동일)
//     investStudyLevel: 비용/스탯은 growth_levels[level] 표를 따름, 트랙=none → 배율 1
//
//   사용: node tools/student-farm-sim.mjs [--kill 1.0] [--edu-mult 1.0]

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = "c:/Users/상원/Downloads/Student";
const progression = JSON.parse(readFileSync(resolve(root, "data/student_progression_balance.json"), "utf8"));
const roadConfig = JSON.parse(readFileSync(resolve(root, "data/battle_road_config.json"), "utf8"));
const growth = JSON.parse(readFileSync(resolve(root, "data/suneung_balance.json"), "utf8"));
const growthLevels = JSON.parse(readFileSync(resolve(root, "data/growth_levels.json"), "utf8"));
const balance = progression.balance;

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1];
    a[k] = v === undefined || v.startsWith("--") ? true : Number(v);
    if (a[k] !== true) i += 1;
  }
  return a;
}
const args = parseArgs(process.argv);
const killRate = args.kill === undefined ? 1.0 : Number(args.kill); // 적 처치 비율(1.0=전부)
const eduMult = args["edu-mult"] === undefined ? 1.0 : Number(args["edu-mult"]); // 교육 공부량 배율

const elementarySubjects = ["korean", "english", "math"];
const allSubjects = ["korean", "english", "math", "social", "science"];

// 학년별 한 회차 공부량(school: 4조우×(일반2+보스1), suneung: 5적×weight3.5)
function gradePoints(grade) {
  const factor = balance.gradeTierPointGrowth ** (grade.order - 1);
  const reward = (weight) => Math.max(1, Math.round(grade.growthBase * weight * factor * balance.studyRewardScale));
  if (grade.id === "H3") {
    // 수능: korean/math/english 각 1 + 탐구 social/science → 5적 weight 3.5
    return 5 * reward(3.5) * eduMult * killRate;
  }
  const encounters = roadConfig.schoolYear.encounters.length; // 4
  const perEncounter = 2 * reward(1) + reward(2.8); // 일반2 + 보스1
  return encounters * perEncounter * eduMult * killRate;
}

// 자동분배: 주어진 과목들에 누적 공부량을 레벨 균등 투자
function allocate(state, subjects, points) {
  let remaining = points;
  // 안전 상한(무한 루프 방지). 실제로는 비용이 폭증해 훨씬 빨리 멈춘다.
  for (let guard = 0; guard < 2_000_000; guard += 1) {
    // 후보: 비용 ≤ remaining 인 과목 중 레벨이 가장 낮은 것
    let best = null;
    for (const s of subjects) {
      const level = state.levels[s];
      if (level >= growthLevels.length) continue;
      const cost = growthLevels[level].cost; // 다음 레벨 비용
      if (cost > remaining) continue;
      if (!best || level < best.level) best = { s, level, cost };
    }
    if (!best) break;
    remaining -= best.cost;
    state.stats[best.s] += growthLevels[best.level].statGain; // 트랙 none → ×1
    state.levels[best.s] += 1;
  }
  return remaining;
}

function run() {
  const state = {
    levels: Object.fromEntries(allSubjects.map((s) => [s, 0])),
    stats: Object.fromEntries(allSubjects.map((s) => [s, 0])),
  };
  let totalPoints = 0;
  let carry = 0;
  const milestones = [];
  for (const grade of progression.grades) {
    if (grade.phase === "repeater") continue; // 기본 1회차는 N수 제외
    const subjects = grade.phase === "elementary" ? elementarySubjects : allSubjects;
    const pts = gradePoints(grade);
    totalPoints += pts;
    carry = allocate(state, subjects, carry + pts);
    const sumStats = allSubjects.reduce((s, k) => s + state.stats[k], 0);
    milestones.push({ grade: grade.id, order: grade.order, sumStats });
  }
  return { state, totalPoints, carry, milestones };
}

function esdFromSumStats(sumStats, studyStatHalf) {
  const m = growth.esdMapping;
  return (m.studyEsdCap * sumStats) / (sumStats + studyStatHalf);
}

const r = run();
const sumStats = allSubjects.reduce((s, k) => s + r.state.stats[k], 0);

console.log("═".repeat(80));
console.log(`학생 농사 시뮬 (killRate=${killRate}, eduMult=${eduMult})`);
console.log("학년별 누적 sumStats:");
for (const m of r.milestones) {
  console.log(`  ${m.grade.padEnd(9)} order ${String(m.order).padStart(2)} → sumStats ${Math.round(m.sumStats).toLocaleString("en-US")}`);
}
console.log("─".repeat(80));
console.log(`총 공부량(round 누계): ${Math.round(r.totalPoints).toLocaleString("en-US")}`);
console.log("과목별 최종 스탯:");
for (const s of allSubjects) console.log(`  ${s.padEnd(8)} Lv.${r.state.levels[s]}  stat ${Math.round(r.state.stats[s]).toLocaleString("en-US")}`);
console.log(`수능 시점 sumStats(전부 처치 1회차): ${Math.round(sumStats).toLocaleString("en-US")}`);
console.log("─".repeat(80));

const m = growth.esdMapping;
console.log(`현재 studyStatHalf=${m.studyStatHalf} → studyEsd ${esdFromSumStats(sumStats, m.studyStatHalf).toFixed(2)} / cap ${m.studyEsdCap}`);
console.log("\n목표 studyEsd별 권장 studyStatHalf (전부 처치 1회차 기준):");
for (const targetEsd of [12, 16, 18, 20, 22]) {
  // studyEsd = cap × S/(S+half) → half = S × (cap - studyEsd) / studyEsd
  const half = sumStats * (m.studyEsdCap - targetEsd) / targetEsd;
  console.log(`  단일 만렙 회차 studyEsd ${targetEsd} 목표 → studyStatHalf ≈ ${Math.round(half).toLocaleString("en-US")}`);
}
console.log("═".repeat(80));
