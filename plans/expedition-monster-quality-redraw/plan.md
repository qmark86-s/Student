# 원정대 몬스터 전면 재제작 계획

> 최신 기준: 이 40종 재제작 계획은 과거 차수다. 현재 원정대 몬스터는 `plans/expedition-monster-raster-png-redraw/plan.md` 기준으로 80종 모두 tone별 래스터 PNG 원본 시트에서 파생하며, 사람/아기/유아/인간형 후보는 금지한다.

## 목표

- 원정대에 나오는 몬스터 40종만 대상으로 기존 단순 도형/반복 실루엣을 버리고 새 SD 오브젝트형 몬스터로 재제작한다.
- 몬스터가 붙이고 있는 이름, WAVE 같은 텍스트 레이어는 화면에서 제거한다.
- 각 원정대 지역 tone의 위치/생활권 특색이 몬스터 외형만 봐도 읽히게 한다.
- 기존 Asset Sprite Factory 파이프라인을 유지해 4프레임, 좌향, 축 정렬, 누끼, 클리핑 검증을 통과시킨다.

## 현재 구조

- 원정대 몬스터는 `data/professional_sprite_manifest.json`의 `expeditionEnemies` family 40종이다.
- 원본 시트는 `assets/visual-source/expedition-enemies/<id>-move.png`에 생성된다.
- 생성기는 `tools/generate-professional-sprite-sources.py`이며, `visual:build`에서 매번 재생성된다.
- 정규화는 `tools/prepare-professional-sprites.py`가 처리하고, 최종 아틀라스는 `src/snapshot/assets/visual-enemies.png`다.
- 런타임은 `.expedition-enemy-visual::before`에서 아틀라스 프레임을 순환한다.
- 현재 화면에는 몬스터 아래/안쪽에 `enemy-name`, `strong`, `small` 텍스트가 노출될 수 있다.

## 작업 방향

1. 원정대 몬스터 레시피 교체
   - `ENEMY_TONES`에 지역별 `designs`를 추가한다.
   - 각 tone은 일반 3종 + 보스 1종을 서로 다른 오브젝트 실루엣으로 만든다.
   - 텍스트/숫자/문자 표기는 그리지 않고, 아이콘/형태/색/소품으로 의미를 전달한다.
   - 모든 몬스터는 파티를 향하는 좌향 기준으로 눈동자와 공격 소품을 배치한다.

2. 지역 특색
   - shelter: 월세, 대기표, 이력서/생활 서류, 자립 게이트
   - studio: 세탁/야간 알바/주문 러시/보증금
   - neighborhood: 가격표/병원 예약/학원비/대출 심사
   - company: 출입 게이트/인박스/스프레드시트/오피스 보스
   - office: 회의 자료/차트/화이트보드/회의록 보스
   - asset: 차트/금고/코인/시장 보스
   - national: 민원 서류/도장/관공서/국가 과제 보스
   - global: 여권/공항/무역/월드 컨퍼런스
   - future: 칩/데이터/바이오/AI 코어
   - summit: 정상 깃발/기후 의제/분쟁 조정/세계 의사결정망

3. 텍스트 제거
   - `.expedition-enemy-visual` 내부 텍스트 레이어는 display none 처리한다.
   - 접근성/데이터용 이름은 stage 데이터에 유지하되, 몬스터 그래픽 위에는 보이지 않게 한다.

4. 검증
   - `npm run asset:factory:prepare`
   - `professional-axis-review-page-*.png`, `professional-zoom-review-page-*.png` 중 원정대 몬스터 구간 눈검수
   - `npm run visual:verify`
   - `npm run visual:smoke`
   - `npm run verify:mobile`

## 완료 기준

- `visual-enemies.png`가 기존 반복 사각 몬스터가 아니라 지역별로 구분되는 새 실루엣 40종을 가진다.
- 원정대 실제 화면에서 몬스터에 붙은 이름/WAVE 텍스트가 보이지 않는다.
- 원정대 몬스터는 `direction: "left"` 검증을 유지한다.
- professional report에서 원정대 몬스터 40종의 중심축, 기준선, 상하 여백, 포즈 차이가 모두 통과한다.
- 실제 스모크에서 원정대 몬스터 이미지, 프레임 모션, 림라이트, 클리핑 0건이 유지된다.

## 구현 결과

- `tools/generate-professional-sprite-sources.py`의 원정대 몬스터 레시피를 전면 교체했다.
- 원정대 10개 지역 tone마다 일반 3종과 보스 1종을 서로 다른 SD 오브젝트형 실루엣으로 생성한다.
- 몬스터는 모두 좌향 기준으로 눈동자와 손소품을 배치한다.
- `.expedition-enemy-visual`의 레거시 텍스트/도형 레이어를 숨겨 원정대 몬스터 그래픽 위에는 이름, WAVE, 숫자 텍스트가 보이지 않게 했다.
- `tools/visual-asset-smoke.mjs`에 `enemyTextVisibleCount` 검사를 추가했다.
- `tools/verify-visual-assets.mjs`가 원정대 몬스터 텍스트 숨김 규칙을 검사하도록 갱신했다.

## 최종 검증

- `npm run asset:factory:prepare`: 통과, 원정대 몬스터 40종 `failures=[]`.
- `npm run visual:verify`: 통과, `VISUAL_ASSETS_OK students=32 mainMonsters=192 companions=75 enemies=40 careers=62`.
- `npm run build:web`: 통과, `dist/index.html` 생성.
- `npm run visual:smoke`: 통과, `enemyTextVisibleCount=0`, 원정대 몬스터 클리핑 0건.
- `npm run verify:mobile`: 통과.
