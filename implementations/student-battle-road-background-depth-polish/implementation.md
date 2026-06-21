# 학생탭 배경 길감/접지감 폴리싱 구현서

## 개요

학생탭 전투 화면에서 배경이 과확대되어 캐릭터와 따로 노는 문제를 수정했다. 원정대처럼 길 위에서 캐릭터와 몬스터가 이동하고 만나는 느낌을 주기 위해 배경 파노라마 줌을 낮추고, 학년군별 러닝 레인을 PNG 생성 단계에서 합성했다.

## 주요 변경

- `data/battle_road_config.json`
  - `presentation.backdrop.panWidthPercent`를 720으로 조정했다.
  - `panDurationSec`를 76초로 조정해 줌을 풀어도 이동감이 너무 빠르지 않게 했다.
  - `roadTopPercent`, `roadBottomPercent`, `roadOpacity`, `roadDetailPx`를 추가했다.
  - 모든 신규 파라미터에 한글 도움말을 추가했다.

- `tools/build-visual-assets.mjs`
  - `battleRoadPresentation()`이 러닝 레인 파라미터를 읽는다.
  - `drawBattleRoadLane()`을 추가해 초등/중등/고등/N수 배경 하단에 학년군별 길, 경계선, 타일/나무결, 접지 그림자를 합성한다.
  - 중등 배경 시작 offset을 창문/사물함/책상 구간으로 조정했다.
  - scene별 `pixel-arena::before` 규칙에서 `background-size`, `background-repeat`, `background-position`을 함께 고정해 기존 기본 CSS 장식 배경과의 충돌을 막았다.

- `tools/verify-visual-assets.mjs`
  - 배경 pan width가 900%를 넘으면 실패하도록 했다.
  - battle road background metadata에 러닝 레인 파라미터가 남는지 확인한다.
  - scene별 배경 sizing rule이 누락되면 실패하도록 했다.

- `tools/visual-asset-smoke.mjs`
  - 실제 렌더에서 `--battle-road-pan-width`, `background-size`, `background-repeat`, `background-position`을 확인한다.
  - 초등/중등/고등/N수 scene 클래스를 모두 바꿔 보며 배경 data image와 sizing rule이 정상인지 검사한다.

## 검수 결과

직접 확인한 캡처:

- `artifacts/live-visual-polish/student-start.png`
- `artifacts/visual-asset-smoke/main-battle.png`
- `artifacts/student-battle-road-background-depth-polish/scene-middle.png`

중등 배경은 처음에 기본 CSS의 작은 장식용 `::before` 규칙 때문에 `background-size:36px 4px`로 덮여 단색처럼 보였다. scene별 규칙에서 배경 크기/반복/위치를 고정한 뒤 실제 렌더 기준 `100% 100%`, `no-repeat`, `50% 100%`로 정상화했다.

## 검증 명령

```powershell
npm run build:web
npm run visual:smoke
npm run visual:verify
npm run live:polish
npm run verify:mobile
```

최종 통과 기준:

- 학생 배경 pan width: 720%
- 초등/중등/고등/N수 scene 모두 data image 적용
- 배경 size: 100% 100%
- 배경 repeat: no-repeat
- 배경 position: 50% 100%
- 학습 도우미/몬스터 클리핑 0건
- 모바일 가로 오버플로 0건

