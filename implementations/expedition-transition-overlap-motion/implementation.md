# 원정대 Stage 이동/조우 겹침 연출 구현

## 개요
- 최신 기준: `implementations/expedition-backdrop-linear-motion/implementation.md`에서 배경 이동은 4초 전체 linear 이동으로 갱신했다. 아래 문서의 가속/감속/정지 구간 설명은 이전 구현 기록이다.
- 원정대 Stage 승리 후 이동 총 시간은 4초로 유지한다.
- 기존처럼 4초 이동이 끝난 뒤 2.95초 동안 몬스터가 따로 다가오지 않는다.
- 몬스터 접근은 이동 시작 3초 뒤, 즉 이동 마지막 1초에 시작하고 1초 안에 완료된다.
- 이동 후반 1초 동안 `data-stage-transition="moving"`과 `data-encounter-intro="approaching"`이 동시에 켜진다.
- 이동 종료 시점에는 `encounterIntro`를 정리하고 즉시 `data-combat-ready="true"`가 되어 다음 전투를 시작할 수 있다.

## 구현 구조
- `src/react/App.jsx`
  - 현재 최신 기준에서는 배경 이동 구간 상수를 따로 두지 않고, 4초 전체를 linear로 이동한다.
  - `EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS`는 3000ms, `EXPEDITION_ENCOUNTER_APPROACH_MS`는 1000ms로 계산한다.
  - Stage 이동 시작 시 3초 타이머로 다음 Stage의 `encounterIntro`를 켠다.
  - Stage 이동 종료 타이머에서는 별도 조우 타이머를 만들지 않고 `encounterIntro`를 바로 비운다.
  - 이동 중 접근이 켜진 경우 현재 표시 Stage가 아니라 최신 저장 상태의 다음 Stage enemy data를 사용해 몬스터를 렌더한다.
  - 배경 이동 시간과 몬스터 접근 시간을 위해 `--expedition-stage-transition-ms`, `--expedition-encounter-approach-ms`를 arena style에 전달한다.
- `src/react/styles.css`
  - 최신 기준에서는 `expeditionStageTravel` keyframe을 0%, 100%로 단순화해 일정 속도로 움직인다.
  - `.expedition-enemy-group.approaching`은 CSS 변수 기반 1000ms 접근 애니메이션을 사용한다.
  - Stage 이동 중 적 숨김 규칙은 `.approaching`이 아닌 enemy group에만 적용해 이동 후반 접근 몬스터가 보이게 했다.
- `tools/react-vite-expedition-smoke.mjs`
  - 이동 초반에는 접근 그룹이 없는지 검사한다.
  - 이동 후반에는 Stage 이동과 조우 접근이 동시에 켜지는지 검사한다.
  - 접근 duration이 약 1000ms인지 검사한다.
  - 오버랩 중 파티는 계속 `running`, 버튼 문구는 `이동중`인지 검사한다.
  - 이동 종료 직후 별도 조우 대기 없이 `data-combat-ready="true"`로 돌아오는지 검사한다.

## 시각 검수 산출물
- `artifacts/expedition-transition-overlap-motion/01-transition-early.png`
  - 이동 초반: 파티 running, 적 미표시, `이동중`.
- `artifacts/expedition-transition-overlap-motion/02-transition-overlap.png`
  - 이동 후반: 파티 running 유지, 다음 Stage 적이 오른쪽에서 접근.
- `artifacts/expedition-transition-overlap-motion/03-transition-ready.png`
  - 이동 종료: 다음 Stage 적 배치 완료, `돌파` 가능.
- `artifacts/expedition-transition-overlap-motion/report.json`
  - 접근 duration `1s`, 오버랩 중 `stageTransition=moving`, `encounterIntro=approaching` 확인.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:verify`: 통과. 최초 1회는 `react:save-smoke` 버튼 대기 타임아웃으로 중단됐으나, `react:save-smoke` 단독 재실행과 `react:verify` 재실행은 모두 통과했다.
- `git diff --check`: 통과. 줄바꿈 CRLF 경고만 출력되고 공백 오류는 없었다.

## 유지보수 기준
- 이동 총 시간을 바꿀 때는 4개 phase 상수 합과 `EXPEDITION_STAGE_TRANSITION_MS`가 같은지 확인한다.
- 접근 타이밍을 바꿀 때는 `EXPEDITION_ENCOUNTER_APPROACH_DELAY_MS + EXPEDITION_ENCOUNTER_APPROACH_MS`가 이동 총 시간 안에 들어와야 한다.
- 다음 Stage 적은 오버랩 구간에서 최신 `gameState.expedition` 기준으로 렌더해야 한다. 표시 상태의 이전 Stage 데이터를 재사용하면 이동 후반에 잘못된 몬스터가 접근한다.
- 자동 전투는 `data-combat-ready="false"` 동안 계속 막혀야 하며, 이동 완료 뒤 한 전투씩만 재개되어야 한다.
