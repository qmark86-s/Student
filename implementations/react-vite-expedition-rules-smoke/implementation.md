# React/Vite 원정대 규칙 smoke 구현

## 개요
- 원정대 UI 조작 parity와 별도로, 상태 규칙을 실제 React 화면과 localStorage 저장 결과로 검증하는 smoke를 유지한다.
- 현재 smoke는 실시간 역할 전투, 수동/온라인 즉시 보상, 오프라인 pending 보상, 보스 다이아 1회 제한, 실패 롤백, 오프라인 정산 cap, 추천 편성, 성장/합성 규칙을 함께 검사한다.

## 변경 파일
- `src/react/game/expedition.js`
  - `completeExpeditionStage`, `resolveExpeditionAutoCombat`, `claimExpeditionPendingReward`가 실시간 역할 전투 결과와 즉시/pending 보상 규칙을 따른다.
  - 보스 패배 시 해당 구간 첫 Stage로 회귀하고 EXP/다이아/claim 보상을 지급하지 않는다.
  - 일반 Stage 패배 시 현재 Stage를 유지하고 보상을 지급하지 않는다.
  - 수동 성공 보상은 즉시 지급하고, 오프라인 정산 보상만 `save.expedition.pendingReward`에 누적한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - `dist`를 정적 서버로 띄우고 React 화면을 실제 클릭한다.
  - `boss-first-clear`, `boss-reward-not-repeated`, `boss-power-shortage-returns-to-segment-start`, `normal-power-shortage-keeps-stage`, `offline-auto-pending-and-cap`, `recommended-party-fills-top-five-by-power`, `growth-invest-levels-member`, `fusion-promotes-two-members` 8개 시나리오를 검사한다.
  - 마지막 전투 로그로 힐러 회복, 개별 몬스터 행동, 공격속도 차이를 확인한다.
  - 결과는 `artifacts/react-vite-expedition-rules-smoke/report.json`에 저장한다.
- `package.json`
  - `react:expedition-rules-smoke` 명령을 추가했다.
  - `react:verify`에 원정대 규칙 smoke를 포함했다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:expedition-rules-smoke`: 성공
  - 보스 첫 클리어: Stage 100 -> 101, `highestStage 100`, `claimedBossStages [100]`, 다이아/EXP/부동산 자금 즉시 지급, pending 미생성
  - 보스 보상 중복 방지: claim된 Stage 100 재처리 시 다이아 중복 지급/pending 없음
  - 보스 패배: Stage 100 -> 1, `highestStage 99` 유지, EXP/claim 미지급
  - 일반 Stage 패배: Stage 2 유지, EXP 미지급, 힐러 회복/몬스터 개별 행동 로그 확인
  - 오프라인 정산: 8시간 cap, 480전투 상한, pending EXP/부동산/다이아 누적과 `받기` 지급 확인
  - 추천 편성: 전투력순 상위 5명 편성 확인
  - 성장 투자: Lv.1 -> Lv.2, EXP 999 -> 981
  - 승급 합성: 사원 2명 -> 대리 1명

## 유지보수 기준
- 원정대 상태 규칙을 바꿀 때는 UI smoke인 `react:expedition-smoke`와 규칙 smoke인 `react:expedition-rules-smoke`를 함께 통과시킨다.
- 완료 판단은 `react:verify`에서 원정대 전투 밸런스 검증, 규칙 smoke, 기본 expedition smoke가 모두 통과하는지 확인한다.
