# small_studio 피드백 기반 잘림 보완 구현 설명

## 목적

확대 검수에서 보인 `small_studio` 중간 단계의 잘린 집/사각 패치 느낌을 줄였고, 이후 추가 피드백에 따라 빨간 동그라미 필지는 먼저 채우고 녹색 X 조각은 최종 쪽으로 미루도록 5개 성장 단계로 재구성했다.

## 변경 사항

- `data/real_estate_district_growth_assets.json`의 `small_studio` 단계는 `small-studio-growth-00..05.png`로 변경했다.
- `small_studio`의 `minOwnedCount`는 `0,1,2,4,6,9`다.
- `tools/generate-real-estate-baked-district-growth.py`의 `VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT.small_studio`는 `(3, 4): 3`, `(5, 6): 6`, `(7,): 6`, `(8, 9): 9`, `(10,): 12`, `(1, 2): 16`, `(11, 12, 13): 16`, `(14, 15, 16): 16`으로 조정했다.
- `small-studio-visual-group-01..06`은 `01..06` 단계에서 한 덩어리씩 나타나고, 전경 마지막 두 group은 `07` 최종 단계에서 함께 완성된다.
- `tools/react-vite-real-estate-smoke.mjs`는 baked PNG의 실제 계약을 `data-growth-asset` 기준으로 검증한다.

## 이유

기존 4단계 구성은 초반 단계에서 여러 필지가 한꺼번에 채워졌고, 일부 group을 최종 단계로만 미룬 뒤에는 성장 흐름이 너무 뭉쳐 보였다. 7개 성장 단계로 분산하면 확대 검수에서 보이는 찢어진 집 문제를 피하면서도 사용자가 표시한 빈 땅들이 순서대로 채워지는 흐름을 만들 수 있다.

## 검증 결과

- `npm run real-estate:growth-assets:district -- --district small_studio`: 통과
- `npm run react:real-estate-pixel-audit -- --district small_studio`: 통과
- `npm run real-estate:verify`: 통과
- `npm run react:build`: 통과
- `npm run react:real-estate-smoke`: 통과
- `npm run react:real-estate-visual-audit`: 통과
- 감사 결과: `coverage=1.000`, `meanAbsDelta=0.00`
- `artifacts/real-estate-reconstruction/small-studio-stage-contact-sheet.png`에서 `00..05` 전체 흐름을 확인한다.

## 검수 산출물

- `artifacts/real-estate-reconstruction/small-studio-feedback-cut-crop-sheet-after-polish.png`
- `artifacts/real-estate-reconstruction/small-studio-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/small-studio-stage-00-07-full-review.png`
- `artifacts/real-estate-reconstruction/small-studio-reconstruction-audit-report.json`
