import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const reactRoot = resolve("dist-react");
const snapshotRoot = resolve(process.env.REACT_PARITY_SNAPSHOT_ROOT || "dist-react");
const outputDir = resolve("artifacts/react-vite-parity");
const preferredSnapshotPort = Number(process.env.REACT_PARITY_SNAPSHOT_PORT || 5720);
const preferredReactPort = Number(process.env.REACT_PARITY_REACT_PORT || 5730);
const strict = process.env.REACT_PARITY_STRICT === "1";
const maxDiffPercent = Number(process.env.REACT_PARITY_MAX_DIFF_PERCENT || 0);
const maxMeanAbsDiff = Number(process.env.REACT_PARITY_MAX_MEAN_ABS_DIFF || 0);
const parityRandomValue = Number(process.env.REACT_PARITY_RANDOM_VALUE || 0.25);
const freezeAnimations = process.env.REACT_PARITY_FREEZE_ANIMATIONS !== "0";
const viewports = [
  { name: "phone-standard", width: 412, height: 915 },
  { name: "phone-small", width: 390, height: 844 },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

for (const root of [snapshotRoot, reactRoot]) {
  if (!existsSync(resolve(root, "index.html"))) {
    console.error(`${root}/index.html is missing. Run \`npm run build:web\` and \`npm run react:build\` first.`);
    process.exit(1);
  }
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

async function listenAvailable(server, preferredPort) {
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

async function capturePage(browser, url, viewport, path) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.addInitScript(({ randomValue, freezeAnimations }) => {
    Math.random = () => randomValue;
    if (!freezeAnimations) return;

    const installAnimationFreeze = () => {
      if (document.getElementById("react-parity-animation-freeze")) return;
      const style = document.createElement("style");
      style.id = "react-parity-animation-freeze";
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
  }, { randomValue: parityRandomValue, freezeAnimations });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".phone-frame", { timeout: 15000 });
  if (freezeAnimations) await page.waitForTimeout(50);
  const metrics = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    nodeCount: document.querySelectorAll("*").length,
    phoneFrame: document.querySelector(".phone-frame")?.getBoundingClientRect().toJSON?.() ?? null,
    top: document.querySelector(".topbar, .app-header")?.getBoundingClientRect().toJSON?.() ?? null,
    status: document.querySelector(".status-strip, .status-grid")?.getBoundingClientRect().toJSON?.() ?? null,
    battle:
      (document.querySelector(".pixel-arena") ?? document.querySelector(".react-battle-arena"))?.getBoundingClientRect().toJSON?.() ?? null,
    tabs: (document.querySelector(".tabbar") ?? document.querySelector(".tabs") ?? document.querySelector(".tab-bar"))?.getBoundingClientRect().toJSON?.() ?? null,
    activePanel: (document.querySelector(".viewport") ?? document.querySelector(".growth-panel"))?.getBoundingClientRect().toJSON?.() ?? null,
  }));
  const buffer = await page.screenshot({ path });
  await page.close();
  return { buffer, metrics };
}

function writeDataUrlPng(path, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  writeFileSync(path, Buffer.from(base64, "base64"));
}

async function compareScreenshots(browser, snapshotBuffer, reactBuffer, diffPath) {
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  const result = await page.evaluate(
    async ({ snapshotSrc, reactSrc }) => {
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
      const diffImage = context.createImageData(width, height);
      const tileSize = 32;
      const hotspotMap = new Map();

      let changedPixels = 0;
      let totalAbsDiff = 0;
      let maxChannelDiff = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      const totalPixels = width * height;
      for (let index = 0; index < snapshotPixels.length; index += 4) {
        const pixelIndex = index / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const red = Math.abs(snapshotPixels[index] - reactPixels[index]);
        const green = Math.abs(snapshotPixels[index + 1] - reactPixels[index + 1]);
        const blue = Math.abs(snapshotPixels[index + 2] - reactPixels[index + 2]);
        const alpha = Math.abs(snapshotPixels[index + 3] - reactPixels[index + 3]);
        const pixelMax = Math.max(red, green, blue, alpha);
        if (pixelMax > 0) {
          changedPixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          const tileX = Math.floor(x / tileSize) * tileSize;
          const tileY = Math.floor(y / tileSize) * tileSize;
          const key = `${tileX},${tileY}`;
          const hotspot = hotspotMap.get(key) || { x: tileX, y: tileY, changedPixels: 0, maxChannelDiff: 0 };
          hotspot.changedPixels += 1;
          hotspot.maxChannelDiff = Math.max(hotspot.maxChannelDiff, pixelMax);
          hotspotMap.set(key, hotspot);
          diffImage.data[index] = 255;
          diffImage.data[index + 1] = 0;
          diffImage.data[index + 2] = 64;
          diffImage.data[index + 3] = 255;
        } else {
          diffImage.data[index] = snapshotPixels[index];
          diffImage.data[index + 1] = snapshotPixels[index + 1];
          diffImage.data[index + 2] = snapshotPixels[index + 2];
          diffImage.data[index + 3] = Math.round(snapshotPixels[index + 3] * 0.18);
        }
        totalAbsDiff += red + green + blue + alpha;
        maxChannelDiff = Math.max(maxChannelDiff, pixelMax);
      }
      context.putImageData(diffImage, 0, 0);

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
        meanAbsDiff: Math.round((totalAbsDiff / (totalPixels * 4)) * 10000) / 10000,
        maxChannelDiff,
        bbox: changedPixels > 0 ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
        hotspots: [...hotspotMap.values()]
          .sort((left, right) => right.changedPixels - left.changedPixels || right.maxChannelDiff - left.maxChannelDiff)
          .slice(0, 8),
        diffDataUrl: context.canvas.toDataURL("image/png"),
      };
    },
    {
      snapshotSrc: `data:image/png;base64,${snapshotBuffer.toString("base64")}`,
      reactSrc: `data:image/png;base64,${reactBuffer.toString("base64")}`,
    },
  );
  await page.close();
  if (diffPath) {
    writeDataUrlPng(diffPath, result.diffDataUrl);
    delete result.diffDataUrl;
  }
  return result;
}

mkdirSync(outputDir, { recursive: true });

const snapshotServer = createStaticServer(snapshotRoot);
const reactServer = createStaticServer(reactRoot);
const snapshotPort = await listenAvailable(snapshotServer, preferredSnapshotPort);
const reactPort = await listenAvailable(reactServer, preferredReactPort);
const snapshotQuery = process.env.REACT_PARITY_SNAPSHOT_QUERY ?? process.env.REACT_PARITY_REACT_QUERY ?? "?qaTools=1";
const snapshotUrl = `http://127.0.0.1:${snapshotPort}/${snapshotQuery}`;
const reactBaseUrl = `http://127.0.0.1:${reactPort}/`;
const reactUrl = `${reactBaseUrl}${process.env.REACT_PARITY_REACT_QUERY ?? "?qaTools=1"}`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const snapshotPath = resolve(outputDir, `${viewport.name}-snapshot.png`);
    const reactPath = resolve(outputDir, `${viewport.name}-react.png`);
    const diffPath = resolve(outputDir, `${viewport.name}-latest-diff.png`);
    const snapshot = await capturePage(browser, snapshotUrl, viewport, snapshotPath);
    const react = await capturePage(browser, reactUrl, viewport, reactPath);
    const comparison = await compareScreenshots(browser, snapshot.buffer, react.buffer, diffPath);
    const failures = [];
    if (strict && comparison.diffPercent > maxDiffPercent) failures.push(`Diff percent ${comparison.diffPercent}% > ${maxDiffPercent}%`);
    if (strict && comparison.meanAbsDiff > maxMeanAbsDiff) failures.push(`Mean abs diff ${comparison.meanAbsDiff} > ${maxMeanAbsDiff}`);
    results.push({
      viewport,
      screenshotPaths: { snapshot: snapshotPath, react: reactPath, diff: diffPath },
      comparison,
      metrics: { snapshot: snapshot.metrics, react: react.metrics },
      failures,
    });
  }
} finally {
  await browser.close();
  await closeServer(snapshotServer);
  await closeServer(reactServer);
}

const report = {
  snapshotUrl,
  reactUrl,
  randomValue: parityRandomValue,
  freezeAnimations,
  strict,
  thresholds: { maxDiffPercent, maxMeanAbsDiff },
  results,
};
writeFileSync(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const failed = results.filter((result) => result.failures.length > 0);
if (failed.length > 0) {
  console.error(`REACT_VITE_VISUAL_PARITY_FAILED ${failed.length}/${results.length}`);
  process.exit(1);
}

console.log(`REACT_VITE_VISUAL_PARITY_AUDIT_OK report=${resolve(outputDir, "report.json")}`);
