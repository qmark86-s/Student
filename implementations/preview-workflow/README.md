# Preview Workflow Implementation

## 개요

개발자가 매번 단일 HTML 산출물을 확인할 수 있도록 `npm run preview`를 추가했다. 이 명령은 스냅샷 소스에서 `dist/index.html`을 다시 만든 뒤, `dist/`를 로컬 HTTP 서버로 서빙한다.

## 파일

- `tools/preview.mjs`: 스냅샷 빌드 + 정적 미리보기 서버.
- `package.json`: `preview` script 추가.
- `docs/html-snapshot-dev-workflow.md`: 미리보기 명령 문서화.

## 사용법

```powershell
npm run preview
```

터미널에 출력되는 `http://127.0.0.1:<port>/`를 열어 확인한다. 포트 5173이 사용 중이면 다음 포트를 자동으로 찾는다.

## 작업 완료 기준

이 프로젝트에서는 작업 종료 시 기본적으로 다음을 수행한다.

- `npm run verify:mobile`
- `npm run preview` 서버 URL 제공
