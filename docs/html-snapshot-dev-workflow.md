# HTML Snapshot Development Workflow

이 레포는 원본 React/Vite 소스가 없으므로 `reference/Student-Idle-RPG-mobile-3.html` 단일 HTML 스냅샷을 개발 베이스로 분해해서 사용한다.

## Source Layout

- `src/snapshot/index.template.html`: HTML shell. style/script 위치에 토큰이 있다.
- `src/snapshot/styles.css`: 편집 가능한 인라인 CSS 소스.
- `src/snapshot/app.bundle.js`: 편집 가능한 인라인 module script 소스. 현재는 minified bundle이다.
- `src/snapshot/assets/`: HTML 내부 PNG data URI에서 분리한 이미지 파일.
- `src/snapshot/manifest.json`: 에셋 토큰, 원본 해시, 데이터 추출 기록.
- `data/*.json`: 번들 내부 `JSON.parse(...)` 테이블에서 분리한 편집 가능한 데이터.

## Commands

```powershell
npm run snapshot:extract
```

reference HTML에서 `src/snapshot/`, `data/`를 다시 만든다. 이 명령은 편집 중인 소스를 덮어쓸 수 있으므로 초기화가 필요할 때만 사용한다.

```powershell
npm run snapshot:build
```

`src/snapshot/`, `data/`, `src/snapshot/assets/`에서 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 재조립한다.

```powershell
npm run verify:mobile
```

reference 감사, 스냅샷 재조립, `dist/` 생성, 모바일 smoke test를 실행한다. 개발 중 기본 검증 명령이다.

```powershell
npm run preview
```

`src/snapshot/`, `data/`, `src/snapshot/assets/`에서 `dist/index.html`을 재생성한 뒤 로컬 미리보기 서버를 띄운다. 개발이 끝날 때 사람이 직접 확인하는 기본 URL이다. 터미널에 출력되는 `http://127.0.0.1:<port>/` 주소를 브라우저에서 열면 된다.

```powershell
npm run reference:refresh
```

reference HTML에서 `data/`, `extracted/`를 다시 추출한다. 데이터 편집분을 덮어쓸 수 있으므로 의도적으로만 실행한다.

## Build Notes

재조립된 HTML은 원본 reference와 byte-for-byte 동일하지 않을 수 있다. 데이터 테이블은 `data/*.json`에서 다시 직렬화되어 주입되고, 이미지 data URI는 `src/snapshot/assets/`에서 다시 base64로 주입된다. 동작 검증은 `verify:mobile`의 렌더링 smoke와 콘솔 오류 검사 기준으로 수행한다.

## Editing Rule

새 기능은 가능한 한 `data/`, `src/snapshot/styles.css`, `src/snapshot/assets/`부터 편집한다. `src/snapshot/app.bundle.js`는 sourcemap 없는 minified bundle이므로 대규모 수정보다는 주입 지점을 도구화한 뒤 단계적으로 분리한다.
