import { chromium } from "@playwright/test";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_REAL_ESTATE_SMOKE_PORT || 5795);
const saveKey = "student-idle-rpg-save-v1";
const fixedNow = Date.parse("2026-06-22T00:00:00+09:00");
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const expeditionBalance = JSON.parse(readFileSync(resolve("data/expedition_balance.json"), "utf8"));
const subjectIds = ["korean", "english", "math", "social", "science"];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist-react/index.html is missing. Run `npm run react:build` first.");
  process.exit(1);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stats(value) {
  return Object.fromEntries(subjectIds.map((subject) => [subject, value]));
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

function expeditionMember(index) {
  const career = careers[index % careers.length];
  return {
    id: `real-estate-member-${index}`,
    sourceKey: `real-estate-smoke:${career.id}:${index}`,
    sourceRunNumber: 0,
    sourceCareerId: career.id,
    careerName: career.name,
    sourceUniversity: "부동산 검증",
    level: 20,
    exp: 0,
    promotionTier: "staff",
    baseStats: stats(5000),
    locked: false,
    createdAt: fixedNow + index,
    avatarGender: "male",
  };
}

function realEstateState() {
  return {
    cash: 0,
    properties: {},
    rentCarry: 0,
    lastRentAt: fixedNow,
    lastExpeditionFundAt: fixedNow,
    weeklyAssetGain: 0,
    lastWeeklyResetAt: fixedNow,
    claimedWeeklyRewardWeek: null,
    lastAssetValueSnapshot: 0,
  };
}

function seedState() {
  const members = Array.from({ length: 5 }, (_, index) => expeditionMember(index));
  return {
    schemaVersion: 3,
    contentRevision: "real-estate-smoke",
    runNumber: 11,
    money: 1200,
    diamonds: 0,
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
      members,
      partyMemberIds: members.map((member) => member.id),
      currentStage: 1,
      highestStage: 0,
      claimedBossStages: [],
      trainingExp: 0,
      chapterRun: chapterRun(1),
      lastResolvedAt: fixedNow,
      log: [],
      stageIndex: 0,
      clearedStageCount: 0,
      lastStageId: null,
    },
    realEstate: realEstateState(),
    archive: [],
    history: [],
    log: [],
  };
}

async function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function writeState(page, updaterSource) {
  await page.evaluate(
    ({ key, updater }) => {
      const state = JSON.parse(localStorage.getItem(key));
      const next = Function("state", `return (${updater})(state);`)(state);
      localStorage.setItem(key, JSON.stringify(next));
    },
    { key: saveKey, updater: updaterSource },
  );
}

async function waitForState(page, predicateSource) {
  await page.waitForFunction(
    ({ key, predicate }) => {
      const state = JSON.parse(localStorage.getItem(key));
      return Function("state", `return (${predicate})(state);`)(state);
    },
    { key: saveKey, predicate: predicateSource },
    { timeout: 8000 },
  );
}

async function main() {
  const server = createStaticServer();
  const port = await listenAvailable(server);
  const baseUrl = `http://127.0.0.1:${port}/?qaTools=1&pauseAutoBattle=1`;
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    }, { key: saveKey, state: seedState() });
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert(response && response.status() === 200, `HTTP status ${response?.status()}`);
    if (await page.locator(".load-failure").count()) throw new Error(await page.locator(".load-failure").innerText());

    const modeTexts = await page.locator(".mode-tab").allTextContents();
    assert(modeTexts.length === 3, `모드 탭 수가 3개가 아닙니다: ${modeTexts.length}`);
    assert(modeTexts.join("|") === "학생|원정대|부동산", `모드 탭 순서가 올바르지 않습니다: ${modeTexts.join("|")}`);

    await page.getByRole("button", { name: "부동산" }).click();
    await page.waitForSelector(".real-estate-scene", { timeout: 6000 });
    assert((await page.locator("[data-real-estate-card]").count()) === 10, "부동산 카드 10개가 렌더링되지 않았습니다.");
    const normalRewardButton = page.locator(".real-estate-reward-button");
    assert((await normalRewardButton.count()) === 1, "일반 랭킹 보상 수령 버튼이 렌더링되지 않았습니다.");
    assert(await normalRewardButton.isDisabled(), "주간 증가량이 0인데 일반 랭킹 보상 버튼이 활성화되었습니다.");
    const imageReady = await page.locator(".real-estate-backdrop").evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    assert(imageReady, "부동산 생성 배경 이미지가 렌더링되지 않았습니다.");
    const initialState = await readState(page);
    assert(initialState.realEstate.cash === 0, `초기 부동산 자금이 0이 아닙니다: ${initialState.realEstate.cash}`);

    await page.getByRole("button", { name: "원정대" }).click();
    await page.waitForSelector(".expedition-scene", { timeout: 6000 });
    await page.locator(".expedition-action-button").click();
    await waitForState(page, "(state) => state.expedition.highestStage >= 1 && state.realEstate.cash >= 100");

    await page.getByRole("button", { name: "부동산" }).click();
    const smallStudio = page.locator('[data-property-id="small_studio"]');
    await smallStudio.locator('[data-action="buy-one"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio && state.realEstate.properties.small_studio.count === 1");
    const afterOne = await readState(page);
    await writeState(page, `(state) => {
      state.realEstate.lastRentAt = Date.now() - 120000;
      return state;
    }`);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "부동산" }).click();
    await waitForState(page, `(state) => state.realEstate.cash > ${afterOne.realEstate.cash}`);

    await writeState(page, `(state) => {
      state.expedition.highestStage = 100;
      state.expedition.clearedStageCount = 100;
      state.realEstate.cash = 5000000;
      state.realEstate.lastAssetValueSnapshot = 0;
      return state;
    }`);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "부동산" }).click();
    await smallStudio.locator('[data-action="buy-ten"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio.count >= 11");
    const scaleText = await smallStudio.innerText();
    assert(scaleText.includes("라인"), "10개 구매 후 규모 명칭이 라인으로 바뀌지 않았습니다.");
    await smallStudio.locator('[data-action="buy-max"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio.count > 11");
    const rankingText = await page.locator(".real-estate-ranking-panel").innerText();
    assert(rankingText.includes("예상 순위") && rankingText.includes("예상 보상"), "랭킹 preview가 표시되지 않았습니다.");
    await normalRewardButton.waitFor({ state: "attached", timeout: 4000 });
    await page.waitForFunction(() => {
      const button = document.querySelector(".real-estate-reward-button");
      return button && button instanceof HTMLButtonElement && !button.disabled && button.innerText.includes("주간 보상 수령");
    });

    const beforeReward = await readState(page);
    await normalRewardButton.click();
    await waitForState(page, `(state) => state.diamonds > ${beforeReward.diamonds} && state.realEstate.claimedWeeklyRewardWeek !== null`);
    const claimedState = await readState(page);
    assert(claimedState.diamonds > beforeReward.diamonds, "일반 부동산 주간 보상 다이아가 지급되지 않았습니다.");
    await page.waitForFunction(() => {
      const button = document.querySelector(".real-estate-reward-button");
      return button && button instanceof HTMLButtonElement && button.disabled && button.innerText.includes("수령 완료");
    });

    await page.getByLabel("디버그 메뉴").click();
    const rewardButton = page.getByRole("button", { name: /부동산 주간 보상 수령/ });
    await rewardButton.waitFor({ state: "attached", timeout: 4000 });
    assert(await rewardButton.isDisabled(), "일반 보상 수령 후 DEBUG 보상 중복 수령 버튼이 비활성화되지 않았습니다.");

    console.log("React 부동산 smoke 통과: 탭, 배경, 원정대 자금, 구매, 임대수익, 랭킹 preview, 일반 주간 보상, DEBUG 중복 방지 확인");
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
