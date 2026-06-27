# small_studio 피드백 기반 잘림 보완 계획

## 목표

사용자가 확대 표시한 `small_studio` 중간 단계의 잘린 집/사각 패치 느낌을 줄이고, 이후 추가 피드백에 따라 빨간 동그라미 필지는 먼저 채우고 녹색 X 조각은 최종 쪽으로 미루도록 5개 성장 단계로 나눈다. 최종 단계는 `small-studio-final-reference.png`와 픽셀 일치를 유지한다.

## 확인 내용

- `git status --short` 확인 완료. 기존 dirty 파일은 되돌리지 않는다.
- `/implementations` 확인 완료. 기존 reconstruction 구현 문서를 기준으로 확장한다.
- MCP 자산 확인 완료. 이 PNG 보정에는 직접 맞는 전용 MCP가 없어 로컬 PIL 기반 crop 검수와 기존 감사 스크립트를 사용한다.
- `artifacts/real-estate-reconstruction/small-studio-feedback-cut-crop-sheet.png`와 master zoom crop으로 표시 위치를 확인했다.

## 구현 방침

1. `small_studio` 런타임 성장 테이블은 `00` 공터 + `01..05` 성장 단계로 둔다.
2. `minOwnedCount`는 `0,1,2,4,6,9`로 설정해 녹색 X 조각을 줄이고 빨간 필지 채움이 먼저 보이게 한다.
3. visual group reveal은 `2,4,6,9,11,13,16` 지점에 분산해 `01..06`은 한 덩어리씩 늘어나게 한다.
4. 자동 분리 결과가 8개 visual group이므로, 최종 `07` 단계에서는 전경 마지막 두 group을 함께 완성한다.
5. 최종 단계는 여전히 `final.copy()` 경로를 타므로 finalReference 픽셀 일치가 유지되어야 한다.

## 검증

- `npm run real-estate:growth-assets:district -- --district small_studio`
- `npm run react:real-estate-pixel-audit -- --district small_studio`
- `npm run real-estate:verify`
- `npm run react:build`
- `git diff --check`

## 검수 산출물

- `artifacts/real-estate-reconstruction/small-studio-feedback-cut-crop-sheet-after-polish.png`
- `artifacts/real-estate-reconstruction/small-studio-feedback-cut-crop-sheet-after-roof-polish.png`
- `artifacts/real-estate-reconstruction/small-studio-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/small-studio-reconstruction-audit-report.json`
