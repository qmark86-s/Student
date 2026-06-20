# Preview Workflow Plan

## 목표

개발 종료 시 항상 단일 HTML 산출물을 직접 확인할 수 있도록, 스냅샷 빌드 후 웹 미리보기 서버를 띄우는 명령을 제공한다.

## 구현

- `tools/preview.mjs`를 추가한다.
- `preview` npm script를 추가한다.
- preview는 먼저 `dist/index.html`을 재생성한다.
- preview는 `dist/`만 서빙하여 APK에 들어갈 웹 산출물과 같은 파일을 확인하게 한다.
- 포트가 사용 중이면 5173부터 50개 범위 안에서 다음 포트를 사용한다.

## 검증

- `npm run preview`가 서버 URL을 출력한다.
- 출력된 URL이 HTTP 200을 반환한다.
- 응답 HTML title이 `학생 방치 RPG`다.

## 운영 기준

앞으로 작업 완료 보고 시 `npm run verify:mobile` 통과 여부와 함께 미리보기 URL을 제공한다.
