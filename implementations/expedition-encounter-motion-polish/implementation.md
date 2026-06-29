# 원정대 조우/이동/개별 처치 연출 개선 구현

## 개요
- 최신 기준: `implementations/expedition-transition-overlap-motion/implementation.md`와 `plans/expedition-backdrop-commercial-qa/plan.md`에서 몬스터 접근을 이동 마지막 1초에 겹치도록 유지하고, 배경 이동은 Stage당 `80px`, route tile `25 Stage` 주기로 갱신했다. 현재 파티는 오버랩 구간에도 `running`을 유지하고, 이동 종료 직후 `combat`으로 돌아간다.
- 아래의 `300px` 이동 거리 설명은 챕터별 배경 고도화 이전 감각 튜닝 기록이다.
- 원정대원 컨테이너의 앞뒤 왕복 이동을 제거하고, 걷는 프레임과 작은 수직 리듬만 유지했다.
- 현재 Stage 몬스터가 모두 처치되고 디스폰까지 끝난 뒤에만 Stage 이동을 시작한다.
- Stage 이동 중에는 이전 Stage 몬스터 그룹을 렌더하지 않아, 사라진 몬스터가 이동 중 다시 보이는 문제를 막았다.
- 다음 Stage 몬스터를 전환 종료 시점에 갑자기 교체하지 않고, 이동 후반 1초에 오른쪽에서 접근하는 조우 연출로 보여준다. 파티는 오버랩 구간에도 `running`을 유지하고, 이동 종료 뒤 전투/대기 `combat` 제자리 걷기로 돌아간다.
- 현재 Stage 몬스터는 전투 리포트의 처치 순서에 따라 개별 delay로 사망한다.
- 실패 전투에서도 리포트 기반으로 처치된 몬스터와 생존 몬스터 HP를 화면에 표시한다.
- 일반 Stage 안의 여러 몬스터가 모두 같은 sprite asset을 쓰던 표시를 슬롯별 이웃 variant asset으로 분산했다.

## 원인 분석
- 전투 엔진은 이미 단일 타겟 규칙이었다.
  - 아군 탱커/딜러는 `firstAlive(enemies)`만 공격한다.
  - 적도 `firstAlive(party)`만 공격한다.
  - 한 번의 공격 이벤트가 여러 몬스터 HP를 동시에 줄이는 코드는 없었다.
- “몬스터가 다 같이 죽는” 원인은 UI였다.
  - 기존 `ExpeditionScene`은 Stage 전환 중 모든 `.expedition-enemy-visual`에 `defeated` class를 일괄 부여했다.
  - HP bar도 `isStageTransitioning ? 0 : ...`로 모든 적을 동시에 0%로 만들었다.
  - 실패 전투는 Stage 전환이 없어 전투 리포트의 부분 처치 결과가 화면에 남지 않았다.
- “몬스터가 같은 종류만 나오는” 원인도 UI였다.
  - Stage 데이터에는 `enemyAsset` 하나만 있고, 화면은 모든 enemy slot에 같은 `getExpeditionEnemyFrameUrls(stage.enemyAsset)`를 사용했다.
  - 전투 데이터의 개별 적 이름/스탯은 달랐지만, 화면 sprite는 동일했다.

## 구현 구조
- `src/react/game/expedition.js`
  - `buildBattleReport()`가 `enemyDefeatOrder`를 저장한다.
  - `enemyDefeatOrder`는 `killed && targetSide === "enemy"` 이벤트의 id, name, slot, sequence, time을 보관한다.
  - `normalizeBattleReport()`는 과거 저장 호환을 위해 누락된 `enemyDefeatOrder`를 빈 배열로 정규화한다.
  - `validateBattleReport()`는 `enemyDefeatOrder` 구조를 검증한다.
- `src/react/App.jsx`
  - `EXPEDITION_STAGE_BACKDROP_STEP_PX = 300`으로 조정했다.
  - `EXPEDITION_STAGE_TRANSITION_MS = 4000`으로 조정했다.
  - `battleReplay`가 `lastBattle.enemyHp`와 `lastBattle.enemyDefeatOrder`를 승패와 무관하게 화면에 반영한다.
  - 승리 리플레이의 처치 수와 사망 delay를 기준으로 이동 시작을 지연해, 현재 Stage 몬스터가 모두 처치되고 디스폰되기 전에는 이동하지 않는다.
  - Stage 이동 초반에는 이전 Stage 적 그룹을 렌더하지 않고, 이동 후반에는 새 Stage 적 그룹만 `.expedition-enemy-group.approaching`으로 표시한다.
  - `expeditionEnemyAssetForSlot()`이 `*-mob-1/2/3` asset을 enemy slot별로 순환해 같은 Stage 안의 시각 다양성을 만든다.
  - `expeditionEnemyDefeatMap()`이 `lastBattle.enemyDefeatOrder`와 최종 enemy HP를 기반으로 사망 order/delay map을 만든다.
  - 현재 Stage 적은 `data-defeat-order`, `data-defeat-delay`, `--enemy-defeat-delay`를 가진다.
  - 파티 visual은 Stage 이동과 이동 후반 조우 접근 중에는 `running`, 전투 정리/대기 중에는 `combat`이 된다.
  - 이동 후반에 현재 Stage 적 그룹은 `.expedition-enemy-group.approaching`으로 오른쪽에서 접근한다.
- `src/react/styles.css`
  - 파티 컨테이너의 `expeditionPartyAdvance`, `expeditionPartyStageRun` 사용을 제거했다.
  - `expeditionUnitRhythm`은 x축 흔들림 없이 작은 y축 리듬만 준다.
  - 걷기 frame은 `.expedition-party-visual.running`과 `.expedition-party-visual.combat` 상태에서 재생된다. spark는 이동 중인 `running`에서만 재생된다.
  - 별도 idle 스프라이트가 확인되지 않아 전투 중 멈춤 대신 기존 이동 프레임을 제자리 보행처럼 사용한다.
  - `expeditionEnemyEncounterApproach`를 추가해 새 몬스터가 이동 마지막 1초에 오른쪽에서 접근한다.
  - 접근 animation duration은 1초로 둬 이동 마지막 1초 안에서 조우가 끝나게 했다.
  - 적 사망 frame/shadow animation에 `--enemy-defeat-delay`를 적용한다.
  - Stage 이동 중 이전 적 그룹을 숨기는 안전 스타일을 둔다.

## 검증
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 1 -> 2 배경 offset이 `0 -> -80`인지 검사한다.
  - 전환 후 Stage 2 offset이 `-80`에 유지되는지 검사한다.
  - 현재 Stage 적 asset 종류가 복수인지 검사한다.
  - 전투 정리 구간에서 처치된 적 모두가 `data-defeat-order`를 갖고, 복수 적이면 delay가 분산되는지 검사한다.
  - 전투 정리 구간의 처치 적이 이동 전에 opacity 0까지 디스폰되는지 검사한다.
  - Stage 이동 중 이전 적 DOM/프레임이 0개인지 검사한다.
  - 전투 정리 구간의 대미지/처치 플로트가 actor/target metadata를 갖고, 이동 중에는 플로트가 남지 않는지 검사한다.
  - 최신 smoke는 이동 초반에는 접근 그룹이 없고, 이동 후반에는 현재 몬스터 그룹이 1초 접근 animation을 갖는지 검사한다.
  - 파티가 전투 정리/대기 중 combat, 이동 중과 이동 후반 조우 접근 중 running인지 검사한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - 전투 리포트에 `enemyDefeatOrder`가 있고, 처치 이벤트 target과 순서 정보가 일치하는지 검사한다.
  - 새 공속 정책 기준 부분 처치 실패 케이스에서 3마리 중 1마리만 처치되고 2마리가 생존하며, 화면도 같은 상태를 보여주는지 검사한다.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.
- `react:verify` 중 Vite 큰 chunk 경고는 기존 경고 성격이며 빌드는 성공했다.

## 남은 작업
- 실제 기기에서 4초 이동, 300px 이동 거리, 마지막 1초 몬스터 접근이 충분히 자연스러운지 감각 튜닝이 필요하다.
- 보스 실패 롤백은 아직 후퇴/재정비 조우 연출을 갖지 않는다.
- 장기적으로는 Stage 데이터에 enemy별 sprite asset을 명시하면 UI 순환 규칙 없이 더 기획 친화적으로 관리할 수 있다.
