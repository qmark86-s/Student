# 원정대 파견/의뢰 v1 구현 설명서

## 개요
- 원정대 관리에 `의뢰` 탭을 추가했다.
- 파티 밖 원정대원을 정적 의뢰에 파견하고, 완료 후 원정대 EXP/다이아/부동산 자금을 수령한다.
- 의뢰 풀은 런타임 생성 없이 `data/expedition_dispatches.json`에서만 읽는다.
- 테크트리 포인트, 유물, 원정대 뽑기권은 v1에서 `준비중` 보상으로 표시만 하고 실제 저장/지급하지 않는다.

## 데이터
- 신규 파일: `data/expedition_dispatches.json`
- `rules` 주요 값:
  - `activeSlotCount`: 2
  - `dailyVisibleCount`: 4
  - `maxMembersPerMission`: 3
  - `historyLimit`: 20
  - `bonusPerMatchPoint`: 0.05
  - `bonusCap`: 0.3
- band는 30분/2시간/6시간/12시간 4종이며, 각 band에 3개씩 총 12개 의뢰를 둔다.
- 일일 노출은 로컬 날짜 `YYYY-MM-DD` 기준으로 각 band에서 1개씩 결정론적으로 선택한다.
- 추천 직업 ID는 `data/careers.json`에 존재해야 하며, 추천 역할은 `tank/dealer/healer`만 허용한다.

## 저장 구조
- `src/react/game/save.js`
  - `SAVE_SCHEMA_VERSION`을 6으로 올렸다.
  - `CONTENT_REVISION`은 `expdispatchv1`이다.
  - v5 이하 저장은 `save.expedition.dispatch`가 없는 경우 빈 상태로 승격된다.
- `save.expedition.dispatch`
  - `assignments`: 진행 중 또는 완료 후 미수령 의뢰.
  - `history`: 최근 완료 기록. 최대 20개.

## 원정대 API
- `src/react/game/expedition.js`에 다음 API를 추가했다.
  - `createDailyDispatchMissions(dateKey)`
  - `createExpeditionDispatchViewModel(state, now)`
  - `startExpeditionDispatch(state, missionId, memberIds, now)`
  - `claimExpeditionDispatch(state, assignmentId, now)`
  - `expeditionDispatchedMemberIds(expedition)`
- 보너스 규칙:
  - 추천 직업 매칭 2점, 추천 역할 매칭 1점.
  - 배율은 `1 + min(0.30, matchScore * 0.05)`.
  - 실제 지급 보상은 `Math.floor(baseReward * bonusMultiplier)`.
- 파견 중 또는 완료 후 미수령 대원은 보상 수령 전까지 귀환하지 않은 상태로 본다.

## 기존 원정대 연동
- 파견 중 대원은 파티 편성 버튼이 비활성화된다.
- 추천 편성은 파견 중 대원을 제외하고 전투력순으로 채운다.
- 합성 후보는 파견 중 대원을 제외한다.
- 잠금 토글은 기존처럼 허용한다.
- 성장 탭은 기존 기준대로 출전 파티 대상만 표시한다.

## UI
- `src/react/App.jsx`
  - 원정대 관리 탭 순서를 `성장 / 파티 / 의뢰 / 대원 관리 / 기록`으로 변경했다.
  - 완료 대기 의뢰가 있으면 `의뢰` 탭 라벨에 숫자를 붙인다.
  - `ExpeditionDispatchPanel`을 추가해 진행 슬롯, 파견 가능 대원, 다음 갱신 시간, 진행 중 의뢰, 오늘의 의뢰 4개를 표시한다.
  - 의뢰 카드에서 대원 칩 선택, `추천 선택`, `시작`, 완료 후 `받기`를 처리한다.
  - 오늘의 의뢰 영역은 요약 카드와 접힘 상세 영역으로 구성했다. 접힌 상태에서는 의뢰명, 소요 시간, 필요/선택 인원, 보너스, 실제 보상만 보이고, 추천 직업/역할, 준비중 보상, 대원 선택, 시작 액션은 `세부`로 펼쳐 확인한다.
  - 진행 중 의뢰도 상세 접힘을 지원한다. 기본 행에는 진행률, 남은 시간, 파견 대원, 수령 버튼만 두고 실제/준비중 보상은 상세 영역으로 이동했다.
  - `추천 선택`은 의뢰 필요 인원만 채우지 않고 최대 파견 인원 3명까지 최선 후보를 자동 선택한다.
  - 공통 `ListSortControl`을 추가해 정렬 버튼 스타일을 통일했다.
  - 정렬 적용 범위는 원정대 파티 후보, 대원 관리, 의뢰 파견 대원 선택, 수능 결과 직업 선택이다.
  - 파견 대원 선택과 수능 결과 직업 선택 목록은 내부 세로 스크롤을 사용해 항목 증가 시 하위 패널 높이를 관리한다.
  - 성장/파티/관리 카드의 반복 설명을 줄였다. 성장 카드는 레벨과 전투력 증가 중심, 파티 후보 카드는 전투력 중심, 빈 상태 문구는 한 문장 이하로 표시한다.
  - 수능 결과 직업 선택 카드도 등급/수입/전투 배율 중심으로 줄이고, 긴 요구 조건 반복은 잠긴 후보 문구에만 남겼다.
- `src/react/styles.css`
  - 의뢰 패널, 의뢰 카드, 진행 중 카드, 보상 태그, 대원 칩, `파견중` 상태 스타일을 추가했다.
  - 원정대 탭 그리드는 5개 탭 기준으로 변경했다.
  - 공통 정렬 컨트롤, 접힘 의뢰 카드, 회전 화살표 버튼, 스크롤 가능한 대원/직업 선택 목록 스타일을 추가했다.

## 검증 도구
- 신규 파일: `tools/validate-expedition-dispatches.mjs`
  - 의뢰 band 4종, 의뢰 12개, 한글 help, 추천 직업/역할 ID, 실제/준비중 보상 구조를 검증한다.
- `package.json`
  - `expedition:dispatch-verify` 스크립트를 추가했다.
  - `react:verify`에 `npm run expedition:dispatch-verify`를 포함했다.
- `tools/react-vite-expedition-smoke.mjs`
  - 의뢰 탭 노출, 파견 시작, 완료 상태 재로드, 보상 수령, 보상 지급 증가를 검사한다.
  - `추천 선택`이 최대 파견 인원 3명을 채우는지 검사한다.
  - 접힌 의뢰 카드를 `세부`로 펼친 뒤 대원 선택과 시작 흐름을 검사한다.
- `tools/react-vite-save-smoke.mjs`
  - v6 schema와 `dispatch.assignments/history` 승격을 검사한다.
- `tools/react-vite-responsive-audit.mjs`
  - 원정대 내부 탭 수 기준을 5개로 갱신했다.

## 검증 결과
- `npm run expedition:dispatch-verify`: 통과
- `npm run react:save-smoke`: 통과
- `npm run react:expedition-rules-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:verify`: 통과
- `npm run verify:mobile`: 통과
- `mcp__UmgMcp.project_policy_gate` strict: 통과
- `git diff --check`: 통과

## 유지보수 메모
- 신규 의뢰를 추가할 때는 `data/expedition_dispatches.json`만 확장하고 `npm run expedition:dispatch-verify`를 먼저 실행한다.
- 의뢰 보상에 실제 지급 재화를 추가하려면 `claimExpeditionDispatch`, 저장 검증, smoke 지급 검증을 함께 확장해야 한다.
- 연구/유물/뽑기권 시스템을 구현하기 전까지 미래 보상은 `future` 배열의 `준비중` 표시 전용으로 유지한다.
