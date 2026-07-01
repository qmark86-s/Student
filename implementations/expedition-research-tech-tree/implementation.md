# 원정대 연구(테크트리) v1/v1.4 구현 설명

## 개요
- 원정대 관리에 `연구` 탭을 추가했다.
- 연구는 학생 탭의 교육처럼 누적 성장 컨텐츠지만, 효과는 모든 원정대원과 원정대 보상 계산에 적용된다.
- v1 총 전투력 보너스는 `data/expedition_research.json`의 `rules.maxTotalCombatBonus=0.2` 상한 아래에서 관리한다.
- 연구 초기화는 무료이며 투자한 연구 재화를 전액 반환한다.
- v1.1에서는 단일 세로줄이 아니라 5개 갈래/18개 노드/8단계 depth의 다열 연구 맵으로 확장했다.
- v1.2에서는 PC형 대형 카드 트리를 모바일 관리 탭에 맞춰 압축 노드 맵과 선택 상세 패널로 재구성했다.
- v1.3에서는 지도형 인상을 줄이고, `다음 연구` 3개와 5개 갈래 레일 행 중심의 모바일형 연구 메뉴로 재구성했다.
- v1.4에서는 We Are Warriors의 Rune 페이지처럼 원형 노드와 선행 연결선 중심의 세로 룬 트리로 재구성하고, 연구 탭에서 상단 원정대 전투 씬을 제거했다.

## 데이터
- `data/expedition_research.json`
  - `version`, 한글 `help`, `rules`, `lanes`, `nodes`를 가진 정적 데이터다.
  - 런타임에서 연구 노드나 효과를 생성하지 않는다.
  - `lanes`는 보급/지휘/작전/공격/의무·보상 갈래 이름과 한글 help를 가진다.
  - 노드는 `position.depth`, `position.lane`을 가져 다열 연구 맵에서 같은 좌표로 표시된다.
  - 선행 조건 2개 이상을 요구하는 교차 노드를 포함해 여러 갈래가 합류한다.
  - 효과 타입은 `partyPowerPercent`, `combatStatPercent`, `roleCombatStatPercent`, `stageRewardPercent`, `researchPointDropFlat`만 허용한다.

## 저장
- `src/react/game/save.js`
  - save schema를 v7로 올리고 `CONTENT_REVISION`을 `expresearchv1`로 갱신했다.
  - `save.expedition.research` 구조:
    - `points`: 보유 연구 재화
    - `spentPoints`: 투자 연구 재화
    - `unlockedNodeIds`: 완료한 연구 노드 id
    - `resetCount`: 초기화 횟수
  - v6 이하 legacy save는 빈 연구 상태로 승격한다.

## 원정대 규칙
- `src/react/game/expedition.js`
  - `createExpeditionResearchViewModel(state)`가 연구 탭 표시 데이터를 만든다.
  - view model은 `nodes`, `lanes`, `links`, `laneCount`, `depthCount`를 포함한다. UI는 정적 `position.lane/depth`와 `links`를 사용해 원형 룬 노드와 SVG 선행 연결선을 표시한다.
  - `unlockExpeditionResearchNode(state, nodeId)`가 선행 조건과 비용을 검사하고 노드를 해금한다.
  - `resetExpeditionResearch(state)`가 완료 노드를 비우고 투자 재화를 반환한다.
  - `expeditionResearchEffects(expedition)`가 완료 노드 효과를 집계한다.
- 보스 첫 클리어 시 연구 재화를 지급한다.
  - 중간보스: 기본 1
  - 챕터보스: 기본 3
  - 이미 `claimedBossStages`에 기록된 보스는 중복 지급하지 않는다.
- 연구 효과는 전투 시뮬레이션 스탯, 원정대 전투력 판정, 원정대 EXP/부동산 자금 보상에 반영된다.

## UI
- `src/react/App.jsx`
  - 원정대 관리 탭 순서는 `성장 / 연구 / 파티 / 의뢰 / 대원 관리 / 기록`이다.
  - 연구 탭은 보유 연구 포인트, 전투 보너스, 진행률, 무료 초기화 버튼을 짧은 상단 바에 표시한다.
  - 연구 본문은 5개 lane/8단계 depth의 원형 룬 트리다. 노드는 완료/연구 가능/잠김/선택 상태를 원형 색상, 테두리, 진행 수치(`0/비용`, `비용/비용`)로 보여준다.
  - 선행 조건은 SVG 연결선으로 표시하며, 완료 연결선과 연구 가능 연결선을 상태 색상으로 구분한다.
  - 이름/효과/선행 조건/해금 버튼은 선택한 1개 노드의 compact 상세 패널에만 표시한다.
  - 연구 탭은 `ExpeditionScene`을 렌더하지 않는다. 파티/의뢰/대원 관리/기록 등 다른 원정대 탭은 동일한 전투 씬 크기를 유지해 탭별 해상도/높이 불일치를 없앴다.
- `src/react/styles.css`
  - 연구 전용 룬 타이틀, 보너스 바, 선택 상세, 원형 노드, SVG link, 내부 세로 스크롤 레이아웃을 추가했다.
  - 모바일에서는 가로 overflow를 만들지 않고 `expedition-viewport` 내부 세로 스크롤로 하위 depth를 탐색한다.

## 검증
- `tools/validate-expedition-research.mjs`
  - JSON 구조, 한글 help, lane 정의, 노드 id 중복, 좌표 겹침, 선행 조건, 효과 타입, 역할/stat/reward 값, 전투 보너스 상한, 무료 초기화 규칙을 검사한다.
  - v1.1 기준 노드 18개 이상, lane 5개 이상, 충분한 선행 연결과 교차 선행 노드 수를 검사한다.
- `tools/react-vite-expedition-smoke.mjs`
  - 연구 탭 존재, 연구 룬 트리 1개, 원형 노드 18개, SVG 연결선, lane 5개, 선택 노드 1개, 상세 패널 1개, 보스 연구 포인트 지급, 노드 선택 후 해금, 포인트 차감, 초기화 반환을 smoke에 포함한다.
- `tools/react-vite-save-smoke.mjs`
  - fresh/legacy save가 schema v7 연구 상태를 갖는지 검사한다.
- `tools/build-visual-assets.mjs`
  - `verify:mobile` 반복 빌드 중 Windows PNG 쓰기에서 일시적 `UNKNOWN`/`EBUSY`/`EPERM` open 오류가 날 수 있어 `writePng` 저장 단계에 짧은 재시도를 추가했다. 자산 누락을 숨기는 fallback이 아니라 동일 산출물 쓰기 작업의 transient I/O 안정화다.
- 2026-07-01 v1.4 모바일 캡처
  - `artifacts/expedition-research-rune-mobile.png`에서 390x844 기준 연구 탭 첫 화면을 확인했다.
  - `artifacts/expedition-research-rune-mobile-bottom.png`에서 내부 스크롤 후 하단 노드 노출을 확인했다.
  - 측정값: horizontal overflow 0, 연구 탭 `ExpeditionScene` 0개, 룬 트리 1개, 원형 노드 18개, SVG 연결선 24개, 선택 상세 패널 1개, viewport 내부 scrollHeight 801/clientHeight 659.

## 관련 명령
```powershell
npm run expedition:research-verify
npm run react:save-smoke
npm run react:expedition-smoke
npm run react:verify
npm run verify:mobile
git diff --check
```
- `mcp__UmgMcp.project_policy_gate` strict도 함께 통과 기준으로 둔다.
