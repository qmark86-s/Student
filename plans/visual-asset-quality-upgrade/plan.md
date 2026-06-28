# 비주얼 자산 퀄리티 개선 Plan

> 최신 기준: 이 plan은 초기 CSS 도형 탈피 단계의 기록이다. 원정대 몬스터의 현재 기준은 `plans/expedition-monster-raster-png-redraw/plan.md`의 80종 래스터 PNG 원본 시트 방식이다.

## 목표

현재 배경의 픽셀/복셀 분위기는 유지하면서, 캐릭터, 직업, 몬스터의 표현력을 CSS 도형 수준에서 실제 게임 자산 수준으로 올린다.

## 현재 분석

- 실제 비트맵 자산은 `src/snapshot/assets`의 PNG 6개가 중심이다.
- 배경 자산은 1672px급 이미지와 세로 배경 시트를 포함하고 있어 현재 화면의 분위기를 받쳐준다.
- 캐릭터와 원정대 유닛은 `.expedition-unit-avatar` 계열 CSS 도형으로 구성되어 있다.
- 몬스터와 보스는 `.expedition-enemy-visual` 계열 CSS 도형과 색상 변수로 구성되어 있다.
- 직업 선택 UI는 `data/careers.json`의 `auraColor`, 텍스트, 수치 중심이며 직업별 고유 실루엣이나 초상화가 없다.
- 챕터/스테이지/보스 데이터에는 좋은 이름과 테마가 많지만, 시각 자산이 이를 충분히 구분해주지 못한다.

## 문제점

- CSS 도형은 파일 관리가 쉽지만 형태가 단순해 캐릭터, 직업, 몬스터가 비슷하게 보인다.
- 직업 62종의 정체성이 색상 원형과 텍스트에 의존한다.
- 몬스터/보스가 챕터 테마에 맞춰 강해지는 느낌보다 색만 바뀌는 느낌이 크다.
- 모바일 APK 출시 기준으로는 첫 인상, 가챠/직업 획득 만족감, 전투 화면 체류감이 약해질 수 있다.

## 권장 방향

1. CSS 도형 유지가 아니라 PNG/WebP 스프라이트 중심으로 전환
   - 원정대 캐릭터, 직업 초상화, 일반 몬스터, 보스는 실제 래스터 자산으로 교체한다.
   - CSS는 위치, 크기, 그림자, 이펙트, 애니메이션만 담당한다.

2. 픽셀 & 복셀 아트 스타일 가이드 확정
   - 2.5D 복셀 느낌의 배경과 맞도록 정면/쿼터뷰 혼합 픽셀 스프라이트를 기준으로 잡는다.
   - 해상도 기준은 모바일에서 선명한 `128x128`, 보스 `192x192`, 직업 초상화 `96x96`부터 시작한다.
   - `image-rendering: pixelated` 적용 여부를 자산별로 테스트한다.

3. 직업 62종은 일괄 제작보다 계열별 베이스+소품 조합
   - 의학, 법/행정, 공학, 금융, 예술, 교육, 서비스, 글로벌, 미래 기술 등 계열을 먼저 나눈다.
   - 계열별 몸체/복장 베이스를 만들고 직업별 소품, 머리, 컬러, 아이콘을 얹는다.
   - 결과 화면과 도감에는 직업별 초상화 또는 반신 스프라이트를 표시한다.

4. 몬스터는 챕터별 팔레트와 실루엣을 분리
   - 일반 몬스터: 챕터별 2~3종 베이스, 세그먼트별 소품/표정 변형
   - 중간 보스: 일반 몬스터보다 큰 실루엣과 전용 장식
   - 챕터 보스: 전용 대형 스프라이트와 등장 이펙트

5. 데이터 테이블에 자산 키 추가
   - `careers.json`: `portraitAsset`, `spriteAsset`, `iconAsset`
   - `expedition_stages.json`: `enemyAsset`, `enemyVariant`
   - `expedition_bosses.json`: `bossAsset`
   - 앱 로직은 필수 자산 키가 없으면 기존 CSS 도형으로 조용히 fallback하지 않고 검증 실패로 드러낸다.

6. 생성/검수 파이프라인
   - `assets/source/`에 원본 PNG를 두고, `tools/build-assets.mjs`가 WebP/PNG와 매니페스트를 생성한다.
   - `data/visual_assets.json`으로 자산 ID, 크기, 용도, 버전을 관리한다.
   - Playwright screenshot smoke에서 전투 화면/직업 결과 화면을 캡처해 빈 이미지, 깨진 경로, overflow를 검사한다.

## 1차 제작 범위

- 원정대 기본 학생/직업 유닛 8종
- 직업 초상화 상위 20종
- 일반 몬스터 챕터별 2종, 총 20종
- 중간 보스 공용 베이스 10종
- 챕터 보스 10종
- 수능 전투 전용 시험장/과목 몬스터 5종

## 필요한 도구

- 이미지 생성/편집: Codex `imagegen` skill 또는 외부 일러스트 제작 툴
- 배치 최적화: Node 기반 이미지 매니페스트/압축 스크립트
- 검증: Playwright 모바일 screenshot smoke
- APK 고려: WebP 우선, PNG fallback, 총 번들 크기 예산 관리

## 우선순위

1. 전투 화면 체감 개선
   - 일반 몬스터, 보스, 원정대 유닛부터 교체한다.
2. 직업 획득 만족감 개선
   - 직업 결과/도감에 초상화를 추가한다.
3. 가챠/보스 연출 개선
   - 희귀도별 등장 이펙트와 보스 전용 컷인을 추가한다.
4. 전체 최적화
   - WebP 변환, lazy loading, 매니페스트 검증, APK 용량 체크를 넣는다.

## 완료 기준

- 전투 화면에서 CSS 도형 대신 실제 캐릭터/몬스터 이미지가 표시된다.
- 직업 결과 화면과 도감에서 직업별 고유 초상화가 표시된다.
- 모바일 360px/412px smoke에서 깨진 이미지와 가로 overflow가 없다.
- `npm run verify:mobile`에 비주얼 자산 경로 검증이 포함된다.
- `npm run visual:qa`로 자산 생성, 품질 감사, 컨택트시트, 화면 적용 검증을 반복할 수 있다.

## 1차 구현 결과

- 완료일: 2026-06-20
- 기본 학년 전투 학생 16프레임과 학년/수능 몬스터 192프레임을 새 픽셀 아틀라스로 재생성했다.
- 원정대 동료 13종, 원정대 몬스터/보스 40종, 직업 초상화 62종 아틀라스를 추가했다.
- `data/careers.json`, `data/grade_visuals.json`, `data/expedition_stages.json`, `data/expedition_bosses.json`에 비주얼 자산 키를 추가했다.
- `data/visual_assets.json`, `data/visual_asset_quality_gates.json`, `src/snapshot/visual-assets.css`, `tools/build-visual-assets.mjs`, `tools/verify-visual-assets.mjs`로 재생성 가능한 자산 파이프라인을 만들었다.
- `tools/visual-asset-audit.mjs`, `tools/visual-asset-contact-sheet.mjs`, `tools/visual-asset-smoke.mjs`로 품질 감사, 컨택트시트, 화면 적용 검증을 시스템화했다.
- `npm run verify:mobile`에서 비주얼 자산 생성/검증, 메인 전투/원정대 비주얼 스모크, 모바일 스크린샷, 직업 초상화 62개, N수 흐름을 함께 검증한다.
- 양산 방법론은 `docs/visual_asset_production.md`에 정리했다.

## 다음 차수 후보

- AI 이미지 생성 결과물을 원본 컨셉 보드로 저장하고, 선별된 스프라이트를 수작업 보정해 아틀라스 품질을 더 끌어올린다.
- 원정대 파티가 비어 있을 때도 대표 학생/실루엣이 보이도록 초기 파티 안내 화면을 개선한다.
- WebP 변환과 PNG fallback을 추가해 APK 번들 크기 예산을 더 엄격하게 관리한다.

## 2차 적용 결과

- 완료일: 2026-06-20
- 전투 하단 텍스트 카드를 메인 전투장에서 제거하고, 전투장 안 `battle-scene-enemy` 편대로 교체했다.
- 12개월 전투는 일반 몬스터와 보스 몬스터가 섞인 12마리 캐릭터 편대로 보인다.
- 보스 몬스터만 캐릭터 위 HP바를 표시하고, 일반 몬스터의 반복 텍스트/HP바는 제거했다.
- 수능 전투는 전투장 안 5마리 수능 몬스터와 HP바로 표시된다.
- 사용자가 확정한 컨택트시트 품질 기준을 `docs/visual_asset_production.md`에 추가했다.
- 구현 상세는 `implementations/battle-scene-enemy-lineup/implementation.md`에 기록했다.

## 3차 적용 결과

- 완료일: 2026-06-20
- 일반 방치형 RPG 전투처럼 보이도록 전투장 배경, 바닥, 학생, 몬스터 편대, 피격 이펙트, 학습 도우미 모션을 추가했다.
- 기존 원거리 투사체 느낌의 `pencil-shot`을 메인 전투장에서는 숨기고 학생의 근접 slash 이펙트로 대체했다.
- 모든 전투장 몬스터가 slot별 지연값으로 idle/breath 모션을 갖고, 현재 타깃만 피격 모션과 hit spark를 표시한다.
- 학습 도우미가 활성화되면 학생 옆 동료처럼 지원 돌진 루프를 갖는다.
- 모션 기준은 `docs/visual_asset_production.md`, 구현 상세는 `implementations/battle-arena-motion/implementation.md`에 기록했다.

## 4차 적용 결과

- 완료일: 2026-06-20
- 학생 내부 스프라이트에 제자리 idle bounce를 추가해 돌진하지 않는 순간에도 살아 움직이게 했다.
- 피격 중인 몬스터의 이동폭과 회전/스케일 반응을 키워 타격감이 더 크게 보이게 했다.
- `enemyShockRing`, `battleDustBurst`, `studentDashDust` VFX를 추가했다.
- `visual:smoke`가 학생 idle 이동량, 일반 몬스터 idle 이동량, 큰 피격 이동량, shock ring, dust burst까지 검증한다.

## 5차 적용 결과

- 완료일: 2026-06-20
- 원정대 배경을 낮은 밀도의 절차형 파노라마에서 원화급 PNG 기반 파노라마로 교체했다.
- 기존 도시 원화 배경을 3구간 긴 배경 기반으로 재조립하고 이음새를 블렌딩한다.
- 최신 기준에서는 1~10챕터용 `visual-expedition-backdrop-{theme}-{00..09}.png` route tile 100개를 생성하고, `visual-expedition-backdrops.png`는 호환용 기본 배경으로 유지한다.
- 원정대 배경은 현재 Stage가 속한 tile PNG를 React에서 `--expedition-bg-image`로 바인딩해 움직이며, 기존 배경 `<img>`와 품질을 낮추는 격자/CSS 배경은 숨긴다.
- 원정대 동료 melee, 적 idle/피격, shock ring, slash, dust burst VFX를 추가했다.
- 컨택트시트와 smoke 검증에서 원정대 파노라마도 확인한다.

## 6차 적용 결과

- 완료일: 2026-06-20
- 학년군별 학생 스프라이트를 초등 저학년, 초등 고학년, 중등, 고등, N수 기준으로 다시 정리했다.
- 초등학생이 직장인처럼 보이지 않도록 작은 체형, 안전모, 밝은 책가방, 교과서/노트 소품을 강화했다.
- 중고등학생은 정장 넥타이 느낌을 줄이고 교복 리본, 학교 배지, OMR/모의고사 종이로 읽히게 수정했다.
- N수는 후드, 헤어밴드, 커피, 독서실 종이로 고등학생과 구분했다.
- 메인 몬스터 192프레임을 초등/중등/고등/N수 테마별 학습 물체로 재분류했다.
- 컨택트시트가 학생 타이틀, 몬스터명, 나이, 학년군을 표시해 나이대 부적합 자산을 사람이 바로 검수할 수 있게 했다.
- 학년군 자산 기준은 `docs/visual_asset_production.md`에 양산 규칙으로 정리했다.

## 7차 적용 결과

- 완료일: 2026-06-20
- 사용자가 지적한 과도한 픽셀화 문제를 반영해, 레퍼런스 보드 품질 1 대비 실제 적용 목표를 0.5~0.7 밀도로 재설정했다.
- 학생 16프레임은 `assets/reference/age-grade-pixel-styleboard.png` 보드 기반 아틀라스 경로를 사용한다.
- 메인 몬스터 192프레임은 이후 품질 기준 변경으로 `assets/reference/character-ref-cute-sd.png` 우측 몬스터 cutout과 `assets/visual-source/main-monsters/main-monsters-green.png` 형광 녹색 소스 시트 경로로 교체했다.
- 메인 몬스터는 보드 누락이나 배경 분리 실패를 기존 결정적 드로잉으로 조용히 fallback하지 않는다. 누락은 빌드 실패로 드러내고 원본/전처리를 수정한다.
- 메인 전투 학생/몬스터와 원정대/직업 렌더링의 강제 `pixelated`를 줄여 큰 네모 픽셀로 뭉개지는 느낌을 완화했다.
- `npm run visual:verify`, `npm run visual:smoke`, `npm run mobile:smoke`로 아틀라스, 실제 전투장, 모바일 360/412px 화면을 검증했다.
