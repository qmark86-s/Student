# React 단일 빌드 워크플로우 구현서

## 개요

snapshot 단일 HTML 빌드 라인을 active workflow에서 제거하고, React/Vite를 유일한 앱 빌드 라인으로 정리했다. 현재 웹 빌드 산출물은 Capacitor `webDir`과 같은 `dist/`에 직접 생성된다.

snapshot/reference 관련 파일은 삭제하지 않고 archive 자료로만 남겼다. 기본 npm script, 모바일 검증, Android 동기화/빌드는 더 이상 snapshot build/reference refresh를 호출하지 않는다.

## 주요 변경

- `vite.react.config.mjs`
  - React 빌드 `outDir`를 `dist-react`에서 `dist`로 변경했다.
- `package.json`
  - `build:web`을 `visual:build && react:build`로 변경했다.
  - `preview`가 `build:web` 후 React `dist/`를 서빙하게 했다.
  - snapshot/reference refresh/parity 계열 스크립트를 active 목록에서 제거했다.
  - `src/snapshot/app.bundle.js`를 수정하던 `patch:*` 스크립트를 active 목록에서 제거하고, `visual:build`가 React용 자산 생성만 수행하게 했다.
  - `verify`를 데이터/밸런스/React/시각 자산 검증 기준으로 재구성했다.
- `tools/preview.mjs`
  - snapshot build 의존성을 제거하고 `dist/index.html` 존재 확인 후 서빙한다.
- React smoke/audit 도구
  - `dist-react` 참조를 `dist`로 변경했다.
  - `react:smoke`는 Vite 직후 Windows 파일시스템 타이밍을 고려해 `dist/index.html`을 짧게 대기한다.
  - `react:expedition-rules-smoke`는 앱 첫 진입 응답을 짧게 재시도한다.
  - `react:shop-debug-smoke`는 통합 검증 부하에서도 안정적으로 기다리도록 주요 interaction timeout을 늘렸다.
- `tools/build-visual-assets.mjs`
  - React 자산 생성에 필요 없는 snapshot template 존재 체크를 제거했다.
- 문서
  - `README.md`, `docs/mobile-apk-workflow.md`, `docs/react-vite-parity-migration.md`, `docs/html-snapshot-dev-workflow.md`, `docs/llm_project_brief.md`를 React 단일 라인 기준으로 갱신했다.
  - 과거 모바일/비주얼 구현 문서의 `prepare-web` 설명은 현재 React `dist/` 기준으로 보정했다.
- 제거
  - `tools/prepare-web.mjs`를 삭제했다. 현재 `build:web`은 React `dist/`를 직접 생성한다.

## 현재 기준

- 앱 소스: `src/react/`
- 웹 산출물: `dist/`
- Capacitor `webDir`: `dist`
- 공용 데이터: `data/*.json`
- 공용 시각 자산: `src/snapshot/assets/`
- snapshot/reference: archive 전용

## 검증 결과

통과:

- `npm run build:web`
- `npm run react:verify`
- `npm run verify:mobile`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 결과 0건
- active `package.json` script의 snapshot/reference/parity/patch/`dist-react` 명령 검색 결과 0건
- active 문서/도구의 snapshot build, `app.bundle.js`, `dist-react` 실행 참조 검색 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict pass

추가 전수조사 보강:

- `visual:build` 내부에 남아 있던 `patch:visual-assets`, `patch:battle-road` 호출을 제거했다.
- 위 patch script들은 `src/snapshot/app.bundle.js`를 직접 수정하는 레거시 경로였으므로, active `package.json` script 목록에서도 제거했다.
- `tools/build-visual-assets.mjs`의 `src/snapshot/index.template.html` 존재 체크를 제거했다. 현재 React 빌드는 snapshot template을 필요로 하지 않는다.

참고:

- `git diff --check`는 공백 오류 없이 통과했고, 기존 파일들의 LF/CRLF 변환 경고만 출력했다.
- `mcp__UmgMcp.project_policy_gate`는 상대 경로 호출 시 MCP 작업 디렉터리 차이로 `scanned_files=0` 경고가 나왔으나, 절대 경로 재호출에서 `verdict=pass`, `finding_count=0`을 확인했다.
- Vite는 번들 chunk가 500KB를 넘는다는 경고를 출력한다. 현재 검증 실패는 아니며, 추후 코드 스플리팅 작업 후보로 남긴다.

## 주의사항

- 신규 기능 작업은 `dist-react`나 snapshot build를 기준으로 삼지 않는다.
- `src/snapshot/assets/`는 폴더명과 달리 현재 React 앱이 사용하는 공용 자산 루트다.
- 과거 parity 도구 파일은 남아 있어도 active npm workflow에서 호출하지 않는다.
