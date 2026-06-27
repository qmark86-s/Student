# Student Idle RPG React Workspace

이 폴더의 기준 앱은 `src/react/`의 React/Vite 구현이다. `npm run build:web`은 React 앱을 Capacitor가 사용하는 `dist/`로 빌드한다.

## 실행

```powershell
cd <프로젝트 루트>
npm run build:web   # React 앱을 dist/로 빌드 (최초 1회 또는 소스 변경 후)
npm run serve
```

브라우저에서 `http://127.0.0.1:5173/`을 열면 된다.

## 기준 파일

- 앱 소스: `src/react/`
- APK/웹 빌드: `dist/index.html` + `dist/assets/` — **React/Vite 빌드 산출물(git 비추적)**. Capacitor `webDir`.
- 데이터: `data/`
- 공용 시각 자산: `src/snapshot/assets/`
- snapshot/reference 보관: `reference/`, `src/snapshot/`, `tools/snapshot-*.mjs`

> `dist/`는 React/Vite 빌드 산출물이므로 저장소에 커밋하지 않는다. `src/snapshot/assets/`는 이름이 snapshot이지만 현재 React 앱이 쓰는 공용 자산 루트로 유지한다.

## 작업 방식

신규 기능과 검증은 React 라인만 기준으로 한다. snapshot 단일 HTML 빌드는 active workflow에서 제거했고, 과거 비교/복구가 필요한 경우에만 archive로 확인한다.

```powershell
npm run verify:mobile
```

위 명령은 React 검증, React `dist/` 빌드, 모바일 뷰포트 smoke test, 시각 자산 smoke, 진로 결과 smoke, N수 smoke를 실행한다.

## React/Vite 단일 라인

React/Vite가 유일한 앱 빌드 라인이다. `react:build`와 `build:web`은 모두 `dist/`를 생성하며, Capacitor도 같은 `dist/`를 사용한다.

```powershell
npm run real-estate:verify
npm run react:verify
npm run react:real-estate-visual-audit
npm run react:responsive-audit
```

React 라인은 `data/`와 `src/snapshot/assets/`를 직접 읽는다. `tools/react-vite-smoke.mjs`는 모바일 렌더링, 핵심 UI, production 기본 DEBUG 미노출을 검증한다. `tools/react-vite-save-smoke.mjs`와 `tools/react-vite-battle-road-smoke.mjs`는 명시적 `?qaTools=1` URL에서 save 호환, legacy 결과 대기 save의 v4 승격, fresh save 저장 초기화 후 `N수 선택`/리로드 유지, 장비 마이그레이션, Battle Road/N수/수능/결과 흐름을 검증하고, `tools/react-vite-expedition-smoke.mjs`는 직업 수락/졸업생 보존/원정대원 등록/원정대 stage 진행과 부동산 자금 지급을 검증한다. `tools/visual-asset-smoke.mjs`는 메인 전투 장비 오버레이, 교과 VFX, Battle Road 몬스터 atlas, 원정대 이미지 프레임을 검사하고, `tools/retake-year-smoke.mjs`는 `N수 선택` 이후 N수/수능 재도전 루프를 검사한다. `npm run curriculum-vfx:verify`는 학년군별 교과 VFX 필수 과목 커버리지까지 검사한다. `tools/react-vite-real-estate-smoke.mjs`는 모드 탭 3개, 부동산 도시 전체 보기, 잠김/해금 지역, 지역별 상세 배경, PNG 건물 asset/id 로드, 기본 전체 보기, 포커스 휠 확대, 확대 후 드래그 pan, 구매/임대/랭킹/DEBUG 조작을 검증한다. `tools/react-vite-real-estate-visual-audit.mjs`는 부동산 도시 전체 보기와 10개 지역 상세 화면을 전수 캡처한다. `tools/validate-real-estate-config.mjs`는 부동산 데이터와 리소스를 검증한다. `tools/react-vite-records-smoke.mjs`, `tools/react-vite-education-smoke.mjs`, `tools/react-vite-shop-debug-smoke.mjs`, `tools/react-vite-responsive-audit.mjs`는 각각 기록/교육/상점/반응형 흐름을 검증한다. 상세 기준은 `docs/react-vite-parity-migration.md`를 본다.

React/Vite 라인은 개발 중 fallback을 쓰지 않는다. 세이브가 없을 때만 새 게임을 생성하고, 지원하는 legacy schema 1~3은 명시 migration으로 v4 구조에 맞춘다. 깨진 세이브, 지원하지 않는 schema, 현재 schema의 누락 필드, 알 수 없는 ID·rarity·icon·frame·style은 fatal 화면이나 smoke 실패로 드러낸다. 세부 기준은 `plans/react-vite-no-fallback-hardening/plan.md`와 `implementations/react-vite-no-fallback-hardening/implementation.md`에 기록한다.

2026-06-27 현재 `npm run verify:mobile`, 런타임 fallback 금지 토큰 검색, 학생 보조 레거시 문구 검색, `git diff --check`는 통과 상태다. `verify:mobile`은 `react:verify`, `build:web`, 모바일 smoke, 시각 smoke, 진로 결과 smoke, N수 smoke를 포함하며, `react:responsive-audit`는 8개 viewport 실패 0건이다. `src/react` 런타임 소스는 금지 대체 토큰 검색 0건이다.

snapshot/reference 추출 도구는 active workflow에서 제외했다. 과거 단일 HTML 기준 확인이 필요할 때만 `reference/`와 `tools/snapshot-*.mjs`를 수동 archive 자료로 본다.
