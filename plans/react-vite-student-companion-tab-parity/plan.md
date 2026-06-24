# React/Vite 학생 동료 탭 패리티 보강 계획

## 목표
- 학생 `동료` 탭 빈 상태의 제목과 카운터가 원본 HTML처럼 하단 탭 바로 아래에서 시작하게 한다.
- React의 빈 `companion-panel`이 남는 높이를 grid row로 늘려 제목이 화면 중간으로 밀리던 문제를 제거한다.
- DEBUG 이후 동료 탭을 다시 열었을 때도 학생 동료 패널 위치가 원본 기준을 유지하게 한다.
- 같은 회귀를 잡기 위해 interactive parity가 학생 관리 패널 제목 rect를 비교하게 한다.

## 구현 범위
1. `src/react/styles.css`의 `.companion-panel`에 `align-content: start`를 추가한다.
2. `tools/react-vite-interactive-parity-audit.mjs`의 rect 수집에 학생 관리 패널 `.section-title` 위치를 추가한다.
3. 제목 rect 비교는 학생 탭에만 적용하고 3px 이하 렌더링 오차는 허용한다.
4. 원정대 탭은 사용자 요청으로 원본과 의도적으로 달라진 카드/편대 배치를 유지하므로 이 제목 rect 비교 대상에서 제외한다.

## 검증 기준
- `npm run react:build`
- `npm run react:interactive-parity`
- `npm run react:verify`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`
- `artifacts/react-vite-interactive-parity/student-동료-react.png` 시각 확인
- `artifacts/react-vite-interactive-parity/student-companion-after-debug-react.png` 시각 확인

## 2026-06-24 결과
- `student-동료` visual diff가 `2.357%`에서 `1.7131%`로 감소했다.
- `student-companion-after-debug` visual diff가 `2.296%`에서 `1.6521%`로 감소했다.
- `react:interactive-parity`는 학생 관리 패널 제목 rect 비교를 포함해 23개 조작 시나리오 failure 0건을 유지한다.
- `react:verify` 전체 통과를 확인했다.
