# 비주얼 자산 양산 방법론

## 목표

픽셀 & 복셀 분위기를 유지하면서 캐릭터, 직업, 몬스터 자산을 반복 생산할 수 있게 한다. 단발 이미지 추가가 아니라 데이터 키, 아틀라스, 검증, 스크린샷까지 한 흐름으로 관리한다.

## 생산 흐름

1. 데이터 키를 먼저 정한다.
   - 직업: `data/careers.json`의 `portraitAsset`, `spriteAsset`, `iconAsset`
   - 학년 전투: `data/grade_visuals.json`의 `studentAsset`, `normalMonsterAssets`, `examMonsterAssets`
   - 원정대: `data/expedition_stages.json`의 `enemyAsset`, `enemyVariant`
   - 보스: `data/expedition_bosses.json`의 `bossAsset`

2. 생성 스크립트에 레시피를 추가한다.
   - `tools/build-visual-assets.mjs`
   - 색상, 실루엣, 소품, 티어 배지, 하이라이트를 이 파일에서 결정한다.
   - 스냅샷 번들에 직접 이미지를 붙이지 않는다.

3. 아틀라스를 재생성한다.
   - `npm run visual:build`
   - 생성 결과는 `src/snapshot/assets/*.png`, `src/snapshot/visual-assets.css`, `data/visual_assets.json`, `src/snapshot/manifest.json`에 반영된다.

4. 자동 품질 게이트를 통과시킨다.
   - `npm run visual:verify`
   - `tools/verify-visual-assets.mjs`: 매니페스트, 해시, 데이터 키 연결 확인
   - `tools/visual-asset-audit.mjs`: PNG 셀의 coverage, 팔레트 수, bounds 확인
   - 기준은 `data/visual_asset_quality_gates.json`에서 관리한다.

5. 사람이 컨택트시트로 확인한다.
   - `npm run visual:sheet`
   - 결과: `artifacts/visual-asset-contact-sheet/index.html`
   - 전체 아틀라스에서 비슷한 실루엣, 너무 작은 스프라이트, 과한 반복 색상을 확인한다.

6. 화면 적용을 검증한다.
   - `npm run visual:smoke`
   - 메인 전투 학생/몬스터와 원정대 몬스터의 실제 data image 렌더링을 확인한다.
   - 직업 결과 화면은 `npm run career:smoke`에서 초상화 62개를 확인한다.

7. 전체 모바일 검증을 마친다.
   - `npm run verify:mobile`

## 품질 기준

- 프레임이 비어 있으면 안 된다.
- 같은 계열 안에서도 색상과 소품으로 최소한의 구분이 있어야 한다.
- 컨택트시트 기준은 작은 캐릭터, 직업 소품, 몬스터, 보스가 한 화면에서 같은 픽셀 & 복셀 밀도로 읽히는 수준이다.
- 사용자가 확정한 목표 톤은 고밀도 픽셀/복셀 아이템 시트이며, 실제 게임 적용분은 그보다 조금 단순해도 되지만 CSS 도형 수준으로 후퇴하면 실패로 본다.
- 레퍼런스 보드 품질을 1, CSS 도형/과도한 강제 픽셀화를 0으로 보면 실제 게임 적용분은 0.5~0.7 밀도를 목표로 한다.
- 이 기준의 핵심은 큰 네모 픽셀을 만드는 것이 아니라, 레퍼런스의 실루엣/명암/소품 정보를 유지한 채 모바일 화면 크기에 맞게 단순화하는 것이다.
- 고밀도 레퍼런스에서 직접 추출한 학생/몬스터는 `image-rendering:auto`로 렌더링해 브라우저 확대 과정에서 세부 정보가 다시 뭉개지지 않게 한다.
- 직업 초상화는 작은 전신보다 얼굴, 상체, 소품이 읽히는 bust 구도를 우선한다.
- 메인 전투 학생은 학년 단계가 색상과 복장으로 구분되어야 한다.
- 몬스터는 일반, 시험, 보스가 크기와 장식 밀도로 구분되어야 한다.
- 메인 전투 화면의 몬스터는 하단 텍스트 카드가 아니라 전투장 안 캐릭터 편대로 표시한다.
- 보스와 수능 몬스터만 캐릭터 위 HP바를 사용하고, 일반 몬스터는 텍스트/HP바 없이 실루엣으로 읽히게 한다.
- 관리용 카드나 상세 목록에 들어가는 작은 자산도 같은 메인 아틀라스에서 뽑아 사용해 전투장 캐릭터와 다른 톤으로 보이지 않아야 한다.
- 모바일 360px 화면에서 텍스트와 스프라이트가 서로 덮이면 실패로 본다.

## 학년군 자산 기준

- 기준 참조 보드: `assets/reference/age-grade-pixel-styleboard.png`
- 초1~초2는 작은 체형, 큰 머리, 노란 안전모, 밝은 책가방, 크레파스/연필 같은 저학년 소품을 우선한다.
- 초3~초6은 저학년보다 살짝 커진 체형, 캐주얼 티셔츠, 운동화, 교과서/발표 노트/실험 관찰장 같은 학교 과제 소품을 우선한다.
- 중1~중3은 회사원 정장처럼 보이지 않도록 긴 넥타이와 재킷 라펠을 피하고, 교복 리본, 조끼, 운동화, 학생 가방, 수행평가 파일로 읽히게 한다.
- 고1~고3은 성인 직장복이 아니라 학교 교복과 수험 자료로 보여야 한다. 재킷 라펠보다 cardigan/조끼, 학교 배지, OMR/모의고사 종이, 두꺼운 책가방을 기준으로 한다.
- N수는 고등학생과 구분되게 후드, 헤어밴드, 커피, 독서실 종이, 형광펜을 사용한다.
- 초등 몬스터는 받아쓰기장, 색종이, 크레파스, 스티커처럼 밝고 장난감 같은 학습 물체로 만든다.
- 중등 몬스터는 교복, 시간표, 수행평가 파일, 워크북처럼 학교 생활감이 드러나야 한다.
- 고등 몬스터는 OMR, 모의고사 봉투, 타이머, 기출 문제집처럼 시험 압박이 즉시 읽혀야 한다.
- N수 몬스터는 독서실, 커피, 루틴표, 파이널 봉투, 스탠드 조명으로 고3 몬스터와 분리한다.
- 몬스터는 단순 학습 아이콘처럼 보이면 안 된다. 작은 손, 발, 표정, 스티커/탭 디테일을 넣어 전투 가능한 캐릭터로 읽히게 한다.
- 컨택트시트에는 학년군, 나이, 학생 타이틀, 몬스터명을 함께 표시해 사람이 검수할 수 있어야 한다.

## 전투 모션 기준

- 전투장은 정적인 배경이 아니라 자동 진행 중인 무대처럼 보여야 한다.
- 배경 이동감은 배경 시트, 그리드, 바닥의 미세한 treadmill 모션으로 만든다.
- 학생은 제자리 사격보다 준비 자세, 짧은 돌진, 타격, 복귀가 읽히는 근접 루프를 우선한다.
- 학생은 `move_0~move_3` 실제 키 포즈를 순환해야 한다. 한 장을 흔들거나 늘려서 만든 4프레임은 이동 스프라이트로 인정하지 않는다.
- 학생과 학습 도우미는 돌진 타이밍이 아닐 때도 스프라이트 프레임, 보조 VFX, slot별 타이밍 차이로 살아 있어야 한다.
- 모든 몬스터는 slot별 타이밍 차이로 idle step/breath가 있어야 한다.
- 현재 타깃만 더 강한 피격 흔들림, shock ring, hit spark, dust burst를 갖고, 일반 몬스터에는 반복 텍스트나 HP바를 붙이지 않는다.
- 학습 도우미는 UI 장식이 아니라 학생 옆 동료 편대로 보이며, 활성화 상태에서는 지원 돌진과 보조 타격 이펙트를 가진다.
- 모바일 성능을 위해 가능한 모션은 `transform`, `opacity` 중심으로 만든다.
- 학생 프레임 애니메이션은 `background-position` 기반의 `studentMoveFrames`로 처리한다.

## 학생 이동 스프라이트 기준

- 학생 원본은 캐릭터 한 명당 `assets/visual-source/characters/student-XX-gender-move.png` 한 장으로 관리한다.
- 원본 시트는 `4 columns x 1 row`이며, 각 칸은 같은 캐릭터의 오른쪽 방향 `contact`, `passing`, `high step`, `push-off` 키 포즈여야 한다.
- 모든 프레임은 반드시 `->` 방향을 본다. 반대 방향 프레임은 mirror 보정이 아니라 재생성 대상으로 본다.
- 배경은 형광 초록 `#00FF00` 기반으로 만들고, 전처리에서 셀 가장자리 몇 픽셀을 버려 생성기가 만든 칸 경계선이 bbox에 섞이지 않게 한다.
- `tools/sync-character-animation-manifest.mjs`가 `student-XX-gender-move.png` 파일을 자동으로 `data/character_animation_manifest.json`에 연결한다.
- `tools/prepare-character-sprites.py`가 chroma key 제거, 160x160 정규화, `centerX=80`, `baselineY=148` 축 고정, 포즈 차이 검사를 수행한다.
- `poseDelta.minimum`은 `minFrameDifference` 이상이어야 한다. 너무 비슷한 4프레임은 `pose-too-similar`로 실패 처리한다.
- 축 리포트는 `artifacts/visual-asset-samples/character-axis-report.json`, 눈검수용 시트는 `artifacts/visual-asset-samples/student-XX-gender-axis-sheet.png`에 남긴다.
- 앱 아틀라스는 160px 셀, 64 columns x 2 rows로 구성한다. 남학생은 0행, 여학생은 1행을 사용해 모바일 텍스처 폭을 10240px로 제한한다.

## 원정대 배경 기준

- 원정대 배경은 CSS 격자나 절차형 저밀도 배경이 아니라 원화급 PNG 기반이어야 한다.
- 60초 전투감을 위해 원화급 소스를 긴 파노라마로 재조립하고, 배경 자체를 천천히 pan한다.
- 용량보다 첫 인상과 화면 체류감을 우선한다. 현재 원정대 파노라마는 `__STUDENT_ASSET_010__`으로 관리한다.
- 배경 위에는 필요한 HUD, 캐릭터, VFX만 얹고, 전투장 전체를 덮는 격자/타일 오버레이는 사용하지 않는다.

## AI 이미지 생성 사용 기준

- 컨셉 보드나 최종 수작업 보정용 원본을 만들 때만 사용한다.
- 학생 캐릭터는 한 명씩 실제 4포즈 move sheet를 생성하고, 전처리/축 검증을 통과한 프레임만 게임 아틀라스에 넣는다.
- AI 생성 이미지를 프로젝트 자산으로 쓰려면 반드시 workspace에 복사하고, `data/visual_assets.json` 및 매니페스트에 연결한다.
- 확정된 스타일 보드는 `assets/reference/`에 저장하고, `tools/build-visual-assets.mjs`에서 crop rect를 테이블처럼 관리한다.
- crop rect는 넓게 잡지 않는다. 주변 캐릭터, 배경선, 그림자를 물고 들어오면 실제 전투장에서 품질이 급격히 낮아진다.
- 새 보드 기반 자산을 추가한 뒤에는 `npm run visual:sheet`와 `npm run visual:smoke`를 모두 확인해 컨택트시트와 실제 전투 화면의 인상이 같은지 본다.

## 추천 명령

```powershell
npm run asset:factory:prepare
npm run asset:factory:qa
npm run visual:qa
npm run verify:mobile
```

`visual:qa`는 자산 생성, 매니페스트/품질 감사, 컨택트시트 생성, 화면 비주얼 스모크를 한 번에 수행한다.
`asset:factory:qa`는 여기에 캐릭터 축 리포트 요약과 캐릭터별 리뷰 시트 생성을 추가한 상위 검증 흐름이다.

## 재사용 시스템

- 자세한 사용법: `docs/asset_sprite_factory.md`
- repo-local Skill 원본: `codex/skills/asset-sprite-factory/SKILL.md`
- 다른 Agent용 로컬 설치: `npm run asset:factory:install-skill`
- 새 캐릭터군 예시: `tools/asset-factory/recipes/character-set.template.json`
