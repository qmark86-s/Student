# 부동산 리소스 품질/데이터 드리븐 전수 감사 구현 설명서

## 목적

- 부동산 지역 상세 화면이 10개 지역별 전용 배경을 데이터에서 선택하도록 정리했다.
- 풀성장 상태에서 각 상세 화면의 배경, 건물 오버레이, 테마, variant, overflow를 자동 전수 검사하도록 만들었다.
- 리소스 퀄리티 확인 결과를 `artifacts/real-estate-resource-quality-audit/`에 남겨 다음 차수에서 비교 기준으로 사용할 수 있게 했다.

## 핵심 구조

### 데이터 흐름

1. `data/real_estate_district_assets.json`
   - `backgroundAsset`: 지역 상세 배경 PNG 파일명.
   - `buildingTheme`: CSS 건물 팔레트와 형태 테마.
   - `detailPads`: 상세 200% 지도 위에 건물을 얹는 좌표, 크기, 원근 scale, z-order, variant.
   - `futureResidentPaths`: 다음 차수 주민 이동용 도로 경로. 이번 구현에서는 렌더링하지 않지만 검증 대상이다.
   - `speechTone`: 다음 차수 말풍선 문구 톤을 고르는 값.
2. `src/react/game/realEstate.js`
   - `validateRealEstateConfig()`가 지역 상세 데이터의 id 매칭, 좌표 범위, 파일명 형식, 중복 배경, help 누락을 검사한다.
   - `createRealEstateViewModel()`이 카드별 `districtBackgroundAsset`, `districtBuildingTheme`, `districtDetailPads`, `districtFutureResidentPaths`, `districtSpeechTone`을 만든다.
3. `src/react/App.jsx`
   - `import.meta.glob()`로 `src/snapshot/assets/visual-real-estate-district-*.png`를 모은다.
   - `selectedCard.districtBackgroundAsset` 파일명으로 상세 배경 URL을 찾는다.
   - 파일이 없으면 `assert()`로 즉시 실패한다.
4. `src/react/styles.css`
   - 상세 건물 오버레이는 `data-building-theme`와 `data-building-variant`를 CSS selector로 받아 팔레트와 형태감을 조절한다.
   - 건물 높이는 패드 높이 기준 비율로 증가시켜 저층 지역에서 과도하게 튀지 않도록 조정했다.

### 상세 카메라

- `data/real_estate_city_layout.json`의 `detailFocus`를 상세 배경 기준 초기 카메라 중심으로 사용한다.
- 이번 감사에서 10개 지역 모두 `[50, 66]` 중심값으로 맞췄다.
- 이 값은 상세 배경의 전경 건물 배치가 가장 잘 보이는 기본 crop 기준이다.

## 리소스

- 지역별 배경은 `src/snapshot/assets/visual-real-estate-district-*.png` 10장을 사용한다.
- 각 배경은 지역 id와 1:1로 연결된다.
- `visual-real-estate-district-detail.png`는 범용 구형 상세 이미지이므로 React glob에서 제외한다.
- 배경 파일 연결은 하드코딩된 id 분기가 아니라 `backgroundAsset` 데이터로만 결정된다.

## 전수 감사 스크립트

### 명령

```powershell
npm run react:real-estate-visual-audit
```

### 검사 항목

- 부동산 풀성장 seed를 만든 뒤 10개 district 상세 화면을 전부 방문한다.
- 각 district에서 다음 항목을 검사한다.
  - 상세 배경 이미지가 로드되었는지
  - `backgroundAsset`에 적힌 파일명이 실제 `img.currentSrc`와 일치하는지
  - 풀성장 상태에서 건물 10개가 렌더링되는지
  - pad 10개가 유지되는지
  - `data-building-theme`가 지역 데이터와 일치하는지
  - 모든 건물의 `data-building-variant`가 비어 있지 않은지
  - 모바일 viewport에서 horizontal overflow가 0인지
- 각 상세 viewport 스크린샷을 저장한다.

### 산출물

- `artifacts/real-estate-resource-quality-audit/report.json`
- `artifacts/real-estate-resource-quality-audit/report.html`
- `artifacts/real-estate-resource-quality-audit/contact-sheet.png`
- `artifacts/real-estate-resource-quality-audit/*-full-growth.png`

## 검증 결과

- `npm run real-estate:verify`: 통과
- `npm run react:build`: 통과
- `npm run react:real-estate-smoke`: 통과
- `npm run react:real-estate-visual-audit`: 통과
- `npm run react:verify`: 통과
- `npm run verify:mobile`: 통과

## 다음 차수 확장 메모

- 주민 1명/건물 1개 연출은 저장 schema를 올리지 않고 `count`와 `futureResidentPaths`에서 파생하는 방식이 적합하다.
- 실제 렌더링 인원은 성능을 위해 보유 건물 수와 별도의 화면별 cap을 둔다.
- 주민 scale, opacity, z-index는 `futureResidentPaths.depth`의 `near`, `mid`, `far` 값을 기준으로 나누면 원근감을 유지하기 좋다.
- 말풍선은 `speechTone`과 지역 id를 기준으로 문구 풀을 붙이고, 동시에 보이는 개수를 제한한다.
- 사람 이동 구현 전에는 보행 경로와 건물 pad가 시각적으로 충돌하지 않는지 이 전수 감사 스크립트에 주민 레이어 검사 항목을 추가한다.
