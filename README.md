# Student Idle RPG Latest HTML Workspace

이 폴더의 기준은 `Student-Idle-RPG-mobile-3.html` 최신 단일 HTML 빌드다.

## 실행

```powershell
cd "C:\Users\상원\Downloads\Student"
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

reference HTML에서 데이터와 번들을 다시 추출해 현재 편집 파일을 초기화하려면 아래 명령을 명시적으로 실행한다.

```powershell
npm run reference:refresh
```
