# 부동산 4개 finalReference batch 구현 설명서

## 개요

사용자가 먼저 제공한 4개 full-scene finalReference를 부동산 상세 성장 PNG 계약에 연결했다.

대상 지역:

- `shop_unit`
- `two_room`
- `villa`
- `apartment_building`

이 4개 이미지는 `locked-prefix-composite` + `finalReferenceVisualGroupPatch` 방식으로 연결했다. 새 reference sheet는 받지 않았으므로 기존 런타임 건물 PNG를 슬롯 메타데이터로 사용하고, 실제 화면 렌더는 finalReference에서 분리한 visual group patch를 사용한다.

## 렌더 방식

이번 batch는 다음 규칙을 사용한다.

- 0단계: base PNG와 픽셀 단위로 동일
- 1..16단계: finalReference에서 분리한 visual group patch를 누적 적용
- 16단계: 사용자가 제공한 finalReference PNG와 픽셀 단위로 동일
- slot 수는 기존 계약대로 16개 유지
- 기존 런타임 건물 PNG를 슬롯 메타데이터로 쓰며, 별도 건물 cutout 추출은 하지 않고 skip report를 남김
- 상세 화면은 baked 성장 PNG가 있는 지역의 DOM 건물 layer를 끔

중간 단계에서 잘린 건물이나 어색한 배경 patch가 보이면, 해당 지역만 visual group reveal 순서 또는 마스크를 재조정한다.

## 주요 변경 파일

- `data/real_estate_reconstruction_sources.json`: 4개 지역 source 계약 추가
- `data/real_estate_reconstruction_slots.json`: 4개 지역 diff 기반 16개 slot 추가
- `data/real_estate_district_growth_assets.json`: 4개 지역 baked 성장 PNG 등록
- `tools/reconstruct-real-estate-slots-from-final-reference.py`: 기존 런타임 건물 PNG 기반 가상 시트와 큰 cluster 분할 옵션 지원
- `tools/extract-real-estate-building-sheet-assets.py`: 기존 런타임 건물 PNG 가상 시트의 추출 skip 처리 추가
- `tools/generate-real-estate-baked-district-growth.py`: finalReference visual group patch 기반 baked PNG 생성
- `tools/audit-real-estate-reconstruction-slots.py`: 4개 지역 픽셀 감사 통과
- `tools/make-real-estate-growth-review-gallery.py`: 지역별 성장 테이블 기준 전체 검수 갤러리 생성
- `docs/real_estate_remaining_reference_intake.md`: 진행 상태와 접수 기준 갱신
- `docs/real_estate_final_reference_handoff.md`: 4개 완료 지역 반영

## 원본/산출물

원본 위치:

- `assets/visual-source/real-estate/district-growth/shop-unit-base.png`
- `assets/visual-source/real-estate/district-growth/shop-unit-final-reference.png`
- `assets/visual-source/real-estate/district-growth/two-room-base.png`
- `assets/visual-source/real-estate/district-growth/two-room-final-reference.png`
- `assets/visual-source/real-estate/district-growth/villa-base.png`
- `assets/visual-source/real-estate/district-growth/villa-final-reference.png`
- `assets/visual-source/real-estate/district-growth/apartment-building-base.png`
- `assets/visual-source/real-estate/district-growth/apartment-building-final-reference.png`

검수 산출물:

- `artifacts/real-estate-reconstruction/shop-unit-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/shop-unit-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/shop-unit-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/shop-unit-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/two-room-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/two-room-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/two-room-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/two-room-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/villa-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/villa-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/villa-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/villa-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/apartment-building-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/apartment-building-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/apartment-building-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/apartment-building-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/four-reference-growth-review-gallery.html`

## 검증 결과

- Python compile 검증 통과
- 4개 지역 `npm run real-estate:growth-assets:district -- --district <id>` 통과
- 4개 지역 `npm run react:real-estate-pixel-audit -- --district <id>` 통과
- 4개 지역 모두 `coverage=1.000`, `meanAbsDelta=0.00`
- `npm run real-estate:verify` 통과
- `npm run react:build` 통과
- `npm run react:real-estate-smoke` 통과
- `npm run react:real-estate-visual-audit` 통과
- `npm run real-estate:growth-review -- --district shop_unit --district two_room --district villa --district apartment_building` 통과

## 후속 수동 검수 반영

- `shop_unit`은 사용자 지정 1/2/3/4번 필지 순서대로 누적 채우도록 `shop-unit-growth-00..04.png`로 재구성했다. `minOwnedCount`는 `0,1,4,8,15`다.
- `two_room`은 녹색 X로 표시된 변화 약한 중간 단계와 최종 직전 중복 단계를 제거해 `two-room-growth-00..04.png`로 축약했다. `minOwnedCount`는 `0,1,4,7,11`이다.
- `villa`는 녹색 X로 표시된 8/14 중간 단계를 제거했다. 런타임 단계는 `villa-growth-00..04.png`, `minOwnedCount=0,1,2,4,13`이다.
- `apartment_building`은 고층동 일부가 독립적으로 먼저 나타나는 구간을 제거하기 위해 얇은 visual group을 같은 본체 단위로 묶었다. 런타임 단계는 `apartment-building-growth-00..04.png`, `minOwnedCount=0,1,3,7,13`이다.
