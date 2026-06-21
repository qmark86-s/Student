# 귀여운 SD 스프라이트 스타일 전환 계획

## 목표

`assets/reference/character-ref-cute-sd.png`처럼 학생, 학습도우미, 직업동료, 파티 유닛, 몬스터를 더 귀여운 SD 비율로 통일한다. 기존 고품질 PNG/4프레임 파이프라인은 유지하되, 고학년/직업군에서 팔다리가 길어지고 4등신처럼 보이는 문제를 줄인다.

## 기준 스타일

- 머리는 더 크고 둥글게 보인다.
- 몸통은 짧고 폭이 약간 넓다.
- 팔과 다리는 짧고 작은 손/발로 읽힌다.
- 전체 실루엣은 세로로 길쭉한 성인형이 아니라 장난감 피규어처럼 안정적이다.
- 학생은 나이가 들어도 SD 비율을 유지하고, 학년 차이는 복장/소품/색상으로 구분한다.
- 직업동료는 직업 소품과 복장으로 구분하되, 몸 비율은 학생과 같은 SD 라인에 둔다.
- 몬스터는 학습 도구 자체에 얼굴, 짧은 팔다리, 표정이 붙은 형태를 우선한다.

## 구현 방향

1. 스타일 프로필을 데이터로 만든다.
   - `data/sprite_style_profiles.json`
   - 기준 레퍼런스, 머리 확대, 몸 압축, 출력 여백, 품질 기준을 저장한다.

2. SD 변환 유틸을 만든다.
   - `tools/sprite_style_utils.py`
   - 기존 투명 PNG 프레임을 머리/몸 영역으로 나눠 재조합한다.
   - 발 기준선과 중심축은 기존 팩토리 기준을 유지한다.

3. 학생 전처리에 SD 변환을 넣는다.
   - `tools/prepare-character-sprites.py`
   - move sheet 원본은 그대로 두고, 정규화 단계에서 SD 비율을 적용한다.

4. 직업동료/학습도우미/파티 전처리에 같은 SD 변환을 넣는다.
   - `tools/generate-professional-sprite-sources.py`
   - `tools/prepare-professional-sprites.py`
   - 직업별 소품은 유지하되, 몸통/팔/다리 오버레이가 성인형으로 보이지 않게 줄인다.

5. 몬스터 생성 규칙을 SD 오브젝트 스타일로 보정한다.
   - 원정대 몬스터는 둥근 도구 몸통, 큰 눈, 짧은 팔/발 중심으로 수정한다.
   - 학생 전투 몬스터는 스타일 보드 PNG를 쓰되 화면 내 크기와 표정/배지를 SD 톤에 맞춘다.

6. 빌드와 검증을 모두 통과시킨다.
   - `npm run visual:build`
   - `npm run visual:verify`
   - `npm run asset:factory:review`
   - `npm run visual:sheet`
   - `npm run visual:smoke`
   - `npm run mobile:smoke`

## 완료 기준

- 컨택트시트에서 학생 고학년/N수도 머리 작고 팔다리 긴 성인형으로 보이지 않는다.
- 직업동료는 직업을 알아볼 수 있으면서 학생과 같은 SD 비율을 유지한다.
- 파티 유닛과 학습도우미가 서로 다른 저품질 아이콘처럼 보이지 않는다.
- 원정대 몬스터가 길쭉한 팔다리 몬스터가 아니라 레퍼런스 오른쪽의 학습 도구 몬스터처럼 보인다.
- 4프레임 포즈 변화, 중심축 1px 이하, 발 기준선 0px을 통과한다.
- 모바일 smoke에서 스프라이트와 UI가 겹치지 않고 horizontal overflow가 없다.

## 구현 결과

- `assets/reference/character-ref-cute-sd.png`를 repo 기준 SD 레퍼런스로 추가했다.
- `data/sprite_style_profiles.json`에 `cute-sd-reference` 프로필을 만들었다.
- `tools/sprite_style_utils.py`를 추가해 머리 확대, 몸통 압축, 4프레임 공통 스케일 보정을 수행한다.
- 학생 전처리와 직업동료/학습도우미 전처리가 같은 SD 변환을 사용한다.
- 원정대 몬스터 생성 규칙을 낮고 넓은 학습 도구형 SD 오브젝트로 수정했다.
- `visual-careers.png`는 기존 카드형 도형 대신 준비된 직업동료 PNG 프레임을 크롭한 SD 초상으로 교체했다.
- `data/visual_asset_quality_gates.json`의 커리어 초상 기준을 카드형에서 투명 SD 초상형으로 변경했다.

## 검증 결과

- `npm run visual:build`
- `npm run visual:verify`
- `npm run asset:factory:review`
- `npm run visual:sheet`
- `npm run visual:smoke`
- `npm run career:smoke`
- `npm run verify:mobile`
