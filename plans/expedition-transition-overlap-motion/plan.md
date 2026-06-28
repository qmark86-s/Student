# 원정대 Stage 이동/조우 겹침 연출 계획

## Summary
- 기존 `전투 정리 -> 4초 이동 -> 2.95초 조우 접근` 구조를 `전투 정리 -> 4초 이동 안에서 마지막 1초 조우 접근` 구조로 바꾼다.
- 최신 기준에서는 Stage 이동 4초를 linear 배경 이동으로 처리한다.
- 몬스터 접근은 이동 시작 3초부터 시작해 4초 종료 시점에 전투 가능 상태가 되게 한다.

## Current Finding
- `src/react/App.jsx`의 `EXPEDITION_STAGE_TRANSITION_MS`는 4000ms, `EXPEDITION_ENCOUNTER_INTRO_MS`는 2950ms다.
- 현재 `stageTransition`이 끝난 뒤에 `encounterIntro` 타이머를 새로 시작하므로, 이동 후 몬스터 조우 대기가 길게 느껴질 수 있다.
- 당시 `src/react/styles.css`의 `expeditionStageTravel`은 0%/100% 단일 easing이었고, 이후 가속/감속 분리 실험을 거쳐 현재는 linear 0%/100% keyframe으로 돌아왔다.
- Stage 이동 중에는 enemy group을 렌더하지 않기 때문에 몬스터가 감속과 동시에 다가오는 연출을 만들려면, 마지막 1초 동안 다음 Stage enemy group을 렌더해야 한다.

## Key Changes
- `App.jsx`
  - 이동 phase 상수 `1000/2000/500/500`을 명시한다.
  - `EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS = 3000`, `EXPEDITION_ENCOUNTER_APPROACH_MS = 1000`으로 둔다.
  - Stage 이동 시작 시 3초 타이머로 다음 Stage `encounterIntro`를 켠다.
  - Stage 이동 종료 시 별도 조우 대기 없이 최신 Stage를 표시하고 `combatReady`가 true로 돌아가게 한다.
  - 이동 중 `encounterIntro`가 켜진 경우 다음 Stage enemy data를 사용해 몬스터를 렌더한다.
  - 배경 keyframe 중간값용 CSS 변수와 조우 접근 duration 변수를 arena/scene에 전달한다.
- `styles.css`
  - 최신 기준에서는 `expeditionStageTravel` keyframe을 0%, 100%로 유지한다.
  - timing function은 linear로 둔다.
  - `expeditionEnemyEncounterApproach` duration을 CSS 변수 기반 1000ms로 줄인다.
- `tools/react-vite-expedition-smoke.mjs`
  - 이동 시작 직후에는 몬스터 접근이 없는지 확인한다.
  - 이동 중 후반에는 `data-stage-transition="moving"`과 `data-encounter-intro="approaching"`이 동시에 켜지는지 확인한다.
  - 접근 duration이 1000ms인지 확인한다.
  - 전환 종료 뒤 별도 조우 대기 없이 `data-combat-ready="true"`가 되는지 확인한다.

## Validation
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run react:expedition-rules-smoke`
- 필요 시 `npm run react:verify`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict

## Implementation Review
- `App.jsx`는 이동 시작 3초 뒤 다음 Stage 몬스터 접근을 켜고, 4초 이동 종료 시 별도 조우 대기 없이 `encounterIntro`를 비운다.
- 최신 기준의 `styles.css`는 4초 이동 keyframe을 0%/100% linear로 단순화했다.
- `react-vite-expedition-smoke`는 이동 초반 미접근, 이동 후반 접근 오버랩, 1000ms 접근 duration, 이동 종료 직후 combat ready 복귀를 검사하도록 갱신했다.
- 시각 검수 산출물은 `artifacts/expedition-transition-overlap-motion/`에 `01-transition-early.png`, `02-transition-overlap.png`, `03-transition-ready.png`, `report.json`으로 남겼다.
- 검증 결과: `npm run react:build`, `npm run react:expedition-smoke`, `npm run react:expedition-rules-smoke`, `npm run react:verify`, `git diff --check` 통과.
- `react:verify` 최초 1회는 `react:save-smoke` 버튼 대기 타임아웃으로 중단됐으나, `react:save-smoke` 단독 재실행과 `react:verify` 재실행은 모두 통과했다.

## Assumptions
- 총 Stage 이동 시간은 4초로 유지한다.
- 몬스터 접근은 별도 2.95초 대기가 아니라 마지막 1초 안에서 완료한다.
- 이동 중 후반에도 파티는 `running` 상태를 유지하고, 전환 종료 뒤 바로 `combat` 상태로 돌아간다.
- 기존 원정대 전투 보상/저장/자동 정산 규칙은 변경하지 않는다.
