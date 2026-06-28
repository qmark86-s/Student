# 원정대 몬스터 학생 탭급 퀄리티업 계획

> 최신 상태: 이 계획은 이후 `plans/expedition-monster-raster-png-redraw/plan.md`로 대체되었다. 현재 원정대 몬스터는 deterministic 도형 generator가 아니라 tone별 래스터 PNG 원본 시트에서 파생하며, 사람/아기/유아/인간형 후보는 금지한다.

## 목표

원정대 몬스터 80종 전체를 학생 탭에 나오는 메인 몬스터와 비교해도 어색하지 않은 품질로 다시 그린다. 기존 80종 id, stage/boss 매핑, 개별 PNG 런타임 구조는 유지하고, deterministic generator 안에서 렌더링 품질을 끌어올린다.

## 현황 분석

- 학생 탭 몬스터는 레퍼런스 cutout 기반이라 외곽선, 바닥 그림자, 작은 하이라이트, 재질 디테일, 픽셀 밀도가 높다.
- 현재 원정대 몬스터는 컨셉과 실루엣은 다양하지만, 너무 깨끗한 벡터 도형처럼 보여 학생 탭 몬스터보다 완성도가 낮게 느껴진다.
- 원정대 몬스터 생성은 `tools/generate-professional-sprite-sources.py`의 `draw_enemy_frame()`, `draw_expedition_body()`, `draw_expedition_icon()`, `draw_expedition_face()`에 집중되어 있다.
- 현재 구조는 `expeditionEnemies` 80종, 개별 프레임 `src/snapshot/assets/individual/expedition-enemies/<id>/move_*.png`, atlas `visual-enemies.png`로 정상 연결되어 있다.
- MCP 자산 확인 결과 이번 Student 자산 작업에 직접 적용할 전용 MCP는 노출되어 있지 않아 repo-local `asset:factory` 검증을 사용한다.

## 구현 방향

1. 공통 렌더 품질 패스 추가
   - 알파 실루엣 기반 외곽선/그림자를 추가한다.
   - 하단/우측은 살짝 어둡게, 상단/좌측은 밝게 보정해 입체감을 만든다.
   - 미세한 픽셀 노이즈와 하이라이트를 넣어 학생 탭 몬스터처럼 손맛 있는 질감으로 만든다.
   - 과한 fallback이나 레거시 이미지 대체는 추가하지 않는다.

2. form별 디테일 레이어 추가
   - 종이/서류/영수증: 접힘, 줄, 점선, 모서리 그림자, 작은 스탬프.
   - 책/폴더/계약서: 페이지 두께, 탭, 바인더 링, 측면 명암.
   - 생활 오브젝트: 손잡이, 지퍼, 컵 뚜껑, 바구니 격자, 타이머 버튼.
   - 기계/전광판/회로: LED, 회로 선, 작은 나사, 화면 글로우.
   - 건축/게이트/탑: 창문, 경첩, 기둥, 표식.
   - 구형/코어/행성: 림라이트, 반사광, 궤도선.

3. 얼굴/손발 마감 개선
   - 눈에 작은 반사광을 더하고, 입/볼이 몸통에 묻히지 않게 대비를 높인다.
   - 손발은 학생 탭 몬스터처럼 짧고 귀여운 볼륨감을 유지하되 외곽선과 하이라이트를 더한다.

4. 재생성 및 검증
   - `assets/visual-source/expedition-enemies/*.png`
   - `src/snapshot/assets/individual/expedition-enemies/**`
   - `src/snapshot/assets/visual-enemies.png`
   - 리뷰 시트와 실제 원정대 스모크 화면을 갱신한다.

## 검증 계획

- `python -m py_compile tools/generate-professional-sprite-sources.py`
- `npm run asset:factory:prepare`
- `node tools/visual-asset-audit.mjs`
- `npm run expedition:monster-map`
- `npm run expedition:combat-verify`
- `npm run react:expedition-smoke`
- `npm run asset:factory:qa`

## 육안검수 계획

- 학생 탭 몬스터 기준 이미지와 원정대 확대 리뷰를 비교한다.
- `professional-axis-review-page-09.png` ~ `13.png`에서 축/크기/실루엣을 확인한다.
- `professional-zoom-review-page-38.png` ~ `58.png`에서 80종 전체를 확대 확인한다.
- 실제 원정대 화면 smoke에서 작은 표시 크기에서도 디테일이 뭉개지지 않는지 확인한다.

## 완료 기준

- 원정대 몬스터 80종이 전부 재생성된다.
- 기존보다 외곽선, 명암, 디테일 밀도가 올라가 학생 탭 몬스터와 같은 게임 자산으로 보인다.
- 수치 검증과 smoke가 fallback 로그 없이 통과한다.
- 확대 리뷰에서 잘림, 배경 찌꺼기, 프레임별 크기 튐, 과한 노이즈가 없어야 한다.
