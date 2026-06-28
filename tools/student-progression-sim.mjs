// 무과금 회차별 진행 시뮬레이터 (실제 게임 코드 사용).
//   가정: 부트스트랩용 C 장비 1쌍 보유(다이아 가챠 산물). 그 외 무과금.
//   루프: 자동전투로 수능 도달 → 결과 기록 → (운영중 누적 직장수입으로) 교육 구매 → 졸업(최고수입 직업)
//        → 교육·도감은 영구 누적 → 다음 회차 반복.
//   수입 모델: '연속 액티브 플레이' 기준(회차 소요시간 동안만 직장 수입 누적, 방치/오프라인 제외 → 보수적 하한).
//
//   실행: node tools/student-progression-sim.mjs [--runs 40] [--equip C]

import { createServer } from "vite";

const args = (() => {
  const a = {};
  for (let i = 2; i < process.argv.length; i += 1) {
    if (!process.argv[i].startsWith("--")) continue;
    const k = process.argv[i].slice(2);
    const v = process.argv[i + 1];
    a[k] = v === undefined || v.startsWith("--") ? true : v;
    if (a[k] !== true) i += 1;
  }
  return a;
})();
const RUNS = Number(args.runs) || 40;
const IDLE_HOURS = Number(args.idle) || 0; // 회차 사이 방치 시간(시간). 직장 수입 오프라인 적립(최대 12h/세션).
const START_MONEY = Number(args["start-money"]) || 0; // 온보딩/이벤트 자원(다이아 교환 환산 money) 초기 지급.
const EQUIP_RARITY = typeof args.equip === "string" ? args.equip : "C";
const EQUIP_STAT = { C: 100, B: 130, A: 160, S: 200, SS: 250, SSS: 330 }[EQUIP_RARITY] || 100;

const server = await createServer({ configFile: "vite.react.config.mjs", server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });
const subjectIds = ["korean", "english", "math", "social", "science"];
const sumStats = (s) => subjectIds.reduce((a, k) => a + Number(s.current.stats[k] || 0), 0);

try {
  const save = await server.ssrLoadModule("/game/save.js");
  const battle = await server.ssrLoadModule("/game/battleRoad.js");
  const equip = await server.ssrLoadModule("/game/equipment.js");
  const edu = await server.ssrLoadModule("/game/education.js");
  const work = await server.ssrLoadModule("/game/work.js");

  function mkItem(slot) {
    return { id: `${slot}-boot`, slot, rarity: EQUIP_RARITY, name: `boot-${EQUIP_RARITY}`,
      stats: Object.fromEntries(subjectIds.map((k) => [k, EQUIP_STAT])), sellPrice: 2500, source: "boot", createdAt: Date.now() };
  }
  function ensureEquipment(state) {
    const inv = [mkItem("stationery"), mkItem("book")];
    state.equipment = equip.normalizeEquipmentState({ inventory: inv, equipped: { stationery: inv[0].id, book: inv[1].id } });
    return state;
  }
  function totalEduLevels(state) {
    return Object.values(state.current.educationLevels || {}).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0);
  }
  // 현재 구매 가능+감당 가능한 교육을 싼 것부터 모두 구매(영구 누적).
  function buyAffordableEducation(state) {
    let changed = true;
    let bought = 0;
    while (changed) {
      changed = false;
      const candidates = edu.educationActions
        .filter((a) => edu.educationAvailable(state, a) && edu.educationCost(state, a) <= Number(state.money))
        .sort((a, b) => edu.educationCost(state, a) - edu.educationCost(state, b));
      if (candidates.length > 0) {
        const before = Number(state.money);
        state = edu.upgradeEducation(state, candidates[0].id);
        if (Number(state.money) < before) { changed = true; bought += 1; }
      }
    }
    return { state, bought };
  }

  let state = ensureEquipment(save.createDefaultGameState());
  state.money = Number(state.money) + START_MONEY; // 온보딩/이벤트 자원
  state = buyAffordableEducation(state).state; // 초기 자원으로 가능한 교육 선구매
  let simClock = 0; // ms
  state.lastIncomeAt = simClock;

  console.log("═".repeat(110));
  console.log(`무과금 회차별 진행 (부트스트랩 장비 ${EQUIP_RARITY}, 연속 액티브 플레이 기준 · 방치수입 제외)`);
  console.log("회차  누적시간  소요   직장수입/분  교육Lv  도감명  | 공부ESD 교육ESD 도감ESD 합계 | 점수  대학(rank)");
  console.log("─".repeat(110));

  for (let run = 1; run <= RUNS; run += 1) {
    // 1) 자동전투로 수능 도달
    let ticks = 0;
    while (ticks < 300000 && !state.current.awaitingDecision) {
      state = battle.advanceBattleByMs(state, 1000);
      ticks += 1;
    }
    const runMs = ticks * 1000;
    simClock += runMs;

    // 2) 회차 소요시간 동안 직장 수입 누적 + 회차 사이 방치 수입(있으면)
    state = work.accrueWorkIncome(state, simClock);
    if (IDLE_HOURS > 0) {
      simClock += IDLE_HOURS * 3600 * 1000;
      state = work.accrueWorkIncome(state, simClock); // 내부 12h 오프라인 캡 적용
    }

    // 3) 결과 기록
    const o = state.current.outcome;
    const adm = o && o.admissions && o.admissions[0] ? o.admissions[0] : null;
    const esd = (o && o.suneungEsd) || { studyEsd: 0, eduEsd: 0, collectionEsd: 0, total: 0 };
    const incomePerMin = work.workIncomePerMinute(state);
    const days = simClock / (24 * 3600 * 1000);
    const hours = simClock / (3600 * 1000);
    const timeLabel = days >= 1 ? `${days.toFixed(1)}일` : `${hours.toFixed(1)}시간`;
    console.log(
      String(run).padStart(3),
      timeLabel.padStart(8),
      `${Math.round(runMs / 60000)}분`.padStart(5),
      formatNum(incomePerMin).padStart(11),
      String(totalEduLevels(state)).padStart(6),
      String(esd.collectionEsd).padStart(6),
      "|",
      String(esd.studyEsd).padStart(6),
      String(esd.eduEsd).padStart(6),
      String(esd.collectionEsd).padStart(6),
      String(esd.total).padStart(5),
      "|",
      String(o ? Math.round(o.suneungScore) : 0).padStart(4),
      adm ? `${adm.name}(${adm.gameRank})` : "(없음)",
    );

    // 4) 교육 구매(영구 누적) — 다음 회차 수능에 반영
    state = buyAffordableEducation(state).state;

    // 5) 졸업: 선택 가능한 직업 중 최고 수입으로 → 졸업생 추가(수입·도감↑), 다음 회차 시작
    if (!o || !Array.isArray(o.careerCandidates)) break;
    const selectable = o.careerCandidates.filter((c) => c.selectable !== false);
    if (selectable.length === 0) break;
    const best = selectable.sort((a, b) => Number(b.incomePerMinute) - Number(a.incomePerMinute))[0];
    state = battle.acceptCareerChoice(state, { universityId: adm.universityId, careerId: best.careerId });
    // 장비·lastIncomeAt 보존 확인(acceptCareerChoice는 top-level 보존)
    state.lastIncomeAt = simClock;
  }
  console.log("═".repeat(110));
} finally {
  await server.close();
}

function formatNum(n) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
