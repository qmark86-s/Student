# React/Vite 원정대 전투 레이아웃 패리티 구현

## 개요
- 원정대 탭 전투 화면을 학생 탭 전투 화면과 같은 전투장 레이아웃 기준으로 정렬했다.
- 원본 HTML 스냅샷의 전투 화면 기준처럼 scene, arena, footer HUD, management panel 시작 위치가 같은 픽셀 라인에 놓이도록 했다.
- 전투장 아래 하단 메뉴/관리 패널은 학생 탭 상태를 따라가지 않게 분리했고, 원정대 모드에서는 동료/편성 흐름을 기본으로 사용한다.
- 누락을 숨기는 fallback은 추가하지 않았고, 반응형 감사에서 레이아웃 차이를 실패로 드러내도록 했다.

## 변경 파일
- `src/react/App.jsx`
  - 기존의 단일 `activeTab`을 `studentTab`과 `expeditionTab`으로 분리했다.
  - 학생 모드에서 `시험` 탭을 보던 상태로 원정대 모드에 들어가도 하단은 원정대 `동료` 탭을 유지한다.
  - 원정대에서 직업 수락 후 진입하거나 게임을 초기화할 때도 원정대 하단 탭 기준을 `동료`로 명시한다.
  - `TabBar`에 모드별 aria-label/class를 부여해 학생 하단 메뉴와 원정대 하단 메뉴의 소유권을 구분했다.
- `src/react/styles.css`
  - `.expedition-scene`을 학생 전투장의 `.react-battle-arena.stage-scene`와 같은 grid row, padding, min-height, border 기준으로 덮어썼다.
  - `.expedition-arena`를 `.pixel-arena` 기준에 맞춰 `min-height: 226px`, 2px 녹색 테두리, 8px 반경, 동일한 shadow 밀도로 정리했다.
  - `.expedition-route-card`를 전투장 내부 작은 안내 패널 밀도로 축소했다.
  - `.expedition-scene-footer`, `.expedition-scene-run`, `.expedition-action-button`을 학생 전투 HUD와 같은 overlay 위치, column 폭, 버튼 높이, progress bar 높이에 맞췄다.
  - 390px 이하 미디어 쿼리에서 원정대도 학생 탭과 같은 `clamp(226px, 30vh, 250px)` 기준을 사용하도록 했다.
- `tools/react-vite-responsive-audit.mjs`
  - `readBattleLayoutMetrics`를 추가해 학생/원정대의 scene, arena, footer, action, management panel rect와 주요 CSS 값을 수집한다.
  - `collectBattleLayoutParityFailures`를 추가해 scene top/bottom/height, arena bottom/height, footer bottom/height, management gap, padding/border 차이가 1px을 넘으면 실패하도록 했다.
  - 비교 기준을 폰 프레임 내부 상대 좌표로 바꿔, 하단 패널 콘텐츠 높이가 달라도 전투장 자체의 위치/크기만 비교한다.
  - 학생에서 `시험` 탭을 본 뒤 원정대로 전환해도 하단 활성 탭이 `동료`인지 검증한다.

## 검증 결과
- `npm run react:build`: 성공
- `npm run react:responsive-audit`: 성공, 8개 viewport failure 0건
- `npm run react:expedition-smoke`: 성공, 원정대 동료 편성/스테이지 돌파/이미지 로딩/수평 overflow failure 0건
- `npm run react:verify`: 성공

## 수치 확인
- `artifacts/react-vite-responsive-audit/report.json` 기준 대표 viewport 결과:
  - `phone-narrow`: scene/arena/footer/management gap 차이 0px, layout failure 0건
  - `phone-parity`: scene/arena/footer/management gap 차이 0px, layout failure 0건
  - `phone-large`: scene/arena/footer/management gap 차이 0px, layout failure 0건
  - `tablet-portrait`: scene/arena/footer/management gap 차이 0px, layout failure 0건
  - 원정대 전환 후 하단 활성 탭 `동료` 확인

## 시각 확인
- 다음 스크린샷을 직접 확인했다.
  - `artifacts/react-vite-responsive-audit/battle-phone-parity.png`
  - `artifacts/react-vite-responsive-audit/expedition-layout-phone-parity.png`
  - `artifacts/react-vite-responsive-audit/battle-tablet-portrait.png`
  - `artifacts/react-vite-responsive-audit/expedition-layout-tablet-portrait.png`
- 학생/원정대 모두 전투장 높이와 하단 HUD 위치가 동일하게 보인다.
- 원정대 화면 아래는 학생 `시험` 패널이 아니라 원정대 `동료` 탭/동료 패널로 보인다.
