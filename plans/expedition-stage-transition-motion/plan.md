# 원정대 Stage 전환 연출 계획

## 목표
- 원정대 Stage 승리 후 화면의 현재 몬스터가 사망한 뒤 다음 Stage가 표시되게 한다.
- 현재 Stage 몬스터가 모두 처치되고 디스폰까지 끝난 것이 화면에 확인된 뒤에만 Stage 이동을 시작한다.
- Stage 전환 시 원정대원이 이동하는 느낌이 들도록 배경 이동 연출을 추가한다.
- 다음 Stage 몬스터가 조우하면 원정대 이동 모션을 멈춰, 몬스터를 만나 멈춘 느낌을 만든다.
- 현재 전환 시간은 4초로 둔다.

## 구현 방향
- 저장/전투/보상 판정은 기존 즉시 처리 구조를 유지한다.
- React 표시 계층에서 Stage 증가를 감지하면 이전 Stage 화면을 유지하고, 전투 리포트의 처치 순서와 사망/디스폰 animation이 끝난 뒤에만 4초 Stage 이동을 시작한다.
- Stage 이동 중에는 이전 Stage 몬스터를 렌더하지 않는다. 마지막 전투 리포트의 `enemyHp`와 `enemyDefeatOrder`는 전투 정리 구간에서만 이전 Stage 몬스터의 개별 HP와 사망 class에 사용한다.
- 전투 정리 중에는 파티가 기존 이동 프레임을 제자리에서 재생하는 `combat` 상태로 보이고, 전환 중에는 arena 배경을 왼쪽으로 이동시키며 `running` 상태로 원정대원이 앞으로 이동하는 느낌을 만든다.
- 전환 후에는 Stage 번호와 챕터 번호 기반 배경 offset을 유지해 배경이 원래 위치로 튀어 돌아가지 않게 한다.
- 다음 Stage 몬스터 접근은 전환 중 미리 렌더하지 않고, 이동 완료 후 별도 `encounterIntro` 상태에서 재생한다. 이때 파티는 `standing`으로 잠깐 멈춰 몬스터와 조우한 느낌을 만든 뒤 전투/대기 `combat` 루프로 돌아간다.
- 원정대 배경 PNG는 긴 가로 파노라마로 보고, 짧은 Stage 이동에는 repeat-x 루프를 허용한다.
- 좌우 루프 seam은 생성 로직에서 블렌딩해 현재 PNG와 이후 재생성 결과가 같은 품질 기준을 따르게 한다.
- 전투 정리, 전환, 조우 중 `돌파` 버튼과 온라인 자동 전투는 `combatReady`가 false인 동안 대기해 같은 시각 중복 전투와 조우 전 전투 시작을 막는다.
- 온라인 자동 전투는 조우 완료 뒤에도 한 번에 1전투만 처리해 Stage를 건너뛰지 않는다.

## 검증 기준
- `react:expedition-smoke`에서 Stage 클리어 직후 `전투 정리중` 상태, 사망 몬스터 class, 처치 순서/delay, 전투 플로트, 버튼 비활성을 확인한다.
- `react:expedition-smoke`에서 모든 몬스터 처치/디스폰 연출이 끝난 뒤 이동이 시작되는지 확인한다.
- `react:expedition-smoke`에서 이동 중 이전 Stage 몬스터 DOM/프레임이 0개인지 확인한다.
- `react:expedition-smoke`에서 배경 이동 offset이 `from > to`인 왼쪽 이동인지 확인한다.
- `react:expedition-smoke`에서 이동 완료 후 2.95초 조우 접근 상태가 별도로 재생되는지 확인한다.
- `react:expedition-smoke`에서 파티가 전투 정리/대기 중에는 combat, 이동 중에는 running, 조우 중에는 standing인지 확인한다.
- `react:expedition-smoke`에서 `combatReady`가 false인 동안 자동 전투가 Stage와 전투 리포트를 추가 진행하지 않고, 조우 후에도 1전투만 처리하는지 확인한다.
- `react:expedition-rules-smoke`는 기존 상태 규칙이 깨지지 않아야 한다.
- 최종 전수검사는 `npm run react:verify`와 `git diff --check`로 수행한다.

## 남은 작업 기록 기준
- 구현 후 `/implementations/expedition-stage-transition-motion/implementation.md`에 변경 구조, 검증 결과, 남은 작업을 기록한다.
