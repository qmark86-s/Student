# React/Vite 원정대 전투 레이아웃 패리티 계획

## 목표
- React/Vite 화면에서 원정대 탭의 전투 화면 레이아웃을 학생 탭 전투 화면 기준으로 맞춘다.
- 원본 HTML 스냅샷의 전투 화면 레이아웃 수치와 구조를 참고하여 전투장 높이, 패딩, 하단 HUD, 다음 관리 패널 시작 위치가 흔들리지 않게 한다.
- 전투장 아래 하단 메뉴/관리 패널은 학생 탭 상태를 따라가지 않고 원정대 화면의 동료/편성 흐름을 유지한다.
- 누락이나 불일치를 조용히 숨기는 fallback 없이, 반응형 검증에서 수치 차이가 드러나게 한다.

## 현황
- 학생 탭 전투 화면은 `.react-battle-arena.stage-scene`과 `.pixel-arena`에서 원본 스냅샷과 같은 `clamp(226px, 30vh, 260px)` 계열 행 높이와 얇은 패딩을 사용한다.
- 원정대 탭은 `.expedition-scene`, `.expedition-arena`, `.expedition-scene-footer`에 예전 큰 원정대 패널 값이 남아 있다.
- 그 결과 원정대 전투장은 학생 탭보다 높고, 외곽 테두리/패딩/하단 진행 HUD 크기가 달라 관리 패널 시작 위치까지 어긋난다.

## 구현 범위
1. `src/react/styles.css`
   - 원정대 전투 장면의 grid row, padding, min-height, border, overflow를 학생 전투 장면과 같은 기준으로 정리한다.
   - `.expedition-arena`의 최소 높이와 테두리 두께/반경을 `.pixel-arena` 기준에 맞춘다.
   - `.expedition-scene-footer`, 진행 패널, 원정대 행동 버튼을 학생 전투장의 `.battle-arena-overlay`와 같은 밀도와 위치로 조정한다.
   - 390px 이하 모바일 미디어 쿼리에서도 학생 탭과 같은 clamp/min-height 기준을 적용한다.
2. `src/react/App.jsx`
   - 학생 모드와 원정대 모드의 하단 탭 상태를 분리한다.
   - 원정대 모드 진입 시 학생 탭의 `시험`/`성장` 선택이 새지 않고 원정대 `동료` 탭을 기본으로 사용한다.
3. `tools/react-vite-responsive-audit.mjs`
   - 학생 전투 화면과 원정대 전투 화면의 scene bottom, arena bottom, 관리 패널 top 차이를 측정한다.
   - 전투장 비교는 폰 프레임 내부 상대 좌표로 수행하여 하단 패널 콘텐츠 높이 차이를 전투장 불일치로 오판하지 않는다.
   - 원정대 전환 후 하단 활성 탭이 `동료`인지 확인한다.
   - 원본 스냅샷 기준으로 허용 가능한 작은 오차만 통과시키고, 차이가 커지면 실패하도록 한다.
4. 문서
   - 구현 완료 후 `implementations/react-vite-expedition-battle-layout-parity/implementation.md`에 변경 근거와 검증 결과를 남긴다.

## 검증 기준
- `npm run react:build`
- `npm run react:responsive-audit`
- 필요 시 `npm run react:expedition-smoke`
- 주요 viewport에서 학생/원정대 전투 화면의 다음 항목 차이가 1px 이내여야 한다.
  - scene bottom
  - arena bottom
  - footer bottom/height
  - management panel gap
- 학생 탭에서 `시험`을 본 뒤 원정대로 전환해도 하단 활성 탭은 `동료`여야 한다.
- 버튼/이미지 실패, 수평 overflow, 페이지 에러가 없어야 한다.
