# React/Vite 전투 HUD 남은 시간 패리티 계획

## 목표
- 학생 전투 HUD의 제한시간 숫자가 원본 HTML처럼 실제 남은 시간을 표시하게 한다.
- 진행 bar는 `elapsedMs`를 반영하는데 숫자만 항상 `60초`로 남던 React 표시 버그를 제거한다.
- 이 버그가 학생 `시험`, `결과`, `도감` 등 전투장이 함께 보이는 모든 탭의 visual diff를 키우지 않게 한다.
- 자동 전투가 진행되는 라이브 상태에서도 HUD 숫자와 저장 상태의 `battle.elapsedMs`가 일치하는지 smoke에서 검증한다.

## 구현 범위
1. `src/react/App.jsx`의 `BattleArena`에서 `displayRemainingSeconds`를 `maxDurationMs - elapsedMs` 기준으로 계산한다.
2. `tools/react-vite-battle-road-smoke.mjs`에 자동 전투가 켜진 별도 페이지를 열어 live timer를 검사하는 케이스를 추가한다.
3. smoke는 `battle.elapsedMs`, `battle.maxDurationMs`, `.battle-arena-progress strong` 텍스트를 비교한다.
4. 기존 `pauseAutoBattle=1` 기반 DEBUG 진행 검증은 유지한다.
5. 원본/React interactive 캡처를 다시 생성해 상단 HUD 숫자가 같아졌는지 확인한다.

## 검증 기준
- `npm run react:verify`
- `npm run react:build`
- `npm run react:battle-smoke`
- `npm run react:records-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`

## 2026-06-24 결과
- React `BattleArena`의 제한시간 숫자가 `Math.ceil((maxDurationMs - elapsedMs) / 1000)` 기준으로 표시된다.
- `react:battle-smoke`의 `liveTimer` 검증에서 `elapsedMs: 1000`, `maxDurationMs: 60000`, `hudText: "59초"`, `expectedSeconds: 59`를 확인했다.
- `student-시험-react.png`는 원본과 같은 `58초` HUD를 표시한다.
- `npm run react:verify`는 build, smoke, save-smoke, battle-smoke, expedition-smoke, records-smoke, education-smoke, shop-debug-smoke, responsive-audit 전체를 통과했다.
- `react:interactive-parity`는 23개 조작 시나리오 failure 0건을 유지했다.
- 학생 탭 visual diff는 전반적으로 소폭 감소했다. 예: `student-시험` `2.647%`에서 `2.6263%`, `student-결과` `3.8238%`에서 `3.8035%`.
