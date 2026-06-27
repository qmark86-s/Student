# 부동산 지역 성장 원본

이 폴더는 부동산 상세 화면의 0단계 base PNG와 16단계 finalReference PNG를 보관한다.

파일명 규칙:

- `<slug>-base.png`
- `<slug>-final-reference.png`

현재 정리된 slug:

- `small-studio`
- `two-room`
- `villa`
- `officetel`
- `shop-unit`
- `small-building`
- `apartment-building`
- `apartment-complex`
- `office-tower`
- `mixed-development`

base가 제공되지 않으면 현재 앱 상세 배경 `src/snapshot/assets/visual-real-estate-district-<slug>.png`를 0단계 기준으로 복사해 사용한다. finalReference 제작에 사용한 0단계가 현재 앱 배경과 다르면 base도 반드시 같이 둔다.

2026-06-26 기준 전체 10개 지역의 `base.png`와 `final-reference.png`가 준비되어 있다. `small-studio`는 handoff zip의 기준 이미지를 사용하고, 나머지 9개 지역은 사용자가 제공한 full-scene finalReference를 지역별로 매칭해 사용한다.
