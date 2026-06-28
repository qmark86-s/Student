# 원정대 몬스터 다양화 확장 구현

> 최신 기준: 이 문서는 40종에서 80종으로 늘린 확장 차수의 기록이다. 현재 외형 제작 기준은 `implementations/expedition-monster-raster-png-redraw/implementation.md`이며, 80종 모두 `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png` 래스터 원본 시트에서 파생한다.

## 개요

원정대 탭 몬스터 풀을 기존 40종에서 80종으로 확장했다. 기존 `asset-sprite-factory`와 `expeditionEnemies` family를 유지하고, 신규 시스템이나 런타임 fallback은 추가하지 않았다.

- 일반 몬스터: 10개 tone x 6종 = 60종
- 보스 몬스터: 10개 tone x 2종 = 20종
- 총 원정대 몬스터: 80종

## 핵심 변경

- `tools/generate-professional-sprite-sources.py`
  - `ENEMY_TONES`를 tone별 일반 6종, 보스 2종으로 확장했다.
  - `bossDesign` 단일 구조를 `bossDesigns` 배열로 바꿨다.
  - 고지서, 침낭, 계약서, 스케줄 보드, 게이트, 금고, 프린터, 드론 포트, 캡슐, 의사결정망 등 신규 body/icon form을 추가했다.
  - 출력 id는 `tone-mob-1..6`, `tone-boss-1..2` 규칙을 따른다.

- `tools/build-visual-assets.mjs`
  - enemies atlas를 하드코딩된 `3 mob + 1 boss` 목록이 아니라 `data/professional_sprite_manifest.json`의 `expeditionEnemies.items`에서 읽는다.
  - `data/expedition_stages.json`에 `enemyAssets` 배열을 생성한다.
  - `data/expedition_bosses.json`은 중간 보스와 챕터 보스를 `boss-1`, `boss-2`로 나눠 매핑한다.
  - 생성 CSS에 `enemy-asset-{id}` mapping을 추가해 atlas 검증도 개별 asset 기준으로 가능하게 했다.

- `src/react/game/expedition.js`, `src/react/App.jsx`
  - `createStageView()`가 `enemyAssets` 존재와 길이를 전투 몬스터 수와 비교해 검증한다.
  - 화면 렌더링은 `stage.enemyAssets[index]`를 직접 사용한다.
  - 이전 `mob-1..3` 순환 추정 helper는 제거했다.
  - 보스 전투는 `boss boss-{variant}` class와 보스용 프레임 크기를 사용한다.

- 검증 도구
  - `tools/validate-expedition-combat-balance.mjs`가 `enemyAssets.length === enemyCount`, `enemyAsset === enemyAssets[0]`, 각 프레임 파일 존재를 검사한다.
  - `tools/verify-visual-assets.mjs`가 professional manifest 기준으로 기대 항목 수를 계산하고, enemies atlas 80종 및 stage/boss CSS mapping을 확인한다.

## 데이터 결과

- `data/professional_sprite_manifest.json`: `expeditionEnemies` 80종
- `data/visual_assets.json`: enemies atlas items 80종
- `data/expedition_stages.json`: 100개 stage 모두 `enemyAssets` 3개 보유
- `data/expedition_bosses.json`: 20개 boss asset 사용
- `src/snapshot/assets/individual/expedition-enemies/`: 신규/갱신 프레임 생성
- `src/snapshot/assets/visual-enemies.png`: 10240x800 atlas로 재생성

추가로 챕터 보스 설명에 남아 있던 `undefined을 마무리하는...` 문구 10개를 각 챕터명 기준으로 정리했다.

## 검증

통과한 명령:

```powershell
python -m py_compile tools/generate-professional-sprite-sources.py
node --check tools/build-visual-assets.mjs
node --check tools/verify-visual-assets.mjs
node --check tools/validate-expedition-combat-balance.mjs
npm run asset:factory:prepare
npm run asset:factory:qa
npm run expedition:combat-verify
npm run react:expedition-smoke
npm run react:expedition-rules-smoke
npm run verify:mobile
```

주요 결과:

- `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80`
- `PROFESSIONAL_SPRITES_PREPARED items=230`
- `ASSET_FACTORY_PROFESSIONAL_REPORT_OK items=230`
- `VISUAL_ASSETS_OK ... enemies=80`
- `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`
- `REACT_VITE_EXPEDITION_SMOKE_OK`
- `REACT_VITE_EXPEDITION_RULES_SMOKE_OK`
- `VISUAL_ASSET_SMOKE_OK`

첫 `asset:factory:qa`에서 메인 학생 Battle Road travel 이동폭이 smoke 기준 5px보다 낮은 `4.75px`로 실패했다. 원정대 몬스터 변경과 직접 관련된 문제는 아니지만 전수검사 게이트라서 `studentRoadRunLoop` X축 이동폭을 작게 보정했고, 재실행에서 `studentTravelPx=7.5`로 통과했다.

## 눈검수 산출물

- 원정대 smoke 화면: `artifacts/visual-asset-smoke/expedition.png`
- professional 축 리뷰: `artifacts/visual-asset-samples/professional-axis-review-page-09.png` ~ `professional-axis-review-page-13.png`
- professional 확대 리뷰: `artifacts/visual-asset-samples/professional-zoom-review-page-39.png` ~ `professional-zoom-review-page-58.png`

확인 기준:

- 일반 전투 첫 화면에서 3마리 모두 서로 다른 asset으로 표시된다.
- 몬스터 프레임 12개가 모두 로드된다.
- 원정대 enemy text visible count는 0이다.
- enemy sprite L/R/T/B clipping은 모두 0이다.

## 후속 참고

원정대 몬스터를 더 늘릴 때는 `tools/generate-professional-sprite-sources.py`의 `ENEMY_TONES`에 design을 추가하고, `npm run asset:factory:prepare`로 manifest와 stage/boss mapping을 재생성한다. 런타임에서 누락 asset을 추정하지 않으므로, 새 id를 추가한 뒤에는 반드시 `npm run expedition:combat-verify`와 `npm run verify:mobile`을 통과시켜야 한다.

## 후속 리드로잉 차수

이 확장 이후 80종 전체 외형은 `implementations/expedition-monster-concept-redraw/implementation.md` 차수를 거쳐, 현재 `implementations/expedition-monster-raster-png-redraw/implementation.md`에서 래스터 PNG 원본 시트 기반으로 다시 갱신했다. 새 후보에는 아기, 유아, 사람, 사람 얼굴/몸, 착용자, 탑승자, 침낭/상자/기계 안의 사람을 포함하지 않는다.
