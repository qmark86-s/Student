# Asset Sprite Factory 사용 설명서

## 목적

학생, RPG 캐릭터, 동료, 몬스터처럼 반복 생산해야 하는 스프라이트를 같은 방식으로 만들기 위한 repo-local 자산 생산 라인이다. AI 이미지는 원본 후보를 만드는 데만 쓰고, 프로젝트에 들어온 PNG 이후의 누끼, 축 정렬, 발 기준선, 아틀라스 패킹, CSS 연결, 검증은 결정적 스크립트로 처리한다.

## 핵심 원칙

- 원본 생성은 비결정적이지만, 원본 PNG가 repo에 들어온 뒤의 파이프라인은 멱등적이어야 한다.
- 캐릭터 한 명은 한 장의 `4 columns x 1 row` 이동 시트로 관리한다.
- 모든 이동 프레임은 `->` 방향이어야 한다.
- 배경은 형광 초록 `#00FF00` 계열로 두고, 전처리에서 chroma key와 반투명 가이드를 제거한다.
- 크롭으로 여러 캐릭터를 억지로 잘라 쓰지 않는다. 한 캐릭터씩 만들고 검증한다.
- 적용 전에는 반드시 수치 검증과 리뷰 시트를 모두 본다.

## 주요 파일

- 캐릭터 manifest: `data/character_animation_manifest.json`
- 직업동료/몬스터 manifest: `data/professional_sprite_manifest.json`
- 스프라이트 스타일 프로필: `data/sprite_style_profiles.json`
- 스프라이트 레퍼런스락: `data/sprite_reference_lock.json`
- SD 기준 레퍼런스: `assets/reference/character-ref-cute-sd.png`
- 원본 자산: `assets/visual-source/characters/`
- 직업동료/학습도우미 원본 자산: `assets/visual-source/companions/`
- 원정대 몬스터 원본 자산: `assets/visual-source/expedition-enemies/`
- 전처리: `tools/prepare-character-sprites.py`
- 직업동료/몬스터 원본 생성: `tools/generate-professional-sprite-sources.py`
- 직업동료/몬스터 전처리: `tools/prepare-professional-sprites.py`
- SD 스타일 변환 유틸: `tools/sprite_style_utils.py`
- manifest 동기화: `tools/sync-character-animation-manifest.mjs`
- 아틀라스 패킹: `tools/build-visual-assets.mjs`
- 품질 검증: `tools/verify-visual-assets.mjs`
- 팩토리 실행기: `tools/asset-factory/run.mjs`
- 리뷰 시트 생성: `tools/asset-factory/make-character-review-sheet.py`
- 리포트 요약: `tools/asset-factory/summarize-character-report.mjs`
- 레퍼런스락 검사: `tools/asset-factory/check-reference-lock.mjs`
- 직업동료/몬스터 리포트 요약: `tools/asset-factory/summarize-professional-report.mjs`
- Codex Skill 원본: `codex/skills/asset-sprite-factory/SKILL.md`

## 명령

```powershell
npm run asset:factory:prepare
npm run asset:factory:review
npm run asset:factory:qa
npm run asset:factory:install-skill
```

- `asset:factory:prepare`: 비주얼 자산을 재생성하고 학생/직업동료/몬스터 축 리포트와 리뷰 시트를 만든다.
- `asset:factory:review`: 이미 생성된 학생/직업동료/몬스터 리포트를 요약하고 리뷰 시트를 다시 만든다.
- `asset:factory:qa`: 웹 빌드, manifest 검증, 컨택트시트, 학생/직업동료/몬스터 리뷰, 브라우저 스모크를 모두 실행한다.
- `asset:factory:install-skill`: repo의 Skill 원본을 현재 사용자의 `~/.codex/skills/asset-sprite-factory`로 설치한다.

## 산출물

- 정규화된 프레임: `src/snapshot/assets/individual/students/<id>/move_0.png` ~ `move_3.png`
- 정규화된 직업동료/학습도우미 프레임: `src/snapshot/assets/individual/companions/<id>/<gender>/move_0.png` ~ `move_3.png`
- 정규화된 원정대 몬스터 프레임: `src/snapshot/assets/individual/expedition-enemies/<id>/move_0.png` ~ `move_3.png`
- 정규화 기준: 160x160 셀, `centerX=80`, `baselineY=151`, 상하 여백 8px 이상
- 축 리포트: `artifacts/visual-asset-samples/character-axis-report.json`
- 직업동료/몬스터 축 리포트: `artifacts/visual-asset-samples/professional-axis-report.json`
- 캐릭터 리뷰 시트: `artifacts/visual-asset-samples/character-axis-review-page-01.png`
- 직업동료/몬스터 리뷰 시트: `artifacts/visual-asset-samples/professional-axis-review-page-01.png`
- 직업동료/몬스터 원본-정규화 확대 비교 시트: `artifacts/visual-asset-samples/professional-zoom-review-page-01.png`
- 전체 자산 컨택트시트: `artifacts/visual-asset-contact-sheet/index.html`
- 전체 자산 컨택트시트 PNG: 기본은 `artifacts/visual-asset-contact-sheet/contact-sheet.png`이며, 페이지가 너무 길면 `contact-sheet-page-01.png`처럼 분할 저장된다.
- 실제 화면 스모크샷: `artifacts/visual-asset-smoke/`

`artifacts/`는 git에 커밋하지 않는 검수 산출물이다.

## 품질 게이트

- 캐릭터 manifest와 리포트의 캐릭터 수가 일치해야 한다.
- 모든 캐릭터는 오른쪽 방향이어야 한다.
- `poseDelta.minimum`은 `minFrameDifference` 이상이어야 한다.
- 중심축 편차는 1px 이하를 목표로 한다.
- 발 기준선 편차는 0px이어야 한다.
- 실제 몸통 기준 `solidHeight` 흔들림은 레퍼런스락 기준 이하이어야 한다. 현재 학생 보행 프레임 허용값은 6px이다.
- 전신 기준은 `data/sprite_reference_lock.json`에서 관리하며, `asset:factory:review`와 `visual:verify`가 같은 값을 읽는다.
- 작은 투명 가이드나 반투명 선이 bbox에 들어가면 실패로 보고 전처리를 보정한다.
- 머리와 발이 잘려 보이지 않도록 모든 정규화 프레임은 상단/하단 alpha 여백 8px 이상을 유지한다.
- 직업동료/학습도우미는 남/여 행을 모두 가져야 하며, 런타임에서는 `unit-gender-male`/`unit-gender-female` 클래스로 프레임 행을 선택한다.
- 직업동료/학습도우미는 `direction: "right"`, 원정대 몬스터는 `direction: "left"`여야 한다.
- 직업동료/몬스터 리포트의 모든 항목은 4프레임 포즈 차이, 중심축 1px 이하, 발 기준선 0px을 통과해야 한다.
- 직업동료/몬스터는 상단/하단 alpha 여백 8px 이상, 프레임별 solid height drift 12px 이하, 원정대 몬스터 solid height drift 10px 이하를 통과해야 한다.
- 직업동료/몬스터를 수정한 뒤에는 `professional-axis-review-page-*.png`와 `professional-zoom-review-page-*.png`를 모두 확인한다. zoom review는 원본 4프레임과 정규화 4프레임을 2배 확대해 잘림, 누끼, 커졌다 작아짐을 검사하기 위한 산출물이다.
- 현재 활성 스타일은 `cute-sd-reference`다. 머리 확대, 상체/하체 압축, 공통 스케일 보정값은 `data/sprite_style_profiles.json`에서 조정한다.
- SD 스타일에서는 캐릭터 키를 무조건 키우는 것보다 프레임 간 키 흔들림, 머리 비중, 폭, 소품 가독성을 우선한다.
- 학생 캐릭터는 머리/상체/하체 3분할 변환을 사용한다. `lowerScaleX`, `lowerScaleY`, `lowerOverlap`은 달리는 포즈의 팔다리가 길어 보이지 않게 줄이는 핵심 값이다.
- 포즈가 낮게 누워 반쯤 잘려 보이면 `uprightRotateDegrees`, `heightOnlyEqualize`, `heightOnlyTarget`으로 먼저 전신 실루엣을 고정한 뒤 런타임 표시 위치를 조정한다.
- 직업동료/학습도우미 원본은 여러 SD 학생 베이스 중 하나를 직업 id와 성별로 결정적으로 선택하고, 그 위에 직업 오버레이를 얹어 생성한다. 따라서 기본 설정에서는 `companions.enabled=false`로 두어 두 번째 강한 SD 변환을 적용하지 않는다.
- 직업동료 헤어/얼굴 다양화는 얼굴 중앙을 덮지 않는 범위에서만 한다. 직업 가독성은 모자, 의상 실루엣, 손소품, 색상, 배지로 확보한다.
- 얼굴 근처 원형 아티팩트 방지를 위해 `data/professional_sprite_manifest.json`의 `appearanceProfiles`는 `round-glasses`, `earpiece`, `small-ribbon`, `star-pin`, 여자 `bun`, `twin-tail`, `pony`를 사용하지 않는다. `npm run asset:integrity`는 이 face-safe 규칙을 위반하면 실패해야 한다.
- 원정대 몬스터는 레퍼런스처럼 귀엽고 피규어 같은 학습/생활 오브젝트형 SD 몬스터가 기준이다. 손발은 짧은 장갑/발판 정도로만 사용하고, 긴 막대 팔다리나 넓은 외부 소품 때문에 몸통이 축소되면 실패로 본다.
- 학생 전투 화면의 학습 도우미 표시 크기는 `data/battle_road_config.json`의 `presentation.studentDisplay.helperSizePx`에서 관리한다. 생성 CSS는 `width/height`뿐 아니라 `flex-basis`, `min-width`, `aspect-ratio`를 함께 고정해 실제 전투장 flex 배치에서 찌그러지지 않아야 한다.
- 학생 전투 화면의 일반/보스/수능 몬스터 표시 크기는 `presentation.enemyDisplay`에서 관리한다. `npm run visual:smoke`는 학습 도우미 3명 테스트 세이브로 실제 도우미 최소 62x62px, 일반 몬스터 최소 70x70px, 보스/수능 최소 86x86px, 클리핑 0건을 검사한다.
- 학생 전투 배경은 `presentation.backdrop.panWidthPercent`로 화면 줌을 관리한다. 현재 기준은 720%이며 900%를 넘기면 모바일 화면에서 배경이 과확대되어 캐릭터와 분리되어 보이므로 `visual:smoke`가 실패해야 한다.
- 학생 전투 배경의 길/접지감은 `presentation.backdrop.roadTopPercent`, `roadBottomPercent`, `roadOpacity`, `roadDetailPx`로 관리하는 러닝 레인 합성 기준을 따른다. 배경 PNG를 바꾼 뒤에는 `artifacts/student-battle-road-background-depth-polish/scene-*.png` 같은 실제 arena crop으로 4개 학년군을 모두 본다.
- 학생 배틀로드 scene별 `::before`는 기본 CSS 장식 배경과 충돌할 수 있으므로 `background-size:100% 100%`, `background-repeat:no-repeat`, `background-position:center bottom`을 scene별 규칙에서 고정한다. 이 값이 깨지면 중등 배경처럼 단색 판으로 보일 수 있다.

## 다른 Agent 사용법

1. 먼저 `AGENTS.md`와 이 문서를 읽는다.
2. Skill이 설치되어 있지 않으면 `npm run asset:factory:install-skill`을 실행한다.
3. 학생 자산은 `assets/visual-source/characters/`에 한 캐릭터씩 추가한다.
4. 직업동료/학습도우미는 `assets/visual-source/companions/`, 원정대 몬스터는 `assets/visual-source/expedition-enemies/`에 4프레임 PNG 시트로 추가한다.
5. `npm run asset:factory:prepare`로 정규화와 리뷰 시트를 만든다.
6. 리뷰 시트에서 방향, 포즈 변화, 중심축, 발 기준선을 확인한다.
7. `npm run visual:sheet`의 PNG 컨택트시트에서 직업동료, 도우미, 몬스터, 배경 토큰을 같이 확인한다.
8. `npm run asset:factory:qa`를 통과시킨 뒤 앱 화면에서 본다.

## RPG 캐릭터로 확장할 때

`tools/asset-factory/recipes/character-set.template.json`을 참고한다. 현재 학생은 `data/character_animation_manifest.json`과 `mainStudents` 아틀라스에 연결되어 있지만, 같은 구조로 `rpgHeroes`, `companions`, `monsters` 같은 atlas family를 추가할 수 있다. 단, 새 family를 만들 때도 먼저 manifest, 전처리, 검증, 리뷰 시트를 고정하고 그 다음 런타임 CSS를 연결한다.

직업동료처럼 데이터 기반 변형이 많은 캐릭터군은 `data/professional_sprite_manifest.json`에 `name`, `supportRole`, `battleProp`, `direction`, `genders` 메타를 함께 남기고, `tools/build-visual-assets.mjs`에서 같은 값을 아틀라스 메타로 내보낸다. 이렇게 해야 다른 Agent가 컨택트시트와 `data/visual_assets.json`만 보고도 방향성과 역할 개성이 맞는지 재검수할 수 있다.

새 family가 실제 화면에서 작게 표시되는 경우에는 원본 셀 크기뿐 아니라 런타임 표시 크기도 품질 기준에 포함한다. 현재 직업동료/학습도우미는 160px 셀과 `data/visual_asset_quality_gates.json`의 bounds/color 하한을 통과해야 하며, 원정대 실제 크기 probe는 `artifacts/visual-asset-smoke/expedition-companion-probe.png`에서 확인한다.

## SD 스타일 조정법

레퍼런스와 같은 더 귀여운 비율이 필요하면 원본 PNG를 직접 망가뜨리지 말고 `data/sprite_style_profiles.json`의 활성 프로필을 조정한다.

레퍼런스 이미지를 먼저 고정하고 `data/sprite_reference_lock.json`의 수치 기준을 맞춘 뒤 작업한다. 이 기준을 통과하지 못하면 리뷰 시트가 만들어지더라도 출시 검증에서 실패하도록 유지한다.

- `headScaleX`, `headScaleY`: 학생 머리 비율
- `bodyScaleX`, `bodyScaleY`: 상체 압축감
- `lowerScaleX`, `lowerScaleY`: 다리와 하체 가로/세로 압축감
- `lowerStartRatio`, `lowerOverlap`: 상체와 하체가 나뉘고 겹치는 위치
- `overlap`: 머리와 몸통이 겹치는 정도
- `uprightRotateDegrees`: 낮게 누운 이동 포즈를 레퍼런스식 보행 실루엣으로 세우는 각도
- `heightOnlyEqualize`, `heightOnlyTarget`: 포즈 프레임별 키 흔들림을 최종 알파 기준으로 보정하는 설정
- `maxUpscale`: 4프레임 공통 스케일 보정 상한
- `maxOutputWidth`, `maxOutputHeight`: 축 정렬 이후 셀 안에서 허용하는 최대 크기

학생은 `tools/sprite_style_utils.py`의 3분할 변환을 타고, 직업동료/학습도우미는 SD 학생 베이스에서 생성한 뒤 축 정렬을 통과한다. 원정대 몬스터는 `tools/generate-professional-sprite-sources.py`에서 몸통/팔다리 자체를 SD 오브젝트형으로 생성한다. 스타일 값을 바꾼 뒤에는 `npm run asset:factory:review`로 프레임 키 흔들림을 먼저 보고, `npm run verify:mobile`로 실제 화면까지 확인한다.
