# 전투장 모션 개선 구현

## 구현일

2026-06-20

## 변경 요약

- `tools/build-visual-assets.mjs`
  - 전투장 배경/그리드/바닥 treadmill 모션을 생성 CSS에 추가했다.
  - 학생 스프라이트에 `studentCombatLoop` 근접 돌진 루프와 `studentMeleeSlash` 이펙트를 추가했다.
  - 학생 내부 스프라이트에 `studentSpriteIdle`을 추가해 돌진 사이에도 제자리 생동감이 보이게 했다.
  - 학생 발밑에 `studentDashDust`를 추가해 돌진 타이밍을 더 분명하게 만들었다.
  - 기존 원거리 느낌의 `pencil-shot`은 메인 전투장 안에서 숨겼다.
  - 모든 `battle-scene-enemy`가 slot별 지연값으로 움직이도록 `enemyCombatStep`, `enemyCombatBreath`를 추가했다.
  - 현재 타깃에는 더 큰 `enemyEngagedStep`, `enemyHurtLoop`, `enemyHitSpark`, `enemyShockRing`을 적용했다.
  - 전투장 편대에는 `battleDustBurst`를 추가해 타격 순간의 먼지 VFX가 보이게 했다.
  - 보스/수능 HP바에는 짧은 shine 모션을 추가했다.
  - 활성 학습 도우미는 학생 옆 동료 편대처럼 `helperAllyLoop`, `helperAssistSpark`를 사용한다.

- `tools/verify-visual-assets.mjs`
  - 전투장 모션 keyframe 누락 검사를 추가했다.

- `tools/visual-asset-smoke.mjs`
  - 실제 렌더링 화면에서 학생 근접 모션, 학생 제자리 idle, 적 편대 모션, 현재 타깃 피격 이펙트, shock ring, dust burst, 전투장 이동감, 도우미 동료 모션 CSS를 검증한다.

## 설계 기준

- 모바일 APK를 고려해 레이아웃 재계산이 큰 `left`, `top`, `width`, `height` 애니메이션 대신 `transform`과 `opacity`를 중심으로 구성했다.
- 스프라이트 이미지는 새로 늘리지 않고 기존 아틀라스를 유지해 번들 크기 증가를 막았다.
- 모션은 생성 CSS에 포함해 `npm run visual:build`를 다시 돌려도 유지되게 했다.

## 검증 명령

```powershell
npm run visual:qa
npm run verify:mobile
```
