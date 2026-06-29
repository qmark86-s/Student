# 원정대 챕터별 배경 다양화 구현서

## 개요
- 원정대 1~10챕터가 서로 다른 배경 테마를 사용한다.
- 각 챕터는 `source-00.png`~`source-09.png` 10개 독립 생성형 원본을 가진다.
- 각 챕터는 1000 Stage 구조를 유지하되, 배경 route는 10개 tile을 25 Stage 단위로 순환해 같은 tile이 화면에서 감겨 보이기 전에 다음 구간으로 넘어간다.
- runtime 배경은 source를 직접 늘리지 않고, 챕터별 source 10장을 부드럽게 겹쳐 만든 chapter panorama에서 `5016x540` tile 10장으로 잘라 사용한다.
- 모든 source와 runtime tile은 원정대가 이동하는 도로 폭과 캐릭터 바닥 밴드를 유지한다.

## 배경 매핑
- CH.1 `shelter`: `visual-expedition-backdrop-shelter-{00..09}.png`
- CH.2 `studio`: `visual-expedition-backdrop-studio-{00..09}.png`
- CH.3 `neighborhood`: `visual-expedition-backdrop-neighborhood-{00..09}.png`
- CH.4 `company`: `visual-expedition-backdrop-company-{00..09}.png`
- CH.5 `office`: `visual-expedition-backdrop-office-{00..09}.png`
- CH.6 `asset`: `visual-expedition-backdrop-asset-{00..09}.png`
- CH.7 `national`: `visual-expedition-backdrop-national-{00..09}.png`
- CH.8 `global`: `visual-expedition-backdrop-global-{00..09}.png`
- CH.9 `future`: `visual-expedition-backdrop-future-{00..09}.png`
- CH.10 `summit`: `visual-expedition-backdrop-summit-{00..09}.png`

## 구현 구조
- `assets/visual-source/expedition-backdrops/`
  - 챕터별 생성형 PNG 원본 `source-00.png`~`source-09.png`를 보관한다.
  - source는 원본 규격 PNG여야 하며 runtime tile 복사본을 넣으면 빌드/검증이 실패한다.
- `tools/build-visual-assets.mjs`
  - 빌드 시작 시 source 100개를 검증한다.
  - 누락/불량 source를 자동 생성하지 않는다.
  - `buildExpeditionChapterPanorama()`가 source 10장을 세로 기준으로 맞추고 overlap blend한다.
  - `drawExpeditionBackdropPanoramaTile()`가 panorama에서 10개 runtime tile을 잘라낸다.
  - metadata에는 `sourceMode: "chapter-panorama"`, `derived: false`, `tileCount: 10`, `stagesPerTile: 25`를 기록한다.
- `data/visual_assets.json`
  - `expeditionBackdrops.items`에 10개 챕터와 각 챕터의 `tiles`를 기록한다.
- `src/react/game/assets.js`
  - `import.meta.glob()`으로 `visual-expedition-backdrop-*-*.png`를 번들에 포함하고 `getExpeditionBackdropUrl()`로 조회한다.
- `src/react/App.jsx`
  - `expeditionStageBackdropTile(stage)`가 25 Stage 단위 route tile index로 변환한다.
  - `expeditionStageBackdropOffset(stage)`는 tile 내부 Stage 기준으로 offset을 계산한다.
  - 최신 이동 거리 기준은 Stage당 `80px`이다.
  - tile 또는 챕터가 바뀌는 stage transition에서는 이전/다음 backdrop layer를 동시에 렌더링한다.
- `src/react/styles.css`
  - 배경은 `background-size: auto 100%`로 세로에 맞춘다.
  - 배경 위치는 왼쪽 기준 offset으로 움직인다.
  - `.expedition-backdrop-layer.from/to`가 stage 이동 중 이전/다음 이미지 위치와 opacity를 동시에 보간한다.

## 검증 갱신
- `tools/verify-visual-assets.mjs`
  - 챕터 10개, route tile 100개, source 100개를 검사한다.
  - 모든 tile은 `derived: false`, `sourceMode: "chapter-panorama"`여야 한다.
  - source 규격은 `width >= 1600`, `height >= 650`, aspect `2.2~3.4`, 최소 500KB 이상이다.
  - source가 runtime tile 크기(`5016x540`)면 실패한다.
- `tools/react-vite-expedition-smoke.mjs`
  - arena의 `data-bg-tile`, transition tile, crossfade layer 수, layer animation을 수집한다.
  - Stage 1은 tile 0, Stage 26은 tile 1을 사용한다.
  - Stage 1 -> 2는 tile 0 안에서 `0 -> -80` offset 이동을 기대한다.
  - tile이 바뀌는 이동에서는 blend layer가 2개 렌더되고 전환 종료 후 제거되어야 한다.

## 검증 결과
- `node tools/build-visual-assets.mjs`: 통과.
- `node tools/verify-visual-assets.mjs`: 통과.
- `npm run visual:smoke`: 통과.
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run expedition:backdrop-audit`: 통과.
- `npm run visual:verify`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 공백 오류 없음. PowerShell/Git 줄바꿈 변환 경고만 확인.
- 대표 산출물 확인:
  - `src/snapshot/assets/visual-expedition-backdrop-company-05.png`
  - `src/snapshot/assets/visual-expedition-backdrop-office-08.png`
  - `src/snapshot/assets/visual-expedition-backdrop-asset-07.png`
  - `src/snapshot/assets/visual-expedition-backdrop-global-08.png`
  - `src/snapshot/assets/visual-expedition-backdrop-future-08.png`
  - `src/snapshot/assets/visual-expedition-backdrop-summit-08.png`

## 남은 품질 메모
- 전체 `5016x540` runtime tile을 한 장으로 열면 강한 태양/타워 같은 랜드마크가 여러 번 보일 수 있다. 실제 게임은 crop 이동이므로 한 화면에 눌려 보이지 않는다.
- 다만 특정 챕터의 랜드마크 반복감은 실제 장거리 플레이에서 추가 QA할 수 있다.
- PNG 100개가 React 번들에 포함되므로 APK 크기와 로딩 시간이 부담되면 WebP/AVIF 파생본이나 챕터별 지연 로딩 정책을 별도 차수에서 검토한다.
