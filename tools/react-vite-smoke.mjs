import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist-react");
const outputDir = resolve("artifacts/react-vite-smoke");
const preferredPort = Number(process.env.REACT_SMOKE_PORT || 5620);
const viewports = [
  { name: "phone-small", width: 360, height: 740 },
  { name: "phone-standard", width: 412, height: 915 },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

mkdirSync(outputDir, { recursive: true });

const server = createStaticServer();
const port = await listenAvailable(server);
const baseUrl = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".react-battle-arena", { timeout: 15000 });

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;
      const firstStudentArt = document.querySelector(".student-art");
      const firstStudentStyle = firstStudentArt ? getComputedStyle(firstStudentArt) : null;

      return {
        title: document.title,
        rootChildren: document.querySelector("#root")?.children.length ?? 0,
        textLength: body.innerText.trim().length,
        scrollWidth,
        clientWidth,
        horizontalOverflow: Math.max(0, scrollWidth - clientWidth),
        buttonCount: document.querySelectorAll("button").length,
        hasHeader: Boolean(document.querySelector(".app-header")),
        hasStatus: Boolean(document.querySelector(".status-grid")),
        hasBattleArena: Boolean(document.querySelector(".react-battle-arena")),
        hasGrowthPanel: Boolean(document.querySelector(".growth-panel")),
        hasInvestmentPanel: Boolean(document.querySelector(".investment-panel")),
        studentSprites: document.querySelectorAll(".student-sprite").length,
        studentAtlasLoaded: Boolean(firstStudentStyle?.backgroundImage.includes("url(")),
        enemySprites: document.querySelectorAll(".battle-scene-enemy").length,
        enemyAtlasLoaded: [...document.querySelectorAll(".battle-scene-monster-art")].every((element) =>
          getComputedStyle(element).backgroundImage.includes("url("),
        ),
        debugButtons: document.querySelectorAll(".battle-debug-complete").length,
        hasDebugText: body.innerText.includes("DEBUG"),
        tabButtons: document.querySelectorAll(".tab").length,
        rangeInputs: document.querySelectorAll('input[type="range"]').length,
      };
    });

    const screenshotPath = resolve(outputDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.close();

    const failures = [];
    if (!response || response.status() !== 200) failures.push(`HTTP status ${response?.status() ?? "missing"}`);
    if (metrics.title !== "학생 방치 RPG") failures.push(`Unexpected title: ${metrics.title}`);
    if (metrics.rootChildren < 1) failures.push("React root did not render children");
    if (metrics.textLength < 250) failures.push("Rendered text is unexpectedly short");
    if (metrics.horizontalOverflow > 4) failures.push(`Horizontal overflow ${metrics.horizontalOverflow}px`);
    if (metrics.buttonCount < 10) failures.push(`Expected at least 10 buttons, got ${metrics.buttonCount}`);
    if (!metrics.hasHeader || !metrics.hasStatus || !metrics.hasBattleArena || !metrics.hasGrowthPanel) {
      failures.push("Missing core first-screen sections");
    }
    if (!metrics.hasInvestmentPanel || metrics.rangeInputs !== 5) failures.push("Investment controls are incomplete");
    if (metrics.studentSprites !== 1 || !metrics.studentAtlasLoaded) failures.push("Student atlas sprite did not load");
    if (metrics.enemySprites < 3 || !metrics.enemyAtlasLoaded) failures.push(`Expected at least 3 loaded enemy sprites, got ${metrics.enemySprites}`);
    if (metrics.debugButtons !== 0 || metrics.hasDebugText) failures.push("Production smoke must not expose DEBUG controls");
    if (metrics.tabButtons !== 7) failures.push(`Expected 7 tab buttons, got ${metrics.tabButtons}`);
    if (consoleErrors.length > 0) failures.push(`Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
    if (pageErrors.length > 0) failures.push(`Page errors: ${pageErrors.slice(0, 3).join(" | ")}`);

    results.push({ viewport, metrics, screenshotPath, failures });
  }
} finally {
  await browser.close();
  await closeServer(server);
}

const failed = results.filter((result) => result.failures.length > 0);
console.log(JSON.stringify({ baseUrl, results }, null, 2));

if (failed.length > 0) {
  console.error(`REACT_VITE_SMOKE_FAILED ${failed.length}/${results.length}`);
  process.exit(1);
}

console.log(`REACT_VITE_SMOKE_OK screenshots=${outputDir}`);
