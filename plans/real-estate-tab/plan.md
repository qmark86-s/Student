# 부동산 모드 탭 / 자산 랭킹 MVP 계획

## Summary
- 상단 모드 탭을 `학생 / 원정대 / 부동산` 3개로 확장하고, `부동산`은 원정대 오른쪽에 배치한다.
- 부동산은 `원정대 부동산 자금 획득 -> 부동산 수량 구매 -> 임대수익 자동 적립 -> 총 자산가치/주간 증가량 상승 -> 로컬 랭킹 preview` 루프로 구현한다.
- 초기 MVP에서는 일반 UI가 주간 랭킹 보상을 preview만 보여주고, 실제 다이아 지급은 QA/DEBUG 수동 버튼으로만 제공한다.
- 다음 차수 `plans/real-estate-weekly-reward/plan.md`에서 일반 주간 보상 수령 버튼을 추가한다.

## 구현 항목
1. 데이터
   - 루트 `data/`에 부동산 카탈로그, 규모 티어, 밸런스/랭킹 보상 JSON을 추가한다.
   - 카탈로그는 10종, 규모 티어는 6단계다.
   - 모든 주요 수치 필드는 한글 help를 포함한다.

2. 저장/로직
   - React save schema를 3으로 올리고 `realEstate` 상태를 추가한다.
   - schema 1/2 저장은 migration에서 부동산 기본 상태를 명시 추가한다.
   - `src/react/game/realEstate.js`에서 설정 검증, 저장 검증, 구매/수익/자산/랭킹/DEBUG 보상 로직을 담당한다.
   - `src/react/game/expedition.js`의 Stage 돌파 성공 보상에 부동산 자금을 연결하고, 별도 정산 함수로 원정대 방치 부동산 자금을 처리한다.

3. UI/아트
   - 초기 MVP 기준으로 생성 이미지 배경 3장을 `src/snapshot/assets/`에 저장하고 부동산 scene에서 자산 규모에 따라 사용한다.
   - 후속 `real-estate-city-map` 차수에서는 도시 전체 보기와 지역 상세 대형 배경 구조로 대체한다.
   - 상태 타일은 총 자산가치, 부동산 자금, 임대수익/분, 주간 증가량, 예상 랭킹을 표시한다.
   - 관리 패널은 부동산 카드 10개와 구매/10개/최대 버튼을 제공한다.
   - 초기 MVP 기준 QA/DEBUG 모드에서만 주간 보상 수령 버튼을 노출한다.

4. 검증/문서
   - `real-estate:verify`, `react:real-estate-smoke`를 추가하고 `react:verify`에 포함한다.
   - schema 3 seed가 필요한 React smoke를 갱신한다.
   - README, React 이식 문서, 구현 설명서를 최신화한다.

## 완료 기준
- `npm run react:verify`
- `npm run verify:mobile` 또는 `npm run visual:verify` + `npm run mobile:smoke`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict 통과

## 구현 리뷰 메모
- 데이터는 단일 `real_estate.json` 대신 현재 레포 구조에 맞춰 `data/real_estates.json`, `data/real_estate_scale_tiers.json`, `data/real_estate_balance.json`, `data/real_estate_rank_rewards.json`로 분리했다.
- 생성 이미지 3장은 초기 MVP 기준이다. 후속 `real-estate-city-map` 차수에서 `visual-real-estate-city-map.png`, `visual-real-estate-district-detail.png` 기반 도시 맵/지역 상세 구조로 대체했다.
- 초기 MVP에서는 일반 랭킹 영역에 수령 버튼을 두지 않았고, DEBUG/QA 모달에만 `부동산 주간 보상 수령` 버튼을 노출했다.
- `real-estate-weekly-reward` 차수에서 일반 랭킹 영역 수령 버튼과 주간 증가량 조건을 추가했다.
- 기존 schema 2 smoke seed는 migration 검증 목적으로 일부 유지하며, `react:save-smoke`에서 schema 3 및 `realEstate` 생성 여부를 확인한다.
