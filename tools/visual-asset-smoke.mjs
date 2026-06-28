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
  const companionSpecs = [
    { id: "smoke-helper-teacher", name: "교사 도우미", careerId: "teacher", careerName: "교사", avatarGender: "female", age: 25, auraColor: "#60a5fa" },
    { id: "smoke-helper-software", name: "개발 도우미", careerId: "software_engineer", careerName: "소프트웨어 엔지니어", avatarGender: "male", age: 25, auraColor: "#34d399" },
    { id: "smoke-helper-doctor", name: "의학 도우미", careerId: "doctor", careerName: "의사", avatarGender: "female", age: 25, auraColor: "#f472b6" },
  ];
  const companions = companionSpecs.map((companion) => ({
    ...companion,
    source: "human",
    status: "study",
    incomePerMinute: 120,
    powerMultiplier: 1.1,
    stats,
    createdRun: 1,
    sourceUniversity: "스모크 검증",
  }));
  const equipmentItems = [
    {
      id: "visual-smoke-stationery",
      catalogId: "stationery_planner_a",
      slot: "stationery",
      rarity: "A",
      name: "오답 플래너",
      stats: { korean: 160, english: 130, math: 150, social: 145, science: 145 },
      sellPrice: 25000,
      source: "visual-smoke",
      createdAt: Date.now(),
    },
    {
      id: "visual-smoke-book",
      catalogId: "book_archive_a",
      slot: "book",
      rarity: "A",
      name: "오답 압축 노트",
      stats: { korean: 175, english: 135, math: 155, social: 145, science: 145 },
      sellPrice: 25000,
      source: "visual-smoke",
      createdAt: Date.now() + 1,
    },
  ];
  const expeditionMembers = [
    { id: "expedition-member-smoke-doctor", sourceCareerId: "doctor", careerName: "의사", avatarGender: "female" },
    { id: "expedition-member-smoke-judge", sourceCareerId: "judge", careerName: "판사", avatarGender: "male" },
    { id: "expedition-member-smoke-software", sourceCareerId: "software_engineer", careerName: "소프트웨어 엔지니어", avatarGender: "male" },
    { id: "expedition-member-smoke-pilot", sourceCareerId: "pilot", careerName: "조종사", avatarGender: "female" },
    { id: "expedition-member-smoke-chef", sourceCareerId: "chef", careerName: "셰프", avatarGender: "male" },
  ].map((member, index) => ({
    ...member,
    sourceKey: `visual-smoke:${member.sourceCareerId}`,
    sourceRunNumber: 1,
    sourceUniversity: "스모크 검증",
    level: 1,
    exp: 0,
    promotionTier: "staff",
    baseStats: {
      korean: 88 + index * 3,
      english: 91 + index * 2,
      math: 95 + index * 4,
      social: 77 + index * 3,
      science: 93 + index * 5,
    },
    locked: false,
    createdAt: Date.now() + index,
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
    equipment: {
      inventory: equipmentItems,
      equipped: {
        stationery: "visual-smoke-stationery",
        book: "visual-smoke-book",
      },
    },
    expedition: {
      members: expeditionMembers,
      partyMemberIds: expeditionMembers.map((member) => member.id),
      currentStage: 1,
      highestStage: 0,
      claimedBossStages: [],
      trainingExp: 0,
      chapterRun: { chapter: 1, tempLevel: 1, tempExp: 0, boostMultiplier: 1 },
      lastResolvedAt: Date.now(),
      log: [],
      lastStageId: null,
    },
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
    let savedBattleEnemies = [];
    try {
      const saved = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1") ?? "{}");
      savedBattleEnemies = saved?.current?.battle?.enemies ?? [];
    } catch {
      savedBattleEnemies = [];
    }
    const equipmentLineup = document.querySelector(".equipment-lineup");
    const equipmentItems = [...document.querySelectorAll(".equipment-lineup .equipment-orbit-item")];
    const equipmentRects = equipmentItems.map((item) => rectMetrics(item));
    const equipmentSizes = equipmentRects.map((rect) => ({ width: rect.width, height: rect.height }));
    const equipmentMotionReady = equipmentItems.length > 0 && equipmentItems.every((item) => animationName(item).includes("equipmentOrbitLoop"));
    const equipmentFilledCount = equipmentItems.filter((item) => !item.classList.contains("empty")).length;
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
    const domDefeatedEnemyCount = battleLineup.filter((item) => item.classList.contains("defeated")).length;
    const savedDamagedEnemyCount = savedBattleEnemies.filter((enemy) => {
      const remainingHp = Number(enemy.remainingHp ?? 0);
      const maxHp = Number(enemy.maxHp ?? 0);
      return maxHp > 0 && remainingHp < maxHp;
    }).length;
    const battleDamagedEnemyCount = Math.max(domDefeatedEnemyCount, savedDamagedEnemyCount);
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
          // backgroundImage 에 url(...) 이 있으면 실제 이미지다.
          // 인라인(data:image) 빌드와 외부 자산(assets/*.png) 빌드를 모두 허용한다.
          hasImage: before.backgroundImage.includes("url("),
          size: before.backgroundSize,
          position: before.backgroundPosition,
          repeat: before.backgroundRepeat,
        });
      }
      stageScene.classList.remove(...sceneClasses);
      if (originalSceneClass) stageScene.classList.add(originalSceneClass);
    }
    const studentSlashBackground = studentSprite ? getComputedStyle(studentSprite, "::after").backgroundImage : "";
    return {
      studentImage: getComputedStyle(student).backgroundImage.includes("url("),
      studentCombatMotion: ["studentCombatLoop", "studentRoadRunLoop", "studentRoadBrakeLoop"].some((name) =>
        animationName(studentSprite).includes(name),
      ),
      studentAnimation: animationName(studentSprite),
      studentSpriteFrames: animationName(student).includes("studentMoveFrames"),
      studentDashDust: ["studentDashDust", "roadRunDust", "roadBrakeDust"].some((name) =>
        animationName(studentSprite, "::before").includes(name),
      ),
      studentMeleeSlash:
        (battleLineupElement?.getAttribute("data-road-phase") ?? "") === "travel" ||
        animationName(studentSprite, "::after").includes("studentMeleeSlash"),
      studentSlashBackground,
      monsterImage: getComputedStyle(monster).backgroundImage.includes("url("),
      battleRoadLineup: battleLineupElement?.classList.contains("battle-road-lineup") ?? false,
      battleRoadPhase: phase,
      battleDamagedEnemyCount,
      battleRoadEncounterIndex: Number(battleLineupElement?.getAttribute("data-encounter-index") ?? -1),
      arenaRoadTravel: arena?.classList.contains("road-travel") ?? false,
      battleLineupCount: battleLineup.length,
      battleLineupImages: sceneMonsterArt.filter((item) => getComputedStyle(item).backgroundImage.includes("url(")).length,
      battleLineupFrames: new Set(sceneMonsterArt.map((item) => getComputedStyle(item).backgroundPositionX).filter(Boolean)).size,
      battleLineupBosses: battleLineup.filter((item) => item.classList.contains("boss")).length,
      battleLineupHpBars: document.querySelectorAll(".battle-scene-enemy .battle-scene-hp").length,
      battleHpBarMinWidth: minRounded(hpBarSizes.map((size) => size.width)),
      battleHpBarMinHeight: minRounded(hpBarSizes.map((size) => size.height)),
      battleLineupAnimatedEnemies: battleLineup.filter((item) => animationName(item) !== "none").length,
      battleLineupAnimatedArt: sceneMonsterArt.filter((item) => animationName(item) !== "none").length,
      activeEnemyImpact: animationName(activeEnemy, "::after").includes("enemyHitSpark"),
      activeEnemyShockRing: animationName(activeEnemy, "::before").includes("enemyShockRing"),
      battleDustVfx: animationName(battleLineupElement, "::before").includes("battleDustBurst"),
      battleBackdropImage: arenaBefore?.backgroundImage.includes("url(") ?? false,
      battleBackdropMotion: animationName(arena, "::before").includes("battleRoadBackdropPan"),
      battleBackdropPanWidth: Number.parseFloat(arenaStyle?.getPropertyValue("--battle-road-pan-width") ?? "0"),
      battleBackdropSize: arenaBefore?.backgroundSize ?? "",
      battleBackdropPosition: arenaBefore?.backgroundPosition ?? "",
      battleBackdropRepeat: arenaBefore?.backgroundRepeat ?? "",
      battleBackdropSceneStyles,
      oldBattleBackgroundHidden: !background || getComputedStyle(background).display === "none",
      arenaGridHidden: getComputedStyle(grid).display === "none",
      floorOverlayReduced: animationName(floor) === "none",
      equipmentLineupReady: !!equipmentLineup,
      equipmentMotionReady,
      equipmentRenderedCount: equipmentItems.length,
      equipmentFilledCount,
      equipmentMinWidth: minRounded(equipmentSizes.map((size) => size.width)),
      equipmentMinHeight: minRounded(equipmentSizes.map((size) => size.height)),
      equipmentSquareDelta: maxRounded(equipmentSizes.map((size) => Math.abs(size.width - size.height))),
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
  await page
    .waitForFunction(
      () => {
        const domDefeatedEnemyCount = document.querySelectorAll(".battle-scene-enemy.defeated").length;
        let savedBattleEnemies = [];
        try {
          savedBattleEnemies = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1") ?? "{}")?.current?.battle?.enemies ?? [];
        } catch {
          savedBattleEnemies = [];
        }
        const savedDamagedEnemyCount = savedBattleEnemies.filter((enemy) => {
          const remainingHp = Number(enemy.remainingHp ?? 0);
          const maxHp = Number(enemy.maxHp ?? 0);
          return maxHp > 0 && remainingHp < maxHp;
        }).length;
        return Math.max(domDefeatedEnemyCount, savedDamagedEnemyCount) > 0;
      },
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  const damagePhaseMetrics = await page.evaluate(() => {
    let savedBattleEnemies = [];
    try {
      savedBattleEnemies = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1") ?? "{}")?.current?.battle?.enemies ?? [];
    } catch {
      savedBattleEnemies = [];
    }
    const domDefeatedEnemyCount = document.querySelectorAll(".battle-scene-enemy.defeated").length;
    const savedDamagedEnemyCount = savedBattleEnemies.filter((enemy) => {
      const remainingHp = Number(enemy.remainingHp ?? 0);
      const maxHp = Number(enemy.maxHp ?? 0);
      return maxHp > 0 && remainingHp < maxHp;
    }).length;
    const battleDamagedEnemyCount = Math.max(domDefeatedEnemyCount, savedDamagedEnemyCount);
    const phase = document.querySelector(".battle-road-lineup")?.getAttribute("data-road-phase") ?? "";
    const student = document.querySelector(".student-sprite");
    const arena = document.querySelector(".pixel-arena");
    const curriculumLayer = document.querySelector(".curriculum-attack-vfx-layer");
    const curriculumToken = document.querySelector(".curriculum-attack-vfx-token");
    const curriculumStyle = curriculumToken ? getComputedStyle(curriculumToken) : null;
    const curriculumRect = curriculumToken?.getBoundingClientRect();
    const arenaStyle = arena ? getComputedStyle(arena) : null;
    return {
      battleDamagedEnemyCount,
      phase,
      studentAnimation: student ? getComputedStyle(student).animationName : "",
      arenaRoadCombat: arena?.classList.contains("road-combat") ?? false,
      arenaRoadTravel: arena?.classList.contains("road-travel") ?? false,
      curriculumVfxLayerCount: document.querySelectorAll(".curriculum-attack-vfx-layer").length,
      curriculumVfxTokenCount: document.querySelectorAll(".curriculum-attack-vfx-token").length,
      curriculumVfxText: curriculumToken?.textContent ?? "",
      curriculumVfxAnimation: curriculumStyle?.animationName ?? "",
      curriculumVfxStyleClass: curriculumToken ? [...curriculumToken.classList].find((className) => className.startsWith("curriculum-vfx-")) ?? "" : "",
      curriculumVfxSubject: curriculumLayer?.getAttribute("data-subject") ?? "",
      curriculumVfxSourceY: Number.parseFloat(arenaStyle?.getPropertyValue("--curriculum-vfx-source-y") ?? "0"),
      curriculumVfxWidth: Math.round(curriculumRect?.width ?? 0),
      curriculumVfxHeight: Math.round(curriculumRect?.height ?? 0),
    };
  });
  const mainScreenshotPath = resolve(outputDir, "main-battle.png");
  await page.screenshot({ path: mainScreenshotPath, fullPage: true });

  await page.evaluate(() => {
    const button = document.querySelectorAll(".mode-tab")[1];
    if (!button) throw new Error("Expedition mode button not found");
    button.click();
  });
  await page.waitForSelector(".expedition-enemy-visual", { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const images = [...document.querySelectorAll(".expedition-unit-frame,.expedition-enemy-frame")];
      return images.length >= 24 && images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
    },
    null,
    { timeout: 15000 },
  );

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
    const arenaStyle = arena ? getComputedStyle(arena) : null;
    const arenaBefore = arena ? getComputedStyle(arena, "::before") : null;
    const arenaDustBackground = arena ? getComputedStyle(arena, "::after").backgroundImage : "";
    const enemy = document.querySelector(".expedition-enemy-visual");
    const party = document.querySelector(".expedition-party-visual.running, .expedition-party-visual.combat");
    const partyMotionState = document.querySelector(".expedition-party-visual")?.getAttribute("data-party-motion") ?? "";
    const unitProbe = document.querySelector(".expedition-unit-avatar.large");
    const enemyRect = enemy?.getBoundingClientRect();
    const allyMotionReady = animationName(unitProbe).includes("expeditionUnitRhythm");
    const allySparkReady = animationName(unitProbe, "::after").includes("expeditionAllySpark");
    const loadedImage = (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    const unitFrames = [...document.querySelectorAll(".expedition-unit-frame")];
    const enemyFrames = [...document.querySelectorAll(".expedition-enemy-frame")];
    const careerUnitImage = unitFrames.length > 0 && unitFrames.every(loadedImage);
    const enemyFrameImage = enemyFrames.length > 0 && enemyFrames.every(loadedImage);
    const arenaRect = arena?.getBoundingClientRect();
    const unitRects = Array.from(document.querySelectorAll(".expedition-party-visual.running .expedition-unit-avatar, .expedition-party-visual.combat .expedition-unit-avatar")).map((unit) => unit.getBoundingClientRect());
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
    const readPx = (value) => {
      const parsed = Number.parseFloat(value || "0");
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const minRounded = (values) => (values.length ? Math.round(Math.min(...values)) : 0);
    const maxRounded = (values) => (values.length ? Math.round(Math.max(...values)) : 0);
    const spriteClipFor = (element) => {
      const spriteRect = element?.getBoundingClientRect();
      if (!arenaRect || !spriteRect) return { left: 0, right: 0, top: 0, bottom: 0 };
      return {
        left: Math.max(0, arenaRect.left - spriteRect.left),
        right: Math.max(0, spriteRect.right - arenaRect.right),
        top: Math.max(0, arenaRect.top - spriteRect.top),
        bottom: Math.max(0, spriteRect.bottom - arenaRect.bottom),
      };
    };
    const enemyFrameRects = enemyFrames.map((frame) => frame.getBoundingClientRect());
    const enemyFrameSizes = enemyFrameRects.map((rect) => ({ width: rect.width, height: rect.height }));
    const enemySpriteClips = enemyFrames.map(spriteClipFor);
    const enemyTextVisibleCount = Array.from(document.querySelectorAll(".expedition-enemy-visual .enemy-name,.expedition-enemy-visual strong,.expedition-enemy-visual small")).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0 && rect.width > 0 && rect.height > 0;
    }).length;
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
      samples.push({
        partyX: matrixX(party ? getComputedStyle(party).transform : ""),
        enemyY: matrixY(enemy ? getComputedStyle(enemy).transform : ""),
      });
      await new Promise((resolveSample) => setTimeout(resolveSample, 120));
    }
    const range = (key) => {
      const values = samples.map((item) => item[key]).filter(Number.isFinite);
      return values.length ? Math.max(...values) - Math.min(...values) : 0;
    };
    return {
      enemyCount: document.querySelectorAll(".expedition-enemy-visual").length,
      enemyFrameImage,
      enemyFrameCount: enemyFrames.length,
      enemyFrameLoadedCount: enemyFrames.filter(loadedImage).length,
      arenaDustBackground,
      backdropImage: arenaBefore?.backgroundImage.includes("url(") ?? false,
      partyMotionState,
      partyMotion: allyMotionReady,
      partyTravelPx: Number(range("partyX").toFixed(2)),
      oldBackgroundHidden: !document.querySelector(".expedition-background-sheet"),
      enemyFrameMotion: animationName(enemy).includes("expeditionEnemyIdle") || enemyFrames.some((frame) =>
        ["expeditionEnemyFrame", "expeditionEnemyHurtSprite"].some((name) => animationName(frame).includes(name)),
      ),
      impactElementCount: document.querySelectorAll(".expedition-impact").length,
      enemyShockVfx: animationName(document.querySelector(".expedition-impact")).includes("expeditionImpactPulse"),
      enemySpriteTravelPx: Number(range("enemyY").toFixed(2)),
      careerUnitImage,
      allyMotionReady,
      allySparkReady,
      unitRenderedCount: unitRects.length,
      unitFrameCount: unitFrames.length,
      unitFrameLoadedCount: unitFrames.filter(loadedImage).length,
      unitFrameAnimatedCount: unitFrames.filter((frame) => animationName(frame) !== "none").length,
      enemyFrameAnimatedCount: enemyFrames.filter((frame) => animationName(frame) !== "none").length,
      unitMinWidth: minRounded(unitSizes.map((size) => size.width)),
      unitMinHeight: minRounded(unitSizes.map((size) => size.height)),
      unitSquareDelta: maxRounded(unitSizes.map((size) => Math.abs(size.width - size.height))),
      unitClipCount,
      partyOverflowVisible: party ? getComputedStyle(party).overflow === "visible" : false,
      enemyOverflowVisible: enemyStyle?.overflow === "visible",
      enemyFrameMinWidth: minRounded(enemyFrameSizes.map((size) => size.width)),
      enemyFrameMinHeight: minRounded(enemyFrameSizes.map((size) => size.height)),
      enemyFrameSquareDelta: maxRounded(enemyFrameSizes.map((size) => Math.abs(size.width - size.height))),
      enemyTextVisibleCount,
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
  const expeditionScreenshotPath = resolve(outputDir, "expedition.png");
  await page.screenshot({ path: expeditionScreenshotPath, fullPage: true });

  const failures = [];
  if (!mainMetrics.studentImage) failures.push("Main student sprite is missing an image background");
  if (!mainMetrics.studentCombatMotion) failures.push("Main student combat motion is missing");
  if (!mainMetrics.studentSpriteFrames) failures.push("Main student sprite frame animation is missing");
  if (!mainMetrics.studentDashDust) failures.push("Main student dash dust VFX is missing");
  if (!mainMetrics.studentMeleeSlash) failures.push("Main student melee slash motion is missing");
  const fireLikeSlashColors = ["rgb(239, 71, 111)", "rgb(244, 211, 94)", "rgb(255, 209, 102)", "rgb(249, 115, 22)", "rgb(254, 243, 199)", "rgb(255, 224, 130)"];
  if (fireLikeSlashColors.some((color) => mainMetrics.studentSlashBackground.includes(color))) {
    failures.push(`Main student slash still uses fire-like warm colors: ${mainMetrics.studentSlashBackground}`);
  }
  if (mainMetrics.battleRoadPhase === "travel") {
    if (combatMotionMetrics.studentTravelPx < 5) failures.push(`Main student travel run is too small: ${combatMotionMetrics.studentTravelPx}px`);
  } else if (combatMotionMetrics.studentTravelPx < 24) {
    failures.push(`Main student melee travel is too small: ${combatMotionMetrics.studentTravelPx}px`);
  }
  if (combatMotionMetrics.studentSpriteFrameShift < 1) failures.push(`Main student sprite frame shift is too small: ${combatMotionMetrics.studentSpriteFrameShift}`);
  if (!mainMetrics.monsterImage) failures.push("Main monster sprite is missing an image background");
  if (!mainMetrics.battleRoadLineup) failures.push("Main battle road lineup class is missing");
  if (mainMetrics.battleDamagedEnemyCount > 0 && mainMetrics.battleRoadPhase === "travel") {
    failures.push("Main battle road phase stays travel after enemies are damaged");
  }
  if (mainMetrics.battleDamagedEnemyCount > 0 && !mainMetrics.studentAnimation.includes("studentCombatLoop")) {
    failures.push(`Main student should use combat animation after enemy damage, got ${mainMetrics.studentAnimation}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount < 1) failures.push("Main battle did not reach a damaged enemy state for phase smoke");
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && damagePhaseMetrics.phase === "travel") {
    failures.push("Main battle delayed phase stays travel after enemies are damaged");
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && !damagePhaseMetrics.studentAnimation.includes("studentCombatLoop")) {
    failures.push(`Main delayed student should use combat animation after enemy damage, got ${damagePhaseMetrics.studentAnimation}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && !damagePhaseMetrics.arenaRoadCombat) {
    failures.push("Main battle arena should use road-combat class after enemy damage");
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && damagePhaseMetrics.curriculumVfxLayerCount !== 1) {
    failures.push(`Curriculum attack VFX expected 1 layer after damage, got ${damagePhaseMetrics.curriculumVfxLayerCount}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && damagePhaseMetrics.curriculumVfxTokenCount !== 1) {
    failures.push(`Curriculum attack VFX expected 1 token after damage, got ${damagePhaseMetrics.curriculumVfxTokenCount}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && !damagePhaseMetrics.curriculumVfxText) {
    failures.push("Curriculum attack VFX token text is missing");
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && damagePhaseMetrics.curriculumVfxText.length > 8) {
    failures.push(`Curriculum attack VFX token is too long: ${damagePhaseMetrics.curriculumVfxText}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && !["curriculumVfx", "curriculumTokenPop"].some((name) => damagePhaseMetrics.curriculumVfxAnimation.includes(name))) {
    failures.push(`Curriculum attack VFX animation is missing: ${damagePhaseMetrics.curriculumVfxAnimation}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && damagePhaseMetrics.curriculumVfxSourceY > 0) {
    failures.push(`Curriculum attack VFX source Y should originate from the student body, got ${damagePhaseMetrics.curriculumVfxSourceY}`);
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && !damagePhaseMetrics.curriculumVfxStyleClass) {
    failures.push("Curriculum attack VFX style class is missing");
  }
  if (damagePhaseMetrics.battleDamagedEnemyCount > 0 && (damagePhaseMetrics.curriculumVfxWidth < 16 || damagePhaseMetrics.curriculumVfxHeight < 10)) {
    failures.push(`Curriculum attack VFX token box is too small: ${damagePhaseMetrics.curriculumVfxWidth}x${damagePhaseMetrics.curriculumVfxHeight}`);
  }
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
    if (!sceneStyle.hasImage) failures.push(`${sceneStyle.sceneClass} battle backdrop image is missing`);
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
  if (!mainMetrics.equipmentLineupReady) failures.push("Main battle equipped equipment lineup is missing");
  if (!mainMetrics.equipmentMotionReady) failures.push("Main battle equipment orbit motion is missing");
  if (mainMetrics.equipmentRenderedCount !== 2) failures.push(`Main battle expected 2 equipped equipment icons, got ${mainMetrics.equipmentRenderedCount}`);
  if (mainMetrics.equipmentFilledCount !== 2) failures.push(`Main battle expected 2 filled equipment icons, got ${mainMetrics.equipmentFilledCount}`);
  if (mainMetrics.equipmentMinWidth < 40 || mainMetrics.equipmentMinHeight < 40) failures.push(`Main battle equipment icon is too small: ${mainMetrics.equipmentMinWidth}x${mainMetrics.equipmentMinHeight}`);
  if (mainMetrics.equipmentSquareDelta > 4) failures.push(`Main battle equipment icon box is distorted by ${mainMetrics.equipmentSquareDelta}px`);
  if (mainMetrics.normalEnemyMinWidth < 70 || mainMetrics.normalEnemyMinHeight < 70) failures.push(`Main battle normal monsters are too small: ${mainMetrics.normalEnemyMinWidth}x${mainMetrics.normalEnemyMinHeight}`);
  if (mainMetrics.normalEnemySquareDelta > 4) failures.push(`Main battle normal monster display boxes are distorted by ${mainMetrics.normalEnemySquareDelta}px`);
  if (mainMetrics.bossEnemyMinWidth < 86 || mainMetrics.bossEnemyMinHeight < 86) failures.push(`Main battle boss/suneung monster is too small: ${mainMetrics.bossEnemyMinWidth}x${mainMetrics.bossEnemyMinHeight}`);
  if (mainMetrics.enemyClipCount > 0) failures.push(`Main battle visible monsters are clipped by arena: ${mainMetrics.enemyClipCount}`);
  if (mainMetrics.arenaTextCards !== 0) failures.push(`Main battle expected no text enemy cards in arena, got ${mainMetrics.arenaTextCards}`);
  if (mainMetrics.horizontalOverflow > 4) failures.push(`Main battle horizontal overflow ${mainMetrics.horizontalOverflow}px`);
  if (expeditionMetrics.enemyCount < 1) failures.push("Expedition enemy is missing");
  if (!expeditionMetrics.enemyFrameImage) failures.push(`Expedition enemy frame images are missing: ${expeditionMetrics.enemyFrameLoadedCount}/${expeditionMetrics.enemyFrameCount}`);
  if (!expeditionMetrics.backdropImage) failures.push("Expedition backdrop image is missing");
  if (!["combat", "running", "standing"].includes(expeditionMetrics.partyMotionState)) {
    failures.push(`Expedition party motion state is invalid: ${expeditionMetrics.partyMotionState}`);
  }
  if (["combat", "running"].includes(expeditionMetrics.partyMotionState) && !expeditionMetrics.partyMotion) {
    failures.push("Expedition party in-place motion is missing");
  }
  if (!expeditionMetrics.oldBackgroundHidden) failures.push("Expedition old background image should be hidden");
  if (!expeditionMetrics.enemyFrameMotion) failures.push("Expedition enemy sprite motion is missing");
  if (expeditionMetrics.impactElementCount > 0 && !expeditionMetrics.enemyShockVfx) failures.push("Expedition impact VFX is missing");
  if (fireLikeSlashColors.some((color) => expeditionMetrics.arenaDustBackground.includes(color))) {
    failures.push(`Expedition arena dust still uses fire-like warm colors: ${expeditionMetrics.arenaDustBackground}`);
  }
  if (expeditionMetrics.enemyTextVisibleCount > 0) failures.push(`Expedition enemy attached text is visible: ${expeditionMetrics.enemyTextVisibleCount}`);
  if (expeditionMetrics.enemySpriteTravelPx < 0.4) failures.push(`Expedition enemy sprite reaction is too static: ${expeditionMetrics.enemySpriteTravelPx}px`);
  if (expeditionMetrics.enemySpriteTravelPx > 4) failures.push(`Expedition enemy sprite reaction is too large: ${expeditionMetrics.enemySpriteTravelPx}px`);
  if (!expeditionMetrics.careerUnitImage) failures.push(`Expedition career unit frame images are missing: ${expeditionMetrics.unitFrameLoadedCount}/${expeditionMetrics.unitFrameCount}`);
  if (!expeditionMetrics.allyMotionReady) failures.push("Expedition ally melee motion is missing");
  if (!expeditionMetrics.allySparkReady && expeditionMetrics.partyMotionState === "running") failures.push("Expedition ally spark VFX is missing while travel motion is active");
  if (expeditionMetrics.unitRenderedCount < 5) failures.push(`Expedition companion probe expected 5 units, got ${expeditionMetrics.unitRenderedCount}`);
  if (expeditionMetrics.unitFrameAnimatedCount < 4) failures.push(`Expedition companion frame animations are missing: ${expeditionMetrics.unitFrameAnimatedCount}`);
  if (expeditionMetrics.enemyFrameAnimatedCount < 1) failures.push(`Expedition enemy frame animations are missing: ${expeditionMetrics.enemyFrameAnimatedCount}`);
  if (expeditionMetrics.unitMinWidth < 44 || expeditionMetrics.unitMinHeight < 44) failures.push(`Expedition companion display box is too small: ${expeditionMetrics.unitMinWidth}x${expeditionMetrics.unitMinHeight}`);
  if (expeditionMetrics.unitSquareDelta > 6) failures.push(`Expedition companion sprite box is distorted by ${expeditionMetrics.unitSquareDelta}px`);
  if (expeditionMetrics.unitClipCount > 0) failures.push(`Expedition companion sprites are clipped by arena: ${expeditionMetrics.unitClipCount}`);
  if (!expeditionMetrics.partyOverflowVisible) failures.push("Expedition party visual should allow sprite overflow");
  if (!expeditionMetrics.enemyOverflowVisible) failures.push("Expedition enemy visual should allow sprite overflow");
  if (expeditionMetrics.enemyFrameMinWidth < 70 || expeditionMetrics.enemyFrameMinHeight < 70) failures.push(`Expedition enemy sprite box is too small: ${expeditionMetrics.enemyFrameMinWidth}x${expeditionMetrics.enemyFrameMinHeight}`);
  if (expeditionMetrics.enemyFrameSquareDelta > 8) failures.push(`Expedition enemy sprite box is distorted by ${expeditionMetrics.enemyFrameSquareDelta}px`);
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
        damagePhaseMetrics,
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
