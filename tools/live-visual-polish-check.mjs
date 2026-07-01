import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const outputDir = resolve("artifacts/live-visual-polish");
const preferredPort = Number(process.env.LIVE_POLISH_PORT || 5796);

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

mkdirSync(outputDir, { recursive: true });

async function waitForBuildOutput() {
  const indexPath = resolve(root, "index.html");
  const deadline = Date.now() + 5000;
  while (!existsSync(indexPath) && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  if (!existsSync(indexPath)) {
    console.error("dist/index.html is missing. Run `npm run react:build` first.");
    process.exit(1);
  }
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

function rectToJson(rect) {
  if (!rect) return null;
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
  };
}

function overlapRatio(a, b) {
  if (!a || !b) return 0;
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const area = width * height;
  const baseArea = Math.max(1, a.width * a.height);
  return Number((area / baseArea).toFixed(3));
}

async function capture(page, name, extra = {}) {
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true });
  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.getBoundingClientRect().toJSON() : null;
    };
    const rects = (selector) =>
      [...document.querySelectorAll(selector)].map((element) => {
        const computed = getComputedStyle(element);
        return {
          className: element.className,
          rect: element.getBoundingClientRect().toJSON(),
          style: {
            transform: computed.transform,
            sceneEnemyScale: computed.getPropertyValue("--scene-enemy-scale").trim(),
            sceneEnemyLeft: computed.getPropertyValue("--scene-enemy-left").trim(),
            sceneEnemyTop: computed.getPropertyValue("--scene-enemy-top").trim(),
          },
        };
      });
    const style = (selector, pseudo = null) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element, pseudo) : null;
    };
    const arenaStyle = style(".pixel-arena", "::before");
    const expeditionStyle = style(".expedition-arena", "::before");
    const studentStyle = style(".student-sprite");
    const studentArtStyle = style(".student-art");
    let savedBattleEnemies = [];
    try {
      const saved = JSON.parse(localStorage.getItem("student-idle-rpg-save-v1") ?? "{}");
      savedBattleEnemies = saved?.current?.battle?.enemies ?? [];
    } catch {
      savedBattleEnemies = [];
    }
    const domDefeatedEnemyCount = [...document.querySelectorAll(".battle-scene-enemy.defeated")].length;
    const savedDamagedEnemyCount = savedBattleEnemies.filter((enemy) => {
      const remainingHp = Number(enemy.remainingHp ?? 0);
      const maxHp = Number(enemy.maxHp ?? 0);
      return maxHp > 0 && remainingHp < maxHp;
    }).length;
    return {
      title: document.title,
      bodyTextSample: document.body.innerText.trim().replace(/\s+/g, " ").slice(0, 180),
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
      },
      activeTopTab: [...document.querySelectorAll(".screen-switch")]
        .find((button) => button.classList.contains("active"))
        ?.innerText.trim(),
      student: {
        arena: rect(".pixel-arena"),
        speech: rect(".battle-dialogue"),
        sprite: rect(".student-sprite"),
        art: rect(".student-art"),
        lineup: rect(".battle-scene-lineup"),
        enemies: rects(".battle-scene-enemy"),
        enemyArts: rects(".battle-scene-monster-art"),
        roadPhase: document.querySelector(".battle-scene-lineup")?.getAttribute("data-road-phase") ?? null,
        damagedEnemyCount: Math.max(domDefeatedEnemyCount, savedDamagedEnemyCount),
        backgroundImage: arenaStyle?.backgroundImage.includes("url(") ?? false,
        backgroundTransform: arenaStyle?.transform ?? null,
        studentScale: studentStyle?.getPropertyValue("--student-motion-scale").trim() ?? null,
        studentAnimation: studentStyle?.animationName ?? null,
        artAnimation: studentArtStyle?.animationName ?? null,
      },
      expedition: {
        arena: rect(".expedition-arena"),
        party: rect(".expedition-party-visual"),
        units: rects(".expedition-unit-avatar"),
        enemies: rects(".expedition-enemy-visual"),
        backgroundImage: expeditionStyle?.backgroundImage.includes("url(") ?? false,
        backgroundTransform: expeditionStyle?.transform ?? null,
      },
    };
  });

  const studentArena = metrics.student.arena;
  const studentSprite = metrics.student.sprite;
  const speech = metrics.student.speech;
  const expeditionArena = metrics.expedition.arena;
  const notes = [];

  if (metrics.viewport.scrollWidth - metrics.viewport.width > 4) {
    notes.push(`가로 오버플로 ${metrics.viewport.scrollWidth - metrics.viewport.width}px`);
  }
  if (studentArena && studentSprite) {
    const topGap = studentSprite.top - studentArena.top;
    const bottomGap = studentArena.bottom - studentSprite.bottom;
    if (topGap < 8) notes.push(`학생 스프라이트 상단 여백 부족 ${Math.round(topGap)}px`);
    if (bottomGap < 8) notes.push(`학생 스프라이트 하단 여백 부족 ${Math.round(bottomGap)}px`);
    const speechOverlap = overlapRatio(studentSprite, speech);
    if (speechOverlap > 0.05) notes.push(`말풍선이 학생을 ${Math.round(speechOverlap * 100)}% 덮음`);
    if (metrics.student.damagedEnemyCount > 0 && metrics.student.roadPhase === "travel") {
      notes.push("적 피해 이후에도 Battle Road phase가 travel로 남음");
    }
  }
  if (studentArena) {
    for (const enemy of metrics.student.enemyArts) {
      const rect = enemy.rect;
      if (rect.top < studentArena.top + 2) notes.push(`학생탭 몬스터 상단 클리핑 의심: ${enemy.className}`);
      if (rect.bottom > studentArena.bottom - 2) notes.push(`학생탭 몬스터 하단 클리핑 의심: ${enemy.className}`);
    }
  }
  if (expeditionArena) {
    for (const unit of metrics.expedition.units) {
      const rect = unit.rect;
      if (rect.top < expeditionArena.top - 4) notes.push(`원정대 동료 상단 클리핑 의심: ${unit.className}`);
      if (rect.bottom > expeditionArena.bottom + 4) notes.push(`원정대 동료 하단 클리핑 의심: ${unit.className}`);
    }
    for (const enemy of metrics.expedition.enemies) {
      const rect = enemy.rect;
      if (rect.top < expeditionArena.top - 4) notes.push(`원정대 몬스터 상단 클리핑 의심: ${enemy.className}`);
      if (rect.bottom > expeditionArena.bottom + 4) notes.push(`원정대 몬스터 하단 클리핑 의심: ${enemy.className}`);
    }
  }

  return {
    name,
    file: resolve(outputDir, `${name}.png`),
    notes,
    extra,
    metrics: {
      ...metrics,
      student: {
        ...metrics.student,
        arena: rectToJson(metrics.student.arena),
        speech: rectToJson(metrics.student.speech),
        sprite: rectToJson(metrics.student.sprite),
        art: rectToJson(metrics.student.art),
        lineup: rectToJson(metrics.student.lineup),
        enemies: metrics.student.enemies.map((item) => ({ ...item, rect: rectToJson(item.rect) })),
        enemyArts: metrics.student.enemyArts.map((item) => ({ ...item, rect: rectToJson(item.rect) })),
      },
      expedition: {
        ...metrics.expedition,
        arena: rectToJson(metrics.expedition.arena),
        party: rectToJson(metrics.expedition.party),
        units: metrics.expedition.units.map((item) => ({ ...item, rect: rectToJson(item.rect) })),
        enemies: metrics.expedition.enemies.map((item) => ({ ...item, rect: rectToJson(item.rect) })),
      },
    },
  };
}

let server = null;
let baseUrl = process.env.LIVE_POLISH_URL || "";
if (!baseUrl) {
  await waitForBuildOutput();
  server = createStaticServer();
  const port = await listenAvailable(server);
  baseUrl = `http://127.0.0.1:${port}/`;
}
const runUrl = new URL(baseUrl);
runUrl.searchParams.set("livePolish", String(Date.now()));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

const captures = [];

try {
  await page.goto(runUrl.href, { waitUntil: "networkidle" });
  await page.waitForSelector(".pixel-arena", { timeout: 15000 });
  await page.waitForTimeout(700);
  captures.push(await capture(page, "student-start"));

  await page.waitForTimeout(1100);
  captures.push(await capture(page, "student-travel-mid"));

  await page.waitForTimeout(1700);
  captures.push(await capture(page, "student-approach"));

  await page.waitForTimeout(2200);
  captures.push(await capture(page, "student-combat"));

  await page.evaluate(() => {
    const expeditionTab = [...document.querySelectorAll(".mode-tab")]
      .find((button) => (button.textContent || "").trim() === "원정대");
    expeditionTab?.click();
  });
  await page.waitForSelector(".expedition-arena", { timeout: 15000 });
  await page.waitForTimeout(1000);
  captures.push(await capture(page, "expedition-start"));

  await page.waitForTimeout(5000);
  captures.push(await capture(page, "expedition-combat"));
} finally {
  await browser.close();
  if (server) await closeServer(server);
}

const report = {
  baseUrl,
  runUrl: runUrl.href,
  generatedAt: new Date().toISOString(),
  consoleErrors,
  pageErrors,
  captures,
};

writeFileSync(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const hardFailures = [];
if (consoleErrors.length > 0) hardFailures.push(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
if (pageErrors.length > 0) hardFailures.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
if (captures.some((captureItem) => captureItem.metrics.viewport.scrollWidth - captureItem.metrics.viewport.width > 4)) {
  hardFailures.push("horizontal overflow detected");
}

if (hardFailures.length > 0) {
  console.error(`LIVE_VISUAL_POLISH_FAILED ${hardFailures.join("; ")}`);
  process.exit(1);
}

console.log(`LIVE_VISUAL_POLISH_OK screenshots=${outputDir}`);
