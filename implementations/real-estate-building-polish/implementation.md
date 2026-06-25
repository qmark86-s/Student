# 부동산 건물 배치/누끼 폴리싱 구현

## 개요

- 부동산 건물 원본 시트를 형광분홍 크로마키 배경 기준으로 교체했다.
- 지역별 건물 PNG 풀을 63종에서 84종으로 늘리고, 같은 지역 안에서도 variant와 asset을 순환 배치한다.
- 도시 전체 보기와 지역 상세 보기는 지역별 16개 슬롯을 공유하며, 구매 수량 마일스톤에 따라 슬롯이 한 칸씩 채워진다.
- 상세 pad에는 `rotation`을 추가해 빈 필지, PNG 건물, 그림자가 배경 쿼터뷰 바닥 각도를 따라가도록 했다.

## 리소스

- 형광분홍 원본 시트
  - `assets/visual-source/real-estate/real-estate-building-reference-sheet-magenta-a.png`
  - `assets/visual-source/real-estate/real-estate-building-reference-sheet-magenta-b.png`
- 런타임 투명 PNG
  - `src/snapshot/assets/real-estate-buildings/*.png`
- 생성/정규화 스크립트
  - `tools/generate-real-estate-building-assets.py`

원본 시트는 built-in `image_gen`으로 생성한 뒤, 가장자리와 연결된 분홍 배경만 `#ff00ff`로 정규화했다. 생성 스크립트는 두 원본 시트의 32개 셀을 읽고, 크로마키 제거 후 최종 PNG에 정확한 형광분홍 잔여 픽셀이 남으면 실패한다.

## 데이터 구조

- `data/real_estate_building_assets.json`
  - 84개 PNG 리소스의 `file`, `districtId`, `theme`, `variant`, 표시 크기, anchor, shadow를 관리한다.
  - `real-estate:verify`는 지역별 asset 6개 이상, variant 2개 이상을 요구한다.
- `data/real_estate_district_assets.json`
  - 각 `detailPads`는 16개이며 `x`, `y`, `scale`, `width`, `height`, `z`, `rotation`, `variant`, `buildingAsset`을 가진다.
  - `rotation`은 건물/빈 필지/그림자를 배경 필지 각도에 맞추는 값이다.
- `data/real_estate_city_layout.json`
  - 각 district의 `buildingSlots`도 16개로 상세 pad와 같은 순서/개수다.

## 렌더링

- `src/react/game/realEstate.js`
  - `visibleBuildingSlots`는 보유 수량을 `[1,2,3,4,5,6,8,10,15,25,50,100,200,300,600,1000]` 마일스톤에 매핑한다.
  - 첫 구매는 상세/도시 전체 모두 정확히 1개 슬롯만 표시한다.
  - 풀성장 1000채에서는 지역당 16개 슬롯이 모두 채워진다.
- `src/react/App.jsx`
  - overview와 district 양쪽에 `--building-rotation`, 표시 크기, z-index를 데이터에서 주입한다.
  - 10개 고정 assert를 제거하고 city/detail 슬롯 수 일치만 검사한다.
- `src/react/styles.css`
  - overview 건물, 상세 건물, 빈 필지 pad, 하단 그림자가 모두 `rotation` 값을 따라간다.

## 검증

- `python tools/generate-real-estate-building-assets.py`: 통과, 건물 PNG 84종/지역 슬롯 16개 생성.
- `npm run real-estate:verify`: 통과.
- `npm run react:build`: 통과.
- `npm run react:real-estate-smoke`: 통과, 첫 구매 상세/도시 슬롯 1개와 풀성장 슬롯 수를 데이터 기준으로 확인.
- `npm run react:real-estate-visual-audit`: 통과, 풀성장 overview 160개 PNG 슬롯과 10개 상세 지역의 지역당 16개 PNG 건물을 전수 캡처.
- `npm run react:verify`: 통과.
- `npm run verify:mobile`: 통과.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`: 출력 0건.
- `git diff --check`: 통과. CRLF 변환 경고만 출력.
- `mcp__UmgMcp.project_policy_gate` strict: 통과.

## 주민 시스템 메모

- 다음 차수에서 주민은 `futureResidentPaths`를 따라 이동시키고, 건물 보유 수량에서 주민 총량을 파생한다.
- 실제 렌더링 주민 수는 모바일 성능을 위해 화면당 cap을 둔다.
- 건물 슬롯은 z/scale/rotation을 이미 가지므로 주민 depth, 말풍선 z-index, 원근 scale을 붙이기 좋다.
