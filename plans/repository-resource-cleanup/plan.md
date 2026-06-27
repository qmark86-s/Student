# 저장소 리소스/레거시 정리 계획

## Summary
- 로컬과 `origin/main`이 같은 상태인지 확인한 뒤, Git 비추적 산출물과 active workflow에서 참조하지 않는 레거시 snapshot/reference 파일을 정리한다.
- 현재 React/Vite 단일 앱 라인에 필요한 `src/react/`, `data/`, `assets/visual-source/`, `src/snapshot/assets/` 런타임 자산은 유지한다.
- 이름은 레거시지만 active 검증에서 쓰는 유틸은 먼저 일반 유틸로 분리한 뒤 정리한다.

## Cleanup Scope
- 로컬 전용 산출물
  - `dist-react/`
  - 루트 `index.html`
  - `share/`
  - `tools/__pycache__/`
  - `artifacts/`는 현재 열려 있는 `artifacts/real-estate-reconstruction/`을 보존하고 나머지 생성 산출물을 정리한다.
- Git 추적 레거시 snapshot/reference
  - `src/snapshot/app.bundle.js`
  - `src/snapshot/index.template.html`
  - `reference/`
  - `extracted/`
  - `docs/reference_html_audit.json`
  - `tools/apply-*-patch.mjs`
  - `tools/snapshot-build.mjs`, `tools/snapshot-extract.mjs`
  - `tools/audit-reference.mjs`, `tools/extract-bundle.mjs`, `tools/extract-reference-data.mjs`
  - active script에서 빠진 snapshot/React parity 전용 도구
- 공용 유틸 정리
  - `tools/snapshot-utils.mjs`의 active 유틸을 새 이름의 일반 유틸로 옮기고 `visual:verify` import를 변경한다.
- 문서/설정
  - `.gitignore`의 snapshot-build 설명을 React/Vite 기준으로 갱신한다.
  - README와 LLM brief, React migration 문서에서 삭제된 archive 파일을 더 이상 현재 파일처럼 안내하지 않게 정리한다.
- 검증 경로
  - ignored artifact를 정리해도 검증이 깨지지 않도록 `visual:verify`가 필요한 축 리포트를 선행 생성하게 한다.

## Keep
- `src/snapshot/assets/`: 폴더명과 달리 React 앱이 직접 읽는 공용 런타임 자산 루트다.
- `src/snapshot/styles.css`, `src/snapshot/visual-assets.css`, `src/snapshot/manifest.json`: 현재 `visual:verify`/자산 검증에 쓰인다.
- `assets/visual-source/`와 `assets/reference/`: 자산 재생성 원본이다.
- `dist/`: 정리 대상으로 볼 수 있지만 현재 React 빌드 산출물이라 검증 후 재생성된다.
- `node_modules/`: 개발 의존성이라 이번 정리에서 삭제하지 않는다.
- `android/`: Capacitor 프로젝트 원본은 유지한다.

## Validation
- active script 레거시 참조 검색 0건
- active 문서/도구의 삭제 파일 참조 검색 0건
- `npm run react:verify`
- `npm run verify:mobile`
- 실제 Vite dev server 기준 학생/원정대/부동산 런타임 스모크
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict
