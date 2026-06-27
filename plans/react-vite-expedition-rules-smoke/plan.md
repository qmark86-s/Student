# React/Vite 원정대 규칙 smoke 계획

## 목표
- React/Vite 원정대가 화면 레이아웃뿐 아니라 상태 규칙까지 검증되게 한다.
- 보스 Stage, 실시간 역할 전투 결과, 즉시/pending 보상 분리, EXP 성장 투자, 동료 합성 승급을 브라우저 smoke로 직접 확인한다.
- 기존 full parity gate가 원정대 UI 조작과 함께 원정대 규칙 smoke도 실행하게 한다.

## 구현 범위
1. `completeExpeditionStage`와 자동 정산이 `simulateExpeditionBattle` 결과를 사용해 성공/실패를 판정한다.
2. 보스 Stage에서 패배하면 해당 구간 시작 Stage로 회귀하고, 보상과 보스 클리어 기록을 지급하지 않는다.
3. 일반 Stage에서 패배하면 현재 Stage를 유지하고 보상을 지급하지 않는다.
4. 수동 보스 Stage 첫 클리어는 EXP, 부동산 자금, 다이아를 즉시 지급하고 `claimedBossStages`를 기록한다.
5. 같은 보스가 이미 claim된 상태에서는 다이아를 중복 지급하거나 pending에 누적하지 않는다.
6. 공속 1.0/1.5 행동 횟수 차이, 힐러 회복, 앞 슬롯 우선 타겟팅, 개별 몬스터 참여를 마지막 전투 로그로 검사한다.
7. 8시간 오프라인 정산 cap, 480전투 처리 상한, pending 보상 누적과 `받기` 지급을 검사한다.
8. 성장 탭의 투자 버튼은 `trainingExp`를 소모하고 원정대원 level을 올린다.
9. 동료 관리 탭의 합성 버튼은 같은 직업/승급 단계 동료 2명을 다음 승급 1명으로 합성한다.
10. 파티 탭의 `추천 편성` 버튼은 전투력순 상위 5명을 편성한다.
11. `tools/react-vite-expedition-rules-smoke.mjs`가 위 규칙을 실제 React 화면과 localStorage 상태로 검사한다.

## 검증 기준
- `npm run react:build`
- `npm run react:expedition-rules-smoke`
- `npm run react:expedition-smoke`
- `npm run react:verify`
