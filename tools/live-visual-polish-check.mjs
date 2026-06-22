import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const outputDir = resolve("artifacts/live-visual-polish");
const baseUrl = process.env.LIVE_POLISH_URL || "http://127.0.0.1:5173/";
const runUrl = new URL(baseUrl);
runUrl.searchParams.set("livePolish", String(Date.now()));

mkdirSync(outputDir, { recursive: true });

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
        backgroundImage: arenaStyle?.backgroundImage.includes("data:image") ?? false,
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
        backgroundImage: expeditionStyle?.backgroundImage.includes("data:image") ?? false,
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

  await page.evaluate(() => document.querySelectorAll(".screen-switch")[1]?.click());
  await page.waitForSelector(".expedition-arena", { timeout: 15000 });
  await page.waitForTimeout(1000);
  captures.push(await capture(page, "expedition-start"));

  await page.waitForTimeout(5000);
  captures.push(await capture(page, "expedition-combat"));
} finally {
  await browser.close();
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
