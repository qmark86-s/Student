import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const preferredPort = Number(process.env.RETAKE_SMOKE_PORT || 5544);
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

function makeAwaitingDecisionState(careers, university) {
  const prestige = university.prestige;
  const strongStats = { korean: 999999, english: 999999, math: 999999, social: 999999, science: 999999 };
  const careerCandidates = makeCareerCandidates(careers, prestige);

  return {
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
      aptitude: strongStats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 3,
      stats: strongStats,
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
    { key: saveKey, state: makeAwaitingDecisionState(careers, topUniversity) },
  );
  await page.goto(`http://127.0.0.1:${port}/?qaTools=1&pauseAutoBattle=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("#root > *", { timeout: 15000 });
  await page.evaluate((index) => document.querySelectorAll("button.tab")[index].click(), resultTabIndex);
  await page.waitForSelector(".career-choice-ranked", { timeout: 15000 });

  await page.evaluate(() => {
    const label = `${String.fromCharCode(0x004e)}${String.fromCharCode(0xc218)} ${String.fromCharCode(0xc120, 0xd0dd)}`;
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.innerText.trim() === label);
    if (!button) throw new Error("Retake button not found");
    button.click();
  });
  await page.waitForTimeout(300);

  const collectBattleSnapshot = () => page.evaluate(() => {
    const text = document.body.innerText;
    const sceneEnemies = [...document.querySelectorAll(".battle-scene-enemy")];
    const sceneMonsterArt = [...document.querySelectorAll(".battle-scene-monster-art")];
    const state = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1"));
    return {
      text,
      battleCards: document.querySelectorAll(".battle-enemy-card").length,
      arenaTextCards: document.querySelectorAll(".pixel-arena .battle-enemy-card").length,
      suneungCards: document.querySelectorAll(".battle-enemy-card.suneung").length,
      sceneEnemies: sceneEnemies.length,
      // url(...) 이면 실제 이미지 — 인라인(data:image)/외부 자산(assets/*.png) 빌드를 모두 허용한다.
      sceneEnemyImages: sceneMonsterArt.filter((monster) => getComputedStyle(monster).backgroundImage.includes("url(")).length,
      sceneEnemyFrames: new Set(sceneMonsterArt.map((monster) => getComputedStyle(monster).backgroundPositionX).filter(Boolean)).size,
      sceneBosses: sceneEnemies.filter((enemy) => enemy.classList.contains("boss")).length,
      sceneSuneungEnemies: sceneEnemies.filter((enemy) => enemy.classList.contains("suneung")).length,
      sceneHpBars: document.querySelectorAll(".battle-scene-enemy .battle-scene-hp").length,
      normalHpBars: document.querySelectorAll(".battle-scene-enemy.normal .battle-scene-hp").length,
      sceneHudVisible: [...document.querySelectorAll(".stage-scene > .scene-hud")].some((element) => getComputedStyle(element).display !== "none"),
      sceneControls: document.querySelectorAll(".scene-controls").length,
      autoToggleText: document.querySelector(".battle-auto-toggle")?.innerText.trim() ?? "",
      debugCompleteText: document.querySelector(".battle-debug-complete")?.innerText.trim() ?? "",
      hasAutoAllocateText: text.includes("자동 분배") || text.includes("수동 분배"),
      hasBattleCompleteText: text.includes("전투 완료"),
      battleKind: state.current.battle?.kind ?? (sceneEnemies.some((enemy) => enemy.classList.contains("suneung")) ? "suneung" : sceneEnemies.length > 0 ? "grade" : ""),
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      awaitingDecision: state.current.awaitingDecision,
      outcomeCareerCount: state.current.outcome?.careerCandidates?.length ?? 0,
      roadMode: state.current.road?.mode ?? "",
      roadEncounterIndex: state.current.road?.encounterIndex ?? -1,
      roadEncounterTotal: state.current.road?.encounterTotal ?? -1,
      roadPhaseClass: document.querySelector(".battle-road-lineup")?.getAttribute("data-road-phase") ?? "",
    };
  });

  const afterRetake = await collectBattleSnapshot();

  const clickBattleComplete = async () => {
    await page.evaluate(() => {
      const button = document.querySelector(".battle-debug-complete, .hud-action.secondary");
      if (!button) throw new Error("Battle complete button not found");
      button.click();
    });
  };

  const waitForEncounter = async ({ kind, index, enemies }) => {
    try {
      await page.waitForFunction(
        ({ kind, index, enemies }) => {
          const lineup = document.querySelector(".battle-road-lineup");
          if (!lineup) return false;
          if (kind && !lineup.classList.contains(kind)) return false;
          if (Number(lineup.getAttribute("data-encounter-index")) !== index) return false;
          return document.querySelectorAll(".battle-scene-enemy").length === enemies;
        },
        { kind, index, enemies },
        { timeout: 6000 },
      );
    } catch (error) {
      const snapshot = await collectBattleSnapshot();
      throw new Error(`Expected ${kind} encounter ${index} with ${enemies} enemies, got ${JSON.stringify(snapshot)}`, {
        cause: error,
      });
    }
    await page.waitForTimeout(150);
  };

  await clickBattleComplete();
  await waitForEncounter({ kind: "grade", index: 1, enemies: 3 });
  const afterRetakeFirstEncounter = await collectBattleSnapshot();
  await clickBattleComplete();
  await waitForEncounter({ kind: "grade", index: 2, enemies: 3 });
  await clickBattleComplete();
  await waitForEncounter({ kind: "grade", index: 3, enemies: 3 });
  await clickBattleComplete();
  await waitForEncounter({ kind: "suneung", index: 0, enemies: 1 });
  const afterYearComplete = await collectBattleSnapshot();
  await clickBattleComplete();
  await waitForEncounter({ kind: "suneung", index: 1, enemies: 1 });
  await clickBattleComplete();
  await waitForEncounter({ kind: "suneung", index: 2, enemies: 1 });
  await clickBattleComplete();
  await waitForEncounter({ kind: "suneung", index: 3, enemies: 2 });
  const beforeFinalSuneung = await collectBattleSnapshot();
  await clickBattleComplete();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("student-idle-rpg-save-v1")).current.awaitingDecision === true,
    null,
    { timeout: 6000 },
  );

  await page.evaluate((index) => document.querySelectorAll("button.tab")[index].click(), resultTabIndex);
  await page.waitForSelector(".panel.decision", { timeout: 6000 });

  const afterSuneungComplete = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1"));
    return {
      hasDecisionPanel: !!document.querySelector(".panel.decision"),
      hasSuneungResultText: document.body.innerText.includes("수능 결과"),
      careerChoiceCount: document.querySelectorAll(".career-choice-ranked").length,
      awaitingDecision: state.current.awaitingDecision,
      gradeId: state.current.gradeId,
      retakeCount: state.current.retakeCount,
      battleKind: state.current.battle?.kind ?? "",
      outcomeCareerCount: state.current.outcome?.careerCandidates?.length ?? 0,
    };
  });

  const failures = [];
  if (afterRetake.gradeId !== "REPEATER") failures.push(`Expected REPEATER after retake, got ${afterRetake.gradeId}`);
  if (afterRetake.text.includes("수능 5과목")) failures.push("Retake immediately shows suneung battle copy");
  if (afterRetake.arenaTextCards !== 0) failures.push(`Expected no retake-year text cards in arena, got ${afterRetake.arenaTextCards}`);
  if (afterRetake.sceneHudVisible) failures.push("Expected hidden battle scene HUD in polished layout");
  if (afterRetake.sceneControls !== 0) failures.push(`Expected no legacy scene controls, got ${afterRetake.sceneControls}`);
  if (afterRetake.autoToggleText !== "Auto") failures.push(`Expected Auto overlay button, got ${afterRetake.autoToggleText}`);
  if (afterRetake.debugCompleteText !== "DEBUG") failures.push(`Expected DEBUG overlay button, got ${afterRetake.debugCompleteText}`);
  if (afterRetake.hasAutoAllocateText) failures.push("Expected no auto allocation copy in battle layout");
  if (afterRetake.hasBattleCompleteText) failures.push("Expected no battle-complete copy in battle layout");
  if (afterRetake.sceneEnemies !== 3) failures.push(`Expected 3 retake-year encounter enemies, got ${afterRetake.sceneEnemies}`);
  if (afterRetake.sceneEnemyImages !== 3) failures.push(`Expected 3 rendered retake-year scene enemy images, got ${afterRetake.sceneEnemyImages}`);
  if (afterRetake.sceneEnemyFrames < 2) failures.push(`Expected varied retake-year scene enemy frames, got ${afterRetake.sceneEnemyFrames}`);
  if (afterRetake.sceneBosses !== 1) failures.push(`Expected 1 retake-year scene boss, got ${afterRetake.sceneBosses}`);
  if (afterRetake.sceneHpBars !== 1) failures.push(`Expected 1 retake-year boss HP bar, got ${afterRetake.sceneHpBars}`);
  if (afterRetake.normalHpBars !== 0) failures.push(`Expected no normal monster HP bars, got ${afterRetake.normalHpBars}`);
  if (afterRetake.suneungCards !== 0) failures.push(`Expected no immediate suneung cards, got ${afterRetake.suneungCards}`);
  if (afterRetake.roadMode !== "school") failures.push(`Expected retake road mode school, got ${afterRetake.roadMode}`);
  if (afterRetake.roadEncounterIndex !== 0) failures.push(`Expected first retake encounter index 0, got ${afterRetake.roadEncounterIndex}`);
  if (afterRetake.roadEncounterTotal !== 4) failures.push(`Expected 4 retake encounters, got ${afterRetake.roadEncounterTotal}`);
  if (afterRetakeFirstEncounter.roadEncounterIndex !== 1) failures.push(`Expected retake second encounter index 1 after one completion, got ${afterRetakeFirstEncounter.roadEncounterIndex}`);
  if (afterRetakeFirstEncounter.sceneEnemies !== 3) failures.push(`Expected 3 enemies in second retake encounter, got ${afterRetakeFirstEncounter.sceneEnemies}`);
  if (afterYearComplete.awaitingDecision) failures.push("Retake year completion returned to decision UI before suneung battle");
  if (afterYearComplete.battleKind !== "suneung") failures.push(`Expected suneung battle after retake year, got ${afterYearComplete.battleKind}`);
  if (afterYearComplete.arenaTextCards !== 0) failures.push(`Expected no suneung text cards in arena, got ${afterYearComplete.arenaTextCards}`);
  if (afterYearComplete.sceneEnemies !== 1) failures.push(`Expected 1 suneung scene enemy after retake year, got ${afterYearComplete.sceneEnemies}`);
  if (afterYearComplete.sceneSuneungEnemies !== 1) failures.push(`Expected 1 suneung scene enemy class, got ${afterYearComplete.sceneSuneungEnemies}`);
  if (afterYearComplete.sceneEnemyImages !== 1) failures.push(`Expected 1 rendered suneung scene enemy image, got ${afterYearComplete.sceneEnemyImages}`);
  if (afterYearComplete.sceneHpBars !== 1) failures.push(`Expected 1 suneung HP bar, got ${afterYearComplete.sceneHpBars}`);
  if (afterYearComplete.roadMode !== "suneung") failures.push(`Expected suneung road mode after retake year, got ${afterYearComplete.roadMode}`);
  if (afterYearComplete.roadEncounterIndex !== 0) failures.push(`Expected first suneung encounter index 0, got ${afterYearComplete.roadEncounterIndex}`);
  if (afterYearComplete.outcomeCareerCount !== 0) failures.push(`Expected no outcome before retake suneung result, got ${afterYearComplete.outcomeCareerCount}`);
  if (beforeFinalSuneung.sceneEnemies !== 2) failures.push(`Expected 2 final inquiry enemies, got ${beforeFinalSuneung.sceneEnemies}`);
  if (beforeFinalSuneung.sceneSuneungEnemies !== 2) failures.push(`Expected 2 final inquiry suneung classes, got ${beforeFinalSuneung.sceneSuneungEnemies}`);
  if (beforeFinalSuneung.sceneHpBars !== 2) failures.push(`Expected 2 final inquiry HP bars, got ${beforeFinalSuneung.sceneHpBars}`);
  if (beforeFinalSuneung.roadEncounterIndex !== 3) failures.push(`Expected final suneung encounter index 3, got ${beforeFinalSuneung.roadEncounterIndex}`);
  if (!afterSuneungComplete.hasDecisionPanel) failures.push("Retake suneung completion did not expose decision panel in result tab");
  if (!afterSuneungComplete.hasSuneungResultText) failures.push("Retake suneung completion did not show suneung result copy in result tab");
  if (afterSuneungComplete.careerChoiceCount === 0) failures.push("Retake suneung completion did not show career choices in result tab");
  if (!afterSuneungComplete.awaitingDecision) failures.push("Retake suneung completion did not set awaitingDecision");
  if (afterSuneungComplete.gradeId !== "REPEATER") failures.push(`Expected gradeId to remain REPEATER after suneung completion, got ${afterSuneungComplete.gradeId}`);
  if (afterSuneungComplete.retakeCount !== 1) failures.push(`Expected retakeCount 1, got ${afterSuneungComplete.retakeCount}`);
  if (afterSuneungComplete.outcomeCareerCount !== careers.length) failures.push(`Expected ${careers.length} career candidates after retake suneung result, got ${afterSuneungComplete.outcomeCareerCount}`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl: `http://127.0.0.1:${port}/`, afterRetake, afterRetakeFirstEncounter, afterYearComplete, beforeFinalSuneung, afterSuneungComplete, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`RETAKE_YEAR_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log(`RETAKE_YEAR_SMOKE_OK yearSceneEnemies=${afterRetake.sceneEnemies} suneungFirstEnemies=${afterYearComplete.sceneEnemies} suneungFinalEnemies=${beforeFinalSuneung.sceneEnemies} retakeCount=${afterSuneungComplete.retakeCount}`);
} finally {
  await browser.close();
  await closeServer(server);
}
