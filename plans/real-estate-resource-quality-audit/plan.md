# 부동산 리소스 품질/데이터 드리븐 전수 감사 계획

## Summary

- 지역별 부동산 상세 리소스가 실제 화면에서 배경과 건물 오버레이가 자연스럽게 어우러지는지 전수 확인한다.
- 상세 배경 선택이 `App.jsx`의 id 하드코딩이 아니라 `real_estate_district_assets.json.backgroundAsset` 데이터에서 파생되도록 보강한다.
- 10개 지역의 풀성장 상세 화면 캡처를 생성하고, 건물 수/테마/variant/배경 src/오버레이 위치를 검증한다.
- 완료 후 구현 문서와 React 검증 문서에 전수 감사 기준과 결과를 남긴다.

## Key Changes

- React 상세 배경 resolver를 데이터 기반으로 전환한다.
  - Vite `import.meta.glob`로 `visual-real-estate-district-*.png` 파일을 모은다.
  - `card.districtBackgroundAsset` 파일명으로 실제 asset URL을 찾는다.
  - 파일이 없거나 중복되면 런타임 assert와 `real-estate:verify`에서 드러나게 한다.
- 리소스 전수 감사 스크립트를 추가한다.
  - `npm run react:real-estate-visual-audit`
  - full-growth seed로 10개 district 상세 화면을 순회한다.
  - 각 화면에서 상세 배경 로드, 개발 건물 10개, `data-building-theme`, `data-building-variant`, viewport overflow, screenshot 저장을 확인한다.
  - 결과 JSON과 10개 PNG 캡처를 `artifacts/real-estate-resource-quality-audit/`에 남긴다.
- 검증 문서와 구현 문서를 갱신한다.
  - 데이터 흐름: `data/real_estate_district_assets.json -> createRealEstateViewModel -> React resolver -> 상세 scene`.
  - 주민 이동/말풍선은 `futureResidentPaths` 기반 확장 구조로 유지한다.

## Test Plan

- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `npm run react:verify`
- `npm run verify:mobile`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 출력 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict 통과

## Quality Criteria

- 10개 지역 상세 화면 모두 서로 다른 전용 배경을 로드해야 한다.
- 풀성장 seed에서 모든 지역은 상세 건물 10개를 표시해야 한다.
- 건물 오버레이는 각 지역 theme와 variant를 데이터에서 받아야 한다.
- 하드코딩된 id별 상세 배경 선택은 남기지 않는다.
- 새 오류를 숨기는 fallback이나 silent default를 추가하지 않는다.
