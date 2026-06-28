# 원정대 배경 이동 거리 확대 계획

## Summary
- 챕터별 배경 고도화 이후 Stage 클리어 이동 중 배경이 지나가는 거리가 너무 짧게 느껴지는 문제를 수정한다.
- 현재 `EXPEDITION_STAGE_BACKDROP_STEP_PX = 20`은 사용자 체감상 “10 이동” 수준으로 보이며, 요청한 “10이면 150 정도” 감각에 맞춰 15배인 `300px`로 올린다.
- 전투/보상/Stage 진행 규칙은 바꾸지 않고 presentation offset만 조정한다.

## Current Finding
- `src/react/App.jsx`의 `expeditionStageBackdropOffset()`은 현재 route tile 내부 Stage 번호와 `EXPEDITION_STAGE_BACKDROP_STEP_PX`를 곱해 배경 X offset을 계산한다.
- 챕터별 배경 tile 구조는 100 Stage마다 tile을 바꾸고, tile 내부 Stage에서 offset을 리셋한다.
- 변경 전 Stage 1 -> 2 smoke는 `0 -> -20`을 기대했다.

## Key Changes
- `src/react/App.jsx`
  - `EXPEDITION_STAGE_BACKDROP_STEP_PX`를 `20`에서 `300`으로 변경한다.
  - 최신 기준에서는 `expeditionStageTravel`을 0%/100% linear keyframe으로 단순화해 확대된 이동폭을 일정 속도로 이동한다.
- `src/react/styles.css`
  - CSS custom property가 누락된 비정상 상태의 keyframe fallback도 `-300px` 기준으로 맞춘다.
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 1 -> 2 전환 기대 offset을 `0 -> -300`으로 갱신한다.
- 문서
  - 원정대 Stage 전환/조우/전투 시각/챕터 배경 문서의 Stage당 이동 거리 설명을 최신화한다.

## Validation
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run react:verify`
- `git diff --check`

## Implementation Review
- `EXPEDITION_STAGE_BACKDROP_STEP_PX`를 `300`으로 변경했다.
- Stage 1 -> 2 smoke 기대값을 `0 -> -300`으로 갱신했다.
- Stage 101은 기존처럼 tile 1, offset 0으로 리셋된다.
- 검증 결과: `npm run react:build`, `npm run react:expedition-smoke`, `npm run react:verify`, `git diff --check` 통과.
- 참고: 빌드와 원정대 smoke를 병렬로 돌린 첫 시도는 원정대 프레임 이미지 로딩 대기에서 타임아웃이 났다. 이후 단독 원정대 smoke와 전체 verify는 통과했다.

## Assumptions
- 요청의 “10 -> 150”은 현재 이동량 대비 15배 확대 의도로 해석한다.
- 300px 이동이 너무 빠르게 느껴질 경우 같은 상수만 낮추면 된다.
