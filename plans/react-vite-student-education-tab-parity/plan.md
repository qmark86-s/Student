# React/Vite 학생 교육 탭 패리티 보강 계획

## 목표
- 학생 교육 탭의 카드 행 높이, 간격, 텍스트 색/굵기, 버튼 크기를 기존 HTML 기준과 맞춘다.
- 교육 업그레이드 기능과 저장 동작은 유지한다.
- 신규 fallback 없이 데이터 누락은 기존 검증에서 드러나게 한다.

## 근거
- 원본 HTML `.education-row`는 390x844 기준 높이 71px, 목록 gap 8px, padding 9px, 버튼 74x34px를 사용한다.
- React `.education-action-card`는 같은 조건에서 높이 82px, 목록 gap 10px, padding 12px, 버튼 86x40px로 커져 있다.
- 원본 설명 텍스트는 회색 11.52px/400인데 React 설명 텍스트는 초록색 12.48px/950으로 표시된다.

## 구현 범위
1. `.education-list` gap을 원본과 같은 8px로 맞춘다.
2. `.education-action-card`를 원본 행과 같은 flex 기반 71px 계열 카드로 맞춘다.
3. `.education-action-main`의 strong/small typography를 원본 `.education-row strong/span` 기준으로 맞춘다.
4. `.education-upgrade-button` 크기와 disabled 색/opacity 기준을 원본 버튼과 맞춘다.
5. 상위 React/Vite 패리티 문서와 구현 문서를 갱신한다.

## 검증 기준
- `npm run react:build`
- `npm run react:education-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` pass
- `artifacts/react-vite-interactive-parity/student-교육-react.png` 시각 확인
