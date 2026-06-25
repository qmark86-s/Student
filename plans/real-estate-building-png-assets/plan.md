# 부동산 PNG 건물 리소스/DEBUG 고도화 계획

## Summary

- 지역 상세 화면의 건물 오버레이를 CSS 도형에서 PNG 건물 리소스로 교체한다.
- 건물 리소스는 `data/real_estate_building_assets.json` 테이블로 관리하고, 각 상세 pad는 `buildingAsset`을 명시해 어떤 PNG를 쓸지 데이터에서 결정한다.
- 부동산 DEBUG 메뉴를 보강해 QA에서 자금, Stage, 매물 수량, 풀성장 상태를 빠르게 만들 수 있게 한다.
- 건물 PNG가 배경과 어울리는지 10개 지역 풀성장 전수 캡처로 반복 확인한다.

## Key Changes

- 새 데이터 테이블 `data/real_estate_building_assets.json`을 추가한다.
  - `version`, `assets`, `help`를 둔다.
  - 각 asset은 `id`, `file`, `theme`, `variant`, `displayWidth`, `displayHeight`, `anchorX`, `anchorY`, `shadow`, `help`를 가진다.
  - `file`은 `src/snapshot/assets/real-estate-buildings/*.png`에 존재해야 한다.
- `data/real_estate_district_assets.json`의 모든 `detailPads`에 `buildingAsset`을 추가한다.
  - 같은 district 안에서도 pad별 asset을 다르게 배치해 반복감을 줄인다.
  - `variant`는 기존 검증/분류용으로 유지하되, 실제 이미지는 `buildingAsset`이 결정한다.
- React 렌더링을 PNG 기반으로 전환한다.
  - `import.meta.glob("../snapshot/assets/real-estate-buildings/*.png")`로 건물 리소스를 로드한다.
  - `RealEstateDetailDevelopmentLayer`는 CSS 몸체/지붕/창문 드로잉 대신 `<img>`를 렌더링한다.
  - 런타임에서 매핑 파일을 못 찾으면 즉시 assert로 실패한다.
- CSS 건물 도형 스타일은 제거하거나 PNG 배치용 wrapper/그림자 스타일만 남긴다.
- 부동산 DEBUG 메뉴를 추가한다.
  - QA 모드에서만 노출한다.
  - 부동산 자금 +1M
  - 부동산 최고 Stage 100
  - 모든 매물 1채
  - 모든 매물 1000채
  - 부동산 상태 초기화
  - 기존 주간 보상 수령은 유지하고 중복 방지 상태를 공유한다.
- 검증을 확장한다.
  - `real-estate:verify`에서 건물 asset id 중복, 파일 존재, theme/variant 매칭, display/anchor/shadow 범위, pad의 `buildingAsset` 참조를 검사한다.
  - `react:real-estate-smoke`에서 PNG 건물 이미지 로드와 DEBUG 버튼 동작을 확인한다.
  - 후속 폴리싱 기준으로 `react:real-estate-visual-audit`에서 풀성장 도시 전체 보기 160개 PNG 슬롯, 10개 지역 건물 이미지 16개, 로드 완료, asset id 고유성/반복 완화 기준을 확인하고 최신 contact sheet를 갱신한다.

## Asset Direction

- 아트 방향은 기존 도시 배경과 맞는 아이소메트릭/복셀 감성의 모바일 게임 건물이다.
- 배경과 어울리도록 과한 유리 광택, 순수 CSS 같은 직사각형, 강한 outline을 피한다.
- 저층 주거/빌라/상가/중층/아파트/오피스/랜드마크가 서로 다른 실루엣을 가져야 한다.
- 최종 PNG는 투명 배경이며, 그림자는 이미지 자체 또는 wrapper shadow로 배경 필지 위에 자연스럽게 얹힌다.

## Test Plan

- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `npm run react:shop-debug-smoke`
- `npm run react:verify`
- `npm run verify:mobile`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 출력 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict 통과

## Assumptions

- 기존 CSS 도형 방식은 유지하지 않고 PNG 렌더링으로 교체한다.
- save schema는 올리지 않는다. 건물 리소스는 보유 수량에서 파생되는 표현 데이터다.
- 생성/제작한 PNG는 프로젝트 안에 저장하고, 런타임은 테이블에 명시된 파일만 사용한다.
- 주민 이동은 이번 차수에서 구현하지 않지만, 기존 `futureResidentPaths`와 건물 PNG 기준으로 다음 차수에서 붙일 수 있게 충돌을 피한다.
