# Student 프로젝트 LLM 브리프

이 문서는 다른 LLM에게 Student 프로젝트 맥락을 빠르게 전달하기 위한 요약이다. 질문이나 작업을 넘길 때 이 파일 내용을 먼저 제공하면 된다.

## 한 줄 요약

Student는 웹 기반 방치형 학생 성장 RPG를 모바일 APK로 출시하기 위한 프로젝트다. 현재 active 앱 라인은 React/Vite이며, Capacitor가 `dist/`의 React 빌드를 Android APK로 감싸는 구조다. 기존 snapshot/reference 실행 라인은 저장소에서 제거되었다.

## 현재 개발 기준

- 모든 답변, 문서, 사용자-facing 설명은 한국어가 기준이다.
- 절대 경로를 코드/문서/스크립트에 고정하지 않는다. 프로젝트 루트 상대 경로, 설정값, 환경 변수, 인자를 우선한다.
- 개발 중 fallback은 최소화한다. 깨진 세이브, 누락 JSON, 알 수 없는 ID, 누락 자산은 조용히 기본값으로 덮지 말고 fatal 화면, assert, smoke 실패, 검증 실패로 드러낸다.
- 런타임에 임의 자산을 생성하지 않는다. 데이터와 자산은 `data/`, `assets/visual-source/`, `src/snapshot/assets/`와 생성 스크립트 흐름으로 명시 준비한다.
- 작업 시작 시 항상 `git status --short`로 dirty 범위를 확인한다. 다른 LLM이나 사용자의 기존 변경을 되돌리지 말고, 필요한 파일만 읽고 좁게 수정해야 한다.

## 실행 라인

- React/Vite 앱 라인
  - 앱 루트는 `src/react/`, 빌드 산출물은 `dist/`.
  - `npm run build:web`은 시각 자산을 갱신한 뒤 React 앱을 `dist/`로 빌드한다.
  - Capacitor APK는 같은 `dist/`를 `webDir`로 사용한다.
  - React는 기존 `data/*.json`과 `src/snapshot/assets/`를 직접 읽는다.
  - 핵심 문서는 `docs/react-vite-parity-migration.md`.

- Snapshot/reference archive
  - 과거 단일 HTML 원본, 추출 산출물, snapshot build/patch 도구는 저장소에서 제거했다.
  - `src/snapshot/assets/`는 현재도 React 공용 자산 루트다.
  - snapshot build/reference refresh 명령은 active workflow에 없다.

- Android/APK 라인
  - Capacitor 설정은 `capacitor.config.json`.
  - 앱 ID는 `com.qmark86.studentidlerpg`, 앱 이름은 `Student Idle RPG`, webDir은 `dist`.
  - 관련 문서는 `docs/mobile-apk-workflow.md`.

## 주요 코드 구조

- `src/react/App.jsx`
  - React 화면 전체, 헤더, 모드 탭, 학생 탭, 원정대 탭, 부동산 탭, 상점/디버그/설정 모달을 연결한다.
  - 부동산 성장 PNG와 건물 PNG는 `import.meta.glob`로 명시 로드한다.

- `src/react/game/save.js`
  - localStorage key는 `student-idle-rpg-save-v1`.
  - React save schema는 6이다.
  - 세이브가 없을 때만 새 게임을 만들고, 깨진 세이브는 fatal load 화면으로 보낸다.

- `src/react/game/battleRoad.js`
  - 학생 Battle Road 조우, 자동 전투, N수/수능 루프, 결과 후보, 직업 수락, 교과 공격 VFX를 담당한다.

- `src/react/game/expedition.js`
  - 직업 동료 기반 원정대, 5인 파티, 실시간 역할 전투, 자동 정산, 즉시/pending 보상, stage 진행, 성장 투자, 승급 합성, 파견/의뢰를 담당한다.

- `src/react/game/realEstate.js`
  - 부동산 설정 검증, 기본 상태, 임대수익, 원정대 즉시/pending 부동산 자금 지급, 구매, 랭킹 보상, view model을 담당한다.

- `src/react/game/assets.js`
  - 학생, 직업 동료, 학습 도우미, 원정대 적의 개별 4프레임 PNG를 안전하게 로드한다.

## 핵심 데이터 규모

- 직업: `data/careers.json` 62개
- 대학: `data/universities.json` 54개
- 학생 성장 레벨: `data/growth_levels.json` 600개
- 원정대: 챕터 10개, stage 100개, 보스 100개, 직업 역할 전투 스탯 62개, 일반/보스 전투 enemy 설정 각 100개, 유닛 레벨 600개, 파견 의뢰 12개
- 비주얼 아틀라스: `data/visual_assets.json` 5개
- 부동산: 매물 10개, 규모 티어 6개, 랭킹 보상 6개, 도시 지역 10개
- 부동산 건물 PNG: 84개
- 부동산 상세 성장 PNG: 10개 지역별 권장 단계 수를 `real_estate_district_growth_assets.json` v2의 `minOwnedCount -> file` 테이블로 관리

## 시스템별 구현 요약

### 학생 / Battle Road

- 학생은 초등~고등/N수 흐름으로 성장한다.
- 전투는 Battle Road 조우 상태인 `current.road`와 `current.battle`에 저장된다.
- 기본 학교 과정은 4조우, N수 과정은 학교 4조우 뒤 수능 4조우로 이어진다.
- 수능 마지막 조우 후 결과 패널을 열고 `careers.json` 전체 직업 후보를 표시한다.
- 직업 수락 후 동료, 히스토리, 로그, 원정대 파티가 저장되고 새 회차는 E1 Battle Road에서 시작한다.
- 교과 공격 VFX는 `data/curriculum_attack_vfx.json`과 `data/battle_road_config.json`의 presentation 설정을 따른다.

### 학생 하단 탭

- 성장, 동료, 시험, 직장, 교육, 결과, 도감 7개 탭이 있다.
- 시험 탭은 compact `battle-summary-panel`, 적 카드, HP bar 기준이다.
- 성장 탭의 자동 투자 비율은 기본 접힘 패널이며, 보유/누적/처치/장비/교육 같은 요약 라벨은 짧게 유지한다.
- 직장 탭은 동료 수입, work slot, 직업 카드 목록을 표시하며 기본 `workSlots`는 5다. 요약 수입 카드와 졸업생 목록이 기준이며 같은 수입 정보를 별도 카드로 반복하지 않는다.
- 교육 탭은 9개 교육 액션, 비용, 잠금, 현재/다음 효과를 표시하고 업그레이드가 save와 성장 배율에 반영된다. 카드 안 효과 문구는 `현재 → 다음` 수치 중심으로 축약한다.
- 도감 탭은 회차 기록, 직업 기록 62개 카드, 은퇴 도감 효과 4종을 표시한다. 직업별 과목 분배 가이드는 카드별 `세부` 접힘으로 노출한다.

### 직업 동료 / 상점 / 디버그

- 로봇 도우미는 학생 Battle Road 학습 도우미로만 쓰고 원정대 파티 후보가 아니다.
- DEBUG로 추가하는 직업 동료만 원정대 파티 후보가 된다.
- 상점은 React 현재 기준 `다이아 / 보유금 / 로봇 / 광고 / 패키지 / 패스` 탭을 유지한다.
- QA/DEBUG 버튼은 `?qaTools=1` 또는 `student-react-qa-tools-v1=1`에서만 노출한다.

### 원정대

- 원정대는 직업 동료 5인 파티 기반이며 `data/expedition_*` JSON을 읽는다.
- 전투 밸런스는 `data/expedition_combat_balance.json`이 기준이며 직업별 `tank/dealer/healer`, HP, 공격, 방어, 회복, 공속을 명시한다.
- 원정대 전투 동료는 전투장 왼쪽 하단에 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 보여야 한다.
- 파티 슬롯은 검증 폭 전체에서 `3+2`, 성장/파티 후보/동료 관리 카드는 5명 기준 `2+2+1` 또는 2열 카드 그리드를 유지한다.
- 파티 탭 슬롯 순서는 `save.expedition.partyMemberIds`와 상단 전투장 `unit-1`~`unit-5` 배치 순서의 단일 기준이다. 파티 슬롯은 드래그앤드롭으로 서로 교체할 수 있고, 1번은 앞 슬롯이다. 순서 교체는 탭 전환 없이 전투장 아군 배치를 즉시 갱신하며, 슬롯은 약 0.5초 진행 bar, 전투장 캐릭터는 위치 이동 transition을 보여준다.
- 전투는 결정론적 실시간 이벤트 시뮬레이션이며 같은 시각 행동은 아군 슬롯, 적 배열 순서로 처리한다.
- 탱커/딜러는 공격하고 힐러는 앞쪽부터 HP가 빠진 아군을 회복한다. 몬스터는 파티 앞 슬롯부터 공격한다.
- 앱 로드/복귀 정산은 최대 8시간까지 처리하되 한 번에 480전투까지만 계산하고, 보상은 `save.expedition.pendingReward`에 누적한다.
- 실행 중 1초 주기 자동 전투와 수동 `돌파` 보상은 즉시 지급하고 compact 보상 연출만 표시한다.
- 보스 첫 클리어는 다이아/EXP와 `claimedBossStages`를 기록하며, 이미 claim된 보스는 다이아를 중복 지급하거나 pending에 누적하지 않는다.
- 보스 패배는 해당 구간 첫 stage로 회귀하고, 일반 stage 패배는 현재 stage를 유지한다.
- 오프라인 pending 보상의 EXP/부동산 자금/다이아는 보상 팝업의 `받기` 수령 시 실제 재화로 지급된다.
- 파티/관리 목록에는 역할 필터가 있고, `추천 편성`은 전투력순 상위 5명을 편성한다.
- 원정대 관리 탭은 `성장 / 파티 / 의뢰 / 대원 관리 / 기록` 순서다.
- 의뢰 데이터는 `data/expedition_dispatches.json` 기준이며 30분/2시간/6시간/12시간 band에서 로컬 날짜 `YYYY-MM-DD` 기준 각 1개씩, 총 4개를 결정론적으로 노출한다.
- 파견은 동시에 2개까지 진행 가능하고 의뢰당 1~3명을 투입한다. 진행 중 또는 완료 후 미수령 대원은 파티 편성, 추천 편성, 합성 재료에서 제외되며 보상 수령 전까지 귀환하지 않은 것으로 본다.
- 추천 직업/역할은 실패 조건이 아니라 확정 보상 보너스다. 추천 직업은 2점, 추천 역할은 1점이며 배율은 `1 + min(0.30, matchScore * 0.05)`로 계산한다.
- 파견 `추천 선택`은 최대 파견 인원까지 최선 후보를 자동 선택한다. 의뢰 카드는 기본 요약 상태로 접고 `세부`에서 추천/준비중 보상/대원 선택을 펼친다.
- 대원/직업 선택처럼 항목이 늘어나는 UI는 내부 세로 스크롤과 공통 정렬 버튼을 우선 적용한다. 설명문이 긴 UI는 요약 카드와 접힘 상세 영역으로 나누고, 반복 수치/문구는 카드 목적에 맞게 줄인다.
- 원정대 기록의 마지막 전투 이벤트, 학생 성장의 투자 비율, 도감의 과목 분배 가이드처럼 보조 정보는 `CompactDisclosure` 패턴으로 접는다. 핵심 상태와 즉시 행동은 접힌 상태에서도 유지한다.
- v1 실제 지급 보상은 원정대 EXP, 다이아, 부동산 자금만 처리한다. 테크트리 포인트, 유물, 원정대 뽑기권은 UI에 `준비중`으로 표시하되 저장/지급하지 않는다.

### 부동산

- 상단 모드 탭은 `학생 / 원정대 / 부동산` 3개다.
- 부동산 전용 재화는 기존 보유금/다이아와 분리된 `부동산 자금`이다.
- 데이터는 다음 JSON들이 기준이다.
  - `data/real_estates.json`
  - `data/real_estate_scale_tiers.json`
  - `data/real_estate_balance.json`
  - `data/real_estate_rank_rewards.json`
  - `data/real_estate_city_layout.json`
  - `data/real_estate_district_assets.json`
  - `data/real_estate_building_assets.json`
  - `data/real_estate_district_growth_assets.json`
- 도시 전체 보기에서는 `visual-real-estate-city-map.png` 위에 10개 지역 버튼과 PNG 건물 슬롯을 표시한다.
- 지역 상세 화면은 런타임 DOM 건물 오버레이를 쓰지 않고 `src/snapshot/assets/real-estate-district-growth/`의 baked PNG를 구매 수량 기준으로 교체한다.
- 각 지역은 도시 overview용 16개 건물 슬롯을 가진다. 상세 성장 PNG와 다음 부동산 해금은 지역별 `maxOwnedCount` 및 `minOwnedCount` 테이블 기준이다.
- 상세 pad는 `data/real_estate_district_assets.json`의 지역별 `detailPads` 배열로 관리하며, `npm run real-estate:building-assets`(= `tools/generate-real-estate-building-assets.py`) 생성기가 건물 PNG와 이 파일을 만든다(별도 presets 파일은 없다). 이 생성기는 소스 시트가 바뀔 때 수동으로 실행하며 build/verify 파이프라인에는 포함하지 않는다.
- 일반 주간 보상은 주간 자산 증가량 조건을 만족할 때 수령 가능하며 같은 주차 중복 수령을 막는다.

### 비주얼 자산

- 핵심 문서는 `docs/visual_asset_production.md`와 `docs/asset_sprite_factory.md`.
- 학생/직업 동료/학습 도우미/원정대 몬스터는 형광 초록 배경의 원본 PNG 시트에서 전처리한다.
- 학생 원본은 `4 columns x 1 row`, 오른쪽 방향, 캐릭터 1명당 1장이다.
- 직업 동료/학습 도우미 원본은 `4 columns x 2 rows`, 남/여 행을 가진다.
- 원정대 몬스터 원본은 `4 columns x 1 row`, 왼쪽 방향이다.
- 정규화 프레임은 160x160, `centerX=80`, `baselineY=151`, 상하 alpha 여백 8px 이상 기준을 따른다.
- 자산 변경 후 최소 검증은 `npm run asset:factory:prepare`, `npm run asset:factory:qa`, `npm run verify:mobile`이다.

## 검증 명령

자주 쓰는 명령:

```powershell
npm run real-estate:verify
npm run expedition:dispatch-verify
npm run real-estate:growth-assets
npm run react:verify
npm run react:real-estate-smoke
npm run react:real-estate-visual-audit
npm run react:real-estate-pixel-audit
npm run react:responsive-audit
npm run mobile:smoke
npm run verify
npm run verify:mobile
rg -n '\?\?|fallback|Fallback|unknown' src/react -S
git diff --check
```

문서 기준 최신 통과 기록:

- 2026-06-30 학생/원정대 UI 밀도 개선 기준 `npm run react:build`, `npm run react:records-smoke`, `npm run react:education-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:verify`, `npm run verify:mobile`, `mcp__UmgMcp.project_policy_gate` strict, `git diff --check`가 통과했다.
- 2026-06-30 원정대 파견/의뢰 v1.2 UI 밀도 개선 기준 `npm run expedition:dispatch-verify`, `npm run react:save-smoke`, `npm run react:expedition-rules-smoke`, `npm run react:expedition-smoke`, `npm run react:verify`, `npm run verify:mobile`, `git diff --check`, `mcp__UmgMcp.project_policy_gate` strict가 통과했다.
- 2026-07-01 원정대 파티 순서 드래그 교체 기준 `npm run react:build`, `npm run react:expedition-smoke`, `npm run react:verify`, `npm run verify:mobile`, `git diff --check`, `mcp__UmgMcp.project_policy_gate` strict가 통과했다.
- 이후 워킹트리에 변경이 추가되어 있을 수 있으므로 새 작업 후에는 관련 검증을 다시 실행해야 한다.

## MCP / 자동화 메모

- MCP 표면은 작업 환경마다 다를 수 있으므로 `tool_search`와 사용 가능한 MCP 도구 목록을 매 작업 시점에 확인한다.
- Student 자체는 웹/Capacitor 프로젝트이므로 일반 구현은 저장소의 `tools/`와 `package.json` 스크립트가 기준이다.
- MCP 도구 표면을 바꾸는 작업을 할 때만 manifest/capabilities, 직접 호출 smoke, 관련 Python/PowerShell helper 검증을 추가로 수행한다.
- 기존 문서에는 `mcp__UmgMcp.project_policy_gate` strict 통과 기록이 있다. 단, 현재 작업 환경에서 해당 도구가 호출 가능한지와 실제 scan 범위는 매번 확인해야 한다.

## 다른 LLM에게 주는 작업 지침

- 먼저 `git status --short`를 보고 기존 dirty 변경을 절대 되돌리지 않는다.
- `/plans/<기능 이름>/plan.md`를 만들거나 갱신한 뒤 구현한다.
- 구현 후 plan을 다시 읽어 빠진 항목이 없는지 확인한다.
- 검증 후 `/implementations/<기능 이름>/implementation.md`에 변경 파일, 동작 기준, 검증 결과를 기록한다.
- 기존 구현을 바꿨으면 관련 문서와 검증 기준도 함께 최신화한다.
- 부동산/스프라이트/React smoke처럼 데이터와 검증이 강하게 묶인 영역은 코드만 고치지 말고 JSON, 생성 스크립트, smoke/audit까지 같은 범위로 본다.
- fallback으로 문제를 숨기지 않는다. 누락 리소스는 실패하게 두고 정식 데이터, 프리로드, 자산 연결로 고친다.

## 바로 참고할 구현 문서

- `implementations/react-vite-parity-migration/implementation.md`
- `implementations/react-vite-no-fallback-hardening/implementation.md`
- `implementations/real-estate-tab/implementation.md`
- `implementations/real-estate-city-map/implementation.md`
- `implementations/real-estate-building-polish/implementation.md`
- `implementations/real-estate-pad-placement-polish/implementation.md`
- `implementations/real-estate-baked-growth-backgrounds/implementation.md`
- `implementations/real-estate-resource-quality-audit/implementation.md`
- `implementations/asset-sprite-factory/implementation.md`
- `implementations/expedition-dispatch-requests/implementation.md`

## 작업 시작용 짧은 프롬프트

```text
이 프로젝트는 Student 웹/Capacitor 방치형 학생 RPG입니다. 먼저 docs/llm_project_brief.md, AGENTS.md, README.md를 읽고, git status --short로 기존 dirty 범위를 확인하세요. 기존 변경은 되돌리지 말고, /plans/<기능>/plan.md 작성 후 구현, 검증, /implementations/<기능>/implementation.md 기록까지 진행하세요. 개발 중 fallback으로 누락 데이터/자산을 숨기지 말고, React/Vite가 active 앱 라인이며 data/*.json과 src/snapshot/assets/를 직접 읽는다는 전제로 작업하세요.
```
