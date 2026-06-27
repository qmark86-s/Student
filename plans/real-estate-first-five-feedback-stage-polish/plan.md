# 부동산 첫 5개 지역 수동 피드백 단계 보정 계획

## 목표

- `small_studio`, `two_room`, `villa`, `officetel`, `shop_unit`의 수동 검수 피드백을 반영한다.
- 빨간 동그라미로 표시된 빈 필지는 해당 단계에서 채워지도록 reveal을 앞당긴다.
- 녹색 X로 표시된 조각 또는 변화가 거의 없는 시트 단계는 제거하거나 뒤 단계로 미룬다.
- 최종 단계는 기존 finalReference와 픽셀 단위 일치를 유지한다.

## 적용 테이블

| id | 런타임 PNG | maxOwnedCount | minOwnedCount | 처리 기준 |
| --- | --- | ---: | --- | --- |
| `small_studio` | `small-studio-growth-00..05.png` | 10 | `0,1,2,4,6,9` | 빨간 필지 group을 먼저 켜고 녹색 조각 group은 최종 쪽으로 지연 |
| `two_room` | `two-room-growth-00..04.png` | 12 | `0,1,4,7,11` | 변화가 약한 중간 단계와 최종 직전 중복 단계 제거 |
| `villa` | `villa-growth-00..04.png` | 14 | `0,1,2,4,13` | 녹색 X로 표시된 8/14 중간 단계 제거 |
| `officetel` | `officetel-growth-00..05.png` | 16 | `0,1,4,8,12,15` | 오른쪽 빨간 필지를 먼저 채우고 왼쪽/중앙 녹색 조각은 최종 쪽으로 지연 |
| `shop_unit` | `shop-unit-growth-00..04.png` | 16 | `0,1,4,8,15` | 사용자 지정 1/2/3/4번 필지 순서대로 누적 채움 |

## 구현 항목

- `tools/generate-real-estate-baked-district-growth.py`의 5개 지역 reveal override를 수정한다.
- `data/real_estate_district_growth_assets.json`의 5개 지역 stage 테이블을 새 단계 수로 갱신한다.
- 5개 지역 성장 PNG와 전체 검수 갤러리를 재생성한다.
- `tools/audit-real-estate-reconstruction-slots.py`가 generation report의 finalReference patch placement를 기준으로 감사할 수 있게 보정한다.
- 관련 기준/구현 문서를 최신 단계 수로 갱신한다.

## 검증

- `npm run real-estate:growth-assets:district -- --district small_studio`
- `npm run real-estate:growth-assets:district -- --district two_room`
- `npm run real-estate:growth-assets:district -- --district villa`
- `npm run real-estate:growth-assets:district -- --district officetel`
- `npm run real-estate:growth-assets:district -- --district shop_unit`
- `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 5개 지역
- `npm run real-estate:growth-review -- --index-file first-five-feedback-growth-review-gallery.html ...`
- `npm run real-estate:verify`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
