# React/Vite interactive selector evidence 보강 구현

## 목적

- `react:interactive-parity`가 전체/영역별 screenshot diff만 기록하던 상태에서, 학생 `시험`/`도감` 패널의 실제 selector 차이까지 추적할 수 있게 했다.
- 도감처럼 화면은 거의 맞지만 특정 초상/버튼/텍스트 영역에 잔차가 남는 경우, DOM 구조와 이미지 source 차이를 바로 확인할 수 있게 한다.

## 변경 내용

- `tools/react-vite-interactive-parity-audit.mjs`
  - `selectorProbeList`와 `selectorStyleProperties`를 추가했다.
  - `collectMetrics`가 핵심 selector의 count, rect, computed style, normalized text, tagName/className, image source/natural size를 수집한다.
  - `compareMetrics` 결과에 `selectorDiffs`를 포함하고, report의 snapshot/react 항목에 `selectorMetrics`를 저장한다.
  - 콘솔 `visualSummary`에 `selectorDiffCount`를 추가했다.
  - selector 차이는 evidence로만 기록하며 기존 failure 조건은 바꾸지 않았다.

## 확인한 결과

- `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
- selector evidence로 React 도감 직업 카드 초상이 개별 PNG `img`였고, 원본 HTML은 `span.career-emblem career-portrait career-doctor` atlas 배경이라는 차이를 확인했다.
- 이후 도감 초상을 원본형 atlas 구조로 바꾸고 1px y좌표/버튼 display를 보정했다.
- 해당 보강 시점의 `student-도감` visual diff는 `2.126%`, activePanel diff는 `0.9085%`였다.

## 유지보수 기준

- 학생 `시험`/`도감` 패널을 바꾸면 `artifacts/react-vite-interactive-parity/report.json`의 `selectorDiffs`를 먼저 보고 실제 DOM/스타일 차이인지, 픽셀 렌더링 잔차인지 구분한다.
- selector evidence는 기능 실패 기준이 아니라 정밀 패리티 분석용 자료다. 실패 기준을 추가할 때는 원정대의 의도된 레이아웃 차이를 먼저 분리해야 한다.

## 2026-06-24 추가 구현

- 학생 `시험` 적 카드 내부의 몬스터, 제목, 종류, HP bar/fill/text selector를 evidence에 포함했다.
- computed style evidence에 `opacity`, `backgroundImage`, `backgroundPosition`, `backgroundSize`, `boxShadow`, `filter`, `transform`을 추가했다.
- build hash가 붙은 Vite asset URL은 같은 원본 자산이면 동일하게 보도록 정규화했다.
- 학생 `시험`/`도감` selector는 해당 탭 label에서만 비교해 다른 시나리오의 빈 selector noise를 제거했다.
- React 전용 `exam-panel` scoping class는 `examPanel` 루트 비교에서 실제 UI 차이로 세지 않는다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-시험` selector diff 0건, `student-도감` selector diff 0건
- `student-도감` 감사는 원본 `.stack`과 React `.archive-panel` 루트 자체를 직접 비교하지 않고, 제목/요약/효과/직업 카드처럼 실제 화면 표면의 selector를 비교한다.
- 도감 초상 `translateY(-1px)`는 원본 픽셀 위치를 맞추기 위한 시각 보정으로 동등 처리한다.

## 2026-06-24 도감 bar evidence 추가

- `student-도감` activePanel top hotspot이 첫 직업 카드 하단 bar 영역인 `x 320 / y 736 / threshold 469px`로 잡혔다.
- `tools/react-vite-interactive-parity-audit.mjs`에 `careerWeightTrack`과 `careerWeightFill` selector를 추가했다.
- `careerWeightTrack`: `.career-card .weight-row > div`
- `careerWeightFill`: `.career-card .weight-row > div > i`
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
- `student-도감` selector diff는 0건이며, `careerWeightTrack`과 `careerWeightFill`은 snapshot/React 모두 310개다.
- 첫 직업 카드 5개 bar의 track rect/background와 fill rect/backgroundColor가 snapshot/React에서 일치한다.
- 따라서 현재 도감 bar hotspot은 DOM/width/color 불일치가 아니라 같은 selector 표면 위의 렌더링 잔차로 판단한다.

## 2026-06-24 도감 가이드 아이콘 evidence 추가

- `tools/react-vite-hotspot-crop.mjs`를 추가해 `report.json`의 region hotspot을 실제 PNG crop으로 확인할 수 있게 했다.
- `student-도감` 최대 hotspot은 weight bar가 아니라 `분배 가이드` 버튼의 아이콘/텍스트 영역임을 확인했다.
- `tools/react-vite-interactive-parity-audit.mjs`에 `careerGuideIcon`, `careerGuideIconPath`, `careerGuideText` selector를 추가했다.
- `careerGuideIconPath`는 SVG line/path attribute를 비교하되, 이 비교는 도감 가이드 아이콘에만 적용해 다른 탭 noise를 만들지 않게 했다.
- `src/react/App.jsx`에서 path 기반 `SlidersHorizontal` 대신 원본과 같은 line 기반 `ArchiveGuideIcon`을 사용한다.
- `src/react/styles.css`에서 `.career-guide-button svg` 전용 margin/vertical-align을 제거했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 해당 보강 시점의 hotspot은 `x 352 / y 608 / threshold 346px`이며, crop은 직업 카드 상단 숫자 렌더링 잔차로 이동했다.

## 2026-06-24 도감 header/weight evidence 추가

- `tools/react-vite-interactive-parity-audit.mjs`에 `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue` selector를 추가했다.
- `career-emblem` transform 비교에서 양쪽 모두 `none`인 경우를 동등 처리하도록 고쳤다.
- 도감 weight label/value의 rect/style을 직접 비교해 React 전용 value right-align/dark color 회귀를 잡을 수 있게 했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 최신 `student-도감` visual diff는 `1.7317%`, activePanel diff는 `0.1656%`, mean absolute diff는 `0.2436`이다.
- 최신 `npm run react:hotspot-crop` 기준 hotspot은 `x 704 / y 32 / threshold 280px`이며, crop은 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
