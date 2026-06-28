# 원정대 전투 시각 연출 상용화 구현

## 개요
- 최신 기준: `implementations/expedition-transition-overlap-motion/implementation.md`에서 Stage 이동 후 별도 조우 대기 시간을 제거하고, 이동 마지막 1초에 다음 Stage 몬스터 접근을 겹치게 했다.
- 원정대 배경이 Stage 클리어 때 왼쪽으로 이동하고, 이동 후에도 다음 Stage/챕터 offset에 머물도록 보강했다.
- 원정대 배경 PNG는 가로로 잡아당기거나 seam을 블러 처리하지 않고, 비율 유지 cover-crop과 normal/mirror 구간 합성으로 경계 번짐을 줄였다.
- 대미지/회복 플로트는 더미 preview가 아니라 실제 마지막 전투 리포트를 1회 재생하도록 바꿨다.
- 플로트에는 행동자와 대상, 대상 진영/슬롯, 대상 HP, 처치 여부를 담아 누가 누구에게 영향을 줬는지 알 수 있게 했다.
- 온라인 자동 전투는 전투 정리, Stage 이동, 몬스터 조우 접근이 끝나기 전까지 다음 전투를 시작하지 않게 했다.
- 전투 정리중 처치된 몬스터가 실제 처치 순서대로 완전히 디스폰된 뒤에만 Stage 이동을 시작하도록 수정했다.
- Stage 이동 중에는 이전 Stage 몬스터 그룹을 렌더하지 않아, 디스폰된 몬스터가 이동 중 다시 선명하게 보이는 문제가 구조적으로 생기지 않게 했다.

## 전투 이벤트 데이터
- `src/react/game/expedition.js`
  - `actionEvent()`가 `sequence`, `actorId`, `actorSide`, `actorSlot`, `actorRole`, `actorLabel`, `targetId`, `targetSide`, `targetSlot`, `targetRole`, `targetLabel`, `targetHpBefore`, `targetHpAfter`, `targetMaxHp`, `killed`를 기록한다.
  - 아군 combatant는 `side: "ally"`, 적 combatant는 `side: "enemy"`를 가진다.
  - 피해/회복 이벤트 생성 시 HP before/after를 함께 넘겨 UI와 smoke가 실제 결과를 검증할 수 있게 했다.
  - `validateCombatEvent()`는 새 필드를 선택값으로 검증해 기존 저장 데이터 호환을 유지한다.
  - `createExpeditionViewModel()`은 preview 전투 결과 HP와 이벤트를 화면 플로트로 쓰지 않는다. 대원/적 HP는 전투마다 풀 리셋되는 규칙에 맞춰 기본 표시에서는 최대 HP로 보여준다.

## 화면 연출
- `src/react/App.jsx`
  - `combatReplay` 상태를 추가해 새 `pendingReward.lastBattle.id`가 들어올 때만 플로트 타임라인을 1회 재생한다.
  - `battleReplay`와 압축 이벤트 시간축을 추가해 마지막 전투의 피해/회복 이벤트가 진행되는 순서대로 아군/적 HP bar를 갱신한다.
  - 컴포넌트 최초 마운트 시 이미 저장되어 있던 `lastBattle.id`는 `seenBattleIdRef`에 등록해 과거 전투가 자동 재생되지 않게 했다.
  - `expeditionCombatFloatEvents()`가 마지막 전투 이벤트를 화면용 플로트로 정규화한다.
  - 같은 대상이 `killed` 처리된 뒤에 이어지는 이벤트는 표시 목록에서 제외한다.
  - 플로트는 대상 진영/슬롯 기준 좌표에 표시한다. 적 피해는 적 위치, 아군 피격/회복은 아군 위치에 뜬다.
  - 플로트 문구는 `행동자 → 대상`, 수치, 대상 HP로 구성하고, `data-actor`, `data-target`, `data-target-side`, `data-target-slot`, `data-killed`를 남긴다.
  - HP bar는 전투 대기 상태에서는 매 전투 풀 HP 규칙에 맞춰 100%를 표시하고, 새 전투 리포트가 들어온 리플레이 구간에서만 이벤트별 `targetHpAfter/targetMaxHp`를 반영한다.
  - 플로트 좌표를 몬스터/원정대원 본체 위에서 위쪽으로 빼고, 전면 레이어가 아닌 본체 뒤 레이어로 배치해 스프라이트를 가리지 않게 했다.
  - Stage 배경 offset은 챕터 내부 Stage 기준으로 계산한다. 챕터가 바뀌면 새 챕터 PNG의 시작 구간에서 다시 출발한다.
  - 전투 정리 중 적 사망 표시는 전투 리포트의 `enemyDefeatOrder`를 사용해 개별 delay를 둔다.
  - 승리 전투에서 이동이 시작되면 이전 Stage 몬스터 그룹을 렌더하지 않고, 이동 완료 뒤 새 Stage 몬스터 그룹만 접근 연출로 표시한다.
  - `combatReady` 상태를 계산해 `전투 정리중`과 `이동중`, 이동 후반 조우 접근 오버랩 중에는 `data-combat-ready="false"`를 노출한다.
  - App의 온라인 자동 원정대 정산 interval은 화면의 `.expedition-scene[data-combat-ready]`를 기준으로 `전투 정리중`과 `이동중`, 이동 후반 조우 접근 오버랩 중에는 실행하지 않는다. React ref만 기준으로 삼으면 디버그 대원 추가처럼 원정대 화면이 뒤늦게 열리는 경로에서 ref와 실제 DOM 상태가 어긋나 자동 전투가 영구 대기할 수 있어, DOM의 표시 상태를 최종 게이트로 사용한다.
  - 온라인 자동 원정대 정산은 `resolveExpeditionAutoCombat(..., { rewardDelivery: "instant", maxBattles: 1 })`로 호출해, 조우 대기 중 누적 시간이 있어도 한 번에 1개 Stage만 처리한다.
  - 수동 `돌파`도 `combatReady`가 false이면 무시해, 몬스터를 만나 멈추기 전에는 전투가 시작되지 않는다.
  - 실패 전투에서도 `enemyHp` 기준으로 생존 몬스터 HP bar를 표시한다.
- `src/react/styles.css`
  - 플로트 레이어를 arena 위 절대 위치 레이어로 분리했다.
  - 플로트 animation은 `expeditionCombatFloat` 1회 재생이며 무한 반복하지 않는다.
  - 플로트 카드를 compact chip 크기로 줄이고 `z-index`를 몬스터/파티 본체보다 낮춰, 텍스트 정보가 전투 캐릭터를 덮지 않게 했다.
  - HP bar fill의 최소 2px 폭을 제거해 0% HP가 실제 빈 bar로 보이게 하고, 짧은 width transition으로 피해 반영이 읽히게 했다.
  - 원정대 몬스터 프레임은 `expeditionEnemyFrameA~D`로 분리해 한 순간에 4프레임 중 1프레임만 opacity 1이 되게 했다. 기존 `expeditionEnemySpriteIdle` 방식은 모든 프레임을 동시에 켜 몬스터가 흐리거나 가려진 것처럼 보였다.
  - 타격 파동 `expedition-impact`도 전투 리플레이가 있을 때만 렌더되고 1회 재생한다.
  - 적 피해, 아군 피격, 회복, 처치를 색상과 테두리로 구분했다.
  - Stage 이동 배경 animation은 4초 easing으로 왼쪽 이동을 유지한다.
  - 다음 Stage 몬스터 접근은 이동 마지막 1초에 `.expedition-enemy-group.approaching`으로 겹쳐 재생한다.
  - 전투 정리중의 처치 몬스터는 `expeditionEnemyDeath`로 완전히 디스폰된다. Stage 이동 중에는 이전 몬스터 그룹을 숨기는 안전 CSS도 둔다.

## 배경 루프
- `tools/build-visual-assets.mjs`
  - 생성형 PNG 원본 `assets/visual-source/expedition-backdrops/<theme>/source-00.png`를 읽어 챕터별 route tile을 생성한다.
  - `buildExpeditionBackdropAtlas()`가 챕터 10개 x tile 10개, 총 `visual-expedition-backdrop-{theme}-{00..09}.png` 100개를 만든다.
  - 각 tile은 챕터 내부 100 Stage 구간을 담당하므로 챕터 1개는 1000 Stage 길이의 탐험길을 가진다.
  - source를 강제 가로 리사이즈하지 않고 같은 crop의 normal/mirror/normal 구간을 비율 유지로 합성한다. 심을 블러로 뭉개는 함수는 제거했다.
- `src/snapshot/assets/visual-expedition-backdrop-*-*.png`
  - 챕터 1~10이 각각 10개 긴 배경 PNG tile을 사용한다.
  - 모든 tile은 `5016x540`이며 같은 도로 폭을 유지한다.
- `src/snapshot/assets/visual-expedition-backdrops.png`
  - 기존 토큰 호환을 위한 기본 배경으로 유지한다.
- `src/react/game/assets.js`
  - `getExpeditionBackdropUrl(backdropClass, tileIndex)`가 현재 Stage의 tile PNG를 반환한다.
- `src/react/App.jsx`
  - `expeditionStageBackdropTile()`로 100 Stage마다 tile index를 바꾸고, `expeditionStageBackdropOffset()`은 tile 내부 Stage 기준으로 이동 offset을 계산한다.
- `src/snapshot/manifest.json`
  - 원정대 배경 에셋의 bytes/hash를 갱신했다.

## 검증
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 클리어 직후 실제 전투 플로트가 렌더되는지 검사한다.
  - 전투 정리 리플레이 중 적 HP bar와 아군 HP bar가 실제 이벤트 결과로 100% 아래로 내려가는지 검사한다.
  - 몬스터마다 visible sprite frame이 정확히 1개인지 검사한다.
  - 전투 플로트가 몬스터 스프라이트 전면을 가리지 않는지 검사한다.
  - 플로트에 actor/target/target-side/killed metadata가 있는지 검사한다.
  - 플로트 animation이 무한 반복이 아닌지 검사한다.
  - Stage 1 -> 2 배경 이동 offset이 `0 -> -300`인지 검사한다.
  - 현재 Stage 적의 개별 처치 order/delay를 검사한다.
  - 이동 초반에는 조우 접근이 없고, 이동 후반에는 1초 접근 상태가 Stage 이동과 동시에 생기는지 검사한다.
  - `data-combat-ready`가 전투 정리중과 이동/접근 오버랩 중에는 false이고 이동 완료 뒤 true로 돌아오는지 검사한다.
  - 자동 전투 페이지를 별도로 열어 정리/이동/조우 중에는 Stage와 전투 리포트가 추가 진행되지 않고, 조우 후에만 다음 자동 전투가 재개되는지 검사한다.
  - 조우 후 재개된 자동 전투가 누적 시간 때문에 여러 Stage를 한 번에 처리하지 않는지 검사한다.
  - 디버그 메뉴의 `대원 후보 +5`로 파티를 만든 뒤 원정대 화면을 열었을 때 라이브 자동 전투가 Stage 1, Stage 2를 실제로 진행하는지 검사한다.
  - 전투 정리중 처치 몬스터가 이동 시작 전에 opacity 0까지 디스폰되는지 검사한다.
  - Stage 이동 중 이전 몬스터 DOM/프레임이 0개인지 검사한다.
  - 배경이 왼쪽으로 이동하고 전환 후 다음 offset에 머무르는 기존 검증을 유지한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - 보스 첫 클리어 처치 이벤트와 일반 실패 전투의 피해/회복 이벤트에 상세 필드가 있는지 검사한다.
  - 회복 이벤트가 아군에서 아군으로 향하고, 피해 이벤트가 HP를 실제로 낮추는지 검사한다.

## 검증 결과
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.
- `react:verify` 중 Vite 큰 chunk 경고는 기존 경고 성격이며 빌드는 성공했다.

## 남은 작업
- 실제 기기에서 4초 Stage 이동 시간, 마지막 1초 조우 접근, 플로트 체류 시간이 답답하거나 빠르게 느껴지는지 플레이 감각 조정이 필요하다.
- 보스 실패 롤백은 아직 전진 연출과 다른 후퇴/좌절 연출을 갖지 않는다.
- 오프라인 대량 정산은 누적 진행을 한 번에 요약하며, 여러 Stage 이동을 순차 리플레이하지 않는다.
