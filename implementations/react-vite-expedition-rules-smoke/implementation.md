# React/Vite 원정대 규칙 smoke 구현

## 개요
- 원정대 UI 조작 parity와 별도로, 상태 규칙을 실제 React 화면과 localStorage 저장 결과로 검증하는 smoke를 추가했다.
- `completeExpeditionStage`가 전투력 부족 상태를 무조건 클리어로 처리하지 않고, 보스/일반 Stage 기준에 맞는 상태 전이를 남기게 했다.

## 변경 파일
- `src/react/game/expedition.js`
  - `completeExpeditionStage`에서 `view.canClear`를 검사한다.
  - 보스 Stage 전투력 부족 시 해당 구간 첫 Stage로 회귀하고 EXP/다이아/claim 보상을 지급하지 않는다.
  - 일반 Stage 전투력 부족 시 현재 Stage를 유지하고 보상을 지급하지 않는다.
  - 성공 처리의 보스 첫 보상, 중복 claim 방지, 성장 EXP 적립 흐름은 기존 로직을 유지한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - `dist-react`를 정적 서버로 띄우고 React 화면을 실제 클릭한다.
  - `boss-first-clear`, `boss-reward-not-repeated`, `boss-power-shortage-returns-to-segment-start`, `normal-power-shortage-keeps-stage`, `growth-invest-levels-member`, `fusion-promotes-two-members` 6개 시나리오를 검사한다.
  - 결과는 `artifacts/react-vite-expedition-rules-smoke/report.json`에 저장한다.
- `package.json`
  - `react:expedition-rules-smoke` 명령을 추가했다.
  - `react:verify`에 원정대 규칙 smoke를 포함했다.
- `tools/react-vite-full-parity-gate.mjs`
  - full gate가 원정대 규칙 smoke report를 읽고 `expedition-rules-state` completion evidence로 기록한다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:expedition-rules-smoke`: 성공
  - 보스 첫 클리어: Stage 100 -> 101, `highestStage 100`, `claimedBossStages [100]`, 다이아 100 -> 125, EXP 0 -> 30
  - 보스 보상 중복 방지: claim된 Stage 100 재처리 시 다이아 777 유지
  - 보스 전투력 부족: Stage 100 -> 1, `highestStage 99` 유지, EXP/claim 미지급
  - 일반 Stage 전투력 부족: Stage 2 유지, EXP 미지급
  - 성장 투자: Lv.1 -> Lv.2, EXP 999 -> 981
  - 승급 합성: 사원 2명 -> 대리 1명

## 유지보수 기준
- 원정대 상태 규칙을 바꿀 때는 UI smoke인 `react:expedition-smoke`와 규칙 smoke인 `react:expedition-rules-smoke`를 함께 통과시킨다.
- 완료 판단은 `react:full-parity`에서 `expedition-rules-state` evidence가 `pass`인지 확인한다.

