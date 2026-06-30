import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
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
    const arena = document.querySelector(".expedition-arena");
    const backdropStyle = arena ? getComputedStyle(arena, "::before") : null;
    const backdropLayers = [...document.querySelectorAll(".expedition-backdrop-layer")];
    const backdropLayerStyles = backdropLayers.map((layer) => getComputedStyle(layer));
    const combatFloats = [...document.querySelectorAll(".expedition-float")];
    const currentEnemies = [...document.querySelectorAll(".expedition-enemy-group .expedition-enemy-visual")];
    const defeatedEnemies = [...document.querySelectorAll(".expedition-enemy-group .expedition-enemy-visual.defeated")];
    const enemyVisibleFrameCounts = currentEnemies.map((enemy) =>
      [...enemy.querySelectorAll(".expedition-enemy-frame")].filter((frame) => Number.parseFloat(getComputedStyle(frame).opacity || "0") > 0.5).length,
    );
    const enemyVisualOpacities = currentEnemies.map((enemy) => Number.parseFloat(getComputedStyle(enemy).opacity || "1"));
    const enemyFloatFrontHits = currentEnemies.reduce((total, enemy) => {
      const frame = enemy.querySelector(".expedition-enemy-frame.frame-0") || enemy.querySelector(".expedition-enemy-frame");
      if (!frame) return total;
      const rect = frame.getBoundingClientRect();
      const points = [
        [0.5, 0.5],
        [0.36, 0.44],
        [0.64, 0.44],
        [0.4, 0.7],
        [0.6, 0.7],
      ];
      return total + points.filter(([xRatio, yRatio]) => {
        const top = document.elementFromPoint(rect.left + rect.width * xRatio, rect.top + rect.height * yRatio);
        return Boolean(top?.closest?.(".expedition-float"));
      }).length;
    }, 0);
    const hpWidthNumber = (node) => Number.parseFloat(node?.style?.width || "100") || 0;
    const enemyHpWidths = [...document.querySelectorAll(".expedition-hp-bar.enemy span")].map(hpWidthNumber);
    const allyHpWidths = [...document.querySelectorAll(".expedition-hp-bar.ally span")].map(hpWidthNumber);
    const enemyGroup = document.querySelector(".expedition-enemy-group");
    const enemyGroupStyle = enemyGroup ? getComputedStyle(enemyGroup) : null;
    const partyVisual = document.querySelector(".expedition-party-visual");
    const doc = document.documentElement;
    const parseMs = (value) => {
      const first = String(value || "").split(",")[0].trim();
      if (first.endsWith("ms")) return Number(first.replace("ms", ""));
      if (first.endsWith("s")) return Number(first.replace("s", "")) * 1000;
      return Number(first) || 0;
    };
    return {
      text: document.body.innerText,
      runNumber: state.runNumber,
      gradeId: state.current.gradeId,
      awaitingDecision: Boolean(state.current.awaitingDecision),
      careerAlumniCount: state.careerAlumni?.length ?? 0,
      partyMemberCount: state.expedition.partyMemberIds.length,
      stageIndex: state.expedition.stageIndex,
      clearedStageCount: state.expedition.clearedStageCount,
      currentStage: state.expedition.currentStage ?? -1,
      highestStage: state.expedition.highestStage ?? -1,
      trainingExp: state.expedition.trainingExp ?? -1,
      pendingTrainingExp: state.expedition.pendingReward?.trainingExp ?? 0,
      pendingRealEstateCash: state.expedition.pendingReward?.realEstateCash ?? 0,
      pendingBattles: state.expedition.pendingReward?.battles ?? 0,
      lastBattleId: state.expedition.pendingReward?.lastBattle?.id || "",
      lastBattleEvents: state.expedition.pendingReward?.lastBattle?.events?.length ?? 0,
      expeditionLogText: state.expedition.log?.[0]?.text || "",
      realEstateCash: state.realEstate?.cash ?? -1,
      money: state.money,
      careerChoiceCount: document.querySelectorAll(".career-choice.ranked").length,
      careerAlumniCards: document.querySelectorAll(".work-card").length,
      expeditionMembers: state.expedition.members?.length ?? 0,
      expeditionTabs: document.querySelectorAll(".expedition-tab").length,
      expeditionGrowthCards: document.querySelectorAll(".expedition-growth-card").length,
      expeditionPartySlots: document.querySelectorAll(".expedition-party-slot").length,
      expeditionRosterCards: document.querySelectorAll(".expedition-roster-card").length,
      expeditionManageCards: document.querySelectorAll(".expedition-manage-card").length,
      expeditionDispatchAssignments: state.expedition.dispatch?.assignments?.length ?? 0,
      expeditionDispatchHistory: state.expedition.dispatch?.history?.length ?? 0,
      expeditionDispatchCards: document.querySelectorAll(".expedition-dispatch-card").length,
      expeditionDispatchActiveCards: document.querySelectorAll(".expedition-dispatch-active").length,
      expeditionDispatchCompleteCards: document.querySelectorAll(".expedition-dispatch-active.complete").length,
      expeditionDispatchAvailableMembers: document.querySelectorAll(".expedition-dispatch-member-picker button").length,
      expeditionDispatchedRosterCards: document.querySelectorAll(".expedition-roster-card.dispatched").length,
      expeditionLogEntries: document.querySelectorAll(".log-entry").length,
      expeditionScene: document.querySelectorAll(".expedition-scene").length,
      expeditionArena: document.querySelectorAll(".expedition-arena").length,
      expeditionStageTransition: document.querySelector(".expedition-scene")?.getAttribute("data-stage-transition") || "",
      expeditionCombatReplay: document.querySelector(".expedition-scene")?.getAttribute("data-combat-replay") || "",
      expeditionCombatReady: document.querySelector(".expedition-scene")?.getAttribute("data-combat-ready") || "",
      expeditionEncounterIntro: document.querySelector(".expedition-scene")?.getAttribute("data-encounter-intro") || "",
      expeditionTransitionFromStage: document.querySelector(".expedition-scene")?.getAttribute("data-transition-from-stage") || "",
      expeditionTransitionToStage: document.querySelector(".expedition-scene")?.getAttribute("data-transition-to-stage") || "",
      expeditionTransitionFromTile: document.querySelector(".expedition-scene")?.getAttribute("data-transition-from-tile") || "",
      expeditionTransitionToTile: document.querySelector(".expedition-scene")?.getAttribute("data-transition-to-tile") || "",
      expeditionBackdropCrossfade: document.querySelector(".expedition-scene")?.getAttribute("data-backdrop-crossfade") || "",
      expeditionBackdropLayers: backdropLayers.length,
      expeditionBackdropLayerImages: backdropLayerStyles.filter((style) => style.backgroundImage.includes("url(")).length,
      expeditionBackdropLayerAnimations: new Set(backdropLayerStyles.map((style) => style.animationName).filter(Boolean)).size,
      expeditionBackdropTile: Number(arena?.getAttribute("data-bg-tile") || 0),
      expeditionBackdropFromTile: Number(arena?.getAttribute("data-bg-from-tile") || 0),
      expeditionBackdropFromX: Number(arena?.getAttribute("data-bg-from-x") || 0),
      expeditionBackdropToX: Number(arena?.getAttribute("data-bg-to-x") || 0),
      expeditionBackdropImage: backdropStyle?.backgroundImage || "",
      expeditionDefeatedEnemies: defeatedEnemies.length,
      expeditionDefeatOrders: defeatedEnemies.filter((node) => node.getAttribute("data-defeat-order")).length,
      expeditionDefeatDelayKinds: new Set(defeatedEnemies.map((node) => node.getAttribute("data-defeat-delay")).filter(Boolean)).size,
      expeditionEnemyGroupApproaching: document.querySelectorAll(".expedition-enemy-group.approaching").length,
      expeditionEnemyApproachDurationMs: parseMs(enemyGroupStyle?.animationDuration),
      expeditionEnemyApproachDelayMs: parseMs(enemyGroupStyle?.animationDelay),
      expeditionPartyMotion: partyVisual?.getAttribute("data-party-motion") || "",
      expeditionPartyRunning: partyVisual?.classList.contains("running") || false,
      expeditionPartyCombat: partyVisual?.classList.contains("combat") || false,
      expeditionEnemyAssetKinds: new Set(currentEnemies.map((node) => node.getAttribute("data-enemy-asset")).filter(Boolean)).size,
      expeditionEnemyVisibleFrameMin: enemyVisibleFrameCounts.length ? Math.min(...enemyVisibleFrameCounts) : 0,
      expeditionEnemyVisibleFrameMax: enemyVisibleFrameCounts.length ? Math.max(...enemyVisibleFrameCounts) : 0,
      expeditionEnemyVisualOpacityMin: enemyVisualOpacities.length ? Math.min(...enemyVisualOpacities) : 1,
      expeditionEnemyVisualOpacityMax: enemyVisualOpacities.length ? Math.max(...enemyVisualOpacities) : 1,
      expeditionEnemyFloatFrontHits: enemyFloatFrontHits,
      expeditionRewardDialogs: document.querySelectorAll('[role="dialog"][aria-label="원정 보상"]').length,
      expeditionRewardToasts: document.querySelectorAll(".expedition-reward-toast").length,
      expeditionHpBars: document.querySelectorAll(".expedition-hp-bar").length,
      expeditionEnemyHpMin: enemyHpWidths.length ? Math.min(...enemyHpWidths) : 100,
      expeditionEnemyHpMax: enemyHpWidths.length ? Math.max(...enemyHpWidths) : 100,
      expeditionAllyHpMin: allyHpWidths.length ? Math.min(...allyHpWidths) : 100,
      expeditionAllyHpMax: allyHpWidths.length ? Math.max(...allyHpWidths) : 100,
      expeditionCombatFloats: combatFloats.length,
      expeditionCombatFloatActors: combatFloats.filter((node) => node.getAttribute("data-actor")).length,
      expeditionCombatFloatTargets: combatFloats.filter((node) => node.getAttribute("data-target")).length,
      expeditionCombatFloatTargetSides: new Set(combatFloats.map((node) => node.getAttribute("data-target-side")).filter(Boolean)).size,
      expeditionCombatFloatKilled: combatFloats.filter((node) => node.getAttribute("data-killed") === "true").length,
      expeditionCombatFloatInfinite: combatFloats.filter((node) => getComputedStyle(node).animationIterationCount === "infinite").length,
      unitFrameCount: unitFrames.length,
      unitFramesLoaded: unitFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      enemyFrameCount: enemyFrames.length,
      enemyFramesLoaded: enemyFrames.filter((image) => image.complete && image.naturalWidth > 0).length,
      enemyVisualCount: currentEnemies.length,
      actionText: actionButton ? actionButton.innerText.trim() : "",
      actionDisabled: actionButton instanceof HTMLButtonElement ? actionButton.disabled : false,
      hiddenLegacyHud: document.querySelectorAll(".expedition-scene-hud, .expedition-reward-strip, .expedition-scene-tags").length,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  }, saveKey);
}

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/?qaTools=1&pauseAutoBattle=1`;
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

  await page.locator(".career-choice.ranked:not(.locked)", { hasText: "AI 연구원" }).first().click();
  await page.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return (
        state.runNumber === 22 &&
        state.current.gradeId === "E1" &&
        state.current.awaitingDecision === false &&
        state.careerAlumni?.length === 1 &&
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

  const stage26State = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.expedition.currentStage = 26;
    state.expedition.highestStage = 25;
    state.expedition.stageIndex = 25;
    state.expedition.clearedStageCount = 25;
    state.expedition.lastResolvedAt = Date.now();
    return state;
  }, saveKey);
  const stage26Page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await stage26Page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: stage26State,
  });
  await stage26Page.goto(baseUrl, { waitUntil: "networkidle" });
  await stage26Page.getByRole("button", { name: "원정대" }).click();
  await stage26Page.waitForSelector(".expedition-scene .expedition-unit-frame", { timeout: 6000 });
  await stage26Page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const stage26Backdrop = await collectSnapshot(stage26Page);
  await stage26Page.close();

  await page.locator(".expedition-tab", { hasText: "파티" }).click();
  await page.waitForSelector(".expedition-party-slot", { timeout: 6000 });
  const partyTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "대원 관리" }).click();
  await page.waitForSelector(".expedition-manage-card", { timeout: 6000 });
  const manageTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "기록" }).click();
  await page.waitForSelector(".expedition-log-panel", { timeout: 6000 });
  const logTab = await collectSnapshot(page);
  await page.locator(".expedition-tab", { hasText: "성장" }).click();
  await page.waitForSelector(".expedition-growth-card", { timeout: 6000 });

  const dispatchState = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const base = state.expedition.members[0];
    for (let index = 1; index < 8; index += 1) {
      state.expedition.members.push({
        ...base,
        id: `${base.id}-dispatch-smoke-${index}`,
        sourceKey: `${base.sourceKey}:dispatch-smoke:${index}`,
        sourceRunNumber: index,
        createdAt: Date.now() + index,
      });
    }
    state.expedition.partyMemberIds = state.expedition.members.slice(0, 5).map((member) => member.id);
    state.expedition.dispatch = { assignments: [], history: [] };
    return state;
  }, saveKey);
  const dispatchPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  dispatchPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`[dispatch] ${message.text()}`);
  });
  dispatchPage.on("pageerror", (error) => pageErrors.push(`[dispatch] ${error.message}`));
  await dispatchPage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: dispatchState,
  });
  await dispatchPage.goto(baseUrl, { waitUntil: "networkidle" });
  await dispatchPage.getByRole("button", { name: "원정대" }).click();
  await dispatchPage.locator(".expedition-tab", { hasText: "의뢰" }).click();
  await dispatchPage.waitForSelector(".expedition-dispatch-card", { timeout: 6000 });
  const firstDispatchCard = dispatchPage.locator(".expedition-dispatch-card").first();
  await firstDispatchCard.getByRole("button", { name: "세부" }).click();
  const dispatchBeforeStart = await collectSnapshot(dispatchPage);
  await firstDispatchCard.getByRole("button", { name: "추천 선택" }).click();
  await firstDispatchCard.locator(".expedition-dispatch-member-picker button.selected").first().waitFor({ timeout: 3000 });
  const dispatchRecommendedSelectedCount = await firstDispatchCard.locator(".expedition-dispatch-member-picker button.selected").count();
  await firstDispatchCard.getByRole("button", { name: "시작" }).click();
  await dispatchPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition.dispatch.assignments.length === 1;
    },
    saveKey,
    { timeout: 6000 },
  );
  const dispatchAfterStart = await collectSnapshot(dispatchPage);
  const dispatchCompletedState = await dispatchPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    const assignment = state.expedition.dispatch.assignments[0];
    const durationMs = Math.max(1, Number(assignment.completeAt) - Number(assignment.startedAt));
    assignment.completeAt = Date.now() - 1000;
    assignment.startedAt = assignment.completeAt - durationMs;
    localStorage.setItem(key, JSON.stringify(state));
    return state;
  }, saveKey);
  await dispatchPage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: dispatchCompletedState,
  });
  await dispatchPage.reload({ waitUntil: "networkidle" });
  await dispatchPage.getByRole("button", { name: "원정대" }).click();
  await dispatchPage.locator(".expedition-tab", { hasText: "의뢰" }).click();
  await dispatchPage.waitForSelector(".expedition-dispatch-active.complete", { timeout: 6000 });
  const dispatchReadyToClaim = await collectSnapshot(dispatchPage);
  await dispatchPage.locator(".expedition-dispatch-active.complete").first().getByRole("button", { name: "받기" }).click();
  await dispatchPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition.dispatch.assignments.length === 0 && state.expedition.dispatch.history.length === 1;
    },
    saveKey,
    { timeout: 6000 },
  );
  const dispatchAfterClaim = await collectSnapshot(dispatchPage);
  await dispatchPage.close();

  const clearClickedAt = Date.now();
  await page.click(".expedition-action-button");
  await page.waitForSelector('.expedition-scene[data-combat-replay="win"][data-stage-transition="idle"]', { timeout: 2000 });
  await page.waitForSelector(".expedition-float[data-actor][data-target]", { timeout: 2000 });
  await page.waitForFunction(() => {
    const width = (node) => Number.parseFloat(node?.style?.width || "100") || 0;
    const enemyWidths = [...document.querySelectorAll(".expedition-hp-bar.enemy span")].map(width);
    const allyWidths = [...document.querySelectorAll(".expedition-hp-bar.ally span")].map(width);
    return enemyWidths.some((value) => value < 100) && allyWidths.some((value) => value < 100);
  }, null, { timeout: 3000 });
  const duringDefeatReplay = await collectSnapshot(page);
  await page.waitForFunction(() => {
    const scene = document.querySelector(".expedition-scene");
    if (scene?.getAttribute("data-stage-transition") !== "idle") return false;
    const defeated = [...document.querySelectorAll(".expedition-enemy-group .expedition-enemy-visual.defeated")];
    return defeated.length > 0 && defeated.every((enemy) => Number.parseFloat(getComputedStyle(enemy).opacity || "1") <= 0.08);
  }, null, { timeout: 6000 });
  const afterEnemyDespawn = await collectSnapshot(page);
  await page.waitForSelector('.expedition-scene[data-stage-transition="moving"]', { timeout: 5000 });
  const moveStartedAfterMs = Date.now() - clearClickedAt;
  const duringStageTransition = await collectSnapshot(page);
  await page.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition.highestStage >= 1 && state.expedition.trainingExp > 0 && state.realEstate?.cash > 0 && state.expedition.pendingReward?.lastBattle;
    },
    saveKey,
    { timeout: 6000 },
  );
  await page.waitForFunction(() => {
    const scene = document.querySelector(".expedition-scene");
    return scene?.getAttribute("data-stage-transition") === "moving" && scene?.getAttribute("data-encounter-intro") === "approaching";
  }, null, { timeout: 5000 });
  const duringEncounterIntro = await collectSnapshot(page);
  await page.waitForFunction(() => {
    const scene = document.querySelector(".expedition-scene");
    return scene?.getAttribute("data-stage-transition") === "idle" && scene?.getAttribute("data-encounter-intro") === "idle";
  }, null, { timeout: 4000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const afterClear = await collectSnapshot(page);

  const autoGatePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  autoGatePage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`[auto] ${message.text()}`);
  });
  autoGatePage.on("pageerror", (error) => pageErrors.push(`[auto] ${error.message}`));
  await autoGatePage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: saveKey,
    state: makeDecisionState(),
  });
  const autoGateResponse = await autoGatePage.goto(`http://127.0.0.1:${port}/?qaTools=1`, { waitUntil: "networkidle" });
  await autoGatePage.locator('button.tab[aria-label="결과"]').click();
  await autoGatePage.waitForSelector(".panel.decision .career-choice.ranked", { timeout: 15000 });
  await autoGatePage.locator(".career-choice.ranked:not(.locked)", { hasText: "AI 연구원" }).first().click();
  await autoGatePage.waitForSelector('.expedition-scene[data-combat-ready="true"]', { timeout: 6000 });
  await autoGatePage.waitForFunction(() => [...document.querySelectorAll(".expedition-unit-frame, .expedition-enemy-frame")].every((image) => image.complete && image.naturalWidth > 0), null, {
    timeout: 6000,
  });
  const autoGateInitial = await collectSnapshot(autoGatePage);
  await autoGatePage.waitForFunction(
    (key) => {
      const scene = document.querySelector(".expedition-scene");
      const state = JSON.parse(localStorage.getItem(key));
      return scene?.getAttribute("data-combat-ready") === "false" && Boolean(state.expedition.pendingReward?.lastBattle?.id);
    },
    saveKey,
    { timeout: 7000 },
  );
  const autoGateBusyStart = await collectSnapshot(autoGatePage);
  await autoGatePage.waitForTimeout(2600);
  const autoGateBusyMid = await collectSnapshot(autoGatePage);
  await autoGatePage.waitForSelector('.expedition-scene[data-combat-ready="true"]', { timeout: 10000 });
  const autoGateReadyAgain = await collectSnapshot(autoGatePage);
  await autoGatePage.waitForFunction(
    ({ key, previousBattleId }) => {
      const scene = document.querySelector(".expedition-scene");
      const state = JSON.parse(localStorage.getItem(key));
      const nextBattleId = state.expedition.pendingReward?.lastBattle?.id || "";
      return scene?.getAttribute("data-combat-ready") === "false" && nextBattleId && nextBattleId !== previousBattleId;
    },
    { key: saveKey, previousBattleId: autoGateReadyAgain.lastBattleId },
    { timeout: 7000 },
  );
  const autoGateAfterResume = await collectSnapshot(autoGatePage);
  await autoGatePage.close();

  const debugAutoPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  debugAutoPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`[debug-auto] ${message.text()}`);
  });
  debugAutoPage.on("pageerror", (error) => pageErrors.push(`[debug-auto] ${error.message}`));
  await debugAutoPage.addInitScript((key) => localStorage.removeItem(key), saveKey);
  const debugAutoResponse = await debugAutoPage.goto(`http://127.0.0.1:${port}/?qaTools=1`, { waitUntil: "networkidle" });
  await debugAutoPage.locator("button.icon-button").first().click();
  await debugAutoPage.waitForSelector(".debug-modal", { timeout: 10000 });
  await debugAutoPage.locator(".debug-modal button").nth(9).click();
  await debugAutoPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition?.members?.length === 5 && state.expedition?.partyMemberIds?.length === 5;
    },
    saveKey,
    { timeout: 10000 },
  );
  await debugAutoPage.locator(".debug-modal .icon-button.dark").click();
  await debugAutoPage.locator(".mode-tab").nth(1).click();
  await debugAutoPage.waitForSelector('.expedition-scene[data-combat-ready="true"]', { timeout: 10000 });
  const debugAutoInitial = await collectSnapshot(debugAutoPage);
  await debugAutoPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition?.currentStage >= 2 && Boolean(state.expedition?.pendingReward?.lastBattle?.id);
    },
    saveKey,
    { timeout: 9000 },
  );
  const debugAutoAfterFirst = await collectSnapshot(debugAutoPage);
  await debugAutoPage.waitForFunction(
    (key) => {
      const state = JSON.parse(localStorage.getItem(key));
      return state.expedition?.currentStage >= 3 && Boolean(state.expedition?.pendingReward?.lastBattle?.id);
    },
    saveKey,
    { timeout: 20000 },
  );
  const debugAutoAfterSecond = await collectSnapshot(debugAutoPage);
  await debugAutoPage.close();

  const failures = [];
  assert(response, "HTTP 응답을 받지 못했습니다.");
  if (response.status() !== 200) failures.push(`HTTP status ${response.status()}`);
  if (!autoGateResponse) failures.push("Auto-gate HTTP response missing");
  else if (autoGateResponse.status() !== 200) failures.push(`Auto-gate HTTP status ${autoGateResponse.status()}`);
  if (!debugAutoResponse) failures.push("Debug-auto HTTP response missing");
  else if (debugAutoResponse.status() !== 200) failures.push(`Debug-auto HTTP status ${debugAutoResponse.status()}`);
  if (beforeAccept.careerChoiceCount !== careers.length) failures.push(`Expected ${careers.length} career choices before accept, got ${beforeAccept.careerChoiceCount}`);
  if (afterAccept.runNumber !== 22) failures.push(`Career accept did not advance runNumber to 22, got ${afterAccept.runNumber}`);
  if (afterAccept.gradeId !== "E1") failures.push(`Career accept did not reset current grade to E1, got ${afterAccept.gradeId}`);
  if (afterAccept.awaitingDecision) failures.push("Career accept left awaitingDecision=true");
  if (afterAccept.careerAlumniCount !== 1) failures.push(`Expected 1 career alumni after accept, got ${afterAccept.careerAlumniCount}`);
  if (afterAccept.partyMemberCount !== 1) failures.push(`Expected 1 expedition party member, got ${afterAccept.partyMemberCount}`);
  if (afterAccept.expeditionMembers !== 1) failures.push(`Expected 1 expedition member, got ${afterAccept.expeditionMembers}`);
  if (afterAccept.expeditionTabs !== 5) failures.push(`Expected 5 expedition tabs, got ${afterAccept.expeditionTabs}`);
  if (afterAccept.expeditionGrowthCards !== 1) failures.push(`Expected 1 expedition growth card, got ${afterAccept.expeditionGrowthCards}`);
  if (partyTab.expeditionPartySlots !== 5) failures.push(`Expected 5 expedition party slots, got ${partyTab.expeditionPartySlots}`);
  if (partyTab.expeditionRosterCards !== 1) failures.push(`Expected 1 expedition roster card, got ${partyTab.expeditionRosterCards}`);
  if (manageTab.expeditionManageCards !== 1) failures.push(`Expected 1 expedition manage card, got ${manageTab.expeditionManageCards}`);
  if (!logTab.text.includes("원정 기록")) failures.push("Expedition log tab did not render 원정 기록");
  if (dispatchBeforeStart.expeditionTabs !== 5) failures.push(`Expected dispatch setup to expose 5 expedition tabs, got ${dispatchBeforeStart.expeditionTabs}`);
  if (dispatchBeforeStart.expeditionDispatchCards !== 4) failures.push(`Expected 4 daily dispatch cards, got ${dispatchBeforeStart.expeditionDispatchCards}`);
  if (dispatchBeforeStart.expeditionDispatchAvailableMembers < 1) failures.push(`Expected at least 1 dispatch-available member, got ${dispatchBeforeStart.expeditionDispatchAvailableMembers}`);
  if (dispatchRecommendedSelectedCount !== 3) failures.push(`Expected recommended dispatch selection to fill 3 members, got ${dispatchRecommendedSelectedCount}`);
  if (dispatchAfterStart.expeditionDispatchAssignments !== 1) failures.push(`Expected 1 dispatch assignment after start, got ${dispatchAfterStart.expeditionDispatchAssignments}`);
  if (dispatchAfterStart.expeditionDispatchActiveCards !== 1) failures.push(`Expected 1 active dispatch card after start, got ${dispatchAfterStart.expeditionDispatchActiveCards}`);
  if (dispatchAfterStart.expeditionDispatchedRosterCards > 0 && !dispatchAfterStart.text.includes("파견중")) failures.push("Expected dispatched member state to display 파견중");
  if (dispatchReadyToClaim.expeditionDispatchCompleteCards !== 1) failures.push(`Expected 1 completed dispatch card before claim, got ${dispatchReadyToClaim.expeditionDispatchCompleteCards}`);
  if (dispatchAfterClaim.expeditionDispatchAssignments !== 0) failures.push(`Expected 0 dispatch assignments after claim, got ${dispatchAfterClaim.expeditionDispatchAssignments}`);
  if (dispatchAfterClaim.expeditionDispatchHistory !== 1) failures.push(`Expected 1 dispatch history entry after claim, got ${dispatchAfterClaim.expeditionDispatchHistory}`);
  if (dispatchAfterClaim.trainingExp <= dispatchAfterStart.trainingExp) failures.push(`Expected dispatch claim to increase trainingExp, got ${dispatchAfterStart.trainingExp} -> ${dispatchAfterClaim.trainingExp}`);
  if (dispatchAfterClaim.realEstateCash <= dispatchAfterStart.realEstateCash) failures.push(`Expected dispatch claim to increase realEstate cash, got ${dispatchAfterStart.realEstateCash} -> ${dispatchAfterClaim.realEstateCash}`);
  if (afterAccept.expeditionScene !== 1 || afterAccept.expeditionArena !== 1) failures.push(`Expected expedition scene/arena, got ${afterAccept.expeditionScene}/${afterAccept.expeditionArena}`);
  if (!afterAccept.expeditionBackdropImage || afterAccept.expeditionBackdropImage === "none") failures.push("Expected expedition backdrop image on arena ::before");
  if (afterAccept.expeditionBackdropTile !== 0) failures.push(`Expected stage 1 backdrop tile 0, got ${afterAccept.expeditionBackdropTile}`);
  if (stage26Backdrop.expeditionBackdropTile !== 1) failures.push(`Expected stage 26 backdrop tile 1, got ${stage26Backdrop.expeditionBackdropTile}`);
  if (stage26Backdrop.expeditionBackdropToX !== 0) failures.push(`Expected stage 26 backdrop offset 0 inside tile 1, got ${stage26Backdrop.expeditionBackdropToX}`);
  if (stage26Backdrop.expeditionBackdropImage === afterAccept.expeditionBackdropImage) failures.push("Expected stage 26 backdrop image to use a different route tile from stage 1");
  if (afterAccept.unitFrameCount !== 4 || afterAccept.unitFramesLoaded !== 4) failures.push(`Expected 4 loaded unit frames, got ${afterAccept.unitFramesLoaded}/${afterAccept.unitFrameCount}`);
  if (afterAccept.enemyVisualCount < 1 || afterAccept.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies, got ${afterAccept.enemyVisualCount}`);
  if (afterAccept.enemyFrameCount !== afterAccept.enemyVisualCount * 4 || afterAccept.enemyFramesLoaded !== afterAccept.enemyFrameCount) failures.push(`Expected loaded enemy frames to match enemies, got ${afterAccept.enemyFramesLoaded}/${afterAccept.enemyFrameCount} for ${afterAccept.enemyVisualCount} enemies`);
  if (afterAccept.enemyVisualCount > 1 && afterAccept.expeditionEnemyAssetKinds <= 1) failures.push(`Expected expedition enemies to use varied assets, got ${afterAccept.expeditionEnemyAssetKinds} asset kind(s) for ${afterAccept.enemyVisualCount} enemies`);
  if (afterAccept.expeditionEnemyVisibleFrameMin !== 1 || afterAccept.expeditionEnemyVisibleFrameMax !== 1) failures.push(`Expected exactly 1 visible sprite frame per enemy before combat, got min/max ${afterAccept.expeditionEnemyVisibleFrameMin}/${afterAccept.expeditionEnemyVisibleFrameMax}`);
  if (!afterAccept.expeditionPartyCombat || afterAccept.expeditionPartyMotion !== "combat") failures.push(`Expected ready expedition party to use in-place combat motion, got combat=${afterAccept.expeditionPartyCombat} motion=${afterAccept.expeditionPartyMotion}`);
  if (afterAccept.actionText !== "돌파") failures.push(`Expected expedition action text 돌파, got ${afterAccept.actionText}`);
  if (afterAccept.hiddenLegacyHud !== 0) failures.push(`Expected no legacy expedition hud/reward/tag nodes, got ${afterAccept.hiddenLegacyHud}`);
  if (afterAccept.horizontalOverflow > 4) failures.push(`Horizontal overflow after accept ${afterAccept.horizontalOverflow}px`);
  if (duringDefeatReplay.expeditionStageTransition !== "idle" || duringDefeatReplay.expeditionCombatReplay !== "win") failures.push(`Expected defeat replay before travel, got transition=${duringDefeatReplay.expeditionStageTransition} replay=${duringDefeatReplay.expeditionCombatReplay}`);
  if (duringDefeatReplay.expeditionBackdropFromX !== 0 || duringDefeatReplay.expeditionBackdropToX !== 0) failures.push(`Expected backdrop to stay before travel, got ${duringDefeatReplay.expeditionBackdropFromX} -> ${duringDefeatReplay.expeditionBackdropToX}`);
  if (duringDefeatReplay.expeditionDefeatedEnemies < 1) failures.push(`Expected defeated enemy visuals before travel, got ${duringDefeatReplay.expeditionDefeatedEnemies}`);
  if (duringDefeatReplay.expeditionDefeatOrders !== duringDefeatReplay.expeditionDefeatedEnemies) failures.push(`Expected every defeated enemy to expose defeat order before travel, got ${duringDefeatReplay.expeditionDefeatOrders}/${duringDefeatReplay.expeditionDefeatedEnemies}`);
  if (duringDefeatReplay.expeditionDefeatedEnemies > 1 && duringDefeatReplay.expeditionDefeatDelayKinds <= 1) failures.push(`Expected staggered enemy defeat delays before travel, got ${duringDefeatReplay.expeditionDefeatDelayKinds}`);
  if (duringDefeatReplay.expeditionCombatFloats < 1) failures.push("Expected combat floats during defeat replay");
  if (duringDefeatReplay.expeditionCombatFloatActors !== duringDefeatReplay.expeditionCombatFloats) failures.push(`Expected every combat float to expose actor before travel, got ${duringDefeatReplay.expeditionCombatFloatActors}/${duringDefeatReplay.expeditionCombatFloats}`);
  if (duringDefeatReplay.expeditionCombatFloatTargets !== duringDefeatReplay.expeditionCombatFloats) failures.push(`Expected every combat float to expose target before travel, got ${duringDefeatReplay.expeditionCombatFloatTargets}/${duringDefeatReplay.expeditionCombatFloats}`);
  if (duringDefeatReplay.expeditionCombatFloatTargetSides < 1) failures.push("Expected combat floats to expose target side before travel");
  if (duringDefeatReplay.expeditionCombatFloatKilled < 1) failures.push("Expected at least one kill combat float before travel");
  if (duringDefeatReplay.expeditionCombatFloatInfinite !== 0) failures.push(`Expected combat floats to avoid infinite animation before travel, got ${duringDefeatReplay.expeditionCombatFloatInfinite}`);
  if (duringDefeatReplay.expeditionEnemyVisibleFrameMin !== 1 || duringDefeatReplay.expeditionEnemyVisibleFrameMax !== 1) failures.push(`Expected exactly 1 visible sprite frame per enemy during combat replay, got min/max ${duringDefeatReplay.expeditionEnemyVisibleFrameMin}/${duringDefeatReplay.expeditionEnemyVisibleFrameMax}`);
  if (duringDefeatReplay.expeditionEnemyFloatFrontHits !== 0) failures.push(`Expected combat floats not to cover enemy sprites in front, got ${duringDefeatReplay.expeditionEnemyFloatFrontHits} front hits`);
  if (duringDefeatReplay.expeditionEnemyHpMin >= 100) failures.push(`Expected enemy HP bars to decrease during combat replay, got min ${duringDefeatReplay.expeditionEnemyHpMin}%`);
  if (duringDefeatReplay.expeditionAllyHpMin >= 100) failures.push(`Expected ally HP bars to reflect monster damage during combat replay, got min ${duringDefeatReplay.expeditionAllyHpMin}%`);
  if (duringDefeatReplay.expeditionPartyRunning || !duringDefeatReplay.expeditionPartyCombat || duringDefeatReplay.expeditionPartyMotion !== "combat") failures.push(`Expected party to walk in place during combat replay, got running=${duringDefeatReplay.expeditionPartyRunning} combat=${duringDefeatReplay.expeditionPartyCombat} motion=${duringDefeatReplay.expeditionPartyMotion}`);
  if (duringDefeatReplay.actionText !== "정리중" || !duringDefeatReplay.actionDisabled) failures.push(`Expected action 정리중 during defeat replay, got disabled=${duringDefeatReplay.actionDisabled} text=${duringDefeatReplay.actionText}`);
  if (duringDefeatReplay.expeditionCombatReady !== "false") failures.push(`Expected combat ready false during defeat replay, got ${duringDefeatReplay.expeditionCombatReady}`);
  if (afterEnemyDespawn.expeditionStageTransition !== "idle" || afterEnemyDespawn.expeditionCombatReplay !== "win") failures.push(`Expected defeated enemies to despawn before travel, got transition=${afterEnemyDespawn.expeditionStageTransition} replay=${afterEnemyDespawn.expeditionCombatReplay}`);
  if (afterEnemyDespawn.expeditionCombatReady !== "false") failures.push(`Expected combat ready false after enemy despawn, got ${afterEnemyDespawn.expeditionCombatReady}`);
  if (afterEnemyDespawn.expeditionDefeatedEnemies < 1) failures.push(`Expected defeated enemies to remain tracked until travel starts, got ${afterEnemyDespawn.expeditionDefeatedEnemies}`);
  if (afterEnemyDespawn.expeditionEnemyVisualOpacityMax > 0.08) failures.push(`Expected defeated enemies to be fully despawned before travel, got max opacity ${afterEnemyDespawn.expeditionEnemyVisualOpacityMax}`);
  if (afterEnemyDespawn.expeditionEnemyFloatFrontHits !== 0) failures.push(`Expected despawned enemies not to be covered by combat floats, got ${afterEnemyDespawn.expeditionEnemyFloatFrontHits} front hits`);
  if (moveStartedAfterMs < 2000) failures.push(`Expected travel to start after defeated enemies finish, got ${moveStartedAfterMs}ms`);
  if (duringStageTransition.expeditionStageTransition !== "moving") failures.push(`Expected moving stage transition after clear, got ${duringStageTransition.expeditionStageTransition}`);
  if (duringStageTransition.expeditionTransitionFromStage !== "1" || duringStageTransition.expeditionTransitionToStage !== "2") failures.push(`Expected transition 1 -> 2, got ${duringStageTransition.expeditionTransitionFromStage} -> ${duringStageTransition.expeditionTransitionToStage}`);
  if (duringStageTransition.expeditionBackdropLayers !== 2) failures.push(`Expected two backdrop blend layers during travel, got ${duringStageTransition.expeditionBackdropLayers}`);
  if (duringStageTransition.expeditionBackdropLayerImages !== 2) failures.push(`Expected both backdrop blend layers to have images, got ${duringStageTransition.expeditionBackdropLayerImages}`);
  if (duringStageTransition.expeditionBackdropLayerAnimations < 2) failures.push(`Expected backdrop blend layers to animate independently, got ${duringStageTransition.expeditionBackdropLayerAnimations}`);
  if (duringStageTransition.expeditionBackdropFromTile !== 0 || duringStageTransition.expeditionBackdropTile !== 0) failures.push(`Expected stage 1 -> 2 to stay within tile 0 while blending, got ${duringStageTransition.expeditionBackdropFromTile} -> ${duringStageTransition.expeditionBackdropTile}`);
  if (!(duringStageTransition.expeditionBackdropToX < duringStageTransition.expeditionBackdropFromX)) failures.push(`Expected expedition backdrop to move left, got ${duringStageTransition.expeditionBackdropFromX} -> ${duringStageTransition.expeditionBackdropToX}`);
  if (duringStageTransition.expeditionBackdropFromX !== 0 || duringStageTransition.expeditionBackdropToX !== -80) failures.push(`Expected stage 1 -> 2 backdrop offset 0 -> -80, got ${duringStageTransition.expeditionBackdropFromX} -> ${duringStageTransition.expeditionBackdropToX}`);
  if (duringStageTransition.enemyVisualCount !== 0 || duringStageTransition.enemyFrameCount !== 0) failures.push(`Expected previous enemies to be absent during travel, got enemies=${duringStageTransition.enemyVisualCount} frames=${duringStageTransition.enemyFrameCount}`);
  if (duringStageTransition.expeditionEncounterIntro !== "idle") failures.push(`Expected encounter intro to wait until late travel, got ${duringStageTransition.expeditionEncounterIntro}`);
  if (duringStageTransition.expeditionEnemyGroupApproaching !== 0) failures.push(`Expected no approaching enemy group during early travel, got ${duringStageTransition.expeditionEnemyGroupApproaching}`);
  if (duringStageTransition.expeditionCombatFloats !== 0) failures.push(`Expected combat floats to finish before travel, got ${duringStageTransition.expeditionCombatFloats}`);
  if (duringStageTransition.expeditionCombatReady !== "false") failures.push(`Expected combat ready false while traveling, got ${duringStageTransition.expeditionCombatReady}`);
  if (!duringStageTransition.actionDisabled || duringStageTransition.actionText !== "이동중") failures.push(`Expected expedition action disabled 이동중 during transition, got disabled=${duringStageTransition.actionDisabled} text=${duringStageTransition.actionText}`);
  if (!duringStageTransition.expeditionPartyRunning || duringStageTransition.expeditionPartyMotion !== "running") failures.push(`Expected party to run only during travel, got running=${duringStageTransition.expeditionPartyRunning} motion=${duringStageTransition.expeditionPartyMotion}`);
  if (duringEncounterIntro.expeditionStageTransition !== "moving" || duringEncounterIntro.expeditionEncounterIntro !== "approaching") failures.push(`Expected enemy encounter during late travel, got transition=${duringEncounterIntro.expeditionStageTransition} intro=${duringEncounterIntro.expeditionEncounterIntro}`);
  if (duringEncounterIntro.expeditionEnemyGroupApproaching < 1) failures.push(`Expected current enemy group to approach during late travel, got ${duringEncounterIntro.expeditionEnemyGroupApproaching}`);
  if (Math.abs(duringEncounterIntro.expeditionEnemyApproachDurationMs - 1000) > 80) failures.push(`Expected encounter approach duration about 1000ms, got ${duringEncounterIntro.expeditionEnemyApproachDurationMs}`);
  if (duringEncounterIntro.enemyVisualCount > 1 && duringEncounterIntro.expeditionEnemyAssetKinds <= 1) failures.push(`Expected encountered enemies to use varied assets, got ${duringEncounterIntro.expeditionEnemyAssetKinds}`);
  if (duringEncounterIntro.expeditionEnemyVisibleFrameMin !== 1 || duringEncounterIntro.expeditionEnemyVisibleFrameMax !== 1) failures.push(`Expected exactly 1 visible sprite frame per enemy during encounter, got min/max ${duringEncounterIntro.expeditionEnemyVisibleFrameMin}/${duringEncounterIntro.expeditionEnemyVisibleFrameMax}`);
  if (duringEncounterIntro.expeditionCombatReady !== "false") failures.push(`Expected combat ready false while encounter is approaching, got ${duringEncounterIntro.expeditionCombatReady}`);
  if (!duringEncounterIntro.actionDisabled || duringEncounterIntro.actionText !== "이동중") failures.push(`Expected expedition action disabled 이동중 during overlap encounter, got disabled=${duringEncounterIntro.actionDisabled} text=${duringEncounterIntro.actionText}`);
  if (!duringEncounterIntro.expeditionPartyRunning || duringEncounterIntro.expeditionPartyCombat || duringEncounterIntro.expeditionPartyMotion !== "running") failures.push(`Expected party to keep running while enemies approach during late travel, got running=${duringEncounterIntro.expeditionPartyRunning} combat=${duringEncounterIntro.expeditionPartyCombat} motion=${duringEncounterIntro.expeditionPartyMotion}`);
  if (afterClear.clearedStageCount !== 1) failures.push(`Expected clearedStageCount 1 after clear, got ${afterClear.clearedStageCount}`);
  if (afterClear.expeditionStageTransition !== "idle") failures.push(`Expected idle stage transition after 4s, got ${afterClear.expeditionStageTransition}`);
  if (afterClear.expeditionBackdropLayers !== 0) failures.push(`Expected backdrop blend layers to unmount after travel, got ${afterClear.expeditionBackdropLayers}`);
  if (afterClear.expeditionEncounterIntro !== "idle") failures.push(`Expected encounter intro idle immediately after travel, got ${afterClear.expeditionEncounterIntro}`);
  if (afterClear.expeditionPartyRunning || !afterClear.expeditionPartyCombat || afterClear.expeditionPartyMotion !== "combat") failures.push(`Expected party to return to in-place combat motion after encounter, got running=${afterClear.expeditionPartyRunning} combat=${afterClear.expeditionPartyCombat} motion=${afterClear.expeditionPartyMotion}`);
  if (afterClear.expeditionBackdropToX !== duringStageTransition.expeditionBackdropToX) failures.push(`Expected expedition backdrop to persist at ${duringStageTransition.expeditionBackdropToX}, got ${afterClear.expeditionBackdropToX}`);
  if (afterClear.expeditionBackdropToX !== -80) failures.push(`Expected stage 2 backdrop offset -80 after clear, got ${afterClear.expeditionBackdropToX}`);
  if (afterClear.expeditionEnemyVisibleFrameMin !== 1 || afterClear.expeditionEnemyVisibleFrameMax !== 1) failures.push(`Expected exactly 1 visible sprite frame per enemy after clear, got min/max ${afterClear.expeditionEnemyVisibleFrameMin}/${afterClear.expeditionEnemyVisibleFrameMax}`);
  if (afterClear.expeditionCombatReady !== "true") failures.push(`Expected combat ready true after encounter completes, got ${afterClear.expeditionCombatReady}`);
  if (afterClear.lastBattleEvents < 1) failures.push(`Expected last battle events after expedition action, got ${afterClear.lastBattleEvents}`);
  if (afterClear.trainingExp <= afterAccept.trainingExp) failures.push(`Expected trainingExp to increase instantly after clear, got ${afterAccept.trainingExp} -> ${afterClear.trainingExp}`);
  if (afterClear.pendingTrainingExp !== 0) failures.push(`Expected no pending trainingExp after manual clear, got ${afterClear.pendingTrainingExp}`);
  if (afterClear.realEstateCash <= afterAccept.realEstateCash) failures.push(`Expected realEstate cash to increase instantly after clear, got ${afterAccept.realEstateCash} -> ${afterClear.realEstateCash}`);
  if (afterClear.pendingRealEstateCash !== 0) failures.push(`Expected no pending realEstate cash after manual clear, got ${afterClear.pendingRealEstateCash}`);
  if (afterClear.expeditionRewardDialogs !== 0) failures.push(`Expected no reward modal after manual clear, got ${afterClear.expeditionRewardDialogs}`);
  if (afterClear.expeditionRewardToasts < 1 && !afterClear.expeditionLogText.includes("전투 승리")) failures.push("Expected compact expedition reward toast or reward log after manual clear");
  if (afterClear.expeditionHpBars < 2) failures.push(`Expected expedition HP bars, got ${afterClear.expeditionHpBars}`);
  if (afterClear.money < afterAccept.money) failures.push(`Expected money not to decrease after clear while passive work income may accrue, before ${afterAccept.money}, after ${afterClear.money}`);
  if (afterClear.unitFrameCount !== 4 || afterClear.unitFramesLoaded !== 4) failures.push(`Expected 4 loaded unit frames after clear, got ${afterClear.unitFramesLoaded}/${afterClear.unitFrameCount}`);
  if (afterClear.enemyVisualCount < 1 || afterClear.enemyVisualCount > 3) failures.push(`Expected 1-3 expedition enemies after clear, got ${afterClear.enemyVisualCount}`);
  if (afterClear.enemyFrameCount !== afterClear.enemyVisualCount * 4 || afterClear.enemyFramesLoaded !== afterClear.enemyFrameCount) failures.push(`Expected loaded enemy frames after clear to match enemies, got ${afterClear.enemyFramesLoaded}/${afterClear.enemyFrameCount} for ${afterClear.enemyVisualCount} enemies`);
  if (afterClear.horizontalOverflow > 4) failures.push(`Horizontal overflow after clear ${afterClear.horizontalOverflow}px`);
  if (autoGateInitial.expeditionCombatReady !== "true") failures.push(`Expected auto combat to start from ready state, got ${autoGateInitial.expeditionCombatReady}`);
  if (autoGateBusyStart.expeditionCombatReady !== "false") failures.push(`Expected auto combat ready false after first automatic battle, got ${autoGateBusyStart.expeditionCombatReady}`);
  if (autoGateBusyStart.lastBattleId === autoGateInitial.lastBattleId) failures.push("Expected first automatic battle to create a new battle report");
  if (autoGateBusyMid.expeditionCombatReady !== "false") failures.push(`Expected auto combat to stay blocked while cleanup/travel/encounter is active, got ${autoGateBusyMid.expeditionCombatReady}`);
  if (autoGateBusyMid.currentStage !== autoGateBusyStart.currentStage) failures.push(`Expected auto combat not to advance before encounter stops, got stage ${autoGateBusyStart.currentStage} -> ${autoGateBusyMid.currentStage}`);
  if (autoGateBusyMid.lastBattleId !== autoGateBusyStart.lastBattleId) failures.push("Expected auto combat not to create another battle report before encounter stops");
  if (autoGateReadyAgain.expeditionCombatReady !== "true") failures.push(`Expected auto combat ready true after encounter stops, got ${autoGateReadyAgain.expeditionCombatReady}`);
  if (autoGateAfterResume.lastBattleId === autoGateReadyAgain.lastBattleId) failures.push("Expected auto combat to resume after encounter stops");
  if (autoGateAfterResume.expeditionCombatReady !== "false") failures.push(`Expected resumed auto battle to re-enter blocked visual state, got ${autoGateAfterResume.expeditionCombatReady}`);
  if (autoGateAfterResume.currentStage !== autoGateReadyAgain.currentStage + 1) failures.push(`Expected resumed auto combat to process exactly one stage, got ${autoGateReadyAgain.currentStage} -> ${autoGateAfterResume.currentStage}`);
  if (debugAutoInitial.partyMemberCount !== 5) failures.push(`Expected debug auto setup to create 5 party members, got ${debugAutoInitial.partyMemberCount}`);
  if (debugAutoInitial.expeditionCombatReady !== "true") failures.push(`Expected debug auto setup to start ready, got ${debugAutoInitial.expeditionCombatReady}`);
  if (debugAutoAfterFirst.currentStage < 2 || !debugAutoAfterFirst.lastBattleId) failures.push(`Expected debug +5 live auto to clear first stage, got stage=${debugAutoAfterFirst.currentStage} battle=${debugAutoAfterFirst.lastBattleId}`);
  if (debugAutoAfterSecond.currentStage < 3 || debugAutoAfterSecond.lastBattleId === debugAutoAfterFirst.lastBattleId) failures.push(`Expected debug +5 live auto to continue to second stage, got stage=${debugAutoAfterSecond.currentStage} battle=${debugAutoAfterSecond.lastBattleId}`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);

  console.log(JSON.stringify({ baseUrl, beforeAccept, afterAccept, stage26Backdrop, dispatchBeforeStart, dispatchRecommendedSelectedCount, dispatchAfterStart, dispatchReadyToClaim, dispatchAfterClaim, duringDefeatReplay, afterEnemyDespawn, duringStageTransition, duringEncounterIntro, afterClear, autoGateInitial, autoGateBusyStart, autoGateBusyMid, autoGateReadyAgain, autoGateAfterResume, debugAutoInitial, debugAutoAfterFirst, debugAutoAfterSecond, moveStartedAfterMs, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_EXPEDITION_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log("REACT_VITE_EXPEDITION_SMOKE_OK");
} finally {
  await browser.close();
  await closeServer(server);
}
