# React/Vite 원정대 동료 길 접지와 리듬 보강

## 개요
- 원정대 전투 화면에서 동료들이 펜스, 상자, 가로 오브젝트 위에 떠 있는 것처럼 보이던 문제를 수정했다.
- 기존 사용자 기준인 전투장 `2+2+1` 편대, 앞줄 리더 1명, 원정대 하단 메뉴/카드 비일렬 배치는 유지했다.
- 다섯 동료가 하나처럼 같은 박자로 움직이지 않도록 슬롯별 위치, 보행 프레임 타이밍, 미세 이동 리듬, spark delay를 다르게 구성했다.

## 변경 파일
- `src/react/styles.css`
  - `.expedition-unit-avatar.large.unit-*`의 top 좌표를 아래로 이동했다.
  - 뒤줄 2명은 가장 크게 내려 길 접지감을 확보했다.
  - 중간줄 2명은 뒤줄보다 덜 내려 `2+2+1` 편대를 유지했다.
  - 앞줄 리더는 하단 전투력 HUD와 겹치지 않는 범위에서만 내렸다.
  - `--unit-motion-duration`, `--unit-motion-delay`, `--unit-frame-delay`, `--unit-spark-delay`, `--unit-step-*` 변수를 슬롯별로 다르게 지정했다.
  - `expeditionUnitRhythm` keyframes를 추가해 각 동료가 개별 리듬으로 움직인다.
  - `expeditionCompanionFrameA/B/C/D` keyframes를 추가해 React의 4장 `<img>` 프레임이 순환한다.
- `tools/react-vite-responsive-audit.mjs`
  - 원정대 전투 동료 rect에 `bottom`, `footPercent`를 기록한다.
  - `minimumFootPercent >= 64`를 실패 조건으로 추가했다.
  - 동료별 motion/frame/spark signature를 기록하고 duration/delay 다양성을 검사한다.
- `tools/react-vite-full-parity-gate.mjs`
  - responsive report의 발 하한 및 리듬 다양성 기준을 full parity gate에서도 검사한다.
  - 길 접지를 우선하기 위해 세로 spread 하한은 20px로 조정하고, `2+2+1` band count와 front 1 검사는 유지한다.

## 검증 기준
- 원정대 전투 동료는 `2+2+1` vertical band를 유지해야 한다.
- 앞줄 band는 리더 1명이어야 한다.
- 좌우 center spread는 94px 이상이어야 한다.
- 모든 핵심 viewport의 `minimumFootPercent`는 64 이상이어야 한다.
- 동료 motion duration, frame delay, spark delay는 각각 최소 4종 이상이어야 한다.
- `src/react`에는 신규 fallback 문자열이나 `??` 패턴을 추가하지 않는다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: 절대경로 호출 기준 pass

## 최신 수치
- `phone-narrow`: `2+2+1`, 발 하한 `67.06%`, 좌우 spread `98.25px`
- `phone-parity`: `2+2+1`, 발 하한 `68.49%`, 좌우 spread `98.25px`
- `tablet-portrait`: `2+2+1`, 발 하한 `67.66%`, 좌우 spread `105.5px`
- `landscape-small`: `2+2+1`, 발 하한 `65.73%`, 좌우 spread `107.25px`

## 확인 산출물
- `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`
- `artifacts/react-vite-responsive-audit/expedition-debug-landscape-small.png`

## 남은 주의점
- `npm run react:interactive-parity`는 현재 부동산 debug UI와 원정대 기록의 부동산 자금 로그가 snapshot과 달라 실패한다.
- 이번 원정대 동료 좌표/리듬 변경의 selector diff는 0건이며, 부동산 debug/log parity는 별도 후속 작업으로 정리해야 한다.
