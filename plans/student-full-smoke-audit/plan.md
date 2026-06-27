# 학생 탭 전수검사 및 스모크 안정화 계획

## Summary
- 학생 장비 전환과 N수 선택 크래시 대응 이후 학생 탭, 전투, 상점, 원정대, 모바일 반응형 흐름을 공식 검증 명령으로 전수 확인한다.
- 실패가 기능 회귀인지 검증 도구의 구 기준인지 구분하고, 실제 회귀는 코드로 고치고 구 기준은 현재 React 구조에 맞게 갱신한다.
- 현재 공식 검증 표면은 `npm run verify:mobile`이며, 예전 HTML snapshot parity 스크립트는 archive 도구로 남아 있지만 `package.json` 실행 스크립트에서는 제외된 상태다.

## Implementation
- `git status --short`로 dirty 범위를 확인하고, 기존 부동산/빌드/문서 변경은 되돌리지 않는다.
- `npm run verify`, `npm run mobile:smoke`, `npm run career:smoke`, `npm run visual:smoke`, `npm run retake:smoke`를 실행한다.
- `visual:smoke`가 구 학습도우미/구 원정대 CSS atlas 기준을 참조하면 현재 장비/이미지 프레임 DOM 기준으로 갱신한다.
- `retake:smoke`는 QA 전투 자동 진행을 멈춘 상태에서 DEBUG 완료 버튼으로 한 조우씩 진행하게 만든다.
- 교과 공격 VFX처럼 실제 화면 회귀가 발견되면 smoke 기준을 낮추지 않고 런타임 CSS를 수정한다.
- 긴 `verify:mobile` 체인에서 대형 PNG와 앱 첫 렌더 준비가 늦어지는 경우를 고려해, 이미지/앱 readiness timeout은 늘리되 이미지 로드와 `.phone-frame` 렌더 확인 자체는 유지한다.
- 부동산 상세 지도는 기본 배율에서 pan 범위가 0이므로, 스모크는 확대가 적용된 뒤 드래그 pan 변화를 검사한다.
- 최종적으로 `npm run verify:mobile`, 레거시 문구 검색, fallback 검색, `git diff --check`를 통과시킨다.

## Verification
- `npm run verify:mobile`
- `rg -n "\?\?|fallback|Fallback|unknown" src/react`
- `rg -n "로봇|학습 도우미|robot_gacha|robot-helper|student-동료" src/react tools README.md docs/react-vite-parity-migration.md`
- `git diff --check`
