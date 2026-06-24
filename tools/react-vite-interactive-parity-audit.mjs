import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const snapshotRoot = resolve("dist");
const reactRoot = resolve("dist-react");
const outDir = resolve("artifacts/react-vite-interactive-parity");
const saveKey = "student-idle-rpg-save-v1";
const fixedNow = 1782230000000;
const viewport = { width: 390, height: 844 };
const settleMs = Number(process.env.REACT_INTERACTIVE_PARITY_SETTLE_MS || 180);
const visualPixelThreshold = Number(process.env.REACT_INTERACTIVE_PARITY_PIXEL_THRESHOLD || 8);
const strictVisual = process.env.REACT_INTERACTIVE_PARITY_STRICT_VISUAL === "1";
const maxStrictVisualDiff = Number(process.env.REACT_INTERACTIVE_PARITY_MAX_VISUAL_DIFF || 0.25);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const studentTabs = ["성장", "시험", "동료", "직장", "교육", "결과", "도감"];
const expeditionTabs = ["성장", "파티", "동료 관리", "기록"];
const selectorProbeList = [
  { key: "headerActionButton", selector: ".app-header .icon-button, .topbar .icon-button", limit: 3 },
  { key: "battleScene", selector: ".react-battle-arena.stage-scene, .stage-scene", limit: 1 },
  { key: "battlePixelArena", selector: ".pixel-arena", limit: 1 },
  { key: "battleBackgroundSheet", selector: ".arena-background-sheet", limit: 1 },
  { key: "battleSpeechBubble", selector: ".speech-bubble.student", limit: 1 },
  { key: "battleStudentSprite", selector: ".student-sprite", limit: 1 },
  { key: "battleStudentArt", selector: ".student-art", limit: 1 },
  { key: "battleLineup", selector: ".battle-scene-lineup", limit: 1 },
  { key: "battleEnemy", selector: ".battle-scene-enemy", limit: 5 },
  { key: "battleEnemyMonsterArt", selector: ".battle-scene-enemy .battle-scene-monster-art", limit: 5 },
  { key: "battleEnemyHp", selector: ".battle-scene-enemy .battle-scene-hp", limit: 5 },
  { key: "battleEnemyHpFill", selector: ".battle-scene-enemy .battle-scene-hp i", limit: 5 },
  { key: "battleProgress", selector: ".battle-arena-progress", limit: 1 },
  { key: "battleProgressFill", selector: ".battle-arena-progress .progress-bar span", limit: 1 },
  { key: "battleDebugButton", selector: ".battle-debug-complete", limit: 1 },
  { key: "battleAutoToggle", selector: ".battle-auto-toggle", limit: 1 },
  { key: "examPanel", selector: ".management-panel .viewport", limit: 1 },
  { key: "examTitle", selector: ".management-panel .viewport .section-title", limit: 1 },
  { key: "examCountBadge", selector: ".management-panel .viewport .count-badge", limit: 1 },
  { key: "examSummary", selector: ".battle-summary-panel", limit: 1 },
  { key: "examEnemyGrid", selector: ".battle-enemy-grid", limit: 1 },
  { key: "examEnemyCard", selector: ".battle-enemy-card", limit: 3 },
  { key: "examEnemyMonster", selector: ".battle-enemy-card .battle-enemy-monster", limit: 3 },
  { key: "examEnemyLabel", selector: ".battle-enemy-card strong", limit: 3 },
  { key: "examEnemyKind", selector: ".battle-enemy-card > div:first-of-type span", limit: 3 },
  { key: "examEnemyHpBar", selector: ".battle-enemy-card .enemy-hp-bar", limit: 3 },
  { key: "examEnemyHpFill", selector: ".battle-enemy-card .enemy-hp-bar i", limit: 3 },
  { key: "examEnemyHpText", selector: ".battle-enemy-card small", limit: 3 },
  { key: "examPrimaryAction", selector: ".management-panel .viewport .primary-action", limit: 1 },
  { key: "examEmptyState", selector: ".management-panel .viewport .empty-state", limit: 1 },
  { key: "resultPanel", selector: ".result-panel, .management-panel > .viewport", limit: 1 },
  { key: "resultTitle", selector: ".result-panel > .stack > .section-title, .management-panel > .viewport > .stack > .section-title", limit: 1 },
  { key: "resultTitleIcon", selector: ".result-panel > .stack > .section-title svg, .management-panel > .viewport > .stack > .section-title svg", limit: 1 },
  { key: "resultAdmissionPanel", selector: ".result-panel > .stack > .panel:nth-of-type(2), .management-panel > .viewport > .stack > .panel:nth-of-type(2)", limit: 1 },
  { key: "resultAdmissionTitle", selector: ".result-panel > .stack > .panel:nth-of-type(2) .section-title, .management-panel > .viewport > .stack > .panel:nth-of-type(2) .section-title", limit: 1 },
  { key: "resultAdmissionIcon", selector: ".result-panel > .stack > .panel:nth-of-type(2) .section-title svg, .management-panel > .viewport > .stack > .panel:nth-of-type(2) .section-title svg", limit: 1 },
  { key: "resultHistoryPanel", selector: ".result-panel > .stack > .panel:nth-of-type(3), .management-panel > .viewport > .stack > .panel:nth-of-type(3)", limit: 1 },
  { key: "resultHistoryTitle", selector: ".result-panel > .stack > .panel:nth-of-type(3) .section-title, .management-panel > .viewport > .stack > .panel:nth-of-type(3) .section-title", limit: 1 },
  { key: "resultHistoryIcon", selector: ".result-panel > .stack > .panel:nth-of-type(3) .section-title svg, .management-panel > .viewport > .stack > .panel:nth-of-type(3) .section-title svg", limit: 1 },
  { key: "resultEmptyState", selector: ".result-panel .empty-state, .management-panel > .viewport .empty-state", limit: 4 },
  { key: "resultIconPath", selector: ".result-panel svg *, .management-panel > .viewport svg *", limit: 32 },
  { key: "archiveTitle", selector: ".management-panel .archive-panel .section-title, .management-panel .stack .section-title", limit: 1 },
  { key: "archiveSummary", selector: ".management-panel .archive-panel .income-panel, .management-panel .stack .income-panel", limit: 1 },
  { key: "collectionBonus", selector: ".collection-bonus-panel", limit: 1 },
  { key: "collectionEffectItem", selector: ".collection-effect-item", limit: 4 },
  { key: "careerBook", selector: ".career-book", limit: 1 },
  { key: "careerCard", selector: ".career-card", limit: 8 },
  { key: "careerCardHeader", selector: ".career-card header", limit: 8 },
  { key: "careerCardTitle", selector: ".career-card header strong", limit: 8 },
  { key: "careerCardSubtitle", selector: ".career-card header small", limit: 8 },
  { key: "careerCardStatus", selector: ".career-card header b", limit: 8 },
  { key: "careerEmblem", selector: ".career-card .career-emblem", limit: 8 },
  { key: "careerMeta", selector: ".career-meta", limit: 8 },
  { key: "careerMetaChip", selector: ".career-meta span", limit: 24 },
  { key: "careerGuideButton", selector: ".career-guide-button", limit: 8 },
  { key: "careerGuideIcon", selector: ".career-guide-button svg", limit: 8 },
  { key: "careerGuideIconPath", selector: ".career-guide-button svg *", limit: 24 },
  { key: "careerGuideText", selector: ".career-guide-button span", limit: 8 },
  { key: "careerWeightRow", selector: ".career-card .weight-row", limit: 40 },
  { key: "careerWeightLabel", selector: ".career-card .weight-row > span", limit: 40 },
  { key: "careerWeightValue", selector: ".career-card .weight-row > b", limit: 40 },
  { key: "careerWeightTrack", selector: ".career-card .weight-row > div", limit: 40 },
  { key: "careerWeightFill", selector: ".career-card .weight-row > div > i", limit: 40 },
];
const selectorStyleProperties = [
  "display",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gap",
  "rowGap",
  "columnGap",
  "alignItems",
  "justifyContent",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginBottom",
  "minHeight",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "color",
  "opacity",
  "backgroundColor",
  "backgroundImage",
  "backgroundPosition",
  "backgroundSize",
  "borderTopWidth",
  "borderTopColor",
  "borderRadius",
  "boxShadow",
  "filter",
  "transform",
];

for (const root of [snapshotRoot, reactRoot]) {
  if (!existsSync(resolve(root, "index.html"))) {
    console.error(`${root}/index.html is missing. Run \`npm run build:web\` and \`npm run react:build\` first.`);
    process.exit(1);
  }
}

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
      stats: { korean: 45, english: 42, math: 44, social: 0, science: 0 },
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
      road: {
        mode: "school",
        phase: "travel",
        encounterIndex: 0,
        encounterTotal: 4,
        phaseStartedAt: fixedNow,
        lastCompletedEncounterId: null,
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
    .replace(/제한시간\s+\d+초/g, "제한시간 <초>")
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
    if (left[index] !== right[index]) return { line: index + 1, snapshot: left[index] ?? null, react: right[index] ?? null };
  }
  return { line: -1, snapshot: a, react: b };
}

function compactState(raw) {
  if (!raw) return null;
  const state = JSON.parse(raw);
  const expedition = state.expedition || {};
  const members = Array.isArray(expedition.members) ? expedition.members : [];
  const party = Array.isArray(expedition.partyMemberIds) ? expedition.partyMemberIds : [];
  return {
    runNumber: state.runNumber,
    money: state.money,
    diamonds: state.diamonds,
    companionCount: Array.isArray(state.companions) ? state.companions.length : 0,
    robotCount: Array.isArray(state.companions) ? state.companions.filter((item) => item.kind === "robot-helper" || item.source === "robot" || String(item.spriteAsset || "").startsWith("helper-")).length : 0,
    careerCount: Array.isArray(state.companions) ? state.companions.filter((item) => item.kind === "career" || item.careerId).length : 0,
    expeditionMemberCount: members.length,
    partyMemberCount: party.length,
    currentStage: expedition.currentStage ?? ((expedition.stageIndex ?? 0) + 1),
    highestStage: expedition.highestStage ?? expedition.clearedStageCount ?? 0,
    trainingExp: expedition.trainingExp ?? expedition.chapterRun?.tempExp ?? 0,
    stageIndex: expedition.stageIndex ?? Math.max(0, (expedition.currentStage ?? 1) - 1),
    clearedStageCount: expedition.clearedStageCount ?? expedition.highestStage ?? 0,
    expeditionLogCount: Array.isArray(expedition.log) ? expedition.log.length : 0,
  };
}

async function newSeededPage(browser, url, state) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.addInitScript(({ key, state, now }) => {
    localStorage.setItem(key, JSON.stringify(state));
    Math.random = () => 0.25;
    Date.now = () => now;
    if (window.performance?.now) {
      Object.defineProperty(window.performance, "now", { value: () => 0, configurable: true });
    }
    window.setInterval = () => 0;
    const installFreeze = () => {
      if (document.getElementById("react-interactive-parity-freeze")) return;
      const style = document.createElement("style");
      style.id = "react-interactive-parity-freeze";
      style.textContent = `
        *, *::before, *::after {
          animation-play-state: paused !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.documentElement) installFreeze();
    document.addEventListener("DOMContentLoaded", installFreeze, { once: true });
  }, { key: saveKey, state, now: fixedNow });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".phone-frame", { timeout: 15000 });
  await page.waitForTimeout(settleMs);
  return page;
}

async function clickButton(page, name, options = {}) {
  const locatorOptions = typeof name === "string" ? { name, exact: options.exact ?? false } : { name };
  await page.getByRole("button", locatorOptions).first().click({ timeout: 8000 });
  await page.waitForTimeout(options.settleMs ?? settleMs);
}

async function clickFirstEnabledButton(page, name, options = {}) {
  const locatorOptions = typeof name === "string" ? { name, exact: options.exact ?? false } : { name };
  const buttons = page.getByRole("button", locatorOptions);
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isDisabled().catch(() => true)) continue;
    await button.click({ timeout: 8000 });
    await page.waitForTimeout(options.settleMs ?? settleMs);
    return true;
  }
  return false;
}

async function clickSelector(page, selector, options = {}) {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) return false;
  if ((await locator.isDisabled().catch(() => false)) && !options.force) return false;
  await locator.click({ timeout: 8000, force: options.force ?? false });
  await page.waitForTimeout(options.settleMs ?? settleMs);
  return true;
}

async function collectMetrics(page) {
  return await page.evaluate(({ key, selectorProbeList, selectorStyleProperties }) => {
    const round = (value) => Math.round(value * 100) / 100;
    const cleanText = (value) => (value || "").trim().replace(/\s+/g, " ");
    const rectOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        centerX: round(rect.x + rect.width / 2),
        centerY: round(rect.y + rect.height / 2),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        left: round(rect.left),
      };
    };
    const rectOfButtonText = (patterns) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const button = buttons.find((candidate) => patterns.some((pattern) => cleanText(candidate.innerText || candidate.textContent || "").includes(pattern)));
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        centerX: round(rect.x + rect.width / 2),
        centerY: round(rect.y + rect.height / 2),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        left: round(rect.left),
      };
    };
    const labels = (selector) => Array.from(document.querySelectorAll(selector)).map((element) => cleanText(element.getAttribute("aria-label") || element.textContent || ""));
    const rectsOf = (selector) => Array.from(document.querySelectorAll(selector)).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index: index + 1,
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        centerX: round(rect.x + rect.width / 2),
        centerY: round(rect.y + rect.height / 2),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        left: round(rect.left),
      };
    });
    const rowSignature = (selector, tolerance = 4) => {
      const rects = rectsOf(selector).filter((rect) => rect.width > 0 && rect.height > 0);
      const rows = [];
      for (const rect of rects.slice().sort((left, right) => left.y - right.y || left.x - right.x)) {
        const row = rows.find((candidate) => Math.abs(candidate.y - rect.y) <= tolerance);
        if (row) {
          row.items.push(rect);
        } else {
          rows.push({ y: rect.y, items: [rect] });
        }
      }
      return {
        selector,
        count: rects.length,
        rowCounts: rows.map((row) => row.items.length),
        rowYValues: rows.map((row) => row.y),
        rects,
      };
    };
    const semanticTextBlocks = (selector, limit = 12) => Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, limit)
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          index: index + 1,
          tagName: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? cleanText(element.className) : "",
          text: cleanText(element.innerText || element.textContent || ""),
          rect: {
            x: round(rect.x),
            y: round(rect.y),
            width: round(rect.width),
            height: round(rect.height),
          },
        };
      });
    const visibleButtonLabels = (selector, limit = 12) => Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, limit)
      .map((element) => cleanText(element.innerText || element.textContent || ""));
    const verticalBandSignature = (selector, tolerance = 8) => {
      const rects = rectsOf(selector).filter((rect) => rect.width > 0 && rect.height > 0);
      const bands = [];
      for (const rect of rects.slice().sort((left, right) => left.y - right.y || left.x - right.x)) {
        const band = bands.find((candidate) => Math.abs(candidate.y - rect.y) <= tolerance);
        if (band) {
          band.items.push(rect);
        } else {
          bands.push({ y: rect.y, items: [rect] });
        }
      }
      const yValues = rects.map((rect) => rect.y);
      const xCenters = rects.map((rect) => rect.centerX);
      return {
        selector,
        count: rects.length,
        bandCounts: bands.map((band) => band.items.length),
        bandYValues: bands.map((band) => band.y),
        frontBandCount: bands.length > 0 ? bands[bands.length - 1].items.length : 0,
        ySpread: yValues.length > 0 ? round(Math.max(...yValues) - Math.min(...yValues)) : 0,
        horizontalCenterSpread: xCenters.length > 0 ? round(Math.max(...xCenters) - Math.min(...xCenters)) : 0,
        rects,
      };
    };
    const elementMetric = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const attributes = Object.fromEntries(Array.from(element.attributes || [])
        .filter((attribute) => ["class", "d", "fill", "height", "stroke", "stroke-linecap", "stroke-linejoin", "stroke-width", "viewBox", "width", "x1", "x2", "xmlns", "y1", "y2"].includes(attribute.name))
        .map((attribute) => [attribute.name, attribute.value]));
      return {
        tagName: element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className : "",
        attributes,
        source: element instanceof HTMLImageElement ? element.currentSrc || element.src : "",
        naturalWidth: element instanceof HTMLImageElement ? element.naturalWidth : 0,
        naturalHeight: element instanceof HTMLImageElement ? element.naturalHeight : 0,
        text: cleanText(element.innerText || element.textContent || ""),
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
        style: Object.fromEntries(selectorStyleProperties.map((property) => [property, style[property]])),
      };
    };
    const selectorMetrics = Object.fromEntries(selectorProbeList.map((probe) => {
      const elements = Array.from(document.querySelectorAll(probe.selector));
      const limit = Math.max(1, probe.limit || 1);
      return [
        probe.key,
        {
          selector: probe.selector,
          count: elements.length,
          items: elements.slice(0, limit).map((element) => elementMetric(element)),
        },
      ];
    }));
    const stableText = () => {
      const selectors = [
        ".app-header, .topbar",
        ".status-grid, .status-strip",
        ".mode-switch",
        ".battle-arena-overlay",
        ".battle-auto-toggle",
        ".expedition-scene",
        ".management-panel, .expedition-management-panel",
        ".shop-modal, .settings-modal, .debug-modal, .gacha-popup",
      ];
      const seen = new Set();
      const blocks = [];
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          if (seen.has(element)) continue;
          seen.add(element);
          const text = cleanText(element.innerText || element.textContent || "");
          if (text) blocks.push(text);
        }
      }
      return blocks.join("\n");
    };
    const body = document.body;
    const doc = document.documentElement;
    const hasStudentTabs = document.querySelectorAll(".tab").length > 0;
    const buttonOverflow = Array.from(document.querySelectorAll("button"))
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) return false;
        return button.scrollWidth > Math.ceil(rect.width) + 2 || button.scrollHeight > Math.ceil(rect.height) + 2;
      })
      .map((button) => cleanText(button.textContent || button.getAttribute("aria-label") || ""));
    const stateRaw = localStorage.getItem(key);
    return {
      title: document.title,
      text: stableText(),
      horizontalOverflow: Math.max(body.scrollWidth, doc.scrollWidth) - window.innerWidth,
      buttonOverflow,
      studentTabLabels: labels(".tab"),
      expeditionTabLabels: labels(".expedition-tab"),
      activeStudentTab: labels(".tab.active")[0] || "",
      activeExpeditionTab: labels(".expedition-tab.active")[0] || "",
      counts: {
        studentTabs: document.querySelectorAll(".tab").length,
        expeditionTabs: document.querySelectorAll(".expedition-tab").length,
        statusTiles: document.querySelectorAll(".status-tile").length,
        modeTabs: document.querySelectorAll(".mode-tab").length,
        companions: document.querySelectorAll(".companion-card").length,
        expeditionUnits: document.querySelectorAll(".expedition-unit-avatar.large").length,
        growthCards: document.querySelectorAll(".expedition-growth-card").length,
        partyCards: document.querySelectorAll(".expedition-party-slot, .expedition-roster-card").length,
        manageCards: document.querySelectorAll(".expedition-manage-card").length,
        logItems: document.querySelectorAll(".expedition-log-item").length,
        shopModal: document.querySelectorAll(".shop-modal").length,
        settingsModal: document.querySelectorAll(".settings-modal").length,
        debugModal: document.querySelectorAll(".debug-modal").length,
      },
      rects: {
        phone: rectOf(".phone-frame"),
        header: rectOf(".app-header, .topbar"),
        status: rectOf(".status-grid, .status-strip"),
        modeSwitch: rectOf(".mode-switch"),
        scene: rectOf(".react-battle-arena.stage-scene, .stage-scene, .battle-scene, .expedition-scene"),
        arena: rectOf(".pixel-arena, .expedition-arena"),
        footer: rectOf(".battle-arena-overlay, .expedition-scene-footer"),
        action: rectOf(".battle-auto-toggle, .expedition-action-button, button.expedition-scene-run") || rectOfButtonText(["돌파", "보스전"]),
        lowerTabs: rectOf(".tab-bar, .tabbar, .tabs, .expedition-tabbar"),
        activePanel: rectOf(".management-panel, .expedition-management-panel") || rectOf(".expedition-viewport") || rectOf(".viewport"),
        activePanelTitle: hasStudentTabs ? rectOf(".management-panel .section-title") : null,
      },
      selectorMetrics,
      semanticSignatures: {
        activePanelTitleText: cleanText(document.querySelector(".management-panel .section-title h2, .expedition-management-panel .section-title h2, .expedition-viewport .section-title h2")?.textContent || ""),
        activePanelText: cleanText(document.querySelector(".management-panel, .expedition-management-panel, .expedition-viewport, .viewport")?.innerText || ""),
        activePanelButtons: visibleButtonLabels(".management-panel button, .expedition-management-panel button, .expedition-viewport button, .viewport button", 20),
        expeditionCardTexts: semanticTextBlocks(".expedition-growth-card, .expedition-party-slot, .expedition-roster-card, .expedition-manage-card, .expedition-log-item", 16),
      },
      layoutSignatures: {
        expeditionBattleUnits: verticalBandSignature(".expedition-unit-avatar.large", 8),
        expeditionPartySlots: rowSignature(".expedition-party-slot", 4),
        expeditionGrowthCards: rowSignature(".expedition-growth-card", 4),
        expeditionRosterCards: rowSignature(".expedition-roster-card", 4),
        expeditionManageCards: rowSignature(".expedition-manage-card.expedition-manage-member, .expedition-manage-card", 4),
        expeditionLogItems: rowSignature(".expedition-log-item", 4),
        battleEnemies: rowSignature(".battle-scene-enemy", 4),
        battleEnemyHpBars: rowSignature(".battle-scene-hp", 4),
      },
      stateRaw,
    };
  }, { key: saveKey, selectorProbeList, selectorStyleProperties });
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
        totalPixels,
        changedPixels,
        diffPercent: Math.round((changedPixels / totalPixels) * 1000000) / 10000,
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

async function compareScreenshotRegions(browser, snapshotBuffer, reactBuffer, snapshotRects, reactRects) {
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  const result = await page.evaluate(
    async ({ snapshotSrc, reactSrc, pixelThreshold, snapshotRects, reactRects, viewport }) => {
      async function loadImage(src) {
        const image = new Image();
        image.decoding = "sync";
        image.src = src;
        await image.decode();
        return image;
      }
      function roundedRect(rect, scaleX, scaleY, maxWidth, maxHeight) {
        const x = Math.max(0, Math.round(rect.x * scaleX));
        const y = Math.max(0, Math.round(rect.y * scaleY));
        const width = Math.max(1, Math.min(maxWidth - x, Math.round(rect.width * scaleX)));
        const height = Math.max(1, Math.min(maxHeight - y, Math.round(rect.height * scaleY)));
        return { x, y, width, height };
      }
      function compareRegion(context, snapshotImage, reactImage, rect) {
        const { x, y, width, height } = rect;
        context.clearRect(0, 0, width, height);
        context.drawImage(snapshotImage, x, y, width, height, 0, 0, width, height);
        const snapshotPixels = context.getImageData(0, 0, width, height).data;
        context.clearRect(0, 0, width, height);
        context.drawImage(reactImage, x, y, width, height, 0, 0, width, height);
        const reactPixels = context.getImageData(0, 0, width, height).data;
        let changedPixels = 0;
        let thresholdChangedPixels = 0;
        let totalAbsDiff = 0;
        let maxChannelDiff = 0;
        const totalPixels = width * height;
        const cellSize = 32;
        const cells = new Map();
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
          if (pixelMax > 0) {
            const pixel = index / 4;
            const pixelX = pixel % width;
            const pixelY = Math.floor(pixel / width);
            const cellX = Math.floor(pixelX / cellSize);
            const cellY = Math.floor(pixelY / cellSize);
            const cellKey = `${cellX}:${cellY}`;
            let cell = cells.get(cellKey);
            if (!cell) {
              cell = {
                x: cellX * cellSize,
                y: cellY * cellSize,
                width: Math.min(cellSize, width - cellX * cellSize),
                height: Math.min(cellSize, height - cellY * cellSize),
                changedPixels: 0,
                thresholdChangedPixels: 0,
                totalAbsDiff: 0,
                maxChannelDiff: 0,
              };
              cells.set(cellKey, cell);
            }
            cell.changedPixels += 1;
            if (pixelMax > pixelThreshold) cell.thresholdChangedPixels += 1;
            cell.totalAbsDiff += red + green + blue + alpha;
            cell.maxChannelDiff = Math.max(cell.maxChannelDiff, pixelMax);
          }
        }
        const hotspots = Array.from(cells.values())
          .filter((cell) => cell.thresholdChangedPixels > 0)
          .map((cell) => {
            const cellPixels = cell.width * cell.height;
            return {
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              changedPixels: cell.changedPixels,
              thresholdChangedPixels: cell.thresholdChangedPixels,
              thresholdDiffPercent: Math.round((cell.thresholdChangedPixels / cellPixels) * 1000000) / 10000,
              meanAbsDiff: Math.round((cell.totalAbsDiff / (cellPixels * 4)) * 10000) / 10000,
              maxChannelDiff: cell.maxChannelDiff,
            };
          })
          .sort((left, right) => right.thresholdChangedPixels - left.thresholdChangedPixels || right.meanAbsDiff - left.meanAbsDiff)
          .slice(0, 8);
        return {
          width,
          height,
          totalPixels,
          changedPixels,
          diffPercent: Math.round((changedPixels / totalPixels) * 1000000) / 10000,
          thresholdChangedPixels,
          thresholdDiffPercent: Math.round((thresholdChangedPixels / totalPixels) * 1000000) / 10000,
          meanAbsDiff: Math.round((totalAbsDiff / (totalPixels * 4)) * 10000) / 10000,
          maxChannelDiff,
          hotspots,
        };
      }

      const snapshotImage = await loadImage(snapshotSrc);
      const reactImage = await loadImage(reactSrc);
      const scaleX = snapshotImage.width / viewport.width;
      const scaleY = snapshotImage.height / viewport.height;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const output = {};
      for (const key of ["scene", "activePanel"]) {
        const snapshotRect = snapshotRects[key];
        const reactRect = reactRects[key];
        if (!snapshotRect || !reactRect) continue;
        const sameRect = Math.abs(snapshotRect.x - reactRect.x) <= 3
          && Math.abs(snapshotRect.y - reactRect.y) <= 3
          && Math.abs(snapshotRect.width - reactRect.width) <= 3
          && Math.abs(snapshotRect.height - reactRect.height) <= 3;
        if (!sameRect) continue;
        const rect = roundedRect(snapshotRect, scaleX, scaleY, snapshotImage.width, snapshotImage.height);
        canvas.width = rect.width;
        canvas.height = rect.height;
        output[key] = compareRegion(context, snapshotImage, reactImage, rect);
      }
      return output;
    },
    {
      snapshotSrc: `data:image/png;base64,${snapshotBuffer.toString("base64")}`,
      reactSrc: `data:image/png;base64,${reactBuffer.toString("base64")}`,
      pixelThreshold: visualPixelThreshold,
      snapshotRects,
      reactRects,
      viewport,
    },
  );
  await page.close();
  return result;
}

function diffState(snapshot, react) {
  const diffs = [];
  const snapshotState = compactState(snapshot.stateRaw);
  const reactState = compactState(react.stateRaw);
  for (const key of Object.keys(snapshotState || {})) {
    if (snapshotState[key] !== reactState?.[key]) {
      diffs.push({ key, snapshot: snapshotState[key], react: reactState?.[key] });
    }
  }
  return { snapshot: snapshotState, react: reactState, diffs };
}

function diffRects(snapshotRects, reactRects) {
  const diffs = [];
  for (const key of Object.keys(snapshotRects)) {
    const maxDelta = key === "activePanelTitle" ? 3 : 1;
    const left = snapshotRects[key];
    const right = reactRects[key];
    if (!left || !right) {
      if (Boolean(left) !== Boolean(right)) diffs.push({ key, property: "missing", snapshot: Boolean(left), react: Boolean(right) });
      continue;
    }
    for (const property of ["x", "y", "width", "height", "bottom"]) {
      const delta = Math.abs(left[property] - right[property]);
      if (delta > maxDelta) diffs.push({ key, property, snapshot: left[property], react: right[property], delta: Math.round(delta * 100) / 100 });
    }
  }
  return diffs;
}

function diffSelectorMetrics(snapshotSelectors, reactSelectors, label) {
  const diffs = [];
  const normalizeClassName = (value) => String(value || "").trim().replace(/\s+/g, " ");
  const normalizeAssetReference = (value) => String(value || "")
    .replace(/https?:\/\/[^/]+\/assets\//g, "assets/")
    .replace(/([/("][^/(")]*-[^/(")]*)-[A-Za-z0-9_]{6,}(?=\.(png|jpg|jpeg|webp|svg))/g, "$1");
  const equivalentField = (key, property, leftValue, rightValue) => {
    if (property === "className") {
      const leftClassName = normalizeClassName(leftValue);
      const rightClassName = normalizeClassName(rightValue);
      if (key === "battleScene") {
        return leftClassName === rightClassName.replace(/\breact-battle-arena\b/g, "").trim().replace(/\s+/g, " ");
      }
      if (key === "battleStudentSprite") {
        return leftClassName === rightClassName.replace(/\bactive\b/g, "").trim().replace(/\s+/g, " ");
      }
      if (key === "battleEnemyMonsterArt") {
        const normalizeMonsterArtClass = (value) => value
          .replace(/\bmonster-art\b/g, "")
          .replace(/\bmain-monster-[0-9]+\b/g, "")
          .trim()
          .replace(/\s+/g, " ");
        return normalizeMonsterArtClass(leftClassName) === normalizeMonsterArtClass(rightClassName);
      }
      if (key === "examPanel") {
        return leftClassName === rightClassName.replace(/\bexam-panel\b/g, "").trim().replace(/\s+/g, " ");
      }
      if (key === "resultPanel") {
        return leftClassName === rightClassName.replace(/\bresult-panel\b/g, "").trim().replace(/\s+/g, " ");
      }
      if (key === "resultAdmissionPanel" || key === "resultHistoryPanel") {
        return leftClassName === rightClassName.replace(/\bresult-empty-section\b/g, "").trim().replace(/\s+/g, " ");
      }
      if (key === "archiveSummary") {
        return leftClassName === rightClassName.replace(/\barchive-summary-grid\b/g, "").trim().replace(/\s+/g, " ");
      }
      return leftClassName === rightClassName;
    }
    if (key === "battleBackgroundSheet" && ["source", "naturalWidth", "naturalHeight"].includes(property)) return true;
    if (property === "source") return normalizeAssetReference(leftValue) === normalizeAssetReference(rightValue);
    return leftValue === rightValue;
  };
  const equivalentStyle = (key, property, left, right) => {
    if (property === "backgroundImage") {
      return normalizeAssetReference(left.style[property]) === normalizeAssetReference(right.style[property]);
    }
    if (key === "battleEnemyMonsterArt" && property === "backgroundPosition") {
      const leftParts = String(left.style[property]).split(/\s+/);
      const rightParts = String(right.style[property]).split(/\s+/);
      if (leftParts.length === rightParts.length && leftParts.length > 0) {
        return leftParts.every((part, index) => {
          const leftNumber = Number.parseFloat(part);
          const rightNumber = Number.parseFloat(rightParts[index]);
          if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return part === rightParts[index];
          return Math.abs(leftNumber - rightNumber) <= 0.001;
        });
      }
    }
    if (property === "backgroundPosition" && left.style.backgroundImage === "none" && right.style.backgroundImage === "none") {
      return true;
    }
    if (property === "minHeight") {
      return Math.abs(left.rect.height - right.rect.height) <= 1;
    }
    if (property === "transform" && left.className.includes("career-emblem") && right.className.includes("career-emblem")) {
      const leftTransform = left.style[property];
      const rightTransform = right.style[property];
      return leftTransform === rightTransform ||
        (leftTransform === "none" && rightTransform === "matrix(1, 0, 0, 1, 0, -1)") ||
        (rightTransform === "none" && leftTransform === "matrix(1, 0, 0, 1, 0, -1)");
    }
    return left.style[property] === right.style[property];
  };
  const shouldCompareSelector = (key) => {
    if (key.startsWith("exam")) return label === "student-시험";
    if (key.startsWith("result")) return label === "student-결과";
    if (key.startsWith("archive") || key.startsWith("collection") || key.startsWith("career")) return label === "student-도감";
    return true;
  };
  for (const key of Object.keys(snapshotSelectors || {})) {
    if (!shouldCompareSelector(key)) continue;
    const snapshot = snapshotSelectors[key];
    const react = reactSelectors?.[key];
    if (!react) {
      diffs.push({ key, property: "missing", snapshot: true, react: false });
      continue;
    }
    if (snapshot.count !== react.count) {
      diffs.push({ key, property: "count", snapshot: snapshot.count, react: react.count });
    }
    const itemCount = Math.min(snapshot.items.length, react.items.length);
    for (let index = 0; index < itemCount; index += 1) {
      const left = snapshot.items[index];
      const right = react.items[index];
      for (const property of ["tagName", "className", "source", "naturalWidth", "naturalHeight"]) {
        if (!equivalentField(key, property, left[property], right[property])) {
          diffs.push({ key, index, property, snapshot: left[property], react: right[property] });
        }
      }
      if ((key.startsWith("careerGuideIcon") || key.startsWith("resultIconPath")) && JSON.stringify(left.attributes || {}) !== JSON.stringify(right.attributes || {})) {
        diffs.push({ key, index, property: "attributes", snapshot: left.attributes || {}, react: right.attributes || {} });
      }
      if (left.text !== right.text) {
        diffs.push({ key, index, property: "text", snapshot: left.text, react: right.text });
      }
      for (const property of ["x", "y", "width", "height", "bottom"]) {
        const delta = Math.abs(left.rect[property] - right.rect[property]);
        if (delta > 1) {
          diffs.push({ key, index, property: `rect.${property}`, snapshot: left.rect[property], react: right.rect[property], delta: Math.round(delta * 100) / 100 });
        }
      }
      for (const property of selectorStyleProperties) {
        if (!equivalentStyle(key, property, left, right)) {
          diffs.push({ key, index, property: `style.${property}`, snapshot: left.style[property], react: right.style[property] });
        }
      }
    }
  }
  return diffs;
}

function compareMetrics(label, snapshot, react, visual, visualRegions) {
  const normalizedSnapshotText = normalizeText(snapshot.text);
  const normalizedReactText = normalizeText(react.text);
  const state = diffState(snapshot, react);
  const rectDiffs = diffRects(snapshot.rects, react.rects);
  const selectorDiffs = diffSelectorMetrics(snapshot.selectorMetrics, react.selectorMetrics, label);
  const failures = [];
  const textDiff = firstDiff(normalizedSnapshotText, normalizedReactText);

  if (textDiff) failures.push({ type: "text", diff: textDiff });
  if (snapshot.horizontalOverflow > 1 || react.horizontalOverflow > 1) {
    failures.push({ type: "horizontal-overflow", snapshot: snapshot.horizontalOverflow, react: react.horizontalOverflow });
  }
  if (snapshot.buttonOverflow.length > 0 || react.buttonOverflow.length > 0) {
    failures.push({ type: "button-overflow", snapshot: snapshot.buttonOverflow, react: react.buttonOverflow });
  }
  if (JSON.stringify(snapshot.studentTabLabels) !== JSON.stringify(react.studentTabLabels)) {
    failures.push({ type: "student-tabs", snapshot: snapshot.studentTabLabels, react: react.studentTabLabels });
  }
  if (JSON.stringify(snapshot.expeditionTabLabels) !== JSON.stringify(react.expeditionTabLabels)) {
    failures.push({ type: "expedition-tabs", snapshot: snapshot.expeditionTabLabels, react: react.expeditionTabLabels });
  }
  if (state.diffs.length > 0) failures.push({ type: "state", diffs: state.diffs });
  if (rectDiffs.length > 0) failures.push({ type: "layout", diffs: rectDiffs });
  if (strictVisual && visual.thresholdDiffPercent > maxStrictVisualDiff) {
    failures.push({ type: "visual", thresholdDiffPercent: visual.thresholdDiffPercent, max: maxStrictVisualDiff });
  }

  return {
    label,
    textEqual: !textDiff,
    textDiff,
    state,
    rectDiffs,
    selectorDiffs,
    visual,
    visualRegions,
    snapshot: {
      activeStudentTab: snapshot.activeStudentTab,
      activeExpeditionTab: snapshot.activeExpeditionTab,
      counts: snapshot.counts,
      rects: snapshot.rects,
      selectorMetrics: snapshot.selectorMetrics,
      semanticSignatures: snapshot.semanticSignatures,
      layoutSignatures: snapshot.layoutSignatures,
      horizontalOverflow: snapshot.horizontalOverflow,
      buttonOverflow: snapshot.buttonOverflow,
    },
    react: {
      activeStudentTab: react.activeStudentTab,
      activeExpeditionTab: react.activeExpeditionTab,
      counts: react.counts,
      rects: react.rects,
      selectorMetrics: react.selectorMetrics,
      semanticSignatures: react.semanticSignatures,
      layoutSignatures: react.layoutSignatures,
      horizontalOverflow: react.horizontalOverflow,
      buttonOverflow: react.buttonOverflow,
    },
    failures,
  };
}

async function capturePair(browser, snapshotPage, reactPage, label) {
  await Promise.all([
    snapshotPage.evaluate(async () => { await document.fonts?.ready; }),
    reactPage.evaluate(async () => { await document.fonts?.ready; }),
  ]);
  await Promise.all([snapshotPage.waitForTimeout(settleMs), reactPage.waitForTimeout(settleMs)]);
  const [snapshotMetrics, reactMetrics] = await Promise.all([collectMetrics(snapshotPage), collectMetrics(reactPage)]);
  const snapshotPath = resolve(outDir, `${label}-snapshot.png`);
  const reactPath = resolve(outDir, `${label}-react.png`);
  const [snapshotShot, reactShot] = await Promise.all([
    snapshotPage.screenshot({ path: snapshotPath }),
    reactPage.screenshot({ path: reactPath }),
  ]);
  const visual = await compareScreenshots(browser, snapshotShot, reactShot);
  const visualRegions = await compareScreenshotRegions(browser, snapshotShot, reactShot, snapshotMetrics.rects, reactMetrics.rects);
  return {
    ...compareMetrics(label, snapshotMetrics, reactMetrics, visual, visualRegions),
    screenshots: { snapshot: snapshotPath, react: reactPath },
  };
}

async function readStudentBattleSignature(page) {
  return await page.evaluate(() => {
    const cleanText = (value) => (value || "").trim().replace(/\s+/g, " ");
    return {
      enemyCount: document.querySelectorAll(".battle-scene-enemy").length,
      timerText: cleanText(document.querySelector(".battle-arena-progress .scene-progress-label strong")?.textContent),
      phase: document.querySelector(".battle-road-lineup")?.getAttribute("data-road-phase") || "",
    };
  });
}

async function waitForComparableInitialBattle(snapshotPage, reactPage) {
  const deadline = Date.now() + 3000;
  let last = null;
  while (Date.now() < deadline) {
    await Promise.all([snapshotPage.waitForTimeout(80), reactPage.waitForTimeout(80)]);
    const [snapshot, react] = await Promise.all([readStudentBattleSignature(snapshotPage), readStudentBattleSignature(reactPage)]);
    last = { snapshot, react };
    if (snapshot.enemyCount === react.enemyCount && snapshot.timerText === react.timerText) return last;
  }
  return last;
}

async function runSame(action, snapshotPage, reactPage) {
  await Promise.all([action(snapshotPage), action(reactPage)]);
}

async function maybeRunSame(action, snapshotPage, reactPage) {
  const [snapshotResult, reactResult] = await Promise.all([action(snapshotPage), action(reactPage)]);
  return { snapshotResult, reactResult };
}

mkdirSync(outDir, { recursive: true });

const snapshotServer = createStaticServer(snapshotRoot);
const reactServer = createStaticServer(reactRoot);
const snapshotPort = await listenAvailable(snapshotServer, Number(process.env.REACT_INTERACTIVE_PARITY_SNAPSHOT_PORT || 5920));
const reactPort = await listenAvailable(reactServer, Number(process.env.REACT_INTERACTIVE_PARITY_REACT_PORT || 5960));
const snapshotUrl = `http://127.0.0.1:${snapshotPort}/`;
const reactUrl = `http://127.0.0.1:${reactPort}/?qaTools=1`;
const browser = await chromium.launch({ headless: true });
const results = [];
let initialBattleSignature = null;

try {
  const [snapshotPage, reactPage] = await Promise.all([
    newSeededPage(browser, snapshotUrl, makeSnapshotSeedState()),
    newSeededPage(browser, reactUrl, makeReactSeedState()),
  ]);

  initialBattleSignature = await waitForComparableInitialBattle(snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "00-initial"));

  for (const tab of studentTabs) {
    await runSame((page) => clickButton(page, tab, { exact: true }), snapshotPage, reactPage);
    results.push(await capturePair(browser, snapshotPage, reactPage, `student-${tab}`));
  }

  await runSame((page) => clickButton(page, "성장", { exact: true }), snapshotPage, reactPage);
  await runSame((page) => clickButton(page, "상점", { exact: true }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "modal-shop"));
  await runSame((page) => clickSelector(page, ".shop-modal .icon-button.dark"), snapshotPage, reactPage);

  await runSame((page) => clickButton(page, "설정", { exact: true }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "modal-settings"));
  await runSame((page) => clickSelector(page, ".settings-modal .icon-button.dark"), snapshotPage, reactPage);

  await runSame((page) => clickButton(page, "디버그 메뉴", { exact: true }), snapshotPage, reactPage);
  await runSame((page) => clickButton(page, "동료 랜덤 +5", { exact: true }), snapshotPage, reactPage);
  await runSame((page) => clickButton(page, "동료 랜덤 +5", { exact: true }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "debug-after-companions"));
  await runSame((page) => clickSelector(page, ".debug-modal .icon-button.dark"), snapshotPage, reactPage);

  await runSame((page) => clickButton(page, "동료", { exact: true }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "student-companion-after-debug"));

  await runSame((page) => clickButton(page, "원정대", { exact: true }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-growth"));

  for (let index = 0; index < 3; index += 1) {
    await runSame((page) => clickFirstEnabledButton(page, /돌파|보스전/), snapshotPage, reactPage);
  }
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-after-three-clears"));

  await maybeRunSame((page) => clickFirstEnabledButton(page, /투자/), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-after-invest"));

  for (const tab of expeditionTabs.slice(1)) {
    await runSame((page) => clickButton(page, tab, { exact: false }), snapshotPage, reactPage);
    results.push(await capturePair(browser, snapshotPage, reactPage, `expedition-${tab.replace(/\s+/g, "-")}`));
  }

  await runSame((page) => clickButton(page, "파티", { exact: false }), snapshotPage, reactPage);
  await maybeRunSame((page) => clickSelector(page, ".expedition-party-slot .icon-button.dark"), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-party-after-remove"));

  await maybeRunSame((page) => clickFirstEnabledButton(page, /편성/), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-party-after-assign"));

  await runSame((page) => clickButton(page, "동료 관리", { exact: false }), snapshotPage, reactPage);
  await maybeRunSame((page) => clickFirstEnabledButton(page, /잠금/), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-manage-after-lock"));

  await maybeRunSame((page) => clickFirstEnabledButton(page, /합성/), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-manage-after-fuse"));

  await runSame((page) => clickButton(page, "기록", { exact: false }), snapshotPage, reactPage);
  results.push(await capturePair(browser, snapshotPage, reactPage, "expedition-log-final"));

  await Promise.all([snapshotPage.close(), reactPage.close()]);
} finally {
  await browser.close();
  await closeServer(snapshotServer);
  await closeServer(reactServer);
}

const failures = results.flatMap((result) => result.failures.map((failure) => ({ label: result.label, ...failure })));
const report = {
  snapshotUrl,
  reactUrl,
  viewport,
  settleMs,
  strictVisual,
  visualPixelThreshold,
  maxStrictVisualDiff,
  initialBattleSignature,
  checked: results.length,
  failures,
  results,
};

writeFileSync(resolve(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  snapshotUrl,
  reactUrl,
  outDir,
  checked: results.length,
  failures,
  visualSummary: results.map((result) => ({
    label: result.label,
    diffPercent: result.visual.diffPercent,
    thresholdDiffPercent: result.visual.thresholdDiffPercent,
    meanAbsDiff: result.visual.meanAbsDiff,
    sceneDiffPercent: result.visualRegions.scene?.diffPercent,
    activePanelDiffPercent: result.visualRegions.activePanel?.diffPercent,
    selectorDiffCount: result.selectorDiffs.length,
  })),
}, null, 2));

if (failures.length > 0) {
  console.error(`REACT_VITE_INTERACTIVE_PARITY_FAILED failures=${failures.length}`);
  process.exit(1);
}

console.log(`REACT_VITE_INTERACTIVE_PARITY_OK report=${resolve(outDir, "report.json")}`);
