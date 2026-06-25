# 부동산 PNG 건물 리소스/DEBUG 고도화 구현

## 개요

- 부동산 상세/도시 전체 보기의 건물 표현을 CSS 도형에서 PNG 리소스 기반으로 교체했다.
- 건물 PNG는 `data/real_estate_building_assets.json`에서 관리하며, `data/real_estate_district_assets.json.detailPads[].buildingAsset`이 실제 표시할 PNG를 명시한다.
- QA용 DEBUG 메뉴에 부동산 자금, Stage, 보유 수량, 풀성장, 초기화 조작을 추가했다.
- 풀성장 상태에서 도시 전체 보기와 10개 지역 상세 화면의 PNG 로드/매핑/스크린샷을 전수 검사하도록 `react:real-estate-visual-audit`를 확장했다.

## 리소스

- 원본 생성 시트:
  - `assets/visual-source/real-estate/real-estate-building-reference-sheet-magenta-a.png`
  - `assets/visual-source/real-estate/real-estate-building-reference-sheet-magenta-b.png`
- 런타임 PNG: `src/snapshot/assets/real-estate-buildings/*.png`
- 생성 스크립트: `tools/generate-real-estate-building-assets.py`
- 매핑 테이블: `data/real_estate_building_assets.json`

이미지는 built-in `image_gen` 도구로 생성했다. 최신 원본은 형광분홍 `#ff00ff` 크로마키 배경 4x4 시트 2장이며, 생성 스크립트가 두 시트의 32개 셀에서 투명 PNG 84종을 만든다.

## 데이터 구조

- `real_estate_building_assets.json`
  - `id`: 고유 건물 리소스 id.
  - `file`: `real-estate-buildings/*.png` 상대 경로.
  - `districtId`: 어느 부동산 지역에 쓰이는지.
  - `theme`: 지역의 `buildingTheme`과 매칭되는 분류.
  - `variant`: pad variant와 매칭되는 건물 형태.
  - `displayWidth`, `displayHeight`: 상세 화면 표시 크기.
  - `anchorX`, `anchorY`: 필지 위 착지 기준점.
  - `shadow`: wrapper 그림자 타입.
  - `help`: 검증용 한글 도움말.
- `real_estate_district_assets.json`
  - 모든 `detailPads`에 `buildingAsset`과 `rotation`을 추가했다.
  - 지역별 상세 pad는 16개이며, 도시 전체 보기의 `buildingSlots`와 같은 순서/개수다.
  - 같은 지역 안에서도 여러 variant와 asset id를 섞어 반복감을 줄인다.

## React 동작

- `src/react/game/realEstate.js`
  - 건물 asset 테이블 검증을 추가했다.
  - `detailPadsForDistrictAsset()`에서 pad와 building asset을 결합해 `buildingAssetFile`, 표시 크기, anchor를 view model에 넣는다.
  - `visibleBuildingSlots`는 도시 전체 보기와 상세 화면이 같은 asset id/file/rotation을 공유하도록 만든다.
  - 보유 수량은 16개 마일스톤으로 변환되어 첫 구매 1칸, 풀성장 16칸을 표시한다.
  - DEBUG helper로 `debugGrantRealEstateCash`, `debugUnlockRealEstateStages`, `debugSetAllRealEstateCounts`, `debugResetRealEstateState`를 추가했다.
- `src/react/App.jsx`
  - `import.meta.glob("../snapshot/assets/real-estate-buildings/*.png")`로 PNG를 명시 로드한다.
  - 건물 파일을 찾지 못하면 `assert()`로 즉시 실패한다.
  - `RealEstateBuildingSlots`와 `RealEstateDetailDevelopmentLayer` 모두 `<img>` 기반으로 렌더링한다.
  - DEBUG 모달은 QA 모드에서만 부동산 자금 +1M, Stage 100, 모두 1채, 풀성장, 초기화 버튼을 제공한다.
- `src/react/styles.css`
  - CSS 건물 몸체/지붕/창문 드로잉을 제거했다.
  - 남은 스타일은 PNG wrapper, anchor transform, 자연스러운 drop shadow, 빈 필지 pad 표현뿐이다.
  - 건물이 들어선 pad는 숨겨서 풀성장 상태에서 자리표시자처럼 보이지 않게 했다.

## 검증

- `npm run real-estate:verify`
  - 건물 asset id 중복, PNG 파일 존재, 표시 크기, anchor 범위, theme/variant/pad 참조, help 누락을 검사한다.
- `npm run react:real-estate-smoke`
  - 구매 후 상세/도시 전체 보기의 PNG 로드, 첫 구매 슬롯 1개, DEBUG 부동산 버튼 동작, 풀성장 상세 건물 16개를 확인한다.
- `npm run react:real-estate-visual-audit`
  - 풀성장 도시 전체 보기의 160개 PNG 슬롯과 10개 상세 지역의 건물 PNG 16개씩을 검사한다.
  - 산출물은 `artifacts/real-estate-resource-quality-audit/report.json`, `report.html`, `overview-full-growth.png`, `*-full-growth.png`다.

## 주민 시스템 검토

- 건물 1개당 사람 1명 개념은 가능하지만, 보유 수량 최대 1000채를 그대로 DOM 1000명으로 렌더링하면 모바일 성능에 맞지 않는다.
- 저장 데이터는 늘리지 않고 `count`에서 주민 총량을 파생하고, 실제 화면 렌더링 수는 모바일 24명 내외로 cap을 두는 구조가 적합하다.
- 주민은 `futureResidentPaths`를 따라 이동하고, `depth` 값으로 scale, opacity, z-index, 속도를 다르게 잡아야 한다.
- 말풍선은 `speechTone`별 짧은 문구 풀을 두고 동시에 1~3개만 띄우는 방향이 안전하다.
