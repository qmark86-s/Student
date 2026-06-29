# 원정대 Stage 전환 연출 구현

## 개요
- 최신 기준: `implementations/expedition-transition-overlap-motion/implementation.md`, `implementations/expedition-backdrop-linear-motion/implementation.md`, `plans/expedition-backdrop-commercial-qa/plan.md`에서 Stage 이동 후반 1초와 몬스터 접근을 겹치고, 배경은 4초 동안 linear로 이동하며 Stage당 `80px`, route tile `25 Stage` 주기로 갱신했다. 아래 문서의 “이동 완료 후 2.95초 조우” 및 `300px/100 Stage` 설명은 당시 구현 기록이다.
- 원정대 Stage 승리 직후 화면의 현재 몬스터가 먼저 사망 연출을 보여준 뒤 다음 Stage 화면으로 넘어가도록 표시 계층을 분리했다.
- 현재 Stage의 모든 몬스터 처치/디스폰 연출이 끝난 뒤에만 Stage 이동을 시작한다.
- Stage 이동 중에는 이전 Stage 몬스터 그룹을 렌더하지 않는다.
- Stage 전환 중 원정대원이 이동하는 느낌을 주기 위해 arena 배경 이동과 파티 전진 모션을 추가했다.
- 현재 전환 시간은 `EXPEDITION_STAGE_TRANSITION_MS = 4000`으로 고정했다.
- Stage 전환 배경은 왼쪽으로 이동하며, 전환 후 다음 Stage와 챕터의 배경 offset에 그대로 머문다.
- 다음 Stage 몬스터는 이동 후반 1초에 `encounterIntro` 상태로 접근한다. 이 오버랩 구간에서도 파티 이동 모션은 `running`을 유지한다.

## 구현 구조
- `src/react/App.jsx`
  - `ExpeditionScene`에서 실제 저장 상태와 화면 표시 상태를 분리했다.
  - `gameState.expedition.currentStage`가 증가하면 이전 `gameState`를 `displayGameState`로 유지하고, `pendingReward.lastBattle`의 처치/디스폰 결과가 모두 재생된 뒤 `stageTransition`을 시작한다.
  - `transitionStartTimerRef`를 추가해 처치 리플레이 hold와 실제 Stage 이동을 분리했다.
  - 전환 중 `stageTransition` 상태를 켜고, 완료 타이머가 끝나면 최신 `gameState`를 화면에 반영한다.
  - 이동 시작 3초 뒤 `encounterIntro` 상태를 켜 새 Stage 몬스터 접근을 이동 마지막 1초에 겹쳐 재생한다.
  - 전환 중 section에 `data-stage-transition="moving"`, `data-transition-from-stage`, `data-transition-to-stage`를 기록한다.
  - 조우 중 section에 `data-encounter-intro="approaching"`를 기록한다.
  - 전투 정리, 이동, 조우 중 section에 `data-combat-ready="false"`를 기록해 온라인 자동 전투와 수동 `돌파`가 연출을 앞지르지 않게 한다.
  - `EXPEDITION_STAGE_BACKDROP_STEP_PX = 300` 기준으로 챕터 내부 Stage별 배경 offset을 계산한다.
  - 챕터가 바뀌면 이전 챕터의 global offset을 이어 쓰지 않고, 새 챕터 PNG의 시작 구간에서 다시 진행한다.
  - 전환 중 arena에 `--expedition-bg-from-x`, `--expedition-bg-to-x`, `--expedition-bg-x`를 전달한다.
  - 전투 정리 중 현재 Stage의 몬스터에는 전투 리포트의 `enemyDefeatOrder` 기준으로 개별 `defeated` class와 `--enemy-defeat-delay`를 붙인다.
  - Stage 이동 초반에는 이전 Stage 몬스터 그룹을 렌더하지 않고, 이동 후반 접근 구간에는 다음 Stage 몬스터 그룹을 표시한다.
  - 실패 전투에서도 `enemyHp`와 `enemyDefeatOrder`를 반영해 부분 처치 후 생존 몬스터를 표시한다.
  - 파티 visual은 `data-party-motion="combat|running|standing"`을 가진다. 전투/정리/일반 대기 중에는 combat, `stageTransition` 중과 이동 후반 조우 접근 중에는 running, 미편성 상태에는 standing으로 둔다.
  - 전환/정리 중 `돌파` 버튼은 disabled 처리하고 텍스트를 `이동중`, `정리중`으로 바꿔 중복 입력을 막는다.
- `src/react/styles.css`
  - 원정대 배경 PNG를 arena 본체 background에서 `::before` 파노라마 레이어로 분리했다.
  - `::before`는 React가 주입한 `--expedition-bg-image`를 우선 사용하고, `.expedition-scene.backdrop-*` class는 챕터별 호환용 fallback PNG를 제공한다.
  - `.expedition-scene.stage-transitioning .expedition-arena::before`에 4초 `expeditionStageTravel` 배경 이동 애니메이션을 적용했다.
  - `expeditionStageTravel`은 `from` offset에서 더 작은 `to` offset으로 이동해 화면상 배경이 왼쪽으로 흐르게 한다.
  - `.expedition-party-visual.running`의 컨테이너 왕복 이동은 제거하고, 개별 프레임 걷기와 작은 수직 리듬만 유지한다.
  - 파티 걷기 frame은 `.expedition-party-visual.running`과 `.expedition-party-visual.combat`에서 재생된다. spark는 이동감이 필요한 running에서만 재생된다.
  - 별도 idle 스프라이트는 확인되지 않아 전투 중에는 정지 대신 기존 걷기 프레임을 제자리 루프로 사용한다.
  - `.expedition-enemy-visual.defeated`는 사망, 프레임 플래시, 그림자 fade 연출을 사용하며 개별 delay를 가진다.
  - `.expedition-enemy-group.approaching`은 이동 마지막 1초에 오른쪽에서 들어오는 느낌을 준다.

## 챕터 배경 바인딩
- 챕터 데이터는 `data/expedition_chapters.json`의 `backdropClass`로 의미상 배경 테마를 지정한다.
- `src/react/game/expedition.js`의 `createStageView()`가 현재 Stage의 chapter를 찾아 `stage.backdropClass`에 복사한다.
- `src/react/App.jsx`는 section에 `chapter-{n}`과 `backdrop-{backdropClass}` class를 붙이고, `expeditionStageBackdropOffset(stage, chapter)`로 챕터 내부 Stage offset을 계산한다.
- 실제 PNG 바인딩은 `src/react/styles.css`의 `.expedition-scene.backdrop-* .expedition-arena::before`가 챕터별 파일을 직접 바라본다.
- 실제 PNG 바인딩은 `src/react/game/assets.js`의 `getExpeditionBackdropUrl(backdropClass, tileIndex)`가 `visual-expedition-backdrop-{theme}-{00..09}.png`를 반환하고, `ExpeditionScene`이 `--expedition-bg-image`에 주입한다.
- 현재 offset 정책은 Stage당 `300px`이며, 100 Stage마다 다음 route tile로 넘어가고 offset은 해당 tile 내부 Stage 기준으로 리셋된다.
- 현재 챕터 목록: 1 `shelter`, 2 `studio`, 3 `neighborhood`, 4 `company`, 5 `office`, 6 `asset`, 7 `national`, 8 `global`, 9 `future`, 10 `summit`.

## 배경 PNG 루프 검토
- `src/snapshot/assets/visual-expedition-backdrop-*-*.png`는 챕터별 route tile 100개이며 모두 `5016x540` 크기의 긴 가로 파노라마다.
- 기존 호환용 `src/snapshot/assets/visual-expedition-backdrops.png`도 `5016x540` 크기로 유지하며, 챕터 1 shelter tile 00과 같은 기본 배경 역할을 한다.
- 각 챕터 배경은 같은 도로 폭과 바닥 구도를 유지하므로 Stage 전환 시 파티 발밑 위치가 흔들리지 않는다.
- `tools/build-visual-assets.mjs`의 `buildExpeditionBackdropAtlas()`는 생성형 source PNG를 runtime tile로 변환하고, `source-01.png`~`source-09.png`가 있으면 해당 tile의 독립 원본으로 사용한다.
- 현재 100개 route tile PNG와 호환용 PNG를 같은 방식으로 갱신한다.
- `src/snapshot/manifest.json`의 원정대 기본 배경 bytes/hash를 갱신했다.

## 전투/보상과의 관계
- 저장 데이터, 전투 결과, 보상 지급은 기존 즉시 처리 방식을 유지한다.
- 화면만 이전 Stage를 4초간 보여주는 presentation hold 구조다.
- 따라서 수동 `돌파`와 온라인 자동 전투 보상은 전투가 시작된 시점에는 지연 없이 지급되지만, 다음 전투 시작 자체는 전투 정리/이동/조우 연출이 끝날 때까지 대기한다.
- 온라인 자동 전투는 연출 대기 중 누적된 시간이 있더라도 한 번에 1전투만 처리해 Stage를 건너뛰지 않는다.
- 오프라인 대량 정산은 많은 Stage 이동을 1개씩 재생하지 않고, 실제 화면에서 관측되는 Stage 증가에 대해서만 전환 연출을 보여준다.

## 검증 갱신
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 클리어 직후 `data-combat-replay="win"`이고 `data-stage-transition="idle"`인 전투 정리 구간을 먼저 확인한다.
  - 전투 정리 구간에서 처치 몬스터, 처치 order/delay, actor/target metadata가 있는 전투 플로트를 확인한다.
  - 모든 처치/디스폰 연출 이후 `data-stage-transition="moving"`을 확인한다.
  - 이동 중 이전 Stage 몬스터 DOM/프레임이 0개인지 확인한다.
  - `1 -> 2` 전환 metadata를 확인한다.
  - 전환 중 배경 offset이 `from > to`인지 확인해 왼쪽 이동 방향을 검사한다.
  - 전환 완료 후 배경 offset이 다음 Stage 값에 머무르는지 확인한다.
  - Stage 1 -> 2 전환 offset이 `0 -> -80`인지 확인한다.
  - 이동 중에는 전투 플로트가 남아 있지 않은지 확인한다.
  - 최신 smoke는 이동 초반에는 다음 몬스터 접근이 없고, 이동 후반에는 `data-stage-transition="moving"`과 `data-encounter-intro="approaching"`이 동시에 켜지며 1초 접근 duration을 갖는지 확인한다.
  - 파티가 전투 정리/대기 중에는 combat, 이동 중과 이동 후반 조우 접근 중에는 running인지 확인한다.
  - `data-combat-ready`가 전투 정리/이동과 조우 오버랩 중 false이고, 이동이 끝나면 true로 돌아오는지 확인한다.
  - 자동 전투가 `data-combat-ready="false"` 동안 다음 Stage나 전투 리포트를 생성하지 않고, 이동 완료 후에도 1전투만 처리하는지 확인한다.
  - 전환 중 `돌파` 버튼이 disabled이고 텍스트가 `이동중`인지 확인한다.
  - 전환 완료 후 `data-stage-transition="idle"` 상태로 돌아오는지 확인한다.
- `tools/react-vite-responsive-audit.mjs`
  - 파티 visual의 `data-party-motion`을 읽어 `standing` 상태에서는 걷기 animation 정지를 정상 정책으로 인정한다.
  - `running` 또는 `combat` 상태일 때 원정대원 rhythm과 companion frame animation 다양성을 검사한다.
  - spark animation은 이동 중인 `running`에서만 검사한다.
- `tools/react-vite-save-smoke.mjs`
  - 전체 verify 중 debug battle 버튼이 DOM 교체 타이밍에 흔들리지 않도록 attached 대기와 force click으로 smoke 조작을 안정화했다.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run expedition:combat-verify`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:save-smoke`: 통과.
- `npm run react:verify`: 통과.

## 남은 작업
- 4초 전환 시간, 300px 이동 거리, 마지막 1초 조우 접근 속도는 실제 플레이 감각을 보고 추가 조정할 수 있다.
- 상단 상태 타일의 Stage 숫자는 저장 상태를 기준으로 즉시 갱신된다. arena 연출과 완전히 맞추려면 `ExpeditionScene`의 표시 상태를 상위 요약 UI까지 공유하는 별도 presentation state 정리가 필요하다.
- 보스 실패 롤백은 현재 승리 전환과 별도 UX로 표시하지 않는다. 필요하면 실패 후 후퇴 연출을 별도 차수로 추가한다.
- 오프라인/복귀 대량 정산은 모든 Stage 전환을 재생하지 않는다. 누적 진행 리플레이가 필요하면 별도 연출 정책이 필요하다.
