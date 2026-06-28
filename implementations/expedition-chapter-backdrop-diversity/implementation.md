# 원정대 챕터별 배경 다양화 구현서

## 개요
- 1~10챕터가 같은 원정대 배경을 공유하던 구조를 챕터별 생성형 PNG route tile 구조로 바꿨다.
- 각 챕터는 10개 `5016x540` PNG tile을 가지며, 1개 tile은 챕터 내부 100 Stage 구간을 담당한다.
- 챕터 1개 기준 1000 Stage 길이의 탐험길을 사용하므로 같은 배경이 짧게 반복되는 느낌을 줄인다.
- 모든 tile은 원정대가 걷는 도로 폭과 바닥 구도를 유지하고, 시간대/건물/구조물/조명/소품은 챕터 콘셉트에 맞게 다르게 구성한다.
- Stage 이동 offset은 전체 Stage 누적값이 아니라 현재 tile 내부 Stage 기준으로 계산한다.

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
  - 챕터별 생성형 PNG 원본 `source-00.png`를 보관한다.
  - 후속으로 `source-01.png`~`source-09.png`를 추가하면 같은 tile index의 독립 원본으로 자동 사용한다.
  - 현재는 챕터 10개 모두 `source-00.png`를 가진다. 따라서 총 100개 runtime tile 중 10개는 독립 생성형 원본 기반이고, 나머지 90개는 같은 원본을 crop/mirror/color grade로 변형한 파생 tile이다.
- `tools/build-visual-assets.mjs`
  - 챕터별 source PNG를 읽어 10개 runtime tile을 멱등 생성한다.
  - `source-00.png`만 있는 tile은 정상 비율 cover-crop, mirror, color grade로 변형하되 도로 폭은 고정한다.
  - source 한 장을 `5016x540` 전체로 강제 리사이즈하지 않고, 같은 crop의 normal/mirror/normal 3개 구간을 비율 보존으로 합성한다.
  - 심을 블러로 덮는 방식은 지나갈 때 번진 기둥처럼 보일 수 있어 제거했고, 좌우 반전 구간의 경계 픽셀이 맞물리도록 구성한다.
  - 모든 runtime tile은 `5016x540` 크기와 같은 도로 폭을 유지한다.
- `data/visual_assets.json`
  - `expeditionBackdrops.items`에 10개 챕터와 각 챕터의 `tiles`, `tileCount: 10`, `stagesPerTile: 100`을 기록한다.
- `src/react/styles.css`
  - `.expedition-arena::before`는 `--expedition-bg-image`로 주입된 현재 tile PNG를 우선 사용한다.
  - `.expedition-scene.backdrop-*`는 호환용 fallback PNG만 가진다.
- `src/react/game/assets.js`
  - `import.meta.glob()`으로 `visual-expedition-backdrop-*-*.png` 100개를 번들에 포함하고 `getExpeditionBackdropUrl()`로 조회한다.
- `src/react/App.jsx`
  - `expeditionStageBackdropTile(stage)`가 챕터 내부 Stage를 100 Stage 단위 tile index로 변환한다.
  - `expeditionStageBackdropOffset(stage)`는 tile 내부 Stage 기준으로 offset을 계산한다.
  - 최신 이동 거리 기준은 Stage당 `300px`이다. 챕터별 배경 고도화 직후의 `20px` 기준은 이동 체감이 너무 짧아 폐기했다.
- `src/react/styles.css`
  - 배경은 `background-size: auto 220%`로 종횡비를 유지해 확대하고, 가로만 잡아당기는 `2400% 100%` 방식은 사용하지 않는다.
  - 배경 위치는 왼쪽 기준 offset으로 움직여 100 Stage 구간 안에서 repeat seam이 화면에 들어오는 일을 줄인다.

## 검증 갱신
- `tools/verify-visual-assets.mjs`
  - 챕터 10개, route tile 100개, `tileCount: 10`, `stagesPerTile: 100`, `timeOfDay`, `landmark`, `roadProfile: fixed-road-v2`를 검사한다.
- `tools/react-vite-expedition-smoke.mjs`
  - arena의 `data-bg-tile`을 수집한다.
  - Stage 1은 tile 0, Stage 101은 tile 1과 tile 내부 offset 0을 사용하며, 두 Stage의 background image가 달라지는지 검사한다.
  - Stage 1 -> 2는 tile 0 안에서 `0 -> -300` offset 이동을 기대한다.

## 검증 결과
- `npm run visual:verify`는 챕터 10개, route tile 100개 파일 존재, metadata, 크기 일치를 검사한다.
- `npm run visual:smoke`는 실제 원정대 화면에서 배경 이미지가 렌더되는지 확인한다.
- `npm run react:expedition-smoke`는 Stage 이동과 원정대 화면 렌더링을 검증한다.
- `npm run react:build`와 `git diff --check`로 빌드와 공백 오류를 확인한다.
- 최종 확인:
  - `npm run visual:verify`: 통과.
  - `npm run visual:smoke`: 통과.
  - `npm run react:expedition-smoke`: 통과. Stage 101 tile 전환 검증 포함.
  - `npm run react:verify`: 통과.
  - `git diff --check`: 통과. Git 줄바꿈 CRLF 경고만 출력된다.

## 남은 품질 작업
- 반복감을 더 줄이려면 챕터별 `source-01.png`~`source-09.png`를 생성형 PNG로 추가해 100개 runtime tile 전부가 독립 원본을 갖게 만드는 것이 좋다.
- PNG 100개가 React 번들에 포함되므로, 실제 APK 크기와 로딩 시간이 부담되면 WebP/AVIF 파생본이나 챕터별 지연 로딩 정책을 별도 차수에서 검토한다.
