# 부동산 finalReference 역산 기준 문서

## 현재 결론

`small_studio` 상세 성장 이미지는 `base 0단계`와 `finalReference 최종 단계`를 기준으로 다시 만들었다. v2 성장 테이블 기준 최종 master PNG는 첨부 최종본 `small-studio-final-reference.png`와 픽셀 단위로 일치하며, 감사 결과 `meanAbsoluteDeltaAgainstFinalReference = 0.00`, `candidateCoverage = 1.000`이다.

사용자 피드백에 따라 실제 baked PNG는 건물 시트 cutout 직접 합성보다 최종본 유사도를 우선한다. 건물 시트 cutout은 추출/검증/매칭 근거로 남기고, 화면에 쓰는 단계 이미지는 `finalReference`에서 변경 픽셀 patch를 분리해 누적 합성한다.

중간 단계에서는 건물을 슬롯 경계로 자르지 않는다. 16개 슬롯은 finalReference visual group patch를 만들기 위한 원본 근거로 유지하되, 런타임 성장은 `data/real_estate_district_growth_assets.json` v2의 `minOwnedCount -> file` 테이블로 선택한다. 렌더 patch는 `sourceClusterBBox` 기반 visual group 단위로 묶어 완성된 건물 덩어리만 켠다.

사용자가 제공한 full-scene finalReference 9장은 모두 `locked-prefix-composite` + `finalReferenceVisualGroupPatch` 방식으로 연결했다. 대상은 `shop_unit`, `two_room`, `villa`, `apartment_building`, `small_building`, `apartment_complex`, `officetel`, `mixed_development`, `office_tower`이다. 새 reference sheet는 받지 않았으므로 `data/real_estate_building_assets.json`의 기존 런타임 건물 PNG를 슬롯 메타데이터로 사용하고, 실제 화면 렌더는 finalReference에서 분리한 visual group patch를 사용한다. 9개 지역 모두 감사 결과 `meanAbsoluteDeltaAgainstFinalReference = 0.00`, `candidateCoverage = 1.000`이다.

`apartment_building`은 사용자가 정정한 대로 아파트 고층동 최종본을 사용한다. `apartment_complex`는 이후 추가 제공된 아파트 단지 finalReference를 별도 연결했다.

## 기준 원본

- 0단계 베이스: `assets/visual-source/real-estate/district-growth/small-studio-base.png`
- 최종 참조: `assets/visual-source/real-estate/district-growth/small-studio-final-reference.png`
- 건물 시트: `assets/visual-source/real-estate/real-estate-building-reference-sheet-20260626-small-studio.png`
- 추가 완료 finalReference:
  - `assets/visual-source/real-estate/district-growth/shop-unit-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/two-room-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/villa-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/apartment-building-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/small-building-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/apartment-complex-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/officetel-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/mixed-development-final-reference.png`
  - `assets/visual-source/real-estate/district-growth/office-tower-final-reference.png`

## 생성 데이터와 도구

- 원본/마스크/시트 계약: `data/real_estate_reconstruction_sources.json`
- 슬롯 산출물: `data/real_estate_reconstruction_slots.json`
- 런타임 성장 PNG 테이블: `data/real_estate_district_growth_assets.json`
- 슬롯 역산: `tools/reconstruct-real-estate-slots-from-final-reference.py`
- 건물 시트 cutout 추출: `tools/extract-real-estate-building-sheet-assets.py`
- 단계별 baked PNG 생성: `tools/generate-real-estate-baked-district-growth.py`
- 지역 1개 일괄 생성: `tools/generate-real-estate-growth-assets-for-district.py`
- 성장 검수 갤러리 생성: `tools/make-real-estate-growth-review-gallery.py`
- 픽셀 감사: `tools/audit-real-estate-reconstruction-slots.py`

각 Python 도구는 기본값으로 `small_studio`를 사용하며, 다음 지역부터는 `--district <id>`를 넘겨 같은 파이프라인을 반복한다. 추가 지역의 파일명과 접수 기준은 `docs/real_estate_remaining_reference_intake.md`에 정리했다.

## 산출 이미지

- 앱용 단계 PNG: `src/snapshot/assets/real-estate-district-growth/<slug>-growth-00..NN.png`
- master 단계 PNG: `artifacts/real-estate-reconstruction/master/<district>/<slug>-growth-master-00..NN.png`
- 슬롯별 최종본 patch: `artifacts/real-estate-reconstruction/patches/small-studio-slot-XX-final-reference-patch.png`
- 확대 검수: `artifacts/real-estate-reconstruction/small-studio-slot-zoom-review.png`
- 단계 contact sheet: `artifacts/real-estate-reconstruction/small-studio-stage-contact-sheet.png`
- 감사 report: `artifacts/real-estate-reconstruction/small-studio-reconstruction-audit-report.json`
- 추가 지역 검수 갤러리: `artifacts/real-estate-reconstruction/four-reference-growth-review-gallery.html`
- 남은 5개 지역 검수 갤러리: `artifacts/real-estate-reconstruction/remaining-five-growth-review-gallery.html`
- 후반 5개 피드백 검수 갤러리: `artifacts/real-estate-reconstruction/second-five-feedback-growth-review-gallery.html`
- 사용자 제공 9개 지역 전체 검수 갤러리: `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
- 추가 지역별 전체 단계 검수: `artifacts/real-estate-reconstruction/<slug>-growth-review-gallery.html`

## 런타임 연결 기준

- baked 성장 데이터가 등록된 지역은 보유 수량 이하의 가장 큰 `minOwnedCount` stage를 골라 `<slug>-growth-XX.png`를 배경으로 선택한다.
- `small_studio`만 원정대 Stage 1로 해금되고, 이후 지역은 직전 지역의 `maxOwnedCount` 달성으로 순차 해금된다. 이미 보유 중인 기존 세이브의 부동산은 회수하지 않는다.
- 지역별 `maxOwnedCount`는 다음 지역 해금 조건이자 새 구매 상한이다. 기존 세이브의 초과 보유 수량은 저장에서 줄이지 않고, 성장 이미지/개발도만 `min(count, maxOwnedCount)`로 계산한다.
- baked PNG 안에 건물과 주변 디테일이 이미 들어 있으므로 해당 지역 상세 화면의 기존 `.real-estate-development-layer`를 렌더링하지 않는다.
- 도시 전체 보기의 작은 건물 dot과 baked 성장 데이터가 없는 지역 상세 화면은 기존 데이터/DOM overlay 방식을 유지한다.

## 검증 명령

- `npm run real-estate:growth-assets`
- `npm run real-estate:growth-assets:district -- --district small_studio`
- `npm run real-estate:growth-review -- --district shop_unit --district two_room --district villa --district apartment_building`
- `npm run real-estate:growth-review -- --index-file remaining-five-growth-review-gallery.html --district small_building --district apartment_complex --district officetel --district mixed_development --district office_tower`
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html --district small_studio --district two_room --district villa --district officetel --district shop_unit --district small_building --district apartment_building --district apartment_complex --district office_tower --district mixed_development`
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `git diff --check`

## 주의점

- `data/real_estate_reconstruction_slots.json`의 `renderSource`가 `finalReferenceVisualGroupPatch`이면 여러 슬롯이 같은 `patchFile`과 `visualGroupId`를 공유할 수 있다.
- 새 reference sheet가 없는 지역은 `buildingSheet.source=existingRuntimeAssets`를 사용한다. 이 경우 건물 시트 cutout 추출은 skip report만 남기고, baked 화면은 finalReference visual group patch로 만든다.
- `small_studio`, `two_room`, `villa`, `officetel`, `shop_unit`은 첫 5개 지역 수동 피드백 기준으로 다시 줄였다. 현재 런타임 단계는 각각 `small_studio 00..05`, `two_room 00..04`, `villa 00..04`, `officetel 00..05`, `shop_unit 00..04`이다. 빨간 동그라미 필지는 같은 단계에서 채워지도록 앞당기고, 녹색 X 조각 또는 변화가 약한 단계는 제거하거나 최종 쪽으로 미룬다. `shop_unit`은 사용자 지정 1/2/3/4번 필지 순서대로 누적 채운다.
- `small_building`은 후속 확대 피드백 기준으로 `00..03` 단계이며, 녹색 X 초반 조각을 제거하고 하단 group은 같은 reveal 시점으로 묶는다.
- `apartment_building`, `apartment_complex`, `office_tower`, `mixed_development`도 후속 확대 피드백 기준으로 찢어진 건물 partial을 제거했다. 현재 런타임 단계는 각각 `apartment_building 00..04`, `apartment_complex 00..03`, `office_tower 00..04`, `mixed_development 00..05`이다. 빨간 원으로 확인된 partial 건물은 본체 group과 같은 reveal 시점으로 묶고, `mixed_development`의 하단-left 녹색 X group은 최종 단계로 미뤘다.
- 건물 시트 cutout PNG는 추출되어 있지만, 현재 화면 픽셀의 정답 소스는 최종 참조 patch다.
- 최종 성장 단계는 최종본과 완전 일치해야 한다. 다음 작업에서 sheet cutout 합성으로 되돌릴 경우 `meanAbsoluteDeltaAgainstFinalReference`가 0이 아니면 완료로 보지 않는다.
