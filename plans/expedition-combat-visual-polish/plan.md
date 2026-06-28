# 원정대 전투 시각 연출 상용화 계획

## 목표
- 원정대 배경 루프 품질을 높이고, Stage/챕터 진행에 따라 배경 구간이 유지되도록 한다.
- 대미지/회복 플로트를 더미처럼 무한 반복하지 않고 실제 전투 이벤트 타임라인으로 1회 재생한다.
- 플로트만 봐도 누가 행동했고 누가 피해/회복을 받았는지 이해할 수 있게 한다.
- 몬스터가 사망한 뒤에도 같은 몬스터 위에 대미지가 계속 뜨는 느낌을 제거한다.
- 원정대가 몬스터를 만나 멈추기 전에는 다음 자동 전투가 시작되지 않게 한다.

## 배경 후속 작업
- `visual-expedition-backdrops.png` 생성 로직에서 내부 seam뿐 아니라 좌우 루프 seam도 블렌딩한다.
- 현재 PNG도 같은 seam 처리 결과로 갱신한다.
- Stage 배경 offset은 챕터별 시작 구간과 Stage별 누적 이동량을 합산한다.
- 시작 구도는 중앙 기준을 유지하고, Stage 클리어 이동은 왼쪽 방향으로 유지한다.
- 루프 품질은 smoke에서 배경 레이어 존재, 왼쪽 이동, 전환 후 위치 유지로 검증한다.

## 전투 이벤트 데이터
- `simulateExpeditionBattle` 이벤트에 다음 정보를 추가한다.
  - `sequence`: 전투 내 이벤트 순서
  - `actorId`, `actorSide`, `actorSlot`, `actorRole`, `actorLabel`
  - `targetId`, `targetSide`, `targetSlot`, `targetRole`, `targetLabel`
  - `targetHpBefore`, `targetHpAfter`, `targetMaxHp`
  - `killed`: 해당 이벤트로 대상이 사망했는지 여부
- 기존 저장 데이터 호환을 위해 새 필드는 선택값으로 검증한다.
- 기록 탭 문구는 기존 `actor → target 피해/회복` 형식을 유지하되, 처치 이벤트는 `처치`를 포함한다.

## 화면 연출
- 전투 플로트는 새로 수신된 마지막 전투 리포트 중 의미 있는 타임라인만 1회 재생한다.
- 초기 로드에 이미 저장되어 있던 과거 전투 리포트는 자동 재생하지 않는다.
- 마지막 전투 리포트의 이벤트 시간축을 압축 재생해 아군/적 HP bar가 실제 피해/회복 순서대로 변하게 한다.
- HP bar는 전투 대기 상태에서는 매 전투 풀 HP 규칙에 맞춰 100%를 표시하고, 전투 리플레이 중에만 이벤트별 `targetHpAfter/targetMaxHp`를 반영한다.
- Stage 전환 중에는 실제 승리 전투 리포트 이벤트를 사용하되, 사망한 몬스터에 반복 피해가 계속 뜨지 않게 `killed` 이벤트 이후 동일 대상 이벤트는 표시하지 않는다.
- 전투 정리중에는 사망한 몬스터가 실제 처치 순서대로 완전히 디스폰되고, 디스폰 완료 뒤에만 Stage 이동을 시작한다.
- Stage 이동 중에는 이전 Stage 몬스터를 렌더하지 않는다. 이동 완료 후 새 Stage 몬스터만 오른쪽에서 접근해 조우한다.
- 온라인 자동 전투는 `전투 정리중`, `이동중`, `조우중` 상태에서는 정산하지 않고, 몬스터 접근이 끝나 원정대가 멈춘 뒤에만 다음 전투를 시작한다.
- 온라인 자동 전투는 누적 시간이 쌓였더라도 조우 완료 뒤 한 번에 1전투만 처리해 Stage를 건너뛰지 않는다.
- 자동 전투 가능 여부는 원정대 화면이 있을 때 `.expedition-scene[data-combat-ready]`의 실제 표시 상태를 기준으로 판단해, 디버그 대원 추가처럼 원정대 화면을 뒤늦게 여는 경로에서도 전투가 멈추지 않게 한다.
- 몬스터 이동 프레임은 한 순간에 4장 중 1장만 보이게 한다. 여러 프레임이 동시에 opacity 1로 쌓이면 몬스터 본체가 흐려져 보이므로 smoke 실패로 본다.
- 전투 플로트는 몬스터/원정대원 본체보다 앞에서 덮지 않는다. 위치는 타겟 근처 위쪽으로 유지하되 compact chip으로 줄이고, 전면 hit가 있으면 smoke 실패로 본다.
- 플로트는 대상 위에 배치한다.
  - 적 대상: 적 슬롯 위치 위에 피해/처치 플로트.
  - 아군 대상: 아군 슬롯 위치 위에 피격/회복 플로트.
- 플로트 안에는 `행동자 → 대상`, 수치, 처치/회복/피격 상태를 compact하게 표시한다.
- 힐은 초록, 아군이 받은 피해는 붉은 피격, 적이 받은 피해는 노란 피해, 처치는 강조 색으로 구분한다.
- 접근성용 aria label에 전체 문장을 남긴다.

## 검증
- `react:expedition-smoke`
  - 전투 플로트가 렌더되고, `data-actor`, `data-target`, `data-target-side`, `data-killed`를 가진다.
  - 플로트가 무한 반복 animation을 쓰지 않는다.
  - 플로트 타겟이 적/아군 중 하나로 식별된다.
  - 전투 리플레이 중 적 HP bar와 아군 HP bar가 실제 이벤트 결과로 감소한다.
  - 몬스터별 visible sprite frame이 정확히 1개인지 검사한다.
  - 전투 플로트가 몬스터 스프라이트 전면을 가리지 않는지 검사한다.
  - 전투 정리중 처치된 몬스터가 이동 시작 전에 opacity 0까지 디스폰되는지 검사한다.
  - Stage 이동 중 이전 Stage 몬스터 DOM/프레임이 남지 않는지 검사한다.
  - 온라인 자동 전투가 정리/이동/조우 중에 새 전투 리포트나 Stage 진행을 만들지 않는지 검사한다.
  - 조우가 끝난 뒤 자동 전투가 다시 재개되는지 검사한다.
  - 재개된 자동 전투가 한 번에 정확히 1개 Stage만 처리하는지 검사한다.
  - 디버그 `대원 후보 +5` 경로에서 원정대 화면을 연 뒤 라이브 자동 전투가 최소 2개 Stage를 진행하는지 검사한다.
  - 배경 왼쪽 이동과 전환 후 위치 유지 검증을 유지한다.
- `react:expedition-rules-smoke`
  - 전투 이벤트에 actor/target side, slot, HP before/after, killed 필드가 포함되는지 검사한다.
  - 힐러 회복과 개별 몬스터 참여 검증을 유지한다.
- 최종 전수검사는 `npm run react:verify`, `git diff --check`로 수행한다.

## 검증 결과
- `npm run react:expedition-smoke`: 통과.
- `npm run react:expedition-rules-smoke`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력되며 공백 오류는 없다.

## 문서
- 구현 후 `/implementations/expedition-combat-visual-polish/implementation.md`를 작성한다.
- 기존 `expedition-stage-transition-motion` 구현 문서에도 배경 seam/챕터 offset 변경을 반영한다.
