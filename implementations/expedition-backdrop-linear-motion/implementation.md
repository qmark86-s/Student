# 원정대 배경 이동 선형화 구현

> 최신 기준: `plans/expedition-backdrop-commercial-qa/plan.md` 차수 이후 이동 곡선은 선형을 유지하되 Stage당 이동 거리는 `80px`, route tile 교체 주기는 `25 Stage`다.

## 개요
- Stage 이동 거리는 `300px`로 유지했다.
- 배경 이동에서 가속/감속/정지 구간을 제거하고, 4초 동안 일정 속도로 `from -> to`까지 이동하게 했다.
- 이동 후반 1초 몬스터 접근 오버랩은 유지했다.
- 전투, 보상, Stage 진행 규칙은 변경하지 않았다.

## 구현
- `src/react/App.jsx`
  - 배경 중간 keyframe 계산에 쓰던 `EXPEDITION_STAGE_TRANSITION_ACCEL_MS`, `CRUISE_MS`, `DECEL_MS`, `SETTLE_MS`를 제거했다.
  - `expeditionStageTravelKeyX()`와 `--expedition-bg-accelerate-x`, `--expedition-bg-decelerate-x` 전달을 제거했다.
  - 몬스터 접근은 기존과 동일하게 `EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS = 3000`, `EXPEDITION_ENCOUNTER_APPROACH_MS = 1000`으로 유지했다.
- `src/react/styles.css`
  - `expeditionStageTravel`을 0%/100% keyframe으로 단순화했다.
  - `.expedition-scene.stage-transitioning .expedition-arena::before`는 기존처럼 `linear` timing function을 사용한다.

## 검증 결과
- `npm run react:build` 통과.
- `npm run react:expedition-smoke` 통과.
  - Stage 1 -> 2 이동은 `0px -> -300px`로 유지됐다.
  - 몬스터 접근 오버랩은 이동 후반 `1000ms`로 확인됐다.
  - 직장 수입이 패시브로 `money`를 증가시킬 수 있어, 스모크의 money 검증은 감소 여부만 확인하도록 최신화했다.
- `npm run react:verify` 통과.
- `git diff --check` 통과. 줄끝 변환 경고만 출력됐다.

## 유지보수 기준
- 배경 이동을 다시 튜닝할 때는 거리(`EXPEDITION_STAGE_BACKDROP_STEP_PX`)와 속도 곡선(`expeditionStageTravel`)을 분리해서 본다.
- 튐이 다시 보이면 우선 keyframe 중간 지점이나 non-linear timing function이 재도입됐는지 확인한다.
