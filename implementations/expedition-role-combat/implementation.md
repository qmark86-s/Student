# 원정대 실시간 역할 전투 구현

## 개요
- 원정대 전투를 기존 단일 전투력 판정에서 결정론적 실시간 이벤트 시뮬레이션으로 교체했다.
- 대원은 `tank`, `dealer`, `healer` 역할과 HP, 공격, 방어, 회복, 공속을 가진다.
- 적도 개별 HP, 공격, 방어, 공속을 가지며 화면에 보이는 몬스터 수와 전투 참여 수가 일치한다.
- Stage 승리 보상은 지급 경로를 분리했다. 수동 `돌파`와 실행 중 자동 전투는 즉시 지급하고, 앱 로드/복귀로 정산되는 오프라인 보상만 `save.expedition.pendingReward`에 누적한 뒤 보상 팝업의 `받기`에서 지급한다.

## 핵심 데이터
- `data/expedition_combat_balance.json`
  - `timing`: 일반 5초, 중간보스 15초, 챕터보스 30초, 오프라인 cap 8시간, 실행 중 tick 1초, 정산당 최대 480전투.
  - `careerStats`: `data/careers.json` 62개 직업 전부의 역할, 5스탯, 레벨 성장률.
  - `enemyStats.segments`: `data/expedition_stages.json` 100개 세그먼트의 개별 적 배열.
  - `enemyStats.bosses`: `data/expedition_bosses.json` 100개 보스의 개별 적 배열.
  - 모든 주요 파라미터는 한글 `help`를 가진다.

## 전투 엔진
- `src/react/game/expedition.js`
  - `simulateExpeditionBattle(state, currentStage)`: 단일 Stage 실시간 전투를 계산한다.
  - 공속 `1.0`은 초당 1회, `1.5`는 초당 1.5회 행동한다.
  - 같은 시각 행동은 아군 슬롯 순서, 적 배열 순서로 처리한다.
  - 탱커/딜러는 앞쪽 적을 공격하고, 힐러는 공격 대신 앞쪽부터 HP가 빠진 아군을 회복한다.
  - 몬스터는 앞 슬롯 아군을 공격한다.
  - 전투마다 아군/적 HP는 풀로 초기화한다.
  - 적 전멸은 승리, 아군 전멸 또는 제한시간 초과는 실패다.
  - 전투 리포트는 마지막 행동 로그, 행동 횟수, 합산 잔여 HP, 아군/적 개별 HP 배열, 결과 사유를 보관한다.

## 자동 정산과 보상
- `resolveExpeditionAutoCombat(state, now, options)`
  - `rewardDelivery: "instant" | "pending"` 옵션을 지원한다.
  - 앱 로드/복귀는 `pending`, 실행 중 1초 주기는 `instant`로 호출된다.
  - 최대 8시간까지 누적 전투를 처리하되 한 번의 호출은 최대 480전투까지만 계산한다.
  - pending 보상이 있어도 자동 전투는 계속 진행하며, 오프라인 pending 보상은 기존 pending에 합산한다.
  - 일반 실패는 같은 Stage 유지, 보스 실패는 구간 시작 Stage로 회귀한다.
- `completeExpeditionStage(state)`
  - 수동 `돌파` 보상을 즉시 지급하고 pending 보상 모달을 만들지 않는다.
- `claimExpeditionPendingReward(state, "base")`
  - 1차 구현에서는 기본 `받기`만 실제 지급한다.
  - EXP는 `expedition.trainingExp`, 다이아는 `state.diamonds`, 부동산 자금은 `realEstate.cash`에 지급한다.
  - 수령 후 pending 금액과 전투 수는 초기화하되 마지막 전투 리포트는 유지한다.
- 부동산 기존 방치 원정 자금과 중복되지 않도록, 수동/온라인 Stage 보상은 즉시 `realEstate.cash`에 지급하고 오프라인 Stage 보상은 pending 수령 시점에만 지급한다.

## 저장 스키마
- `src/react/game/save.js`
  - `SAVE_SCHEMA_VERSION`을 5로 올렸다.
  - v1~v4 저장은 `migrateLegacyExpeditionState`를 통해 `pendingReward`가 있는 v5 구조로 승격한다.
  - 기존 v5 저장에 과거 형식의 `lastBattle`이 있어도 로드 시 `pendingReward`를 새 리포트 형식으로 정규화한 뒤 검증한다.

## UI
- `src/react/App.jsx`
  - 전투 화면에 역할 배지, 실시간 전투 예상, 행동별 대미지/회복 플로트, HP bar, 즉시 보상 toast를 표시한다.
  - 성장/파티/관리 카드에 역할과 핵심 전투 스탯을 표시한다.
  - 파티/관리 목록에 역할 필터를 제공한다.
  - 파티 탭의 `추천 편성`은 보유 대원 중 전투력순 상위 5명을 편성한다. 동률은 높은 승급, 높은 레벨, 오래된 생성 순서로 정렬한다.
  - 기록 탭에 마지막 전투 행동 로그, 승패 원인, 자동 정산 요약을 compact하게 표시한다.
  - pending 보상이 남아 있으면 원정대 화면에서 `누적 보상 받기` 버튼으로 보상 팝업을 다시 열 수 있다.
  - 원정 보상 팝업은 `받기`, `다이아로 더받기`, `광고보고 더받기`를 표시한다.
  - `다이아로 더받기`, `광고보고 더받기`는 1차 구현에서 disabled `준비중`이다.
- `src/react/styles.css`
  - 역할 배지, 전투 플로트, 전투 로그, 보상 팝업 스타일을 추가했다.

## 검증
- `tools/validate-expedition-combat-balance.mjs`
  - 직업 62개 누락, 역할 enum 오류, 비정상 스탯, 공속 0 이하를 실패 처리한다.
  - 일반 세그먼트 100개와 보스 100개 누락을 실패 처리한다.
  - Stage별 enemy 수와 화면 몬스터 수 불일치를 실패 처리한다.
  - 한글 help 누락을 실패 처리한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - 수동 보스 첫 클리어 즉시 지급, 보스 다이아 1회 제한, 보스 실패 롤백, 일반 실패 유지, 오프라인 8시간 cap과 480전투 상한, pending 수령, 추천 편성, 성장 투자, 승급 합성을 검사한다.
  - 전투 로그에서 힐러 회복, 개별 몬스터 행동, 공격속도 행동 횟수 차이를 검사한다.
- `tools/react-vite-expedition-smoke.mjs`
  - 직업 수락, 원정대원 등록, Stage 진행, 수동 즉시 보상, 보상 모달 미표시, HP bar를 검사한다.
- `tools/react-vite-real-estate-smoke.mjs`
  - 수동 원정대 Stage 보상이 별도 팝업 없이 부동산 자금에 즉시 반영되는 흐름을 검사한다.
- `tools/react-vite-save-smoke.mjs`
  - v5 migration과 `pendingReward` 생성을 검사한다.

## 검증 결과
- `npm run expedition:combat-verify`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run react:real-estate-smoke`: 통과.
- `npm run react:save-smoke`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.
- Vite build는 기존 큰 chunk 경고를 출력하지만 빌드는 성공한다.

## 유지보수 기준
- 직업 추가/삭제 시 `data/careers.json`과 `data/expedition_combat_balance.json.careerStats` 수가 반드시 일치해야 한다.
- 원정대 Stage/보스 데이터 변경 시 combat balance의 `segments`/`bosses`와 화면 몬스터 수 검증을 함께 갱신한다.
- 전투 규칙 변경 시 `simulateExpeditionBattle`의 결정론적 이벤트 순서와 rules smoke의 행동 로그 검사를 같이 갱신한다.
- 보상 지급 경로를 바꿀 때는 즉시 지급과 pending 지급의 중복, 보스 다이아 1회 제한, 부동산 자금 지급 시점 검증을 함께 확인한다.
- 오프라인 정산은 8시간 시간 cap과 별개로 한 번에 480전투까지만 처리한다. 이 상한을 바꿀 때는 밸런스 검증과 rules smoke 기대값을 같이 갱신한다.
