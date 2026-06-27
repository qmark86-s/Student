# src/snapshot/ — 공용 자산 루트 (레거시 아님)

이 폴더 이름은 과거 단일 HTML snapshot 라인에서 유래했지만, **현재 React/Vite 앱이 실제로 사용하는 공용 자산 루트**다. 이름만 보고 레거시로 오해해 제거하면 안 된다.

## 현재 사용처

- `assets/`: React 앱이 직접 `import` 하거나 `import.meta.glob`으로 로드하는 PNG 자산.
  - 예) `src/react/App.jsx`가 부동산 도시맵(`visual-real-estate-city-map.png`), 지역 배경(`visual-real-estate-district-*.png`), 성장 PNG(`real-estate-district-growth/*.png`), 건물 PNG(`real-estate-buildings/*.png`), Battle Road 배경, 학생/몬스터 atlas를 여기서 읽는다.
- `styles.css`, `visual-assets.css`, `manifest.json`: `tools/build-visual-assets.mjs`, `tools/verify-visual-assets.mjs` 등 시각 자산 빌드/검증 도구가 읽고 쓴다.

## 주의

- 폴더명이 `snapshot`이라 레거시로 보이지만 앱 런타임 자산 경로이므로 유지한다. 과거 snapshot 실행 소스(`app.bundle.js`, `index.template.html`)와 추출/빌드 도구는 이미 제거됐다. 배경은 `docs/html-snapshot-dev-workflow.md`를 본다.
- 자산 위치를 옮기려면 `src/react/`의 `import` 경로와 `import.meta.glob` 패턴, 시각 도구의 경로 상수, `data/*.json`의 파일명 참조를 같은 작업 범위로 함께 바꿔야 한다.
