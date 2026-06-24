# React/Vite 원정대 동료 레이아웃 패리티 보강

## 개요
- 원정대 파티 슬롯은 최신 사용자 요청에 따라 5개 일렬 배치를 금지하고 3+2 그리드로 유지했다.
- 원정대 전투 장면의 동료 sprite도 한 줄처럼 보이지 않도록 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 좌표를 재배치했다.
- 원정대 성장/파티 후보/동료 관리 카드 목록도 5명이 세로 한 줄 리스트로 늘어서지 않도록 2열 카드 그리드로 바꿨다.
- 동료 관리 카드에서 `잠금` 버튼이 카드 그리드 흐름에 밀려 세로로 늘어나고 글자가 줄바꿈되던 문제를 수정했다.
- 동료 관리 카드의 상태 배지와 잠금 버튼 위치를 명시 배치하고, 잠금 버튼 전용 색상이 공용 보조 버튼 색상에 덮이지 않도록 우선순위를 보강했다.

## 변경 파일
- `src/react/styles.css`
  - `.expedition-party-visual`과 `.expedition-unit-avatar.large.unit-*` 좌표를 뒤 2명, 중간 2명, 앞 리더 1명의 편대 기준으로 조정했다.
  - `.expedition-growth-list`, `.expedition-roster-list`, `.expedition-manage-list`를 2열 grid로 변경했다.
  - `.expedition-growth-card`, `.expedition-roster-card`, `.expedition-manage-card.expedition-manage-member`를 2열 카드 그리드에 맞게 압축했다.
  - `.expedition-manage-card.expedition-manage-member`를 2열/3행 grid로 변경했다.
  - `.expedition-manage-member .expedition-member-portrait`, `.expedition-member-main`, `.expedition-manage-status`, `.compact`의 grid 위치를 명시했다.
  - `.expedition-manage-member .compact span`에 줄바꿈 방지 규칙을 추가하고 잠금 버튼을 카드 하단 전체 폭으로 배치했다.
  - 공용 버튼 규칙 뒤에 `.secondary-action.compact.expedition-lock-button` 색상 규칙을 추가했다.
- `tools/react-vite-responsive-audit.mjs`
  - 원정대 전투 장면 동료 sprite 세로 밴드 분포를 읽는 `readExpeditionBattleUnitLayout` 검사를 추가했다.
  - 세로 밴드가 3개 미만이거나 한 밴드에 3명 이상 잡히면 실패하도록 `expedition-battle-unit-layout` 실패 항목을 추가했다.
  - 동료 전체 세로 폭이 52px 미만이면 실패하게 했다.
  - 성장/파티 후보/동료 관리 카드 5개가 `2+2+1` 행 분포가 아니면 실패하도록 `expedition-*-card-layout` 검사를 추가했다.

## 의도된 차이
- snapshot 원본 HTML 캡처는 원정대 파티 슬롯이 5열처럼 보일 수 있다.
- React/Vite 기준은 사용자 요청을 우선하여 모든 검증 폭에서 3+2 배치를 유지한다.
- 전투 장면 동료 sprite 역시 사용자 요청을 우선하여 한 줄 배치를 금지하고 리더 중심 `2+2+1` 편대를 유지한다.
- 성장/파티 후보/동료 관리 카드 역시 사용자 요청을 우선하여 세로 한 줄 리스트가 아니라 `2+2+1` 카드 그리드를 유지한다.
- 따라서 `react:interactive-parity`의 원정대 파티 화면 시각 diff에는 이 의도된 레이아웃 차이가 포함된다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:records-smoke`: 성공, 시험/직장/도감 smoke 기준 통과
- `npm run react:battle-smoke`: 성공, Battle Road smoke 기준 통과
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건, 전투 동료 세로 밴드 `2+2+1`, 카드 행 분포 `2+2+1`
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

## 확인 산출물
- `artifacts/react-vite-responsive-audit/report.json`
  - 파티 슬롯 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small`: `3+2`
- `artifacts/react-vite-responsive-audit/report.json`
  - 전투 동료 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small`: 세로 밴드 `2+2+1`
  - 성장/파티 후보/동료 관리 카드 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small`: `2+2+1`
- `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`
- `artifacts/react-vite-responsive-audit/expedition-party-slots-phone-parity.png`
- `artifacts/react-vite-responsive-audit/expedition-manage-grid-phone-parity.png`

## 2026-06-24 추가 보강
- 전투 화면 동료가 지그재그 한 줄처럼 보이지 않도록 `.expedition-unit-avatar.large.unit-*` 좌표를 다시 조정했다.
- 뒤 2명, 중간 2명, 앞 리더 1명으로 분리했다.
- `react:responsive-audit` 기준을 세로 밴드 3개 이상, 한 밴드 최대 2명, 세로 폭 52px 이상으로 바꿔 좁은 화면에서도 한 줄처럼 붙으면 실패하게 했다.

## 2026-06-24 추가 좌표 보강
- 원정대 전투 동료 좌표를 다시 조정해 같은 가로줄 3명 배치가 아니라 `2+2+1` 편대로 더 분명하게 분리했다.
- 정적 빌드 후 `npm run react:responsive-audit`를 재실행해 8개 viewport failure 0건을 확인했다.
- 최신 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`에서 전투 동료는 한 줄이나 사선 배열이 아니라 리더 중심 `2+2+1` 편대로 표시된다.

## 2026-06-24 일렬 배치 제거
- 최신 사용자 요청에 따라 원정대 전투 동료가 3명 가로줄처럼 읽히던 기존 `2+3` 행 구성을 폐기했다.
- `.expedition-unit-avatar.large.unit-*` 좌표를 뒤 2명, 중간 2명, 앞 리더 1명 구조로 재배치했다.
- `tools/react-vite-responsive-audit.mjs`의 전투 동료 검증을 세로 밴드 기반으로 변경했다.
- `npm run react:build`: 성공
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `npm run react:records-smoke`: 성공, `REACT_VITE_RECORDS_SMOKE_OK`
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용
- 확인 이미지:
  - `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`
  - `artifacts/react-vite-responsive-audit/expedition-debug-phone-narrow.png`
  - `artifacts/react-vite-responsive-audit/expedition-debug-landscape-small.png`

## 2026-06-24 최신 재검증
- 원정대 전투 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대다.
- `react:responsive-audit` 최신 리포트에서 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`다.
- `tools/react-vite-responsive-audit.mjs`는 앞줄 밴드가 리더 1명이 아니면 실패한다.
- 같은 리포트에서 파티 슬롯은 검증 대상 4개 viewport 모두 `3+2`, 성장/파티 후보/동료 관리 카드는 모두 `2+2+1`이다.
- `tools/react-vite-responsive-audit.mjs`는 `verticalBandCounts`와 `verticalBandYSpread`를 사용해 세로 밴드 3개 미만, 한 밴드 3명 이상, 세로 폭 52px 미만을 실패로 처리한다.
- `npm run react:build`: 성공
- `npm run react:records-smoke`: 성공, `REACT_VITE_RECORDS_SMOKE_OK`
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용

## 2026-06-24 리더 단독 앞줄 보강
- 사용자가 지적한 “원정대 동료 일렬 배치” 느낌을 제거하기 위해 전투 화면 좌표를 다시 조정했다.
- 기존 좌표는 검사상 `2+2+1`이었지만, 아래쪽에 3명이 몰려 가로줄처럼 읽힐 수 있었다.
- 전면 리더는 하단 HUD와 겹치지 않게 유지하고, 뒤/중간 줄을 위로 올려 뒤 2명, 중간 2명, 앞 리더 1명으로 더 분명하게 분리했다.
- `tools/react-vite-responsive-audit.mjs`에 `frontBandCount`를 추가해 앞줄 밴드가 1명이 아니면 실패하도록 보강했다.
- 최신 리포트 기준 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`이다.
- `npm run react:build`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- 확인 이미지:
  - `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`
  - `artifacts/react-vite-responsive-audit/expedition-debug-landscape-small.png`
  - `artifacts/react-vite-responsive-audit/expedition-debug-tablet-portrait.png`

## 2026-06-24 사용자 재확인 반영
- 원정대 동료는 전투장과 하단 패널 모두 일렬 배치로 되돌리지 않는다.
- `tools/react-vite-interactive-parity-audit.mjs`의 layout signature 기준 React 원정대는 다음 배치를 유지한다.
  - 전투 동료: `2+2+1 / front 1 / 65.68px`
  - 파티 슬롯: `3+2`
  - 성장 카드: `2+2+1`
  - 파티 후보/동료 관리 카드: `2열 카드 그리드`
- snapshot 원본 HTML에서 관측되는 파티 슬롯 `5` 한 줄, 성장 카드 `1+1+1+1+1` 세로 리스트, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 React 회귀 기준으로 사용하지 않는다.
- 재검증:
  - `npm run react:build`: 성공
  - `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력

## 2026-06-24 최신 비일렬 배치 재검증
- 원정대 동료는 최신 사용자 요청에 따라 전투장과 하단 패널 모두 일렬 배치로 두지 않는다.
- 전투장 배치는 `2+2+1 / front 1`, 파티 슬롯은 `3+2`, 성장 카드 5명 기준은 `2+2+1`이다.
- 파티 후보/동료 관리는 2열 카드 그리드이며, 전체 10명 seed에서 `2+2+2+2+2`로 기록되는 것은 여러 행의 2열 그리드라서 일렬 배치가 아니다.
- `react:interactive-parity`의 원정대 semantic signature 기준 성장/파티/동료 관리/기록 제목과 버튼 라벨은 snapshot/React가 일치한다.
- 최신 사용자 기준과 충돌하는 snapshot의 파티 슬롯 5열, 성장 카드 세로 리스트, 전투 `2+3`은 React 회귀 기준으로 삼지 않는다.
- `npm run react:verify`: 성공
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `npm run react:hotspot-crop`: 성공
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력

## 2026-06-24 일렬 배치 회귀 방지 보강
- 사용자가 다시 지적한 “원정대 동료 일렬 배치 금지” 기준을 검증기에 더 강하게 반영했다.
- `tools/react-vite-responsive-audit.mjs`의 `readExpeditionCompanionCardGrid`가 카드 부모의 `display`, `gridTemplateColumns`, 열 수를 함께 기록한다.
- `collectExpeditionCompanionCardGridFailures`는 성장/편성 후보/동료 관리 카드 한 행에 3개 이상 몰리거나, CSS grid 열 수가 2열을 넘으면 실패한다.
- 현재 UI 코드는 이미 `2+2+1`, `3+2`, 2열 카드 그리드를 유지하고 있어 기능 코드 변경 없이 검증 기준만 보강했다.
- 최신 `artifacts/react-vite-responsive-audit/report.json` 기준:
  - 전투 동료: `phone-narrow 2+2+1`, `phone-parity 2+2+1`, `tablet-portrait 2+2+1`, `landscape-small 2+2+1`
  - 앞줄: 모든 검증 viewport에서 `frontBandCount=1`
  - 파티 슬롯: 모든 검증 viewport에서 `3+2`
  - 성장/편성 후보/동료 관리: 모든 검증 viewport에서 `2+2+1`, `gridColumnCount=2`
- 검증:
  - `npm run react:verify`: 성공
  - `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력
  - `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이라 no-fallback 실제 근거는 `rg` 결과를 사용

## 2026-06-24 쐐기형 편대 보정
- 사용자가 다시 지적한 “원정대 동료를 저렇게 일렬로 배치하지 말라”는 기준을 전투장 sprite 좌표에 직접 반영했다.
- 기본 좌표뿐 아니라 `width <= 430px`, `width <= 390px` media query 좌표도 함께 수정했다. 이전에는 기본 좌표를 바꿔도 모바일 캡처에서 media query가 예전 좌표로 덮어 실제 화면이 다시 줄처럼 보일 수 있었다.
- 전투장 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 구조를 유지하되, 좌우 위치를 번갈아 배치한 쐐기형 편대로 조정했다.
- `tools/react-vite-responsive-audit.mjs`는 `.expedition-unit-avatar.large`의 `centerX`, `centerY`, `horizontalCenterSpread`를 기록하고, 좌우 spread가 94px 미만이면 실패한다.
- 최신 `artifacts/react-vite-responsive-audit/report.json` 기준 전투 동료는 `phone-narrow 2+2+1 / front 1 / spread 97px`, `phone-parity 2+2+1 / front 1 / spread 97px`, `tablet-portrait 2+2+1 / front 1 / spread 106px`, `landscape-small 2+2+1 / front 1 / spread 106px`로 확인했다.
- 확인 이미지 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`에서 원정대 동료가 대각선 한 줄이 아니라 좌우가 번갈아 놓인 쐐기형 편대로 표시된다.
- 재검증:
  - `npm run react:build`: 성공
  - `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
  - `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
  - `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
  - `npm run react:verify`: 성공
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력

## 2026-06-24 full parity 및 정책 게이트 재확인
- `npm run react:full-parity`: 성공
- `artifacts/react-vite-full-parity-gate/report.json` 기준 `status: pass`, `failures: []`, `completionEvidence` 9개 항목 모두 `pass`다.
- 원정대 비일렬 배치 evidence는 전투 `2+2+1 / front 1 / horizontalCenterSpread 97px`, 성장 카드 `2+2+1`, 파티 슬롯 `3+2`, 파티 후보/동료 관리 2열 카드 그리드로 기록된다.
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로와 full parity report 절대경로 기준 pass, log 분류 `fallback: 0`.

## 2026-06-24 길 접지와 개별 리듬 보강
- 사용자가 지적한 “동료들이 길 밖 오브젝트 위에 떠 보이는” 문제를 기준화했다.
- 전투 동료의 최소 발 위치는 `minimumFootPercent >= 64`로 검사한다.
- 최신 responsive report 기준 발 하한은 `phone-narrow 67.06%`, `phone-parity 68.49%`, `tablet-portrait 67.66%`, `landscape-small 65.73%`다.
- 기존 `2+2+1`, front 1, 좌우 spread 94px 이상 기준은 유지한다.
- 길 접지를 우선하면서 세로 spread 하한은 20px로 조정했다. 행 분포 자체는 `verticalBandCounts`와 `frontBandCount`로 계속 검사한다.
- 다섯 동료가 하나처럼 움직이지 않도록 `expeditionUnitRhythm`, 4프레임 이미지 순환, spark delay를 슬롯별로 다르게 지정했다.
- 최신 검증은 `npm run react:build`, `npm run react:responsive-audit`, `npm run react:expedition-smoke`, `src/react` 금지 문자열 검색, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.
