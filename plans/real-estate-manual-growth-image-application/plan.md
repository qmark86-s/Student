# 부동산 수동 교체 성장 PNG 적용 계획

## 목표
- 사용자가 `src/snapshot/assets/real-estate-district-growth/`에 직접 추가하거나 교체한 성장 PNG를 기존 부동산 성장 시스템에 연결한다.
- 새로 늘어난 성장 PNG를 `data/real_estate_district_growth_assets.json`의 `stages`에 반영해 구매 수량별로 실제 상세 배경이 바뀌게 한다.
- 후속 10단계 일괄화 기준에 따라 실제 PNG 수가 부족한 지역은 중간 논리 단계에서 같은 PNG를 재사용한다.
- 데이터에 존재하지 않는 미연결 성장 PNG가 남으면 검증에서 실패하도록 한다.
- 생성 리포트 기반 픽셀 감사와 사용자가 직접 제공한 runtime PNG 감사가 구분되도록 검증 기준을 갱신한다.

## 현재 분석
- 워킹트리는 기존 사용자 변경으로 dirty 상태이며, 원정대 연구 관련 파일과 문서는 이번 작업 범위에서 제외한다.
- MCP 표면은 현재 Unreal/S1/UMG 계열만 노출되어 있으며, 웹 React 부동산 PNG 적용에 직접 사용할 Student 전용 MCP는 없다.
- 기존 부동산 성장 화면은 `createRealEstateViewModel()`에서 `districtGrowthStageForCount()`로 `minOwnedCount` 이하의 가장 큰 stage를 선택하고, `App.jsx`가 `data-growth-asset`으로 해당 PNG를 렌더링한다.
- 수동 적용 당시 아래 새 PNG들이 기존 성장 테이블에 없었고, 현재는 모두 10단계 성장 테이블에 1회 이상 연결되어 있다.
  - `small-studio-growth-06.png`, `small-studio-growth-07.png`
  - `two-room-growth-05.png` ~ `two-room-growth-08.png`
  - `officetel-growth-06.png` ~ `officetel-growth-08.png`
  - `office-tower-growth-05.png`, `office-tower-growth-06.png`
  - `mixed-development-growth-06.png` ~ `mixed-development-growth-08.png`

## 적용 기준
- 지역별 `maxOwnedCount`와 순차 해금 구조는 기존 밸런스를 유지한다.
- 파일명 순서를 성장 순서로 사용한다.
- 0단계는 항상 `minOwnedCount: 0`, 첫 성장 단계는 `minOwnedCount: 1`로 둔다.
- 모든 지역의 논리 성장 단계는 10개로 통일한다.
- 새로 늘어난 논리 단계는 해당 지역의 최대 보유 수량 전까지 고르게 배치하고, 최종 단계는 `maxOwnedCount - 1` 근처부터 표시되게 한다.
- 실제 PNG가 10개보다 적은 지역은 중간 단계에 같은 PNG를 다시 연결한다.

## 구현
- `data/real_estate_district_growth_assets.json`
  - 모든 지역의 `stages` 배열을 10개로 맞춘다.
  - `growthStage`는 0부터 9까지 연속되게 유지한다.
- `tools/validate-real-estate-config.mjs`
  - `src/snapshot/assets/real-estate-district-growth`에 있는 지역별 성장 PNG가 모두 데이터에 연결되어 있는지 검사한다.
- `tools/audit-real-estate-reconstruction-slots.py`
  - 생성 리포트와 runtime PNG 차수가 어긋나거나, 사용자가 직접 고해상도 PNG를 넣어 생성 리포트 해상도와 다를 경우 `manualRuntimePng` 감사 모드로 명시적으로 검사한다.
  - 수동 감사 모드는 모든 stage PNG 로드, 해상도, 파일 크기, 첫 단계와 최종 단계의 시각 차이를 확인하고 report를 남긴다.
- 문서
  - 기존 성장 PNG 바인딩 구현 문서와 새 구현 문서에 이번 적용 내역을 기록한다.

## 검증
- `npm run real-estate:verify`
- `npm run react:build`
- `npm run react:real-estate-smoke`
- `npm run react:real-estate-visual-audit`
- 필요 시 `npm run real-estate:growth-review`
