# React/Vite 설정 모달 아이콘 패리티 계획

## 목표
- React 설정 모달의 각 설정 행 아이콘을 원본 HTML과 같은 SVG 의미/형태로 맞춘다.
- 아이콘이 텍스트와 스타일은 같지만 시각적으로 다른 상태를 숨기지 않도록 deep parity에 SVG signature 검증을 추가한다.
- 런타임 fallback이나 임시 대체 아이콘은 추가하지 않는다.

## 구현 범위
1. `src/react/App.jsx`의 `SettingsModal` 설정 행 아이콘을 원본 HTML 순서와 같은 아이콘으로 교체한다.
2. 저장 초기화 확인 버튼도 원본 위험 동작 의미에 맞춰 삭제 아이콘을 사용한다.
3. `tools/react-vite-ui-parity-deep-smoke.mjs`가 설정 행 `.setting-icon svg`의 tag, attribute, path signature를 수집한다.
4. snapshot/React SVG signature가 다르면 `svgDiffs`를 리포트하고 deep parity 실패로 처리한다.
5. 기존 text/style/regionVisuals 검증과 함께 `svgDiffs: []`를 완료 기준으로 둔다.

## 검증 기준
- `npm run react:build`
- `npm run react:deep-parity`
- `$env:REACT_DEEP_PARITY_STATIC_ANIMATIONS='1'; npm run react:deep-parity`
- `npm run react:verify`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`

## 2026-06-24 결과
- 설정 모달 아이콘 매핑을 원본 순서로 맞췄다.
- 최신 live `react:deep-parity`에서 설정 모달은 normalized text 일치, styleDiffs 0건, svgDiffs 0건이다.
- 설정 모달 전체 visual diff는 `0.1827%`, threshold diff는 `0.1495%`다.
- 설정 아이콘 region diff는 `0%`로, 직전 아이콘 mismatch가 사라졌다.
- gacha는 live animation phase 기준 visual diff `26.2213%`, threshold diff `2.5024%`지만 static animation mode에서는 visual diff `0.4866%`, threshold diff `0.0594%`다.
- `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:deep-parity`, static deep parity, no-fallback 검색, `git diff --check`, MCP 정책 게이트를 통과했다.
