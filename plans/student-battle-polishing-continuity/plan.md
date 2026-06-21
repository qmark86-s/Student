# 학생탭 배경/전투/스프라이트 폴리싱 계획

## 목표

학생탭 전투 화면이 같은 학년과 같은 과정 안에서 자연스럽게 이어지도록 배경 파노라마, 캐릭터 기준선, 공격 거리, 스프라이트 스케일 검증을 상용 기준으로 정리한다.

## 현재 분석

- 배틀로드 배경은 `asset-004.png`의 학년별 원화 행을 `visual-battle-road-backdrop-*.png`로 변환해 사용한다.
- 현재 파노라마는 3구간 `원본 -> 반전 -> 오프셋 원본` 구조라 구간 경계에서 교실 구조가 확 바뀔 수 있다.
- `.pixel-arena.road-*::before`에서 phase마다 `animation-duration`을 바꿔 같은 학년 안에서도 CSS 애니메이션이 리셋될 여지가 있다.
- 학생 공격 전진량은 `studentCombatLoop`, `studentDashDust`, `studentMeleeSlash` 키프레임에 픽셀 값으로 하드코딩되어 있다.
- 학생 스프라이트 전수검사 리포트 기준으로 `student-16-male`은 solid height drift 10px, `student-16-female`은 8px이라 기존 10px 기준은 통과하지만 사용자가 요청한 `기준 크기 +-5%` 상용 기준에는 느슨하다.

## 사용 도구

- `Asset Sprite Factory` 스킬
- `npm run asset:factory:prepare`
- `npm run asset:factory:review`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run verify:mobile`
- MCP/외부 엔진 도구는 사용하지 않는다. 현재 검색 가능한 UMG 계열 도구는 프로젝트 방향과 맞지 않아 제외한다.

## 구현 계획

1. 배틀로드 배경 생성
   - `buildBattleRoadBackdropAtlas()`를 4구간 루프 구조로 변경한다.
   - `원본 -> 반전 -> 원본 -> 반전` 순서로 만들어 루프 종료 지점이 시작 지점과 같은 구조가 되게 한다.
   - CSS 파노라마 폭을 원본 비율에 가깝게 늘려 교실 원화가 눌려 보이지 않게 한다.
   - road phase별 animation-duration override를 제거해 phase 전환 시 배경 위치가 튀지 않게 한다.

2. 배경/캐릭터 기준선
   - 학생, 학습 도우미, 몬스터가 바닥 레인에 더 안정적으로 서 보이도록 런타임 위치를 조정한다.
   - 학생 캐릭터 표시 스케일은 기존 대비 약 0.8배를 기본값으로 둔다.

3. 공격 거리 데이터화
   - `data/battle_road_config.json`에 `presentation.studentAttack`을 추가한다.
   - 전진 거리, 먼지, 베기 이펙트 이동량을 config 값으로 생성 CSS에 주입한다.
   - 기본값은 현재 체감 거리의 약 1/3 수준으로 설정한다.

4. 스프라이트 전수검사 강화
   - `data/sprite_reference_lock.json`의 학생 `maxSolidHeightDrift`를 6px로 강화한다.
   - `summarize-character-report`, `verify-visual-assets`, `audit-sprite-integrity`가 같은 기준을 보도록 정리한다.
   - 빌드 후 실패하는 학생 스프라이트는 원본을 임시로 숨기지 않고 정규화 파이프라인에서 기준 크기를 맞춘다.

5. 검증
   - `npm run battle-road:verify`
   - `npm run asset:factory:prepare`
   - `npm run visual:verify`
   - `npm run visual:smoke`
   - `npm run verify:mobile`
   - smoke screenshot에서 학생탭 배경과 캐릭터 위치를 직접 확인한다.

## 완료 기준

- 같은 학년/과정 안에서 배경이 phase 전환 때문에 즉시 끊기거나 확 바뀌지 않는다.
- 배경 원화가 과도하게 눌리거나 바닥과 벽의 경계가 모호하게 보이지 않는다.
- 학생 공격 전진량은 `data/battle_road_config.json`에서 조정 가능하다.
- 학생 스프라이트 32종 모두 4프레임 solid height drift가 6px 이하이다.
- 학생 스프라이트 중심축 편차는 1px 이하, 발 기준선 편차는 0px이다.
- 검증 명령이 통과하고 미리보기에서 확인 가능한 상태다.
