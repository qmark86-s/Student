# HTML Snapshot 제거 기록

이 문서는 과거 단일 HTML snapshot 개발 라인이 제거되었음을 남기는 기록이다. 현재 active 앱/빌드/APK workflow는 React/Vite 기준이며, `npm run build:web`은 React 앱을 `dist/`로 빌드한다.

## 현재 기준

- 앱 소스: `src/react/`
- 앱 빌드 산출물: `dist/`
- APK webDir: `dist`
- 공용 데이터: `data/*.json`
- 공용 시각 자산: `src/snapshot/assets/`

## 제거된 자료

- `reference/Student-Idle-RPG-mobile-3.html`: 과거 단일 HTML 기준 원본
- `extracted/latest.bundle.js`, `extracted/latest.styles.css`: 과거 reference 추출 산출물
- `src/snapshot/app.bundle.js`, `src/snapshot/index.template.html`: 과거 snapshot 실행 소스
- `tools/snapshot-*.mjs`, `tools/apply-*-patch.mjs`, `tools/extract-*.mjs`, `tools/audit-reference.mjs`: 과거 snapshot 추출/빌드/patch 도구

위 자료는 저장소 혼동을 줄이기 위해 제거했다. `src/snapshot/assets/`, `src/snapshot/styles.css`, `src/snapshot/visual-assets.css`, `src/snapshot/manifest.json`은 현재 React 자산 검증에 쓰이므로 유지한다.
