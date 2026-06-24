# 부동산 일반 주간 보상 수령 계획

## Summary
- 부동산 MVP의 다음 차수로 일반 플레이어가 부동산 랭킹 패널에서 주간 다이아 보상을 직접 수령할 수 있게 한다.
- DEBUG/QA 전용 수령 버튼은 유지하되, 일반 수령과 같은 `claimedWeeklyRewardWeek` 중복 방지 상태를 공유한다.
- 무료 반복 보상을 막기 위해 일반 수령은 주간 자산 증가량이 데이터 설정값 이상일 때만 가능하게 한다.

## 구현 항목
1. 데이터/검증
   - `data/real_estate_balance.json`의 `ranking`에 `minimumWeeklyAssetGainForClaim` 파라미터와 한글 help를 추가한다.
   - `data/real_estate_rank_rewards.json`의 diamonds help를 일반/DEBUG 공용 주간 보상 설명으로 갱신한다.
   - `src/react/game/realEstate.js`와 `tools/validate-real-estate-config.mjs`의 ranking 검증 기준에 새 파라미터를 포함한다.

2. 저장/로직
   - `src/react/game/realEstate.js`에 일반 수령 함수 `claimRealEstateWeeklyReward()`를 추가한다.
   - DEBUG 수령은 내부 공용 지급 로직을 재사용하되 QA 편의를 위해 주간 증가량이 없어도 수령 가능하게 유지한다.
   - view model에 `canClaimWeeklyReward`, `weeklyRewardMinGain`, `weeklyRewardButtonLabel`, `weeklyRewardHint`를 포함한다.
   - 같은 주차에는 일반 UI와 DEBUG/QA 중 어느 쪽에서 먼저 받더라도 두 번째 수령은 막는다.

3. UI
   - `RealEstateManagementPanel`의 랭킹 패널에 일반 `주간 보상 수령` 버튼을 추가한다.
   - 버튼은 수령 가능/증가 필요/수령 완료 상태를 명확히 표시하고, 모바일 폭에서 기존 metric과 겹치지 않게 CSS grid를 조정한다.

4. 검증/문서
   - `react:real-estate-smoke`에서 일반 버튼 초기 비활성, 자산 증가 후 수령, 다이아 증가, 중복 방지, DEBUG 버튼 중복 방지를 검사한다.
   - README, React 검증 문서, 기존 부동산 구현 문서, 신규 구현 문서를 최신화한다.

## 완료 기준
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:shop-debug-smoke`
- `npm run react:responsive-audit`
- `npm run react:verify`
- `npm run verify:mobile`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict 통과
