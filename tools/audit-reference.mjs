import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const referencePath = resolve("reference/Student-Idle-RPG-mobile-3.html");
const outPath = resolve("docs/reference_html_audit.json");
const expectedHash = "b1c4ec10c24c1f106b0dd75676646ba0c24455c350ee06afe13090918df0321c";

const checklist = {
  top_level_chrome: ["디버그 메뉴", "상점", "설정", "학생", "원정대", "좌우 스와이프"],
  player_status: ["과정", "초등학교 1학년", "나이", "보유금", "다이아", "공부량"],
  battle_arena: ["12개월 전투", "학년고사장", "학년 제한시간", "자동 분배", "전투 완료", "일반", "보스"],
  tabs: ["성장", "시험", "동료", "직장", "교육", "결과", "도감"],
  growth: ["보유 공부량", "누적 공부량", "처치한 책", "학습 도우미", "전투력", "교육 성장 배율", "자동 투자 비율", "직접 설정", "합계", "최대"],
  education: ["조기교육", "선행학습", "사립초 전학", "사립중 전학", "특목고 전학", "논술 스튜디오", "과학 탐구반", "N수 과외", "진로 컨설팅"],
  shop: ["SHOP", "보유 다이아", "로봇 도우미", "다이아 한 줌", "모의고사 다이아 상자", "결제 준비중", "패키지", "패스", "광고"],
  settings: ["MENU", "자동 저장", "계정 / 저장", "알림", "사운드 / 조작", "성능", "지원", "위험 구역", "저장 초기화"],
  debug: ["DEBUG", "데이터 관리", "다이아 +10K", "동료 랜덤 +1", "동료 랜덤 +5", "현재 결과 재계산", "세이브 내보내기", "세이브 불러오기", "세이브 JSON"],
};

const html = readFileSync(referencePath, "utf8");
const hash = createHash("sha256").update(html).digest("hex");
const result = {
  reference: {
    path: relative(process.cwd(), referencePath).split(sep).join("/"),
    size_bytes: Buffer.byteLength(html),
    sha256: hash,
    hash_matches_expected: hash === expectedHash,
  },
  checklist: {},
  missing: [],
};

for (const [group, labels] of Object.entries(checklist)) {
  result.checklist[group] = {};
  for (const label of labels) {
    const count = html.split(label).length - 1;
    result.checklist[group][label] = count;
    if (count === 0) result.missing.push({ group, label });
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

if (!result.reference.hash_matches_expected) {
  console.error(`HASH_MISMATCH ${hash}`);
  process.exitCode = 1;
}

console.log(`AUDIT_OK hash=${hash} missing=${result.missing.length}`);
