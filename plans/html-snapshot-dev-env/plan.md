# HTML Snapshot Dev Environment Plan

## 목표

현재 확보된 단일 HTML 스냅샷(`index.html`)을 기반 코드로 삼아, 기능 수정과 검증, 모바일/APK 동기화가 모두 재현 가능하게 돌아가는 개발 환경을 구축한다.

## 현재 분석

- 원본 React/Vite/TypeScript 소스는 없다.
- 실행 기준은 `index.html`이며, `reference/Student-Idle-RPG-mobile-3.html`, `share/Student-Idle-RPG-mobile.html`과 SHA-256이 동일하다.
- HTML 내부에는 인라인 `<style>`과 `<script type="module">`이 있다.
- script는 약 6.6MB, style은 약 160KB다.
- sourcemap은 없다.
- `JSON.parse(...)` 기반 데이터 리터럴이 있으며, 현재 `tools/extract-reference-data.mjs`가 7개 데이터 테이블을 추출한다.
- PNG data URI가 포함되어 있고, 현재 별도 에셋 파일로 분리되지는 않았다.
- 현재 검증 자산은 `npm run verify`, `npm run verify:mobile`, `npm run cap:sync`, `npm run android:doctor`다.
- `npm run reference:refresh`는 reference HTML에서 데이터/번들을 다시 추출하는 명시적 초기화 명령이다.

## 구현 방향

1. 스냅샷 분해
   - `index.html`에서 HTML shell, CSS, JS, data URI 에셋, JSON 데이터 테이블을 명시적으로 추출한다.
   - 추출 결과는 사람이 편집 가능한 위치에 저장한다.
   - 추출 실패나 미분류 데이터는 fallback 없이 검증 실패로 드러낸다.

2. 재조립 파이프라인
   - 분해된 소스에서 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 재생성한다.
   - 기준 해시와 생성 해시를 구분해 기록한다.
   - Android Capacitor 동기화는 재조립된 `dist/`를 기준으로 한다.

3. 개발 편집 구조
   - CSS는 편집 가능한 파일로 둔다.
   - 데이터 테이블은 JSON 파일로 둔다.
   - JS 번들은 우선 보존하되, 데이터/에셋 주입 지점을 도구화한다.
   - sourcemap이 없으므로 대규모 JS 리팩터링보다 데이터/스타일/에셋 주입부터 안정화한다.

4. 검증
   - `npm run verify`는 reference 감사와 스냅샷 재조립을 수행한다.
   - `npm run reference:refresh`는 편집 중인 `data/`를 덮어쓸 수 있으므로 명시적으로만 사용한다.
   - 새 개발 빌드 명령은 HTML 재조립 후 smoke까지 수행한다.
   - `npm run verify:mobile`은 모바일 overflow, 렌더링, 버튼 수, 콘솔 오류를 계속 검사한다.
   - Capacitor sync와 APK 빌드는 같은 `dist/` 산출물을 사용한다.

## MCP/툴 활용

- Browser/Playwright: 로컬 렌더링, 모바일 스크린샷, 상호작용 smoke
- GitHub connector: 원격 파일/PR/이슈 확인이 필요할 때
- Node scripts: 추출, 재조립, 해시, 데이터 검증
- Godot/Unity/Unreal/Blender MCP: 이 작업 범위에서는 사용하지 않는다.

## 착수 전 확인할 결정

- 기존 단일 HTML 보존 우선인지, `src/` 기반 개발 구조를 새로 만들지
- 데이터/스타일 편집부터 시작할지, 번들 JS를 단계적으로 모듈화할지
- 공유 파일(`share/Student-Idle-RPG-mobile.html`)을 매 빌드마다 자동 갱신할지
- Android 앱 ID와 표시명을 지금 확정할지 출시 직전까지 임시로 둘지

## 1차 완료 기준

- `npm run build:*` 계열 명령으로 단일 HTML을 재생성할 수 있다.
- 생성된 HTML이 브라우저와 모바일 smoke에서 현재 스냅샷과 동등하게 동작한다.
- 데이터/스타일 변경 후 HTML과 Capacitor `dist/`가 같은 산출물을 바라본다.
- 문서와 구현 설명서가 함께 갱신된다.

## 1차 구현 결과

- `src/snapshot/` 개발 소스 구조를 생성했다.
- PNG data URI 6개를 `src/snapshot/assets/`로 분리했다.
- `data/*.json` 7개 테이블을 스냅샷 빌드에 주입하도록 연결했다.
- `snapshot:build`가 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 생성한다.
- `verify`와 `verify:mobile`은 개발 중인 `data/`를 덮어쓰지 않도록 조정했다.
- reference 재추출은 `reference:refresh`로 분리했다.
- `verify:mobile`과 `cap:sync` 검증을 통과했다.
