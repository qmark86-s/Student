# 원정대 원화 파노라마 전투 Plan

## 목표

원정대 화면도 메인 전투처럼 캐릭터와 몬스터가 살아 움직이는 방치형 RPG 전투로 만든다. 배경은 낮은 밀도의 CSS/절차형 그래픽이 아니라 원화급 PNG를 기반으로 60초 전투감을 받치는 긴 파노라마로 사용한다.

## 적용 방향

1. 원화급 긴 배경
   - 생성형 PNG 원본을 `assets/visual-source/expedition-backdrops/<theme>/source-00.png`~`source-09.png`에 둔다.
   - 최신 기준에서는 1~10챕터가 같은 배경을 공유하지 않도록 챕터별 독립 source 10개와 route tile 10개, 총 `visual-expedition-backdrop-{theme}-{00..09}.png` 100개를 생성한다.
   - 각 tile은 `5016x540`이며, 최신 런타임은 Stage당 `80px` 이동과 25 Stage route tile 전환으로 한 tile이 감겨 보이기 전에 다음 segment로 넘어간다.
   - source 누락/저품질은 빌드에서 실패하고 자동 생성이나 공용 fallback으로 숨기지 않는다.
   - runtime tile은 source를 직접 잡아당기지 않고 chapter panorama overlap blend 결과에서 잘라낸다.
   - `expedition-arena::before`에는 현재 Stage가 속한 tile PNG를 `--expedition-bg-image`로 주입하고 천천히 이동시킨다.

2. 낮은 품질 오버레이 제거
   - 원정대의 기존 배경 `<img>`는 숨긴다.
   - CSS 격자나 절차형 도시 배경은 전투장 품질을 낮추므로 사용하지 않는다.

3. 원정대 전투 모션
   - 출전 동료는 제자리 idle과 짧은 근접 돌진을 가진다.
   - 적은 idle/breath와 피격 knockback을 가진다.
   - 피격 대상에는 shock ring, slash, dust burst를 적용한다.

4. 검증
   - `visual:verify`가 챕터 10개, source 100개, route tile 100개 파일과 크기 일치를 확인한다.
   - `visual:smoke`가 원화 파노라마 이미지, pan, 기존 배경 숨김, 동료/적/VFX 모션을 확인한다.
   - 컨택트시트에서 챕터별 배경 파노라마도 직접 확인할 수 있게 한다.

## 완료 기준

- 원정대 배경이 원화급 PNG 밀도로 보인다.
- 배경 pan은 60초를 기준으로 움직인다.
- 낮은 품질의 격자/CSS 배경이 전투장 위에 드러나지 않는다.
- 원정대 동료와 적이 idle/피격/VFX 모션을 가진다.
- `npm run visual:qa`, `npm run verify:mobile`이 통과한다.
