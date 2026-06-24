# React/Vite 원정대 동료 레이아웃 패리티 보강 계획

## 목표
- 원정대 파티 슬롯은 사용자 기준에 따라 5개 일렬 배치가 아니라 3+2 배치를 유지한다.
- 원정대 전투 장면의 동료 sprite는 5명 일렬 또는 3명 가로줄 배치가 아니라 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 보이게 한다.
- 원정대 동료 관리 카드의 초상화, 직업명, 상태 배지, 잠금 버튼이 줄바꿈이나 세로 늘어짐 없이 원본 HTML 계열 카드 구조로 보이게 한다.
- 원정대 성장/파티/동료 관리 화면의 동료 초상은 투명 배경 sprite가 카드 안에서 과하게 커지거나 박스형 배경으로 보이지 않게 한다.
- 원정대 성장/파티 후보/동료 관리 카드 목록은 5명이 세로 한 줄로 늘어서지 않고 2+2+1 카드 그리드로 보이게 한다.
- 기능 동작은 기존 원정대 스모크와 인터랙티브 패리티 기준을 유지한다.

## 구현 범위
1. `.expedition-party-slots`는 6-column grid에서 1~3번 슬롯 첫 줄, 4~5번 슬롯 둘째 줄 중앙 배치를 유지한다.
2. `.expedition-party-visual` 안의 `.expedition-unit-avatar.large`는 좌표 기반으로 뒤 2명, 중간 2명, 앞 리더 1명의 편대를 유지한다.
3. `react-vite-responsive-audit`에서 파티 슬롯 행 분포와 전투 동료 행 분포를 모두 검증한다.
4. `.expedition-manage-card.expedition-manage-member`는 2열/3행 grid로 정리한다.
5. 동료 관리 카드의 상태 배지는 텍스트 아래, 잠금 버튼은 초상 아래에 명시 배치한다.
6. 잠금 버튼은 공용 `.secondary-action.compact` 색상보다 전용 색상 규칙이 우선되게 한다.
7. 최신 요청 기준상 원본 HTML의 5열 슬롯과 다른 부분은 의도된 차이로 문서화한다.
8. `.expedition-growth-list`, `.expedition-roster-list`, `.expedition-manage-list`는 2열 그리드로 표시하고 5명 기준 2+2+1 행 분포를 유지한다.
9. `react-vite-responsive-audit`는 전투 동료가 세로 밴드 3개 이상, 한 밴드 최대 2명, 충분한 세로 폭을 가지는지 검증한다.

## 검증 기준
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:battle-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `artifacts/react-vite-responsive-audit/report.json`에서 원정대 파티 슬롯 행 분포가 `3+2`인지 확인한다.
- `artifacts/react-vite-responsive-audit/report.json`에서 원정대 전투 동료 세로 밴드가 `2+2+1` 계열이고, 한 밴드에 3명 이상 몰리지 않는지 확인한다.
- `artifacts/react-vite-responsive-audit/report.json`에서 원정대 성장/파티 후보/동료 관리 카드 행 분포가 `2+2+1`인지 확인한다.
- `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-party-slots-phone-parity.png`, `expedition-manage-grid-phone-parity.png`를 눈으로 확인한다.

## 2026-06-24 추가 결과
- 전투 동료 편대는 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small`에서 세로 밴드 3개 이상으로 확인한다.
- 성장/파티 후보/동료 관리 카드는 검증 대상 4개 viewport에서 모두 `2+2+1`로 확인했다.
- 원정대 동료가 세로 한 줄 리스트로 보이던 성장/후보/관리 영역을 2열 카드 그리드로 변경했다.
- 전투 동료가 지그재그 한 줄처럼 보이지 않도록 뒤 2명, 중간 2명, 앞 리더 1명으로 분리하며, 한 세로 밴드에 3명 이상 몰리면 검증 실패로 처리한다.

## 2026-06-24 추가 수정
- 최신 사용자 요청에 따라 원정대 전투 동료가 3명 가로줄처럼 보이던 `2+3` 행 배치를 폐기했다.
- 리더 중심 `2+2+1` 편대 좌표로 재배치했고, phone/tablet/landscape 감사에서 한 줄 배치가 되지 않는지 확인했다.
- `react-vite-responsive-audit`는 이제 전투 동료를 `2+3` 고정 행으로 보지 않고, 세로 밴드 3개 이상·최대 밴드 2명·세로 폭 52px 이상 기준으로 검사한다.

## 2026-06-24 편대 확인
- 원정대 전투 동료는 일렬, 사선 한 줄, 3명 가로줄이 아니라 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대다.
- 최신 `artifacts/react-vite-responsive-audit/report.json` 기준 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`로 확인했다.
- 같은 리포트에서 파티 슬롯은 검증 대상 4개 viewport 모두 `3+2`, 성장/파티 후보/동료 관리 카드는 모두 `2+2+1`이다.
- `tools/react-vite-responsive-audit.mjs`는 실패 메시지와 리포트 필드를 `verticalBandCounts` 기준으로 맞춰, 원정대 전투 동료를 행 배치가 아닌 세로 밴드 배치로 추적한다.

## 2026-06-24 리더 단독 앞줄 보강
- 최신 사용자 요청에 따라 하단 3명이 가로줄처럼 읽히는 좌표를 다시 조정했다.
- 원정대 전투 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대여야 한다.
- `react:responsive-audit`는 `frontBandCount`를 추가로 기록하며, 앞줄 밴드가 1명이 아니면 실패한다.
- 전면 리더를 하단 HUD와 겹치게 내리지 않고, 뒤/중간 줄을 위로 올려 하단 3명 가로줄처럼 읽히지 않게 했다.
- 최신 측정값은 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`이다.
- 확인 이미지는 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-debug-landscape-small.png`, `expedition-debug-tablet-portrait.png`이다.

## 2026-06-24 사용자 재확인
- 원정대 동료는 원본 HTML의 5열 슬롯이나 전투장 `2+3`처럼 한 줄로 읽히는 배치로 되돌리지 않는다.
- 최신 `react:interactive-parity` layout signature 기준 React 원정대 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보/동료 관리 카드는 `2+2+2+2+2`로 확인했다.
- 원본 snapshot의 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 React 쪽 정답으로 삼지 않는다.
- 재검증: `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check` 통과.

## 2026-06-24 최신 비일렬 배치 기준
- 사용자의 최신 요청 기준으로 원정대 동료는 전투장과 하단 패널 모두 한 줄 배치로 만들지 않는다.
- 전투장은 `2+2+1 / front 1` 편대, 파티 슬롯은 `3+2`, 성장 카드 5명 상태는 `2+2+1`이다.
- 파티 후보/동료 관리는 2열 카드 그리드가 정답이다. 전체 10명 seed에서 `2+2+2+2+2`가 기록되면 2열 그리드의 여러 행으로 보며, 일렬 배치가 아니다.
- 원본 snapshot의 파티 슬롯 5열, 성장 카드 세로 리스트, 전투 `2+3`은 최신 사용자 요청과 충돌하므로 React 회귀 기준으로 쓰지 않는다.
- `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:hotspot-crop`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`를 통과했다.

## 2026-06-24 일렬 배치 회귀 방지 보강
- 최신 사용자 재요청에 따라 원정대 동료는 전투장, 파티 슬롯, 성장 카드, 편성 후보, 동료 관리 어디에서도 한 줄 배치로 보이면 실패로 본다.
- `tools/react-vite-responsive-audit.mjs`는 동료 카드 컨테이너가 실제 `grid`인지와 `gridTemplateColumns` 열 수가 2열 이하인지 기록한다.
- 성장/편성 후보/동료 관리 카드의 한 행 카드 수가 2개를 넘으면 `companion cards appear in one row` 실패를 낸다.
- 기존 `2+2+1`, `3+2`, `2열 카드 그리드` 기준은 유지하며, 기능 코드는 변경하지 않는다.
- 재검증 결과 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 모두 전투 `2+2+1 / front 1`, 파티 슬롯 `3+2`, 성장/편성 후보/동료 관리 `2+2+1`, 카드 grid 열 수 `2`로 통과했다.
- `npm run react:verify`, `npm run react:interactive-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.

## 2026-06-24 쐐기형 편대 보정
- 사용자의 최신 지적에 따라, 숫자상 `2+2+1`이어도 화면에서 대각선 한 줄처럼 읽히는 전투장 동료 배치를 다시 조정한다.
- 원정대 전투장 동료는 뒤 2명, 중간 2명, 앞 1명 구조를 유지하되 좌우 위치를 번갈아 배치해 일렬감이 나지 않게 한다.
- 파티 슬롯과 하단 동료 카드 목록은 기존 `3+2`, 2열 grid 기준을 유지한다.
- `react-vite-responsive-audit`는 전투 동료의 좌우 spread를 함께 기록해, 화면상 지나치게 좁게 뭉치거나 한 줄처럼 읽히는 배치를 회귀로 잡는다.
- 기본 좌표와 모바일 media query 좌표를 모두 수정해 실제 폰 캡처에서도 새 편대가 적용되게 한다.
- 완료 기준은 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 모두 `2+2+1 / front 1`, 좌우 spread 94px 이상, failure 0건이다.
- 재검증 결과 `npm run react:verify`, `npm run react:interactive-parity`, 무폴백 검색, `git diff --check`를 통과했다.

## 2026-06-24 full parity 재검증
- 최신 `npm run react:full-parity`까지 통과했다.
- full gate completion evidence 9개 항목이 모두 `pass`이고, `failures`는 0건이다.
- 원정대 비일렬 배치 증거는 전투 `2+2+1 / front 1 / horizontalCenterSpread 97px`, 성장 카드 `2+2+1`, 파티 슬롯 `3+2`, 파티 후보/동료 관리 2열 카드 그리드로 기록된다.
- `mcp__UmgMcp.project_policy_gate`는 `src/react` 절대경로와 full parity report 절대경로 기준으로 pass이며, log 분류의 `fallback` count는 0이다.
