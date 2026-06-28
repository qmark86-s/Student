# 원정대 독립 배경 원본 확장 계획

## 목표
- 챕터별 `source-00.png` 1장을 crop/mirror/grade로 파생하던 구조를 끝내고, `source-00.png`~`source-09.png` 10장을 모두 독립 생성형 PNG 원본으로 채운다.
- 각 챕터는 1000 Stage 동안 10개 독립 route segment를 사용한다.
- 도로 폭, 카메라 각도, 캐릭터가 서는 바닥 밴드는 모든 segment에서 일정하게 유지한다.
- 시간대, 건물, 구조물, 소품, 조명, 원경 실루엣은 segment마다 달라져 반복감이 적은 탐험길처럼 보이게 한다.

## 현재 구조
- `tools/build-visual-assets.mjs`의 `loadExpeditionBackdropSource(theme, tileIndex)`는 `source-XX.png`가 있으면 해당 파일을 우선 사용한다.
- 현재 프로젝트에는 챕터별 `source-00.png`만 존재한다.
- `source-01.png`~`source-09.png`가 없으면 `source-00.png`를 파생 처리하므로, 런타임 타일은 100개여도 실제 원본은 10개뿐이다.

## 구현 범위
- `assets/visual-source/expedition-backdrops/<theme>/source-01.png`~`source-09.png`를 생성한다.
- 생성 기준:
  - 2.9:1 내외의 wide PNG.
  - 픽셀&복셀 스타일.
  - 캐릭터/몬스터/UI/텍스트/워터마크 없음.
  - 하단 40~45%는 원정대 이동 도로로 유지.
  - 좌우 edge는 자연스럽게 이어질 수 있는 route segment 느낌으로 구성.
  - 같은 챕터 안에서도 segment별 랜드마크와 소품을 바꾼다.
- `tools/build-visual-assets.mjs`에서 빌드 전에 원정대 배경 원본 세트를 검증한다.
  - 정상 `source-00.png`는 보존한다.
  - 누락되었거나 런타임 타일 크기(`5016x540`)로 잘못 들어온 `source-XX.png`는 같은 챕터 원본 규격으로 재생성한다.
  - 생성된 원본은 `width >= 1600`, `height >= 650`, `aspect 2.2~3.4`를 만족해야 한다.
- `tools/verify-visual-assets.mjs`를 갱신해 원정대 배경 metadata의 모든 tile이 `derived: false`인지 검사한다.
- 독립 source 파일 100개가 실제로 존재하는지 검사한다.
- 기존 `plans/expedition-chapter-backdrop-diversity/plan.md`와 구현 문서를 새 기준으로 최신화한다.

## 챕터별 segment 방향
- CH.1 `shelter`: 임시 쉼터 골목, 박스 더미, 펜스, 천막, 낡은 가로등, dawn 변주.
- CH.2 `studio`: 원룸촌, 세탁소, 편의점, 배달 오토바이 흔적, 좁은 골목, deep-night 변주.
- CH.3 `neighborhood`: 낮 동네 상권, 시장 가판, 나무, 작은 카페, 생활형 간판, clear-noon 변주.
- CH.4 `company`: 신도시 업무지구, 버스 정류장, 유리 건물, 스카이브리지, commute-morning 변주.
- CH.5 `office`: 비 오는 전문직 타운, 오피스 로비, 명판, 우산 거치대, 회의실 조명, rainy-evening 변주.
- CH.6 `asset`: 석양 자산 구역, 시세판, 금고, 라운지, 그래프 조명, golden-sunset 변주.
- CH.7 `national`: 공공 프로젝트 현장, 크레인, 공사 펜스, 교량, 임시 사무소, overcast-day 변주.
- CH.8 `global`: 공항/항만 허브, 컨테이너, 깃발 라인, 활주로 조명, harbor-sunrise 변주.
- CH.9 `future`: 미래 연구도시, 홀로그램, 자기부상 레일, 연구 타워, midnight-cyber 변주.
- CH.10 `summit`: 정상 구역, 상징 타워, 회의장, 금빛 스카이라인, golden-summit 변주.

## 검증
- `npm run visual:build`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run react:expedition-smoke`
- `npm run react:build`
- `npm run react:verify`
- `npm run verify:mobile`
- `git diff --check`

## 남은 리스크
- 일부 `source-01.png`~`source-09.png`는 절차형 보정 원본이라 수작업 생성 원본보다 미술적 밀도 차이가 날 수 있다.
- 검증은 파일/metadata/렌더링을 잡고, 미술적 반복감은 캡처와 실제 플레이로 계속 확인해야 한다.
