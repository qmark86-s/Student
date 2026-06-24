# React/Vite interactive 영역별 visual diff 감사

## 개요
- `tools/react-vite-interactive-parity-audit.mjs`에 영역별 visual diff 계산을 추가했다.
- 기존 전체 screenshot diff는 유지하고, 같은 캡처에서 `scene`과 `activePanel` 영역을 따로 잘라 비교한다.
- 학생 탭은 하단 패널 위치/내용 회귀를 더 빨리 찾을 수 있고, live 전투 장면 잔차와 패널 UI 잔차를 분리해 볼 수 있다.

## 변경 파일
- `tools/react-vite-interactive-parity-audit.mjs`
  - `compareScreenshotRegions`를 추가해 snapshot/React 이미지에서 같은 selector rect 영역만 canvas로 비교한다.
  - `compareMetrics` 결과에 `visualRegions`를 포함한다.
  - 콘솔 `visualSummary`에 `sceneDiffPercent`, `activePanelDiffPercent`를 추가했다.
  - 학생 `시험`/`도감` 패널의 핵심 selector count, rect, computed style, text, image source를 `selectorMetrics`로 저장하고 차이를 `selectorDiffs`로 기록한다.
  - 학생 탭은 `.management-panel .section-title` rect도 비교해 제목이 하단 탭 아래에서 밀리면 layout failure로 잡는다.
  - 첫 `00-initial` 캡처 전에 원본/React Battle Road 적 수와 HUD 제한시간이 같은 안정 상태가 될 때까지 기다린다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- 대표 학생 탭 결과
  - `00-initial`: full 1.6234%, scene 5.1549%, activePanel 0%
  - `student-성장`: full 1.6769%, scene 5.2229%, activePanel 0.0611%
  - `student-동료`: full 1.7131%, scene 5.2716%, activePanel 0.1007%
  - `student-시험`: full 1.7574%, scene 5.2302%, activePanel 0.2085%
  - `student-도감`: full 2.126%, scene 5.2207%, activePanel 0.9085%
  - `student-결과`: full 1.8629%, scene 5.2376%, activePanel 0.4029%
- 대표 학생 activePanel top hotspot
  - `student-성장`: x 32, y 32, threshold 145px
  - `student-시험`: x 160, y 32, threshold 257px
  - `student-동료`: x 256, y 32, threshold 249px
  - `student-직장`: x 384, y 32, threshold 272px
  - `student-교육`: x 480, y 32, threshold 264px
  - `student-결과`: x 608, y 32, threshold 255px
  - `student-도감`: x 352, y 608, threshold 346px
- `00-initial` signature: snapshot/React 모두 `enemyCount 3`, `timerText 60초`, `phase travel`
- `selectorMetrics` 기준 도감 첫 직업 초상은 snapshot/React 모두 `span.career-emblem career-portrait career-doctor`, rect `x 21 / y 683.13 / 32x32`로 일치한다.
- 원정대 탭의 scene diff는 약 96%로 크지만, 최신 사용자 요청에 따라 전투 동료 편대/하단 메뉴/동료 카드 배치를 React 기준으로 의도 변경했기 때문에 원본 HTML로 되돌릴 대상이 아니다.
- `layoutSignatures` 기준 React 원정대 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보/동료 관리는 2열 카드 그리드다.
- snapshot 원본 HTML의 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 diff 감소 목적으로 되돌리지 않는다.
- `semanticSignatures` 기준 원정대 성장/파티/동료 관리/기록의 active panel 전체 텍스트와 버튼 라벨은 snapshot/React가 일치한다.

## 산출물
- `artifacts/react-vite-interactive-parity/report.json`
- `artifacts/react-vite-interactive-parity/*-snapshot.png`
- `artifacts/react-vite-interactive-parity/*-react.png`

## 2026-06-24 hotspot crop 산출물
- `tools/react-vite-hotspot-crop.mjs`를 추가해 region hotspot을 별도 PNG로 자른다.
- 기본 대상은 `student-도감` / `activePanel` / hotspot 0이다.
- `분배 가이드` 아이콘 보정 직후의 `student-도감`은 full `2.126%`, activePanel `0.9085%`, mean absolute diff `0.4772`였다.
- 최신 hotspot crop은 직업 카드 상단 `명성 88` 숫자 렌더링 잔차를 가리킨다.
- 산출물:
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-snapshot.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-react.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-diff.png`

## 2026-06-24 도감 영역 diff 최신 산출물
- 도감 header/weight row 보정 뒤 최신 `npm run react:interactive-parity` 결과는 23개 시나리오 failure 0건이다.
- `student-도감`은 full `1.7317%`, threshold `0.557%`, scene `5.2207%`, activePanel `0.1656%`, mean absolute diff `0.2436`, selector diff 0건이다.
- 최신 `npm run react:hotspot-crop` 결과 top hotspot은 `x 704 / y 32 / threshold 280px`이며, 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
- `selectorMetrics`에는 도감 카드 header/상태/초상/weight label/value evidence가 들어간다.
- 원정대 탭의 큰 visual diff는 최신 사용자 요청 기준의 비일렬 동료 배치와 하단 카드 그리드 차이로 분류한다.
