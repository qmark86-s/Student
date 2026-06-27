const subjectIds = ["korean", "english", "math", "social", "science"];

export const equipmentSlots = [
  { id: "stationery", label: "필기류", shopLabel: "문방구", icon: "pencil" },
  { id: "book", label: "책류", shopLabel: "서점", icon: "book" },
];

export const rarityLabels = {
  C: "일반",
  B: "고급",
  A: "희귀",
  S: "영웅",
  SS: "전설",
  SSS: "신화",
};

export const rarityTiers = {
  C: { label: "일반", powerBonus: 3, color: "#64748b", sellPrice: 2500, order: 1 },
  B: { label: "고급", powerBonus: 6, color: "#16a34a", sellPrice: 7500, order: 2 },
  A: { label: "희귀", powerBonus: 11, color: "#0284c7", sellPrice: 25000, order: 3 },
  S: { label: "영웅", powerBonus: 18, color: "#9333ea", sellPrice: 90000, order: 4 },
  SS: { label: "전설", powerBonus: 28, color: "#d97706", sellPrice: 320000, order: 5 },
  SSS: { label: "신화", powerBonus: 44, color: "#e11d48", sellPrice: 1200000, order: 6 },
};

export const equipmentDrawCopy = {
  C: { title: "기본 장비 획득", subtitle: "바로 공부 흐름에 얹을 수 있는 안정적인 장비다." },
  B: { title: "고급 장비 발견", subtitle: "과목별 기초 스탯을 조금 더 탄탄하게 받쳐준다." },
  A: { title: "희귀 장비 개봉", subtitle: "장착 슬롯 하나만으로도 전투력이 눈에 띄게 오른다." },
  S: { title: "영웅 장비 등장", subtitle: "시험 구간을 밀어붙일 만큼 선명한 장비 반응이다." },
  SS: { title: "전설 장비 확보", subtitle: "장기 성장 곡선을 바꿀 만한 고급 장비가 나왔다." },
  SSS: { title: "신화 장비 각성", subtitle: "두 슬롯 체계에서도 최상위 목표가 되는 장비다." },
};

export const shopCategories = [
  { id: "diamond", label: "다이아", icon: "gem" },
  { id: "money", label: "보유금", icon: "coins" },
  { id: "stationery_gacha", label: "문방구", icon: "pencil" },
  { id: "book_gacha", label: "서점", icon: "book" },
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
    note: "장비 판매 기대값보다 안정적인 보유금 교환이다.",
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
    id: "stationery_single",
    category: "stationery_gacha",
    equipmentSlot: "stationery",
    name: "문방구 필기류 1회 뽑기",
    subtitle: "연필, 샤프, 펜 세트 같은 필기 장비를 획득한다",
    priceLabel: "다이아 300",
    badge: "필기류",
    icon: "pencil",
    rewards: ["필기류 장비 1개", "C~SSS 등급", "같은 등급 2개 합성"],
    note: "빈 필기류 슬롯은 첫 획득 장비가 자동 장착된다.",
    diamondCost: 300,
    drawCount: 1,
    enabled: true,
    equipmentGacha: true,
  },
  {
    id: "stationery_ten",
    category: "stationery_gacha",
    equipmentSlot: "stationery",
    name: "문방구 필기류 10+1회",
    subtitle: "필기류 장비를 묶음으로 뽑고 마지막 1개는 A 이상 보정한다",
    priceLabel: "다이아 3,000",
    badge: "추천",
    icon: "pencil",
    rewards: ["필기류 장비 11개", "A 이상 1개 보정", "같은 등급 2개 합성"],
    note: "같은 등급 장비가 쌓이면 장비 탭에서 합성할 수 있다.",
    diamondCost: 3000,
    drawCount: 11,
    guaranteedMinRarity: "A",
    enabled: true,
    equipmentGacha: true,
    highlight: true,
  },
  {
    id: "book_single",
    category: "book_gacha",
    equipmentSlot: "book",
    name: "서점 책류 1회 뽑기",
    subtitle: "교재, 문제집, 오답노트 같은 책 장비를 획득한다",
    priceLabel: "다이아 300",
    badge: "책류",
    icon: "book",
    rewards: ["책류 장비 1개", "C~SSS 등급", "같은 등급 2개 합성"],
    note: "빈 책류 슬롯은 첫 획득 장비가 자동 장착된다.",
    diamondCost: 300,
    drawCount: 1,
    enabled: true,
    equipmentGacha: true,
  },
  {
    id: "book_ten",
    category: "book_gacha",
    equipmentSlot: "book",
    name: "서점 책류 10+1회",
    subtitle: "책류 장비를 묶음으로 뽑고 마지막 1개는 A 이상 보정한다",
    priceLabel: "다이아 3,000",
    badge: "추천",
    icon: "book",
    rewards: ["책류 장비 11개", "A 이상 1개 보정", "같은 등급 2개 합성"],
    note: "책류 장비는 장착 중인 교재 슬롯의 전투 보너스를 높인다.",
    diamondCost: 3000,
    drawCount: 11,
    guaranteedMinRarity: "A",
    enabled: true,
    equipmentGacha: true,
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
    subtitle: "초반 교육 투자와 장비 슬롯 체험용",
    priceLabel: "4,400원",
    badge: "1회",
    icon: "package",
    rewards: ["다이아 500개", "공부량 1시간 즉시권 5개", "필기류 뽑기권 1개"],
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

const equipmentCatalog = [
  { id: "stationery_pencil_c", slot: "stationery", name: "단단한 HB 연필", rarity: "C", weight: 36, stats: { korean: 80, english: 70, math: 110, social: 55, science: 70 } },
  { id: "stationery_note_c", slot: "stationery", name: "줄맞춤 필기 세트", rarity: "C", weight: 28, stats: { korean: 105, english: 75, math: 85, social: 85, science: 65 } },
  { id: "stationery_marker_b", slot: "stationery", name: "형광펜 묶음", rarity: "B", weight: 18, stats: { korean: 130, english: 120, math: 85, social: 110, science: 80 } },
  { id: "stationery_caliper_b", slot: "stationery", name: "정밀 샤프 세트", rarity: "B", weight: 16, stats: { korean: 70, english: 80, math: 170, social: 65, science: 120 } },
  { id: "stationery_planner_a", slot: "stationery", name: "오답 플래너", rarity: "A", weight: 6.4, stats: { korean: 160, english: 130, math: 150, social: 145, science: 145 } },
  { id: "stationery_lab_a", slot: "stationery", name: "실험 기록 펜", rarity: "A", weight: 4.8, stats: { korean: 95, english: 105, math: 150, social: 115, science: 200 } },
  { id: "stationery_timer_s", slot: "stationery", name: "모의고사 타이머 펜", rarity: "S", weight: 1.4, stats: { korean: 190, english: 190, math: 210, social: 165, science: 185 } },
  { id: "stationery_logic_s", slot: "stationery", name: "논리 전개 만년필", rarity: "S", weight: 1, stats: { korean: 230, english: 165, math: 130, social: 210, science: 115 } },
  { id: "stationery_strategy_ss", slot: "stationery", name: "전략 설계 필통", rarity: "SS", weight: 0.35, stats: { korean: 250, english: 245, math: 265, social: 220, science: 235 } },
  { id: "stationery_focus_ss", slot: "stationery", name: "집중 케어 필기구", rarity: "SS", weight: 0.22, stats: { korean: 225, english: 235, math: 240, social: 225, science: 270 } },
  { id: "stationery_oracle_sss", slot: "stationery", name: "진로 예측 펜", rarity: "SSS", weight: 0.06, stats: { korean: 330, english: 320, math: 335, social: 310, science: 325 } },
  { id: "stationery_nova_sss", slot: "stationery", name: "최종 항법 샤프", rarity: "SSS", weight: 0.03, stats: { korean: 320, english: 330, math: 350, social: 300, science: 350 } },
  { id: "book_basic_c", slot: "book", name: "기초 개념 교재", rarity: "C", weight: 36, stats: { korean: 105, english: 90, math: 90, social: 80, science: 70 } },
  { id: "book_vocab_c", slot: "book", name: "단어 암기장", rarity: "C", weight: 28, stats: { korean: 85, english: 120, math: 70, social: 80, science: 65 } },
  { id: "book_reading_b", slot: "book", name: "독해 문제집", rarity: "B", weight: 18, stats: { korean: 155, english: 150, math: 75, social: 95, science: 70 } },
  { id: "book_formula_b", slot: "book", name: "공식 요약집", rarity: "B", weight: 16, stats: { korean: 80, english: 85, math: 170, social: 70, science: 115 } },
  { id: "book_archive_a", slot: "book", name: "오답 압축 노트", rarity: "A", weight: 6.4, stats: { korean: 175, english: 135, math: 155, social: 145, science: 145 } },
  { id: "book_lab_a", slot: "book", name: "개념 실험 노트", rarity: "A", weight: 4.8, stats: { korean: 100, english: 110, math: 150, social: 115, science: 200 } },
  { id: "book_exam_s", slot: "book", name: "실전 모의고사집", rarity: "S", weight: 1.4, stats: { korean: 195, english: 195, math: 205, social: 165, science: 185 } },
  { id: "book_essay_s", slot: "book", name: "논술 구조 교본", rarity: "S", weight: 1, stats: { korean: 235, english: 170, math: 130, social: 215, science: 115 } },
  { id: "book_strategy_ss", slot: "book", name: "입시 전략 대전", rarity: "SS", weight: 0.35, stats: { korean: 255, english: 250, math: 265, social: 225, science: 235 } },
  { id: "book_focus_ss", slot: "book", name: "컨디션 관리 백서", rarity: "SS", weight: 0.22, stats: { korean: 225, english: 235, math: 240, social: 225, science: 275 } },
  { id: "book_oracle_sss", slot: "book", name: "진로 예측 백과", rarity: "SSS", weight: 0.06, stats: { korean: 335, english: 325, math: 335, social: 315, science: 325 } },
  { id: "book_nova_sss", slot: "book", name: "수능 항법서", rarity: "SSS", weight: 0.03, stats: { korean: 325, english: 335, math: 350, social: 305, science: 350 } },
];

const slotIds = new Set(equipmentSlots.map((slot) => slot.id));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function uniqueId(prefix, index = 0) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function rarityRank(rarity) {
  const tier = rarityTiers[rarity];
  assert(tier, `지원하지 않는 장비 등급입니다: ${rarity}`);
  return tier.order;
}

function nextRarity(rarity) {
  const order = rarityRank(rarity);
  const next = Object.entries(rarityTiers).find(([, tier]) => tier.order === order + 1);
  return next ? next[0] : null;
}

function validateStats(stats, path) {
  assert(stats && typeof stats === "object" && !Array.isArray(stats), `${path} 데이터가 객체가 아닙니다.`);
  for (const subject of subjectIds) finiteNumber(stats[subject], `${path}.${subject} 값이 올바르지 않습니다.`);
}

function normalizeEquipmentInstance(item, path = "장비") {
  assert(item && typeof item === "object" && !Array.isArray(item), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof item.id === "string" && item.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(slotIds.has(item.slot), `${path}.slot 값이 올바르지 않습니다: ${item.slot}`);
  assert(rarityTiers[item.rarity], `${path}.rarity 값이 올바르지 않습니다: ${item.rarity}`);
  assert(typeof item.name === "string" && item.name.length > 0, `${path}.name 값이 없습니다.`);
  validateStats(item.stats, `${path}.stats`);
  finiteNumber(item.sellPrice, `${path}.sellPrice 값이 올바르지 않습니다.`);
  finiteNumber(item.createdAt, `${path}.createdAt 값이 올바르지 않습니다.`);
  assert(typeof item.source === "string" && item.source.length > 0, `${path}.source 값이 없습니다.`);
  return {
    ...item,
    stats: Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(item.stats[subject], `${path}.stats.${subject} 값이 올바르지 않습니다.`)])),
    sellPrice: finiteNumber(item.sellPrice, `${path}.sellPrice 값이 올바르지 않습니다.`),
    createdAt: finiteNumber(item.createdAt, `${path}.createdAt 값이 올바르지 않습니다.`),
  };
}

function makeEquipmentFromProfile(profile, { index = 0, source = "gacha" } = {}) {
  assert(profile && typeof profile === "object", "장비 프로필 데이터가 없습니다.");
  assert(slotIds.has(profile.slot), `장비 프로필 slot 값이 올바르지 않습니다: ${profile.id}`);
  assert(rarityTiers[profile.rarity], `장비 프로필 rarity 값이 올바르지 않습니다: ${profile.id}`);
  validateStats(profile.stats, `장비 프로필 ${profile.id}.stats`);
  return normalizeEquipmentInstance({
    id: uniqueId(`${profile.slot}-equipment`, index),
    catalogId: profile.id,
    slot: profile.slot,
    rarity: profile.rarity,
    name: profile.name,
    stats: { ...profile.stats },
    sellPrice: rarityTiers[profile.rarity].sellPrice,
    source,
    createdAt: Date.now() + index,
  });
}

function pickEquipmentProfile(slot, { minRarity } = {}) {
  assert(slotIds.has(slot), `지원하지 않는 장비 슬롯입니다: ${slot}`);
  const minRank = minRarity ? rarityRank(minRarity) : 0;
  const pool = equipmentCatalog.filter((profile) => profile.slot === slot && rarityRank(profile.rarity) >= minRank);
  assert(pool.length > 0, `조건에 맞는 장비 풀이 없습니다: ${slot} / ${minRarity || "any"}`);
  const totalWeight = pool.reduce((sum, profile) => sum + finiteNumber(profile.weight, `장비 가중치가 올바르지 않습니다: ${profile.id}`), 0);
  assert(totalWeight > 0, "장비 가중치 합계가 0입니다.");
  let cursor = Math.random() * totalWeight;
  for (const profile of pool) {
    cursor -= profile.weight;
    if (cursor <= 0) return profile;
  }
  return pool.at(-1);
}

export function createDefaultEquipmentState() {
  return {
    inventory: [],
    equipped: {
      stationery: null,
      book: null,
    },
  };
}

export function validateEquipmentState(equipment, path = "save.equipment") {
  assert(equipment && typeof equipment === "object" && !Array.isArray(equipment), `${path} 데이터가 객체가 아닙니다.`);
  assert(Array.isArray(equipment.inventory), `${path}.inventory 데이터가 배열이 아닙니다.`);
  const ids = new Set();
  for (const [index, item] of equipment.inventory.entries()) {
    const normalized = normalizeEquipmentInstance(item, `${path}.inventory[${index}]`);
    assert(!ids.has(normalized.id), `${path}.inventory id가 중복되었습니다: ${normalized.id}`);
    ids.add(normalized.id);
  }
  assert(equipment.equipped && typeof equipment.equipped === "object" && !Array.isArray(equipment.equipped), `${path}.equipped 데이터가 객체가 아닙니다.`);
  for (const slot of equipmentSlots) {
    const id = equipment.equipped[slot.id];
    assert(id === null || typeof id === "string", `${path}.equipped.${slot.id} 값이 올바르지 않습니다.`);
    if (id !== null) {
      const item = equipment.inventory.find((candidate) => candidate.id === id);
      assert(item, `${path}.equipped.${slot.id} 장비를 inventory에서 찾을 수 없습니다: ${id}`);
      assert(item.slot === slot.id, `${path}.equipped.${slot.id} 장비 슬롯이 일치하지 않습니다: ${id}`);
    }
  }
}

export function normalizeEquipmentState(equipment = createDefaultEquipmentState()) {
  const base = equipment && typeof equipment === "object" ? equipment : createDefaultEquipmentState();
  const inventory = Array.isArray(base.inventory)
    ? base.inventory.map((item, index) => normalizeEquipmentInstance(item, `save.equipment.inventory[${index}]`))
    : [];
  const idSet = new Set(inventory.map((item) => item.id));
  const equipped = { stationery: null, book: null };
  for (const slot of equipmentSlots) {
    const id = base.equipped?.[slot.id];
    equipped[slot.id] = typeof id === "string" && idSet.has(id) && inventory.find((item) => item.id === id)?.slot === slot.id ? id : null;
    if (!equipped[slot.id]) {
      const first = inventory.find((item) => item.slot === slot.id);
      equipped[slot.id] = first ? first.id : null;
    }
  }
  const normalized = { inventory, equipped };
  validateEquipmentState(normalized);
  return normalized;
}

export function isLegacyStudentHelper(item) {
  const legacyKind = ["robot", "helper"].join("-");
  return item?.kind === legacyKind || item?.source === "robot" || Boolean(item?.spriteAsset && String(item.spriteAsset).startsWith("helper-"));
}

function legacySlotForItem(item, index) {
  const asset = String(item?.spriteAsset || "");
  const stationeryAssets = new Set(["helper-bulb", "helper-chart", "helper-chip", "helper-flask", "helper-laptop", "helper-medic", "helper-mic", "helper-palette"]);
  const bookAssets = new Set(["helper-book", "helper-files", "helper-teacher", "helper-judge", "helper-globe"]);
  if (stationeryAssets.has(asset)) return "stationery";
  if (bookAssets.has(asset)) return "book";
  throw new Error(`이전 보조 항목의 장비 슬롯을 결정할 수 없습니다: ${asset || index}`);
}

export function legacyStudentHelperToEquipment(item, index = 0) {
  assert(item && typeof item === "object", "이전 보조 항목 데이터가 없습니다.");
  const slot = legacySlotForItem(item, index);
  assert(rarityTiers[item.rarity], `이전 보조 항목 rarity 값이 올바르지 않습니다: ${item.id || index}`);
  assert(item.stats && typeof item.stats === "object", `이전 보조 항목 stats 값이 없습니다: ${item.id || index}`);
  assert(typeof item.name === "string" && item.name.length > 0, `이전 보조 항목 name 값이 없습니다: ${item.id || index}`);
  const rarity = item.rarity;
  const stats = item.stats;
  validateStats(stats, `legacyEquipment.${index}.stats`);
  return normalizeEquipmentInstance({
    id: uniqueId(`${slot}-legacy-equipment`, index),
    legacyId: typeof item.id === "string" ? item.id : undefined,
    slot,
    rarity,
    name: item.name.replace(/[A-Z]{2,3}-\d+\s*/, "").replace(/봇/g, " 장비"),
    stats: { ...stats },
    sellPrice: Number.isFinite(Number(item.sellPrice)) ? Number(item.sellPrice) : rarityTiers[rarity].sellPrice,
    source: "legacy-helper",
    createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now() + index,
  }, `legacyEquipment.${index}`);
}

function autoEquipFirstEmptySlot(equipment, items) {
  const next = normalizeEquipmentState(equipment);
  for (const item of items) {
    if (!next.equipped[item.slot]) next.equipped[item.slot] = item.id;
  }
  validateEquipmentState(next);
  return next;
}

export function drawEquipmentProduct(state, productId) {
  const product = shopProducts.find((item) => item.id === productId);
  assert(product?.equipmentGacha === true, `장비 뽑기 상품을 찾을 수 없습니다: ${productId}`);
  assert(product.enabled !== false, `${product.name} 상품은 아직 사용할 수 없습니다.`);
  const diamondCost = finiteNumber(product.diamondCost, `상점 상품 diamondCost 값이 올바르지 않습니다: ${product.id}`);
  assert(finiteNumber(state.diamonds, "save.diamonds 값이 올바르지 않습니다.") >= diamondCost, `${product.name}에 필요한 다이아가 부족합니다.`);
  const drawCount = finiteNumber(product.drawCount, `상점 상품 drawCount 값이 올바르지 않습니다: ${product.id}`);
  assert(Number.isInteger(drawCount) && drawCount > 0, `상점 상품 drawCount 값은 1 이상의 정수여야 합니다: ${product.id}`);
  assert(slotIds.has(product.equipmentSlot), `상점 상품 equipmentSlot 값이 올바르지 않습니다: ${product.id}`);

  const next = cloneState(state);
  next.equipment = normalizeEquipmentState(next.equipment);
  const result = Array.from({ length: drawCount }, (_, index) => {
    const profile = pickEquipmentProfile(product.equipmentSlot, {
      minRarity: product.guaranteedMinRarity && index === drawCount - 1 ? product.guaranteedMinRarity : undefined,
    });
    return makeEquipmentFromProfile(profile, { index });
  });
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") - diamondCost;
  next.equipment.inventory = [...next.equipment.inventory, ...result];
  next.equipment = autoEquipFirstEmptySlot(next.equipment, result);
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.log = [
    { type: "good", message: `${product.name}으로 장비 ${result.length}개를 획득했다.`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return { state: next, result };
}

export function equipEquipment(state, equipmentId) {
  const next = cloneState(state);
  next.equipment = normalizeEquipmentState(next.equipment);
  const item = next.equipment.inventory.find((candidate) => candidate.id === equipmentId);
  assert(item, `장착할 장비를 찾을 수 없습니다: ${equipmentId}`);
  next.equipment.equipped[item.slot] = item.id;
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.log = [
    { type: "good", message: `${item.name}을 장착했다.`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  validateEquipmentState(next.equipment);
  return next;
}

export function fuseEquipment(state, equipmentId) {
  const next = cloneState(state);
  next.equipment = normalizeEquipmentState(next.equipment);
  const target = next.equipment.inventory.find((candidate) => candidate.id === equipmentId);
  assert(target, `합성할 장비를 찾을 수 없습니다: ${equipmentId}`);
  const nextTier = nextRarity(target.rarity);
  assert(nextTier, `${target.name}은 이미 최종 등급입니다.`);
  const material = next.equipment.inventory
    .filter((candidate) => candidate.id !== target.id && candidate.slot === target.slot && candidate.rarity === target.rarity)
    .sort((left, right) => left.createdAt - right.createdAt)[0];
  assert(material, `${target.name} 합성에 필요한 같은 슬롯/등급 장비가 부족합니다.`);
  target.rarity = nextTier;
  target.name = `${rarityLabels[nextTier]} ${target.name.replace(/^(일반|고급|희귀|영웅|전설|신화)\s+/, "")}`;
  target.sellPrice = rarityTiers[nextTier].sellPrice;
  target.stats = Object.fromEntries(subjectIds.map((subject) => [subject, Math.round((finiteNumber(target.stats[subject], `${target.id}.${subject}`) * 1.18 + finiteNumber(material.stats[subject], `${material.id}.${subject}`) * 0.12) * 10) / 10]));
  next.equipment.inventory = next.equipment.inventory.filter((candidate) => candidate.id !== material.id);
  for (const slot of equipmentSlots) {
    if (next.equipment.equipped[slot.id] === material.id) next.equipment.equipped[slot.id] = target.slot === slot.id ? target.id : null;
  }
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  next.log = [
    { type: "good", message: `${target.name} 합성 완료`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  next.equipment = normalizeEquipmentState(next.equipment);
  return next;
}

export function equippedEquipment(state) {
  const equipment = normalizeEquipmentState(state.equipment);
  return equipmentSlots.map((slot) => equipment.inventory.find((item) => item.id === equipment.equipped[slot.id]) || null);
}

export function equipmentPower(item) {
  assert(item && typeof item === "object", "장비 데이터가 객체가 아닙니다.");
  const tier = rarityTiers[item.rarity];
  assert(tier, `지원하지 않는 장비 등급입니다: ${item.rarity}`);
  return tier.powerBonus;
}

export function equippedEquipmentPower(state) {
  return equippedEquipment(state).reduce((sum, item) => sum + (item ? equipmentPower(item) : 0), 0);
}

export function equipmentSellValue(item) {
  assert(item && typeof item === "object", "장비 데이터가 객체가 아닙니다.");
  finiteNumber(item.sellPrice, `장비 판매가가 없습니다: ${item.id}`);
  return Math.max(0, Number(item.sellPrice));
}

export function fusionMaterialCount(equipment, item) {
  const normalized = normalizeEquipmentState(equipment);
  return normalized.inventory.filter((candidate) => candidate.id !== item.id && candidate.slot === item.slot && candidate.rarity === item.rarity).length;
}

export function equipmentSlotLabel(slotId) {
  const slot = equipmentSlots.find((item) => item.id === slotId);
  assert(slot, `장비 슬롯 라벨을 찾을 수 없습니다: ${slotId}`);
  return slot.label;
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
