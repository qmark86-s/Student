# 부동산 성장 PNG 구매 수량 바인딩 및 순차 해금 계획

## 목표
- 지역별 성장 PNG를 0..16 고정 단계가 아니라 `minOwnedCount -> file` 테이블로 선택한다.
- `small_studio`만 원정대 Stage 1로 열고, 이후 부동산은 직전 부동산의 `maxOwnedCount` 달성으로 순차 해금한다.
- 기존 세이브는 보유 수량을 줄이지 않고, 이미 1채 이상 보유한 부동산은 잠금으로 회수하지 않는다.

## 구현
- `data/real_estate_district_growth_assets.json`을 v2로 갱신한다.
  - 지역별 `maxOwnedCount`, `unlock`, `stages[].growthStage`, `stages[].minOwnedCount`, `stages[].file`을 둔다.
  - `builtCount`, 전역 `stageCount`, 전역 `slotCount` 의존을 제거한다.
- `src/react/game/realEstate.js`는 성장 테이블을 기준으로 잠금, 구매 가능 수량, 성장 PNG, overview 개발도를 계산한다.
  - 구매 함수는 잠김 또는 최대 보유 도달 시 구매하지 않는다.
  - `buy 10`, `buy max`는 남은 보유 가능 수량까지만 계산한다.
  - 성장 이미지는 `min(count, maxOwnedCount)` 이하에서 가장 큰 `minOwnedCount`를 선택한다.
- Python/Node 검증 도구와 갤러리는 성장 테이블의 실제 stage 목록만 순회한다.
- 문서와 smoke/audit는 `1000채 풀성장` 대신 지역별 `maxOwnedCount` 기준을 사용한다.

## 현재 테이블
2026-07-01 `real-estate-uniform-ten-growth-stage` 차수에서 모든 지역을 10개 논리 성장 단계로 통일했다. `maxOwnedCount`와 순차 해금 구조는 유지하고, 첫 구매 단계(`minOwnedCount: 1`)는 항상 0단계와 다른 PNG를 사용한다. 실제 PNG가 10개보다 적은 지역은 중간 논리 단계에 같은 PNG를 재사용한다.

| id | stage 수 | maxOwnedCount | minOwnedCount |
|---|---:|---:|---|
| `small_studio` | 10 | 10 | `0,1,2,3,4,5,6,7,8,9` |
| `two_room` | 10 | 12 | `0,1,2,3,4,5,7,8,10,11` |
| `villa` | 10 | 14 | `0,1,2,3,5,6,8,10,12,13` |
| `officetel` | 10 | 16 | `0,1,2,4,6,8,10,12,14,15` |
| `shop_unit` | 10 | 16 | `0,1,2,4,6,8,10,12,14,15` |
| `small_building` | 10 | 18 | `0,1,3,5,7,9,11,13,15,17` |
| `apartment_building` | 10 | 24 | `0,1,3,5,8,11,14,17,20,23` |
| `apartment_complex` | 10 | 28 | `0,1,4,7,10,13,16,19,23,27` |
| `office_tower` | 10 | 32 | `0,1,5,9,13,17,21,25,28,31` |
| `mixed_development` | 10 | 40 | `0,1,5,9,13,17,22,28,34,39` |

## 검증
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
