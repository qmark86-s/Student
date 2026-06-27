# 상가 점포 4필지 단계화 및 찢김 재검수 구현

## 개요

사용자 피드백에 따라 `shop_unit` 성장 PNG를 `00..04` 5장으로 재구성했다. 기준은 사용자가 이미지에 적어준 필지 순서다.

- `01`: 1번 하단 필지 1개 채움
- `02`: 2번 좌측 필지 추가
- `03`: 3번 우측 필지 추가
- `04`: 4번 상단/중앙 필지까지 모두 채움

## 변경 내용

- `tools/generate-real-estate-baked-district-growth.py`
  - `shop_unit` visual group reveal override를 `4,8,12,16` 순서로 재배치했다.
  - 4번 필지는 두 visual group으로 나뉘어 있어 최종 단계에서 함께 reveal한다.
- `data/real_estate_district_growth_assets.json`
  - `shop_unit.stages[]`를 `0,1,4,8,15` 기준의 5장으로 갱신했다.
- `src/snapshot/assets/real-estate-district-growth/`
  - `shop-unit-growth-00..04.png`를 재생성했다.
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
  - 전체 검수 갤러리를 최신 PNG 기준으로 재생성했다.

## 재검수 메모

전체 지역 contact sheet를 다시 확인했다. 빨간 원 기준의 찢어진 건물은 중간 단계에서 보이면 안 되므로, 현재 명확히 반쪽 건물만 독립 노출되는 단계는 추가로 발견하지 못했다. 애매한 구간은 이후 사용자 확대 피드백이 오면 해당 visual group을 채우거나 제거하는 방식으로 계속 조정한다.

## 검증

- `npm run real-estate:growth-assets:district -- --district shop_unit` 통과
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...` 통과
- 전체 10지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과
  - 각 지역 `coverage=1.000`, `meanAbsDelta=0.00`
- `node tools/validate-real-estate-config.mjs` 통과
- `python -m py_compile tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/make-real-estate-growth-review-gallery.py` 통과
- `npm run real-estate:verify` 통과
- `npm run react:verify` 통과
