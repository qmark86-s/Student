# 원정대 파티 순서 동기화 및 드래그 교체 구현

## 개요
- 원정대 파티 순서는 기존 저장 배열 `save.expedition.partyMemberIds`가 계속 단일 기준이다.
- `src/react/game/expedition.js`에 `reorderExpeditionPartyMembers(state, fromSlotIndex, toSlotIndex)`를 추가했다.
- 파티 탭의 슬롯 순서와 상단 원정 전투장의 `unit-1`~`unit-5` 캐릭터 배치가 같은 배열 순서를 사용한다.

## 주요 코드
- `src/react/game/expedition.js`
  - `reorderExpeditionPartyMembers`는 filled 슬롯끼리는 서로 교체하고, 빈 슬롯으로 드롭하면 현재 파티의 마지막 실사용 슬롯으로 이동한다.
  - 변경 후 `validateExpeditionState`를 통과해야 하며, 별도 저장 schema 변경은 없다.
- `src/react/App.jsx`
  - `ExpeditionScene`의 캐릭터 루트에 `data-member-id`, `data-party-slot`을 붙여 UI와 smoke 검증이 같은 슬롯 기준을 볼 수 있게 했다.
  - `ExpeditionPartyPanel`은 HTML drag/drop과 touch/pen pointer drag를 모두 처리한다.
  - 슬롯에는 `앞/중/뒤`의 짧은 위치 라벨을 표시한다. 1번 슬롯은 전방 기준이다.
  - `ExpeditionScene`은 스테이지 전환용 `displayGameState`와 별개로 최신 `gameState`의 파티 view model을 사용한다. 그래서 stage 전환/전투 정리 중에도 파티 순서 교체는 탭 전환 없이 즉시 반영된다.
  - 같은 대원 구성에서 순서만 바뀐 경우 `data-party-reorder="active"`를 0.5초 유지한다. 투입/제거는 reorder 연출 없이 즉시 반영한다.
- `src/react/styles.css`
  - `.expedition-party-slot.draggable`, `.dragging`, `.drop-target` 상태를 추가했다.
  - `.expedition-party-slot.reorder-loading`은 source/target 슬롯에 0.5초 진행 bar를 표시한다.
  - `.expedition-unit-avatar.large`는 `left/top/transform` transition으로 전투장 위치 교체를 부드럽게 보여준다.
  - 기존 5칸 `3+2` grid와 슬롯 높이는 유지했다.
- `tools/react-vite-expedition-smoke.mjs`
  - 5인 파티의 1번/5번 슬롯을 drag/drop으로 교체한다.
  - 저장 배열, 파티 슬롯 DOM 순서, 상단 전투장 캐릭터 슬롯 순서가 같은지 검사한다.
  - 교체 직후 슬롯 loading 상태와 전투장 active reorder 상태가 나타난 뒤 0.5초 이후 해제되는지 검사한다.

## UX 기준
- 유저는 파티 탭에서 슬롯 카드를 드래그해 서로 교체한다.
- `추천 편성`, 파견 제외, 파티 해제, 성장/합성 규칙은 기존 동작을 유지한다.
- 잠금 상태는 순서 변경을 막지 않는다.

## 검증
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run react:verify`
- `npm run verify:mobile`
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict

2026-07-01 기준 위 검증은 모두 통과했다. `verify:mobile` 실행 중 Vite의 청크 크기 경고가 출력되지만 실패 조건은 아니다.
