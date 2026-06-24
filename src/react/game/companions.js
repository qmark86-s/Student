import careers from "../../../data/careers.json";
import { registerExpeditionMembersFromCompanions } from "./expedition.js";

export const helperSpriteAssets = [
  "helper-book",
  "helper-bulb",
  "helper-chart",
  "helper-chip",
  "helper-files",
  "helper-flask",
  "helper-globe",
  "helper-judge",
  "helper-laptop",
  "helper-medic",
  "helper-mic",
  "helper-palette",
  "helper-teacher",
];

export const rarityLabels = {
  C: "일반",
  B: "고급",
  A: "희귀",
  S: "영웅",
  SS: "전설",
  SSS: "신화",
};

export const rarityCopy = {
  C: { title: "기본 회로 호출", subtitle: "안정적인 학습 보조 회로가 연결됐다." },
  B: { title: "고급 회로 반응", subtitle: "보조 모듈이 선명하게 깨어난다." },
  A: { title: "희귀 모듈 전개", subtitle: "학습 효율을 끌어올릴 특화 회로다." },
  S: { title: "영웅급 로봇 기동", subtitle: "상점 전체가 잠깐 조용해질 정도의 출력이다." },
  SS: { title: "전설 회로 개방", subtitle: "입시 전략을 바꿀 만한 고성능 로봇이 도착했다." },
  SSS: { title: "신화 회로 각성", subtitle: "확률표 바깥에서 번쩍이는 느낌의 최상위 호출이다." },
};

export const rarityTiers = {
  C: { label: "일반", powerBonus: 3, color: "#94a3b8", sellPrice: 2500 },
  B: { label: "고급", powerBonus: 6, color: "#22c55e", sellPrice: 7500 },
  A: { label: "희귀", powerBonus: 11, color: "#38bdf8", sellPrice: 25000 },
  S: { label: "영웅", powerBonus: 18, color: "#a855f7", sellPrice: 90000 },
  SS: { label: "전설", powerBonus: 28, color: "#facc15", sellPrice: 320000 },
  SSS: { label: "신화", powerBonus: 44, color: "#f97316", sellPrice: 1200000 },
};

export const shopCategories = [
  { id: "diamond", label: "다이아", icon: "gem" },
  { id: "money", label: "보유금", icon: "coins" },
  { id: "robot_gacha", label: "로봇", icon: "bot" },
  { id: "remove_ads", label: "광고", icon: "shield" },
  { id: "package", label: "패키지", icon: "package" },
  { id: "pass", label: "패스", icon: "calendar" },
];

export const shopProducts = [
  {
    id: "diamond_small",
    category: "diamond",
    name: "다이아 한 줌",
    subtitle: "첫 결제 감각을 확인하는 가장 작은 묶음",
    priceLabel: "1,100원",
    badge: "기본",
    icon: "gem",
    rewards: ["다이아 120개", "첫 구매 보너스 120개"],
    note: "프로토타입에서는 결제 연결 전 표시만 한다.",
    grantDiamonds: 240,
    enabled: false,
  },
  {
    id: "diamond_month_stack",
    category: "diamond",
    name: "모의고사 다이아 상자",
    subtitle: "중반 교육 업그레이드를 밀어주는 유료 재화 묶음",
    priceLabel: "11,000원",
    badge: "인기",
    icon: "gem",
    rewards: ["다이아 1,400개", "공부량 2시간 즉시권 3개"],
    note: "수치와 효율은 밸런스 확정 전까지 조정 대상이다.",
    grantDiamonds: 1400,
    highlight: true,
    enabled: false,
  },
  {
    id: "money_small",
    category: "money",
    name: "용돈 봉투",
    subtitle: "초반 교육 업그레이드 한두 단계를 바로 밀어주는 보유금",
    priceLabel: "다이아 80",
    badge: "보유금",
    icon: "coins",
    rewards: ["보유금 50K"],
    note: "작은 부족분을 메우는 교환 상품이다.",
    diamondCost: 80,
    grantMoney: 50000,
    enabled: true,
  },
  {
    id: "money_mid",
    category: "money",
    name: "학원비 상자",
    subtitle: "중반 교육 투자를 이어가기 위한 표준 보유금 묶음",
    priceLabel: "다이아 300",
    badge: "표준",
    icon: "coins",
    rewards: ["보유금 220K", "소형 대비 +17% 효율"],
    note: "로봇 판매 기대값보다 안정적인 보유금 교환이다.",
    diamondCost: 300,
    grantMoney: 220000,
    enabled: true,
    highlight: true,
  },
  {
    id: "money_large",
    category: "money",
    name: "장학금 금고",
    subtitle: "전학/특목고/과외 고레벨 투자를 위한 큰 보유금 묶음",
    priceLabel: "다이아 900",
    badge: "대용량",
    icon: "coins",
    rewards: ["보유금 780K", "표준 대비 +18% 효율"],
    note: "후반 교육 업그레이드 비용을 따라가기 위한 교환 후보.",
    diamondCost: 900,
    grantMoney: 780000,
    enabled: true,
  },
  {
    id: "robot_helper_single",
    category: "robot_gacha",
    name: "로봇 도우미 1회 호출",
    subtitle: "은퇴하지 않는 학습 보조 로봇을 뽑는 소환권",
    priceLabel: "다이아 300",
    badge: "로봇",
    icon: "bot",
    rewards: ["로봇 도우미 1기", "C~SSS 등급", "판매 시 보유금 회수"],
    note: "로봇은 사람 동료와 달리 나이/은퇴 규칙을 적용하지 않는다.",
    diamondCost: 300,
    drawCount: 1,
    enabled: true,
    robotHelper: true,
  },
  {
    id: "robot_helper_ten",
    category: "robot_gacha",
    name: "로봇 도우미 10+1회",
    subtitle: "장기 방치 세팅용 로봇 도우미 묶음 호출",
    priceLabel: "다이아 3,000",
    badge: "추천",
    icon: "bot",
    rewards: ["로봇 도우미 11기", "A 이상 1기 보정", "판매 시 보유금 회수"],
    note: "낮은 등급은 위로금, 높은 등급은 의미 있는 회수값을 갖는다.",
    diamondCost: 3000,
    drawCount: 11,
    guaranteedMinRarity: "A",
    enabled: true,
    robotHelper: true,
    highlight: true,
  },
  {
    id: "remove_ads_forever",
    category: "remove_ads",
    name: "광고 제거",
    subtitle: "보상형 광고 버튼을 즉시 수령형으로 바꾸는 영구 상품",
    priceLabel: "6,600원",
    badge: "영구",
    icon: "shield",
    rewards: ["광고 제거", "일일 광고 보상 즉시 수령", "오프라인 보상 +1시간"],
    note: "프로토타입에서는 광고 SDK 없이 메뉴 구조만 확인한다.",
    highlight: true,
    enabled: false,
  },
  {
    id: "starter_package",
    category: "package",
    name: "신학기 스타터 패키지",
    subtitle: "초반 교육 투자와 학습 도우미 슬롯 체험용",
    priceLabel: "4,400원",
    badge: "1회",
    icon: "package",
    rewards: ["다이아 500개", "공부량 1시간 즉시권 5개", "로봇 도우미 호출권 1개"],
    note: "회차 초반 이탈 구간을 줄이는 목적의 패키지다.",
    grantDiamonds: 500,
    enabled: false,
  },
  {
    id: "exam_package",
    category: "package",
    name: "시험기간 집중 패키지",
    subtitle: "3/6/9/12월 보스 전후로 쓰는 집중 성장 묶음",
    priceLabel: "15,000원",
    badge: "시험",
    icon: "scroll",
    rewards: ["다이아 1,800개", "시험 집중권 3개", "공부량 4시간 즉시권 2개"],
    note: "시험 게이트와 연동되는 기간 한정 상품 후보.",
    grantDiamonds: 1800,
    highlight: true,
    enabled: false,
  },
  {
    id: "weekly_pass",
    category: "pass",
    name: "주간 학습 패스",
    subtitle: "7일 동안 접속 보상과 방치 수입을 조금씩 올린다",
    priceLabel: "3,300원",
    badge: "7일",
    icon: "calendar",
    rewards: ["매일 다이아 80개", "오프라인 보상 +1시간", "직장 수입 +5%"],
    note: "가벼운 결제층을 위한 낮은 가격대 패스.",
    grantDiamonds: 560,
    enabled: false,
  },
  {
    id: "monthly_pass",
    category: "pass",
    name: "월간 장학 패스",
    subtitle: "30일 동안 다이아와 방치 보너스를 안정적으로 받는다",
    priceLabel: "9,900원",
    badge: "30일",
    icon: "calendar",
    rewards: ["즉시 다이아 600개", "매일 다이아 120개", "학습 효율 +8%"],
    note: "AFK류 월정액의 장기 잔존 보상 구조를 참고한 후보.",
    grantDiamonds: 4200,
    highlight: true,
    enabled: false,
  },
];

export const robotHelperCatalog = [
  { id: "bot_pencil_c", name: "HB-01 연필봇", modelName: "연필 정리형", rarity: "C", weight: 36, modelClass: "robot-pencil", auraColor: "#94a3b8", incomePerMinute: 5, sellPrice: 2500, stats: { korean: 90, english: 80, math: 95, social: 60, science: 70 }, spriteAsset: "helper-book" },
  { id: "bot_note_c", name: "NT-04 노트봇", modelName: "필기 정돈형", rarity: "C", weight: 28, modelClass: "robot-note", auraColor: "#7dd3fc", incomePerMinute: 5.5, sellPrice: 2500, stats: { korean: 105, english: 70, math: 80, social: 90, science: 75 }, spriteAsset: "helper-files" },
  { id: "bot_vocab_b", name: "VOC-22 단어봇", modelName: "어휘 암기형", rarity: "B", weight: 18, modelClass: "robot-vocab", auraColor: "#60a5fa", incomePerMinute: 8, sellPrice: 7500, stats: { korean: 130, english: 150, math: 75, social: 85, science: 70 }, spriteAsset: "helper-teacher" },
  { id: "bot_calc_b", name: "CAL-30 계산봇", modelName: "연산 가속형", rarity: "B", weight: 16, modelClass: "robot-calc", auraColor: "#34d399", incomePerMinute: 9, sellPrice: 7500, stats: { korean: 70, english: 80, math: 165, social: 65, science: 115 }, spriteAsset: "helper-chip" },
  { id: "bot_archive_a", name: "ARC-77 정리봇", modelName: "오답 압축형", rarity: "A", weight: 6.4, modelClass: "robot-archive", auraColor: "#f59e0b", incomePerMinute: 15, sellPrice: 25000, stats: { korean: 170, english: 130, math: 150, social: 145, science: 145 }, spriteAsset: "helper-chart" },
  { id: "bot_lab_a", name: "LAB-64 실험봇", modelName: "개념 실험형", rarity: "A", weight: 4.8, modelClass: "robot-lab", auraColor: "#22c55e", incomePerMinute: 16, sellPrice: 25000, stats: { korean: 95, english: 105, math: 150, social: 115, science: 195 }, spriteAsset: "helper-flask" },
  { id: "bot_exam_s", name: "SIM-88 모의고사봇", modelName: "실전 시뮬레이션형", rarity: "S", weight: 1.4, modelClass: "robot-exam", auraColor: "#c084fc", incomePerMinute: 24, sellPrice: 90000, stats: { korean: 190, english: 190, math: 205, social: 165, science: 185 }, spriteAsset: "helper-laptop" },
  { id: "bot_essay_s", name: "LAW-51 논술봇", modelName: "논리 전개형", rarity: "S", weight: 1, modelClass: "robot-law", auraColor: "#fb7185", incomePerMinute: 23, sellPrice: 90000, stats: { korean: 230, english: 165, math: 130, social: 210, science: 115 }, spriteAsset: "helper-judge" },
  { id: "bot_strategy_ss", name: "STR-95 전략봇", modelName: "입시 전략형", rarity: "SS", weight: 0.35, modelClass: "robot-strategy", auraColor: "#38bdf8", incomePerMinute: 42, sellPrice: 320000, stats: { korean: 250, english: 245, math: 265, social: 220, science: 235 }, spriteAsset: "helper-globe" },
  { id: "bot_focus_ss", name: "MED-96 집중케어봇", modelName: "컨디션 관리형", rarity: "SS", weight: 0.22, modelClass: "robot-medic", auraColor: "#2dd4bf", incomePerMinute: 40, sellPrice: 320000, stats: { korean: 225, english: 235, math: 240, social: 225, science: 270 }, spriteAsset: "helper-medic" },
  { id: "bot_oracle_sss", name: "ORA-99 진로예측봇", modelName: "적성 예측형", rarity: "SSS", weight: 0.06, modelClass: "robot-oracle", auraColor: "#f472b6", incomePerMinute: 72, sellPrice: 1200000, stats: { korean: 330, english: 320, math: 335, social: 310, science: 325 }, spriteAsset: "helper-bulb" },
  { id: "bot_nova_sss", name: "NOVA-00 수능항법봇", modelName: "최종 항법형", rarity: "SSS", weight: 0.03, modelClass: "robot-nova", auraColor: "#fde047", incomePerMinute: 78, sellPrice: 1500000, stats: { korean: 320, english: 330, math: 350, social: 300, science: 350 }, spriteAsset: "helper-palette" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCompanionObject(companion, path) {
  assert(companion && typeof companion === "object", `${path} 데이터가 객체가 아닙니다.`);
  return companion;
}

function companionIdForError(companion, path) {
  assertCompanionObject(companion, path);
  return String(companion.id);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function requireGender(value, label) {
  assert(value === "male" || value === "female", `${label} avatarGender 값이 올바르지 않습니다: ${value}`);
  return value;
}

function uniqueId(prefix, index = 0) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function rarityRank(rarity) {
  return rarity === "SSS" ? 6 : rarity === "SS" ? 5 : rarity === "S" ? 4 : rarity === "A" ? 3 : rarity === "B" ? 2 : 1;
}

function pickRobotProfile({ minRarity } = {}) {
  assert(robotHelperCatalog.length > 0, "로봇 도우미 카탈로그가 비어 있습니다.");
  const minRank = minRarity ? rarityRank(minRarity) : 0;
  assert(!minRarity || minRank > 0, `지원하지 않는 최소 rarity입니다: ${minRarity}`);
  const pool = robotHelperCatalog.filter((profile) => rarityRank(profile.rarity) >= minRank);
  assert(pool.length > 0, `조건에 맞는 로봇 도우미 풀이 없습니다: ${minRarity}`);
  const entries = pool;
  const totalWeight = entries.reduce((sum, profile) => sum + profile.weight, 0);
  assert(totalWeight > 0, "로봇 도우미 가중치 합계가 0입니다.");
  let cursor = Math.random() * totalWeight;
  for (const profile of entries) {
    cursor -= profile.weight;
    if (cursor <= 0) return profile;
  }
  throw new Error("로봇 도우미 추첨 결과를 결정할 수 없습니다.");
}

function createRobotHelper({ index = 0, minRarity } = {}) {
  const profile = pickRobotProfile({ minRarity });
  const rarity = profile.rarity;
  const tier = rarityTiers[rarity];
  assert(tier, `지원하지 않는 로봇 rarity입니다: ${profile.id} / ${rarity}`);
  assert(profile.modelClass, `로봇 도우미 modelClass가 비어 있습니다: ${profile.id}`);
  assert(profile.modelName, `로봇 도우미 modelName이 비어 있습니다: ${profile.id}`);
  assert(profile.spriteAsset, `로봇 도우미 spriteAsset이 비어 있습니다: ${profile.id}`);
  assert(profile.stats && typeof profile.stats === "object", `로봇 도우미 stats가 비어 있습니다: ${profile.id}`);
  const incomePerMinute = finiteNumber(profile.incomePerMinute, `로봇 도우미 incomePerMinute 값이 올바르지 않습니다: ${profile.id}`);
  const sellPrice = finiteNumber(profile.sellPrice, `로봇 도우미 sellPrice 값이 올바르지 않습니다: ${profile.id}`);
  assert(profile.auraColor, `로봇 도우미 auraColor가 비어 있습니다: ${profile.id}`);
  return {
    id: uniqueId("robot-helper", index),
    kind: "robot-helper",
    source: "robot",
    robotHelperId: profile.id,
    robotModel: profile.modelClass,
    modelName: profile.modelName,
    status: "study",
    name: profile.name,
    rarity,
    spriteAsset: profile.spriteAsset,
    avatarGender: Math.random() > 0.5 ? "female" : "male",
    powerBonus: tier.powerBonus,
    incomePerMinute,
    sellPrice,
    stats: { ...profile.stats },
    auraColor: profile.auraColor,
    createdRun: 0,
    createdAt: Date.now(),
  };
}

function careerStatsForRank(rank = 1) {
  const base = Math.max(80, 180 - rank * 2);
  return {
    korean: base + 18,
    english: base + 14,
    math: base + 22,
    social: base + 9,
    science: base + 16,
  };
}

function createDebugCareerCompanion(state, career, index) {
  const runNumber = finiteNumber(state.runNumber, "DEBUG 동료 생성 runNumber 값이 올바르지 않습니다.");
  const rank = finiteNumber(career.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${career.id}`);
  const incomePerMinute = finiteNumber(career.baseIncomePerMinute, `careers.json baseIncomePerMinute 값이 올바르지 않습니다: ${career.id}`);
  const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
  return {
    id: uniqueId(`debug-${career.id}`, index),
    name: `${career.name} DEBUG 동료`,
    careerId: career.id,
    careerName: career.name,
    avatarGender: Math.random() > 0.5 ? "female" : "male",
    age: 20 + (index % 8),
    status: "idle",
    incomePerMinute,
    powerMultiplier,
    careerRank: rank,
    stats: careerStatsForRank(rank),
    createdRun: runNumber,
    source: "debug",
    sourceUniversity: "DEBUG",
    createdAt: Date.now(),
  };
}

export function isRobotHelper(companion) {
  return companion?.kind === "robot-helper" || companion?.source === "robot" || Boolean(companion?.spriteAsset && String(companion.spriteAsset).startsWith("helper-"));
}

export function isExpeditionCompanion(companion) {
  if (isRobotHelper(companion)) return false;
  assertCompanionObject(companion, "원정대 동료");
  assert(companion.careerId, `원정대 동료 careerId가 없습니다: ${companionIdForError(companion, "원정대 동료")}`);
  assert(careers.some((career) => career.id === companion.careerId), `careers.json에서 원정대 동료 직업을 찾을 수 없습니다: ${companion.careerId}`);
  return true;
}

export function activeLearningHelpers(state) {
  assert(Array.isArray(state?.companions), "save.companions 데이터가 배열이 아닙니다.");
  return state.companions
    .filter((companion) => isRobotHelper(companion) || (companion.status === "study" && Number(companion.powerBonus) > 0))
    .slice(0, 3);
}

export function helperPower(companion) {
  assertCompanionObject(companion, "학습 도우미");
  const powerBonus = finiteNumber(companion.powerBonus, `학습 도우미 powerBonus 값이 올바르지 않습니다: ${companionIdForError(companion, "학습 도우미")}`);
  return Math.max(0, powerBonus);
}

export function helperSellValue(companion) {
  assertCompanionObject(companion, "학습 도우미");
  const rarity = companion.rarity;
  assert(rarityTiers[rarity], `지원하지 않는 학습 도우미 rarity입니다: ${rarity}`);
  assert(Number.isFinite(Number(companion.sellPrice)), `학습 도우미 판매가가 없습니다: ${companionIdForError(companion, "학습 도우미")}`);
  return Math.max(0, Number(companion.sellPrice));
}

export function helperDisplayName(companion) {
  assertCompanionObject(companion, "학습 도우미");
  assert(typeof companion.name === "string" && companion.name.length > 0, `학습 도우미 이름이 없습니다: ${companionIdForError(companion, "학습 도우미")}`);
  return companion.name;
}

export function addDiamonds(state, amount) {
  finiteNumber(amount, `DEBUG 다이아 지급량이 올바르지 않습니다: ${amount}`);
  const next = cloneState(state);
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + amount;
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.log = [
    { type: "debug", message: `DEBUG 다이아 ${amount.toLocaleString("ko-KR")}개 지급`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return next;
}

export function exchangeMoneyProduct(state, productId) {
  const product = shopProducts.find((item) => item.id === productId);
  assert(product?.category === "money", `보유금 교환 상품을 찾을 수 없습니다: ${productId}`);
  assert(product.enabled !== false, `${product.name} 상품은 아직 사용할 수 없습니다.`);
  const diamondCost = finiteNumber(product.diamondCost, `상점 상품 diamondCost 값이 올바르지 않습니다: ${product.id}`);
  const moneyReward = finiteNumber(product.grantMoney, `상점 상품 grantMoney 값이 올바르지 않습니다: ${product.id}`);
  assert(finiteNumber(state.diamonds, "save.diamonds 값이 올바르지 않습니다.") >= diamondCost, `${product.name}에 필요한 다이아가 부족합니다.`);

  const next = cloneState(state);
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") - diamondCost;
  next.money = finiteNumber(next.money, "save.money 값이 올바르지 않습니다.") + moneyReward;
  next.log = [
    { type: "good", message: `${product.name}으로 ${moneyReward.toLocaleString("ko-KR")}원을 획득했다.`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return next;
}

export function callRobotHelperProduct(state, productId) {
  const product = shopProducts.find((item) => item.id === productId);
  assert(product?.category === "robot_gacha", `로봇 도우미 상품을 찾을 수 없습니다: ${productId}`);
  assert(product.enabled !== false, `${product.name} 상품은 아직 사용할 수 없습니다.`);
  const diamondCost = finiteNumber(product.diamondCost, `상점 상품 diamondCost 값이 올바르지 않습니다: ${product.id}`);
  assert(finiteNumber(state.diamonds, "save.diamonds 값이 올바르지 않습니다.") >= diamondCost, `${product.name}에 필요한 다이아가 부족합니다.`);

  const next = cloneState(state);
  const drawCount = finiteNumber(product.drawCount, `상점 상품 drawCount 값이 올바르지 않습니다: ${product.id}`);
  assert(Number.isInteger(drawCount) && drawCount > 0, `상점 상품 drawCount 값은 1 이상의 정수여야 합니다: ${product.id}`);
  const result = Array.from({ length: drawCount }, (_, index) => createRobotHelper({
    index,
    minRarity: product.guaranteedMinRarity && index === drawCount - 1 ? product.guaranteedMinRarity : undefined,
  }));
  assert(Array.isArray(next.companions), "save.companions 데이터가 배열이 아닙니다.");
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") - diamondCost;
  next.companions = [...next.companions, ...result];
  next.log = [
    { type: "good", message: `${product.name}으로 로봇 도우미 ${result.length}기를 호출했다.`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return { state: next, result };
}

export function addRandomCareerCompanions(state, count) {
  assert(careers.length > 0, "careers.json이 비어 있어 DEBUG 동료를 추가할 수 없습니다.");
  const additionCount = finiteNumber(count, `DEBUG 동료 추가 수가 올바르지 않습니다: ${count}`);
  assert(Number.isInteger(additionCount) && additionCount > 0, `DEBUG 동료 추가 수는 1 이상의 정수여야 합니다: ${count}`);
  let next = cloneState(state);
  assert(Array.isArray(next.companions), "save.companions 데이터가 배열이 아닙니다.");
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  const existing = next.companions;
  const orderedCareers = careers.slice().sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`));
  const additions = Array.from({ length: additionCount }, (_, index) => {
    const cursor = (existing.length + index + Math.floor(Math.random() * orderedCareers.length)) % orderedCareers.length;
    return createDebugCareerCompanion(next, orderedCareers[cursor], index);
  });

  next.companions = [...existing, ...additions];
  next = registerExpeditionMembersFromCompanions(next, additions, { autoParty: true }).state;
  next.log = [
    { type: "debug", message: `DEBUG 직업 동료 ${additions.length}명 추가`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return { state: next, additions };
}

export function companionCareer(companion) {
  if (!companion?.careerId) return null;
  const career = careers.find((candidate) => candidate.id === companion.careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${companion.careerId}`);
  return career;
}

export function companionGender(companion) {
  assertCompanionObject(companion, "동료");
  return requireGender(companion.avatarGender, `동료 ${companionIdForError(companion, "동료")}`);
}
