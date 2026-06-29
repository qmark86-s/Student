# 원정대 챕터별 배경 다양화 계획

## 목표
- 1~10챕터가 같은 파노라마를 공유하지 않게 한다.
- 기존 원정대 배경의 원화급 밀도와 픽셀&복셀 스타일은 유지한다.
- 각 챕터의 지역 콘셉트가 첫눈에 구분되게 한다.
- 원정대원이 걷는 도로의 폭과 수평선/바닥 구도는 모든 챕터에서 동일하게 유지한다.
- 긴 탐험길이 분절된 tile 나열처럼 보이지 않도록 source를 chapter panorama로 부드럽게 엮는다.

## 구현 방향
- 기존 `asset-005.png` 원화 소스를 각 챕터 배경의 기본 레이어로 복사하지 않는다.
- 생성형 PNG 원본은 `assets/visual-source/expedition-backdrops/<theme>/source-00.png`~`source-09.png`에 보관한다.
- `tools/build-visual-assets.mjs`는 빌드 시작 시 source 100개를 검증한다.
- source가 누락되거나 저품질이면 자동 생성/fallback 없이 명시적으로 실패한다.
- 유지하는 값은 캔버스 크기, 원정대가 걷는 도로의 시작선/폭/원근 패턴뿐이다.
- 바꾸는 값은 시간대, 하늘 색, 원경 실루엣, 중경 건물, 전경 구조물, 조명, 지역 소품 전체다.
- `tools/build-visual-assets.mjs`에서 챕터별 10개 route tile, 총 100개 PNG를 생성한다.
  - 파일명: `visual-expedition-backdrop-{theme}-{00..09}.png`
  - 각 runtime tile은 `5016x540`이며, 한 tile은 25 Stage route 구간을 담당한다.
  - 챕터 1개는 1000 Stage 구조를 유지하되, 배경 route는 10개 tile을 25 Stage 단위로 순환한다.
  - source 10장을 height 기준으로 맞추고 180~280px overlap blend한 chapter panorama에서 runtime tile을 잘라낸다.
- 기존 호환용 `visual-expedition-backdrops.png`는 shelter 00 배경으로 유지한다.
- React는 `getExpeditionBackdropUrl(backdropClass, tileIndex)`로 현재 Stage가 속한 tile PNG를 가져와 `--expedition-bg-image`에 주입한다.
- Stage 이동 offset은 tile 내부 Stage 기준으로 계산해, 25 Stage마다 다음 tile로 넘어가고 offset은 새 tile의 시작 구간에서 다시 출발한다.
- 배경 CSS는 `background-size: auto 100%`로 세로에 맞추고, 가로만 늘리는 background-size는 사용하지 않는다.
- 생성된 모든 챕터 배경은 같은 크기와 같은 도로 레이아웃을 가진다.
- `data/visual_assets.json`의 원정대 배경 item에는 `timeOfDay`, `landmark`, `roadProfile`, `tileCount`, `stagesPerTile`, `sourceMode`, `tiles`를 남긴다.

## 챕터 콘셉트
- CH.1 `shelter`: 낡은 골목, 임시 쉼터, 박스, 펜스, 따뜻한 가로등.
- CH.2 `studio`: 심야 원룸촌, 세탁소/편의점 네온, 배달 동선, 좁은 다세대 건물.
- CH.3 `neighborhood`: 맑은 낮 동네 상권, 시장 가판, 나무, 낮은 상가.
- CH.4 `company`: 출근 시간 신도시 회사 지구, 유리 건물, 버스 정류장, 스카이브리지.
- CH.5 `office`: 비 오는 저녁 전문직 타운, 고층 오피스, 로비 조명, 회의실 조명.
- CH.6 `asset`: 석양 자산 구역, 라운지, 추상 그래프 조명, 금고.
- CH.7 `national`: 흐린 낮 국가 프로젝트, 공사 펜스, 크레인, 교량, 임시 사무소.
- CH.8 `global`: 새벽 글로벌 허브, 공항/항만, 활주로/컨테이너, 터미널.
- CH.9 `future`: 심야 미래 연구도시, 추상 홀로그램 조명, 연구 타워, 자기부상 레일.
- CH.10 `summit`: 황금빛 정상 구역, 상징 타워, 정상 회의장, 높은 스카이라인.

## 검증
- `node tools/build-visual-assets.mjs`로 챕터 10개 x route tile 10개, 총 100개 배경 PNG와 metadata를 생성한다.
- `node tools/verify-visual-assets.mjs` 또는 `npm run visual:verify`에서 10개 챕터, 100개 source, 100개 tile, 크기, sourceMode, derived, metadata 누락을 검사한다.
- `npm run expedition:backdrop-audit`에서 모바일 viewport 기준 tile 반복 위험과 route tile 다양도를 검사한다.
- `npm run visual:smoke`에서 원정대 배경 이미지가 계속 렌더되는지 확인한다.
- `npm run react:expedition-smoke`에서 Stage 1 -> 2 이동 offset, Stage 26 tile 전환, crossfade layer를 확인한다.
- `npm run react:build`와 `git diff --check`를 최종 확인한다.
