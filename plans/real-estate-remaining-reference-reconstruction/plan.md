# 부동산 남은 9개 지역 finalReference reconstruction 계획

## 목표

남은 9개 부동산 지역에 대해 사용자가 제공할 finalReference를 기준으로 지역별 성장 테이블 단계 baked PNG를 만든다. `small_studio`에서 통과한 `finalReferenceVisualGroupPatch` 방식을 유지하며, 중간 단계에서 건물이나 단지를 자르지 않는다.

## 현재 확인

- `git status --short` 확인 완료. 기존 dirty 파일은 되돌리지 않는다.
- `/implementations` 확인 완료. 관련 구현 문서는 `implementations/real-estate-final-reference-reconstruction/implementation.md`에 있다.
- MCP 자산 확인 완료. 현재 이 웹 부동산 PNG 작업에 직접 맞는 전용 MCP는 없고, 로컬 Python/Node 검증 도구를 사용한다.
- 지역 ID는 `real_estates.json` 기준 10종이며, 완료된 `small_studio`를 제외한 9종이 대상이다.

## 준비된 도구

- `npm run real-estate:growth-assets:district -- --district <id>`
- `npm run react:real-estate-pixel-audit -- --district <id>`
- `npm run real-estate:verify`

개별 Python 도구도 `--district <id>`를 받는다.

- `tools/reconstruct-real-estate-slots-from-final-reference.py`
- `tools/extract-real-estate-building-sheet-assets.py`
- `tools/generate-real-estate-baked-district-growth.py`
- `tools/audit-real-estate-reconstruction-slots.py`

## 구현 순서

1. 사용자가 제공한 finalReference를 `assets/visual-source/real-estate/district-growth/<slug>-final-reference.png`로 둔다.
2. base가 함께 제공되면 `<slug>-base.png`로 둔다. 없으면 현재 상세 배경 PNG를 base로 복사하되, finalReference와 같은 0단계에서 만들어졌는지 먼저 눈으로 확인한다.
3. `data/real_estate_reconstruction_sources.json`에 해당 지역 source 계약을 추가한다. diff/buildable/forbidden mask 값은 지역별로 실제 픽셀을 보며 조정한다.
4. `npm run real-estate:growth-assets:district -- --district <id>`로 슬롯, cutout, baked PNG를 생성한다.
5. `artifacts/real-estate-reconstruction/<slug>-slot-zoom-review.png`와 `<slug>-stage-contact-sheet.png`를 확대해서 본다.
6. 건물이 잘려 보이는 visual group은 슬롯 단위가 아니라 `sourceClusterBBox` 기준으로 묶고, 필요하면 해당 지역 전용 reveal override를 추가한다.
7. `npm run react:real-estate-pixel-audit -- --district <id>`와 `npm run real-estate:verify`를 통과시킨다.
8. 통과 지역은 `data/real_estate_district_growth_assets.json`에 누적 등록되며, 앱 상세 화면은 해당 지역의 DOM 건물 overlay를 끄고 baked PNG를 사용한다.

## 실패 기준

- finalReference와 16단계 master가 픽셀 단위로 맞지 않는다.
- 중간 단계에 반쪽 건물, 잘린 지붕, 단지 조각이 나타난다.
- 도로, 수로, 인도 같은 forbidden mask에 alpha 또는 footprint가 침범한다.
- 누락된 reference를 임시 샘플이나 기존 지역 자산으로 조용히 대체한다.
- 검수 contact sheet 없이 완료 처리한다.

## 완료 산출물

- `src/snapshot/assets/real-estate-district-growth/<slug>-growth-XX.png`: 지역별 성장 테이블에 등록된 단계 수만큼 생성
- `artifacts/real-estate-reconstruction/<slug>-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/<slug>-growth-all-stages-contact-sheet.png`
- `artifacts/real-estate-reconstruction/<slug>-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/<slug>-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/<slug>-reconstruction-audit-report.json`
- 갱신된 `data/real_estate_reconstruction_slots.json`
- 갱신된 `data/real_estate_district_growth_assets.json`

## 이번 4개 final image 작업

- 대상은 `shop_unit`, `two_room`, `villa`, `apartment_building`이다.
- `apartment_building`은 사용자가 정정한 대로 `apartment_complex`가 아니라 `apartment-building-final-reference.png`로 처리한다.
- small_studio 검수와 같은 형태로 지역별 성장 테이블 전체 contact sheet와 개별 단계 HTML 갤러리를 만든다.
- 4개 지역 모두 16단계 master가 finalReference와 픽셀 단위로 일치해야 하며, 중간 단계는 visual group 단위로 검수한다.

## 이번 남은 5개 final image 작업

- 대상은 `small_building`, `apartment_complex`, `officetel`, `mixed_development`, `office_tower`이다.
- 사용자가 메시지에 첨부한 5장을 `realFinal` 폴더 접촉시트로 확인해 아래처럼 매칭한다.
- `small_building`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (3).png`
- `apartment_complex`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (8).png`
- `officetel`: `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (10).png`
- `mixed_development`: `ChatGPT Image 2026년 6월 26일 오후 11_18_14 (3).png`
- `office_tower`: `ChatGPT Image 2026년 6월 26일 오후 11_33_44.png`
- 이번 배치도 `locked-prefix-composite`와 `finalReferenceVisualGroupPatch`를 사용한다.
- 건물 또는 단지 일부가 잘린 채 중간 단계에 보이지 않도록 `sourceClusterBBox` 단위 visual group을 유지하고, 필요하면 reveal override를 지역별로 추가한다.
- 완료 후 5개 지역 갤러리와 9개 지역 통합 갤러리를 만들어 사용자가 직접 확대 검수할 수 있게 한다.

## 이번 남은 5개 작업 결과

- `small_building`, `apartment_complex`, `officetel`, `mixed_development`, `office_tower` 5개 지역의 baked PNG 생성을 완료했다.
- 5개 지역 모두 `npm run react:real-estate-pixel-audit -- --district <id>` 기준 `coverage=1.000`, `meanAbsDelta=0.00`을 통과했다.
- 5개 지역 검수 인덱스는 `artifacts/real-estate-reconstruction/remaining-five-growth-review-gallery.html`이다.
- 사용자 제공 finalReference 9개 전체 검수 인덱스는 `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`이다.
- 눈으로 확인한 지역별 전체 단계 contact sheet에서 명확한 반쪽 건물/잘린 단지 patch는 발견하지 못했다. 이후 사용자가 확대 검수하며 지적하는 작은 조각은 같은 source/visual group 기준으로 보정한다.
