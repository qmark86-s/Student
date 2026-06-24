# React/Vite 원정대 동료 길 접지와 리듬 보강 계획

## 목표
- 원정대 전투 화면의 5명 동료가 배경 길보다 위쪽 건물/펜스 영역에 서 있는 것처럼 보이지 않게 발 위치를 아래로 보정한다.
- 기존 사용자 기준인 전투 동료 `2+2+1`, 앞줄 리더 1명, 하단 원정대 메뉴/카드 비일렬 배치는 유지한다.
- 5명 동료가 하나의 덩어리처럼 같은 타이밍으로 움직이지 않도록 슬롯별 보행 프레임, 미세 이동, 이펙트 타이밍을 다르게 한다.
- React/Vite 검증에서 길 접지 하한과 슬롯별 모션 다양성을 실패 조건으로 기록한다.
- 개발 중 fallback 금지 기준을 유지하고, 누락된 자산은 기존 명시 오류 정책을 그대로 사용한다.

## 구현 범위
1. `.expedition-unit-avatar.large.unit-*`의 Y 좌표를 보정해 뒤/중간 동료의 발이 전투장 하단 길 영역에 걸치게 한다.
2. 기존 `2+2+1` 편대는 유지하되, 세로 간격 기준은 길 접지 우선으로 현실적인 하한으로 조정한다.
3. `.expedition-party-visual.running .expedition-unit-avatar.large`에 슬롯별 CSS 변수 기반 리듬 애니메이션을 추가한다.
4. `.expedition-unit-frame.frame-*` 4장 이미지가 슬롯별 delay/duration에 따라 순환되도록 opacity keyframes를 추가한다.
5. spark 이펙트도 슬롯별 delay/duration을 따르게 한다.
6. `tools/react-vite-responsive-audit.mjs`에 동료 발 하한 percent와 모션 signature 검사를 추가한다.
7. `tools/react-vite-full-parity-gate.mjs`의 원정대 layout 기준을 새 responsive 기준과 맞춘다.
8. 관련 구현 문서와 React parity 문서를 최신화한다.

## 검증 기준
- `npm run react:build`
- `npm run react:responsive-audit`
- `npm run react:expedition-smoke`
- `npm run react:interactive-parity`
- `npm run react:full-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`
- `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png` 눈검사에서 동료 발이 길 영역에 있고, 5명이 같은 덩어리처럼 보이지 않는지 확인한다.

## 2026-06-24 구현 결과
- 원정대 전투장 동료 좌표를 다시 내려, 뒤줄 동료의 발도 펜스/상자 영역이 아니라 길 영역에 걸치도록 조정했다.
- `react:responsive-audit`의 전투 동료 발 하한 기준을 `minimumFootPercent >= 64`로 올렸다.
- 전투 동료 세로 분포는 `2+2+1`, 앞줄 리더 1명, 좌우 spread 94px 이상을 유지한다.
- 동료 5명은 `expeditionUnitRhythm`을 공유하되 슬롯별 duration/delay/step 값을 다르게 가져가며, 4프레임 이미지도 서로 다른 delay로 순환한다.
- 최신 responsive 리포트 기준:
  - `phone-narrow`: `2+2+1`, 발 하한 `67.06%`, 리듬 duration 5종
  - `phone-parity`: `2+2+1`, 발 하한 `68.49%`, 리듬 duration 5종
  - `tablet-portrait`: `2+2+1`, 발 하한 `67.66%`, 리듬 duration 5종
  - `landscape-small`: `2+2+1`, 발 하한 `65.73%`, 리듬 duration 5종
- `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`와 `expedition-debug-landscape-small.png`에서 동료가 길 위로 내려온 것을 확인했다.

## 2026-06-24 검증 결과
- `npm run react:build`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: 절대경로 호출 기준 pass
- `npm run react:interactive-parity`: 현재 별도 부동산 debug/log snapshot 차이로 실패한다. 이번 원정대 동료 좌표/리듬 변경의 selector diff는 0건이며, 해당 차이는 후속 기준 정리 대상으로 남긴다.
