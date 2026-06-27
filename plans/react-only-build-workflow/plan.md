# React 단일 빌드 워크플로우 전환 계획

## Summary
- 기존 snapshot 빌드 라인을 active workflow에서 제거하고 React/Vite 빌드를 유일한 앱 빌드 라인으로 만든다.
- React 빌드 산출물은 Capacitor가 보는 `dist/`로 직접 출력한다.
- `build:web`, `verify`, `verify:mobile`, `preview`, Android 빌드가 모두 React 산출물 기준으로 동작하게 한다.
- snapshot 관련 도구와 reference 문서는 삭제하지 않고 archive/reference 용도로만 남긴다.

## Key Changes
- `vite.react.config.mjs`
  - `outDir`를 `dist-react`에서 `dist`로 변경한다.
- `package.json`
  - `build:web`을 `visual:build + react:build`로 변경한다.
  - snapshot/reference refresh/parity 관련 script를 active 목록에서 제거한다.
  - snapshot `app.bundle.js`를 수정하는 patch script를 active 목록과 `visual:build`에서 제거한다.
  - `verify`가 snapshot build/reference audit 대신 React 검증을 기준으로 돌게 한다.
  - `preview`가 React `dist/`를 서빙하게 한다.
- React smoke/audit 도구
  - `dist-react` 경로를 `dist`로 변경한다.
  - 누락 메시지도 `dist/index.html` 기준으로 변경한다.
- `tools/preview.mjs`, `tools/prepare-web.mjs`
  - snapshot build 의존성을 제거하고 `dist/` React 산출물 확인/서빙 기준으로 변경한다.
- `tools/build-visual-assets.mjs`
  - React 자산 생성에 필요 없는 snapshot template 존재 체크를 제거한다.
- 문서
  - README와 React/Vite 이식 문서를 “병행 이식”이 아니라 “React 단일 앱 라인” 기준으로 갱신한다.

## Validation
- `npm run build:web`
- `npm run react:verify`
- `npm run verify:mobile`
- active `package.json` script에서 snapshot/reference/parity/patch/`dist-react` 명령 검색 0건
- active 문서/도구에서 snapshot build, `app.bundle.js`, `dist-react` 실행 참조 검색 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict

## Notes
- 현재 워킹트리에 다른 기능 변경이 이미 있으므로, 이번 작업은 빌드/검증 워크플로우 파일과 문서만 수정한다.
- snapshot 파일 자체는 삭제하지 않는다. 단, npm workflow에서 호출하지 않는다.
