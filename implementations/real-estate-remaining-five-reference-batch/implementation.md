# 부동산 남은 5개 finalReference batch 구현 설명서

## 개요

사용자가 추가 제공한 5개 full-scene finalReference를 부동산 상세 성장 PNG 계약에 연결했다.

대상 지역:

- `small_building`
- `apartment_complex`
- `officetel`
- `mixed_development`
- `office_tower`

이 5개 이미지는 기존 `small_studio` 및 4개 선행 batch와 같은 `locked-prefix-composite` + `finalReferenceVisualGroupPatch` 방식으로 연결했다. 별도 reference sheet는 받지 않았으므로 `data/real_estate_building_assets.json`의 기존 런타임 건물 PNG를 슬롯 메타데이터로 사용하고, 실제 화면 렌더는 finalReference에서 분리한 visual group patch를 사용한다.

## 원본 매칭

- `small_building`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (3).png`
- `apartment_complex`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (8).png`
- `officetel`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (10).png`
- `mixed_development`: `ChatGPT Image 2026년 6월 26일 오후 11_18_14 (3).png`
- `office_tower`: `ChatGPT Image 2026년 6월 26일 오후 11_33_44.png`

복사된 프로젝트 원본:

- `assets/visual-source/real-estate/district-growth/small-building-final-reference.png`
- `assets/visual-source/real-estate/district-growth/apartment-complex-final-reference.png`
- `assets/visual-source/real-estate/district-growth/officetel-final-reference.png`
- `assets/visual-source/real-estate/district-growth/mixed-development-final-reference.png`
- `assets/visual-source/real-estate/district-growth/office-tower-final-reference.png`

## 지역별 추출 파라미터

5개 모두 `slotSplitMode=fillLargestClusters`를 사용한다. 슬롯 후보가 16개보다 적은 경우 가장 큰 cluster를 쪼개 16개 계약을 유지하지만, 렌더 patch는 `sourceClusterBBox` 기준 visual group으로 묶어 건물 조각 노출을 줄인다.

| id | threshold | minY | minComponentArea | minLotArea | dilateFilterSizes |
| --- | ---: | ---: | ---: | ---: | --- |
| `small_building` | 96 | 260 | 400 | 2500 | `81,81,51` |
| `apartment_complex` | 96 | 240 | 700 | 2500 | `121,121,81` |
| `officetel` | 96 | 240 | 3500 | 2500 | `81,81,51` |
| `mixed_development` | 96 | 220 | 1800 | 1800 | `81,81,51` |
| `office_tower` | 96 | 180 | 5000 | 1200 | `81,81,51` |

`apartment_complex`는 고층 아파트 동의 상단 patch를 충분히 포함하도록 필지 확장을 더 크게 잡았다. `officetel`, `mixed_development`, `office_tower`는 반사광과 고층부 diff가 과다하게 쪼개져 최소 component 면적을 높여 주요 건물군 중심으로 재구성했다.

## 산출물

- `src/snapshot/assets/real-estate-district-growth/<slug>-growth-XX.png`: 지역별 성장 테이블에 등록된 단계 수만큼 생성한다.
- `artifacts/real-estate-reconstruction/<slug>-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/<slug>-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/<slug>-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/<slug>-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/<slug>-reconstruction-audit-report.json`
- `artifacts/real-estate-reconstruction/remaining-five-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`

## 도구 변경

`tools/make-real-estate-growth-review-gallery.py`에 `--index-file` 옵션을 추가했다. 기존 기본값은 `four-reference-growth-review-gallery.html`로 유지하고, 이번 batch에서는 별도 인덱스를 만들었다.

`tools/react-vite-real-estate-smoke.mjs`의 풀성장 `mixed_development` 확인을 현재 baked growth 계약에 맞췄다. 이제 baked growth가 등록된 지역은 DOM 건물 16개가 아니라 `data-growth-asset`이 붙은 baked 배경 PNG와 DOM 건물 0개를 기대한다.

## 검증 결과

- 5개 지역 `npm run real-estate:growth-assets:district -- --district <id>` 통과
- 5개 지역 `npm run react:real-estate-pixel-audit -- --district <id>` 통과
- 5개 지역 모두 `coverage=1.000`, `meanAbsDelta=0.00`
- `npm run real-estate:growth-review -- --index-file remaining-five-growth-review-gallery.html --district small_building --district apartment_complex --district officetel --district mixed_development --district office_tower` 통과
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html --district shop_unit --district two_room --district villa --district apartment_building --district small_building --district apartment_complex --district officetel --district mixed_development --district office_tower` 통과
- `python -m py_compile tools/reconstruct-real-estate-slots-from-final-reference.py tools/extract-real-estate-building-sheet-assets.py tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/generate-real-estate-growth-assets-for-district.py tools/make-real-estate-growth-review-gallery.py` 통과
- `npm run real-estate:verify` 통과
- `npm run react:build` 통과
- `npm run react:real-estate-smoke` 통과
- `npm run react:real-estate-visual-audit` 통과
- `git diff --check` 통과. CRLF 경고만 출력됨

## 검수 메모

샘플 단계 contact sheet와 지역별 전체 단계 contact sheet를 눈으로 확인했다. 큰 건물이나 단지가 슬롯 경계로 명확히 잘려 보이는 문제는 발견하지 못했다. `office_tower`의 기존 접촉시트에서 stage 07 중앙부가 삼각형처럼 보였으나 실제 `office-tower-growth-07.png` 확대 확인 결과 공터와 도로가 정상적으로 남아 있는 축소 표시 착시였다.

## 후속 수동 검수 반영

- `officetel`은 빨간 동그라미 필지가 먼저 채워지도록 오른쪽 visual group을 앞당기고, 녹색 X로 보인 왼쪽/중앙 group은 최종 쪽으로 미뤘다. 런타임 단계는 `officetel-growth-00..05.png`, `minOwnedCount=0,1,4,8,12,15`다.
- `small_building`은 사용자가 X 표시한 초반 조각 단계를 제거하고 하단 group을 같은 reveal 시점으로 묶었다. 런타임 단계는 `small-building-growth-00..03.png`, `minOwnedCount=0,6,10,17`이다.
- `apartment_complex`는 고층 단지가 가장자리만 먼저 뜨지 않도록 왼쪽/오른쪽/전면 단지 3덩어리로 묶었다. 런타임 단계는 `apartment-complex-growth-00..03.png`, `minOwnedCount=0,1,11,27`이다.
- `office_tower`는 tower group을 완성 단위로 묶었다. 런타임 단계는 `office-tower-growth-00..04.png`, `minOwnedCount=0,1,6,13,21`이다.
- `mixed_development`는 변화 없는 반복 단계와 작은 조각 단독 노출을 줄이고, 하단-left 녹색 X group을 최종 단계로 미뤘다. 런타임 단계는 `mixed-development-growth-00..05.png`, `minOwnedCount=0,1,5,8,12,39`이다.

2026-07-01 후속 `real-estate-uniform-ten-growth-stage` 작업에서 현재 런타임 성장 테이블은 모든 지역 10단계로 대체되었다. 이 섹션의 `minOwnedCount` 값은 당시 수동 검수 반영 이력이며, 현재 기준은 10단계 문서를 따른다.
