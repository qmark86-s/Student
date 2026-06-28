# 원정대 몬스터 컨셉 리드로잉 계획

## 목표

2026-06-28 기준 새로 확보한 원정대 몬스터 80종을 전부 다시 그린다. 기존처럼 같은 레거시 문서형 몸통에 아이콘만 얹는 방식이 아니라, 게임 톤과 SD 품질은 유지하되 몬스터 이름과 기능이 먼저 읽히는 실루엣으로 재생성한다.

## 조사 요약

- 작업 전 `git status --short` 기준 원정대 몬스터 확장, 확인 맵, 비주얼 산출물 관련 변경이 이미 존재한다. 이 변경은 되돌리지 않고 이어서 작업한다.
- MCP 자산 확인 결과 Student 전용 MCP 표면은 확인되지 않았고, 현재 범위는 repo-local `asset-sprite-factory`와 npm 검증 명령으로 처리한다.
- 현재 원정대 몬스터는 `tools/generate-professional-sprite-sources.py`의 `ENEMY_TONES`와 `draw_expedition_body()`, `draw_enemy_frame()`에서 결정된다.
- 이미 10개 tone x 일반 6종 + 보스 2종 = 80종 구조와 stage/boss 매핑은 만들어져 있다.

## 현재 문제

- 다수 몬스터가 같은 몸통 비율, 같은 팔/발, 같은 얼굴, 같은 상단 하이라이트를 공유한다.
- 이름은 다양하지만, 화면에서는 사각형 고지서/게시판 계열로 먼저 보인다.
- 특히 종이, 보드, 금고, 게이트 계열이 서로의 실루엣을 많이 공유해 “레거사 컨셉의 색 변형”처럼 느껴진다.

## 리드로잉 원칙

- tone은 색감과 명도 질서만 담당한다.
- 컨셉은 `form`, `icon`, `name`이 담당한다.
- 일반 몬스터도 각 이름별 실루엣이 먼저 보이게 한다.
- 보스는 같은 tone의 일반 몬스터보다 건축물, 장치, 탑, 코어처럼 더 큰 덩어리와 위험 신호를 갖게 한다.
- 160x160, 4프레임, 좌향, 기준선/중심축 검증 조건은 유지한다.
- 누락 자산이나 임시 fallback은 추가하지 않는다.

## 주요 수정 계획

1. 몸통 크기 분화
   - `draw_enemy_frame()`의 variant 고정 크기를 form 기반 크기로 바꾼다.
   - 침낭, 표, 봉투, 컵, 금고, 탑, 캡슐, 전광판, 지구본처럼 폭/높이 자체가 다르게 보이게 한다.

2. 공통 레거시 요소 제거
   - 모든 몬스터에 똑같이 들어가던 상단 흰색 하이라이트를 제거한다.
   - 각 form 안에서 필요한 경우에만 접힘, 손잡이, 액정, 링, 스탬프, 절취선 같은 형태 디테일을 넣는다.

3. 이름/기능별 실루엣 강화
   - 고지서/영수증/비자/보험증권: 종이 비율, 접힘, 절취선, 도장 위치를 다르게 한다.
   - 침낭/도시락/세탁 바구니/컵/타이머: 생활 오브젝트 형태로 분리한다.
   - 게이트/빌딩/탑/계약 게이트: 건축물과 출입구 형태를 강조한다.
   - 금고/예산함/시장 금고: 둥근 문, 손잡이, 경고 표시를 강조한다.
   - 칩/큐브/플라스크/로봇팔/회로판/드론 포트: 미래 장치 형태를 강조한다.
   - 산/행성/회의장/조약/캡슐/위원회 의자/네트워크/사다리: 정상 단계 이름에 맞는 상징형 실루엣으로 분리한다.

4. 산출물 재생성
   - `assets/visual-source/expedition-enemies/*.png`
   - `data/professional_sprite_manifest.json`
   - `src/snapshot/assets/individual/expedition-enemies/**`
   - `src/snapshot/assets/visual-enemies.png`
   - 원정대 몬스터 출현 확인 맵과 리뷰 시트

## 검증 계획

- `python -m py_compile tools/generate-professional-sprite-sources.py`
- `npm run asset:factory:prepare`
- 리뷰 시트 육안 점검
  - `artifacts/visual-asset-samples/expeditionEnemies-*-zoom-sheet.png`
  - `artifacts/visual-asset-samples/professional-axis-review-page-*.png`
- `npm run expedition:monster-map`
- `npm run asset:factory:qa`
- `npm run expedition:combat-verify`
- `npm run react:expedition-smoke`
- `npm run visual:smoke`
- `npm run verify:mobile`

## 완료 기준

- 원정대 몬스터 80종이 모두 재생성된다.
- 이름/기능별로 1프레임만 봐도 실루엣 차이가 확인된다.
- `professional-axis-report.json` 기준 원정대 몬스터 전원이 `status=ok`다.
- 작업 범위의 fallback 로그 없이 검증이 끝난다.

## 구현 결과

- `tools/generate-professional-sprite-sources.py`에서 원정대 몬스터 80종을 전부 재생성하는 레시피를 갱신했다.
- variant 번호가 아니라 `form`이 몸통 크기와 얼굴 타입을 결정하도록 `EXPEDITION_MOB_BODY_SIZES`, `EXPEDITION_BOSS_BODY_SIZES`, `expedition_body_size()`를 추가했다.
- 모든 몬스터에 공통으로 들어가던 상단 흰색 하이라이트를 제거했다.
- 전자장치/회로/전광판 계열은 바이저 눈, 건축/탑/게이트 계열은 좁은 경계 눈, 코인/글로브/코어 계열은 둥근 눈으로 표정을 분리했다.
- 문서/고지서/영수증/증권/비자, 침낭/도시락/세탁/컵, 폴더/책/계약서, 가격표/클립보드/체크리스트, 게시판/KPI/환율판, 게이트/빌딩/탑, 금고/예산함, 미래 장치, 정상 의제 계열을 이름과 기능별 실루엣으로 다시 그렸다.
- `company-mob-2` 메일 인박스는 첫 QA에서 coverage 기준을 초과해, 꽉 찬 사각 적층 대신 열린 봉투/메일 트레이 형태로 다시 수정했다.
- `assets/visual-source/expedition-enemies/`, `src/snapshot/assets/individual/expedition-enemies/`, `src/snapshot/assets/visual-enemies.png`, 원정대 출현 확인 맵을 모두 갱신했다.

## 검증 결과

- `python -m py_compile tools/generate-professional-sprite-sources.py` 통과
- `npm run asset:factory:prepare` 통과
  - `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80`
  - 원정대 몬스터 `count=80`, `minPoseDelta=3.791`, `maxCenterDelta=0.5`, `maxBaselineDelta=0`
- `node tools/visual-asset-audit.mjs` 통과
  - `VISUAL_ASSET_AUDIT_OK atlases=5 cells=503`
- `npm run asset:factory:qa` 통과
- `npm run expedition:monster-map` 통과
  - `EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=80 stageKinds=60 bossKinds=20`
- `npm run expedition:combat-verify` 통과
  - `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`
- `npm run react:expedition-smoke` 통과
  - 첫 전투 enemy asset 종류 3종, enemy frame 12/12 로드, horizontal overflow 0
- `npm run verify:mobile` 통과

## 확인 위치

- 전체 출현 확인 맵: `artifacts/expedition-monster-appearance-map/index.html`
- 축 리뷰: `artifacts/visual-asset-samples/professional-axis-review-page-09.png` ~ `professional-axis-review-page-13.png`
- 확대 리뷰: `artifacts/visual-asset-samples/professional-zoom-review-page-39.png` ~ `professional-zoom-review-page-58.png`
- 실제 원정대 화면 smoke: `artifacts/visual-asset-smoke/expedition.png`
