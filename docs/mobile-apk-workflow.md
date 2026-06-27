# Mobile APK Workflow

이 레포는 Godot 이식 없이 React/Vite 웹앱을 유지하고, Capacitor로 Android APK를 감싸는 방향을 기준으로 한다.

## Local Web Bundle

```powershell
npm run build:web
```

React/Vite 앱과 필요한 시각 자산을 빌드해 Capacitor가 사용할 `dist/index.html`과 `dist/assets/`를 만든다.

## Mobile Smoke Test

```powershell
npm run verify:mobile
```

React 검증, React `dist/` 산출물 생성, Playwright 모바일 뷰포트 렌더링 검증을 실행한다. 스크린샷은 `artifacts/mobile-smoke/`에 생성된다. snapshot/reference 추출은 active APK workflow에서 사용하지 않는다.

## Android Setup

로컬 APK 빌드에는 레포 의존성 외에 아래 외부 도구가 필요하다.

- Android Studio
- Android SDK Platform / Build Tools
- Android SDK Platform Tools (`adb`)
- JDK 17 이상
- `JAVA_HOME`, `ANDROID_HOME` 또는 `ANDROID_SDK_ROOT`

도구 설치 후 최초 1회:

```powershell
npm run android:install-jdk
npm run android:setup-sdk
npm run cap:add:android
```

`android:setup-sdk`는 Android SDK 라이선스 문구를 터미널에 표시할 수 있다. 약관 확인과 수락은 사용자가 직접 해야 한다. 라이선스 미수락 등으로 SDK 패키지가 설치되지 않으면 명령은 실패하며 누락 경로를 출력한다.

웹 번들을 Android 프로젝트로 동기화:

```powershell
npm run cap:sync
```

Android Studio 열기:

```powershell
npm run cap:open
```

디버그 APK 빌드:

```powershell
npm run android:debug
```

릴리스 APK 빌드:

```powershell
npm run android:release
```

릴리스 배포 전에는 실제 패키지명, 앱 표시명, 아이콘, 스플래시, 서명 키, Google Play용 AAB 빌드 정책을 확정해야 한다.

## Current Capacitor Identity

- App ID: `com.qmark86.studentidlerpg`
- App Name: `Student Idle RPG`
- Web directory: `dist`

출시 전 App ID를 바꾸면 Android 네이티브 프로젝트의 패키지 경로도 같이 바뀐다. 가능하면 초기에 확정하는 편이 좋다.
