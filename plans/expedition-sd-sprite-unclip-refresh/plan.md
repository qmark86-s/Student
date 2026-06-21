# 원정대 SD 스프라이트 클리핑 수정 및 3등신 재정렬 계획

## 목표

원정대 화면에서 동료와 몬스터 스프라이트가 잘리거나 학생 탭과 다른 방식으로 보이는 문제를 해결한다. 동시에 학생, 동료, 직업, 파티 유닛은 레퍼런스처럼 어른이 되어도 3등신 SD 비율을 유지하도록 더 강하게 재정렬한다.

## 문제

- 원정대 동료는 작은 `.expedition-unit-avatar` 박스에 160px 아틀라스를 background로 얹어 보여주므로, 스프라이트가 커지면 머리/발/소품이 잘릴 수 있다.
- 원정대 몬스터는 `::before` pseudo element의 inset과 parent overflow 영향으로 프레임 일부가 잘릴 수 있다.
- 기존 SD 변환은 원본 러닝 포즈를 살려 둔 탓에 고학년/직업군에서 여전히 다리와 몸이 길게 보인다.
- 레퍼런스는 성인/직업군도 3등신에 가까운 큰 머리, 짧은 몸통, 짧은 팔다리를 유지한다.

## 구현 방향

1. SD 스타일 프로필을 강화한다.
   - 머리 확대를 더 강하게 적용한다.
   - 몸통/팔다리 세로 압축을 더 강하게 적용한다.
   - 4프레임 공통 스케일을 유지해 한 프레임만 커지거나 작아지는 문제를 막는다.

2. 사람형 스프라이트 변환 방식을 보강한다.
   - 기존 투명 프레임을 머리/몸만 나누는 방식에서, 하체 영역을 추가 압축한다.
   - 포즈 변화는 남기되 전체 실루엣은 3등신에 가까운 SD로 만든다.

3. 원정대 표시 방식을 학생 탭과 더 비슷하게 바꾼다.
   - 원정대 동료 표시 박스를 넓히고 overflow를 열어 클리핑을 막는다.
   - 160px 셀 전체를 축소해 보여주되, 캐릭터가 박스 안에서 잘리지 않도록 `background-size`와 `background-position` 기준을 조정한다.
   - 몬스터 pseudo element도 여유 inset과 overflow visible 구조로 바꾼다.

4. smoke 검증을 보강한다.
   - 원정대 동료/몬스터 렌더링 영역이 부모에 의해 잘리는지 계산한다.
   - probe 스크린샷에서 파티 유닛이 5명 이상 표시되고, 각 유닛의 이미지/모션/클리핑 지표가 통과해야 한다.

## 완료 기준

- 원정대 파티 유닛의 머리, 발, 소품이 잘리지 않는다.
- 원정대 몬스터의 몸통과 팔/소품이 잘리지 않는다.
- 학생, 직업동료, 커리어 초상은 고학년/성인 직업군도 3등신 SD 비율로 보인다.
- `npm run visual:verify`, `npm run asset:factory:review`, `npm run visual:smoke`, `npm run career:smoke`, `npm run mobile:smoke`를 통과한다.

## 구현 결과

- 학생 SD 변환을 머리/상체/하체 3분할 방식으로 확장했다.
- 달리는 포즈에서 다리가 길게 보이지 않도록 `lowerScaleX`, `lowerScaleY`, `lowerOverlap` 프로필 값을 추가했다.
- 직업동료/학습도우미는 이미 SD 학생 베이스에서 생성되므로 두 번째 강한 SD 변환을 끄고 축 정렬만 통과하도록 했다.
- 원정대 동료 표시 박스를 160px 아틀라스 셀 비율에 맞춘 정사각 표시로 바꿨다.
- 원정대 몬스터 pseudo element도 정사각 표시로 바꾸고, 오른쪽 경계 클리핑을 막기 위해 스프라이트 중심을 왼쪽으로 당겼다.
- smoke에 원정대 동료 정사각 왜곡, arena 클리핑, 적 pseudo element L/R/T/B 클리핑 검사를 추가했다.
- 3등신 SD 기준에 맞게 캐릭터/전문 스프라이트 요약 하한과 `visual:verify`의 solid body 하한을 갱신했다.

## 검증

- `npm run asset:factory:review`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run career:smoke`
- `npm run mobile:smoke`
- `npm run verify:mobile`

최종 `visual:smoke` 기준 원정대 동료는 58x58 정사각형, 동료 클리핑 0건, 원정대 몬스터는 76x76 정사각형, 적 스프라이트 L/R/T/B 클리핑 0px으로 통과했다.
