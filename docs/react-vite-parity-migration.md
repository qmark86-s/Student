# React/Vite 단일 앱 라인 문서

## 목적

React/Vite 이식은 active workflow 기준으로 완료되었다. 현재 앱 빌드와 APK 파이프라인은 `src/react/`를 기준으로 하며, React/Vite 산출물은 Capacitor `webDir`인 `dist/`에 직접 생성된다.

과거 HTML snapshot/reference 라인은 더 이상 기본 개발, 검증, APK 빌드에 사용하지 않는다. 관련 파일과 도구는 복구나 과거 비교가 필요할 때만 수동으로 확인하는 archive 자료다.

## 현재 디렉터리 기준

- `src/react/`: React/Vite 앱 루트
- `dist/`: React/Vite 빌드 산출물, git 비추적, Capacitor `webDir`
- `data/`: 런타임 데이터 JSON
- `src/snapshot/assets/`: 현재 React 앱이 직접 사용하는 공용 시각 자산 루트
- `reference/`, `tools/snapshot-*.mjs`: 과거 HTML snapshot archive

`src/snapshot/assets/`는 폴더명에 snapshot이 남아 있지만 현재도 React 앱의 공용 자산 루트다. 앱 빌드 라인을 되살린다는 의미가 아니다.

## 활성 명령

```powershell
npm run react:dev
npm run react:build
npm run build:web
npm run preview
npm run react:smoke
npm run react:save-smoke
npm run react:battle-smoke
npm run react:expedition-smoke
npm run react:expedition-rules-smoke
npm run real-estate:verify
npm run react:real-estate-smoke
npm run react:real-estate-visual-audit
npm run react:records-smoke
npm run react:education-smoke
npm run react:shop-debug-smoke
npm run react:responsive-audit
npm run visual:smoke
npm run career:smoke
npm run retake:smoke
npm run react:verify
npm run mobile:smoke
npm run verify
npm run verify:mobile
```

- `react:build`: `src/react/`를 `dist/`로 빌드한다.
- `build:web`: 시각 자산을 갱신한 뒤 React 앱을 `dist/`로 빌드한다.
- `preview`: 이미 생성된 `dist/index.html`을 서빙한다. 시작 전 `build:web`을 실행한다.
- `react:verify`: React 빌드와 React smoke/audit 전체를 실행한다.
- `verify`: 데이터/밸런스/React/시각 자산 검증을 실행한다.
- `verify:mobile`: `verify`, `build:web`, 모바일 smoke, 시각 smoke, 진로 결과 smoke, N수 smoke를 실행한다.

## 비활성 Archive

다음 작업은 active workflow에서 제거했다.

- HTML snapshot 추출/빌드
- reference refresh
- snapshot과 React를 직접 비교하는 parity gate
- 별도 React 산출물 디렉터리 관리

필요한 경우 과거 도구 파일은 수동 archive 자료로 열람할 수 있지만, 신규 기능 작업과 APK 검증 기준으로 사용하지 않는다.

## 현재 기준

- React 산출물은 `dist/`만 사용한다.
- Capacitor `webDir`은 `dist`이며, `npm run build:web`으로 생성되는 React 빌드를 바라본다.
- 신규 기능과 검증은 React 화면, React save schema, React smoke 기준으로 작성한다.
- `data/*.json`과 자산 참조 누락은 임시 fallback으로 숨기지 않고 검증 실패나 fatal load로 드러낸다.
- 런타임 소스에는 조용한 `fallback`, `??`, `unknown` 대체를 두지 않는다.
- 모바일 가로 overflow는 0이어야 한다.

## 핵심 React 검증 표면

- `tools/react-vite-smoke.mjs`: 모바일 렌더링, 핵심 UI, production 기본 DEBUG 미노출 검사
- `tools/react-vite-save-smoke.mjs`: save 호환, QA 조작, legacy save 승격, fresh save 흐름 검사
- `tools/react-vite-battle-road-smoke.mjs`: Battle Road/N수/수능/결과 흐름 검사
- `tools/react-vite-expedition-smoke.mjs`: 직업 수락, 졸업생 보존, 원정대원 등록, 원정대 stage 진행 검사
- `tools/react-vite-expedition-rules-smoke.mjs`: 원정대 보스 보상, 전투력 부족, 성장 투자, 승급 합성 규칙 검사
- `tools/react-vite-real-estate-smoke.mjs`: 부동산 모드, 도시/지역, 대형 배경 이미지, 기본 전체 보기, 포커스 휠 확대, 상세 지도 pan, 구매/임대/랭킹/DEBUG 흐름 검사
- `tools/react-vite-real-estate-visual-audit.mjs`: 부동산 도시와 지역 상세 화면 시각 audit
- `tools/react-vite-records-smoke.mjs`: 시험/직장/도감 저장 상태 검사
- `tools/react-vite-education-smoke.mjs`: 교육 탭/업그레이드 검사
- `tools/react-vite-shop-debug-smoke.mjs`: 상점 장비/DEBUG 대원 후보/원정대 편성 검사
- `tools/react-vite-responsive-audit.mjs`: viewport별 overflow, 이미지, 주요 기능 표면 검사
- `tools/visual-asset-smoke.mjs`: 메인 전투 장비 오버레이, 교과 VFX, Battle Road 몬스터 atlas, 원정대 이미지 프레임 렌더링 검사
- `tools/career-outcome-smoke.mjs`: 수능 결과 직업 선택 62종과 초상/랭킹 렌더링 검사
- `tools/retake-year-smoke.mjs`: 결과 탭 `N수 선택` 이후 N수 4조우, 수능 4조우, 결과 복귀 검사

## 부동산 기준

- 상단 모드 탭은 `학생 / 원정대 / 부동산` 3개다.
- 부동산 데이터는 루트 `data/` JSON과 `src/snapshot/assets/` 자산을 명시 참조한다.
- 부동산 전용 재화는 기존 보유금/다이아와 분리된 `부동산 자금`이다.
- 원정대 Stage 돌파 성공 시 부동산 자금을 지급하고, 보스 Stage는 부동산 밸런스 배수를 적용한다.
- 부동산 탭 기본 화면은 `도시 전체 보기`다.
- 지역 상세 화면은 baked PNG 성장 단계를 구매 수량 기준으로 선택한다.
- 지역 상세 화면은 기본 `0.5` 배율 전체 보기로 시작하고, 최대 `1` 배율까지 확대한다.
- PC는 상세 지도 viewport가 포커스된 상태에서 휠로 확대/축소하고, 모바일은 핀치 확대/축소와 드래그 이동을 사용한다.
- 지역 상세 지도 pan은 확대가 적용된 상태에서 드래그 이동을 검사한다.
- 건물/지역/성장 PNG 누락은 검증 실패로 드러나야 한다.

## 작업 원칙

- 신규 작업은 `/plans/<기능>/plan.md` 작성 후 구현한다.
- 구현과 검증이 끝나면 `/implementations/<기능>/implementation.md`를 작성한다.
- 코드 변경과 관련 문서/검증 명령 변경을 같은 작업 범위로 본다.
- snapshot workflow를 다시 활성화해야 하는 상황이 생기면, 별도 계획 문서와 사용자 확인 후 진행한다.
