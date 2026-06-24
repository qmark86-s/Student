# React/Vite 학생 직장 탭 패리티 보강

## 개요
- 학생 `직장` 탭의 기본 빈 상태 UI를 원본 HTML의 compact 구조에 맞췄다.
- 신규 React save의 기본 `workSlots`를 원본 HTML과 같은 5로 정렬했다.
- 기존 records smoke가 쓰는 `.work-panel`, `.work-income-card` selector는 유지했다.
- 데이터 누락을 숨기는 fallback은 추가하지 않았다.

## 변경 파일
- `src/react/game/save.js`
  - `createDefaultGameState()`의 `workSlots` 기본값을 `1`에서 `5`로 변경했다.
- `src/react/App.jsx`
  - `WorkPanel`의 직업 동료 0명 분기를 `work-panel-empty` 전용 구조로 변경했다.
  - 원본 HTML의 `income-panel`, `metric`, `secondary-action`, `empty-state` 흐름을 React에도 재현했다.
- `src/react/styles.css`
  - `work-panel-empty` 전용 요약 패널, 슬롯 확장 버튼, 빈 상태 텍스트 크기/간격/색상/opacity를 원본 computed style에 맞췄다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:records-smoke`: 성공, `REACT_VITE_RECORDS_SMOKE_OK`
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 성공, 23개 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

## 패리티 결과
- `student-직장` visual diff: `41.27%`에서 `2.0495%`로 감소
- `student-직장` mean absolute diff: `6.0049`에서 `0.3777`로 감소
- 확인 캡처:
  - `artifacts/react-vite-interactive-parity/student-직장-snapshot.png`
  - `artifacts/react-vite-interactive-parity/student-직장-react.png`

## 남은 차이
- `student-직장`의 남은 diff는 주로 상단 전투 타이머/라이브 프레임 차이에 의한 잔차다.
- 다음 우선순위는 아직 큰 차이가 남은 `student-도감`, `student-교육`, 원정대 기록/동료 관리 화면이다.
