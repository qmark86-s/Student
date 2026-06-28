# 원정대 배경 전체 프레임 표시 계획

## 목표
- 원정대 전투장 배경이 위아래로 잘리지 않고 원본 구도가 모두 보이게 한다.
- 이동 전환 중에도 같은 배율을 사용해 일반 상태와 전환 상태 사이의 구도 차이를 없앤다.

## 현재 원인
- `src/react/styles.css`의 `.expedition-arena::before`와 `.expedition-backdrop-layer`가 `background-size: auto 220%`를 사용한다.
- 원본 배경을 세로로 2.2배 확대해 표시하므로 상단 하늘과 하단 도로/전경 일부가 잘린다.

## 변경 범위
- `src/react/styles.css`
  - 일반 원정대 배경 pseudo element의 `background-size`를 `auto 100%`로 변경한다.
  - Stage 이동 전환용 backdrop layer의 `background-size`도 `auto 100%`로 동일하게 변경한다.
- 배경 소스 PNG, Stage 이동 거리, linear 이동 timing, 몬스터 조우 timing은 변경하지 않는다.

## 검증
- `npm run react:build` 통과.
- `npm run react:expedition-smoke` 통과.
- `npm run visual:smoke` 통과.
- `git diff --check` 통과. 줄끝 변환 경고만 출력됐다.
- `artifacts/visual-asset-smoke/expedition.png`를 열어 원정대 배경 구도를 확인했다.

## 확인 포인트
- 원정대 배경 상단/하단이 더 넓게 보인다.
- Stage 이동 중 배경 레이어 간 크기 차이로 인한 깜빡임이 없다.
- 기존 원정대 전투/조우 흐름은 유지된다.
