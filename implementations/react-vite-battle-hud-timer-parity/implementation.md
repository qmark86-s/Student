# React/Vite 전투 HUD 남은 시간 패리티 구현

## 개요

React 전투 HUD의 제한시간 숫자가 실제 남은 시간이 아니라 전체 제한시간을 계속 표시하던 문제를 수정했다. 진행 bar와 전투 결과의 경과 시간은 이미 `elapsedMs`를 반영하고 있었으나, HUD 숫자만 `60초`로 고정되어 원본 HTML 캡처와 다르게 보였다.

## 변경 파일

- `src/react/App.jsx`
  - `BattleArena`의 `displayRemainingSeconds` 계산을 `maxDurationMs - elapsedMs` 기준으로 변경했다.
- `tools/react-vite-battle-road-smoke.mjs`
  - 자동 전투가 켜진 `?qaTools=1` 페이지를 별도로 열어 `battle.elapsedMs`가 1초 이상 진행된 뒤 HUD 숫자를 검사한다.
  - `.battle-arena-progress strong`의 숫자가 `Math.ceil((maxDurationMs - elapsedMs) / 1000)`와 다르면 실패한다.

## 검증 결과

- `npm run react:verify`: 통과
- `npm run react:build`: 통과
- `npm run react:battle-smoke`: 통과
  - `liveTimer.elapsedMs`: `1000`
  - `liveTimer.maxDurationMs`: `60000`
  - `liveTimer.hudText`: `59초`
  - `liveTimer.expectedSeconds`: `59`
- `npm run react:records-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

## 패리티 변화

- `student-성장`: `1.6969%`에서 `1.6769%`
- `student-시험`: `2.647%`에서 `2.6263%`
- `student-동료`: `2.379%`에서 `2.357%`
- `student-직장`: `1.7763%`에서 `1.7543%`
- `student-교육`: `1.731%`에서 `1.7112%`
- `student-결과`: `3.8238%`에서 `3.8035%`
- `student-도감`: `2.7787%`에서 `2.7571%`

## 확인 산출물

- `artifacts/react-vite-interactive-parity/student-시험-snapshot.png`
- `artifacts/react-vite-interactive-parity/student-시험-react.png`
- `artifacts/react-vite-interactive-parity/report.json`
