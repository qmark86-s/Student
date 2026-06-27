# 부동산 남은 지역 finalReference 접수/진행 기준

## 목적

`small_studio`에서 확정한 방식 그대로 나머지 부동산 지역의 지역별 권장 단계 baked PNG를 만든다. 기준은 최종 참조 이미지와의 픽셀 유사도이며, 중간 단계에서 건물이나 단지가 잘려 보이면 완료로 보지 않는다.

## 진행 상태

| id | 상태 | 현재 방식 | 비고 |
| --- | --- | --- | --- |
| `small_studio` | 완료 | `locked-prefix-composite` + finalReference visual group patch | `00..05`, 빨간 필지 선반영 + 녹색 조각 최종 지연 |
| `shop_unit` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..04`, 사용자 지정 1/2/3/4번 필지 순서로 누적 채움 |
| `two_room` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..04`, 변화 약한 중간/최종 직전 단계 제거 |
| `villa` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..04`, 변화 약한 8/14 중간 단계 제거 |
| `apartment_building` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..04`, 빨간 원으로 확인된 partial 고층동을 본체와 함께 reveal |
| `officetel` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..05`, 오른쪽 빨간 필지 우선 reveal |
| `small_building` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..03`, 녹색 X 초반 조각 제거 + 하단 group 동시 reveal |
| `apartment_complex` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..03`, 왼쪽/오른쪽/전면 단지 3덩어리 reveal |
| `office_tower` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..04`, 완성 tower group 단위 유지 |
| `mixed_development` | 완료 | `locked-prefix-composite` + `finalReferenceVisualGroupPatch` | `00..05`, 반복/no-new 단계 제거 + 하단-left X group 최종 지연 |

## 지역과 파일명

| id | 이름 | base 파일 | finalReference 파일 | 현재 상세 배경 |
| --- | --- | --- | --- | --- |
| `two_room` | 투룸 | `two-room-base.png` | `two-room-final-reference.png` | `visual-real-estate-district-two-room.png` |
| `villa` | 빌라 | `villa-base.png` | `villa-final-reference.png` | `visual-real-estate-district-villa.png` |
| `officetel` | 오피스텔 | `officetel-base.png` | `officetel-final-reference.png` | `visual-real-estate-district-officetel.png` |
| `shop_unit` | 상가 점포 | `shop-unit-base.png` | `shop-unit-final-reference.png` | `visual-real-estate-district-shop-unit.png` |
| `small_building` | 꼬마빌딩 | `small-building-base.png` | `small-building-final-reference.png` | `visual-real-estate-district-small-building.png` |
| `apartment_building` | 아파트 동 | `apartment-building-base.png` | `apartment-building-final-reference.png` | `visual-real-estate-district-apartment-building.png` |
| `apartment_complex` | 아파트 단지 | `apartment-complex-base.png` | `apartment-complex-final-reference.png` | `visual-real-estate-district-apartment-complex.png` |
| `office_tower` | 오피스 빌딩 | `office-tower-base.png` | `office-tower-final-reference.png` | `visual-real-estate-district-office-tower.png` |
| `mixed_development` | 복합 개발지 | `mixed-development-base.png` | `mixed-development-final-reference.png` | `visual-real-estate-district-mixed-development.png` |

원본 접수 위치는 `assets/visual-source/real-estate/district-growth/`이다. 사용자가 `finalReference`만 주는 경우, 현재 앱 상세 배경 PNG가 0단계와 같다는 전제에서 해당 `visual-real-estate-district-*.png`를 base로 복사해 사용한다. 최종 참조를 만들 때 사용한 0단계가 현재 앱 배경과 다르면 base도 같이 받아야 한다.

## 접수 체크

- `base`와 `finalReference` 해상도는 같아야 한다.
- finalReference는 16단계 완성본이어야 하며, UI, 버튼, 텍스트, 검수 표시가 섞이면 안 된다.
- 중간 단계용 조각 이미지는 받지 않는다. 단계는 base/final diff와 visual group patch로 역산한다. base/final 구도 차이가 커서 중간 patch가 어색하면 해당 visual group의 reveal을 뒤로 미루거나, 최후의 안전장치로만 16단계 전체 이미지를 사용한다.
- 건물 시트가 따로 제공되면 `assets/visual-source/real-estate/real-estate-building-reference-sheet-20260626-<slug>.png` 형식으로 둔다. 시트가 없으면 먼저 finalReference 기반 patch 결과를 보고 필요할 때만 추가 요청한다.

## 생성 명령

지역 1개 생성:

```powershell
npm run real-estate:growth-assets:district -- --district two_room
```

지역 1개 픽셀 감사:

```powershell
npm run react:real-estate-pixel-audit -- --district two_room
```

전체 부동산 검증:

```powershell
npm run real-estate:verify
```

small_studio와 같은 지역별 성장 테이블 기준 검수 갤러리 생성:

```powershell
npm run real-estate:growth-review -- --district two_room
```

이번 완료분 5개 지역 검수 갤러리 생성:

```powershell
npm run real-estate:growth-review -- --index-file remaining-five-growth-review-gallery.html --district small_building --district apartment_complex --district officetel --district mixed_development --district office_tower
```

사용자 제공 finalReference 9개 전체 검수 갤러리 생성:

```powershell
npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html --district shop_unit --district two_room --district villa --district apartment_building --district small_building --district apartment_complex --district officetel --district mixed_development --district office_tower
```

## 완료 기준

- 16단계 master PNG가 해당 finalReference와 픽셀 단위로 일치하거나, 승인된 차이만 남아야 한다.
- `meanAbsoluteDeltaAgainstFinalReference`는 기본 목표 `0.00`이다.
- visual group 단위로 등장해야 하며, 중간 단계에서 건물 외곽이나 단지가 슬롯 경계로 잘려 보이면 실패다.
- 검수 산출물은 `artifacts/real-estate-reconstruction/<slug>-growth-review-gallery.html`, `<slug>-growth-all-stages-contact-sheet.png`, `<slug>-stage-contact-sheet.png`, `<slug>-slot-zoom-review.png`, `<slug>-slot-candidate-overlay.png`, `<slug>-reconstruction-audit-report.json`를 확인한다.
- 앱에서는 baked growth asset이 등록된 지역만 상세 DOM 건물 레이어를 끄고 PNG 배경을 사용한다.

## 2026-06-26 완료 메모

- 전체 10개 지역의 baked growth asset 등록이 끝났다.
- `small_studio`는 초기 handoff 기준 finalReference를 사용한다.
- 사용자 제공 9개 finalReference는 `shop_unit`, `two_room`, `villa`, `apartment_building`, `small_building`, `apartment_complex`, `officetel`, `mixed_development`, `office_tower`에 연결했다.
- `apartment_complex`는 사용자가 추가로 준 아파트 단지 finalReference를 사용하며, 이전에 정정된 아파트 고층동 이미지는 `apartment_building`으로 유지한다.
- 이번 남은 5개 지역 검수 인덱스는 `artifacts/real-estate-reconstruction/remaining-five-growth-review-gallery.html`이다.
- 사용자 제공 9개 전체 검수 인덱스는 `artifacts/real-estate-reconstruction/all-reference-growth-review-gallery.html`이다.

## 2026-06-27 후속 수동 검수 반영

- `small_studio`는 빨간 동그라미 필지를 먼저 채우고 녹색 X 조각은 최종 쪽으로 미뤄 `00..05` 단계로 재구성했다. `minOwnedCount`는 `0,1,2,4,6,9`이다.
- `two_room`은 녹색 X로 표시된 변화 약한 중간 단계와 최종 직전 중복 단계를 제거해 `00..04` 단계로 줄였다. `minOwnedCount`는 `0,1,4,7,11`이다.
- `villa`는 녹색 X로 표시된 8/14 중간 단계를 제거해 `00..04` 단계로 줄였다. `minOwnedCount`는 `0,1,2,4,13`이다.
- `officetel`은 빨간 동그라미 필지가 먼저 채워지도록 오른쪽 visual group을 앞당기고, 녹색 X로 보인 왼쪽/중앙 group은 최종 쪽으로 미뤄 `00..05` 단계로 재구성했다. `minOwnedCount`는 `0,1,4,8,12,15`이다.
- `shop_unit`은 사용자 지정 1/2/3/4번 필지 순서대로 1단계 1개, 2단계 2개, 3단계 3개, 4단계 4개가 채워지도록 `00..04` 단계로 재구성했다. `minOwnedCount`는 `0,1,4,8,15`이다.
- `small_building`은 빨간 원으로 확인된 하단 조각을 같은 단계에서 완성하고, 녹색 X 초반 조각은 제거해 `00..03` 단계로 재구성했다. `minOwnedCount`는 `0,6,10,17`이다.
- `apartment_building`은 빨간 원처럼 하단 아파트가 반만 보이는 구간을 제거하고, 같은 건물의 몸통/하단 group을 함께 reveal하도록 `00..04` 단계로 축약했다. `minOwnedCount`는 `0,1,3,7,13`이다.
- `apartment_complex`는 고층 단지가 가장자리만 먼저 보이지 않도록 왼쪽 단지, 오른쪽 단지, 전면 단지 3덩어리로 `00..03` 단계에 묶었다. `minOwnedCount`는 `0,1,11,27`이다.
- `office_tower`는 빨간 원 위치의 tower group을 완성 단위로 묶어 `00..04` 단계로 조정했다. `minOwnedCount`는 `0,1,6,13,21`이다.
- `mixed_development`는 변화 없는 반복 단계를 제거하고, 녹색 X로 표시된 하단-left group은 최종으로 미뤄 `00..05` 단계로 재구성했다. `minOwnedCount`는 `0,1,5,8,12,39`이다.
