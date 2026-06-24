# React/Vite 원정대 전용 메뉴 패리티

## 개요
- 원정대 탭은 학생 하단 메뉴가 아니라 `성장 / 파티 / 동료 관리 / 기록` 전용 메뉴를 사용한다.
- 최신 사용자 요청에 따라 원정대 동료는 전투장과 하단 패널 모두 일렬 배치로 되돌리지 않는다.
- 이번 보강은 화면 배치를 다시 바꾸지 않고, 원정대 메뉴/패널의 기능 텍스트 표면이 원본 HTML과 일치한다는 증거를 `react:interactive-parity` 리포트에 추가했다.

## 변경 파일
- `tools/react-vite-interactive-parity-audit.mjs`
  - `semanticSignatures.activePanelTitleText`를 추가해 현재 원정대 패널 제목을 기록한다.
  - `semanticSignatures.activePanelText`를 추가해 활성 관리 패널의 전체 텍스트를 기록한다.
  - `semanticSignatures.activePanelButtons`를 추가해 하단 메뉴와 패널 버튼 라벨을 기록한다.
  - `semanticSignatures.expeditionCardTexts`를 추가해 원정대 성장/파티/후보/관리/기록 카드의 주요 텍스트를 기록한다.

## 확인 결과
- 최신 `npm run react:interactive-parity` 기준 23개 시나리오 failure 0건이다.
- 원정대 성장/파티/동료 관리/기록의 `activePanelText`와 `activePanelButtons`는 snapshot/React가 일치한다.
- 대표 semantic signature:
  - 성장 제목: `출전 동료 성장 0명 투자 가능`
  - 파티 제목: `원정 파티 5/5`
  - 동료 관리 제목: `동료 관리`
  - 기록 제목: `원정 기록`
  - 하단 메뉴 버튼: `성장 / 파티 / 동료 관리 / 기록`
- 원정대의 큰 visual diff는 기능 텍스트 불일치가 아니라 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드라는 의도된 배치 차이로 분류한다.

## 검증
- `npm run react:build`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `npm run react:expedition-smoke`: 성공, `REACT_VITE_EXPEDITION_SMOKE_OK`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용
