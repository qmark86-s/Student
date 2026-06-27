# 부동산 상세 지도 확대/축소 조작 구현

## 변경 파일
- `src/react/App.jsx`
- `src/react/styles.css`
- `plans/real-estate-detail-zoom-pan/plan.md`

## 구현 내용
- `RealEstateDistrictScene`의 상세 지도 상태를 단순 `pan`에서 `{ zoom, x, y }` 카메라 상태로 변경했다.
- 기본 배율은 `0.5`, 최대 배율은 `1`로 고정했다. 기존 상세 화면처럼 내부 맵이 `200%` 크기이므로 `0.5`가 전체 지역 보기, `1`이 기존 최대 확대 보기다.
- 팬 제한은 `viewport 크기 * 2 * zoom` 기준으로 계산한다. 축소 상태에서는 이동 범위가 `0`이어서 전체 화면이 고정되고, 확대될수록 이동 가능한 범위가 열린다.
- PC 휠은 `.real-estate-detail-viewport`가 포커스된 상태에서만 처리한다. 지도 포인터 입력 시작 시 viewport에 자동 포커스를 준다.
- 모바일/터치 입력은 Pointer Events 기반으로 처리한다.
  - 포인터 1개: 드래그 이동
  - 포인터 2개 이상: 핀치 거리 변화로 확대/축소, 중심점 변화로 이동
- 상세 맵 CSS에 `transform-origin: 0 0`을 추가해 `200%` 맵이 `0.5` 배율에서 정확히 viewport 전체에 맞도록 했다.
- viewport에는 `focus-visible` 표시, `overscroll-behavior: contain`, `user-select: none`을 추가했다.

## 검증 결과
- `npm run react:build` 통과
- `npm run react:real-estate-smoke` 통과

## 주의
- 이번 작업은 부동산 성장 PNG 생성/단계 테이블을 변경하지 않는다.
- 작업 전부터 `src/react/App.jsx`, `src/react/styles.css`, 여러 데이터/도구 파일에 다른 미커밋 변경이 존재했다. 이번 구현은 상세 지도 카메라 조작 범위만 추가했다.
