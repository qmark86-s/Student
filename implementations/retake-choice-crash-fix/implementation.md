# N수 선택 크래시 대응 구현 설명서

## 개요
- 최신 신규 세이브에서는 `N수 선택` 클릭이 정상 동작했지만, schema 1 결과 대기 save는 장비 전환 이후 v4 검증을 통과하지 못해 앱이 닫힌 것처럼 보일 수 있었다.
- 원인은 예전 save에 `expedition`, `realEstate`, `current.road`, `current.battle`, `avatarGender`, `equipment`, `careerAlumni`가 없던 조합을 v4로 올리는 migration이 부족했던 것이다.
- 2026-06-27 live 재검사에서 신규 저장의 `N수 선택`은 정상 진입했지만, 렌더 가드와 save smoke 보강 중 `2수 / korean` 교과 VFX 토큰 풀이 누락된 실제 렌더 오류를 확인했다. 이 오류는 N수 전투에서 국어 과목 적이 화면에 그려질 때 흰 화면으로 보일 수 있다.

## 변경 사항
- `src/react/game/save.js`
  - schema 1~3 legacy save를 v4 구조로 승격하는 helper를 추가했다.
  - 누락된 legacy `current.road`는 학년/결과 대기 상태 기준으로 생성한다.
  - 결과 대기 legacy save에 완료된 `current.battle`이 없으면 수능 최종 조우 기준의 완료 battle snapshot을 생성한다.
  - outcome과 career candidate의 누락된 `avatarGender`, `forcedArchiveAvailable`, `careerSelectableCount`를 legacy migration 단계에서 채운다.
  - 원정대/부동산이 없던 save는 기본 구조를 명시 생성하고, 현재 schema의 잘못된 필드는 기존 검증 실패로 드러나게 유지한다.
- `tools/react-vite-save-smoke.mjs`
  - schema 1 결과 대기 save를 주입한 뒤 v4 migration, 결과 탭 렌더링, `N수 선택` 클릭, 첫 N수 전투 진입, close/crash 0건을 검사한다.
- `src/react/App.jsx`
  - `RenderGuard`를 추가해 런타임 렌더 예외가 흰 화면으로 끝나지 않고 오류 화면과 콘솔 스택으로 드러나게 했다.
- `data/curriculum_attack_vfx.json`
  - 1수, 2수, 장수, N수에 `korean` 토큰 풀을 추가했다.
  - 초1~고2에 `exam` 토큰 풀을 추가해 Battle Road 12월 보스가 모든 학년군에서 토큰을 찾을 수 있게 했다.
  - `requiredSubjectsByPhase`와 한글 help를 추가해 학년군별 필수 교과 커버리지를 데이터에 명시했다.
- `tools/validate-curriculum-attack-vfx.mjs`
  - 학년군별 필수 과목 커버리지를 검증한다. social은 기존 `inquirySubjectAliases` 기준으로 science 풀이 있으면 커버된 것으로 본다.
  - 같은 누락이 다시 생기면 `curriculum-vfx:verify`에서 실패한다.
- `tools/react-vite-save-smoke.mjs`
  - 설정 UI의 `저장 초기화` 버튼으로 fresh save를 만든 뒤 수능 완료, 결과 탭, `N수 선택`, 리로드 유지까지 확인하는 시나리오를 추가했다.
- `README.md`, `docs/react-vite-parity-migration.md`, `implementations/student-equipment-rework/implementation.md`
  - v4 save 기준, 2슬롯 장비 기준, legacy 결과 대기 migration 기준을 최신화했다.

## 검증 결과
- live `http://127.0.0.1:5173/?qaTools=1`: 설정 UI 저장 초기화 후 수능 완료, 결과 탭, `N수 선택` 클릭, `REPEATER / retakeCount=1 / 첫 N수 전투 3마리`, 콘솔/페이지 오류 0건
- `npm run curriculum-vfx:verify`: 통과, `grades=16 pools=85 tokens=495 styles=5`
- `npm run react:build`: 통과
- `npm run react:save-smoke`: 통과, fresh save `N수 선택` 및 리로드 유지 포함
- `npm run react:battle-smoke`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:education-smoke`: 통과
- `npm run react:shop-debug-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failures 0건
- `npm run verify:mobile`: 통과, `verify`, `build:web`, 모바일 smoke, 시각 smoke, 진로 결과 smoke, N수 smoke 포함
- `rg -n "\?\?|fallback|Fallback|unknown" src/react`: 출력 없음
- `git diff --check`: exit 0, LF/CRLF 안내 경고만 출력

## 남은 관찰 사항
- 이번 범위의 학생 탭 전수 감사에서 기능 실패는 없었다.
- 도감 화면에서 미은퇴 직업명이 `???`로 보이는 것은 기존 잠금 표시 정책으로 보이며 이번 크래시 원인은 아니다.
- Vite 빌드에서 chunk size 500KB 초과 경고가 계속 출력된다. 현재 smoke 실패는 아니며 이후 코드 스플리팅 후보로 본다.
