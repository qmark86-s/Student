# React/Vite 상점 상품 설명 줄바꿈 패리티 구현

## 목적
- React/Vite 상점 상품 카드의 subtitle/note 텍스트가 원본 HTML처럼 줄바꿈되게 했다.
- 원정대 동료 배치처럼 한 줄로 몰려 보이는 UI 회귀를 놓치지 않기 위해, deep parity의 기본 비교 기준을 정적 animation 캡처로 고정했다.
- 런타임 fallback이나 임시 기본값은 추가하지 않았다.

## 변경 내용
- `src/react/styles.css`
  - `.shop-product-main p`, `.shop-product-bottom small`에 `white-space: normal`을 명시했다.
  - 상품명과 보상 배지는 기존 한 줄 말줄임을 유지한다.
- `tools/react-vite-ui-parity-deep-smoke.mjs`
  - `npm run react:deep-parity` 기본값을 `staticAnimations: true`로 바꿨다.
  - live animation phase 확인이 필요할 때만 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`를 사용한다.
- `plans/react-vite-shop-text-wrap-parity/plan.md`, `docs/react-vite-parity-migration.md`, 관련 React/Vite parity 문서를 최신 기준으로 갱신했다.

## 검증 결과
- `npm run react:build`: 통과
- `npm run react:deep-parity`: 통과, `staticAnimations: true`, failures 0건
- 최신 shop threshold diff:
  - `다이아 0.149%`
  - `보유금 0.4956%`
  - `로봇 0.0965%`
  - `광고 0.0965%`
  - `패키지 0.1022%`
  - `패스 0.0965%`
- 최신 gacha threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이고 styleDiffs는 0건이다.
- `npm run react:shop-debug-smoke`: 통과, failures 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failures 0건
- `rg -n "\?\?|fallback|Fallback|unknown" src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음

## 유지보수 기준
- 상점 상품 subtitle/note는 원본 HTML과 같은 2줄 영역 줄바꿈을 유지한다.
- deep parity 기본 리포트는 최종 UI 형태 비교용으로 사용하고, live animation phase는 opt-in 리포트로만 분리한다.
- 큰 visual diff가 생기면 먼저 text/style/svg/region rectMismatch를 확인하고, 불일치가 있으면 UI 회귀로 본다.
