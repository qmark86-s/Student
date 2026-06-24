# 부동산 일반 주간 보상 수령 구현

## 개요

- 부동산 랭킹 패널에 일반 플레이어용 `주간 보상 수령` 버튼을 추가했다.
- 일반 수령은 주간 자산 증가량이 `real_estate_balance.json.ranking.minimumWeeklyAssetGainForClaim` 이상일 때만 가능하다.
- 일반 수령과 DEBUG/QA 수령은 같은 `claimedWeeklyRewardWeek`를 사용해 같은 주차 중복 지급을 막는다.

## 변경 파일

- `data/real_estate_balance.json`
  - `ranking.minimumWeeklyAssetGainForClaim`과 한글 help를 추가했다.
- `data/real_estate_rank_rewards.json`
  - 보상표 help를 일반/DEBUG 공용 주간 수령 설명으로 갱신했다.
- `src/react/game/realEstate.js`
  - `claimRealEstateWeeklyReward()`를 추가했다.
  - DEBUG 수령은 공용 지급 로직을 재사용하되 QA 편의를 위해 주간 증가량이 없어도 수령 가능하게 유지했다.
  - view model에 `canClaimWeeklyReward`, `weeklyRewardMinGain`, `weeklyRewardButtonLabel`, `weeklyRewardHint`를 추가했다.
- `src/react/App.jsx`
  - 부동산 관리 패널의 랭킹 영역에 일반 수령 버튼을 연결했다.
- `src/react/styles.css`
  - 랭킹 패널을 `예상 순위 / 예상 보상 / 보상 구간 / 수령 버튼` 구조로 확장하고 모바일 1열 배치를 유지했다.
- `tools/validate-real-estate-config.mjs`
  - 새 ranking 파라미터와 help 누락을 검증한다.
- `tools/react-vite-real-estate-smoke.mjs`
  - 초기 일반 수령 버튼 비활성, 자산 증가 후 일반 수령, 다이아 증가, 일반/DEBUG 중복 방지를 검사한다.

## 동작 기준

- 주간 증가량이 기준 미만이면 버튼은 `증가 필요`로 비활성화된다.
- 수령 가능 상태에서는 `주간 보상 수령` 버튼이 활성화되고, 클릭 시 기존 다이아가 지급된다.
- 수령 후에는 버튼이 `수령 완료`로 바뀌며, QA DEBUG 모달의 `부동산 주간 보상 수령` 버튼도 비활성화된다.
- DEBUG/QA 버튼은 QA 편의를 위해 주간 증가량이 없어도 참여 보상 수령이 가능하지만, 일반 수령과 같은 주차 중복 방지를 공유한다.

## 검증

- `npm run real-estate:verify`: 통과
- `npm run react:build`: 통과
- `npm run react:real-estate-smoke`: 통과
- `npm run react:shop-debug-smoke`: 통과
- `npm run react:responsive-audit`: 통과
- `npm run react:verify`: 통과
- `npm run verify:mobile`: 통과
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`: 출력 0건
- `git diff --check`: 통과
- `mcp__UmgMcp.project_policy_gate` strict: 통과

## 연관 문서

- `plans/real-estate-weekly-reward/plan.md`
- `implementations/real-estate-tab/implementation.md`
- `docs/react-vite-parity-migration.md`
- `README.md`
