import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_EXPEDITION_SMOKE_PORT || 5690);
const saveKey = "student-idle-rpg-save-v1";
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const universities = JSON.parse(readFileSync(resolve("data/universities.json"), "utf8"));
const battleRoadConfig = JSON.parse(readFileSync(resolve("data/battle_road_config.json"), "utf8"));
const maxBattleDurationMs = 60000;

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

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function makeCareerCandidates(university, avatarGender) {
  const prestige = finiteNumber(university.prestige, `universities.json prestige 값이 올바르지 않습니다: ${university.id}`);
  return careers
    .slice()
    .sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`))
    .map((career) => {
      const choiceRank = finiteNumber(career.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${career.id}`);
      const minPrestige = finiteNumber(career.minPrestige, `careers.json minPrestige 값이 올바르지 않습니다: ${career.id}`);
      const baseIncomePerMinute = finiteNumber(career.baseIncomePerMinute, `careers.json baseIncomePerMinute 값이 올바르지 않습니다: ${career.id}`);
      const prestigeIncomeRate = finiteNumber(career.prestigeIncomeRate, `careers.json prestigeIncomeRate 값이 올바르지 않습니다: ${career.id}`);
      const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
      const prestigePowerRate = finiteNumber(career.prestigePowerRate, `careers.json prestigePowerRate 값이 올바르지 않습니다: ${career.id}`);
      assert(typeof career.choiceBand === "string" && career.choiceBand.length > 0, `careers.json choiceBand 값이 없습니다: ${career.id}`);
      const gap = Math.max(0, prestige - minPrestige);
      const selectable = prestige >= minPrestige;
      return {
        avatarGender,
        careerId: career.id,
        name: career.name,
        tier: career.tier,
        choiceRank,
        choiceBand: career.choiceBand,
        minPrestige,
        incomePerMinute: baseIncomePerMinute + gap * prestigeIncomeRate,
        powerMultiplier: Math.round(powerMultiplier * (1 + gap * prestigePowerRate) * 1000) / 1000,
        score: 1000 - choiceRank,
        selectable,
        lockedReason: selectable ? "" : `명성 ${minPrestige} 필요`,
      };
    });
}

function makeCompletedSuneungBattle() {
  const encounters = battleRoadConfig.suneung.encounters;
  assert(Array.isArray(encounters) && encounters.length > 0, "battle_road_config.json 수능 조우 데이터가 비어 있습니다.");
  const encounterIndex = encounters.length - 1;
  const encounter = encounters[encounterIndex];
  return {
    gradeId: "H3",
    gradeOrder: 12,
    kind: "suneung",
    roadMode: "suneung",
    encounterIndex,
    encounterTotal: encounters.length,
    encounterId: encounter.id,
    encounterLabel: encounter.label,
    roadTiming: battleRoadConfig.timing,
    roadCamera: battleRoadConfig.camera,
    elapsedMs: maxBattleDurationMs,
    maxDurationMs: maxBattleDurationMs,
    finished: true,
    enemies: encounter.enemies.map((enemy) => ({
      id: `suneung-${encounter.id}-${enemy.id}`,
      label: enemy.label,
      kind: "suneung",
      month: enemy.visualMonth,
      subjects: enemy.subjects,
      weight: 3.5,
      maxHp: 280,
      remainingHp: 0,
      studyPointReward: 1,
      rewardClaimed: true,
    })),
  };
}

function makeDecisionState() {
  const avatarGender = "male";
  const university = universities.slice().sort((a, b) => a.gameRank - b.gameRank)[0];
  const careerCandidates = makeCareerCandidates(university, avatarGender);
  const strongStats = { korean: 1600, english: 1500, math: 1700, social: 1300, science: 1800 };
  return {
    schemaVersion: 2,
    runNumber: 21,
    money: 34500,
    diamonds: 0,
    workSlots: 5,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "H3",
      avatarGender,
      retakeCount: 0,
      monthIndex: 12,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 9800,
      studyLevels: {},
      aptitude: strongStats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 40,
      examIndex: 4,
      stats: strongStats,
      track: "science",
      trackLocked: true,
      examResults: [],
      awaitingDecision: true,
      outcome: {
        avatarGender,
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
            prestige: university.prestige,
            trackBias: university.trackBias,
            line: university.line,
          },
        ],
        careerCandidates,
        careerSelectableCount: careerCandidates.filter((career) => career.selectable).length,
        forcedArchiveAvailable: false,
      },
      battle: makeCompletedSuneungBattle(),
      road: {
        mode: "suneung",
        phase: "travel",
        encounterIndex: 3,
        encounterTotal: 4,
        phaseStartedAt: 0,
        lastCompletedEncounterId: "inquiry-final",
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
    const unitFrames = [...document.querySelectorAll(".expedition-unit-frame")];
    const enemyFrames = [...document.querySelectorAll(".expedition-enemy-frame")];
    const actionButton = document.querySelector(".expedition-action-button");
    const doc = document.documentElement;
    return {
      text: document.body.innerText,
      runNumber: state.runNumber,
      gradeId: state.current.gradeId,
      awaitingDecision: Boolean(state.current.awaitingDecision),
      companionCount: state.companions.length,
      partyMemberCount: state.expedition.partyMemberIds.length,
      stageIndex: state.expedition.stageIndex,
      clearedStageCount: state.expedition.clearedStageCount,
      currentStage: state.expedition.currentStage ?? -1,
      highestStage: state.expedition.highestStage ?? -1,
      trainingExp: state.expedition.trainingExp ?? -1,
      realEstateCash: state.realEstate?.cash ?? -1,
      money: state.money,
      careerChoiceCount: document.querySelectorAll(".career-choice.ranked").length,
      companionCards: document.querySelectorAll(".companion-card").length,
      expeditionMembers: state.expedition.members?.length ?? 0,
      expeditionTabs: document.querySelectorAll(".expedition-tab").length,
      expeditionGrowthCards: document.querySelectorAll(".expedition-growth-card").length,
      expeditionPartySlots: document.querySelectorAll(".expedition-party-slot").length,
      expeditionRosterCards: document.querySelectorAll(".expedition-roster-card").length,
      expeditionManageCards: document.querySelectorAll(".expedition-manage-card").length,
      expeditionLogEntries: document.querySelectorAll(".log-entry").length,
      expeditionScene: document.querySelectorAll(".expedition-scene").length,
      expeditionArena: document.querySelectorAll(".expedition-arena").length,
      unitFrameCount: unitFrames.length,
      unitFramesLoaded: unitFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      enemyFrameCount: enemyFrames.length,
      enemyFramesLoaded: enemyFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      enemyVisualCount: document.querySelectorAll(".expedition-enemy-visual").length,
      actionText: actionButton ? actionButton.innerText.trim() : "",
      hiddenLegacyHud: document.querySelectorAll(".expedition-scene-hud, .expedition-reward-strip, .expedition-scene-tags").length,
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
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: makeDecisionState(),
  });

  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (await page.locator(".load-failure").count()) {
    throw new Error(`세이브 로드 실패 화면 표시: ${await page.locator(".load-failure").innerText()}`);
  }
  const tabCount = await page.locator("button.tab").count();
  if (tabCount === 0) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const bodyHtml = await page.locator("body").innerHTML().catch(() => "");
    throw new Error(
      JSON.stringify(
        {
          reason: "탭 버튼이 렌더링되지 않았습니다.",
          consoleErrors,
          pageErrors,
          bodyText: bodyText.slice(0, 1200),
          bodyHtml: bodyHtml.slice(0, 1200),
        },
        null,
        2,
      ),
    );
  }
  await page.locator('button.tab[aria-label="결과"]').click();
  await page.waitForSelector(".panel.decision .career-choice.ranked", { timeout: 15000 });
  const beforeAccept = await collectSnapshot(page);

  await page.locator(".career-choice.ranked:not(.locked)").first().click();
  await page.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return (
        state.runNumber === 22 &&
        state.current.gradeId === "E1" &&
        state.current.awaitingDecision === false &&
        state.companions.length === 1 &&
        state.expedition.partyMemberIds.length === 1
      );
    },
    saveKey,
    { timeout: 6000 },
  );
  await page.waitForSelector(".expedition-scene .expedition-unit-frame", { timeout: 6000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterAccept = await collectSnapshot(page);

  await page.locator(".expedition-tab", { hasText: "파티" }).click();
  await page.waitForSelector(".expedition-party-slot", { timeout: 6000 });
  const partyTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "동료 관리" }).click();
  await page.waitForSelector(".expedition-manage-card", { timeout: 6000 });
  const manageTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "기록" }).click();
  await page.waitForSelector(".expedition-log-panel", { timeout: 6000 });
  const logTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "성장" }).click();
  await page.waitForSelector(".expedition-growth-card", { timeout: 6000 });

  await page.click(".expedition-action-button");
  await page.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition.stageIndex === 1 && state.expedition.clearedStageCount === 1;
    },
    saveKey,
    { timeout: 6000 },
  );
  await page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterClear = await collectSnapshot(page);

  const failures = [];
  assert(response, "HTTP 응답을 받지 못했습니다.");
  if (response.status() !== 200) failures.push(`HTTP status ${response.status()}`);
  if (beforeAccept.careerChoiceCount !== careers.length) failures.push(`Expected ${careers.length} career choices before accept, got ${beforeAccept.careerChoiceCount}`);
  if (afterAccept.runNumber !== 22) failures.push(`Career accept did not advance runNumber to 22, got ${afterAccept.runNumber}`);
  if (afterAccept.gradeId !== "E1") failures.push(`Career accept did not reset current grade to E1, got ${afterAccept.gradeId}`);
  if (afterAccept.awaitingDecision) failures.push("Career accept left awaitingDecision=true");
  if (afterAccept.companionCount !== 1) failures.push(`Expected 1 companion after accept, got ${afterAccept.companionCount}`);
  if (afterAccept.partyMemberCount !== 1) failures.push(`Expected 1 expedition party member, got ${afterAccept.partyMemberCount}`);
  if (afterAccept.expeditionMembers !== 1) failures.push(`Expected 1 expedition member, got ${afterAccept.expeditionMembers}`);
  if (afterAccept.expeditionTabs !== 4) failures.push(`Expected 4 expedition tabs, got ${afterAccept.expeditionTabs}`);
  if (afterAccept.expeditionGrowthCards !== 1) failures.push(`Expected 1 expedition growth card, got ${afterAccept.expeditionGrowthCards}`);
  if (partyTab.expeditionPartySlots !== 5) failures.push(`Expected 5 expedition party slots, got ${partyTab.expeditionPartySlots}`);
  if (partyTab.expeditionRosterCards !== 1) failures.push(`Expected 1 expedition roster card, got ${partyTab.expeditionRosterCards}`);
  if (manageTab.expeditionManageCards !== 1) failures.push(`Expected 1 expedition manage card, got ${manageTab.expeditionManageCards}`);
  if (!logTab.text.includes("원정 기록")) failures.push("Expedition log tab did not render 원정 기록");
  if (afterAccept.expeditionScene !== 1 || afterAccept.expeditionArena !== 1) failures.push(`Expected expedition scene/arena, got ${afterAccept.expeditionScene}/${afterAccept.expeditionArena}`);
  if (afterAccept.unitFrameCount !== 4 || afterAccept.unitFramesLoaded !== 4) failures.push(`Expected 4 loaded unit frames, got ${afterAccept.unitFramesLoaded}/${afterAccept.unitFrameCount}`);
  if (afterAccept.enemyVisualCount < 1 || afterAccept.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies, got ${afterAccept.enemyVisualCount}`);
  if (afterAccept.enemyFrameCount !== afterAccept.enemyVisualCount * 4 || afterAccept.enemyFramesLoaded !== afterAccept.enemyFrameCount) failures.push(`Expected loaded enemy frames to match enemies, got ${afterAccept.enemyFramesLoaded}/${afterAccept.enemyFrameCount} for ${afterAccept.enemyVisualCount} enemies`);
  if (afterAccept.actionText !== "돌파") failures.push(`Expected expedition action text 돌파, got ${afterAccept.actionText}`);
  if (afterAccept.hiddenLegacyHud !== 0) failures.push(`Expected no legacy expedition hud/reward/tag nodes, got ${afterAccept.hiddenLegacyHud}`);
  if (afterAccept.horizontalOverflow > 4) failures.push(`Horizontal overflow after accept ${afterAccept.horizontalOverflow}px`);
  if (afterClear.stageIndex !== 1) failures.push(`Expected stageIndex 1 after clear, got ${afterClear.stageIndex}`);
  if (afterClear.clearedStageCount !== 1) failures.push(`Expected clearedStageCount 1 after clear, got ${afterClear.clearedStageCount}`);
  if (afterClear.currentStage !== 2 || afterClear.highestStage !== 1) failures.push(`Expected current/highest stage 2/1 after clear, got ${afterClear.currentStage}/${afterClear.highestStage}`);
  if (afterClear.trainingExp <= afterAccept.trainingExp) failures.push(`Expected trainingExp to increase after clear, got ${afterAccept.trainingExp} -> ${afterClear.trainingExp}`);
  if (afterClear.realEstateCash <= afterAccept.realEstateCash) failures.push(`Expected realEstate cash to increase after clear, got ${afterAccept.realEstateCash} -> ${afterClear.realEstateCash}`);
  if (afterClear.money !== afterAccept.money) failures.push(`Expected money to stay unchanged after clear, before ${afterAccept.money}, after ${afterClear.money}`);
  if (afterClear.unitFrameCount !== 4 || afterClear.unitFramesLoaded !== 4) failures.push(`Expected 4 loaded unit frames after clear, got ${afterClear.unitFramesLoaded}/${afterClear.unitFrameCount}`);
  if (afterClear.enemyVisualCount < 1 || afterClear.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies after clear, got ${afterClear.enemyVisualCount}`);
  if (afterClear.enemyFrameCount !== afterClear.enemyVisualCount * 4 || afterClear.enemyFramesLoaded !== afterClear.enemyFrameCount) failures.push(`Expected loaded enemy frames after clear to match enemies, got ${afterClear.enemyFramesLoaded}/${afterClear.enemyFrameCount} for ${afterClear.enemyVisualCount} enemies`);
  if (afterClear.horizontalOverflow > 4) failures.push(`Horizontal overflow after clear ${afterClear.horizontalOverflow}px`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, beforeAccept, afterAccept, afterClear, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_EXPEDITION_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_EXPEDITION_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
