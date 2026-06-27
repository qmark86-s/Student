import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const preferredPort = Number(process.env.REACT_BATTLE_SMOKE_PORT || 5680);
const saveKey = "student-idle-rpg-save-v1";
const resultTabIndex = 5;
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist/index.html is missing. Run `npm run react:build` first.");
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

function makeRetakeBattleState() {
  const strongStats = { korean: 999999, english: 999999, math: 999999, social: 999999, science: 999999 };
  return {
    schemaVersion: 2,
    runNumber: 11,
    money: 0,
    diamonds: 0,
    workSlots: 5,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "REPEATER",
      avatarGender: "male",
      retakeCount: 1,
      monthIndex: 0,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 0,
      studyLevels: {},
      aptitude: strongStats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: strongStats,
      track: "science",
      trackLocked: true,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
      road: {
        mode: "school",
        phase: "travel",
        encounterIndex: 0,
        encounterTotal: 4,
        phaseStartedAt: 0,
        lastCompletedEncounterId: null,
      },
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

async function collectSnapshot(page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const monsterArt = [...document.querySelectorAll(".battle-scene-monster-art")];
    const doc = document.documentElement;
    return {
      text: document.body.innerText,
      roadMode: state.current.road?.mode ?? "",
      roadEncounterIndex: state.current.road?.encounterIndex ?? -1,
      battleKind: state.current.battle?.kind ?? "",
      battleEncounterIndex: state.current.battle?.encounterIndex ?? -1,
      retakeCount: state.current.retakeCount ?? 0,
      awaitingDecision: Boolean(state.current.awaitingDecision),
      outcomeCareerCount: state.current.outcome?.careerCandidates?.length ?? 0,
      sceneEnemies: document.querySelectorAll(".battle-scene-enemy").length,
      sceneEnemyImages: monsterArt.filter((element) => getComputedStyle(element).backgroundImage.includes("url(")).length,
      sceneHpBars: document.querySelectorAll(".battle-scene-hp").length,
      sceneSuneungEnemies: document.querySelectorAll(".battle-scene-enemy.suneung").length,
      vfxTokens: document.querySelectorAll(".curriculum-attack-vfx-token").length,
      roadPhaseClass: document.querySelector(".battle-road-lineup")?.getAttribute("data-road-phase") ?? "",
      sceneControls: document.querySelectorAll(".scene-controls").length,
      autoToggleText: document.querySelector(".battle-auto-toggle")?.innerText.trim() ?? "",
      debugCompleteText: document.querySelector(".battle-debug-complete")?.innerText.replace(/\s+/g, "") ?? "",
      hasAutoAllocateText: document.body.innerText.includes("자동 분배") || document.body.innerText.includes("수동 분배"),
      hasBattleCompleteText: document.body.innerText.includes("전투 완료"),
      careerChoiceCount: document.querySelectorAll(".career-choice.ranked").length,
      careerPortraitCount: document.querySelectorAll(".career-choice-aura.career-portrait").length,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  }, saveKey);
}

async function clickDebug(page) {
  await page.click(".battle-debug-complete");
}

async function waitForRoad(page, { mode, index, enemies }) {
  await page.waitForFunction(
    ({ key, mode, index, enemies }) => {
      const state = JSON.parse(localStorage.getItem(key));
      if (state.current.road?.mode !== mode) return false;
      if (state.current.road?.encounterIndex !== index) return false;
      return document.querySelectorAll(".battle-scene-enemy").length === enemies;
    },
    { key: saveKey, mode, index, enemies },
    { timeout: 6000 },
  );
  await page.waitForTimeout(100);
}

async function collectLiveTimerSnapshot(page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const battle = state.current.battle;
    const hudText = document.querySelector(".battle-arena-progress strong")?.textContent?.trim() || "";
    const hudMatch = hudText.match(/(\d+)초/);
    return {
      elapsedMs: battle.elapsedMs,
      maxDurationMs: battle.maxDurationMs,
      hudText,
      hudSeconds: hudMatch ? Number(hudMatch[1]) : -1,
      expectedSeconds: Math.ceil(Math.max(0, battle.maxDurationMs - battle.elapsedMs) / 1000),
    };
  }, saveKey);
}

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/`;
const qaUrl = `${baseUrl}?qaTools=1&pauseAutoBattle=1`;
const browser = await chromium.launch({ headless: true });

try {
  const consoleErrors = [];
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(qaUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".battle-road-lineup", { timeout: 15000 });
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey, { timeout: 5000 });
  const defaultBattle = await collectSnapshot(page);
  await clickDebug(page);
  await waitForRoad(page, { mode: "school", index: 1, enemies: 3 });
  const defaultAfterDebug = await collectSnapshot(page);
  await page.close();

  const liveTimerPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  liveTimerPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  liveTimerPage.on("pageerror", (error) => pageErrors.push(error.message));
  await liveTimerPage.goto(`${baseUrl}?qaTools=1`, { waitUntil: "networkidle" });
  await liveTimerPage.waitForSelector(".battle-arena-progress strong", { timeout: 15000 });
  await liveTimerPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.current.battle?.elapsedMs >= 1000;
    },
    saveKey,
    { timeout: 6000 },
  );
  const liveTimer = await collectLiveTimerSnapshot(liveTimerPage);
  await liveTimerPage.close();

  const retakePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  retakePage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  retakePage.on("pageerror", (error) => pageErrors.push(error.message));
  await retakePage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: makeRetakeBattleState(),
  });
  await retakePage.goto(qaUrl, { waitUntil: "networkidle" });
  await retakePage.waitForSelector(".battle-road-lineup", { timeout: 15000 });
  const retakeStart = await collectSnapshot(retakePage);

  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "school", index: 1, enemies: 3 });
  const retakeSecondEncounter = await collectSnapshot(retakePage);
  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "school", index: 2, enemies: 3 });
  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "school", index: 3, enemies: 3 });
  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "suneung", index: 0, enemies: 1 });
  const afterRetakeYear = await collectSnapshot(retakePage);

  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "suneung", index: 1, enemies: 1 });
  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "suneung", index: 2, enemies: 1 });
  await clickDebug(retakePage);
  await waitForRoad(retakePage, { mode: "suneung", index: 3, enemies: 2 });
  const beforeFinalSuneung = await collectSnapshot(retakePage);
  await clickDebug(retakePage);
  try {
    await retakePage.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.awaitingDecision === true, saveKey, { timeout: 6000 });
  } catch (error) {
    const afterFinalClick = await collectSnapshot(retakePage).catch((snapshotError) => ({ snapshotError: snapshotError.message }));
    throw new Error(`Final suneung completion did not persist awaitingDecision: ${JSON.stringify({ afterFinalClick, consoleErrors, pageErrors })}`, { cause: error });
  }
  await retakePage.evaluate((index) => document.querySelectorAll("button.tab")[index].click(), resultTabIndex);
  await retakePage.waitForSelector(".panel.decision .career-choice.ranked", { timeout: 6000 });
  const afterDecision = await collectSnapshot(retakePage);
  await retakePage.close();

  const failures = [];
  if (defaultBattle.roadMode !== "school") failures.push(`Expected default school road, got ${defaultBattle.roadMode}`);
  if (defaultBattle.roadEncounterIndex !== 0) failures.push(`Expected default encounter index 0, got ${defaultBattle.roadEncounterIndex}`);
  if (defaultBattle.sceneEnemies !== 3) failures.push(`Expected 3 default enemies, got ${defaultBattle.sceneEnemies}`);
  if (defaultBattle.sceneEnemyImages !== 3) failures.push(`Expected 3 default enemy images, got ${defaultBattle.sceneEnemyImages}`);
  if (defaultBattle.sceneHpBars !== 1) failures.push(`Expected 1 default HP bar, got ${defaultBattle.sceneHpBars}`);
  if (defaultBattle.vfxTokens !== 0) failures.push(`Expected no default curriculum VFX token, got ${defaultBattle.vfxTokens}`);
  if (defaultBattle.roadPhaseClass !== "travel") failures.push(`Expected default travel phase, got ${defaultBattle.roadPhaseClass}`);
  if (defaultBattle.sceneControls !== 0) failures.push(`Expected no legacy scene controls, got ${defaultBattle.sceneControls}`);
  if (defaultBattle.autoToggleText !== "Auto") failures.push(`Expected Auto overlay text, got ${defaultBattle.autoToggleText}`);
  if (defaultBattle.debugCompleteText !== "DEBUG") failures.push(`Expected DEBUG overlay text, got ${defaultBattle.debugCompleteText}`);
  if (defaultBattle.hasAutoAllocateText) failures.push("Expected no auto allocation copy in arena");
  if (defaultBattle.hasBattleCompleteText) failures.push("Expected no battle-complete copy in arena");
  if (defaultAfterDebug.roadEncounterIndex !== 1) failures.push(`Default DEBUG did not advance to encounter 1, got ${defaultAfterDebug.roadEncounterIndex}`);
  if (defaultAfterDebug.sceneEnemies !== 3) failures.push(`Expected 3 enemies after default debug, got ${defaultAfterDebug.sceneEnemies}`);
  if (liveTimer.elapsedMs < 1000) failures.push(`Live timer did not advance enough: ${liveTimer.elapsedMs}`);
  if (liveTimer.hudSeconds !== liveTimer.expectedSeconds) failures.push(`Live HUD timer ${liveTimer.hudText} did not match expected ${liveTimer.expectedSeconds}초 at elapsed ${liveTimer.elapsedMs}`);

  if (retakeStart.roadMode !== "school" || retakeStart.roadEncounterIndex !== 0) failures.push(`Retake did not start at school encounter 0: ${retakeStart.roadMode}/${retakeStart.roadEncounterIndex}`);
  if (retakeStart.sceneEnemies !== 3) failures.push(`Expected 3 retake start enemies, got ${retakeStart.sceneEnemies}`);
  if (retakeSecondEncounter.roadEncounterIndex !== 1) failures.push(`Expected retake encounter index 1, got ${retakeSecondEncounter.roadEncounterIndex}`);
  if (afterRetakeYear.roadMode !== "suneung") failures.push(`Expected suneung mode after retake year, got ${afterRetakeYear.roadMode}`);
  if (afterRetakeYear.roadEncounterIndex !== 0) failures.push(`Expected suneung encounter 0, got ${afterRetakeYear.roadEncounterIndex}`);
  if (afterRetakeYear.sceneEnemies !== 1 || afterRetakeYear.sceneSuneungEnemies !== 1) failures.push(`Expected 1 first suneung enemy, got ${afterRetakeYear.sceneEnemies}/${afterRetakeYear.sceneSuneungEnemies}`);
  if (beforeFinalSuneung.sceneEnemies !== 2 || beforeFinalSuneung.sceneSuneungEnemies !== 2) failures.push(`Expected 2 final suneung enemies, got ${beforeFinalSuneung.sceneEnemies}/${beforeFinalSuneung.sceneSuneungEnemies}`);
  if (!afterDecision.awaitingDecision) failures.push("Suneung completion did not set awaitingDecision");
  if (afterDecision.retakeCount !== 1) failures.push(`Expected retakeCount 1, got ${afterDecision.retakeCount}`);
  if (afterDecision.outcomeCareerCount !== careers.length) failures.push(`Expected ${careers.length} outcome careers, got ${afterDecision.outcomeCareerCount}`);
  if (afterDecision.careerChoiceCount !== careers.length) failures.push(`Expected ${careers.length} career buttons, got ${afterDecision.careerChoiceCount}`);
  if (afterDecision.careerPortraitCount !== careers.length) failures.push(`Expected ${careers.length} career portraits, got ${afterDecision.careerPortraitCount}`);
  if (afterDecision.horizontalOverflow > 4) failures.push(`Horizontal overflow ${afterDecision.horizontalOverflow}px`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, defaultBattle, defaultAfterDebug, liveTimer, retakeStart, retakeSecondEncounter, afterRetakeYear, beforeFinalSuneung, afterDecision, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_BATTLE_ROAD_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log(`REACT_VITE_BATTLE_ROAD_SMOKE_OK careers=${careers.length}`);
} finally {
  await browser.close();
  await closeServer(server);
}
