# React/Vite 원정대 규칙 smoke 계획

## 목표
- React/Vite 원정대가 화면 레이아웃뿐 아니라 상태 규칙까지 검증되게 한다.
- 보스 Stage, 전투력 부족 처리, EXP 성장 투자, 동료 합성 승급을 브라우저 smoke로 직접 확인한다.
- 기존 full parity gate가 원정대 UI 조작과 함께 원정대 규칙 smoke도 실행하게 한다.

## 구현 범위
1. `completeExpeditionStage`가 `canClear`를 사용해 전투력 부족 상태를 명시 처리한다.
2. 보스 Stage에서 전투력이 부족하면 해당 구간 시작 Stage로 회귀하고, 보상과 보스 클리어 기록을 지급하지 않는다.
3. 일반 Stage에서 전투력이 부족하면 현재 Stage를 유지하고 보상을 지급하지 않는다.
4. 보스 Stage 첫 클리어는 다이아 보상과 `claimedBossStages`를 기록하고, 같은 보스가 이미 claim된 상태에서는 다이아를 중복 지급하지 않는다.
5. 성장 탭의 투자 버튼은 `trainingExp`를 소모하고 원정대원 level을 올린다.
6. 동료 관리 탭의 합성 버튼은 같은 직업/승급 단계 동료 2명을 다음 승급 1명으로 합성한다.
7. `tools/react-vite-expedition-rules-smoke.mjs`를 추가해 위 규칙을 실제 React 화면과 localStorage 상태로 검사한다.
8. `package.json`과 `tools/react-vite-full-parity-gate.mjs`에 새 smoke를 연결한다.

## 검증 기준
- `npm run react:build`
- `npm run react:expedition-rules-smoke`
- `npm run react:expedition-smoke`
- `npm run react:full-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`

