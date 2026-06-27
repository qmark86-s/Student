# 부동산 small_studio 최종본 역산 구현 계획

## 목표
- `small_studio` 1개 지역만 대상으로 `base 0단계 PNG`와 `finalReference 완성본 PNG`의 픽셀 차이를 분석해 16개 건물 후보 슬롯을 산출한다.
- 기존 `detailPads`와 handoff 참고 JSON은 정답으로 사용하지 않고, 새 reconstruction 전용 데이터와 검수 artifact를 만든다.
- 승인된 16개 슬롯을 기준으로 지역별 성장 테이블 단계 baked PNG를 생성하고 런타임이 해당 PNG를 선택할 수 있게 연결한다. 현재 `small_studio` 런타임 단계는 `00` 공터 + `01..05` 성장 단계다.
- 사용자 피드백에 따라 화면 결과는 `small-studio-final-reference.png`와의 픽셀 일치를 우선한다. 건물 시트 cutout은 추출/검증/매칭 근거로 유지하고, 실제 baked PNG는 `finalReferenceVisualGroupPatch`를 완성 건물 덩어리 단위로 누적 합성한다.

## MCP/현재 자산 확인
- MCP 자산: 현재 세션에서 확인된 MCP 리소스는 GitHub 앱/스킬뿐이며, 이미지 분석에 직접 쓰는 전용 MCP 자산은 없다.
- 원본 3종:
  - `assets/visual-source/real-estate/district-growth/small-studio-base.png`
  - `assets/visual-source/real-estate/district-growth/small-studio-final-reference.png`
  - `assets/visual-source/real-estate/real-estate-building-reference-sheet-20260626-small-studio.png`
- 참고 문서:
  - `docs/real_estate_final_reference_handoff.md`
  - `artifacts/real-estate-final-reference-handoff/current-session-notes.md`

## 구현 단계
1. `data/real_estate_reconstruction_sources.json`에 원본 경로, 출력 배율, stage/slot 계약, diff threshold, sheet crop 계약, 금지 마스크를 한글 help와 함께 기록한다.
2. `tools/reconstruct-real-estate-slots-from-final-reference.py`를 추가해 base/final diff mask, cleanup, connected component, 확대 crop 리뷰, 후보 overlay/contact sheet, `data/real_estate_reconstruction_slots.json`을 생성한다.
   - 탐색용 k-means 또는 넓은 사각형 후보로 확정하지 않는다.
   - base의 빈 필지 픽셀 마스크는 연결 컴포넌트 픽셀 그대로 유지하고, 이 마스크와 final diff의 교차 영역에서 후보 bbox를 산출한다.
   - 슬롯 데이터에는 master px 기준 `candidateBBox`, `anchorPx`, `pastePx`, `footprintPolygonPx`를 기록하고 percent 값은 런타임 호환용으로만 함께 둔다.
3. `tools/extract-real-estate-building-sheet-assets.py`를 추가해 small_studio 건물 시트에서 투명 PNG cutout을 추출하고 검수 contact sheet를 만든다.
4. `tools/generate-real-estate-baked-district-growth.py`를 추가해 reconstruction slots를 visual group으로 묶고 `finalReferenceVisualGroupPatch`를 누적 합성해 `src/snapshot/assets/real-estate-district-growth/small-studio-growth-00..05.png` 및 `data/real_estate_district_growth_assets.json`을 생성한다.
5. `tools/audit-real-estate-reconstruction-slots.py`를 추가해 0단계 base 일치, stage prefix 안정성, forbidden mask 침범 0건, 슬롯/파일 존재, finalReference 유사도와 diff 기반 후보 근거를 검사한다.
6. `package.json`에 `real-estate:growth-assets`, `react:real-estate-pixel-audit` 스크립트를 추가하고 `real-estate:verify`가 reconstruction 감사까지 포함하게 한다.
7. React 런타임에서 growth asset 데이터가 있는 지역은 baked PNG를 상세 배경으로 선택하고, 해당 지역의 상세 건물 overlay는 렌더링하지 않도록 연결한다.
8. 관련 smoke/visual audit가 baked PNG 구조를 인식하도록 검증 기준을 갱신한다.
9. 남은 지역 반복 작업을 위해 생성/감사 Python 도구가 `--district <id>`를 받도록 준비하고, `real-estate:growth-assets:district` 래퍼 스크립트를 추가한다.

## 필수 산출물
- `artifacts/real-estate-reconstruction/small-studio-diff-mask.png`
- `artifacts/real-estate-reconstruction/small-studio-slot-candidate-overlay.png`
- `artifacts/real-estate-reconstruction/small-studio-slot-candidate-contact-sheet.png`
- `artifacts/real-estate-reconstruction/small-studio-slot-zoom-review.png`
- `artifacts/real-estate-reconstruction/small-studio-building-sheet-cutouts.png`
- `artifacts/real-estate-reconstruction/small-studio-stage-contact-sheet.png`
- `data/real_estate_reconstruction_slots.json`
- `data/real_estate_district_growth_assets.json`

## 검증
- `npm run real-estate:growth-assets`
- `npm run real-estate:growth-assets:district -- --district small_studio`
- `npm run real-estate:verify`
- `npm run react:real-estate-pixel-audit`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `git diff --check`

## 완료 문서
- 검증 후 `implementations/real-estate-final-reference-reconstruction/implementation.md`에 구조, 생성 파일, 검증 결과, 남은 리스크를 기록한다.

## 구현 결과
- `small_studio` 최종 master PNG는 첨부 최종본과 평균 절대 차이 0.00으로 일치한다.
- 중간 단계는 16개 슬롯을 잘라서 렌더하지 않고, 완성 건물/단지 visual group 단위로 켠다. 확대 피드백 이후 `small_studio`는 `minOwnedCount=0,1,2,4,6,9`의 5개 성장 단계로 나누고, 빨간 필지는 앞당기며 녹색 X 조각은 최종 쪽으로 미룬다.
- 런타임 상세 화면은 `data/real_estate_district_growth_assets.json`에 등록된 baked PNG를 배경으로 사용하고, 해당 지역의 기존 상세 DOM 건물 레이어는 렌더링하지 않는다.
- `small_studio` 외 지역은 기존 상세 배경 + DOM 건물 overlay 방식을 유지한다.
- 검증 완료:
  - `npm run real-estate:verify`
  - `npm run react:build`
  - `npm run react:real-estate-smoke`
  - `npm run react:real-estate-visual-audit`
