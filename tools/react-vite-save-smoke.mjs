import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const preferredPort = Number(process.env.REACT_SAVE_SMOKE_PORT || 5670);
const saveKey = "student-idle-rpg-save-v1";
const expectedSchemaVersion = 6;

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
      kind: ["robot", "helper"].join("-"),
      source: ["ro", "bot"].join(""),
      robotHelperId: "bot_archive_a",
      robotModel: "robot-archive",
      modelName: "오답 압축형",
      status: "study",
      name: "ARC-77 정리 장비",
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
      kind: ["robot", "helper"].join("-"),
      source: ["ro", "bot"].join(""),
      robotHelperId: "bot_exam_s",
      robotModel: "robot-exam",
      modelName: "실전 시뮬레이션형",
      status: "study",
      name: "SIM-88 모의고사 장비",
      rarity: "S",
      spriteAsset: "helper-book",
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

const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const universities = JSON.parse(readFileSync(resolve("data/universities.json"), "utf8"));
const topUniversity = universities.slice().sort((a, b) => a.gameRank - b.gameRank)[0];

function makeLegacyCareerCandidates(prestige) {
  return careers
    .slice()
    .sort((a, b) => a.choiceRank - b.choiceRank)
    .map((career) => {
      const gap = Math.max(0, prestige - career.minPrestige);
      const selectable = prestige >= career.minPrestige;
      return {
        careerId: career.id,
        name: career.name,
        tier: career.tier,
        choiceRank: career.choiceRank,
        choiceBand: career.choiceBand,
        minPrestige: career.minPrestige,
        incomePerMinute: career.baseIncomePerMinute + gap * career.prestigeIncomeRate,
        powerMultiplier: Math.round(career.powerMultiplier * (1 + gap * career.prestigePowerRate) * 1000) / 1000,
        score: 1000 - career.choiceRank,
        selectable,
        lockedReason: selectable ? "" : `need ${career.minPrestige}`,
      };
    });
}

const legacyDecisionPrestige = topUniversity.prestige;
const legacyDecisionStats = { korean: 999999, english: 999999, math: 999999, social: 999999, science: 999999 };
const legacyDecisionCandidates = makeLegacyCareerCandidates(legacyDecisionPrestige);
const legacyDecisionSave = {
  schemaVersion: 1,
  runNumber: 9,
  money: 0,
  diamonds: 0,
  workSlots: 5,
  lastIncomeAt: Date.now(),
  current: {
    gradeId: "H3",
    retakeCount: 0,
    monthIndex: 12,
    waveProgressMs: 0,
    waveRewardClaimedSteps: 0,
    unspentStudyPoints: 0,
    totalStudyPoints: 0,
    studyLevels: {},
    aptitude: legacyDecisionStats,
    educationLevels: {},
    autoAllocateStudy: true,
    studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
    studyAllocationAdjusted: false,
    pauseBeforeGate: true,
    pausedAtGate: false,
    lastWaveKills: 0,
    totalKills: 0,
    examIndex: 3,
    stats: legacyDecisionStats,
    track: "science",
    trackLocked: true,
    examResults: [],
    awaitingDecision: true,
    outcome: {
      suneungScore: 995,
      suneungRank: 500,
      suneungReport: { topPercent: 0.17, subjects: [] },
      admissions: [
        {
          universityId: topUniversity.id,
          name: topUniversity.name,
          gameRank: topUniversity.gameRank,
          adjustedScore: 995,
          adjustedRank: 500,
          minScore: topUniversity.minScore,
          minNationalRank: topUniversity.minNationalRank,
          prestige: legacyDecisionPrestige,
          trackBias: topUniversity.trackBias,
          line: topUniversity.line,
        },
      ],
      careerCandidates: legacyDecisionCandidates,
      careerSelectableCount: legacyDecisionCandidates.filter((career) => career.selectable).length,
      forcedArchiveAvailable: false,
    },
  },
  companions: [],
  archive: [],
  history: [],
  log: [],
};

async function completeBattlesUntilDecision(page, key) {
  for (let step = 0; step < 60; step += 1) {
    const awaitingDecision = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)).current.awaitingDecision, key);
    if (awaitingDecision) return;
    await page.locator(".battle-debug-complete").first().waitFor({ state: "attached", timeout: 4000 });
    await page.locator(".battle-debug-complete").first().click({ force: true });
    await page.waitForTimeout(70);
  }
  throw new Error("Fresh save did not reach decision state within debug battle limit");
}

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

  const legacyPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  let legacyClosed = false;
  let legacyCrashed = false;
  legacyPage.on("close", () => {
    legacyClosed = true;
  });
  legacyPage.on("crash", () => {
    legacyCrashed = true;
  });
  legacyPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  legacyPage.on("pageerror", (error) => pageErrors.push(error.message));
  await legacyPage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: legacyDecisionSave,
  });
  await legacyPage.goto(qaUrl, { waitUntil: "networkidle" });
  await legacyPage.waitForSelector(".phone-frame", { timeout: 15000 });
  await legacyPage.waitForFunction(
    ({ key, version }) => JSON.parse(localStorage.getItem(key)).schemaVersion === version,
    { key: saveKey, version: expectedSchemaVersion },
    { timeout: 5000 },
  );
  const legacyBeforeRetake = await legacyPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      hasLoadFailure: document.querySelectorAll(".load-failure").length,
      hasPhone: document.querySelectorAll(".phone-frame").length,
      schemaVersion: state.schemaVersion,
      gradeId: state.current.gradeId,
      avatarGender: state.current.avatarGender,
      hasRoad: Boolean(state.current.road),
      hasBattle: Boolean(state.current.battle),
      hasEquipment: Boolean(state.equipment),
      hasCareerAlumni: Array.isArray(state.careerAlumni),
      hasPendingReward: Boolean(state.expedition?.pendingReward),
      hasDispatch: Array.isArray(state.expedition?.dispatch?.assignments) && Array.isArray(state.expedition?.dispatch?.history),
      awaitingDecision: state.current.awaitingDecision,
      outcomeGender: state.current.outcome?.avatarGender,
      candidateGender: state.current.outcome?.careerCandidates?.[0]?.avatarGender,
    };
  }, saveKey);
  await legacyPage.evaluate(() => document.querySelectorAll("button.tab")[5].click());
  await legacyPage.waitForSelector(".panel.decision", { timeout: 8000 });
  await legacyPage.evaluate(() => {
    const label = `${String.fromCharCode(0x004e)}${String.fromCharCode(0xc218)} ${String.fromCharCode(0xc120, 0xd0dd)}`;
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.innerText.trim() === label);
    if (!button) throw new Error("legacy retake button not found");
    button.click();
  });
  await legacyPage.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.gradeId === "REPEATER", saveKey, { timeout: 5000 });
  const legacyAfterRetake = await legacyPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      hasPhone: document.querySelectorAll(".phone-frame").length,
      activeTab: [...document.querySelectorAll("button.tab")].find((button) => button.classList.contains("active"))?.getAttribute("aria-label"),
      schemaVersion: state.schemaVersion,
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      hasPendingReward: Boolean(state.expedition?.pendingReward),
      hasDispatch: Array.isArray(state.expedition?.dispatch?.assignments) && Array.isArray(state.expedition?.dispatch?.history),
      awaitingDecision: state.current.awaitingDecision,
      outcomeIsNull: state.current.outcome === null,
      roadMode: state.current.road?.mode,
      battleKind: state.current.battle?.kind,
      battleEnemyCount: state.current.battle?.enemies?.length,
    };
  }, saveKey);
  const legacyRetake = {
    before: legacyBeforeRetake,
    after: legacyAfterRetake,
    closed: legacyClosed,
    crashed: legacyCrashed,
  };
  await legacyPage.close();

  const freshPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  let freshClosed = false;
  let freshCrashed = false;
  freshPage.on("close", () => {
    freshClosed = true;
  });
  freshPage.on("crash", () => {
    freshCrashed = true;
  });
  freshPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  freshPage.on("pageerror", (error) => pageErrors.push(error.message));
  await freshPage.goto(qaUrl, { waitUntil: "networkidle" });
  await freshPage.waitForSelector(".phone-frame", { timeout: 15000 });
  await freshPage.locator(".icon-button.menu").click();
  await freshPage.waitForSelector(".settings-modal", { timeout: 6000 });
  await freshPage.locator(".setting-row.danger").click();
  await freshPage.locator(".confirm-actions .primary-action.danger").click();
  await freshPage.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.gradeId === "E1", saveKey, { timeout: 5000 });
  const freshAfterReset = await freshPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      hasPhone: document.querySelectorAll(".phone-frame").length,
      renderGuardCount: document.querySelectorAll(".render-guard").length,
      schemaVersion: state.schemaVersion,
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      hasPendingReward: Boolean(state.expedition?.pendingReward),
      hasDispatch: Array.isArray(state.expedition?.dispatch?.assignments) && Array.isArray(state.expedition?.dispatch?.history),
      awaitingDecision: state.current.awaitingDecision,
    };
  }, saveKey);
  await completeBattlesUntilDecision(freshPage, saveKey);
  await freshPage.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.awaitingDecision === true, saveKey, { timeout: 6000 });
  await freshPage.evaluate(() => document.querySelectorAll("button.tab")[5].click());
  await freshPage.waitForSelector(".panel.decision", { timeout: 8000 });
  await freshPage.locator(".result-panel .secondary-action.compact").scrollIntoViewIfNeeded();
  await freshPage.locator(".result-panel .secondary-action.compact").click();
  await freshPage.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).current.gradeId === "REPEATER", saveKey, { timeout: 5000 });
  await freshPage.waitForSelector(".growth-panel", { timeout: 8000 });
  const freshAfterRetake = await freshPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      hasPhone: document.querySelectorAll(".phone-frame").length,
      renderGuardCount: document.querySelectorAll(".render-guard").length,
      growthPanelCount: document.querySelectorAll(".growth-panel").length,
      debugButtonCount: document.querySelectorAll(".battle-debug-complete").length,
      bodyTextLength: document.body.innerText.length,
      schemaVersion: state.schemaVersion,
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      awaitingDecision: state.current.awaitingDecision,
      outcomeIsNull: state.current.outcome === null,
      roadMode: state.current.road?.mode,
      battleKind: state.current.battle?.kind,
      battleEnemyCount: state.current.battle?.enemies?.length,
    };
  }, saveKey);
  await freshPage.reload({ waitUntil: "networkidle" });
  await freshPage.waitForSelector(".growth-panel", { timeout: 15000 });
  const freshAfterReload = await freshPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    return {
      hasPhone: document.querySelectorAll(".phone-frame").length,
      renderGuardCount: document.querySelectorAll(".render-guard").length,
      growthPanelCount: document.querySelectorAll(".growth-panel").length,
      debugButtonCount: document.querySelectorAll(".battle-debug-complete").length,
      bodyTextLength: document.body.innerText.length,
      schemaVersion: state.schemaVersion,
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      awaitingDecision: state.current.awaitingDecision,
      roadMode: state.current.road?.mode,
      battleKind: state.current.battle?.kind,
      battleEnemyCount: state.current.battle?.enemies?.length,
    };
  }, saveKey);
  const freshRetake = {
    afterReset: freshAfterReset,
    afterRetake: freshAfterRetake,
    afterReload: freshAfterReload,
    closed: freshClosed,
    crashed: freshCrashed,
  };
  await freshPage.close();

  const failures = [];
  if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
  if (beforeClick.debugButtonCount !== 1) failures.push(`QA smoke expected 1 debug button, got ${beforeClick.debugButtonCount}`);
  for (const expectedText of ["9회차 · N수", "2수", "98,765원", "123", "45", "678", "9", "장비 2/2", "전투력 +29", "Lv.3", "적성 240", "213"]) {
    if (!beforeClick.text.includes(expectedText)) failures.push(`Missing text from injected save: ${expectedText}`);
  }
  if (beforeClick.state.current.totalStudyPoints !== 678) failures.push("Injected save was not loaded before click");
  if (beforeClick.state.equipment?.inventory?.length !== 2) failures.push(`Legacy helpers did not migrate to 2 equipment items, got ${beforeClick.state.equipment?.inventory?.length ?? "missing"}`);
  if (beforeClick.state.equipment?.equipped?.stationery === null || beforeClick.state.equipment?.equipped?.book === null) failures.push("Migrated equipment was not auto-equipped into both slots");
  if (beforeClick.state.careerAlumni?.length !== 0) failures.push(`Legacy helpers leaked into careerAlumni, got ${beforeClick.state.careerAlumni?.length ?? "missing"}`);
  if (afterClick.state.current.totalStudyPoints <= 678) failures.push("DEBUG click did not persist totalStudyPoints increment");
  if (afterClick.state.current.totalKills <= 9) failures.push("DEBUG click did not persist totalKills increment");
  if (afterClick.state.schemaVersion !== expectedSchemaVersion) failures.push(`Injected save did not migrate to schema ${expectedSchemaVersion}, got ${afterClick.state.schemaVersion}`);
  if (!afterClick.state.expedition?.pendingReward) failures.push("Injected save did not create expedition pendingReward state");
  if (!Array.isArray(afterClick.state.expedition?.dispatch?.assignments) || !Array.isArray(afterClick.state.expedition?.dispatch?.history)) failures.push("Injected save did not create expedition dispatch state");
  if (!afterClick.state.realEstate || typeof afterClick.state.realEstate.cash !== "number") failures.push("Injected save did not create realEstate state");
  if (afterClick.state.current.road.encounterIndex !== 1) failures.push(`DEBUG click did not advance Battle Road encounter, got ${afterClick.state.current.road.encounterIndex}`);
  if (afterClick.state.current.battle?.encounterIndex !== 1) failures.push(`Saved battle did not advance to encounter 1, got ${afterClick.state.current.battle?.encounterIndex}`);
  if (afterClick.state.current.autoAllocateStudy !== false) failures.push("Auto click did not persist autoAllocateStudy toggle");
  if (afterClick.autoClass.includes(" on")) failures.push("Auto button still reports on after toggle");
  if (invalidSave.loadFailureCount !== 1) failures.push(`Invalid save did not render load failure screen, got ${invalidSave.loadFailureCount}`);
  if (invalidSave.phoneFrameCount !== 0 || invalidSave.growthPanelCount !== 0) failures.push("Invalid save rendered normal game UI");
  if (!invalidSave.text.includes("세이브를 불러올 수 없습니다")) failures.push("Invalid save failure text missing");
  if (legacyRetake.before.hasLoadFailure !== 0 || legacyRetake.before.hasPhone !== 1) failures.push("Legacy decision save did not render the normal game UI");
  if (legacyRetake.before.schemaVersion !== expectedSchemaVersion) failures.push(`Legacy decision save did not migrate to schema ${expectedSchemaVersion}, got ${legacyRetake.before.schemaVersion}`);
  if (!legacyRetake.before.hasPendingReward) failures.push("Legacy decision save did not create expedition pendingReward state");
  if (!legacyRetake.before.hasDispatch) failures.push("Legacy decision save did not create expedition dispatch state");
  if (legacyRetake.before.avatarGender !== "male" || legacyRetake.before.outcomeGender !== "male" || legacyRetake.before.candidateGender !== "male") failures.push("Legacy decision save did not fill missing avatarGender values");
  if (!legacyRetake.before.hasRoad || !legacyRetake.before.hasBattle) failures.push("Legacy decision save did not create road/battle state");
  if (!legacyRetake.before.hasEquipment || !legacyRetake.before.hasCareerAlumni) failures.push("Legacy decision save did not create equipment/careerAlumni state");
  if (legacyRetake.after.hasPhone !== 1) failures.push("Legacy retake click removed the game UI");
  if (legacyRetake.closed || legacyRetake.crashed) failures.push(`Legacy retake page closed=${legacyRetake.closed} crashed=${legacyRetake.crashed}`);
  if (legacyRetake.after.activeTab !== "성장") failures.push(`Legacy retake did not return to growth tab, got ${legacyRetake.after.activeTab}`);
  if (legacyRetake.after.gradeId !== "REPEATER" || legacyRetake.after.retakeCount !== 1) failures.push(`Legacy retake did not enter first retake year: ${legacyRetake.after.gradeId}/${legacyRetake.after.retakeCount}`);
  if (legacyRetake.after.awaitingDecision !== false || legacyRetake.after.outcomeIsNull !== true) failures.push("Legacy retake did not clear decision outcome");
  if (legacyRetake.after.roadMode !== "school" || legacyRetake.after.battleKind !== "grade" || legacyRetake.after.battleEnemyCount !== 3) failures.push("Legacy retake did not create the first retake battle");
  if (freshRetake.afterReset.hasPhone !== 1 || freshRetake.afterReset.renderGuardCount !== 0) failures.push("Fresh reset did not render the normal game UI");
  if (freshRetake.afterReset.schemaVersion !== expectedSchemaVersion || freshRetake.afterReset.gradeId !== "E1" || freshRetake.afterReset.retakeCount !== 0 || !freshRetake.afterReset.hasPendingReward || !freshRetake.afterReset.hasDispatch) failures.push(`Fresh reset state mismatch: ${JSON.stringify(freshRetake.afterReset)}`);
  if (freshRetake.closed || freshRetake.crashed) failures.push(`Fresh retake page closed=${freshRetake.closed} crashed=${freshRetake.crashed}`);
  if (freshRetake.afterRetake.hasPhone !== 1 || freshRetake.afterRetake.renderGuardCount !== 0 || freshRetake.afterRetake.growthPanelCount !== 1) failures.push("Fresh retake click removed the normal game UI");
  if (freshRetake.afterRetake.bodyTextLength < 500) failures.push(`Fresh retake screen appears blank, text length ${freshRetake.afterRetake.bodyTextLength}`);
  if (freshRetake.afterRetake.gradeId !== "REPEATER" || freshRetake.afterRetake.retakeCount !== 1) failures.push(`Fresh retake did not enter first retake year: ${freshRetake.afterRetake.gradeId}/${freshRetake.afterRetake.retakeCount}`);
  if (freshRetake.afterRetake.awaitingDecision !== false || freshRetake.afterRetake.outcomeIsNull !== true) failures.push("Fresh retake did not clear decision outcome");
  if (freshRetake.afterRetake.roadMode !== "school" || freshRetake.afterRetake.battleKind !== "grade" || freshRetake.afterRetake.battleEnemyCount !== 3) failures.push("Fresh retake did not create the first retake battle");
  if (freshRetake.afterReload.hasPhone !== 1 || freshRetake.afterReload.renderGuardCount !== 0 || freshRetake.afterReload.growthPanelCount !== 1) failures.push("Fresh retake reload removed the normal game UI");
  if (freshRetake.afterReload.gradeId !== "REPEATER" || freshRetake.afterReload.retakeCount !== 1) failures.push(`Fresh retake reload did not keep first retake year: ${freshRetake.afterReload.gradeId}/${freshRetake.afterReload.retakeCount}`);
  if (freshRetake.afterReload.roadMode !== "school" || freshRetake.afterReload.battleKind !== "grade" || freshRetake.afterReload.battleEnemyCount !== 3) failures.push("Fresh retake reload did not keep the first retake battle");
  if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, beforeClick: { autoClass: beforeClick.autoClass }, afterClick: { autoClass: afterClick.autoClass, state: afterClick.state }, invalidSave, legacyRetake, freshRetake, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_SAVE_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_SAVE_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
