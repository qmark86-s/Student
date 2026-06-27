import { chromium } from "@playwright/test";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve("dist-react");
const outDir = resolve("artifacts/real-estate-resource-quality-audit");
const preferredPort = Number(process.env.REACT_REAL_ESTATE_VISUAL_AUDIT_PORT || 5815);
const saveKey = "student-idle-rpg-save-v1";
const realEstates = JSON.parse(readFileSync(resolve("data/real_estates.json"), "utf8"));
const buildingAssets = JSON.parse(readFileSync(resolve("data/real_estate_building_assets.json"), "utf8"));
const districtAssets = JSON.parse(readFileSync(resolve("data/real_estate_district_assets.json"), "utf8"));
const districtGrowthAssets = JSON.parse(readFileSync(resolve("data/real_estate_district_growth_assets.json"), "utf8"));
const buildingAssetById = new Map(buildingAssets.assets.map((asset) => [asset.id, asset]));
const districtAssetById = new Map(districtAssets.districts.map((asset) => [asset.id, asset]));
const districtGrowthAssetById = new Map(districtGrowthAssets.districts.map((asset) => [asset.id, asset]));
const expectedOverviewBuildingCount = districtAssets.districts.reduce((sum, asset) => sum + asset.detailPads.length, 0);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

if (!existsSync(resolve(root, "index.html"))) {
  console.error("dist-react/index.html is missing. Run `npm run react:build` first.");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function maxOwnedCountForDistrict(districtId) {
  const growthAsset = districtGrowthAssetById.get(districtId);
  assert(growthAsset, `${districtId} baked 성장 데이터가 없습니다.`);
  return Number(growthAsset.maxOwnedCount);
}

function expectedGrowthStageFile(districtId, count) {
  const growthAsset = districtGrowthAssetById.get(districtId);
  if (!growthAsset) return "";
  const growthCount = Math.max(0, Math.min(Math.floor(Number(count)), Number(growthAsset.maxOwnedCount)));
  let stage = growthAsset.stages[0];
  for (const candidate of growthAsset.stages) {
    if (growthCount >= Number(candidate.minOwnedCount)) stage = candidate;
  }
  assert(stage, `${districtId} baked 성장 PNG ${growthCount}채 단계가 없습니다.`);
  return stage.file;
}

function assetStem(file) {
  return file.split("/").pop().replace(".png", "");
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function seedFullGrowth(page) {
  await page.evaluate(
    ({ key, properties }) => {
      const state = JSON.parse(localStorage.getItem(key));
      state.expedition.highestStage = 100;
      state.expedition.clearedStageCount = 100;
      state.realEstate.cash = 1000000000;
      state.realEstate.properties = {};
      for (const property of properties) state.realEstate.properties[property.id] = { count: property.maxOwnedCount };
      state.realEstate.weeklyAssetGain = 0;
      state.realEstate.lastAssetValueSnapshot = 0;
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: saveKey, properties: realEstates.properties.map((property) => ({ id: property.id, maxOwnedCount: maxOwnedCountForDistrict(property.id) })) },
  );
}

async function inspectOverview(page) {
  await page.waitForFunction(() => {
    const image = document.querySelector(".real-estate-map-image");
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });
  await page.waitForSelector(".real-estate-building-dot", { timeout: 6000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".real-estate-building-dot img")].every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), null, { timeout: 6000 });

  const metrics = await page.evaluate(() => {
    const image = document.querySelector(".real-estate-map-image");
    const districts = Array.from(document.querySelectorAll(".real-estate-district-button"));
    const buildings = Array.from(document.querySelectorAll(".real-estate-building-dot"));
    const buildingImages = Array.from(document.querySelectorAll(".real-estate-building-dot img"));
    const assetIds = Array.from(new Set(buildings.map((node) => node.getAttribute("data-building-asset")).filter(Boolean)));
    const developmentLevels = districts.map((node) => node.getAttribute("data-development-level"));
    const lockedCount = districts.filter((node) => node.getAttribute("data-locked") === "true").length;
    const frame = document.querySelector(".real-estate-map-frame");
    const frameRect = frame.getBoundingClientRect();
    return {
      mapSrc: image.currentSrc || image.src,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      districtCount: districts.length,
      lockedCount,
      buildingDotCount: buildings.length,
      buildingImageCount: buildingImages.length,
      buildingImagesLoaded: buildingImages.filter((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0 && node.naturalHeight > 0).length,
      uniqueBuildingAssetCount: assetIds.length,
      assetIds,
      developmentLevels,
      frameWidth: Math.round(frameRect.width),
      frameHeight: Math.round(frameRect.height),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  const expectedBuildingCount = expectedOverviewBuildingCount;
  assert(metrics.districtCount === realEstates.properties.length, `overview 지역 버튼 수가 올바르지 않습니다: ${metrics.districtCount}`);
  assert(metrics.lockedCount === 0, `풀성장 overview에 잠긴 지역이 남아 있습니다: ${metrics.lockedCount}`);
  assert(metrics.buildingDotCount === expectedBuildingCount, `overview PNG 건물 슬롯 수가 올바르지 않습니다: ${metrics.buildingDotCount}/${expectedBuildingCount}`);
  assert(metrics.buildingImageCount === expectedBuildingCount, `overview PNG 이미지 수가 올바르지 않습니다: ${metrics.buildingImageCount}/${expectedBuildingCount}`);
  assert(metrics.buildingImagesLoaded === expectedBuildingCount, `overview PNG 이미지가 모두 로드되지 않았습니다: ${metrics.buildingImagesLoaded}/${expectedBuildingCount}`);
  assert(metrics.uniqueBuildingAssetCount >= realEstates.properties.length * 6, `overview 건물 PNG 종류가 부족합니다: ${metrics.uniqueBuildingAssetCount}`);
  assert(metrics.developmentLevels.every((level) => level === "6"), `overview 풀성장 개발도 표시가 올바르지 않습니다: ${metrics.developmentLevels.join(",")}`);
  assert(metrics.horizontalOverflow === 0, `overview horizontal overflow가 있습니다: ${metrics.horizontalOverflow}`);
  for (const assetId of metrics.assetIds) {
    assert(buildingAssetById.has(assetId), `overview 건물 asset id를 데이터에서 찾을 수 없습니다: ${assetId}`);
  }

  const screenshotName = "overview-full-growth.png";
  await page.locator(".real-estate-map-frame").screenshot({ path: join(outDir, screenshotName) });

  return {
    screenshot: screenshotName,
    ...metrics,
  };
}

async function inspectDistrict(page, districtId) {
  const asset = districtAssetById.get(districtId);
  assert(asset, `지역 리소스 데이터가 없습니다: ${districtId}`);
  const expectedSlotCount = asset.detailPads.length;
  const growthStageFile = expectedGrowthStageFile(districtId, maxOwnedCountForDistrict(districtId));
  await page.locator(`.real-estate-district-button[data-district-id="${districtId}"]`).click();
  await page.waitForSelector(`[data-real-estate-view="district"][data-selected-property-id="${districtId}"]`, { timeout: 6000 });
  await page.waitForFunction(() => {
    const image = document.querySelector(".real-estate-detail-background");
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });
  if (growthStageFile) {
    await page.waitForFunction((expectedFile) => {
      const image = document.querySelector(".real-estate-detail-background");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.getAttribute("data-growth-asset") === expectedFile;
    }, growthStageFile);
  } else {
    await page.waitForSelector(".real-estate-development-building", { timeout: 6000 });
  }

  const metrics = await page.evaluate(() => {
    const image = document.querySelector(".real-estate-detail-background");
    const section = document.querySelector('[data-real-estate-view="district"]');
    const buildings = Array.from(document.querySelectorAll(".real-estate-development-building"));
    const buildingImages = Array.from(document.querySelectorAll(".real-estate-development-building img"));
    const pads = Array.from(document.querySelectorAll(".real-estate-development-pad"));
    const assetIds = Array.from(new Set(buildings.map((node) => node.getAttribute("data-building-asset"))));
    const themes = Array.from(new Set(buildings.map((node) => node.getAttribute("data-building-theme"))));
    const variants = Array.from(new Set(buildings.map((node) => node.getAttribute("data-building-variant"))));
    const viewport = document.querySelector(".real-estate-detail-viewport");
    const viewportRect = viewport.getBoundingClientRect();
    return {
      backgroundSrc: image.currentSrc || image.src,
      growthAsset: image.getAttribute("data-growth-asset") || "",
      usesBakedGrowth: section?.getAttribute("data-uses-baked-growth") === "true",
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      buildingCount: buildings.length,
      buildingImageCount: buildingImages.length,
      buildingImagesLoaded: buildingImages.filter((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0 && node.naturalHeight > 0).length,
      padCount: pads.length,
      assetIds,
      themes,
      variants,
      viewportWidth: Math.round(viewportRect.width),
      viewportHeight: Math.round(viewportRect.height),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  if (growthStageFile) {
    assert(metrics.usesBakedGrowth, `${districtId} 상세 화면이 baked 성장 PNG 모드가 아닙니다.`);
    assert(metrics.growthAsset === growthStageFile, `${districtId} baked 성장 PNG data 속성이 다릅니다: ${metrics.growthAsset}`);
    assert(metrics.backgroundSrc.includes(assetStem(growthStageFile)), `${districtId} baked 상세 배경 src가 데이터와 다릅니다: ${metrics.backgroundSrc}`);
    assert(metrics.buildingCount === 0, `${districtId} baked 상세에 DOM 건물이 남아 있습니다: ${metrics.buildingCount}`);
    assert(metrics.buildingImageCount === 0, `${districtId} baked 상세에 DOM 건물 PNG가 남아 있습니다: ${metrics.buildingImageCount}`);
    assert(metrics.padCount === 0, `${districtId} baked 상세에 pad가 남아 있습니다: ${metrics.padCount}`);
  } else {
    assert(!metrics.usesBakedGrowth, `${districtId} 상세 화면 baked 성장 PNG 모드가 잘못 켜졌습니다.`);
    assert(metrics.backgroundSrc.includes(asset.backgroundAsset.replace(".png", "")), `${districtId} 상세 배경 src가 데이터와 다릅니다: ${metrics.backgroundSrc}`);
    assert(metrics.buildingCount === expectedSlotCount, `${districtId} 풀성장 상세 건물 수가 ${expectedSlotCount}개가 아닙니다: ${metrics.buildingCount}`);
    assert(metrics.buildingImageCount === expectedSlotCount, `${districtId} 풀성장 상세 건물 PNG 수가 ${expectedSlotCount}개가 아닙니다: ${metrics.buildingImageCount}`);
    assert(metrics.buildingImagesLoaded === expectedSlotCount, `${districtId} 풀성장 상세 건물 PNG가 모두 로드되지 않았습니다: ${metrics.buildingImagesLoaded}/${expectedSlotCount}`);
    assert(metrics.padCount === expectedSlotCount, `${districtId} 상세 pad 수가 ${expectedSlotCount}개가 아닙니다: ${metrics.padCount}`);
    assert(metrics.themes.length === 1 && metrics.themes[0] === asset.buildingTheme, `${districtId} 건물 theme가 데이터와 다릅니다: ${metrics.themes.join(",")}`);
    assert(metrics.variants.every((variant) => typeof variant === "string" && variant.length > 0), `${districtId} 건물 variant가 비어 있습니다.`);
    assert(metrics.assetIds.length >= 4, `${districtId} 상세 건물 PNG 종류가 부족합니다: ${metrics.assetIds.length}`);
    for (const assetId of metrics.assetIds) {
      const buildingAsset = buildingAssetById.get(assetId);
      assert(buildingAsset, `${districtId} 건물 asset id를 데이터에서 찾을 수 없습니다: ${assetId}`);
      assert(buildingAsset.districtId === districtId, `${districtId} 건물 asset districtId가 다릅니다: ${assetId}`);
    }
  }
  assert(metrics.horizontalOverflow === 0, `${districtId} 상세 화면 horizontal overflow가 있습니다: ${metrics.horizontalOverflow}`);

  const screenshotName = `${districtId}-full-growth.png`;
  await page.locator(".real-estate-detail-viewport").screenshot({ path: join(outDir, screenshotName) });
  await page.locator(".real-estate-map-back").click();
  await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });

  return {
    districtId,
    name: realEstates.properties.find((property) => property.id === districtId).name,
    backgroundAsset: asset.backgroundAsset,
    growthAsset: growthStageFile,
    buildingTheme: asset.buildingTheme,
    uniqueBuildingAssetCount: metrics.assetIds.length,
    screenshot: screenshotName,
    ...metrics,
  };
}

function writeHtmlReport(overview, results) {
  const cards = results.map((result) => `
    <article>
      <img src="${escapeHtml(result.screenshot)}" alt="${escapeHtml(result.name)}">
      <h2>${escapeHtml(result.name)} <small>${escapeHtml(result.districtId)}</small></h2>
      <p>theme: <b>${escapeHtml(result.buildingTheme)}</b> · buildings: ${result.buildingCount} · png assets: ${result.uniqueBuildingAssetCount} · variants: ${escapeHtml(result.variants.join(", "))}</p>
      <p>${escapeHtml(result.backgroundAsset)} · ${result.naturalWidth}x${result.naturalHeight}</p>
    </article>
  `).join("\n");
  const overviewCard = `
    <article>
      <img src="${escapeHtml(overview.screenshot)}" alt="도시 전체 보기 풀성장">
      <h2>도시 전체 보기 <small>overview</small></h2>
      <p>districts: ${overview.districtCount} · buildings: ${overview.buildingDotCount} · png assets: ${overview.uniqueBuildingAssetCount}</p>
      <p>${overview.naturalWidth}x${overview.naturalHeight} · loaded ${overview.buildingImagesLoaded}/${overview.buildingImageCount}</p>
    </article>
  `;
  writeFileSync(join(outDir, "report.html"), `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>부동산 리소스 품질 전수 감사</title>
  <style>
    body { margin: 0; padding: 24px; background: #17212e; color: #e5eef7; font-family: system-ui, sans-serif; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    article { border: 1px solid #47705e; border-radius: 8px; background: #0f172a; overflow: hidden; box-shadow: 0 10px 30px #0006; }
    img { display: block; width: 100%; aspect-ratio: 16 / 10.6; object-fit: cover; }
    h1 { margin: 0 0 16px; }
    h2 { margin: 12px 14px 6px; font-size: 18px; }
    h2 small { color: #9fb0c3; font-size: 12px; }
    p { margin: 0 14px 10px; color: #cbd5e1; font-size: 13px; line-height: 1.35; }
  </style>
</head>
<body>
  <h1>부동산 리소스 품질 전수 감사</h1>
  <main>${overviewCard}${cards}</main>
</body>
</html>
`, "utf8");
}

async function captureHtmlReportContactSheet(browser) {
  const reportPage = await browser.newPage({ viewport: { width: 760, height: 1600 }, deviceScaleFactor: 1 });
  try {
    await reportPage.goto(pathToFileURL(join(outDir, "report.html")).href, { waitUntil: "load" });
    await reportPage.screenshot({ path: join(outDir, "contact-sheet.png"), fullPage: true });
  } finally {
    await reportPage.close();
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const server = createStaticServer();
  const port = await listenAvailable(server);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await seedFullGrowth(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".mode-tab").nth(2).click();
    await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });

    const overview = await inspectOverview(page);
    const results = [];
    for (const property of realEstates.properties) {
      results.push(await inspectDistrict(page, property.id));
    }
    const uniqueBackgrounds = new Set(results.map((result) => result.backgroundSrc));
    assert(uniqueBackgrounds.size === realEstates.properties.length, `지역별 상세 배경이 고유하지 않습니다: ${uniqueBackgrounds.size}`);

    const report = {
      checkedAt: new Date().toISOString(),
      districtCount: results.length,
      uniqueBackgroundCount: uniqueBackgrounds.size,
      overview,
      failures: [],
      results,
    };
    writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
    writeHtmlReport(overview, results);
    await captureHtmlReportContactSheet(browser);
    console.log(`React 부동산 리소스 전수 감사 통과: overview 1장, 지역 ${results.length}개, 캡처 ${results.length + 1}장, report=${join(outDir, "report.json")}`);
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
