# 부동산 남은 9개 지역 작업 준비 구현 설명

## 목적

사용자가 남은 9개 지역 finalReference를 제공하면 즉시 지역별 reconstruction을 실행할 수 있도록 접수 문서, 계획, CLI 준비를 추가했다. 아직 없는 reference 파일은 활성 데이터에 등록하지 않아 현재 검증을 깨지 않게 했다.

## 변경 사항

- `docs/real_estate_remaining_reference_intake.md`를 추가해 남은 9개 지역 ID, slug, 파일명, 접수 기준, 검증 명령을 정리했다.
- `assets/visual-source/real-estate/district-growth/README.md`를 추가해 원본 PNG 폴더의 파일명 규칙을 남겼다.
- `plans/real-estate-remaining-reference-reconstruction/plan.md`를 추가해 향후 작업 순서와 실패 기준을 명시했다.
- 지역별 실행 래퍼 `tools/generate-real-estate-growth-assets-for-district.py`를 추가했다.
- `package.json`에 `real-estate:growth-assets:district` 스크립트를 추가했다.

## 도구 개선

다음 스크립트는 기존 기본값 `small_studio`를 유지하면서 `--district <id>`를 받을 수 있다.

- `tools/reconstruct-real-estate-slots-from-final-reference.py`
- `tools/extract-real-estate-building-sheet-assets.py`
- `tools/generate-real-estate-baked-district-growth.py`
- `tools/audit-real-estate-reconstruction-slots.py`

생성기는 지역별 runtime PNG만 갱신하고, `data/real_estate_district_growth_assets.json`의 다른 지역 항목을 덮어쓰지 않도록 upsert한다. 슬롯 데이터도 `districts` 배열에 지역별로 누적된다.

## 검증

- `npm run real-estate:growth-assets:district -- --district small_studio`: 통과
- `npm run real-estate:verify`: 통과
- `small_studio reconstruction 감사`: `coverage=1.000`, `meanAbsDelta=0.00`

## 다음 작업 메모

남은 지역은 finalReference를 받은 뒤 `data/real_estate_reconstruction_sources.json`에 한 지역씩 추가한다. base가 제공되지 않은 지역은 현재 상세 배경을 base로 사용할 수 있지만, finalReference 제작의 0단계와 동일한지 먼저 이미지로 확인해야 한다.
