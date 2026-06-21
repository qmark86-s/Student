# HTML Snapshot Dev Environment Implementation

## 개요

단일 HTML 스냅샷을 편집 가능한 개발 베이스로 분해하고, 다시 실행 HTML/공유 HTML/Capacitor용 `dist`로 재조립하는 파이프라인을 추가했다.

## 추가 파일

- `tools/snapshot-utils.mjs`: 스냅샷 토큰, 데이터 테이블 분류, literal parser, 해시 유틸리티.
- `tools/snapshot-extract.mjs`: reference HTML을 `src/snapshot/`, `data/`로 분해.
- `tools/snapshot-build.mjs`: 스냅샷 소스와 `data/`를 재조립해 HTML 산출물 생성.
- `src/snapshot/index.template.html`: HTML shell.
- `src/snapshot/styles.css`: 분리된 CSS.
- `src/snapshot/app.bundle.js`: 분리된 module bundle.
- `src/snapshot/assets/*.png`: data URI에서 분리한 PNG 에셋.
- `src/snapshot/manifest.json`: 스냅샷 소스 manifest.
- `docs/html-snapshot-dev-workflow.md`: 개발 워크플로우 문서.

## 변경된 명령

- `npm run snapshot:extract`: reference HTML에서 스냅샷 소스 재생성.
- `npm run snapshot:build`: 스냅샷 소스에서 `index.html`, `share/...`, `dist/index.html` 생성.
- `npm run reference:refresh`: reference HTML에서 `data/`, `extracted/`를 명시적으로 갱신.
- `npm run verify`: reference 감사 후 스냅샷 재조립.
- `npm run verify:mobile`: 개발 중 기본 검증. 데이터 편집분을 덮어쓰지 않는다.
- `npm run build:web`: 스냅샷 소스에서 파일 확인용 `index.html`, 공유 HTML, Capacitor용 `dist/index.html`을 함께 생성.

## 검증 결과

- `npm run snapshot:build`: 통과
- `npm run verify:mobile`: 통과
  - 360x740: overflow 0px, buttonCount 27
  - 412x915: overflow 0px, buttonCount 27
- `npm run cap:sync`: 통과

## 주의사항

재조립된 HTML은 reference와 SHA-256이 다르다. 이는 데이터 테이블과 asset data URI를 편집 가능한 파일에서 다시 주입하기 때문이다. 기능 기준 검증은 모바일 smoke test와 콘솔 오류 검사로 수행한다.

`snapshot:extract`와 `reference:refresh`는 편집 파일을 덮어쓸 수 있으므로 초기화 목적일 때만 사용한다.
