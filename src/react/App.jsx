import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
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
import { getCareerPortraitUrl, getCompanionFrameUrls, getExpeditionEnemyFrameUrls, getHelperFrameUrls, getStudentFrameUrls } from "./game/assets.js";
import {
  addDiamonds,
  callRobotHelperProduct,
  companionCareer,
  companionGender,
  exchangeMoneyProduct,
  helperDisplayName,
  helperPower,
  helperSellValue,
  isRobotHelper,
  rarityCopy,
  rarityLabels,
  rarityTiers,
  shopCategories,
  shopProducts,
} from "./game/companions.js";
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
  assignExpeditionMember,
  completeExpeditionStage,
  createExpeditionManagementViewModel,
  createExpeditionSummary,
  createExpeditionViewModel,
  fuseExpeditionMembers,
  levelUpExpeditionMember,
  removeExpeditionMemberFromParty,
  toggleExpeditionMemberLock,
} from "./game/expedition.js";

import { CONTENT_REVISION, createDefaultGameState, loadGameState, normalizeGameState, saveGameState, summarizeGameState } from "./game/save.js";
import { resolveGradeVisual } from "./game/grades.js";
import elementaryBackdrop from "../snapshot/assets/visual-battle-road-backdrop-elementary.png";
import highBackdrop from "../snapshot/assets/visual-battle-road-backdrop-high.png";
import middleBackdrop from "../snapshot/assets/visual-battle-road-backdrop-middle.png";
import repeaterBackdrop from "../snapshot/assets/visual-battle-road-backdrop-repeater.png";
import studentAtlas from "../snapshot/assets/asset-002.png";
import mainMonsterAtlas from "../snapshot/assets/asset-003.png";

const LOCKED_CAREER_LABEL = "\u003f\u003f\u003f";

function requireConfig(condition, message) {
  if (!condition) throw new Error(message);
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
  { id: "companion", label: "동료", icon: Users },
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
  study: "학습",
  work: "근무",
};
const shopCategoryIcons = {
  diamond: Gem,
  money: Coins,
  robot_gacha: Bot,
  remove_ads: ShieldCheck,
  package: Package,
  pass: CalendarDays,
};
const productIcons = {
  gem: Gem,
  bot: Bot,
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
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 10_000) return `${(number / 1_000).toFixed(1)}K`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return formatMoney(Math.round(number));
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

function Header({ debugAlert, expeditionSummary, mode, onOpenDebug, onOpenSettings, onOpenShop, summary }) {
  const titleRef = useRef(null);
  const titleLabel = mode === "expedition" ? "원정대" : "학생 방치 RPG";
  const prefixLabel = mode === "expedition" ? expeditionSummary.headerPrefix : `${summary.runNumber}회차 · ${summary.courseBand}`;

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

function StatusGrid({ expeditionSummary, mode, summary }) {
  const items =
    mode === "expedition"
      ? [
        ["Stage", String(expeditionSummary.stage)],
        ["파티", `${expeditionSummary.partyCount}/${expeditionSummary.partySize}`],
        ["전투력", `${formatCompactNumber(expeditionSummary.partyPower)}/${formatCompactNumber(expeditionSummary.enemyPower)}`],
        ["보유 EXP", formatCompactNumber(expeditionSummary.trainingExp)],
        ["다이아", formatCompactNumber(expeditionSummary.diamonds)],
      ]
      : [
        ["과정", summary.courseLabel],
        ["나이", `${summary.age}세`],
        ["보유금", `${formatMoney(summary.money)}원`],
        ["다이아", formatCompactNumber(summary.diamonds)],
        ["공부량", formatMoney(summary.unspentStudyPoints)],
      ];

  return (
    <section className="status-grid" aria-label={mode === "expedition" ? "원정대 현재 상태" : "플레이어 상태"}>
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
      <span className="swipe-copy">좌우 스와이프</span>
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

function LearningHelperLineup({ helpers }) {
  assert(Array.isArray(helpers), "학습 도우미 목록 데이터가 배열이 아닙니다.");
  const visibleHelpers = helpers.slice(0, 3);
  if (visibleHelpers.length === 0) return null;

  return (
    <div className="learning-helper-lineup" aria-label="학습 도우미 편대">
      {visibleHelpers.map((helper, index) => {
        const tier = rarityTiers[helper.rarity];
        assert(tier, `지원하지 않는 학습 도우미 rarity입니다: ${helper.id} / ${helper.rarity}`);
        assert(helper.spriteAsset, `학습 도우미 spriteAsset이 없습니다: ${helper.id}`);
        return (
          <div
            className={`learning-helper-unit helper-slot-${index + 1} rarity-${helper.rarity}`}
            key={helper.id}
            style={{ "--helper-color": tier.color }}
            title={`${helperDisplayName(helper)} · 전투력 +${helperPower(helper)}`}
          >
            <SpriteFrames className="learning-helper-frame" frames={getHelperFrameUrls(helper.spriteAsset, companionGender(helper))} />
            <span>{helper.rarity}</span>
          </div>
        );
      })}
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
        <LearningHelperLineup helpers={summary.activeHelpers} />
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

function ExpeditionScene({ gameState, onExpeditionComplete }) {
  const expedition = createExpeditionViewModel(gameState);
  const stage = expedition.stage;
  const enemyFrames = getExpeditionEnemyFrameUrls(stage.enemyAsset);
  assert(Array.isArray(stage.normalEnemyNames) && stage.normalEnemyNames.length > 0, `원정대 stage normalEnemyNames 누락: ${stage.id}`);
  assert(Number.isFinite(Number(stage.enemyVariant)), `원정대 stage enemyVariant 누락: ${stage.id}`);
  const enemyNames = stage.normalEnemyNames.slice(0, stage.enemyCount);
  const powerPercent = Math.max(0, Math.min(100, Math.round((expedition.partyPower / Math.max(1, expedition.enemyPower)) * 100)));
  const routeProgressPercent = Math.max(0, Math.min(100, (stage.stageInChapter / 1000) * 100));

  return (
    <section className={`expedition-scene chapter-${stage.chapter} backdrop-${stage.backdropClass}${stage.isBoss ? " boss" : ""}`} aria-label="원정대 전투장">
      <div className="expedition-arena">
        <div className="expedition-route-card">
          <div>
            <strong>CH.{stage.chapter} {stage.stageInChapter}/1000</strong>
            <span>{stage.chapterName} · {stage.segmentName}</span>
          </div>
          <div className="expedition-arena-rail" aria-hidden="true">
            <i style={{ width: `${routeProgressPercent}%` }} />
          </div>
          <em>{stage.isBoss ? "보스 게이트" : `다음 보스 ${stage.nextBossStageCount} Stage`}</em>
        </div>
        <div className={expedition.ready ? "expedition-party-visual running" : "expedition-party-visual empty"}>
          {expedition.ready ? (
            expedition.partyMembers.map((member) => (
              <div className={`expedition-unit-avatar large unit-${member.slot}`} key={member.id} title={`${member.careerName} · Lv.${member.level} · 전투력 ${formatMoney(member.power)}`}>
                <SpriteFrames className="expedition-unit-frame" frames={getCompanionFrameUrls(member.career, member.avatarGender)} />
              </div>
            ))
          ) : (
            <span className="expedition-empty-party">동료 없음</span>
          )}
        </div>
        <span className="expedition-impact" aria-hidden="true" />
        <div className="expedition-enemy-group" aria-label={stage.enemyName}>
          {enemyNames.map((name, index) => (
            <div className={`expedition-enemy-visual mob-${stage.enemyVariant} enemy-${index + 1}`} key={`${stage.id}-${name}`} title={name}>
              <SpriteFrames className="expedition-enemy-frame" frames={enemyFrames} />
              <span className="enemy-shadow" aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="expedition-scene-footer">
          <div className="expedition-scene-run">
            <span>전투력 {formatCompactNumber(expedition.partyPower)} / {formatCompactNumber(expedition.enemyPower)}</span>
            <i className="progress-bar">
              <span style={{ width: `${powerPercent}%` }} />
            </i>
          </div>
          <button className="expedition-action-button" disabled={!expedition.ready} type="button" onClick={onExpeditionComplete}>
            {expedition.ready ? "돌파" : "편성 필요"}
          </button>
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

function SummaryCards({ summary }) {
  return (
    <div className="panel accent-panel income-panel summary-grid">
      <Metric label="보유 공부량" value={formatMoney(summary.unspentStudyPoints)} />
      <Metric label="누적 공부량" value={formatMoney(summary.totalStudyPoints)} />
      <Metric label="처치한 책" value={formatMoney(summary.totalKills)} />
    </div>
  );
}

function BuffCards({ summary }) {
  return (
    <div className="panel helper-impact-panel buff-grid">
      <Metric label={`학습 도우미 ${summary.helperCount}/3`} value={`전투력 +${summary.helperPower}`} />
      <Metric label="교육 성장 배율" value={`x${summary.educationMultiplier.toFixed(2)}`} />
      <Metric label="다음 공부량" value={`+${summary.nextStudyGain}`} />
    </div>
  );
}

function InvestmentPanel({ summary }) {
  return (
    <section className="panel allocation-panel investment-panel" aria-label="자동 투자 비율">
      <header className="allocation-head">
        <div>
          <strong>자동 투자 비율</strong>
          <span>직접 설정</span>
        </div>
        <b>합계 {Object.values(summary.allocationWeights).reduce((sum, value) => sum + value, 0)}</b>
      </header>
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
    </section>
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
              <small>Lv.{subjectStat.level} · 학습 도우미 +{summary.helperPower} · 적성 {subjectStat.aptitude}</small>
            </div>
            <b>{subjectStat.stat}</b>
            <div className="stat-actions">
              {statButtons.map((button) => (
                <button disabled={button.cost <= 0 || summary.unspentStudyPoints < button.cost} type="button" key={button.label}>
                  <span>{button.label}</span>
                  <small>비용 {formatCompactNumber(button.cost)}</small>
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
              <p>수능 결과</p>
              <strong>{formatMoney(outcome.suneungRank)}등 · {Math.round(outcome.suneungScore)}점</strong>
            </div>
            <Medal size={24} />
          </div>
          <div className="result-row">
            <span>최상위 합격</span>
            <strong>#{admission.gameRank} {admission.name}</strong>
          </div>
          <div className="decision-careers">
            <header className="section-title compact-title">
              <div>
                <BriefcaseBusiness size={17} />
                <h2>직업 선택</h2>
              </div>
              <span className="count-badge">{outcome.careerSelectableCount}개 가능</span>
            </header>
            <div className="career-choice-list career-choice-ranked">
              {outcome.careerCandidates.map((candidate) => {
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
                      <small>{candidate.choiceBand} · Tier {candidate.tier} · 요구 {candidate.minPrestige} · {formatMoney(candidate.incomePerMinute)}원/분</small>
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

function CompanionPanel({ gameState }) {
  const companions = gameState.companions;
  const expeditionPartyCount = gameState.expedition.partyMemberIds.length;
  if (companions.length === 0) {
    return (
      <main className="companion-panel">
        <header className="section-title">
          <div>
            <Users size={25} />
            <h2>동료</h2>
          </div>
          <span>0명</span>
        </header>
      </main>
    );
  }

  return (
    <main className="companion-panel">
      <header className="section-title">
        <div>
          <Users size={25} />
          <h2>동료</h2>
        </div>
        <span>{expeditionPartyCount}/5 편성</span>
      </header>
      <div className="companion-list">
        {companions.map((companion) => {
          if (isRobotHelper(companion)) {
            assert(companion.spriteAsset, `로봇 도우미 spriteAsset이 비어 있습니다: ${companion.id}`);
            const tier = rarityTiers[companion.rarity];
            assert(tier, `지원하지 않는 로봇 도우미 rarity입니다: ${companion.id} / ${companion.rarity}`);
            const frames = getHelperFrameUrls(companion.spriteAsset, companionGender(companion));
            return (
              <article className="companion-card robot-companion" key={companion.id} style={{ "--rarity-main": tier.color }}>
                <span className="robot-helper-portrait" aria-hidden="true">
                  <SpriteFrames className="robot-helper-frame" frames={frames} />
                </span>
                <div>
                  <strong>{helperDisplayName(companion)}</strong>
                  <small>학생 학습 도우미 · 전투력 +{helperPower(companion)}</small>
                </div>
                <b>{companion.rarity}</b>
              </article>
            );
          }

          const career = companionCareer(companion);
          assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${companion.careerId}`);
          assert(Number.isFinite(Number(companion.powerMultiplier)), `동료 powerMultiplier가 없습니다: ${companion.id}`);
          const portrait = getCareerPortraitUrl(career, companion.avatarGender);
          return (
            <article className="companion-card" key={companion.id}>
                <span className="career-choice-aura career-portrait" style={{ backgroundColor: career.auraColor, backgroundImage: `url(${portrait})` }} />
                <div>
                  <strong>{companion.name}</strong>
                  <small>{companion.sourceUniversity} · 전투 x{Number(companion.powerMultiplier).toFixed(2)}</small>
                </div>
              <b>#{companion.careerRank}</b>
            </article>
          );
        })}
      </div>
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
    { id: "manage", label: `동료 관리${management.fusionCandidates.length > 0 ? ` ${management.fusionCandidates.length}` : ""}`, icon: Medal },
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
      <p>{text}</p>
    </article>
  );
}

function ExpeditionGrowthPanel({ management, onLevelUp }) {
  return (
    <section className="expedition-growth-panel">
      <header className="section-title compact-title">
        <div>
          <Sparkles size={18} />
          <h2>출전 동료 성장 {management.upgradeableCount}명 투자 가능</h2>
        </div>
        <span>보유 EXP {formatCompactNumber(management.trainingExp)}</span>
      </header>
      {management.growthMembers.length === 0 ? (
        <ExpeditionEmpty icon={Users} title="출전 중인 동료가 없습니다." text="파티 탭에서 성장시킬 동료를 먼저 편성해 주세요." />
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
                    <span>Lv.{member.level} → {member.level + 1} · 전투력 +{formatCompactNumber(powerGain)}</span>
                  </div>
                  <div className="expedition-exp-bar" aria-label={`${member.careerName} 경험치`}>
                    <i style={{ width: `${expPercent}%` }} />
                  </div>
                  <small>보유 {formatCompactNumber(management.trainingExp)} · 사용 후 {formatCompactNumber(Math.max(0, management.trainingExp - member.levelCost))}</small>
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

function ExpeditionPartyPanel({ management, onAssign, onRemove }) {
  const partyFull = management.party.length >= management.partySize;
  return (
    <section className="expedition-party-panel">
      <header className="section-title compact-title">
        <div>
          <Users size={18} />
          <h2>원정 파티 {management.party.length}/{management.partySize}</h2>
        </div>
      </header>
      <div className="expedition-party-slots">
        {management.partySlots.map((member, index) => (
          <article className={member ? "expedition-party-slot filled" : "expedition-party-slot"} key={`slot-${index}`}>
            <b>{index + 1}</b>
            {member ? (
              <>
                <ExpeditionMemberPortrait member={member} size="medium" />
                <strong>{member.careerName}</strong>
                <span>{member.tierName} · Lv.{member.level}</span>
                <button className="icon-button dark" type="button" title="파티 해제" onClick={() => onRemove(member.id)}>
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <strong>빈 슬롯</strong>
                <span>동료 편성 가능</span>
              </>
            )}
          </article>
        ))}
      </div>
      <div className="expedition-party-roster">
        <header className="section-title compact-title">
          <div>
            <Medal size={18} />
            <h2>편성 후보 {management.members.length}명</h2>
          </div>
        </header>
        {management.members.length === 0 ? (
          <ExpeditionEmpty icon={Medal} title="아직 원정대원이 없습니다." text="디버그 메뉴에서 동료를 추가하거나 수능 결과로 원정대원을 획득해 주세요." />
        ) : (
          <div className="expedition-roster-list">
            {management.members.map((member) => {
              const inParty = management.partyIds.has(member.id);
              return (
                <article className={inParty ? "expedition-roster-card expedition-member-card active in-party" : "expedition-roster-card expedition-member-card"} key={member.id}>
                  <ExpeditionMemberPortrait member={member} />
                  <div className="expedition-member-main">
                    <strong>{member.careerName}</strong>
                    <span>{member.tierName} Lv.{member.level} · {member.battleProp}</span>
                  </div>
                  <div className="expedition-card-meta">
                    <small>전투력 {formatCompactNumber(member.power)}</small>
                    <small>강점 {member.topSubjectShortLabels.join("/")}</small>
                  </div>
                  <button className="secondary-action compact" type="button" disabled={inParty || partyFull} onClick={() => onAssign(member.id)}>
                    <span>{inParty ? "편성중" : partyFull ? "가득 참" : "편성"}</span>
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
  return (
    <section className="expedition-manage-panel">
      <header className="section-title compact-title">
        <div>
          <Medal size={18} />
          <h2>동료 관리</h2>
        </div>
      </header>
      {management.members.length === 0 ? (
        <ExpeditionEmpty icon={Medal} title="관리할 동료가 없습니다." text="파티 후보가 생기면 이곳에서 합성과 잠금 관리를 진행합니다." />
      ) : (
        <div className="expedition-manage-stack">
          {management.fusionCandidates.length === 0 ? (
            <article className="expedition-empty compact">
              <Medal size={24} />
              <strong>합성 가능한 동료가 없습니다.</strong>
              <p>같은 직업과 같은 직급 동료 2명이 필요합니다.</p>
            </article>
          ) : (
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
            {management.members.map((member) => {
              const inParty = management.partyIds.has(member.id);
              return (
                <article className={member.locked ? "expedition-manage-card expedition-manage-member locked" : "expedition-manage-card expedition-manage-member"} key={member.id}>
                  <ExpeditionMemberPortrait member={member} />
                  <div className="expedition-member-main">
                    <strong>{member.careerName}</strong>
                    <span>{member.tierName} Lv.{member.level} · {member.battleProp}</span>
                  </div>
                  <small className={inParty ? "expedition-manage-status party" : member.locked ? "expedition-manage-status locked" : "expedition-manage-status available"}>
                    {inParty ? "출전중" : member.locked ? "잠금" : "합성 가능"}
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

function ExpeditionLogPanel({ management }) {
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
    </section>
  );
}

function ExpeditionManagementPanel({ activeTab, gameState, onAssign, onFuse, onLevelUp, onRemove, onTabChange, onToggleLock }) {
  const management = createExpeditionManagementViewModel(gameState);
  return (
    <>
      <ExpeditionTabBar activeTab={activeTab} management={management} onTabChange={onTabChange} />
      <section className="expedition-viewport">
        {activeTab === "growth" && <ExpeditionGrowthPanel management={management} onLevelUp={onLevelUp} />}
        {activeTab === "party" && <ExpeditionPartyPanel management={management} onAssign={onAssign} onRemove={onRemove} />}
        {activeTab === "manage" && <ExpeditionManagePanel management={management} onFuse={onFuse} onToggleLock={onToggleLock} />}
        {activeTab === "log" && <ExpeditionLogPanel management={management} />}
      </section>
    </>
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
  const companions = gameState.companions;
  const careerCompanions = companions.filter((companion) => companionCareer(companion));
  const workSlots = finiteNumber(gameState.workSlots, "workSlots 값이 올바르지 않습니다.");
  assert(workSlots > 0, `workSlots 값은 1 이상이어야 합니다: ${workSlots}`);
  const totalIncome = careerCompanions.reduce((sum, companion) => {
    const income = finiteNumber(companion.incomePerMinute, `동료 incomePerMinute 값이 올바르지 않습니다: ${companion.id}`);
    return sum + income;
  }, 0);
  const averagePower =
    careerCompanions.length > 0
      ? careerCompanions.reduce((sum, companion) => {
        const powerMultiplier = finiteNumber(companion.powerMultiplier, `동료 powerMultiplier 값이 올바르지 않습니다: ${companion.id}`);
        return sum + powerMultiplier;
      }, 0) / careerCompanions.length
      : 1;

  if (careerCompanions.length === 0) {
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
            <span>분당 수입</span>
            <strong>{formatMoney(totalIncome)}원</strong>
          </div>
          <div className="metric">
            <span>직장 슬롯</span>
            <strong>0/{workSlots}</strong>
          </div>
          <div className="metric">
            <span>오프라인 한도</span>
            <strong>12시간</strong>
          </div>
        </section>
        <button className="secondary-action work-income-card work-slot-expand-button" type="button" disabled>
          <BriefcaseBusiness size={18} />
          <span>슬롯 확장 · 1.8만원</span>
        </button>
        <div className="list work-empty-list">
          <p className="empty-state">근무 중 동료 없음</p>
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
        <span>{careerCompanions.length}/{workSlots}</span>
      </header>
      <section className="record-summary-grid work-summary-grid" aria-label="직장 요약">
        <article>
          <span>등록 동료</span>
          <strong>{careerCompanions.length}명</strong>
        </article>
        <article>
          <span>분당 수입</span>
          <strong>{formatMoney(totalIncome)}원</strong>
        </article>
        <article>
          <span>평균 전투</span>
          <strong>x{averagePower.toFixed(2)}</strong>
        </article>
      </section>
      <article className="record-card work-income-card">
        <header>
          <div>
            <strong>동료 직업 수입</strong>
            <small>슬롯 {workSlots}개 · 직업 동료 {careerCompanions.length}명</small>
          </div>
          <b>{formatMoney(totalIncome)}원/분</b>
        </header>
      </article>
      {careerCompanions.length > 0 ? (
        <section className="record-list work-companion-list" aria-label="직장 동료 목록">
          {careerCompanions.map((companion) => {
            const career = companionCareer(companion);
            assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${companion.careerId}`);
            const statusLabel = companionStatusLabels[companion.status];
            assert(statusLabel, `지원하지 않는 동료 상태입니다: ${companion.id} / ${companion.status}`);
            assert(companion.careerName, `동료 careerName이 없습니다: ${companion.id}`);
            assert(companion.sourceUniversity, `동료 sourceUniversity가 없습니다: ${companion.id}`);
            assert(Number.isFinite(Number(companion.powerMultiplier)), `동료 powerMultiplier가 없습니다: ${companion.id}`);
            assert(Number.isFinite(Number(companion.careerRank)), `동료 careerRank가 없습니다: ${companion.id}`);
            return (
              <article className="record-card work-companion-card" key={companion.id}>
                <header>
                  <div>
                    <strong>{companion.careerName}</strong>
                    <small>{companion.sourceUniversity} · {statusLabel}</small>
                  </div>
                  <b>{formatMoney(companion.incomePerMinute)}원/분</b>
                </header>
                <dl className="record-stats">
                  <div>
                    <dt>전투</dt>
                    <dd>x{Number(companion.powerMultiplier).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>순위</dt>
                    <dd>#{companion.careerRank}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      ) : (
        <article className="record-empty">
          <strong>직장 동료 없음</strong>
          <span>직업을 수락해 동료를 등록하면 직장 수입이 계산됩니다.</span>
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

function careerWeightGuide(career) {
  return careerSubjectWeights(career).map(({ subject, value }) => {
    return `${subject.label} ${value.toFixed(2)}`;
  }).join(" ");
}

function ArchiveGuideIcon({ size = 15 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sliders-horizontal" aria-hidden="true">
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}

function ArchivePanel({ gameState }) {
  const histories = gameState.history;
  const archive = gameState.archive;
  const discoveredCareerIds = new Set();
  const retiredCareerIds = new Set();
  for (const companion of gameState.companions) {
    if (companion.careerId) discoveredCareerIds.add(companion.careerId);
  }
  for (const history of histories) {
    if (history.careerId) discoveredCareerIds.add(history.careerId);
  }
  for (const entry of archive) {
    if (entry.careerId) {
      discoveredCareerIds.add(entry.careerId);
      retiredCareerIds.add(entry.careerId);
    }
  }
  const orderedCareers = careers.slice().sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`));
  const discoveredCareers = orderedCareers.filter((career) => discoveredCareerIds.has(career.id));
  const effectTotals = Object.fromEntries(careerCollectionData.collectionEffects.map((effect) => [effect.id, 0]));
  for (const careerId of retiredCareerIds) {
    const effectLink = careerEffectByCareerId.get(careerId);
    assert(effectLink, `career_collection_effects.json에서 직업 효과를 찾을 수 없습니다: ${careerId}`);
    effectTotals[effectLink.effectId] += finiteNumber(effectLink.value, `도감 효과 값이 올바르지 않습니다: ${careerId}`);
  }

  return (
    <main className="records-panel archive-panel">
      <div className="section-title">
        <div>
          <Medal size={25} />
          <h2>직업 도감</h2>
        </div>
        <span>{discoveredCareerIds.size}/{careers.length}</span>
      </div>
      <div className="panel accent-panel income-panel archive-summary-grid" aria-label="도감 요약">
        <div className="metric">
          <span>발견 직업</span>
          <strong>{discoveredCareerIds.size}개</strong>
        </div>
        <div className="metric">
          <span>은퇴 도감</span>
          <strong>{retiredCareerIds.size}개</strong>
        </div>
        <div className="metric">
          <span>은퇴 보관</span>
          <strong>{archive.length}명</strong>
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
      {discoveredCareers.length > 0 && (
        <section className="archive-career-grid" aria-label="발견 직업 요약">
          {discoveredCareers.map((career) => (
            <article className="archive-career-card" key={career.id} style={{ "--career-aura": career.auraColor }}>
              <strong>{career.name}</strong>
              <span>{career.choiceBand} · Tier {career.tier} · #{career.choiceRank}</span>
              <span>{trackLabel(career.preferredTrack)} · {career.supportRole}</span>
            </article>
          ))}
        </section>
      )}
      <div className="panel collection-bonus-panel">
        <header>
          <strong>은퇴 도감 효과</strong>
          <small>{careerCollectionData.collectionEffects.length}종 관리</small>
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
          const discovered = discoveredCareerIds.has(career.id);
          const retired = retiredCareerIds.has(career.id);
          const { effect, value } = careerCollectionEffectInfo(career);
          const weights = careerSubjectWeights(career);
          const maxWeight = Math.max(1, ...weights.map((item) => item.value));
          return (
            <article className={discovered ? "career-card discovered" : "career-card locked"} key={career.id}>
              <header>
                <span className={`career-emblem career-portrait career-${career.id}`} style={careerAtlasStyle(career, "male")} aria-hidden="true" />
                <div>
                  <strong>{discovered ? career.name : LOCKED_CAREER_LABEL}</strong>
                  <small>#{career.choiceRank} · Tier {career.tier} · {trackLabel(career.preferredTrack)} · 명성 {career.minPrestige}</small>
                </div>
                <b>{retired ? "은퇴" : "미은퇴"}</b>
              </header>
              <div className="career-meta">
                <span>{career.supportRole}</span>
                <span>{formatMoney(career.baseIncomePerMinute)}원/분</span>
                <span>{effect.shortName} {formatCollectionValue(effect, value)}</span>
              </div>
              <button className="career-guide-button" disabled type="button">
                <ArchiveGuideIcon size={15} />
                <span>분배 가이드</span>
              </button>
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
            <span>현재 과정</span>
            <strong>{summary.courseLabel}</strong>
          </article>
          <article>
            <span>적용 배율</span>
            <strong>x{currentMultiplier.toFixed(2)}</strong>
          </article>
          <article>
            <span>가능 교육</span>
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
                <small>생산 +{formatEducationCardEffect(currentEffect)} · 다음 +{formatEducationCardEffect(nextEffect)}</small>
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

function ProductActionLabel({ canUse, product }) {
  const actionIcons = {
    diamond: CreditCard,
    money: Coins,
    robot_gacha: Bot,
    remove_ads: CreditCard,
    package: CreditCard,
    pass: CreditCard,
  };
  const Icon = actionIcons[product.category];
  assert(Icon, `상점 상품 액션 아이콘 매핑 누락: ${product.id} / ${product.category}`);
  let label = "결제 준비중";
  if (product.enabled !== false && !canUse) label = "다이아 부족";
  if (product.category === "robot_gacha" && canUse) label = `호출 ${formatShopCost(product.diamondCost)}`;
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
    assert(Number.isFinite(rarityRank[rarity]), `로봇 호출 rarity 순위가 없습니다: ${rarity}`);
    return rarityRank[rarity];
  };
  const ordered = result.slice().sort((left, right) => rankForRarity(right.rarity) - rankForRarity(left.rarity));
  const best = ordered[0];
  const rarity = best.rarity;
  assert(rarityLabels[rarity], `지원하지 않는 로봇 호출 rarity입니다: ${rarity}`);
  const bestTier = rarityCopy[rarity];
  assert(bestTier, `로봇 호출 카피가 없습니다: ${rarity}`);
  assert(best.robotModel, `로봇 호출 결과 robotModel이 없습니다: ${best.id}`);
  const highCount = result.filter((helper) => rankForRarity(helper.rarity) >= rankForRarity("A")).length;

  return (
    <div className="gacha-popup-backdrop" role="dialog" aria-modal="true" aria-label="로봇 호출 결과">
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
          <div className={`gacha-robot big ${best.robotModel}`} aria-hidden="true">
            <span className="robot-eye" />
            <span className="robot-body" />
            <span className="robot-arm left" />
            <span className="robot-arm right" />
          </div>
        </div>
        <div className="gacha-popup-copy">
          <span className={`rarity-badge rarity-${rarity}`}>{rarity} {rarityLabels[rarity]}</span>
          <h3>{bestTier.title}</h3>
          <strong>{helperDisplayName(best)}</strong>
          <p>{bestTier.subtitle}</p>
        </div>
        <div className="gacha-popup-summary">
          <Metric label="호출 수" value={`${result.length}기`} />
          <Metric label="A 이상" value={`${highCount}기`} />
          <Metric label="최고 판매가" value={`${formatMoney(helperSellValue(best))}원`} />
        </div>
        <div className="gacha-popup-results" aria-label="획득 로봇 목록">
          {ordered.map((helper, index) => {
            const cardRarity = helper.rarity;
            assert(rarityLabels[cardRarity], `지원하지 않는 로봇 호출 결과 rarity입니다: ${helper.id} / ${cardRarity}`);
            return (
              <article className={helper.id === best.id ? `gacha-popup-card best rarity-${cardRarity}` : `gacha-popup-card rarity-${cardRarity}`} key={helper.id}>
                <b>{cardRarity}</b>
                <div>
                  <strong>{helperDisplayName(helper)}</strong>
                  <span>{rarityLabels[cardRarity]} · 판매 {formatMoney(helperSellValue(helper))}원</span>
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
  const robotCount = gameState.companions.filter(isRobotHelper).length;

  const handleProduct = (product) => {
    try {
      if (product.category === "robot_gacha") {
        const result = callRobotHelperProduct(gameState, product.id);
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
          <Metric label="로봇 도우미" value={`${robotCount}기`} />
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
            const commerceProduct = product.category === "robot_gacha" || product.category === "money";
            if (commerceProduct) {
              assert(Number.isFinite(Number(product.diamondCost)), `상점 상품 diamondCost 값이 없습니다: ${product.id}`);
            }
            const canUse = commerceProduct && product.enabled !== false && Number(gameState.diamonds) >= Number(product.diamondCost);
            const buttonClass = commerceProduct ? "primary-action compact" : "secondary-action compact";
            const disabled = commerceProduct ? !canUse : true;
            return (
              <article className={product.highlight ? "shop-product highlight" : "shop-product"} key={product.id}>
                <div className="shop-product-main">
                  <div className={product.robotHelper ? "shop-product-icon robot" : product.category === "money" ? "shop-product-icon money" : "shop-product-icon"}>
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

function DebugModal({ gameState, onClose, onSetGameState }) {
  const [jsonText, setJsonText] = useState("");
  const [notice, setNotice] = useState("");

  const handleAddCareerCompanions = (count) => {
    const result = addDebugExpeditionMembers(gameState, count);
    onSetGameState(result.state);
    setNotice(`동료 랜덤 +${result.added.length} 완료`);
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
      </div>
      <div className="debug-actions">
        <button className="secondary-action compact" type="button" onClick={() => {
          onSetGameState(addDiamonds(gameState, 10000));
          setNotice("다이아 추가 완료");
        }}>
          <Gem size={18} />
          <span>다이아 +10K</span>
        </button>
        <button className="secondary-action compact" type="button" onClick={() => handleAddCareerCompanions(1)}>
          <Shuffle size={18} />
          <span>동료 랜덤 +1</span>
        </button>
        <button className="secondary-action compact" type="button" onClick={() => handleAddCareerCompanions(5)}>
          <Users size={18} />
          <span>동료 랜덤 +5</span>
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
            <p>현재 회차, 돈, 동료, 도감 기록이 이 기기에서 삭제돼. 이 작업은 되돌릴 수 없어.</p>
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

function ActivePanel({ activeTab, gameState, onAcceptCareer, onBattleComplete, onEducationUpgrade, onRetake, saveError, saveSource, summary }) {
  if (activeTab === "growth") return <GrowthPanel saveError={saveError} saveSource={saveSource} summary={summary} />;
  if (activeTab === "exam") return <ExamPanel gameState={gameState} onBattleComplete={onBattleComplete} summary={summary} />;
  if (activeTab === "companion") return <CompanionPanel gameState={gameState} />;
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

function GameApp({ loaded }) {
  const [gameState, setGameState] = useState(() => ensureBattleState(loaded.state));
  const [saveError] = useState(loaded.error);
  const [saveSource] = useState(loaded.source);
  const [mode, setMode] = useState("student");
  const [studentTab, setStudentTab] = useState("growth");
  const [expeditionTab, setExpeditionTab] = useState("growth");
  const [activeModal, setActiveModal] = useState(null);
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
  const gradeVisual = resolveGradeVisual(gameState.current);
  getStudentFrameUrls(gradeVisual, gameState.current.avatarGender);
  const battle = gameState.current.battle;
  assert(battle, "current.battle 데이터가 없습니다.");
  const showDebugTools = useMemo(() => qaToolsEnabled(), []);
  const pauseAutoBattle = useMemo(() => autoBattlePausedForQa(), []);

  useEffect(() => {
    if (!saveError) saveGameState(gameState);
  }, [gameState, saveError]);

  useEffect(() => {
    if (pauseAutoBattle) return undefined;
    if (gameState.current.awaitingDecision) return undefined;
    const tickMs = finiteNumber(studentAutoTickMs, "학생 자동 전투 tick 값이 올바르지 않습니다.");
    const timer = window.setInterval(() => {
      setGameState((state) => (state.current.awaitingDecision ? state : advanceBattleByMs(state, tickMs)));
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [gameState.current.awaitingDecision, pauseAutoBattle]);

  const handleModeChange = (nextMode) => {
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

  const handleExpeditionComplete = () => {
    setGameState((state) => completeExpeditionStage(state));
  };

  const handleExpeditionAssign = (memberId) => {
    setGameState((state) => assignExpeditionMember(state, memberId, state.expedition.partyMemberIds.length));
  };

  const handleExpeditionRemove = (memberId) => {
    setGameState((state) => removeExpeditionMemberFromParty(state, memberId));
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

  const handleEducationUpgrade = (actionId) => {
    setGameState((state) => upgradeEducation(state, actionId));
  };

  const handleResetGame = () => {
    setGameState(ensureBattleState(createDefaultGameState()));
    setActiveModal(null);
    setMode("student");
    setStudentTab("growth");
    setExpeditionTab("growth");
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
          summary={summary}
        />
        <StatusGrid expeditionSummary={expeditionSummary} mode={mode} summary={summary} />
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
        ) : (
          <ExpeditionScene gameState={gameState} onExpeditionComplete={handleExpeditionComplete} />
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
            onRetake={handleRetake}
            saveError={saveError}
                saveSource={saveSource}
                summary={summary}
              />
            </>
          ) : (
            <ExpeditionManagementPanel
              activeTab={expeditionTab}
              gameState={gameState}
              onAssign={handleExpeditionAssign}
              onFuse={handleExpeditionFuse}
              onLevelUp={handleExpeditionLevelUp}
              onRemove={handleExpeditionRemove}
              onTabChange={setExpeditionTab}
              onToggleLock={handleExpeditionToggleLock}
            />
          )}
        </section>
      </div>
      {activeModal === "shop" && <ShopModal gameState={gameState} onClose={() => setActiveModal(null)} onSetGameState={setGameState} />}
      {activeModal === "debug" && <DebugModal gameState={gameState} onClose={() => setActiveModal(null)} onSetGameState={setGameState} />}
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
    </div>
  );
}

export function App() {
  const loaded = useMemo(() => loadGameState(), []);
  if (loaded.fatal) return <LoadFailureScreen loadResult={loaded} />;
  return <GameApp loaded={loaded} />;
}
