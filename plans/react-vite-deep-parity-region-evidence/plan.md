# React/Vite deep parity region evidence 보강 계획

## 목표
- 상점/뽑기/설정/디버그 deep parity가 전체 스크린샷 diff만 기록하지 않고, 주요 selector 영역별 diff와 hotspot을 남기게 한다.
- 로봇 뽑기 팝업처럼 전체 diff가 커도 텍스트/핵심 스타일은 일치하는 경우, 차이가 실제 UI 구조 불일치인지 애니메이션/blur/안티앨리어싱 잔차인지 더 강하게 판별한다.
- 런타임 fallback은 추가하지 않는다.

## 구현 범위
1. `tools/react-vite-ui-parity-deep-smoke.mjs`의 캡처 결과에 viewport와 devicePixelRatio를 저장한다.
2. `compareScenarioVisuals`가 style snapshot의 selector rect를 기준으로 영역별 screenshot diff를 계산한다.
3. 영역 rect 크기가 크게 다르면 region 비교에 mismatch를 기록해 layout 차이를 숨기지 않는다.
4. 각 영역 diff에는 32px 단위 top hotspot을 기록한다.
5. `text-report.json`에 `regionVisuals`를 저장한다.
6. text/glyph 차이를 해석하기 위해 `fontFamily`, `fontStyle`, `fontSynthesis`, `textRendering`, `webkitFontSmoothing`도 style snapshot에 포함한다.
7. 기본 캡처를 정적 animation 기준으로 두고, live animation phase 확인이 필요할 때만 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0` 모드를 사용한다.
8. 설정 모달 아이콘처럼 style/text는 같아도 SVG path가 다른 경우를 잡기 위해 scenario별 SVG signature diff를 기록한다.

## 검증 기준
- `npm run react:deep-parity`
- `npm run react:verify`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`

## 2026-06-24 구현 결과
- `tools/react-vite-ui-parity-deep-smoke.mjs`가 capture viewport/deviceScaleFactor를 저장하고, selector rect를 screenshot 좌표로 환산해 `regionVisuals`를 기록한다.
- gacha 내부 selector evidence를 `copyBadge`, `copyTitle`, `copyName`, `copyDescription`, `metricLabel`, `metricValue`, `cardBadge`, `cardTitle`, `cardMeta`, `cardIndex`, `confirmIcon`, `confirmText`까지 확장했다.
- 최신 `npm run react:deep-parity`: 통과, failures 0건.
- gacha normalized text는 일치하고, 폰트 계열/렌더링 속성까지 포함한 styleDiffs는 0건이다.
- 최신 기본 정적 animation 리포트 기준 gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이다.
- live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행한다. 이전 live settle 리포트 기준 gacha visual diff `26.2213%`, threshold diff `2.5024%`, top region `metricLabel` threshold diff `37.0982%`는 레이아웃 회귀가 아니라 animation/blur 잔차로 분류한다.
- static mode에서도 gacha normalized text 일치, styleDiffs 0건, region rectMismatch 0건이다.
- gacha region rectMismatch는 0건이다.
- 설정 모달은 원본 HTML과 같은 아이콘 SVG signature를 사용하며, 최신 live 리포트 기준 settings visual diff `0.1827%`, threshold diff `0.1495%`, icon region diff `0%`, styleDiffs 0건, svgDiffs 0건이다.
- freeze animation 모드는 등장 애니메이션 초기 프레임을 멈춰 좌표가 갈라지므로 최신 기준 리포트가 아니다. 최종 형태 확인에는 기본 정적 animation 리포트를 쓰고, live phase 검사는 명시적으로 opt-in 한다.
