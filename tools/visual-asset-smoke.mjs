import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const outputDir = resolve("artifacts/visual-asset-smoke");
const preferredPort = Number(process.env.VISUAL_ASSET_SMOKE_PORT || 5588);

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
    const arena = document.querySelector(".pixel-arena");
    const battleLineupElement = document.querySelector(".battle-scene-lineup");
    const battleLineup = [...document.querySelectorAll(".battle-scene-enemy")];
    const sceneMonsterArt = [...document.querySelectorAll(".battle-scene-monster-art")];
    const animationName = (element, pseudo) => (element ? getComputedStyle(element, pseudo).animationName : "");
    const helperProbe = document.createElement("span");
    helperProbe.className = "helper-sprite helper-slot-1";
    arena?.append(helperProbe);
    const helperAllyCssReady = animationName(helperProbe).includes("helperAllyLoop");
    helperProbe.remove();
    return {
      studentImage: getComputedStyle(student).backgroundImage.includes("data:image"),
      studentCombatMotion: animationName(studentSprite).includes("studentCombatLoop"),
      studentSpriteIdle: animationName(student).includes("studentSpriteIdle"),
      studentDashDust: animationName(studentSprite, "::before").includes("studentDashDust"),
      studentMeleeSlash: animationName(studentSprite, "::after").includes("studentMeleeSlash"),
      monsterImage: getComputedStyle(monster).backgroundImage.includes("data:image"),
      battleLineupCount: battleLineup.length,
      battleLineupImages: sceneMonsterArt.filter((item) => getComputedStyle(item).backgroundImage.includes("data:image")).length,
      battleLineupFrames: new Set(sceneMonsterArt.map((item) => [...item.classList].find((className) => className.startsWith("main-monster-"))).filter(Boolean)).size,
      battleLineupBosses: battleLineup.filter((item) => item.classList.contains("boss")).length,
      battleLineupHpBars: document.querySelectorAll(".battle-scene-enemy .battle-scene-hp").length,
      battleLineupAnimatedEnemies: battleLineup.filter((item) => animationName(item) !== "none").length,
      battleLineupAnimatedArt: sceneMonsterArt.filter((item) => animationName(item) !== "none").length,
      activeEnemyImpact: animationName(activeEnemy, "::after").includes("enemyHitSpark"),
      activeEnemyShockRing: animationName(activeEnemy, "::before").includes("enemyShockRing"),
      battleDustVfx: animationName(battleLineupElement, "::before").includes("battleDustBurst"),
      arenaMotion: animationName(background).includes("arenaTreadmill"),
      arenaGridHidden: getComputedStyle(grid).display === "none",
      floorOverlayReduced: animationName(floor) === "none",
      helperAllyCssReady,
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
    const sample = () => ({
      studentX: matrixX(getComputedStyle(document.querySelector(".student-sprite")).transform),
      studentArtY: matrixY(getComputedStyle(document.querySelector(".student-art")).transform),
      enemyX: matrixX(getComputedStyle(document.querySelector(".battle-scene-enemy.active")).transform),
      normalEnemyArtY: matrixY(getComputedStyle(document.querySelector(".battle-scene-enemy:not(.active):not(.defeated) .battle-scene-monster-art")).transform),
      floorX: matrixX(getComputedStyle(document.querySelector(".pixel-floor")).transform),
    });
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
      studentSpriteIdlePx: Number(range("studentArtY").toFixed(2)),
      activeEnemyTravelPx: Number(range("enemyX").toFixed(2)),
      normalEnemyIdlePx: Number(range("normalEnemyArtY").toFixed(2)),
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
    const unitProbe = document.createElement("span");
    unitProbe.className = "expedition-unit-avatar large unit-1";
    partyProbe.append(unitProbe);
    arena?.append(partyProbe);
    const allyMotionReady = animationName(unitProbe).includes("expeditionAllyMeleeA");
    const allySparkReady = animationName(unitProbe, "::after").includes("expeditionAllySpark");
    partyProbe.remove();
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      samples.push({
        backdropX: matrixX(getComputedStyle(arena, "::before").transform),
        enemyBeforeY: matrixY(getComputedStyle(enemy, "::before").transform),
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
      allyMotionReady,
      allySparkReady,
      enemyWidth: Math.round(enemyRect?.width ?? 0),
      enemyHeight: Math.round(enemyRect?.height ?? 0),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  const expeditionScreenshotPath = resolve(outputDir, "expedition.png");
  await page.screenshot({ path: expeditionScreenshotPath, fullPage: true });

  const failures = [];
  if (!mainMetrics.studentImage) failures.push("Main student sprite is missing a data image background");
  if (!mainMetrics.studentCombatMotion) failures.push("Main student combat motion is missing");
  if (!mainMetrics.studentSpriteIdle) failures.push("Main student sprite idle motion is missing");
  if (!mainMetrics.studentDashDust) failures.push("Main student dash dust VFX is missing");
  if (!mainMetrics.studentMeleeSlash) failures.push("Main student melee slash motion is missing");
  if (combatMotionMetrics.studentTravelPx < 24) failures.push(`Main student melee travel is too small: ${combatMotionMetrics.studentTravelPx}px`);
  if (combatMotionMetrics.studentSpriteIdlePx < 2) failures.push(`Main student idle sprite motion is too small: ${combatMotionMetrics.studentSpriteIdlePx}px`);
  if (!mainMetrics.monsterImage) failures.push("Main monster sprite is missing a data image background");
  if (mainMetrics.battleLineupCount !== 12) failures.push(`Main battle expected 12 scene enemies, got ${mainMetrics.battleLineupCount}`);
  if (mainMetrics.battleLineupImages !== 12) failures.push(`Main battle expected 12 rendered scene enemy images, got ${mainMetrics.battleLineupImages}`);
  if (mainMetrics.battleLineupFrames < 8) failures.push(`Main battle expected varied scene enemy frames, got ${mainMetrics.battleLineupFrames}`);
  if (mainMetrics.battleLineupBosses !== 4) failures.push(`Main battle expected 4 boss monsters, got ${mainMetrics.battleLineupBosses}`);
  if (mainMetrics.battleLineupHpBars !== 4) failures.push(`Main battle expected 4 boss HP bars, got ${mainMetrics.battleLineupHpBars}`);
  if (mainMetrics.battleLineupAnimatedEnemies < 10) failures.push(`Main battle expected animated enemy lineup, got ${mainMetrics.battleLineupAnimatedEnemies}`);
  if (mainMetrics.battleLineupAnimatedArt < 10) failures.push(`Main battle expected animated enemy art, got ${mainMetrics.battleLineupAnimatedArt}`);
  if (!mainMetrics.activeEnemyImpact) failures.push("Main battle active enemy impact motion is missing");
  if (!mainMetrics.activeEnemyShockRing) failures.push("Main battle active enemy shock ring VFX is missing");
  if (!mainMetrics.battleDustVfx) failures.push("Main battle dust burst VFX is missing");
  if (!mainMetrics.arenaMotion) failures.push("Main battle arena treadmill motion is missing");
  if (!mainMetrics.arenaGridHidden) failures.push("Main battle CSS grid overlay should be hidden");
  if (!mainMetrics.floorOverlayReduced) failures.push("Main battle floor grid animation should be removed");
  if (combatMotionMetrics.activeEnemyTravelPx < 20) failures.push(`Main active enemy travel is too small: ${combatMotionMetrics.activeEnemyTravelPx}px`);
  if (combatMotionMetrics.normalEnemyIdlePx < 2) failures.push(`Main normal enemy idle motion is too small: ${combatMotionMetrics.normalEnemyIdlePx}px`);
  if (!mainMetrics.helperAllyCssReady) failures.push("Helper ally combat CSS is missing");
  if (mainMetrics.arenaTextCards !== 0) failures.push(`Main battle expected no text enemy cards in arena, got ${mainMetrics.arenaTextCards}`);
  if (mainMetrics.horizontalOverflow > 4) failures.push(`Main battle horizontal overflow ${mainMetrics.horizontalOverflow}px`);
  if (expeditionMetrics.enemyCount < 1) failures.push("Expedition enemy is missing");
  if (!expeditionMetrics.enemyBeforeImage) failures.push("Expedition enemy visual atlas is missing");
  if (!expeditionMetrics.backdropImage) failures.push("Expedition long backdrop atlas is missing");
  if (!expeditionMetrics.backdropMotion) failures.push("Expedition long backdrop motion is missing");
  if (expeditionMetrics.backdropTravelPx < 4) failures.push(`Expedition backdrop travel is too small: ${expeditionMetrics.backdropTravelPx}px`);
  if (!expeditionMetrics.oldBackgroundHidden) failures.push("Expedition old background image should be hidden");
  if (!expeditionMetrics.enemyBeforeMotion) failures.push("Expedition enemy sprite motion is missing");
  if (!expeditionMetrics.enemyShockVfx) failures.push("Expedition enemy shock VFX is missing");
  if (expeditionMetrics.enemySpriteTravelPx < 2) failures.push(`Expedition enemy sprite travel is too small: ${expeditionMetrics.enemySpriteTravelPx}px`);
  if (!expeditionMetrics.allyMotionReady) failures.push("Expedition ally melee motion is missing");
  if (!expeditionMetrics.allySparkReady) failures.push("Expedition ally spark VFX is missing");
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
