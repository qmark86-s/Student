# 부동산 첫 5개 지역 수동 피드백 단계 보정 구현

## 개요

사용자가 `all-reference-growth-review-gallery.html`에서 표시한 첫 5개 지역 피드백을 반영했다.

대상:

- `small_studio`
- `two_room`
- `villa`
- `officetel`
- `shop_unit`

빨간 동그라미는 해당 단계에서 채워져야 하는 필지로 보고 reveal을 앞당겼다. 녹색 X는 해당 조각이 중간 단계에서 보이면 안 되거나, 변화가 약한 시트 단계로 보고 제거 또는 최종 쪽 지연으로 처리했다.

## 적용 결과

| id | 런타임 PNG | minOwnedCount | 처리 |
| --- | --- | --- | --- |
| `small_studio` | `small-studio-growth-00..05.png` | `0,1,2,4,6,9` | 빨간 필지 group 선반영, 녹색 조각 group 최종 지연 |
| `two_room` | `two-room-growth-00..04.png` | `0,1,4,7,11` | 변화 약한 중간 단계와 최종 직전 중복 단계 제거 |
| `villa` | `villa-growth-00..04.png` | `0,1,2,4,13` | 녹색 X로 표시된 8/14 중간 단계 제거 |
| `officetel` | `officetel-growth-00..05.png` | `0,1,4,8,12,15` | 오른쪽 필지 우선 reveal, 왼쪽/중앙 조각 최종 지연 |
| `shop_unit` | `shop-unit-growth-00..04.png` | `0,1,4,8,15` | 사용자 지정 1/2/3/4번 필지 순서 누적 |

## 변경 파일

- `tools/generate-real-estate-baked-district-growth.py`
  - 첫 5개 지역의 `VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT`를 수동 피드백 기준으로 재조정했다.
- `data/real_estate_district_growth_assets.json`
  - 첫 5개 지역 stage 테이블을 새 `minOwnedCount` 기준으로 갱신했다.
- `tools/audit-real-estate-reconstruction-slots.py`
  - generation report의 finalReference patch placement를 slot 감사에 반영하도록 보정했다.
  - patch 기반 visual group의 alpha overlap은 리포트 값으로 남기고, 최종 픽셀 일치와 금지 영역 검사는 계속 엄격하게 수행한다.
- `src/snapshot/assets/real-estate-district-growth/`
  - 첫 5개 지역 성장 PNG를 재생성했다.
- `artifacts/real-estate-reconstruction/first-five-feedback-growth-review-gallery.html`
  - 첫 5개 지역 전용 검수 갤러리를 생성했다.
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
  - 전체 10개 지역 검수 갤러리를 새 단계 기준으로 재생성했다.

## 검증 결과

- 5개 지역 `npm run real-estate:growth-assets:district -- --district <id>` 통과
- 5개 지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과
  - 각 지역 `coverage=1.000`, `meanAbsDelta=0.00`
- `node tools/validate-real-estate-config.mjs` 통과
- `python -m py_compile tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/make-real-estate-growth-review-gallery.py` 통과
- `npm run react:verify` 통과
- `git diff --check` 통과. 기존 작업 파일의 LF/CRLF 경고만 출력됨

## 수동 검수 위치

- `artifacts/real-estate-reconstruction/first-five-feedback-growth-review-gallery.html`
- `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`
