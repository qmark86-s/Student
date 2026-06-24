# React/Vite 원정대 동료 전투 배치 수정 계획

## 목표
- 원정대 전투 화면의 출전 동료 5명이 등간격 일렬로 보이지 않게 한다.
- 원본 HTML처럼 왼쪽 하단에 앞줄/뒤줄이 겹친 파티 덩어리로 읽히도록 배치한다.
- 원정대 파티 탭의 동료 슬롯은 어떤 검증 폭에서도 5개가 한 줄로 늘어서지 않고 3+2 그리드로 줄바꿈되게 한다.
- 전투 화면 레이아웃, 이미지 로딩, 모바일 폭 기준은 유지한다.

## 구현 범위
1. `ExpeditionScene`에서 이미 부여하는 `unit-1` ~ `unit-5` 클래스를 활용한다.
2. `.expedition-party-visual`의 flex row 배치를 제거하고 absolute 기반 배치로 전환한다.
3. 각 슬롯별 `left`, `bottom`, `z-index`를 지정해 높낮이와 앞뒤 깊이를 만든다.
4. 430px 이하 및 390px 이하 반응형 배치도 같은 비율로 축소한다.
5. `.expedition-party-slots`의 기본 grid column과 4/5번 슬롯 위치를 조정해 모든 폭에서 3+2 배치를 만든다.
6. `react:responsive-audit`에서 원정대 파티 탭을 직접 열고 슬롯 행 분포가 `3+2`인지 검사한다.

## 검증 기준
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `artifacts/react-vite-responsive-audit/expedition-party-slots-phone-parity.png`, `expedition-party-slots-landscape-small.png`, `expedition-party-slots-tablet-portrait.png`에서 전투 동료가 무리 배치이고, 파티 슬롯이 3+2 배치로 보이는지 확인한다.

## 2026-06-24 보강 기준
- 최신 사용자 요청에 따라 원정대 파티 슬롯은 원본 HTML의 5열 배치가 아니라 React/Vite에서 3+2가 정답이다.
- `react:interactive-parity`의 원정대 파티 시각 diff에는 이 의도된 차이가 포함될 수 있으므로, 슬롯 행 분포는 `react:responsive-audit`의 `rowCounts`와 실제 캡처를 우선 기준으로 본다.
- 동료 관리 카드의 잠금 버튼은 줄바꿈 없이 초상 아래에 위치해야 하며, 상태 배지는 직업명 아래에 표시되어야 한다.
