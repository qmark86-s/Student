# 원정대 파티 순서 동기화 및 드래그 교체 구현 계획

## 목표
- 원정대 파티 탭의 5개 슬롯 순서를 상단 원정 전투 화면 캐릭터 배치 순서와 동일한 기준으로 관리한다.
- 유저가 파티 슬롯을 드래그앤드롭으로 서로 교체하거나 빈 슬롯으로 이동해 원하는 전열/후열 배치를 만들 수 있게 한다.
- 기존 저장 구조인 `save.expedition.partyMemberIds` 배열 순서를 유지하면서 기능을 확장한다.
- 순서 교체 직후 탭을 나갔다 오지 않아도 전투 화면의 아군 배치가 즉시 갱신되게 한다.
- 순서 교체에 한해 파티 슬롯은 약 0.5초 진행 표시를 띄우고, 전투 화면 캐릭터는 서로 위치를 바꾸는 이동 연출로 갱신한다.

## 변경 범위
- `src/react/game/expedition.js`
  - `reorderExpeditionPartyMembers(state, fromSlotIndex, toSlotIndex)` API를 추가한다.
  - 배열 순서 변경 후 기존 검증과 alias 처리를 통과하게 한다.
  - 빈 슬롯으로 이동하는 경우에는 해당 대원을 끝으로 이동하는 방식으로 저장 배열의 연속성을 유지한다.
- `src/react/App.jsx`
  - 파티 탭 슬롯에 드래그앤드롭 및 포인터 기반 교체 동작을 추가한다.
  - 데스크톱 HTML drag/drop과 모바일 pointer drag를 모두 지원한다.
  - 상단 전투 캐릭터에 테스트/동기화 확인용 `data-member-id`, `data-party-slot` 속성을 추가한다.
  - 파티 관리 패널에 `onReorder` 콜백을 연결한다.
  - `ExpeditionScene`은 스테이지 전환용 display state와 별개로 최신 파티 view model을 사용해 아군 표시를 즉시 갱신한다.
  - 같은 대원 구성에서 순서만 바뀐 경우 `data-party-reorder="active"` 상태를 0.5초 동안 유지한다.
- `src/react/styles.css`
  - 드래그 가능/드래그 중/드롭 대상 상태를 통일된 시각 상태로 표시한다.
  - 모바일에서도 슬롯 크기가 흔들리지 않도록 기존 grid와 min-height를 유지한다.
  - 슬롯 재배치 중 진행 bar와 전투장 아군 위치 전환 transition을 추가한다.
- `tools/react-vite-expedition-smoke.mjs`
  - DEBUG 5인 원정대에서 파티 슬롯 드래그 교체 후 저장 순서와 상단 캐릭터 슬롯 순서가 동기화되는지 검사한다.
  - 탭 전환 없이 슬롯 진행 표시와 전투장 reorder 상태가 나타나는지 검사한다.
- 문서
  - `docs/llm_project_brief.md`, `docs/react-vite-parity-migration.md`, `README.md`의 원정대/검증 설명을 최신화한다.
  - 구현 완료 후 `/implementations/expedition-party-order-drag-drop/implementation.md`를 작성한다.

## UX 규칙
- 슬롯 번호는 상단 전투 화면의 `unit-1`부터 `unit-5` 위치와 동일한 의미를 가진다.
- 슬롯 1은 전방 기준으로 안내하고, 뒤 슬롯으로 갈수록 후방 배치로 이해할 수 있게 짧은 위치 라벨을 제공한다.
- 파견 중인 대원은 기존 규칙대로 파티 편성 후보에서 제외되며, 이미 파티에 있는 대원의 순서 교체는 허용한다.
- 잠금 상태는 순서 변경을 막지 않는다.
- 투입/제거는 별도 대기 연출 없이 기존처럼 즉시 나타나거나 사라진다.

## 검증
- `npm run react:expedition-smoke`
- `npm run react:verify`
- `npm run verify:mobile`
- `mcp__UmgMcp.project_policy_gate` strict
- `git diff --check`
