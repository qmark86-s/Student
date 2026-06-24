import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_SAVE_SMOKE_PORT || 5670);
const saveKey = "student-idle-rpg-save-v1";

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

const injectedSave = {
  schemaVersion: 2,
  runNumber: 9,
  money: 98765,
  diamonds: 123,
  workSlots: 5,
  lastIncomeAt: Date.now(),
  current: {
    gradeId: "REPEATER",
    avatarGender: "male",
    retakeCount: 2,
    monthIndex: 0,
    waveProgressMs: 0,
    waveRewardClaimedSteps: 0,
    road: {
      mode: "school",
      phase: "travel",
      encounterIndex: 0,
      encounterTotal: 4,
      phaseStartedAt: 0,
      lastCompletedEncounterId: null,
    },
    unspentStudyPoints: 45,
    totalStudyPoints: 678,
    studyLevels: { korean: 3 },
    aptitude: { korean: 240, english: 0, math: 0, social: 0, science: 0 },
    educationLevels: {},
    autoAllocateStudy: true,
    studyAllocationWeights: { korean: 80, english: 90, math: 110, social: 120, science: 130 },
    studyAllocationAdjusted: false,
    pauseBeforeGate: true,
    pausedAtGate: false,
    lastWaveKills: 0,
    totalKills: 9,
    examIndex: 0,
    stats: { korean: 213, english: 0, math: 0, social: 0, science: 0 },
    track: "science",
    trackLocked: true,
    examResults: [],
    awaitingDecision: false,
    outcome: null,
  },
  companions: [
    {
      id: "helper-a",
      kind: "robot-helper",
      source: "robot",
      robotHelperId: "bot_archive_a",
      robotModel: "robot-archive",
      modelName: "오답 압축형",
      status: "study",
      name: "ARC-77 정리봇",
      rarity: "A",
      spriteAsset: "helper-chart",
      avatarGender: "male",
      powerBonus: 11,
      incomePerMinute: 15,
      sellPrice: 25000,
      stats: { korean: 170, english: 130, math: 150, social: 145, science: 145 },
      auraColor: "#f59e0b",
      createdRun: 9,
      createdAt: Date.now(),
    },
    {
      id: "helper-b",
      kind: "robot-helper",
      source: "robot",
      robotHelperId: "bot_exam_s",
      robotModel: "robot-exam",
      modelName: "실전 시뮬레이션형",
      status: "study",
      name: "SIM-88 모의고사봇",
      rarity: "S",
      spriteAsset: "helper-laptop",
      avatarGender: "female",
      powerBonus: 17,
      incomePerMinute: 24,
      sellPrice: 90000,
      stats: { korean: 190, english: 190, math: 205, social: 165, science: 185 },
      auraColor: "#c084fc",
      createdRun: 9,
      createdAt: Date.now(),
    },
  ],
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

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/`;
const qaUrl = `${baseUrl}?qaTools=1`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: injectedSave,
  });
  const response = await page.goto(qaUrl, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector(".growth-panel", { timeout: 15000 });
  } catch (error) {
    const loadFailure = await page.evaluate(() => ({
      text: document.body.innerText,
      loadFailureCount: document.querySelectorAll(".load-failure").length,
      phoneFrameCount: document.querySelectorAll(".phone-frame").length,
      growthPanelCount: document.querySelectorAll(".growth-panel").length,
    }));
    throw new Error(`Valid save did not render growth-panel: ${JSON.stringify({ ...loadFailure, consoleErrors, pageErrors })}`, { cause: error });
  }

  const beforeClick = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      text: document.body.innerText,
      state,
      autoClass: document.querySelector(".battle-auto-toggle")?.className ?? "",
      debugButtonCount: document.querySelectorAll(".battle-debug-complete").length,
    };
  }, saveKey);

  await page.click(".battle-debug-complete");
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.road.encounterIndex === 1, saveKey, { timeout: 5000 });
  await page.click(".battle-auto-toggle");
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.autoAllocateStudy === false, saveKey, { timeout: 5000 });

  const afterClick = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      state,
      autoClass: document.querySelector(".battle-auto-toggle")?.className ?? "",
      text: document.body.innerText,
    };
  }, saveKey);

  const invalidPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await invalidPage.addInitScript((key) => localStorage.setItem(key, "{broken-json"), saveKey);
  await invalidPage.goto(qaUrl, { waitUntil: "networkidle" });
  await invalidPage.waitForSelector(".load-failure", { timeout: 15000 });
  const invalidSave = await invalidPage.evaluate(() => ({
    text: document.body.innerText,
    loadFailureCount: document.querySelectorAll(".load-failure").length,
    phoneFrameCount: document.querySelectorAll(".phone-frame").length,
    growthPanelCount: document.querySelectorAll(".growth-panel").length,
  }));
  await invalidPage.close();

  const failures = [];
  if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
  if (beforeClick.debugButtonCount !== 1) failures.push(`QA smoke expected 1 debug button, got ${beforeClick.debugButtonCount}`);
  for (const expectedText of ["9회차 · N수", "2수", "98,765원", "123", "45", "678", "9", "학습 도우미 2/3", "전투력 +28", "합계 530", "Lv.3", "적성 240", "213"]) {
    if (!beforeClick.text.includes(expectedText)) failures.push(`Missing text from injected save: ${expectedText}`);
  }
  if (beforeClick.state.current.totalStudyPoints !== 678) failures.push("Injected save was not loaded before click");
  if (afterClick.state.current.totalStudyPoints <= 678) failures.push("DEBUG click did not persist totalStudyPoints increment");
  if (afterClick.state.current.totalKills <= 9) failures.push("DEBUG click did not persist totalKills increment");
  if (afterClick.state.schemaVersion !== 3) failures.push(`Injected save did not migrate to schema 3, got ${afterClick.state.schemaVersion}`);
  if (!afterClick.state.realEstate || typeof afterClick.state.realEstate.cash !== "number") failures.push("Injected save did not create realEstate state");
  if (afterClick.state.current.road.encounterIndex !== 1) failures.push(`DEBUG click did not advance Battle Road encounter, got ${afterClick.state.current.road.encounterIndex}`);
  if (afterClick.state.current.battle?.encounterIndex !== 1) failures.push(`Saved battle did not advance to encounter 1, got ${afterClick.state.current.battle?.encounterIndex}`);
  if (afterClick.state.current.autoAllocateStudy !== false) failures.push("Auto click did not persist autoAllocateStudy toggle");
  if (afterClick.autoClass.includes(" on")) failures.push("Auto button still reports on after toggle");
  if (invalidSave.loadFailureCount !== 1) failures.push(`Invalid save did not render load failure screen, got ${invalidSave.loadFailureCount}`);
  if (invalidSave.phoneFrameCount !== 0 || invalidSave.growthPanelCount !== 0) failures.push("Invalid save rendered normal game UI");
  if (!invalidSave.text.includes("세이브를 불러올 수 없습니다")) failures.push("Invalid save failure text missing");
  if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, beforeClick: { autoClass: beforeClick.autoClass }, afterClick: { autoClass: afterClick.autoClass, state: afterClick.state }, invalidSave, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_SAVE_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_SAVE_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
