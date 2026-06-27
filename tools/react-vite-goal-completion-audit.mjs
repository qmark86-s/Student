import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDir = resolve("artifacts/react-vite-goal-completion-audit");
const reportPath = join(outDir, "report.json");
const matrixPath = join(outDir, "matrix.md");

const paths = {
  full: resolve("artifacts/react-vite-full-parity-gate/report.json"),
  interactive: resolve("artifacts/react-vite-interactive-parity/report.json"),
  deep: resolve("artifacts/react-vite-ui-parity-deep-current/text-report.json"),
  responsive: resolve("artifacts/react-vite-responsive-audit/report.json"),
  expeditionRules: resolve("artifacts/react-vite-expedition-rules-smoke/report.json"),
};

const requiredInteractiveLabels = [
  "00-initial",
  "student-성장",
  "student-시험",
  "student-장비",
  "student-직장",
  "student-교육",
  "student-결과",
  "student-도감",
  "modal-shop",
  "modal-settings",
  "debug-after-members",
  "student-equipment-after-debug",
  "expedition-growth",
  "expedition-after-three-clears",
  "expedition-after-invest",
  "expedition-파티",
  "expedition-대원-관리",
  "expedition-기록",
  "expedition-party-after-remove",
  "expedition-party-after-assign",
  "expedition-manage-after-lock",
  "expedition-manage-after-fuse",
  "expedition-log-final",
];

const requiredEvidenceIds = [
  "snapshot-html-current",
  "strict-first-screen-parity",
  "student-tab-interaction-parity",
  "modal-shop-settings-debug-parity",
  "expedition-flow-parity",
  "expedition-rules-state",
  "expedition-non-linear-layout",
  "responsive-mobile-layout",
  "no-disallowed-runtime-substitution",
  "migration-documents-current",
];

const requiredExpeditionRuleScenarios = [
  "boss-first-clear",
  "boss-reward-not-repeated",
  "boss-power-shortage-returns-to-segment-start",
  "normal-power-shortage-keeps-stage",
  "growth-invest-levels-member",
  "fusion-promotes-two-members",
];

function readJson(name) {
  const path = paths[name];
  if (!existsSync(path)) throw new Error(`필수 감사 산출물이 없습니다: ${name} ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function array(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} 배열이 필요합니다.`);
  return value;
}

function fail(item, message, details) {
  item.status = "fail";
  item.failures.push({ message, details });
}

function requirement(id, title) {
  return { id, title, status: "pass", failures: [], evidence: {} };
}

function listMissing(required, actual) {
  const set = new Set(actual);
  return required.filter((item) => !set.has(item));
}

function countsPattern(signature) {
  if (!signature) return "";
  if (Array.isArray(signature.bandCounts)) return signature.bandCounts.join("+");
  if (Array.isArray(signature.rowCounts)) return signature.rowCounts.join("+");
  return "";
}

function isTwoColumnGrid(signature) {
  if (!signature || !Array.isArray(signature.rowCounts)) return false;
  if (signature.rowCounts.length < 2) return false;
  return signature.rowCounts.every((count) => count > 0 && count <= 2);
}

function buildAudit() {
  const full = readJson("full");
  const interactive = readJson("interactive");
  const deep = readJson("deep");
  const responsive = readJson("responsive");
  const expeditionRules = readJson("expeditionRules");

  const items = [];

  const fullItem = requirement("full-gate-pass", "상위 React/Vite full parity gate가 현재 artifact 기준 통과");
  fullItem.evidence = {
    status: full.status,
    failureCount: array(full.failures, "full.failures").length,
    evidenceCount: array(full.completionEvidence, "full.completionEvidence").length,
    summary: full.summary,
  };
  if (full.status !== "pass") fail(fullItem, "full gate status가 pass가 아닙니다.", full.status);
  if (full.failures.length !== 0) fail(fullItem, "full gate failures가 비어 있지 않습니다.", full.failures);
  const evidenceStatuses = full.completionEvidence.map((entry) => ({ id: entry.id, status: entry.status }));
  const missingEvidence = listMissing(requiredEvidenceIds, evidenceStatuses.map((entry) => entry.id));
  if (missingEvidence.length > 0) fail(fullItem, "필수 completion evidence가 없습니다.", missingEvidence);
  const failedEvidence = evidenceStatuses.filter((entry) => entry.status !== "pass");
  if (failedEvidence.length > 0) fail(fullItem, "pass가 아닌 completion evidence가 있습니다.", failedEvidence);
  items.push(fullItem);

  const interactiveItem = requirement("same-click-interactive-coverage", "기존 HTML과 React/Vite를 같은 시나리오로 열고 클릭한 비교 범위");
  const interactiveResults = array(interactive.results, "interactive.results");
  const interactiveLabels = interactiveResults.map((result) => result.label);
  interactiveItem.evidence = {
    count: interactiveResults.length,
    labels: interactiveLabels,
    failureCount: array(interactive.failures, "interactive.failures").length,
  };
  const missingInteractive = listMissing(requiredInteractiveLabels, interactiveLabels);
  if (missingInteractive.length > 0) fail(interactiveItem, "필수 interactive 시나리오가 없습니다.", missingInteractive);
  if (interactive.failures.length !== 0) fail(interactiveItem, "interactive parity failures가 비어 있지 않습니다.", interactive.failures);
  const scenarioProblems = interactiveResults
    .map((result) => ({
      label: result.label,
      failures: Array.isArray(result.failures) ? result.failures.length : -1,
      stateDiffs: result.state && Array.isArray(result.state.diffs) ? result.state.diffs.length : 0,
      rectDiffs: Array.isArray(result.rectDiffs) ? result.rectDiffs.length : 0,
      selectorDiffs: Array.isArray(result.selectorDiffs) ? result.selectorDiffs.length : 0,
    }))
    .filter((result) => result.failures !== 0 || result.stateDiffs !== 0 || result.rectDiffs !== 0 || result.selectorDiffs !== 0);
  if (scenarioProblems.length > 0) fail(interactiveItem, "시나리오별 diff/failure가 0이 아닙니다.", scenarioProblems);
  items.push(interactiveItem);

  const studentItem = requirement("student-tab-parity", "학생 7개 탭 UI와 상태 비교가 직접 증거를 가진다");
  const studentLabels = requiredInteractiveLabels.filter((label) => label.startsWith("student-") && label !== "student-equipment-after-debug");
  studentItem.evidence = {
    labels: studentLabels,
    activePanelDiffPercent: Object.fromEntries(
      studentLabels.map((label) => {
        const result = interactiveResults.find((entry) => entry.label === label);
        const percent = result && result.visualRegions && result.visualRegions.activePanel ? result.visualRegions.activePanel.diffPercent : null;
        return [label, percent];
      }),
    ),
  };
  const missingStudent = listMissing(studentLabels, interactiveLabels);
  if (missingStudent.length > 0) fail(studentItem, "학생 탭 비교 시나리오가 부족합니다.", missingStudent);
  items.push(studentItem);

  const expeditionItem = requirement("expedition-ui-and-layout-parity", "원정대 탭과 대원 비일렬 레이아웃이 사용자 기준을 만족한다");
  const expeditionLabels = requiredInteractiveLabels.filter((label) => label.startsWith("expedition-"));
  const growth = interactiveResults.find((entry) => entry.label === "expedition-growth");
  const party = interactiveResults.find((entry) => entry.label === "expedition-파티");
  const manage = interactiveResults.find((entry) => entry.label === "expedition-대원-관리");
  const growthLayout = growth && growth.react && growth.react.layoutSignatures ? growth.react.layoutSignatures : {};
  const partyLayout = party && party.react && party.react.layoutSignatures ? party.react.layoutSignatures : {};
  const manageLayout = manage && manage.react && manage.react.layoutSignatures ? manage.react.layoutSignatures : {};
  expeditionItem.evidence = {
    labels: expeditionLabels,
    battleUnits: growthLayout.expeditionBattleUnits,
    partySlots: partyLayout.expeditionPartySlots,
    growthCards: growthLayout.expeditionGrowthCards,
    rosterCards: partyLayout.expeditionRosterCards,
    manageCards: manageLayout.expeditionManageCards,
  };
  const missingExpedition = listMissing(expeditionLabels, interactiveLabels);
  if (missingExpedition.length > 0) fail(expeditionItem, "원정대 조작 비교 시나리오가 부족합니다.", missingExpedition);
  if (countsPattern(growthLayout.expeditionBattleUnits) !== "2+2+1") fail(expeditionItem, "원정대 전투 대원이 2+2+1이 아닙니다.", growthLayout.expeditionBattleUnits);
  if (!growthLayout.expeditionBattleUnits || growthLayout.expeditionBattleUnits.frontBandCount !== 1) fail(expeditionItem, "원정대 앞줄 리더가 1명이 아닙니다.", growthLayout.expeditionBattleUnits);
  if (!growthLayout.expeditionBattleUnits || growthLayout.expeditionBattleUnits.horizontalCenterSpread < 94) fail(expeditionItem, "원정대 전투 대원 좌우 폭이 좁아 일렬처럼 보일 수 있습니다.", growthLayout.expeditionBattleUnits);
  if (countsPattern(partyLayout.expeditionPartySlots) !== "3+2") fail(expeditionItem, "원정대 파티 슬롯이 3+2가 아닙니다.", partyLayout.expeditionPartySlots);
  if (countsPattern(growthLayout.expeditionGrowthCards) !== "2+2+1") fail(expeditionItem, "원정대 성장 카드가 2+2+1이 아닙니다.", growthLayout.expeditionGrowthCards);
  if (partyLayout.expeditionRosterCards && partyLayout.expeditionRosterCards.count >= 5 && !isTwoColumnGrid(partyLayout.expeditionRosterCards)) fail(expeditionItem, "원정대 파티 후보 카드가 2열 그리드가 아닙니다.", partyLayout.expeditionRosterCards);
  if (manageLayout.expeditionManageCards && manageLayout.expeditionManageCards.count >= 5 && !isTwoColumnGrid(manageLayout.expeditionManageCards)) fail(expeditionItem, "원정대 대원 관리 카드가 2열 그리드가 아닙니다.", manageLayout.expeditionManageCards);
  items.push(expeditionItem);

  const deepItem = requirement("shop-settings-debug-deep-parity", "상점 7개 탭, 장비 뽑기, 설정, 디버그 deep parity가 통과한다");
  const shop = array(deep.shop, "deep.shop");
  deepItem.evidence = {
    shop: shop.map((entry) => ({ category: entry.category, equal: entry.equal, styleDiffs: array(entry.styleDiffs, `${entry.category}.styleDiffs`).length })),
    gacha: { equal: deep.gacha.equal, styleDiffs: deep.gacha.styleDiffs.length, svgDiffs: deep.gacha.svgDiffs.length },
    settings: { equal: deep.settings.equal, styleDiffs: deep.settings.styleDiffs.length, svgDiffs: deep.settings.svgDiffs.length },
    debug: { equal: deep.debug.equal, styleDiffs: deep.debug.styleDiffs.length, svgDiffs: deep.debug.svgDiffs.length },
  };
  if (shop.length !== 7) fail(deepItem, "상점 탭 수가 7개가 아닙니다.", shop.map((entry) => entry.category));
  for (const entry of shop) {
    if (entry.equal !== true) fail(deepItem, `${entry.category} 상점 텍스트가 일치하지 않습니다.`, entry);
    if (entry.styleDiffs.length !== 0) fail(deepItem, `${entry.category} 상점 styleDiffs가 있습니다.`, entry.styleDiffs);
  }
  for (const key of ["gacha", "settings", "debug"]) {
    const surface = deep[key];
    if (!surface || surface.equal !== true) fail(deepItem, `${key} 텍스트가 일치하지 않습니다.`, surface);
    if (!surface || surface.styleDiffs.length !== 0) fail(deepItem, `${key} styleDiffs가 있습니다.`, surface ? surface.styleDiffs : null);
    if (!surface || surface.svgDiffs.length !== 0) fail(deepItem, `${key} svgDiffs가 있습니다.`, surface ? surface.svgDiffs : null);
  }
  items.push(deepItem);

  const responsiveItem = requirement("responsive-viewport-coverage", "8개 해상도에서 overflow와 주요 레이아웃 검증이 통과한다");
  const viewports = array(responsive.viewports, "responsive.viewports");
  responsiveItem.evidence = {
    count: viewports.length,
    names: viewports.map((viewport) => `${viewport.name}:${viewport.width}x${viewport.height}`),
    failureCount: array(responsive.failures, "responsive.failures").length,
  };
  if (viewports.length !== 8) fail(responsiveItem, "responsive viewport 수가 8개가 아닙니다.", responsiveItem.evidence.names);
  if (responsive.failures.length !== 0) fail(responsiveItem, "responsive audit failures가 있습니다.", responsive.failures);
  items.push(responsiveItem);

  const rulesItem = requirement("expedition-state-rules", "원정대 보스/전투력/성장/승급 상태 규칙이 화면 조작으로 검증된다");
  const ruleChecks = array(expeditionRules.checks, "expeditionRules.checks");
  const ruleNames = ruleChecks.map((check) => check.name);
  rulesItem.evidence = {
    checked: expeditionRules.checked,
    failures: array(expeditionRules.failures, "expeditionRules.failures").length,
    scenarios: ruleNames,
  };
  const missingRules = listMissing(requiredExpeditionRuleScenarios, ruleNames);
  if (missingRules.length > 0) fail(rulesItem, "원정대 규칙 smoke 시나리오가 부족합니다.", missingRules);
  if (expeditionRules.failures.length !== 0) fail(rulesItem, "원정대 규칙 smoke failures가 있습니다.", expeditionRules.failures);
  items.push(rulesItem);

  const docsItem = requirement("documentation-current", "계획/구현/마이그레이션 문서가 현재 검증 기준을 설명한다");
  const docs = [
    "docs/react-vite-parity-migration.md",
    "plans/react-vite-parity-migration/plan.md",
    "implementations/react-vite-parity-migration/implementation.md",
    "plans/react-vite-full-parity-gate/plan.md",
    "implementations/react-vite-full-parity-gate/implementation.md",
    "plans/react-vite-goal-completion-audit/plan.md",
    "implementations/react-vite-goal-completion-audit/implementation.md",
  ];
  docsItem.evidence = { docs };
  for (const doc of docs) {
    if (!existsSync(resolve(doc))) fail(docsItem, "필수 문서가 없습니다.", doc);
  }
  items.push(docsItem);

  const failures = items.flatMap((item) => item.failures.map((failure) => ({ id: item.id, ...failure })));
  return {
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? "pass" : "fail",
    sources: paths,
    items,
    failures,
  };
}

function writeMatrix(report) {
  const lines = [
    "# React/Vite 목표 완료 감사 매트릭스",
    "",
    `- 생성 시각: ${report.generatedAt}`,
    `- 상태: ${report.status}`,
    `- 실패 수: ${report.failures.length}`,
    "",
    "| 요구사항 | 상태 | 직접 증거 |",
    "| --- | --- | --- |",
  ];
  for (const item of report.items) {
    const evidence = Object.entries(item.evidence)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key} ${value.length}`;
        if (value && typeof value === "object") return `${key}`;
        return `${key} ${value}`;
      })
      .join(", ");
    lines.push(`| ${item.title} | ${item.status} | ${evidence} |`);
  }
  lines.push("");
  lines.push("## 실패");
  if (report.failures.length === 0) {
    lines.push("- 없음");
  } else {
    for (const failure of report.failures) {
      lines.push(`- ${failure.id}: ${failure.message}`);
    }
  }
  lines.push("");
  lines.push("## 해석 기준");
  lines.push("- 원정대원 비일렬 배치는 최신 사용자 지시가 원본 HTML보다 우선하는 의도된 차이다.");
  lines.push("- live animation과 글리프 rasterization 잔차는 selector/state/rect/style 증거와 함께 해석한다.");
  lines.push("- 상점 결제, 광고 실연동, Android AAB는 현재 React/Vite UI parity 목표와 별도 릴리스 차수다.");
  return `${lines.join("\n")}\n`;
}

mkdirSync(outDir, { recursive: true });
const report = buildAudit();
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(matrixPath, writeMatrix(report), "utf8");

if (report.failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: report.status, items: report.items.length, failures: report.failures.length, reportPath, matrixPath }, null, 2));
