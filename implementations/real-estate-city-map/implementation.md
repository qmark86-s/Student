# 부동산 도시 맵 고도화 구현

## 개요

- 부동산 탭 기본 진입 화면을 `도시 전체 보기`로 변경했다.
- 도시 전체 보기에는 10개 부동산 지역 버튼을 표시하며, 잠긴 지역은 Stage 조건 안내만 표시하고 상세 화면으로 진입하지 않는다.
- 해금 지역을 누르면 `지역 상세 보기`로 전환된다. 상세 화면은 200% x 200% 대형 배경 위를 pointer drag로 이동할 수 있고, 우상단 `전체 도시 보기` 버튼으로 복귀한다.
- 구매 수량이 늘면 도시 전체 보기와 지역 상세 보기의 개발도가 같은 view model에서 즉시 갱신된다.

## 데이터

- `data/real_estate_city_layout.json`
  - `real_estates.json.properties` 10개 id와 1:1 순서로 매칭되는 district 데이터를 추가했다.
  - 각 district는 `polygon`, `labelAnchor`, `detailFocus`, `buildingSlots`, 한글 `help`를 가진다.
  - `polygon`은 도시 전체 보기의 클릭 가능 영역, `labelAnchor`는 지역 라벨 위치, `detailFocus`는 상세 진입 시 pan 시작점, `buildingSlots`는 개발도에 따라 채워질 도시 전체 마커 위치다.
- `tools/validate-real-estate-config.mjs`
  - 도시 레이아웃 JSON 검증을 추가했다.
  - district 수, property id 순서, 좌표 0~100 범위, building slot 최소 개수, help 누락을 검사한다.

## 로직

- `src/react/game/realEstate.js`
  - `real_estate_city_layout.json`을 import하고 런타임 설정 검증에 포함했다.
  - `createRealEstateViewModel()`의 카드별 결과에 다음 필드를 추가했다.
    - `developmentLevel`: 0채, 1채, 10채, 50채, 100채, 300채, 1000채 기준 개발 단계.
    - `developmentRatio`: UI 표기용 개발도 퍼센트.
    - `districtPolygon`, `districtLabelAnchor`, `districtDetailFocus`: 도시 맵 렌더링 좌표.
    - `buildingSlots`, `visibleBuildingSlots`: 보유 수량 기반 시각화 슬롯.

## UI/아트

- 생성 이미지 자산
  - `src/snapshot/assets/visual-real-estate-city-map.png`: 도시 전체 보기 배경.
  - `src/snapshot/assets/visual-real-estate-district-detail.png`: 최초 지역 상세 공용 대형 배경. 2026-06-25 `real-estate-district-assets` 차수에서 지역별 상세 배경 10장으로 교체되었다.
- `src/react/App.jsx`
  - 부동산 scene을 `overview / district` 2상태로 분리했다.
  - `RealEstateOverviewScene`은 도시 전체 지도, 10개 district 버튼, 개발 마커, 잠김 안내를 렌더링한다.
  - `RealEstateDistrictScene`은 상세 배경, drag pan, 선택 지역 헤더, 전체 도시 보기 버튼을 렌더링한다.
  - 상세 구매 패널은 선택된 지역 카드 1개만 보여준다.
  - 기존 scene 하단 3개 metric card 영역은 렌더링하지 않는다.
- `src/react/styles.css`
  - 도시 전체 district polygon 버튼과 잠김/해금/보유 상태 스타일을 추가했다.
  - 상세 화면에는 빈 부지 패드, `real-estate-development-building` 건물 오브젝트, `real-estate-ambient-layer`를 분리했다.
  - `real-estate-ambient-layer`는 이번 차수에서 비어 있지만, 다음 차수 주민/차량 이동 레이어를 얹기 위한 자리다.

## 검증

- `npm run real-estate:verify`
  - 부동산 카탈로그/규모/밸런스/랭킹 보상/도시 레이아웃 검증.
- `npm run react:real-estate-smoke`
  - 모드 탭 3개, 도시 전체 보기 기본 진입, 10개 지역 버튼, 잠김 안내, 상세 대형 배경, 상세 drag pan, 구매 후 상세 건물/도시 전체 개발도 증가, 풀성장 지역 상세 건물 10개, 임대수익, 랭킹, 일반/DEBUG 보상 중복 방지를 검사한다.

## 생성 이미지 프롬프트

- 도시 전체 배경은 최종 성장 상태의 아이소메트릭/복셀풍 도시 전체 지도, 텍스트/워터마크 없음, 모바일 게임용 밝은 색감으로 생성했다.
- 지역 상세 배경은 첨부 이미지 같은 픽셀/복셀풍 동네 장면, 전경과 중경에 건물을 얹을 수 있는 빈 필지, 텍스트/워터마크/캐릭터/UI 없음 조건으로 생성했다.

## 주의사항

- 선택 지역과 pan 위치는 UI local state이며 저장 schema를 올리지 않는다.
- 지역별 개별 상세 배경 10장은 후속 `implementations/real-estate-district-assets/implementation.md`에서 정식 리소스로 추가했다. 성장 단계별 bitmap 묶음은 아직 제외되어 있으며, 보유 수량 시각화는 CSS/데이터 기반 오버레이로 처리한다.
- 건물 수량에 따른 시각화는 저장 데이터를 직접 보관하지 않고 `owned count -> developmentLevel -> visibleBuildingSlots`로 파생한다.
- 도시 레이아웃 좌표나 슬롯을 바꾸면 `real-estate:verify`, `react:real-estate-smoke`, `react:responsive-audit`를 함께 확인한다.
