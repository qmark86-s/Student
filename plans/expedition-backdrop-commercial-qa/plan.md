# 원정대 배경 상용 품질 QA 보강 계획

## 목표
- 원정대 배경이 기능 검증만 통과하는 상태에서 멈추지 않고, 실제 모바일 viewport 기준 반복감까지 검사한다.
- Stage 이동 중 같은 route tile이 너무 빨리 반복되어 보이지 않도록 이동 거리와 tile 교체 주기를 조정한다.
- S1 MCP 품질 게이트가 Pillow 부재로 실행되지 못한 공백은 repo-local Node 감사로 보완한다.

## 문제
- 현재 Stage당 배경 이동 거리는 `300px`이고 tile 교체 주기는 `100 Stage`다.
- 모바일 arena 높이 기준으로 한 tile의 렌더 폭보다 누적 이동 거리가 훨씬 커져 같은 tile이 여러 번 감길 수 있다.
- 자동 검증은 source 100개와 smoke를 확인하지만, viewport 기준 반복 위험을 명시적으로 실패시키지 않는다.

## 구현
- Stage당 이동 거리를 사용자 피드백 기준인 `80px`로 낮춘다.
- route tile 교체 주기를 `25 Stage`로 낮춰 한 tile 안에서 background repeat가 보이기 전에 다음 segment로 넘어가게 한다.
- `tools/expedition-backdrop-viewport-audit.mjs`를 추가한다.
  - React 런타임 상수와 visual metadata의 tile 교체 주기를 비교한다.
  - 대표 모바일 arena 높이에서 한 tile 안 누적 이동 거리가 tile 렌더 폭을 넘지 않는지 검사한다.
  - source/tile 수, sourceMode, derived 상태, tile 다양도, 최근 smoke 캡처 존재를 확인한다.
- `visual:verify`에 원정대 배경 viewport audit을 연결한다.

## 검증
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run react:expedition-smoke`
- `npm run react:verify`
- `git diff --check`

## 완료 기준
- Stage 1 -> 2 offset은 `0 -> -80`이다.
- Stage 26은 다음 route tile로 넘어가며 offset은 `0`이다.
- 한 tile 내부 누적 이동이 모바일 대표 렌더 폭을 넘지 않는다.
- 원정대 실제 smoke에서 몬스터/대원/HP/플로트/보상 모달/배경 전환 검증이 모두 통과한다.
