# React/Vite 학생 직장 탭 패리티 보강 계획

## 목표
- 학생 `직장` 탭의 기본 빈 상태 UI를 원본 HTML과 같은 compact 표면으로 맞춘다.
- 신규 React save의 기본 `workSlots`를 원본 HTML 기본값과 같은 5로 정렬한다.
- 원본의 `viewport > stack > income-panel > secondary-action > empty-state` 흐름을 React 전용 class로 재현하되, 기존 records smoke selector는 유지한다.
- 데이터 누락을 숨기는 fallback은 추가하지 않는다.

## 구현 범위
1. `createDefaultGameState()`의 `workSlots` 기본값을 5로 맞춘다.
2. `WorkPanel`의 직업 동료 0명 분기 markup을 원본 HTML에 가까운 compact 구조로 바꾼다.
3. 기존 `react:records-smoke`가 쓰는 `.work-panel`, `.work-income-card` selector는 유지한다.
4. CSS에서 `work-panel-empty` 전용 요약 패널, 슬롯 확장 버튼, 빈 상태 텍스트를 원본 크기/색상/간격으로 보정한다.

## 검증 기준
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `artifacts/react-vite-interactive-parity/student-직장-react.png`를 원본 캡처와 비교해 직장 빈 상태가 compact하게 보이는지 확인한다.
