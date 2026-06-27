# HTML Snapshot Archive Workflow

이 문서는 과거 단일 HTML snapshot 개발 라인의 archive 설명이다. 현재 active 앱/빌드/APK workflow는 React/Vite 기준이며, `npm run build:web`은 React 앱을 `dist/`로 빌드한다.

## 현재 기준

- 앱 소스: `src/react/`
- 앱 빌드 산출물: `dist/`
- APK webDir: `dist`
- 공용 데이터: `data/*.json`
- 공용 시각 자산: `src/snapshot/assets/`

## Archive 자료

- `reference/Student-Idle-RPG-mobile-3.html`: 과거 단일 HTML 기준 원본
- `src/snapshot/`: 과거 snapshot 소스와 현재 React가 공유하는 자산 루트
- `tools/snapshot-*.mjs`: 과거 snapshot 추출/빌드 도구

이 자료는 복구나 과거 비교가 필요할 때만 수동으로 본다. 기본 npm workflow, 모바일 검증, Android 빌드에서는 snapshot build/reference refresh를 호출하지 않는다.
