# 원정대 배경 전체 프레임 표시 구현

## 개요
- 원정대 전투장 배경이 위아래로 잘리지 않도록 렌더링 배율을 조정했다.
- 배경 이미지 자체, Stage 이동 거리, Stage 이동 timing, 몬스터 조우 timing은 변경하지 않았다.

## 변경 사항
- `src/react/styles.css`
  - `.expedition-arena::before`의 `background-size`를 `auto 220%`에서 `auto 100%`로 변경했다.
  - `.expedition-backdrop-layer`의 `background-size`도 `auto 100%`로 맞췄다.
  - 일반 상태와 Stage 이동 전환 상태가 같은 배율을 쓰므로 이동 중 배경 구도 차이가 나지 않는다.

## 검증 결과
- `npm run react:build` 통과.
- `npm run react:expedition-smoke` 통과.
- `npm run visual:smoke` 통과.
- `npm run verify:mobile` 통과.
- `rg -n "fallback|Fallback|unknown" src/react -S` 출력 없음.
- `git diff --check` 통과. 줄끝 변환 경고만 출력됐다.
- `artifacts/visual-asset-smoke/expedition.png`로 원정대 화면을 확인했고, 하늘/원경/도로 하단이 이전보다 넓게 표시되는 것을 확인했다.

## 유지보수 기준
- 원정대 배경의 구도를 다시 조정할 때는 `background-size`를 먼저 확인한다.
- Stage 이동용 `.expedition-backdrop-layer`와 일반 상태 `.expedition-arena::before`의 배율은 항상 같이 유지한다.
