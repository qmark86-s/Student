# React/Vite 설정 모달 아이콘 패리티 구현

## 개요
- 설정 모달의 텍스트와 스타일은 이미 원본 HTML과 맞았지만, 일부 행 아이콘 SVG가 다른 도형이라 모달 icon region diff가 크게 남았다.
- 원본 HTML의 설정 행 아이콘 순서를 기준으로 React 아이콘을 교체하고, 이후 같은 문제가 다시 생기면 deep parity가 `svgDiffs`로 실패하도록 보강했다.

## 변경 내용
- `src/react/App.jsx`
  - `계정 연동`: `Users`
  - `클라우드 저장`: `Database`
  - `자동 저장`: `Smartphone`
  - `데이터 동기화`: `RefreshCw`
  - `오프라인 보상 알림`: `Bell`
  - `시험 게이트 알림`: `ScrollText`
  - `배경음`: `Volume2`
  - `효과음`: `Sparkles`
  - `진동`: `Smartphone`
  - `절전 모드`: `SlidersHorizontal`
  - `이펙트 줄이기`: `Sparkles`
  - `공지사항`: `ScrollText`
  - `도움말 / 약관`: `FileJson`
  - `저장 초기화`: `Trash2`
- `tools/react-vite-ui-parity-deep-smoke.mjs`
  - 설정 모달의 `.setting-row .setting-icon svg` signature를 snapshot/React 양쪽에서 수집한다.
  - SVG signature가 다르면 `svgDiffs`에 기록하고 deep parity failure로 처리한다.
  - `text-report.json`, `text-report-live.json`, `text-report-static.json`에서 `settings.svgDiffs`를 확인할 수 있다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:deep-parity`: 성공, failures 0건
- static animation `react:deep-parity`: 성공, failures 0건
- `npm run react:verify`: 성공
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 scan 파일 수는 0이라 no-fallback 실제 근거는 `rg` 결과를 사용

## 최신 지표
- 설정 모달 live visual diff: `0.1827%`
- 설정 모달 threshold diff: `0.1495%`
- 설정 아이콘 region diff: `0%`
- 설정 `styleDiffs`: 0건
- 설정 `svgDiffs`: 0건
- gacha live visual diff: `26.2213%`
- gacha static visual diff: `0.4866%`

## 유지보수 기준
- 설정 행을 추가하거나 아이콘을 바꾸면 원본 HTML과 같은 의미의 SVG signature인지 먼저 확인한다.
- 설정 모달의 text/style이 같아도 `svgDiffs`가 생기면 완료로 보지 않는다.
- 아이콘 누락은 임의 대체하지 말고 명시적으로 import/연결한 뒤 deep parity를 통과시킨다.
