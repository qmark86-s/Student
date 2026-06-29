# 원정대 배경 이동 거리 확대 구현

> 최신 기준: `plans/expedition-backdrop-commercial-qa/plan.md` 차수 이후 Stage당 이동 거리는 `80px`, route tile 교체 주기는 `25 Stage`다. 아래의 `300px/100 Stage` 내용은 이전 감각 튜닝 기록이다.

## 개요
- 챕터별 원정대 배경 고도화 이후 Stage 클리어 이동 중 배경이 지나가는 거리가 너무 짧게 보이는 문제를 조정했다.
- 기존 route tile 내부 Stage 이동 offset은 Stage당 `20px`이었다.
- 사용자 피드백의 “10 이동이면 150 정도” 감각을 현재 코드값 기준 15배로 해석해 Stage당 `300px`로 확대했다.
- 전투 결과, 보상, Stage 진행, 몬스터 접근 오버랩 타이밍은 변경하지 않았다.

## 구현
- `src/react/App.jsx`
  - 최신 기준에서는 `EXPEDITION_STAGE_BACKDROP_STEP_PX`가 `80`이다.
  - `expeditionStageBackdropOffset()`은 route tile 내부 Stage 번호만 사용한다.
  - Stage 26처럼 새 tile로 넘어가는 지점은 offset `0`으로 리셋된다.
- `src/react/styles.css`
  - `expeditionStageTravel` keyframe fallback 값은 `-80px` 기준이다.
  - 정상 런타임에서는 `App.jsx`가 주입하는 CSS custom property가 우선 적용된다.
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 1 -> 2 이동 offset 기대값은 `0 -> -80`이다.
  - Stage 2 도착 후 `-80` offset이 유지되는지 검사한다.
- 문서
  - 원정대 Stage 전환/조우/전투 시각/챕터 배경 문서의 이동 거리 설명을 `80px/25 Stage` 기준으로 최신화했다.

## 검증 결과
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과. Stage 1 -> 2 이동 offset `0 -> -80`, Stage 2 도착 후 `-80` 유지 확인.
- `npm run react:verify`: 통과.
- `git diff --check`: 통과. CRLF 줄바꿈 경고만 출력되고 공백 오류는 없었다.
- 참고: 빌드와 원정대 smoke를 병렬로 돌린 첫 시도는 원정대 프레임 이미지 로딩 대기에서 타임아웃이 났다. 빌드 완료 후 `react:expedition-smoke` 단독 실행과 전체 `react:verify`는 통과했다.

## 유지보수 기준
- 이동 체감만 다시 조정하려면 `EXPEDITION_STAGE_BACKDROP_STEP_PX`, `EXPEDITION_BACKDROP_STAGES_PER_TILE`, 원정대 smoke 기대값, `expedition:backdrop-audit` 기준을 함께 바꾼다.
- `EXPEDITION_BACKDROP_STAGES_PER_TILE` 정책은 25 Stage마다 tile을 바꾸는 구조다.
