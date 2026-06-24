# React/Vite 학생 동료 탭 패리티 보강 구현

## 개요

학생 `동료` 탭의 빈 상태에서 제목이 원본보다 크게 아래로 밀리던 문제를 수정했다. React의 `.companion-panel`은 `display: grid`이고 빈 상태에는 제목 header 하나만 렌더링되는데, grid row가 남는 높이를 차지하면서 header 내용이 화면 중간으로 내려가고 있었다.

## 변경 파일

- `src/react/styles.css`
  - `.companion-panel`에 `align-content: start`를 추가해 빈 상태와 목록 상태 모두 내용이 상단에서 시작되게 했다.
- `tools/react-vite-interactive-parity-audit.mjs`
  - 학생 탭이 활성인 경우 `.management-panel .section-title` rect를 `activePanelTitle`로 수집한다.
  - `activePanelTitle`은 3px 이하 오차를 허용하고, 원정대 탭은 의도된 레이아웃 차이가 있으므로 이 비교에서 제외한다.

## 검증 결과

- `npm run react:build`: 통과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `npm run react:verify`: 통과
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

## 패리티 수치

- `student-동료` visual diff: `2.357%`에서 `1.7131%`
- `student-companion-after-debug` visual diff: `2.296%`에서 `1.6521%`

## 확인 산출물

- `artifacts/react-vite-interactive-parity/student-동료-snapshot.png`
- `artifacts/react-vite-interactive-parity/student-동료-react.png`
- `artifacts/react-vite-interactive-parity/student-companion-after-debug-react.png`
- `artifacts/react-vite-interactive-parity/report.json`
