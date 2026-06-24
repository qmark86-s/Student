# React/Vite 헤더 아이콘 strict parity 복구 구현

## 개요
- 최신 snapshot/React 빌드 후 strict visual parity를 다시 실행하자, 첫 화면의 좌표와 텍스트는 같지만 0.25~0.29% 픽셀 차이가 발생했다.
- 신규 diff 기록을 확인한 결과 차이는 상단 첫 DEBUG/database 버튼 32x32 영역에만 있었다.
- SVG path는 같았고, class만 snapshot `icon-button` / React `icon-button alert`로 달랐다.

## 변경 내용
- `src/react/App.jsx`
  - 저장 데이터가 없는 첫 실행에서는 `IconButton`의 `database` 아이콘 버튼에 `alert` class를 붙이지 않게 했다.
  - 기존 save를 `localStorage`에서 로드한 상태에서는 원본 HTML처럼 `database` 아이콘 버튼에 `alert` class를 붙이도록 했다.
  - `shop`과 `menu` class는 유지했다.
- `tools/react-vite-interactive-parity-audit.mjs`
  - save가 있는 클릭 흐름에서도 헤더 버튼 class/style 차이를 잡도록 `headerActionButton` selector probe를 추가했다.
- `tools/react-vite-visual-parity-smoke.mjs`
  - strict 실패 시에도 원인 추적이 가능하도록 `*-latest-diff.png`를 최신 캡처 기준으로 생성한다.
  - `comparison.bbox`와 상위 hotspot을 `artifacts/react-vite-parity/report.json`에 기록한다.
- 문서
  - 과거 `.icon-button.alert` 색상 기준을 최신 원본 HTML의 기본 `.icon-button` 기준으로 정정했다.

## 검증 결과
- `npm run build:web`: 성공
- `npm run react:build`: 성공
- strict `npm run react:parity-audit`: 성공
  - 412x915: `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`
  - 390x844: `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`
- 최신 diff PNG:
  - `artifacts/react-vite-parity/phone-standard-latest-diff.png`
  - `artifacts/react-vite-parity/phone-small-latest-diff.png`

## 유지보수 기준
- 헤더 아이콘 class는 snapshot HTML의 실제 상태별 class를 우선한다.
- 저장 데이터가 없는 첫 실행은 `database` 버튼 기본 `icon-button`, 기존 save 로드 상태는 `icon-button alert`가 기준이다.
- strict parity가 실패하면 `report.json`의 `bbox`와 `hotspots`를 먼저 확인한다.
- 과거 문서 기준이 최신 빌드와 충돌하면 코드보다 문서 기준을 먼저 의심하고, 최신 snapshot HTML을 기준으로 다시 맞춘다.

## 2026-06-24 기존 save alert 보강
- 원본 snapshot을 직접 실행해 `no-save`는 `icon-button`, `save-d0`과 `save-d20000`은 `icon-button alert`임을 확인했다.
- React는 `saveSource === "localStorage"`를 `Header`의 `debugAlert`로 전달해 같은 조건을 따른다.
- `npm run react:build`: 성공
- strict `npm run react:parity-audit`: 성공, 412x915/390x844 모두 `changedPixels 0`, `bbox null`
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- 대표 개선값:
  - `00-initial` interactive diff `0.4871% -> 0.214%`
  - `modal-shop` diff `0.9357% -> 0.734%`
  - `modal-settings` diff `0.3562% -> 0.1545%`
