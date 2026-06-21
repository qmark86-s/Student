# 원정대 SD 스프라이트 클리핑 수정 및 3등신 재정렬 구현

## 목적

원정대 화면의 동료/몬스터 스프라이트가 학생 탭과 다른 표시 규칙 때문에 잘리거나 찌그러지는 문제를 수정했다. 동시에 학생, 직업동료, 커리어 초상이 고학년/성인 직업군에서도 레퍼런스에 가까운 귀여운 3등신 SD 비율을 유지하도록 자산 파이프라인을 보강했다.

## 핵심 변경

- `data/sprite_style_profiles.json`
  - `cute-sd-reference`에 `lowerStartRatio`, `lowerScaleX`, `lowerScaleY`, `lowerOverlap`을 추가했다.
  - 학생은 머리/상체/하체를 나눠 하체 가로/세로를 함께 줄인다.
  - 직업동료/학습도우미는 SD 학생 베이스에서 생성되므로 `companions.enabled=false`로 두 번째 강한 SD 변환을 막는다.

- `tools/sprite_style_utils.py`
  - 기존 머리/몸통 2분할을 머리/상체/하체 3분할 합성으로 확장했다.
  - 4프레임 공통 스케일 보정에서 frame equalize 값을 사용해 한 프레임만 커지거나 작아지는 문제를 줄였다.

- `tools/generate-professional-sprite-sources.py`
  - 직업 오버레이의 몸통/팔/소품 위치를 SD 베이스에 맞게 조정했다.

- `tools/build-visual-assets.mjs`
  - 원정대 동료 `.expedition-unit-avatar.large`를 정사각 표시 박스로 변경했다.
  - 원정대 몬스터 `::before`를 정사각 pseudo element로 변경하고, 오른쪽 경계 클리핑을 막기 위해 왼쪽으로 당겼다.
  - 원정대 동료 돌진 거리를 줄여 작은 화면에서 박스 밖으로 과도하게 튀지 않게 했다.

- `tools/visual-asset-smoke.mjs`
  - 원정대 동료 표시 크기, 정사각 왜곡, arena 클리핑을 검사한다.
  - 원정대 몬스터 pseudo element의 L/R/T/B 클리핑을 계산한다.

- `tools/asset-factory/summarize-character-report.mjs`, `tools/asset-factory/summarize-professional-report.mjs`, `tools/verify-visual-assets.mjs`
  - 4등신 기준의 solid height 하한을 3등신 SD 기준에 맞게 갱신했다.

## 검증 결과

- `npm run asset:factory:review`: 통과
- `npm run visual:verify`: 통과
- `npm run visual:smoke`: 통과
- `npm run career:smoke`: 통과
- `npm run mobile:smoke`: 통과
- `npm run verify:mobile`: 통과

최종 `visual:smoke` 지표:

- 원정대 동료: 58x58 정사각형, 정사각 왜곡 0px, 동료 클리핑 0건
- 원정대 몬스터: 76x76 정사각형, 정사각 왜곡 0px, L/R/T/B 클리핑 0px
- 모바일 horizontal overflow: 0px

## 다음 작업 시 주의

- 학생 SD 비율은 `data/sprite_style_profiles.json`의 `characters` 값으로 조정한다.
- 직업동료/학습도우미는 이미 SD 학생 베이스를 사용한다. 별도 이유 없이 `companions.enabled`를 켜면 직업 유닛이 다시 눌려 보일 수 있다.
- 원정대 표시 품질은 `artifacts/visual-asset-smoke/expedition-companion-probe.png`와 `artifacts/visual-asset-smoke/expedition.png`를 함께 확인한다.
