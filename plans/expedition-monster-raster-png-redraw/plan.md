# 원정대 몬스터 래스터 PNG 재제작 계획

## 목표

원정대 몬스터 80종을 CSS/절차형 도형 느낌이 아닌 실제 래스터 PNG 스프라이트 원본 기반으로 다시 제작한다. 런타임에서는 `SpriteFrames`가 `src/snapshot/assets/individual/expedition-enemies/<id>/move_*.png`만 표시하며, CSS pseudo-element atlas 배경은 표시하지 않는다.

## 절대 금지 기준

- 아기, 유아, 사람, 사람 얼굴, 사람 몸, 착용자, 탑승자, 침낭/상자/기계 안의 사람을 몬스터로 쓰지 않는다.
- 원정대 몬스터는 비인간 오브젝트, 문서, 생활물품, 기계, 건축물, 코어, 지도, 장치 자체에 눈과 짧은 손발이 붙은 형태만 허용한다.
- 사람으로 오해될 수 있는 피부색 얼굴, 머리카락, 귀, 코, 사람 손발 비율, 포대기/아기 침낭처럼 읽히는 형태는 후보 단계에서 폐기한다.

## 구현 방향

1. `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png`에 tone별 4x2 래스터 원본 시트를 둔다.
2. `tools/generate-professional-sprite-sources.py`는 원정대 몬스터를 절차형으로 그리지 않고, 래스터 원본 시트를 슬라이스해 80개 `assets/visual-source/expedition-enemies/<id>-move.png`를 생성한다.
3. 래스터 원본 시트가 없으면 build를 실패시킨다. 레거시 도형이나 공용 fallback으로 대체하지 않는다.
4. 각 단일 PNG 몬스터는 4프레임 move sheet로 변환할 때 작은 회전/스쿼시/바운스만 적용해 보행 리듬을 만들고, 원본 그림 자체는 유지한다.
5. `tools/build-visual-assets.mjs`가 생성하는 `.expedition-enemy-visual::before` atlas 배경은 숨겨서 화면 본체 렌더가 PNG `SpriteFrames` 하나로만 나오게 한다.

## 검증 계획

- `python -m py_compile tools/generate-professional-sprite-sources.py`
- `npm run asset:factory:prepare`
- `npm run expedition:monster-map`
- `npm run expedition:combat-verify`
- `npm run react:expedition-smoke`
- `npm run asset:factory:qa`
- `npm run verify:mobile`

## 눈검사 계획

- tone별 원본 시트 10장을 먼저 검사해 사람/아기형 후보가 0건인지 확인한다.
- `professional-axis-review-page-09.png` ~ `13.png`에서 중심축, 기준선, 크기 튐을 확인한다.
- `professional-zoom-review-page-38.png` ~ `58.png`에서 80종 전체가 래스터 PNG 느낌으로 보이는지, 초록 배경 찌꺼기나 잘림이 없는지 확인한다.
- `artifacts/visual-asset-smoke/expedition.png`에서 실제 원정대 화면의 표시 품질과 CSS pseudo 중복 표시가 없는지 확인한다.

## 완료 기준

- 원정대 몬스터 80종 모두 래스터 PNG 원본 시트에서 파생된다.
- 사람/아기/유아/인간형 몬스터가 0건이다.
- CSS pseudo-element 기반 적 본체 렌더가 꺼져 있고, 실제 화면은 PNG 프레임만 사용한다.
- 자동 검증과 전수 눈검사가 모두 통과한다.

## 구현 결과

- 완료일: 2026-06-28
- 원본 시트: `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png` 10개, 각 `1772x886`/`443x443` 셀
- 생성 대상: `expeditionEnemies` 80종, 각 4프레임
- 런타임 표시: `src/snapshot/assets/individual/expedition-enemies/<id>/move_*.png` `SpriteFrames`
- CSS atlas 본체: `.expedition-enemy-visual::before{content:none!important;display:none!important;background-image:none!important}`로 비활성화
- 특이 수정: 잘림이 있던 `summit-boss-1` 원본 셀을 조약 금고형 비인간 오브젝트 PNG로 교체

## 검증 결과

- `python -m py_compile tools/generate-professional-sprite-sources.py tools/prepare-professional-sprites.py`: 통과
- `npm run asset:factory:prepare`: 통과
  - `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80 enemySource=raster-png`
- `npm run asset:factory:qa`: 통과
  - `VISUAL_ASSETS_OK students=32 mainMonsters=192 companions=75 enemies=80 careers=62`
  - `ASSET_FACTORY_PROFESSIONAL_REPORT_OK items=230`
  - `SPRITE_INTEGRITY_OK frames=1048`
  - `VISUAL_ASSET_SMOKE_OK`
- `npm run verify:mobile`: 통과
  - `EXPEDITION_COMBAT_BALANCE_OK`
  - `REACT_VITE_EXPEDITION_SMOKE_OK`
  - `REACT_VITE_EXPEDITION_RULES_SMOKE_OK`
  - `MOBILE_SMOKE_OK`
  - `RETAKE_YEAR_SMOKE_OK`
- `npm run expedition:monster-map`: 통과
  - `EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=80 stageKinds=60 bossKinds=20`
- manifest 기준 PNG 스캔: `items=80 missing=0 clipped=0 greenMatte=0`
- `git diff --check`: 오류 없음, 줄끝 경고만 출력
- 후속 이미지 감사: `failures=0`, `sourceMarginWarnings=48`, `tones=10`, `sourceCells=80`, `finalFrames=320`
- 원본 시트 정규화: 기존 `1774x887` 시트의 오른쪽 2px/아래 1px은 전부 초록 배경이라 손상 없이 `1772x886`으로 고정

## 전수 눈검사 결과

- 원본 tone 시트 10개를 `artifacts/expedition-monster-raster-source/expedition-raster-source-review-page-01.png`, `expedition-raster-source-review-page-02.png`에서 확인했다.
- 최종 80종 4프레임을 `artifacts/expedition-monster-raster-source/expedition-raster-final-80-review.png`에서 확인했다.
- `professional-axis-review-page-09.png` ~ `13.png`, `professional-zoom-review-page-38.png` ~ `58.png`를 확인했다.
- 사람, 아기, 유아, 인간형 몬스터: 0건
- 최종 프레임 잘림, 한 프레임만 커지는 문제, 눈에 띄는 초록 matte 누수: 0건
