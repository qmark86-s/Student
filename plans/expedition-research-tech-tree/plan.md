# 원정대 연구(테크트리) v1 구현 계획

## 목표
- 원정대 전체에 적용되는 다열 연구(테크트리) 탭을 추가한다.
- 학생 탭의 교육처럼 누적 성장 컨텐츠로 동작하되, 원정대 전투력 총 기여는 v1 기준 약 10~20% 안쪽으로 제한한다.
- 연구 재화는 원정대 중간보스/챕터보스 클리어 보상으로 지급하고, 이벤트/상점 지급은 이후 차수에서 같은 저장 필드로 확장 가능하게 둔다.
- 초기화는 무료로 제공하며, 사용한 연구 재화를 전액 반환한다.

## 데이터
- `data/expedition_research.json`을 추가한다.
  - `version`, 한글 `help`, `rules`, `nodes`를 포함한다.
  - `rules.maxTotalCombatBonus=0.2`로 총 전투 보너스 상한을 명시한다.
  - `lanes`는 보급/지휘/작전/공격/의무·보상 갈래 이름과 한글 help를 가진다.
  - 노드는 다열 트리 배치를 위해 `position.depth`, `position.lane`을 가진다.
  - 노드 효과는 런타임 생성 없이 정적 데이터로만 정의한다.
- v1.1 노드 구성:
  - 총 18개 노드, 5개 lane, 8단계 depth로 구성한다.
  - 공용/보급: 원정 기초 훈련, 보급 동선, 정찰 지도화, 임시 방어진, 위기 대응, 장기 원정 준비
  - 역할: 탱커 방어 전술, 딜러 집중 타격, 힐러 응급 처치, 정밀 교전 타이밍, 돌파 지휘
  - 진행/보상: 중간보스 분석, 챕터 작전 기록, 현장 조달 계약, 원정 교범, 자원 항로도
  - 선행 조건 2개 이상을 요구하는 교차 노드를 4개 이상 둬 갈래가 합류하는 구조를 만든다.
- 효과 타입:
  - `partyPowerPercent`: 원정대 전투력/스테이지 판정 전체 배율
  - `combatStatPercent`: 실제 전투 시뮬레이션의 hp/attack/defense/healing 배율
  - `roleCombatStatPercent`: 특정 역할의 실제 전투 스탯 배율
  - `stageRewardPercent`: 원정대 EXP/부동산 자금 보상 배율
  - `researchPointDropFlat`: 보스 연구 재화 추가 드랍

## 저장
- 저장 스키마를 v7로 올리고 `contentRevision`을 `expresearchv1`로 갱신한다.
- `save.expedition.research` 추가:
  - `points`: 미사용 연구 재화
  - `spentPoints`: 투자한 연구 재화
  - `unlockedNodeIds`: 해금한 노드 id 배열
  - `resetCount`: 초기화 횟수
- v6 이하 저장은 빈 연구 상태로 승격한다.

## 원정대 규칙
- 중간보스와 챕터보스 클리어 시 연구 재화를 지급한다.
  - 중간보스 기본 1점, 챕터보스 기본 3점.
  - `researchPointDropFlat` 효과가 있으면 추가한다.
- 연구 효과는 모든 원정대원에게 적용하되, 역할 전용 효과는 해당 역할 전투 스탯에만 적용한다.
- `partyPowerPercent` 효과 합계는 `rules.maxTotalCombatBonus`로 제한한다.
- 연구 초기화는 무료이며 해금 노드를 비우고 `spentPoints`를 `points`로 되돌린다.

## API
- `src/react/game/expedition.js`에 추가한다.
  - `createEmptyResearchState()`
  - `createExpeditionResearchViewModel(state)`
  - `unlockExpeditionResearchNode(state, nodeId)`
  - `resetExpeditionResearch(state)`
  - `expeditionResearchEffects(expedition)`
- 기존 `completeExpeditionStage`, `resolveExpeditionAutoCombat`, 보상 수령/토스트 흐름에 연구 포인트를 연결한다.

## UI
- 원정대 관리 탭 순서:
  - `성장 / 연구 / 파티 / 의뢰 / 대원 관리 / 기록`
- 연구 탭:
  - 상단 요약: 보유 연구, 투자 연구, 전투 보너스, 초기화 버튼
  - v1.4는 We Are Warriors의 Rune 페이지처럼 세로형 원형 노드 트리 UI로 제공한다.
  - 다열 트리: depth 순서로 내려가고 lane 방향으로 선택 갈래가 벌어진다.
  - lane/depth 좌표는 정적 JSON의 `position`을 그대로 쓰되, UI는 원형 rune node와 SVG 선행 연결선으로 표시한다.
  - 각 node는 해금 완료/연구 가능/잠김/선택 상태를 원형 색상, 테두리, 진행 수치(`0/비용`, `비용/비용`)로 표시한다.
  - 추천/다음 연구는 상단 카드가 아니라 선택 노드와 트리 내 ready 색상으로 표시한다.
  - 선택한 1개 노드의 이름/효과/선행 조건/연구 버튼만 compact 상세 패널로 보여준다.
  - 모바일에서는 연구 트리가 가로 스크롤 없이 화면 폭 안에 들어오고, 세로 스크롤로 하위 depth를 탐색한다.
  - 연구 탭에서는 상단 원정대 전투 씬을 렌더하지 않는다. 다른 원정대 탭은 같은 전투 씬 크기를 유지해 탭별 해상도/크기 불일치를 없앤다.

## 검증
- `tools/validate-expedition-research.mjs` 추가 및 `package.json`에 `expedition:research-verify` 연결.
- validator는 노드 18개 이상, lane 5개 이상, 선행 조건 연결 수, 교차 선행 노드 수, 좌표 겹침, lane 정의 누락을 검사한다.
- `react:verify`에 연구 검증을 포함한다.
- `tools/react-vite-expedition-smoke.mjs` 확장:
  - 연구 탭 존재
  - 보스 클리어 후 연구 포인트 지급
  - 연구 노드 해금 시 포인트 감소/전투력 상승
  - 초기화 시 포인트 반환
- 필수 검증:
  - `npm run expedition:research-verify`
  - `npm run react:build`
  - `npm run react:save-smoke`
  - `npm run react:expedition-smoke`
  - `npm run react:verify`
  - `npm run verify:mobile`
  - `git diff --check`
  - `mcp__UmgMcp.project_policy_gate` strict

## 문서
- 구현 완료 후 `/implementations/expedition-research-tech-tree/implementation.md` 작성.
- `docs/llm_project_brief.md`, `docs/react-vite-parity-migration.md`, `README.md` 검증 명령 요약을 갱신한다.
