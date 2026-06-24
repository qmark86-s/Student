# 부동산 도시 맵 고도화 계획

## Summary
- 부동산 탭 진입 기본 화면을 `도시 전체 보기`로 바꾸고, 10개 부동산 지역을 외곽에서 중심부로 갈수록 고등급인 선택 가능한 그리드 버튼으로 배치한다.
- 이용 가능한 지역을 누르면 `지역 상세 보기`로 전환한다. 상세 화면은 현재 부동산 scene을 대체하되, 하단 3개 metric 카드는 제거하고, 우상단에는 `전체 도시 보기` 복귀 버튼을 둔다.
- 상세 화면의 지도는 화면보다 면적 기준 4배 큰 200% x 200% 캔버스로 만들고, 마우스/터치 드래그로 상하좌우 이동 가능하게 한다.
- 지역 상세 화면은 첨부 이미지처럼 큰 픽셀/복셀풍 동네 배경 위에 건물이 들어서는 장면으로 만들고, 건물 구매 수량이 늘면 도시 전체 보기와 지역 상세 보기 모두에서 해당 지역의 건물 밀도/개발도가 즉시 증가한다.

## Key Changes
- 아트 방식은 혼합형으로 구현한다.
  - 생성형 bitmap 2장: 최종 성장 상태의 아이소메트릭/복셀풍 도시 전체 지도 `visual-real-estate-city-map.png`, 지역 상세용 대형 배경 `visual-real-estate-district-detail.png`.
  - 잠김/미개발/성장 표현은 React/CSS 오버레이와 데이터 기반 건물 슬롯으로 실시간 렌더링한다.
  - 초기에는 회색/빈 필지 오버레이가 강하게 덮이고, 보유 수량이 늘수록 오버레이가 줄며 건물 슬롯이 채워져 풀성장 도시 느낌에 가까워진다.
  - 지역 상세는 배경 이미지, 빈 부지 패드, 건물 오브젝트, 향후 주민/차량 레이어를 분리해 렌더링한다.
- 새 도시 레이아웃 데이터 `data/real_estate_city_layout.json`을 추가한다.
  - 10개 district는 기존 `real_estates.json.properties`의 id와 1:1 매칭한다.
  - 순서는 `small_studio -> two_room -> villa -> officetel -> shop_unit -> small_building -> apartment_building -> apartment_complex -> office_tower -> mixed_development`.
  - 각 district는 `polygon`, `labelAnchor`, `detailFocus`, `buildingSlots`, `help`를 가진다.
  - `real-estate:verify`에서 district 수, property id 매칭, 좌표 범위, 슬롯 누락, help 누락을 검사한다.
- React UI는 `overview / district` 2상태로 분리한다.
  - `mode === "realEstate"` 진입 시 기본은 `overview`.
  - `overview`: 전체 도시 이미지 위에 10개 district 버튼을 배치한다. 해금 지역은 클릭 가능, 잠김 지역은 Stage 조건을 표시한다.
  - 잠긴 district 클릭은 상세 진입 없이 짧은 안내/notice만 표시한다.
  - 해금 district 클릭 시 `selectedPropertyId`를 설정하고 상세 화면으로 전환한다.
  - 상세 화면의 구매 패널은 선택 지역 카드만 크게 보여준다. 랭킹/주간 보상 패널은 유지하되 compact하게 정리한다.
  - 상세 화면의 지도는 도시 전체 이미지 재사용이 아니라 `visual-real-estate-district-detail.png`를 사용하고, 그 위에 CSS 건물 오브젝트를 렌더링한다.
- 구매 반영 방식
  - `createRealEstateViewModel()`의 각 card에 `developmentLevel`, `developmentRatio`, `visibleBuildingSlots`를 추가한다.
  - 기준은 기존 규모 티어를 재사용한다: 0채, 1채, 10채, 50채, 100채, 300채, 1000채.
  - `구매 / 10개 / 최대` 실행 후 React state가 갱신되면 overview와 district view가 같은 데이터로 즉시 다시 렌더링된다.
  - 상세 화면에서는 미보유 상태에 빈 부지 패드만 보이고, 구매 수량이 늘면 `real-estate-development-building` 오브젝트가 순차적으로 채워진다.
- 기존 부동산 scene 하단 3개 metric card는 제거한다.
  - 필요한 정보는 상단 상태 타일과 하단 관리 패널에만 둔다.
- 상세 지도 드래그
  - pointer events 기반 pan을 구현한다.
  - 지도 content는 viewport의 200% x 200% 크기이며, 시작 위치는 선택 district의 `detailFocus`로 중앙 정렬한다.
  - pan은 가장자리 밖으로 빈 배경이 보이지 않도록 clamp한다.
  - `전체 도시 보기` 버튼은 pan 상태와 무관하게 우상단 고정 overlay로 둔다.

## Test Plan
- `npm run real-estate:verify`
  - 신규 `real_estate_city_layout.json` 검증 포함.
  - district 10개, property id 1:1 매칭, polygon/anchor/focus/slot 좌표 0~100 범위, help 누락 검사.
- `npm run react:real-estate-smoke`
  - 부동산 탭 기본 화면이 도시 전체 보기인지 확인.
  - district 버튼 10개 렌더링, 해금/잠김 상태 확인.
  - 해금 district 클릭 시 상세 화면 진입.
  - 잠김 district 클릭 시 상세 진입 없이 Stage 안내 표시.
  - 상세 화면에서 기존 3개 scene metric card가 사라졌는지 확인.
  - 상세 화면에서 지역 상세 배경 이미지와 빈 부지 패드 10개가 렌더링되는지 확인.
  - `전체 도시 보기` 버튼으로 overview 복귀 확인.
  - 드래그 후 지도 transform이 바뀌고 clamp 범위를 벗어나지 않는지 확인.
  - 구매 후 해당 district의 `real-estate-development-building`, `visibleBuildingSlots`, `data-development-level`이 증가하는지 확인.
  - full-growth seed에서 모든 district가 풀개발 상태로 표시되고 지역 상세 건물 10개가 렌더링되는지 확인.
- 기존 검증 유지
  - `npm run react:verify`
  - `npm run verify:mobile`
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 출력 0건
  - `git diff --check`
  - `mcp__UmgMcp.project_policy_gate` strict 통과

## Assumptions
- 혼합형 아트, 선택 지역 전용 구매 패널, 잠김 클릭 시 안내만 표시한다.
- save schema는 올리지 않는다. 선택된 district와 pan 위치는 UI local state이며 저장하지 않는다.
- 신규 bitmap은 도시 전체 지도 1장과 지역 상세 대형 배경 1장을 생성한다. 지역별 개별 배경 10장과 성장 단계별 이미지 다발은 이번 차수 범위에서 제외한다.
- 마을 사람/차량 이동은 이번 차수에서 구현하지 않지만, 상세 화면에 별도 ambient 레이어를 마련해 다음 차수에서 경로 기반 이동을 추가할 수 있게 한다.
- 기존 부동산 데이터/저장/수익/랭킹 보상 로직은 유지하고, 도시 시각화는 보유 수량에서 파생된 view model로만 만든다.
- 완료 후 `implementations/real-estate-city-map/implementation.md`, README/React 검증 문서를 갱신한다.
