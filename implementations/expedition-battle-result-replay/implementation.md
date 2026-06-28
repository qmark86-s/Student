# 원정대 개별 전투 결과 리플레이 구현

## 개요
- 원정대 몬스터 표시를 Stage 전환 부속 효과가 아니라 마지막 전투 리포트 기반 리플레이로 분리했다.
- 전투 실패 시에도 `enemyHp`, `partyHp`, `enemyDefeatOrder`, 이벤트별 HP 변화를 화면에 반영해 일부 몬스터만 처치되고 나머지가 생존한 실패 상태를 표현한다.
- Stage 승리 시 현재 Stage 몬스터가 모두 처치되고 디스폰까지 끝난 뒤에만 4초 이동을 시작한다.
- 새 Stage 몬스터 접근은 이동 종료 후 2.95초 동안 재생하며, 조우가 시작되면 파티 이동 모션은 잠깐 `standing`으로 멈춘다. 조우 후 전투/대기 상태에서는 `combat` 제자리 걷기로 돌아간다.

## 원인
- 전투 엔진은 이미 단일 대상 규칙이었다.
  - 아군 탱커/딜러는 `firstAlive(enemies)` 한 명만 공격한다.
  - 적은 `firstAlive(party)` 한 명만 공격한다.
- 문제는 UI 표시 계층이었다.
  - 기존 화면은 승리로 Stage 전환이 발생할 때만 적 사망 상태를 보여줬다.
  - 실패 전투는 Stage가 그대로라 마지막 전투의 부분 처치와 아군 피해 결과가 화면에 남지 않았다.
  - 적 사망 delay가 180ms라 여러 마리가 거의 동시에 despawn되는 것처럼 보였다.
  - HP bar는 기본 대기 상태와 전투 리플레이 상태를 구분하지 못해, 실제 전투 피해가 있어도 화면에서는 거의 항상 가득 찬 것처럼 보였다.

## 구현
- `src/react/App.jsx`
  - `battleReplay` 상태를 추가했다. 새 `pendingReward.lastBattle.id`가 들어오면 승패와 무관하게 리포트를 일정 시간 보관한다.
  - `expeditionReplayHpMaps()`를 추가해 리포트 이벤트 시간축을 짧게 압축 재생하고, 아군/적 HP bar를 실제 `targetHpAfter/targetMaxHp` 순서대로 갱신한다.
  - `expeditionEnemyHpMap()`은 리플레이가 끝난 뒤 실패 결과의 적별 남은 HP를 표시하는 보조 경로로 유지한다.
  - `expeditionEnemyDefeatMap()`은 더 이상 승리 리포트만 받지 않는다. 실패 리포트에서도 처치된 적만 `defeated` 처리한다.
  - 적 사망 delay는 단순 순번이 아니라 리포트의 이벤트 시각과 처치 순서를 함께 사용해, 실제 전투 진행에 맞춰 개별 사망한다.
  - `EXPEDITION_ENEMY_DEFEAT_STAGGER_MS`를 650ms로 늘려 처치 순서가 눈에 보이도록 했다.
  - `EXPEDITION_STAGE_TRANSITION_MS`를 4000ms로 늘렸다.
  - 처치된 몬스터 수와 사망 delay를 기준으로 이동 시작을 지연해, 몬스터가 전부 사라지기 전에 이동하지 않게 했다.
  - Stage 이동 중에는 이전 Stage 몬스터 그룹을 렌더하지 않고, 이동 완료 후 새 Stage 몬스터 그룹만 조우 연출로 표시한다.
  - `encounterIntro` 상태를 추가해 이동 완료 후 새 Stage 적 그룹에 접근 animation을 적용한다.
  - 파티 motion을 `combat|running|standing`으로 분리했다. Stage 이동 중에만 running을 적용하고, 전투/정리/대기 중에는 combat, 조우 진입 중에는 standing을 적용한다.
  - 이동/정리/조우 중에는 `돌파` 버튼을 비활성화하고 각각 `이동중`, `정리중`, `조우중`으로 표시한다.
- `src/react/styles.css`
  - Stage 배경 이동 animation을 4초로 늘렸다.
  - `.expedition-next-enemy-group` 기반 선행 조우 레이어를 제거하고, `.expedition-enemy-group.approaching`이 이동 완료 후 오른쪽에서 접근하게 했다.
  - `combat-replaying` 상태에서도 적 사망 frame/shadow animation이 작동하도록 selector를 확장했다.
  - 몬스터 접근 animation duration은 2.95초로 설정해 기존 속도의 2/5가 되게 했다.

## 검증 갱신
- `tools/react-vite-expedition-rules-smoke.mjs`
  - `partial-enemy-defeat-can-still-fail` 케이스를 추가했다.
  - 새 공속 정책 기준 Stage 1, AI 연구원 1명, 스탯 4 조건에서 적 3마리 중 1마리 처치 후 2마리 생존 상태로 전멸 실패하는지 검사한다.
  - 전투 리포트와 화면 모두 적 3마리, defeated 1마리, 생존 HP bar 2개를 유지하는지 검사한다.
- `tools/react-vite-expedition-smoke.mjs`
  - `?qaTools=1&pauseAutoBattle=1`로 수동 전환 연출을 안정적으로 검사한다.
  - Stage 클리어 직후 `전투 정리중` 상태에서 처치 플로트, actor/target metadata, 처치 order/delay를 확인한다.
  - 전투 정리 리플레이 중 적 HP와 아군 HP가 모두 실제 이벤트에 따라 감소하는지 확인한다.
  - 모든 처치/디스폰 연출 후 이동이 시작되고, 이동 중에는 전투 플로트와 이전 Stage 몬스터가 남지 않는지 확인한다.
  - 전환 중에는 조우 접근이 시작되지 않고, 이동 완료 후 `data-encounter-intro="approaching"` 상태가 되는지 확인한다.
  - 조우 접근 duration이 약 2950ms인지 검사한다.
  - 이동 완료 후 배경 offset이 새 Stage 위치에 머무르는지 확인한다.
  - 파티가 전투 정리/대기 중에는 combat, 이동 중에는 running, 조우 중에는 standing인지 확인한다.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:expedition-smoke`: 통과.

## 유지보수 기준
- 전투 결과 화면은 `lastBattle.enemyHp`와 `lastBattle.enemyDefeatOrder`를 기준으로 해야 한다.
- 전투 리플레이 중 HP bar는 최종 스냅샷만 바로 표시하지 말고 이벤트 시간축을 따라 변경되어야 한다.
- 실패 전투에서도 처치된 적이 있을 수 있으므로, 사망 표시는 `result === "win"`에 묶지 않는다.
- 승리 전투에서도 Stage 이동은 처치 리플레이와 디스폰 완료 후 시작해야 한다.
- 이동 중에는 이전 Stage 몬스터와 다음 Stage 몬스터를 모두 렌더하지 않는다. 새 몬스터 접근은 이동 완료 후 `encounterIntro`에서만 재생한다.
- 파티 이동 모션은 `stageTransition` 상태에만 연결하고, 조우가 시작되면 즉시 standing으로 돌아가야 한다. 조우가 끝난 전투/대기 상태는 combat 제자리 걷기를 유지한다.
- 실행 중 자동 전투가 있는 smoke는 전환 타이밍 검증 시 `pauseAutoBattle=1`을 사용해 의도치 않은 추가 Stage 진행을 막는다.
