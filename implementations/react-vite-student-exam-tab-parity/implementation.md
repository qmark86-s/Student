# React/Vite 학생 시험 탭 패리티 보강

## 개요
- 학생 `시험` 탭을 원본 HTML의 compact 학년/수능 전투 패널 구조에 맞췄다.
- 기존 React 리스트형 진행 카드를 제거하고 `battle-summary-panel`, `battle-enemy-grid`, `battle-enemy-card` 기반으로 렌더링한다.
- 스모크 검증 기준도 예전 `.exam-progress-card`가 아니라 현재 DOM 구조와 시각 높이를 검사하도록 갱신했다.

## 변경 파일
- `src/react/App.jsx`
  - `ExamPanel`을 `viewport exam-panel > stack exam-stack` 구조로 정리했다.
  - 시험 제목, 처치 수 badge, 3개 metric 요약, 적 카드 grid, 완료 버튼, 시험 결과 기록을 순서대로 표시한다.
  - `activeEnemyForBattle`는 렌더 루프 밖에서 한 번 계산한다.
- `src/react/styles.css`
  - `.battle-summary-panel`, `.battle-enemy-grid`, `.battle-enemy-card`, `.battle-enemy-monster`, `.enemy-hp-bar`를 원본 compact 크기 기준으로 추가했다.
  - 몬스터 `span`에는 텍스트 opacity/ellipsis 규칙이 적용되지 않도록 선택자를 좁혔다.
- `tools/react-vite-records-smoke.mjs`
  - 시험 요약 패널 1개, 적 카드 수, 몬스터 배경 이미지, HP bar, 요약/적 grid 높이를 검사한다.
  - `.exam-progress-card` 기준과 `3/4` 텍스트 기대값을 제거했다.

## 검증 결과
- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과
  - `examSummaryPanels 1`
  - `examEnemyCards 1`
  - `examEnemyImages 1`
  - `examHpBars 1`
  - `examSummaryHeight 64`
  - `examEnemyGridHeight 56`
- `npm run react:battle-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

## 참고
- 시험 탭의 현재 smoke seed는 H3 수능 전투라 적 카드가 1개다.
- 학년 평가 전투에서는 `battle.enemies` 수만큼 같은 카드 구조를 데이터 기반으로 렌더링한다.

## 2026-06-24 추가 보정
- `battle-enemy-monster`의 opacity, shadow, boss/suneung 크기를 원본 적 카드 sprite 톤에 맞춰 보정했다.
- `battle-enemy-card strong`의 color/weight를 원본 compact 카드에 가깝게 조정했다.
- `ExamPanel`의 제목 wrapper를 원본과 같은 `div.section-title`로 맞췄다.
- `tools/react-vite-interactive-parity-audit.mjs`가 시험 적 카드 내부 selector와 style evidence를 수집하고, React 전용 `exam-panel` 스코프 class는 `examPanel` 비교 노이즈로 처리한다.
- 최신 `npm run react:interactive-parity`: 통과, `student-시험` selector diff 0건, visual diff `1.7574%`, activePanel diff `0.2085%`
