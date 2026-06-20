# 전투장 모션 개선 Plan

## 목표

메인 전투장을 일반 방치형 RPG처럼 계속 살아 움직이는 화면으로 만든다. 화면 하단 카드와 원거리 투사체 중심 인상을 줄이고, 학생이 앞으로 치고 들어가 적을 근접 타격하는 느낌을 우선한다.

## 참고한 기준

- 고성능 웹 애니메이션은 `transform`, `opacity` 중심으로 구성한다.
  - https://web.dev/articles/animations-guide
  - https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- 픽셀 전투 캐릭터는 작은 idle 변화만으로도 생동감이 크게 올라간다.
  - https://www.slynyrd.com/blog/2024/9/26/pixelblog-52-idle-fighting-stance
- RPG식 side-view 전투는 idle, 접근, 공격, 피격, 사망 모션을 분리해 읽히게 한다.
  - https://www.yanfly.moe/wiki/Animated_Sideview_Enemies_%28YEP%29

## 적용 방향

1. 배경 이동감
   - 배경 시트, 그리드, 바닥을 미세하게 이동시켜 자동 진행감을 만든다.
   - 모바일 성능을 위해 layout을 바꾸지 않고 `transform` 애니메이션을 사용한다.

2. 학생 근접 전투감
   - 학생 스프라이트에 준비 자세, 짧은 돌진, 타격, 복귀 루프를 적용한다.
   - 기존 `pencil-shot`은 숨기고 slash 이펙트로 대체한다.

3. 몬스터 편대 생동감
   - 모든 적에게 서로 다른 지연값을 둔 idle step/breath 루프를 적용한다.
   - 현재 타깃은 더 강한 피격 흔들림과 hit spark를 사용한다.
   - 처치된 적은 움직임을 멈춘다.

4. 학습 도우미 동료감
   - 활성 도우미는 학생 옆 파티 편대로 배치한다.
   - 도우미도 짧은 지원 돌진과 보조 타격 이펙트를 가진다.

5. 검증
   - `visual:verify`에서 모션 keyframe 누락을 잡는다.
   - `visual:smoke`에서 실제 전투 화면의 학생, 적, 이펙트, 배경 애니메이션 적용을 확인한다.

## 완료 기준

- 메인 전투 학생이 정지하지 않고 근접 전투 루프로 움직인다.
- 일반 몬스터 12마리 편대가 모두 다른 타이밍으로 움직인다.
- 현재 타깃은 캐릭터 위에서 피격 이펙트가 보인다.
- 도우미가 활성화되면 파티 동료처럼 학생 옆에서 지원 움직임을 갖는다.
- `npm run visual:qa`, `npm run verify:mobile`이 통과한다.
