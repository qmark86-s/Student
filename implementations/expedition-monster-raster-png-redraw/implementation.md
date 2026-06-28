# 원정대 몬스터 래스터 PNG 재제작 구현서

## 목적

원정대 몬스터 80종을 CSS/절차형 도형이 아니라 실제 래스터 PNG 원본 기반으로 다시 제작했다. 런타임은 `src/snapshot/assets/individual/expedition-enemies/<id>/move_*.png` 개별 프레임을 `SpriteFrames`로 순환하며, `.expedition-enemy-visual::before` atlas 본체는 표시하지 않는다.

## 원본 기준

- canonical 원본: `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png`
- tone: `asset`, `company`, `future`, `global`, `national`, `neighborhood`, `office`, `shelter`, `studio`, `summit`
- 각 tone 시트는 `1772x886` 크기, `443x443` 셀의 정확한 `4 columns x 2 rows` 구조이며, 일반 6종과 보스 2종을 담는다.
- 생성된 중간 move sheet: `assets/visual-source/expedition-enemies/<id>-move.png`
- 최종 런타임 프레임: `src/snapshot/assets/individual/expedition-enemies/<id>/move_0.png` ~ `move_3.png`

## 금지 기준

아기, 유아, 사람, 사람 얼굴/몸, 착용자, 탑승자, 침낭/상자/기계 안의 사람은 원정대 몬스터 후보에서 제외한다. 현재 80종은 문서, 장치, 생활물품, 시설, 지도, 코어, 금고, 회의/정상 오브젝트 계열만 사용한다.

## 구현 내용

- `tools/generate-professional-sprite-sources.py`
  - 원정대 몬스터 생성 경로를 tone별 래스터 PNG 시트 슬라이스 방식으로 전환했다.
  - 원본 시트가 누락되면 명시적으로 실패하고 CSS/절차형 fallback을 쓰지 않는다.
  - 단일 원본 셀을 matte cleanup 후 4프레임 move sheet로 변환한다.
- `tools/prepare-professional-sprites.py`
  - 녹색 chroma key와 반투명 matte 잔여 제거를 강화했다.
- `tools/build-visual-assets.mjs`
  - `.expedition-enemy-visual::before` 본체 표시를 `content:none`, `display:none`, `background-image:none`으로 막았다.
  - `visual-enemies.png`는 스냅샷/메타데이터 검증용 산출물로 유지한다.
- `tools/verify-visual-assets.mjs`
  - 원정대 몬스터 런타임 CSS가 `SpriteFrames` PNG-only 기준인지 검증한다.
  - `visual-assets.css`에 `__STUDENT_ASSET_008__` atlas 토큰을 직접 참조하면 실패한다.

## 시각 검수

- 원본 10개 tone 시트 전수 확인: `artifacts/expedition-monster-raster-source/expedition-raster-source-review-page-01.png`, `expedition-raster-source-review-page-02.png`
- 최종 80종 4프레임 전수 확인: `artifacts/expedition-monster-raster-source/expedition-raster-final-80-review.png`
- 축 리뷰 확인: `artifacts/visual-asset-samples/professional-axis-review-page-09.png` ~ `professional-axis-review-page-13.png`
- 확대 리뷰 확인: `artifacts/visual-asset-samples/professional-zoom-review-page-38.png` ~ `professional-zoom-review-page-58.png`
- `summit-boss-1`은 잘림이 있던 원본 셀을 조약 금고형 비인간 오브젝트 PNG로 교체했고, 확대 리뷰 `professional-zoom-review-page-58.png`에서 잘림과 matte 누수가 없음을 확인했다.

눈검수 결과: 사람/아기/유아/인간형 몬스터 0건, 최종 프레임 잘림 0건, 눈에 띄는 초록 matte 누수 0건.

## 자동 검증

```powershell
python -m py_compile tools/generate-professional-sprite-sources.py tools/prepare-professional-sprites.py
npm run asset:factory:prepare
npm run asset:factory:qa
npm run verify:mobile
npm run expedition:monster-map
git diff --check
```

주요 결과:

- `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80 enemySource=raster-png`
- `ASSET_FACTORY_PROFESSIONAL_REPORT_OK items=230`
- `expeditionEnemies count=80`, `minPoseDelta=2.835`, `maxCenterDelta=0.5`, `maxBaselineDelta=0`, `minTopMargin=9`, `minBottomMargin=9`
- `VISUAL_ASSETS_OK students=32 mainMonsters=192 companions=75 enemies=80 careers=62`
- `VISUAL_ASSET_AUDIT_OK atlases=5 cells=503`
- `SPRITE_INTEGRITY_OK frames=1048`
- `VISUAL_ASSET_SMOKE_OK`, 원정대 `enemyTextVisibleCount=0`, enemy sprite clip L/R/T/B 모두 0
- `EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=80 stageKinds=60 bossKinds=20`
- manifest 기준 PNG 스캔: `items=80 missing=0 clipped=0 greenMatte=0`
- `verify:mobile` 통과: `EXPEDITION_COMBAT_BALANCE_OK`, `REACT_VITE_EXPEDITION_SMOKE_OK`, `REACT_VITE_EXPEDITION_RULES_SMOKE_OK`, `MOBILE_SMOKE_OK`, `RETAKE_YEAR_SMOKE_OK`

참고: Vite build는 기존 chunk size warning을 출력하지만 종료 코드는 0이며 이번 변경의 실패로 보지 않는다.

## 감사 보강

후속 전수감사에서 tone별 원본 시트 10개가 `1774x887`로 저장되어 4x2 격자에 정확히 나누어떨어지지 않는 것을 확인했다. 오른쪽 2px와 아래 1px은 모두 형광 초록 배경이어서, 그림 손상 없이 `1772x886`으로 잘라 canonical source size를 고정했다.

최종 프레임 감사 결과는 `failures=0`, `finalFrames=320`이다. 원본 시트에는 셀 경계와 가까운 실루엣이 일부 남아 있어 `sourceMarginWarnings=48`로 기록했지만, 최종 PNG에는 잘림, 초록 matte, 빈 프레임, 동일 포즈 고착 문제가 없다. 새 tone 시트를 만들 때는 셀 안 비초록 실루엣을 가능하면 10px 이상 안쪽에 배치한다.

## 후속 작업 기준

새 몬스터를 추가하거나 교체할 때는 `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png`를 먼저 갱신하고 `npm run asset:factory:prepare`로 전체 파이프라인을 다시 돌린다. 생성된 `assets/visual-source/expedition-enemies/<id>-move.png`나 최종 `src/snapshot/assets/individual/expedition-enemies/` 프레임만 직접 수정하지 않는다.
