import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const snapshotRoot = resolve("dist");
const reactRoot = resolve("dist-react");
const outDir = resolve("artifacts/react-vite-ui-parity-deep-current");
const saveKey = "student-idle-rpg-save-v1";
const fixedNow = 1782230000000;
const categories = ["다이아", "보유금", "문방구", "서점", "광고", "패키지", "패스"];
const freezeAnimations = process.env.REACT_DEEP_PARITY_FREEZE_ANIMATIONS === "1";
const staticAnimations = process.env.REACT_DEEP_PARITY_STATIC_ANIMATIONS !== "0";
const strictVisual = process.env.REACT_DEEP_PARITY_STRICT_VISUAL === "1";
const maxVisualDiffPercent = Number(process.env.REACT_DEEP_PARITY_MAX_DIFF_PERCENT || 0);
const maxVisualMeanAbsDiff = Number(process.env.REACT_DEEP_PARITY_MAX_MEAN_ABS_DIFF || 0);
const visualPixelThreshold = Number(process.env.REACT_DEEP_PARITY_PIXEL_THRESHOLD || 8);
const regionRectTolerance = Number(process.env.REACT_DEEP_PARITY_REGION_RECT_TOLERANCE || 3);
const regionHotspotTileSize = Number(process.env.REACT_DEEP_PARITY_REGION_HOTSPOT_TILE || 32);
const settleMs = Number(process.env.REACT_DEEP_PARITY_SETTLE_MS || (freezeAnimations ? 80 : 900));
const interactionSettleMs = Number(process.env.REACT_DEEP_PARITY_INTERACTION_SETTLE_MS || (freezeAnimations ? 50 : 120));
const gachaSettleMs = Number(process.env.REACT_DEEP_PARITY_GACHA_SETTLE_MS || (freezeAnimations ? 80 : 900));

const styleProperties = [
  "position",
  "display",
  "gridTemplateColumns",
  "alignItems",
  "justifyContent",
  "gap",
  "width",
  "height",
  "minHeight",
  "maxHeight",
  "padding",
  "margin",
  "border",
  "borderRadius",
  "background",
  "backgroundColor",
  "boxShadow",
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontSynthesis",
  "textRendering",
  "webkitFontSmoothing",
  "overflow",
  "opacity",
  "filter",
  "transform",
  "animationName",
  "animationDuration",
  "animationPlayState",
  "zIndex",
  "top",
  "right",
  "bottom",
  "left",
];

const styleSelectors = {
  shop: [
    { name: "modal", selector: ".shop-modal" },
    { name: "header", selector: ".shop-modal .score-modal-header" },
    { name: "wallet", selector: ".shop-wallet" },
    { name: "tabs", selector: ".shop-categories" },
    { name: "tab", selector: ".shop-category" },
    { name: "product", selector: ".shop-product" },
    { name: "primaryAction", selector: ".shop-product .primary-action" },
  ],
  gacha: [
    { name: "backdrop", selector: ".gacha-popup-backdrop" },
    { name: "popup", selector: ".gacha-popup" },
    { name: "close", selector: ".gacha-popup-close" },
    { name: "stage", selector: ".gacha-popup-stage" },
    { name: "stageBefore", selector: ".gacha-popup-stage", pseudo: "::before" },
    { name: "stageAfter", selector: ".gacha-popup-stage", pseudo: "::after" },
    { name: "beam", selector: ".gacha-beam" },
    { name: "gradeBurst", selector: ".gacha-grade-burst" },
    { name: "equipment", selector: ".gacha-equipment.big" },
    { name: "equipmentShine", selector: ".gacha-equipment.big .equipment-shine" },
    { name: "copy", selector: ".gacha-popup-copy" },
    { name: "copyBadge", selector: ".gacha-popup-copy .rarity-badge" },
    { name: "copyTitle", selector: ".gacha-popup-copy h3" },
    { name: "copyName", selector: ".gacha-popup-copy strong" },
    { name: "copyDescription", selector: ".gacha-popup-copy p" },
    { name: "summary", selector: ".gacha-popup-summary" },
    { name: "metric", selector: ".gacha-popup-summary .metric" },
    { name: "metricLabel", selector: ".gacha-popup-summary .metric span" },
    { name: "metricValue", selector: ".gacha-popup-summary .metric strong" },
    { name: "results", selector: ".gacha-popup-results" },
    { name: "card", selector: ".gacha-popup-card" },
    { name: "cardBadge", selector: ".gacha-popup-card b" },
    { name: "cardTitle", selector: ".gacha-popup-card strong" },
    { name: "cardMeta", selector: ".gacha-popup-card span" },
    { name: "cardIndex", selector: ".gacha-popup-card small" },
    { name: "confirm", selector: ".gacha-confirm" },
    { name: "confirmIcon", selector: ".gacha-confirm svg" },
    { name: "confirmText", selector: ".gacha-confirm span" },
  ],
  settings: [
    { name: "modal", selector: ".settings-modal" },
    { name: "header", selector: ".settings-modal .score-modal-header" },
    { name: "body", selector: ".settings-body" },
    { name: "section", selector: ".settings-section" },
    { name: "row", selector: ".setting-row" },
    { name: "icon", selector: ".setting-icon" },
    { name: "switch", selector: ".switch" },
  ],
  debug: [
    { name: "modal", selector: ".debug-modal" },
    { name: "header", selector: ".debug-modal .score-modal-header" },
    { name: "actions", selector: ".debug-actions" },
    { name: "action", selector: ".debug-actions button" },
    { name: "json", selector: ".debug-json" },
    { name: "textarea", selector: ".debug-json textarea" },
  ],
};

const svgSignatureSelectors = {
  settings: [
    { name: "settingIcon", selector: ".setting-row .setting-icon svg" },
  ],
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function makeReactSeedState() {
  return {
    schemaVersion: 2,
    runNumber: 3,
    money: 1200,
    diamonds: 20000,
    workSlots: 5,
    lastIncomeAt: fixedNow,
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
      lastResolvedAt: fixedNow,
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

function makeSnapshotSeedState() {
  const seed = makeReactSeedState();
  return {
    ...seed,
    schemaVersion: 1,
    expedition: {
      stageIndex: 0,
      clearedStageCount: 0,
      lastStageId: null,
      partyMemberIds: [],
    },
  };
}

function resolveRequest(root, url) {
  const rawPath = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const relative = normalize(rawPath === "/" ? "index.html" : rawPath.slice(1));
  const absolute = resolve(join(root, relative));
  if (absolute !== root && !absolute.startsWith(root + sep)) return null;
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return null;
  return absolute;
}

function createStaticServer(root) {
  return createServer((request, response) => {
    const file = resolveRequest(root, request.url || "/");
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

function listenOnce(server, port) {
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

async function listenAvailable(server, preferredPort) {
  for (let port = preferredPort; port < preferredPort + 80; port += 1) {
    try {
      return await listenOnce(server, port);
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(`No available port from ${preferredPort} to ${preferredPort + 79}`);
}

function closeServer(server) {
  return new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())));
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function firstDiff(a, b) {
  if (a === b) return null;
  const left = a.split("\n");
  const right = b.split("\n");
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) {
      return { line: index + 1, snapshot: left[index] ?? null, react: right[index] ?? null };
    }
  }
  return { line: -1, snapshot: a, react: b };
}

async function newSeededPage(browser, url, state) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.addInitScript(({ key, state, freeze }) => {
    localStorage.setItem(key, JSON.stringify(state));
    Math.random = () => 0.25;

    if (!freeze) return;
    const installAnimationFreeze = () => {
      if (document.getElementById("react-deep-parity-animation-freeze")) return;
      const style = document.createElement("style");
      style.id = "react-deep-parity-animation-freeze";
      style.textContent = `
        *, *::before, *::after {
          animation-play-state: paused !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    };

    if (document.documentElement) installAnimationFreeze();
    document.addEventListener("DOMContentLoaded", installAnimationFreeze, { once: true });
  }, { key: saveKey, state, freeze: freezeAnimations });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".phone-frame", { timeout: 15000 });
  await page.waitForTimeout(settleMs);
  return page;
}

async function collectStyleSnapshot(page, scenario) {
  const selectors = styleSelectors[scenario] ?? [];
  return await page.evaluate(({ entries, properties }) => {
    const round = (value) => Math.round(value * 1000) / 1000;
    return entries.map((entry) => {
      const element = document.querySelector(entry.selector);
      if (!element) return { name: entry.name, selector: entry.selector, pseudo: entry.pseudo ?? null, missing: true };

      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element, entry.pseudo || undefined);
      const styles = {};
      for (const property of properties) styles[property] = computed[property];

      return {
        name: entry.name,
        selector: entry.selector,
        pseudo: entry.pseudo ?? null,
        rect: {
          x: round(rect.x),
          y: round(rect.y),
          width: round(rect.width),
          height: round(rect.height),
          top: round(rect.top),
          right: round(rect.right),
          bottom: round(rect.bottom),
          left: round(rect.left),
        },
        styles,
      };
    });
  }, { entries: selectors, properties: styleProperties });
}

async function collectSvgSignatureSnapshot(page, scenario) {
  const selectors = svgSignatureSelectors[scenario] ?? [];
  return await page.evaluate(({ entries }) => {
    const attributeNames = ["d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points"];
    const attributesOf = (element) => Object.fromEntries(
      attributeNames
        .map((attributeName) => [attributeName, element.getAttribute(attributeName)])
        .filter(([, value]) => value !== null),
    );
    return entries.map((entry) => ({
      name: entry.name,
      selector: entry.selector,
      items: Array.from(document.querySelectorAll(entry.selector)).map((element, index) => ({
        index,
        text: (element.closest(".setting-row, button, article, section")?.textContent || "").replace(/\s+/g, " ").trim(),
        className: element.getAttribute("class") || "",
        children: Array.from(element.querySelectorAll("*")).map((child) => ({
          tagName: child.tagName.toLowerCase(),
          attributes: attributesOf(child),
        })),
      })),
    }));
  }, { entries: selectors });
}

async function captureScenario(page, label, scenario) {
  await page.waitForTimeout(scenario === "gacha" ? gachaSettleMs : interactionSettleMs);
  if (staticAnimations) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `,
    });
    await page.waitForTimeout(50);
  }
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
  const screenshot = await page.screenshot({ path: resolve(outDir, `${label}.png`) });
  const styles = await collectStyleSnapshot(page, scenario);
  const svgSignatures = await collectSvgSignatureSnapshot(page, scenario);
  const viewport = page.viewportSize();
  const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio);
  return { screenshot, styles, svgSignatures, viewport, deviceScaleFactor };
}

async function compareScreenshots(browser, snapshotBuffer, reactBuffer) {
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  const result = await page.evaluate(
    async ({ snapshotSrc, reactSrc, pixelThreshold }) => {
      async function loadImage(src) {
        const image = new Image();
        image.decoding = "sync";
        image.src = src;
        await image.decode();
        return image;
      }

      const snapshotImage = await loadImage(snapshotSrc);
      const reactImage = await loadImage(reactSrc);
      const width = Math.min(snapshotImage.width, reactImage.width);
      const height = Math.min(snapshotImage.height, reactImage.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      context.drawImage(snapshotImage, 0, 0);
      const snapshotPixels = context.getImageData(0, 0, width, height).data;
      context.clearRect(0, 0, width, height);
      context.drawImage(reactImage, 0, 0);
      const reactPixels = context.getImageData(0, 0, width, height).data;

      let changedPixels = 0;
      let thresholdChangedPixels = 0;
      let totalAbsDiff = 0;
      let maxChannelDiff = 0;
      const totalPixels = width * height;
      for (let index = 0; index < snapshotPixels.length; index += 4) {
        const red = Math.abs(snapshotPixels[index] - reactPixels[index]);
        const green = Math.abs(snapshotPixels[index + 1] - reactPixels[index + 1]);
        const blue = Math.abs(snapshotPixels[index + 2] - reactPixels[index + 2]);
        const alpha = Math.abs(snapshotPixels[index + 3] - reactPixels[index + 3]);
        const pixelMax = Math.max(red, green, blue, alpha);
        if (pixelMax > 0) changedPixels += 1;
        if (pixelMax > pixelThreshold) thresholdChangedPixels += 1;
        totalAbsDiff += red + green + blue + alpha;
        maxChannelDiff = Math.max(maxChannelDiff, pixelMax);
      }

      return {
        width,
        height,
        snapshotWidth: snapshotImage.width,
        snapshotHeight: snapshotImage.height,
        reactWidth: reactImage.width,
        reactHeight: reactImage.height,
        totalPixels,
        changedPixels,
        diffPercent: Math.round((changedPixels / totalPixels) * 1000000) / 10000,
        pixelThreshold,
        thresholdChangedPixels,
        thresholdDiffPercent: Math.round((thresholdChangedPixels / totalPixels) * 1000000) / 10000,
        meanAbsDiff: Math.round((totalAbsDiff / (totalPixels * 4)) * 10000) / 10000,
        maxChannelDiff,
      };
    },
    {
      snapshotSrc: `data:image/png;base64,${snapshotBuffer.toString("base64")}`,
      reactSrc: `data:image/png;base64,${reactBuffer.toString("base64")}`,
      pixelThreshold: visualPixelThreshold,
    },
  );
  await page.close();
  return result;
}

async function compareScreenshotRegion(browser, snapshotBuffer, reactBuffer, snapshot, react, name) {
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  const result = await page.evaluate(
    async ({ snapshotSrc, reactSrc, snapshotRect, reactRect, snapshotViewport, reactViewport, pixelThreshold, hotspotTileSize, name }) => {
      async function loadImage(src) {
        const image = new Image();
        image.decoding = "sync";
        image.src = src;
        await image.decode();
        return image;
      }

      function imageRect(rect, viewport, image) {
        const scaleX = image.width / viewport.width;
        const scaleY = image.height / viewport.height;
        const x = Math.max(0, Math.round(rect.x * scaleX));
        const y = Math.max(0, Math.round(rect.y * scaleY));
        const width = Math.max(1, Math.round(rect.width * scaleX));
        const height = Math.max(1, Math.round(rect.height * scaleY));
        return {
          x: Math.min(x, image.width - 1),
          y: Math.min(y, image.height - 1),
          width: Math.max(1, Math.min(width, image.width - x)),
          height: Math.max(1, Math.min(height, image.height - y)),
          scaleX,
          scaleY,
        };
      }

      function round(value) {
        return Math.round(value * 10000) / 10000;
      }

      const snapshotImage = await loadImage(snapshotSrc);
      const reactImage = await loadImage(reactSrc);
      const snapshotCrop = imageRect(snapshotRect, snapshotViewport, snapshotImage);
      const reactCrop = imageRect(reactRect, reactViewport, reactImage);
      const width = Math.min(snapshotCrop.width, reactCrop.width);
      const height = Math.min(snapshotCrop.height, reactCrop.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      context.drawImage(snapshotImage, snapshotCrop.x, snapshotCrop.y, width, height, 0, 0, width, height);
      const snapshotPixels = context.getImageData(0, 0, width, height).data;
      context.clearRect(0, 0, width, height);
      context.drawImage(reactImage, reactCrop.x, reactCrop.y, width, height, 0, 0, width, height);
      const reactPixels = context.getImageData(0, 0, width, height).data;

      let changedPixels = 0;
      let thresholdChangedPixels = 0;
      let totalAbsDiff = 0;
      let maxChannelDiff = 0;
      const totalPixels = width * height;
      const tileStats = new Map();
      for (let index = 0; index < snapshotPixels.length; index += 4) {
        const pixelIndex = index / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const red = Math.abs(snapshotPixels[index] - reactPixels[index]);
        const green = Math.abs(snapshotPixels[index + 1] - reactPixels[index + 1]);
        const blue = Math.abs(snapshotPixels[index + 2] - reactPixels[index + 2]);
        const alpha = Math.abs(snapshotPixels[index + 3] - reactPixels[index + 3]);
        const pixelMax = Math.max(red, green, blue, alpha);
        if (pixelMax > 0) changedPixels += 1;
        if (pixelMax > pixelThreshold) {
          thresholdChangedPixels += 1;
          const tileX = Math.floor(x / hotspotTileSize) * hotspotTileSize;
          const tileY = Math.floor(y / hotspotTileSize) * hotspotTileSize;
          const key = `${tileX}:${tileY}`;
          const current = tileStats.get(key) || { x: tileX, y: tileY, thresholdChangedPixels: 0, maxChannelDiff: 0 };
          current.thresholdChangedPixels += 1;
          current.maxChannelDiff = Math.max(current.maxChannelDiff, pixelMax);
          tileStats.set(key, current);
        }
        totalAbsDiff += red + green + blue + alpha;
        maxChannelDiff = Math.max(maxChannelDiff, pixelMax);
      }

      const hotspots = Array.from(tileStats.values())
        .sort((left, right) => right.thresholdChangedPixels - left.thresholdChangedPixels)
        .slice(0, 3)
        .map((hotspot) => ({
          ...hotspot,
          width: Math.min(hotspotTileSize, width - hotspot.x),
          height: Math.min(hotspotTileSize, height - hotspot.y),
          thresholdDiffPercent: round((hotspot.thresholdChangedPixels / (Math.min(hotspotTileSize, width - hotspot.x) * Math.min(hotspotTileSize, height - hotspot.y))) * 100),
        }));

      return {
        name,
        width,
        height,
        snapshotCrop,
        reactCrop,
        totalPixels,
        changedPixels,
        diffPercent: round((changedPixels / totalPixels) * 100),
        pixelThreshold,
        thresholdChangedPixels,
        thresholdDiffPercent: round((thresholdChangedPixels / totalPixels) * 100),
        meanAbsDiff: round(totalAbsDiff / (totalPixels * 4)),
        maxChannelDiff,
        hotspots,
      };
    },
    {
      snapshotSrc: `data:image/png;base64,${snapshotBuffer.toString("base64")}`,
      reactSrc: `data:image/png;base64,${reactBuffer.toString("base64")}`,
      snapshotRect: snapshot.rect,
      reactRect: react.rect,
      snapshotViewport: snapshot.viewport,
      reactViewport: react.viewport,
      pixelThreshold: visualPixelThreshold,
      hotspotTileSize: regionHotspotTileSize,
      name,
    },
  );
  await page.close();
  return result;
}

async function compareRegionVisuals(browser, scenarioName, snapshot, react) {
  const reactByName = new Map((react.styles ?? []).map((entry) => [entry.name, entry]));
  const regions = [];
  for (const snapshotEntry of snapshot.styles ?? []) {
    const reactEntry = reactByName.get(snapshotEntry.name);
    if (!reactEntry || snapshotEntry.missing || reactEntry.missing) continue;
    const rectDiffs = ["x", "y", "width", "height"].filter((property) =>
      Math.abs((snapshotEntry.rect?.[property] ?? 0) - (reactEntry.rect?.[property] ?? 0)) > regionRectTolerance,
    );
    const region = await compareScreenshotRegion(
      browser,
      snapshot.screenshot,
      react.screenshot,
      { rect: snapshotEntry.rect, viewport: snapshot.viewport },
      { rect: reactEntry.rect, viewport: react.viewport },
      snapshotEntry.name,
    );
    regions.push({
      ...region,
      scenario: scenarioName,
      selector: snapshotEntry.selector,
      pseudo: snapshotEntry.pseudo ?? null,
      rectMismatch: rectDiffs.length > 0 ? {
        properties: rectDiffs,
        snapshot: snapshotEntry.rect,
        react: reactEntry.rect,
        tolerance: regionRectTolerance,
      } : null,
    });
  }
  return regions.sort((left, right) => right.thresholdDiffPercent - left.thresholdDiffPercent);
}

async function readShopTexts(browser, url, label, state) {
  const page = await newSeededPage(browser, url, state);
  await page.getByRole("button", { name: "상점" }).click();
  await page.waitForSelector(".shop-modal", { timeout: 6000 });

  const texts = [];
  for (const category of categories) {
    await page.getByRole("button", { name: category }).click();
    await page.waitForTimeout(50);
    const capture = await captureScenario(page, `${label}-shop-${category}`, "shop");
    texts.push({
      category,
      text: normalizeText(await page.locator(".shop-modal").innerText()),
      screenshot: capture.screenshot,
      styles: capture.styles,
      viewport: capture.viewport,
      deviceScaleFactor: capture.deviceScaleFactor,
    });
  }

  await page.close();
  return texts;
}

async function readGachaText(browser, url, label, state) {
  const page = await newSeededPage(browser, url, state);
  await page.getByRole("button", { name: "상점" }).click();
  await page.waitForSelector(".shop-modal", { timeout: 6000 });
  await page.getByRole("button", { name: "문방구" }).click();
  await page.getByRole("button", { name: /뽑기 300/ }).first().click();
  await page.waitForSelector(".gacha-popup", { timeout: 6000 });

  const text = normalizeText(await page.locator(".gacha-popup").innerText());
  const capture = await captureScenario(page, `${label}-gacha`, "gacha");
  await page.close();
  return { text, screenshot: capture.screenshot, styles: capture.styles, viewport: capture.viewport, deviceScaleFactor: capture.deviceScaleFactor };
}

async function readModalText(browser, url, buttonName, selector, label, state) {
  const page = await newSeededPage(browser, url, state);
  await page.getByRole("button", { name: buttonName }).click();
  await page.waitForSelector(selector, { timeout: 6000 });

  const text = normalizeText(await page.locator(selector).innerText());
  const scenario = selector.includes("settings") ? "settings" : selector.includes("debug") ? "debug" : "shop";
  const capture = await captureScenario(page, label, scenario);
  await page.close();
  return { text, screenshot: capture.screenshot, styles: capture.styles, viewport: capture.viewport, deviceScaleFactor: capture.deviceScaleFactor };
}

function compareShop(snapshotShop, reactShop) {
  return categories.map((category, index) => ({
    category,
    equal: snapshotShop[index].text === reactShop[index].text,
    diff: firstDiff(snapshotShop[index].text, reactShop[index].text),
    visual: null,
    styleDiffs: diffStyleSnapshots(snapshotShop[index].styles, reactShop[index].styles),
  }));
}

function diffStyleSnapshots(snapshotStyles, reactStyles) {
  const diffs = [];
  const reactByName = new Map((reactStyles ?? []).map((entry) => [entry.name, entry]));
  for (const snapshotEntry of snapshotStyles ?? []) {
    const reactEntry = reactByName.get(snapshotEntry.name);
    if (!reactEntry) {
      diffs.push({ name: snapshotEntry.name, property: "entry", snapshot: "present", react: "missing" });
      continue;
    }
    if (snapshotEntry.missing || reactEntry.missing) {
      if (snapshotEntry.missing !== reactEntry.missing) {
        diffs.push({ name: snapshotEntry.name, property: "missing", snapshot: Boolean(snapshotEntry.missing), react: Boolean(reactEntry.missing) });
      }
      continue;
    }
    for (const property of ["x", "y", "width", "height", "top", "right", "bottom", "left"]) {
      if (snapshotEntry.rect?.[property] !== reactEntry.rect?.[property]) {
        diffs.push({ name: snapshotEntry.name, property: `rect.${property}`, snapshot: snapshotEntry.rect?.[property], react: reactEntry.rect?.[property] });
      }
    }
    for (const property of styleProperties) {
      const snapshotValue = normalizeStyleValue(property, snapshotEntry.styles?.[property]);
      const reactValue = normalizeStyleValue(property, reactEntry.styles?.[property]);
      if (snapshotValue !== reactValue) {
        diffs.push({ name: snapshotEntry.name, property, snapshot: snapshotEntry.styles?.[property], react: reactEntry.styles?.[property] });
      }
    }
  }
  return diffs;
}

function diffSvgSignatureSnapshots(snapshotSignatures, reactSignatures) {
  const diffs = [];
  const reactByName = new Map((reactSignatures ?? []).map((entry) => [entry.name, entry]));
  for (const snapshotEntry of snapshotSignatures ?? []) {
    const reactEntry = reactByName.get(snapshotEntry.name);
    if (!reactEntry) {
      diffs.push({ name: snapshotEntry.name, property: "entry", snapshot: "present", react: "missing" });
      continue;
    }
    if (snapshotEntry.items.length !== reactEntry.items.length) {
      diffs.push({ name: snapshotEntry.name, property: "count", snapshot: snapshotEntry.items.length, react: reactEntry.items.length });
    }
    const itemCount = Math.min(snapshotEntry.items.length, reactEntry.items.length);
    for (let index = 0; index < itemCount; index += 1) {
      const snapshotItem = snapshotEntry.items[index];
      const reactItem = reactEntry.items[index];
      for (const property of ["text", "className"]) {
        if (snapshotItem[property] !== reactItem[property]) {
          diffs.push({ name: snapshotEntry.name, index, property, snapshot: snapshotItem[property], react: reactItem[property] });
        }
      }
      if (JSON.stringify(snapshotItem.children) !== JSON.stringify(reactItem.children)) {
        diffs.push({ name: snapshotEntry.name, index, property: "children", snapshot: snapshotItem.children, react: reactItem.children });
      }
    }
  }
  return diffs;
}

function normalizeStyleValue(property, value) {
  if (property === "filter" && (value === "none" || value === "brightness(1)")) return "none";
  if (property === "transform" && (value === "none" || value === "matrix(1, 0, 0, 1, 0, 0)")) return "none";
  return value;
}

async function compareScenarioVisuals(browser, scenarioName, snapshot, react) {
  const visual = await compareScreenshots(browser, snapshot.screenshot, react.screenshot);
  const regionVisuals = await compareRegionVisuals(browser, scenarioName, snapshot, react);
  const failures = [];
  if (strictVisual && visual.diffPercent > maxVisualDiffPercent) {
    failures.push(`visual diffPercent ${visual.diffPercent}% > ${maxVisualDiffPercent}%`);
  }
  if (strictVisual && visual.meanAbsDiff > maxVisualMeanAbsDiff) {
    failures.push(`visual meanAbsDiff ${visual.meanAbsDiff} > ${maxVisualMeanAbsDiff}`);
  }
  return {
    scenario: scenarioName,
    visual,
    regionVisuals,
    styleDiffs: diffStyleSnapshots(snapshot.styles, react.styles),
    svgDiffs: diffSvgSignatureSnapshots(snapshot.svgSignatures, react.svgSignatures),
    failures,
  };
}

function collectFailures(report) {
  return [
    ...report.shop.filter((item) => !item.equal).map((item) => `shop:${item.category}`),
    report.gacha.equal ? null : "gacha",
    report.settings.equal ? null : "settings",
    report.debug.equal ? null : "debug",
  ].filter(Boolean);
}

for (const root of [snapshotRoot, reactRoot]) {
  if (!existsSync(resolve(root, "index.html"))) {
    console.error(`${root}/index.html is missing. Run \`npm run build:web\` and \`npm run react:build\` first.`);
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });

const snapshotServer = createStaticServer(snapshotRoot);
const reactServer = createStaticServer(reactRoot);
const snapshotPort = await listenAvailable(snapshotServer, Number(process.env.REACT_DEEP_PARITY_SNAPSHOT_PORT || 5820));
const reactPort = await listenAvailable(reactServer, Number(process.env.REACT_DEEP_PARITY_REACT_PORT || 5860));
const browser = await chromium.launch({ headless: true });
const snapshotUrl = `http://127.0.0.1:${snapshotPort}/`;
const reactUrl = `http://127.0.0.1:${reactPort}/?qaTools=1`;

try {
  const reactSeed = makeReactSeedState();
  const [snapshotShop, reactShop] = await Promise.all([
    readShopTexts(browser, reactUrl, "react-baseline", reactSeed),
    readShopTexts(browser, reactUrl, "react", reactSeed),
  ]);
  const [snapshotGacha, reactGacha] = await Promise.all([
    readGachaText(browser, reactUrl, "react-baseline", reactSeed),
    readGachaText(browser, reactUrl, "react", reactSeed),
  ]);
  const [snapshotSettings, reactSettings] = await Promise.all([
    readModalText(browser, reactUrl, "설정", ".settings-modal", "react-baseline-settings", reactSeed),
    readModalText(browser, reactUrl, "설정", ".settings-modal", "react-settings", reactSeed),
  ]);
  const [snapshotDebug, reactDebug] = await Promise.all([
    readModalText(browser, reactUrl, "디버그 메뉴", ".debug-modal", "react-baseline-debug", reactSeed),
    readModalText(browser, reactUrl, "디버그 메뉴", ".debug-modal", "react-debug", reactSeed),
  ]);

  const shopComparison = compareShop(snapshotShop, reactShop);
  for (let index = 0; index < categories.length; index += 1) {
    shopComparison[index].visual = await compareScreenshots(browser, snapshotShop[index].screenshot, reactShop[index].screenshot);
  }
  const visualComparisons = [
    ...(await Promise.all(
      categories.map((category, index) =>
        compareScenarioVisuals(browser, `shop:${category}`, snapshotShop[index], reactShop[index]),
      ),
    )),
    await compareScenarioVisuals(browser, "gacha", snapshotGacha, reactGacha),
    await compareScenarioVisuals(browser, "settings", snapshotSettings, reactSettings),
    await compareScenarioVisuals(browser, "debug", snapshotDebug, reactDebug),
  ];

  const report = {
    snapshotUrl,
    reactUrl,
    freezeAnimations,
    staticAnimations,
    settleMs,
    interactionSettleMs,
    gachaSettleMs,
    strictVisual,
    visualThresholds: { maxVisualDiffPercent, maxVisualMeanAbsDiff, visualPixelThreshold },
    regionVisualThresholds: { regionRectTolerance, regionHotspotTileSize },
    shop: shopComparison,
    gacha: {
      equal: snapshotGacha.text === reactGacha.text,
      diff: firstDiff(snapshotGacha.text, reactGacha.text),
      visual: visualComparisons.find((item) => item.scenario === "gacha")?.visual ?? null,
      regionVisuals: visualComparisons.find((item) => item.scenario === "gacha")?.regionVisuals ?? [],
      styleDiffs: diffStyleSnapshots(snapshotGacha.styles, reactGacha.styles),
      svgDiffs: visualComparisons.find((item) => item.scenario === "gacha")?.svgDiffs ?? [],
    },
    settings: {
      equal: snapshotSettings.text === reactSettings.text,
      diff: firstDiff(snapshotSettings.text, reactSettings.text),
      visual: visualComparisons.find((item) => item.scenario === "settings")?.visual ?? null,
      regionVisuals: visualComparisons.find((item) => item.scenario === "settings")?.regionVisuals ?? [],
      styleDiffs: diffStyleSnapshots(snapshotSettings.styles, reactSettings.styles),
      svgDiffs: visualComparisons.find((item) => item.scenario === "settings")?.svgDiffs ?? [],
    },
    debug: {
      equal: snapshotDebug.text === reactDebug.text,
      diff: firstDiff(snapshotDebug.text, reactDebug.text),
      visual: visualComparisons.find((item) => item.scenario === "debug")?.visual ?? null,
      regionVisuals: visualComparisons.find((item) => item.scenario === "debug")?.regionVisuals ?? [],
      styleDiffs: diffStyleSnapshots(snapshotDebug.styles, reactDebug.styles),
      svgDiffs: visualComparisons.find((item) => item.scenario === "debug")?.svgDiffs ?? [],
    },
    visualComparisons,
  };
  const failures = collectFailures(report);
  for (const visualComparison of visualComparisons) failures.push(...visualComparison.failures.map((failure) => `${visualComparison.scenario}:${failure}`));
  for (const visualComparison of visualComparisons) {
    if ((visualComparison.svgDiffs ?? []).length > 0) failures.push(`${visualComparison.scenario}:svgDiffs ${visualComparison.svgDiffs.length}`);
  }
  writeFileSync(resolve(outDir, "text-report.json"), JSON.stringify({ ...report, failures }, null, 2));
  console.log(JSON.stringify({ ...report, failures }, null, 2));

  if (failures.length > 0) {
    console.error(`REACT_VITE_DEEP_PARITY_FAILED ${failures.join(", ")}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await closeServer(snapshotServer);
  await closeServer(reactServer);
}
