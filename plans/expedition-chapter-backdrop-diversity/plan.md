# 원정대 챕터별 배경 다양화 계획

## 목표
- 1~10챕터가 같은 파노라마를 공유하지 않게 한다.
- 기존 원정대 배경의 원화급 밀도와 야간 도시 톤은 유지한다.
- 각 챕터의 지역 콘셉트가 첫눈에 구분되게 한다.
- 원정대원이 걷는 도로의 폭과 수평선/바닥 구도는 모든 챕터에서 동일하게 유지한다.

## 구현 방향
- 기존 `asset-005.png` 원화 소스를 각 챕터 배경의 기본 레이어로 복사하지 않는다.
- 생성형 PNG 원본은 `assets/visual-source/expedition-backdrops/<theme>/source-00.png`에 보관한다.
- `tools/build-visual-assets.mjs`는 source PNG를 기준으로 챕터별 긴 런타임 PNG 타일을 생성한다.
- 유지하는 값은 캔버스 크기, 원정대가 걷는 도로의 시작선/폭/원근 패턴뿐이다.
- 바꾸는 값은 시간대, 하늘 색, 원경 실루엣, 중경 건물, 전경 구조물, 조명, 지역 소품 전체다.
- `tools/build-visual-assets.mjs`에서 챕터별 10개 route tile, 총 100개 PNG를 생성한다.
  - 파일명: `visual-expedition-backdrop-{theme}-{00..09}.png`
  - 각 tile은 `5016x540`이며, 한 tile은 챕터 내부 100 Stage 구간을 담당한다.
  - 챕터 1개는 10개 tile로 1000 Stage 길이의 탐험길을 가진다.
  - `source-01.png`~`source-09.png`가 있으면 해당 구간의 독립 원본으로 사용하고, 없으면 `source-00.png`를 crop/mirror/grade로 변형해 route tile을 만든다.
  - source 이미지를 전체 tile 폭으로 잡아당기지 않고, 정상 비율 구간들을 이어 붙여 생성한다.
- 기존 호환용 `visual-expedition-backdrops.png`는 shelter 배경으로 유지한다.
- React는 `getExpeditionBackdropUrl(backdropClass, tileIndex)`로 현재 Stage가 속한 tile PNG를 가져와 `--expedition-bg-image`에 주입한다.
- Stage 이동 offset은 tile 내부 Stage 기준으로 계산해, 100 Stage마다 다음 tile로 넘어가고 offset은 새 tile의 시작 구간에서 다시 출발한다.
- 배경 CSS는 종횡비를 유지하는 `auto 220%` 크기만 사용하고, 가로만 늘리는 background-size는 사용하지 않는다.
- 생성된 모든 챕터 배경은 같은 크기와 같은 도로 레이아웃을 가진다.
- `data/visual_assets.json`의 원정대 배경 item에는 `timeOfDay`, `landmark`, `roadProfile`, `tileCount`, `stagesPerTile`, `tiles`를 남겨 후속 검수자가 “같은 배경 색변경”인지 확인할 수 있게 한다.

## 챕터 콘셉트
- CH.1 `shelter`: 낡은 골목, 임시 쉼터, 박스, 펜스, 따뜻한 가로등.
- CH.2 `studio`: 심야 원룸촌, 세탁소/편의점 네온, 배달 동선, 좁은 다세대 건물.
- CH.3 `neighborhood`: 맑은 낮 동네 상권, 시장 가판, 나무, 낮은 상가.
- CH.4 `company`: 출근 시간 신도시 회사 지구, 유리 건물, 버스 정류장, 스카이브리지.
- CH.5 `office`: 비 오는 저녁 전문직 타운, 고층 오피스, 금색 명판, 회의실 조명.
- CH.6 `asset`: 석양 자산 구역, 라운지, 시세 전광판, 초록/금색 그래프, 금고.
- CH.7 `national`: 흐린 낮 국가 프로젝트, 공사 펜스, 크레인, 교량, 공공 프로젝트 표식.
- CH.8 `global`: 새벽 글로벌 허브, 공항/항만 표식, 활주로/컨테이너, 깃발 라인.
- CH.9 `future`: 심야 미래 연구도시, 홀로그램, 회로 패턴, 연구 타워, 자기부상 레일.
- CH.10 `summit`: 황금빛 정상 구역, 상징 타워, 정상 회의장, 높은 스카이라인.

## 검증
- `npm run visual:build`로 챕터 10개 x route tile 10개, 총 100개 배경 PNG와 metadata를 생성한다.
- `npm run visual:verify`에서 10개 챕터, 100개 tile 파일 존재, 크기 일치, `timeOfDay`/`landmark`/`roadProfile`/`tileCount`/`stagesPerTile` metadata 누락을 검사한다.
- `npm run visual:smoke`에서 원정대 배경 이미지가 계속 렌더되는지 확인한다.
- `npm run react:expedition-smoke`에서 Stage 1 -> 2 이동 offset과 원정대 화면 렌더링을 확인한다.
- `npm run react:build`와 `git diff --check`를 최종 확인한다.
