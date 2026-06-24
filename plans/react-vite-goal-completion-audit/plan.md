# React/Vite 목표 완료 감사 계획

## 목적
- React/Vite 이식 목표의 완료 판단을 단순 명령 성공이 아니라 요구사항별 증거 매트릭스로 남긴다.
- 기존 HTML snapshot과 React/Vite를 함께 열고 누른 자동 비교 범위를 사람이 바로 확인할 수 있게 한다.
- 최신 사용자 요청인 원정대 동료 비일렬 배치는 원본 HTML과 다른 의도된 기준으로 분리해 기록한다.

## 작업
1. full parity, interactive parity, deep parity, responsive audit, 원정대 규칙 smoke report를 읽는다.
2. 학생 탭 7개, 원정대 탭/조작, 상점/설정/디버그, 해상도, 금지 대체 토큰, 문서 존재를 요구사항 단위로 검사한다.
3. 결과를 `artifacts/react-vite-goal-completion-audit/report.json`과 `matrix.md`로 저장한다.
4. `package.json`에 `react:goal-audit`와 `react:completion-gate` 명령을 추가한다.
5. 검증 후 구현 문서와 마이그레이션 문서를 최신화한다.

## 검증 기준
- full gate는 `status: pass`, `failures: []`, `completionEvidence` 10개 모두 pass여야 한다.
- interactive parity는 23개 시나리오가 모두 존재하고 failures/state/rect/selector diff가 0이어야 한다.
- 학생 탭은 `성장`, `시험`, `동료`, `직장`, `교육`, `결과`, `도감` 라벨이 모두 있어야 한다.
- 원정대는 `성장`, `파티`, `동료 관리`, `기록`, 돌파 3회, 투자, 편성 해제/편성, 잠금, 합성 조작 시나리오가 있어야 한다.
- 원정대 성장 카드처럼 5명 기준인 화면은 `2+2+1`, 후보/관리처럼 10명 이상이 될 수 있는 화면은 2열 그리드로 검사한다.
- deep parity는 상점 6개 탭, 뽑기, 설정, 디버그의 text/style/svg 기준이 통과해야 한다.
- responsive audit는 8개 viewport failure 0건이어야 한다.
- 원정대 규칙 smoke는 6개 시나리오 failure 0건이어야 한다.

## 구현 결과
- `tools/react-vite-goal-completion-audit.mjs`를 추가했다.
- `package.json`에 `react:goal-audit`, `react:completion-gate` 명령을 추가했다.
- `npm run react:goal-audit`: 통과, 8개 요구사항 항목 failure 0건.
- 완료 판단은 stale artifact를 피하기 위해 `npm run react:completion-gate`로 수행한다.
- 결과 산출물:
  - `artifacts/react-vite-goal-completion-audit/report.json`
  - `artifacts/react-vite-goal-completion-audit/matrix.md`
