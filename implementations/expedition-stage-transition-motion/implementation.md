# 원정대 Stage 전환 연출 구현

## 개요
- 원정대 Stage 승리 직후 화면의 현재 몬스터가 먼저 사망 연출을 보여준 뒤 다음 Stage 화면으로 넘어가도록 표시 계층을 분리했다.
- Stage 전환 중 원정대원이 이동하는 느낌을 주기 위해 arena 배경 이동과 파티 전진 모션을 추가했다.
- 1차 전환 시간은 `EXPEDITION_STAGE_TRANSITION_MS = 2000`으로 고정했다.
- Stage 전환 배경은 왼쪽으로 이동하며, 전환 후 다음 Stage의 배경 offset에 그대로 머문다.

## 구현 구조
- `src/react/App.jsx`
  - `ExpeditionScene`에서 실제 저장 상태와 화면 표시 상태를 분리했다.
  - `gameState.expedition.currentStage`가 증가하면 이전 `gameState`를 `displayGameState`로 2초간 유지한다.
  - 전환 중 `stageTransition` 상태를 켜고, 완료 타이머가 끝나면 최신 `gameState`를 화면에 반영한다.
  - 전환 중 section에 `data-stage-transition="moving"`, `data-transition-from-stage`, `data-transition-to-stage`를 기록한다.
  - `EXPEDITION_STAGE_BACKDROP_STEP_PX = 180` 기준으로 Stage별 배경 offset을 계산한다.
  - 전환 중 arena에 `--expedition-bg-from-x`, `--expedition-bg-to-x`, `--expedition-bg-x`를 전달한다.
  - 전환 중 현재 Stage의 몬스터에 `defeated` class를 붙이고 적 HP bar를 0%로 표시한다.
  - 전환 중 `돌파` 버튼은 disabled 처리하고 텍스트를 `이동중`으로 바꿔 중복 입력을 막는다.
- `src/react/styles.css`
  - 원정대 배경 PNG를 arena 본체 background에서 `::before` 파노라마 레이어로 분리했다.
  - `::before`는 `visual-expedition-backdrops.png`를 `repeat-x`, `background-size: auto 100%`로 사용한다.
  - `.expedition-scene.stage-transitioning .expedition-arena::before`에 `expeditionStageTravel` 배경 이동 애니메이션을 적용했다.
  - `expeditionStageTravel`은 `from` offset에서 더 작은 `to` offset으로 이동해 화면상 배경이 왼쪽으로 흐르게 한다.
  - `.expedition-party-visual.running`은 전환 중 더 강한 전진 모션을 사용한다.
  - `.expedition-enemy-visual.defeated`는 사망, 프레임 플래시, 그림자 fade 연출을 사용한다.

## 배경 PNG 루프 검토
- `src/snapshot/assets/visual-expedition-backdrops.png`는 `5016x540` 크기의 긴 가로 파노라마다.
- 기존 생성 문서 기준 3구간 파노라마로 만들어진 원정대 배경이며, 짧은 Stage 이동에는 `repeat-x`로 사용할 수 있다.
- 좌우 끝은 건물/야간 하늘 톤이 비슷하지만 완전 무봉합은 아니다. 샘플 edge diff가 약 29 수준이라 짧은 이동에서는 무난하지만, 장시간 무한 pan 품질을 더 올리려면 seam 재블렌딩 후속 작업이 좋다.

## 전투/보상과의 관계
- 저장 데이터, 전투 결과, 보상 지급은 기존 즉시 처리 방식을 유지한다.
- 화면만 이전 Stage를 2초간 보여주는 presentation hold 구조다.
- 따라서 수동 `돌파`와 온라인 자동 전투 보상은 지연 없이 지급되고, 오프라인 pending 보상 정책과도 충돌하지 않는다.
- 오프라인 대량 정산은 많은 Stage 이동을 1개씩 재생하지 않고, 실제 화면에서 관측되는 Stage 증가에 대해서만 전환 연출을 보여준다.

## 검증 갱신
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 클리어 직후 `data-stage-transition="moving"`을 확인한다.
  - `1 -> 2` 전환 metadata를 확인한다.
  - 전환 중 배경 offset이 `from > to`인지 확인해 왼쪽 이동 방향을 검사한다.
  - 전환 완료 후 배경 offset이 다음 Stage 값에 머무르는지 확인한다.
  - 사망 몬스터 class가 붙었는지 확인한다.
  - 전환 중 `돌파` 버튼이 disabled이고 텍스트가 `이동중`인지 확인한다.
  - 전환 완료 후 `data-stage-transition="idle"` 상태로 돌아오는지 확인한다.
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
- 2초 전환 시간과 배경 이동 easing은 실제 플레이 감각을 보고 조정할 수 있다.
- 보스 실패 롤백은 현재 승리 전환과 별도 UX로 표시하지 않는다. 필요하면 실패 후 후퇴 연출을 별도 차수로 추가한다.
- 오프라인/복귀 대량 정산은 모든 Stage 전환을 재생하지 않는다. 누적 진행 리플레이가 필요하면 별도 연출 정책이 필요하다.
- 원정대 배경 PNG는 짧은 Stage 이동 루프에는 충분하지만, 장시간 자동 pan용으로 쓰려면 좌우 seam을 더 정밀하게 블렌딩하는 후속 작업이 필요하다.
