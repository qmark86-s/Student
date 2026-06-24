# 부동산 지역별 정식 리소스 고도화 계획

## Summary
- 부동산 지역 상세 화면을 공용 배경 1장 구조에서 지역별 정식 리소스 구조로 확장한다.
- 10개 부동산 지역마다 어울리는 상세 배경 bitmap을 생성하고, 각 지역의 건물 오버레이가 배경 필지/도로/원근감과 맞도록 데이터 기반 패드와 테마를 분리한다.
- 건물 수량 증가 시 상세 배경 위에 올라오는 건물은 지역별 저층/상가/빌라/오피스텔/아파트/타워/복합개발 스타일로 렌더링한다.
- 작업 완료 후 `건물 1개당 주민 1명` 이동/말풍선 시스템을 구현 가능한 구조인지 검토하고 문서화한다.

## Key Changes
- 생성 bitmap 리소스 10장을 추가한다.
  - `visual-real-estate-district-small-studio.png`
  - `visual-real-estate-district-two-room.png`
  - `visual-real-estate-district-villa.png`
  - `visual-real-estate-district-officetel.png`
  - `visual-real-estate-district-shop-unit.png`
  - `visual-real-estate-district-small-building.png`
  - `visual-real-estate-district-apartment-building.png`
  - `visual-real-estate-district-apartment-complex.png`
  - `visual-real-estate-district-office-tower.png`
  - `visual-real-estate-district-mixed-development.png`
- 새 데이터 `data/real_estate_district_assets.json`을 추가한다.
  - 각 district id는 `real_estates.json.properties`와 1:1로 매칭한다.
  - `backgroundAsset`, `buildingTheme`, `detailPads`, `futureResidentPaths`, `speechTone`, `help`를 가진다.
  - `detailPads`는 상세 화면 200% x 200% 좌표 기준의 건물 배치 지점, 원근 scale, z-depth, variant를 정의한다.
  - `futureResidentPaths`는 이번 차수에서 렌더링하지 않지만, 추후 주민 이동이 도로를 따라가도록 검토/검증 가능한 경로 데이터로 둔다.
- `real-estate:verify`를 확장한다.
  - district asset 수, id 순서, 배경 파일명, building theme, detail pad 좌표/scale/z/variant, future resident path 좌표, help 누락을 검사한다.
- React UI를 확장한다.
  - 상세 배경 이미지는 선택 district id에 따라 바뀐다.
  - 상세 건물은 공용 pad 배열 대신 view model의 `districtDetailPads`, `districtBuildingTheme`을 사용한다.
  - 건물 DOM에는 theme/variant/depth 데이터 속성을 둬 CSS에서 지역별로 다르게 렌더링한다.
  - 기존 도시 전체 보기의 개발도 마커는 유지하되, 상세 화면 건물은 배경과 섞이도록 더 낮은 채도와 그림자/원근을 사용한다.
- 문서화
  - `implementations/real-estate-district-assets/implementation.md`에 리소스 구조, 검증, 주민 시스템 검토를 기록한다.
  - README와 React 검증 문서를 지역별 정식 리소스 기준으로 갱신한다.

## Test Plan
- `npm run real-estate:verify`
  - 신규 `real_estate_district_assets.json` 검증 포함.
- `npm run react:real-estate-smoke`
  - 10개 지역 중 최소 저층/상가/아파트/타워/복합개발 상세 배경 로드 확인.
  - 선택 지역별 `data-building-theme`과 상세 배경 src가 달라지는지 확인.
  - 구매 후 상세 건물이 해당 지역 theme/variant로 렌더링되는지 확인.
  - 풀성장 seed에서 상세 건물 10개 유지 확인.
- 기존 검증 유지
  - `npm run react:verify`
  - `npm run verify:mobile`
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 출력 0건
  - `git diff --check`
  - `mcp__UmgMcp.project_policy_gate` strict 통과

## Assumptions
- 이번 차수는 지역별 상세 배경 10장과 CSS/데이터 기반 건물 리소스를 정식화한다.
- 개별 건물 sprite atlas 투명 PNG는 생성 안정성과 배경 합성 품질 리스크가 있어 이번 차수에서는 사용하지 않고, 배경에 맞춘 CSS 2.5D 건물 오브젝트로 렌더링한다.
- 주민 이동과 말풍선은 이번 차수에서 실제 렌더링하지 않는다. 다만 경로/밀도/원근/말풍선 규칙을 검토하고, 이후 구현 가능한 데이터 구조를 준비한다.
