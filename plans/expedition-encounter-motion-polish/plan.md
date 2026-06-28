# 원정대 조우/이동/개별 처치 연출 개선 계획

## 목표
- Stage 이동 시간은 4초로 유지하고 Stage당 배경 이동 거리는 챕터별 배경 기준 `300px`로 확대해 이동 체감을 키운다.
- 원정대원이 이동 중 앞뒤로 과하게 흔들리지 않도록 파티 이동 모션을 절제한다.
- 다음 Stage 몬스터가 화면에 즉시 뿅 나타나는 대신, 이동 완료 후 오른쪽에서 다가오는 조우 연출을 추가한다.
- 현재 Stage 몬스터가 모두 처치되고 디스폰까지 끝난 뒤에만 Stage 이동을 시작하고, 다음 Stage 몬스터가 조우하면 파티 이동 모션을 멈춘다.
- Stage 클리어 시 모든 몬스터가 동시에 죽는 표현을 제거하고, 실제 전투 리포트의 처치 이벤트 순서에 맞춰 개별 사망 연출을 적용한다.
- 같은 Stage 안에서도 모든 몬스터가 같은 종류처럼 보이는 문제를 완화한다.

## 원인 분석 기준
- 전투 엔진은 아군 탱커/딜러가 `firstAlive(enemies)`를 공격하므로 단일 대상 규칙을 이미 따른다.
- 화면에서는 Stage 전환 중 모든 `.expedition-enemy-visual`에 `defeated` class를 붙이고 HP를 0으로 내려 동시에 사망하는 것처럼 보인다.
- 화면 몬스터 프레임은 모든 적이 `stage.enemyAsset` 하나를 공유해 같은 종류처럼 보인다.
- 다음 Stage 반영은 4초 hold 뒤 `displayGameState`를 교체하고, 별도 `encounterIntro` 상태로 새 몬스터 접근을 재생한다.

## 구현 방향
- `EXPEDITION_STAGE_TRANSITION_MS`는 4000ms, `EXPEDITION_STAGE_BACKDROP_STEP_PX`는 88로 둔다.
- Stage 전환 중 파티 컨테이너의 왕복 translate를 없애고, 개별 대원 리듬 이동폭을 줄인다.
- 전투 정리 중에는 파티 motion을 `combat`으로 유지해 기존 이동 프레임을 제자리 걷기로 재생하고, 모든 몬스터 사망 연출이 끝난 뒤 Stage 전환 중에만 `running`으로 바꾼다.
- `ExpeditionScene`에서 실제 전투 리포트의 `killed` 이벤트를 기반으로 처치된 적 id와 순서를 계산한다.
- 전투 정리 중 현재 Stage 적에게만 개별 `defeated` class를 붙이고 `--enemy-defeat-delay`를 부여한다.
- Stage 이동 중에는 이전 Stage 적을 렌더하지 않아, 디스폰된 몬스터가 이동 중 다시 보이지 않게 한다.
- Stage 전환이 끝난 뒤 `.expedition-enemy-group.approaching`으로 오른쪽에서 접근시키며, 학생 탭 `encounterPackApproach`와 유사한 조우감을 만든다. 조우 중 파티 motion은 `standing`으로 둔 뒤 전투/대기 `combat`으로 돌아간다.
- 적 프레임은 각 enemy slot이 stage asset만 고정 사용하지 않고, 같은 챕터/구간에서 사용할 수 있는 이웃 variant asset을 슬롯별로 분산한다.

## 검증
- `react:expedition-smoke`
  - Stage 1 -> 2 이동 배경 offset이 0 -> -300인지 검사한다.
  - Stage 클리어 직후 전투 정리 상태에서 처치 플로트와 처치 순서가 먼저 보이는지 검사한다.
  - 모든 몬스터 사망/디스폰 연출 후에만 이동이 시작되는지 검사한다.
  - 이동 중 이전 Stage 적 DOM/프레임이 0개인지 검사한다.
  - 이동 중에는 조우가 시작되지 않고, 이동 완료 후 current enemy group이 `approaching` 상태인지 검사한다.
  - 몬스터 접근 animation duration이 2.95초인지 검사한다.
  - 전환 중 처치된 적 수가 전체 적 수와 같아도 각 적의 defeat delay가 서로 다른지 검사한다.
  - 파티 motion이 전투 정리/대기 중 combat, 이동 중 running, 조우 중 standing인지 검사한다.
  - 전환 후 새 Stage 몬스터가 표시되고 배경 offset이 유지되는지 검사한다.
- `react:expedition-rules-smoke`
  - 전투 이벤트의 단일 타겟/처치 이벤트 검증을 유지한다.
- 최종 전수검사는 `npm run react:verify`, `git diff --check`로 수행한다.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.

## 문서
- 구현 후 `/implementations/expedition-encounter-motion-polish/implementation.md`를 작성한다.
- 기존 원정대 전투/Stage 전환 구현 문서의 이동 거리와 개별 처치 표시 정책을 갱신한다.
