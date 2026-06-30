import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const preferredPort = Number(process.env.REACT_EDUCATION_SMOKE_PORT || 5710);
const saveKey = "student-idle-rpg-save-v1";
const educationTabIndex = 4;
const growthTabIndex = 0;
const expectedAdvancedCost = Math.round(900 * 1.8 * 1.48 ** 2);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

function makeEducationState() {
  const stats = { korean: 900, english: 900, math: 900, social: 900, science: 900 };
  return {
    schemaVersion: 2,
    runNumber: 41,
    money: 100000,
    diamonds: 0,
    workSlots: 5,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "H3",
      avatarGender: "female",
      retakeCount: 0,
      monthIndex: 9,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 0,
      studyLevels: {},
      aptitude: stats,
      educationLevels: { advanced_learning: 2, humanities_studio: 1 },
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 2,
      stats,
      track: "science",
      trackLocked: true,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
      road: {
        mode: "suneung",
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

async function openTab(page, index, selector) {
  await page.evaluate((tabIndex) => document.querySelectorAll("button.tab")[tabIndex].click(), index);
  await page.waitForSelector(selector, { timeout: 6000 });
  await page.waitForTimeout(100);
}

async function collectEducation(page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const doc = document.documentElement;
    const advancedButton = document.querySelector('[data-action-id="advanced_learning"] .education-upgrade-button');
    return {
      text: document.body.innerText,
      state,
      educationPanels: document.querySelectorAll(".education-panel").length,
      educationCards: document.querySelectorAll(".education-action-card").length,
      mutedCards: document.querySelectorAll(".education-action-card.muted").length,
      upgradeButtons: document.querySelectorAll(".education-upgrade-button").length,
      disabledButtons: document.querySelectorAll(".education-upgrade-button:disabled").length,
      advancedButtonText: advancedButton?.innerText.trim() ?? "",
      placeholderCopy: document.body.innerText.includes("React/Vite 병행 이식 중입니다."),
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
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: makeEducationState(),
  });

  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  await openTab(page, educationTabIndex, ".education-panel");
  const beforeUpgrade = await collectEducation(page);

  await page.click('[data-action-id="advanced_learning"] .education-upgrade-button');
  await page.waitForFunction(
    ({ key, expectedMoney }) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.current.educationLevels?.advanced_learning === 3 && state.money === expectedMoney;
    },
    { key: saveKey, expectedMoney: 100000 - expectedAdvancedCost },
    { timeout: 6000 },
  );
  const afterUpgrade = await collectEducation(page);

  await openTab(page, growthTabIndex, ".growth-panel");
  const growth = await page.evaluate(() => ({
    text: document.body.innerText,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  const failures = [];
  if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
  if (beforeUpgrade.educationPanels !== 1) failures.push(`Expected 1 education panel, got ${beforeUpgrade.educationPanels}`);
  if (beforeUpgrade.educationCards !== 9) failures.push(`Expected 9 education cards, got ${beforeUpgrade.educationCards}`);
  if (beforeUpgrade.upgradeButtons !== 9) failures.push(`Expected 9 education buttons, got ${beforeUpgrade.upgradeButtons}`);
  if (beforeUpgrade.mutedCards < 4) failures.push(`Expected locked education cards for H3, got ${beforeUpgrade.mutedCards}`);
  if (beforeUpgrade.advancedButtonText !== expectedAdvancedCost.toLocaleString("ko-KR")) {
    failures.push(`Expected advanced cost ${expectedAdvancedCost}, got ${beforeUpgrade.advancedButtonText}`);
  }
  for (const expectedText of ["조기교육", "선행학습", "사립초 전학", "사립중 전학", "특목고 전학", "논술 스튜디오", "과학 탐구반", "N수 과외", "진로 컨설팅", "배율", "가능"]) {
    if (!beforeUpgrade.text.includes(expectedText)) failures.push(`Missing education text: ${expectedText}`);
  }
  if (!beforeUpgrade.text.includes("x1.12")) failures.push("Expected initial education multiplier x1.12");
  if (afterUpgrade.state.current.educationLevels.advanced_learning !== 3) failures.push(`Expected advanced level 3, got ${afterUpgrade.state.current.educationLevels.advanced_learning}`);
  if (afterUpgrade.state.money !== 100000 - expectedAdvancedCost) failures.push(`Expected money ${100000 - expectedAdvancedCost}, got ${afterUpgrade.state.money}`);
  if (!afterUpgrade.text.includes("선행학습 Lv.3/60")) failures.push("Education panel did not refresh upgraded level text");
  if (!afterUpgrade.text.includes("x1.16")) failures.push("Expected upgraded education multiplier x1.16");
  if (!growth.text.includes("교육") || !growth.text.includes("x1.16")) failures.push("Growth panel did not show upgraded education multiplier");
  for (const [name, panel] of [
    ["before", beforeUpgrade],
    ["after", afterUpgrade],
  ]) {
    if (panel.placeholderCopy) failures.push(`${name} education tab still renders placeholder copy`);
    if (panel.horizontalOverflow > 4) failures.push(`${name} education horizontal overflow ${panel.horizontalOverflow}px`);
  }
  if (growth.horizontalOverflow > 4) failures.push(`Growth horizontal overflow ${growth.horizontalOverflow}px`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, beforeUpgrade, afterUpgrade, growth, expectedAdvancedCost, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_EDUCATION_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_EDUCATION_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
