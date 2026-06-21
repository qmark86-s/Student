# PNG 스프라이트 패밀리 고도화 계획

## 목표

학생 캐릭터 제작 방식처럼 원본 PNG 이동 시트를 기준으로 직업동료, 학습도우미, 몬스터를 다시 만든다. 최종 목표는 작은 CSS 아이콘이 아니라 직업과 몬스터 개성이 읽히는 4프레임 스프라이트 자산을 런타임에 적용하는 것이다.

## 문제 정의

- 기존 직업동료/학습도우미는 `visual-companions.png`의 단일 프레임 전신 이미지라 학생 캐릭터처럼 팔/다리 포즈가 바뀌지 않는다.
- 화면 표시 크기를 키워도 원본 자체가 아이콘처럼 단순하면 직업을 알아보기 어렵다.
- 기존 원정대 몬스터도 단일 프레임에 가까워 실제 피격/이동 스프라이트라기보다 흔들리는 그림처럼 보인다.
- 직업동료는 과거 피드백대로 성별 일관성이 필요하므로 남/여 행을 분리해야 한다.

## 구현 방향

1. 학생처럼 160px 셀, 4 columns x 1 row 이동 시트를 원본 기준으로 사용한다.
2. `assets/visual-source/companions/`에 직업동료와 학습도우미 원본 PNG 시트를 생성한다.
3. `assets/visual-source/expedition-enemies/`에 원정대 일반/보스 몬스터 원본 PNG 시트를 생성한다.
4. 원본은 형광 초록 매트 배경을 사용하고, 정규화 스크립트가 투명화/축 정렬/포즈 차이를 검증한다.
5. 직업동료 아틀라스는 64컬럼 다중 행으로 패킹해 모바일 텍스처 폭을 10240px 이하로 유지한다.
6. 직업동료 아틀라스는 남/여 2세트를 포함하고 런타임에서 `avatarGender`에 맞는 행/프레임을 사용한다.
7. 원정대 몬스터 아틀라스는 4프레임 연속 배치로 패킹하고, idle/hurt keyframes가 실제 background-position을 바꾸도록 한다.
8. 컨택트시트, visual verify, smoke, mobile smoke를 통과시킨다.

## 품질 기준

- 직업동료는 학생 캐릭터의 절반 이하로 단순해 보이면 실패다.
- 직업 실루엣은 텍스트 없이도 복장, 모자, 손 소품, 큰 도구로 읽혀야 한다.
- 남/여 직업동료는 같은 직업의 색상/소품/방향을 공유하되 체형과 헤어만 안정적으로 달라야 한다.
- 모든 직업동료와 학습도우미는 `->` 방향이다.
- 모든 원정대 몬스터는 `<-` 방향이다.
- 4프레임은 서로 다른 포즈여야 하며, 한 장을 흔드는 수준이면 실패다.
- 축 중심 드리프트는 1px 수준, 베이스라인 드리프트는 0px을 목표로 한다.
- 브라우저/모바일 화면에서 스프라이트가 작아 직업을 알아볼 수 없으면 실패다.

## 검증 명령

```powershell
npm run visual:build
npm run visual:verify
npm run visual:sheet
npm run visual:smoke
npm run mobile:smoke
```

최종 확인은 다음 산출물로 한다.

- `artifacts/visual-asset-contact-sheet/contact-sheet.png`
- `artifacts/visual-asset-samples/professional-axis-report.json`
- `artifacts/visual-asset-smoke/expedition-companion-probe.png`
- `artifacts/visual-asset-smoke/expedition.png`
- `artifacts/mobile-smoke/phone-small.png`

## 구현 결과

- `tools/generate-professional-sprite-sources.py`가 직업동료/학습도우미 75종과 원정대 몬스터 40종의 PNG 원본 시트를 생성한다.
- `tools/prepare-professional-sprites.py`가 형광 초록 배경 제거, 160px 정규화, 중심축/발 기준선/포즈 차이 검증을 수행한다.
- `visual-companions.png`와 `visual-enemies.png`는 아이템당 4프레임을 담는 PNG 스프라이트 아틀라스로 교체했다.
- 직업동료/학습도우미는 남/여 행을 모두 가지고, 런타임에서 `avatarGender`에 맞는 행을 선택한다.
- 원정대 몬스터는 `<-` 방향 4프레임을 사용하고 idle/hurt 애니메이션에서 실제 프레임을 순환한다.
- 학생 전투 몬스터는 스타일 보드 기반 PNG 컷으로 품질을 끌어올리고 기존 전투 모션/VFX에 연결했다.
- `asset:factory:review`와 `asset:factory:qa`가 학생 축 리포트와 직업동료/몬스터 축 리포트를 함께 검사한다.
