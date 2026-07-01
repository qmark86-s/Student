# 부동산 수동 성장 PNG 적용 구현

## 개요

사용자가 새로 교체/추가한 `src/snapshot/assets/real-estate-district-growth/*.png`를 기존 부동산 성장 시스템에 연결했다. 기존 런타임 로직은 이미 `data/real_estate_district_growth_assets.json`의 `stages[].minOwnedCount -> file` 테이블을 기준으로 상세 배경을 고르므로, 이번 작업은 새 PNG를 데이터 테이블과 검증 경로에 반영하는 방식으로 진행했다.

기존 원정대 연구 관련 dirty 변경은 작업 범위에서 제외했다.

## 적용 파일

- `data/real_estate_district_growth_assets.json`
  - 새로 늘어난 성장 PNG를 `stages`에 연결했다.
  - `maxOwnedCount`와 순차 해금 조건은 유지했다.
- `tools/validate-real-estate-config.mjs`
  - `src/snapshot/assets/real-estate-district-growth` 폴더에 있지만 데이터에 연결되지 않은 PNG가 있으면 검증 실패하도록 했다.
- `tools/audit-real-estate-reconstruction-slots.py`
  - 생성 리포트 기준 이미지가 아닌 수동 runtime PNG를 `manualRuntimePng` 모드로 감사한다.
  - 모든 stage PNG 로드, 해상도, 파일 크기, 0단계 대비 최종 단계 변화량을 검사한다.
- `plans/real-estate-growth-purchase-binding/plan.md`
  - 현재 성장 테이블로 갱신했다.
- `implementations/real-estate-growth-purchase-binding/implementation.md`
  - 2026-07-01 수동 PNG 적용 내역과 검증 기준을 추가했다.

## 성장 단계 적용표

| 지역 | 연결된 최종 파일 | stage 수 | maxOwnedCount | minOwnedCount |
|---|---|---:|---:|---|
| 작은 원룸 | `small-studio-growth-07.png` | 10 | 10 | `0,1,2,3,4,5,6,7,8,9` |
| 투룸 | `two-room-growth-08.png` | 10 | 12 | `0,1,2,3,4,5,7,8,10,11` |
| 빌라 | `villa-growth-04.png` | 10 | 14 | `0,1,2,3,5,6,8,10,12,13` |
| 오피스텔 | `officetel-growth-08.png` | 10 | 16 | `0,1,2,4,6,8,10,12,14,15` |
| 상가 점포 | `shop-unit-growth-04.png` | 10 | 16 | `0,1,2,4,6,8,10,12,14,15` |
| 꼬마빌딩 | `small-building-growth-03.png` | 10 | 18 | `0,1,3,5,7,9,11,13,15,17` |
| 아파트 동 | `apartment-building-growth-04.png` | 10 | 24 | `0,1,3,5,8,11,14,17,20,23` |
| 아파트 단지 | `apartment-complex-growth-03.png` | 10 | 28 | `0,1,4,7,10,13,16,19,23,27` |
| 오피스 빌딩 | `office-tower-growth-06.png` | 10 | 32 | `0,1,5,9,13,17,21,25,28,31` |
| 복합 개발지 | `mixed-development-growth-08.png` | 10 | 40 | `0,1,5,9,13,17,22,28,34,39` |

PNG가 10개보다 적은 지역은 위 10개 논리 단계 중 일부 단계가 같은 PNG를 재사용한다. 이 중복은 의도된 무변화 단계이며, 추후 말풍선/보상 같은 별도 피드백을 붙일 슬롯으로 사용한다.

## 검증 결과

- `node tools/validate-real-estate-config.mjs` 통과.
- `python -m py_compile tools/audit-real-estate-reconstruction-slots.py` 통과.
- `npm run real-estate:verify` 통과.
- 10개 지역 `python tools/audit-real-estate-reconstruction-slots.py --district <id>` 통과.
- `npm run real-estate:growth-review -- --district ... --index-file manual-growth-image-application-review.html` 통과.
- `npm run react:build` 통과.
- `npm run react:real-estate-smoke` 통과.
- `npm run react:real-estate-visual-audit` 통과.

## 산출물

- 성장 검수 인덱스: `artifacts/real-estate-reconstruction/manual-growth-image-application-review.html`
- 부동산 전수 시각 감사: `artifacts/real-estate-resource-quality-audit/report.json`
- 지역별 runtime PNG 감사 리포트: `artifacts/real-estate-reconstruction/<slug>-reconstruction-audit-report.json`

## 주의사항

- 이번 작업은 새 PNG를 기존 성장 테이블에 적용하는 작업이며, 부동산 구매 비용, 해금 순서, 최대 보유 수량 밸런스는 바꾸지 않았다.
- 새 성장 PNG를 추가할 때는 파일만 넣고 끝내지 말고 `data/real_estate_district_growth_assets.json`의 stage에도 반드시 연결해야 한다. 이제 미연결 PNG는 `npm run real-estate:verify`에서 실패한다.
- 현재 검증 기준은 지역별 stage 수 10개와 첫 구매 이미지 변경을 강제한다. 같은 PNG를 여러 stage에 연결하는 것은 허용한다.
- 수동 교체 PNG는 생성 리포트와 해상도/차수가 다를 수 있으므로 `manualRuntimePng` 감사 결과를 함께 확인한다.
