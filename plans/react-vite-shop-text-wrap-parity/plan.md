# React/Vite 상점 상품 설명 줄바꿈 패리티 계획

## 목표
- React/Vite 상점 상품 카드의 subtitle/note 텍스트가 원본 HTML처럼 2줄 영역에서 줄바꿈되게 한다.
- 기존 parity layer 위에 남아 있는 이전 규칙의 `white-space: nowrap` 때문에 상품 설명이 한 줄 `...`로 잘리는 문제를 제거한다.
- 상점 카드 크기, 보상 배지, 버튼 폭, 상점 기능 동작은 유지한다.

## 구현 범위
1. `src/react/styles.css`의 상점 parity layer에서 `.shop-product-main p`, `.shop-product-bottom small`에 `white-space: normal`을 명시한다.
2. 상품명과 보상 배지는 기존처럼 한 줄 말줄임을 유지한다.
3. `react:deep-parity` 정적 캡처 기준으로 `보유금`/`로봇` 카테고리 visual diff가 줄어드는지 확인한다.
4. `tools/react-vite-ui-parity-deep-smoke.mjs`의 기본 캡처를 정적 animation 기준으로 전환해 가챠 live animation phase가 deep parity 기본 리포트를 오염시키지 않게 한다.

## 검증 기준
- `npm run react:build`
- `npm run react:deep-parity`
- live animation phase 확인이 필요할 때만 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`
- `npm run react:interactive-parity`
- `rg -n "\?\?|fallback|Fallback|unknown" src/react` 결과 0건
- `git diff --check`

## 2026-06-24 구현 결과
- `.shop-product-main p`, `.shop-product-bottom small`의 `white-space: normal`을 parity layer에 명시해 보유금/로봇 상품 설명이 원본 HTML처럼 줄바꿈된다.
- `react:deep-parity` 기본값은 정적 animation 기준이며, 최신 실행 결과 `staticAnimations: true`, failures 0건이다.
- shop threshold diff는 `보유금 0.4956%`, `로봇 0.0965%`, `다이아 0.149%`, `광고 0.0965%`, `패키지 0.1022%`, `패스 0.0965%`다.
- gacha threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`, styleDiffs는 0건이다.
- `npm run react:build`, `npm run react:shop-debug-smoke`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.
