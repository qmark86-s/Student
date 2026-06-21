# 학생 전투 스케일 품질 폴리싱 구현

## 목적

학생 탭 전투 화면에서 학습 도우미가 작고 세로로 찌그러져 보이고, 일반 몬스터가 너무 작거나 흐리게 보이는 문제를 수정했다.

## 변경 내용

- `data/battle_road_config.json`
  - `presentation.studentDisplay.helperPartyLeftPercent`, `helperSizePx`를 추가했다.
  - `presentation.enemyDisplay`를 추가해 일반/보스/수능/모바일 몬스터 표시 크기와 처치 잔상 투명도를 데이터로 관리한다.
  - 큰 몬스터 기준에 맞게 `presentation.enemySlots` 위치를 재배치했다.

- `tools/build-visual-assets.mjs`
  - Battle Road CSS 변수로 `--battle-normal-enemy-size`, `--battle-boss-enemy-size`, `--battle-suneung-enemy-size`, `--battle-defeated-opacity`를 생성한다.
  - 학습 도우미 셀을 `helperSizePx` 기준 정사각형으로 생성한다.
  - 실제 flex 배치에서 도우미가 가로로 줄어들지 않도록 `flex`, `min-width`, `aspect-ratio`를 함께 고정한다.

- `tools/visual-asset-smoke.mjs`
  - 학습 도우미 3명이 `status: "study"`인 테스트 세이브를 주입한다.
  - 실제 `.helper-party .helper-sprite` 3명 존재, 최소 크기, 정사각 왜곡을 검사한다.
  - 일반 몬스터 최소 크기, 보스/수능 최소 크기, 보이는 몬스터 arena 클리핑 0건을 검사한다.

- `tools/verify-visual-assets.mjs`
  - 생성 CSS가 `battle_road_config.json`의 도우미/몬스터 표시 크기 값을 실제로 반영했는지 확인한다.

## 현재 기준

- 학습 도우미: 실제 렌더 최소 `62x62px`, 정사각 왜곡 `4px` 이하
- 일반 몬스터: 실제 렌더 최소 `70x70px`
- 보스/수능 몬스터: 실제 렌더 최소 `86x86px`
- 보이는 몬스터 클리핑: `0건`

## 검증

- `npm run build:web`
- `npm run visual:verify`
- `npm run visual:smoke`

최종 스모크 결과:

- 실제 도우미 수: `3`
- 도우미 최소 크기: `70x70`
- 일반 몬스터 최소 크기: `72x72`
- 보스 몬스터 최소 크기: `92x92`
- 전투장 클리핑: `0건`
