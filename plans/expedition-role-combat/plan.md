# 원정대 실시간 역할 전투 구현 계획

## 목표
- 기존 원정대의 대원 수집, 편성, 성장, 합성 흐름은 유지한다.
- 기존 단일 전투력 판정을 실시간 이벤트 기반 역할 전투로 교체한다.
- 앱 로드/복귀 및 실행 중 자동 원정 정산을 제공한다.
- 오프라인/복귀 보상은 즉시 지급하지 않고 pending 보상으로 저장한 뒤 수령 팝업에서 지급한다.
- 수동 `돌파`와 실행 중 자동 전투 보상은 즉시 지급한다.

## 구현 범위
- `data/expedition_combat_balance.json`을 추가한다.
  - 직업 62개 전부에 역할과 5스탯을 명시한다.
  - 일반 세그먼트 100개와 보스 100개 전부에 개별 적 배열을 명시한다.
  - 모든 주요 파라미터에 한글 도움말을 포함한다.
- `save.expedition.pendingReward`를 추가하고 저장 스키마를 v5로 올린다.
- 공개 함수 `simulateExpeditionBattle`, `resolveExpeditionAutoCombat`, `claimExpeditionPendingReward`를 추가한다.
- 전투 화면에는 자동 전투 요약, 역할/스탯 정보, 행동별 대미지/회복 플로트를 표시한다.
- 기록 탭에는 마지막 전투 행동 로그와 최근 자동 정산 요약을 표시한다.
- 보상 팝업에는 `받기`, `다이아로 더받기`, `광고보고 더받기` 버튼을 표시하되, 1차에서는 기본 받기만 활성화한다.
- 기존 `돌파` 버튼은 디버그/즉시 전투 용도로 유지한다.

## 전투 규칙
- 전투는 턴제가 아니라 결정론적 실시간 이벤트 시뮬레이션이다.
- 공속 1.0은 초당 1회, 공속 1.5는 초당 1.5회 행동한다.
- 같은 시각 이벤트는 아군 슬롯 순서, 적 배열 순서로 처리한다.
- 탱커와 딜러는 적을 공격하고, 힐러는 공격 대신 앞쪽부터 HP가 빠진 아군을 회복한다.
- 몬스터는 파티 앞 슬롯부터 공격한다.
- 피해는 최소 1을 보장하고, 회복은 최대 HP를 넘지 않는다.
- 전투마다 아군과 적 HP는 풀로 리셋한다.
- 시간 내 적 전멸은 승리, 아군 전멸 또는 시간 초과는 실패다.
- 일반 실패는 같은 Stage 유지, 보스 실패는 기존 규칙처럼 세그먼트 시작으로 롤백한 뒤 자동 진행을 계속한다.
- 반복 구간도 EXP, 돈, 부동산 자금 보상은 지급한다.
- 보스 다이아는 최초 클리어 1회만 지급한다.

## 검증 기준
- `npm run expedition:combat-verify`
- `npm run react:expedition-rules-smoke`
- `npm run react:expedition-smoke`
- `npm run react:verify`

## 문서화 기준
- 구현 완료 후 `/implementations/expedition-role-combat/implementation.md`에 구조, 변경 파일, 검증 결과, 유지보수 기준을 기록한다.
- 기존 원정대 규칙 smoke 문서에서 더 이상 맞지 않는 단일 전투력 기준을 새 실시간 전투 기준으로 갱신한다.

## 구현 완료 메모
- `data/expedition_combat_balance.json`을 추가해 직업 62개 역할 스탯과 일반/보스 enemy 설정 100개씩을 관리한다.
- 저장 스키마를 v5로 올리고 `save.expedition.pendingReward`를 추가했다.
- `simulateExpeditionBattle`, `resolveExpeditionAutoCombat`, `claimExpeditionPendingReward`를 공개 함수로 추가했다.
- 원정대 UI는 역할 배지, 전투 플로트, 마지막 전투 로그, pending 보상 팝업을 표시한다.
- 수동 `돌파`와 실행 중 자동 전투의 부동산 원정 보상은 즉시 지급하고, 오프라인/복귀 정산분만 pending 수령 시 지급한다.
- `data/expedition_combat_balance.json`의 정산당 전투 수 상한은 480전투로 낮췄다.
- `pauseAutoBattle=1` QA URL에서는 원정대 자동 정산도 멈춰 smoke가 수동 흐름을 안정적으로 검사한다.
- 최종 검증은 `npm run react:expedition-rules-smoke`, `npm run react:expedition-smoke`, `npm run react:verify` 기준으로 통과했다.

## 2026-06-28 후속: 보상 UX 및 전투 고도화
- 스테이지 1개 클리어마다 보상 모달을 띄우지 않는다.
- 수동 `돌파`와 실행 중 자동 전투 보상은 즉시 지급하고, 원정대 화면에 작은 보상 연출만 표시한다.
- 앱 로드/복귀처럼 오프라인 시간이 정산될 때만 `pendingReward`에 누적하고 보상 팝업으로 수령한다.
- `resolveExpeditionAutoCombat(state, now, options)`는 `rewardDelivery: "instant" | "pending"` 옵션을 지원한다.
- `completeExpeditionStage`는 즉시 지급 경로를 사용한다.
- 원정대 화면에는 마지막 전투 기준 아군/적 HP bar와 전투 결과 원인을 표시한다.
- 파티/관리 목록에 역할 필터 `전체/탱커/딜러/힐러`를 추가한다.
- `추천 편성`은 역할 비율을 고려하지 않고 전투력순 상위 5명을 편성한다. 동률은 높은 승급, 높은 레벨, 오래된 생성 순서로 정렬한다.
- 오프라인 정산은 8시간 시간 cap을 유지하되 한 번에 처리하는 전투 수 상한을 480전투로 낮춘다.
- 스킬 또는 패시브 추가는 이번 차수에서 제외한다.
