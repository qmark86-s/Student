# 원정대 Stage 전환 연출 계획

## 목표
- 원정대 Stage 승리 후 화면의 현재 몬스터가 사망한 뒤 다음 Stage가 표시되게 한다.
- Stage 전환 시 원정대원이 이동하는 느낌이 들도록 배경 이동 연출을 추가한다.
- 1차 전환 시간은 2초로 둔다.

## 구현 방향
- 저장/전투/보상 판정은 기존 즉시 처리 구조를 유지한다.
- React 표시 계층에서 Stage 증가를 감지하면 이전 Stage 화면을 2초간 유지한다.
- 전환 중에는 이전 Stage 몬스터에 사망 class를 붙이고 HP bar를 0으로 보이게 한다.
- 전환 중에는 arena 배경을 왼쪽으로 이동시켜 원정대원이 앞으로 이동하는 느낌을 만든다.
- 전환 후에는 Stage 번호 기반 배경 offset을 유지해 배경이 원래 위치로 튀어 돌아가지 않게 한다.
- 원정대 배경 PNG는 긴 가로 파노라마로 보고, 짧은 Stage 이동에는 repeat-x 루프를 허용하되 seam 품질은 후속 작업으로 기록한다.
- 전환 중 `돌파` 버튼은 비활성화해 같은 시각 중복 입력을 막는다.

## 검증 기준
- `react:expedition-smoke`에서 Stage 클리어 직후 전환 class, 사망 몬스터 class, 버튼 비활성, 2초 뒤 Stage 반영을 확인한다.
- `react:expedition-smoke`에서 배경 이동 offset이 `from > to`인 왼쪽 이동인지 확인한다.
- `react:expedition-rules-smoke`는 기존 상태 규칙이 깨지지 않아야 한다.
- 최종 전수검사는 `npm run react:verify`와 `git diff --check`로 수행한다.

## 남은 작업 기록 기준
- 구현 후 `/implementations/expedition-stage-transition-motion/implementation.md`에 변경 구조, 검증 결과, 남은 작업을 기록한다.
