# 부동산 성장 PNG 후반 5지역 찢김 보정 계획

## 목표
- `small_building`, `apartment_building`, `apartment_complex`, `office_tower`, `mixed_development`의 중간 성장 PNG에서 건물이 부분적으로 찢겨 보이는 단계를 제거한다.
- 사용자가 표시한 빨간 원은 찢어진 건물 상태로 보고, 해당 visual group을 같은 건물 덩어리와 함께 노출하거나 단계를 제거한다.
- 사용자가 표시한 녹색 X는 변화감이 낮거나 부적절한 단계로 보고 성장 테이블에서 제외한다.

## 작업 범위
- `tools/generate-real-estate-baked-district-growth.py`의 지역별 visual group reveal override를 조정한다.
- `data/real_estate_district_growth_assets.json`의 후반 5지역 stage 목록을 권장 단계 수로 재작성한다.
- 후반 5지역 성장 PNG와 검수 갤러리를 재생성한다.
- 관련 문서와 구현 기록을 최신화한다.

## 권장 단계
| id | maxOwnedCount | minOwnedCount |
|---|---:|---|
| `small_building` | 18 | `0,6,10,17` |
| `apartment_building` | 24 | `0,1,3,7,13` |
| `apartment_complex` | 28 | `0,1,11,27` |
| `office_tower` | 32 | `0,1,6,13,21` |
| `mixed_development` | 40 | `0,1,5,8,12,39` |

2026-07-01 후속 `real-estate-uniform-ten-growth-stage` 작업에서 현재 런타임 성장 테이블은 모든 지역 10단계로 대체되었다. 위 권장 단계는 찢김 보정 당시의 품질 기준으로만 참고한다.

## 검증
- `npm run real-estate:growth-assets:district -- --district <id>`로 후반 5지역 PNG 재생성
- `npm run real-estate:growth-review -- --index-file second-five-feedback-growth-review-gallery.html ...`
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...`
- `python tools/audit-real-estate-reconstruction-slots.py --district <id>`
- `npm run react:verify`
