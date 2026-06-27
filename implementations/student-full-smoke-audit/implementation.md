# 학생 탭 전수검사 및 스모크 안정화 구현 설명서

## 개요
- 학생 장비 전환 및 N수 선택 크래시 대응 이후 공식 검증을 다시 돌렸다.
- `npm run verify`는 통과했지만, 추가 스모크 중 `visual:smoke`와 `retake:smoke`가 현재 UI 구조를 반영하지 못해 실패했다.
- 검증 도구를 현재 React DOM 기준으로 갱신하고, 실제 화면 회귀였던 교과 공격 VFX 애니메이션 덮어쓰기를 수정했다.

## 변경 사항
- `src/react/styles.css`
  - `.pixel-arena .curriculum-attack-vfx-token`에서 `animation: none`으로 덮이던 문제를 고쳐 `curriculumTokenPop` 애니메이션이 다시 실행되게 했다.
- `src/react/App.jsx`
  - 부동산 상세 지도 수치 정리 helper의 파라미터명을 검증 금지 토큰에 걸리지 않는 이름으로 바꿨다. 동작 변화는 없다.
- `tools/visual-asset-smoke.mjs`
  - 모드 전환 셀렉터를 현재 `.mode-tab` 기준으로 사용한다.
  - 스모크 저장 데이터에 장착 장비 2종과 원정대 편성 5명을 명시해 실제 장비/원정대 렌더링을 검사한다.
  - 학생 전투 보조 동료 검사를 장착 장비 오버레이 검사로 교체했다.
  - 메인 전투 적 프레임 다양성은 구 `main-monster-*` 클래스 대신 `background-position` 기준으로 센다.
  - 원정대 검사는 구 `::before` atlas 대신 실제 `.expedition-unit-frame`, `.expedition-enemy-frame` 이미지 로드와 애니메이션을 검사한다.
- `tools/retake-year-smoke.mjs`
  - `?qaTools=1&pauseAutoBattle=1`로 열어 자동 전투 진행을 멈추고 DEBUG 버튼으로 조우를 하나씩 넘긴다.
  - 적 프레임 다양성 카운트를 현재 `background-position` atlas 방식으로 갱신했다.
- `tools/react-vite-real-estate-smoke.mjs`
  - 긴 전체 검증에서 대형 PNG 로드가 늦어지는 경우를 위해 상세/도시 이미지 로드 timeout을 명시했다.
  - 상세 지도 pan 검사는 기본 배율 드래그가 아니라 확대 적용 후 드래그 변화로 검사하도록 갱신했다.
- `tools/react-vite-responsive-audit.mjs`
  - 긴 전체 검증에서 첫 앱 프레임 렌더가 늦어지는 경우를 위해 `.phone-frame` readiness timeout을 명시했다.
- `README.md`, `docs/react-vite-parity-migration.md`, `implementations/retake-choice-crash-fix/implementation.md`
  - 현재 공식 검증 표면과 통과 결과를 최신화했다.

## 검증 결과
- `npm run verify:mobile`: 통과
  - 내부 포함: `verify`, `build:web`, `mobile:smoke`, `visual:smoke`, `career:smoke`, `retake:smoke`
- `npm run react:real-estate-smoke`: 통과
- `npm run react:responsive-audit`: 통과
- `node --check tools/react-vite-real-estate-smoke.mjs`: 통과
- `node --check tools/react-vite-responsive-audit.mjs`: 통과
- `rg -n "\?\?|fallback|Fallback|unknown" src/react`: 출력 없음
- `rg -n "로봇|학습 도우미|robot_gacha|robot-helper|student-동료" src/react tools README.md docs/react-vite-parity-migration.md`: 출력 없음
- `git diff --check`: exit 0, LF/CRLF 안내 경고만 출력

## 남은 관찰 사항
- 기능 실패는 발견되지 않았다.
- Vite 빌드에서 chunk size 500KB 초과 경고가 계속 출력된다. 현재 smoke 실패는 아니지만 이후 코드 스플리팅 후보로 남길 만하다.
- 예전 `react:interactive-parity`, `react:deep-parity`, `react:full-parity` 계열 도구 파일은 archive로 남아 있으나 현재 `package.json` 실행 스크립트에는 없다. 현재 공식 전체 게이트는 `verify:mobile`이다.
