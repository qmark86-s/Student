import { chromium } from "@playwright/test";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve("dist-react");
const preferredPort = Number(process.env.REACT_REAL_ESTATE_SMOKE_PORT || 5795);
const saveKey = "student-idle-rpg-save-v1";
const fixedNow = Date.parse("2026-06-22T00:00:00+09:00");
const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const expeditionBalance = JSON.parse(readFileSync(resolve("data/expedition_balance.json"), "utf8"));
const realEstates = JSON.parse(readFileSync(resolve("data/real_estates.json"), "utf8"));
const realEstateBuildingAssets = JSON.parse(readFileSync(resolve("data/real_estate_building_assets.json"), "utf8"));
const realEstateDistrictAssets = JSON.parse(readFileSync(resolve("data/real_estate_district_assets.json"), "utf8"));
const realEstateBuildingAssetById = new Map(realEstateBuildingAssets.assets.map((asset) => [asset.id, asset]));
const realEstateDistrictAssetById = new Map(realEstateDistrictAssets.districts.map((asset) => [asset.id, asset]));
const subjectIds = ["korean", "english", "math", "social", "science"];

function expectedSlotCount(districtId) {
  const asset = realEstateDistrictAssetById.get(districtId);
  assert(asset, `${districtId} 지역 리소스 데이터가 없습니다.`);
  return asset.detailPads.length;
}

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stats(value) {
  return Object.fromEntries(subjectIds.map((subject) => [subject, value]));
}

function chapterRun(currentStage, tempExp = 0) {
  const chapter = Math.floor((currentStage - 1) / expeditionBalance.chapterSize) + 1;
  const expPerLevel = expeditionBalance.chapterRunExpPerLevel;
  return {
    chapter,
    tempLevel: Math.max(1, Math.floor(tempExp / expPerLevel) + 1),
    tempExp,
    boostMultiplier: Math.round((1 + Math.max(0, Math.floor(tempExp / expPerLevel)) * 0.01) * 1000) / 1000,
  };
}

function expeditionMember(index) {
  const career = careers[index % careers.length];
  return {
    id: `real-estate-member-${index}`,
    sourceKey: `real-estate-smoke:${career.id}:${index}`,
    sourceRunNumber: 0,
    sourceCareerId: career.id,
    careerName: career.name,
    sourceUniversity: "부동산 검증",
    level: 20,
    exp: 0,
    promotionTier: "staff",
    baseStats: stats(5000),
    locked: false,
    createdAt: fixedNow + index,
    avatarGender: "male",
  };
}

function realEstateState() {
  return {
    cash: 0,
    properties: {},
    rentCarry: 0,
    lastRentAt: fixedNow,
    lastExpeditionFundAt: fixedNow,
    weeklyAssetGain: 0,
    lastWeeklyResetAt: fixedNow,
    claimedWeeklyRewardWeek: null,
    lastAssetValueSnapshot: 0,
  };
}

function seedState() {
  const members = Array.from({ length: 5 }, (_, index) => expeditionMember(index));
  return {
    schemaVersion: 3,
    contentRevision: "real-estate-smoke",
    runNumber: 11,
    money: 1200,
    diamonds: 0,
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
      aptitude: stats(0),
      educationLevels: {},
      autoAllocateStudy: true,
      studyAllocationWeights: stats(100),
      studyAllocationAdjusted: false,
      pauseBeforeGate: true,
      pausedAtGate: false,
      lastWaveKills: 0,
      totalKills: 0,
      examIndex: 0,
      stats: stats(0),
      track: "none",
      trackLocked: false,
      examResults: [],
      awaitingDecision: false,
      outcome: null,
    },
    companions: [],
    expedition: {
      members,
      partyMemberIds: members.map((member) => member.id),
      currentStage: 1,
      highestStage: 0,
      claimedBossStages: [],
      trainingExp: 0,
      chapterRun: chapterRun(1),
      lastResolvedAt: fixedNow,
      log: [],
      stageIndex: 0,
      clearedStageCount: 0,
      lastStageId: null,
    },
    realEstate: realEstateState(),
    archive: [],
    history: [],
    log: [],
  };
}

function fullGrowthState() {
  const state = seedState();
  state.expedition.highestStage = 100;
  state.expedition.clearedStageCount = 100;
  state.realEstate.cash = 1000000000;
  state.realEstate.lastAssetValueSnapshot = 0;
  for (const property of realEstates.properties) {
    state.realEstate.properties[property.id] = { count: 1000 };
  }
  return state;
}

async function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function writeState(page, updaterSource) {
  await page.evaluate(
    ({ key, updater }) => {
      const state = JSON.parse(localStorage.getItem(key));
      const next = Function("state", `return (${updater})(state);`)(state);
      localStorage.setItem(key, JSON.stringify(next));
    },
    { key: saveKey, updater: updaterSource },
  );
}

async function waitForState(page, predicateSource) {
  await page.waitForFunction(
    ({ key, predicate }) => {
      const state = JSON.parse(localStorage.getItem(key));
      return Function("state", `return (${predicate})(state);`)(state);
    },
    { key: saveKey, predicate: predicateSource },
    { timeout: 8000 },
  );
}

async function main() {
  const server = createStaticServer();
  const port = await listenAvailable(server);
  const baseUrl = `http://127.0.0.1:${port}/?qaTools=1&pauseAutoBattle=1`;
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    }, { key: saveKey, state: seedState() });
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert(response && response.status() === 200, `HTTP status ${response?.status()}`);
    if (await page.locator(".load-failure").count()) throw new Error(await page.locator(".load-failure").innerText());

    const modeTexts = await page.locator(".mode-tab").allTextContents();
    assert(modeTexts.length === 3, `모드 탭 수가 3개가 아닙니다: ${modeTexts.length}`);
    assert(modeTexts.join("|") === "학생|원정대|부동산", `모드 탭 순서가 올바르지 않습니다: ${modeTexts.join("|")}`);

    await page.getByRole("button", { name: "부동산" }).click();
    await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    assert((await page.locator(".real-estate-district-button").count()) === 10, "부동산 도시 지역 버튼 10개가 렌더링되지 않았습니다.");
    assert((await page.locator('.real-estate-district-button[data-locked="true"]').count()) >= 1, "잠긴 부동산 도시 지역이 표시되지 않았습니다.");
    await page.locator('.real-estate-district-button[data-district-id="mixed_development"]').click();
    assert((await page.locator('[data-real-estate-view="overview"]').count()) === 1, "잠긴 지역 클릭 후 상세 화면으로 진입했습니다.");
    const lockNotice = await page.locator(".real-estate-map-notice").innerText();
    assert(lockNotice.includes("Stage 100"), "잠긴 지역 Stage 안내가 표시되지 않았습니다.");
    assert((await page.locator("[data-real-estate-card]").count()) === 10, "부동산 카드 10개가 렌더링되지 않았습니다.");
    const normalRewardButton = page.locator(".real-estate-reward-button");
    assert((await normalRewardButton.count()) === 1, "일반 랭킹 보상 수령 버튼이 렌더링되지 않았습니다.");
    assert(await normalRewardButton.isDisabled(), "주간 증가량이 0인데 일반 랭킹 보상 버튼이 활성화되었습니다.");
    await page.waitForFunction(() => {
      const image = document.querySelector(".real-estate-map-image");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    const initialState = await readState(page);
    assert(initialState.realEstate.cash === 0, `초기 부동산 자금이 0이 아닙니다: ${initialState.realEstate.cash}`);

    await page.getByRole("button", { name: "원정대" }).click();
    await page.waitForSelector(".expedition-scene", { timeout: 6000 });
    await page.locator(".expedition-action-button").click();
    await waitForState(page, "(state) => state.expedition.highestStage >= 1 && state.realEstate.cash >= 100");

    await page.getByRole("button", { name: "부동산" }).click();
    await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    await page.locator('.real-estate-district-button[data-district-id="small_studio"]').click();
    await page.waitForSelector('[data-real-estate-view="district"][data-selected-property-id="small_studio"]', { timeout: 6000 });
    assert((await page.locator(".real-estate-city-bottom").count()) === 0, "상세 화면에 삭제 대상 metric card 영역이 남아 있습니다.");
    assert((await page.locator("[data-real-estate-card]").count()) === 1, "상세 화면 구매 패널이 선택 지역 1개 카드로 축소되지 않았습니다.");
    await page.waitForFunction(() => {
      const image = document.querySelector(".real-estate-detail-background");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    const initialDistrictAsset = realEstateDistrictAssetById.get("small_studio");
    assert(initialDistrictAsset, "small_studio 지역 리소스 데이터가 없습니다.");
    const initialDistrictSrc = await page.locator(".real-estate-detail-background").evaluate((image) => image.currentSrc || image.src);
    assert(initialDistrictSrc.includes("visual-real-estate-district-small-studio"), `small_studio 상세 배경이 올바르지 않습니다: ${initialDistrictSrc}`);
    const initialBuildingTheme = await page.locator(".real-estate-development-layer").getAttribute("data-building-theme");
    assert(initialBuildingTheme === initialDistrictAsset.buildingTheme, `small_studio 건물 테마가 올바르지 않습니다: ${initialBuildingTheme}`);
    const smallStudioSlotCount = expectedSlotCount("small_studio");
    assert((await page.locator(".real-estate-development-pad").count()) === smallStudioSlotCount, `지역 상세 빈 부지 패드 ${smallStudioSlotCount}개가 렌더링되지 않았습니다.`);
    assert((await page.locator(".real-estate-development-building").count()) === 0, "미보유 지역 상세에 건물이 표시되었습니다.");
    const detailMap = page.locator(".real-estate-detail-map");
    const beforePan = await detailMap.evaluate((node) => ({ x: Number(node.getAttribute("data-pan-x")), y: Number(node.getAttribute("data-pan-y")) }));
    const viewportBox = await page.locator(".real-estate-detail-viewport").boundingBox();
    assert(viewportBox, "부동산 상세 지도 viewport를 찾을 수 없습니다.");
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2 - 70, viewportBox.y + viewportBox.height / 2 + 55, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction((previous) => {
      const node = document.querySelector(".real-estate-detail-map");
      if (!(node instanceof HTMLElement)) return false;
      return Number(node.getAttribute("data-pan-x")) !== previous.x || Number(node.getAttribute("data-pan-y")) !== previous.y;
    }, beforePan);
    const smallStudio = page.locator('[data-property-id="small_studio"]');
    await smallStudio.locator('[data-action="buy-one"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio && state.realEstate.properties.small_studio.count === 1");
    await page.waitForSelector('.real-estate-development-building[data-slot-id^="small_studio-"]', { timeout: 6000 });
    assert((await page.locator('.real-estate-development-building[data-slot-id^="small_studio-"]').count()) === 1, "첫 구매 후 상세 건물 슬롯이 정확히 1개가 아닙니다.");
    const buildingThemeAfterOne = await page.locator('.real-estate-development-building[data-slot-id^="small_studio-"]').first().getAttribute("data-building-theme");
    const buildingVariantAfterOne = await page.locator('.real-estate-development-building[data-slot-id^="small_studio-"]').first().getAttribute("data-building-variant");
    const buildingAssetAfterOne = await page.locator('.real-estate-development-building[data-slot-id^="small_studio-"]').first().getAttribute("data-building-asset");
    assert(buildingThemeAfterOne === initialDistrictAsset.buildingTheme, `구매 후 건물 테마가 올바르지 않습니다: ${buildingThemeAfterOne}`);
    assert(typeof buildingVariantAfterOne === "string" && buildingVariantAfterOne.length > 0, "구매 후 건물 variant가 없습니다.");
    assert(realEstateBuildingAssetById.has(buildingAssetAfterOne), `구매 후 건물 PNG asset id가 데이터에 없습니다: ${buildingAssetAfterOne}`);
    await page.waitForFunction(() => {
      const image = document.querySelector(".real-estate-development-building img");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    });
    const developmentAfterOne = await smallStudio.getAttribute("data-development-level");
    assert(developmentAfterOne === "1", `첫 구매 후 개발도가 1이 아닙니다: ${developmentAfterOne}`);
    await page.getByRole("button", { name: /전체 도시 보기/ }).click();
    await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    await page.waitForSelector('.real-estate-building-dot[data-slot-id^="small_studio-"]', { timeout: 6000 });
    await page.waitForFunction(() => {
      const image = document.querySelector(".real-estate-building-dot img");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    });
    const overviewDevelopmentAfterOne = await page.locator('.real-estate-district-button[data-district-id="small_studio"]').getAttribute("data-development-level");
    assert(overviewDevelopmentAfterOne === "1", `도시 전체 보기 개발도 반영이 올바르지 않습니다: ${overviewDevelopmentAfterOne}`);
    assert((await page.locator('.real-estate-building-dot[data-slot-id^="small_studio-"]').count()) === 1, "첫 구매 후 도시 전체 건물 슬롯이 정확히 1개가 아닙니다.");
    const afterOne = await readState(page);
    await writeState(page, `(state) => {
      state.realEstate.lastRentAt = Date.now() - 120000;
      return state;
    }`);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "부동산" }).click();
    await waitForState(page, `(state) => state.realEstate.cash > ${afterOne.realEstate.cash}`);

    await writeState(page, `(state) => {
      state.expedition.highestStage = 100;
      state.expedition.clearedStageCount = 100;
      state.realEstate.cash = 5000000;
      state.realEstate.lastAssetValueSnapshot = 0;
      return state;
    }`);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "부동산" }).click();
    await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    const districtBackgroundCheckIds = ["small_studio", "shop_unit", "apartment_complex", "office_tower", "mixed_development"];
    const checkedBackgrounds = new Set();
    for (const districtId of districtBackgroundCheckIds) {
      const expectedAsset = realEstateDistrictAssetById.get(districtId);
      assert(expectedAsset, `${districtId} 지역 리소스 데이터가 없습니다.`);
      await page.locator(`.real-estate-district-button[data-district-id="${districtId}"]`).click();
      await page.waitForSelector(`[data-real-estate-view="district"][data-selected-property-id="${districtId}"]`, { timeout: 6000 });
      await page.waitForFunction(() => {
        const image = document.querySelector(".real-estate-detail-background");
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      });
      const imageSrc = await page.locator(".real-estate-detail-background").evaluate((image) => image.currentSrc || image.src);
      assert(imageSrc.includes(expectedAsset.backgroundAsset.replace(".png", "")), `${districtId} 상세 배경 src가 데이터와 다릅니다: ${imageSrc}`);
      checkedBackgrounds.add(imageSrc);
      const theme = await page.locator(".real-estate-development-layer").getAttribute("data-building-theme");
      assert(theme === expectedAsset.buildingTheme, `${districtId} 건물 테마가 데이터와 다릅니다: ${theme}`);
      await page.getByRole("button", { name: /전체 도시 보기/ }).click();
      await page.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    }
    assert(checkedBackgrounds.size === districtBackgroundCheckIds.length, `지역별 상세 배경이 고유하지 않습니다: ${checkedBackgrounds.size}`);
    await page.locator('.real-estate-district-button[data-district-id="small_studio"]').click();
    await page.waitForSelector('[data-real-estate-view="district"][data-selected-property-id="small_studio"]', { timeout: 6000 });
    await smallStudio.locator('[data-action="buy-ten"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio.count >= 11");
    const scaleText = await smallStudio.innerText();
    assert(scaleText.includes("라인"), "10개 구매 후 규모 명칭이 라인으로 바뀌지 않았습니다.");
    await smallStudio.locator('[data-action="buy-max"]').click();
    await waitForState(page, "(state) => state.realEstate.properties.small_studio.count > 11");
    const rankingText = await page.locator(".real-estate-ranking-panel").innerText();
    assert(rankingText.includes("예상 순위") && rankingText.includes("예상 보상"), "랭킹 preview가 표시되지 않았습니다.");
    await normalRewardButton.waitFor({ state: "attached", timeout: 4000 });
    await page.waitForFunction(() => {
      const button = document.querySelector(".real-estate-reward-button");
      return button && button instanceof HTMLButtonElement && !button.disabled && button.innerText.includes("주간 보상 수령");
    });

    const beforeReward = await readState(page);
    await normalRewardButton.click();
    await waitForState(page, `(state) => state.diamonds > ${beforeReward.diamonds} && state.realEstate.claimedWeeklyRewardWeek !== null`);
    const claimedState = await readState(page);
    assert(claimedState.diamonds > beforeReward.diamonds, "일반 부동산 주간 보상 다이아가 지급되지 않았습니다.");
    await page.waitForFunction(() => {
      const button = document.querySelector(".real-estate-reward-button");
      return button && button instanceof HTMLButtonElement && button.disabled && button.innerText.includes("수령 완료");
    });

    await page.getByLabel("디버그 메뉴").click();
    const rewardButton = page.getByRole("button", { name: /부동산 주간 보상 수령/ });
    await rewardButton.waitFor({ state: "attached", timeout: 4000 });
    assert(await rewardButton.isDisabled(), "일반 보상 수령 후 DEBUG 보상 중복 수령 버튼이 비활성화되지 않았습니다.");

    const beforeDebugCash = (await readState(page)).realEstate.cash;
    await page.getByRole("button", { name: "부동산 자금 +1M" }).click();
    await waitForState(page, `(state) => state.realEstate.cash >= ${beforeDebugCash + 1000000}`);
    await page.getByRole("button", { name: "부동산 Stage 100" }).click();
    await waitForState(page, "(state) => state.expedition.highestStage >= 100");
    await page.getByRole("button", { name: "부동산 모두 1채" }).click();
    await waitForState(page, `(state) => ${JSON.stringify(realEstates.properties.map((property) => property.id))}.every((id) => state.realEstate.properties[id] && state.realEstate.properties[id].count === 1)`);
    await page.getByRole("button", { name: "부동산 풀성장" }).click();
    await waitForState(page, `(state) => ${JSON.stringify(realEstates.properties.map((property) => property.id))}.every((id) => state.realEstate.properties[id] && state.realEstate.properties[id].count === 1000)`);
    await page.getByRole("button", { name: "부동산 초기화" }).click();
    await waitForState(page, "(state) => state.realEstate.cash === 0 && Object.keys(state.realEstate.properties).length === 0");

    const fullPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await fullPage.addInitScript(({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
    }, { key: saveKey, state: fullGrowthState() });
    await fullPage.goto(baseUrl, { waitUntil: "networkidle" });
    await fullPage.getByRole("button", { name: "부동산" }).click();
    await fullPage.waitForSelector('[data-real-estate-view="overview"]', { timeout: 6000 });
    const fullLevels = await fullPage.locator(".real-estate-district-button").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-development-level")));
    assert(fullLevels.length === 10 && fullLevels.every((level) => level === "6"), `풀성장 도시 개발도 표시가 올바르지 않습니다: ${fullLevels.join(",")}`);
    await fullPage.locator('.real-estate-district-button[data-district-id="mixed_development"]').click();
    await fullPage.waitForSelector('[data-real-estate-view="district"][data-selected-property-id="mixed_development"]', { timeout: 6000 });
    const mixedDevelopmentSlotCount = expectedSlotCount("mixed_development");
    assert((await fullPage.locator(".real-estate-development-building").count()) === mixedDevelopmentSlotCount, `풀성장 지역 상세 건물 수가 ${mixedDevelopmentSlotCount}개가 아닙니다.`);
    assert((await fullPage.locator(".real-estate-development-building img").count()) === mixedDevelopmentSlotCount, `풀성장 지역 상세 건물 PNG 수가 ${mixedDevelopmentSlotCount}개가 아닙니다.`);
    await fullPage.waitForFunction(() => [...document.querySelectorAll(".real-estate-development-building img")].every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), null, { timeout: 6000 });
    await fullPage.close();

    console.log("React 부동산 smoke 통과: 도시 overview, 잠김 안내, 상세 대형 배경, PNG 건물, 상세 pan, 구매 개발도, 임대수익, 랭킹, 주간 보상, DEBUG 부동산 조작, 풀성장 도시 확인");
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
