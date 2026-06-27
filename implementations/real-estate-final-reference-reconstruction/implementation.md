# 부동산 small_studio 최종본 역산 구현 설명

## 목적

`small_studio` 상세 화면의 성장 이미지를 첨부 최종본에 맞춰 baked PNG로 제공한다. 현재 런타임은 `00` 공터 + `01..05` 성장 단계이며, 최종 master 이미지는 `small-studio-final-reference.png`와 픽셀 단위로 일치한다.

## 핵심 결정

- 최초 시트 cutout 직접 합성은 최종본과 충분히 비슷하지 않아 폐기했다.
- 현재 렌더 기준은 `finalReferenceVisualGroupPatch`다. `base`와 `finalReference`의 변경 픽셀을 16개 슬롯에 일대일로 자르지 않고, `sourceClusterBBox` 기반 visual group으로 묶어 단계별로 누적 합성한다.
- 한 건물이나 한 단지가 슬롯 경계 때문에 잘려 보이지 않도록 여러 슬롯이 같은 patch를 공유할 수 있다. 확대 피드백 이후 `small_studio`는 빨간 동그라미 필지를 먼저 채우고 녹색 X 조각을 뒤로 미루도록 `minOwnedCount=0,1,2,4,6,9` 단계로 나눴고, visual group reveal을 `3,6,9,12,16` 지점에 분산했다.
- 건물 시트 cutout은 `src/snapshot/assets/real-estate-buildings/real-estate-building-small-studio-sheet-*.png`로 추출되어 검증/매칭 근거로 유지한다.

## 주요 파일

- `data/real_estate_reconstruction_sources.json`: 원본 경로, diff/buildable/forbidden mask, sheet crop 계약.
- `data/real_estate_reconstruction_slots.json`: 16개 슬롯의 후보 bbox, anchor, patch, footprint, z 순서.
- `data/real_estate_district_growth_assets.json`: 런타임에서 사용할 `small-studio-growth-00..05.png` 테이블.
- `src/snapshot/assets/real-estate-district-growth/small-studio-growth-00..05.png`: 앱용 836x470 baked PNG.
- `artifacts/real-estate-reconstruction/master/small_studio/`: 1672x941 master 단계 PNG.
- `artifacts/real-estate-reconstruction/small-studio-reconstruction-audit-report.json`: 픽셀 감사 결과.

## 도구

- `tools/reconstruct-real-estate-slots-from-final-reference.py`: base/final diff와 빈 필지 마스크에서 슬롯 후보를 산출한다.
- `tools/extract-real-estate-building-sheet-assets.py`: 건물 시트에서 투명 PNG cutout을 추출한다.
- `tools/generate-real-estate-baked-district-growth.py`: visual group별 finalReference patch를 누적해 단계 PNG와 런타임 JSON을 생성한다.
- `tools/audit-real-estate-reconstruction-slots.py`: base 일치, forbidden overlap, prefix overlap, finalReference 유사도를 검사한다.
- `tools/generate-real-estate-growth-assets-for-district.py`: 지역 ID 1개를 받아 위 3개 생성 단계를 순서대로 실행한다.

각 도구는 기본값으로 `small_studio`를 사용하지만 `--district <id>` 인자를 받을 수 있다. 생성 결과는 기존 지역 항목을 지우지 않고 `districts` 배열에 upsert되도록 준비했다.

## 런타임 변경

- `src/react/game/realEstate.js`가 `real_estate_district_growth_assets.json`을 검증하고 view model에 `districtGrowthStageAsset`, `usesBakedDistrictGrowth`를 넣는다.
- `src/react/App.jsx`가 `real-estate-district-growth/*.png`를 import하고, growth asset이 있는 지역은 해당 PNG를 상세 배경으로 사용한다.
- `usesBakedDistrictGrowth`가 true인 지역은 상세 DOM 건물 레이어를 렌더링하지 않는다.

## 검증 결과

- `npm run real-estate:verify`: 통과. `coverage=1.000`, `meanAbsDelta=0.00`.
- `npm run real-estate:growth-assets:district -- --district small_studio`: 통과.
- `npm run react:real-estate-pixel-audit -- --district small_studio`: 통과.
- `npm run react:build`: 통과.
- `npm run react:real-estate-smoke`: 통과.
- `npm run react:real-estate-visual-audit`: 통과.

## 남은 주의점

- 최종 일치를 유지해야 하므로, 향후 재생성 시 `npm run real-estate:verify`의 meanAbsDelta가 0이 아니면 완료로 보지 않는다.
- 시트 cutout 직접 합성으로 다시 전환하려면 먼저 최종본과의 픽셀 차이를 별도 승인 기준으로 낮춰야 한다.
