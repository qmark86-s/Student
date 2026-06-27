import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const outDir = resolve("artifacts/react-vite-expedition-rules-smoke");
const reportPath = resolve(outDir, "report.json");
const preferredPort = Number(process.env.REACT_EXPEDITION_RULES_SMOKE_PORT || 5710);
const saveKey = "student-idle-rpg-save-v1";
const fixedNow = Date.now();
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const expeditionBalance = JSON.parse(readFileSync(resolve("data/expedition_balance.json"), "utf8"));
const defaultCombatCareer = careers.find((career) => career.id === "ai_researcher") || careers[0];
const defaultFailureCareer = careers.find((career) => career.id === "doctor") || careers[0];
const subjectIds = ["korean", "english", "math", "social", "science"];
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveRequest(url) {
  const rawPath = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const relative = normalize(rawPath === "/" ? "index.html" : rawPath.slice(1));
  const absolute = resolve(join(root, relative));
  if (absolute !== root && !absolute.startsWith(root + sep)) return null;
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return null;
  return absolute;
}

function createStaticServer() {
  return createServer((request, response) => {
    const file = resolveRequest(request.url || "/");
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(file).pipe(response);
  });
}

function listen(server, port) {
  return new Promise((resolveListen, reject) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolveListen(port);
    };
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, "127.0.0.1");
  });
}

async function listenAvailable(server) {
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    try {
      return await listen(server, port);
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(`No available port from ${preferredPort} to ${preferredPort + 49}`);
}

function closeServer(server) {
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
}

function chapterRun(currentStage, tempExp = 0) {
  const chapter = Math.floor((currentStage - 1) / expeditionBalance.chapterSize) + 1;
  const expPerLevel = expeditionBalance.chapterRunExpPerLevel;
  return {
    chapter,
    tempLevel: Math.max(1, Math.floor(tempExp / expPerLevel) + 1),
    tempExp,
    boostMultiplier: Math.round((1 + Math.max(0, Math.floor(tempExp / expPerLevel)) * 0.01) * 1000) / 1000,
  };
}

function stats(value) {
  return Object.fromEntries(subjectIds.map((subject) => [subject, value]));
}

function member(index, { career = defaultCombatCareer, statValue = 1000, tier = "staff", party = true, locked = false } = {}) {
  return {
    id: `rules-member-${index}`,
    sourceKey: `rules:${career.id}:${index}`,
    sourceRunNumber: 0,
    sourceCareerId: career.id,
    careerName: career.name,
    sourceUniversity: "규칙 검증",
    level: 1,
    exp: 0,
    promotionTier: tier,
    baseStats: stats(statValue),
    locked,
    createdAt: fixedNow + index,
    avatarGender: "male",
    party,
  };
}

function gameState({
  currentStage = 1,
  highestStage = Math.max(0, currentStage - 1),
  members = [],
  partyMemberIds = members.filter((item) => item.party).map((item) => item.id),
  claimedBossStages = [],
  trainingExp = 0,
  diamonds = 0,
  money = 1200,
  tempExp = 0,
  lastResolvedAt = fixedNow,
} = {}) {
  return {
    schemaVersion: 2,
    contentRevision: "rules-smoke",
    runNumber: 9,
    money,
    diamonds,
    workSlots: 5,
    lastIncomeAt: fixedNow,
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
      aptitude: stats(0),
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: stats(100),
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: stats(0),
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
    },
    companions: [],
    expedition: {
      members: members.map(({ party, ...item }) => item),
      partyMemberIds,
      currentStage,
      highestStage,
      claimedBossStages,
      trainingExp,
      chapterRun: chapterRun(currentStage, tempExp),
      lastResolvedAt,
      log: [],
      stageIndex: currentStage - 1,
      clearedStageCount: highestStage,
      lastStageId: null,
    },
    realEstate: {
      cash: 0,
      properties: {},
      rentCarry: 0,
      lastRentAt: fixedNow,
      lastExpeditionFundAt: fixedNow,
      weeklyAssetGain: 0,
      lastWeeklyResetAt: fixedNow,
      claimedWeeklyRewardWeek: null,
      lastAssetValueSnapshot: 0,
    },
    archive: [],
    history: [],
    log: [],
  };
}

function stripState(state) {
  return {
    currentStage: state.expedition.currentStage,
    highestStage: state.expedition.highestStage,
    stageIndex: state.expedition.stageIndex,
    clearedStageCount: state.expedition.clearedStageCount,
    trainingExp: state.expedition.trainingExp,
    diamonds: state.diamonds,
    claimedBossStages: state.expedition.claimedBossStages,
    memberCount: state.expedition.members.length,
    partyCount: state.expedition.partyMemberIds.length,
    firstMemberLevel: state.expedition.members[0]?.level,
    firstMemberTier: state.expedition.members[0]?.promotionTier,
    logText: state.expedition.log[0]?.text || "",
    pendingTrainingExp: state.expedition.pendingReward?.trainingExp ?? 0,
    pendingDiamonds: state.expedition.pendingReward?.diamonds ?? 0,
    pendingRealEstateCash: state.expedition.pendingReward?.realEstateCash ?? 0,
    pendingBattles: state.expedition.pendingReward?.battles ?? 0,
    realEstateCash: state.realEstate?.cash ?? 0,
    partyMemberIds: state.expedition.partyMemberIds,
    lastBattleResult: state.expedition.pendingReward?.lastBattle?.result || "",
    lastBattleReason: state.expedition.pendingReward?.lastBattle?.resultReason || "",
    lastBattleEvents: state.expedition.pendingReward?.lastBattle?.events?.length ?? 0,
  };
}

async function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function openScenario(browser, baseUrl, seed) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: saveKey, state: seed });
  let response = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (response && response.status() === 200) break;
    await page.waitForTimeout(200);
  }
  assert(response && response.status() === 200, `HTTP status ${response?.status()}`);
  if (await page.locator(".load-failure").count()) throw new Error(await page.locator(".load-failure").innerText());
  const rewardDialog = page.getByRole("dialog", { name: "원정 보상" });
  if (await rewardDialog.count()) {
    await rewardDialog.getByRole("button", { name: "닫기" }).click();
  }
  await page.getByRole("button", { name: "원정대" }).click();
  await page.waitForSelector(".expedition-scene", { timeout: 6000 });
  return page;
}

async function clickAction(page) {
  await page.locator(".expedition-action-button").click();
}

async function waitForState(page, predicateSource) {
  await page.waitForFunction(
    ({ key, predicate }) => {
      const state = JSON.parse(localStorage.getItem(key));
      return Function("state", `return (${predicate})(state);`)(state);
    },
    { key: saveKey, predicate: predicateSource },
    { timeout: 6000 },
  );
}

async function scenario(browser, baseUrl, name, seed, run) {
  const page = await openScenario(browser, baseUrl, seed);
  try {
    const before = await readState(page);
    const result = await run(page, before);
    const after = await readState(page);
    return { name, before: stripState(before), after: stripState(after), ...result };
  } finally {
    await page.close();
  }
}

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist/index.html is missing. Run `npm run react:build` first.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const highParty = Array.from({ length: 5 }, (_, index) => member(index + 1, { statValue: 100000 }));
const lowParty = Array.from({ length: 5 }, (_, index) => member(index + 1, { career: defaultFailureCareer, statValue: 0 }));
const fusionCareer = careers[0];
const fusionMembers = [
  member(101, { career: fusionCareer, statValue: 5000, party: false }),
  member(102, { career: fusionCareer, statValue: 5100, party: false }),
];

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/?qaTools=1`;
const browser = await chromium.launch({ headless: true });
const checks = [];
const failures = [];

try {
  checks.push(await scenario(browser, baseUrl, "boss-first-clear", gameState({ currentStage: 100, highestStage: 99, members: highParty, diamonds: 100, tempExp: 40 }), async (page, before) => {
    await clickAction(page);
    await waitForState(page, "state => state.expedition.currentStage === 101");
    const after = await readState(page);
    assert(after.expedition.highestStage === 100, "보스 첫 클리어 highestStage가 100이어야 합니다.");
    assert(after.expedition.claimedBossStages.includes(100), "보스 첫 클리어 기록이 필요합니다.");
    assert(after.diamonds > before.diamonds, "수동 보스 첫 클리어 다이아가 즉시 지급되어야 합니다.");
    assert(after.expedition.trainingExp > before.expedition.trainingExp, "수동 보스 첫 클리어 EXP가 즉시 지급되어야 합니다.");
    assert(after.realEstate.cash > before.realEstate.cash, "수동 보스 첫 클리어 부동산 자금이 즉시 지급되어야 합니다.");
    assert(after.expedition.pendingReward.diamonds === 0, "수동 보스 첫 클리어 다이아가 pending에 누적되면 안 됩니다.");
    assert(after.expedition.pendingReward.trainingExp === 0, "수동 보스 첫 클리어 EXP가 pending에 누적되면 안 됩니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "boss-reward-not-repeated", gameState({ currentStage: 100, highestStage: 99, members: highParty, diamonds: 777, claimedBossStages: [100] }), async (page, before) => {
    await clickAction(page);
    await waitForState(page, "state => state.expedition.currentStage === 101");
    const after = await readState(page);
    assert(after.diamonds === before.diamonds, "이미 claim된 보스 다이아가 중복 지급되면 안 됩니다.");
    assert(after.expedition.pendingReward.diamonds === 0, "이미 claim된 보스 다이아가 pending에도 중복 누적되면 안 됩니다.");
    assert(after.expedition.trainingExp > before.expedition.trainingExp, "반복 보스 EXP는 즉시 지급되어야 합니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "boss-power-shortage-returns-to-segment-start", gameState({ currentStage: 100, highestStage: 99, members: lowParty, trainingExp: 5 }), async (page, before) => {
    await clickAction(page);
    await waitForState(page, "state => state.expedition.currentStage === 1 && state.expedition.log.length > 0");
    const after = await readState(page);
    assert(after.expedition.highestStage === before.expedition.highestStage, "보스 실패가 최고 Stage를 올리면 안 됩니다.");
    assert(after.expedition.trainingExp === before.expedition.trainingExp, "보스 실패가 EXP를 지급하면 안 됩니다.");
    assert(after.expedition.claimedBossStages.length === 0, "보스 실패가 claim 기록을 남기면 안 됩니다.");
    assert(after.expedition.pendingReward.lastBattle.result !== "win", "보스 실패 전투 리포트가 필요합니다.");
    assert(after.expedition.pendingReward.lastBattle.resultReason === "보스 실패 롤백", "보스 실패 롤백 사유가 전투 리포트에 필요합니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "normal-power-shortage-keeps-stage", gameState({ currentStage: 2, highestStage: 1, members: lowParty, trainingExp: 7 }), async (page, before) => {
    await clickAction(page);
    await waitForState(page, "state => state.expedition.currentStage === 2 && state.expedition.log.length > 0");
    const after = await readState(page);
    assert(after.expedition.highestStage === before.expedition.highestStage, "일반 Stage 실패가 최고 Stage를 올리면 안 됩니다.");
    assert(after.expedition.trainingExp === before.expedition.trainingExp, "일반 Stage 실패가 EXP를 지급하면 안 됩니다.");
    assert(after.expedition.pendingReward.trainingExp === 0, "일반 실패가 pending EXP를 지급하면 안 됩니다.");
    assert(after.expedition.pendingReward.battles === 0, "수동 일반 실패가 pending 전투 수를 올리면 안 됩니다.");
    const report = after.expedition.pendingReward.lastBattle;
    assert(Array.isArray(report.partyHp) && report.partyHp.length === 5, "아군 개별 HP 배열이 필요합니다.");
    assert(Array.isArray(report.enemyHp) && report.enemyHp.length >= 1, "적 개별 HP 배열이 필요합니다.");
    assert(report.events.some((event) => event.kind === "heal"), "힐러가 공격 대신 회복 이벤트를 남겨야 합니다.");
    assert(new Set(report.events.filter((event) => event.kind === "damage").map((event) => event.actor)).size >= 2, "개별 몬스터가 각각 전투에 참여해야 합니다.");
    const enemyActionCounts = Object.values(report.actionCounts.enemies);
    assert(Math.max(...enemyActionCounts) > Math.min(...enemyActionCounts), "몬스터 공격속도 차이가 행동 횟수에 반영되어야 합니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "offline-auto-pending-and-cap", gameState({ currentStage: 1, highestStage: 0, members: highParty, lastResolvedAt: fixedNow - 9 * 60 * 60 * 1000 }), async (page) => {
    await waitForState(page, "state => state.expedition.pendingReward.battles > 0");
    const after = await readState(page);
    assert(after.expedition.pendingReward.battles <= 480, "오프라인 정산 전투 수가 480 상한을 넘으면 안 됩니다.");
    assert(after.expedition.currentStage > 1, "오프라인 자동 정산이 Stage를 진행해야 합니다.");
    assert(after.expedition.pendingReward.trainingExp > 0, "오프라인 자동 정산 EXP가 pending에 필요합니다.");
    const beforeClaim = await readState(page);
    await page.getByRole("button", { name: "누적 보상 받기" }).click();
    await page.getByRole("button", { name: "받기", exact: true }).click();
    await waitForState(page, "state => state.expedition.pendingReward.trainingExp === 0 && state.realEstate.cash > 0");
    const afterClaim = await readState(page);
    assert(afterClaim.expedition.trainingExp > beforeClaim.expedition.trainingExp, "pending 받기 후 EXP가 지급되어야 합니다.");
    assert(afterClaim.realEstate.cash >= beforeClaim.expedition.pendingReward.realEstateCash, "pending 받기 후 부동산 자금이 지급되어야 합니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "recommended-party-fills-top-five-by-power", gameState({
    currentStage: 1,
    highestStage: 0,
    members: [10, 70, 50, 100, 30, 90, 60].map((statValue, index) => member(301 + index, { statValue, party: false })),
    partyMemberIds: [],
  }), async (page) => {
    await page.getByRole("button", { name: "파티" }).click();
    await page.getByRole("button", { name: "추천 편성" }).click();
    await waitForState(page, "state => state.expedition.partyMemberIds.length === 5");
    const after = await readState(page);
    const expected = ["rules-member-304", "rules-member-306", "rules-member-302", "rules-member-307", "rules-member-303"];
    assert(JSON.stringify(after.expedition.partyMemberIds) === JSON.stringify(expected), `추천 편성이 전투력순 상위 5명이 아닙니다: ${after.expedition.partyMemberIds.join(",")}`);
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "growth-invest-levels-member", gameState({ currentStage: 1, highestStage: 0, members: [member(201, { statValue: 50000 })], trainingExp: 999 }), async (page, before) => {
    await page.getByRole("button", { name: /투자/ }).first().click();
    await waitForState(page, "state => state.expedition.members[0].level === 2");
    const after = await readState(page);
    assert(after.expedition.trainingExp < before.expedition.trainingExp, "성장 투자는 EXP를 소모해야 합니다.");
    return {};
  }));

  checks.push(await scenario(browser, baseUrl, "fusion-promotes-two-members", gameState({ currentStage: 1, highestStage: 0, members: fusionMembers, partyMemberIds: [] }), async (page) => {
    await page.getByRole("button", { name: "대원 관리" }).click();
    await page.waitForSelector(".expedition-fusion-card", { timeout: 6000 });
    await page.getByRole("button", { name: "합성" }).first().click();
    await waitForState(page, "state => state.expedition.members.length === 1 && state.expedition.members[0].promotionTier === 'assistant_manager'");
    return {};
  }));
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
  await closeServer(server);
}

const report = {
  baseUrl,
  checked: checks.length,
  checks,
  failures,
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  console.error(`REACT_VITE_EXPEDITION_RULES_SMOKE_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log("REACT_VITE_EXPEDITION_RULES_SMOKE_OK");
