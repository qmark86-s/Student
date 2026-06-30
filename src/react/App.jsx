import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Coins,
  CreditCard,
  Database,
  Download,
  Bell,
  FileJson,
  Gem,
  GraduationCap,
  History,
  Lock,
  LockOpen,
  Medal,
  Package,
  PauseCircle,
  Pencil,
  RefreshCcw,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";

import battleRoadConfig from "../../data/battle_road_config.json";
import careerCollectionData from "../../data/career_collection_effects.json";
import careers from "../../data/careers.json";
import growthLevels from "../../data/growth_levels.json";
import visualAssets from "../../data/visual_assets.json";
import {
  activeEnemyForBattle,
  advanceBattleByMs,
  acceptCareerChoice,
  battleRoadVisualPhase,
  completeCurrentBattle,
  curriculumAttackVfxForBattle,
  ensureBattleState,
  startRetakeYear,
  studentAutoTickMs,
} from "./game/battleRoad.js";
import { getCareerPortraitUrl, getCompanionFrameUrls, getExpeditionBackdropUrl, getExpeditionEnemyFrameUrls, getStudentFrameUrls } from "./game/assets.js";
import {
  careerAlumniCareer,
} from "./game/companions.js";
import {
  addDiamonds,
  drawEquipmentProduct,
  equipEquipment,
  equipmentDrawCopy,
  equipmentPower,
  equipmentSellValue,
  equipmentSlotLabel,
  equipmentSlots,
  exchangeMoneyProduct,
  fuseEquipment,
  fusionMaterialCount,
  rarityLabels,
  rarityTiers,
  shopCategories,
  shopProducts,
} from "./game/equipment.js";
import { autoBattlePausedForQa, qaToolsEnabled } from "./game/debugTools.js";
import {
  educationActions,
  educationAvailable,
  educationCategoryLabels,
  educationCost,
  educationEffect,
  educationLevel,
  educationPointMultiplier,
  educationSubjectsLabel,
  upgradeEducation,
} from "./game/education.js";
import {
  addDebugExpeditionMembers,
  assignRecommendedExpeditionParty,
  assignExpeditionMember,
  claimExpeditionPendingReward,
  claimExpeditionDispatch,
  completeExpeditionStage,
  createExpeditionDispatchViewModel,
  createExpeditionManagementViewModel,
  createExpeditionSummary,
  createExpeditionViewModel,
  expeditionAutoTickMs,
  fuseExpeditionMembers,
  levelUpExpeditionMember,
  removeExpeditionMemberFromParty,
  reorderExpeditionPartyMembers,
  resolveExpeditionAutoCombat,
  startExpeditionDispatch,
  toggleExpeditionMemberLock,
} from "./game/expedition.js";
import {
  accrueRealEstateIncome,
  claimDebugRealEstateWeeklyReward,
  claimRealEstateWeeklyReward,
  createRealEstateViewModel,
  debugGrantRealEstateCash,
  debugResetRealEstateState,
  debugSetAllRealEstateCounts,
  debugUnlockRealEstateStages,
  purchaseMaxRealEstateProperty,
  purchaseRealEstateProperty,
  realEstateAutoTickMs,
} from "./game/realEstate.js";

import { accrueWorkIncome } from "./game/work.js";
import { collectionBonuses, discoveredCareerIds as discoveredCareerIdsFor } from "./game/collection.js";
import { CONTENT_REVISION, createDefaultGameState, loadGameState, normalizeGameState, saveGameState, summarizeGameState } from "./game/save.js";
import { resolveGradeVisual } from "./game/grades.js";
import elementaryBackdrop from "../snapshot/assets/visual-battle-road-backdrop-elementary.png";
import highBackdrop from "../snapshot/assets/visual-battle-road-backdrop-high.png";
import middleBackdrop from "../snapshot/assets/visual-battle-road-backdrop-middle.png";
import repeaterBackdrop from "../snapshot/assets/visual-battle-road-backdrop-repeater.png";
import realEstateCityMap from "../snapshot/assets/visual-real-estate-city-map.png";
import studentAtlas from "../snapshot/assets/asset-002.png";
import mainMonsterAtlas from "../snapshot/assets/asset-003.png";

const LOCKED_CAREER_LABEL = "\u003f\u003f\u003f";
const EXPEDITION_STAGE_TRANSITION_MS = 4000;
const EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS = 3000;
const EXPEDITION_ENCOUNTER_APPROACH_MS = 1000;
const EXPEDITION_STAGE_BACKDROP_STEP_PX = 80;
const EXPEDITION_CHAPTER_STAGE_COUNT = 1000;
const EXPEDITION_BACKDROP_TILE_COUNT = 10;
const EXPEDITION_BACKDROP_STAGES_PER_TILE = 25;
const EXPEDITION_BACKDROP_ROUTE_CYCLE_STAGE_COUNT = EXPEDITION_BACKDROP_TILE_COUNT * EXPEDITION_BACKDROP_STAGES_PER_TILE;
const EXPEDITION_COMBAT_FLOAT_REPLAY_MS = 1900;
const EXPEDITION_BATTLE_REPLAY_MS = 3600;
const EXPEDITION_BATTLE_EVENT_REPLAY_MS = 2200;
const EXPEDITION_PARTY_REORDER_MS = 500;
const EXPEDITION_COMBAT_FLOAT_ANIMATION_MS = 920;
const EXPEDITION_COMBAT_FLOAT_MAX_COUNT = 8;
const EXPEDITION_ENEMY_DEATH_ANIMATION_MS = 720;
const EXPEDITION_ENEMY_DEFEAT_STAGGER_MS = 650;
const EXPEDITION_POST_DEFEAT_MOVE_DELAY_MS = 260;

function requireConfig(condition, message) {
  if (!condition) throw new Error(message);
}

function expeditionStageBackdropOffset(stageNumber, chapterNumber = 1) {
  const stage = Math.max(1, Math.floor(Number(stageNumber) || 1));
  const stageInRouteCycle = ((stage - 1) % EXPEDITION_BACKDROP_ROUTE_CYCLE_STAGE_COUNT) + 1;
  const stageInTile = ((stageInRouteCycle - 1) % EXPEDITION_BACKDROP_STAGES_PER_TILE) + 1;
  return -((stageInTile - 1) * EXPEDITION_STAGE_BACKDROP_STEP_PX);
}

function expeditionStageBackdropTile(stageNumber) {
  const stage = Math.max(1, Math.floor(Number(stageNumber) || 1));
  const stageInRouteCycle = ((stage - 1) % EXPEDITION_BACKDROP_ROUTE_CYCLE_STAGE_COUNT) + 1;
  return Math.max(0, Math.min(EXPEDITION_BACKDROP_TILE_COUNT - 1, Math.floor((stageInRouteCycle - 1) / EXPEDITION_BACKDROP_STAGES_PER_TILE)));
}

function expeditionEnemyDefeatMap(report, stageNumber, enemies) {
  const defeatMap = new Map();
  if (!report || Number(report.stage) !== Number(stageNumber)) return defeatMap;
  const append = (entry) => {
    const id = entry?.id;
    if (!id || defeatMap.has(id)) return;
    const order = defeatMap.size + 1;
    defeatMap.set(id, {
      order,
      delayMs: Number.isFinite(Number(entry.delayMs)) ? Math.max(0, Math.round(Number(entry.delayMs))) : (order - 1) * EXPEDITION_ENEMY_DEFEAT_STAGGER_MS,
      sequence: Number(entry.sequence) || order,
    });
  };
  (Array.isArray(report.enemyDefeatOrder) ? report.enemyDefeatOrder : []).forEach((entry) => {
    append({ ...entry, delayMs: expeditionReportEventDelayMs(report, { time: entry.time, sequence: entry.sequence }) });
  });
  (Array.isArray(report.enemyHp) ? report.enemyHp : [])
    .filter((enemy) => Number(enemy.remainingHp) <= 0)
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .forEach((enemy) => append({ id: enemy.id, sequence: Number(enemy.slot) || 1 }));
  enemies
    .filter((enemy) => Number(enemy.remainingHp) <= 0)
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .forEach((enemy) => append({ id: enemy.id, sequence: Number(enemy.slot) || 1 }));
  return defeatMap;
}

function expeditionEnemyHpMap(report, stageNumber) {
  const hpMap = new Map();
  if (!report || Number(report.stage) !== Number(stageNumber)) return hpMap;
  (Array.isArray(report.enemyHp) ? report.enemyHp : []).forEach((enemy) => {
    if (!enemy?.id) return;
    hpMap.set(enemy.id, {
      remainingHp: Math.max(0, Number(enemy.remainingHp) || 0),
      maxHp: Math.max(1, Number(enemy.maxHp) || 1),
    });
  });
  return hpMap;
}

function expeditionDefeatedEnemyCount(report) {
  const defeatOrderCount = Array.isArray(report?.enemyDefeatOrder) ? report.enemyDefeatOrder.length : 0;
  const defeatedHpCount = (Array.isArray(report?.enemyHp) ? report.enemyHp : []).filter((enemy) => Number(enemy.remainingHp) <= 0).length;
  return Math.max(defeatOrderCount, defeatedHpCount);
}

function expeditionReportDurationSeconds(report) {
  const eventTimes = (Array.isArray(report?.events) ? report.events : []).map((event) => Number(event.time)).filter(Number.isFinite);
  const maxEventTime = eventTimes.length ? Math.max(...eventTimes) : 0;
  return Math.max(0.1, Number(report?.durationSeconds) || 0, maxEventTime);
}

function expeditionReportEventDelayMs(report, event) {
  const time = Number(event?.time);
  if (Number.isFinite(time)) {
    return Math.round(140 + (Math.max(0, time) / expeditionReportDurationSeconds(report)) * EXPEDITION_BATTLE_EVENT_REPLAY_MS);
  }
  const sequence = Math.max(1, Math.floor(Number(event?.sequence) || 1));
  return Math.round(140 + (sequence - 1) * 120);
}

function expeditionLastKillDelayMs(report) {
  const killEvents = Array.isArray(report?.enemyDefeatOrder) ? report.enemyDefeatOrder : [];
  if (killEvents.length === 0) return 0;
  return Math.max(...killEvents.map((event, index) => {
    const eventDelay = expeditionReportEventDelayMs(report, event);
    const minimumSequenceDelay = 140 + index * EXPEDITION_ENEMY_DEFEAT_STAGGER_MS;
    return Math.max(eventDelay, minimumSequenceDelay);
  }));
}

function expeditionVictoryMoveDelayMs(report) {
  if (report?.result !== "win") return 0;
  const defeatedCount = expeditionDefeatedEnemyCount(report);
  if (defeatedCount <= 0) return 0;
  const minimumDefeatDelay = (defeatedCount - 1) * EXPEDITION_ENEMY_DEFEAT_STAGGER_MS;
  return Math.max(minimumDefeatDelay, expeditionLastKillDelayMs(report)) + EXPEDITION_ENEMY_DEATH_ANIMATION_MS + EXPEDITION_POST_DEFEAT_MOVE_DELAY_MS;
}

function expeditionBattleReplayHoldMs(report) {
  if (report?.result !== "win") return EXPEDITION_BATTLE_REPLAY_MS;
  return expeditionVictoryMoveDelayMs(report) + EXPEDITION_STAGE_TRANSITION_MS + 120;
}

function expeditionReplayHpMaps(report, stageNumber, playheadMs) {
  const party = new Map();
  const enemies = new Map();
  if (!report || Number(report.stage) !== Number(stageNumber)) return { party, enemies };
  const events = Array.isArray(report.events) ? report.events : [];
  events
    .slice()
    .sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0) || (Number(a.sequence) || 0) - (Number(b.sequence) || 0))
    .forEach((event) => {
      if (expeditionReportEventDelayMs(report, event) > playheadMs) return;
      const targetId = event.targetId || event.target;
      if (!targetId) return;
      const snapshot = {
        remainingHp: Math.max(0, Math.round(Number(event.targetHpAfter) || 0)),
        maxHp: Math.max(1, Math.round(Number(event.targetMaxHp) || 1)),
      };
      if (event.targetSide === "ally") party.set(targetId, snapshot);
      if (event.targetSide === "enemy") enemies.set(targetId, snapshot);
    });
  return { party, enemies };
}

const firstGrowth = growthLevels[0];
requireConfig(firstGrowth, "growth_levels.json 첫 성장 레벨 데이터가 없습니다.");
requireConfig(careers.length > 0, "careers.json 직업 데이터가 없습니다.");
const enemyAtlas = visualAssets.atlases.find((atlas) => atlas.id === "mainMonsters");
requireConfig(enemyAtlas, "visual_assets.json mainMonsters atlas가 없습니다.");
requireConfig(Number.isFinite(enemyAtlas.cell), "visual_assets.json mainMonsters cell 값이 없습니다.");
requireConfig(Number.isFinite(enemyAtlas.columns), "visual_assets.json mainMonsters columns 값이 없습니다.");
const enemyCell = enemyAtlas.cell;
const enemyColumns = enemyAtlas.columns;
const battlePresentation = battleRoadConfig.presentation;
const backdrops = {
  elementary: elementaryBackdrop,
  middle: middleBackdrop,
  high: highBackdrop,
  repeater: repeaterBackdrop,
};
const realEstateDistrictBackgroundModules = import.meta.glob("../snapshot/assets/visual-real-estate-district-*.png", { eager: true, import: "default" });
const realEstateDistrictBackgrounds = Object.fromEntries(Object.entries(realEstateDistrictBackgroundModules).map(([path, asset]) => [path.split("/").pop(), asset]));
const realEstateDistrictGrowthModules = import.meta.glob("../snapshot/assets/real-estate-district-growth/*.png", { eager: true, import: "default" });
const realEstateDistrictGrowthImages = Object.fromEntries(Object.entries(realEstateDistrictGrowthModules).map(([path, asset]) => [path.slice(path.indexOf("real-estate-district-growth/")), asset]));
const realEstateBuildingModules = import.meta.glob("../snapshot/assets/real-estate-buildings/*.png", { eager: true, import: "default" });
const realEstateBuildingImages = Object.fromEntries(Object.entries(realEstateBuildingModules).map(([path, asset]) => [path.slice(path.indexOf("real-estate-buildings/")), asset]));
const totalCareerAtlasFrames = careers.length * 2;

function careerAtlasStyle(career, gender) {
  requireConfig(gender === "male" || gender === "female", `직업 atlas gender 값이 올바르지 않습니다: ${gender}`);
  requireConfig(Number.isFinite(career.choiceRank), `직업 atlas choiceRank 값이 올바르지 않습니다: ${career.id}`);
  const careerIndex = career.choiceRank - 1;
  requireConfig(careerIndex >= 0 && careerIndex < careers.length, `직업 atlas choiceRank 범위가 올바르지 않습니다: ${career.id}`);
  requireConfig(totalCareerAtlasFrames > 1, "직업 atlas frame 수가 부족합니다.");
  requireConfig(career.auraColor, `직업 auraColor 값이 없습니다: ${career.id}`);
  const frameIndex = careerIndex + (gender === "female" ? careers.length : 0);
  const position = Math.round((frameIndex / (totalCareerAtlasFrames - 1)) * 1000000) / 10000;
  return {
    "--visual-career-x": `${position}%`,
    backgroundColor: career.auraColor,
  };
}
const subjects = [
  { id: "korean", label: "국", fullLabel: "국어", color: "#d84f68" },
  { id: "english", label: "영", fullLabel: "영어", color: "#2b8a7e" },
  { id: "math", label: "수", fullLabel: "수학", color: "#4d6fd6" },
  { id: "social", label: "사", fullLabel: "사회", color: "#b56a2c" },
  { id: "science", label: "과", fullLabel: "과학", color: "#5a8c35" },
];

const collectionEffectById = new Map(careerCollectionData.collectionEffects.map((effect) => [effect.id, effect]));
const careerEffectByCareerId = new Map(careerCollectionData.careerCollectionEffects.map((effect) => [effect.careerId, effect]));
requireConfig(careerCollectionData.collectionEffects.length === 4, "career_collection_effects.json collectionEffects 4종이 필요합니다.");
requireConfig(careerCollectionData.careerCollectionEffects.length === careers.length, "career_collection_effects.json 직업 효과 수가 careers.json과 일치하지 않습니다.");
for (const career of careers) {
  requireConfig(careerEffectByCareerId.has(career.id), `career_collection_effects.json에서 직업 효과를 찾을 수 없습니다: ${career.id}`);
}

function Users({ size = 24 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-users"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FastForward({ size = 24 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-fast-forward"
    >
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  );
}

function Trophy({ size = 24 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-trophy"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

const tabs = [
  { id: "growth", label: "성장", icon: BarChart3 },
  { id: "exam", label: "시험", icon: ScrollText },
  { id: "equipment", label: "장비", icon: Pencil },
  { id: "work", label: "직장", icon: BriefcaseBusiness },
  { id: "education", label: "교육", icon: GraduationCap },
  { id: "result", label: "결과", icon: Trophy },
  { id: "archive", label: "도감", icon: Medal },
];
const visualKeyAliases = {
  march_eval: "march_mock",
  midterm: "june_mock",
  final: "september_mock",
  year_boss: "suneung",
};
const suneungVisualKeyByMonth = {
  1: "march_mock",
  2: "june_mock",
  3: "september_mock",
  4: "suneung",
  5: "suneung",
};
const companionStatusLabels = {
  idle: "대기",
  work: "근무",
};
const shopCategoryIcons = {
  diamond: Gem,
  money: Coins,
  stationery_gacha: Pencil,
  book_gacha: BookOpen,
  remove_ads: ShieldCheck,
  package: Package,
  pass: CalendarDays,
};
const productIcons = {
  gem: Gem,
  pencil: Pencil,
  book: BookOpen,
  coins: Coins,
  shield: ShieldCheck,
  package: Package,
  calendar: CalendarDays,
  scroll: ScrollText,
};
const rarityRank = Object.keys(rarityTiers).reduce((map, rarity, index) => ({ ...map, [rarity]: index }), {});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCompactNumber(value) {
  const number = finiteNumber(value, `숫자 형식 값이 올바르지 않습니다: ${value}`);
  const abs = Math.abs(number);
  const compactUnits = [
    { value: 1_000_000_000_000_000_000, suffix: "Qi" },
    { value: 1_000_000_000_000_000, suffix: "Qa" },
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
  ];
  if (abs >= 1e21) {
    const exponent = Math.floor(Math.log10(abs));
    const mantissa = number / (10 ** exponent);
    return `${mantissa.toFixed(2)}e${exponent}`;
  }
  const unit = compactUnits.find((entry) => abs >= entry.value);
  if (unit) return `${(number / unit.value).toFixed(1)}${unit.suffix}`;
  if (abs >= 10_000) return `${(number / 1_000).toFixed(1)}K`;
  if (abs >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return formatMoney(Math.round(number));
}

function expeditionRewardToastText(before, after) {
  const trainingExp = Math.max(0, Math.floor(Number(after.expedition?.trainingExp || 0) - Number(before.expedition?.trainingExp || 0)));
  const realEstateCash = Math.max(0, Math.floor(Number(after.realEstate?.cash || 0) - Number(before.realEstate?.cash || 0)));
  const diamonds = Math.max(0, Math.floor(Number(after.diamonds || 0) - Number(before.diamonds || 0)));
  const money = Math.max(0, Math.floor(Number(after.money || 0) - Number(before.money || 0)));
  const pieces = [];
  if (trainingExp > 0) pieces.push(`EXP +${formatCompactNumber(trainingExp)}`);
  if (realEstateCash > 0) pieces.push(`부동산 +${formatCompactNumber(realEstateCash)}`);
  if (diamonds > 0) pieces.push(`다이아 +${formatCompactNumber(diamonds)}`);
  if (money > 0) pieces.push(`돈 +${formatCompactNumber(money)}`);
  return pieces.join(" · ");
}

function expeditionVisualReadyForAutoCombat() {
  if (typeof document === "undefined") return true;
  const scene = document.querySelector(".expedition-scene");
  if (!scene) return true;
  return scene.getAttribute("data-combat-ready") === "true";
}

function compactCombatName(value) {
  const text = String(value || "").replace(/\s+/g, "");
  if (text.length <= 5) return text;
  return `${text.slice(0, 5)}…`;
}

const expeditionFloatPositions = {
  ally: {
    1: { x: 31, y: 43 },
    2: { x: 17, y: 36 },
    3: { x: 27, y: 39 },
    4: { x: 39, y: 36 },
    5: { x: 20, y: 42 },
  },
  enemy: {
    1: { x: 67, y: 39 },
    2: { x: 78, y: 36 },
    3: { x: 88, y: 40 },
    4: { x: 73, y: 34 },
    5: { x: 84, y: 35 },
  },
};

function expeditionFloatPosition(side, slot) {
  const sideKey = side === "ally" ? "ally" : "enemy";
  const slots = expeditionFloatPositions[sideKey];
  return slots[Math.max(1, Math.min(5, Math.floor(Number(slot) || 1)))] || slots[1];
}

function normalizeCombatFloatEvent(event, index, timing) {
  const actorSide = event.actorSide === "enemy" ? "enemy" : "ally";
  const targetSide = event.targetSide === "ally" ? "ally" : "enemy";
  const targetSlot = Math.max(1, Math.floor(Number(event.targetSlot) || 1));
  const position = expeditionFloatPosition(targetSide, targetSlot);
  const kind = event.kind === "heal" ? "heal" : event.killed ? "kill" : targetSide === "ally" ? "hit" : "damage";
  const actorLabel = event.actorLabel || event.actor || "행동자";
  const targetLabel = event.targetLabel || event.target || "대상";
  const delayMs = Math.round(timing.baseDelayMs + timing.stepMs * index);
  const valuePrefix = event.kind === "heal" ? "+" : "-";
  const valueText = event.killed ? targetSide === "ally" ? "전투불능" : "처치" : `${valuePrefix}${formatCompactNumber(event.value)}`;
  const hpAfter = Number.isFinite(Number(event.targetHpAfter)) && Number.isFinite(Number(event.targetMaxHp))
    ? `${formatCompactNumber(event.targetHpAfter)}/${formatCompactNumber(event.targetMaxHp)}`
    : "";
  return {
    ...event,
    id: `${event.sequence || index + 1}-${event.time}-${event.actorId || event.actor}-${event.targetId || event.target}`,
    actorSide,
    targetSide,
    targetSlot,
    visualKind: kind,
    actorLabel,
    targetLabel,
    actorShort: compactCombatName(actorLabel),
    targetShort: compactCombatName(targetLabel),
    valueText,
    hpAfter,
    delayMs,
    style: {
      "--float-x": `${position.x}%`,
      "--float-y": `${position.y}%`,
      "--float-delay": `${delayMs}ms`,
      "--float-duration": `${EXPEDITION_COMBAT_FLOAT_ANIMATION_MS}ms`,
    },
  };
}

function expeditionCombatFloatEvents(report) {
  const events = Array.isArray(report?.events) ? report.events : [];
  if (events.length === 0) return [];
  const blockedTargets = new Set();
  const timeline = [];
  for (const event of events) {
    const targetKey = event.targetId || event.target;
    if (blockedTargets.has(targetKey)) continue;
    timeline.push(event);
    if (event.killed) blockedTargets.add(targetKey);
  }
  const visible = timeline.slice(-EXPEDITION_COMBAT_FLOAT_MAX_COUNT);
  const maxDelay = Math.max(0, EXPEDITION_COMBAT_FLOAT_REPLAY_MS - EXPEDITION_COMBAT_FLOAT_ANIMATION_MS - 80);
  const stepMs = visible.length <= 1 ? 0 : Math.min(150, Math.floor(maxDelay / (visible.length - 1)));
  const baseDelayMs = visible.length <= 1 ? 120 : 40;
  return visible.map((event, index) => normalizeCombatFloatEvent(event, index, { baseDelayMs, stepMs }));
}

function formatShopCost(value) {
  const number = finiteNumber(value, `상점 비용 값이 올바르지 않습니다: ${value}`);
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return formatMoney(number);
}

function isContentCurrent(gameState) {
  return gameState.contentRevision === CONTENT_REVISION;
}

function contentRevisionLabel(gameState) {
  return typeof gameState.contentRevision === "string" && gameState.contentRevision.length > 0 ? gameState.contentRevision.slice(0, 8) : "legacy";
}

function studyLevelCost(startLevel, levels) {
  let total = 0;
  for (let index = 0; index < levels; index += 1) {
    const row = growthLevels[startLevel + index];
    if (!row) return Infinity;
    total += finiteNumber(row.cost, `growth_levels.json cost 값이 올바르지 않습니다: ${startLevel + index}`);
  }
  return total;
}

function formatDateTime(value) {
  const timestamp = Number(value);
  assert(Number.isFinite(timestamp) && timestamp > 0, `기록 시각 값이 올바르지 않습니다: ${value}`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDurationMs(value) {
  const totalMinutes = Math.max(0, Math.ceil(finiteNumber(value, "시간 표시 값이 올바르지 않습니다.") / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}

function formatClockTime(value) {
  const timestamp = Number(value);
  assert(Number.isFinite(timestamp) && timestamp > 0, `시각 표시 값이 올바르지 않습니다: ${value}`);
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function frameFromMap(map, key, label) {
  const direct = map[key];
  const aliased = map[visualKeyAliases[key]];
  assert(Number.isFinite(direct) || Number.isFinite(aliased), `${label} 몬스터 프레임 누락: ${key}`);
  return Number.isFinite(direct) ? direct : aliased;
}

function enemyFrame(enemy, gradeVisual) {
  if (enemy.kind === "normal") {
    assert(Array.isArray(gradeVisual.normalMonsterFrames) && gradeVisual.normalMonsterFrames.length > 0, `${gradeVisual.studentTitle} 일반 몬스터 프레임 목록이 비어 있습니다.`);
    const month = finiteNumber(enemy.month, `일반 몬스터 month 값이 올바르지 않습니다: ${enemy.id}`);
    assert(month >= 1, `${gradeVisual.studentTitle} 일반 몬스터 month 값은 1 이상이어야 합니다: ${month}`);
    const index = (month - 1) % gradeVisual.normalMonsterFrames.length;
    return gradeVisual.normalMonsterFrames[index];
  }

  if (enemy.kind === "suneung") {
    const month = finiteNumber(enemy.month, `수능 몬스터 month 값이 올바르지 않습니다: ${enemy.id}`);
    const key = suneungVisualKeyByMonth[month];
    assert(key, `수능 몬스터 visualMonth 매핑이 없습니다: ${enemy.id} / ${month}`);
    return frameFromMap(gradeVisual.examMonsterFrames, key, gradeVisual.studentTitle);
  }

  return frameFromMap(gradeVisual.examMonsterFrames, enemy.visualKey, gradeVisual.studentTitle);
}

function enemyName(enemy, gradeVisual) {
  if (enemy.kind === "normal") {
    assert(Array.isArray(gradeVisual.normalMonsterNames) && gradeVisual.normalMonsterNames.length > 0, `${gradeVisual.studentTitle} 일반 몬스터 이름 목록이 비어 있습니다.`);
    const month = finiteNumber(enemy.month, `일반 몬스터 month 값이 올바르지 않습니다: ${enemy.id}`);
    assert(month >= 1, `${gradeVisual.studentTitle} 일반 몬스터 이름 month 값은 1 이상이어야 합니다: ${month}`);
    const index = (month - 1) % gradeVisual.normalMonsterNames.length;
    assert(gradeVisual.normalMonsterNames[index], `${gradeVisual.studentTitle} 일반 몬스터 이름 누락: ${enemy.month}`);
    return gradeVisual.normalMonsterNames[index];
  }
  if (enemy.kind === "suneung") {
    assert(gradeVisual.examMonsterNames.suneung, `${gradeVisual.studentTitle} 수능 몬스터 이름 누락`);
    return gradeVisual.examMonsterNames.suneung;
  }
  const directName = gradeVisual.examMonsterNames[enemy.visualKey];
  if (directName) return directName;
  const aliasKey = visualKeyAliases[enemy.visualKey];
  assert(aliasKey, `${gradeVisual.studentTitle} 시험 몬스터 이름 alias 누락: ${enemy.visualKey}`);
  const aliasName = gradeVisual.examMonsterNames[aliasKey];
  assert(aliasName, `${gradeVisual.studentTitle} 시험 몬스터 alias 이름 누락: ${enemy.visualKey} -> ${aliasKey}`);
  return aliasName;
}

function enemyStyle(frame) {
  return {
    backgroundImage: `url(${mainMonsterAtlas})`,
  };
}

function frameXPercent(frame, columns) {
  const max = Math.max(1, columns - 1);
  const frameNumber = finiteNumber(frame, `아틀라스 frame 값이 올바르지 않습니다: ${frame}`);
  assert(frameNumber >= 0 && frameNumber < columns, `아틀라스 frame 범위 초과: ${frameNumber}/${columns}`);
  return `${(frameNumber / max) * 100}%`;
}

const topIconPaths = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </>
  ),
  shop: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  menu: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

function IconButton({ alert = false, icon, label, onClick }) {
  const buttonClass = icon === "shop" ? "icon-button shop" : icon === "menu" ? "icon-button menu" : alert ? "icon-button alert" : "icon-button";

  return (
    <button className={buttonClass} type="button" aria-label={label} title={label} onClick={onClick}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {topIconPaths[icon]}
      </svg>
    </button>
  );
}

function Header({ debugAlert, expeditionSummary, mode, onOpenDebug, onOpenSettings, onOpenShop, realEstateSummary, summary }) {
  const titleRef = useRef(null);
  const titleLabel = mode === "expedition" ? "원정대" : mode === "realEstate" ? "부동산" : "학생 방치 RPG";
  const prefixLabel =
    mode === "expedition"
      ? expeditionSummary.headerPrefix
      : mode === "realEstate"
        ? `자산 ${formatCompactNumber(realEstateSummary.totalAssetValue)}`
        : `${summary.runNumber}회차 · ${summary.courseBand}`;

  useLayoutEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    const span = title.querySelector(":scope > span");
    if (!span) return;

    const nodes = Array.from(title.childNodes);
    const spanIndex = nodes.indexOf(span);
    const firstText = nodes[spanIndex + 1];
    const secondText = nodes[spanIndex + 2];
    if (
      firstText?.nodeType === Node.TEXT_NODE &&
      firstText.nodeValue === " " &&
      secondText?.nodeType === Node.TEXT_NODE &&
      secondText.nodeValue === titleLabel &&
      nodes.length === spanIndex + 3
    ) {
      return;
    }

    for (const node of nodes.slice(spanIndex + 1)) {
      node.remove();
    }
    title.appendChild(document.createTextNode(" "));
    title.appendChild(document.createTextNode(titleLabel));
  }, [prefixLabel, titleLabel]);

  return (
    <header className="app-header">
      <h1 ref={titleRef}>
        <span>{prefixLabel}</span>
      </h1>
      <nav className="header-actions" aria-label="상단 메뉴">
        <IconButton alert={debugAlert} icon="database" label="디버그 메뉴" onClick={onOpenDebug} />
        <IconButton icon="shop" label="상점" onClick={onOpenShop} />
        <IconButton icon="menu" label="설정" onClick={onOpenSettings} />
      </nav>
    </header>
  );
}

function StatusGrid({ expeditionSummary, mode, realEstateSummary, summary }) {
  const items =
    mode === "expedition"
      ? [
        ["Stage", String(expeditionSummary.stage)],
        ["파티", `${expeditionSummary.partyCount}/${expeditionSummary.partySize}`],
        ["전투력", `${formatCompactNumber(expeditionSummary.partyPower)}/${formatCompactNumber(expeditionSummary.enemyPower)}`],
        ["보유 EXP", formatCompactNumber(expeditionSummary.trainingExp)],
        ["다이아", formatCompactNumber(expeditionSummary.diamonds)],
      ]
      : mode === "realEstate"
        ? [
          ["총 자산", formatCompactNumber(realEstateSummary.totalAssetValue)],
          ["부동산 자금", formatCompactNumber(realEstateSummary.cash)],
          ["임대/분", formatCompactNumber(realEstateSummary.rentPerMinute)],
          ["주간 증가", formatCompactNumber(realEstateSummary.weeklyAssetGain)],
          ["예상 순위", `${formatCompactNumber(realEstateSummary.rank)}위`],
        ]
      : [
        ["과정", summary.courseLabel],
        ["나이", `${summary.age}세`],
        ["보유금", `${formatMoney(summary.money)}원`],
        ["다이아", formatCompactNumber(summary.diamonds)],
        ["공부량", formatMoney(summary.unspentStudyPoints)],
      ];

  return (
    <section className="status-grid" aria-label={mode === "expedition" ? "원정대 현재 상태" : mode === "realEstate" ? "부동산 현재 상태" : "플레이어 상태"}>
      {items.map(([label, value]) => (
        <div className="status-tile" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function ModeTabs({ mode, onModeChange }) {
  return (
    <section className="mode-tabs" aria-label="모드 선택">
      <button className={mode === "student" ? "mode-tab active" : "mode-tab"} type="button" onClick={() => onModeChange("student")}>
        <GraduationCap size={24} />
        <span>학생</span>
      </button>
      <button className={mode === "expedition" ? "mode-tab active" : "mode-tab"} type="button" onClick={() => onModeChange("expedition")}>
        <Medal size={24} />
        <span>원정대</span>
      </button>
      <button className={mode === "realEstate" ? "mode-tab active" : "mode-tab"} type="button" onClick={() => onModeChange("realEstate")}>
        <BriefcaseBusiness size={24} />
        <span>부동산</span>
      </button>
    </section>
  );
}

function CurriculumAttackVfx({ battle }) {
  const target = activeEnemyForBattle(battle);
  const vfx = curriculumAttackVfxForBattle(battle, target);
  if (!vfx) return null;

  return (
    <div className="curriculum-attack-vfx-layer" data-palette={vfx.palette} data-pool={vfx.pool} data-style={vfx.style} data-subject={vfx.subject} aria-hidden="true">
      <span
        className={`curriculum-attack-vfx-token curriculum-vfx-${vfx.style} subject-${vfx.subject}`}
        data-token={vfx.token}
        style={{
          "--curriculum-vfx-left": `${vfx.left}%`,
          "--curriculum-vfx-top": `${vfx.top}%`,
          "--curriculum-vfx-width": `${vfx.width}px`,
          "--curriculum-vfx-primary": vfx.colors.primary,
          "--curriculum-vfx-accent": vfx.colors.accent,
          "--curriculum-vfx-paper": vfx.colors.paper,
          "--curriculum-vfx-shadow": vfx.colors.shadow,
        }}
      >
        {vfx.token}
      </span>
    </div>
  );
}

function BattleLineup({ battle, gradeVisual }) {
  const phase = battleRoadVisualPhase(battle);
  const activeEnemy = activeEnemyForBattle(battle);
  const slots =
    battle.kind === "suneung"
      ? battle.enemies.length > 1
        ? battlePresentation.enemySlots.suneungPair
        : battlePresentation.enemySlots.suneungSingle
      : battlePresentation.enemySlots.school;

  return (
    <div
      className={`battle-scene-lineup battle-road-lineup ${battle.kind} road-${phase} encounter-${battle.encounterIndex + 1}`}
      data-encounter-index={battle.encounterIndex}
      data-road-phase={phase}
      style={{
        "--road-travel-ms": `${battle.roadTiming.travelMs}ms`,
        "--road-approach-ms": `${battle.roadTiming.approachMs}ms`,
        "--road-parallax-px": `${battle.roadCamera.parallaxDistancePx}px`,
      }}
      aria-label="전투 적 편대"
    >
      {battle.enemies.map((enemy, index) => {
        const frame = enemyFrame(enemy, gradeVisual);
        const slot = slots[index];
        assert(slot, `전투 적 슬롯 누락: ${battle.encounterId} / ${index}`);
        const hpRatio = Math.max(0, Math.min(1, enemy.remainingHp / Math.max(1, enemy.maxHp)));
        const defeated = enemy.remainingHp <= 0;
        const bossLike = enemy.kind === "boss" || enemy.kind === "suneung";
        const isActive = activeEnemy?.id === enemy.id;
        return (
          <div
            className={`battle-scene-enemy ${enemy.kind} slot-${index + 1}${isActive ? " active" : ""}${defeated ? " defeated" : ""}`}
            key={enemy.id}
            style={{
              "--scene-enemy-left": `${slot[0]}%`,
              "--scene-enemy-top": `${slot[1]}%`,
              "--scene-enemy-scale": slot[2],
              "--scene-enemy-z": 10 + Math.round(slot[1]),
              "--monster-frame-x": frameXPercent(frame, enemyColumns),
            }}
            title={enemyName(enemy, gradeVisual)}
          >
            {bossLike && (
              <span className="battle-scene-hp" aria-hidden="true">
                <i style={{ width: `${hpRatio * 100}%` }} />
              </span>
            )}
            <span className="battle-scene-monster-art" style={enemyStyle(frame)} aria-hidden="true" />
            <small aria-label={enemy.label} />
          </div>
        );
      })}
    </div>
  );
}

function EquippedItemIcon({ item, slotId }) {
  const Icon = slotId === "book" ? BookOpen : Pencil;
  const tier = item ? rarityTiers[item.rarity] : null;
  if (item) assert(tier, `지원하지 않는 장비 등급입니다: ${item.id} / ${item.rarity}`);
  return (
    <span
      className={item ? `equipment-orbit-item rarity-${item.rarity}` : "equipment-orbit-item empty"}
      style={{ "--equipment-color": tier?.color || "#94a3b8" }}
      title={item ? `${item.name} · 전투력 +${equipmentPower(item)}` : `${equipmentSlotLabel(slotId)} 비어 있음`}
    >
      <Icon size={24} />
      <span>{item ? item.rarity : "-"}</span>
    </span>
  );
}

function EquipmentLineup({ items }) {
  assert(Array.isArray(items), "장착 장비 목록 데이터가 배열이 아닙니다.");
  const bySlot = Object.fromEntries(equipmentSlots.map((slot, index) => [slot.id, items[index] || null]));
  return (
    <div className="equipment-lineup" aria-label="장착 장비">
      {equipmentSlots.map((slot) => <EquippedItemIcon key={slot.id} item={bySlot[slot.id]} slotId={slot.id} />)}
    </div>
  );
}

function BattleArena({ awaitingDecision, battle, gradeVisual, onDebugComplete, onToggleAuto, showDebugTools, summary }) {
  const phase = battleRoadVisualPhase(battle);
  const backdrop = backdrops[gradeVisual.phase];
  assert(backdrop, `전투 배경 누락: ${gradeVisual.phase}`);
  assert(Number.isFinite(Number(gradeVisual.order)), `학년 order가 없습니다: ${gradeVisual.studentTitle}`);
  const gradeOrder = Math.min(16, Math.max(1, Number(gradeVisual.order)));
  assert(["male", "female"].includes(summary.avatarGender), `학생 avatarGender 값이 올바르지 않습니다: ${summary.avatarGender}`);
  const gender = summary.avatarGender;
  const studentScale = (0.9 + Math.min(gradeOrder, 16) * 0.018).toFixed(3);
  const studentFrame = (gradeOrder - 1) * 4;
  const maxDurationMs = finiteNumber(battle.maxDurationMs, `전투 maxDurationMs 값이 올바르지 않습니다: ${battle.encounterId}`);
  const elapsedMs = finiteNumber(battle.elapsedMs, `전투 elapsedMs 값이 올바르지 않습니다: ${battle.encounterId}`);
  assert(maxDurationMs > 0, `전투 maxDurationMs 값은 1 이상이어야 합니다: ${battle.encounterId}`);
  const displayRemainingSeconds = Math.ceil(Math.max(0, maxDurationMs - elapsedMs) / 1000);
  const elapsedPercent = Math.max(0, Math.min(1, elapsedMs / maxDurationMs));

  return (
    <section
      className={`react-battle-arena stage-scene scene-${gradeVisual.phase} visual-year-${gradeOrder} road-${phase}`}
      aria-label="방치 전투 장면"
      style={{
        "--battle-road-bg-image": `url(${backdrop})`,
        "--student-scale": studentScale,
      }}
    >
      <div className={`pixel-arena road-${phase}`} role="img" tabIndex={-1}>
        <img className="arena-background-sheet" src={backdrop} alt="" aria-hidden="true" />
        <div className="arena-background-grid" aria-hidden="true" />
        <div className="speech-bubble student">연필 깎았고, 지우개도 준비. 문제야 와라.</div>
        <div className="pixel-floor" aria-hidden="true" />
        <div
          className={`student-sprite active student-${gradeVisual.phase} student-grade-${gradeOrder} student-gender-${gender}`}
          title={`${gradeVisual.studentTitle} · ${gradeVisual.age}세`}
        >
          <span
            className="student-art"
            style={{
              "--student-frame-a": frameXPercent(studentFrame, 64),
              "--student-frame-b": frameXPercent(studentFrame + 1, 64),
              "--student-frame-c": frameXPercent(studentFrame + 2, 64),
              "--student-frame-d": frameXPercent(studentFrame + 3, 64),
              "--student-frame-y": gender === "female" ? "100%" : "0%",
              backgroundImage: `url(${studentAtlas})`,
            }}
          />
        </div>
        <EquipmentLineup items={summary.equippedItems} />
        <span className="pencil-shot" aria-hidden="true" />
        <CurriculumAttackVfx battle={battle} />
        <BattleLineup battle={battle} gradeVisual={gradeVisual} />
        {showDebugTools && !awaitingDecision && (
          <button className="battle-debug-complete" type="button" title="디버그 전투 완료" onClick={onDebugComplete}>
            <FastForward size={13} />
            <span>DEBUG</span>
          </button>
        )}
        <div className="battle-arena-overlay">
          <div className="scene-progress battle-arena-progress">
            <div className="scene-progress-label">
              <span>{battle.kind === "suneung" ? "수능 제한시간" : "학년 제한시간"}</span>
              <strong>{displayRemainingSeconds}초</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${elapsedPercent * 100}%` }} />
            </div>
          </div>
          <button
            className={summary.autoAllocateStudy ? "hud-button battle-auto-toggle on" : "hud-button battle-auto-toggle"}
            type="button"
            onClick={onToggleAuto}
          >
            <PauseCircle size={14} />
            <span>Auto</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function SpriteFrames({ className, frames }) {
  return (
    <>
      {frames.map((frame, index) => (
        <img alt="" className={`${className} frame-${index}`} key={frame} src={frame} />
      ))}
    </>
  );
}

function expeditionPartyOrderIds(gameState) {
  const ids = gameState?.expedition?.partyMemberIds;
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}

function sameExpeditionPartySet(leftIds, rightIds) {
  if (leftIds.length !== rightIds.length) return false;
  const remaining = new Map();
  for (const id of leftIds) remaining.set(id, (remaining.get(id) || 0) + 1);
  for (const id of rightIds) {
    const count = remaining.get(id) || 0;
    if (count <= 0) return false;
    if (count === 1) remaining.delete(id);
    else remaining.set(id, count - 1);
  }
  return remaining.size === 0;
}

function expeditionPartyOrderChanged(leftIds, rightIds) {
  return leftIds.length === rightIds.length && leftIds.some((id, index) => id !== rightIds[index]);
}

function ExpeditionScene({ gameState, onCombatReadyChange, onExpeditionComplete, onOpenPendingReward, rewardToast }) {
  const [displayGameState, setDisplayGameState] = useState(gameState);
  const [stageTransition, setStageTransition] = useState(null);
  const [combatReplay, setCombatReplay] = useState(null);
  const [battleReplay, setBattleReplay] = useState(null);
  const [battleReplayNow, setBattleReplayNow] = useState(0);
  const [encounterIntro, setEncounterIntro] = useState(null);
  const [partyReorderActive, setPartyReorderActive] = useState(false);
  const latestGameStateRef = useRef(gameState);
  const previousGameStateRef = useRef(gameState);
  const partyOrderRef = useRef(expeditionPartyOrderIds(gameState));
  const stageTransitionRef = useRef(null);
  const transitionStartTimerRef = useRef(0);
  const transitionTimerRef = useRef(0);
  const combatReplayTimerRef = useRef(0);
  const battleReplayTimerRef = useRef(0);
  const battleReplayIntervalRef = useRef(0);
  const encounterIntroTimerRef = useRef(0);
  const partyReorderTimerRef = useRef(0);
  const seenBattleIdRef = useRef(gameState?.expedition?.pendingReward?.lastBattle?.id || "");

  useEffect(() => {
    return () => {
      if (transitionStartTimerRef.current) window.clearTimeout(transitionStartTimerRef.current);
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      if (combatReplayTimerRef.current) window.clearTimeout(combatReplayTimerRef.current);
      if (battleReplayTimerRef.current) window.clearTimeout(battleReplayTimerRef.current);
      if (battleReplayIntervalRef.current) window.clearInterval(battleReplayIntervalRef.current);
      if (encounterIntroTimerRef.current) window.clearTimeout(encounterIntroTimerRef.current);
      if (partyReorderTimerRef.current) window.clearTimeout(partyReorderTimerRef.current);
    };
  }, []);

  useEffect(() => {
    stageTransitionRef.current = stageTransition;
  }, [stageTransition]);

  useEffect(() => {
    const previousOrder = partyOrderRef.current;
    const nextOrder = expeditionPartyOrderIds(gameState);
    const isReorderOnly =
      previousOrder.length > 1 &&
      sameExpeditionPartySet(previousOrder, nextOrder) &&
      expeditionPartyOrderChanged(previousOrder, nextOrder);

    partyOrderRef.current = nextOrder.slice();
    if (!isReorderOnly) return;

    if (partyReorderTimerRef.current) window.clearTimeout(partyReorderTimerRef.current);
    setPartyReorderActive(true);
    partyReorderTimerRef.current = window.setTimeout(() => {
      setPartyReorderActive(false);
      partyReorderTimerRef.current = 0;
    }, EXPEDITION_PARTY_REORDER_MS);
  }, [gameState]);

  useEffect(() => {
    latestGameStateRef.current = gameState;
    const previousGameState = previousGameStateRef.current;
    const previousStage = Number(previousGameState?.expedition?.currentStage || 1);
    const nextStage = Number(gameState?.expedition?.currentStage || 1);
    const stageAdvanced = nextStage > previousStage && Number(gameState?.expedition?.highestStage || 0) >= previousStage;

    if (stageAdvanced) {
      if (transitionStartTimerRef.current) window.clearTimeout(transitionStartTimerRef.current);
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      if (encounterIntroTimerRef.current) window.clearTimeout(encounterIntroTimerRef.current);
      setEncounterIntro(null);
      const transition = {
        id: `${previousStage}-${nextStage}-${Date.now()}`,
        fromStage: previousStage,
        toStage: nextStage,
      };
      setDisplayGameState(previousGameState);
      setStageTransition(null);
      stageTransitionRef.current = null;

      const startStageTravel = () => {
        setStageTransition(transition);
        stageTransitionRef.current = transition;
        transitionStartTimerRef.current = 0;
        encounterIntroTimerRef.current = window.setTimeout(() => {
          setEncounterIntro({ id: `${transition.id}-encounter-overlap`, stage: nextStage });
          encounterIntroTimerRef.current = 0;
        }, EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS);
        transitionTimerRef.current = window.setTimeout(() => {
          const latestState = latestGameStateRef.current;
          if (encounterIntroTimerRef.current) {
            window.clearTimeout(encounterIntroTimerRef.current);
            encounterIntroTimerRef.current = 0;
          }
          setDisplayGameState(latestState);
          setStageTransition(null);
          stageTransitionRef.current = null;
          transitionTimerRef.current = 0;
          setEncounterIntro(null);
        }, EXPEDITION_STAGE_TRANSITION_MS);
      };
      const moveDelayMs = expeditionVictoryMoveDelayMs(gameState?.expedition?.pendingReward?.lastBattle);
      if (moveDelayMs > 0) {
        transitionStartTimerRef.current = window.setTimeout(startStageTravel, moveDelayMs);
      } else {
        startStageTravel();
      }
    } else if (!stageTransitionRef.current && !transitionStartTimerRef.current) {
      setDisplayGameState(gameState);
    }

    previousGameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const report = gameState?.expedition?.pendingReward?.lastBattle;
    if (!report?.id || report.id === seenBattleIdRef.current) return;
    seenBattleIdRef.current = report.id;
    const events = expeditionCombatFloatEvents(report);
    if (combatReplayTimerRef.current) window.clearTimeout(combatReplayTimerRef.current);
    if (battleReplayTimerRef.current) window.clearTimeout(battleReplayTimerRef.current);
    if (battleReplayIntervalRef.current) window.clearInterval(battleReplayIntervalRef.current);
    const startedAt = Date.now();
    setBattleReplayNow(startedAt);
    setBattleReplay({ id: report.id, report, startedAt });
    battleReplayIntervalRef.current = window.setInterval(() => setBattleReplayNow(Date.now()), 90);
    battleReplayTimerRef.current = window.setTimeout(() => {
      setBattleReplay(null);
      if (battleReplayIntervalRef.current) {
        window.clearInterval(battleReplayIntervalRef.current);
        battleReplayIntervalRef.current = 0;
      }
      battleReplayTimerRef.current = 0;
    }, expeditionBattleReplayHoldMs(report));
    if (events.length === 0) {
      setCombatReplay(null);
      combatReplayTimerRef.current = 0;
      return;
    }
    setCombatReplay({ id: report.id, result: report.result, events });
    combatReplayTimerRef.current = window.setTimeout(() => {
      setCombatReplay(null);
      combatReplayTimerRef.current = 0;
    }, EXPEDITION_COMBAT_FLOAT_REPLAY_MS);
  }, [gameState]);

  const expedition = createExpeditionViewModel(displayGameState);
  const partyExpedition = displayGameState === gameState ? expedition : createExpeditionViewModel(gameState);
  const latestExpedition = stageTransition ? createExpeditionViewModel(gameState) : expedition;
  const stage = expedition.stage;
  assert(Array.isArray(stage.normalEnemyNames) && stage.normalEnemyNames.length > 0, `원정대 stage normalEnemyNames 누락: ${stage.id}`);
  assert(Array.isArray(stage.enemyAssets) && stage.enemyAssets.length === stage.enemyCount, `원정대 stage enemyAssets 누락: ${stage.id}`);
  assert(Number.isFinite(Number(stage.enemyVariant)), `원정대 stage enemyVariant 누락: ${stage.id}`);
  const currentStageEnemyVisuals = expedition.enemyMembers.slice(0, stage.enemyCount);
  const powerPercent = Math.max(0, Math.min(100, Math.round((expedition.partyPower / Math.max(1, expedition.enemyPower)) * 100)));
  const routeProgressPercent = Math.max(0, Math.min(100, (stage.stageInChapter / 1000) * 100));
  const battleResultLabel = !expedition.ready ? "편성 필요" : expedition.canClear ? "자동 승리 예상" : stage.isBoss ? "보스 재도전 위험" : "성장 필요";
  const isStageTransitioning = Boolean(stageTransition);
  const encounterStageNumber = isStageTransitioning ? Number(stageTransition.toStage) : Number(expedition.currentStage);
  const isEncounterIntro = Boolean(encounterIntro && Number(encounterIntro.stage) === encounterStageNumber);
  const visualEnemyStage = isStageTransitioning && isEncounterIntro ? latestExpedition.stage : stage;
  assert(Array.isArray(visualEnemyStage.enemyAssets) && visualEnemyStage.enemyAssets.length === visualEnemyStage.enemyCount, `원정대 표시 enemyAssets 누락: ${visualEnemyStage.id}`);
  const visualEnemyMembers = isStageTransitioning && isEncounterIntro
    ? latestExpedition.enemyMembers.slice(0, visualEnemyStage.enemyCount)
    : currentStageEnemyVisuals;
  const floatEvents = combatReplay?.events || [];
  const hasDamageReplay = floatEvents.some((event) => event.visualKind === "damage" || event.visualKind === "hit" || event.visualKind === "kill");
  const backdropStage = isStageTransitioning ? stageTransition.toStage : expedition.currentStage || 1;
  const backdropFromStage = isStageTransitioning ? stageTransition.fromStage : backdropStage;
  const backdropFromChapter = isStageTransitioning ? stage.chapter : expedition.stage.chapter;
  const backdropToChapter = isStageTransitioning ? latestExpedition.stage.chapter : expedition.stage.chapter;
  const backdropFromX = expeditionStageBackdropOffset(backdropFromStage, backdropFromChapter);
  const backdropToX = expeditionStageBackdropOffset(backdropStage, backdropToChapter);
  const backdropFromTile = expeditionStageBackdropTile(backdropFromStage);
  const backdropTile = expeditionStageBackdropTile(backdropStage);
  const backdropViewStage = isStageTransitioning ? latestExpedition.stage : expedition.stage;
  const backdropFromImageUrl = getExpeditionBackdropUrl(stage.backdropClass, backdropFromTile);
  const backdropImageUrl = getExpeditionBackdropUrl(backdropViewStage.backdropClass, backdropTile);
  const backdropOldToX = backdropFromX - EXPEDITION_STAGE_BACKDROP_STEP_PX;
  const backdropNewFromX = backdropToX + EXPEDITION_STAGE_BACKDROP_STEP_PX;
  const backdropCrossfade = isStageTransitioning && (backdropFromTile !== backdropTile || stage.backdropClass !== backdropViewStage.backdropClass);
  const backdropStyle = {
    "--expedition-bg-from-image": `url("${backdropFromImageUrl}")`,
    "--expedition-bg-to-image": `url("${backdropImageUrl}")`,
    "--expedition-bg-image": `url("${backdropImageUrl}")`,
    "--expedition-bg-x": `${backdropToX}px`,
    "--expedition-bg-from-x": `${backdropFromX}px`,
    "--expedition-bg-to-x": `${backdropToX}px`,
    "--expedition-bg-old-to-x": `${backdropOldToX}px`,
    "--expedition-bg-new-from-x": `${backdropNewFromX}px`,
    "--expedition-stage-transition-ms": `${EXPEDITION_STAGE_TRANSITION_MS}ms`,
    "--expedition-encounter-approach-ms": `${EXPEDITION_ENCOUNTER_APPROACH_MS}ms`,
  };
  const activeBattleReport = !isStageTransitioning && battleReplay?.report && Number(battleReplay.report.stage) === Number(stage.globalStage) ? battleReplay.report : null;
  const isBattleReplaying = Boolean(activeBattleReport);
  const battleReplayPlayheadMs = activeBattleReport ? Math.max(0, battleReplayNow - Number(battleReplay?.startedAt || battleReplayNow)) : 0;
  const replayHpMaps = expeditionReplayHpMaps(activeBattleReport, stage.globalStage, battleReplayPlayheadMs);
  const enemyHpMap = isBattleReplaying ? replayHpMaps.enemies : expeditionEnemyHpMap(activeBattleReport, stage.globalStage);
  const partyHpMap = isBattleReplaying ? replayHpMaps.party : new Map();
  const defeatMap = activeBattleReport
    ? expeditionEnemyDefeatMap(activeBattleReport, stage.globalStage, currentStageEnemyVisuals)
    : new Map();
  const visualPartyReady = partyExpedition.partyMembers.length > 0;
  const partyMotionClass = !visualPartyReady ? "standing" : isStageTransitioning ? "running" : isEncounterIntro ? "standing" : "combat";
  const combatReady = partyExpedition.ready && !isStageTransitioning && !isBattleReplaying && !isEncounterIntro;
  const shouldRenderEnemies = !isStageTransitioning || isEncounterIntro;
  const sceneBoss = isStageTransitioning && isEncounterIntro ? latestExpedition.stage.isBoss : stage.isBoss;

  useEffect(() => {
    onCombatReadyChange?.(combatReady);
  }, [combatReady, onCombatReadyChange]);

  useEffect(() => () => onCombatReadyChange?.(true), [onCombatReadyChange]);

  return (
    <section
      className={`expedition-scene chapter-${stage.chapter} backdrop-${stage.backdropClass} backdrop-tile-${backdropTile}${sceneBoss ? " boss" : ""}${isStageTransitioning ? " stage-transitioning" : ""}${backdropCrossfade ? " backdrop-crossfading" : ""}${isBattleReplaying ? " combat-replaying" : ""}${isEncounterIntro ? " encounter-approaching" : ""}`}
      aria-busy={isStageTransitioning || isBattleReplaying || isEncounterIntro ? "true" : "false"}
      aria-label="원정대 전투장"
      data-stage-transition={isStageTransitioning ? "moving" : "idle"}
      data-combat-replay={isBattleReplaying ? activeBattleReport.result : "idle"}
      data-combat-ready={combatReady ? "true" : "false"}
      data-encounter-intro={isEncounterIntro ? "approaching" : "idle"}
        data-transition-from-stage={stageTransition?.fromStage || ""}
        data-transition-to-stage={stageTransition?.toStage || ""}
        data-transition-from-tile={isStageTransitioning ? backdropFromTile : ""}
        data-transition-to-tile={isStageTransitioning ? backdropTile : ""}
        data-backdrop-crossfade={backdropCrossfade ? "true" : "false"}
    >
      <div
        className="expedition-arena"
        data-bg-from-x={backdropFromX}
        data-bg-to-x={backdropToX}
        data-bg-from-tile={backdropFromTile}
        data-bg-tile={backdropTile}
        style={backdropStyle}
      >
        {isStageTransitioning && (
          <div className="expedition-backdrop-stack" aria-hidden="true">
            <span className="expedition-backdrop-layer from" />
            <span className="expedition-backdrop-layer to" />
          </div>
        )}
        <div className="expedition-route-card">
          <div>
            <strong>CH.{stage.chapter} {stage.stageInChapter}/1000</strong>
            <span>{stage.chapterName} · {stage.segmentName}</span>
          </div>
          <div className="expedition-arena-rail" aria-hidden="true">
            <i style={{ width: `${routeProgressPercent}%` }} />
          </div>
          <em>{isStageTransitioning ? `Stage ${stageTransition.toStage} 이동중` : isBattleReplaying ? "전투 정리중" : isEncounterIntro ? "몬스터 조우" : stage.isBoss ? "보스 게이트" : `다음 보스 ${stage.nextBossStageCount} Stage`}</em>
        </div>
        <div
          className={visualPartyReady ? `expedition-party-visual ${partyMotionClass}${partyReorderActive ? " reordering" : ""}` : "expedition-party-visual empty"}
          data-party-motion={partyMotionClass}
          data-party-reorder={partyReorderActive ? "active" : "idle"}
        >
          {visualPartyReady ? (
            partyExpedition.partyMembers.map((member) => (
              <div
                className={`expedition-unit-avatar large unit-${member.slot} role-${member.role}`}
                data-member-id={member.id}
                data-party-slot={member.slot}
                key={member.id}
                title={`${member.slot}번 · ${member.careerName} · ${member.roleLabel} · HP ${formatCompactNumber(member.combatStats.hp)} · 공격 ${formatCompactNumber(member.combatStats.attack)}`}
              >
                <SpriteFrames className="expedition-unit-frame" frames={getCompanionFrameUrls(member.career, member.avatarGender)} />
                <span className="expedition-role-badge">{member.roleLabel}</span>
                <i className="expedition-hp-bar ally" aria-label={`${member.careerName} HP`}>
                  <span style={{ width: `${Math.max(0, Math.min(100, Math.round(((partyHpMap.get(member.id)?.remainingHp ?? member.remainingHp) / Math.max(1, partyHpMap.get(member.id)?.maxHp ?? member.maxHp)) * 100)))}%` }} />
                </i>
              </div>
            ))
          ) : (
            <span className="expedition-empty-party">대원 없음</span>
          )}
        </div>
        {hasDamageReplay && <span className="expedition-impact active" aria-hidden="true" />}
        <div className="expedition-float-layer" aria-label="원정대 전투 피해와 회복 표시">
          {floatEvents.map((event) => (
            <span
              className={`expedition-float ${event.visualKind} from-${event.actorSide} target-${event.targetSide}`}
              data-actor={event.actorLabel}
              data-target={event.targetLabel}
              data-target-side={event.targetSide}
              data-target-slot={event.targetSlot}
              data-killed={event.killed ? "true" : "false"}
              key={`${combatReplay?.id}-${event.id}`}
              style={event.style}
              aria-label={event.text}
            >
              <span className="expedition-float-route">
                <b>{event.actorShort}</b>
                <i>→</i>
                <b>{event.targetShort}</b>
              </span>
              <strong>{event.valueText}</strong>
              {event.hpAfter && <small>HP {event.hpAfter}</small>}
            </span>
          ))}
        </div>
        {rewardToast && (
          <div className="expedition-reward-toast" role="status">
            <Sparkles size={14} />
            <span>{rewardToast.text}</span>
          </div>
        )}
        {shouldRenderEnemies && (
          <div className={`expedition-enemy-group${isEncounterIntro ? " approaching" : ""}`} aria-label={visualEnemyStage.enemyName}>
            {visualEnemyMembers.map((enemy, index) => {
              const enemyAsset = visualEnemyStage.enemyAssets[index];
              requireConfig(typeof enemyAsset === "string" && enemyAsset.length > 0, `원정대 enemyAssets 누락: ${visualEnemyStage.id}[${index}]`);
              const enemyTypeClass = visualEnemyStage.isBoss ? `boss boss-${visualEnemyStage.enemyVariant}` : `mob-${visualEnemyStage.enemyVariant}`;
              const defeat = defeatMap.get(enemy.id);
              const hpSnapshot = enemyHpMap.get(enemy.id);
              const remainingHp = hpSnapshot ? hpSnapshot.remainingHp : enemy.remainingHp;
              const maxHp = hpSnapshot ? hpSnapshot.maxHp : enemy.maxHp;
              return (
                <div
                  className={`expedition-enemy-visual ${enemyTypeClass} enemy-${index + 1} enemy-asset-${enemyAsset}${defeat ? " defeated" : ""}`}
                  data-enemy-id={enemy.id}
                  data-enemy-asset={enemyAsset}
                  data-defeat-order={defeat?.order || ""}
                  data-defeat-delay={defeat ? String(defeat.delayMs) : ""}
                  key={`${visualEnemyStage.id}-${enemy.id}`}
                  style={{ "--enemy-defeat-delay": `${defeat?.delayMs || 0}ms` }}
                  title={enemy.name}
                >
                  <SpriteFrames className="expedition-enemy-frame" frames={getExpeditionEnemyFrameUrls(enemyAsset)} />
                  <i className="expedition-hp-bar enemy" aria-label={`${enemy.name} HP`}>
                    <span style={{ width: `${Math.max(0, Math.min(100, Math.round((remainingHp / Math.max(1, maxHp)) * 100)))}%` }} />
                  </i>
                  <span className="enemy-shadow" aria-hidden="true" />
                </div>
              );
            })}
          </div>
        )}
        <div className="expedition-scene-footer">
          <div className="expedition-scene-run">
            <span>{battleResultLabel} · {expedition.battleDurationSeconds}초 전투</span>
            <strong>{formatCompactNumber(expedition.partyPower)} / {formatCompactNumber(expedition.enemyPower)}</strong>
            <i className="progress-bar">
              <span style={{ width: `${powerPercent}%` }} />
            </i>
          </div>
          <button className="expedition-action-button" disabled={!expedition.ready || isStageTransitioning || isBattleReplaying || isEncounterIntro} type="button" onClick={onExpeditionComplete}>
            {isStageTransitioning ? "이동중" : isEncounterIntro ? "조우중" : isBattleReplaying ? "정리중" : expedition.ready ? "돌파" : "편성 필요"}
          </button>
          {expedition.hasPendingReward && (
            <button className="expedition-pending-reward-button" type="button" onClick={onOpenPendingReward}>
              <Package size={14} />
              <span>누적 보상 받기</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function TabBar({ activeTab, mode, onTabChange }) {
  return (
    <nav className={`tab-bar ${mode}-tab-bar`} aria-label={mode === "expedition" ? "원정대 하단 메뉴" : "학생 하단 메뉴"}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button className={activeTab === id ? "tab active" : "tab"} type="button" key={id} aria-label={label} onClick={() => onTabChange(id)}>
          <Icon size={25} />
        </button>
      ))}
    </nav>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CompactDisclosure({ children, className = "", defaultOpen = false, meta = "", title }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={open ? `compact-disclosure open ${className}` : `compact-disclosure ${className}`}>
      <button className="compact-disclosure-head" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="compact-disclosure-copy">
          <strong>{title}</strong>
          {meta && <small>{meta}</small>}
        </span>
        <ChevronRight size={15} />
        <b>{open ? "접기" : "세부"}</b>
      </button>
      {open && <div className="compact-disclosure-body">{children}</div>}
    </section>
  );
}

function SummaryCards({ summary }) {
  return (
    <div className="panel accent-panel income-panel summary-grid">
      <Metric label="보유" value={formatMoney(summary.unspentStudyPoints)} />
      <Metric label="누적" value={formatMoney(summary.totalStudyPoints)} />
      <Metric label="처치" value={formatMoney(summary.totalKills)} />
    </div>
  );
}

function BuffCards({ summary }) {
  return (
    <div className="panel equipment-impact-panel buff-grid">
      <Metric label={`장비 ${summary.equipmentCount}/2`} value={`전투력 +${summary.equipmentPower}`} />
      <Metric label="교육" value={`x${summary.educationMultiplier.toFixed(2)}`} />
      <Metric label="다음" value={`+${summary.nextStudyGain}`} />
    </div>
  );
}

function InvestmentPanel({ summary }) {
  const allocationTotal = Object.values(summary.allocationWeights).reduce((sum, value) => sum + value, 0);
  return (
    <CompactDisclosure className="panel allocation-panel investment-panel" title="투자 비율" meta={`합계 ${allocationTotal}`}>
      <div className="allocation-grid">
        {subjects.map((subject) => (
          <label className="allocation-row" key={subject.id}>
            <span>
              <i style={{ backgroundColor: subject.color }} />
              {subject.label}
            </span>
            <input aria-label={`${subject.label} 자동 투자 비율`} max="500" min="0" readOnly type="range" value={summary.allocationWeights[subject.id]} />
            <b>{summary.allocationWeights[subject.id]}</b>
          </label>
        ))}
      </div>
    </CompactDisclosure>
  );
}

function GrowthPanel({ saveError, saveSource, summary }) {
  const maxSubjectStat = Math.max(...summary.subjectStats.map((subjectStat) => subjectStat.stat), 1);
  return (
    <main className="growth-panel">
      <header className="section-title">
        <div>
          <BarChart3 size={25} />
          <h2>성장</h2>
        </div>
        <span>보유 {formatMoney(summary.unspentStudyPoints)}</span>
      </header>
      {saveError && <p className="save-error">저장 데이터 오류: {saveError}</p>}
      <span className="save-source">저장 상태: {saveSource}</span>
      <SummaryCards summary={summary} />
      <BuffCards summary={summary} />
      <InvestmentPanel summary={summary} />
      {summary.subjectStats.map((subjectStat) => {
        const subject = subjects.find((item) => item.id === subjectStat.id);
        assert(subject, `과목 표시 설정을 찾을 수 없습니다: ${subjectStat.id}`);
        const statButtons = [
          { label: "+1", cost: studyLevelCost(subjectStat.level, 1) },
          { label: "+10", cost: studyLevelCost(subjectStat.level, 10) },
          { label: "+100", cost: studyLevelCost(subjectStat.level, 100) },
          { label: "최대", cost: 0 },
        ];
        return (
          <div className="stat-line" key={subjectStat.id}>
            <div>
              <span className="subject-dot" style={{ background: subject.color }} />
              <strong>{subject.fullLabel}</strong>
              <small>Lv.{subjectStat.level} · 장비 +{summary.equipmentPower} · 적성 {subjectStat.aptitude}</small>
            </div>
            <b>{subjectStat.stat}</b>
            <div className="stat-actions">
              {statButtons.map((button) => (
                <button disabled={button.cost <= 0 || summary.unspentStudyPoints < button.cost} type="button" key={button.label}>
                  <span>{button.label}</span>
                  <small>{formatCompactNumber(button.cost)}</small>
                </button>
              ))}
            </div>
            <div className="progress-bar stat">
              <span style={{ width: `${Math.min(100, (subjectStat.stat / maxSubjectStat) * 100)}%`, backgroundColor: subject.color }} />
            </div>
          </div>
        );
      })}
    </main>
  );
}

function ResultPanel({ gameState, onAcceptCareer, onRetake }) {
  const current = gameState.current;
  const outcome = current.outcome;
  const [careerSortKey, setCareerSortKey] = useState("rank");
  if (!current.awaitingDecision) {
    return (
      <section className="viewport result-panel">
        <div className="stack">
          <div className="section-title">
            <div>
              <Trophy size={18} />
              <h2>결과</h2>
            </div>
          </div>
          <div className="panel result-empty-section">
            <div className="section-title">
              <div>
                <Medal size={18} />
                <h2>합격권</h2>
              </div>
            </div>
            <div className="list flat">
              <p className="empty-state">합격권 없음</p>
            </div>
          </div>
          <div className="panel result-empty-section">
            <div className="section-title">
              <div>
                <History size={18} />
                <h2>회차 기록</h2>
              </div>
            </div>
            <div className="list flat">
              <p className="empty-state">기록 없음</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  assert(outcome, "수능 결과 대기 상태인데 outcome 데이터가 없습니다.");
  assert(Array.isArray(outcome.admissions) && outcome.admissions.length > 0, "수능 결과 admissions 데이터가 비어 있습니다.");
  assert(Array.isArray(outcome.careerCandidates) && outcome.careerCandidates.length > 0, "수능 결과 careerCandidates 데이터가 비어 있습니다.");
  const admission = outcome.admissions[0];
  const careerCandidates = sortCareerCandidates(outcome.careerCandidates, careerSortKey);
  return (
    <section className="viewport result-panel">
      <div className="stack">
        <header className="section-title">
          <div>
            <Trophy size={25} />
            <h2>결과</h2>
          </div>
        </header>
        <article className="panel decision">
          <div className="course-line">
            <div>
              <p>수능 결과{outcome.suneungCondition ? ` · ${outcome.suneungCondition}` : ""}</p>
              <strong>{formatMoney(outcome.suneungRank)}등 · {Math.round(outcome.suneungScore)}점</strong>
            </div>
            <Medal size={24} />
          </div>
          <div className="result-row">
            <span>합격</span>
            <strong>#{admission.gameRank} {admission.name}</strong>
          </div>
          {outcome.suneungEsd && qaToolsEnabled() && (
            <div className="result-row">
              <span>ESD(캘리브레이션)</span>
              <strong>합계 {outcome.suneungEsd.total} · 공부 {outcome.suneungEsd.studyEsd} · 교육 {outcome.suneungEsd.eduEsd} · 장비 {outcome.suneungEsd.equipEsd} · 도감 {outcome.suneungEsd.collectionEsd}</strong>
            </div>
          )}
          <div className="decision-careers">
            <header className="section-title compact-title">
              <div>
                <BriefcaseBusiness size={17} />
                <h2>직업 선택</h2>
              </div>
              <span className="count-badge">{outcome.careerSelectableCount}개 가능</span>
            </header>
            <ListSortControl label="직업 선택" options={careerChoiceSortOptions} value={careerSortKey} onChange={setCareerSortKey} />
            <div className="career-choice-list career-choice-ranked">
              {careerCandidates.map((candidate) => {
                const career = careers.find((item) => item.id === candidate.careerId);
                assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${candidate.careerId}`);
                const portrait = getCareerPortraitUrl(career, candidate.avatarGender);
                const selectable = candidate.selectable !== false;
                return (
                  <button
                    className={selectable ? "career-choice ranked" : "career-choice ranked locked"}
                    type="button"
                    disabled={!selectable}
                    key={candidate.careerId}
                    onClick={() => onAcceptCareer(admission.universityId, candidate.careerId)}
                  >
                    <span className="career-choice-rank">#{candidate.choiceRank}</span>
                    <span
                      className={`career-choice-aura career-portrait career-gender-${candidate.avatarGender} career-${candidate.careerId}`}
                      style={{ backgroundColor: career.auraColor, backgroundImage: `url(${portrait})` }}
                    />
                    <span className="career-choice-main">
                      <strong>{candidate.name}</strong>
                      <small>{candidate.choiceBand} · {formatMoney(candidate.incomePerMinute)}원/분</small>
                    </span>
                    <b className="career-choice-state">{selectable ? `전투 x${candidate.powerMultiplier.toFixed(2)}` : candidate.lockedReason}</b>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="button-grid">
            <button className="secondary-action compact" type="button" onClick={onRetake}>
              <RefreshCcw size={18} />
              <span>N수 선택</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function EquipmentPanel({ gameState, onEquipEquipment, onFuseEquipment }) {
  const equipment = gameState.equipment;
  assert(equipment && typeof equipment === "object", "save.equipment 데이터가 객체가 아닙니다.");
  assert(Array.isArray(equipment.inventory), "save.equipment.inventory 데이터가 배열이 아닙니다.");
  const equippedIds = new Set(Object.values(equipment.equipped || {}).filter(Boolean));
  const bySlot = Object.fromEntries(equipmentSlots.map((slot) => [slot.id, equipment.inventory.find((item) => item.id === equipment.equipped?.[slot.id]) || null]));
  return (
    <main className="equipment-panel">
      <header className="section-title">
        <div>
          <Pencil size={25} />
          <h2>장비</h2>
        </div>
        <span>{equipment.inventory.length}개 보유</span>
      </header>
      <section className="equipment-slot-grid" aria-label="장착 장비 슬롯">
        {equipmentSlots.map((slot) => {
          const item = bySlot[slot.id];
          const tier = item ? rarityTiers[item.rarity] : null;
          if (item) assert(tier, `지원하지 않는 장비 등급입니다: ${item.id} / ${item.rarity}`);
          const Icon = slot.id === "book" ? BookOpen : Pencil;
          return (
            <article className={item ? `equipment-slot-card filled rarity-${item.rarity}` : "equipment-slot-card"} key={slot.id} style={{ "--equipment-color": tier?.color || "#94a3b8" }}>
              <span className="equipment-slot-icon" aria-hidden="true">
                <Icon size={28} />
              </span>
              <div>
                <strong>{slot.label}</strong>
                <small>{item ? `${item.name} · ${rarityLabels[item.rarity]} · 전투력 +${equipmentPower(item)}` : "장착한 장비 없음"}</small>
              </div>
              <b>{item ? item.rarity : "-"}</b>
            </article>
          );
        })}
      </section>
      {equipment.inventory.length === 0 ? (
        <article className="record-empty equipment-empty">
          <strong>보유 장비 없음</strong>
          <span>상점의 문방구와 서점에서 필기류/책류 장비를 획득할 수 있습니다.</span>
        </article>
      ) : (
        <section className="equipment-inventory-list" aria-label="보유 장비">
          {equipment.inventory.map((item) => {
            const tier = rarityTiers[item.rarity];
            assert(tier, `지원하지 않는 장비 등급입니다: ${item.id} / ${item.rarity}`);
            const equipped = equippedIds.has(item.id);
            const materialCount = fusionMaterialCount(equipment, item);
            const canFuse = item.rarity !== "SSS" && materialCount > 0;
            const Icon = item.slot === "book" ? BookOpen : Pencil;
            return (
              <article className={equipped ? `equipment-card equipped rarity-${item.rarity}` : `equipment-card rarity-${item.rarity}`} key={item.id} style={{ "--equipment-color": tier.color }}>
                <span className="equipment-card-icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <div className="equipment-card-main">
                  <strong>{item.name}</strong>
                  <small>{equipmentSlotLabel(item.slot)} · {rarityLabels[item.rarity]} · 판매 {formatMoney(equipmentSellValue(item))}원</small>
                </div>
                <dl className="equipment-card-stats">
                  <div>
                    <dt>전투</dt>
                    <dd>+{equipmentPower(item)}</dd>
                  </div>
                  <div>
                    <dt>합성</dt>
                    <dd>{item.rarity === "SSS" ? "최종" : `${materialCount}/1`}</dd>
                  </div>
                </dl>
                <div className="equipment-card-actions">
                  <button className="secondary-action compact" type="button" disabled={equipped} onClick={() => onEquipEquipment(item.id)}>
                    <CheckCircle size={17} />
                    <span>{equipped ? "장착 중" : "장착"}</span>
                  </button>
                  <button className="primary-action compact" type="button" disabled={!canFuse} onClick={() => onFuseEquipment(item.id)}>
                    <Sparkles size={17} />
                    <span>합성</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function ExpeditionMemberPortrait({ member, size = "small" }) {
  return (
    <span className={`expedition-member-portrait ${size}`} style={{ "--unit-color": member.career.auraColor }}>
      <SpriteFrames className="expedition-member-frame" frames={getCompanionFrameUrls(member.career, member.avatarGender)} />
    </span>
  );
}

function ExpeditionTabBar({ activeTab, management, onTabChange }) {
  const tabs = [
    { id: "growth", label: `성장${management.upgradeableCount > 0 ? ` ${management.upgradeableCount}` : ""}`, icon: Sparkles },
    { id: "party", label: "파티", icon: Users },
    { id: "dispatch", label: `의뢰${management.dispatchCompletedCount > 0 ? ` ${management.dispatchCompletedCount}` : ""}`, icon: CalendarDays },
    { id: "manage", label: `대원 관리${management.fusionCandidates.length > 0 ? ` ${management.fusionCandidates.length}` : ""}`, icon: Medal },
    { id: "log", label: "기록", icon: ScrollText },
  ];
  const hasOpenPartySlot = activeTab === "party" && management.partySlots.some((slot) => slot === null);
  return (
    <nav className={hasOpenPartySlot ? "expedition-tabbar has-open-party-slot" : "expedition-tabbar"} aria-label="원정대 관리 탭">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button className={activeTab === id ? "expedition-tab active" : "expedition-tab"} type="button" key={id} onClick={() => onTabChange(id)}>
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function ExpeditionEmpty({ icon: Icon, title, text }) {
  return (
    <article className="expedition-empty">
      <Icon size={28} />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </article>
  );
}

const expeditionRoleFilters = [
  { id: "all", label: "전체" },
  { id: "tank", label: "탱커" },
  { id: "dealer", label: "딜러" },
  { id: "healer", label: "힐러" },
];

function ExpeditionRoleFilter({ value, onChange }) {
  return (
    <div className="expedition-role-filter" aria-label="원정대 역할 필터">
      <SlidersHorizontal size={14} />
      {expeditionRoleFilters.map((filter) => (
        <button className={value === filter.id ? "active" : ""} key={filter.id} type="button" onClick={() => onChange(filter.id)}>
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function ListSortControl({ label, options, value, onChange }) {
  return (
    <div className="list-sort-control" aria-label={`${label} 정렬`}>
      <SlidersHorizontal size={14} />
      {options.map((option) => (
        <button className={value === option.id ? "active" : ""} key={option.id} type="button" onClick={() => onChange(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const expeditionMemberSortOptions = [
  { id: "power", label: "전투력" },
  { id: "role", label: "역할" },
  { id: "career", label: "직업" },
  { id: "level", label: "레벨" },
];

const expeditionManageSortOptions = [
  { id: "status", label: "상태" },
  ...expeditionMemberSortOptions,
];

const expeditionDispatchSortOptions = [
  { id: "recommended", label: "추천" },
  { id: "power", label: "전투력" },
  { id: "career", label: "직업" },
  { id: "role", label: "역할" },
];

const expeditionPartySlotLabels = ["앞", "뒤", "중", "뒤", "중"];

function expeditionPartySlotLabel(index) {
  return expeditionPartySlotLabels[index] || "배치";
}

const careerChoiceSortOptions = [
  { id: "rank", label: "추천순" },
  { id: "income", label: "수입" },
  { id: "power", label: "전투" },
  { id: "tier", label: "티어" },
];

const expeditionRoleOrder = { tank: 1, dealer: 2, healer: 3 };

function expeditionMissionMatchScore(member, mission) {
  if (!mission) return 0;
  let score = 0;
  if (mission.recommendedCareerIds.includes(member.sourceCareerId)) score += 2;
  if (mission.recommendedRoles.includes(member.role)) score += 1;
  return score;
}

function compareExpeditionMembersBySort(left, right, sortKey, mission = null) {
  if (sortKey === "recommended") {
    const matchDelta = expeditionMissionMatchScore(right, mission) - expeditionMissionMatchScore(left, mission);
    if (matchDelta !== 0) return matchDelta;
  }
  if (sortKey === "role") {
    const roleDelta = (expeditionRoleOrder[left.role] || 99) - (expeditionRoleOrder[right.role] || 99);
    if (roleDelta !== 0) return roleDelta;
  }
  if (sortKey === "career") {
    const careerDelta = left.careerName.localeCompare(right.careerName, "ko");
    if (careerDelta !== 0) return careerDelta;
  }
  if (sortKey === "level") {
    const levelDelta = Number(right.level) - Number(left.level);
    if (levelDelta !== 0) return levelDelta;
  }
  const powerDelta = Number(right.power) - Number(left.power);
  if (powerDelta !== 0) return powerDelta;
  const levelDelta = Number(right.level) - Number(left.level);
  if (levelDelta !== 0) return levelDelta;
  return left.careerName.localeCompare(right.careerName, "ko") || Number(left.createdAt) - Number(right.createdAt);
}

function sortedExpeditionMembers(members, sortKey, mission = null) {
  return members.slice().sort((left, right) => compareExpeditionMembersBySort(left, right, sortKey, mission));
}

function sortCareerCandidates(candidates, sortKey) {
  return candidates.slice().sort((left, right) => {
    if (sortKey === "income") {
      const incomeDelta = Number(right.incomePerMinute) - Number(left.incomePerMinute);
      if (incomeDelta !== 0) return incomeDelta;
    }
    if (sortKey === "power") {
      const powerDelta = Number(right.powerMultiplier) - Number(left.powerMultiplier);
      if (powerDelta !== 0) return powerDelta;
    }
    if (sortKey === "tier") {
      const tierDelta = Number(left.tier) - Number(right.tier);
      if (tierDelta !== 0) return tierDelta;
    }
    return Number(left.choiceRank) - Number(right.choiceRank);
  });
}

function ExpeditionGrowthPanel({ management, onLevelUp }) {
  return (
    <section className="expedition-growth-panel">
      <header className="section-title compact-title">
        <div>
          <Sparkles size={18} />
          <h2>출전 성장 {management.upgradeableCount}명</h2>
        </div>
        <span>EXP {formatCompactNumber(management.trainingExp)}</span>
      </header>
      {management.growthMembers.length === 0 ? (
        <ExpeditionEmpty icon={Users} title="출전 대원 없음" text="파티에서 대원을 편성하세요." />
      ) : (
        <div className="expedition-growth-list">
          {management.growthMembers.map((member) => {
            const canLevel = management.trainingExp >= member.levelCost;
            const powerGain = Math.max(1, Math.round(member.power * 0.04));
            const expPercent = Math.min(100, Math.round((management.trainingExp / Math.max(1, member.levelCost)) * 100));
            return (
              <article className={canLevel ? "expedition-growth-card ready" : "expedition-growth-card"} key={member.id}>
                <ExpeditionMemberPortrait member={member} size="medium" />
                <div className="expedition-growth-main">
                  <div>
                    <strong>{member.careerName}</strong>
                    <span>{member.roleLabel} · Lv.{member.level} → {member.level + 1}</span>
                  </div>
                  <div className="expedition-exp-bar" aria-label={`${member.careerName} 경험치`}>
                    <i style={{ width: `${expPercent}%` }} />
                  </div>
                  <small>전투력 +{formatCompactNumber(powerGain)}</small>
                </div>
                <button className="secondary-action compact expedition-invest-button" type="button" disabled={!canLevel} onClick={() => onLevelUp(member.id)}>
                  <span>{canLevel ? "투자" : "부족"}</span>
                  <small>필요 {formatCompactNumber(member.levelCost)}</small>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExpeditionPartyPanel({ management, onAssign, onRecommend, onRemove, onReorder }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState("power");
  const [dragState, setDragState] = useState({ from: null, over: null });
  const [reorderBusy, setReorderBusy] = useState({ from: null, to: null });
  const pointerDragRef = useRef({ from: null, over: null, pointerId: null });
  const reorderBusyTimerRef = useRef(0);
  const partyFull = management.party.length >= management.partySize;
  const filteredMembers = roleFilter === "all" ? management.members : management.members.filter((member) => member.role === roleFilter);
  const visibleMembers = sortedExpeditionMembers(filteredMembers, sortKey);
  useEffect(() => () => {
    if (reorderBusyTimerRef.current) window.clearTimeout(reorderBusyTimerRef.current);
  }, []);
  const clearDragState = useCallback(() => {
    pointerDragRef.current = { from: null, over: null, pointerId: null };
    setDragState({ from: null, over: null });
  }, []);
  const commitReorder = useCallback((from, to) => {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
    const target = Math.min(to, Math.max(0, management.party.length - 1));
    if (from === target) return;
    if (reorderBusyTimerRef.current) window.clearTimeout(reorderBusyTimerRef.current);
    setReorderBusy({ from, to: target });
    reorderBusyTimerRef.current = window.setTimeout(() => {
      setReorderBusy({ from: null, to: null });
      reorderBusyTimerRef.current = 0;
    }, EXPEDITION_PARTY_REORDER_MS);
    onReorder(from, to);
  }, [management.party.length, onReorder]);
  const slotIndexFromPoint = useCallback((event) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const slot = element?.closest?.("[data-expedition-party-slot]");
    if (!slot) return null;
    const index = Number(slot.getAttribute("data-expedition-party-slot"));
    return Number.isInteger(index) ? index : null;
  }, []);
  const handleNativeDragStart = useCallback((event, index, member) => {
    if (!member) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDragState({ from: index, over: index });
  }, []);
  const handleNativeDragOver = useCallback((event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragState((current) => (current.over === index ? current : { ...current, over: index }));
  }, []);
  const handleNativeDrop = useCallback((event, index) => {
    event.preventDefault();
    const from = Number(event.dataTransfer.getData("text/plain"));
    commitReorder(from, index);
    clearDragState();
  }, [clearDragState, commitReorder]);
  const handlePointerDown = useCallback((event, index, member) => {
    if (!member || event.pointerType === "mouse") return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button")) return;
    pointerDragRef.current = { from: index, over: index, pointerId: event.pointerId };
    setDragState({ from: index, over: index });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);
  const handlePointerMove = useCallback((event) => {
    const active = pointerDragRef.current;
    if (active.pointerId !== event.pointerId) return;
    const over = slotIndexFromPoint(event);
    active.over = over;
    setDragState({ from: active.from, over });
    event.preventDefault();
  }, [slotIndexFromPoint]);
  const handlePointerEnd = useCallback((event) => {
    const active = pointerDragRef.current;
    if (active.pointerId !== event.pointerId) return;
    const over = slotIndexFromPoint(event) ?? active.over;
    if (Number.isInteger(active.from) && Number.isInteger(over)) commitReorder(active.from, over);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearDragState();
  }, [clearDragState, commitReorder, slotIndexFromPoint]);
  return (
    <section className="expedition-party-panel">
      <header className="section-title compact-title">
        <div>
          <Users size={18} />
          <h2>원정 파티 {management.party.length}/{management.partySize}</h2>
        </div>
        <button className="secondary-action compact expedition-recommend-button" type="button" disabled={management.members.length === 0} onClick={onRecommend}>
          <Shuffle size={15} />
          <span>추천 편성</span>
        </button>
      </header>
      <div className="expedition-party-slots" role="list" aria-label="원정 파티 배치">
        {management.partySlots.map((member, index) => {
          const slotLabel = expeditionPartySlotLabel(index);
          const slotClassName = [
            "expedition-party-slot",
            member ? "filled draggable" : "empty",
            dragState.from === index ? "dragging" : "",
            dragState.from !== null && dragState.from !== index && dragState.over === index ? "drop-target" : "",
            reorderBusy.from === index || reorderBusy.to === index ? "reorder-loading" : "",
          ].filter(Boolean).join(" ");
          return (
            <article
              aria-label={`${index + 1}번 ${slotLabel} 슬롯${member ? ` ${member.careerName}` : " 빈 슬롯"}`}
              className={slotClassName}
              data-expedition-party-slot={index}
              data-member-id={member?.id || ""}
              data-party-slot={index + 1}
              draggable={Boolean(member)}
              key={`slot-${index}`}
              onDragEnd={clearDragState}
              onDragOver={(event) => handleNativeDragOver(event, index)}
              onDragStart={(event) => handleNativeDragStart(event, index, member)}
              onDrop={(event) => handleNativeDrop(event, index)}
              onPointerCancel={clearDragState}
              onPointerDown={(event) => handlePointerDown(event, index, member)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              role="listitem"
              title={member ? "드래그해서 파티 순서 변경" : "빈 파티 슬롯"}
            >
              <b>{index + 1}<small>{slotLabel}</small></b>
              {member ? (
                <>
                  <ExpeditionMemberPortrait member={member} size="medium" />
                  <strong>{member.careerName}</strong>
                  <span>{member.roleLabel} · {member.tierName} · Lv.{member.level}</span>
                  <button className="icon-button dark" type="button" title="파티 해제" onClick={() => onRemove(member.id)}>
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <strong>빈 슬롯</strong>
                  <span>편성 가능</span>
                </>
              )}
            </article>
          );
        })}
      </div>
      <div className="expedition-party-roster">
        <header className="section-title compact-title">
          <div>
            <Medal size={18} />
            <h2>후보 {filteredMembers.length}/{management.members.length}</h2>
          </div>
        </header>
        <div className="expedition-list-toolbar">
          <ExpeditionRoleFilter value={roleFilter} onChange={setRoleFilter} />
          <ListSortControl label="편성 후보" options={expeditionMemberSortOptions} value={sortKey} onChange={setSortKey} />
        </div>
        {management.members.length === 0 ? (
          <ExpeditionEmpty icon={Medal} title="원정대원 없음" text="수능 결과나 DEBUG로 대원을 획득하세요." />
        ) : filteredMembers.length === 0 ? (
          <ExpeditionEmpty icon={SlidersHorizontal} title="해당 역할 없음" text="다른 필터를 선택하세요." />
        ) : (
          <div className="expedition-roster-list">
            {visibleMembers.map((member) => {
              const inParty = management.partyIds.has(member.id);
              const dispatched = management.dispatchedMemberIds.has(member.id);
              return (
                <article className={inParty ? "expedition-roster-card expedition-member-card active in-party" : dispatched ? "expedition-roster-card expedition-member-card active dispatched" : "expedition-roster-card expedition-member-card"} key={member.id}>
                  <ExpeditionMemberPortrait member={member} />
                  <div className="expedition-member-main">
                    <strong>{member.careerName}</strong>
                    <span>{member.roleLabel} · {member.tierName} Lv.{member.level}</span>
                  </div>
                  <div className="expedition-card-meta">
                    <small>전투력 {formatCompactNumber(member.power)}</small>
                  </div>
                  <button className="secondary-action compact" type="button" disabled={inParty || dispatched || partyFull} onClick={() => onAssign(member.id)}>
                    <span>{inParty ? "편성중" : dispatched ? "파견중" : partyFull ? "가득 참" : "편성"}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ExpeditionManagePanel({ management, onFuse, onToggleLock }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState("status");
  const filteredMembers = roleFilter === "all" ? management.members : management.members.filter((member) => member.role === roleFilter);
  const statusRank = (member) => {
    if (management.partyIds.has(member.id)) return 1;
    if (management.dispatchedMemberIds.has(member.id)) return 2;
    if (member.locked) return 3;
    return 0;
  };
  const visibleMembers = filteredMembers.slice().sort((left, right) => {
    if (sortKey === "status") {
      const statusDelta = statusRank(left) - statusRank(right);
      if (statusDelta !== 0) return statusDelta;
    }
    return compareExpeditionMembersBySort(left, right, sortKey);
  });
  return (
    <section className="expedition-manage-panel">
      <header className="section-title compact-title">
        <div>
          <Medal size={18} />
          <h2>대원 관리</h2>
        </div>
      </header>
      {management.members.length === 0 ? (
        <ExpeditionEmpty icon={Medal} title="관리할 대원 없음" text="대원을 획득하면 표시됩니다." />
      ) : (
        <div className="expedition-manage-stack">
          <div className="expedition-list-toolbar">
            <ExpeditionRoleFilter value={roleFilter} onChange={setRoleFilter} />
            <ListSortControl label="대원 관리" options={expeditionManageSortOptions} value={sortKey} onChange={setSortKey} />
          </div>
          {management.fusionCandidates.length > 0 && (
            <div className="expedition-fusion-list">
              {management.fusionCandidates.map((group) => (
                <article className="expedition-fusion-card" key={group.key}>
                  <div>
                    <strong>{group.careerName}</strong>
                    <small>{group.tierName} 2명 → {group.nextTierName} 1명</small>
                  </div>
                  <button className="primary-action compact" type="button" onClick={() => onFuse(group.careerId, group.tier)}>
                    <span>합성</span>
                  </button>
                </article>
              ))}
            </div>
          )}
          <div className="expedition-manage-list">
            {visibleMembers.map((member) => {
              const inParty = management.partyIds.has(member.id);
              const dispatched = management.dispatchedMemberIds.has(member.id);
              return (
                <article className={member.locked ? "expedition-manage-card expedition-manage-member locked" : "expedition-manage-card expedition-manage-member"} key={member.id}>
                  <ExpeditionMemberPortrait member={member} />
                  <div className="expedition-member-main">
                    <strong>{member.careerName}</strong>
                    <span>{member.roleLabel} · {member.tierName} Lv.{member.level}</span>
                  </div>
                  <small className={inParty ? "expedition-manage-status party" : dispatched ? "expedition-manage-status dispatched" : member.locked ? "expedition-manage-status locked" : "expedition-manage-status available"}>
                    {inParty ? "출전중" : dispatched ? "파견중" : member.locked ? "잠금" : "합성 가능"}
                  </small>
                  <button className={member.locked ? "secondary-action compact expedition-lock-button is-locked" : "secondary-action compact expedition-lock-button"} type="button" onClick={() => onToggleLock(member.id)}>
                    {member.locked ? <LockOpen size={15} /> : <Lock size={15} />}
                    <span>{member.locked ? "해제" : "잠금"}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function expeditionDispatchSelectionReward(mission, selectedMembers, bonusPerMatchPoint, bonusCap) {
  const matchScore = selectedMembers.reduce((sum, member) => {
    let score = 0;
    if (mission.recommendedCareerIds.includes(member.sourceCareerId)) score += 2;
    if (mission.recommendedRoles.includes(member.role)) score += 1;
    return sum + score;
  }, 0);
  const multiplier = Math.round((1 + Math.min(Number(bonusCap), matchScore * Number(bonusPerMatchPoint))) * 1000) / 1000;
  return {
    trainingExp: Math.floor(Number(mission.rewards.trainingExp) * multiplier),
    diamonds: Math.floor(Number(mission.rewards.diamonds) * multiplier),
    realEstateCash: Math.floor(Number(mission.rewards.realEstateCash) * multiplier),
    bonusMultiplier: multiplier,
  };
}

function ExpeditionDispatchPanel({ gameState, onClaimDispatch, onStartDispatch }) {
  const dispatch = createExpeditionDispatchViewModel(gameState);
  const [selectedByMission, setSelectedByMission] = useState({});
  const [memberSortKey, setMemberSortKey] = useState("recommended");
  const [openMissionIds, setOpenMissionIds] = useState({});
  const [openAssignmentIds, setOpenAssignmentIds] = useState({});
  const availableIdSet = new Set(dispatch.availableMembers.map((member) => member.id));
  const activeFull = dispatch.usedSlotCount >= dispatch.activeSlotCount;
  const cleanSelectedIds = (mission) => {
    const selected = Array.isArray(selectedByMission[mission.id]) ? selectedByMission[mission.id] : [];
    return selected.filter((id) => availableIdSet.has(id)).slice(0, dispatch.maxMembersPerMission);
  };
  const toggleMember = (mission, memberId) => {
    const selected = cleanSelectedIds(mission);
    const nextSelected = selected.includes(memberId)
      ? selected.filter((id) => id !== memberId)
      : selected.length >= dispatch.maxMembersPerMission
        ? selected
        : [...selected, memberId];
    setSelectedByMission((source) => ({ ...source, [mission.id]: nextSelected }));
  };
  const chooseRecommended = (mission) => {
    setSelectedByMission((source) => ({ ...source, [mission.id]: mission.recommendedMemberIds.filter((id) => availableIdSet.has(id)) }));
  };
  const toggleMissionOpen = (missionId) => {
    setOpenMissionIds((source) => ({ ...source, [missionId]: !source[missionId] }));
  };
  const toggleAssignmentOpen = (assignment) => {
    setOpenAssignmentIds((source) => {
      const current = Object.prototype.hasOwnProperty.call(source, assignment.id) ? source[assignment.id] : assignment.complete;
      return { ...source, [assignment.id]: !current };
    });
  };
  return (
    <section className="expedition-dispatch-panel">
      <header className="section-title compact-title">
        <div>
          <CalendarDays size={18} />
          <h2>원정대 의뢰</h2>
        </div>
        <span>{dispatch.usedSlotCount}/{dispatch.activeSlotCount} · 가능 {dispatch.availableMembers.length}</span>
      </header>
      <div className="expedition-dispatch-summary">
        <Metric label="오늘" value={`${dispatch.missions.length}건`} />
        <Metric label="완료" value={`${dispatch.completedCount}건`} />
        <Metric label="갱신" value={formatClockTime(dispatch.nextRefreshAt)} />
      </div>
      <div className="expedition-dispatch-active-list">
        {dispatch.assignments.length === 0 ? (
          <article className="expedition-empty compact">
            <CalendarDays size={24} />
            <strong>진행 중 의뢰 없음</strong>
            <p>파티 밖 대원을 보내세요.</p>
          </article>
        ) : dispatch.assignments.map((assignment) => {
          const assignmentOpen = Object.prototype.hasOwnProperty.call(openAssignmentIds, assignment.id) ? openAssignmentIds[assignment.id] : assignment.complete;
          return (
            <article className={assignment.complete ? "expedition-dispatch-active complete" : "expedition-dispatch-active"} key={assignment.id}>
              <div className="expedition-dispatch-active-main">
                <strong>{assignment.mission.title}</strong>
                <span>{assignment.complete ? "귀환 완료" : `${formatDurationMs(assignment.remainingMs)} 남음`} · x{assignment.reward.bonusMultiplier.toFixed(2)}</span>
              </div>
              <div className="expedition-dispatch-progress" aria-label={`${assignment.mission.title} 진행률`}>
                <i style={{ width: `${assignment.progressPercent}%` }} />
              </div>
              <div className="expedition-dispatch-member-row">
                {assignment.members.map((member) => (
                  <span className="expedition-dispatch-mini-member" key={member.id}>{member.careerName}</span>
                ))}
              </div>
              <div className="expedition-dispatch-actions">
                <button
                  aria-expanded={assignmentOpen}
                  className={assignmentOpen ? "secondary-action compact expedition-dispatch-toggle open" : "secondary-action compact expedition-dispatch-toggle"}
                  type="button"
                  onClick={() => toggleAssignmentOpen(assignment)}
                >
                  <ChevronRight size={15} />
                  <span>{assignmentOpen ? "접기" : "세부"}</span>
                </button>
                <button className="primary-action compact" type="button" disabled={!assignment.complete} onClick={() => onClaimDispatch(assignment.id)}>
                  <CheckCircle size={15} />
                  <span>{assignment.complete ? "받기" : "진행중"}</span>
                </button>
              </div>
              {assignmentOpen && (
                <div className="expedition-dispatch-detail active-detail">
                  <div className="expedition-dispatch-rewards">
                    <span>EXP {formatCompactNumber(assignment.reward.trainingExp)}</span>
                    <span>다이아 {formatCompactNumber(assignment.reward.diamonds)}</span>
                    <span>부동산 {formatCompactNumber(assignment.reward.realEstateCash)}</span>
                  </div>
                  {assignment.futureRewards.length > 0 && (
                    <div className="expedition-dispatch-future">
                      {assignment.futureRewards.map((reward) => (
                        <span key={reward.id}>{reward.label} {reward.amount} · 준비중</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="expedition-list-toolbar expedition-dispatch-toolbar">
        <ListSortControl label="파견 대원" options={expeditionDispatchSortOptions} value={memberSortKey} onChange={setMemberSortKey} />
      </div>
      <section className="expedition-dispatch-mission-list expedition-dispatch-mission-table" aria-label="오늘의 의뢰 테이블">
        {dispatch.missions.map((mission) => {
          const selectedIds = cleanSelectedIds(mission);
          const selectedMembers = dispatch.availableMembers.filter((member) => selectedIds.includes(member.id));
          const pickerMembers = sortedExpeditionMembers(dispatch.availableMembers, memberSortKey, mission);
          const reward = expeditionDispatchSelectionReward(mission, selectedMembers, dispatch.bonusPerMatchPoint, dispatch.bonusCap);
          const canStart = !activeFull && selectedIds.length >= Number(mission.requiredMemberCount);
          const missionOpen = Boolean(openMissionIds[mission.id]);
          return (
            <article className={canStart ? "expedition-dispatch-card ready" : "expedition-dispatch-card"} key={mission.id}>
              <div className="expedition-dispatch-card-summary">
                <div className="expedition-dispatch-card-head">
                  <div>
                    <strong>{mission.title}</strong>
                    <span>{mission.bandLabel} · 필요 {mission.requiredMemberCount} · 선택 {selectedIds.length}/{dispatch.maxMembersPerMission}</span>
                  </div>
                  <b>x{reward.bonusMultiplier.toFixed(2)}</b>
                </div>
                <div className="expedition-dispatch-quick">
                  <span>EXP {formatCompactNumber(reward.trainingExp)}</span>
                  <span>다이아 {formatCompactNumber(reward.diamonds)}</span>
                  <span>부동산 {formatCompactNumber(reward.realEstateCash)}</span>
                </div>
                <button
                  aria-expanded={missionOpen}
                  className={missionOpen ? "secondary-action compact expedition-dispatch-toggle open" : "secondary-action compact expedition-dispatch-toggle"}
                  type="button"
                  onClick={() => toggleMissionOpen(mission.id)}
                >
                  <ChevronRight size={15} />
                  <span>{missionOpen ? "접기" : "세부"}</span>
                </button>
              </div>
              {missionOpen && (
                <div className="expedition-dispatch-detail">
                  <p>{mission.summary}</p>
                  <div className="expedition-dispatch-tags">
                    <span>직업 {mission.recommendedCareerNames.slice(0, 3).join(" · ")}</span>
                    <span>역할 {mission.recommendedRoleLabels.join(" · ")}</span>
                  </div>
                  {mission.futureRewards.length > 0 && (
                    <div className="expedition-dispatch-future">
                      {mission.futureRewards.map((future) => (
                        <span key={future.id}>{future.label} {future.amount} · 준비중</span>
                      ))}
                    </div>
                  )}
                  <div className="expedition-dispatch-picker-head">
                    <strong>대원 {selectedIds.length}/{dispatch.maxMembersPerMission}</strong>
                    <span>필요 {mission.requiredMemberCount}</span>
                  </div>
                  <div className="expedition-dispatch-member-picker">
                    {dispatch.availableMembers.length === 0 ? (
                      <span className="expedition-dispatch-no-member">파티 밖 대원이 없습니다.</span>
                    ) : pickerMembers.map((member) => (
                      <button className={selectedIds.includes(member.id) ? "selected" : ""} key={member.id} type="button" onClick={() => toggleMember(mission, member.id)}>
                        <span>{member.careerName}</span>
                        <small>{member.roleLabel} · 전투력 {formatCompactNumber(member.power)} · 추천 +{expeditionMissionMatchScore(member, mission)}</small>
                      </button>
                    ))}
                  </div>
                  <div className="expedition-dispatch-actions">
                    <button className="secondary-action compact" type="button" disabled={mission.recommendedMemberIds.length === 0} onClick={() => chooseRecommended(mission)}>
                      <Shuffle size={15} />
                      <span>추천 선택</span>
                    </button>
                    <button className="primary-action compact" type="button" disabled={!canStart} onClick={() => onStartDispatch(mission.id, selectedIds)}>
                      <CheckCircle size={15} />
                      <span>{activeFull ? "슬롯 부족" : selectedIds.length < Number(mission.requiredMemberCount) ? "인원 부족" : "시작"}</span>
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}

function ExpeditionLogPanel({ management }) {
  const lastBattle = management.pendingReward.lastBattle;
  return (
    <section className="expedition-log-panel">
      <header className="section-title compact-title">
        <div>
          <ScrollText size={18} />
          <h2>원정 기록</h2>
        </div>
      </header>
      {management.log.length > 0 ? (
        <div className="log-list compact-log">
          {management.log.slice(0, 5).map((entry) => (
            <p className={`log-entry ${entry.tone}`} key={entry.id}>{entry.text}</p>
          ))}
        </div>
      ) : (
        <p className="empty-state">원정 기록이 아직 없습니다.</p>
      )}
      {lastBattle && (
        <CompactDisclosure className="expedition-battle-disclosure" title={`마지막 전투 · Stage ${lastBattle.stage}`} meta={`${lastBattle.result === "win" ? "승리" : "실패"} · ${lastBattle.resultReason}`}>
          <div className="expedition-battle-log">
            {lastBattle.events.slice(-8).map((event, index) => (
              <p key={`${event.time}-${event.actor}-${event.target}-${index}`}>{event.time.toFixed(2)}초 · {event.text}</p>
            ))}
          </div>
        </CompactDisclosure>
      )}
    </section>
  );
}

function ExpeditionManagementPanel({ activeTab, gameState, onAssign, onClaimDispatch, onFuse, onLevelUp, onRecommend, onRemove, onReorder, onStartDispatch, onTabChange, onToggleLock }) {
  const management = createExpeditionManagementViewModel(gameState);
  return (
    <>
      <ExpeditionTabBar activeTab={activeTab} management={management} onTabChange={onTabChange} />
      <section className="expedition-viewport">
        {activeTab === "growth" && <ExpeditionGrowthPanel management={management} onLevelUp={onLevelUp} />}
        {activeTab === "party" && <ExpeditionPartyPanel management={management} onAssign={onAssign} onRecommend={onRecommend} onRemove={onRemove} onReorder={onReorder} />}
        {activeTab === "dispatch" && <ExpeditionDispatchPanel gameState={gameState} onClaimDispatch={onClaimDispatch} onStartDispatch={onStartDispatch} />}
        {activeTab === "manage" && <ExpeditionManagePanel management={management} onFuse={onFuse} onToggleLock={onToggleLock} />}
        {activeTab === "log" && <ExpeditionLogPanel management={management} />}
      </section>
    </>
  );
}

function percentPointStyle(point) {
  return {
    left: `${Number(point[0])}%`,
    top: `${Number(point[1])}%`,
  };
}

function polygonBounds(points) {
  const xs = points.map((point) => Number(point[0]));
  const ys = points.map((point) => Number(point[1]));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  assert(width > 0 && height > 0, "부동산 지역 polygon bounds 값이 올바르지 않습니다.");
  return { minX, minY, width, height };
}

function localPercentPoint(point, bounds) {
  return [
    ((Number(point[0]) - bounds.minX) / bounds.width) * 100,
    ((Number(point[1]) - bounds.minY) / bounds.height) * 100,
  ];
}

function polygonBoxStyle(points) {
  const bounds = polygonBounds(points);
  const localPoints = points.map((point) => localPercentPoint(point, bounds));
  const clipPath = `polygon(${localPoints.map((point) => `${Number(point[0])}% ${Number(point[1])}%`).join(", ")})`;
  return {
    left: `${bounds.minX}%`,
    top: `${bounds.minY}%`,
    width: `${bounds.width}%`,
    height: `${bounds.height}%`,
    clipPath,
    WebkitClipPath: clipPath,
  };
}

function realEstateBuildingImageFor(file) {
  const image = realEstateBuildingImages[file];
  assert(image, `부동산 건물 PNG를 찾을 수 없습니다: ${file}`);
  return image;
}

function realEstateDistrictGrowthImageFor(file) {
  const image = realEstateDistrictGrowthImages[file];
  assert(image, `부동산 baked 성장 PNG를 찾을 수 없습니다: ${file}`);
  return image;
}

function RealEstateBuildingSlots({ card }) {
  return (
    <div className="real-estate-building-layer" aria-hidden="true">
      {card.visibleBuildingSlots.map((slot) => {
        const buildingImage = realEstateBuildingImageFor(slot.buildingAssetFile);
        return (
          <span
            className={`real-estate-building-dot level-${card.developmentLevel}`}
            data-building-asset={slot.buildingAssetId}
            data-building-variant={slot.buildingVariant}
            data-slot-id={slot.id}
            key={slot.id}
            style={{
              ...percentPointStyle([slot.x, slot.y]),
              zIndex: Math.round(slot.y * 10),
              "--building-rotation": `${slot.rotation}deg`,
              "--overview-building-height": `${Math.max(20, Math.round(slot.buildingDisplayHeight * 0.48))}px`,
              "--overview-building-width": `${Math.max(22, Math.round(slot.buildingDisplayWidth * 0.48))}px`,
            }}
          >
            <img alt="" aria-hidden="true" draggable="false" src={buildingImage} />
          </span>
        );
      })}
    </div>
  );
}

function RealEstateDetailDevelopmentLayer({ card }) {
  const pads = card.districtDetailPads;
  assert(Array.isArray(pads) && pads.length === card.buildingSlots.length, `부동산 상세 건물 패드와 도시 슬롯 수가 다릅니다: ${card.id}`);
  return (
    <div className="real-estate-development-layer" aria-hidden="true" data-building-theme={card.districtBuildingTheme} data-development-level={card.developmentLevel}>
      <div className="real-estate-development-pads">
        {pads.map((pad, index) => (
          <span
            className={`real-estate-development-pad variant-${pad.variant}`}
            data-occupied={index < card.visibleBuildingSlots.length ? "true" : "false"}
            data-pad-id={pad.id}
            key={`${card.id}-${pad.id}`}
            style={{
              left: `${pad.x}%`,
              top: `${pad.y}%`,
              zIndex: pad.z,
              "--pad-height": `${pad.height}px`,
              "--pad-rotation": `${pad.rotation}deg`,
              "--pad-width": `${pad.width}px`,
              "--pad-scale": pad.scale,
            }}
          />
        ))}
      </div>
      <div className="real-estate-development-buildings">
        {card.visibleBuildingSlots.map((slot, index) => {
          const pad = pads[index];
          assert(pad, `부동산 상세 건물 패드를 찾을 수 없습니다: ${card.id} ${index}`);
          const buildingImage = realEstateBuildingImageFor(pad.buildingAssetFile);
          return (
            <span
              className={`real-estate-development-building property-${card.id} level-${card.developmentLevel} theme-${card.districtBuildingTheme} variant-${pad.variant}`}
              data-building-asset={pad.buildingAssetId}
              data-building-theme={card.districtBuildingTheme}
              data-building-variant={pad.variant}
              data-slot-id={slot.id}
              key={slot.id}
              style={{
                left: `${pad.x}%`,
                top: `${pad.y}%`,
                zIndex: pad.z + 10,
                "--building-anchor-x": `${pad.buildingAnchorX}%`,
                "--building-anchor-x-offset": `-${pad.buildingAnchorX}%`,
                "--building-anchor-y": `${pad.buildingAnchorY}%`,
                "--building-anchor-y-offset": `-${pad.buildingAnchorY}%`,
                "--building-height": `${pad.buildingDisplayHeight}px`,
                "--building-rotation": `${pad.rotation}deg`,
                "--building-width": `${pad.buildingDisplayWidth}px`,
                "--building-scale": pad.scale,
              }}
            >
              <img alt="" aria-hidden="true" draggable="false" src={buildingImage} />
            </span>
          );
        })}
      </div>
      <div className="real-estate-ambient-layer" data-layer-purpose="future-residents" />
    </div>
  );
}

function RealEstateDistrictLabel({ bounds, card }) {
  return (
    <span className="real-estate-district-label" style={percentPointStyle(localPercentPoint(card.districtLabelAnchor, bounds))}>
      <strong>{card.name}</strong>
      <small>{card.unlocked ? `${formatCompactNumber(card.count)}채` : card.unlockLabel}</small>
    </span>
  );
}

function RealEstateDistrictButton({ card, onDistrictClick }) {
  const stateClass = card.unlocked ? card.count > 0 ? "owned" : "ready" : "locked";
  const bounds = polygonBounds(card.districtPolygon);
  return (
    <button
      aria-label={card.unlocked ? `${card.name} 지역 보기` : `${card.name} 잠김 ${card.unlockLabel}`}
      className={`real-estate-district-button ${stateClass}`}
      data-development-level={card.developmentLevel}
      data-district-id={card.id}
      data-locked={card.unlocked ? "false" : "true"}
      onClick={() => onDistrictClick(card)}
      style={{ ...polygonBoxStyle(card.districtPolygon), "--development-ratio": card.developmentRatio }}
      type="button"
    >
      <RealEstateDistrictLabel bounds={bounds} card={card} />
    </button>
  );
}

function RealEstateDistrictSurface({ card, selected }) {
  const stateClass = card.unlocked ? card.count > 0 ? "owned" : "ready" : "locked";
  return (
    <div
      className={`real-estate-district-surface ${stateClass}${selected ? " selected" : ""}`}
      data-development-level={card.developmentLevel}
      data-district-id={card.id}
      style={{ ...polygonBoxStyle(card.districtPolygon), "--development-ratio": card.developmentRatio }}
    />
  );
}

function RealEstateCityMapLayers({ realEstateSummary, onDistrictClick, selectedPropertyId, showButtons }) {
  return (
    <>
      {realEstateSummary.cards.map((card) => (
        showButtons ? (
          <RealEstateDistrictButton card={card} key={card.id} onDistrictClick={onDistrictClick} />
        ) : (
          <RealEstateDistrictSurface card={card} key={card.id} selected={card.id === selectedPropertyId} />
        )
      ))}
      {realEstateSummary.cards.map((card) => (
        <RealEstateBuildingSlots card={card} key={`${card.id}-buildings`} />
      ))}
    </>
  );
}

function clampRealEstatePan(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const REAL_ESTATE_DETAIL_CONTENT_SCALE = 2;
const REAL_ESTATE_DETAIL_MIN_ZOOM = 0.5;
const REAL_ESTATE_DETAIL_DEFAULT_ZOOM = REAL_ESTATE_DETAIL_MIN_ZOOM;
const REAL_ESTATE_DETAIL_MAX_ZOOM = 1;
const REAL_ESTATE_DETAIL_WHEEL_STEP = 0.08;
const REAL_ESTATE_DETAIL_DEFAULT_VIEW = {
  zoom: REAL_ESTATE_DETAIL_DEFAULT_ZOOM,
  x: 0,
  y: 0,
};

function realEstateNumberOr(value, defaultValue) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
}

function clampRealEstateDetailView(viewport, candidate) {
  const zoom = clampRealEstatePan(
    realEstateNumberOr(candidate.zoom, REAL_ESTATE_DETAIL_DEFAULT_ZOOM),
    REAL_ESTATE_DETAIL_MIN_ZOOM,
    REAL_ESTATE_DETAIL_MAX_ZOOM,
  );
  const x = realEstateNumberOr(candidate.x, 0);
  const y = realEstateNumberOr(candidate.y, 0);
  if (!viewport) return { zoom, x, y };
  const rect = viewport.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { zoom, x, y };
  const minX = Math.min(0, rect.width - rect.width * REAL_ESTATE_DETAIL_CONTENT_SCALE * zoom);
  const minY = Math.min(0, rect.height - rect.height * REAL_ESTATE_DETAIL_CONTENT_SCALE * zoom);
  return {
    zoom,
    x: clampRealEstatePan(x, minX, 0),
    y: clampRealEstatePan(y, minY, 0),
  };
}

function realEstatePointInViewport(viewport, clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function realEstatePointerCentroid(pointers) {
  if (pointers.length === 0) return null;
  const total = pointers.reduce((sum, pointer) => ({
    x: sum.x + pointer.clientX,
    y: sum.y + pointer.clientY,
  }), { x: 0, y: 0 });
  return {
    x: total.x / pointers.length,
    y: total.y / pointers.length,
  };
}

function realEstatePointerDistance(pointers) {
  if (pointers.length < 2) return 0;
  const [first, second] = pointers;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function zoomRealEstateDetailAtPoint(viewport, currentView, nextZoom, viewportPoint) {
  const safeZoom = Math.max(currentView.zoom, 0.001);
  const contentX = (viewportPoint.x - currentView.x) / safeZoom;
  const contentY = (viewportPoint.y - currentView.y) / safeZoom;
  return clampRealEstateDetailView(viewport, {
    zoom: nextZoom,
    x: viewportPoint.x - contentX * nextZoom,
    y: viewportPoint.y - contentY * nextZoom,
  });
}

function RealEstateOverviewScene({ notice, onDistrictClick, realEstateSummary }) {
  return (
    <section className="real-estate-scene real-estate-overview" aria-label="부동산 도시 전체 보기" data-real-estate-view="overview">
      <div className="real-estate-map-frame">
        <img className="real-estate-map-image" src={realEstateCityMap} alt="" aria-hidden="true" />
        <RealEstateCityMapLayers realEstateSummary={realEstateSummary} onDistrictClick={onDistrictClick} selectedPropertyId="" showButtons />
        <div className="real-estate-city-head">
          <div>
            <span>도시 전체 보기</span>
            <strong>{realEstateSummary.ownedKinds}/{realEstateSummary.totalKinds} 지역 개발</strong>
          </div>
          <b>{realEstateSummary.ownedTotal}채</b>
        </div>
        {notice ? <p className="real-estate-map-notice">{notice}</p> : null}
      </div>
    </section>
  );
}

function RealEstateDistrictScene({ onBackToOverview, realEstateSummary, selectedPropertyId }) {
  const selectedCard = realEstateSummary.cards.find((card) => card.id === selectedPropertyId);
  assert(selectedCard, `선택된 부동산 지역을 찾을 수 없습니다: ${selectedPropertyId}`);
  const selectedBackground = selectedCard.districtGrowthStageAsset
    ? realEstateDistrictGrowthImageFor(selectedCard.districtGrowthStageAsset)
    : realEstateDistrictBackgrounds[selectedCard.districtBackgroundAsset];
  assert(selectedBackground, `부동산 상세 배경을 찾을 수 없습니다: ${selectedCard.districtBackgroundAsset}`);
  const viewportRef = useRef(null);
  const viewRef = useRef(REAL_ESTATE_DETAIL_DEFAULT_VIEW);
  const gestureRef = useRef({
    pointers: new Map(),
    startCentroid: null,
    startDistance: 0,
    startView: REAL_ESTATE_DETAIL_DEFAULT_VIEW,
  });
  const detailViewportFocusedRef = useRef(false);
  const [detailView, setDetailView] = useState(REAL_ESTATE_DETAIL_DEFAULT_VIEW);
  const [detailViewportFocused, setDetailViewportFocused] = useState(false);

  const applyDetailView = (candidate) => {
    const viewport = viewportRef.current;
    const nextView = clampRealEstateDetailView(viewport, candidate);
    viewRef.current = nextView;
    setDetailView(nextView);
    return nextView;
  };

  const resetGesture = (pointers) => {
    const pointerList = Array.from(pointers.values());
    gestureRef.current = {
      pointers,
      startCentroid: realEstatePointerCentroid(pointerList),
      startDistance: realEstatePointerDistance(pointerList),
      startView: viewRef.current,
    };
  };

  const setDetailFocus = (focused) => {
    detailViewportFocusedRef.current = focused;
    setDetailViewportFocused(focused);
  };

  useLayoutEffect(() => {
    viewRef.current = REAL_ESTATE_DETAIL_DEFAULT_VIEW;
    gestureRef.current = {
      pointers: new Map(),
      startCentroid: null,
      startDistance: 0,
      startView: REAL_ESTATE_DETAIL_DEFAULT_VIEW,
    };
    setDetailView(REAL_ESTATE_DETAIL_DEFAULT_VIEW);
    const handleResize = () => {
      const nextView = clampRealEstateDetailView(viewportRef.current, viewRef.current);
      viewRef.current = nextView;
      setDetailView(nextView);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedCard.id]);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    viewportRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointers = new Map(gestureRef.current.pointers);
    pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    });
    resetGesture(pointers);
  };

  const handlePointerMove = (event) => {
    const gesture = gestureRef.current;
    if (!gesture.pointers.has(event.pointerId)) return;
    event.preventDefault();
    const pointers = new Map(gesture.pointers);
    pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    });
    gestureRef.current = { ...gesture, pointers };
    const pointerList = Array.from(pointers.values());
    const currentCentroid = realEstatePointerCentroid(pointerList);
    if (!currentCentroid || !gesture.startCentroid) return;
    if (pointerList.length === 1) {
      applyDetailView({
        zoom: gesture.startView.zoom,
        x: gesture.startView.x + currentCentroid.x - gesture.startCentroid.x,
        y: gesture.startView.y + currentCentroid.y - gesture.startCentroid.y,
      });
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) return;
    const currentDistance = realEstatePointerDistance(pointerList);
    const zoomRatio = gesture.startDistance > 0 ? currentDistance / gesture.startDistance : 1;
    const nextZoom = gesture.startView.zoom * zoomRatio;
    const startPoint = realEstatePointInViewport(viewport, gesture.startCentroid.x, gesture.startCentroid.y);
    const currentPoint = realEstatePointInViewport(viewport, currentCentroid.x, currentCentroid.y);
    const safeZoom = Math.max(gesture.startView.zoom, 0.001);
    const contentX = (startPoint.x - gesture.startView.x) / safeZoom;
    const contentY = (startPoint.y - gesture.startView.y) / safeZoom;
    applyDetailView({
      zoom: nextZoom,
      x: currentPoint.x - contentX * nextZoom,
      y: currentPoint.y - contentY * nextZoom,
    });
  };

  const handlePointerEnd = (event) => {
    const pointers = new Map(gestureRef.current.pointers);
    pointers.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetGesture(pointers);
  };

  useEffect(() => {
    const viewportNode = viewportRef.current;
    if (!viewportNode) return undefined;
    const handleWheel = (event) => {
      if (!detailViewportFocusedRef.current) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const currentView = viewRef.current;
      const point = realEstatePointInViewport(viewport, event.clientX, event.clientY);
      applyDetailView(zoomRealEstateDetailAtPoint(
        viewport,
        currentView,
        currentView.zoom + direction * REAL_ESTATE_DETAIL_WHEEL_STEP,
        point,
      ));
    };
    viewportNode.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewportNode.removeEventListener("wheel", handleWheel);
  }, [selectedCard.id]);

  return (
    <section className="real-estate-scene real-estate-district" aria-label={`${selectedCard.name} 지역 상세 보기`} data-real-estate-view="district" data-selected-property-id={selectedCard.id} data-uses-baked-growth={selectedCard.usesBakedDistrictGrowth ? "true" : "false"}>
      <div
        className="real-estate-detail-viewport"
        data-focused={detailViewportFocused ? "true" : "false"}
        data-zoom={detailView.zoom.toFixed(2)}
        onBlur={() => setDetailFocus(false)}
        onFocus={() => setDetailFocus(true)}
        ref={viewportRef}
        tabIndex={0}
      >
        <div
          className="real-estate-detail-map"
          data-pan-x={Math.round(detailView.x)}
          data-pan-y={Math.round(detailView.y)}
          data-zoom={detailView.zoom.toFixed(2)}
          onPointerCancel={handlePointerEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          style={{ transform: `translate(${detailView.x.toFixed(1)}px, ${detailView.y.toFixed(1)}px) scale(${detailView.zoom.toFixed(3)})` }}
        >
          <img className="real-estate-detail-background" src={selectedBackground} alt="" aria-hidden="true" data-district-background={selectedCard.districtBackgroundAsset} data-growth-asset={selectedCard.districtGrowthStageAsset || ""} draggable="false" />
          {selectedCard.usesBakedDistrictGrowth ? null : (
            <div className="real-estate-detail-development-field">
              <RealEstateDetailDevelopmentLayer card={selectedCard} />
            </div>
          )}
        </div>
        <button className="secondary-action compact real-estate-map-back" type="button" onClick={onBackToOverview}>
          <BriefcaseBusiness size={16} />
          <span>전체 도시 보기</span>
        </button>
        <div className="real-estate-city-head real-estate-detail-head">
          <div>
            <span>{selectedCard.scaleLabel}</span>
            <strong>{selectedCard.name}</strong>
          </div>
          <b>{selectedCard.count}채</b>
        </div>
      </div>
    </section>
  );
}

function RealEstateScene({ notice, onBackToOverview, onDistrictClick, realEstateSummary, selectedPropertyId, viewMode }) {
  if (viewMode === "overview") {
    return <RealEstateOverviewScene notice={notice} onDistrictClick={onDistrictClick} realEstateSummary={realEstateSummary} />;
  }
  return <RealEstateDistrictScene onBackToOverview={onBackToOverview} realEstateSummary={realEstateSummary} selectedPropertyId={selectedPropertyId} />;
}

function RealEstateCard({ card, featured = false, onBuy, onBuyMax }) {
  const cardClass = `${card.unlocked ? card.count > 0 ? "real-estate-card owned" : "real-estate-card ready" : "real-estate-card locked"}${featured ? " featured" : ""}`;
  const progressWidth = `${Math.max(0, Math.min(100, card.nextScaleProgress))}%`;
  return (
    <article className={cardClass} data-development-level={card.developmentLevel} data-property-id={card.id} data-real-estate-card="true">
      <header>
        <div>
          <span>{card.unlocked ? card.scaleLabel : card.unlockLabel}</span>
          <strong>{card.name}</strong>
        </div>
        <b>{card.count}/{card.maxOwnedCount}채</b>
      </header>
      <p>{card.description}</p>
      <div className="real-estate-card-stats">
        <Metric label="규모" value={card.portfolioLabel} />
        <Metric label="임대/분" value={formatCompactNumber(card.rentPerMinute)} />
        <Metric label="개발도" value={`${card.developmentRatio}%`} />
      </div>
      <div className="real-estate-scale">
        <span>{card.nextScaleLabel}</span>
        <i><span style={{ width: progressWidth }} /></i>
      </div>
      <div className="real-estate-card-actions">
        <button className="secondary-action compact" data-action="buy-one" type="button" disabled={!card.canBuyOne} onClick={() => onBuy(card.id, 1)}>
          <span>{card.unlocked ? "구매" : "잠김"}</span>
          <small>{card.unlocked ? card.isMaxed ? "최대" : formatCompactNumber(card.nextCost) : card.unlockLabel}</small>
        </button>
        <button className="secondary-action compact" data-action="buy-ten" type="button" disabled={!card.canBuyTen} onClick={() => onBuy(card.id, 10)}>
          <span>{card.unlocked ? card.buyTenCount > 0 ? `${card.buyTenCount}개` : "최대" : "잠김"}</span>
          <small>{card.unlocked ? card.cost10 > 0 ? formatCompactNumber(card.cost10) : "완료" : card.unlockLabel}</small>
        </button>
        <button className="primary-action compact" data-action="buy-max" type="button" disabled={!card.canBuyMax} onClick={() => onBuyMax(card.id)}>
          <span>최대</span>
          <small>{card.isMaxed ? "완료" : card.maxBuyCount > 0 ? `${card.maxBuyCount}개` : "부족"}</small>
        </button>
      </div>
    </article>
  );
}

function RealEstateManagementPanel({ realEstateSummary, selectedPropertyId, onBuy, onBuyMax, onClaimWeeklyReward }) {
  const selectedCard = selectedPropertyId ? realEstateSummary.cards.find((card) => card.id === selectedPropertyId) : null;
  if (selectedPropertyId) assert(selectedCard, `선택된 부동산 관리 카드를 찾을 수 없습니다: ${selectedPropertyId}`);
  const cards = selectedCard ? [selectedCard] : realEstateSummary.cards;
  return (
    <section className="real-estate-viewport">
      <header className="section-title compact-title">
        <div>
          <BriefcaseBusiness size={18} />
          <h2>{selectedCard ? `${selectedCard.name} 관리` : "부동산 포트폴리오"}</h2>
        </div>
        <span>{selectedCard ? selectedCard.portfolioLabel : `${realEstateSummary.ownedKinds}/${realEstateSummary.totalKinds}종`}</span>
      </header>
      <div className="real-estate-ranking-panel">
        <Metric label="예상 순위" value={`${formatCompactNumber(realEstateSummary.rank)}위`} />
        <Metric label="예상 보상" value={`${formatCompactNumber(realEstateSummary.rewardDiamonds)} 다이아`} />
        <Metric label="보상 구간" value={realEstateSummary.rewardLabel} />
        <button className="primary-action compact real-estate-reward-button" type="button" disabled={!realEstateSummary.canClaimWeeklyReward} onClick={onClaimWeeklyReward}>
          <Gem size={16} />
          <span>{realEstateSummary.weeklyRewardButtonLabel}</span>
          <small>{realEstateSummary.weeklyRewardHint}</small>
        </button>
      </div>
      <div className={selectedCard ? "real-estate-card-list selected-district" : "real-estate-card-list"}>
        {cards.map((card) => (
          <RealEstateCard card={card} featured={Boolean(selectedCard)} key={card.id} onBuy={onBuy} onBuyMax={onBuyMax} />
        ))}
      </div>
    </section>
  );
}

function ExamPanel({ gameState, onBattleComplete, summary }) {
  const current = gameState.current;
  const battle = current.battle;
  assert(battle, "시험 탭 current.battle 데이터가 없습니다.");
  const gradeVisual = resolveGradeVisual(current);
  const examResults = [...current.examResults].reverse();
  assert(Array.isArray(battle.enemies) && battle.enemies.length > 0, `시험 탭 enemies 데이터가 비어 있습니다: ${battle.encounterId}`);
  const defeatedCount = battle.enemies.filter((enemy) => enemy.remainingHp <= 0).length;
  const activeEnemy = activeEnemyForBattle(battle);
  const elapsedSeconds = Math.floor(finiteNumber(battle.elapsedMs, `전투 elapsedMs 값이 올바르지 않습니다: ${battle.encounterId}`) / 1000);
  const totalSeconds = Math.ceil(finiteNumber(battle.maxDurationMs, `전투 maxDurationMs 값이 올바르지 않습니다: ${battle.encounterId}`) / 1000);
  const battleTitle = battle.kind === "suneung" ? "수능 전투" : "학년 전투";
  const evaluationLabel = battle.kind === "suneung" ? `${battle.enemies.length}과목` : "12개월";
  const enemyKindLabel = (enemy) => {
    if (enemy.kind === "normal") return "일반";
    if (enemy.kind === "boss") return "보스";
    if (enemy.kind === "suneung") return "수능";
    assert(false, `지원하지 않는 시험 적 kind입니다: ${enemy.kind}`);
    return "";
  };

  return (
    <section className="viewport exam-panel">
      <div className="stack exam-stack">
      <div className="section-title">
        <div>
          <ScrollText size={18} />
          <h2>{battleTitle}</h2>
        </div>
        <span className="count-badge">{defeatedCount}/{battle.enemies.length} 처치</span>
      </div>
      <div className="panel battle-summary-panel" aria-label="시험 요약">
        <div className="metric">
          <span>과정</span>
          <strong>{summary.courseLabel}</strong>
        </div>
        <div className="metric">
          <span>경과</span>
          <strong>{elapsedSeconds}초 / {totalSeconds}초</strong>
        </div>
        <div className="metric">
          <span>평가</span>
          <strong>{evaluationLabel}</strong>
        </div>
      </div>
      <div className="battle-enemy-grid" aria-label="전투 적 체력">
        {battle.enemies.map((enemy) => {
          const frame = enemyFrame(enemy, gradeVisual);
          const hp = Math.ceil(Math.max(0, finiteNumber(enemy.remainingHp, `적 remainingHp 값이 올바르지 않습니다: ${enemy.id}`)));
          const maxHp = finiteNumber(enemy.maxHp, `적 maxHp 값이 올바르지 않습니다: ${enemy.id}`);
          const hpRatio = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
          const defeated = hp <= 0;
          const active = activeEnemy.id === enemy.id;
          return (
            <div className={`battle-enemy-card ${enemy.kind}${active ? " active" : ""}${defeated ? " defeated" : ""}`} key={enemy.id}>
              <span
                className={`battle-enemy-monster main-monster-${String(frame).padStart(3, "0")}`}
                title={enemyName(enemy, gradeVisual)}
                aria-hidden="true"
                style={{
                  ...enemyStyle(frame),
                  "--monster-frame-x": frameXPercent(frame, enemyColumns),
                }}
              />
              <div>
                <strong>{enemy.label}</strong>
                <span>{enemyKindLabel(enemy)}</span>
              </div>
              <div className="enemy-hp-bar">
                <i style={{ width: `${hpRatio}%` }} />
              </div>
              <small>{formatMoney(hp)}/{formatMoney(maxHp)}</small>
            </div>
          );
        })}
      </div>
      <button className="primary-action" type="button" onClick={onBattleComplete}>
        <ScrollText size={19} />
        <span>{battle.kind === "suneung" ? "수능 완료" : "학년 평가 완료"}</span>
      </button>
      {examResults.length > 0 ? (
        <section className="record-list exam-result-list" aria-label="시험 결과 기록">
          {examResults.map((result) => {
            assert(result.examId, "시험 결과 examId가 없습니다.");
            assert(result.examName, `시험 결과 examName이 없습니다: ${result.examId}`);
            assert(result.gradeId, `시험 결과 gradeId가 없습니다: ${result.examId}`);
            finiteNumber(result.createdAt, `시험 결과 createdAt 값이 올바르지 않습니다: ${result.examId}`);
            finiteNumber(result.score, `시험 결과 score 값이 올바르지 않습니다: ${result.examId}`);
            finiteNumber(result.rank, `시험 결과 rank 값이 올바르지 않습니다: ${result.examId}`);
            finiteNumber(result.studyPointReward, `시험 결과 studyPointReward 값이 올바르지 않습니다: ${result.examId}`);
            return (
              <article className="record-card exam-result-card" key={`${result.examId}-${result.createdAt}`}>
                <header>
                  <div>
                    <strong>{result.examName}</strong>
                    <small>{formatDateTime(result.createdAt)} · {result.gradeId}</small>
                  </div>
                  <b>{formatMoney(result.score)}점</b>
                </header>
                <dl className="record-stats">
                  <div>
                    <dt>등수</dt>
                    <dd>{formatMoney(result.rank)}등</dd>
                  </div>
                  <div>
                    <dt>보상</dt>
                    <dd>+{formatMoney(result.studyPointReward)} 공부량</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      ) : (
        <p className="empty-state">시험 기록 없음</p>
      )}
      </div>
    </section>
  );
}

function WorkPanel({ gameState }) {
  const careerAlumni = gameState.careerAlumni.filter((alumni) => careerAlumniCareer(alumni));
  const workSlots = finiteNumber(gameState.workSlots, "workSlots 값이 올바르지 않습니다.");
  assert(workSlots > 0, `workSlots 값은 1 이상이어야 합니다: ${workSlots}`);
  const totalIncome = careerAlumni.reduce((sum, alumni) => {
    const income = finiteNumber(alumni.incomePerMinute, `졸업생 incomePerMinute 값이 올바르지 않습니다: ${alumni.id}`);
    return sum + income;
  }, 0);
  const averagePower =
    careerAlumni.length > 0
      ? careerAlumni.reduce((sum, alumni) => {
        const powerMultiplier = finiteNumber(alumni.powerMultiplier, `졸업생 powerMultiplier 값이 올바르지 않습니다: ${alumni.id}`);
        return sum + powerMultiplier;
      }, 0) / careerAlumni.length
      : 1;

  if (careerAlumni.length === 0) {
    return (
      <main className="records-panel work-panel work-panel-empty">
        <header className="section-title">
          <div>
            <BriefcaseBusiness size={25} />
            <h2>직장</h2>
          </div>
        </header>
        <section className="panel accent-panel income-panel record-summary-grid work-summary-grid" aria-label="직장 요약">
          <div className="metric">
            <span>수입/분</span>
            <strong>{formatMoney(totalIncome)}원</strong>
          </div>
          <div className="metric">
            <span>슬롯</span>
            <strong>0/{workSlots}</strong>
          </div>
          <div className="metric">
            <span>한도</span>
            <strong>12시간</strong>
          </div>
        </section>
        <button className="secondary-action work-income-card work-slot-expand-button" type="button" disabled>
          <BriefcaseBusiness size={18} />
          <span>슬롯 확장 · 1.8만원</span>
        </button>
        <div className="list work-empty-list">
          <p className="empty-state">근무 중 졸업생 없음</p>
        </div>
      </main>
    );
  }

  return (
    <main className="records-panel work-panel">
      <header className="section-title">
        <div>
          <BriefcaseBusiness size={25} />
          <h2>직장</h2>
        </div>
        <span>{careerAlumni.length}/{workSlots}</span>
      </header>
      <section className="record-summary-grid work-summary-grid" aria-label="직장 요약">
        <article>
          <span>등록</span>
          <strong>{careerAlumni.length}명</strong>
        </article>
        <article>
          <span>수입/분</span>
          <strong>{formatMoney(totalIncome)}원</strong>
        </article>
        <article>
          <span>전투</span>
          <strong>x{averagePower.toFixed(2)}</strong>
        </article>
      </section>
      {careerAlumni.length > 0 ? (
        <section className="record-list work-companion-list" aria-label="직장 졸업생 목록">
          {careerAlumni.map((alumni) => {
            const career = careerAlumniCareer(alumni);
            assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${alumni.careerId}`);
            const statusLabel = companionStatusLabels[alumni.status];
            assert(statusLabel, `지원하지 않는 졸업생 상태입니다: ${alumni.id} / ${alumni.status}`);
            assert(alumni.careerName, `졸업생 careerName이 없습니다: ${alumni.id}`);
            assert(alumni.sourceUniversity, `졸업생 sourceUniversity가 없습니다: ${alumni.id}`);
            assert(Number.isFinite(Number(alumni.powerMultiplier)), `졸업생 powerMultiplier가 없습니다: ${alumni.id}`);
            assert(Number.isFinite(Number(alumni.careerRank)), `졸업생 careerRank가 없습니다: ${alumni.id}`);
            return (
              <article className="record-card work-companion-card" key={alumni.id}>
                <header>
                  <div>
                    <strong>{alumni.careerName}</strong>
                    <small>{alumni.sourceUniversity} · {statusLabel}</small>
                  </div>
                  <b>{formatMoney(alumni.incomePerMinute)}원/분</b>
                </header>
                <dl className="record-stats">
                  <div>
                    <dt>전투</dt>
                    <dd>x{Number(alumni.powerMultiplier).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>순위</dt>
                    <dd>#{alumni.careerRank}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      ) : (
        <article className="record-empty">
          <strong>직장 졸업생 없음</strong>
          <span>직업을 수락해 졸업생을 등록하면 직장 수입이 계산됩니다.</span>
        </article>
      )}
    </main>
  );
}

function trackLabel(track) {
  if (track === "science") return "이과";
  if (track === "humanities") return "문과";
  if (track === "balanced") return "균형";
  assert(false, `지원하지 않는 preferredTrack입니다: ${track}`);
  return "";
}

function formatCollectionValue(effect, value) {
  if (effect.unit === "percent") return `+${Math.round(value * 100)}%`;
  if (effect.unit === "hours") return `+${Number(value).toFixed(2)}시간`;
  assert(false, `지원하지 않는 도감 효과 unit입니다: ${effect.unit}`);
  return "";
}

function careerCollectionLabel(career) {
  const effectLink = careerEffectByCareerId.get(career.id);
  assert(effectLink, `career_collection_effects.json에서 직업 효과를 찾을 수 없습니다: ${career.id}`);
  const effect = collectionEffectById.get(effectLink.effectId);
  assert(effect, `career_collection_effects.json에서 효과를 찾을 수 없습니다: ${effectLink.effectId}`);
  return `${effect.shortName} ${formatCollectionValue(effect, finiteNumber(effectLink.value, `도감 효과 값이 올바르지 않습니다: ${career.id}`))}`;
}

function careerCollectionEffectInfo(career) {
  const effectLink = careerEffectByCareerId.get(career.id);
  assert(effectLink, `career_collection_effects.json에서 직업 효과를 찾을 수 없습니다: ${career.id}`);
  const effect = collectionEffectById.get(effectLink.effectId);
  assert(effect, `career_collection_effects.json에서 효과를 찾을 수 없습니다: ${effectLink.effectId}`);
  const value = finiteNumber(effectLink.value, `도감 효과 값이 올바르지 않습니다: ${career.id}`);
  return { effect, value };
}

function careerSubjectWeights(career) {
  assert(career.statWeights && typeof career.statWeights === "object", `careers.json statWeights가 없습니다: ${career.id}`);
  return subjects.map((subject) => ({
    subject,
    value: finiteNumber(career.statWeights[subject.id], `careers.json statWeights.${subject.id} 값이 올바르지 않습니다: ${career.id}`),
  }));
}

function ArchivePanel({ gameState }) {
  const histories = gameState.history;
  // 도감 보너스는 발견 직업(careerAlumni + history + archive) 기반으로 실제 적용된다.
  const discovered = discoveredCareerIdsFor(gameState);
  const effectTotals = collectionBonuses(gameState);
  const orderedCareers = careers.slice().sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`));
  const activeEffectCount = careerCollectionData.collectionEffects.filter((effect) => effectTotals[effect.id] > 0).length;
  const completionPercent = Math.round((discovered.size / Math.max(1, careers.length)) * 100);

  return (
    <main className="records-panel archive-panel">
      <div className="section-title">
        <div>
          <Medal size={25} />
          <h2>직업 도감</h2>
        </div>
        <span>{discovered.size}/{careers.length}</span>
      </div>
      <div className="panel accent-panel income-panel archive-summary-grid" aria-label="도감 요약">
        <div className="metric">
          <span>발견</span>
          <strong>{discovered.size}개</strong>
        </div>
        <div className="metric">
          <span>완성</span>
          <strong>{completionPercent}%</strong>
        </div>
        <div className="metric">
          <span>효과</span>
          <strong>{activeEffectCount}종</strong>
        </div>
      </div>
      {histories.length > 0 && (
        <section className="record-list archive-history-list" aria-label="은퇴 회차 기록">
          {histories.map((history) => {
            assert(history.careerId, `히스토리 careerId가 없습니다: ${history.runNumber}`);
            assert(history.careerName, `히스토리 careerName이 없습니다: ${history.runNumber}`);
            assert(history.universityName, `히스토리 universityName이 없습니다: ${history.runNumber}`);
            finiteNumber(history.runNumber, `히스토리 runNumber 값이 올바르지 않습니다: ${history.careerId}`);
            finiteNumber(history.suneungScore, `히스토리 suneungScore 값이 올바르지 않습니다: ${history.careerId}`);
            finiteNumber(history.careerRank, `히스토리 careerRank 값이 올바르지 않습니다: ${history.careerId}`);
            finiteNumber(history.createdAt, `히스토리 createdAt 값이 올바르지 않습니다: ${history.careerId}`);
            finiteNumber(history.age, `히스토리 age 값이 올바르지 않습니다: ${history.careerId}`);
            return (
              <article className="record-card archive-history-card" key={`${history.runNumber}-${history.careerId}`}>
                <header>
                  <div>
                    <strong>{history.runNumber}회차 · {history.careerName}</strong>
                    <small>{history.universityName} · {formatDateTime(history.createdAt)}</small>
                  </div>
                  <b>{formatMoney(history.suneungScore)}점</b>
                </header>
                <dl className="record-stats">
                  <div>
                    <dt>직업 순위</dt>
                    <dd>#{history.careerRank}</dd>
                  </div>
                  <div>
                    <dt>나이</dt>
                    <dd>{formatMoney(history.age)}세</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}
      <div className="panel collection-bonus-panel">
        <header>
          <strong>도감 효과 (발견 직업 적용)</strong>
          <small>{careerCollectionData.collectionEffects.length}종 적용 중</small>
        </header>
        <div className="collection-effect-grid">
          {careerCollectionData.collectionEffects.map((effect) => {
            const maxStack = finiteNumber(effect.maxStack, `도감 효과 maxStack 값이 올바르지 않습니다: ${effect.id}`);
            const total = effectTotals[effect.id];
            const progressPercent = Math.max(4, Math.min(100, (total / maxStack) * 100));
            return (
              <div className="collection-effect-item" key={effect.id}>
                <span>{effect.shortName}</span>
                <strong>{formatCollectionValue(effect, total)}</strong>
                <small>{effect.name}</small>
                <div aria-hidden="true">
                  <i style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="career-book" aria-label="직업 도감 목록">
        {orderedCareers.map((career) => {
          const isDiscovered = discovered.has(career.id);
          const { effect, value } = careerCollectionEffectInfo(career);
          const weights = careerSubjectWeights(career);
          const maxWeight = Math.max(1, ...weights.map((item) => item.value));
          return (
            <article className={isDiscovered ? "career-card discovered" : "career-card locked"} key={career.id}>
              <header>
                <span className={`career-emblem career-portrait career-${career.id}`} style={careerAtlasStyle(career, "male")} aria-hidden="true" />
                <div>
                  <strong>{isDiscovered ? career.name : LOCKED_CAREER_LABEL}</strong>
                  <small>{isDiscovered ? `#${career.choiceRank} · Tier ${career.tier} · ${trackLabel(career.preferredTrack)}` : `#${career.choiceRank} · 명성 ${career.minPrestige}`}</small>
                </div>
                <b>{isDiscovered ? "보유" : "미발견"}</b>
              </header>
              <div className="career-meta">
                <span>{career.supportRole}</span>
                <span>{formatMoney(career.baseIncomePerMinute)}원/분</span>
                <span>{effect.shortName} {formatCollectionValue(effect, value)}</span>
              </div>
              <CompactDisclosure className="career-guide-disclosure" title="분배 가이드" meta="5과목">
                <div className="career-weights">
                  {weights.map(({ subject, value }) => (
                    <div className="weight-row" key={`${career.id}-${subject.id}`}>
                      <span>{subject.label}</span>
                      <div>
                        <i style={{ width: `${Math.max(4, (value / maxWeight) * 100)}%`, backgroundColor: subject.color }} />
                      </div>
                      <b>{value.toFixed(2)}</b>
                    </div>
                  ))}
                </div>
              </CompactDisclosure>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function EducationPanel({ gameState, onEducationUpgrade, summary }) {
  const gradeVisual = resolveGradeVisual(gameState.current);
  const activeActions = educationActions.filter((action) => educationAvailable(gameState, action));
  const totalLevel = educationActions.reduce((sum, action) => sum + educationLevel(gameState, action.id), 0);
  const currentMultiplier = educationPointMultiplier(gameState);
  const showEducationSummary = gradeVisual.phase !== "elementary";
  const formatEducationCardEffect = (value) => `${Math.round(finiteNumber(value, "교육 효과 값이 올바르지 않습니다.") * 100)}%`;
  const formatEducationCost = (value) => {
    const number = finiteNumber(value, "교육 비용 값이 올바르지 않습니다.");
    if (gradeVisual.phase === "elementary" && Math.abs(number) >= 10_000) return `${(number / 10_000).toFixed(1)}만`;
    return formatMoney(number);
  };

  return (
    <main className="records-panel education-panel">
      <header className="section-title">
        <div>
          <GraduationCap size={25} />
          <h2>교육</h2>
        </div>
        {showEducationSummary && <span>Lv.{totalLevel}</span>}
      </header>
      {showEducationSummary && (
        <section className="record-summary-grid education-summary-grid" aria-label="교육 요약">
          <article>
            <span>과정</span>
            <strong>{summary.courseLabel}</strong>
          </article>
          <article>
            <span>배율</span>
            <strong>x{currentMultiplier.toFixed(2)}</strong>
          </article>
          <article>
            <span>가능</span>
            <strong>{activeActions.length}/{educationActions.length}</strong>
          </article>
        </section>
      )}
      <section className="education-list" aria-label="교육 목록">
        {educationActions.map((action) => {
          const level = educationLevel(gameState, action.id);
          const cost = educationCost(gameState, action);
          const available = educationAvailable(gameState, action);
          const affordable = Number(gameState.money) >= cost;
          const canUpgrade = available && affordable;
          const currentEffect = educationEffect(action, level);
          const nextEffect = educationEffect(action, 1);
          const buttonTitle = available ? (affordable ? `${action.name} 레벨을 올립니다.` : "보유금이 부족합니다.") : `${gradeVisual.studentTitle} 과정에서는 선택할 수 없습니다.`;
          const categoryLabel = educationCategoryLabels[action.category];
          assert(categoryLabel, `교육 카테고리 라벨 누락: ${action.id} / ${action.category}`);
          educationSubjectsLabel(action);

          return (
            <article className={available ? "education-action-card" : "education-action-card muted"} data-action-id={action.id} key={action.id}>
              <div className="education-action-main">
                <strong>{action.name} Lv.{level}/{action.maxLevel}</strong>
                <small>+{formatEducationCardEffect(currentEffect)} → +{formatEducationCardEffect(nextEffect)}</small>
              </div>
              <button
                className="education-upgrade-button"
                type="button"
                disabled={!canUpgrade}
                title={buttonTitle}
                onClick={() => onEducationUpgrade(action.id)}
              >
                {formatEducationCost(cost)}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function ModalShell({ children, className, kicker, label, onClose, title }) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={className}>
        <header className="score-modal-header">
          <div>
            <p>{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button dark" type="button" title="닫기" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ExpeditionRewardModal({ onClaim, onClose, pendingReward }) {
  return (
    <ModalShell className="expedition-reward-modal" kicker="EXPEDITION" label="원정 보상" title="원정 보상" onClose={onClose}>
      <div className="expedition-reward-summary">
        <Metric label="전투" value={`${formatCompactNumber(pendingReward.battles)}회`} />
        <Metric label="승리" value={`${formatCompactNumber(pendingReward.wins)}회`} />
        <Metric label="실패" value={`${formatCompactNumber(pendingReward.losses)}회`} />
      </div>
      <div className="expedition-reward-list">
        <span>EXP <strong>{formatCompactNumber(pendingReward.trainingExp)}</strong></span>
        <span>부동산 자금 <strong>{formatCompactNumber(pendingReward.realEstateCash)}</strong></span>
        <span>다이아 <strong>{formatCompactNumber(pendingReward.diamonds)}</strong></span>
      </div>
      <div className="modal-actions expedition-reward-actions">
        <button className="primary-action compact" type="button" onClick={onClaim}>
          <CheckCircle size={17} />
          <span>받기</span>
        </button>
        <button className="secondary-action compact" type="button" disabled>
          <Gem size={17} />
          <span>다이아로 더받기</span>
          <small>준비중</small>
        </button>
        <button className="secondary-action compact" type="button" disabled>
          <Bell size={17} />
          <span>광고보고 더받기</span>
          <small>준비중</small>
        </button>
      </div>
    </ModalShell>
  );
}

function ProductActionLabel({ canUse, product }) {
  const actionIcons = {
    diamond: CreditCard,
    money: Coins,
    stationery_gacha: Pencil,
    book_gacha: BookOpen,
    remove_ads: CreditCard,
    package: CreditCard,
    pass: CreditCard,
  };
  const Icon = actionIcons[product.category];
  assert(Icon, `상점 상품 액션 아이콘 매핑 누락: ${product.id} / ${product.category}`);
  let label = "결제 준비중";
  if (product.enabled !== false && !canUse) label = "다이아 부족";
  if (product.equipmentGacha && canUse) label = `뽑기 ${formatShopCost(product.diamondCost)}`;
  if (product.category === "money" && canUse) label = `교환 ${formatShopCost(product.diamondCost)}`;
  return (
    <>
      <Icon size={17} />
      <span>{label}</span>
    </>
  );
}

function GachaResultPopup({ onClose, result }) {
  if (!result?.length) return null;
  const rankForRarity = (rarity) => {
    assert(Number.isFinite(rarityRank[rarity]), `장비 뽑기 rarity 순위가 없습니다: ${rarity}`);
    return rarityRank[rarity];
  };
  const ordered = result.slice().sort((left, right) => rankForRarity(right.rarity) - rankForRarity(left.rarity));
  const best = ordered[0];
  const rarity = best.rarity;
  assert(rarityLabels[rarity], `지원하지 않는 장비 뽑기 rarity입니다: ${rarity}`);
  const bestTier = equipmentDrawCopy[rarity];
  assert(bestTier, `장비 뽑기 카피가 없습니다: ${rarity}`);
  const highCount = result.filter((item) => rankForRarity(item.rarity) >= rankForRarity("A")).length;
  const BestIcon = best.slot === "book" ? BookOpen : Pencil;

  return (
    <div className="gacha-popup-backdrop" role="dialog" aria-modal="true" aria-label="장비 뽑기 결과">
      <section className={`gacha-popup rarity-${rarity}`}>
        <button className="gacha-popup-close" type="button" title="결과 닫기" aria-label="결과 닫기" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="gacha-popup-stage">
          <span className="gacha-beam beam-a" />
          <span className="gacha-beam beam-b" />
          <span className="gacha-beam beam-c" />
          <div className="gacha-grade-burst">
            <span>{rarity}</span>
            <b>{rarityLabels[rarity]}</b>
          </div>
          <div className={`gacha-equipment big slot-${best.slot}`} aria-hidden="true">
            <BestIcon size={58} />
            <span className="equipment-shine" />
          </div>
        </div>
        <div className="gacha-popup-copy">
          <span className={`rarity-badge rarity-${rarity}`}>{rarity} {rarityLabels[rarity]}</span>
          <h3>{bestTier.title}</h3>
          <strong>{best.name}</strong>
          <p>{bestTier.subtitle}</p>
        </div>
        <div className="gacha-popup-summary">
          <Metric label="획득 수" value={`${result.length}개`} />
          <Metric label="A 이상" value={`${highCount}개`} />
          <Metric label="최고 판매가" value={`${formatMoney(equipmentSellValue(best))}원`} />
        </div>
        <div className="gacha-popup-results" aria-label="획득 장비 목록">
          {ordered.map((item, index) => {
            const cardRarity = item.rarity;
            assert(rarityLabels[cardRarity], `지원하지 않는 장비 뽑기 결과 rarity입니다: ${item.id} / ${cardRarity}`);
            return (
              <article className={item.id === best.id ? `gacha-popup-card best rarity-${cardRarity}` : `gacha-popup-card rarity-${cardRarity}`} key={item.id}>
                <b>{cardRarity}</b>
                <div>
                  <strong>{item.name}</strong>
                  <span>{equipmentSlotLabel(item.slot)} · 판매 {formatMoney(equipmentSellValue(item))}원</span>
                </div>
                <small>{index + 1}</small>
              </article>
            );
          })}
        </div>
        <button className="primary-action compact gacha-confirm" type="button" onClick={onClose}>
          <CheckCircle size={18} />
          <span>확인</span>
        </button>
      </section>
    </div>
  );
}

function ShopModal({ gameState, onClose, onSetGameState }) {
  const [category, setCategory] = useState("diamond");
  const [gachaResult, setGachaResult] = useState([]);
  const products = shopProducts.filter((product) => product.category === category);
  const equipmentCount = gameState.equipment.inventory.length;

  const handleProduct = (product) => {
    try {
      if (product.equipmentGacha) {
        const result = drawEquipmentProduct(gameState, product.id);
        onSetGameState(result.state);
        setGachaResult(result.result);
      } else if (product.category === "money") {
        onSetGameState(exchangeMoneyProduct(gameState, product.id));
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  return (
    <>
      <ModalShell className="shop-modal" kicker="SHOP" label="상점" title="상점" onClose={onClose}>
        <div className="shop-wallet">
          <Metric label="보유 다이아" value={formatCompactNumber(gameState.diamonds)} />
          <Metric label="보유금" value={`${formatMoney(gameState.money)}원`} />
          <Metric label="보유 장비" value={`${equipmentCount}개`} />
        </div>
        <nav className="shop-category-tabs" aria-label="상점 분류">
          {shopCategories.map((item) => {
            const Icon = shopCategoryIcons[item.id];
            assert(Icon, `상점 카테고리 아이콘을 찾을 수 없습니다: ${item.id}`);
            return (
              <button className={category === item.id ? "shop-category active" : "shop-category"} type="button" key={item.id} onClick={() => setCategory(item.id)}>
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="shop-product-list">
          {products.map((product) => {
            const Icon = productIcons[product.icon];
            assert(Icon, `상점 상품 아이콘을 찾을 수 없습니다: ${product.id} / ${product.icon}`);
            const commerceProduct = product.equipmentGacha || product.category === "money";
            if (commerceProduct) {
              assert(Number.isFinite(Number(product.diamondCost)), `상점 상품 diamondCost 값이 없습니다: ${product.id}`);
            }
            const canUse = commerceProduct && product.enabled !== false && Number(gameState.diamonds) >= Number(product.diamondCost);
            const buttonClass = commerceProduct ? "primary-action compact" : "secondary-action compact";
            const disabled = commerceProduct ? !canUse : true;
            return (
              <article className={product.highlight ? "shop-product highlight" : "shop-product"} key={product.id}>
                <div className="shop-product-main">
                  <div className={product.equipmentGacha ? "shop-product-icon equipment" : product.category === "money" ? "shop-product-icon money" : "shop-product-icon"}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="shop-product-title">
                      <strong>{product.name}</strong>
                      {product.badge && <span>{product.badge}</span>}
                    </div>
                    <p>{product.subtitle}</p>
                  </div>
                </div>
                <div className="shop-rewards">
                  {product.rewards.map((reward) => <span key={`${product.id}-${reward}`}>{reward}</span>)}
                </div>
                <div className="shop-product-bottom">
                  <small>{product.note}</small>
                  <button className={buttonClass} type="button" disabled={disabled} onClick={() => handleProduct(product)}>
                    <ProductActionLabel canUse={canUse} product={product} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </ModalShell>
      <GachaResultPopup result={gachaResult} onClose={() => setGachaResult([])} />
    </>
  );
}

function DebugModal({ gameState, onClose, onSetGameState, showDebugTools = false }) {
  const [jsonText, setJsonText] = useState("");
  const [notice, setNotice] = useState("");
  const realEstateSummary = createRealEstateViewModel(gameState);

  const handleAddCareerCompanions = (count) => {
    const result = addDebugExpeditionMembers(gameState, count);
    onSetGameState(result.state);
    setNotice(`대원 후보 +${result.added.length} 완료`);
  };

  const handleExport = () => {
    setJsonText(JSON.stringify(gameState, null, 2));
    setNotice("내보내기 완료");
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSetGameState(ensureBattleState(normalizeGameState(parsed)));
      setNotice("불러오기 완료");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <ModalShell className="debug-modal" kicker="DEBUG" label="디버그 메뉴" title="데이터 관리" onClose={onClose}>
      <div className="debug-status">
        <Metric label="저장 데이터" value={isContentCurrent(gameState) ? "최신" : "갱신 필요"} />
        <Metric label="콘텐츠" value={CONTENT_REVISION.slice(0, 8)} />
        <Metric label="다이아" value={formatCompactNumber(gameState.diamonds)} />
        <Metric label="부동산 순위" value={`${formatCompactNumber(realEstateSummary.rank)}위`} />
        {showDebugTools && <Metric label="부동산 자금" value={formatCompactNumber(realEstateSummary.cash)} />}
        {showDebugTools && <Metric label="부동산 보유" value={`${realEstateSummary.ownedKinds}/${realEstateSummary.totalKinds}종`} />}
      </div>
      <div className="debug-actions">
        <button className="secondary-action compact" type="button" onClick={() => {
          onSetGameState(addDiamonds(gameState, 10000));
          setNotice("다이아 추가 완료");
        }}>
          <Gem size={18} />
          <span>다이아 +10K</span>
        </button>
        {showDebugTools && (
          <button className="secondary-action compact" type="button" disabled={realEstateSummary.rewardClaimed} onClick={() => {
            onSetGameState((state) => claimDebugRealEstateWeeklyReward(state));
            setNotice(`부동산 보상 ${formatCompactNumber(realEstateSummary.rewardDiamonds)} 다이아 수령`);
          }}>
            <Gem size={18} />
            <span>부동산 주간 보상 수령</span>
          </button>
        )}
        {showDebugTools && (
          <button className="secondary-action compact" type="button" onClick={() => {
            onSetGameState((state) => debugGrantRealEstateCash(state, 1000000));
            setNotice("부동산 자금 +1M 완료");
          }}>
            <Coins size={18} />
            <span>부동산 자금 +1M</span>
          </button>
        )}
        {showDebugTools && (
          <button className="secondary-action compact" type="button" onClick={() => {
            onSetGameState((state) => debugUnlockRealEstateStages(state, 100));
            setNotice("부동산 Stage 100 해금");
          }}>
            <LockOpen size={18} />
            <span>부동산 Stage 100</span>
          </button>
        )}
        {showDebugTools && (
          <button className="secondary-action compact" type="button" onClick={() => {
            onSetGameState((state) => debugSetAllRealEstateCounts(state, 1));
            setNotice("모든 부동산 1채 완료");
          }}>
            <BriefcaseBusiness size={18} />
            <span>부동산 모두 1채</span>
          </button>
        )}
        {showDebugTools && (
          <button className="secondary-action compact" type="button" onClick={() => {
            onSetGameState((state) => debugSetAllRealEstateCounts(state, 1000));
            setNotice("부동산 풀성장 완료");
          }}>
            <Sparkles size={18} />
            <span>부동산 풀성장</span>
          </button>
        )}
        {showDebugTools && (
          <button className="secondary-action compact danger-action" type="button" onClick={() => {
            onSetGameState((state) => debugResetRealEstateState(state));
            setNotice("부동산 초기화 완료");
          }}>
            <Trash2 size={18} />
            <span>부동산 초기화</span>
          </button>
        )}
        <button className="secondary-action compact" type="button" onClick={() => handleAddCareerCompanions(1)}>
          <Shuffle size={18} />
          <span>대원 후보 +1</span>
        </button>
        <button className="secondary-action compact" type="button" onClick={() => handleAddCareerCompanions(5)}>
          <Users size={18} />
          <span>대원 후보 +5</span>
        </button>
        <button className="secondary-action compact" type="button" onClick={() => {
          onSetGameState(ensureBattleState({ ...gameState, contentRevision: CONTENT_REVISION }));
          setNotice("동기화 완료");
        }}>
          <RefreshCcw size={18} />
          <span>데이터 동기화</span>
        </button>
        <button className="secondary-action compact" type="button" disabled={!gameState.current?.outcome} onClick={() => setNotice("재계산 완료")}>
          <Database size={18} />
          <span>현재 결과 재계산</span>
        </button>
        <button className="secondary-action compact" type="button" onClick={handleExport}>
          <Download size={18} />
          <span>세이브 내보내기</span>
        </button>
        <button className="secondary-action compact" type="button" disabled={jsonText.trim().length === 0} onClick={handleImport}>
          <Upload size={18} />
          <span>세이브 불러오기</span>
        </button>
      </div>
      <label className="debug-json">
        <span><Database size={15} /> 세이브 JSON</span>
        <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck={false} />
      </label>
      <div className="modal-actions single">
        <button className="primary-action compact" type="button" onClick={onClose}>
          <X size={18} />
          <span>{notice || "닫기"}</span>
        </button>
      </div>
    </ModalShell>
  );
}

function SettingRow({ checked, danger = false, description, icon: Icon, label, onClick }) {
  return (
    <button className={danger ? "setting-row danger" : "setting-row"} type="button" role={typeof checked === "boolean" ? "switch" : undefined} aria-checked={typeof checked === "boolean" ? checked : undefined} onClick={onClick}>
      <span className="setting-icon"><Icon size={17} /></span>
      <span className="setting-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      {typeof checked === "boolean" ? <span className={checked ? "switch on" : "switch"} aria-hidden="true"><i /></span> : <span className="setting-chevron"><ChevronRight size={16} /></span>}
    </button>
  );
}

function SettingsModal({ gameState, onClose, onResetGame, onSetGameState, settings, setSettings }) {
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const toggle = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <ModalShell className="settings-modal" kicker="MENU" label="설정" title="설정" onClose={onClose}>
      <div className="settings-summary">
        <Metric label="자동 저장" value={settings.autosave ? "ON" : "OFF"} />
        <Metric label="콘텐츠" value={contentRevisionLabel(gameState)} />
        <Metric label="상태" value={notice || "정상"} />
      </div>
      <div className="settings-body">
        <section className="settings-section">
          <h3>계정 / 저장</h3>
          <SettingRow icon={Users} label="계정 연동" description="게스트 · Google/Apple 연동 준비중" onClick={() => setNotice("계정 연동 준비중")} />
          <SettingRow icon={Database} label="클라우드 저장" description="기기 변경 대비 저장 동기화 자리" onClick={() => setNotice("클라우드 저장 준비중")} />
          <SettingRow icon={Smartphone} label="자동 저장" description="진행 상황을 로컬에 자동 저장" checked={settings.autosave} onClick={() => toggle("autosave")} />
          <SettingRow icon={RefreshCw} label="데이터 동기화" description="테이블 변경분을 현재 세이브에 반영" onClick={() => {
            onSetGameState((state) => ensureBattleState({ ...state, contentRevision: CONTENT_REVISION }));
            setNotice("동기화 완료");
          }} />
        </section>
        <section className="settings-section">
          <h3>알림</h3>
          <SettingRow icon={Bell} label="오프라인 보상 알림" description="보상 한도 근처에서 알림을 받을 예정" checked={settings.offlineAlerts} onClick={() => toggle("offlineAlerts")} />
          <SettingRow icon={ScrollText} label="시험 게이트 알림" description="수능과 주요 보스 전에 멈춤 안내" checked={settings.examAlerts} onClick={() => toggle("examAlerts")} />
        </section>
        <section className="settings-section">
          <h3>사운드 / 조작</h3>
          <SettingRow icon={Volume2} label="배경음" description="BGM 사용 여부" checked={settings.bgm} onClick={() => toggle("bgm")} />
          <SettingRow icon={Sparkles} label="효과음" description="공격과 보상 효과음 사용 여부" checked={settings.sfx} onClick={() => toggle("sfx")} />
          <SettingRow icon={Smartphone} label="진동" description="탭과 보스 등장 시 햅틱 사용" checked={settings.vibration} onClick={() => toggle("vibration")} />
        </section>
        <section className="settings-section">
          <h3>성능</h3>
          <SettingRow icon={SlidersHorizontal} label="절전 모드" description="자동 진행 중 화면 연출을 줄임" checked={settings.lowPower} onClick={() => toggle("lowPower")} />
          <SettingRow icon={Sparkles} label="이펙트 줄이기" description="피격 파편과 플래시 빈도를 줄임" checked={settings.reduceEffects} onClick={() => toggle("reduceEffects")} />
        </section>
        <section className="settings-section">
          <h3>지원</h3>
          <SettingRow icon={ScrollText} label="공지사항" description="운영 공지와 이벤트 배너 자리" onClick={() => setNotice("공지 준비중")} />
          <SettingRow icon={FileJson} label="도움말 / 약관" description="확률표, 이용약관, 개인정보 처리방침 자리" onClick={() => setNotice("문서 준비중")} />
        </section>
        <section className="settings-section danger-zone">
          <h3>위험 구역</h3>
          <SettingRow danger icon={Trash2} label="저장 초기화" description="현재 기기의 로컬 저장 데이터를 삭제" onClick={() => setConfirmReset(true)} />
        </section>
      </div>
      {confirmReset && (
        <div className="confirm-panel" role="alertdialog" aria-modal="true" aria-label="저장 초기화 확인">
          <div>
            <strong>정말 초기화할까?</strong>
            <p>현재 회차, 돈, 장비, 도감 기록이 이 기기에서 삭제돼. 이 작업은 되돌릴 수 없어.</p>
          </div>
          <div className="confirm-actions">
            <button className="secondary-action compact" type="button" onClick={() => setConfirmReset(false)}>
              <X size={17} />
              <span>취소</span>
            </button>
            <button className="primary-action compact danger" type="button" onClick={onResetGame}>
              <Trash2 size={17} />
              <span>초기화</span>
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function ActivePanel({ activeTab, gameState, onAcceptCareer, onBattleComplete, onEducationUpgrade, onEquipEquipment, onFuseEquipment, onRetake, saveError, saveSource, summary }) {
  if (activeTab === "growth") return <GrowthPanel saveError={saveError} saveSource={saveSource} summary={summary} />;
  if (activeTab === "exam") return <ExamPanel gameState={gameState} onBattleComplete={onBattleComplete} summary={summary} />;
  if (activeTab === "equipment") return <EquipmentPanel gameState={gameState} onEquipEquipment={onEquipEquipment} onFuseEquipment={onFuseEquipment} />;
  if (activeTab === "work") return <WorkPanel gameState={gameState} />;
  if (activeTab === "education") return <EducationPanel gameState={gameState} onEducationUpgrade={onEducationUpgrade} summary={summary} />;
  if (activeTab === "result") return <ResultPanel gameState={gameState} onAcceptCareer={onAcceptCareer} onRetake={onRetake} />;
  if (activeTab === "archive") return <ArchivePanel gameState={gameState} />;
  assert(false, `지원하지 않는 탭입니다: ${activeTab}`);
  return null;
}

function LoadFailureScreen({ loadResult }) {
  const [notice, setNotice] = useState("");

  const handleReset = () => {
    try {
      saveGameState(createDefaultGameState());
      globalThis.location?.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app-shell">
      <main className="load-failure" role="alert">
        <section>
          <Database size={28} />
          <p>저장 데이터 오류</p>
          <h1>세이브를 불러올 수 없습니다</h1>
          <strong>{loadResult.error}</strong>
          <span>source: {loadResult.source}</span>
          <button className="primary-action compact" type="button" onClick={handleReset}>
            <RefreshCcw size={18} />
            <span>새 게임으로 다시 시작</span>
          </button>
          {notice && <small>{notice}</small>}
        </section>
      </main>
    </div>
  );
}

function RenderGuardScreen({ error }) {
  const [notice, setNotice] = useState("");
  const message = error instanceof Error ? error.message : String(error);

  const handleReset = () => {
    try {
      saveGameState(createDefaultGameState());
      globalThis.location?.reload();
    } catch (resetError) {
      setNotice(resetError instanceof Error ? resetError.message : String(resetError));
    }
  };

  return (
    <div className="app-shell">
      <main className="load-failure render-guard" role="alert">
        <section>
          <Database size={28} />
          <p>렌더링 오류</p>
          <h1>화면을 그리는 중 문제가 발생했습니다</h1>
          <strong>{message}</strong>
          <span>브라우저 콘솔에 상세 스택을 남겼습니다.</span>
          <button className="primary-action compact" type="button" onClick={handleReset}>
            <RefreshCcw size={18} />
            <span>새 게임으로 다시 시작</span>
          </button>
          {notice && <small>{notice}</small>}
        </section>
      </main>
    </div>
  );
}

class RenderGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[Student render error]", error, info);
  }

  render() {
    if (this.state.error) return <RenderGuardScreen error={this.state.error} />;
    return this.props.children;
  }
}

function GameApp({ loaded }) {
  const [gameState, setGameState] = useState(() => ensureBattleState(loaded.state));
  const [saveError] = useState(loaded.error);
  const [saveSource] = useState(loaded.source);
  const [mode, setMode] = useState("student");
  const [studentTab, setStudentTab] = useState("growth");
  const [expeditionTab, setExpeditionTab] = useState("growth");
  const [realEstateViewMode, setRealEstateViewMode] = useState("overview");
  const [selectedRealEstateId, setSelectedRealEstateId] = useState("");
  const [realEstateNotice, setRealEstateNotice] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [dismissedExpeditionRewardAt, setDismissedExpeditionRewardAt] = useState(0);
  const [expeditionRewardModalOpen, setExpeditionRewardModalOpen] = useState(false);
  const [expeditionRewardToast, setExpeditionRewardToast] = useState(null);
  const expeditionCombatReadyRef = useRef(true);
  const [settings, setSettings] = useState({
    autosave: true,
    offlineAlerts: true,
    examAlerts: true,
    bgm: true,
    sfx: true,
    vibration: true,
    lowPower: false,
    reduceEffects: false,
  });
  const summary = summarizeGameState(gameState);
  const expeditionSummary = createExpeditionSummary(gameState);
  const realEstateSummary = createRealEstateViewModel(gameState);
  const gradeVisual = resolveGradeVisual(gameState.current);
  getStudentFrameUrls(gradeVisual, gameState.current.avatarGender);
  const battle = gameState.current.battle;
  assert(battle, "current.battle 데이터가 없습니다.");
  const showDebugTools = useMemo(() => qaToolsEnabled(), []);
  const pauseAutoBattle = useMemo(() => autoBattlePausedForQa(), []);
  const expeditionPendingReward = gameState.expedition.pendingReward;
  const hasExpeditionPendingReward = expeditionPendingReward && (
    Number(expeditionPendingReward.trainingExp) > 0 ||
    Number(expeditionPendingReward.money) > 0 ||
    Number(expeditionPendingReward.diamonds) > 0 ||
    Number(expeditionPendingReward.realEstateCash) > 0
  );

  const showExpeditionRewardToast = (text) => {
    if (!text) return;
    setExpeditionRewardToast({ id: Date.now(), text });
  };

  const handleExpeditionCombatReadyChange = useCallback((ready) => {
    expeditionCombatReadyRef.current = Boolean(ready);
  }, []);

  useEffect(() => {
    if (!saveError) saveGameState(gameState);
  }, [gameState, saveError]);

  useEffect(() => {
    if (!expeditionRewardToast) return undefined;
    const timer = window.setTimeout(() => setExpeditionRewardToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [expeditionRewardToast]);

  useEffect(() => {
    if (pauseAutoBattle) return undefined;
    if (gameState.current.awaitingDecision) return undefined;
    const tickMs = finiteNumber(studentAutoTickMs, "학생 자동 전투 tick 값이 올바르지 않습니다.");
    const timer = window.setInterval(() => {
      setGameState((state) => (state.current.awaitingDecision ? state : advanceBattleByMs(state, tickMs)));
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [gameState.current.awaitingDecision, pauseAutoBattle]);

  useEffect(() => {
    const tickMs = finiteNumber(realEstateAutoTickMs, "부동산 자동 정산 tick 값이 올바르지 않습니다.");
    const timer = window.setInterval(() => {
      setGameState((state) => {
        const owned = Object.keys(state.realEstate.properties).length > 0;
        return owned ? accrueRealEstateIncome(state) : state;
      });
    }, tickMs);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    // 직장 수입 적립(항상 작동: 결과 화면·일시정지 중에도 졸업생 수입이 money에 누적).
    const timer = window.setInterval(() => {
      setGameState((state) => accrueWorkIncome(state, Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pauseAutoBattle) return undefined;
    const tickMs = finiteNumber(expeditionAutoTickMs, "원정대 자동 정산 tick 값이 올바르지 않습니다.");
    setGameState((state) => resolveExpeditionAutoCombat(state, Date.now(), { rewardDelivery: "pending" }));
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      setGameState((state) => resolveExpeditionAutoCombat(state, Date.now(), { rewardDelivery: "pending" }));
    };
    document.addEventListener("visibilitychange", handleVisible);
    const timer = window.setInterval(() => {
      if (!expeditionVisualReadyForAutoCombat()) return;
      let toastText = "";
      setGameState((state) => {
        if (!expeditionVisualReadyForAutoCombat()) return state;
        const previousBattleId = state.expedition.pendingReward?.lastBattle?.id || "";
        const next = resolveExpeditionAutoCombat(state, Date.now(), { rewardDelivery: "instant", maxBattles: 1 });
        const nextBattleId = next.expedition.pendingReward?.lastBattle?.id || "";
        if (nextBattleId && nextBattleId !== previousBattleId) expeditionCombatReadyRef.current = false;
        toastText = expeditionRewardToastText(state, next);
        return next;
      });
      showExpeditionRewardToast(toastText);
    }, tickMs);
    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.clearInterval(timer);
    };
  }, [pauseAutoBattle]);

  const handleModeChange = (nextMode) => {
    if (nextMode === "realEstate") {
      setRealEstateViewMode("overview");
      setSelectedRealEstateId("");
      setRealEstateNotice("");
    }
    setMode(nextMode);
  };

  const handleDebugComplete = () => {
    setGameState((state) => completeCurrentBattle(state));
  };

  const handleToggleAuto = () => {
    setGameState((state) => ({
      ...state,
      current: {
        ...state.current,
        autoAllocateStudy: state.current.autoAllocateStudy === false,
      },
    }));
  };

  const handleRetake = () => {
    setGameState((state) => startRetakeYear(state));
    setStudentTab("growth");
    setMode("student");
  };

  const handleAcceptCareer = (universityId, careerId) => {
    setGameState((state) => acceptCareerChoice(state, { universityId, careerId }));
    setMode("expedition");
    setExpeditionTab("growth");
  };

  const handleEquipEquipment = (equipmentId) => {
    setGameState((state) => equipEquipment(state, equipmentId));
  };

  const handleFuseEquipment = (equipmentId) => {
    setGameState((state) => fuseEquipment(state, equipmentId));
  };

  const handleExpeditionComplete = () => {
    if (!expeditionCombatReadyRef.current) return;
    expeditionCombatReadyRef.current = false;
    let toastText = "";
    setGameState((state) => {
      const next = completeExpeditionStage(state);
      toastText = expeditionRewardToastText(state, next);
      return next;
    });
    showExpeditionRewardToast(toastText);
  };

  const handleClaimExpeditionReward = () => {
    setGameState((state) => claimExpeditionPendingReward(state, "base"));
    setExpeditionRewardModalOpen(false);
    setDismissedExpeditionRewardAt(0);
  };

  const handleOpenExpeditionReward = () => {
    setExpeditionRewardModalOpen(true);
  };

  const handleExpeditionAssign = (memberId) => {
    setGameState((state) => {
      const next = assignExpeditionMember(state, memberId, state.expedition.partyMemberIds.length);
      if (state.expedition.partyMemberIds.length === 0 && next.expedition.partyMemberIds.length > 0) {
        return {
          ...next,
          realEstate: {
            ...next.realEstate,
            lastExpeditionFundAt: Date.now(),
          },
        };
      }
      return next;
    });
  };

  const handleExpeditionRemove = (memberId) => {
    setGameState((state) => {
      const next = removeExpeditionMemberFromParty(state, memberId);
      if (next.expedition.partyMemberIds.length === 0) {
        return {
          ...next,
          realEstate: {
            ...next.realEstate,
            lastExpeditionFundAt: Date.now(),
          },
        };
      }
      return next;
    });
  };

  const handleExpeditionRecommend = () => {
    setGameState((state) => assignRecommendedExpeditionParty(state));
  };

  const handleExpeditionReorder = (fromSlotIndex, toSlotIndex) => {
    setGameState((state) => reorderExpeditionPartyMembers(state, fromSlotIndex, toSlotIndex));
  };

  const handleExpeditionLevelUp = (memberId) => {
    setGameState((state) => levelUpExpeditionMember(state, memberId));
  };

  const handleExpeditionToggleLock = (memberId) => {
    setGameState((state) => toggleExpeditionMemberLock(state, memberId));
  };

  const handleExpeditionFuse = (careerId, promotionTier) => {
    setGameState((state) => fuseExpeditionMembers(state, careerId, promotionTier));
  };

  const handleStartExpeditionDispatch = (missionId, memberIds) => {
    setGameState((state) => startExpeditionDispatch(state, missionId, memberIds));
  };

  const handleClaimExpeditionDispatch = (assignmentId) => {
    setGameState((state) => claimExpeditionDispatch(state, assignmentId));
  };

  const handleEducationUpgrade = (actionId) => {
    setGameState((state) => upgradeEducation(state, actionId));
  };

  const handleRealEstateBuy = (propertyId, quantity) => {
    setGameState((state) => purchaseRealEstateProperty(state, propertyId, quantity));
  };

  const handleRealEstateBuyMax = (propertyId) => {
    setGameState((state) => purchaseMaxRealEstateProperty(state, propertyId));
  };

  const handleRealEstateClaimWeeklyReward = () => {
    setGameState((state) => claimRealEstateWeeklyReward(state));
  };

  const handleRealEstateDistrictClick = (card) => {
    if (!card.unlocked) {
      setRealEstateNotice(`${card.name}은 ${card.unlockHint}`);
      return;
    }
    setSelectedRealEstateId(card.id);
    setRealEstateViewMode("district");
    setRealEstateNotice("");
  };

  const handleRealEstateBackToOverview = () => {
    setRealEstateViewMode("overview");
    setSelectedRealEstateId("");
    setRealEstateNotice("");
  };

  const handleResetGame = () => {
    setGameState(ensureBattleState(createDefaultGameState()));
    setActiveModal(null);
    setMode("student");
    setStudentTab("growth");
    setExpeditionTab("growth");
    setRealEstateViewMode("overview");
    setSelectedRealEstateId("");
    setRealEstateNotice("");
  };

  return (
    <div className="app-shell">
      <div className={`phone-frame screen-${mode}`}>
        <Header
          onOpenDebug={() => setActiveModal("debug")}
          onOpenSettings={() => setActiveModal("settings")}
          onOpenShop={() => setActiveModal("shop")}
          debugAlert={saveSource === "localStorage"}
          expeditionSummary={expeditionSummary}
          mode={mode}
          realEstateSummary={realEstateSummary}
          summary={summary}
        />
        <StatusGrid expeditionSummary={expeditionSummary} mode={mode} realEstateSummary={realEstateSummary} summary={summary} />
        <ModeTabs mode={mode} onModeChange={handleModeChange} />
        {mode === "student" ? (
          <BattleArena
            awaitingDecision={Boolean(gameState.current.awaitingDecision)}
            battle={battle}
            gradeVisual={gradeVisual}
            onDebugComplete={handleDebugComplete}
            onToggleAuto={handleToggleAuto}
            showDebugTools={showDebugTools}
            summary={summary}
          />
        ) : mode === "expedition" ? (
          <ExpeditionScene
            gameState={gameState}
            onCombatReadyChange={handleExpeditionCombatReadyChange}
            onExpeditionComplete={handleExpeditionComplete}
            onOpenPendingReward={handleOpenExpeditionReward}
            rewardToast={expeditionRewardToast}
          />
        ) : (
          <RealEstateScene
            notice={realEstateNotice}
            onBackToOverview={handleRealEstateBackToOverview}
            onDistrictClick={handleRealEstateDistrictClick}
            realEstateSummary={realEstateSummary}
            selectedPropertyId={selectedRealEstateId}
            viewMode={realEstateViewMode}
          />
        )}
        <section className="management-panel">
          {mode === "student" ? (
            <>
              <TabBar activeTab={studentTab} mode={mode} onTabChange={setStudentTab} />
          <ActivePanel
            activeTab={studentTab}
            gameState={gameState}
            onAcceptCareer={handleAcceptCareer}
            onBattleComplete={handleDebugComplete}
            onEducationUpgrade={handleEducationUpgrade}
            onEquipEquipment={handleEquipEquipment}
            onFuseEquipment={handleFuseEquipment}
            onRetake={handleRetake}
            saveError={saveError}
                saveSource={saveSource}
                summary={summary}
              />
            </>
          ) : mode === "expedition" ? (
            <ExpeditionManagementPanel
              activeTab={expeditionTab}
              gameState={gameState}
              onAssign={handleExpeditionAssign}
              onClaimDispatch={handleClaimExpeditionDispatch}
              onFuse={handleExpeditionFuse}
              onLevelUp={handleExpeditionLevelUp}
              onRecommend={handleExpeditionRecommend}
              onRemove={handleExpeditionRemove}
              onReorder={handleExpeditionReorder}
              onStartDispatch={handleStartExpeditionDispatch}
              onTabChange={setExpeditionTab}
              onToggleLock={handleExpeditionToggleLock}
            />
          ) : (
            <RealEstateManagementPanel
              realEstateSummary={realEstateSummary}
              selectedPropertyId={realEstateViewMode === "district" ? selectedRealEstateId : ""}
              onBuy={handleRealEstateBuy}
              onBuyMax={handleRealEstateBuyMax}
              onClaimWeeklyReward={handleRealEstateClaimWeeklyReward}
            />
          )}
        </section>
      </div>
      {activeModal === "shop" && <ShopModal gameState={gameState} onClose={() => setActiveModal(null)} onSetGameState={setGameState} />}
      {activeModal === "debug" && <DebugModal gameState={gameState} onClose={() => setActiveModal(null)} onSetGameState={setGameState} showDebugTools={showDebugTools} />}
      {activeModal === "settings" && (
        <SettingsModal
          gameState={gameState}
          onClose={() => setActiveModal(null)}
          onResetGame={handleResetGame}
          onSetGameState={setGameState}
          settings={settings}
          setSettings={setSettings}
        />
      )}
      {activeModal === null && hasExpeditionPendingReward && (expeditionRewardModalOpen || dismissedExpeditionRewardAt !== Number(expeditionPendingReward.updatedAt)) && (
        <ExpeditionRewardModal
          pendingReward={expeditionPendingReward}
          onClaim={handleClaimExpeditionReward}
          onClose={() => {
            setExpeditionRewardModalOpen(false);
            setDismissedExpeditionRewardAt(Number(expeditionPendingReward.updatedAt));
          }}
        />
      )}
    </div>
  );
}

export function App() {
  const loaded = useMemo(() => loadGameState(), []);
  if (loaded.fatal) return <LoadFailureScreen loadResult={loaded} />;
  return (
    <RenderGuard>
      <GameApp loaded={loaded} />
    </RenderGuard>
  );
}
