# 원정대 몬스터 다양화 확장 계획

> 최신 기준: 이 계획은 40종에서 80종으로 확장한 과거 차수다. 현재 외형 품질 기준과 검증 결과는 `plans/expedition-monster-raster-png-redraw/plan.md`와 `implementations/expedition-monster-raster-png-redraw/implementation.md`를 따른다.

## 목표

원정대 탭 전투장에 등장하는 몬스터를 현재 SD 오브젝트형 톤과 품질 기준을 유지하면서 더 다양하게 추가한다. 단순 PNG 추가가 아니라, 데이터, 생성 레시피, 정규화, 런타임 표시, 검증 문서가 같은 기준을 보도록 확장한다.

## 조사 기준

- 조사일: 2026-06-28
- 작업 상태 확인: `git status --short` 기준 원정대/비주얼 관련 파일이 이미 수정되어 있으므로, 기존 변경은 되돌리지 않는다.
- MCP 확인: `tool_search`로 확인 가능한 MCP는 S1Mcp, UmgMcp, blender 계열이며 Student 웹 자산 전용 MCP 표면은 확인되지 않았다. 이번 범위는 repo-local `asset-sprite-factory`와 로컬 npm 검증 자산을 기준으로 진행한다.
- 확인한 기존 구현 문서:
  - `implementations/expedition-monster-quality-redraw/implementation.md`
  - `implementations/monster-companion-quality-refresh/implementation.md`
  - `implementations/expedition-encounter-motion-polish/implementation.md`
  - `implementations/expedition-combat-visual-polish/implementation.md`
- 확인한 핵심 문서:
  - `docs/asset_sprite_factory.md`
  - `docs/visual_asset_production.md`

## 현재 구조 요약

원정대 몬스터는 이미 독립 family로 관리된다.

- 원본 시트: `assets/visual-source/expedition-enemies/<id>-move.png`
- 정규화 프레임: `src/snapshot/assets/individual/expedition-enemies/<id>/move_0.png` ~ `move_3.png`
- manifest: `data/professional_sprite_manifest.json`
- 축/확대 검수 리포트: `artifacts/visual-asset-samples/professional-axis-report.json`, `artifacts/visual-asset-samples/expeditionEnemies-*-zoom-sheet.png`
- 생성기: `tools/generate-professional-sprite-sources.py`
- 정규화: `tools/prepare-professional-sprites.py`
- 아틀라스/스냅샷: `tools/build-visual-assets.mjs`
- React 런타임 프레임 로드: `src/react/game/assets.js`
- React 화면 표시: `src/react/App.jsx`
- 실제 표시 CSS: `src/react/styles.css`

현재 manifest 수치:

- `cell=160`, `centerX=80`, `baselineY=151`
- `maxSpriteWidth=132`, `maxSpriteHeight=146`
- `minFrameDifference=2.5`
- 원정대 몬스터 family: `expeditionEnemies`, 조사 당시 40종, 구현 후 80종
- 방향: 전원 `left`
- 구현 후 구성: 10개 tone x 일반 6종 + 보스 2종

현재 stage 연결:

- `data/expedition_stages.json`: 100개 일반 세그먼트
- 각 챕터는 같은 tone의 `mob-1..6`을 10개 segment에 분산 배치한다.
- stage별 화면 적 수는 항상 3마리이며, `data/expedition_combat_balance.json`의 적 수와 일치한다.
- `data/expedition_stages.json`은 대표 `enemyAsset`과 실제 슬롯별 `enemyAssets` 배열을 함께 가진다.
- `src/react/App.jsx`는 `stage.enemyAssets[index]`를 직접 사용하며, 누락 시 assert로 실패한다.
- `data/expedition_bosses.json`: 100개 보스 stage가 20개 `bossAsset`을 중간 보스/챕터 보스에 나눠 사용한다.
- `npm run expedition:combat-verify` 통과: `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`

## 현재 아트 상태

좋은 점:

- 원정대 몬스터는 텍스트 라벨 없는 귀여운 SD 오브젝트형 몬스터로 이미 전환되어 있다.
- 형광 녹색 원본, 4프레임, 좌향, 160x160 정규화, 축/기준선 검수 구조가 있다.
- 기존 축 리포트 기준 원정대 몬스터 40종은 모두 `status=ok`다.
- 기존 리포트 수치: `minPoseDelta=5.119`, `minTopMargin=9`, `minBottomMargin=9`, `maxCenterAbs=0.5`, `maxBaselineAbs=0`, `solidHeight=142` 고정.
- 실제 화면 캡처 `artifacts/visual-asset-smoke/expedition.png` 기준, 첫 전투 화면에서 몬스터가 잘리지 않고 HP bar/파티와 겹치지 않는다.

문제점:

- 체감 다양성은 낮다. 100개 일반 stage가 tone별 3종만 반복하고, 보스 100개도 챕터별 보스 1종을 10번 반복한다.
- 실루엣 다양성이 부족하다. 대부분 같은 얼굴, 눈, 팔, 발, 중앙 아이콘 구조를 공유하므로 40종이어도 같은 family의 색/아이콘 변형처럼 보인다.
- 첫 원정대 화면부터 비슷한 직사각형 고지서형 3마리가 나란히 보여 반복감이 드러난다.
- `docs/visual_asset_production.md`는 원정대 런타임이 `visual-enemies.png` background-position을 쓴다고 설명하지만, 현재 React 화면은 `src/react/game/assets.js`의 개별 `move_*.png`를 `SpriteFrames`로 렌더한다. 문서와 실제 canonical 표시 경로가 어긋나 있다.
- 생성 CSS에는 `.expedition-enemy-visual.boss` 규칙이 남아 있지만, React 화면은 보스도 일반 `.expedition-enemy-visual`과 같은 프레임 크기 경로를 탄다. 보스다운 크기/연출이 약하다.

## 권장 방향

기존 시스템을 확장한다. 신규 몬스터 시스템을 따로 만들지 않는다.

이유:

- 이미 `asset-sprite-factory`가 원정대 몬스터 family를 관리한다.
- 누락 자산을 조용히 fallback하지 않고 `getExpeditionEnemyFrameUrls()`에서 바로 오류로 드러내는 구조가 있다.
- stage/combat/smoke 검증도 원정대 적 asset 존재와 화면 수를 확인한다.

목표 수량은 1차로 다음을 권장한다.

- 일반 몬스터: 10개 tone x 6종 = 60종
- 보스 몬스터: 10개 tone x 2종 = 20종
- 총 80종

이 수량이면 챕터별 10개 일반 segment에 6종을 순환/조합할 수 있고, 보스도 중간 보스와 챕터 보스의 체감 차이를 만들 수 있다. 100개 stage를 전부 고유 몬스터로 만드는 것은 제작/검수량이 커지므로 2차로 미룬다.

## 컨셉 확장안

각 tone은 기존 progression을 유지하되, 같은 사각 몸통 색놀이가 아니라 오브젝트 자체 실루엣이 읽히게 한다.

- shelter: 월세 고지함, 대기 번호표, 구겨진 이력서, 공과금 고지서, 도시락 봉투, 임시 침낭 / 보스: 자립 게이트, 생활비 미로
- studio: 세탁 바구니, 야간 알바 컵, 주문 러시 타이머, 누적 영수증, 교대 스케줄 보드, 보증금 계약서 / 보스: 보증금 금고, 마감 폭주 계산대
- neighborhood: 가격표, 병원 예약판, 학원비 장부, 수리 견적서, 관리비 게시판, 상권 지도 / 보스: 대출 심사철, 동네 계약 괴물
- company: 출입증 게이트, 메일 인박스, 스프레드시트 모니터, 회의 초대 팝업, 보고서 프린터, KPI 표지판 / 보스: 오피스 로비, 야근 서버룸
- office: 회의 차트판, 회의 안건철, 발표 압박대, 법률 조항 책, 진료 차트, 연구 노트 / 보스: 회의록 더미, 책임 결재탑
- asset: 수익률 코인, 변동성 차트, 리스크 금고, 세금 계산기, 포트폴리오 보드, 보험 증권 / 보스: 시장 금고, 폭락 경보탑
- national: 민원 서류, 승인 도장, 관공서 창구, 예산 서류함, 입찰 봉투, 심사 체크리스트 / 보스: 국가 과제탑, 정책 미궁
- global: 공항 여권, 무역 화물, 시차 지구본, 통역 헤드셋, 환율 전광판, 비자 서류 / 보스: 월드 컨퍼런스, 글로벌 계약 게이트
- future: AI 칩, 데이터 큐브, 바이오 플라스크, 로봇 팔 박스, 양자 회로판, 자동화 드론 포트 / 보스: 특이점 코어, 미래 도시 메인프레임
- summit: 정상 깃발, 기후 의제, 조정 회의장, 평화 조약 두루마리, 우주 개척 캡슐, 윤리 위원회 의자 / 보스: 의사결정망, 사회 사다리 정점

## 구현 계획

1. 기준 확정
   - 사용자 요청에 따라 기존 원정대 몬스터 family를 같은 형태로 확장한다.
   - 1차 구현 목표는 80종 확장이다.

2. 데이터/레시피 확장
   - `tools/generate-professional-sprite-sources.py`의 `ENEMY_TONES`를 tone별 일반 6종, 보스 2종 구조로 확장한다.
   - `bossDesign` 단일값을 `bossDesigns` 배열로 바꾼다.
   - `draw_expedition_body()`에 새 form을 추가한다. 예: `bill`, `sleepingBag`, `printer`, `calculator`, `dronePort`, `capsule`, `councilSeat`.
   - `draw_expedition_icon()`에 새 icon을 추가한다.
   - 모든 신규 디자인은 긴 막대 팔다리나 넓은 외부 소품으로 몸통이 작아지지 않게 한다.

3. manifest/원본 생성 구조 수정
   - `build_manifest()`가 tone별 `len(designs)`와 `len(bossDesigns)`를 그대로 반영하게 한다.
   - id 규칙은 `tone-mob-1..6`, `tone-boss-1..2`를 권장한다.
   - 기존 저장/문서 호환을 위해 `tone-boss` alias를 남길지 여부를 검토한다. 권장은 데이터를 한 번에 새 id로 갱신하고 fallback alias를 만들지 않는 것이다.

4. 아틀라스/스냅샷 빌드 수정
   - `tools/build-visual-assets.mjs`의 `buildEnemyAtlas()`가 고정 `3종+1보스`를 직접 생성하지 말고 `data/professional_sprite_manifest.json`의 `expeditionEnemies.items` 순서를 읽도록 바꾼다.
   - `data/visual_assets.json`의 enemies items가 80종을 그대로 기록하게 한다.
   - 현재 React 런타임은 개별 `move_*.png`를 사용하므로, CSS background-position 규칙은 스냅샷/레거시 용도로만 남길지 정리한다.

5. stage/boss 매핑 확장
   - `data/expedition_stages.json`의 `enemyAsset`을 `mob-1..6`으로 분산한다.
   - 같은 전투 안의 3마리를 더 세밀하게 지정하려면 새 필드 `enemyAssets`를 추가한다.
   - 권장 구조:
     - `enemyAsset`: 대표/기존 호환용 첫 asset
     - `enemyAssets`: 실제 슬롯별 3개 asset
   - `src/react/game/expedition.js`의 `createStageView()`가 `enemyAssets`를 검증/전달한다.
   - `src/react/App.jsx`의 enemy 렌더링은 `stage.enemyAssets[index]`를 직접 사용하고, 누락 시 실패한다.
   - `tools/validate-expedition-combat-balance.mjs`는 `enemyAssets.length === enemyCount`와 각 asset 존재를 검증한다.
   - 보스는 `data/expedition_bosses.json`에서 중간 보스와 챕터 보스를 `boss-1`, `boss-2`로 나누는 방식을 권장한다.

6. 보스 표시 차별화
   - `ExpeditionScene` enemy visual에 `stage.isBoss ? " boss" : ""`를 붙인다.
   - `src/react/styles.css`에서 `.expedition-scene.boss .expedition-enemy-frame` 또는 `.expedition-enemy-visual.boss .expedition-enemy-frame` 표시 크기를 별도로 둔다.
   - smoke 기준의 enemy clipping/크기 하한을 보스에도 추가한다.

7. 문서 최신화
   - `docs/asset_sprite_factory.md`: 원정대 몬스터 수량, id 규칙, 검증 기준, React 표시 경로 업데이트.
   - `docs/visual_asset_production.md`: `visual-enemies.png` background-position 설명과 현재 `SpriteFrames` 경로의 관계 정리.
   - 구현 완료 후 `implementations/expedition-monster-diversity-expansion/implementation.md` 작성.

## 검증 계획

작업 완료 기준은 다음을 모두 통과해야 한다.

- `npm run asset:factory:prepare`
  - `expeditionEnemies count=80` 예상
  - 신규 enemy 전원 `direction=left`
  - `poseDelta.minimum >= minFrameDifference`
  - `centerDelta <= 1px`
  - `baselineDelta = 0`
  - 상하 alpha margin 8px 이상
  - solid height drift 10px 이하
- 눈검수
  - `artifacts/visual-asset-samples/expeditionEnemies-*-axis-sheet.png`
  - `artifacts/visual-asset-samples/expeditionEnemies-*-zoom-sheet.png`
  - `src/snapshot/assets/visual-enemies.png`
  - `artifacts/visual-asset-smoke/expedition.png`
- `npm run asset:factory:qa`
- `npm run expedition:combat-verify`
- `npm run react:expedition-smoke`
- `npm run visual:smoke`
- `npm run verify:mobile`

## 리스크와 대응

- 신규 form이 정규화 과정에서 과하게 축소될 수 있다.
  - 대응: 외부 소품보다 몸통 실루엣 안쪽 패턴으로 읽히게 그리고, zoom sheet에서 한 프레임만 작아지는지 확인한다.
- `bossAsset` id 변경은 기존 데이터 참조를 깨뜨릴 수 있다.
  - 대응: `data/expedition_bosses.json`, `tools/validate-expedition-combat-balance.mjs`, smoke fixture를 한 번에 갱신하고 fallback alias는 만들지 않는다.
- React 런타임과 generated CSS 경로가 어긋날 수 있다.
  - 대응: canonical 표시 경로를 `SpriteFrames + individual frames`로 문서화하고, 아틀라스 CSS는 스냅샷/레거시 산출물로 한정한다.
- 워크트리가 이미 dirty다.
  - 대응: 실제 구현 전 현재 변경 범위를 다시 확인하고, 기존 사용자 변경을 보존한 채 필요한 파일만 수정한다.

## 결론

조사 당시 원정대 몬스터는 품질 게이트는 통과했지만, 컨셉 다양성이 100 stage 규모에 비해 부족했다. 구현은 기존 40종을 버리는 신규 시스템이 아니라, `asset-sprite-factory`의 원정대 enemy family를 80종으로 확장하고 stage/boss 매핑을 명시화하는 방식으로 완료했다.

## 구현 결과

- `tools/generate-professional-sprite-sources.py` 기준 원정대 몬스터를 80종으로 확장했다.
- `tools/build-visual-assets.mjs`는 `data/professional_sprite_manifest.json`의 `expeditionEnemies.items`를 읽어 enemies atlas와 stage/boss 매핑을 생성한다.
- `data/expedition_stages.json`은 100개 stage 모두 `enemyAssets` 3개를 명시하며, 일반 몬스터 60종을 모두 사용한다.
- `data/expedition_bosses.json`은 `tone-boss-1`, `tone-boss-2` 20종을 사용한다.
- React 원정대 화면은 fallback 추정 없이 `stage.enemyAssets[index]`와 개별 `SpriteFrames`를 사용한다.
- 검증 결과:
  - `npm run asset:factory:prepare` 통과, `PROFESSIONAL_SPRITE_SOURCES_OK companions=75 enemies=80`
  - `npm run asset:factory:qa` 통과
  - `npm run expedition:combat-verify` 통과
  - `npm run react:expedition-smoke` 통과
  - `npm run react:expedition-rules-smoke` 통과
  - `npm run verify:mobile` 통과
