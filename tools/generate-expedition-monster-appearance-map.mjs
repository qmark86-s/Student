import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const outDir = resolve("artifacts/expedition-monster-appearance-map");
const htmlPath = resolve(outDir, "index.html");
const jsonPath = resolve(outDir, "appearance-map.json");

const manifest = JSON.parse(readFileSync(resolve("data/professional_sprite_manifest.json"), "utf8"));
const chapters = JSON.parse(readFileSync(resolve("data/expedition_chapters.json"), "utf8"));
const stages = JSON.parse(readFileSync(resolve("data/expedition_stages.json"), "utf8"));
const bosses = JSON.parse(readFileSync(resolve("data/expedition_bosses.json"), "utf8"));
const balance = JSON.parse(readFileSync(resolve("data/expedition_balance.json"), "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function relativeFromReport(path) {
  return normalizePath(relative(outDir, resolve(path)));
}

function assertConfig(condition, message) {
  if (!condition) throw new Error(message);
}

function labelBossType(type) {
  if (type === "chapter") return "챕터 보스";
  if (type === "mid") return "중간 보스";
  return type || "보스";
}

function naturalCompareId(a, b) {
  return String(a).localeCompare(String(b), "ko-KR", { numeric: true, sensitivity: "base" });
}

const family = manifest.families?.find((entry) => entry?.id === "expeditionEnemies");
assertConfig(family, "professional_sprite_manifest.json에 expeditionEnemies family가 없습니다.");
const monsterItems = family.items ?? [];
const monsterById = new Map(monsterItems.map((item) => [item.id, item]));
const chapterByNumber = new Map(chapters.map((chapter) => [Number(chapter.chapter), chapter]));
const chapterSize = Number(balance.chapterSize || 1000);
const segmentSize = Number(balance.segmentSize || 100);

const usagesByMonster = new Map(monsterItems.map((item) => [item.id, []]));

function framePathFor(id) {
  const path = resolve("src/snapshot/assets/individual/expedition-enemies", id, "move_0.png");
  assertConfig(existsSync(path), `원정대 몬스터 프레임이 없습니다: ${id}/move_0.png`);
  return relativeFromReport(path);
}

function isNewExpansionId(item) {
  if (item.boss) return true;
  return Number(item.variant) >= 4;
}

function monsterView(id) {
  const item = monsterById.get(id);
  assertConfig(item, `manifest에 없는 원정대 몬스터 id입니다: ${id}`);
  return {
    id,
    name: item.name,
    tone: item.tone,
    type: item.boss ? "boss" : "mob",
    typeLabel: item.boss ? "보스" : "일반",
    form: item.form,
    icon: item.icon,
    motif: item.motif,
    variant: Number(item.variant),
    isNewExpansionId: isNewExpansionId(item),
    frame: framePathFor(id),
  };
}

const stageRows = stages.map((stage) => {
  assertConfig(Array.isArray(stage.enemyAssets), `stage enemyAssets 누락: ${stage.id}`);
  const chapter = chapterByNumber.get(Number(stage.chapter));
  assertConfig(chapter, `chapter 누락: ${stage.chapter}`);
  const normalStart = (Number(stage.chapter) - 1) * chapterSize + (Number(stage.segment) - 1) * segmentSize + 1;
  const normalEnd = (Number(stage.chapter) - 1) * chapterSize + Number(stage.segment) * segmentSize - 1;
  const row = {
    id: stage.id,
    chapter: Number(stage.chapter),
    chapterName: chapter.name,
    chapterSubtitle: chapter.subtitle,
    segment: Number(stage.segment),
    name: stage.name,
    enemyName: stage.enemyName,
    normalEnemyNames: stage.normalEnemyNames ?? [],
    stageRange: `${normalStart}-${normalEnd}`,
    stageStart: normalStart,
    stageEnd: normalEnd,
    tone: monsterView(stage.enemyAssets[0]).tone,
    monsters: stage.enemyAssets.map(monsterView),
  };
  row.monsters.forEach((monster, index) => {
    usagesByMonster.get(monster.id)?.push({
      kind: "stage",
      label: `CH.${row.chapter} ${row.name}`,
      detail: `Stage ${row.stageRange} / 슬롯 ${index + 1}`,
      chapter: row.chapter,
      segment: row.segment,
      stageStart: row.stageStart,
      stageEnd: row.stageEnd,
      enemyName: row.normalEnemyNames[index] ?? row.enemyName,
    });
  });
  return row;
});

const bossRows = bosses.map((boss) => {
  const chapter = chapterByNumber.get(Number(boss.chapter));
  assertConfig(chapter, `chapter 누락: ${boss.chapter}`);
  const stageNumber = boss.bossType === "chapter"
    ? Number(boss.chapter) * chapterSize
    : (Number(boss.chapter) - 1) * chapterSize + Number(boss.segment) * segmentSize;
  const monster = monsterView(boss.bossAsset);
  const row = {
    id: boss.id,
    chapter: Number(boss.chapter),
    chapterName: chapter.name,
    segment: boss.segment === null ? null : Number(boss.segment),
    bossType: boss.bossType,
    bossTypeLabel: labelBossType(boss.bossType),
    name: boss.name,
    enemyName: boss.enemyName,
    stageNumber,
    tone: monster.tone,
    monster,
  };
  usagesByMonster.get(monster.id)?.push({
    kind: "boss",
    label: `CH.${row.chapter} ${row.name}`,
    detail: `Stage ${row.stageNumber} / ${row.bossTypeLabel}`,
    chapter: row.chapter,
    segment: row.segment,
    stageNumber: row.stageNumber,
    enemyName: row.enemyName,
  });
  return row;
});

const monsterRows = monsterItems.map((item) => {
  const monster = monsterView(item.id);
  const usages = usagesByMonster.get(item.id) ?? [];
  return {
    ...monster,
    usageCount: usages.length,
    usageSummary: usages.map((usage) => usage.detail).join(" | "),
    usages,
  };
}).sort((a, b) => naturalCompareId(a.id, b.id));

const stats = {
  generatedAt: new Date().toISOString(),
  monsterCount: monsterRows.length,
  mobCount: monsterRows.filter((monster) => monster.type === "mob").length,
  bossCount: monsterRows.filter((monster) => monster.type === "boss").length,
  newExpansionIdCount: monsterRows.filter((monster) => monster.isNewExpansionId).length,
  stageCount: stageRows.length,
  bossStageCount: bossRows.length,
  stageMonsterKinds: new Set(stageRows.flatMap((stage) => stage.monsters.map((monster) => monster.id))).size,
  bossMonsterKinds: new Set(bossRows.map((boss) => boss.monster.id)).size,
  tones: Array.from(new Set(monsterRows.map((monster) => monster.tone))).sort(naturalCompareId),
};

assertConfig(stats.monsterCount === 80, `원정대 몬스터 수가 80이 아닙니다: ${stats.monsterCount}`);
assertConfig(stats.stageMonsterKinds === 60, `일반 stage 출현 몬스터 종류가 60이 아닙니다: ${stats.stageMonsterKinds}`);
assertConfig(stats.bossMonsterKinds === 20, `보스 출현 몬스터 종류가 20이 아닙니다: ${stats.bossMonsterKinds}`);
assertConfig(stageRows.every((stage) => stage.monsters.length === 3), "일반 stage 중 enemyAssets 3개가 아닌 항목이 있습니다.");

const report = {
  stats,
  stageRows,
  bossRows,
  monsterRows,
};

function monsterCard(monster, extra = "") {
  return `
    <article class="monster-card" data-id="${escapeHtml(monster.id)}" data-tone="${escapeHtml(monster.tone)}" data-type="${escapeHtml(monster.type)}" data-new="${monster.isNewExpansionId ? "1" : "0"}">
      <img src="${escapeHtml(monster.frame)}" alt="${escapeHtml(monster.name)}" loading="lazy">
      <div>
        <strong>${escapeHtml(monster.name)}</strong>
        <span>${escapeHtml(monster.id)}</span>
        <small>${escapeHtml(monster.typeLabel)} · ${escapeHtml(monster.tone)} · v${escapeHtml(monster.variant)}${monster.isNewExpansionId ? " · 신규" : ""}</small>
        ${extra}
      </div>
    </article>`;
}

function stageRowHtml(stage) {
  return `
    <tr data-tone="${escapeHtml(stage.tone)}" data-type="stage" data-search="${escapeHtml(`${stage.id} ${stage.chapterName} ${stage.name} ${stage.enemyName} ${stage.monsters.map((m) => `${m.id} ${m.name}`).join(" ")}`)}">
      <td><strong>CH.${stage.chapter}</strong><br><small>${escapeHtml(stage.chapterName)}</small></td>
      <td><strong>${escapeHtml(stage.name)}</strong><br><small>Stage ${escapeHtml(stage.stageRange)}</small></td>
      <td>${stage.normalEnemyNames.map((name) => `<span class="pill">${escapeHtml(name)}</span>`).join("")}</td>
      <td class="monster-list">${stage.monsters.map((monster) => monsterCard(monster)).join("")}</td>
    </tr>`;
}

function bossRowHtml(boss) {
  return `
    <tr data-tone="${escapeHtml(boss.tone)}" data-type="boss" data-search="${escapeHtml(`${boss.id} ${boss.chapterName} ${boss.name} ${boss.enemyName} ${boss.monster.id} ${boss.monster.name}`)}">
      <td><strong>CH.${boss.chapter}</strong><br><small>${escapeHtml(boss.chapterName)}</small></td>
      <td><strong>${escapeHtml(boss.name)}</strong><br><small>Stage ${boss.stageNumber} · ${escapeHtml(boss.bossTypeLabel)}</small></td>
      <td><span class="pill danger">${escapeHtml(boss.enemyName)}</span></td>
      <td class="monster-list">${monsterCard(boss.monster)}</td>
    </tr>`;
}

function monsterIndexHtml(monster) {
  const usage = monster.usages.length > 0
    ? monster.usages.map((entry) => `<li><strong>${escapeHtml(entry.detail)}</strong><br><span>${escapeHtml(entry.label)} · ${escapeHtml(entry.enemyName)}</span></li>`).join("")
    : "<li>현재 출현 매핑 없음</li>";
  return `
    <article class="index-card" data-tone="${escapeHtml(monster.tone)}" data-type="${escapeHtml(monster.type)}" data-new="${monster.isNewExpansionId ? "1" : "0"}" data-search="${escapeHtml(`${monster.id} ${monster.name} ${monster.tone} ${monster.form} ${monster.icon} ${monster.usageSummary}`)}">
      ${monsterCard(monster)}
      <ul>${usage}</ul>
    </article>`;
}

function toneOptionsHtml() {
  return stats.tones.map((tone) => `<option value="${escapeHtml(tone)}">${escapeHtml(tone)}</option>`).join("");
}

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>원정대 몬스터 출현 위치 확인표</title>
  <style>
    :root {
      color-scheme: light;
      --ink:#172033;
      --muted:#607086;
      --line:#d8e0eb;
      --panel:#ffffff;
      --bg:#eef3f8;
      --accent:#218f7f;
      --accent-2:#d45069;
    }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial, "Noto Sans KR", sans-serif; }
    header { position:sticky; top:0; z-index:5; background:#172033; color:white; padding:18px 22px; box-shadow:0 8px 24px #1720332b; }
    h1 { margin:0 0 8px; font-size:24px; letter-spacing:0; }
    header p { margin:0; color:#d8e0eb; font-size:13px; }
    main { width:min(1500px, 100%); margin:0 auto; padding:20px; }
    .stats { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:10px; margin-bottom:16px; }
    .stat { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; }
    .stat span { display:block; color:var(--muted); font-size:12px; }
    .stat strong { display:block; margin-top:5px; font-size:24px; }
    .toolbar { display:grid; grid-template-columns:minmax(220px,1fr) 170px 150px 130px; gap:10px; margin:16px 0; }
    input, select { width:100%; border:1px solid var(--line); border-radius:8px; padding:11px 12px; color:var(--ink); background:white; font:inherit; }
    .tabs { display:flex; gap:8px; margin:18px 0 12px; flex-wrap:wrap; }
    .tabs button { border:1px solid var(--line); background:white; color:var(--ink); border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; }
    .tabs button.active { background:var(--accent); border-color:var(--accent); color:white; }
    section { display:none; }
    section.active { display:block; }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    table { width:100%; border-collapse:collapse; }
    th, td { border-bottom:1px solid var(--line); padding:12px; text-align:left; vertical-align:top; }
    th { position:sticky; top:80px; z-index:2; background:#f8fafc; font-size:12px; color:#42526a; }
    tr.hidden, .index-card.hidden { display:none; }
    small { color:var(--muted); }
    .pill { display:inline-block; margin:2px 4px 2px 0; padding:5px 8px; border-radius:999px; background:#eef6f4; color:#16695e; font-size:12px; font-weight:700; }
    .pill.danger { background:#fff0f2; color:#a32942; }
    .monster-list { min-width:420px; }
    .monster-card { display:inline-grid; grid-template-columns:64px minmax(0, 1fr); gap:9px; align-items:center; width:230px; min-height:78px; margin:3px; padding:7px; border:1px solid #dce4ee; border-radius:8px; background:#f9fbfe; vertical-align:top; }
    .monster-card img { width:64px; height:64px; object-fit:contain; image-rendering:auto; border-radius:6px; background:#111827; }
    .monster-card strong, .monster-card span, .monster-card small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .monster-card span { color:#42526a; font-size:12px; font-family:Consolas, monospace; }
    .monster-card small { font-size:11px; }
    .index-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(310px,1fr)); gap:12px; }
    .index-card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px; }
    .index-card .monster-card { width:100%; margin:0 0 8px; }
    .index-card ul { margin:0; padding-left:20px; }
    .index-card li { margin:7px 0; color:#42526a; }
    .index-card li strong { color:var(--ink); }
    .note { color:#607086; font-size:13px; margin:8px 0 18px; }
    @media (max-width: 860px) {
      main { padding:12px; }
      .stats { grid-template-columns:repeat(2, minmax(0,1fr)); }
      .toolbar { grid-template-columns:1fr 1fr; }
      th { top:88px; }
      table { min-width:900px; }
      .panel { overflow:auto; }
    }
  </style>
</head>
<body>
  <header>
    <h1>원정대 몬스터 출현 위치 확인표</h1>
    <p>생성 기준: ${escapeHtml(stats.generatedAt)} · <code>data/expedition_stages.json</code>, <code>data/expedition_bosses.json</code>, <code>data/professional_sprite_manifest.json</code></p>
  </header>
  <main>
    <div class="stats">
      <div class="stat"><span>전체 몬스터</span><strong>${stats.monsterCount}</strong></div>
      <div class="stat"><span>일반 몬스터</span><strong>${stats.mobCount}</strong></div>
      <div class="stat"><span>보스 몬스터</span><strong>${stats.bossCount}</strong></div>
      <div class="stat"><span>일반 Stage</span><strong>${stats.stageCount}</strong></div>
      <div class="stat"><span>Boss Stage</span><strong>${stats.bossStageCount}</strong></div>
      <div class="stat"><span>신규 ID</span><strong>${stats.newExpansionIdCount}</strong></div>
    </div>
    <p class="note">신규 ID는 이번 확장으로 추가된 <code>mob-4..6</code>, <code>boss-1..2</code> 계열이다. 기존 ID도 새 생성 기준으로 재생성되어 같은 품질 게이트를 통과한다.</p>
    <div class="toolbar">
      <input id="search" type="search" placeholder="챕터, 스테이지, 몬스터명, asset id 검색">
      <select id="tone"><option value="">전체 tone</option>${toneOptionsHtml()}</select>
      <select id="type"><option value="">전체 타입</option><option value="stage">일반 Stage</option><option value="boss">Boss Stage</option><option value="mob">일반 몬스터</option><option value="bossMonster">보스 몬스터</option></select>
      <select id="newOnly"><option value="">전체</option><option value="1">신규 ID만</option><option value="0">기존 ID만</option></select>
    </div>
    <nav class="tabs">
      <button class="active" data-tab="stages">스테이지별</button>
      <button data-tab="bosses">보스별</button>
      <button data-tab="monsters">몬스터별 역색인</button>
    </nav>
    <section id="stages" class="active">
      <div class="panel">
        <table>
          <thead><tr><th>챕터</th><th>구간</th><th>화면 적 이름</th><th>출현 몬스터 asset</th></tr></thead>
          <tbody>${stageRows.map(stageRowHtml).join("")}</tbody>
        </table>
      </div>
    </section>
    <section id="bosses">
      <div class="panel">
        <table>
          <thead><tr><th>챕터</th><th>보스</th><th>화면 적 이름</th><th>출현 보스 asset</th></tr></thead>
          <tbody>${bossRows.map(bossRowHtml).join("")}</tbody>
        </table>
      </div>
    </section>
    <section id="monsters">
      <div class="index-grid">${monsterRows.map(monsterIndexHtml).join("")}</div>
    </section>
  </main>
  <script>
    const controls = {
      search: document.querySelector("#search"),
      tone: document.querySelector("#tone"),
      type: document.querySelector("#type"),
      newOnly: document.querySelector("#newOnly"),
    };
    const tabs = Array.from(document.querySelectorAll(".tabs button"));
    function activeTabId() {
      return document.querySelector(".tabs button.active")?.dataset.tab || "stages";
    }
    function applyFilters() {
      const query = controls.search.value.trim().toLowerCase();
      const tone = controls.tone.value;
      const type = controls.type.value;
      const newOnly = controls.newOnly.value;
      const current = activeTabId();
      const rows = current === "monsters"
        ? Array.from(document.querySelectorAll("#monsters .index-card"))
        : Array.from(document.querySelectorAll("#" + current + " tbody tr"));
      rows.forEach((row) => {
        const search = (row.dataset.search || row.textContent || "").toLowerCase();
        const rowTone = row.dataset.tone || "";
        const rowType = row.dataset.type || "";
        const rowNew = row.dataset.new || "";
        const cards = Array.from(row.querySelectorAll(".monster-card"));
        const hasNewCard = cards.some((card) => card.dataset.new === "1");
        const hasOldCard = cards.some((card) => card.dataset.new === "0");
        const typeOk = !type
          || rowType === type
          || (current === "stages" && type === "mob")
          || (current === "bosses" && type === "bossMonster")
          || (type === "bossMonster" && rowType === "boss")
          || (type === "mob" && rowType === "mob");
        const newOk = !newOnly || rowNew === newOnly || (newOnly === "1" && hasNewCard) || (newOnly === "0" && hasOldCard);
        row.classList.toggle("hidden", Boolean(query && !search.includes(query)) || Boolean(tone && rowTone !== tone) || !typeOk || !newOk);
      });
    }
    tabs.forEach((button) => {
      button.addEventListener("click", () => {
        tabs.forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll("main > section").forEach((section) => section.classList.toggle("active", section.id === button.dataset.tab));
        applyFilters();
      });
    });
    Object.values(controls).forEach((control) => control.addEventListener("input", applyFilters));
  </script>
</body>
</html>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(htmlPath, html, "utf8");

console.log(`EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=${stats.monsterCount} stageKinds=${stats.stageMonsterKinds} bossKinds=${stats.bossMonsterKinds}`);
console.log(htmlPath);
