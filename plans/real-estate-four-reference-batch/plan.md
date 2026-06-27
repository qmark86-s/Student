# 부동산 4개 지역 finalReference batch 계획

## 목표

사용자가 먼저 제공한 4개 finalReference 이미지를 기존 `small_studio`와 같은 baked 성장 PNG 체계에 연결한다. 잘린 건물 조각이 중간 단계에 보이지 않도록 보수적으로 처리하고, 최종 단계는 제공된 finalReference와 픽셀 단위로 일치시킨다.

## 대상 매핑

| 첨부 | 지역 id | slug | 용도 |
| --- | --- | --- | --- |
| `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (2).png` | `shop_unit` | `shop-unit` | 상가 점포 finalReference |
| `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (5).png` | `two_room` | `two-room` | 투룸 finalReference |
| `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (6).png` | `villa` | `villa` | 빌라 finalReference |
| `ChatGPT Image 2026년 6월 26일 오후 09_09_52 (7).png` | `apartment_building` | `apartment-building` | 아파트 동 finalReference |

## 확인 내용

- `git status --short` 확인 완료. 기존 dirty 파일은 되돌리지 않는다.
- `/implementations` 확인 완료. 기존 reconstruction 문서와 small_studio feedback polish 문서를 기준으로 확장한다.
- MCP 자산 확인 완료. 현재 노출 MCP는 이 웹 PNG 작업에 직접 맞는 전용 이미지 분석 도구가 아니므로 로컬 PIL/Node 검증을 사용한다.
- 첨부 4개와 기존 상세 배경은 모두 `1672x941`이다.

## 구현 방침

1. 첨부 finalReference를 `assets/visual-source/real-estate/district-growth/<slug>-final-reference.png`로 복사한다.
2. 기존 상세 배경 `src/snapshot/assets/visual-real-estate-district-<slug>.png`를 `<slug>-base.png`로 복사한다.
3. 4개 지역은 `locked-prefix-composite` + `finalReferenceVisualGroupPatch` 방식으로 처리한다.
4. 새 building sheet는 받지 않았으므로 기존 런타임 건물 PNG를 슬롯 메타데이터로 사용하고, 실제 화면 렌더는 finalReference patch를 사용한다.
5. 런타임 데이터는 기존 baked growth asset 구조에 누적 등록한다. 앱 상세 화면은 baked PNG가 있는 지역의 DOM 건물 layer를 끈다.
6. 중간 단계에서 잘린 건물이나 어색한 배경 patch가 보이면 해당 visual group reveal을 뒤로 미루거나 지역별 마스크를 재조정한다.

## 검증

- `npm run real-estate:growth-assets:district -- --district <id>`
- `npm run react:real-estate-pixel-audit -- --district <id>`
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- `git diff --check`

## 완료 산출물

- `src/snapshot/assets/real-estate-district-growth/<slug>-growth-XX.png`: 지역별 성장 테이블에 등록된 단계 수만큼 생성
- `artifacts/real-estate-reconstruction/<slug>-stage-contact-sheet.png`
- `artifacts/real-estate-reconstruction/<slug>-reconstruction-audit-report.json`
- 갱신된 `data/real_estate_reconstruction_sources.json`
- 갱신된 `data/real_estate_reconstruction_slots.json`
- 갱신된 `data/real_estate_district_growth_assets.json`

## 구현 결과

- `shop_unit`, `two_room`, `villa`, `apartment_building` 4개 지역을 `locked-prefix-composite` + `finalReferenceVisualGroupPatch` 방식으로 등록 완료.
- 각 지역의 base/finalReference 해상도는 모두 `1672x941`로 확인 완료.
- 각 지역의 앱용 baked PNG는 `836x470`으로 생성 완료.
- 0..15단계는 base와 픽셀 단위로 일치하고, 16단계는 사용자가 제공한 finalReference와 픽셀 단위로 일치한다.
- 기존 런타임 건물 PNG를 쓰는 가상 시트이므로 건물 cutout 추출은 명시적으로 skip report만 남긴다.

## 검증 결과

- `python -m py_compile tools/reconstruct-real-estate-slots-from-final-reference.py tools/generate-real-estate-baked-district-growth.py tools/audit-real-estate-reconstruction-slots.py tools/extract-real-estate-building-sheet-assets.py tools/generate-real-estate-growth-assets-for-district.py` 통과.
- `npm run real-estate:growth-assets:district -- --district shop_unit` 통과.
- `npm run real-estate:growth-assets:district -- --district two_room` 통과.
- `npm run real-estate:growth-assets:district -- --district villa` 통과.
- `npm run real-estate:growth-assets:district -- --district apartment_building` 통과.
- `npm run react:real-estate-pixel-audit -- --district shop_unit` 통과, `meanAbsDelta=0.00`.
- `npm run react:real-estate-pixel-audit -- --district two_room` 통과, `meanAbsDelta=0.00`.
- `npm run react:real-estate-pixel-audit -- --district villa` 통과, `meanAbsDelta=0.00`.
- `npm run react:real-estate-pixel-audit -- --district apartment_building` 통과, `meanAbsDelta=0.00`.
- `npm run real-estate:verify` 통과. baked 성장 리소스는 총 5종이다.
- `npm run react:build` 통과.
- `npm run react:real-estate-smoke` 통과.
- `npm run react:real-estate-visual-audit` 통과.
