# Student Idle RPG Latest HTML Workspace

이 폴더의 기준은 `Student-Idle-RPG-mobile-3.html` 최신 단일 HTML 빌드다.

## 실행

```powershell
cd <프로젝트 루트>
npm run build:web   # index.html / share / dist 재생성 (최초 1회 또는 소스 변경 후)
npm run serve
```

브라우저에서 `http://127.0.0.1:5173/`을 열면 된다.

## 기준 파일

- 실행 파일: `index.html` — **빌드 산출물(git 비추적)**. `npm run build:web`으로 재생성한다.
- 공유 파일: `share/Student-Idle-RPG-mobile.html` — **단일 파일 인라인 빌드 산출물(git 비추적)**.
- APK용 빌드: `dist/index.html` + `dist/assets/` — **외부 자산 분리 빌드 산출물(git 비추적)**. Capacitor `webDir`.
- 원본 보관: `reference/Student-Idle-RPG-mobile-3.html`
- 기준 SHA-256: `b1c4ec10c24c1f106b0dd75676646ba0c24455c350ee06afe13090918df0321c`

> `index.html`·`share/`·`dist/`는 `src/snapshot/app.bundle.js` + `data/` + `src/snapshot/assets/`에서 항상 재조립되므로 저장소에 커밋하지 않는다. 거대한 단일 HTML이 매 빌드마다 히스토리에 쌓이는 것을 막기 위함이다.

## 작업 방식

현재 최신 버전은 원본 React/TypeScript 소스가 아니라 빌드된 단일 HTML로만 확보되어 있다. 그래서 `index.html`을 실행 기준으로 두고, `tools/` 스크립트로 번들 안의 데이터와 스타일/스크립트를 추출해 비교한다.

```powershell
npm run verify:mobile
```

위 명령은 reference hash와 주요 라벨을 확인하고, `src/snapshot/` + `data/` + `src/snapshot/assets/`에서 단일 HTML을 재조립한 뒤 모바일 뷰포트 smoke test를 실행한다.

## React/Vite 병행 이식

React/Vite 전환은 기존 snapshot 빌드를 대체하지 않고 `src/react/`에서 병행한다. 산출물은 `dist-react/`에 생성되며 Capacitor `webDir`인 `dist/`와 분리된다.

```powershell
npm run real-estate:verify
npm run react:verify
npm run react:real-estate-visual-audit
npm run react:parity-audit
npm run react:deep-parity
npm run react:responsive-audit
```

React 라인은 기존 `data/`와 `src/snapshot/assets/`를 직접 읽는다. `tools/react-vite-smoke.mjs`는 모바일 렌더링, 핵심 UI, production 기본 DEBUG 미노출을 검증한다. `tools/react-vite-save-smoke.mjs`와 `tools/react-vite-battle-road-smoke.mjs`는 명시적 `?qaTools=1` URL에서 save 호환과 Battle Road/N수/수능/결과 흐름을 검증하고, `tools/react-vite-expedition-smoke.mjs`는 직업 수락/동료 등록/원정대 stage 진행과 부동산 자금 지급을 검증한다. `tools/react-vite-real-estate-smoke.mjs`는 모드 탭 3개, 부동산 도시 전체 보기, 잠김/해금 지역, 지역별 상세 배경, PNG 건물 asset/id 로드, 드래그 pan, 첫 구매 슬롯 1개, 구매 후 건물 개발도 증가, 원정대 자금 획득, 구매 1/10/최대, 임대수익 정산, 랭킹 preview, 일반 주간 보상 수령, DEBUG 부동산 조작과 중복 방지를 검증한다. `tools/react-vite-real-estate-visual-audit.mjs`는 풀성장 seed로 도시 전체 보기 160개 PNG 건물 슬롯과 10개 지역 상세 화면을 전수 캡처하고 배경 src, 지역당 건물 PNG 16개, asset/theme/variant, overflow를 검사한다. `tools/validate-real-estate-config.mjs`는 부동산 카탈로그/규모/밸런스/랭킹 보상 JSON, 도시 레이아웃 JSON, 지역별 상세 리소스 JSON, 건물 PNG 테이블의 중복 id, 수치 범위, 좌표 범위, 배경/건물 파일 존재, help 누락을 검사한다. `tools/react-vite-records-smoke.mjs`는 시험/직장/도감 탭, `tools/react-vite-education-smoke.mjs`는 교육 탭/업그레이드 저장, `tools/react-vite-shop-debug-smoke.mjs`는 상점 로봇 호출/DEBUG 동료 추가/원정대 편성을 검증한다. `tools/react-vite-responsive-audit.mjs`는 8개 viewport의 overflow, 이미지 로드, 상점 뽑기, 원정대 디버그 흐름을 `artifacts/react-vite-responsive-audit/report.json`에 기록한다. `tools/react-vite-visual-parity-smoke.mjs`는 snapshot `dist/`와 React `dist-react/`의 모바일 좌표/스크린샷 차이를 `artifacts/react-vite-parity/report.json`에 기록한다. `tools/react-vite-ui-parity-deep-smoke.mjs`는 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 원본 HTML normalized text, 핵심 selector computed style/rect, 스크린샷 diff를 `artifacts/react-vite-ui-parity-deep-current/`에 기록한다. 상세 기준은 `docs/react-vite-parity-migration.md`를 본다.

React/Vite 라인은 개발 중 fallback을 쓰지 않는다. 세이브가 없을 때만 새 게임을 생성하고, 깨진 세이브/누락 필드/알 수 없는 ID·rarity·icon·frame·style은 fatal 화면이나 smoke 실패로 드러낸다. 세부 기준은 `plans/react-vite-no-fallback-hardening/plan.md`와 `implementations/react-vite-no-fallback-hardening/implementation.md`에 기록한다.

2026-06-25 현재 `npm run react:verify`, `npm run verify:mobile`, `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`, `git diff --check`, `mcp__UmgMcp.project_policy_gate` strict는 통과 상태다. `react:verify`는 부동산 도시 맵/지역별 리소스/형광분홍 원본 기반 건물 PNG 데이터 검증, 부동산 smoke, 부동산 도시 전체 보기 160개 슬롯과 10개 지역 전수 시각 감사를 포함하며, `react:responsive-audit`는 320x568부터 1280x720까지 8개 viewport 실패 0건이다. `src/react` 런타임 소스는 금지 대체 토큰 검색 0건이다.

reference HTML에서 데이터와 번들을 다시 추출해 현재 편집 파일을 초기화하려면 아래 명령을 명시적으로 실행한다.

```powershell
npm run reference:refresh
```
