# 부동산 대형 지역 성장 단계 재그룹 구현

## 개요

사용자 수동 검수 요청에 따라 다음 4개 대형 지역의 성장 PNG를 다시 나눴다.

- `apartment_building`
- `apartment_complex`
- `office_tower`
- `mixed_development`

기준은 단계 수보다 품질이다. 빈 땅이나 같은 건물 본체에 속한 visual group을 한 번에 reveal해서, 중간 단계에서 고층 건물 일부가 찢어져 보이지 않도록 했다.

## 적용 결과

| id | 런타임 PNG | minOwnedCount | 처리 기준 |
| --- | --- | --- | --- |
| `apartment_building` | `apartment-building-growth-00..04.png` | `0,1,3,7,13` | 빨간 원 partial 고층동을 본체 reveal로 묶음 |
| `apartment_complex` | `apartment-complex-growth-00..03.png` | `0,1,11,27` | 왼쪽/오른쪽/전면 단지 3덩어리 reveal |
| `office_tower` | `office-tower-growth-00..04.png` | `0,1,6,13,21` | tower group을 완성 단위로 묶음 |
| `mixed_development` | `mixed-development-growth-00..05.png` | `0,1,5,8,12,39` | 반복 단계 제거, 하단-left X group 최종 지연 |

## 변경 파일

- `tools/generate-real-estate-baked-district-growth.py`
  - `apartment_building`, `apartment_complex`, `office_tower`, `mixed_development`의 `VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT`를 조정했다.
  - 빨간 원으로 확인된 partial 건물은 본체 group과 같은 reveal 시점으로 묶고, 녹색 X group은 제거하거나 최종으로 지연했다.
- `data/real_estate_district_growth_assets.json`
  - 4개 지역의 `stages[]`를 새 `minOwnedCount` 테이블로 갱신했다.
- `src/snapshot/assets/real-estate-district-growth/`
  - 4개 지역의 앱용 성장 PNG를 재생성했다.
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
  - 전체 10개 지역 검수 갤러리를 새 단계 기준으로 재생성했다.
- `artifacts/real-estate-reconstruction/four-large-district-stage-review-after-user-feedback.png`
  - 4개 대형 지역만 모아 보는 stage review 이미지를 생성했다.

## 검증 결과

- `npm run real-estate:growth-assets:district -- --district apartment_building` 통과
- `npm run real-estate:growth-assets:district -- --district apartment_complex` 통과
- `npm run real-estate:growth-assets:district -- --district office_tower` 통과
- `npm run real-estate:growth-assets:district -- --district mixed_development` 통과
- 4개 지역 `tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과
  - 각 지역 `coverage=1.000`, `meanAbsDelta=0.00`
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...` 통과
- `node tools/validate-real-estate-config.mjs` 통과
- `python -m py_compile tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/make-real-estate-growth-review-gallery.py` 통과
- `npm run real-estate:verify` 통과
- `npm run react:verify` 통과
- `git diff --check` 통과. 기존 작업 파일의 LF/CRLF 경고만 출력됨

## 후속 검수 포인트

사용자 수동 검수는 `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`에서 진행한다. 축소 contact sheet에서 판단이 애매한 구간은 개별 PNG를 확대해서 보고, 건물 일부가 먼저 나타나는 경우 해당 visual group을 다음 본체 reveal 시점으로 더 늦춘다.
