# 부동산 성장 10단계 일괄화 계획

## 목표

- 모든 부동산 지역의 논리 성장 단계를 10단계로 맞춘다.
- 첫 구매 시에는 반드시 0단계와 다른 PNG가 선택되도록 `minOwnedCount: 1` 단계에 1번 성장 이미지를 연결한다.
- 지역별 PNG 수가 10개보다 적은 경우에는 중간 논리 단계에 같은 PNG를 재사용해, 이후 말풍선/보상 같은 별도 피드백을 붙일 수 있는 성장 슬롯을 확보한다.
- 기존 `maxOwnedCount`와 순차 해금 조건은 유지한다.

## 현재 분석

- 부동산 상세 배경은 `data/real_estate_district_growth_assets.json`의 `stages[].minOwnedCount` 중 보유 수량 이하에서 가장 큰 단계를 선택한다.
- 런타임 선택 로직은 같은 PNG가 여러 단계에 연결되어도 동작 가능하다.
- CLI 검증은 현재 `stages[].file` 중복을 실패로 처리하므로, 의도적인 무변화 단계를 허용하도록 규칙을 바꿔야 한다.
- 수동 PNG 적용 차수에서 추가된 실제 성장 PNG는 계속 모두 데이터에 연결되어야 한다.

## 적용 기준

- 모든 지역의 `stages.length`는 10으로 고정한다.
- 모든 지역의 `growthStage`는 0부터 9까지 연속으로 둔다.
- 0단계는 `minOwnedCount: 0`, 1단계는 `minOwnedCount: 1`로 둔다.
- 1단계 PNG는 0단계 PNG와 달라야 한다.
- 최종 9단계는 각 지역의 마지막 실제 PNG를 사용하고 `maxOwnedCount - 1` 근처에서 표시되게 한다.
- PNG가 부족한 지역은 중간 단계에서 직전 또는 다음 실제 PNG를 재사용한다.

## 구현

- `data/real_estate_district_growth_assets.json`
  - 10개 지역의 `stages`를 모두 10개로 재작성한다.
  - 부족한 PNG는 파일 경로를 중복 연결하되, 실제 PNG 파일은 새로 만들지 않는다.
- `src/react/game/realEstate.js`
  - 런타임 데이터 검증에서 10단계 고정과 첫 구매 이미지 변경을 검사한다.
- `tools/validate-real-estate-config.mjs`
  - CLI 검증도 같은 10단계/첫 구매 규칙을 검사한다.
  - 중복 PNG 연결은 허용하되, 폴더에 있는 실제 성장 PNG가 데이터에 한 번도 연결되지 않으면 실패한다.
- 문서
  - 기존 부동산 성장 바인딩 문서와 수동 PNG 적용 문서를 새 10단계 기준으로 갱신한다.
  - 구현 설명서를 새 폴더에 추가한다.

## 검증

- `node tools/validate-real-estate-config.mjs`
- `python -m py_compile tools/audit-real-estate-reconstruction-slots.py`
- `npm run real-estate:verify`
- 10개 지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>`
- `npm run real-estate:growth-review -- --district ... --index-file uniform-ten-growth-stage-review.html`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- 가능하면 `npm run verify:mobile`
