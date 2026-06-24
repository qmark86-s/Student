# React/Vite 원정대 동료 전투 배치 수정

## 개요
- 원정대 전투 화면에서 출전 동료들이 등간격 일렬로 보이던 배치를 수정했다.
- 동료 컨테이너를 flex row에서 absolute 슬롯 배치로 바꾸고, `unit-1` ~ `unit-5`에 각기 다른 `left`, `bottom`, `z-index`를 지정했다.
- 430px 이하, 390px 이하 반응형 구간에서도 동일하게 앞줄/뒤줄이 있는 파티 덩어리 배치가 유지되도록 좌표를 축소했다.
- 원정대 파티 탭의 슬롯 리스트는 모바일뿐 아니라 데스크톱/태블릿 검증 폭에서도 5개가 한 줄로 늘어서지 않도록 기본 배치를 3+2 그리드로 고정했다.

## 변경 파일
- `src/react/styles.css`
  - `.expedition-party-visual`의 flex 배치를 제거하고 block/absolute 배치 기준으로 변경했다.
  - `.expedition-unit-avatar.large`를 absolute 요소로 전환했다.
  - `unit-1`, `unit-3`, `unit-5`는 앞줄, `unit-2`, `unit-4`는 뒤쪽으로 살짝 올라간 위치와 z-index를 부여했다.
  - `.expedition-party-slots` 기본 grid를 6-column 기준으로 두고, 1~3번 슬롯은 첫 줄, 4~5번 슬롯은 둘째 줄 중앙에 놓이게 했다.
- `tools/react-vite-responsive-audit.mjs`
  - 원정대 파티 탭을 직접 열어 `expedition-party-slots-*.png` 캡처를 남긴다.
  - 슬롯 rect를 행별로 그룹화해 `3+2`가 아니면 실패하도록 했다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:expedition-smoke`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건, phone/landscape/tablet 파티 슬롯 행 분포 `3+2`
- `npm run react:interactive-parity`: 성공, 원정대 파티 제거/재편성 포함 failure 0건

## 시각 확인
- 확인 파일: `artifacts/react-vite-responsive-audit/expedition-party-slots-phone-parity.png`, `expedition-party-slots-landscape-small.png`, `expedition-party-slots-tablet-portrait.png`
- 결과: 원정대 전투 동료들이 수평 일렬이 아니라 왼쪽 하단에 겹친 무리 형태로 표시되고, 파티 슬롯은 검증 폭 전체에서 3+2로 줄바꿈된다.

## 2026-06-24 추가 확인
- 최신 사용자 요청 기준으로 원정대 파티 슬롯은 원본 HTML의 5열 배치가 아니라 3+2 배치를 유지한다.
- `artifacts/react-vite-responsive-audit/report.json` 기준 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 모두 슬롯 행 분포가 `3+2`다.
- `artifacts/react-vite-interactive-parity/expedition-파티-react.png`에서 1~3번 슬롯은 첫 줄, 4~5번 슬롯은 둘째 줄 중앙에 표시된다.
- 동료 관리 카드의 잠금 버튼 줄바꿈과 색상 우선순위를 정리했고, `artifacts/react-vite-interactive-parity/expedition-동료-관리-react.png`에서 버튼이 짙은 회색 단일 행으로 표시되는 것을 확인했다.
- 검증: `npm run react:build`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`.
