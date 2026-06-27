# Mobile APK Infra Implementation

## 개요

이 문서는 과거 단일 HTML 실행본 기준으로 APK 인프라를 만든 시점의 기록이다. 현재 active workflow는 React/Vite 기준이며, `npm run build:web`이 React 앱을 `dist/`로 빌드하고 Capacitor가 같은 `dist/`를 Android WebView에 넣는다.

## 주요 파일

- `capacitor.config.json`: Capacitor 앱 식별자와 `dist` 웹 번들 경로를 정의한다.
- `npm run build:web`: 현재 기준에서 시각 자산을 준비한 뒤 React 앱을 `dist/`로 빌드한다.
- `tools/mobile-smoke.mjs`: Playwright Chromium으로 모바일 뷰포트 렌더링, 버튼 수, 가로 overflow, 콘솔 오류를 검사한다.
- `tools/build-android.mjs`: portable JDK와 사용자 Android SDK를 감지하고, `cap sync android` 후 Gradle 빌드를 실행한다.
- `tools/install-portable-jdk.ps1`: Adoptium API에서 JDK 17 zip을 받아 검증 후 사용자 로컬 도구 경로에 설치한다.
- `tools/setup-android-sdk.ps1`: Android SDK 라이선스 확인 후 필요한 SDK 패키지를 설치한다. 설치 후 실제 SDK 파일을 확인하며, 라이선스 미수락 등으로 누락이 남으면 실패한다.
- `android/`: Capacitor가 생성한 Android 네이티브 프로젝트다.
- `docs/mobile-apk-workflow.md`: 설치, 동기화, 검증, 빌드 흐름 문서다.

## npm 명령

- `npm run build:web`: React 앱을 Capacitor용 `dist/` 웹 번들로 생성
- `npm run verify:mobile`: 기존 검증 + 모바일 smoke test
- `npm run cap:sync`: 웹 번들을 Android 프로젝트에 복사
- `npm run cap:open`: Android Studio에서 프로젝트 열기
- `npm run android:install-jdk`: portable JDK 17 설치
- `npm run android:setup-sdk`: Android SDK 패키지 설치, 라이선스 동의 필요
- `npm run android:debug`: debug APK 빌드
- `npm run android:release`: release APK 빌드

## 현재 상태

Capacitor Android 프로젝트 생성과 동기화, 모바일 smoke test, JDK portable 설치는 완료됐다. Android SDK 패키지는 라이선스 수락이 필요해서 자동 설치하지 않았다. 사용자가 `npm run android:setup-sdk`에서 약관을 확인하고 수락하면 `android:debug`가 다음 빌드 단계로 진행된다.

## MCP/툴 기준

- Browser/Playwright 계열: 모바일 렌더링, 스크린샷, overflow, 상호작용 smoke에 사용한다.
- GitHub 계열: PR/이슈/원격 파일 확인과 배포 브랜치 작업에 사용한다.
- Godot/Unity/Unreal MCP: 이 레포의 현재 방향에서는 사용하지 않는다.
