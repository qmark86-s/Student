# 부동산 후반 5지역 찢김 보정 구현

## 개요

사용자 확대 검수 피드백을 기준으로 후반 5지역 성장 PNG를 다시 나눴다. 이번 기준은 빨간 원이 "찢어진/부분 노출된 건물"이고, 녹색 X는 "중간 단계에서 보이면 안 되는 조각 또는 변화감이 약한 단계"다.

## 적용 결과

| id | 런타임 PNG | minOwnedCount | 처리 |
| --- | --- | --- | --- |
| `small_building` | `small-building-growth-00..03.png` | `0,6,10,17` | 초반 X 조각 제거, 하단 group 동시 reveal |
| `apartment_building` | `apartment-building-growth-00..04.png` | `0,1,3,7,13` | 하단 아파트 partial을 본체 group과 함께 reveal |
| `apartment_complex` | `apartment-complex-growth-00..03.png` | `0,1,11,27` | 왼쪽/오른쪽/전면 단지 3덩어리 reveal |
| `office_tower` | `office-tower-growth-00..04.png` | `0,1,6,13,21` | tower group을 완성 단위로 reveal |
| `mixed_development` | `mixed-development-growth-00..05.png` | `0,1,5,8,12,39` | 반복 단계 제거, 하단-left X group 최종 지연 |

2026-07-01 후속 `real-estate-uniform-ten-growth-stage` 작업에서 현재 런타임 성장 테이블은 모든 지역 10단계로 대체되었다. 위 표는 당시 PNG 품질 보정 기준이며, 현재 `data/real_estate_district_growth_assets.json`의 최종 `minOwnedCount` 기준은 10단계 문서를 따른다.

## 변경 파일

- `tools/generate-real-estate-baked-district-growth.py`
  - 후반 5지역의 `VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT`를 품질 기준으로 재조정했다.
  - 같은 건물의 몸통, 하단, 측면 group은 같은 reveal slot count로 묶었다.
- `data/real_estate_district_growth_assets.json`
  - 후반 5지역의 `stages[]`를 새 `minOwnedCount` 테이블로 갱신했다.
- `src/snapshot/assets/real-estate-district-growth/`
  - 후반 5지역 앱용 baked 성장 PNG를 재생성했다.
- `artifacts/real-estate-reconstruction/second-five-feedback-growth-review-gallery.html`
  - 후반 5지역 수동 검수용 갤러리를 새로 생성했다.
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
  - 전체 10지역 검수 갤러리를 최신 단계로 재생성했다.

## 검증

- 후반 5지역 `npm run real-estate:growth-assets:district -- --district <id>` 통과
- 후반 5지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과
  - 각 지역 `coverage=1.000`, `meanAbsDelta=0.00`
- `npm run real-estate:growth-review -- --index-file second-five-feedback-growth-review-gallery.html ...` 통과
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...` 통과
- `node tools/validate-real-estate-config.mjs` 통과
- `python -m py_compile tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/make-real-estate-growth-review-gallery.py` 통과
- `npm run real-estate:verify` 통과
- `npm run react:verify` 통과
- `git diff --check` 오류 없음. 기존 작업 파일의 LF/CRLF 경고만 출력됨

## 검수 위치

- 후반 5지역: `artifacts/real-estate-reconstruction/second-five-feedback-growth-review-gallery.html`
- 전체 10지역: `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
