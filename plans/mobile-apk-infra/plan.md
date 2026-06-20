# Mobile APK Infra Plan

## 목표

Godot 이식 없이 현재 단일 HTML 웹앱 형태를 유지하고, Android APK 출시까지 이어질 수 있는 Capacitor 기반 인프라를 준비한다.

## 범위

- 단일 HTML 실행본을 Capacitor용 정적 번들(`dist/`)로 생성한다.
- Android Capacitor 프로젝트를 레포에 추가한다.
- 모바일 브라우저 렌더링 smoke test를 추가한다.
- portable JDK 설치와 Android SDK 설정 스크립트를 추가한다.
- SDK 라이선스 수락이 필요한 단계는 사용자가 직접 진행하도록 남긴다.
- MCP는 현재 웹앱/APK 흐름에 맞춰 Browser/Playwright와 GitHub 계열을 우선 후보로 둔다.

## 구현 항목

- `capacitor.config.json` 추가
- `tools/prepare-web.mjs` 추가
- `tools/mobile-smoke.mjs` 추가
- `tools/build-android.mjs` 추가
- `tools/install-portable-jdk.ps1` 추가
- `tools/setup-android-sdk.ps1` 추가
- `android/` Capacitor Android 프로젝트 생성
- `package.json` npm scripts 확장
- `.gitignore`에 로컬 산출물/서명 파일 제외 규칙 추가
- `docs/mobile-apk-workflow.md` 작성

## 검증 기준

- `npm run build:web`가 `dist/index.html`을 생성한다.
- `npm run verify:mobile`이 reference 감사, 데이터 추출, 번들 추출, 모바일 smoke test를 모두 통과한다.
- `npm run cap:sync`가 Android 프로젝트에 웹 에셋을 복사한다.
- `npm run android:doctor`가 Capacitor Android 의존성을 확인한다.
- Android SDK 패키지가 없을 때 `npm run android:debug`가 명확한 오류를 출력한다.
- `npm run android:setup-sdk`는 SDK 패키지 누락 시 실패한다.

## 검증 결과

- `npm run build:web`: 통과
- `npm run verify:mobile`: 통과
  - 360x740: overflow 0px, buttonCount 27
  - 412x915: overflow 0px, buttonCount 27
- `npm run cap:add:android`: 통과
- `npm run cap:sync`: 통과
- `npm run android:doctor`: 통과
- `npm run android:install-jdk`: 통과, JDK 17.0.19 portable 설치 확인
- `npm run android:debug`: SDK 패키지 미설치 상태를 명확히 안내
- `tools/setup-android-sdk.ps1`: SDK 패키지 누락 시 실패하도록 보강

## 남은 항목

- 사용자가 `npm run android:setup-sdk`를 실행하고 Android SDK 라이선스를 직접 확인/수락해야 한다.
- 이후 `npm run android:debug`로 실제 debug APK 빌드를 확인한다.
- 출시 전 앱 ID, 앱 표시명, 아이콘, 스플래시, 서명 키, Play Store 배포 형식(APK/AAB)을 확정한다.
