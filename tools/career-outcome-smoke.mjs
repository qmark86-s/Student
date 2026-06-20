import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const preferredPort = Number(process.env.CAREER_SMOKE_PORT || 5494);
const saveKey = "student-idle-rpg-save-v1";
const resultTabIndex = 5;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist/index.html is missing. Run `npm run build:web` first.");
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

function makeCareerCandidates(careers, prestige) {
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

function makeResultState(careers, university) {
  const prestige = university.prestige;
  const subjectStats = { korean: 2200, english: 2200, math: 2600, social: 1600, science: 2800 };
  const careerCandidates = makeCareerCandidates(careers, prestige);

  return {
    schemaVersion: 1,
    runNumber: 7,
    money: 0,
    diamonds: 0,
    workSlots: 1,
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
      aptitude: subjectStats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 3,
      stats: subjectStats,
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
            universityId: university.id,
            name: university.name,
            gameRank: university.gameRank,
            adjustedScore: 995,
            adjustedRank: 500,
            minScore: university.minScore,
            minNationalRank: university.minNationalRank,
            prestige,
            trackBias: university.trackBias,
            line: university.line,
          },
        ],
        careerCandidates,
        careerSelectableCount: careerCandidates.filter((career) => career.selectable).length,
        forcedArchiveAvailable: false,
      },
    },
    companions: [],
    archive: [],
    history: [],
    log: [],
  };
}

const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const universities = JSON.parse(readFileSync(resolve("data/universities.json"), "utf8"));
const topUniversity = universities.slice().sort((a, b) => a.gameRank - b.gameRank)[0];
const server = createStaticServer();
const port = await listenAvailable(server);
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: saveKey, state: makeResultState(careers, topUniversity) },
  );
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#root > *", { timeout: 15000 });
  await page.evaluate((index) => document.querySelectorAll("button.tab")[index].click(), resultTabIndex);
  await page.waitForSelector(".career-choice-ranked", { timeout: 15000 });

  const metrics = await page.evaluate(() => {
    const oldThreeChoice = String.fromCharCode(51, 0xd0dd);
    const availableBadgeText = `${String.fromCharCode(0xac1c)} ${String.fromCharCode(0xac00, 0xb2a5)}`;
    const powerText = `${String.fromCharCode(0xc804, 0xd22c)} x`;
    const buttons = [...document.querySelectorAll(".career-choice.ranked")];
    const enabled = buttons.filter((button) => !button.disabled);
    const text = document.body.innerText;
    const doc = document.documentElement;

    return {
      rankedButtons: buttons.length,
      enabledButtons: enabled.length,
      hasOldThreeChoice: text.includes(oldThreeChoice),
      hasAvailableBadge: text.includes(availableBadgeText),
      hasRankOne: text.includes("#1"),
      hasPowerLabel: text.includes(powerText),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });

  const failures = [];
  if (metrics.rankedButtons !== careers.length) failures.push(`Expected ${careers.length} ranked buttons, got ${metrics.rankedButtons}`);
  if (metrics.enabledButtons < 1) failures.push("Expected at least one enabled career button");
  if (metrics.hasOldThreeChoice) failures.push("Old 3-choice label remains visible");
  if (!metrics.hasAvailableBadge) failures.push("Available count badge is missing");
  if (!metrics.hasRankOne) failures.push("Rank #1 label is missing");
  if (!metrics.hasPowerLabel) failures.push("Power multiplier label is missing");
  if (metrics.horizontalOverflow > 4) failures.push(`Horizontal overflow ${metrics.horizontalOverflow}px`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl: `http://127.0.0.1:${port}/`, metrics, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`CAREER_OUTCOME_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log(`CAREER_OUTCOME_SMOKE_OK rankedButtons=${metrics.rankedButtons} enabledButtons=${metrics.enabledButtons}`);
} finally {
  await browser.close();
  await closeServer(server);
}
