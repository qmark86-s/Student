# 원정대 몬스터 컨셉 리드로잉 구현

> 최신 기준: 이 문서는 80종 컨셉 확장 차수의 기록이다. 현재 원정대 몬스터 외형의 기준 구현은 `implementations/expedition-monster-raster-png-redraw/implementation.md`이며, CSS/절차형 도형이 아니라 `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png` 래스터 PNG 시트에서 파생한다.

## 개요

원정대 몬스터 80종을 같은 수량과 id 구조 그대로 유지하면서 다시 그렸다. 이번 차수의 목표는 몬스터를 레거시 문서형 몸통과 아이콘 변주에서 벗어나게 하고, tone은 색감만 맞추되 실제 컨셉은 이름과 기능이 먼저 읽히게 만드는 것이다.

## 핵심 변경

- `tools/generate-professional-sprite-sources.py`
  - `EXPEDITION_MOB_BODY_SIZES`, `EXPEDITION_BOSS_BODY_SIZES`, `expedition_body_size()`를 추가해 variant 번호가 아니라 `form`별로 몸통 크기를 결정한다.
  - 모든 원정대 몬스터에 공통으로 찍히던 상단 흰색 하이라이트를 제거했다.
  - `draw_expedition_face()`가 form을 받아 전자장치류 바이저 눈, 건축/탑류 경계 눈, 구형/코어류 둥근 눈으로 표정을 나눈다.
  - `draw_expedition_body()`의 주요 form을 다시 그렸다.

## 리드로잉 방향

- 문서/고지서 계열은 접힘, 도장, 절취선, 비자 스탬프, 증권 리본으로 구분한다.
- 침낭, 도시락 봉투, 세탁 바구니, 컵, 타이머는 생활 오브젝트로 읽히게 했다.
- 폴더와 책은 접힌 파일철과 펼친 장부로 분리했다.
- 가격표, 클립보드, 견적서, 진료 차트, 체크리스트는 같은 판형을 공유하지 않게 했다.
- 게시판, KPI, 포트폴리오, 환율 전광판, 회로판은 지지대, 화면 색, 핀, 회로 패턴으로 구분한다.
- 게이트, 빌딩, 탑, 계약 게이트는 아치, 창문, 첨탑, 봉인문 중심으로 다시 그렸다.
- 금고, 시장 금고, 예산함은 둥근 금고문과 서류 투입구로 분리했다.
- 메일 인박스는 첫 QA에서 coverage 초과가 나와 꽉 찬 사각 적층 대신 열린 봉투/트레이 형태로 재수정했다.

## 산출물

- 래스터 원본 시트: `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png`
- 생성된 4프레임 원본 시트: `assets/visual-source/expedition-enemies/<id>-move.png`
- 정규화 프레임: `src/snapshot/assets/individual/expedition-enemies/<id>/move_0.png` ~ `move_3.png`
- enemies atlas: `src/snapshot/assets/visual-enemies.png`
- manifest: `data/professional_sprite_manifest.json`
- 출현 확인 맵: `artifacts/expedition-monster-appearance-map/index.html`

## 검증

통과한 명령:

```powershell
python -m py_compile tools/generate-professional-sprite-sources.py
npm run asset:factory:prepare
node tools/visual-asset-audit.mjs
npm run asset:factory:qa
npm run expedition:monster-map
npm run expedition:combat-verify
npm run react:expedition-smoke
npm run verify:mobile
```

주요 결과:

- `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80`
- 원정대 몬스터 전수 집계: `count=80`, 실패 0
- `minPoseDelta=3.791`, `maxCenterDelta=0.5`, `maxBaselineDelta=0`
- `VISUAL_ASSET_AUDIT_OK atlases=5 cells=503`
- `EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=80 stageKinds=60 bossKinds=20`
- `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`
- `REACT_VITE_EXPEDITION_SMOKE_OK`
- `VISUAL_ASSET_SMOKE_OK`

## 눈검수 위치

- 축 리뷰: `artifacts/visual-asset-samples/professional-axis-review-page-09.png` ~ `professional-axis-review-page-13.png`
- 확대 리뷰: `artifacts/visual-asset-samples/professional-zoom-review-page-39.png` ~ `professional-zoom-review-page-58.png`
- 실제 원정대 smoke: `artifacts/visual-asset-smoke/expedition.png`

## 후속 참고

원정대 몬스터 외형은 생성된 개별 move PNG를 직접 고치지 말고 tone별 래스터 원본 시트 `assets/visual-source/expedition-enemy-raster-sheets/<tone>.png`를 갱신한 뒤 `npm run asset:factory:prepare`로 재생성한다. 새 후보에는 아기, 유아, 사람, 사람 얼굴/몸, 착용자, 탑승자, 침낭/상자/기계 안의 사람을 절대 포함하지 않는다.
