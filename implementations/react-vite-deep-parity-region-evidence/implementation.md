# React/Vite deep parity region evidence 구현

## 목적
- `react:deep-parity`가 상점/뽑기/설정/디버그 모달의 전체 screenshot diff뿐 아니라 핵심 selector 영역별 diff와 hotspot을 기록하게 했다.
- 로봇 뽑기 팝업처럼 live animation/blur/폰트 렌더링 잔차가 큰 화면에서, 실제 레이아웃 차이인지 렌더링 잔차인지 분리할 근거를 남긴다.

## 변경 내용
- `tools/react-vite-ui-parity-deep-smoke.mjs`
  - 캡처 결과에 viewport와 devicePixelRatio를 포함한다.
  - `compareScenarioVisuals`가 `regionVisuals`를 생성한다.
  - 각 region은 selector rect를 screenshot 좌표로 환산해 diff, threshold diff, mean absolute diff, max channel diff를 기록한다.
  - region별 32px hotspot 상위 3개를 기록한다.
  - rect 차이가 `REACT_DEEP_PARITY_REGION_RECT_TOLERANCE` 기본 3px를 넘으면 `rectMismatch`로 표시한다.
  - gacha 내부 증거 selector를 `copyBadge`, `copyTitle`, `copyName`, `copyDescription`, `metricLabel`, `metricValue`, `cardBadge`, `cardTitle`, `cardMeta`, `cardIndex`, `confirmIcon`, `confirmText`까지 확장했다.
  - style snapshot에 `fontFamily`, `fontStyle`, `fontSynthesis`, `textRendering`, `webkitFontSmoothing`을 추가해 glyph diff가 실제 폰트/렌더링 설정 차이인지 확인한다.
  - 기본 모드에서는 캡처 직전 animation/transition을 제거해 live phase가 아니라 최종 UI 형태를 비교한다. live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0`으로 명시적으로 켠다.
  - 설정 모달 `.setting-row .setting-icon svg`의 SVG signature를 비교해 아이콘 path 불일치를 `svgDiffs`로 기록하고 실패 처리한다.

## 검증 결과
- `npm run react:deep-parity`: 통과
- 최신 기본 정적 animation 리포트:
  - failures 0건
  - gacha normalized text equal `true`
  - gacha font/rendering style까지 포함한 styleDiffs 0건
  - gacha visual diff `0.4866%`, threshold diff `0.0594%`, mean absolute diff `0.0336`
  - gacha region rectMismatch 0건
- 설정 모달 최신 기본 settle 리포트:
  - settings visual diff `0.1827%`, threshold diff `0.1495%`
  - settings icon region diff `0%`
  - settings styleDiffs 0건, svgDiffs 0건
- live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행한다. 이전 live settle 리포트의 gacha visual diff `26.2213%`, threshold diff `2.5024%`, top region `metricLabel` threshold diff `37.0982%`는 layout 회귀가 아니라 animation/blur 잔차로 분류한다.
- freeze mode는 등장 애니메이션 초기 프레임을 멈춰 팝업 좌표가 갈라지므로 최신 기준 리포트로 쓰지 않는다. 최종 UI 형태 확인에는 기본 정적 animation 리포트를 사용한다.

## 산출물
- `artifacts/react-vite-ui-parity-deep-current/text-report.json`
- `artifacts/react-vite-ui-parity-deep-current/snapshot-gacha.png`
- `artifacts/react-vite-ui-parity-deep-current/react-gacha.png`

## 유지보수 기준
- gacha 전체 diff가 크더라도 `equal`, `styleDiffs`, `regionVisuals[].rectMismatch`를 함께 본다.
- rect mismatch가 생기면 레이아웃 회귀로 우선 분류한다.
- rect/style이 모두 같고 text도 같으면 남은 diff는 animation, blur, anti-aliasing, glyph rasterization 잔차로 분류한다.
- 런타임 앱에는 fallback이나 임시 대체를 추가하지 않는다.
