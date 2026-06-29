# 원정대 배경 상용 품질 QA 보강 구현

## 개요
- 원정대 배경은 10개 챕터 x 10개 독립 source PNG 구조를 유지한다.
- 기능 검증은 통과했지만, Stage당 `300px` 이동과 100 Stage tile 주기는 모바일 화면에서 같은 배경이 감겨 보일 수 있어 상용 품질 기준으로 조정했다.
- 최신 기준은 Stage당 `80px` 이동, route tile `25 Stage` 전환이다.

## 변경 사항
- `src/react/App.jsx`
  - `EXPEDITION_STAGE_BACKDROP_STEP_PX`를 `80`으로 조정했다.
  - `EXPEDITION_BACKDROP_STAGES_PER_TILE`을 `25`로 고정했다.
  - 10개 tile을 25 Stage 단위 route cycle로 순환해 한 tile 내부 반복 노출을 줄였다.
- `src/react/styles.css`
  - Stage 이동 keyframe fallback offset을 `-80px` 기준으로 맞췄다.
- `tools/build-visual-assets.mjs`, `tools/verify-visual-assets.mjs`
  - visual metadata의 `stagesPerTile` 기준을 `25`로 갱신했다.
- `tools/react-vite-expedition-smoke.mjs`
  - Stage 1 -> 2 이동 offset 기대값을 `0 -> -80`으로 갱신했다.
  - Stage 26에서 route tile 1, offset 0을 사용하도록 검증한다.
- `tools/expedition-backdrop-viewport-audit.mjs`
  - React 상수와 visual metadata가 `80px/25 Stage` 기준인지 검사한다.
  - 대표 모바일 arena에서 한 tile 내부 누적 이동량이 렌더 폭을 넘지 않는지 검사한다.
  - 각 챕터 route tile의 최소/평균 인접 시각 차이를 검사한다.
  - report는 `artifacts/expedition-backdrop-qa/viewport-audit.json`에 남긴다.
- `package.json`
  - `expedition:backdrop-audit` script를 추가했다.
  - `visual:verify`가 `expedition:backdrop-audit`를 포함하도록 연결했다.

## 검증 결과
- `npm run visual:verify`: 통과.
- `npm run react:build`: 통과. Vite chunk size 경고만 확인.
- `npm run react:expedition-smoke`: 통과.
- `npm run visual:smoke`: 통과.
- `npm run verify`: 통과.
- `git diff --check`: 공백 오류 없음. PowerShell/Git 줄바꿈 변환 경고만 확인.

## QA 수치
- viewport audit 기준:
  - `stageStepPx`: 80
  - `stagesPerTile`: 25
  - `smokeCapturePresent`: true
  - failures/warnings: 0
- 챕터별 인접 tile 최소 시각 차이는 모두 기준값 6.5 이상이다.
  - 가장 낮은 챕터는 `studio`이며 min `7.23`, avg `9.62`로 통과했다.

## 유지보수 기준
- 배경 이동 체감을 다시 조정할 때는 `EXPEDITION_STAGE_BACKDROP_STEP_PX`, `EXPEDITION_BACKDROP_STAGES_PER_TILE`, `tools/react-vite-expedition-smoke.mjs`, `tools/expedition-backdrop-viewport-audit.mjs`를 함께 갱신한다.
- `visual:verify`는 원정대 배경 source 검증과 viewport 반복 위험 검사를 모두 통과해야 한다.
- 큰 PNG 번들 경고는 남아 있다. 품질 유지와 용량 최적화를 함께 잡으려면 WebP/AVIF 파생본 또는 챕터별 지연 로딩을 별도 차수에서 검토한다.
