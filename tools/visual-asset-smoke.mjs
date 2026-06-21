import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const outputDir = resolve("artifacts/visual-asset-smoke");
const preferredPort = Number(process.env.VISUAL_ASSET_SMOKE_PORT || 5588);
const saveKey = "student-idle-rpg-save-v1";
const battleRoadConfig = JSON.parse(readFileSync(resolve("data/battle_road_config.json"), "utf8"));
const enemyReactionConfig = battleRoadConfig.presentation?.enemyReaction ?? {};
const enemyHpBarConfig = battleRoadConfig.presentation?.enemyHpBar ?? {};

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

function makeVisualSmokeState() {
  const stats = { korean: 240, english: 240, math: 240, social: 180, science: 180 };
  const companions = [
    { id: "smoke-helper-teacher", name: "교사 도우미", careerId: "teacher", age: 25, auraColor: "#60a5fa" },
    { id: "smoke-helper-software", name: "개발 도우미", careerId: "software_engineer", age: 25, auraColor: "#34d399" },
    { id: "smoke-helper-doctor", name: "의학 도우미", careerId: "doctor", age: 25, auraColor: "#f472b6" },
  ].map((companion) => ({
    ...companion,
    source: "human",
    status: "study",
    incomePerMinute: 120,
    powerMultiplier: 1.1,
    stats,
    createdRun: 1,
    sourceUniversity: "스모크 검증",
  }));

  return {
    schemaVersion: 1,
    runNumber: 1,
    money: 1200,
    diamonds: 0,
    workSlots: 1,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "E1",
      avatarGender: "male",
      retakeCount: 0,
      monthIndex: 1,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 0,
      studyLevels: {},
      aptitude: stats,
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats,
      track: "science",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
    },
    companions,
    archive: [],
    history: [],
    log: [],
  };
}

mkdirSync(outputDir, { recursive: true });

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
    { key: saveKey, state: makeVisualSmokeState() },
  );
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".student-art", { timeout: 15000 });
  await page.waitForSelector(".battle-scene-monster-art", { timeout: 15000 });

  const mainMetrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const student = document.querySelector(".student-art");
    const studentSprite = document.querySelector(".student-sprite");
    const monster = document.querySelector(".battle-scene-monster-art");
    const floor = document.querySelector(".pixel-floor");
    const background = document.querySelector(".arena-background-sheet");
    const grid = document.querySelector(".arena-background-grid");
    const activeEnemy = document.querySelector(".battle-scene-enemy.active");
    const stageScene = document.querySelector(".stage-scene");
    const arena = document.querySelector(".pixel-arena");
    const arenaBefore = arena ? getComputedStyle(arena, "::before") : null;
    const arenaStyle = arena ? getComputedStyle(arena) : null;
    const battleLineupElement = document.querySelector(".battle-scene-lineup");
    const battleLineup = [...document.querySelectorAll(".battle-scene-enemy")];
    const sceneMonsterArt = [...document.querySelectorAll(".battle-scene-monster-art")];
    const animationName = (element, pseudo) => (element ? getComputedStyle(element, pseudo).animationName : "");
    const rectMetrics = (element) => {
      const rect = element?.getBoundingClientRect();
      return {
        width: Math.round(rect?.width ?? 0),
        height: Math.round(rect?.height ?? 0),
        left: Math.round(rect?.left ?? 0),
        right: Math.round(rect?.right ?? 0),
        top: Math.round(rect?.top ?? 0),
        bottom: Math.round(rect?.bottom ?? 0),
      };
    };
    const arenaRect = arena?.getBoundingClientRect();
    const phase = battleLineupElement?.getAttribute("data-road-phase") ?? "";
    const helperProbe = document.createElement("span");
    helperProbe.className = "helper-sprite helper-slot-1 helper-book";
    helperProbe.style.position = "absolute";
    helperProbe.style.left = "30%";
    helperProbe.style.bottom = "13%";
    helperProbe.style.display = "block";
    arena?.append(helperProbe);
    const helperAllyCssReady = ["helperAllyLoop", "helperRoadRun", "helperRoadBrake"].some((name) =>
      animationName(helperProbe).includes(name),
    );
    const actualHelperSprites = [...document.querySelectorAll(".helper-party .helper-sprite")];
    const helperRects = [...actualHelperSprites, helperProbe]
      .filter(Boolean)
      .map((item) => rectMetrics(item));
    const helperSizes = helperRects.map((rect) => ({ width: rect.width, height: rect.height }));
    const hpBarRects = [...document.querySelectorAll(".battle-scene-enemy .battle-scene-hp")].map((item) => rectMetrics(item));
    const hpBarSizes = hpBarRects.map((rect) => ({ width: rect.width, height: rect.height }));
    const enemyRects = battleLineup.map((enemy) => {
      const rect = rectMetrics(enemy);
      const style = getComputedStyle(enemy);
      const opacity = Number.parseFloat(style.opacity || "1");
      const intersectsArena =
        !!arenaRect &&
        rect.right > arenaRect.left &&
        rect.left < arenaRect.right &&
        rect.bottom > arenaRect.top &&
        rect.top < arenaRect.bottom;
      const clip = arenaRect
        ? {
            left: Math.max(0, Math.round(arenaRect.left - rect.left)),
            right: Math.max(0, Math.round(rect.right - arenaRect.right)),
            top: Math.max(0, Math.round(arenaRect.top - rect.top)),
            bottom: Math.max(0, Math.round(rect.bottom - arenaRect.bottom)),
          }
        : { left: 0, right: 0, top: 0, bottom: 0 };
      return {
        ...rect,
        opacity: Number.isFinite(opacity) ? opacity : 1,
        isNormal: enemy.classList.contains("normal"),
        isBoss: enemy.classList.contains("boss"),
        isSuneung: enemy.classList.contains("suneung"),
        isDefeated: enemy.classList.contains("defeated"),
        intersectsArena,
        clip,
      };
    });
    const normalEnemyRects = enemyRects.filter((item) => item.isNormal);
    const bossEnemyRects = enemyRects.filter((item) => item.isBoss || item.isSuneung);
    const enemyClipCount = enemyRects.filter((item) => {
      if (item.opacity <= 0.05 || !item.intersectsArena) return false;
      const verticalClip = item.clip.top > 3 || item.clip.bottom > 3;
      const horizontalClip = phase === "combat" && (item.clip.left > 6 || item.clip.right > 6);
      return verticalClip || horizontalClip;
    }).length;
    const minRounded = (values) => (values.length ? Math.round(Math.min(...values)) : 0);
    const maxRounded = (values) => (values.length ? Math.round(Math.max(...values)) : 0);
    const sceneClasses = ["scene-elementary", "scene-middle", "scene-high", "scene-repeater"];
    const originalSceneClass = sceneClasses.find((className) => stageScene?.classList.contains(className));
    const battleBackdropSceneStyles = [];
    if (stageScene && arena) {
      for (const sceneClass of sceneClasses) {
        stageScene.classList.remove(...sceneClasses);
        stageScene.classList.add(sceneClass);
        const before = getComputedStyle(arena, "::before");
        battleBackdropSceneStyles.push({
          sceneClass,
          hasImage: before.backgroundImage.includes("data:image"),
          size: before.backgroundSize,
          position: before.backgroundPosition,
          repeat: before.backgroundRepeat,
        });
      }
      stageScene.classList.remove(...sceneClasses);
      if (originalSceneClass) stageScene.classList.add(originalSceneClass);
    }
    helperProbe.remove();
    return {
      studentImage: getComputedStyle(student).backgroundImage.includes("data:image"),
      studentCombatMotion: ["studentCombatLoop", "studentRoadRunLoop", "studentRoadBrakeLoop"].some((name) =>
        animationName(studentSprite).includes(name),
      ),
      studentSpriteFrames: animationName(student).includes("studentMoveFrames"),
      studentDashDust: ["studentDashDust", "roadRunDust", "roadBrakeDust"].some((name) =>
        animationName(studentSprite, "::before").includes(name),
      ),
      studentMeleeSlash:
        (battleLineupElement?.getAttribute("data-road-phase") ?? "") === "travel" ||
        animationName(studentSprite, "::after").includes("studentMeleeSlash"),
      monsterImage: getComputedStyle(monster).backgroundImage.includes("data:image"),
      battleRoadLineup: battleLineupElement?.classList.contains("battle-road-lineup") ?? false,
      battleRoadPhase: phase,
      battleRoadEncounterIndex: Number(battleLineupElement?.getAttribute("data-encounter-index") ?? -1),
      arenaRoadTravel: arena?.classList.contains("road-travel") ?? false,
      battleLineupCount: battleLineup.length,
      battleLineupImages: sceneMonsterArt.filter((item) => getComputedStyle(item).backgroundImage.includes("data:image")).length,
      battleLineupFrames: new Set(sceneMonsterArt.map((item) => [...item.classList].find((className) => className.startsWith("main-monster-"))).filter(Boolean)).size,
      battleLineupBosses: battleLineup.filter((item) => item.classList.contains("boss")).length,
      battleLineupHpBars: document.querySelectorAll(".battle-scene-enemy .battle-scene-hp").length,
      battleHpBarMinWidth: minRounded(hpBarSizes.map((size) => size.width)),
      battleHpBarMinHeight: minRounded(hpBarSizes.map((size) => size.height)),
      battleLineupAnimatedEnemies: battleLineup.filter((item) => animationName(item) !== "none").length,
      battleLineupAnimatedArt: sceneMonsterArt.filter((item) => animationName(item) !== "none").length,
      activeEnemyImpact: animationName(activeEnemy, "::after").includes("enemyHitSpark"),
      activeEnemyShockRing: animationName(activeEnemy, "::before").includes("enemyShockRing"),
      battleDustVfx: animationName(battleLineupElement, "::before").includes("battleDustBurst"),
      battleBackdropImage: arenaBefore?.backgroundImage.includes("data:image") ?? false,
      battleBackdropMotion: animationName(arena, "::before").includes("battleRoadBackdropPan"),
      battleBackdropPanWidth: Number.parseFloat(arenaStyle?.getPropertyValue("--battle-road-pan-width") ?? "0"),
      battleBackdropSize: arenaBefore?.backgroundSize ?? "",
      battleBackdropPosition: arenaBefore?.backgroundPosition ?? "",
      battleBackdropRepeat: arenaBefore?.backgroundRepeat ?? "",
      battleBackdropSceneStyles,
      oldBattleBackgroundHidden: !background || getComputedStyle(background).display === "none",
      arenaGridHidden: getComputedStyle(grid).display === "none",
      floorOverlayReduced: animationName(floor) === "none",
      helperAllyCssReady,
      helperActualCount: actualHelperSprites.length,
      helperRenderedCount: helperRects.length,
      helperMinWidth: minRounded(helperSizes.map((size) => size.width)),
      helperMinHeight: minRounded(helperSizes.map((size) => size.height)),
      helperSquareDelta: maxRounded(helperSizes.map((size) => Math.abs(size.width - size.height))),
      normalEnemyMinWidth: minRounded(normalEnemyRects.map((rect) => rect.width)),
      normalEnemyMinHeight: minRounded(normalEnemyRects.map((rect) => rect.height)),
      normalEnemySquareDelta: maxRounded(normalEnemyRects.map((rect) => Math.abs(rect.width - rect.height))),
      bossEnemyMinWidth: minRounded(bossEnemyRects.map((rect) => rect.width)),
      bossEnemyMinHeight: minRounded(bossEnemyRects.map((rect) => rect.height)),
      enemyClipCount,
      arenaTextCards: document.querySelectorAll(".pixel-arena .battle-enemy-card").length,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  const combatMotionMetrics = await page.evaluate(async () => {
    const matrixX = (value) => {
      if (!value || value === "none") return 0;
      const matrix3d = value.match(/^matrix3d\((.+)\)$/);
      if (matrix3d) return Number(matrix3d[1].split(",").map((part) => part.trim())[12] ?? 0);
      const matrix = value.match(/^matrix\((.+)\)$/);
      if (matrix) return Number(matrix[1].split(",").map((part) => part.trim())[4] ?? 0);
      return 0;
    };
    const matrixY = (value) => {
      if (!value || value === "none") return 0;
      const matrix3d = value.match(/^matrix3d\((.+)\)$/);
      if (matrix3d) return Number(matrix3d[1].split(",").map((part) => part.trim())[13] ?? 0);
      const matrix = value.match(/^matrix\((.+)\)$/);
      if (matrix) return Number(matrix[1].split(",").map((part) => part.trim())[5] ?? 0);
      return 0;
    };
    const backgroundX = (element, pseudo) => {
      const value = getComputedStyle(element, pseudo).backgroundPositionX;
      if (value.endsWith("%")) return Number.parseFloat(value);
      if (value.endsWith("px")) return Number.parseFloat(value);
      return 0;
    };
    const styleOf = (selector, pseudo) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element, pseudo) : null;
    };
    const sample = () => {
      const inactiveMonsterArt =
        styleOf(".battle-scene-enemy:not(.active):not(.defeated) .battle-scene-monster-art") ??
        styleOf(".battle-scene-enemy.normal .battle-scene-monster-art") ??
        styleOf(".battle-scene-monster-art");
      return {
        studentX: matrixX(styleOf(".student-sprite")?.transform),
        studentArtFrameX: backgroundX(document.querySelector(".student-art")),
        enemyX: matrixX(styleOf(".battle-scene-enemy.active")?.transform),
        roadPackX: matrixX(styleOf(".battle-road-lineup")?.transform),
        normalEnemyArtY: matrixY(inactiveMonsterArt?.transform),
        battleBackdropX: matrixX(styleOf(".pixel-arena", "::before")?.transform),
        floorX: matrixX(styleOf(".pixel-floor")?.transform),
      };
    };
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      samples.push(sample());
      await new Promise((resolveSample) => setTimeout(resolveSample, 120));
    }
    const range = (key) => {
      const values = samples.map((item) => item[key]).filter(Number.isFinite);
      return values.length ? Math.max(...values) - Math.min(...values) : 0;
    };
    return {
      studentTravelPx: Number(range("studentX").toFixed(2)),
      studentSpriteFrameShift: Number(range("studentArtFrameX").toFixed(2)),
      activeEnemyTravelPx: Number(range("enemyX").toFixed(2)),
      roadPackTravelPx: Number(range("roadPackX").toFixed(2)),
      normalEnemyIdlePx: Number(range("normalEnemyArtY").toFixed(2)),
      battleBackdropTravelPx: Number(range("battleBackdropX").toFixed(2)),
      floorTravelPx: Number(range("floorX").toFixed(2)),
    };
  });
  await page.waitForTimeout(650);
  const mainScreenshotPath = resolve(outputDir, "main-battle.png");
  await page.screenshot({ path: mainScreenshotPath, fullPage: true });

  await page.evaluate(() => document.querySelectorAll(".screen-switch")[1].click());
  await page.waitForSelector(".expedition-enemy-visual", { timeout: 15000 });

  const expeditionMetrics = await page.evaluate(async () => {
    const doc = document.documentElement;
    const matrixX = (value) => {
      if (!value || value === "none") return 0;
      const matrix3d = value.match(/^matrix3d\((.+)\)$/);
      if (matrix3d) return Number(matrix3d[1].split(",").map((part) => part.trim())[12] ?? 0);
      const matrix = value.match(/^matrix\((.+)\)$/);
      if (matrix) return Number(matrix[1].split(",").map((part) => part.trim())[4] ?? 0);
      return 0;
    };
    const matrixY = (value) => {
      if (!value || value === "none") return 0;
      const matrix3d = value.match(/^matrix3d\((.+)\)$/);
      if (matrix3d) return Number(matrix3d[1].split(",").map((part) => part.trim())[13] ?? 0);
      const matrix = value.match(/^matrix\((.+)\)$/);
      if (matrix) return Number(matrix[1].split(",").map((part) => part.trim())[5] ?? 0);
      return 0;
    };
    const animationName = (element, pseudo) => (element ? getComputedStyle(element, pseudo).animationName : "");
    const arena = document.querySelector(".expedition-arena");
    const backgroundSheet = document.querySelector(".expedition-background-sheet");
    const enemy = document.querySelector(".expedition-enemy-visual");
    const enemyRect = enemy?.getBoundingClientRect();
    const beforeImage = enemy ? getComputedStyle(enemy, "::before").backgroundImage : "";
    const partyProbe = document.createElement("div");
    partyProbe.className = "expedition-party-visual running";
    partyProbe.dataset.visualSmokeProbe = "companion";
    const probeCareers = ["doctor", "judge", "software_engineer", "pilot", "chef"];
    let unitProbe = null;
    probeCareers.forEach((careerId, index) => {
      const unit = document.createElement("span");
      unit.className = `expedition-unit-avatar large career-unit-${careerId} unit-${index + 1}`;
      partyProbe.append(unit);
      if (index === 0) unitProbe = unit;
    });
    arena?.append(partyProbe);
    const allyMotionReady = animationName(unitProbe).includes("expeditionAllyMeleeA");
    const allySparkReady = animationName(unitProbe, "::after").includes("expeditionAllySpark");
    const careerUnitImage = getComputedStyle(unitProbe).backgroundImage.includes("data:image");
    const arenaRect = arena?.getBoundingClientRect();
    const unitRects = Array.from(partyProbe.querySelectorAll(".expedition-unit-avatar")).map((unit) => unit.getBoundingClientRect());
    const unitSizes = unitRects.map((rect) => ({ width: rect.width, height: rect.height }));
    const unitClipCount = arenaRect
      ? unitRects.filter(
          (rect) =>
            rect.top < arenaRect.top - 3 ||
            rect.bottom > arenaRect.bottom + 3 ||
            rect.left < arenaRect.left - 8 ||
            rect.right > arenaRect.right + 8,
        ).length
      : 0;
    const enemyStyle = enemy ? getComputedStyle(enemy) : null;
    const enemyBeforeStyle = enemy ? getComputedStyle(enemy, "::before") : null;
    const readPx = (value) => {
      const parsed = Number.parseFloat(value || "0");
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const readPercent = (value) => {
      const parsed = Number.parseFloat(String(value || "0").split(/\s+/)[0]);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const frameSnapFor = (element, pseudo, prefix) => {
      if (!element) return { x: null, maxError: 0 };
      const elementStyle = getComputedStyle(element);
      const spriteStyle = pseudo ? getComputedStyle(element, pseudo) : elementStyle;
      const x = readPercent(spriteStyle.backgroundPositionX || spriteStyle.backgroundPosition);
      const expected = ["a", "b", "c", "d"]
        .map((frame) => readPercent(elementStyle.getPropertyValue(`--${prefix}-frame-${frame}`)))
        .filter((value) => value !== null);
      const base = readPercent(elementStyle.getPropertyValue(`--${prefix}-x`));
      if (base !== null) expected.push(base);
      if (x === null || expected.length === 0) return { x, maxError: 0 };
      return { x, maxError: Math.min(...expected.map((value) => Math.abs(value - x))) };
    };
    const enemyBeforeWidth = readPx(enemyBeforeStyle?.width);
    const enemyBeforeHeight = readPx(enemyBeforeStyle?.height);
    const enemyBeforeLeft = readPx(enemyBeforeStyle?.left);
    const enemyBeforeBottom = readPx(enemyBeforeStyle?.bottom);
    const enemyBeforeMarginLeft = readPx(enemyBeforeStyle?.marginLeft);
    const spriteClipFor = (element) => {
      const rect = element?.getBoundingClientRect();
      const before = element ? getComputedStyle(element, "::before") : null;
      if (!arenaRect || !rect || !before) return { left: 0, right: 0, top: 0, bottom: 0 };
      const width = readPx(before.width);
      const height = readPx(before.height);
      const left = readPx(before.left);
      const bottom = readPx(before.bottom);
      const marginLeft = readPx(before.marginLeft);
      const spriteRect = {
        left: rect.left + left + marginLeft,
        right: rect.left + left + marginLeft + width,
        top: rect.bottom - bottom - height,
        bottom: rect.bottom - bottom,
      };
      return {
        left: Math.max(0, arenaRect.left - spriteRect.left),
        right: Math.max(0, spriteRect.right - arenaRect.right),
        top: Math.max(0, arenaRect.top - spriteRect.top),
        bottom: Math.max(0, spriteRect.bottom - arenaRect.bottom),
      };
    };
    const enemySpriteClips = Array.from(document.querySelectorAll(".expedition-enemy-visual")).map(spriteClipFor);
    const enemySpriteClip = enemySpriteClips.reduce(
      (maxClip, clip) => ({
        left: Math.max(maxClip.left, clip.left),
        right: Math.max(maxClip.right, clip.right),
        top: Math.max(maxClip.top, clip.top),
        bottom: Math.max(maxClip.bottom, clip.bottom),
      }),
      { left: 0, right: 0, top: 0, bottom: 0 },
    );
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      const enemyFrameSnap = frameSnapFor(enemy, "::before", "visual-enemy");
      const unitFrameSnap = frameSnapFor(unitProbe, null, "visual-unit");
      samples.push({
        backdropX: matrixX(getComputedStyle(arena, "::before").transform),
        enemyBeforeY: matrixY(getComputedStyle(enemy, "::before").transform),
        enemyFrameSnapError: enemyFrameSnap.maxError,
        unitFrameSnapError: unitFrameSnap.maxError,
      });
      await new Promise((resolveSample) => setTimeout(resolveSample, 120));
    }
    const range = (key) => {
      const values = samples.map((item) => item[key]).filter(Number.isFinite);
      return values.length ? Math.max(...values) - Math.min(...values) : 0;
    };
    return {
      enemyCount: document.querySelectorAll(".expedition-enemy-visual").length,
      enemyBeforeImage: beforeImage.includes("data:image"),
      backdropImage: getComputedStyle(arena, "::before").backgroundImage.includes("data:image"),
      backdropMotion: animationName(arena, "::before").includes("expeditionBackdropPan"),
      backdropTravelPx: Number(range("backdropX").toFixed(2)),
      oldBackgroundHidden: getComputedStyle(backgroundSheet).display === "none",
      enemyBeforeMotion: animationName(enemy, "::before").includes("expeditionEnemyHurtSprite") || animationName(enemy, "::before").includes("expeditionEnemySpriteIdle"),
      enemyShockVfx: animationName(enemy, "::after").includes("expeditionEnemyShock"),
      enemySpriteTravelPx: Number(range("enemyBeforeY").toFixed(2)),
      careerUnitImage,
      allyMotionReady,
      allySparkReady,
      unitRenderedCount: unitRects.length,
      unitMinWidth: Math.round(Math.min(...unitSizes.map((size) => size.width))),
      unitMinHeight: Math.round(Math.min(...unitSizes.map((size) => size.height))),
      unitSquareDelta: Math.round(Math.max(...unitSizes.map((size) => Math.abs(size.width - size.height)))),
      unitClipCount,
      partyOverflowVisible: getComputedStyle(partyProbe).overflow === "visible",
      enemyOverflowVisible: enemyStyle?.overflow === "visible",
      enemyBeforeWidth: Math.round(enemyBeforeWidth),
      enemyBeforeHeight: Math.round(enemyBeforeHeight),
      enemyBeforeSquareDelta: Math.round(Math.abs(enemyBeforeWidth - enemyBeforeHeight)),
      enemyFrameSnapMaxError: Number(Math.max(...samples.map((item) => item.enemyFrameSnapError ?? 0)).toFixed(4)),
      unitFrameSnapMaxError: Number(Math.max(...samples.map((item) => item.unitFrameSnapError ?? 0)).toFixed(4)),
      enemySpriteClipRight: Math.round(enemySpriteClip.right),
      enemySpriteClipLeft: Math.round(enemySpriteClip.left),
      enemySpriteClipTop: Math.round(enemySpriteClip.top),
      enemySpriteClipBottom: Math.round(enemySpriteClip.bottom),
      enemyWidth: Math.round(enemyRect?.width ?? 0),
      enemyHeight: Math.round(enemyRect?.height ?? 0),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  const expeditionCompanionProbePath = resolve(outputDir, "expedition-companion-probe.png");
  await page.screenshot({ path: expeditionCompanionProbePath, fullPage: true });
  await page.evaluate(() => document.querySelector('[data-visual-smoke-probe="companion"]')?.remove());
  const expeditionScreenshotPath = resolve(outputDir, "expedition.png");
  await page.screenshot({ path: expeditionScreenshotPath, fullPage: true });

  const failures = [];
  if (!mainMetrics.studentImage) failures.push("Main student sprite is missing a data image background");
  if (!mainMetrics.studentCombatMotion) failures.push("Main student combat motion is missing");
  if (!mainMetrics.studentSpriteFrames) failures.push("Main student sprite frame animation is missing");
  if (!mainMetrics.studentDashDust) failures.push("Main student dash dust VFX is missing");
  if (!mainMetrics.studentMeleeSlash) failures.push("Main student melee slash motion is missing");
  if (mainMetrics.battleRoadPhase === "travel") {
    if (combatMotionMetrics.studentTravelPx < 6) failures.push(`Main student travel run is too small: ${combatMotionMetrics.studentTravelPx}px`);
  } else if (combatMotionMetrics.studentTravelPx < 24) {
    failures.push(`Main student melee travel is too small: ${combatMotionMetrics.studentTravelPx}px`);
  }
  if (combatMotionMetrics.studentSpriteFrameShift < 1) failures.push(`Main student sprite frame shift is too small: ${combatMotionMetrics.studentSpriteFrameShift}`);
  if (!mainMetrics.monsterImage) failures.push("Main monster sprite is missing a data image background");
  if (!mainMetrics.battleRoadLineup) failures.push("Main battle road lineup class is missing");
  if (mainMetrics.battleRoadEncounterIndex !== 0) failures.push(`Main battle expected first encounter index 0, got ${mainMetrics.battleRoadEncounterIndex}`);
  if (mainMetrics.battleLineupCount !== 3) failures.push(`Main battle expected 3 encounter enemies, got ${mainMetrics.battleLineupCount}`);
  if (mainMetrics.battleLineupImages !== 3) failures.push(`Main battle expected 3 rendered scene enemy images, got ${mainMetrics.battleLineupImages}`);
  if (mainMetrics.battleLineupFrames < 3) failures.push(`Main battle expected varied encounter enemy frames, got ${mainMetrics.battleLineupFrames}`);
  if (mainMetrics.battleLineupBosses !== 1) failures.push(`Main battle expected 1 boss monster, got ${mainMetrics.battleLineupBosses}`);
  if (mainMetrics.battleLineupHpBars !== 1) failures.push(`Main battle expected 1 boss HP bar, got ${mainMetrics.battleLineupHpBars}`);
  if (mainMetrics.battleLineupAnimatedEnemies < 3) failures.push(`Main battle expected animated enemy lineup, got ${mainMetrics.battleLineupAnimatedEnemies}`);
  if (mainMetrics.battleLineupAnimatedArt < 3) failures.push(`Main battle expected animated enemy art, got ${mainMetrics.battleLineupAnimatedArt}`);
  if (!mainMetrics.activeEnemyImpact) failures.push("Main battle active enemy edge sparkle is missing");
  if (!mainMetrics.activeEnemyShockRing) failures.push("Main battle active enemy rim light VFX is missing");
  if (mainMetrics.battleHpBarMinWidth < (enemyHpBarConfig.mobileWidthPx ?? 96) - 4) failures.push(`Main battle boss HP bar width is too small: ${mainMetrics.battleHpBarMinWidth}px`);
  if (mainMetrics.battleHpBarMinHeight < (enemyHpBarConfig.mobileHeightPx ?? 12) - 2) failures.push(`Main battle boss HP bar height is too small: ${mainMetrics.battleHpBarMinHeight}px`);
  if (!mainMetrics.battleDustVfx) failures.push("Main battle dust burst VFX is missing");
  if (!mainMetrics.battleBackdropImage) failures.push("Main battle long backdrop atlas is missing");
  if (!mainMetrics.battleBackdropMotion) failures.push("Main battle long backdrop pan motion is missing");
  if (mainMetrics.battleBackdropPanWidth > 900) failures.push(`Main battle backdrop is too zoomed in: ${mainMetrics.battleBackdropPanWidth}%`);
  if (mainMetrics.battleBackdropSize !== "100% 100%") failures.push(`Main battle backdrop size is overridden: ${mainMetrics.battleBackdropSize}`);
  if (mainMetrics.battleBackdropRepeat !== "no-repeat") failures.push(`Main battle backdrop repeat is overridden: ${mainMetrics.battleBackdropRepeat}`);
  if (!mainMetrics.battleBackdropPosition.includes("100%")) failures.push(`Main battle backdrop position is overridden: ${mainMetrics.battleBackdropPosition}`);
  for (const sceneStyle of mainMetrics.battleBackdropSceneStyles ?? []) {
    if (!sceneStyle.hasImage) failures.push(`${sceneStyle.sceneClass} battle backdrop data image is missing`);
    if (sceneStyle.size !== "100% 100%") failures.push(`${sceneStyle.sceneClass} battle backdrop size is overridden: ${sceneStyle.size}`);
    if (sceneStyle.repeat !== "no-repeat") failures.push(`${sceneStyle.sceneClass} battle backdrop repeat is overridden: ${sceneStyle.repeat}`);
    if (!sceneStyle.position.includes("100%")) failures.push(`${sceneStyle.sceneClass} battle backdrop position is overridden: ${sceneStyle.position}`);
  }
  if (!mainMetrics.oldBattleBackgroundHidden) failures.push("Main battle old background image should be hidden");
  if (!mainMetrics.arenaGridHidden) failures.push("Main battle CSS grid overlay should be hidden");
  if (!mainMetrics.floorOverlayReduced) failures.push("Main battle floor grid animation should be removed");
  const activeEnemyMaxTravel = Math.max((enemyReactionConfig.engagedTravelPx ?? 4) * 2.4, 14);
  if (combatMotionMetrics.activeEnemyTravelPx < 2) failures.push(`Main active enemy reaction is too static: ${combatMotionMetrics.activeEnemyTravelPx}px`);
  if (combatMotionMetrics.activeEnemyTravelPx > activeEnemyMaxTravel) failures.push(`Main active enemy reaction is too large: ${combatMotionMetrics.activeEnemyTravelPx}px`);
  if (mainMetrics.battleRoadPhase === "travel" && combatMotionMetrics.roadPackTravelPx < 8) failures.push(`Main battle road pack travel is too small: ${combatMotionMetrics.roadPackTravelPx}px`);
  if (combatMotionMetrics.battleBackdropTravelPx < 4) failures.push(`Main battle backdrop travel is too small: ${combatMotionMetrics.battleBackdropTravelPx}px`);
  if (combatMotionMetrics.normalEnemyIdlePx < 2) failures.push(`Main normal enemy idle motion is too small: ${combatMotionMetrics.normalEnemyIdlePx}px`);
  if (!mainMetrics.helperAllyCssReady) failures.push("Helper ally combat CSS is missing");
  if (mainMetrics.helperActualCount < 3) failures.push(`Main battle expected 3 actual helper companions, got ${mainMetrics.helperActualCount}`);
  if (mainMetrics.helperRenderedCount < 1) failures.push("Main battle helper companion probe is missing");
  if (mainMetrics.helperMinWidth < 62 || mainMetrics.helperMinHeight < 62) failures.push(`Main battle helper companion is too small: ${mainMetrics.helperMinWidth}x${mainMetrics.helperMinHeight}`);
  if (mainMetrics.helperSquareDelta > 4) failures.push(`Main battle helper companion display box is distorted by ${mainMetrics.helperSquareDelta}px`);
  if (mainMetrics.normalEnemyMinWidth < 70 || mainMetrics.normalEnemyMinHeight < 70) failures.push(`Main battle normal monsters are too small: ${mainMetrics.normalEnemyMinWidth}x${mainMetrics.normalEnemyMinHeight}`);
  if (mainMetrics.normalEnemySquareDelta > 4) failures.push(`Main battle normal monster display boxes are distorted by ${mainMetrics.normalEnemySquareDelta}px`);
  if (mainMetrics.bossEnemyMinWidth < 86 || mainMetrics.bossEnemyMinHeight < 86) failures.push(`Main battle boss/suneung monster is too small: ${mainMetrics.bossEnemyMinWidth}x${mainMetrics.bossEnemyMinHeight}`);
  if (mainMetrics.enemyClipCount > 0) failures.push(`Main battle visible monsters are clipped by arena: ${mainMetrics.enemyClipCount}`);
  if (mainMetrics.arenaTextCards !== 0) failures.push(`Main battle expected no text enemy cards in arena, got ${mainMetrics.arenaTextCards}`);
  if (mainMetrics.horizontalOverflow > 4) failures.push(`Main battle horizontal overflow ${mainMetrics.horizontalOverflow}px`);
  if (expeditionMetrics.enemyCount < 1) failures.push("Expedition enemy is missing");
  if (!expeditionMetrics.enemyBeforeImage) failures.push("Expedition enemy visual atlas is missing");
  if (!expeditionMetrics.backdropImage) failures.push("Expedition long backdrop atlas is missing");
  if (!expeditionMetrics.backdropMotion) failures.push("Expedition long backdrop motion is missing");
  if (expeditionMetrics.backdropTravelPx < 4) failures.push(`Expedition backdrop travel is too small: ${expeditionMetrics.backdropTravelPx}px`);
  if (!expeditionMetrics.oldBackgroundHidden) failures.push("Expedition old background image should be hidden");
  if (!expeditionMetrics.enemyBeforeMotion) failures.push("Expedition enemy sprite motion is missing");
  if (!expeditionMetrics.enemyShockVfx) failures.push("Expedition enemy rim light VFX is missing");
  if (expeditionMetrics.enemySpriteTravelPx < 0.4) failures.push(`Expedition enemy sprite reaction is too static: ${expeditionMetrics.enemySpriteTravelPx}px`);
  if (expeditionMetrics.enemySpriteTravelPx > 4) failures.push(`Expedition enemy sprite reaction is too large: ${expeditionMetrics.enemySpriteTravelPx}px`);
  if (!expeditionMetrics.careerUnitImage) failures.push("Expedition career unit atlas is missing");
  if (!expeditionMetrics.allyMotionReady) failures.push("Expedition ally melee motion is missing");
  if (!expeditionMetrics.allySparkReady) failures.push("Expedition ally spark VFX is missing");
  if (expeditionMetrics.unitRenderedCount < 5) failures.push(`Expedition companion probe expected 5 units, got ${expeditionMetrics.unitRenderedCount}`);
  if (expeditionMetrics.unitMinWidth < 58 || expeditionMetrics.unitMinHeight < 58) failures.push(`Expedition companion display box is too small: ${expeditionMetrics.unitMinWidth}x${expeditionMetrics.unitMinHeight}`);
  if (expeditionMetrics.unitSquareDelta > 6) failures.push(`Expedition companion sprite box is distorted by ${expeditionMetrics.unitSquareDelta}px`);
  if (expeditionMetrics.unitClipCount > 0) failures.push(`Expedition companion sprites are clipped by arena: ${expeditionMetrics.unitClipCount}`);
  if (!expeditionMetrics.partyOverflowVisible) failures.push("Expedition party visual should allow sprite overflow");
  if (!expeditionMetrics.enemyOverflowVisible) failures.push("Expedition enemy visual should allow sprite overflow");
  if (expeditionMetrics.enemyBeforeWidth < 70 || expeditionMetrics.enemyBeforeHeight < 70) failures.push(`Expedition enemy sprite box is too small: ${expeditionMetrics.enemyBeforeWidth}x${expeditionMetrics.enemyBeforeHeight}`);
  if (expeditionMetrics.enemyBeforeSquareDelta > 8) failures.push(`Expedition enemy sprite box is distorted by ${expeditionMetrics.enemyBeforeSquareDelta}px`);
  if (expeditionMetrics.enemyFrameSnapMaxError > 0.05) failures.push(`Expedition enemy sprite is sampling between atlas frames: ${expeditionMetrics.enemyFrameSnapMaxError}%`);
  if (expeditionMetrics.unitFrameSnapMaxError > 0.05) failures.push(`Expedition companion sprite is sampling between atlas frames: ${expeditionMetrics.unitFrameSnapMaxError}%`);
  if (expeditionMetrics.enemySpriteClipRight > 4 || expeditionMetrics.enemySpriteClipLeft > 4 || expeditionMetrics.enemySpriteClipTop > 4 || expeditionMetrics.enemySpriteClipBottom > 4) {
    failures.push(`Expedition enemy sprite is clipped: L${expeditionMetrics.enemySpriteClipLeft} R${expeditionMetrics.enemySpriteClipRight} T${expeditionMetrics.enemySpriteClipTop} B${expeditionMetrics.enemySpriteClipBottom}`);
  }
  if (expeditionMetrics.horizontalOverflow > 4) failures.push(`Expedition horizontal overflow ${expeditionMetrics.horizontalOverflow}px`);
  if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

  console.log(
    JSON.stringify(
      {
        baseUrl: `http://127.0.0.1:${port}/`,
        mainMetrics,
        combatMotionMetrics,
        expeditionMetrics,
        screenshots: {
          main: mainScreenshotPath,
          expedition: expeditionScreenshotPath,
          expeditionCompanionProbe: expeditionCompanionProbePath,
        },
        failures,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    console.error(`VISUAL_ASSET_SMOKE_FAILED failures=${failures.length}`);
    process.exit(1);
  }

  console.log(`VISUAL_ASSET_SMOKE_OK screenshots=${outputDir}`);
} finally {
  await browser.close();
  await closeServer(server);
}
