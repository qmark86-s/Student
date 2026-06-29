# 원정대 배경 이동 선형화 계획

> 최신 기준: `plans/expedition-backdrop-commercial-qa/plan.md` 차수 이후 선형 이동은 유지하되 Stage당 이동 거리는 `80px`, route tile 교체 주기는 `25 Stage`다. 아래 `300px` 내용은 이전 감각 튜닝 기록이다.

## Summary
- Stage 이동 거리는 `300px`로 유지한다.
- 배경 이동 중 가속/감속/정지 keyframe을 제거해, 4초 동안 `from -> to`를 일정 속도로 이동하게 한다.
- 몬스터 접근 오버랩은 기존처럼 이동 시작 3초 뒤부터 1초 동안 유지한다.

## Current Finding
- `src/react/styles.css`의 `expeditionStageTravel`은 0%, 25%, 75%, 87.5%, 100%로 나뉘어 있다.
- 0~25% 가속, 25~75% 순항, 75~87.5% 감속, 87.5~100% 정지에 가까운 구조라 이동폭이 `300px`로 커진 뒤 속도 변화가 튀어 보일 수 있다.
- `src/react/App.jsx`도 중간 keyframe용 `--expedition-bg-accelerate-x`, `--expedition-bg-decelerate-x`를 계산한다.

## Key Changes
- `src/react/App.jsx`
  - 배경 이동용 가속/감속 phase 상수와 `expeditionStageTravelKeyX()`를 제거한다.
  - `EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS = 3000`, `EXPEDITION_ENCOUNTER_APPROACH_MS = 1000`은 명시 상수로 유지한다.
  - arena style에는 `--expedition-bg-from-x`, `--expedition-bg-to-x`, `--expedition-stage-transition-ms`, `--expedition-encounter-approach-ms`만 전달한다.
- `src/react/styles.css`
  - `expeditionStageTravel`을 0%/100% keyframe으로 단순화한다.
  - `.stage-transitioning .expedition-arena::before`의 `linear` timing은 유지한다.
- 문서
  - 기존 “가속/감속/정지” 기준 문서에 최신 선형 이동 기준을 기록한다.

## Validation
- `npm run react:build` 통과.
- `npm run react:expedition-smoke` 통과.
- `npm run react:verify` 통과.
- `git diff --check` 통과. 줄끝 변환 경고만 출력됐다.

## Assumptions
- 사용자가 말한 “득득” 튐은 배경 이동 속도 변화가 원인이다.
- 전투 정리, 이동 총 시간 4초, 이동 후반 몬스터 접근 1초는 유지한다.
