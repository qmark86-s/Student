# React/Vite 학생 교육 탭 패리티 보강

## 개요
- 학생 교육 탭의 카드 행 크기와 typography를 기존 HTML `.education-row` 기준으로 맞췄다.
- React 카드가 원본보다 높고 넓은 버튼, 초록색 굵은 설명 텍스트로 표시되던 차이를 제거했다.
- 교육 업그레이드 기능, 비용 표시, 잠금/비활성 상태는 기존 React 구현을 유지했다.

## 변경 파일
- `src/react/styles.css`
  - `.education-list` gap을 8px로 변경했다.
  - `.education-action-card`를 원본과 같은 flex 행, 62px min-height, 9px padding, 8px radius로 조정했다.
  - `.education-action-main`의 텍스트 폭, strong 16px/700, 설명 11.52px/400 회색을 원본 기준으로 맞췄다.
  - `.education-upgrade-button`을 74x34px, 8px radius, 12.16px/900으로 맞췄다.
  - 모바일 media override에서 교육 카드/버튼을 다시 키우던 규칙을 제거했다.
- `plans/react-vite-student-education-tab-parity/plan.md`
  - 작업 목표, 구현 범위, 검증 기준을 기록했다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:education-smoke`: 성공, `REACT_VITE_EDUCATION_SMOKE_OK`
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

## 패리티 결과
- `student-교육` visual diff: `33.2367%`에서 `2.0041%`로 감소했다.
- `student-교육` mean absolute diff: `7.851`에서 `0.3603`으로 감소했다.
- 원본/React computed style 비교에서 390x844 기준 목록 높이 703px, 카드 높이 71px, gap 8px, 버튼 74x34px, 설명 텍스트 11.52px/400이 일치한다.

## 확인 산출물
- `artifacts/react-vite-interactive-parity/student-교육-snapshot.png`
- `artifacts/react-vite-interactive-parity/student-교육-react.png`
- `artifacts/react-vite-interactive-parity/report.json`
