# 상가 점포 4필지 단계화 및 찢김 재검수 계획

## 목표
- `shop_unit` 성장 PNG를 `00..04` 5장으로 재구성한다.
- 사용자가 표시한 네 필지를 `01`단계 1개, `02`단계 2개, `03`단계 3개, `04`단계 4개 모두 채워진 형태로 누적한다.
- 전체 지역 성장 PNG를 다시 확인해 빨간 원 기준의 찢어진 건물 상태는 완성 group으로 채우거나 해당 중간 단계에서 제거한다.

## `shop_unit` 적용 방향
- `01`: 하단 1번 필지 group reveal
- `02`: 좌측 2번 필지 group 추가
- `03`: 우측 3번 필지 group 추가
- `04`: 상단 4번 필지를 이루는 남은 group을 함께 추가해 finalReference와 일치

## 데이터
- `shop_unit.stages[].minOwnedCount`: `0,1,4,8,15`
- `shop_unit` 런타임 파일: `shop-unit-growth-00..04.png`

## 검증
- `npm run real-estate:growth-assets:district -- --district shop_unit`
- `npm run real-estate:growth-review -- --index-file all-reference-growth-review-gallery.html ...`
- `python tools/audit-real-estate-reconstruction-slots.py --district shop_unit`
- 전체 contact sheet 확대 확인
- `npm run real-estate:verify`
- `npm run react:verify`
