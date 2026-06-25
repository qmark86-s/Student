# 부동산 건물 배치/누끼 폴리싱 계획

## Summary

- 부동산 건물 원본 시트를 형광분홍 크로마키 배경 기준으로 교체하고, 최종 런타임 PNG는 투명 배경만 사용한다.
- 상세/도시 전체 보기의 건물 배치를 배경의 쿼터뷰 바닥 각도에 맞춘 데이터 기반 슬롯으로 재구성한다.
- 지역별 슬롯을 10개 고정에서 16개 이상의 촘촘한 격자로 확장해, 성장할수록 격자 안이 한 칸씩 채워지는 느낌을 강화한다.
- 같은 부동산 카테고리 안에서도 여러 PNG 바리에이션을 순환 배치해 획일감을 줄인다.

## Key Changes

- `assets/visual-source/real-estate/`에 형광분홍 배경 건물 소스 시트 2장을 저장한다.
  - 소스 파일은 크로마키 확인용으로 보존한다.
  - 최종 `src/snapshot/assets/real-estate-buildings/*.png`에는 형광분홍 픽셀이 남지 않아야 한다.
- `tools/generate-real-estate-building-assets.py`를 갱신한다.
  - 다중 소스 시트를 읽어 32개 기본 셀을 사용한다.
  - 흰색 배경 제거 대신 `#ff00ff` 크로마키 제거를 수행한다.
  - 크로마키 소스가 아니거나 최종 PNG에 형광분홍 잔여 픽셀이 있으면 실패한다.
  - 지역별 variant 풀을 기존보다 넓히고, 각 detail pad에 다른 `buildingAsset`을 순환 배치한다.
  - `detailPads`와 `cityLayout.buildingSlots`를 16칸 쿼터뷰 격자로 재생성한다.
- 데이터 구조를 확장한다.
  - `data/real_estate_district_assets.json.detailPads[]`에 `rotation`을 추가한다.
  - `data/real_estate_city_layout.json.buildingSlots[]`는 `[x, y]` 좌표를 유지하되, 상세 pad와 같은 순서/개수로 맞춘다.
- React 렌더링을 확장한다.
  - 상세 pad/building과 도시 overview dot에 `rotation` CSS 변수를 주입한다.
  - 건물/그림자/빈 필지의 회전을 배경 바닥 각도와 맞춘다.
  - 10개 고정 assert를 제거하고 데이터 슬롯 수 기준으로 렌더링한다.
- 검증/감사를 갱신한다.
  - `real-estate:verify`에서 슬롯 수 16개 이상, 상세/overview 슬롯 수 일치, `rotation`, PNG 파일 존재, 크로마키 잔여 픽셀, 지역별 asset 다양성을 검사한다.
  - `react:real-estate-smoke`와 `react:real-estate-visual-audit`는 데이터 슬롯 수를 기준으로 기대치를 계산한다.

## Test Plan

- `python tools/generate-real-estate-building-assets.py`
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `npm run react:verify`
- `npm run verify:mobile`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react -S` 출력 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` strict 통과

## Assumptions

- save schema는 올리지 않는다. 건물 슬롯/이미지는 보유 수량에서 파생되는 표현 데이터다.
- 주민 이동은 이번 차수에서 구현하지 않지만, `futureResidentPaths`와 건물 슬롯이 겹치지 않도록 z/rotation 기반 배치를 유지한다.
- 기존 흰색 배경 원본은 레거시로 두지 않고, 신규 생성은 형광분홍 소스 2장을 정식 기준으로 사용한다.
