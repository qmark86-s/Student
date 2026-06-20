# Student Idle RPG Codex Handoff

Last updated: 2026-06-16
Workspace: `C:\Users\idopa\Documents\Student`

이 문서는 다른 로컬 Codex에서 같은 프로젝트를 이어받기 위한 인수인계 문서다. 대화 원문 전체를 그대로 복사한 로그가 아니라, 지금까지 합의한 기획 의도, 구현 상태, 밸런스 결정, 검증 결과, 주의사항을 빠르게 복원하기 위한 작업용 컨텍스트다.

## One-Line Goal

Android 세로형 모바일 방치 RPG + 학생 성장/입시/직업 결과 시뮬레이션 프로토타입을 TypeScript + Vite + React + JSON 데이터 테이블 기반으로 검증한다. 추후 Java 프로토타이핑이나 Godot 이식 가능성을 염두에 둔다.

## User Direction

- 언어/톤: 한국어로 대화한다.
- 게임 방향: 방치형 RPG의 보는 재미와 인생 결과 시뮬레이션의 장기 성장감을 섞는다.
- 화면: 모바일 세로 기준. 상단에는 캐릭터/전투 장면, 하단에는 관리 UI.
- 비주얼: 도트/복셀 느낌. 마인크래프트나 도트 방치형 감성. 너무 시뮬레이션 화면처럼 밋밋하면 안 된다.
- 스테이지 실패: 사실상 실패 없음. 제한 시간 안에 많이 물리친 만큼 더 성장하는 인플레이션 구조.
- 성장: 스탯이 자동으로 직접 오르는 게 아니라, 웨이브/시험으로 얻은 공통 공부량 포인트를 수동으로 찍거나 자동 균등 분배한다.
- 밸런스 방향: 무과금/무교육/무동료 자동 진행만으로는 시간이 갈수록 밀리는 게 맞다. 다만 N수는 현실처럼 성적 상승 기대가 있어야 하고, 낮은 확률의 대박 운으로 상위권/1위권도 가능해야 한다.
- 대학/직업/대사/비주얼은 더미 느낌을 줄이고 데이터 테이블로 관리한다.
- 검수는 냉정하게 한다. MCP를 활용했으면 끝에 정량적으로 사용량을 명시한다.

## Current Tech Stack

- React 19
- TypeScript
- Vite
- JSON data tables + JSON schema
- CSS-only pixel/voxel-style scene
- No external image assets

Important commands:

```bash
npm run dev
npm run build
npm run build:share
npm run validate:data
npm run test -- --run
npm audit --audit-level=moderate
```

## Current Sharing Build

친구들에게 공유할 단일 HTML 파일:

```text
C:\Users\idopa\Documents\Student\share\Student-Idle-RPG-mobile.html
```

Regenerate it with:

```bash
npm run build:share
```

Notes:

- JS/CSS가 HTML 내부에 inline으로 합쳐진 단일 파일이다.
- 모바일에서 카톡/메신저 미리보기로 열면 스크립트가 막힐 수 있다.
- 가장 안정적인 방식은 받은 파일을 Chrome/Safari 같은 브라우저로 직접 여는 것이다.
- 더 확실한 외부 테스트가 필요하면 이 파일을 정적 호스팅에 올려 링크로 공유하는 게 좋다.

주의: Codex 답변에서 절대 파일 경로를 Markdown 링크로 클릭하면 Codex 앱이 비정상 종료될 수 있었다. 다른 Codex에서는 파일 경로를 일반 텍스트로 안내하는 편이 안전하다.

## Game Structure

### Courses

- 초등학교 1~6학년
- 중학교 1~3학년
- 고등학교 1~3학년
- 이후 최대 40수까지 N수 과정

### Subjects

- 초등: 국어, 영어, 수학
- 중등 이후: 국어, 영어, 수학, 사회, 과학

### High School Track

- 고등학교에서는 누적 성장과 적성을 기반으로 문과/이과가 결정된다.
- 고1 때는 변경 가능.
- 고2부터는 고정.

### Exams

- 시험 게이트: 3월, 6월, 9월, 12월.
- 고3/재수 수능은 결과 결정 보스전.
- 수능 결과는 성적표 팝업으로 표시한다.
- 성적표에는 전국 석차, 상위 비율, 종합 등급, 과목별 등급/표준점수 또는 원점수가 표시된다.
- 성적표 팝업에서 진학 확정 또는 N수 선택을 할 수 있다.

## Core Idle Loop

- `1분 = 1달 웨이브` 구조.
- 월간 웨이브는 책/시험지 적을 처치하는 식으로 표현된다.
- 처치량에 따라 공부량 포인트를 획득한다.
- 자동 분배 ON이면 현재 학년 과목에 균등 투자된다.
- 자동 분배 OFF이면 포인트가 쌓이고, 사용자가 과목별 `+1`, `+10`, `최대`로 투자한다.
- 시험 전 멈추기 기본 ON.
- 큰 수 표기: `K`, `M`, 이후 `A`, `AB`, `AC` 계열.

## Snowball Model

현재 구현 기준으로 오프라인 보상은 공부량이 아니라 돈만 정산한다.

- 오프라인 수입 = 직장 배치 동료의 분당 수입
- 한도 = `balance.offlineIncomeCapHours`, 현재 12시간
- 예: 시작 동료 `첫 담임 선생님`을 직장에 배치하면 분당 4원, 12시간 풀 정산 시 2,880원
- 동료를 직장에 배치하지 않으면 오프라인 수입은 0원

스노우볼 흐름:

```text
오프라인 수입
-> 교육 업그레이드 구매
-> 이후 월간 웨이브 공부량 획득 증가
-> 현재 학년 스탯 상승
-> 학년 종료 시 스탯 일부가 적성으로 압축
-> 다음 학년/중등/고등/N수 시험과 생산에 약하게 반영
```

장기 압축:

- `aptitudeCarryoverRate`: 현재 0.08
- 학년 종료 시 현재 과목 스탯의 8%가 적성으로 넘어간다.
- 학년이 바뀌면 현재 지식 스탯은 리셋되고, 적성만 남는다.
- 따라서 초등 때 잘 키우면 초5/초6은 수월해지고 중등 이후에도 영향이 남지만, 그대로 무한 증폭되지는 않는다.

## Companions

동료 상태:

- 대기
- 학습 도우미
- 직장

학습 도우미:

- 최대 3명
- 동료 스탯의 기본 10%가 현재 학생에게 반영된다.
- 상단 장면에 실제 helper sprite로 렌더링된다.
- 직업별 helper sprite, battle prop, aura color, support role을 `careers.json`에서 관리한다.

직장:

- 기본 1명 배치 가능
- 최대 5명까지 확장 가능
- 직장 동료는 실시간/오프라인 돈을 벌어온다.
- 과정 종료 시 직장 동료만 나이를 먹는다.
- 대기/학습 도우미는 나이를 먹지 않는다.
- 60세 은퇴 시 도감으로 이동한다.

## N수 Balance

N수는 다음 구조로 분리되어 있다.

Data table:

```text
src\data\retake_curve.json
```

Key fields:

- `firstRetakePowerBonus`
- `bonusDecay`
- `fatiguePressurePerRetake`
- `fatigueExponent`
- `agePressurePerYear`
- `agePenaltyStart`
- `opportunityCostPressure`
- `displayScoreBonusPerPower`
- `displayScorePenaltyPerPressure`
- `luckVarianceMultiplier`
- `miracleChance`
- `miracleRankIndexBonusMin`
- `miracleRankIndexBonusMax`
- `miracleScoreBonusMin`
- `miracleScoreBonusMax`

Current intent:

- 고3 첫 수능보다 1수에서 어느 정도 성적 상승 가능.
- 52위권에서 33위권 정도로 올라가는 건 사용자가 납득.
- 다만 선형으로 계속 오르면 안 된다.
- 2수 이후는 보너스 체감 + 피로/나이/기회비용으로 조정된다.
- 상위권/1위권은 하드 차단하지 않는다.
- 낮은 확률의 `miracleChance`로 대박 운을 허용한다.

Current default:

- 수능 대박 운: `miracleChance: 0.006`
- 모의고사 대박 운: `miracleChance: 0.001`
- 테스트는 2,000회 샘플에서 중앙값은 30위권 밖, top 5/서울대권은 낮은 확률로 가능하도록 검증한다.

## Ranking / Score Formula

현재 등수 산식은 표시 점수와 내부 등수 지표를 분리했다.

Concept:

```text
powerIndex = log10(현재 시험 전투력 / 시험 난이도)
competitionIndex = 기대 경쟁선 + 학년 압박 + N수 보정
performance = powerIndex - competitionIndex
rankIndex = performance + 운 + 희귀 대박 운 보너스
rank = rankIndex를 sigmoid로 300,000명 석차에 매핑
score = 표시용 점수, 0~1000 clamp
```

Why:

- 이전에는 점수를 0~1000으로 먼저 clamp하고 그 점수로 등수를 계산해서 상단/하단이 뭉개졌다.
- 지금은 내부 `rankIndex`로 등수를 계산하고, 표시 점수는 별도로 보기 좋게 clamp한다.

관련 데이터:

- `balance.rankPopulation`: 300000
- `balance.scoreLuckWeight`
- `balance.rankLuckWeight`
- `balance.rankIndexFloor`
- `balance.rankIndexCeiling`
- `rank_curve.json`
- `retake_curve.json`

## Universities

사용자가 제공한 54개 대학 순위 테이블을 사용한다. 50개가 아니라 54개다.

Lines:

- 특: 1개
- 1: 4개
- 2A: 3개
- 2B: 4개
- 2C: 5개
- 3A: 6개
- 3B: 6개
- 3C: 4개
- 4A: 11개
- 4B: 10개

Data:

```text
src\data\universities.json
```

Rules:

- 전국 수험생 300,000명 기준.
- 합격권은 `adjustedRank <= minNationalRank`.
- 계열 선호에 따라 조정석차가 변한다.
- 무투자 자동 고3 수능은 하위 20위권에 머무는 방향.
- 무투자 1수는 어느 정도 상승 가능.
- 낮은 확률로 top-tier breakthrough 가능.

## Careers / Outcomes

대학 진학 확정 시:

- 직업 후보가 계산된다.
- 가장 높은 후보가 직업으로 확정된다.
- 회차가 종료된다.
- 해당 직업 동료가 추가된다.
- 다음 회차 시작 시 동료로 활용 가능하다.

직업 테이블:

```text
src\data\careers.json
```

직업 테이블은 결과 계산뿐 아니라 연출에도 쓰인다.

- `helperSprite`
- `battleProp`
- `auraColor`
- `dialogueTags`
- `supportRole`

## Dialogues / Visual Presets

Dialogue table:

```text
src\data\dialogues.json
```

Visual presets:

```text
src\data\visual_presets.json
```

학교급별 장면:

- 초등: 밝은 교실, 작은 책/받아쓰기장 적
- 중등: 칠판/사물함 배경, 과목별 노트 적
- 고등: 야자/모의고사 분위기, 두꺼운 문제집 적
- N수: 독서실/스터디카페, 기출/수능 봉투 적

## Debug / Save Sync

디버그 메뉴가 추가되어 있다.

기능:

- 데이터 동기화
- 현재 결과 재계산
- 세이브 JSON 내보내기
- 세이브 JSON 불러오기
- 저장 초기화

Save versioning:

- `schemaVersion`: 저장 구조 버전
- `version`: balance version
- `contentRevision`: JSON 콘텐츠 전체 hash

출시 전에는 데이터가 계속 바뀔 수 있기 때문에, 콘텐츠 변경만으로 자동 초기화하지 않는다. 대신 디버그 메뉴에서 수동 동기화한다.

## Data Validation

Validation command:

```bash
npm run validate:data
```

Validates 13 data tables.

추가된 검증:

- JSON schema 타입 검증
- 대학 `id` 중복 검증
- 대학 `gameRank` 중복 검증
- 대학 `gameRank` 1..N 연속성 검증
- 대학 `minNationalRank` 비내림차순 검증
- 대학 `minScore` 비오름차순 검증
- 라인별 개수 검증
- 총 대학 수 검증
- rank curve 중복 검증
- retake curve exam reference 검증
- retake curve miracle min/max 검증

## Tests

Test command:

```bash
npm run test -- --run
```

현재 17개 테스트 통과.

주요 테스트:

- 월간 웨이브 진행 및 공부량 지급
- 수동 분배와 과목 투자
- 시험 게이트 일시정지
- 초1부터 수능까지 자동 진행
- 첫 무투자 시험 1등 방지
- 무투자 자동 진행 시 학년이 오를수록 등수 하락
- 교육/학습 도우미 투자 시 동일 구간 개선
- 학습 도우미 라벨/비주얼 데이터
- 54개 대학 컷 + 무투자 하위권
- N수 반복이 선형 상승하지 않는지
- 1수 대박 운으로 상위권 돌파 가능하지만 낮은 확률인지
- 학년 전환 시 적성 압축
- 교육 업그레이드 레벨/비용/회차 초기화
- 오프라인 수입
- 직장 동료 나이/은퇴
- N수 40회 cap
- stale save sync

## Important Files

```text
src\App.tsx
src\styles.css
src\game\simulation.ts
src\game\types.ts
src\game\content.ts
src\game\save.ts
src\game\simulation.test.ts
scripts\validate-data.mjs
scripts\build-share-html.mjs
src\data\balance.json
src\data\rank_curve.json
src\data\retake_curve.json
src\data\universities.json
src\data\careers.json
src\data\dialogues.json
src\data\visual_presets.json
share\Student-Idle-RPG-mobile.html
```

## Current Verification Status

최근 확인한 명령:

```bash
npm run build:share
npm run validate:data
npm run test -- --run
npm audit --audit-level=moderate
```

브라우저 확인:

- 공유 HTML을 로컬 HTTP로 서빙해 모바일 폭에서 렌더링 확인.
- `한 달 진행` 버튼 클릭 시 1월에서 2월로 진행 확인.
- 가로 overflow 없음.

Note: Browser MCP는 `file://` 직접 접근이 정책상 차단되어, 로컬 HTTP 서버로 확인했다.

## Known Caveats

- 단일 HTML 파일은 브라우저 직접 열기 권장. 메신저 앱 내부 미리보기는 스크립트 차단 가능.
- 현재 오프라인 보상은 돈만 준다. 공부량 오프라인 진행은 아직 구현하지 않았다.
- 사용자 질문상 “초5 4월에 오프 후 보상” 시, 실제로는 직장 동료 수입만 정산되고, 그 돈으로 교육을 사야 성장 스노우볼이 생긴다.
- Codex 앱에서 절대 파일 경로 Markdown 링크를 클릭하면 문제가 생길 수 있었다. 일반 텍스트 경로로 안내하라.
- Git 상태는 최초 생성형 프로젝트처럼 대부분 untracked일 수 있다.

## Suggested Next Work

1. 모바일 공유 안정화
   - 단일 HTML 외에 정적 호스팅 배포 옵션 추가
   - QR 코드 생성
   - 친구 피드백 폼 또는 로그 export

2. 오프라인 성장 설계
   - 현재는 오프라인 돈만 있음
   - 사용자가 원하면 오프라인 시간으로 월간 웨이브 일부 자동 진행을 추가할 수 있음
   - 단, 스노우볼이 커지므로 cap/휴식 피로/월 제한 필요

3. 밸런스 리포트 UI
   - 디버그 메뉴에서 무투자/교육/동료/N수 시뮬레이션 결과 분위수 표시
   - 평균, 중앙값, p90, p99, 서울대 확률 표시

4. 대학/직업 콘텐츠 확장
   - 직업 더 추가
   - 대학별 선호 계열/직업 결과 강화
   - 직업 도우미 말풍선 추가

5. Android packaging
   - 현재는 웹앱 단일 HTML
   - Android 대상이면 Capacitor/TWA/WebView wrapper 검토 가능
   - Godot 이식 전 데이터/밸런스 구조 검증용으로 유지

## Paste This To New Codex

새 로컬 Codex에서 시작할 때 이렇게 말하면 된다.

```text
C:\Users\idopa\Documents\Student 프로젝트를 이어서 작업하고 싶어.
먼저 CODEX_HANDOFF.md를 읽고, 현재 구현/기획/검증 상태를 파악해줘.
그 다음 npm run validate:data, npm run test -- --run, npm run build를 돌려 현재 상태를 확인해줘.
이 프로젝트는 모바일 세로형 학생 방치 RPG 프로토타입이고, 데이터 테이블 기반 밸런스/공유용 단일 HTML 빌드가 중요해.
```
