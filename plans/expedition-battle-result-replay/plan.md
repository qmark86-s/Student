# 원정대 개별 전투 결과 리플레이 구현 계획

## 목표
- 원정대 몬스터를 Stage 전환 부속 연출이 아니라 전투 결과 리포트 기준의 개별 대상들로 표시한다.
- 3마리 중 일부만 처치하고 나머지가 남아 Stage 실패하는 상태를 화면과 검증에서 표현할 수 있게 한다.
- Stage 승리 시 현재 Stage 몬스터가 전부 처치되고 디스폰까지 끝난 뒤에만 이동을 시작한다.
- Stage 이동 시간은 2초에서 4초로 늘린다.
- 이동이 끝난 뒤 다음 Stage 몬스터가 등장하는 흐름을 유지하되, 몬스터 등장 속도는 기존의 2/5로 줄인다.
- 다음 Stage 몬스터가 등장하면 파티 이동 모션을 잠깐 `standing`으로 멈춰 조우 때문에 이동이 멈춘 느낌을 만들고, 전투/대기 상태에서는 `combat` 제자리 걷기로 돌아간다.

## 원인 분석
- 전투 엔진은 단일 대상 공격 규칙을 따른다. 아군 공격은 `firstAlive(enemies)`, 적 공격은 `firstAlive(party)` 대상 하나에만 적용된다.
- 문제는 UI가 마지막 전투 결과를 독립적으로 보관하지 않고, Stage 승리 전환 중에만 적 사망 상태를 압축해서 보여준 점이다.
- 실패 전투에서는 Stage가 그대로라 전환이 발생하지 않고, 마지막 전투의 부분 처치와 아군 피해 결과가 화면에 남지 않았다.

## 구현 방향
- `ExpeditionScene`에 `battleReplay` 상태를 추가한다.
  - 새 `lastBattle.id`가 들어오면 승리/실패와 무관하게 리포트 기반 리플레이를 시작한다.
  - 리포트의 이벤트 시간축과 `enemyHp`, `partyHp`, `enemyDefeatOrder`로 아군/적 HP와 적별 사망 상태를 표시한다.
  - 실패 리플레이는 Stage 이동 없이 남은 적 HP와 처치된 적을 일정 시간 보여준 뒤, 다음 전투 대기 상태에서는 전투마다 HP가 풀로 리셋되는 규칙에 맞춰 100% HP로 돌아간다.
  - 리플레이 중에는 이벤트 시간축을 압축 재생해 아군/적 HP bar가 실제 피해/회복 순서대로 변한다.
  - 승리 리플레이는 Stage 이동 전에 재생하며, 몬스터 사망은 리포트 순서와 개별 delay로 처리한다.
  - 모든 처치 사망/디스폰 animation이 끝난 뒤 `stageTransition`을 시작한다.
  - `stageTransition` 중에는 이전 Stage 몬스터를 렌더하지 않는다.
- Stage 이동 시간은 `EXPEDITION_STAGE_TRANSITION_MS = 4000`으로 변경한다.
- 다음 Stage 몬스터 접근은 이동 중이 아니라 이동이 끝난 뒤 `encounterIntro` 상태로 재생한다.
- 몬스터 등장 속도는 기존 1.18초 접근을 2.95초로 늘려 속도를 2/5로 낮춘다.
- 전투/보상 계산은 기존 즉시 처리 구조를 유지한다.

## 검증
- `react:expedition-smoke`
  - Stage 이동 metadata와 배경 offset 유지 검증을 유지한다.
  - Stage 클리어 직후에는 `전투 정리중` 상태에서 처치 플로트와 처치 순서를 먼저 검사한다.
  - 모든 몬스터 처치/디스폰 연출 후 이동이 시작되고, 이동 중에는 전투 플로트와 이전 Stage 몬스터가 남지 않는지 검사한다.
  - 이동 완료 후 다음 몬스터 접근 상태가 별도 렌더되는지 검사한다.
  - 접근 animation duration이 2.95초인지 검사한다.
  - 파티 motion이 정리/대기 중 combat, 이동 중 running, 조우 중 standing인지 검사한다.
- `react:expedition-rules-smoke`
  - 부분 처치 실패 시나리오를 추가한다.
  - 마지막 전투 리포트가 `loss` 또는 `timeout`, `enemyDefeatOrder.length > 0`, `enemyHp` 중 생존 적 존재를 만족하는지 검사한다.
  - 화면에서도 새 공속 정책 기준 적 3마리 중 1마리만 `defeated`이고, 생존 적 HP bar 2개가 남는지 검사한다.
  - 단일 대상 공격과 처치 순서 검증을 유지한다.
- 최종 전수검사는 `npm run react:verify`, `git diff --check`로 수행한다.

## 구현 결과
- `src/react/App.jsx`
  - `battleReplay`와 `encounterIntro` 표시 상태를 추가했다.
  - 전투 리포트의 이벤트 시간축과 `enemyHp`, `partyHp`, `enemyDefeatOrder`를 승패와 무관하게 화면에 반영한다.
  - 승리 시 모든 몬스터 처치 연출이 끝난 뒤 4초 Stage 이동을 시작하고, 이동 완료 후 2.95초 조우 접근 연출을 재생한다.
- `src/react/styles.css`
  - Stage 배경 이동 animation을 4초로 늘렸다.
  - 전환 중 다음 몬스터 레이어를 제거하고, 이동 완료 후 현재 적 그룹에 접근 animation을 적용한다.
  - 적 사망 delay를 650ms 단위로 넓혀 개별 처치 순서가 보이도록 했다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - `partial-enemy-defeat-can-still-fail` 케이스를 추가했다.
- `tools/react-vite-expedition-smoke.mjs`
  - 자동 전투를 QA 옵션으로 일시정지하고, 4초 이동과 2.95초 조우를 별도 상태로 검증한다.
  - 이동은 처치 리플레이가 끝난 뒤 시작되고, 파티는 정리/대기 중 combat, 이동 중 running, 조우 중 standing인지 검증한다.

## 현재 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:expedition-smoke`: 통과.

## 문서
- 구현 후 `/implementations/expedition-battle-result-replay/implementation.md`를 작성한다.
- 기존 원정대 역할 전투, Stage 전환, 조우 연출 문서를 새 리플레이 정책에 맞게 갱신한다.
