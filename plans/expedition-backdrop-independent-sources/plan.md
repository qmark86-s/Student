# 원정대 독립 배경 원본 확장 계획

## 목표
- 챕터별 `source-00.png` 1장을 crop/mirror/grade로 파생하던 구조를 끝내고, `source-00.png`~`source-09.png` 10장을 모두 독립 생성형 PNG 원본으로 채운다.
- 각 챕터는 1000 Stage 구조를 유지하되, 배경 route는 10개 segment를 25 Stage 단위로 순환해 같은 tile 반복 노출을 줄인다.
- 도로 폭, 카메라 각도, 캐릭터가 서는 바닥 밴드는 모든 segment에서 일정하게 유지한다.
- 시간대, 건물, 구조물, 소품, 조명, 원경 실루엣은 segment마다 달라져 반복감이 적은 탐험길처럼 보이게 한다.
- 분절된 tile 나열처럼 보이지 않도록, 런타임 tile은 챕터별 source 10장을 부드럽게 겹쳐 만든 chapter panorama에서 잘라낸다.

## 현재 구조
- `assets/visual-source/expedition-backdrops/<theme>/source-00.png`~`source-09.png`가 챕터별 원본이다.
- `tools/build-visual-assets.mjs`는 빌드 시작 시 10개 챕터 x 10개 source를 모두 검증한다.
- source가 없거나 런타임 tile 크기(`5016x540`)로 잘못 들어왔거나 파일이 지나치게 작으면 자동 복구하지 않고 빌드 실패로 드러낸다.
- source 10장이 모두 통과한 챕터만 `chapter-panorama` 모드로 빌드된다.

## 구현 범위
- `assets/visual-source/expedition-backdrops/<theme>/source-01.png`~`source-09.png`를 모두 고품질 생성형 PNG로 교체한다.
- 생성 기준:
  - 2.2~3.4:1 wide PNG.
  - 픽셀&복셀 스타일.
  - 캐릭터/몬스터/UI/텍스트/로고/워터마크 없음.
  - 하단 40~45%는 원정대 이동 도로로 유지.
  - 좌우 edge는 자연스럽게 이어질 수 있는 route segment 느낌으로 구성.
  - 같은 챕터 안에서도 segment별 랜드마크와 소품을 바꾼다.
- `tools/build-visual-assets.mjs`
  - source 검증 실패 시 명시적 오류를 낸다.
  - 10개 source를 height 기준으로 맞춘 뒤 overlap blend로 chapter panorama를 만든다.
  - runtime `visual-expedition-backdrop-<theme>-00..09.png`는 해당 panorama에서 잘라낸다.
- `tools/verify-visual-assets.mjs`
  - 모든 source 100개 존재.
  - `derived: false`.
  - `sourceMode: "chapter-panorama"`.
  - 원본 규격 `width >= 1600`, `height >= 650`, aspect `2.2~3.4`, 최소 용량 500KB 이상.
  - runtime tile 크기 source 유입 금지.
- `tools/expedition-backdrop-viewport-audit.mjs`
  - Stage당 이동 거리 `80px`, tile 교체 주기 `25 Stage`, 모바일 viewport 기준 반복 위험을 검사한다.
  - route tile 간 최소/평균 시각 차이를 검사해 지나치게 같은 tile이 들어오면 실패시킨다.

## 챕터별 segment 방향
- CH.1 `shelter`: 임시 쉼터 골목, 박스 더미, 펜스, 천막, 낡은 가로등, dawn 변주.
- CH.2 `studio`: 원룸촌, 세탁소, 편의점, 배달 오토바이 흔적, 좁은 골목, deep-night 변주.
- CH.3 `neighborhood`: 낮 동네 상권, 시장 가판, 나무, 작은 카페, 생활형 상점, clear-noon 변주.
- CH.4 `company`: 신도시 업무지구, 버스 정류장, 유리 건물, 스카이브리지, commute-morning 변주.
- CH.5 `office`: 비 오는 전문직 타운, 오피스 로비, 우산 거치대, 회의실 조명, rainy-evening 변주.
- CH.6 `asset`: 석양 자산 구역, 금고, 라운지, 추상 그래프 조명, golden-sunset 변주.
- CH.7 `national`: 공공 프로젝트 현장, 크레인, 공사 펜스, 교량, 임시 사무소, overcast-day 변주.
- CH.8 `global`: 공항/항만 허브, 컨테이너, 터미널, 활주로 조명, harbor-sunrise 변주.
- CH.9 `future`: 미래 연구도시, 추상 홀로그램 조명, 자기부상 레일, 연구 타워, midnight-cyber 변주.
- CH.10 `summit`: 정상 구역, 상징 타워, 회의장, 금빛 스카이라인, golden-summit 변주.

## 검증
- `node tools/build-visual-assets.mjs`
- `node tools/verify-visual-assets.mjs`
- `npm run visual:smoke`
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run expedition:backdrop-audit`
- `npm run visual:verify`
- `git diff --check`

## 남은 리스크
- 전체 `5016x540` runtime PNG를 한눈에 보면 강한 랜드마크가 여러 번 보일 수 있다. 실제 런타임은 `background-size: auto 100%` crop 이동이므로 한 화면에 눌려 보이지 않는다.
- 생성형 원본의 미술적 반복감은 자동 검증만으로 완전히 잡을 수 없어 대표 tile과 실제 화면 캡처를 계속 확인해야 한다.
