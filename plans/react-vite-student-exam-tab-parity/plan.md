# React/Vite 학생 시험 탭 패리티 보강 계획

## 목표
- 학생 `시험` 탭을 원본 HTML의 compact 학년 전투 패널과 맞춘다.
- React의 리스트형 적 행을 원본의 3열 `battle-enemy-card` 구조로 복구한다.
- 시험 요약, 완료 버튼, 빈 기록 표시를 원본 크기와 간격으로 맞춘다.

## 근거
- 원본 시험 탭은 `.viewport > .stack` 구조에서 section title, `battle-summary-panel`, `battle-enemy-grid`, primary action, empty state를 8px gap으로 배치한다.
- 원본 `battle-summary-panel`은 370x64px, 3개 metric을 9px gap으로 표시한다.
- 원본 `battle-enemy-grid`는 370x56px, 3열 카드이며 각 `battle-enemy-card`는 28px 몬스터, 제목/종류, 5px HP bar, HP 텍스트를 포함한다.
- React 시험 탭은 `record-summary-grid`와 `list-row` 기반으로 세로 목록을 렌더링해 visual diff가 높다.

## 구현 범위
1. `ExamPanel`을 원본형 `viewport`/`stack` 안의 `battle-summary-panel`, `battle-enemy-grid`, `battle-enemy-card` 구조로 변경한다.
2. 각 적 카드는 기존 `enemyFrame`, `enemyName`, `enemyStyle`, `frameXPercent`를 사용해 main monster atlas를 표시한다.
3. 학년/수능 공통으로 적 카드 3개 또는 현재 battle enemy 수를 데이터 기반 렌더링한다.
4. 적 HP bar, boss/suneung 색상, active/defeated 상태를 CSS로 표시한다.
5. `react:records-smoke`가 시험 enemy card 수와 summary/card 높이를 검증하도록 강화한다.

## 검증 기준
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:battle-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`

## 구현 결과
- `ExamPanel`을 `viewport exam-panel > stack exam-stack` 구조로 바꿨다.
- 시험 요약은 `.battle-summary-panel` 3개 metric으로 렌더링한다.
- 시험 적은 `.battle-enemy-grid > .battle-enemy-card` 구조로 렌더링하고, 적 atlas 배경 이미지와 HP bar를 표시한다.
- `activeEnemyForBattle`는 렌더 루프 밖에서 한 번 계산해 active 카드 표시만 담당한다.
- `tools/react-vite-records-smoke.mjs`는 더 이상 `.exam-progress-card`를 검사하지 않고, `.battle-summary-panel`, `.battle-enemy-card`, `.battle-enemy-monster`, `.enemy-hp-bar`와 높이를 검사한다.

## 2026-06-24 검증 결과
- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과, 시험 요약 1개, 시험 적 카드 1개, 몬스터 이미지 1개, HP bar 1개, 요약 높이 64px, 적 grid 높이 56px 확인
- `npm run react:battle-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

## 2026-06-24 추가 보정
- 원본 적 카드 sprite에 맞춰 React `battle-enemy-monster`의 opacity, shadow, boss/suneung 크기, 제목 weight/color를 보정했다.
- `ExamPanel`의 section title wrapper를 원본과 같은 `div.section-title` 구조로 맞췄다.
- `tools/react-vite-interactive-parity-audit.mjs`는 시험 적 카드 내부의 몬스터, 제목, 종류, HP bar/fill/text selector까지 수집한다.
- React 전용 `exam-panel` 스코프 class는 실제 UI 차이가 아니므로 `examPanel` selector 비교에서 노이즈로 세지 않는다.
- 최신 `react:interactive-parity` 기준 `student-시험` selector diff는 0건, visual diff는 `1.7574%`, activePanel diff는 `0.2085%`다.
