import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDir = resolve("artifacts/react-vite-full-parity-gate");
const reportPath = join(outDir, "report.json");
const failures = [];
const commandResults = [];

mkdirSync(outDir, { recursive: true });

function runCommand(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const startedAt = Date.now();
    const commandLine = [command, ...args].join(" ");
    const child = spawn(commandLine, {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...options.env },
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      const result = {
        command: commandLine,
        code,
        durationMs: Date.now() - startedAt,
      };
      commandResults.push(result);
      if (code !== 0) {
        rejectRun(new Error(`${result.command} exited with code ${code}`));
        return;
      }
      resolveRun(result);
    });
  });
}

function readJson(path) {
  if (!existsSync(path)) {
    failures.push({ scope: "artifact", path, message: "required artifact is missing" });
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rowPattern(signature) {
  return asArray(signature?.rowCounts ?? signature?.bandCounts).join("+");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function expect(condition, scope, message, evidence = {}) {
  if (!condition) failures.push({ scope, message, evidence });
}

function verifyScenarioCounts(label, result) {
  const snapshotCounts = result?.snapshot?.counts;
  const reactCounts = result?.react?.counts;
  if (!snapshotCounts && !reactCounts) return;
  const comparableKeys = [
    "studentTabs",
    "expeditionTabs",
    "statusTiles",
    "companions",
    "expeditionUnits",
    "shopModal",
    "settingsModal",
    "debugModal",
  ];
  for (const key of comparableKeys) {
    expect(snapshotCounts?.[key] === reactCounts?.[key], "interactive-counts", `${label} ${key} count must match`, {
      snapshot: snapshotCounts?.[key],
      react: reactCounts?.[key],
    });
  }
}

function verifyScenarioSemantics(label, result) {
  const snapshotSignatures = result?.snapshot?.semanticSignatures;
  const reactSignatures = result?.react?.semanticSignatures;
  if (!snapshotSignatures && !reactSignatures) return;
  const keys = label.startsWith("expedition-")
    ? ["activePanelTitleText", "activePanelText", "activePanelButtons"]
    : ["activePanelTitleText", "activePanelText", "activePanelButtons", "expeditionCardTexts"];
  for (const key of keys) {
    if (snapshotSignatures?.[key] === undefined && reactSignatures?.[key] === undefined) continue;
    expect(sameJson(snapshotSignatures?.[key], reactSignatures?.[key]), "interactive-semantic", `${label} ${key} semantic signature must match`, {
      snapshot: snapshotSignatures?.[key],
      react: reactSignatures?.[key],
    });
  }
}

function verifyInteractiveScenario(label, result) {
  expect(result?.textEqual === true, "interactive-text", `${label} normalized text must match`, {
    textDiff: result?.textDiff,
  });
  expect(result?.textDiff == null, "interactive-text", `${label} textDiff must be empty`, {
    textDiff: result?.textDiff,
  });
  expect(asArray(result?.state?.diffs).length === 0, "interactive-state", `${label} state diffs must be empty`, {
    diffs: result?.state?.diffs,
  });
  expect(asArray(result?.rectDiffs).length === 0, "interactive-layout", `${label} rectDiffs must be empty`, {
    rectDiffs: result?.rectDiffs,
  });
  expect(asArray(result?.selectorDiffs).length === 0, "interactive-selector", `${label} selectorDiffs must be empty`, {
    selectorDiffs: result?.selectorDiffs,
  });
  expect(asArray(result?.failures).length === 0, "interactive-scenario", `${label} scenario failures must be empty`, {
    failures: result?.failures,
  });
  expect(result?.snapshot?.horizontalOverflow === 0, "interactive-overflow", `${label} snapshot horizontal overflow must be zero`, {
    horizontalOverflow: result?.snapshot?.horizontalOverflow,
  });
  expect(result?.react?.horizontalOverflow === 0, "interactive-overflow", `${label} React horizontal overflow must be zero`, {
    horizontalOverflow: result?.react?.horizontalOverflow,
  });
  expect(asArray(result?.snapshot?.buttonOverflow).length === 0, "interactive-overflow", `${label} snapshot button overflow must be zero`, {
    buttonOverflow: result?.snapshot?.buttonOverflow,
  });
  expect(asArray(result?.react?.buttonOverflow).length === 0, "interactive-overflow", `${label} React button overflow must be zero`, {
    buttonOverflow: result?.react?.buttonOverflow,
  });
  verifyScenarioCounts(label, result);
  verifyScenarioSemantics(label, result);
}

function scenarioIsClean(result) {
  return Boolean(result) &&
    result.textEqual === true &&
    result.textDiff == null &&
    asArray(result.state?.diffs).length === 0 &&
    asArray(result.rectDiffs).length === 0 &&
    asArray(result.selectorDiffs).length === 0 &&
    asArray(result.failures).length === 0 &&
    result.snapshot?.horizontalOverflow === 0 &&
    result.react?.horizontalOverflow === 0 &&
    asArray(result.snapshot?.buttonOverflow).length === 0 &&
    asArray(result.react?.buttonOverflow).length === 0;
}

function evidenceItem(id, title, passed, evidence = {}) {
  const item = {
    id,
    title,
    status: passed ? "pass" : "fail",
    evidence,
  };
  expect(passed, "completion-evidence", `${id} completion evidence must pass`, item);
  return item;
}

function collectFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!existsSync(current)) continue;
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        stack.push(fullPath);
      } else if (stats.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function auditDisallowedTokens() {
  const root = resolve("src/react");
  const patterns = ["??", "fallback", "Fallback", "unknown"];
  const matches = [];
  for (const file of collectFiles(root)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        if (line.includes(pattern)) {
          matches.push({
            file,
            line: index + 1,
            pattern,
            text: line.trim(),
          });
        }
      }
    });
  }
  expect(matches.length === 0, "no-disallowed-token", "src/react contains disallowed fallback-style tokens", {
    count: matches.length,
    samples: matches.slice(0, 20),
  });
  return matches.length;
}

function verifyParityReport() {
  const report = readJson(resolve("artifacts/react-vite-parity/report.json"));
  if (!report) return null;
  const entries = asArray(report.results ?? report.comparisons ?? report.viewports);
  expect(entries.length >= 2, "strict-parity", "strict parity report should include at least two viewport entries", {
    count: entries.length,
  });
  for (const entry of entries) {
    const comparison = entry.comparison ?? entry.visual ?? entry;
    const label = entry.label ?? entry.viewport?.name ?? `${entry.viewport?.width ?? "?"}x${entry.viewport?.height ?? "?"}`;
    expect((comparison.diffPercent ?? 0) === 0, "strict-parity", `${label} diffPercent must be 0`, comparison);
    expect((comparison.meanAbsDiff ?? 0) === 0, "strict-parity", `${label} meanAbsDiff must be 0`, comparison);
    expect((comparison.changedPixels ?? 0) === 0, "strict-parity", `${label} changedPixels must be 0`, comparison);
  }
  return entries.length;
}

function verifySnapshotBuildReport() {
  const report = readJson(resolve("artifacts/snapshot-build-report.json"));
  if (!report) return null;
  expect(existsSync(resolve("dist/index.html")), "snapshot-build", "dist/index.html must exist after snapshot build");
  expect(report.dist?.sha256 || report.sha256, "snapshot-build", "snapshot build report must include a dist hash", report);
  expect(report.dist?.bytes > 0 || report.bytes > 0, "snapshot-build", "snapshot dist output must have bytes", report);
  return {
    mode: report.dist?.mode,
    bytes: report.dist?.bytes ?? report.bytes,
    sha256: report.dist?.sha256 ?? report.sha256,
  };
}

function verifyInteractiveReport() {
  const report = readJson(resolve("artifacts/react-vite-interactive-parity/report.json"));
  if (!report) return null;
  const requiredLabels = [
    "00-initial",
    "student-성장",
    "student-시험",
    "student-동료",
    "student-직장",
    "student-교육",
    "student-결과",
    "student-도감",
    "modal-shop",
    "modal-settings",
    "debug-after-companions",
    "student-companion-after-debug",
    "expedition-growth",
    "expedition-after-three-clears",
    "expedition-after-invest",
    "expedition-파티",
    "expedition-동료-관리",
    "expedition-기록",
    "expedition-party-after-remove",
    "expedition-party-after-assign",
    "expedition-manage-after-lock",
    "expedition-manage-after-fuse",
    "expedition-log-final",
  ];
  const results = asArray(report.results);
  const byLabel = new Map(results.map((result) => [result.label, result]));
  expect(report.checked === 23, "interactive-parity", "interactive parity should check 23 scenarios", {
    checked: report.checked,
  });
  expect(asArray(report.failures).length === 0, "interactive-parity", "interactive parity should have no failures", {
    failures: report.failures,
  });
  for (const label of requiredLabels) {
    const result = byLabel.get(label);
    expect(Boolean(result), "interactive-parity", `missing interactive scenario ${label}`);
    if (result) verifyInteractiveScenario(label, result);
  }

  const growth = byLabel.get("expedition-growth")?.react?.layoutSignatures;
  const party = byLabel.get("expedition-파티")?.react?.layoutSignatures;
  const manage = byLabel.get("expedition-동료-관리")?.react?.layoutSignatures;
  expect(rowPattern(growth?.expeditionBattleUnits) === "2+2+1", "expedition-layout", "expedition battle units must be 2+2+1", growth?.expeditionBattleUnits);
  expect(growth?.expeditionBattleUnits?.frontBandCount === 1, "expedition-layout", "expedition battle front band must have one leader", growth?.expeditionBattleUnits);
  expect((growth?.expeditionBattleUnits?.ySpread ?? 0) >= 52, "expedition-layout", "expedition battle units must not collapse into one row", growth?.expeditionBattleUnits);
  expect((growth?.expeditionBattleUnits?.horizontalCenterSpread ?? 0) >= 94, "expedition-layout", "expedition battle units must not collapse into a narrow line", growth?.expeditionBattleUnits);
  expect(rowPattern(growth?.expeditionGrowthCards) === "2+2+1", "expedition-layout", "expedition growth cards must be 2+2+1", growth?.expeditionGrowthCards);
  expect(rowPattern(party?.expeditionPartySlots) === "3+2", "expedition-layout", "expedition party slots must be 3+2", party?.expeditionPartySlots);
  expect(rowPattern(party?.expeditionRosterCards) === "2+2+2+2+2", "expedition-layout", "expedition roster cards must be two-column rows", party?.expeditionRosterCards);
  expect(rowPattern(manage?.expeditionManageCards) === "2+2+2+2+2", "expedition-layout", "expedition manage cards must be two-column rows", manage?.expeditionManageCards);
  return results.length;
}

function verifyResponsiveReport() {
  const report = readJson(resolve("artifacts/react-vite-responsive-audit/report.json"));
  if (!report) return null;
  const viewports = asArray(report.viewports);
  expect(viewports.length === 8, "responsive-audit", "responsive audit should check 8 viewports", {
    checked: viewports.length,
  });
  expect(asArray(report.failures).length === 0, "responsive-audit", "responsive audit should have no failures", {
    failures: report.failures,
  });
  for (const viewport of viewports) {
    for (const key of ["default", "battle", "shopGacha", "expeditionDebug"]) {
      const metrics = viewport[key];
      if (!metrics) continue;
      expect(metrics.horizontalOverflow === 0, "responsive-audit", `${viewport.name} ${key} horizontal overflow must be zero`, metrics);
      expect(asArray(metrics.buttonOverflow).length === 0, "responsive-audit", `${viewport.name} ${key} button overflow must be zero`, metrics);
      expect(asArray(metrics.failures).length === 0, "responsive-audit", `${viewport.name} ${key} failures must be empty`, metrics);
    }
    const battleUnits = viewport.expeditionBattleUnitLayout;
    if (battleUnits) {
      expect(rowPattern({ rowCounts: battleUnits.verticalBandCounts }) === "2+2+1", "responsive-expedition-layout", `${viewport.name} battle units must be 2+2+1`, battleUnits);
      expect(battleUnits.frontBandCount === 1, "responsive-expedition-layout", `${viewport.name} battle front band must have one leader`, battleUnits);
      expect((battleUnits.verticalBandYSpread ?? 0) >= 52, "responsive-expedition-layout", `${viewport.name} battle units must not collapse into one row`, battleUnits);
      expect((battleUnits.horizontalCenterSpread ?? 0) >= 94, "responsive-expedition-layout", `${viewport.name} battle units must not collapse into a narrow line`, battleUnits);
    }
    const growthCards = viewport.expeditionGrowthCardLayout;
    if (growthCards) {
      expect(rowPattern(growthCards) === "2+2+1", "responsive-expedition-layout", `${viewport.name} growth cards must be 2+2+1`, growthCards);
    }
    const partySlots = viewport.expeditionPartyLayout;
    if (partySlots) {
      expect(rowPattern(partySlots) === "3+2", "responsive-expedition-layout", `${viewport.name} party slots must be 3+2`, partySlots);
    }
    const rosterCards = viewport.expeditionRosterCardLayout;
    if (rosterCards) {
      expect(rosterCards.gridColumnCount === 2, "responsive-expedition-layout", `${viewport.name} roster cards must use two columns`, rosterCards);
    }
    const manageCards = viewport.expeditionManageCardLayout;
    if (manageCards) {
      expect(manageCards.gridColumnCount === 2, "responsive-expedition-layout", `${viewport.name} manage cards must use two columns`, manageCards);
    }
  }
  return viewports.length;
}

function verifyDeepReport() {
  const report = readJson(resolve("artifacts/react-vite-ui-parity-deep-current/text-report.json"));
  if (!report) return null;
  expect(report.staticAnimations === true, "deep-parity", "deep parity default report must use static animations", {
    staticAnimations: report.staticAnimations,
  });
  expect(asArray(report.failures).length === 0, "deep-parity", "deep parity should have no failures", {
    failures: report.failures,
  });
  expect(asArray(report.shop).length === 6, "deep-parity", "deep parity should cover six shop categories", {
    count: asArray(report.shop).length,
  });
  for (const entry of asArray(report.shop)) {
    expect(entry.equal === true, "deep-shop", `${entry.category} shop normalized text must match`, entry);
    expect(asArray(entry.styleDiffs).length === 0, "deep-shop", `${entry.category} shop styleDiffs must be empty`, entry);
  }
  expect(report.gacha?.equal === true, "deep-gacha", "gacha normalized text must match", report.gacha);
  expect(asArray(report.gacha?.styleDiffs).length === 0, "deep-gacha", "gacha styleDiffs must be empty", report.gacha);
  const modalEntries = [report.settings, report.debug].filter(Boolean);
  for (const modal of modalEntries) {
    expect(asArray(modal.failures).length === 0, "deep-modal", `${modal.scenario} modal should have no failures`, modal);
    expect(asArray(modal.styleDiffs).length === 0, "deep-modal", `${modal.scenario} modal styleDiffs must be empty`, modal);
    expect(asArray(modal.svgDiffs).length === 0, "deep-modal", `${modal.scenario} modal svgDiffs must be empty`, modal);
  }
  return {
    shop: asArray(report.shop).length,
    modals: modalEntries.length,
  };
}

function verifyExpeditionRulesReport() {
  const report = readJson(resolve("artifacts/react-vite-expedition-rules-smoke/report.json"));
  if (!report) return null;
  const requiredNames = [
    "boss-first-clear",
    "boss-reward-not-repeated",
    "boss-power-shortage-returns-to-segment-start",
    "normal-power-shortage-keeps-stage",
    "growth-invest-levels-member",
    "fusion-promotes-two-members",
  ];
  const checks = asArray(report.checks);
  const byName = new Map(checks.map((check) => [check.name, check]));
  expect(report.checked === requiredNames.length, "expedition-rules", "expedition rules smoke should check six scenarios", {
    checked: report.checked,
  });
  expect(asArray(report.failures).length === 0, "expedition-rules", "expedition rules smoke should have no failures", {
    failures: report.failures,
  });
  for (const name of requiredNames) {
    expect(byName.has(name), "expedition-rules", `missing expedition rules scenario ${name}`, {
      names: checks.map((check) => check.name),
    });
  }
  const bossClear = byName.get("boss-first-clear");
  expect(bossClear?.after?.currentStage === 101 && bossClear?.after?.highestStage === 100, "expedition-rules", "boss first clear should advance to Stage 101 and highest 100", bossClear);
  expect(asArray(bossClear?.after?.claimedBossStages).includes(100), "expedition-rules", "boss first clear should claim Stage 100", bossClear);
  expect((bossClear?.after?.diamonds ?? 0) > (bossClear?.before?.diamonds ?? 0), "expedition-rules", "boss first clear should grant diamonds", bossClear);

  const repeated = byName.get("boss-reward-not-repeated");
  expect(repeated?.after?.diamonds === repeated?.before?.diamonds, "expedition-rules", "claimed boss reward should not repeat diamonds", repeated);

  const bossShortage = byName.get("boss-power-shortage-returns-to-segment-start");
  expect(bossShortage?.after?.currentStage === 1, "expedition-rules", "boss shortage should return to segment start", bossShortage);
  expect(bossShortage?.after?.trainingExp === bossShortage?.before?.trainingExp, "expedition-rules", "boss shortage should not grant EXP", bossShortage);

  const normalShortage = byName.get("normal-power-shortage-keeps-stage");
  expect(normalShortage?.after?.currentStage === normalShortage?.before?.currentStage, "expedition-rules", "normal shortage should keep current stage", normalShortage);
  expect(normalShortage?.after?.trainingExp === normalShortage?.before?.trainingExp, "expedition-rules", "normal shortage should not grant EXP", normalShortage);

  const growth = byName.get("growth-invest-levels-member");
  expect(growth?.after?.firstMemberLevel === 2, "expedition-rules", "growth investment should level up member", growth);
  expect((growth?.after?.trainingExp ?? 0) < (growth?.before?.trainingExp ?? 0), "expedition-rules", "growth investment should consume EXP", growth);

  const fusion = byName.get("fusion-promotes-two-members");
  expect(fusion?.after?.memberCount === 1 && fusion?.after?.firstMemberTier === "assistant_manager", "expedition-rules", "fusion should promote two staff members into assistant manager", fusion);

  return {
    checked: checks.length,
    scenarios: requiredNames,
  };
}

function verifyCompletionEvidence(summary) {
  const interactive = readJson(resolve("artifacts/react-vite-interactive-parity/report.json"));
  const responsive = readJson(resolve("artifacts/react-vite-responsive-audit/report.json"));
  const deep = readJson(resolve("artifacts/react-vite-ui-parity-deep-current/text-report.json"));
  const parity = readJson(resolve("artifacts/react-vite-parity/report.json"));
  const interactiveResults = asArray(interactive?.results);
  const byLabel = new Map(interactiveResults.map((result) => [result.label, result]));

  const labelsClean = (labels) => labels.every((label) => scenarioIsClean(byLabel.get(label)));
  const labelsPresent = (labels) => labels.every((label) => byLabel.has(label));
  const parityEntries = asArray(parity?.results ?? parity?.comparisons ?? parity?.viewports);
  const strictParityPass = parityEntries.length >= 2 && parityEntries.every((entry) => {
    const comparison = entry.comparison ?? entry.visual ?? entry;
    return (comparison.diffPercent ?? 0) === 0 &&
      (comparison.meanAbsDiff ?? 0) === 0 &&
      (comparison.changedPixels ?? 0) === 0;
  });
  const studentLabels = [
    "student-성장",
    "student-시험",
    "student-동료",
    "student-직장",
    "student-교육",
    "student-결과",
    "student-도감",
    "student-companion-after-debug",
  ];
  const modalLabels = ["modal-shop", "modal-settings", "debug-after-companions"];
  const expeditionLabels = [
    "expedition-growth",
    "expedition-after-three-clears",
    "expedition-after-invest",
    "expedition-파티",
    "expedition-동료-관리",
    "expedition-기록",
    "expedition-party-after-remove",
    "expedition-party-after-assign",
    "expedition-manage-after-lock",
    "expedition-manage-after-fuse",
    "expedition-log-final",
  ];
  const growthLayout = byLabel.get("expedition-growth")?.react?.layoutSignatures;
  const partyLayout = byLabel.get("expedition-파티")?.react?.layoutSignatures;
  const manageLayout = byLabel.get("expedition-동료-관리")?.react?.layoutSignatures;
  const expeditionLayoutPass =
    rowPattern(growthLayout?.expeditionBattleUnits) === "2+2+1" &&
    growthLayout?.expeditionBattleUnits?.frontBandCount === 1 &&
    (growthLayout?.expeditionBattleUnits?.ySpread ?? 0) >= 52 &&
    (growthLayout?.expeditionBattleUnits?.horizontalCenterSpread ?? 0) >= 94 &&
    rowPattern(growthLayout?.expeditionGrowthCards) === "2+2+1" &&
    rowPattern(partyLayout?.expeditionPartySlots) === "3+2" &&
    rowPattern(partyLayout?.expeditionRosterCards) === "2+2+2+2+2" &&
    rowPattern(manageLayout?.expeditionManageCards) === "2+2+2+2+2";
  const responsiveViewports = asArray(responsive?.viewports);
  const responsivePass = responsiveViewports.length === 8 &&
    asArray(responsive?.failures).length === 0 &&
    responsiveViewports.every((viewport) => {
      const surfaces = ["default", "battle", "shopGacha", "expeditionDebug"]
        .map((key) => viewport[key])
        .filter(Boolean);
      return surfaces.every((metrics) => metrics.horizontalOverflow === 0 && asArray(metrics.buttonOverflow).length === 0 && asArray(metrics.failures).length === 0);
    });
  const deepPass = asArray(deep?.failures).length === 0 &&
    asArray(deep?.shop).length === 6 &&
    asArray(deep?.shop).every((entry) => entry.equal === true && asArray(entry.styleDiffs).length === 0) &&
    deep?.gacha?.equal === true &&
    asArray(deep?.gacha?.styleDiffs).length === 0 &&
    [deep?.settings, deep?.debug].filter(Boolean).every((entry) => asArray(entry.failures).length === 0 && asArray(entry.styleDiffs).length === 0 && asArray(entry.svgDiffs).length === 0);
  const expeditionRulesPass = summary.expeditionRules?.checked === 6;
  const docs = [
    "docs/react-vite-parity-migration.md",
    "plans/react-vite-parity-migration/plan.md",
    "implementations/react-vite-parity-migration/implementation.md",
    "plans/react-vite-full-parity-gate/plan.md",
    "implementations/react-vite-full-parity-gate/implementation.md",
  ];

  return [
    evidenceItem("snapshot-html-current", "기존 HTML snapshot build가 현재 소스 기준으로 최신화됨", Boolean(summary.snapshotBuild?.sha256 && summary.snapshotBuild?.bytes > 0 && existsSync(resolve("dist/index.html"))), summary.snapshotBuild),
    evidenceItem("strict-first-screen-parity", "기본 첫 화면 strict visual parity가 2개 모바일 viewport에서 픽셀 차이 0", strictParityPass, {
      checked: parityEntries.length,
    }),
    evidenceItem("student-tab-interaction-parity", "학생 7개 탭과 DEBUG 이후 학생 동료 탭의 텍스트/상태/레이아웃 증거가 일치", labelsPresent(studentLabels) && labelsClean(studentLabels), {
      labels: studentLabels,
    }),
    evidenceItem("modal-shop-settings-debug-parity", "상점/설정/디버그 표면과 deep parity가 원본 기준을 만족", labelsPresent(modalLabels) && labelsClean(modalLabels) && deepPass, {
      labels: modalLabels,
      shopSurfaces: asArray(deep?.shop).length,
      modals: [deep?.settings, deep?.debug].filter(Boolean).length,
    }),
    evidenceItem("expedition-flow-parity", "원정대 성장/파티/관리/기록/편성/잠금/합성 조작이 semantic/state 기준을 만족", labelsPresent(expeditionLabels) && labelsClean(expeditionLabels), {
      labels: expeditionLabels,
    }),
    evidenceItem("expedition-rules-state", "원정대 보스 보상, 전투력 부족, 성장 투자, 승급 합성 상태 규칙이 통과", expeditionRulesPass, summary.expeditionRules),
    evidenceItem("expedition-non-linear-layout", "원정대 동료는 일렬이 아니라 전투 2+2+1, 파티 3+2, 카드 2열 배치를 유지", expeditionLayoutPass, {
      battle: growthLayout?.expeditionBattleUnits,
      growthCards: growthLayout?.expeditionGrowthCards,
      partySlots: partyLayout?.expeditionPartySlots,
      rosterCards: partyLayout?.expeditionRosterCards,
      manageCards: manageLayout?.expeditionManageCards,
    }),
    evidenceItem("responsive-mobile-layout", "8개 viewport에서 overflow, 버튼 잘림, 주요 기능 표면 오류가 없음", responsivePass, {
      checked: responsiveViewports.length,
      failures: responsive?.failures,
    }),
    evidenceItem("no-disallowed-runtime-substitution", "src/react 런타임에 금지된 조용한 대체 토큰이 없음", summary.disallowedTokenMatches === 0, {
      disallowedTokenMatches: summary.disallowedTokenMatches,
    }),
    evidenceItem("migration-documents-current", "React/Vite 이식 계획/구현/검증 문서가 존재함", docs.every((file) => existsSync(resolve(file))), {
      docs,
    }),
  ];
}

async function main() {
  await runCommand("npm", ["run", "snapshot:build"]);
  await runCommand("npm", ["run", "curriculum-vfx:verify"]);
  await runCommand("npm", ["run", "react:verify"]);
  await runCommand("npm", ["run", "react:parity-audit"], {
    env: {
      REACT_PARITY_STRICT: "1",
      REACT_PARITY_MAX_DIFF_PERCENT: "0",
      REACT_PARITY_MAX_MEAN_ABS_DIFF: "0",
    },
  });
  await runCommand("npm", ["run", "react:interactive-parity"]);
  await runCommand("npm", ["run", "react:deep-parity"]);
  await runCommand("npm", ["run", "react:hotspot-crop"]);
  await runCommand("git", ["diff", "--check"]);

  const summary = {
    snapshotBuild: verifySnapshotBuildReport(),
    parityViewports: verifyParityReport(),
    interactiveScenarios: verifyInteractiveReport(),
    responsiveViewports: verifyResponsiveReport(),
    deepSurfaces: verifyDeepReport(),
    expeditionRules: verifyExpeditionRulesReport(),
    disallowedTokenMatches: auditDisallowedTokens(),
  };
  const completionEvidence = verifyCompletionEvidence(summary);

  const report = {
    status: failures.length === 0 ? "pass" : "fail",
    generatedAt: new Date().toISOString(),
    commands: commandResults,
    summary,
    completionEvidence,
    failures,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  failures.push({ scope: "command", message: error.message });
  const report = {
    status: "fail",
    generatedAt: new Date().toISOString(),
    commands: commandResults,
    failures,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
