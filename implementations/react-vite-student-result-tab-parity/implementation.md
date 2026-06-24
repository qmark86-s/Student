# React/Vite 학생 결과 탭 패리티 보강 구현

## 개요

학생 `결과` 탭을 원본 HTML의 compact 결과 화면 구조에 더 가깝게 맞췄다. 빈 상태는 결과/합격권/회차 기록 패널 구성을 유지하고, 수능 결과 대기 상태는 원본형 `panel decision`, `course-line`, `result-row`, `decision-careers`, `button-grid`, ranked career row 구조를 사용한다.

모바일 media override가 `result-panel` padding을 다시 키워 원본보다 카드가 안쪽으로 밀리던 문제도 함께 보정했다. 상단 첫 아이콘 버튼은 최신 원본 HTML의 기본 `.icon-button` 색을 React 헤더에도 반영했다.

## 변경 파일

- `src/react/App.jsx`
  - 결과 탭 렌더링을 원본 HTML 구조에 맞춘다.
  - 헤더 `database` 아이콘 버튼은 원본 HTML처럼 저장 데이터가 없는 첫 실행에서는 기본 `icon-button`, 기존 save 로드 상태에서는 `icon-button alert` 클래스를 사용한다.
  - 빈 결과 상태를 원본처럼 `section.viewport.result-panel`, `div.section-title`, `div.panel` 흐름으로 맞춘다.
  - `회차 기록` 아이콘을 원본과 같은 `History` path로 바꾼다.
- `src/react/styles.css`
  - 결과 탭 compact panel, decision panel, career row, 버튼 그리드 스타일을 원본 기준으로 보정한다.
  - 모바일 하단 parity 규칙에 `.result-panel`을 포함해 padding/gap이 다시 커지지 않게 한다.
  - `.result-panel` padding을 원본 `.viewport`와 같은 10px로 맞춰 빈 상태 카드 y좌표가 2px 위로 밀리지 않게 한다.
  - 결과 빈 패널의 원본에 없던 `grid/gap` 스타일을 제거한다.
  - 과거 `.icon-button.alert` 보정은 최신 원본 HTML과 맞지 않으므로 사용하지 않는다.
- `plans/react-vite-student-result-tab-parity/plan.md`
  - 결과 탭 보강 범위, 검증값, 남은 시각 차이를 기록한다.
- `docs/react-vite-parity-migration.md`, `plans/react-vite-parity-migration/plan.md`, `implementations/react-vite-parity-migration/implementation.md`
  - React/Vite 전체 이식 문서의 최신 결과 탭 기준을 갱신한다.

## 검증 결과

- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:battle-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

## 패리티 수치

- `student-결과` visual diff: `8.416%`에서 `3.8035%`로 감소
- `student-결과` mean absolute diff: `1.7952`에서 `1.0333`으로 감소
- `00-initial` visual diff: `0.4871%`에서 `0.214%`로 감소
- 2026-06-24 추가 보강 후 `student-결과` visual diff: `3.796%`에서 `1.8629%`로 감소
- 2026-06-24 추가 보강 후 `student-결과` activePanel diff: `4.0448%`에서 `0.4029%`로 감소
- 2026-06-24 추가 보강 후 `student-결과` mean absolute diff: `1.0423`에서 `0.3039`로 감소
- 2026-06-24 selector evidence 정합화 후 `student-결과` visual diff: `0.2951%`
- 2026-06-24 selector evidence 정합화 후 `student-결과` activePanel diff: `0.1172%`
- 2026-06-24 selector evidence 정합화 후 `student-결과` mean absolute diff: `0.0563`
- 2026-06-24 selector evidence 정합화 후 `student-결과` selectorDiff: `0`

## 시각 확인

- 원본 기준 캡처: `artifacts/react-vite-interactive-parity/student-결과-snapshot.png`
- React 기준 캡처: `artifacts/react-vite-interactive-parity/student-결과-react.png`

이후 전투 HUD 남은 시간 보강으로 원본/React 결과 탭 캡처 모두 `55초`를 표시한다. 추가 padding 보정 뒤 결과 탭 하단 패널 잔차는 대부분 아이콘/텍스트 안티앨리어싱과 live scene 잔차가 중심이다.

## 2026-06-24 selector evidence 추가

- `tools/react-vite-interactive-parity-audit.mjs`에 결과 탭 전용 selector evidence를 추가했다.
- 추가 selector는 `resultPanel`, `resultTitle`, `resultTitleIcon`, `resultAdmissionPanel`, `resultAdmissionTitle`, `resultAdmissionIcon`, `resultHistoryPanel`, `resultHistoryTitle`, `resultHistoryIcon`, `resultEmptyState`, `resultIconPath`이다.
- `resultIconPath`는 SVG 내부 path/line/circle/polyline attributes를 비교해 아이콘 차이를 직접 잡는다.

## 2026-06-24 selector evidence 정합화

- 초기 selector evidence는 React 전용 `.result-panel`만 잡아 원본 HTML의 `.management-panel > .viewport` 결과 탭을 0개로 기록했다.
- selector를 원본/React 양쪽 구조에 맞게 확장하고, React에서 검증용으로 추가된 `result-panel`, `result-empty-section` 클래스는 같은 UI 구조로 비교되도록 정규화했다.
- 검증 과정에서 원본에는 없는 React 빈 결과 패널의 `display:grid`, `gap`과 회차 기록 `RefreshCcw` 아이콘 path 차이를 확인했다.
- React 빈 결과 DOM과 CSS를 원본 `viewport`/`section-title`/`panel` 흐름에 맞췄고, 회차 기록 아이콘을 `History`로 교체했다.
- 최신 `npm run react:interactive-parity`에서 `student-결과`는 selectorDiff 0, text/state diff 0이다.
