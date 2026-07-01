# 부동산 성장 PNG 구매 수량 바인딩 및 순차 해금 구현

## 구현 요약

- `data/real_estate_district_growth_assets.json`을 v2 구조로 전환했다.
  - 전역 `stageCount`, `slotCount`, stage별 `builtCount` 계약을 제거했다.
  - 지역별 `maxOwnedCount`, `unlock`, `stages[].growthStage`, `stages[].minOwnedCount`, `stages[].file`을 기준으로 관리한다.
- `small_studio`는 원정대 Stage 1로 해금되고, 이후 지역은 `real_estates.json` 순서대로 직전 지역의 `maxOwnedCount` 달성 시 해금된다.
- 기존 세이브 보호를 위해 이미 1채 이상 보유한 부동산은 잠금으로 회수하지 않는다. 다만 새 구매는 지역별 `maxOwnedCount`를 넘지 못한다.

## 런타임 기준

- `src/react/game/realEstate.js`
  - 성장 PNG는 `min(count, maxOwnedCount)` 이하에서 가장 큰 `minOwnedCount` stage를 선택한다.
  - overview 개발도와 건물 dot 수는 `count / maxOwnedCount` 기준으로 계산한다.
  - `구매`, `10개`, `최대` 구매는 잠금 상태와 남은 구매 가능 수량을 먼저 확인한다.
  - DEBUG `부동산 풀성장`은 1000채가 아니라 각 지역의 `maxOwnedCount`로 세팅한다.
- `src/react/App.jsx`
  - 잠김 문구는 기존 `Stage N` 고정 대신 `unlockLabel`/`unlockHint`를 표시한다.
  - 카드 보유량은 `현재/maxOwnedCount`로 표시한다.

## 생성/검증 도구

- `tools/generate-real-estate-baked-district-growth.py`
  - 성장 테이블의 stage 목록만 생성한다.
  - `growthStage`를 원본 16개 슬롯 범위에 균등 매핑해 visual group prefix를 합성한다.
  - `small_studio`는 사용자 확대 피드백에 따라 `00` 공터 + `01..05` 성장 단계로 재구성했다. `minOwnedCount`는 `0,1,2,4,6,9`이며, 녹색 X로 보인 조각 group은 최종 쪽으로 미룬다.
- `tools/make-real-estate-growth-review-gallery.py`
  - 지역별 실제 stage 수와 `minOwnedCount/maxOwnedCount` 캡션으로 갤러리를 생성한다.
- `tools/audit-real-estate-reconstruction-slots.py`
  - generation report의 `revealSlotCount` 기준으로 visual group prefix를 감사한다.
  - 금지 영역 검사는 실제 렌더 알파 픽셀을 엄격 기준으로 삼고, footprint overlap은 리포트 데이터로 남긴다.
- `tools/react-vite-real-estate-smoke.mjs`, `tools/react-vite-real-estate-visual-audit.mjs`
  - 풀성장 seed와 기대 성장 PNG를 `maxOwnedCount` 기준으로 계산한다.

## 검증 결과

- `npm run real-estate:growth-assets:district -- --district <id>` 전체 10개 지역 통과
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...` 통과
- `npm run real-estate:verify` 통과
- `npm run react:build` 통과
- `npm run react:real-estate-smoke` 통과
- `npm run react:real-estate-visual-audit` 통과

## 주의

- `apartment_building`은 `apartment-building-final-reference.png` 기준이다. `apartment_complex`와 교체하면 안 된다.
- 기존 세이브의 초과 보유 수량은 normalize 과정에서 줄이지 않는다. 이미지/개발도만 `maxOwnedCount`로 clamp한다.
- `small_studio`는 빨간 동그라미 필지를 먼저 채우고 녹색 X 조각을 뒤로 미뤄 `small-studio-growth-00..05.png`로 재구성했다.
- `two_room`은 변화가 약한 중간 단계와 최종 직전 중복 단계를 제거해 `two-room-growth-00..04.png`로 줄였다.
- `villa`는 변화가 약한 8/14 중간 단계를 제거해 `villa-growth-00..04.png`로 줄였다.
- `officetel`은 오른쪽 빨간 필지 group을 먼저 켜고 왼쪽/중앙 녹색 X group은 최종 쪽으로 미뤄 `officetel-growth-00..05.png`로 재구성했다.
- `shop_unit`은 사용자 지정 1/2/3/4번 필지 순서대로 누적 채우도록 `shop-unit-growth-00..04.png`로 재구성했다.
- `small_building`은 녹색 X 초반 조각을 제거하고 하단 group을 같은 reveal 시점으로 묶어 `small-building-growth-00..03.png`로 축약했다.
- `apartment_building`은 빨간 원 partial 고층동이 찢어져 보이지 않도록 얇은 group을 본체와 묶고 `apartment-building-growth-00..04.png`로 축약했다.
- `apartment_complex`는 왼쪽/오른쪽/전면 단지 3덩어리만 중간 reveal로 사용해 `apartment-complex-growth-00..03.png`로 축약했다.
- `office_tower`는 tower group을 완성 단위로 묶어 `office-tower-growth-00..04.png`로 조정했다.
- `mixed_development`는 변화 없는 반복 단계와 작은 조각 단독 노출을 제거하고 하단-left 녹색 X group을 최종으로 미뤄 `mixed-development-growth-00..05.png`로 조정했다.
- 단일 지역 재생성 시 `real_estate_district_growth_assets.json.districts` 순서가 바뀌지 않도록 생성 스크립트의 upsert는 기존 위치 교체 방식이어야 한다.

## 인코딩 무결성 보강 (2026-06-27 감사 후속)

- `data/real_estate_district_growth_assets.json`의 `unlock.help` 20곳이 `?`로 깨져 있던 것을 한글로 복구했다(파일 내 `?` 0개). `unlock` 블록은 생성 스크립트가 입력을 그대로 통과시키는 authored 필드라 재생성으로는 복구되지 않으므로 데이터에서 직접 고친다.
  - `expeditionStage`: `type`=해금 조건 종류 설명, `stage`=원정대 Stage 도달 해금 설명.
  - `previousMaxOwned`: `type`=직전 부동산 최대 보유 달성 해금 설명, `previousDistrictId`=직전 지역 id 설명.
- 재발 방지로 help 검증에 mojibake 가드를 추가했다. 연속된 `?`(`/\?{2,}/`) 또는 `�`가 있으면 실패한다. 단일 물음표가 포함된 정상 한글 문장은 통과한다.
  - `tools/validate-real-estate-config.mjs`: `assertNoMojibake`를 추가하고 `help()`에서 모든 부동산 help 문자열을 검사한다.
  - `src/react/game/realEstate.js`: `validateHelp`에 같은 가드를 추가해 런타임 로드/smoke에서 깨짐을 fatal로 드러낸다.
- 검증: `npm run real-estate:verify` 통과(validator + small_studio 픽셀 감사 `coverage=1.000`, `meanAbsDelta=0.00`).

## 수동 교체 성장 PNG 적용 (2026-07-01)

사용자가 직접 교체/추가한 `src/snapshot/assets/real-estate-district-growth/*.png`를 현재 성장 테이블에 모두 연결했다. `maxOwnedCount`와 순차 해금 조건은 유지하고, 파일명 순서를 성장 순서로 사용한다.

현재 stage 적용표는 10단계 일괄화 기준을 따른다. PNG가 부족한 지역은 중간 단계에서 같은 파일을 재사용하지만, 첫 구매 단계는 항상 0단계와 다른 파일이다.

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

## 10단계 일괄화 (2026-07-01)

- 모든 지역의 `stages.length`를 10으로 통일했다.
- `stages[1].minOwnedCount`는 항상 1이며, 0단계와 다른 PNG를 연결한다.
- `tools/validate-real-estate-config.mjs`와 `src/react/game/realEstate.js`에서 10단계 고정과 첫 구매 이미지 변경을 검증한다.
- 의도적인 무변화 논리 단계를 위해 같은 PNG 파일을 여러 stage에 연결할 수 있다. 단, 실제 `src/snapshot/assets/real-estate-district-growth` 폴더의 PNG가 데이터에 한 번도 연결되지 않으면 검증은 실패한다.

검증 기준도 함께 바꿨다.

- `tools/validate-real-estate-config.mjs`는 `real-estate-district-growth` 폴더의 PNG가 데이터 stage에 연결되지 않으면 실패한다.
- `tools/audit-real-estate-reconstruction-slots.py`는 생성 리포트와 차수/해상도가 다른 수동 runtime PNG를 `manualRuntimePng` 모드로 감사한다.
- 수동 모드는 모든 stage PNG 로드, 해상도, 파일 크기, 0단계 대비 최종 단계 변화량을 검사하고 `artifacts/real-estate-reconstruction/<slug>-reconstruction-audit-report.json`에 남긴다.

검증:

- `npm run real-estate:verify` 통과.
- 10개 지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과.
- `npm run real-estate:growth-review -- --district ... --index-file manual-growth-image-application-review.html` 통과.
- `npm run react:build` 통과.
- `npm run react:real-estate-smoke` 통과.
- `npm run react:real-estate-visual-audit` 통과.
