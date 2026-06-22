# 비주얼 자산 양산 방법론

## 목표

픽셀 & 복셀 분위기를 유지하면서 캐릭터, 직업, 몬스터 자산을 반복 생산할 수 있게 한다. 단발 이미지 추가가 아니라 데이터 키, 아틀라스, 검증, 스크린샷까지 한 흐름으로 관리한다.

## 생산 흐름

1. 데이터 키를 먼저 정한다.
   - 직업: `data/careers.json`의 `portraitAsset`, `spriteAsset`, `iconAsset`
   - 학년 전투: `data/grade_visuals.json`의 `studentAsset`, `normalMonsterAssets`, `examMonsterAssets`
   - Battle Road 조우: `data/battle_road_config.json`의 `schoolYear.encounters`, `suneung.encounters`
   - 원정대: `data/expedition_stages.json`의 `enemyAsset`, `enemyVariant`
   - 보스: `data/expedition_bosses.json`의 `bossAsset`

2. 생성 스크립트에 레시피를 추가한다.
   - `tools/build-visual-assets.mjs`
   - 학생 원본 정규화: `tools/prepare-character-sprites.py`
   - 직업동료/원정대 몬스터 원본 생성: `tools/generate-professional-sprite-sources.py`
   - 직업동료/원정대 몬스터 정규화: `tools/prepare-professional-sprites.py`
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
   - 전체 PNG 스냅샷: 기본은 `artifacts/visual-asset-contact-sheet/contact-sheet.png`이고, 페이지가 길면 `contact-sheet-page-01.png`처럼 분할된다.
   - 전체 아틀라스에서 비슷한 실루엣, 너무 작은 스프라이트, 과한 반복 색상을 확인한다.

6. 화면 적용을 검증한다.
   - `npm run visual:smoke`
   - 메인 전투 학생/몬스터/파노라마 배경과 원정대 동료/몬스터/파노라마 배경의 실제 data image 렌더링을 확인한다.
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
- 현재 전체 스프라이트 비율의 기준 레퍼런스는 `assets/reference/character-ref-cute-sd.png`다.
- 학생, 직업동료, 파티 유닛은 머리가 크고 몸통/팔다리가 짧은 SD 비율을 유지해야 한다. 고학년/N수/직업군이라도 성인형 4등신으로 길어지면 실패로 본다.
- 학년 차이는 키와 팔다리 길이보다 복장, 가방, 교복, 소품, 표정 밀도로 구분한다.
- SD 비율 조정값은 `data/sprite_style_profiles.json`에서 관리하고, 학생의 실제 변환은 `tools/sprite_style_utils.py`에서 수행한다.
- 학생 SD 변환은 머리/상체/하체를 나누어 다리 가로 길이와 세로 길이를 함께 줄인다. 고학년이 되더라도 키를 키우기보다 복장, 가방, 표정, 소품 밀도로 성장감을 준다.
- 고밀도 레퍼런스에서 직접 추출한 학생/몬스터는 `image-rendering:auto`로 렌더링해 브라우저 확대 과정에서 세부 정보가 다시 뭉개지지 않게 한다.
- 직업 초상화는 작은 전신보다 얼굴, 상체, 소품이 읽히는 bust 구도를 우선한다.
- 메인 전투 학생은 학년 단계가 색상과 복장으로 구분되어야 한다.
- 몬스터는 일반, 시험, 보스가 크기와 장식 밀도로 구분되어야 한다.
- 메인 전투 화면의 몬스터는 하단 텍스트 카드가 아니라 전투장 안 캐릭터 편대로 표시한다.
- 현재 메인 학년/N수 전투는 Battle Road 기준으로 3개월 조우 4회이며, 한 화면에는 일반 몬스터 2마리와 보스 1마리만 표시한다.
- 현재 수능 전투는 국어 1마리, 수학 1마리, 영어 1마리, 탐구 2마리의 4개 조우로 표시한다.
- 보스와 수능 몬스터만 캐릭터 위 HP바를 사용하고, 일반 몬스터는 텍스트/HP바 없이 실루엣으로 읽히게 한다.
- 관리용 카드나 상세 목록에 들어가는 작은 자산도 같은 메인 아틀라스에서 뽑아 사용해 전투장 캐릭터와 다른 톤으로 보이지 않아야 한다.
- 모바일 360px 화면에서 텍스트와 스프라이트가 서로 덮이면 실패로 본다.

## 학년군 자산 기준

- 기준 참조 보드: 학생/학년군 컨셉은 `assets/reference/age-grade-pixel-styleboard.png`, 현재 메인 학생전투 몬스터 최종 기준은 `assets/reference/character-ref-cute-sd.png`
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
- Battle Road 이동 중에는 학생과 학습 도우미가 오른쪽으로 달리는 것처럼 보이고, 몬스터 팩과 배경은 왼쪽으로 접근해야 한다.
- Battle Road 조우 타이밍, 카메라 앵커, 적 스폰/만남 위치는 `data/battle_road_config.json`에서 조정한다.
- Battle Road 학생 표시 배율, 발 기준선 위치, 공격 전진 거리, VFX 이동 거리는 `data/battle_road_config.json`의 `presentation` 섹션에서 조정한다.
- Battle Road 학습 도우미 표시 셀은 `presentation.studentDisplay.helperSizePx`로 관리한다. 실제 렌더링에서는 flex 축소를 막아 정사각형 셀을 유지해야 하며, `npm run visual:smoke`는 학습 도우미 3명 세이브로 최소 62x62px, 정사각 왜곡 4px 이하를 검사한다.
- Battle Road 몬스터 표시 크기는 `presentation.enemyDisplay`에서 일반/보스/수능/모바일 값을 따로 관리한다. 현재 모바일 일반 몬스터 기준은 78px이며, 실제 화면 smoke는 일반 몬스터 최소 70x70px, 보스/수능 최소 86x86px, 보이는 몬스터 arena 클리핑 0건을 검사한다.
- 학생은 제자리 사격보다 준비 자세, 짧은 돌진, 타격, 복귀가 읽히는 근접 루프를 우선한다.
- 학생 공격의 기본 전진량은 긴 원거리 돌진이 아니라 짧은 근접 타격으로 읽히도록 `presentation.studentAttack.dashPx`를 기준으로 관리한다.
- 학생은 `move_0~move_3` 실제 키 포즈를 순환해야 한다. 한 장을 흔들거나 늘려서 만든 4프레임은 이동 스프라이트로 인정하지 않는다.
- 학생과 학습 도우미는 돌진 타이밍이 아닐 때도 스프라이트 프레임, 보조 VFX, slot별 타이밍 차이로 살아 있어야 한다.
- 직업동료와 학습 도우미는 항상 `->` 방향을 보고, 원정대/학년 몬스터는 학생 또는 파티를 향해 `<-` 방향을 봐야 한다.
- 모든 몬스터는 slot별 타이밍 차이로 idle step/breath가 있어야 한다.
- 현재 타깃만 더 강한 피격 흔들림, shock ring, hit spark, dust burst를 갖고, 일반 몬스터에는 반복 텍스트나 HP바를 붙이지 않는다.
- 학습 도우미는 UI 장식이 아니라 학생 옆 동료 편대로 보이며, 활성화 상태에서는 지원 돌진과 보조 타격 이펙트를 가진다.
- 모바일 성능을 위해 가능한 모션은 `transform`, `opacity` 중심으로 만든다.
- 학생 프레임 애니메이션은 `background-position` 기반의 `studentMoveFrames`로 처리한다.

## 교과 공격 VFX 기준

- 학생탭 공격 VFX 토큰은 `data/curriculum_attack_vfx.json`에서 관리한다.
- 현재 렌더러는 `runtime.renderer=dom_text_layer`이며, 전투장에는 `.curriculum-attack-vfx-layer` 1개와 `.curriculum-attack-vfx-token` 1개만 표시한다.
- 공격 1회에는 현재 학년의 토큰 풀에서 1개만 랜덤 선택해 표시한다. 여러 글자나 단어를 한 번에 흩뿌리는 방식은 기본값이 아니다.
- 현재 공격 루프 기준은 별도 `attackSerial`이 생기기 전까지 `presentation.curriculumAttackVfx.cycleMs`와 `battle.elapsedMs`로 계산한다.
- 학년별 토큰 풀은 `gradeOrder` 기준으로 초1~고3, N수 단계까지 모두 있어야 한다.
- 토큰은 모바일 전투장에서 겹치지 않도록 짧게 유지한다. 현재 검증 기준은 8글자 이하이다.
- 수학과 탐구 계열 토큰은 한글 설명어보다 `1+1=2`, `f'(x)`, `H2O`, `F=ma`, `GDP`처럼 공식, 기호, 약어를 우선한다.
- 스타일은 `glyph`, `word`, `formula`, `card`, `burst`를 사용한다.
- 보스/시험 조우의 강조 스타일은 `bossStyleByVisualKey`에서 관리한다.
- 탐구 계열 subject alias는 `rules.inquirySubjectAliases`에서 관리한다. 사회/과학 탐구가 분리되어 있어도 탐구 VFX 풀을 함께 사용할 수 있어야 한다.
- 표시 크기, 지속 시간, 출발/도착 offset은 `data/battle_road_config.json`의 `presentation.curriculumAttackVfx`에서 한글 help와 함께 관리한다.
- 생성 CSS는 `tools/build-visual-assets.mjs`에서 만들며, `glyph`, `word`, `formula`, `card`, `burst` 각각의 keyframes와 `reduced-effects` 규칙을 포함해야 한다.
- 이 테이블은 런타임 fallback으로 숨기지 않고 `npm run curriculum-vfx:verify`에서 누락, 중복, 긴 토큰, 알 수 없는 style을 실패로 드러낸다.
- `npm run visual:smoke`는 피해 발생 이후 curriculum layer/token count가 각각 1인지, token text와 animation name이 존재하는지 검사한다.
- 사람이 학년별 방향을 검수할 때는 `docs/curriculum_attack_vfx_mapping.md`를 먼저 본다.

## 학생 이동 스프라이트 기준

- 학생 원본은 캐릭터 한 명당 `assets/visual-source/characters/student-XX-gender-move.png` 한 장으로 관리한다.
- 원본 시트는 `4 columns x 1 row`이며, 각 칸은 같은 캐릭터의 오른쪽 방향 `contact`, `passing`, `high step`, `push-off` 키 포즈여야 한다.
- 모든 프레임은 반드시 `->` 방향을 본다. 반대 방향 프레임은 mirror 보정이 아니라 재생성 대상으로 본다.
- 배경은 형광 초록 `#00FF00` 기반으로 만들고, 전처리에서 셀 가장자리 몇 픽셀을 버려 생성기가 만든 칸 경계선이 bbox에 섞이지 않게 한다.
- `tools/sync-character-animation-manifest.mjs`가 `student-XX-gender-move.png` 파일을 자동으로 `data/character_animation_manifest.json`에 연결한다.
- `tools/prepare-character-sprites.py`가 chroma key 제거, 160x160 정규화, `centerX=80`, `baselineY=151` 축 고정, 포즈 차이 검사를 수행한다.
- 전처리 마지막에는 활성 SD 스타일 프로필을 적용하고, 4프레임 전체에 공통 스케일을 적용해 한 프레임만 커지거나 작아지는 문제를 막는다.
- `poseDelta.minimum`은 `minFrameDifference` 이상이어야 한다. 너무 비슷한 4프레임은 `pose-too-similar`로 실패 처리한다.
- 축 리포트는 `artifacts/visual-asset-samples/character-axis-report.json`, 눈검수용 시트는 `artifacts/visual-asset-samples/student-XX-gender-axis-sheet.png`에 남긴다.
- 앱 아틀라스는 160px 셀, 64 columns x 2 rows로 구성한다. 남학생은 0행, 여학생은 1행을 사용해 모바일 텍스처 폭을 10240px로 제한한다.

## PNG 직업동료/몬스터 스프라이트 기준

- 직업동료, 학습도우미, 원정대 몬스터는 학생 캐릭터처럼 PNG 원본 시트와 정규화 프레임을 거쳐야 한다.
- 직업동료/학습도우미 원본은 `assets/visual-source/companions/<id>-move.png`에 저장한다.
- 원정대 몬스터 원본은 `assets/visual-source/expedition-enemies/<id>-move.png`에 저장한다.
- 원본 배경은 형광 초록이고, 전처리 결과는 완전 투명 PNG여야 한다.
- 직업동료/학습도우미 원본은 `4 columns x 2 rows` 구조다. 0행은 남성, 1행은 여성이다.
- 원정대 몬스터 원본은 `4 columns x 1 row` 구조다.
- 정규화된 프레임은 모두 160x160 셀, `centerX=80`, `baselineY=151` 기준을 따르며 상하 여백 8px 이상을 유지해야 한다.
- 직업동료/학습도우미 원본은 이미 SD 학생 베이스에 직업 오버레이를 얹어 만든다. 직업 오버레이는 얼굴을 덮지 않고 SD 몸통 위치 아래에만 얹는다.
- 직업동료/학습도우미는 한 쌍의 베이스만 반복하지 않는다. `tools/generate-professional-sprite-sources.py`가 직업 id, helper, 성별을 바탕으로 여러 SD 학생 베이스, 헤어 보조 실루엣, 악세서리, 의상, 손소품을 결정적으로 선택한다.
- 헤어 보조 실루엣은 얼굴 중앙을 덮으면 실패다. 눈, 코, 입은 원본 학생 베이스의 안정적인 표정을 살리고, 직업 차이는 모자/의상/소품/색상으로 읽히게 한다.
- 직업동료/학습도우미에 두 번째 강한 SD 변환을 적용하면 몸통과 다리가 과도하게 눌리므로, 기본 프로필은 `companions.enabled=false`를 유지한다.
- 직업동료/학습도우미는 `->` 방향, 원정대 몬스터는 `<-` 방향으로 그린다.
- `data/professional_sprite_manifest.json`은 id, 한글 이름, 직업 id, 보조 역할, 전투 소품, 방향, 성별 행을 담는 기준 테이블이다.
- `artifacts/visual-asset-samples/professional-axis-report.json`과 `professional-axis-review-page-*.png`를 보고 축/포즈/방향을 눈검수한다.
- `professional-zoom-review-page-*.png`는 원본 4프레임과 정규화 4프레임을 2배 확대해 보여준다. 직업동료/몬스터 수정 후에는 이 시트에서 상하 잘림, 누끼 잔여, 한 프레임만 커지는 문제를 확인해야 한다.
- 원정대 런타임에서는 `visual-companions.png`, `visual-enemies.png`의 실제 4프레임을 `background-position`으로 순환한다.
- 직업동료 성별은 `avatarGender`와 `unit-gender-male`/`unit-gender-female` 클래스로 선택한다. 한 해나 한 직업군 안에서 성별이 바뀌면 실패로 본다.
- `npm run asset:factory:review`는 학생 리포트와 전문 스프라이트 리포트를 모두 요약하고 리뷰 시트를 만든다.
- 직업 결과 초상 `visual-careers.png`는 별도 카드 도형을 그리지 않고, 준비된 `career-unit-*` PNG 프레임을 64px SD 초상으로 크롭해 사용한다.

## 원정대 배경 기준

- 원정대 배경은 CSS 격자나 절차형 저밀도 배경이 아니라 원화급 PNG 기반이어야 한다.
- 60초 전투감을 위해 원화급 소스를 긴 파노라마로 재조립하고, 배경 자체를 천천히 pan한다.
- 용량보다 첫 인상과 화면 체류감을 우선한다. 현재 원정대 파노라마는 `__STUDENT_ASSET_010__`으로 관리한다.
- 배경 위에는 필요한 HUD, 캐릭터, VFX만 얹고, 전투장 전체를 덮는 격자/타일 오버레이는 사용하지 않는다.

## 학생 전투 파노라마 기준

- 학생 전투 배경도 원정대와 같은 원화급 파노라마 이동 구조를 사용한다.
- 초등, 중등, 고등, N수 배경은 각각 별도 PNG로 저장하고 `__STUDENT_ASSET_011__`~`__STUDENT_ASSET_014__`에 매핑한다.
- 파일은 `visual-battle-road-backdrop-elementary.png`, `visual-battle-road-backdrop-middle.png`, `visual-battle-road-backdrop-high.png`, `visual-battle-road-backdrop-repeater.png`를 사용한다.
- 한 장짜리 초대형 data URL은 브라우저/미리보기에서 누락될 수 있으므로 행별 파일로 분리한다.
- 각 학생 전투 배경은 `원본 -> 반전 -> 원본 -> 반전` 4구간 루프로 생성한다. 루프 종료 지점이 시작 지점과 같은 원본 방향으로 돌아오므로 같은 학년/과정 안에서 배경이 확 바뀌지 않아야 한다.
- 학년군별 시작 오프셋은 `tools/build-visual-assets.mjs`의 `battleRoadBackdropRows`에서 관리한다. 시작 구간은 캐릭터가 책장이나 가구 위가 아니라 바닥 레인 위에 서 보이는 구간을 우선한다.
- 파노라마 화면 폭과 루프 이동량은 `data/battle_road_config.json`의 `presentation.backdrop.panWidthPercent`, `panLoopPercent`, `panDurationSec`에서 관리한다.
- `panWidthPercent`가 너무 크면 모바일 화면에서 배경 원본의 좁은 부분만 과확대되어 캐릭터와 배경이 따로 논다. 현재 기준은 720%이며, `visual:smoke`는 900% 초과를 실패로 본다.
- 캐릭터와 몬스터가 길 위에 서 보이도록 `presentation.backdrop.roadTopPercent`, `roadBottomPercent`, `roadOpacity`, `roadDetailPx`를 읽어 파노라마 PNG 하단에 학년군별 러닝 레인을 합성한다.
- `.stage-scene.scene-* .pixel-arena::before`가 학년군별 배경을 선택하고, `battleRoadBackdropPan` transform 애니메이션으로 왼쪽 이동감을 만든다.
- 기존 기본 CSS가 scene별 `::before` 장식 배경을 가지고 있으므로, 학생 배틀로드 scene별 규칙은 `background-size:100% 100%`, `background-repeat:no-repeat`, `background-position:center bottom`을 함께 고정해야 한다. 중등 배경처럼 작은 장식용 배경 크기 `36px 4px`로 덮이면 실패다.
- `road-travel`, `road-approach`, `road-combat` phase가 바뀌어도 배경 `animation-duration`을 다시 지정하지 않는다. phase 전환 때문에 배경 위치가 초기화되면 실패로 본다.
- 기존 `.arena-background-sheet`와 CSS 격자 배경은 숨기고, 전투장에는 PNG 파노라마, 캐릭터, 몬스터, VFX만 남긴다.

## 직업동료/원정대 몬스터 기준

- `visual-companions.png`는 직업동료 62개와 학습 도우미 13개를 함께 담고, 최소 160px 셀을 사용한다.
- 현재 아틀라스는 아이템당 4프레임을 연속으로 담고, 남/여 행을 모두 가진다.
- 직업동료는 `career-unit-{careerId}` 클래스로 매핑하고, `data/careers.json`의 `spriteAsset`도 같은 값을 사용한다.
- 직업동료 메타에는 한글 직업명, 지원 역할, 전투 소품, 티어를 남겨 컨택트시트에서 검수 가능해야 한다.
- 직업동료는 작은 아이콘처럼 보이면 실패다. 감사 기준은 `data/visual_asset_quality_gates.json`에서 `minBoundsWidth >= 110`, `minBoundsHeight >= 120`, `minDistinctColors >= 18` 이상으로 관리한다.
- 원정대 화면의 `.expedition-unit-avatar.large`는 정사각형 셀로 표시해야 한다. 현재 smoke 기준은 최소 58x58px, 정사각 왜곡 6px 이하, arena 클리핑 0건이다.
- 원정대 몬스터 `::before`도 정사각형 pseudo element로 표시하고, 오른쪽 경계에서 잘리지 않게 부모 중심보다 살짝 왼쪽으로 당긴다. smoke는 enemy sprite의 L/R/T/B 클리핑을 모두 0으로 검사한다.
- 학습 도우미의 기존 `helper-*` 클래스는 유지해 기존 학생 전투와 호환한다.
- `visual-enemies.png`는 원정대 tone별 일반 3종과 보스 1종을 담으며, 아이템당 4프레임을 가진다. 모든 원정대 몬스터 메타는 `direction: "left"`여야 한다.
- 원정대 몬스터는 귀엽고 피규어 같은 학습/생활 오브젝트형 SD 몬스터가 기준이다. 낮고 넓어도 괜찮지만 `solidHeight`가 작아져 실제 화면에서 아이콘처럼 보이면 실패다.
- 원정대 몬스터는 기존 레거시 도형/텍스트 조합을 쓰지 않는다. shelter/studio/neighborhood/company/office/asset/national/global/future/summit 각 지역은 일반 3종과 보스 1종을 서로 다른 몸통 오브젝트로 가진다.
- 지역별 핵심 motif는 shelter 월세/대기표/이력서/자립 게이트, studio 세탁/야간컵/타이머/보증금 금고, neighborhood 가격표/병원 예약/학원책/대출 폴더, company 출입증/인박스/모니터/오피스 빌딩, office 회의 보드/클립보드/발표대/회의록 더미, asset 코인/차트/금고/시장 금고, national 민원서류/도장/관공서/국가 과제탑, global 여권/무역상자/글로브/컨퍼런스, future 칩/데이터 큐브/바이오 플라스크/AI 코어, summit 산봉우리/기후 행성/협상 테이블/의사결정망이다.
- 원정대 몬스터는 눈동자, 손소품, 공격 방향이 모두 파티 쪽인 `<-`를 향해야 한다. 우향처럼 보이는 경우에는 최종 PNG를 단순 mirror하는 것보다 생성 레시피의 눈/소품 배치를 고쳐 다시 만든다.
- 원정대 몬스터 그래픽 위에는 이름, WAVE, 숫자 같은 텍스트 레이어를 표시하지 않는다. `.expedition-enemy-visual` 내부 레거시 텍스트는 CSS에서 숨기고, `npm run visual:smoke`의 `enemyTextVisibleCount` 0건으로 확인한다.
- 원정대 몬스터는 `data/sprite_style_profiles.json`의 `monsters.heightOnlyEqualize` 기준으로 4프레임 높이를 맞춘다. 한 프레임만 작아지거나 커지면 실패다.
- 원정대 몬스터는 노트, 폴더, 타이머, 모니터, 차트, 여권, 회로, 산봉우리 같은 motif를 몸통 자체에 통합한다. 외부 소품은 작게 보조하고, 긴 막대 팔다리나 큰 외부 prop 때문에 전체가 축소되면 실패다.
- 원정대 몬스터는 손발이 없어도 되지만 큰 눈, 볼 터치, 짧은 장갑/발판, 스티커/탭 디테일로 전투 가능한 캐릭터처럼 읽혀야 한다.
- 학생 전투 몬스터는 `assets/reference/character-ref-cute-sd.png` 우측 몬스터를 개별 crop/GrabCut cutout으로 분리한 뒤 `assets/visual-source/main-monsters/main-monsters-green.png` 형광 녹색 소스 시트로 재생성한다.
- 메인 학생전투 몬스터 crop은 한 몬스터씩만 잡는다. 줄 전체나 주변 오브젝트를 함께 crop하면 반쪽 소품, 배경 잔여, 몸통 내부 투명화가 생기므로 실패로 본다.
- `tools/generate-main-monster-sources.py`는 OpenCV GrabCut으로 흰 종이/스티커/OMR 몸통을 보존하고, 작은 분리 조각을 제거한 뒤 레퍼런스 방향을 유지한다. 이전 출력 대비 좌우대칭된 현재 기준이 학생 쪽(`<-`)을 향하는 방향이다.
- 최종 `asset-003.png`에는 형광 녹색 픽셀이 남으면 안 된다. `data/visual_asset_quality_gates.json`의 `mainMonsters.maxChromaKeyResidue`와 `visual:audit`가 이를 검사한다.
- 기본 모션은 전투장 transform/VFX가 담당하고, 외형 밀도는 레퍼런스 몬스터와 같은 컨택트시트 기준으로 검수한다.

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
