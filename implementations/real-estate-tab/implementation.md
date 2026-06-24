# 부동산 모드 탭 / 자산 랭킹 MVP 구현

## 개요

- 상단 모드 탭을 `학생 / 원정대 / 부동산` 3개로 확장했다.
- 부동산은 기존 보유금과 분리된 `부동산 자금`으로 동작한다.
- 핵심 루프는 `원정대 Stage 돌파/방치 자금 -> 매물 수량 구매 -> 임대수익 자동 정산 -> 총 자산가치/주간 증가량 -> 로컬 랭킹 preview -> 주간 보상 수령`이다.
- 일반 랭킹 영역은 예상 순위, 예상 보상, 일반 주간 보상 수령 버튼을 보여준다. DEBUG/QA 버튼은 같은 주차 중복 방지 상태를 공유하는 수동 검증용 경로로 유지한다.

## 데이터

- `data/real_estates.json`
  - 10개 매물: 작은 원룸, 투룸, 빌라, 오피스텔, 상가 점포, 꼬마빌딩, 아파트 동, 아파트 단지, 오피스 빌딩, 복합 개발지.
  - 각 매물은 `unlockStage`, `basePrice`, `priceGrowth`, `baseIncomePerMinute`, `assetValue`, `assetValueGrowth`, `artStage`, 한글 `help`를 가진다.
- `data/real_estate_scale_tiers.json`
  - 6개 규모 티어: 1채, 라인 10채, 블록 50채, 단지 100채, 타운 300채, 도시 1000채.
- `data/real_estate_balance.json`
  - 전용 재화 표시, 임대 정산 주기/오프라인 한도, 원정대 Stage/보스/방치 보상, 랭킹 preview, 배경 단계 설정.
- `data/real_estate_rank_rewards.json`
  - 로컬/mock 랭킹 preview와 일반/DEBUG 주간 수령에 쓰는 다이아 보상표.

## 저장/로직

- `src/react/game/save.js`
  - `SAVE_SCHEMA_VERSION`을 3으로 올렸다.
  - `realEstate` 저장 필드를 필수 검증한다.
  - schema 1/2 save migration에서 `createDefaultRealEstateState()`를 명시 추가한다.
  - schema 3에서 `realEstate`가 없거나 잘못되면 fatal load 검증으로 드러난다.
- `src/react/game/realEstate.js`
  - 데이터 검증, 저장 검증/정규화, 구매가/최대 구매 계산, 임대수익, 원정대 방치 자금, 총 자산가치, 주간 증가량, 랭킹 preview, 일반/DEBUG 보상 수령을 담당한다.
  - 총 자산가치 공식은 `보유 부동산 평가액 + floor(부동산 자금 * cashAssetWeight)`다.
  - 임대수익과 원정대 방치 자금은 최대 8시간까지만 반영한다.
- `src/react/game/expedition.js`
  - Stage 돌파 성공 시 `grantRealEstateExpeditionStageReward()`로 부동산 자금을 지급한다.
  - 보스 Stage는 `real_estate_balance.json`의 보스 배수를 적용한다.

## UI/아트

- `src/react/App.jsx`
  - `mode === "realEstate"` 분기를 추가했다.
  - 상태 타일은 총 자산, 부동산 자금, 임대/분, 주간 증가, 예상 순위를 표시한다.
  - 초기 MVP의 3단계 scene 배경은 후속 `real-estate-city-map` 차수에서 도시 전체 보기/지역 상세 보기 구조로 대체되었다.
  - 관리 패널은 매물 카드 10개, 일반 `주간 보상 수령` 버튼, `구매 / 10개 / 최대` 버튼을 제공한다.
  - DEBUG 모달의 `부동산 주간 보상 수령` 버튼은 QA용으로 유지했다.
- 후속 도시 맵 차수의 생성 배경 이미지
  - `src/snapshot/assets/visual-real-estate-city-map.png`
  - `src/snapshot/assets/visual-real-estate-district-detail.png`
- `src/react/styles.css`
  - 모드 탭을 3분할 grid로 조정했다.
  - 부동산 scene, 랭킹 preview, 카드/버튼/모바일 레이아웃 스타일을 추가했다.

## 검증

- 추가 명령
  - `npm run real-estate:verify`
  - `npm run react:real-estate-smoke`
- `react:verify`에 부동산 데이터 검증과 부동산 smoke를 포함했다.
- `react:save-smoke`는 schema 2 seed가 schema 3과 `realEstate` 기본 상태로 migrate되는지 확인한다.
- `react:expedition-smoke`는 Stage 돌파 후 부동산 자금이 증가하는지 확인한다.
- `react:real-estate-smoke`는 일반 주간 보상 수령과 DEBUG 중복 방지를 함께 검사한다.
- `react:responsive-audit`는 모드 탭 3개 기준으로 갱신했다.

## 주의사항

- 부동산은 v1에서 기존 보유금, 학생 성장, 상점, 직업 수입과 환전하지 않는다.
- 일반 플레이어용 주간 보상은 `real_estate_balance.json.ranking.minimumWeeklyAssetGainForClaim` 이상의 주간 자산 증가량이 있을 때만 수령 가능하다. DEBUG/QA 버튼은 같은 주차 수령 키를 공유하므로 일반 수령 뒤에는 비활성화된다.
- 새 매물/보상/배경 단계 추가 시 JSON의 한글 `help`와 `tools/validate-real-estate-config.mjs` 검증 기준을 함께 갱신해야 한다.
- 도시 전체 보기/지역 상세 보기/개발도 시각화 기준은 `implementations/real-estate-city-map/implementation.md`를 우선 참고한다.
