import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_RECORDS_SMOKE_PORT || 5700);
const saveKey = "student-idle-rpg-save-v1";
const tabIndexes = { exam: 1, work: 3, archive: 6 };

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

function makeRecordsState() {
  const now = Date.now();
  const strongStats = { korean: 1500, english: 1400, math: 1600, social: 1200, science: 1700 };
  return {
    schemaVersion: 2,
    runNumber: 33,
    money: 77777,
    diamonds: 12,
    workSlots: 5,
    lastIncomeAt: now,
    current: {
      gradeId: "H3",
      avatarGender: "male",
      retakeCount: 0,
      monthIndex: 12,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 82,
      totalStudyPoints: 12345,
      studyLevels: { korean: 12 },
      aptitude: strongStats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 44,
      examIndex: 2,
      stats: strongStats,
      track: "science",
      trackLocked: true,
      examResults: [
        {
          gradeId: "H2",
          retakeCount: 0,
          month: 12,
          examId: "year_boss",
          examName: "고등학교 2학년 학년 평가",
          score: 930,
          rank: 1200,
          studyPointReward: 3,
          createdAt: now - 86400000,
        },
        {
          gradeId: "H3",
          retakeCount: 0,
          month: 12,
          examId: "suneung",
          examName: "전국 모의 수능",
          score: 995,
          rank: 500,
          studyPointReward: 4,
          createdAt: now,
        },
      ],
      awaitingDecision: false,
      outcome: null,
      road: {
        mode: "suneung",
        phase: "travel",
        encounterIndex: 2,
        encounterTotal: 4,
        phaseStartedAt: 0,
        lastCompletedEncounterId: "math-final",
      },
    },
    companions: [
      {
        id: "alumni-records-1",
        name: "의사 동료",
        careerId: "doctor",
        careerName: "의사",
        avatarGender: "male",
        age: 20,
        status: "idle",
        incomePerMinute: 24,
        powerMultiplier: 1.22,
        careerRank: 1,
        stats: strongStats,
        createdRun: 31,
        source: "human",
        sourceUniversity: "서울대학교",
      },
      {
        id: "alumni-records-2",
        name: "소프트웨어 엔지니어 동료",
        careerId: "software_engineer",
        careerName: "소프트웨어 엔지니어",
        avatarGender: "female",
        age: 21,
        status: "study",
        incomePerMinute: 18,
        powerMultiplier: 1.05,
        careerRank: 23,
        stats: strongStats,
        createdRun: 32,
        source: "human",
        sourceUniversity: "한국과학기술원",
      },
    ],
    expedition: {
      members: [
        {
          id: "expedition-member-alumni-records-1",
          sourceKey: "companion:alumni-records-1",
          sourceRunNumber: 31,
          sourceCareerId: "doctor",
          careerName: "의사",
          sourceUniversity: "서울대학교",
          level: 1,
          exp: 0,
          promotionTier: "staff",
          baseStats: strongStats,
          locked: false,
          createdAt: now,
          avatarGender: "male",
        },
        {
          id: "expedition-member-alumni-records-2",
          sourceKey: "companion:alumni-records-2",
          sourceRunNumber: 32,
          sourceCareerId: "software_engineer",
          careerName: "소프트웨어 엔지니어",
          sourceUniversity: "한국과학기술원",
          level: 1,
          exp: 0,
          promotionTier: "staff",
          baseStats: strongStats,
          locked: false,
          createdAt: now,
          avatarGender: "female",
        },
      ],
      partyMemberIds: ["expedition-member-alumni-records-1", "expedition-member-alumni-records-2"],
      currentStage: 2,
      highestStage: 1,
      claimedBossStages: [],
      trainingExp: 0,
      chapterRun: { chapter: 1, tempLevel: 1, tempExp: 0, boostMultiplier: 1 },
      lastResolvedAt: now,
      log: [],
      stageIndex: 1,
      clearedStageCount: 1,
      lastStageId: "forest-1",
    },
    archive: [{ id: "career-doctor", type: "career", careerId: "doctor", createdAt: now }],
    history: [
      {
        runNumber: 32,
        universityName: "한국과학기술원",
        careerId: "software_engineer",
        careerName: "소프트웨어 엔지니어",
        careerRank: 23,
        avatarGender: "female",
        track: "science",
        suneungScore: 955,
        age: 21,
        createdAt: now - 3600000,
      },
      {
        runNumber: 31,
        universityName: "서울대학교",
        careerId: "doctor",
        careerName: "의사",
        careerRank: 1,
        avatarGender: "male",
        track: "science",
        suneungScore: 995,
        age: 20,
        createdAt: now - 7200000,
      },
    ],
    log: [],
  };
}

async function openTab(page, index, selector) {
  await page.evaluate((tabIndex) => document.querySelectorAll("button.tab")[tabIndex].click(), index);
  await page.waitForSelector(selector, { timeout: 6000 });
  await page.waitForTimeout(100);
}

async function collectPanel(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      text: body.innerText,
      examPanels: document.querySelectorAll(".exam-panel").length,
      examResultCards: document.querySelectorAll(".exam-result-card").length,
      examSummaryPanels: document.querySelectorAll(".battle-summary-panel").length,
      examEnemyCards: document.querySelectorAll(".battle-enemy-card").length,
      examEnemyImages: Array.from(document.querySelectorAll(".battle-enemy-monster")).filter((element) => getComputedStyle(element).backgroundImage.includes("url(")).length,
      examHpBars: document.querySelectorAll(".enemy-hp-bar").length,
      examSummaryHeight: Math.round(document.querySelector(".battle-summary-panel")?.getBoundingClientRect().height || 0),
      examEnemyGridHeight: Math.round(document.querySelector(".battle-enemy-grid")?.getBoundingClientRect().height || 0),
      workPanels: document.querySelectorAll(".work-panel").length,
      workIncomeCards: document.querySelectorAll(".work-income-card").length,
      workCompanionCards: document.querySelectorAll(".work-companion-card").length,
      archivePanels: document.querySelectorAll(".archive-panel").length,
      archiveHistoryCards: document.querySelectorAll(".archive-history-card").length,
      archiveCareerCards: document.querySelectorAll(".archive-career-card").length,
      careerBookCards: document.querySelectorAll(".career-card").length,
      collectionEffectItems: document.querySelectorAll(".collection-effect-item").length,
      archiveSummaryHeight: Math.round(document.querySelector(".archive-summary-grid")?.getBoundingClientRect().height || 0),
      collectionBonusHeight: Math.round(document.querySelector(".collection-bonus-panel")?.getBoundingClientRect().height || 0),
      placeholderCopy: body.innerText.includes("React/Vite 병행 이식 중입니다."),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
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
    state: makeRecordsState(),
  });

  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  await openTab(page, tabIndexes.exam, ".exam-panel");
  const exam = await collectPanel(page);
  await openTab(page, tabIndexes.work, ".work-panel");
  const work = await collectPanel(page);
  await openTab(page, tabIndexes.archive, ".archive-panel");
  const archive = await collectPanel(page);

  const failures = [];
  if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
  if (exam.examPanels !== 1 || exam.examSummaryPanels !== 1) failures.push(`Expected exam panel/summary, got ${exam.examPanels}/${exam.examSummaryPanels}`);
  if (exam.examEnemyCards !== 1) failures.push(`Expected 1 exam enemy card, got ${exam.examEnemyCards}`);
  if (exam.examEnemyImages !== exam.examEnemyCards) failures.push(`Expected exam enemy images ${exam.examEnemyCards}, got ${exam.examEnemyImages}`);
  if (exam.examHpBars !== exam.examEnemyCards) failures.push(`Expected exam hp bars ${exam.examEnemyCards}, got ${exam.examHpBars}`);
  if (exam.examSummaryHeight < 60) failures.push(`Exam summary collapsed: ${exam.examSummaryHeight}px`);
  if (exam.examEnemyGridHeight < 50) failures.push(`Exam enemy grid collapsed: ${exam.examEnemyGridHeight}px`);
  if (exam.examResultCards !== 2) failures.push(`Expected 2 exam result cards, got ${exam.examResultCards}`);
  for (const expectedText of ["수능 전투", "수능 완료", "전국 모의 수능", "고등학교 2학년 학년 평가", "995점", "1,200등"]) {
    if (!exam.text.includes(expectedText)) failures.push(`Missing exam text: ${expectedText}`);
  }
  if (work.workPanels !== 1 || work.workIncomeCards !== 1) failures.push(`Expected work panel/income card, got ${work.workPanels}/${work.workIncomeCards}`);
  if (work.workCompanionCards !== 2) failures.push(`Expected 2 work companion cards, got ${work.workCompanionCards}`);
  for (const expectedText of ["42원/분", "의사", "소프트웨어 엔지니어", "서울대학교", "한국과학기술원"]) {
    if (!work.text.includes(expectedText)) failures.push(`Missing work text: ${expectedText}`);
  }
  if (archive.archivePanels !== 1) failures.push(`Expected archive panel, got ${archive.archivePanels}`);
  if (archive.archiveHistoryCards !== 2) failures.push(`Expected 2 archive history cards, got ${archive.archiveHistoryCards}`);
  if (archive.archiveCareerCards !== 2) failures.push(`Expected 2 archive career cards, got ${archive.archiveCareerCards}`);
  if (archive.careerBookCards !== 62) failures.push(`Expected 62 career book cards, got ${archive.careerBookCards}`);
  if (archive.collectionEffectItems !== 4) failures.push(`Expected 4 collection effect items, got ${archive.collectionEffectItems}`);
  if (archive.archiveSummaryHeight < 60) failures.push(`Archive summary collapsed: ${archive.archiveSummaryHeight}px`);
  if (archive.collectionBonusHeight < 100) failures.push(`Collection bonus panel collapsed: ${archive.collectionBonusHeight}px`);
  for (const expectedText of ["32회차", "31회차", "955점", "995점", "S급", "A급"]) {
    if (!archive.text.includes(expectedText)) failures.push(`Missing archive text: ${expectedText}`);
  }
  for (const [name, panel] of [
    ["exam", exam],
    ["work", work],
    ["archive", archive],
  ]) {
    if (panel.placeholderCopy) failures.push(`${name} tab still renders placeholder copy`);
    if (panel.horizontalOverflow > 4) failures.push(`${name} horizontal overflow ${panel.horizontalOverflow}px`);
  }
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, exam, work, archive, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_RECORDS_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_RECORDS_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
