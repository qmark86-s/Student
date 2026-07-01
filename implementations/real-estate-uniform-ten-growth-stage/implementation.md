# 부동산 성장 10단계 일괄화 구현

## 개요

모든 부동산 지역의 성장 테이블을 10개 논리 단계로 통일했다. 실제 PNG가 10장보다 적은 지역은 중간 단계에서 같은 PNG를 재사용한다. 이 무변화 단계는 추후 말풍선, 소규모 보상, 군중/차량 밀도 같은 별도 피드백을 붙일 수 있는 슬롯으로 남긴다.

기존 `maxOwnedCount`와 순차 해금 구조는 유지했다.

## 적용 파일

- `data/real_estate_district_growth_assets.json`
  - 10개 지역 모두 `stages.length`를 10으로 맞췄다.
  - `growthStage`는 0부터 9까지 연속된다.
  - `stages[1].minOwnedCount`는 항상 1이며, 0단계와 다른 PNG를 사용한다.
- `src/react/game/realEstate.js`
  - 런타임 데이터 검증에서 10단계 고정과 첫 구매 이미지 변경을 검사한다.
- `tools/validate-real-estate-config.mjs`
  - CLI 검증도 같은 규칙을 검사한다.
  - 같은 PNG를 여러 stage에 연결하는 것은 허용한다.
  - 실제 `real-estate-district-growth/*.png`가 데이터에 한 번도 연결되지 않으면 실패한다.
- 기존 부동산 성장 문서
  - 현재 stage 표와 검증 기준을 10단계 기준으로 갱신했다.

## 성장 단계표

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

## 검증 결과

- `node tools/validate-real-estate-config.mjs` 통과.
- `python -m py_compile tools/audit-real-estate-reconstruction-slots.py` 통과.
- `npm run real-estate:verify` 통과.
- 10개 지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과.
- `npm run real-estate:growth-review -- --district ... --index-file uniform-ten-growth-stage-review.html` 통과.
- `npm run react:build` 통과.
- `npm run react:real-estate-smoke` 통과.
- `npm run react:real-estate-visual-audit` 통과.
- `git diff --check` 통과. CRLF 경고만 출력됨.
- `npm run verify:mobile`은 첫 실행에서 `build:web`의 두 번째 `visual:build` 중 `visual-expedition-backdrop-shelter-09.png` 파일 쓰기 `UNKNOWN` 오류로 중단되었다. 그 전 단계인 `npm run verify`는 통과했고, 실패 지점 이후 `npm run build:web`, `npm run mobile:smoke`, `npm run visual:smoke`, `npm run career:smoke`, `npm run retake:smoke`를 재실행해 모두 통과했다.

## 주의

- 10단계는 게임 로직/피드백용 논리 단계 수다. 실제 PNG 수가 부족한 지역에서 같은 파일을 반복 연결하는 것은 정상이다.
- 새 PNG를 추가하면 해당 지역 stage 중 최소 1개에 연결해야 한다. 연결되지 않은 PNG는 검증 실패로 처리한다.
