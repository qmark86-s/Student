# React/Vite 목표 완료 감사 구현

## 목적
- 기존 HTML과 React/Vite를 함께 열고 클릭해 비교한 범위를 요구사항별 증거 매트릭스로 정리했다.
- full gate가 통과하더라도 어떤 UI 표면을 직접 증명했는지 사람이 빠르게 확인할 수 있게 했다.

## 변경 내용
- `tools/react-vite-goal-completion-audit.mjs`
  - full parity gate, interactive parity, deep parity, responsive audit, 원정대 규칙 smoke report를 읽는다.
  - 학생 7개 탭, 원정대 탭/조작, 상점/설정/디버그, 8개 viewport, 원정대 상태 규칙, 문서 존재를 요구사항별로 검사한다.
  - 결과를 `artifacts/react-vite-goal-completion-audit/report.json`과 `matrix.md`로 저장한다.
- `package.json`
  - `react:goal-audit` 명령을 추가했다.
  - `react:completion-gate` 명령을 추가해 full parity를 새로 실행한 뒤 goal audit를 이어서 실행하게 했다.
- `plans/react-vite-goal-completion-audit/plan.md`
  - 감사 목적과 검증 기준을 기록했다.
- `docs/react-vite-parity-migration.md`
  - 새 명령, 입력 산출물, 결과 산출물, 원정대 2열 그리드 해석 기준을 추가했다.

## 검증
- `node --check tools/react-vite-goal-completion-audit.mjs`: 성공
- `npm run react:goal-audit`: 성공
  - `status: pass`
  - `items: 8`
  - `failures: 0`

## 유지보수 기준
- React/Vite 목표 완료 여부를 검토할 때는 stale artifact를 피하기 위해 `react:completion-gate`를 실행한다.
- 원정대 전투/성장/파티 슬롯은 정확한 행 패턴을 검사하고, 후보/관리 목록은 인원 수가 늘어날 수 있으므로 2열 그리드 유지 여부를 검사한다.
- live animation과 글리프 rasterization 잔차는 selector/state/rect/style 증거와 함께 해석한다.
