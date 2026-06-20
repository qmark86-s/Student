# Student Idle RPG Latest HTML Workspace

이 폴더의 기준은 `Student-Idle-RPG-mobile-3.html` 최신 단일 HTML 빌드다.

## 실행

```powershell
cd "C:\Users\상원\Downloads\Student"
npm run serve
```

브라우저에서 `http://127.0.0.1:5173/`을 열면 된다.

## 기준 파일

- 실행 파일: `index.html`
- 공유 파일: `share/Student-Idle-RPG-mobile.html`
- 원본 보관: `reference/Student-Idle-RPG-mobile-3.html`
- 기준 SHA-256: `b1c4ec10c24c1f106b0dd75676646ba0c24455c350ee06afe13090918df0321c`

## 작업 방식

현재 최신 버전은 원본 React/TypeScript 소스가 아니라 빌드된 단일 HTML로만 확보되어 있다. 그래서 `index.html`을 실행 기준으로 두고, `tools/` 스크립트로 번들 안의 데이터와 스타일/스크립트를 추출해 비교한다.

```powershell
npm run verify
```

위 명령은 reference hash와 주요 라벨을 확인하고, 최신 HTML 안의 JSON 테이블을 `data/`로 추출하며, 번들 스크립트/CSS를 `extracted/`에 분리한다.

