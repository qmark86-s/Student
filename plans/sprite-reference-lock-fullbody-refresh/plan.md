# Sprite Reference Lock Fullbody Refresh

## Goal

캐릭터가 반쯤 잘려 보이지 않도록 레퍼런스를 먼저 고정하고, 그 기준을 통과한 전신 SD 스프라이트만 게임 화면에 적용한다.

## Reference Lock

- 기준 이미지: `assets/reference/character-ref-cute-sd.png`
- 스타일 목표: 어른 직업/고등학생까지 3등신 SD 느낌 유지
- 필수 실루엣: 머리, 몸통, 짧은 다리, 발이 모두 보여야 함
- 방향: 학생/동료/직업은 오른쪽, 몬스터는 왼쪽

## Steps

1. `data/sprite_reference_lock.json`에 전신 SD 품질 기준을 고정한다.
2. 학생 스프라이트 생성 프로필을 전신이 유지되는 비율로 조정한다.
3. 전투 화면의 학생 표시 셀 크기를 키워 하체가 작게 눌려 보이지 않게 한다.
4. Asset Sprite Factory 리뷰 흐름에 reference lock 검사를 추가한다.
5. `visual:build`, `asset:factory:review`, `visual:smoke`, `verify:mobile`로 산출물을 확인한다.

## Acceptance

- 모든 학생 프레임의 `solidHeight`가 118px 이상이어야 한다.
- 4프레임 간 높이 편차는 보행 중 한 발이 들리는 프레임을 감안해 10px 이하여야 한다.
- 중심축과 기준선은 기존과 동일하게 고정되어야 한다.
- 메인 전투 화면에서 학생 캐릭터의 다리와 발이 읽혀야 한다.
