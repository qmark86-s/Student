# 부동산 대형 지역 성장 단계 재그룹 계획

## 목표

- `apartment_building`, `apartment_complex`, `office_tower`, `mixed_development`의 성장 PNG를 빈 땅/완성 건물군 단위로 다시 나눈다.
- 중간 단계에서 고층 건물의 얇은 조각, 옥상, 벽면 일부가 먼저 나타나 건물이 찢어져 보이는 상태를 제거한다.
- `data/real_estate_district_growth_assets.json`의 `minOwnedCount` 테이블과 실제 생성 PNG 개수를 일치시킨다.

## 기준

- 단계 수는 품질 우선으로 정한다. 16개 원본 슬롯을 그대로 노출하지 않고, 같은 필지 또는 같은 건물 본체에 속한 visual group은 같은 reveal 시점으로 묶는다.
- 최종 단계는 기존 finalReference와 픽셀 단위로 일치해야 한다.
- `apartment_building`은 `apartment-building-final-reference.png`, `apartment_complex`는 `apartment-complex-final-reference.png`를 계속 사용한다.

## 적용 테이블

| id | 런타임 PNG | maxOwnedCount | minOwnedCount |
| --- | --- | ---: | --- |
| `apartment_building` | `apartment-building-growth-00..04.png` | 24 | `0,1,3,7,13` |
| `apartment_complex` | `apartment-complex-growth-00..03.png` | 28 | `0,1,11,27` |
| `office_tower` | `office-tower-growth-00..04.png` | 32 | `0,1,6,13,21` |
| `mixed_development` | `mixed-development-growth-00..05.png` | 40 | `0,1,5,8,12,39` |

## 작업 항목

- `tools/generate-real-estate-baked-district-growth.py`에 대형 지역 visual group reveal override를 추가한다.
- `data/real_estate_district_growth_assets.json`의 4개 지역 stage 테이블을 새 단계 수로 갱신한다.
- 4개 지역 성장 PNG를 재생성하고, 전체 검수 갤러리를 다시 만든다.
- 관련 handoff/intake/implementation 문서를 갱신한다.

## 검증

- `npm run real-estate:growth-assets:district -- --district apartment_building`
- `npm run real-estate:growth-assets:district -- --district apartment_complex`
- `npm run real-estate:growth-assets:district -- --district office_tower`
- `npm run real-estate:growth-assets:district -- --district mixed_development`
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...`
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `npm run react:verify`
