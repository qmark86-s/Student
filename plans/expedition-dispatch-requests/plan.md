# 원정대 파견/의뢰 v1 구현 계획

## 목표
- 원정대 5인 파티 밖 남는 대원을 사용하는 `의뢰` 탭을 추가한다.
- 의뢰는 정적 JSON 풀에서 매일 4개가 결정론적으로 회전되며, 런타임에서 새 의뢰를 생성하지 않는다.
- 한 의뢰에는 1~3명을 투입하고, 동시에 최대 2개 의뢰를 진행한다.
- 추천 직업/역할은 실패 조건이 아니라 확정 보상 보너스로만 작동한다.
- v1 실제 지급 보상은 `원정대 EXP`, `다이아`, `부동산 자금`만 처리한다.
- `테크트리 포인트`, `유물`, `원정대 뽑기권`은 카드와 완료 화면에 `준비중` 보상으로 표시하되 실제 지급하지 않는다.

## 구현 범위
- `data/expedition_dispatches.json`을 추가한다.
  - `version`, `rules.activeSlotCount=2`, `rules.dailyVisibleCount=4`, `rules.maxMembersPerMission=3`, 한글 `help`를 포함한다.
  - 30분/2시간/6시간/12시간 band별 정적 풀을 두고, 매일 각 band에서 1개씩 노출한다.
  - 추천 직업 id는 `data/careers.json`, 추천 역할은 `tank/dealer/healer`만 허용한다.
- 저장 스키마를 v6으로 올리고 `save.expedition.dispatch`를 추가한다.
  - `assignments`: 진행 중 또는 완료 후 미수령 의뢰.
  - `history`: 최근 완료 기록, 최대 20개.
  - v5 이하 저장은 빈 dispatch 상태로 승격한다.
- `src/react/game/expedition.js`에 파견 API를 추가한다.
  - `createExpeditionDispatchViewModel(state, now)`
  - `startExpeditionDispatch(state, missionId, memberIds, now)`
  - `claimExpeditionDispatch(state, assignmentId, now)`
  - `expeditionDispatchedMemberIds(expedition)`
  - `createDailyDispatchMissions(dateKey)`
- 기존 원정대 동작을 파견 상태와 연결한다.
  - 파견 중/귀환 대기 대원은 파티 편성, 추천 편성, 합성 재료에서 제외한다.
  - 잠금 토글은 허용한다.
  - 성장은 기존처럼 출전 파티 대상만 보여 별도 차단하지 않는다.
  - 파견 대원은 보상 수령 전까지 귀환하지 않은 것으로 간주한다.

## UI
- 원정대 관리 탭 순서를 `성장 / 파티 / 의뢰 / 대원 관리 / 기록`으로 변경한다.
- 의뢰 탭에는 진행 슬롯, 파견 가능 대원 수, 다음 일일 갱신 시간, 진행 중 의뢰, 오늘의 의뢰 4개를 표시한다.
- 각 의뢰 카드에서 대원 칩을 선택하고 `추천 선택`으로 최적 대원을 자동 선택한다.
- 시작 버튼은 슬롯 부족, 인원 부족, 이미 파견/출전 중인 대원 선택 시 비활성화한다.
- 파티/관리 카드에는 파견 중 대원을 `파견중` 상태로 표시하고, 편성 버튼을 비활성화한다.

## v1.1 UI 운영 개선
- 의뢰 운영 기준은 `data/expedition_dispatches.json` 데이터 테이블과 validator로 관리한다.
- 오늘의 의뢰 UI는 카드가 늘어나도 구조가 무너지지 않도록 테이블형 섹션으로 구성한다.
- `추천 선택`은 의뢰 필요 인원만 채우지 않고, 최대 파견 인원까지 최선 후보를 자동 선택한다.
- 대원/직업 선택처럼 항목이 많아지는 영역은 내부 세로 스크롤을 가져 패널 전체 높이를 관리한다.
- 정렬이 필요한 목록에는 공통 정렬 버튼 컴포넌트를 사용하고, 콘텐츠별 기준만 다르게 제공한다.
- 우선 적용 범위는 원정대 파티 후보, 대원 관리, 의뢰 파견 대원 선택, 수능 결과 직업 선택 목록이다.

## v1.2 UI 밀도 개선
- 오늘의 의뢰는 기본 요약 카드로 접어 표시하고, 추천 직업/역할, 준비중 보상, 대원 선택, 시작 액션은 카드 내부 상세 영역에서만 노출한다.
- 접힌 상태에서도 의뢰명, 소요 시간, 필요 인원, 선택 인원, 보너스, 실제 지급 보상은 확인 가능해야 한다.
- 의뢰 상세는 한 번에 여러 개를 열 수 있되, 각 카드의 높이가 과도하게 늘어나지 않도록 대원 선택 목록 내부 스크롤을 유지한다.
- 진행 중 의뢰는 보상과 미래 보상 표시를 접힘 상세 영역으로 옮기고, 기본 행에는 진행률, 남은 시간, 파견 대원, 수령 버튼만 남긴다.
- 원정대 파티 후보/성장/관리 카드의 반복 텍스트를 줄이고, 카드 목적에 맞는 핵심 정보만 노출한다.
- 전반 UI 텍스트는 설명문보다 상태/수치 중심으로 정리하고, 빈 상태 안내 문구는 한 문장 이하로 유지한다.

## 검증 기준
- `npm run expedition:dispatch-verify`
- `npm run react:save-smoke`
- `npm run react:expedition-rules-smoke`
- `npm run react:expedition-smoke`
- `npm run react:verify`
- `npm run verify:mobile`
- `mcp__UmgMcp.project_policy_gate` strict
- `git diff --check`

## 구현 완료 메모
- 구현 완료 후 `/implementations/expedition-dispatch-requests/implementation.md`에 구조, 변경 파일, 검증 결과, 유지보수 기준을 기록한다.
- 기존 문서 `docs/llm_project_brief.md`, `docs/react-vite-parity-migration.md`, 필요 시 `README.md`를 함께 갱신한다.
