# React/Vite 병행 이식 계획

## 목표

현재 단일 HTML snapshot 앱을 깨뜨리지 않고 React/Vite 기반 앱을 병행 구축한다. 기존 `data/`, `src/snapshot/assets/`, 검증 스크립트를 기준 자산으로 삼아 단계별로 화면과 동작을 이식하고, 전환 전까지 snapshot 빌드는 계속 출시 가능한 백업선으로 유지한다.

## 1차 범위

- 기존 기준 앱은 `npm run verify:mobile` 통과 상태로 유지한다.
- 새 Vite 루트는 `src/react/`에 둔다.
- 새 산출물은 `dist-react/`에 생성해 기존 Capacitor `dist/`와 충돌하지 않게 한다.
- `data/*.json`과 `src/snapshot/assets/`를 직접 import해 첫 화면의 구조, 모바일 비율, 전투 화면, 성장 패널을 React 컴포넌트로 재현한다.
- 새 앱 검증 명령을 추가한다.
  - `npm run react:build`
  - `npm run react:smoke`
  - `npm run react:save-smoke`
  - `npm run react:battle-smoke`
  - `npm run react:expedition-smoke`
  - `npm run react:records-smoke`
  - `npm run react:education-smoke`
  - `npm run react:shop-debug-smoke`
  - `npm run react:responsive-audit`
  - `npm run react:parity-audit`
  - `npm run react:interactive-parity`
  - `npm run react:hotspot-crop`
  - `npm run react:deep-parity`
  - `npm run react:verify`

## 이식 원칙

- snapshot 앱의 `build:web`, `verify:mobile`, `cap:sync` 흐름은 변경하지 않는다.
- 새 React 앱은 기능이 완전히 동등해지기 전까지 Capacitor `webDir`로 사용하지 않는다.
- 세이브 데이터, 전투 진행, 상점/결제, 광고, 디버그 메뉴는 별도 차수에서 이식한다.
- 데이터나 자산 누락은 임의 fallback으로 숨기지 않고 smoke 실패로 드러낸다.
- 모바일 화면 기준은 기존 `artifacts/mobile-smoke/phone-standard.png`와 `visual:smoke` 메트릭을 우선 비교 기준으로 둔다.

## 차수

1. 병행 기반 구축
   - React/Vite 의존성과 빌드 설정 추가
   - 첫 화면 UI 컴포넌트화
   - 데이터/자산 import와 smoke 검증 추가

2. 상태/세이브 모델 이식
   - 기존 localStorage/save JSON 구조 분석
   - React reducer/store 설계
   - 기존 save 읽기/쓰기 호환성 테스트

3. 학생 Battle Road 이식
   - 학년/수능 조우 생성
   - 전투 phase, 자동 전투, DEBUG 개발 동작 분리
   - curriculum attack VFX 연결

4. 원정대/동료/직업 이식
   - 원정대 stage, party, enemy sprite 연결
   - 직업 수락 후 동료 등록과 companion sprite 연결

5. 상용 QA gate 정리
   - production debug 차단

6. 시험/직장/도감 상태 패널
   - 시험 결과, 동료 직장 수입, 회차 기록 표시
   - placeholder 제거 여부와 저장 상태 표시 smoke 추가

7. 교육 상태 패널
   - `data/education_actions.json` 기준 교육 목록, 비용, 잠금 조건, 성장 배율 표시
   - 교육 업그레이드 저장과 성장 패널 배율 반영 smoke 추가

8. snapshot 시각 parity 감사
   - React 전투장 DOM을 snapshot의 `stage-scene`/`pixel-arena`/atlas 구조에 맞춘다.
   - snapshot `dist/`와 React `dist-react/`를 같은 뷰포트에서 캡처하고 좌표/픽셀 차이를 리포트한다.
   - strict 모드는 별도 환경 변수로 켜며, 기본은 회귀 추적용 audit으로 둔다.

9. 상용 릴리스 전환
   - 개인정보/결제/광고 정책 확정
   - AAB/서명/스토어 빌드 설정
   - Capacitor `webDir` 전환

10. 상단 기능/도우미/디버그 parity 보강
   - 상단 디버그 메뉴, 상점, 설정 버튼을 React 모달에 연결한다.
   - 상점의 로봇 도우미 호출과 보유금 교환을 save 상태에 반영한다.
   - 학생 Battle Road에 활성 학습 도우미를 별도 편대로 표시한다.
   - DEBUG 메뉴의 다이아 지급, 직업 동료 랜덤 +1/+5, 세이브 내보내기/불러오기를 연결한다.
   - 로봇 도우미는 학생 학습 도우미로 유지하고, DEBUG 직업 동료만 원정대 파티에 편성한다.
   - 상점/도우미/디버그/원정대 편성 smoke를 추가한다.

11. 상점/가챠/설정/디버그 원본 HTML 표면 parity
   - 현재 화면의 snapshot HTML을 기준으로 상점 탭 순서, 상품명, 배지, 보상 문구, 버튼 문구를 React 데이터와 맞춘다.
   - shop/settings/debug 모달 shell, header, 지갑/status summary, category tabs, product card 고정 높이를 snapshot CSS 기준으로 맞춘다.
   - 로봇 뽑기 결과 팝업의 등급명, 로봇 이름, 판매가 요약, 확인 버튼 구조를 snapshot HTML 기준으로 맞춘다.
   - 설정/디버그 summary의 콘텐츠 리비전 표기와 메뉴 항목을 snapshot HTML 기준으로 맞춘다.
   - 기존 기능 동작은 유지하면서 `react:shop-debug-smoke`, `react:responsive-audit`, strict parity audit이 다시 통과하도록 검증 기준을 갱신한다.

12. 모달 live UI 정밀 parity 감사
   - 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 normalized text 외에 screenshot diff와 핵심 selector computed style/rect를 함께 기록한다.
   - 로봇 뽑기 팝업은 snapshot 마지막 CSS 규칙의 backdrop, popup, stage ring, robot part, confirm button 값을 React override에 맞춘다.
   - 뽑기 팝업 캡처는 클릭 직후가 아니라 등장 애니메이션 settle 이후 상태를 기준으로 비교한다.
   - blur/anti-aliasing으로 발생하는 미세 픽셀 차이는 `changedPixels`와 별도로 threshold 기반 지표를 기록해 과장된 회귀 신호를 분리한다.

13. 학생/원정대 live parity 및 no-fallback 재정리
   - 학생 자동 전투 tick, 적 HP, 보상, 성장 투자 값을 `data/student_progression_balance.json` 기준으로 데이터화한다.
   - 원정대 전투 동료는 왼쪽 하단에서 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로, 파티 슬롯은 모든 검증 폭에서 3+2 그리드로 표시한다.
   - React 검증 seed는 최신 저장 스키마 2 전체 원정대 필드를 명시하고, snapshot 비교 도구만 원본 HTML용 schema 1 seed를 별도로 주입한다.
   - QA 자동 전투 정지는 `?pauseAutoBattle=1`에서만 동작하게 분리하여 `?qaTools=1` live parity가 자동 전투를 숨기지 않게 한다.
   - `src/react` 런타임에서 `??`, `fallback`, `Fallback`, `unknown` 검색 결과 0건을 유지한다.

## 완료 기준

- `npm run react:verify`가 통과한다.
- 기존 `npm run verify:mobile`이 계속 통과한다.
- React 앱은 320x568, 360x740, 390x844, 412x915, 430x932, 768x1024, 844x390, 1280x720 뷰포트에서 가로 overflow 0을 유지한다.
- 첫 화면에 학생/원정대 탭, 전투 arena, Auto 버튼, 성장 패널, 자동 투자 슬라이더가 렌더링된다.
- production 기본 화면에는 DEBUG 버튼이 노출되지 않고, QA 플래그에서만 DEBUG 전투 완료 버튼이 렌더링된다.
- 상단 상점에서 로봇 도우미 호출이 가능하고, 획득한 로봇 도우미는 학생 Battle Road와 성장 패널 학습 도우미 수치에 반영된다.
- 상단 디버그 메뉴에서 다이아 +10K, 동료 랜덤 +1/+5, 세이브 내보내기/불러오기가 동작한다.
- DEBUG로 추가한 직업 동료는 원정대 파티에 자동 편성되고 원정대 stage 돌파에 사용할 수 있다.
- 상점 탭 순서는 snapshot 기준 `다이아 / 보유금 / 로봇 / 광고 / 패키지 / 패스`이며, 로봇 탭의 1회/10+1 호출 상품과 가챠 결과 문구가 원본 HTML과 일치한다.
- `react:deep-parity`에서 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 normalized text가 일치하고 핵심 selector `styleDiffs`와 설정 모달 SVG `svgDiffs`가 0건이어야 한다.
- `react:interactive-parity`에서 학생 7개 탭, 상점/설정/디버그, 원정대 성장/파티/동료 관리/기록/편성 조작이 failure 0건이어야 한다.
- 설정/디버그 summary는 snapshot 기준 콘텐츠 리비전과 legacy save 상태를 표시한다.
- Battle Road smoke에서 기본 조우, N수 4조우, 수능 4조우, 결과 패널이 통과한다.
- 원정대 smoke에서 직업 수락, 동료 등록, 파티 편성, stage 표시, stage 돌파 저장이 통과한다.
- records smoke에서 시험/직장/도감 탭이 placeholder 없이 저장 상태 기반 카드로 렌더링된다.
- records smoke에서 시험 탭은 `battle-summary-panel`, `battle-enemy-card`, 몬스터 이미지, HP bar와 compact 높이를 검사한다.
- education smoke에서 9개 교육 액션, 잠금 상태, 비용, 업그레이드 저장, 성장 배율 반영이 통과한다.
- 원정대 전투 화면 동료는 일렬 배치나 3명 가로줄이 아니라 전투장 왼쪽 하단에서 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 보여야 하며, 원정대 파티 슬롯은 모든 검증 폭에서 3+2 줄바꿈을 유지해야 한다.
- 원정대 성장/파티 후보/동료 관리 카드 목록은 5명 기준 2+2+1 카드 그리드를 유지해야 한다.
- parity audit에서 390x844, 412x915의 phone/header/status/battle/tabs/active panel 좌표가 snapshot과 일치한다.
- `REACT_PARITY_STRICT=1` 기준 캡처 고정 상태에서 390x844, 412x915 모두 `diffPercent 0`, `meanAbsDiff 0`을 유지한다.
- 구현 설명서는 `/implementations/react-vite-parity-migration/implementation.md`에 작성한다.

## 1차 결과

- `src/react/` 기반 React/Vite 라인을 추가했다.
- `dist-react/` 산출물을 기존 `dist/`와 분리했다.
- `npm run react:verify` 통과.

## 2차 결과

- 기존 save key를 `student-idle-rpg-save-v1`로 확인했다.
- `src/react/game/save.js`에 schema v1 save 어댑터를 추가했다.
- React 첫 화면이 회차, 과정, 재화, 공부량, 학습 도우미, 자동 투자 값을 save에서 읽도록 연결했다.
- DEBUG/Auto 버튼이 localStorage에 변경 사항을 다시 저장하도록 연결했다.
- `npm run react:save-smoke`를 추가하고 `react:verify`에 포함했다.
- `npm run react:verify` 통과.

## 3차 결과

- `src/react/game/grades.js`, `assets.js`, `battleRoad.js`로 학년 해석, 자산 로딩, Battle Road 진행을 분리했다.
- React 전투장이 `current.road`/`current.battle` 기반으로 학년 4조우와 수능 4조우를 렌더링한다.
- 학생 스프라이트는 학년/성별별 개별 PNG 4프레임을 로드한다.
- 전투 몬스터는 `grade_visuals.json`, `visual_assets.json`, `asset-003.png`를 기준으로 표시한다.
- 교과 공격 VFX는 `curriculum_attack_vfx.json`에서 현재 학년/대상 과목 토큰을 선택한다.
- 결과 탭에 수능 결과, N수 선택, `careers.json` 전체 직업 후보와 동료 초상 자산을 연결했다.
- `npm run react:battle-smoke`를 추가하고 `react:verify`에 포함했다.

## 4차 결과

- `src/react/game/expedition.js`로 원정대 stage, 파티, 전투력, 보상, 진행 저장 모델을 분리했다.
- 직업 수락 시 `alumni-*` 동료를 등록하고 `state.expedition.partyMemberIds`에 자동 편성한 뒤 다음 회차 E1 Battle Road로 돌아가게 했다.
- 원정대 화면을 placeholder에서 실제 arena로 교체하고, 동료/원정대 적 4프레임 PNG를 로드하도록 연결했다.
- 동료 탭에 등록된 직업 동료 카드와 초상 자산을 표시했다.
- `npm run react:expedition-smoke`를 추가하고 `react:verify`에 포함했다.
- `npm run react:verify` 통과.

## 5차 결과

- `src/react/game/debugTools.js`에 QA 도구 노출 gate를 추가했다.
- React production 빌드 기본 화면에서는 `.battle-debug-complete` / `DEBUG` 버튼이 렌더링되지 않게 했다.
- `?qaTools=1` 또는 `student-react-qa-tools-v1=1` localStorage 플래그가 있을 때만 DEBUG 전투 완료 버튼을 노출한다.
- `react:smoke`는 production 기본 화면에서 DEBUG 미노출을 검증한다.
- `react:save-smoke`와 `react:battle-smoke`는 명시적 QA URL로 열어 기존 전투 진행 검증을 유지한다.
- `npm run react:verify` 통과.
- `npm run verify:mobile` 통과.
- 구현 설명서와 사용 문서를 작성했다.

## 6차 결과

- 시험 탭을 `current.examResults`, `current.road`, `current.examIndex` 기반 패널로 교체했다.
- 직장 탭을 `companions`, `workSlots`, `incomePerMinute`, `powerMultiplier` 기반 패널로 교체했다.
- 도감 탭을 `history`, `archive`, `careers.json` 기반 회차/직업 기록 패널로 교체했다.
- `tools/react-vite-records-smoke.mjs`를 추가하고 `react:verify`에 포함했다.
- `npm run react:records-smoke` 통과.

## 7차 결과

- `src/react/game/education.js`로 교육 액션 조건, 비용, 효과, 성장 배율 계산을 분리했다.
- 교육 탭을 placeholder에서 9개 교육 카드와 업그레이드 버튼으로 교체했다.
- 교육 업그레이드가 `current.educationLevels`, `money`, `log`에 저장되고 성장 패널의 `교육 성장 배율`에 반영되게 했다.
- Battle Road 공부량 보상에 교육 성장 배율을 반영했다.
- `tools/react-vite-education-smoke.mjs`를 추가하고 `react:verify`에 포함했다.

## 8차 결과

- React 전투장을 snapshot의 `stage-scene`/`pixel-arena`/`battle-scene-lineup` 구조와 atlas 기반 학생/몬스터 표시로 재정렬했다.
- 성장 패널을 과목 반복 카드로 바꾸고 snapshot 기준 기본 표시값, 요약 카드, 탭 높이/간격을 맞췄다.
- 기본 전투 시작 상태를 snapshot 기준인 `road-travel`/VFX 0개로 맞췄다.
- 초등 과정 성장 카드는 snapshot처럼 국어/영어/수학 3개만 표시하고, 자동 투자 슬라이더는 5과목을 유지한다.
- 전투 적 라인업에 snapshot의 `encounterPackTravel`/`encounterPackApproach` 이동 애니메이션과 road timing CSS 변수를 연결했다.
- 상단 아이콘 SVG 크기, stroke, 경로, 버튼 class를 snapshot 기준으로 고정했다.
- snapshot에 없는 React 전투장 부모 pseudo-frame을 제거하고, 성장 패널의 snapshot형 summary/buff/investment/stat-line 구조를 맞췄다.
- 헤더 제목은 snapshot과 같은 텍스트 노드 분리 형태로 정규화하고, 1/32px 단위의 폰트 shaping 차이를 보정했다.
- 성장 버튼은 snapshot 기준 중앙 정렬을 명시했고, 탭/활성 패널은 snapshot의 `management-panel` 배경층과 같은 wrapper 구조로 맞췄다.
- `tools/react-vite-visual-parity-smoke.mjs`를 추가해 `dist/`와 `dist-react/`를 390x844, 412x915에서 캡처 비교한다.
- parity audit은 `Math.random=0.25`를 주입하고 기본적으로 애니메이션을 첫 프레임 pause 상태로 비교한다. 실제 live 비교가 필요하면 `REACT_PARITY_FREEZE_ANIMATIONS=0`으로 실행한다.
- `npm run react:parity-audit` 결과 좌표는 두 뷰포트 모두 phone/header/status/battle/tabs/active panel이 일치한다.
- 2026-06-24 strict audit 기준 412x915, 390x844 모두 `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`이다.
- 최신 `artifacts/react-vite-parity/report.json`은 diff PNG 경로, `bbox`, `hotspots`를 기록하며 두 viewport 모두 `bbox: null`, `hotspots: []`이다.
- `npm run react:verify`, `npm run verify:mobile`, `$env:REACT_PARITY_STRICT='1'; npm run react:parity-audit` 통과. 캡처 고정 기준의 첫 화면 픽셀 parity는 완료 상태다.

## 10차 결과

- `src/react/game/companions.js`를 추가해 로봇 도우미, 직업 동료, 상점 상품, 등급/전투력 계산을 분리했다.
- 상단 디버그 메뉴, 상점, 설정 버튼을 React 모달로 연결했다.
- 상점 로봇 탭에서 로봇 도우미 1회/10+1 호출을 수행하고, 다이아 차감/뽑기 결과/학습 도우미 편대/성장 패널 전투력 반영을 연결했다.
- 상점 보유금 교환 상품은 상태 갱신 경로를 마련했고, 결제/광고/패키지류는 명시적으로 준비중 상태로 남겼다.
- 로봇 도우미는 학생 Battle Road 학습 도우미로만 표시하고, 원정대 파티에는 편성하지 않도록 분리했다.
- DEBUG 메뉴의 다이아 +10K, 동료 랜덤 +1/+5, 데이터 동기화, 세이브 내보내기/불러오기 UI를 연결했다.
- DEBUG로 추가한 직업 동료 5명은 원정대 파티에 자동 편성되고 원정대 stage 돌파에 사용된다.
- `tools/react-vite-shop-debug-smoke.mjs`를 추가해 상점 도우미 호출, 도우미 sprite 로드, 동료 탭 표시, DEBUG 동료 +5, 원정대 편성/돌파를 검증한다.
- `tools/react-vite-responsive-audit.mjs`를 추가해 8개 viewport에서 기본/전투/상점 뽑기/원정대 디버그 흐름의 overflow, 버튼 텍스트, 이미지 로드, 프레임 위치를 검증한다.
- 짧은 가로 화면에서는 phone frame 높이를 viewport에 강제로 맞추지 않고 문서 스크롤로 접근하도록 보정했다.
- `npm run react:verify`, `npm run verify:mobile`, `$env:REACT_PARITY_STRICT='1'; $env:REACT_PARITY_MAX_DIFF_PERCENT='0'; $env:REACT_PARITY_MAX_MEAN_ABS_DIFF='0'; npm run react:parity-audit` 통과.

## 11차 결과

- snapshot HTML의 상점 데이터 기준으로 React 상점 탭 순서를 `다이아 / 보유금 / 로봇 / 광고 / 패키지 / 패스`로 맞췄다.
- 로봇 상품을 원본의 `로봇 도우미 1회 호출`, `로봇 도우미 10+1회`와 동일한 이름/배지/보상/버튼 문구로 교체했다.
- 로봇 뽑기 카탈로그와 등급 라벨/판매가/문구를 snapshot bundle 기준으로 옮겨 `Math.random=0.25`에서 `HB-01 연필봇` 결과가 원본과 일치하게 했다.
- shop/settings/debug 모달 header, category tab, product card, gacha popup, primary/secondary action 스타일을 원본 HTML 표면에 맞췄다.
- 설정/디버그의 콘텐츠 리비전 표시는 원본처럼 fresh save와 legacy save를 구분하고, 데이터 동기화 전에는 legacy 상태가 숨겨지지 않게 했다.
- `tools/react-vite-ui-parity-deep-smoke.mjs`와 `npm run react:deep-parity`를 추가해 상점 6개 탭, 뽑기 팝업, 설정, 디버그 모달의 normalized text가 snapshot과 같은지 검증한다.
- `npm run react:deep-parity` 통과: 상점 6개 탭, 뽑기 팝업, 설정, 디버그 모두 `equal: true`.
- `npm run react:verify` 통과.
- `$env:REACT_PARITY_STRICT='1'; $env:REACT_PARITY_MAX_DIFF_PERCENT='0'; $env:REACT_PARITY_MAX_MEAN_ABS_DIFF='0'; npm run react:parity-audit` 통과.

## 12차 결과

- `tools/react-vite-ui-parity-deep-smoke.mjs`가 normalized text 외에 scenario별 screenshot diff, threshold diff, 핵심 selector computed style/rect diff를 기록하도록 확장했다.
- 로봇 뽑기 팝업의 backdrop blur, popup width/max-height, stage ring pseudo element, robot eye/body/arm, summary metric, result card, confirm button을 snapshot 마지막 CSS 규칙과 맞췄다.
- `.primary-action`/`.secondary-action` compact 버튼은 snapshot처럼 width 100%, padding 10px 12px, gap 7px, font-weight 900 기준을 유지하도록 보정했다.
- 뽑기 팝업 캡처는 gacha 결과 표시 후 900ms settle 상태로 비교해 등장 애니메이션 중간 프레임을 회귀로 오판하지 않게 했다.
- `npm run react:deep-parity` 통과: 상점 6개 탭, 뽑기 팝업, 설정, 디버그 모두 `equal: true`, 핵심 selector `styleDiffs: []`.
- `npm run react:verify`, `npm run verify:mobile`, strict `npm run react:parity-audit` 통과.

## 13차 결과

- `data/student_progression_balance.json` 기준으로 학생 자동 전투 tick, 전투 제한 시간, 적 HP/보상/트랙 가중치를 데이터화했다.
- `data/curriculum_attack_vfx.json`에 초1/초2 탐구 VFX token pool을 추가하고, 누락 시 fallback 없이 검증 실패로 드러나게 했다.
- 원정대 전투 동료 배치를 absolute 슬롯 기반 `2+2+1` 편대로 고정하고, 원정대 파티 슬롯을 모든 검증 폭에서 3+2 그리드로 맞췄다.
- 시험/직장/교육/결과/도감 탭의 원본 HTML 텍스트와 빈 상태 차이를 보정했다.
- `?qaTools=1`과 `?pauseAutoBattle=1`을 분리해 QA 메뉴 노출과 자동 전투 정지를 독립시켰다.
- React smoke seed를 schema 2 전체 원정대 저장 형태로 갱신했고, snapshot 비교 도구는 원본 HTML 전용 schema 1 seed와 React schema 2 seed를 분리했다.
- `src/react` 런타임 검색 `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건을 확인했다.
- 2026-06-24 기준 `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:deep-parity`, `npm run curriculum-vfx:verify` 통과.

## 13차 보강 결과

- 최신 사용자 요청에 따라 원정대 파티 슬롯은 원본 HTML의 5열 배치가 아니라 3+2 배치를 정답으로 고정했다.
- 원정대 동료 관리 카드의 상태 배지와 잠금 버튼 위치를 명시 배치해 버튼 세로 늘어짐과 `잠금` 줄바꿈을 제거했다.
- `react:responsive-audit`는 원정대 전투 화면에서 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 동료 세로 밴드가 모두 `2+2+1`이고, 원정대 파티 탭 슬롯 행 분포가 모두 `3+2`임을 확인한다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` no-fallback 문자열 검색을 통과했다.

## 14차 결과

- 학생 `직장` 탭의 기본 빈 상태를 원본 HTML의 compact `income-panel`/`secondary-action`/`empty-state` 표면과 맞췄다.
- 신규 React save의 기본 `workSlots`를 원본 HTML과 같은 5로 정렬했다.
- `react:interactive-parity` 기준 `student-직장` visual diff가 `41.27%`에서 `1.7543%`로 감소했다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:records-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` no-fallback 문자열 검색을 통과했다.

## 15차 결과

- 학생 `교육` 탭의 카드 행을 원본 HTML `.education-row` 표면과 맞췄다.
- 교육 목록 gap 8px, 카드 높이 71px, 버튼 74x34px, 설명 텍스트 11.52px/400 회색 기준을 React CSS에 반영했다.
- 모바일 media override가 교육 카드와 버튼을 다시 키우지 않도록 정리했다.
- `react:interactive-parity` 기준 `student-교육` visual diff가 `33.2367%`에서 `1.7112%`로 감소했다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:education-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` no-fallback 문자열 검색을 통과했다.

## 16차 결과

- 학생 `도감` 탭의 요약 패널을 원본 HTML `panel accent-panel income-panel` 기반 compact metric 구조로 복구했다.
- 은퇴 도감 효과를 원본 `.collection-bonus-panel` / `.collection-effect-item` 기준 4열 타일과 track/fill 막대로 맞췄다.
- 직업 목록을 원본 `.career-card` 구조로 바꿔 초상, 상태, 메타칩, disabled `분배 가이드`, 과목 bar를 렌더링한다.
- 직업 카드 초상은 개별 PNG `img`가 아니라 원본 HTML과 같은 `visual-careers.png` atlas 배경 `span.career-emblem.career-portrait.career-<id>` 구조로 복구했다.
- `tools/react-vite-records-smoke.mjs`가 도감 직업 카드 62개, 효과 타일 4개, 요약/효과 패널 높이를 검사하도록 강화했다.
- `tools/react-vite-interactive-parity-audit.mjs`가 학생 `시험`/`도감` selector evidence를 `selectorMetrics`, `selectorDiffs`로 기록한다.
- `react:interactive-parity` 기준 `student-도감` visual diff가 `41.0343%`에서 `2.3125%`로 감소했고, activePanel diff가 `2.0875%`에서 `1.2597%`로 감소했다.
- 최신 `react:interactive-parity` 기준 `student-시험`과 `student-도감` selector diff는 모두 0건이다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:records-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색을 통과했다.

## 17차 결과

- 원정대 전투 동료 편대를 리더 중심 `2+2+1` 세로 밴드로 바꿔 작은 화면에서도 한 줄처럼 보이지 않게 했다.
- 원정대 성장/파티 후보/동료 관리 목록을 세로 한 줄 리스트에서 2열 카드 그리드로 바꿨다.
- `tools/react-vite-responsive-audit.mjs`가 전투 동료 세로 밴드 3개 이상, 한 밴드 최대 2명, 성장/파티 후보/동료 관리 카드 행 분포 `2+2+1`을 검사하도록 강화했다.

## 21차 결과
- 원정대 전투 동료가 두 줄이더라도 사선 한 줄처럼 읽히지 않도록 좌표를 재조정했다.
- 뒤 2명, 중간 2명, 앞 리더 1명으로 동료를 분리 배치했다.
- `react:responsive-audit`의 원정대 전투 동료 기준을 세로 밴드 3개 이상, 한 밴드 최대 2명, 세로 폭 52px 이상으로 바꿨다.
- `npm run react:build`와 `npm run react:responsive-audit`를 재실행했으며, 8개 viewport failure 0건을 확인했다.
- 최신 세로 밴드는 `phone-narrow`/`phone-parity`/`tablet-portrait`/`landscape-small` 모두 `2+2+1`이다.

## 22차 결과
- `react:interactive-parity`에 전체 diff와 별도로 `scene`, `activePanel` 영역 diff 기록 기준을 문서화했다.

## 23차 결과
- 최신 사용자 요청에 따라 원정대 전투 동료가 3명 가로줄처럼 읽히던 배치를 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 변경했다.
- `tools/react-vite-responsive-audit.mjs`는 이제 전투 동료를 `2+3` 고정 행으로 보지 않고, 세로 밴드 3개 이상·한 밴드 최대 2명·세로 폭 52px 이상 기준으로 검사한다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:expedition-smoke`, `npm run react:records-smoke`, `npm run react:interactive-parity`를 통과했다.
- `src/react` no-fallback 문자열 검색 결과 0건, `git diff --check` 공백 오류 0건을 확인했다.
- `artifacts/react-vite-interactive-parity/report.json`에서 학생 탭의 live battle scene 잔차와 하단 패널 UI 잔차를 분리해 확인할 수 있다.
- 최신 `npm run react:interactive-parity`는 23개 조작 시나리오 failure 0건이다.
- 원정대 탭의 큰 scene diff는 최신 사용자 요청에 따른 의도된 React 레이아웃 차이로 관리한다.
- `react:interactive-parity`의 첫 캡처는 원본/React Battle Road 적 수와 HUD 제한시간이 같은 안정 상태가 된 뒤 진행한다.
- 학생 시험 탭의 `react:records-smoke` 기준을 예전 `.exam-progress-card`에서 현재 원본형 `.battle-summary-panel`, `.battle-enemy-card`, `.battle-enemy-monster`, `.enemy-hp-bar` 구조로 갱신했다.
- `react:records-smoke`는 시험 요약 높이 64px, 적 grid 높이 56px를 확인한다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:records-smoke`, `npm run react:battle-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `src/react` no-fallback 문자열 검색을 통과했다.

## 24차 결과
- 원정대 전투 동료를 다시 확인해 일렬, 사선 한 줄, 3명 가로줄이 아닌 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 고정했다.
- `react:responsive-audit` 최신 리포트 기준 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`다.
- `tools/react-vite-responsive-audit.mjs`는 앞줄 밴드가 리더 1명이 아니면 실패한다.
- 같은 리포트 기준 파티 슬롯은 검증 대상 4개 viewport 모두 `3+2`, 성장/파티 후보/동료 관리 카드는 모두 `2+2+1`이다.
- 시험 탭은 적 카드 내부 selector evidence를 추가하고 sprite 톤/크기/제목 weight를 보정했다.
- 최신 `react:interactive-parity` 기준 `student-시험` selector diff는 0건, visual diff는 `0.3213%`, scene diff는 `0.6848%`, activePanel diff는 `0.1613%`다.
- 해당 보강 시점의 `react:interactive-parity` 기준 `student-도감` selector diff는 0건, visual diff는 `2.126%`, activePanel diff는 `0.9085%`였다.
- `npm run react:build`, `npm run react:records-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`를 통과했다.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용

## 25차 결과
- 최신 사용자 지적에 맞춰 원정대 전투 동료의 뒤/중간 줄을 위로 올려 하단 3명 가로줄처럼 읽히는 여지를 줄였다.
- 전면 리더는 하단 HUD와 겹치지 않게 유지하고, 세로 spread를 phone 계열 65.68px, tablet/landscape 68.8px로 확장했다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:expedition-smoke`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

## 26차 결과
- `react:interactive-parity`의 `visualRegions.scene.hotspots`, `visualRegions.activePanel.hotspots` 기록을 최신 리포트 기준으로 확인했다.
- 학생 탭은 selector diff 0건이며, activePanel diff는 `student-도감 0.9085%`가 가장 크다. top hotspot은 `x 352 / y 608 / threshold 346px`로 첫 직업 카드 상단 숫자 렌더링 영역에 걸린다.
- 다른 학생 탭 top hotspot은 주로 하단 탭 바로 아래 첫 32px band에 몰려 있으며, 최신 activePanel diff는 `student-성장 0.0611%`, `student-동료 0.1007%`, `student-시험 0.1613%`, `student-직장 0.179%`, `student-교육 0.1023%`, `student-결과 0.1172%`, `student-도감 0.1656%` 수준이다.
- 도감 하단 bar의 `careerWeightTrack`/`careerWeightFill` evidence를 추가했다. snapshot/React 모두 310개이며, 첫 40개 rect/style selector diff 0건이라 bar width/color 불일치가 아님을 확인했다.
- 원정대 탭의 큰 activePanel diff는 최신 사용자 요청에 따른 메뉴/카드/동료 배치 차이에서 나온다. 다음 차수에서 원정대는 “사용자 의도 차이”와 “원본 HTML parity 미달”을 selector evidence로 더 잘 분리한다.
- `npm run react:build`, `npm run react:interactive-parity`, `npm run react:responsive-audit`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

## 27차 결과
- 최신 사용자 지시에 따라 원정대 동료는 전투장과 하단 패널 모두 일렬 배치로 되돌리지 않는다.
- `react:interactive-parity` layout signature를 추가해 원정대 전투/파티/성장/후보/관리 카드의 행 분포를 snapshot과 React 각각 기록한다.
- React 기준 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보와 동료 관리는 2열 카드 그리드다.
- snapshot 기준 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 패리티 수정 목표가 아니라 의도된 차이로 분류했다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.
- `mcp__UmgMcp.project_policy_gate`는 pass이나 `scanned_files=0`이라, no-fallback 실제 근거는 `rg` 0건을 사용한다.

## 28차 결과
- `react:interactive-parity`에 원정대 active panel 제목, 전체 텍스트, 버튼 라벨, 주요 카드 텍스트를 기록하는 `semanticSignatures`를 추가했다.
- 최신 리포트 기준 원정대 성장/파티/동료 관리/기록의 `activePanelText`와 `activePanelButtons`는 snapshot/React가 일치한다.
- 대표 제목 `출전 동료 성장 0명 투자 가능`, `원정 파티 5/5`, `동료 관리`, `원정 기록`이 일치하고, 하단 메뉴 버튼도 `성장 / 파티 / 동료 관리 / 기록`으로 일치한다.
- 원정대 큰 visual diff는 텍스트/버튼 불일치가 아니라 의도된 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드 차이로 분류했다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `npm run react:expedition-smoke`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

## 29차 결과
- `tools/react-vite-hotspot-crop.mjs`와 `npm run react:hotspot-crop`를 추가해 interactive 리포트의 region hotspot을 PNG crop으로 확인할 수 있게 했다.
- 학생 `도감` activePanel hotspot은 weight bar가 아니라 첫 직업 카드의 `분배 가이드` 아이콘/텍스트 영역이었다.
- React 도감의 `분배 가이드` 아이콘을 원본 HTML과 같은 line 기반 SVG로 바꾸고, React 전용 SVG margin/vertical-align 보정을 제거했다.
- 해당 보강 시점의 `react:interactive-parity` 기준 `student-도감` selector diff는 0건이며, visual diff는 `2.126%`, activePanel diff는 `0.9085%`, mean absolute diff는 `0.4772`였다.
- 해당 보강 시점의 `react:hotspot-crop` 기준 top hotspot은 `x 352 / y 608 / threshold 346px`로, 첫 직업 카드 상단 `명성 88` 숫자 렌더링 잔차로 이동했다.
- 원정대 동료는 최신 사용자 요청대로 전투장 `2+2+1`, 파티 슬롯 `3+2`, 성장/관리 카드 2열 배치를 유지하며 일렬 배치로 되돌리지 않는다.
- `npm run react:build`, `npm run react:battle-smoke`, `npm run react:records-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

## 18차 결과

- 학생 `결과` 탭의 빈 상태와 수능 결과 대기 화면을 원본 HTML compact panel 구조에 맞췄다.
- 모바일 media override가 `.result-panel` padding을 다시 키우지 않도록 하단 parity 규칙에 결과 탭을 포함했다.
- 상단 첫 DEBUG/database 아이콘 버튼을 최신 원본 HTML의 상태별 색상 기준으로 맞췄다. 저장 데이터가 없는 첫 실행은 기본 `.icon-button`, 기존 save 로드 상태는 `.icon-button.alert`다.
- `react:interactive-parity` 기준 `student-결과` visual diff가 `8.416%`에서 `1.8629%`로 감소했고, mean absolute diff가 `1.7952`에서 `0.3039`으로 감소했다.
- `student-결과` activePanel diff는 `4.0448%`에서 `0.4029%`로 감소했다.
- 첫 화면 `00-initial`은 Battle Road 적 수와 HUD 제한시간이 같은 안정 상태를 기다린 뒤 캡처한다. 최신 visual diff는 `1.6234%`, activePanel diff는 `0%`다.
- 이후 전투 HUD 남은 시간 보강으로 원본/React 결과 탭 캡처 모두 `55초`를 표시한다. 결과 탭 padding 보정 뒤 남은 결과 탭 시각 차이는 live frame, sprite, progress bar와 소량의 렌더링 잔차가 중심이다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:records-smoke`, `npm run react:battle-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `src/react` no-fallback 문자열 검색을 통과했다.

## 19차 결과

- 학생 전투 HUD의 제한시간 숫자가 실제 남은 시간이 아니라 항상 전체 제한시간을 표시하던 문제를 수정했다.
- `BattleArena`의 `displayRemainingSeconds`를 `maxDurationMs - elapsedMs` 기준으로 계산해 원본 HTML처럼 진행 중 남은 초를 표시한다.
- `tools/react-vite-battle-road-smoke.mjs`에 자동 전투 live timer 검증을 추가했다.
- `react:battle-smoke` 기준 `elapsedMs: 1000`, `maxDurationMs: 60000`, HUD `59초`, 기대값 `59`를 확인했다.
- `react:interactive-parity` 기준 학생 탭 diff가 전반적으로 소폭 감소했다. `student-시험`은 전투 HUD 보강 직후 `2.647%`에서 `2.6263%`로 줄었고, 이후 시험 selector/패널 보정 당시값은 `1.7574%`였다. 전투 scene HP/VFX 보강 최신값은 `0.3213%`다. `student-결과`는 `3.8238%`에서 `1.8629%`로 줄었고, 결과 selector evidence 정합화 최신값은 `0.2951%`다.
- 2026-06-24 기준 `npm run react:verify`, `npm run react:interactive-parity`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` no-fallback 문자열 검색을 통과했다.

## 20차 결과

- 학생 `동료` 탭 빈 상태의 제목이 원본보다 아래로 밀리던 문제를 수정했다.
- `.companion-panel`에 `align-content: start`를 적용해 grid row가 남는 높이를 먹어 제목을 중앙으로 밀지 않게 했다.
- `react:interactive-parity`가 학생 관리 패널 제목 rect를 비교하도록 강화했다. 원정대 탭은 최신 사용자 요청으로 의도된 레이아웃 차이가 있으므로 이 제목 rect 비교 대상에서 제외한다.
- `student-동료` visual diff가 `2.357%`에서 `1.7131%`로 감소했고, `student-companion-after-debug` visual diff가 `2.296%`에서 `1.6521%`로 감소했다.
- 2026-06-24 기준 `npm run react:build`, `npm run react:interactive-parity`, `npm run react:verify`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` no-fallback 문자열 검색을 통과했다.

## 30차 결과

- 도감 직업 카드 header/초상/상태/weight text selector evidence를 보강하고, React 전용 weight value 정렬/색상 차이를 원본 HTML 기준으로 되돌렸다.
- `student-도감` 당시 visual diff는 `1.7317%`, activePanel diff는 `0.1656%`, mean absolute diff는 `0.2436`이며 selector diff는 0건이었다. 전투 scene HP/VFX 보강 이후 최신 visual diff는 `0.3207%`, scene diff는 `0.6755%`, activePanel diff는 `0.1656%`다.
- 최신 `react:hotspot-crop` 기준 top hotspot은 `x 704 / y 32 / threshold 280px`로 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
- 원정대 동료는 전투장 `2+2+1 / front 1`, 파티 슬롯 `3+2`, 성장 카드 5명 기준 `2+2+1`, 파티 후보/동료 관리 2열 카드 그리드를 유지한다. 전체 후보 10명에서 보이는 `2+2+2+2+2`는 2열 그리드의 여러 행이며 일렬 배치가 아니다.
- `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:hotspot-crop`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`를 통과했다.

## 31차 결과

- `react:deep-parity`에 selector별 `regionVisuals`와 32px hotspot evidence를 추가했다.
- gacha 내부 selector를 `metricLabel`, `metricValue`, `cardBadge`, `cardTitle`, `cardMeta`, `confirmIcon`, `confirmText`까지 확장했다.
- 최신 `npm run react:deep-parity`: 통과, failures 0건.
- gacha normalized text 일치, font/rendering 속성 포함 styleDiffs 0건, region rectMismatch 0건이다.
- 최신 기본 정적 animation 리포트 기준 gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이다.
- live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행한다. 이전 live settle 리포트 기준 gacha visual diff `26.2213%`, threshold diff `2.5024%`, top region `metricLabel` threshold diff `37.0982%`는 레이아웃 회귀가 아니라 animation/blur 잔차로 분류한다.
- freeze animation 모드는 등장 초기 프레임을 멈춰 좌표가 갈라지므로 최신 기준 리포트가 아니며, 최종 형태 확인에는 기본 정적 animation 리포트를 사용한다.

## 32차 결과

- 전투 scene 내부 selector evidence를 `react:interactive-parity`에 추가했다.
- 원본 HTML 모바일 HP bar 규칙과 맞춰 React `.battle-scene-hp`를 390px 이하에서 `top -16px`, `width 96px`, `height 12px`로 보정했다.
- React `CurriculumAttackVfx`는 원본처럼 `vfx.token` 텍스트를 실제 span 내용으로 렌더링한다.
- `react:interactive-parity`는 양쪽 자동 전투 interval을 같은 조건으로 멈춰 탭 순회 중 상태가 갈라지지 않게 했다.
- 최신 `react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건, 학생 전투 selector diff 0건.
- `student-시험` visual diff는 `0.3213%`, scene diff는 `0.6848%`, activePanel diff는 `0.1613%`다.
- `00-initial` visual diff는 `0.214%`, scene diff는 `0.6148%`, activePanel diff는 `0%`다.
- `student-교육`은 text 일치, state diff 0건, visual diff `0.2874%`, scene diff `0.6763%`, activePanel diff `0.1023%`다.
- `npm run react:verify`, `npm run react:deep-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.

## 33차 결과

- 학생 `결과` 탭 selector evidence가 원본 HTML의 `.management-panel > .viewport`와 React `.result-panel` 양쪽을 모두 잡도록 보강했다.
- React 빈 결과 상태 DOM을 원본과 같은 `section.viewport.result-panel`, `div.section-title`, `div.panel` 흐름으로 맞췄다.
- 원본에 없던 결과 빈 패널 `grid/gap` 스타일을 제거하고, `회차 기록` 아이콘을 원본 path와 같은 `History` 아이콘으로 교체했다.
- 최신 `react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건.
- `student-결과` 최신값은 visual diff `0.2951%`, activePanel diff `0.1172%`, mean absolute diff `0.0563`, selectorDiff `0`, text/state diff `0`이다.

## 34차 결과

- `react:deep-parity` style snapshot에 `fontFamily`, `fontStyle`, `fontSynthesis`, `textRendering`, `webkitFontSmoothing`을 추가했다.
- 기본 정적 animation deep parity를 추가해 gacha live animation phase와 최종 UI 형태 비교를 분리했다.
- 기본 deep parity는 통과했고 gacha text equal, styleDiffs 0건, rectMismatch 0건이다. gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이다.
- live animation phase 감사가 필요하면 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`를 별도로 실행한다. 이전 live visual diff는 `26.2213%`, threshold diff는 `2.5024%`, mean absolute diff는 `1.3554`다.
- 이 결과로 gacha의 큰 live diff는 실제 DOM/CSS/layout 불일치가 아니라 animation phase/blur/glyph rasterization 잔차로 분류한다.

## 35차 결과

- 설정 모달 행 아이콘을 원본 HTML SVG 의미/형태에 맞췄다.
- `react:deep-parity`가 설정 행 `.setting-icon svg` signature를 비교하고, 불일치 시 `svgDiffs` failure를 내도록 보강했다.
- 최신 live deep parity에서 settings visual diff는 `0.1827%`, threshold diff는 `0.1495%`, icon region diff는 `0%`, styleDiffs 0건, svgDiffs 0건이다.
- `npm run react:verify`, `npm run react:interactive-parity`, live/static `npm run react:deep-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.

## 36차 결과

- 최신 snapshot 빌드 기준 첫 화면 strict parity를 재실행해 헤더 첫 DEBUG/database 버튼만 다른 것을 확인했다.
- 원본 HTML은 저장 데이터가 없는 첫 실행에서 첫 버튼이 기본 `icon-button`, React는 `icon-button alert`였으므로 React 첫 실행을 기본 `icon-button`으로 되돌렸다.
- 추가 DOM 확인으로 원본 HTML은 기존 save 로드 상태에서 첫 버튼을 `icon-button alert`로 표시함을 확인했고, React도 `saveSource === "localStorage"`일 때만 alert를 붙이도록 맞췄다.
- `tools/react-vite-visual-parity-smoke.mjs`는 최신 diff PNG, bbox, hotspot을 `report.json`에 남긴다.
- strict `react:parity-audit` 결과 412x915, 390x844 모두 `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`으로 복구했다.
