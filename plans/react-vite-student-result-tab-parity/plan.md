# React/Vite 학생 결과 탭 패리티 보강 계획

## 목표
- 학생 `결과` 탭의 빈 상태를 원본 HTML처럼 `section-title`과 두 개의 `panel` 카드로 표시한다.
- React의 큰 단일 `empty-panel` 구조를 제거하고, 원본의 `합격권` / `회차 기록` 카드 구조를 따른다.
- 수능 결과 대기 상태도 원본 HTML의 `decision`, `course-line`, `result-row`, `decision-careers`, `button-grid` 구조에 맞춘다.
- 텍스트 동등성은 유지하고 visual diff를 줄인다.

## 구현 범위
1. `ResultPanel`의 비결정 상태를 원본과 같은 `section.viewport.result-panel > div.stack` 흐름으로 바꾼다.
2. `합격권`과 `회차 기록`은 각각 `panel` 안에 `section-title`과 `list flat`을 렌더링한다.
3. `awaitingDecision` 상태는 원본형 `panel decision` 구조로 재배치한다.
4. `src/react/styles.css`에 결과 탭용 compact `result-panel`, `course-line`, `result-row`, `decision-careers`, `button-grid`, ranked career row 스타일을 추가한다.
5. 기존 기능인 `N수 선택`, 직업 선택, 결과 텍스트는 유지한다.
6. 모바일 media override가 결과 탭 padding을 다시 키우지 않도록 하단 parity 규칙에 `result-panel`을 포함한다.
7. 최신 원본 HTML의 상단 DEBUG 버튼 상태별 색상과 React 상단 디버그 버튼 색상을 맞춘다. 저장 데이터가 없는 첫 실행은 기본 `icon-button`, 기존 save 로드 상태는 `icon-button alert`다.
8. 결과 탭의 상단 padding은 원본 `.viewport`와 같은 10px 기준을 사용해 `section-title`, `panel`, `empty-state` y좌표가 2px씩 밀리지 않게 한다.
9. `react:interactive-parity`에 결과 탭 전용 selector evidence를 추가해 제목, 패널, 빈 상태, SVG 아이콘 path 차이를 직접 기록한다.

## 검증 기준
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:battle-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`
- `student-결과` visual diff가 기존 `7.8125%`보다 감소했는지 확인한다.

## 2026-06-24 결과
- `student-결과` visual diff가 `8.416%`에서 `3.8035%`로 감소했다.
- `student-결과` mean absolute diff가 `1.7952`에서 `1.0333`으로 감소했다.
- 상단 DEBUG 버튼을 원본 HTML의 `alert` 색상으로 맞추면서 `00-initial` visual diff도 `0.4871%`에서 `0.214%`로 감소했다.
- 이후 전투 HUD 남은 시간 표시를 보강해 원본/React 모두 `55초`로 표시됨을 캡처에서 확인했다. 남은 `student-결과` visual diff는 live frame, sprite, progress bar의 미세 잔차가 중심이다.
- `npm run react:build`, `npm run react:records-smoke`, `npm run react:battle-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`, `src/react` 금지 문자열 검색을 통과했다.

## 2026-06-24 추가 결과
- `.result-panel` padding top을 원본 `.viewport`와 같은 10px로 맞춰 결과 제목, `합격권`, `회차 기록` 카드가 원본 y좌표와 일치하게 했다.
- `student-결과` visual diff가 `3.796%`에서 `1.8629%`로 감소했다.
- `student-결과` activePanel diff가 `4.0448%`에서 `0.4029%`로 감소했다.
- `student-결과` mean absolute diff가 `1.0423`에서 `0.3039`로 감소했다.

## 2026-06-24 selector evidence 추가 계획
- `tools/react-vite-interactive-parity-audit.mjs`에 `resultPanel`, `resultTitle`, `resultTitleIcon`, `resultAdmissionPanel`, `resultAdmissionTitle`, `resultAdmissionIcon`, `resultHistoryPanel`, `resultHistoryTitle`, `resultHistoryIcon`, `resultEmptyState`, `resultIconPath`를 추가한다.
- `resultIconPath`는 SVG path/line/circle/polyline 등의 attributes를 비교해 lucide/custom icon 차이를 숨기지 않는다.
- 추가 후 `npm run react:interactive-parity`에서 `student-결과` selector diff가 실제 원인인지 확인한다.

## 2026-06-24 selector evidence 정합화 결과
- 원본 HTML 결과 탭은 `section.viewport > div.stack > div.section-title / div.panel` 구조이고, React는 이전에 `main.result-panel > header/section` 구조라 selector evidence가 원본을 0개로 기록하던 문제가 있었다.
- React 결과 탭 빈 상태를 원본과 같은 `viewport`, `div.section-title`, `div.panel` DOM 흐름으로 맞췄다.
- `회차 기록` 아이콘을 원본 path와 같은 `History` 아이콘으로 바꾸고, 결과 빈 패널의 원본에 없던 `grid/gap` 스타일을 제거했다.
- `tools/react-vite-interactive-parity-audit.mjs`의 결과 탭 selector는 원본 `.management-panel > .viewport`와 React `.result-panel` 양쪽을 모두 잡는다.
- 최신 `student-결과` 수치는 visual diff `0.2951%`, activePanel diff `0.1172%`, mean absolute diff `0.0563`, selectorDiff `0`, text/state diff `0`이다.
