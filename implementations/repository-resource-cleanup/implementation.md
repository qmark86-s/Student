# 저장소 리소스/레거시 정리 구현서

## 개요

React/Vite 단일 앱 라인 기준으로 더 이상 쓰지 않는 snapshot/reference 실행물과 patch/parity 도구를 제거했다. 로컬 ignored 산출물도 정리하되, 현재 IDE에서 열려 있는 `artifacts/real-estate-reconstruction/` 검토 자료와 실행 중인 Vite dev server 로그는 보존했다.

## 정리한 항목

- 로컬 ignored 산출물
  - `dist-react/`
  - 루트 `index.html`
  - `share/`
  - `tools/__pycache__/`
  - `artifacts/` 하위 생성 산출물 대부분
- Git 추적 레거시 snapshot/reference
  - `src/snapshot/app.bundle.js`
  - `src/snapshot/index.template.html`
  - `reference/Student-Idle-RPG-mobile-3.html`
  - `extracted/latest.bundle.js`
  - `extracted/latest.styles.css`
  - `docs/reference_html_audit.json`
  - `tools/apply-*-patch.mjs`
  - `tools/snapshot-build.mjs`
  - `tools/snapshot-extract.mjs`
  - `tools/audit-reference.mjs`
  - `tools/extract-bundle.mjs`
  - `tools/extract-reference-data.mjs`
  - active workflow에서 빠진 과거 snapshot/React parity 전용 도구
- 고아 자산
  - `src/snapshot/assets/asset-001.png`
  - `src/snapshot/assets/asset-006.png`
  - `src/snapshot/assets/visual-real-estate-district-detail.png`

## 구조 보정

- `tools/snapshot-utils.mjs`에서 active 검증에 필요했던 `sha256`, `pngInfo`를 `tools/asset-file-utils.mjs`로 분리했다.
- `tools/verify-visual-assets.mjs`는 새 공용 유틸을 import한다.
- `tools/build-visual-assets.mjs`는 manifest를 재생성할 때 현재 관리하는 자산 토큰만 남긴다.
- `src/snapshot/manifest.json`은 reference 원본 메타와 구 토큰 `__STUDENT_ASSET_001__`, `__STUDENT_ASSET_004__`, `__STUDENT_ASSET_005__`, `__STUDENT_ASSET_006__`을 제거한 현재 기준 manifest로 갱신했다.
- `src/react/App.jsx`의 부동산 상세 배경 glob에서 삭제된 `visual-real-estate-district-detail.png` 제외 규칙을 제거했다.
- `src/react/App.jsx`의 부동산 상세 지도 wheel zoom은 native non-passive listener로 처리한다. 실제 게임 스모크에서 passive wheel `preventDefault` 콘솔 오류가 잡혀 수정했다.
- `.gitignore`, README, React 단일 라인 문서, LLM brief, HTML snapshot 제거 기록 문서를 현재 기준으로 갱신했다.
- `visual:verify`가 `visual:build`를 먼저 실행하게 했다. `artifacts/visual-asset-samples`는 ignored 산출물이므로 청소 후에도 축 QA report가 자동 재생성되어야 한다.

## 유지한 항목

- `src/snapshot/assets/`
  - 폴더명과 달리 현재 React 앱이 직접 쓰는 공용 런타임 자산 루트다.
- `src/snapshot/styles.css`, `src/snapshot/visual-assets.css`, `src/snapshot/manifest.json`
  - 현재 `visual:verify`와 자산 검증에서 사용한다.
- `src/snapshot/assets/asset-004.png`, `src/snapshot/assets/asset-005.png`
  - `tools/build-visual-assets.mjs`가 Battle Road/Expedition backdrop 생성 입력으로 읽는다.
- `src/snapshot/assets/visual-real-estate-early.png`, `visual-real-estate-mid.png`, `visual-real-estate-late.png`
  - `data/real_estate_balance.json.artStages`와 `realEstate.js` view model이 아직 참조한다.
- `dist/`
  - 현재 React build 산출물이며 필요하면 `npm run build:web`으로 재생성된다.
- `node_modules/`
  - 개발 의존성이므로 이번 정리 범위에서 제외했다.
- `artifacts/real-estate-reconstruction/`
  - 사용자가 열어 둔 부동산 재구성 리뷰 자료라 보존했다.
- `artifacts/react-dev-server.err.log`, `artifacts/react-dev-server.log`
  - 실행 중인 `npm run react:dev -- --port 5173` 프로세스가 잡고 있을 수 있어 보존했다.

## 검증 결과

통과:

- `npm run visual:build`
- `npm run verify:mobile`
- 실제 Vite dev server `http://127.0.0.1:5173/?qaTools=1&pauseAutoBattle=1` 기준 런타임 스모크
  - 학생/원정대/부동산 모드 전환
  - 부동산 잠김 안내
  - DEBUG 부동산 자금/Stage 해금
  - 부동산 상세 0단계 baked PNG 로드
  - 상세 지도 zoom/pan
  - 작은 원룸 1채 구매 후 `small-studio-growth-01.png` 반영
  - 전체 도시 지도 개발도 반영
  - 이미지 로드 실패, 가로 overflow, 콘솔 오류 0건
- active `package.json` script의 snapshot/reference/parity/patch/`dist-react` 명령 검색 결과 0건
- 삭제 파일 active 참조 검색 결과 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict pass

참고:

- `git diff --check`는 공백 오류 없이 통과했고, Git의 LF/CRLF 변환 경고만 출력했다.
- `docs/html-snapshot-dev-workflow.md`에는 삭제된 파일명이 “제거된 자료” 기록으로만 남아 있다.
- 검증 과정에서 artifact가 일부 재생성되어, 검증 후 다시 정리했다.
