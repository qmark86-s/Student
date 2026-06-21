# 학생/원정대 파노라마와 스프라이트 품질 업그레이드 계획

## 목표

학생 전투 화면을 원정대 화면처럼 긴 파노라마 배경이 흐르는 구조로 바꾸고, 원정대 직업동료/학습도우미/몬스터를 현재 Student repo의 Asset Sprite Factory 방식으로 다시 만든다.

핵심 방향은 다음과 같다.

- 학생 전투 배경은 기존 한 장을 흔드는 방식이 아니라 학년대별 긴 배경 레일을 `::before`로 흘린다.
- 직업동료와 학습도우미는 오른쪽을 보는 캐릭터로 보이게 한다.
- 원정대 몬스터는 왼쪽을 보는 적으로 보이게 한다.
- 아트 품질은 단발성 수작업이 아니라 `tools/build-visual-assets.mjs`에서 멱등 생성한다.
- 검증은 manifest, metadata, CSS token, Playwright smoke, contact sheet로 확인한다.

## 현재 구조 분석

- 원정대는 `visual-expedition-backdrops.png`를 3구간 파노라마로 만든 뒤 `.expedition-arena::before`에서 60초 동안 왼쪽으로 이동시킨다.
- 학생 전투는 `asset-004.png`를 `<img class="arena-background-sheet">`로 깔고 `arenaTreadmill`로 24px 정도만 움직인다.
- 원정대 동료와 학습도우미는 `visual-companions.png` 13개 helper 아틀라스를 공유한다.
- 직업별 개성은 데이터에 있지만, 원정대 전투 유닛은 `helperSprite` 단위라 직업별 차이가 부족하다.
- 원정대 몬스터는 `visual-enemies.png`의 간단한 도형 기반 아틀라스이며, 좌향성이 명확하지 않다.

## 구현 방향

1. 학생 전투용 긴 배경
   - `asset-004.png`의 초등/중등/고등/N수 4개 원화 행을 잘라낸다.
   - 각 행을 3구간 파노라마로 재조립한다.
   - 결과는 행별 `visual-battle-road-backdrop-*.png` 4개로 저장하고 `__STUDENT_ASSET_011__`~`__STUDENT_ASSET_014__`에 등록한다.
   - 단일 초대형 data URL은 미리보기/브라우저에서 누락될 수 있으므로 사용하지 않는다.
   - `.pixel-arena::before`가 scene class별 배경을 사용하고, `battleRoadBackdropPan` transform 애니메이션으로 이동시킨다.

2. 직업동료/학습도우미 아틀라스 확장
   - `visual-companions.png`를 직업 62종 + helper 13종 구조로 확장한다.
   - 동료 셀은 최소 160px로 만들고, 작은 아이콘처럼 보이는 128px 저밀도 도형으로 후퇴하지 않는다.
   - 직업동료 CSS는 `.career-unit-{careerId}`로 매핑한다.
   - 기존 학습도우미 CSS는 `.helper-book` 같은 클래스가 계속 동작하게 유지한다.
   - 모든 동료/도우미는 오른쪽을 보는 포즈와 오른쪽 손/소품 중심으로 그린다.
   - 의료/법조/기술/금융/교육/항공/제복/셰프/미디어 직업군은 복장, 모자, 손 소품으로 구분한다.

3. 원정대 몬스터 재제작
   - 챕터 tone별로 과정/테마를 반영한 적을 만든다.
   - 일반 몬스터 3종과 보스 1종 구조는 유지한다.
   - 얼굴, 팔, 소품의 방향을 왼쪽으로 잡아 몬스터가 파티 쪽으로 오는 느낌을 준다.

4. 런타임 연결
   - `tools/apply-visual-asset-patch.mjs`에서 원정대 유닛 class가 직업별 `.career-unit-*`을 반환하도록 패치한다.
   - 기존 helper 기반 fallback은 유지한다.
   - reduced-effects, smoke, verify가 새 배경과 새 아틀라스를 기준으로 확인하도록 갱신한다.

## 검증 계획

- `npm run visual:build`
- `npm run visual:verify`
- `npm run build:web`
- `npm run visual:smoke`
- `npm run visual:sheet`
- `npm run mobile:smoke`

추가 확인 기준:

- manifest에 `__STUDENT_ASSET_011__`~`__STUDENT_ASSET_014__`가 있고 CSS에서 참조한다.
- `data/visual_assets.json`에 `battleRoadBackdrops` metadata가 있다.
- 학생 전투 `.pixel-arena::before`가 data image 배경과 `battleRoadBackdropPan` 모션을 가진다.
- 기존 `.arena-background-sheet`는 숨겨지고 낮은 품질의 CSS 격자는 보이지 않는다.
- 원정대 probe 유닛이 `.career-unit-doctor`로 실제 아틀라스 이미지를 받는다.
- companion atlas item 수는 `careers.length + 13`이다.
- companion atlas cell은 160px 이상이다.
- companion audit 기준은 bounds 110x120, distinct colors 18 이상이다.
- companion atlas의 직업동료/학습도우미는 모두 `direction: "right"`이다.
- expedition enemy atlas는 모두 `direction: "left"`이다.
- expedition enemy atlas는 기존 stage/boss data와 호환된다.
- `visual:smoke` 산출물에 `expedition-companion-probe.png`가 있어 원정대 실제 크기의 동료 품질을 눈검수할 수 있다.

## 구현 결과

- 학생 전투 배경은 초등/중등/고등/N수 4개 파노라마 PNG로 분리했다.
- `visual-companions.png`는 직업동료 62개와 학습도우미 13개, 총 75개를 12000x160 아틀라스로 담는다.
- `data/careers.json`의 모든 직업은 `spriteAsset: career-unit-{id}`를 가진다.
- 원정대 동료 표시 크기는 약 42x62px로 올려 전투장 안에서도 직업 소품이 읽히게 했다.
- 원정대 런타임 유닛 클래스는 helper fallback을 유지하면서 직업별 `career-unit-*`를 우선 사용한다.
- 컨택트시트 도구는 HTML과 PNG 스크린샷을 함께 생성한다.

## 완료 기준

- 학생 전투의 배경 이동감이 원정대와 같은 계열로 보인다.
- 원정대 직업동료/학습도우미가 더 이상 저품질 도형처럼 보이지 않고 역할과 소품이 읽힌다.
- 원정대 몬스터가 챕터별 과정과 어울리며 파티를 향해 왼쪽을 보고 있다.
- 생성기 재실행 후에도 같은 결과가 나오고 검증이 통과한다.
