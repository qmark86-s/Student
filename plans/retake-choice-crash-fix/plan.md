# N수 선택 크래시 대응 계획

## Summary
- `N수 선택` 클릭 자체는 최신 live 신규 세이브에서 정상 동작하지만, 장비 전환 이후 일부 legacy save가 최신 v4 검증을 통과하지 못해 앱이 종료된 것처럼 보일 수 있다.
- schema 1처럼 원정대, 부동산, road, battle, avatarGender가 없던 저장 데이터를 명시적으로 v4 구조로 승격한다.
- legacy migration은 과거에 없던 필드만 보강하고, 존재하지만 잘못된 데이터는 기존 검증으로 드러나게 유지한다.
- 2026-06-27 추가 확인: `http://127.0.0.1:5173/?qaTools=1`에서 신규 저장, 설정 UI 저장 초기화, 결과 탭 스크롤 후 `N수 선택`, 리로드 경로는 Playwright 재현에서 정상이다. 사용자 브라우저에서만 하얀 화면이 나는 경우를 위해 React 렌더 예외를 화면에 드러내는 가드를 추가한다.
- 렌더 가드 보강 후 `2수 / korean` 교과 VFX 토큰 풀이 없어 렌더 예외가 나는 실제 원인을 확인했다. N수 및 시험 조우의 교과 VFX 커버리지를 데이터와 검증 스크립트에서 보강한다.

## Implementation
- `src/react/game/save.js`
  - legacy current 보강 헬퍼를 추가한다.
  - 누락된 `road`는 현재 학년/결과 대기 상태를 기준으로 생성한다.
  - 결과 대기 중인데 완료 전투가 없는 legacy save는 결과 화면을 유지할 수 있도록 완료된 수능 전투 스냅샷을 생성한다.
  - schema 1~3 migration에서 누락된 `expedition`, `realEstate`, `careerAlumni`, `equipment`을 v4 기본 구조로 승격한다.
- `tools/react-vite-save-smoke.mjs`
  - schema 1 결과 대기 save가 v4로 마이그레이션되고, 결과 탭에서 `N수 선택` 후 앱이 살아 있고 N수 전투로 전환되는지 검사한다.
- `src/react/App.jsx`
  - 최상위 `GameApp` 렌더를 `RenderGuard`로 감싼다.
  - 렌더 예외가 발생하면 흰 화면 대신 오류 메시지, 콘솔 로그, 새 게임 재시작 버튼을 표시한다.
- `data/curriculum_attack_vfx.json`
  - N수 단계의 `korean` 토큰 풀과 초1~고2 `exam` 토큰 풀을 추가한다.
  - `requiredSubjectsByPhase`로 초등/중등/고등/N수 필수 과목 커버리지를 명시한다.
- `tools/validate-curriculum-attack-vfx.mjs`
  - 학년군별 필수 과목 토큰 풀이 없으면 `curriculum-vfx:verify`가 실패하도록 강화한다.
- live QA 확인
  - `localStorage.clear()` 직접 삭제와 설정 UI의 `저장 초기화` 버튼 경로를 모두 검사한다.
  - `N수 선택` 직후 `REPEATER`, `retakeCount=1`, 첫 N수 전투 3마리, 앱 프레임 유지, 리로드 후 저장 유지까지 검사한다.

## Verification
- `npm run curriculum-vfx:verify`
- `npm run react:build`
- `npm run react:save-smoke`
- `npm run react:battle-smoke`
- `npm run react:records-smoke`
- `npm run react:education-smoke`
- `npm run react:shop-debug-smoke`
- `npm run react:responsive-audit`
- live `http://127.0.0.1:5173/?qaTools=1` 클릭 재현
- `rg -n "\?\?|fallback|Fallback|unknown" src/react`
- `git diff --check`
