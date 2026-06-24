# React/Vite 헤더 아이콘 strict parity 복구 계획

## 목표
- 최신 snapshot HTML 기준으로 React 첫 화면 strict pixel parity를 다시 0으로 맞춘다.
- 실패 원인을 재현 가능한 diff 이미지와 bbox/hotspot으로 남긴다.
- 과거 문서의 `.icon-button.alert` 기준이 최신 원본 HTML의 상태별 class와 맞지 않으면 수정한다.

## 구현 범위
1. `tools/react-vite-visual-parity-smoke.mjs`가 최신 diff PNG, bbox, hotspot을 `report.json`에 기록한다.
2. strict parity 실패 지점을 확인해 원본 HTML과 React의 헤더 아이콘 class/SVG를 비교한다.
3. 저장 데이터가 없는 첫 실행의 React `database` 헤더 버튼을 최신 원본 HTML과 같은 기본 `.icon-button` class로 맞춘다.
4. 기존 save를 로드한 상태에서는 원본 HTML처럼 React `database` 헤더 버튼에 `.icon-button.alert` class를 붙인다.
5. 과거 `.icon-button.alert` 문서 기준을 상태별 기준으로 정정한다.

## 검증 기준
- `npm run build:web`
- `npm run react:build`
- `$env:REACT_PARITY_STRICT='1'; $env:REACT_PARITY_MAX_DIFF_PERCENT='0'; $env:REACT_PARITY_MAX_MEAN_ABS_DIFF='0'; npm run react:parity-audit`
- `npm run react:verify`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`

## 2026-06-24 결과
- 최신 strict parity 실패는 헤더 첫 DEBUG/database 버튼 bbox `32x32`에만 집중되어 있었다.
- snapshot HTML은 첫 버튼이 기본 `icon-button`, React는 `icon-button alert`였다.
- React 헤더를 기본 `icon-button`으로 수정했다.
- strict parity 재실행 결과 412x915, 390x844 모두 `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`으로 복구했다.
- `tools/react-vite-visual-parity-smoke.mjs`는 이제 최신 diff PNG, bbox, hotspot을 함께 기록한다.

## 2026-06-24 기존 save alert 보강
- 원본 snapshot은 저장 데이터가 전혀 없는 첫 실행에서는 DEBUG/database 버튼이 기본 `icon-button`이다.
- 원본 snapshot은 `student-idle-rpg-save-v1` 저장 데이터가 있으면 같은 버튼을 `icon-button alert`로 표시한다.
- React도 `loadGameState().source === "localStorage"`일 때만 `alert` class를 붙이도록 맞췄다.
- `tools/react-vite-interactive-parity-audit.mjs`에 헤더 버튼 selector probe를 추가해 save가 있는 클릭 흐름에서도 class/style 차이를 검출한다.
- 재검증 결과 첫 실행 strict parity는 412x915, 390x844 모두 0픽셀 차이를 유지했고, interactive parity는 23개 시나리오 failure 0건을 유지했다.
