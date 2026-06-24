# 부동산 지역별 정식 리소스 구현

## 개요

- 부동산 지역 상세 화면을 공용 배경 1장 구조에서 지역별 배경 10장 구조로 확장했다.
- 각 지역은 `data/real_estate_district_assets.json`에서 배경 파일, 건물 theme, 상세 건물 pad, 향후 주민 이동 경로, 말풍선 톤을 가진다.
- 구매 수량이 늘면 기존 저장 데이터의 `count`에서 파생된 `developmentLevel`과 `visibleBuildingSlots`를 유지하면서, 상세 화면은 지역별 pad와 theme/variant로 건물을 렌더링한다.
- 도시 전체 보기의 지역 개발도 마커는 기존 `real_estate_city_layout.json`을 계속 사용한다.

## 생성 리소스

아래 10개 이미지를 `src/snapshot/assets/`에 추가했다.

- `visual-real-estate-district-small-studio.png`
- `visual-real-estate-district-two-room.png`
- `visual-real-estate-district-villa.png`
- `visual-real-estate-district-officetel.png`
- `visual-real-estate-district-shop-unit.png`
- `visual-real-estate-district-small-building.png`
- `visual-real-estate-district-apartment-building.png`
- `visual-real-estate-district-apartment-complex.png`
- `visual-real-estate-district-office-tower.png`
- `visual-real-estate-district-mixed-development.png`

이미지 생성 조건은 16:9 가로형, 픽셀/복셀풍 2.5D 모바일 게임 배경, 텍스트/숫자/로고/워터마크/캐릭터/말풍선/UI 없음, 전경과 중경에 건물을 얹을 수 있는 빈 필지 포함이다.

## 데이터

- `data/real_estate_district_assets.json`
  - `districts`는 `real_estates.json.properties` 10개 id와 순서까지 1:1로 맞춘다.
  - `backgroundAsset`: 지역 상세 화면에서 import할 PNG 파일명.
  - `buildingTheme`: CSS 건물 테마. `starter_lowrise`, `residential_lowrise`, `villa_green`, `mixed_midrise`, `local_commercial`, `compact_commercial`, `apartment_single`, `apartment_complex`, `office_core`, `landmark_mixed` 중 하나다.
  - `detailPads`: 200% x 200% 상세 지도 위 건물 배치 지점 10개. `x`, `y`, `scale`, `width`, `height`, `z`, `variant`를 가진다.
  - `futureResidentPaths`: 다음 차수 주민 이동용 도로 경로. 이번 차수에서는 렌더링하지 않지만 검증 대상이다.
  - `speechTone`: 다음 차수 말풍선 문구 톤 분기용 값이다.

## 로직

- `src/react/game/realEstate.js`
  - `real_estate_district_assets.json`을 import하고 런타임 설정 검증에 포함했다.
  - 상세 리소스는 district 수, property id 순서, background file name, theme, pad 좌표/수치, path 좌표/깊이, help 누락을 검사한다.
  - `createRealEstateViewModel()` 카드에 `districtBackgroundAsset`, `districtBuildingTheme`, `districtDetailPads`, `districtFutureResidentPaths`, `districtSpeechTone`을 추가했다.
- `tools/validate-real-estate-config.mjs`
  - 같은 데이터 검증을 CLI에 추가했다.
  - CLI는 `src/snapshot/assets/<backgroundAsset>` 파일 존재까지 검사한다.

## UI

- `src/react/App.jsx`
  - `import.meta.glob`로 지역별 상세 PNG를 모으고, `selectedCard.districtBackgroundAsset` 파일명으로 배경을 선택한다.
  - 예전 공용 상세 배경 `visual-real-estate-district-detail.png`는 glob 제외 패턴으로 번들에서 제외한다.
  - `RealEstateDetailDevelopmentLayer`는 공용 pad 상수를 사용하지 않고 `card.districtDetailPads`를 사용한다.
  - 건물 DOM에는 `data-building-theme`, `data-building-variant`와 `theme-*`, `variant-*` class를 붙인다.
- `src/react/styles.css`
  - 상세 배경 밝기/채도를 조정해 건물 오버레이가 배경과 더 잘 섞이게 했다.
  - 저층 주거, 빌라, 상가, 꼬마빌딩, 오피스텔, 아파트, 오피스, 복합개발 테마별 CSS 건물 형태를 분리했다.
  - pad는 데이터의 `width`/`scale`을 사용하고, 건물은 데이터의 `width`/`height`/`scale`/`z`를 사용해 원근감을 만든다.
  - 건물 높이는 고정 픽셀 가산이 아니라 pad 기본 높이의 비율로 성장해, 저층 지역이 과하게 고층처럼 보이지 않게 조정했다.

## 주민 이동/말풍선 검토

건물 1개당 주민 1명 개념은 구현 가능하다. 다만 보유 수량이 1000채까지 올라가는 엔드 콘텐츠라서, DOM 주민을 실제 1000개 렌더링하는 방식은 모바일에서 피해야 한다.

권장 구조:

- 저장 데이터는 늘리지 않고 `owned count`에서 `residentPopulation`을 파생한다.
- 실제 렌더링 수는 viewport와 성능 기준으로 제한한다. 예: 모바일 24명, 태블릿/데스크톱 40명.
- 주민은 `futureResidentPaths`의 point list를 따라 이동하고, path의 `depth`에 따라 scale, opacity, z-index, 이동 속도를 다르게 둔다.
- 렌더링 대상 주민은 deterministic sampling으로 고른다. 같은 저장 상태에서는 같은 주민 배치가 나와야 만족감이 유지된다.
- 말풍선은 전체 주민 중 1~3개만 드문 빈도로 활성화한다. 짧은 한국어 문구를 `speechTone`별로 관리하고, 화면 밖/겹침/상단 UI 침범은 금지한다.
- CSS DOM 방식은 20~40명 규모까지 적합하다. 이후 차량, 군중, 많은 말풍선까지 확장하면 canvas layer를 `real-estate-ambient-layer` 안에 넣는 쪽이 안정적이다.
- 주민은 건물 pad가 아니라 도로 path 위를 걸어야 한다. 건물 수가 늘면 `residentPopulation`만 증가하고, 실제 이동 위치는 path와 depth 데이터가 결정한다.

## 검증

- `npm run real-estate:verify`
  - 통과. 매물 10종, 도시 지역 10종, 상세 리소스 10종, 규모 6종, 랭킹 보상 6종을 검증했다.
- `npm run react:build`
  - 통과. 지역별 상세 배경 10장이 React 번들에 포함된다.
- `npm run react:real-estate-smoke`
  - 통과. 지역별 상세 배경, 건물 theme/variant, 구매 후 상세 건물 렌더링, 풀성장 상세 건물 10개를 확인했다.
- `npm run react:real-estate-visual-audit`
  - 통과. 10개 지역 풀성장 상세 화면을 전수 캡처하고 `backgroundAsset` 기반 src, 건물 10개, theme/variant, horizontal overflow 0을 확인했다.
  - 산출물은 `artifacts/real-estate-resource-quality-audit/report.json`, `report.html`, `contact-sheet.png`다.
- `npm run react:verify`
  - 통과. 부동산 검증, React 빌드, 전체 React smoke, responsive audit를 확인했다.
- `npm run verify:mobile`
  - 통과. 기존 snapshot/mobile/visual/career/retake 검증 경로 영향이 없음을 확인했다.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`
  - 출력 0건. 런타임 대체 토큰이 없다.
- `git diff --check`
  - 통과. 줄바꿈 경고만 있으며 공백 오류는 없다.
- `mcp__UmgMcp.project_policy_gate` strict
  - 통과. 절대 경로 roots 기준 finding 0건이다.
- 수동 캡처
  - `artifacts/real-estate-district-assets/mixed-development-full-growth.png`에서 풀성장 복합 개발지의 상세 배경/건물 오버레이 합성을 확인했다.

## 주의사항

- 이번 차수는 지역별 상세 배경과 CSS 건물 오버레이를 정식화한 것이다. 지역별 성장 단계 bitmap 묶음은 아직 만들지 않았다.
- `real_estate_district_assets.json`의 pad 좌표를 바꾸면 `real-estate:verify`, `react:real-estate-smoke`, 모바일 responsive audit를 함께 확인한다.
- 신규 주민 시스템을 붙일 때는 `futureResidentPaths`를 먼저 쓰고, 저장 schema를 올리지 않는 방향을 우선한다.
