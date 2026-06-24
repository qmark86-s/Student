# React/Vite interactive 영역별 visual diff 감사 계획

## 목표
- `react:interactive-parity`가 전체 화면 diff만 보지 않고 전투 장면과 현재 관리 패널 diff를 따로 기록하게 한다.
- 학생 탭의 남은 diff가 battle scene live frame 때문인지, 실제 하단 패널 UI 때문인지 구분한다.
- 원정대 탭은 최신 사용자 요청에 따라 원본 HTML과 의도적으로 다른 레이아웃이 있으므로, 수치를 기록하되 failure 판정은 기존 상호작용/레이아웃 기준을 따른다.

## 구현 범위
1. snapshot/React 캡처 뒤 같은 rect 영역을 canvas로 잘라 `scene`, `activePanel`별 diff를 계산한다.
2. 영역 rect 차이가 3px를 넘으면 해당 영역 diff는 계산하지 않고, layout failure가 원인을 드러내게 한다.
3. `artifacts/react-vite-interactive-parity/report.json`에 `visualRegions.scene`, `visualRegions.activePanel`을 기록한다.
4. 콘솔 `visualSummary`에 `sceneDiffPercent`, `activePanelDiffPercent`를 노출한다.
5. 첫 `00-initial` 캡처는 원본/React의 Battle Road 적 수와 HUD 제한시간이 같은 안정 상태가 된 뒤 진행한다.
6. 학생 `시험`/`도감` 패널의 핵심 selector rect/style/text/source evidence를 `selectorMetrics`, `selectorDiffs`로 기록한다.
7. `scene`, `activePanel` 영역마다 threshold pixel이 몰린 top hotspot을 기록해 남은 잔차가 어느 UI 조각에 몰리는지 추적한다.

## 검증 기준
- `npm run react:interactive-parity`
- report의 모든 시나리오 `failures` 0건
- 학생 탭에서 `activePanelDiffPercent`가 scene diff와 분리되어 기록되는지 확인한다.
- `visualRegions.scene.hotspots`, `visualRegions.activePanel.hotspots`가 region 기준 x/y/width/height와 threshold pixel 수를 기록한다.
- 원정대 탭에서 큰 diff는 의도된 레이아웃 차이로 문서화하고, 기능 failure로 오판하지 않는다.

## 2026-06-24 결과
- `npm run react:build`: 통과
- `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- 학생 탭 대표값
  - `00-initial`: full 1.6234%, scene 5.1549%, activePanel 0%
  - `student-성장`: full 1.6769%, scene 5.2229%, activePanel 0.0611%
  - `student-동료`: full 1.7131%, scene 5.2716%, activePanel 0.1007%
  - `student-시험`: full 1.7574%, scene 5.2302%, activePanel 0.2085%
  - `student-도감`: full 2.126%, scene 5.2207%, activePanel 0.9085%
  - `student-결과`: full 1.8629%, scene 5.2376%, activePanel 0.4029%
- 학생 activePanel top hotspot은 `student-성장 32,32 / 145px`, `student-시험 160,32 / 257px`, `student-동료 256,32 / 249px`, `student-직장 384,32 / 272px`, `student-교육 480,32 / 264px`, `student-결과 608,32 / 255px`, `student-도감 352,608 / 346px`이다.
- `00-initial`은 양쪽 `enemyCount 3`, `timerText 60초`, `phase travel` signature가 일치한 뒤 캡처된다.
- `selectorMetrics` 기준 도감 직업 초상은 snapshot/React 모두 `span.career-emblem career-portrait career-doctor`이고 같은 rect를 가진다.
- 원정대 탭은 전투 장면/하단 메뉴/동료 카드 배치가 최신 React 기준으로 의도 변경되어 scene diff가 약 96%로 기록된다. 이 수치는 원본 HTML로 되돌릴 근거가 아니라, 의도된 차이가 어디에 있는지 추적하는 기록이다.
- 원정대 layout signature 기준 React 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보/동료 관리는 2열 카드 그리드다.
- snapshot의 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 activePanel/scene diff를 줄이려고 되돌리지 않는다.
- 원정대 semantic signature 기준 성장/파티/동료 관리/기록의 active panel 전체 텍스트와 버튼 라벨은 snapshot/React가 일치한다.

## 2026-06-24 도감 hotspot crop 결과
- `react:hotspot-crop`로 `student-도감` activePanel hotspot을 crop해 잔차 위치를 직접 확인했다.
- `분배 가이드` 아이콘/텍스트 보정 직후의 `student-도감` 값은 full `2.126%`, scene `5.2207%`, activePanel `0.9085%`, mean absolute diff `0.4772`였다.
- 당시 activePanel top hotspot은 `x 352 / y 608 / threshold 346px`로, 첫 직업 카드 상단 `명성 88` 숫자 렌더링 잔차였다.
- 원정대 React 캡처는 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 동료 관리 2열 카드가 유지되는지 눈검사로 확인했다.

## 2026-06-24 도감 영역 diff 최신값
- 도감 header/weight row 보정 뒤 최신 `student-도감` 값은 full `1.7317%`, threshold `0.557%`, scene `5.2207%`, activePanel `0.1656%`, mean absolute diff `0.2436`이다.
- 최신 `react:hotspot-crop` 기준 activePanel top hotspot은 `x 704 / y 32 / threshold 280px`이며, 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
- `student-도감` selector diff는 0건이고, `careerEmblem`, `careerWeightLabel`, `careerWeightValue`까지 rect/style 비교 대상에 포함한다.
- 원정대 영역 diff는 최신 사용자 요청으로 유지하는 전투 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드 차이를 포함하므로 원본 HTML 일렬 배치로 되돌릴 근거가 아니다.
- `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:hotspot-crop`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.
