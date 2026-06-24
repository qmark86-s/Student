import { chromium } from "@playwright/test";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve("dist-react");
const outDir = resolve("artifacts/react-vite-responsive-audit");
const preferredPort = Number(process.env.REACT_RESPONSIVE_AUDIT_PORT || 5786);
const saveKey = "student-idle-rpg-save-v1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const viewports = [
  { name: "phone-narrow", width: 320, height: 568 },
  { name: "phone-small", width: 360, height: 740 },
  { name: "phone-parity", width: 390, height: 844 },
  { name: "phone-standard", width: 412, height: 915 },
  { name: "phone-large", width: 430, height: 932 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "landscape-small", width: 844, height: 390 },
  { name: "desktop-wide", width: 1280, height: 720 },
];

const featureViewportNames = new Set(["phone-narrow", "phone-parity", "landscape-small", "tablet-portrait"]);

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist-react/index.html is missing. Run `npm run react:build` first.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

function makeSeedState({ diamonds = 0 } = {}) {
  return {
    schemaVersion: 2,
    runNumber: 3,
    money: 1200,
    diamonds,
    workSlots: 5,
    lastIncomeAt: Date.now(),
    current: {
      gradeId: "E1",
      avatarGender: "male",
      retakeCount: 0,
      road: {
        mode: "school",
        phase: "travel",
        encounterIndex: 0,
        encounterTotal: 4,
        phaseStartedAt: 0,
        lastCompletedEncounterId: null,
      },
      monthIndex: 0,
      waveProgressMs: 0,
      waveRewardClaimedSteps: 0,
      unspentStudyPoints: 0,
      totalStudyPoints: 0,
      studyLevels: {},
      aptitude: { korean: 0, english: 0, math: 0, social: 0, science: 0 },
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: { korean: 100, english: 100, math: 100, social: 100, science: 100 },
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: { korean: 0, english: 0, math: 0, social: 0, science: 0 },
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
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

async function seedPage(page, state) {
  await page.addInitScript(({ key, seedState }) => {
    localStorage.setItem(key, JSON.stringify(seedState));
    Math.random = () => 0.25;
  }, { key: saveKey, seedState: state });
}

async function waitReady(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".phone-frame", { timeout: 15000 });
  await page.waitForTimeout(300);
}

async function capture(page, name) {
  await page.screenshot({
    path: resolve(outDir, `${name}.png`),
    fullPage: false,
  });
}

async function readMetrics(page, scenario) {
  return await page.evaluate(async (scenarioName) => {
    await document.fonts?.ready;
    const doc = document.documentElement;
    const body = document.body;
    const phoneRect = document.querySelector(".phone-frame")?.getBoundingClientRect();
    const modalRect = document.querySelector(".shop-modal, .debug-modal, .settings-modal, .score-modal, .app-modal")?.getBoundingClientRect();
    const loadedImages = Array.from(document.querySelectorAll("img"))
      .filter((img) => img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0)
      .map((img) => ({
        src: img.getAttribute("src"),
        ok: img.complete && img.naturalWidth > 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      }));
    const buttonOverflow = Array.from(document.querySelectorAll("button"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          (element.scrollWidth > Math.ceil(rect.width) + 2 || element.scrollHeight > Math.ceil(rect.height) + 2);
      })
      .map((element) => ({
        text: (element.textContent || element.getAttribute("aria-label") || "").trim(),
        scrollWidth: element.scrollWidth,
        clientWidth: Math.round(element.getBoundingClientRect().width),
        scrollHeight: element.scrollHeight,
        clientHeight: Math.round(element.getBoundingClientRect().height),
      }));

    return {
      scenario: scenarioName,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      horizontalOverflow: Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth,
      verticalOverflow: Math.max(doc.scrollHeight, body.scrollHeight) - window.innerHeight,
      phoneRect: phoneRect ? {
        x: phoneRect.x,
        y: phoneRect.y,
        width: phoneRect.width,
        height: phoneRect.height,
        bottom: phoneRect.bottom,
      } : null,
      modalRect: modalRect ? {
        x: modalRect.x,
        y: modalRect.y,
        width: modalRect.width,
        height: modalRect.height,
      } : null,
      tabCount: document.querySelectorAll(".tab").length,
      expeditionTabCount: document.querySelectorAll(".expedition-tab").length,
      statusTileCount: document.querySelectorAll(".status-tile").length,
      modeTabCount: document.querySelectorAll(".mode-tab").length,
      battleEnemyCount: document.querySelectorAll(".battle-scene-enemy").length,
      helperUnitCount: document.querySelectorAll(".learning-helper-unit").length,
      companionCardCount: document.querySelectorAll(".companion-card").length,
      expeditionUnitCount: document.querySelectorAll(".expedition-unit-avatar.large").length,
      gachaPopupCount: document.querySelectorAll(".gacha-popup").length,
      visibleImages: loadedImages.length,
      failedImages: loadedImages.filter((image) => !image.ok),
      buttonOverflow,
    };
  }, scenario);
}

async function readBattleLayoutMetrics(page, mode) {
  return await page.evaluate(async (battleMode) => {
    await document.fonts?.ready;
    const selectors = battleMode === "student"
      ? {
          scene: ".react-battle-arena.stage-scene",
          arena: ".pixel-arena",
          footer: ".battle-arena-overlay",
          action: ".battle-auto-toggle",
        }
      : {
          scene: ".expedition-scene",
          arena: ".expedition-arena",
          footer: ".expedition-scene-footer",
          action: ".expedition-action-button",
        };

    function toRect(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
      };
    }

    function toStyle(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateRows: style.gridTemplateRows,
        paddingTop: Number.parseFloat(style.paddingTop),
        paddingRight: Number.parseFloat(style.paddingRight),
        paddingBottom: Number.parseFloat(style.paddingBottom),
        paddingLeft: Number.parseFloat(style.paddingLeft),
        minHeight: style.minHeight,
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
      };
    }

    return {
      mode: battleMode,
      sceneRect: toRect(selectors.scene),
      arenaRect: toRect(selectors.arena),
      footerRect: toRect(selectors.footer),
      actionRect: toRect(selectors.action),
      managementRect: toRect(".management-panel"),
      phoneRect: toRect(".phone-frame"),
      sceneStyle: toStyle(selectors.scene),
      arenaStyle: toStyle(selectors.arena),
      activeTabLabel: battleMode === "expedition"
        ? document.querySelector(".management-panel .expedition-tab.active")?.textContent?.trim() || ""
        : document.querySelector(".management-panel .tab.active")?.getAttribute("aria-label") || "",
      managementTitle: document.querySelector(".management-panel .section-title h2")?.textContent?.trim() || "",
      expeditionTabCount: document.querySelectorAll(".management-panel .expedition-tab").length,
    };
  }, mode);
}

async function readExpeditionPartySlotLayout(page) {
  return await page.evaluate(async () => {
    await document.fonts?.ready;
    const slotRects = Array.from(document.querySelectorAll(".expedition-party-slot")).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index: index + 1,
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    });
    const rows = [];
    for (const rect of slotRects.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
      const row = rows.find((candidate) => Math.abs(candidate.y - rect.y) <= 3);
      if (row) {
        row.items.push(rect);
      } else {
        rows.push({ y: rect.y, items: [rect] });
      }
    }
    return {
      slotCount: slotRects.length,
      rowCounts: rows.map((row) => row.items.length),
      slotRects,
    };
  });
}

async function readExpeditionBattleUnitLayout(page) {
  return await page.evaluate(async () => {
    await document.fonts?.ready;
    const units = Array.from(document.querySelectorAll(".expedition-unit-avatar.large"));
    const arena = document.querySelector(".expedition-arena");
    const arenaRect = arena ? arena.getBoundingClientRect() : null;
    const unitRects = units.map((element, index) => {
      const rect = element.getBoundingClientRect();
      const footPercent = arenaRect && arenaRect.height > 0 ? ((rect.bottom - arenaRect.top) / arenaRect.height) * 100 : 0;
      return {
        index: index + 1,
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        centerX: Number((rect.x + rect.width / 2).toFixed(2)),
        centerY: Number((rect.y + rect.height / 2).toFixed(2)),
        footPercent: Number(footPercent.toFixed(2)),
      };
    });
    const motionSignatures = units.map((element, index) => {
      const unitStyle = getComputedStyle(element);
      const frame = element.querySelector(".expedition-unit-frame.frame-0");
      const frameStyle = frame ? getComputedStyle(frame) : null;
      const sparkStyle = getComputedStyle(element, "::after");
      return {
        index: index + 1,
        motionName: unitStyle.animationName,
        motionDuration: unitStyle.animationDuration,
        motionDelay: unitStyle.animationDelay,
        frameName: frameStyle ? frameStyle.animationName : "",
        frameDuration: frameStyle ? frameStyle.animationDuration : "",
        frameDelay: frameStyle ? frameStyle.animationDelay : "",
        sparkName: sparkStyle.animationName,
        sparkDuration: sparkStyle.animationDuration,
        sparkDelay: sparkStyle.animationDelay,
      };
    });
    const uniqueCount = (items) => new Set(items.filter((item) => item)).size;
    const verticalBands = [];
    for (const rect of unitRects.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
      const band = verticalBands.find((candidate) => Math.abs(candidate.y - rect.y) <= 8);
      if (band) {
        band.items.push(rect);
      } else {
        verticalBands.push({ y: rect.y, items: [rect] });
      }
    }
    const yValues = unitRects.map((rect) => rect.y);
    const xCenters = unitRects.map((rect) => rect.centerX);
    const footPercents = unitRects.map((rect) => rect.footPercent);
    const ySpread = yValues.length > 0 ? Math.max(...yValues) - Math.min(...yValues) : 0;
    const xSpread = xCenters.length > 0 ? Math.max(...xCenters) - Math.min(...xCenters) : 0;
    const minFootPercent = footPercents.length > 0 ? Math.min(...footPercents) : 0;
    return {
      unitCount: unitRects.length,
      rowCounts: verticalBands.map((band) => band.items.length),
      verticalBandCounts: verticalBands.map((band) => band.items.length),
      frontBandCount: verticalBands.length > 0 ? verticalBands[verticalBands.length - 1].items.length : 0,
      horizontalCenterSpread: Number(xSpread.toFixed(2)),
      rowYGap: verticalBands.length >= 2 ? Number(Math.abs(verticalBands[1].y - verticalBands[0].y).toFixed(2)) : 0,
      verticalBandYSpread: Number(ySpread.toFixed(2)),
      minimumFootPercent: Number(minFootPercent.toFixed(2)),
      uniqueMotionDurationCount: uniqueCount(motionSignatures.map((signature) => signature.motionDuration)),
      uniqueMotionDelayCount: uniqueCount(motionSignatures.map((signature) => signature.motionDelay)),
      uniqueFrameDelayCount: uniqueCount(motionSignatures.map((signature) => signature.frameDelay)),
      uniqueSparkDelayCount: uniqueCount(motionSignatures.map((signature) => signature.sparkDelay)),
      unitRects,
      motionSignatures,
    };
  });
}

async function readExpeditionCompanionCardGrid(page, selector) {
  return await page.evaluate(async (cardSelector) => {
    await document.fonts?.ready;
    const firstCard = document.querySelector(cardSelector);
    const grid = firstCard?.parentElement || null;
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const gridTemplateColumns = gridStyle?.gridTemplateColumns?.trim() || "";
    const gridColumnCount = gridTemplateColumns && gridTemplateColumns !== "none"
      ? gridTemplateColumns.split(/\s+/).filter(Boolean).length
      : 0;
    const cardRects = Array.from(document.querySelectorAll(cardSelector)).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index: index + 1,
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    });
    const rows = [];
    for (const rect of cardRects.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
      const row = rows.find((candidate) => Math.abs(candidate.y - rect.y) <= 4);
      if (row) {
        row.items.push(rect);
      } else {
        rows.push({ y: rect.y, items: [rect] });
      }
    }
    return {
      selector: cardSelector,
      cardCount: cardRects.length,
      gridDisplay: gridStyle?.display || "",
      gridTemplateColumns,
      gridColumnCount,
      rowCounts: rows.map((row) => row.items.length),
      cardRects,
    };
  }, selector);
}

function collectFailures(metrics, scenario) {
  const failures = [];
  if (!metrics.phoneRect) failures.push("phone frame missing");
  if (metrics.phoneRect?.y < -1) failures.push(`phone frame top clipped ${metrics.phoneRect.y}px`);
  if (metrics.phoneRect && metrics.phoneRect.x < -1) failures.push(`phone frame left clipped ${metrics.phoneRect.x}px`);
  if (metrics.phoneRect && metrics.phoneRect.x + metrics.phoneRect.width > metrics.innerWidth + 1) {
    failures.push("phone frame right clipped");
  }
  if (metrics.horizontalOverflow > 1) failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
  if (scenario === "expedition-debug") {
    if (metrics.expeditionTabCount !== 4) failures.push(`expedition tab count ${metrics.expeditionTabCount}/4`);
  } else if (metrics.tabCount !== 7) {
    failures.push(`tab count ${metrics.tabCount}/7`);
  }
  if (metrics.statusTileCount < 5) failures.push(`status tiles ${metrics.statusTileCount}/5`);
  if (metrics.modeTabCount !== 3) failures.push(`mode tabs ${metrics.modeTabCount}/3`);
  if (metrics.buttonOverflow.length > 0) {
    failures.push(`button overflow: ${metrics.buttonOverflow.map((button) => button.text || "(empty)").join(", ")}`);
  }
  if (metrics.failedImages.length > 0) failures.push(`failed images ${metrics.failedImages.length}`);
  if (scenario === "battle" && metrics.battleEnemyCount < 3) failures.push(`battle enemies ${metrics.battleEnemyCount}/3`);
  if (scenario === "shop-gacha") {
    if (metrics.gachaPopupCount !== 1) failures.push(`gacha popup ${metrics.gachaPopupCount}/1`);
    if (!metrics.modalRect) {
      failures.push("shop modal missing");
    } else if (metrics.modalRect.width > metrics.innerWidth + 1 || metrics.modalRect.height > metrics.innerHeight + 1) {
      failures.push("shop modal exceeds viewport");
    }
  }
  if (scenario === "expedition-debug" && metrics.expeditionUnitCount !== 5) {
    failures.push(`expedition companions ${metrics.expeditionUnitCount}/5`);
  }
  return failures;
}

function collectBattleLayoutParityFailures(student, expedition) {
  const failures = [];
  const requiredStudent = ["sceneRect", "arenaRect", "managementRect", "footerRect", "actionRect", "sceneStyle", "arenaStyle"];
  const requiredExpedition = ["sceneRect", "arenaRect", "managementRect", "footerRect", "actionRect", "sceneStyle", "arenaStyle"];
  for (const key of requiredStudent) {
    if (!student[key]) failures.push(`student layout missing ${key}`);
  }
  for (const key of requiredExpedition) {
    if (!expedition[key]) failures.push(`expedition layout missing ${key}`);
  }
  if (failures.length > 0) return failures;

  const maxDelta = 1;
  const relativeToPhone = (metrics, rectName, edge) => metrics[rectName][edge] - metrics.phoneRect.y;
  const footerGapToArenaBottom = (metrics) => metrics.arenaRect.bottom - metrics.footerRect.bottom;
  const managementGapToScene = (metrics) => metrics.managementRect.y - metrics.sceneRect.bottom;
  const checks = [
    ["scene top in phone", relativeToPhone(student, "sceneRect", "y"), relativeToPhone(expedition, "sceneRect", "y")],
    ["scene bottom in phone", relativeToPhone(student, "sceneRect", "bottom"), relativeToPhone(expedition, "sceneRect", "bottom")],
    ["scene height", student.sceneRect.height, expedition.sceneRect.height],
    ["arena bottom in phone", relativeToPhone(student, "arenaRect", "bottom"), relativeToPhone(expedition, "arenaRect", "bottom")],
    ["arena height", student.arenaRect.height, expedition.arenaRect.height],
    ["footer bottom gap", footerGapToArenaBottom(student), footerGapToArenaBottom(expedition)],
    ["footer height", student.footerRect.height, expedition.footerRect.height],
    ["management gap", managementGapToScene(student), managementGapToScene(expedition)],
  ];
  for (const [label, studentValue, expeditionValue] of checks) {
    const delta = Math.abs(studentValue - expeditionValue);
    if (delta > maxDelta) {
      failures.push(`${label} delta ${delta.toFixed(2)}px (student ${studentValue}, expedition ${expeditionValue})`);
    }
  }

  const styleChecks = [
    ["scene padding top", student.sceneStyle.paddingTop, expedition.sceneStyle.paddingTop],
    ["scene padding bottom", student.sceneStyle.paddingBottom, expedition.sceneStyle.paddingBottom],
    ["scene border top", student.sceneStyle.borderTopWidth, expedition.sceneStyle.borderTopWidth],
    ["scene border bottom", student.sceneStyle.borderBottomWidth, expedition.sceneStyle.borderBottomWidth],
  ];
  for (const [label, studentValue, expeditionValue] of styleChecks) {
    const delta = Math.abs(studentValue - expeditionValue);
    if (delta > maxDelta) {
      failures.push(`${label} delta ${delta.toFixed(2)}px (student ${studentValue}, expedition ${expeditionValue})`);
    }
  }

  if (expedition.arenaRect.height < 226) {
    failures.push(`expedition arena height ${expedition.arenaRect.height}px under 226px`);
  }
  if (expedition.actionRect.height < 31 || expedition.actionRect.height > 34) {
    failures.push(`expedition action button height ${expedition.actionRect.height}px out of battle HUD range`);
  }
  if (expedition.expeditionTabCount !== 4) {
    failures.push(`expedition lower tabs ${expedition.expeditionTabCount}/4`);
  }
  if (!expedition.activeTabLabel.startsWith("성장")) {
    failures.push(`expedition active lower tab ${expedition.activeTabLabel || "(missing)"}/성장`);
  }
  if (!expedition.managementTitle.startsWith("출전 동료 성장")) {
    failures.push(`expedition management title ${expedition.managementTitle || "(missing)"}/출전 동료 성장`);
  }

  return failures;
}

function collectExpeditionPartySlotLayoutFailures(layout) {
  const failures = [];
  if (layout.slotCount !== 5) {
    failures.push(`expedition party slot count ${layout.slotCount}/5`);
    return failures;
  }
  if (layout.rowCounts.length !== 2) {
    failures.push(`expedition party slot rows ${layout.rowCounts.length}/2 (${layout.rowCounts.join("+")})`);
  }
  if (layout.rowCounts[0] !== 3 || layout.rowCounts[1] !== 2) {
    failures.push(`expedition party slot row distribution ${layout.rowCounts.join("+")}/3+2`);
  }
  if (Math.max(...layout.rowCounts) > 3) {
    failures.push(`expedition party slots appear in one row ${layout.rowCounts.join("+")}`);
  }
  return failures;
}

function collectExpeditionBattleUnitLayoutFailures(layout) {
  const failures = [];
  if (layout.unitCount !== 5) {
    failures.push(`expedition battle unit count ${layout.unitCount}/5`);
    return failures;
  }
  if (layout.verticalBandCounts.length < 3) {
    failures.push(`expedition battle unit vertical bands ${layout.verticalBandCounts.length}/3+ (${layout.verticalBandCounts.join("+")})`);
  }
  if (Math.max(...layout.verticalBandCounts) > 2) {
    failures.push(`expedition battle units still read as a horizontal row ${layout.verticalBandCounts.join("+")}`);
  }
  if (layout.frontBandCount !== 1) {
    failures.push(`expedition battle front band should be leader-only, got ${layout.frontBandCount}`);
  }
  if (layout.verticalBandYSpread < 20) {
    failures.push(`expedition battle unit vertical spread ${layout.verticalBandYSpread}px under 20px`);
  }
  if (layout.horizontalCenterSpread < 94) {
    failures.push(`expedition battle unit horizontal spread ${layout.horizontalCenterSpread}px under 94px`);
  }
  if (layout.minimumFootPercent < 64) {
    failures.push(`expedition battle unit feet are above road band: ${layout.minimumFootPercent}% under 64%`);
  }
  const motionNames = layout.motionSignatures.map((signature) => signature.motionName);
  const frameNames = layout.motionSignatures.map((signature) => signature.frameName);
  if (!motionNames.every((name) => name.includes("expeditionUnitRhythm"))) {
    failures.push(`expedition battle unit rhythm animation missing: ${motionNames.join(",")}`);
  }
  if (!frameNames.every((name) => name.includes("expeditionCompanionFrame"))) {
    failures.push(`expedition companion frame cycling missing: ${frameNames.join(",")}`);
  }
  if (layout.uniqueMotionDurationCount < 4) {
    failures.push(`expedition battle unit rhythms too similar: ${layout.uniqueMotionDurationCount}/4 durations`);
  }
  if (layout.uniqueFrameDelayCount < 4) {
    failures.push(`expedition companion frame delays too similar: ${layout.uniqueFrameDelayCount}/4 delays`);
  }
  if (layout.uniqueSparkDelayCount < 4) {
    failures.push(`expedition ally spark delays too similar: ${layout.uniqueSparkDelayCount}/4 delays`);
  }
  return failures;
}

function collectExpeditionCompanionCardGridFailures(layout, label) {
  const failures = [];
  if (layout.cardCount !== 5) {
    failures.push(`${label} companion card count ${layout.cardCount}/5`);
    return failures;
  }
  if (layout.gridDisplay !== "grid") {
    failures.push(`${label} companion container display ${layout.gridDisplay}/grid`);
  }
  if (layout.gridColumnCount > 2) {
    failures.push(`${label} companion grid columns ${layout.gridColumnCount}/2 max`);
  }
  if (layout.rowCounts.length !== 3) {
    failures.push(`${label} companion card rows ${layout.rowCounts.length}/3 (${layout.rowCounts.join("+")})`);
  }
  if (layout.rowCounts[0] !== 2 || layout.rowCounts[1] !== 2 || layout.rowCounts[2] !== 1) {
    failures.push(`${label} companion card row distribution ${layout.rowCounts.join("+")}/2+2+1`);
  }
  if (Math.max(...layout.rowCounts) > 2) {
    failures.push(`${label} companion cards appear in one row ${layout.rowCounts.join("+")}`);
  }
  if (Math.max(...layout.rowCounts) < 2) {
    failures.push(`${label} companion cards remain a single-column list ${layout.rowCounts.join("+")}`);
  }
  return failures;
}

async function auditDefaultViewport(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await seedPage(page, makeSeedState());
  await waitReady(page, baseUrl);
  await capture(page, `default-${viewport.name}`);
  const defaultMetrics = await readMetrics(page, "default");
  defaultMetrics.failures = collectFailures(defaultMetrics, "default");

  await page.locator(".tab").nth(1).click();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, `battle-${viewport.name}`);
  const battleMetrics = await readMetrics(page, "battle");
  battleMetrics.failures = collectFailures(battleMetrics, "battle");
  const studentLayoutMetrics = await readBattleLayoutMetrics(page, "student");

  await page.locator(".mode-tab").nth(1).click();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, `expedition-layout-${viewport.name}`);
  const expeditionLayoutMetrics = await readBattleLayoutMetrics(page, "expedition");
  const battleLayoutParity = {
    student: studentLayoutMetrics,
    expedition: expeditionLayoutMetrics,
    failures: collectBattleLayoutParityFailures(studentLayoutMetrics, expeditionLayoutMetrics),
  };

  await context.close();
  return { defaultMetrics, battleMetrics, battleLayoutParity, pageErrors };
}

async function auditFeatureViewport(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await seedPage(page, makeSeedState({ diamonds: 20000 }));
  await waitReady(page, baseUrl);
  await page.locator(".header-actions .icon-button.shop").click();
  await page.locator(".shop-category").nth(2).click();
  await page.locator(".shop-product .primary-action").first().click();
  await page.waitForSelector(".gacha-popup", { timeout: 5000 });
  await capture(page, `shop-gacha-${viewport.name}`);
  const shopMetrics = await readMetrics(page, "shop-gacha");
  shopMetrics.failures = collectFailures(shopMetrics, "shop-gacha");

  await page.locator(".gacha-popup-close").click();
  await page.locator(".shop-modal .icon-button.dark").click();
  await page.locator(".tab").nth(2).click();
  await page.locator(".header-actions .icon-button").first().click();
  await page.getByRole("button", { name: /동료 랜덤 \+5/ }).click();
  await page.locator(".debug-modal .icon-button.dark").click();
  await page.locator(".mode-tab").nth(1).click();
  await page.waitForSelector(".expedition-unit-avatar.large", { timeout: 5000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, `expedition-debug-${viewport.name}`);
  const expeditionMetrics = await readMetrics(page, "expedition-debug");
  expeditionMetrics.failures = collectFailures(expeditionMetrics, "expedition-debug");
  const expeditionBattleUnitLayout = await readExpeditionBattleUnitLayout(page);
  expeditionBattleUnitLayout.failures = collectExpeditionBattleUnitLayoutFailures(expeditionBattleUnitLayout);
  const expeditionGrowthCardLayout = await readExpeditionCompanionCardGrid(page, ".expedition-growth-card");
  expeditionGrowthCardLayout.failures = collectExpeditionCompanionCardGridFailures(expeditionGrowthCardLayout, "expedition growth");

  await page.locator(".expedition-tab", { hasText: "파티" }).click();
  await page.waitForSelector(".expedition-party-slot", { timeout: 5000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, `expedition-party-slots-${viewport.name}`);
  const expeditionPartyLayout = await readExpeditionPartySlotLayout(page);
  expeditionPartyLayout.failures = collectExpeditionPartySlotLayoutFailures(expeditionPartyLayout);
  const expeditionRosterCardLayout = await readExpeditionCompanionCardGrid(page, ".expedition-roster-card");
  expeditionRosterCardLayout.failures = collectExpeditionCompanionCardGridFailures(expeditionRosterCardLayout, "expedition roster");

  await page.locator(".expedition-tab", { hasText: "동료 관리" }).click();
  await page.waitForSelector(".expedition-manage-card.expedition-manage-member", { timeout: 5000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, `expedition-manage-grid-${viewport.name}`);
  const expeditionManageCardLayout = await readExpeditionCompanionCardGrid(page, ".expedition-manage-card.expedition-manage-member");
  expeditionManageCardLayout.failures = collectExpeditionCompanionCardGridFailures(expeditionManageCardLayout, "expedition manage");

  await context.close();
  return {
    shopMetrics,
    expeditionMetrics,
    expeditionBattleUnitLayout,
    expeditionGrowthCardLayout,
    expeditionPartyLayout,
    expeditionRosterCardLayout,
    expeditionManageCardLayout,
    pageErrors,
  };
}

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ headless: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewports: [],
  failures: [],
};

try {
  for (const viewport of viewports) {
    const { defaultMetrics, battleMetrics, battleLayoutParity, pageErrors } = await auditDefaultViewport(browser, baseUrl, viewport);
    const entry = {
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      default: defaultMetrics,
      battle: battleMetrics,
      battleLayoutParity,
      pageErrors,
    };
    report.viewports.push(entry);
    for (const failure of defaultMetrics.failures) report.failures.push(`${viewport.name} default: ${failure}`);
    for (const failure of battleMetrics.failures) report.failures.push(`${viewport.name} battle: ${failure}`);
    for (const failure of battleLayoutParity.failures) report.failures.push(`${viewport.name} layout-parity: ${failure}`);
    if (pageErrors.length > 0) report.failures.push(`${viewport.name}: pageerror ${pageErrors.join(" | ")}`);
  }

  for (const viewport of viewports.filter((item) => featureViewportNames.has(item.name))) {
    const {
      shopMetrics,
      expeditionMetrics,
      expeditionBattleUnitLayout,
      expeditionGrowthCardLayout,
      expeditionPartyLayout,
      expeditionRosterCardLayout,
      expeditionManageCardLayout,
      pageErrors,
    } = await auditFeatureViewport(browser, baseUrl, viewport);
    const entry = report.viewports.find((item) => item.name === viewport.name);
    entry.shopGacha = shopMetrics;
    entry.expeditionDebug = expeditionMetrics;
    entry.expeditionBattleUnitLayout = expeditionBattleUnitLayout;
    entry.expeditionGrowthCardLayout = expeditionGrowthCardLayout;
    entry.expeditionPartyLayout = expeditionPartyLayout;
    entry.expeditionRosterCardLayout = expeditionRosterCardLayout;
    entry.expeditionManageCardLayout = expeditionManageCardLayout;
    entry.featurePageErrors = pageErrors;
    for (const failure of shopMetrics.failures) report.failures.push(`${viewport.name} shop-gacha: ${failure}`);
    for (const failure of expeditionMetrics.failures) report.failures.push(`${viewport.name} expedition-debug: ${failure}`);
    for (const failure of expeditionBattleUnitLayout.failures) report.failures.push(`${viewport.name} expedition-battle-unit-layout: ${failure}`);
    for (const failure of expeditionGrowthCardLayout.failures) report.failures.push(`${viewport.name} expedition-growth-card-layout: ${failure}`);
    for (const failure of expeditionPartyLayout.failures) report.failures.push(`${viewport.name} expedition-party-layout: ${failure}`);
    for (const failure of expeditionRosterCardLayout.failures) report.failures.push(`${viewport.name} expedition-roster-card-layout: ${failure}`);
    for (const failure of expeditionManageCardLayout.failures) report.failures.push(`${viewport.name} expedition-manage-card-layout: ${failure}`);
    if (pageErrors.length > 0) report.failures.push(`${viewport.name} feature: pageerror ${pageErrors.join(" | ")}`);
  }
} finally {
  await browser.close();
  await closeServer(server);
}

writeFileSync(resolve(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outDir, checked: report.viewports.length, failures: report.failures }, null, 2));

if (report.failures.length > 0) {
  process.exitCode = 1;
}
