# React/Vite 전투 scene selector evidence 보강 계획

## 목표
- 학생 탭 전체에 반복되는 scene visual diff의 원인을 전투장 내부 selector 단위로 분리한다.
- 적 편대, 적 HP bar, 학생 sprite, 배경, 진행 bar가 원본 HTML과 React에서 같은 rect/style/source를 쓰는지 `react:interactive-parity` 리포트에 남긴다.
- 런타임 fallback이나 임시 대체는 추가하지 않는다.

## 구현 범위
1. `tools/react-vite-interactive-parity-audit.mjs`의 selector probe에 전투장 내부 selector를 추가한다.
2. 전투장 내부 selector는 `battleScene`, `battlePixelArena`, `battleBackgroundSheet`, `battleSpeechBubble`, `battleStudentSprite`, `battleStudentArt`, `battleLineup`, `battleEnemy`, `battleEnemyMonsterArt`, `battleEnemyHp`, `battleEnemyHpFill`, `battleProgress`, `battleProgressFill`, `battleDebugButton`, `battleAutoToggle`를 포함한다.
3. `layoutSignatures`에 적 편대와 적 HP bar row signature를 추가해 visual hotspot이 어느 rect와 겹치는지 추적한다.
4. `react:interactive-parity`를 다시 실행해 selectorDiffs 0건인지 확인한다.

## 검증 기준
- `npm run react:interactive-parity`
- `npm run react:verify`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`

## 2026-06-24 구현 결과
- 전투장 내부 selector evidence와 `battleEnemies`, `battleEnemyHpBars` layout signature를 추가했다.
- 원본 HTML 모바일 HP bar 규칙과 맞춰 React `.battle-scene-hp`를 390px 이하에서 `top -16px`, `width 96px`, `height 12px`로 보정했다.
- React `CurriculumAttackVfx`가 원본처럼 `vfx.token`을 실제 span 텍스트로 렌더링하게 했다.
- `react:interactive-parity`는 양쪽 자동 전투 interval을 같은 조건으로 멈춰 탭 순회 중 상태가 갈라지지 않게 했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건, 학생 전투 selector diff 0건.
- `student-시험`: visual diff `0.3213%`, scene diff `0.6848%`, activePanel diff `0.1613%`.
- `00-initial`: visual diff `0.214%`, scene diff `0.6148%`, activePanel diff `0%`.
- `student-교육`: text 일치, state diff 0건, visual diff `0.2874%`, scene diff `0.6763%`, activePanel diff `0.1023%`.
- `npm run react:verify`, `npm run react:deep-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.
