import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_SHOP_DEBUG_SMOKE_PORT || 5710);
const saveKey = "student-idle-rpg-save-v1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

function makeSeedState() {
  return {
    schemaVersion: 2,
    runNumber: 3,
    money: 1200,
    diamonds: 20000,
    workSlots: 5,
    lastIncomeAt: Date.now(),
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
      aptitude: { korean: 0, english: 0, math: 0, social: 0, science: 0 },
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: { korean: 0, english: 0, math: 0, social: 0, science: 0 },
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
    },
    companions: [],
    expedition: {
      members: [],
      partyMemberIds: [],
      currentStage: 1,
      highestStage: 0,
      claimedBossStages: [],
      trainingExp: 0,
      chapterRun: { chapter: 1, tempLevel: 1, tempExp: 0, boostMultiplier: 1 },
      lastResolvedAt: Date.now(),
      log: [],
      stageIndex: 0,
      clearedStageCount: 0,
      lastStageId: null,
    },
    archive: [],
    history: [],
    log: [],
  };
}

async function stateSnapshot(page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const doc = document.documentElement;
    const helperFrames = [...document.querySelectorAll(".learning-helper-frame, .robot-helper-frame")];
    const unitFrames = [...document.querySelectorAll(".expedition-unit-frame")];
    const enemyFrames = [...document.querySelectorAll(".expedition-enemy-frame")];
    return {
      text: document.body.innerText,
      diamonds: state.diamonds,
      money: state.money,
      companionCount: state.companions?.length ?? 0,
      robotCount: state.companions?.filter((companion) => companion.kind === "robot-helper" || companion.source === "robot").length ?? 0,
      careerCount: state.companions?.filter((companion) => companion.careerId).length ?? 0,
      expeditionMemberCount: state.expedition?.members?.length ?? 0,
      partyMemberCount: state.expedition?.partyMemberIds?.length ?? 0,
      stageIndex: state.expedition?.stageIndex ?? -1,
      clearedStageCount: state.expedition?.clearedStageCount ?? -1,
      shopModal: document.querySelectorAll(".shop-modal").length,
      debugModal: document.querySelectorAll(".debug-modal").length,
      gachaPopup: document.querySelectorAll(".gacha-popup").length,
      helperUnits: document.querySelectorAll(".learning-helper-unit").length,
      helperFrames: helperFrames.length,
      helperFramesLoaded: helperFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      companionCards: document.querySelectorAll(".companion-card").length,
      expeditionUnits: document.querySelectorAll(".expedition-unit-avatar.large").length,
      unitFrames: unitFrames.length,
      unitFramesLoaded: unitFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      enemyVisualCount: document.querySelectorAll(".expedition-enemy-visual").length,
      enemyFrames: enemyFrames.length,
      enemyFramesLoaded: enemyFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  }, saveKey);
}

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ headless: true });

try {
  const consoleErrors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
    Math.random = () => 0.25;
  }, { key: saveKey, state: makeSeedState() });

  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".phone-frame", { timeout: 15000 });

  await page.getByRole("button", { name: "상점" }).click();
  await page.waitForSelector(".shop-modal", { timeout: 6000 });
  await page.getByRole("button", { name: "로봇" }).click();
  await page.getByRole("button", { name: /호출 300/ }).click();
  await page.waitForSelector(".gacha-popup", { timeout: 6000 });
  const afterGacha = await stateSnapshot(page);

  await page.getByRole("button", { name: "확인" }).click();
  await page.locator(".shop-modal .icon-button.dark").click();
  await page.waitForSelector(".shop-modal", { state: "detached", timeout: 6000 });
  await page.waitForSelector(".learning-helper-unit", { timeout: 6000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".learning-helper-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterShopClose = await stateSnapshot(page);

  await page.getByRole("button", { name: "동료" }).click();
  await page.waitForSelector(".companion-card.robot-companion", { timeout: 6000 });
  const afterCompanionTab = await stateSnapshot(page);

  await page.getByRole("button", { name: "디버그 메뉴" }).click();
  await page.waitForSelector(".debug-modal", { timeout: 6000 });
  await page.getByRole("button", { name: "동료 랜덤 +5" }).click();
  await page.waitForFunction((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return state.companions?.filter((companion) => companion.careerId).length === 0 && state.expedition?.members?.length === 5 && state.expedition?.partyMemberIds?.length === 5;
  }, saveKey, { timeout: 6000 });
  const afterDebugAdd = await stateSnapshot(page);

  await page.locator(".debug-modal .icon-button.dark").click();
  await page.getByRole("button", { name: "원정대" }).click();
  await page.waitForSelector(".expedition-scene .expedition-unit-frame", { timeout: 6000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterExpedition = await stateSnapshot(page);

  await page.getByRole("button", { name: "돌파" }).click();
  await page.waitForFunction((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return state.expedition?.stageIndex === 1 && state.expedition?.clearedStageCount === 1;
  }, saveKey, { timeout: 6000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterClear = await stateSnapshot(page);

  const failures = [];
  if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
  if (afterGacha.gachaPopup !== 1) failures.push(`Expected gacha popup, got ${afterGacha.gachaPopup}`);
  if (afterGacha.robotCount !== 1) failures.push(`Expected 1 robot helper after gacha, got ${afterGacha.robotCount}`);
  if (afterGacha.diamonds !== 19700) failures.push(`Expected diamonds 19700 after gacha, got ${afterGacha.diamonds}`);
  if (afterShopClose.helperUnits !== 1) failures.push(`Expected 1 visible learning helper, got ${afterShopClose.helperUnits}`);
  if (afterShopClose.helperFrames !== 4 || afterShopClose.helperFramesLoaded !== 4) failures.push(`Expected 4 loaded helper frames, got ${afterShopClose.helperFramesLoaded}/${afterShopClose.helperFrames}`);
  if (!afterShopClose.text.includes("학습 도우미 1/3")) failures.push("Growth panel did not show 학습 도우미 1/3");
  if (afterCompanionTab.companionCards !== 1) failures.push(`Expected robot companion card, got ${afterCompanionTab.companionCards}`);
  if (afterDebugAdd.debugModal !== 1) failures.push(`Expected debug modal, got ${afterDebugAdd.debugModal}`);
  if (afterDebugAdd.companionCount !== 1 || afterDebugAdd.careerCount !== 0) failures.push(`Expected debug to keep student companions at robot-only 1/0, got ${afterDebugAdd.companionCount}/${afterDebugAdd.careerCount}`);
  if (afterDebugAdd.expeditionMemberCount !== 5) failures.push(`Expected 5 expedition members from debug, got ${afterDebugAdd.expeditionMemberCount}`);
  if (afterDebugAdd.partyMemberCount !== 5) failures.push(`Expected 5 expedition party members, got ${afterDebugAdd.partyMemberCount}`);
  if (afterExpedition.expeditionUnits !== 5) failures.push(`Expected 5 expedition unit avatars, got ${afterExpedition.expeditionUnits}`);
  if (afterExpedition.unitFrames !== 20 || afterExpedition.unitFramesLoaded !== 20) failures.push(`Expected 20 loaded unit frames, got ${afterExpedition.unitFramesLoaded}/${afterExpedition.unitFrames}`);
  if (afterExpedition.enemyVisualCount < 1 || afterExpedition.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies, got ${afterExpedition.enemyVisualCount}`);
  if (afterExpedition.enemyFrames !== afterExpedition.enemyVisualCount * 4 || afterExpedition.enemyFramesLoaded !== afterExpedition.enemyFrames) failures.push(`Expected loaded enemy frames to match enemies, got ${afterExpedition.enemyFramesLoaded}/${afterExpedition.enemyFrames} for ${afterExpedition.enemyVisualCount} enemies`);
  if (afterClear.stageIndex !== 1 || afterClear.clearedStageCount !== 1) failures.push(`Expected cleared stage 1/1, got ${afterClear.stageIndex}/${afterClear.clearedStageCount}`);
  if (afterClear.money !== afterExpedition.money) failures.push(`Expected money to stay unchanged after expedition clear, got ${afterExpedition.money} -> ${afterClear.money}`);
  if (afterClear.unitFrames !== 20 || afterClear.unitFramesLoaded !== 20) failures.push(`Expected 20 loaded unit frames after clear, got ${afterClear.unitFramesLoaded}/${afterClear.unitFrames}`);
  if (afterClear.enemyVisualCount < 1 || afterClear.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies after clear, got ${afterClear.enemyVisualCount}`);
  if (afterClear.enemyFrames !== afterClear.enemyVisualCount * 4 || afterClear.enemyFramesLoaded !== afterClear.enemyFrames) failures.push(`Expected loaded enemy frames after clear to match enemies, got ${afterClear.enemyFramesLoaded}/${afterClear.enemyFrames} for ${afterClear.enemyVisualCount} enemies`);
  for (const snapshot of [afterGacha, afterShopClose, afterCompanionTab, afterDebugAdd, afterExpedition, afterClear]) {
    if (snapshot.horizontalOverflow > 4) failures.push(`Horizontal overflow ${snapshot.horizontalOverflow}px`);
  }
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, afterGacha, afterShopClose, afterCompanionTab, afterDebugAdd, afterExpedition, afterClear, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_SHOP_DEBUG_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_SHOP_DEBUG_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
