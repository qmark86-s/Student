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
  - 역할별 공속은 정책값으로 고정한다. 탱커 3.0, 딜러 1.5, 힐러 1.0이며 공속 성장값은 0이다.
  - `enemyStats.segments`: `data/expedition_stages.json` 100개 세그먼트의 개별 적 배열.
  - `enemyStats.bosses`: `data/expedition_bosses.json` 100개 보스의 개별 적 배열.
  - 모든 일반/보스 적 공속은 2.0으로 고정한다.
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
  - 행동 이벤트에는 행동자/대상의 id, 진영, 슬롯, 역할, 표시명, 대상 HP before/after/max, 처치 여부를 포함한다.
  - 전투 리포트는 `enemyDefeatOrder`를 별도로 보관해 UI가 이벤트 slice와 무관하게 승리/실패 모두에서 적 개별 처치 순서를 재생할 수 있게 한다.

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
- 최신 기준: `implementations/expedition-transition-overlap-motion/implementation.md`에서 새 몬스터 접근은 이동 완료 후 2.95초가 아니라 Stage 이동 마지막 1초에 겹쳐 재생되도록 변경했다.
- `src/react/App.jsx`
  - 전투 화면에 역할 배지, 실시간 전투 예상, 행동별 대미지/회복 플로트, HP bar, 즉시 보상 toast를 표시한다.
  - 파티 motion은 `combat`, `running`, `standing`으로 분리했다. 전투/정리/일반 대기 중에는 기존 이동 스프라이트를 제자리 걷기로 재생하는 `combat`, Stage 이동과 이동 후반 조우 접근 중에는 `running`, 미편성 상태에는 `standing`을 쓴다.
  - 별도 idle 스프라이트는 현재 확인되지 않아 전투 중 멈춤 대신 걷기 프레임 루프를 유지한다.
  - 대미지/회복 플로트는 새 전투 리포트가 들어왔을 때만 1회 재생하며, 저장된 과거 리포트나 preview 전투로 더미처럼 반복 표시하지 않는다.
  - 플로트는 `행동자 → 대상`, 수치, 대상 HP를 표시하고 대상 슬롯 위치 위에 배치한다.
  - 처치 이벤트 이후 같은 대상에게 이어지는 플로트는 표시하지 않아 죽은 몬스터 위에 대미지가 계속 뜨는 느낌을 막는다.
  - 전투 정리와 실패 정리 사망 연출은 `enemyDefeatOrder` 기반 개별 delay를 사용하며, 전투 엔진의 단일 타겟 공격 규칙과 화면 표현을 맞춘다.
  - 실패 전투에서도 `enemyHp`를 반영해 처치된 몬스터와 생존 몬스터 HP bar를 구분한다.
  - 승리 시 모든 몬스터 처치/디스폰 연출이 끝난 뒤에만 4초 Stage 이동을 시작하고, 이동 중에는 이전 Stage 몬스터를 렌더하지 않는다.
  - 새 몬스터 접근은 Stage 이동 마지막 1초에 재생하고, 파티 이동 모션은 오버랩 구간에도 running을 유지한 뒤 이동 종료 시 combat으로 돌아간다.
  - 실행 중 자동 전투는 전투 정리, Stage 이동, 몬스터 조우 접근 중에는 멈추고 실제 `.expedition-scene[data-combat-ready="true"]` 표시 상태가 된 뒤에만 다음 전투를 시작하며, 라이브 화면에서는 한 번에 1전투만 처리한다.
  - 성장/파티/관리 카드에 역할과 핵심 전투 스탯을 표시한다.
  - 파티/관리 목록에 역할 필터를 제공한다.
  - 파티 탭의 `추천 편성`은 보유 대원 중 전투력순 상위 5명을 편성한다. 동률은 높은 승급, 높은 레벨, 오래된 생성 순서로 정렬한다.
  - 기록 탭에 마지막 전투 행동 로그, 승패 원인, 자동 정산 요약을 compact하게 표시한다.
  - pending 보상이 남아 있으면 원정대 화면에서 `누적 보상 받기` 버튼으로 보상 팝업을 다시 열 수 있다.
  - 원정 보상 팝업은 `받기`, `다이아로 더받기`, `광고보고 더받기`를 표시한다.
  - `다이아로 더받기`, `광고보고 더받기`는 1차 구현에서 disabled `준비중`이다.
- `src/react/styles.css`
  - 역할 배지, 전투 플로트, 전투 로그, 보상 팝업 스타일을 추가했다.
  - `.expedition-party-visual.combat`에서도 파티 유닛의 rhythm과 frame animation을 재생해 전투 중 제자리 걷기처럼 보이게 했다. slash spark는 Stage 이동 중 `running`에서만 재생한다.

## 검증
- `tools/validate-expedition-combat-balance.mjs`
  - 직업 62개 누락, 역할 enum 오류, 비정상 스탯, 공속 0 이하를 실패 처리한다.
  - 역할별 공속 정책값, 공속 성장 0, 몬스터 공속 2.0을 실패 조건으로 검증한다.
  - 일반 세그먼트 100개와 보스 100개 누락을 실패 처리한다.
  - Stage별 enemy 수와 화면 몬스터 수 불일치를 실패 처리한다.
  - Stage/보스가 참조하는 원정대 몬스터 asset id가 실제 `src/snapshot/assets/individual/expedition-enemies/<asset>/move_0..3.png` 4프레임을 모두 갖는지 검사한다.
  - 한글 help 누락을 실패 처리한다.
- `tools/react-vite-expedition-rules-smoke.mjs`
  - 수동 보스 첫 클리어 즉시 지급, 보스 다이아 1회 제한, 보스 실패 롤백, 일반 실패 유지, 오프라인 8시간 cap과 480전투 상한, pending 수령, 추천 편성, 성장 투자, 승급 합성을 검사한다.
  - 전투 로그에서 힐러 회복, 개별 몬스터 행동, 역할별 공격속도 행동 횟수 차이를 검사한다.
  - 새 공속 정책 기준 부분 처치 실패 시 3마리 중 1마리만 처치되고 2마리 생존 상태가 남으며, 화면도 같은 개체 상태를 표시하는지 검사한다.
- `tools/react-vite-expedition-smoke.mjs`
  - 직업 수락, 원정대원 등록, Stage 진행, 수동 즉시 보상, 보상 모달 미표시, HP bar, 처치 리플레이 후 4초 이동, 이동 후반 1초 조우 오버랩을 검사한다.
  - 전투 정리 리플레이 중 적 HP bar가 실제 피해 이벤트에 따라 감소하고, 아군 HP bar도 몬스터 피해 이벤트에 따라 감소하는지 검사한다.
  - 전투 플로트는 전투 정리 구간에서만 표시되고 이동 중에는 남지 않으며, 파티 motion이 전투 중 `combat`, 이동 중과 조우 오버랩 중 `running`인지 검사한다.
  - 자동 전투가 정리/이동/조우 중 Stage와 전투 리포트를 추가 진행하지 않고, 조우 후에만 1전투씩 재개되는지 검사한다. 디버그 `대원 후보 +5`로 만든 파티도 실제 원정대 화면에서 자동 진행되는지 함께 검사한다.
- `tools/visual-asset-smoke.mjs`
  - 원정대 배경은 `.expedition-arena::before`의 파노라마 atlas를 기준으로 검사한다.
  - 파티 전투 모션은 x축 전진량이 아니라 `combat` 상태의 제자리 rhythm/frame animation으로 검사한다.
  - impact VFX는 실제 전투 리플레이 요소가 있을 때만 animation을 검사한다.
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
- `npm run visual:smoke`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.
- Vite build는 기존 큰 chunk 경고를 출력하지만 빌드는 성공한다.

## 유지보수 기준
- 직업 추가/삭제 시 `data/careers.json`과 `data/expedition_combat_balance.json.careerStats` 수가 반드시 일치해야 한다.
- 원정대 Stage/보스 데이터 변경 시 combat balance의 `segments`/`bosses`와 화면 몬스터 수 검증을 함께 갱신한다.
- 전투 규칙 변경 시 `simulateExpeditionBattle`의 결정론적 이벤트 순서와 rules smoke의 행동 로그 검사를 같이 갱신한다.
- 보상 지급 경로를 바꿀 때는 즉시 지급과 pending 지급의 중복, 보스 다이아 1회 제한, 부동산 자금 지급 시점 검증을 함께 확인한다.
- 오프라인 정산은 8시간 시간 cap과 별개로 한 번에 480전투까지만 처리한다. 이 상한을 바꿀 때는 밸런스 검증과 rules smoke 기대값을 같이 갱신한다.
- 역할/몬스터 공속 정책을 바꿀 때는 `data/expedition_combat_balance.json`, `tools/validate-expedition-combat-balance.mjs`, `tools/react-vite-expedition-rules-smoke.mjs`의 부분 처치 시드를 같이 갱신한다.
