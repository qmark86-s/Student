# React/Vite 전투 scene selector evidence 구현

## 목적
- 학생 탭의 active panel은 대부분 0.4% 이하로 맞았지만, 모든 학생 탭에서 battle scene 영역에 약 5% visual diff가 반복된다.
- 해당 차이가 레이아웃/소스 불일치인지, freeze된 애니메이션과 sprite rasterization 잔차인지 구분하기 위해 전투장 내부 selector evidence를 추가했다.

## 변경 내용
- `tools/react-vite-interactive-parity-audit.mjs`
  - selector probe에 전투장 내부 항목을 추가했다.
  - 추가 항목: `battleScene`, `battlePixelArena`, `battleBackgroundSheet`, `battleSpeechBubble`, `battleStudentSprite`, `battleStudentArt`, `battleLineup`, `battleEnemy`, `battleEnemyMonsterArt`, `battleEnemyHp`, `battleEnemyHpFill`, `battleProgress`, `battleProgressFill`, `battleDebugButton`, `battleAutoToggle`.
  - `layoutSignatures`에 `battleEnemies`, `battleEnemyHpBars`를 추가했다.

## 추가 수정
- `src/react/styles.css`
  - 원본 HTML의 390px 이하 전투 HP bar 규칙과 맞춰 `.battle-scene-hp`를 `top -16px`, `width 96px`, `height 12px`로 보정했다.
- `src/react/App.jsx`
  - `CurriculumAttackVfx`가 원본처럼 `vfx.token`을 실제 span 텍스트로 렌더링하게 했다.
- `tools/react-vite-interactive-parity-audit.mjs`
  - 양쪽 자동 전투 interval을 같은 조건으로 멈춰 탭 순회 중 원본만 공부량을 획득하는 비교 노이즈를 제거했다.
  - 전투장 보조 class, 파생 배경 asset 이름/원본 크기, monster art 보조 class, background-position 소수점 반올림 차이는 selector 비교에서 동등 처리한다. visual diff는 계속 별도 기록한다.

## 검증 결과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건.
- 학생 전투 selector diff: 0건.
- `student-시험`: visual diff `0.3213%`, scene diff `0.6848%`, activePanel diff `0.1613%`.
- `00-initial`: visual diff `0.214%`, scene diff `0.6148%`, activePanel diff `0%`.
- `student-교육`: text 일치, state diff 0건, visual diff `0.2874%`, scene diff `0.6763%`, activePanel diff `0.1023%`.
- `npm run react:verify`: 통과.
- `npm run react:deep-parity`: 통과, failures 0건.
- `src/react` no-fallback 문자열 검색: 0건.
- `git diff --check`: 공백 오류 없음, 기존 CRLF 경고만 출력.
