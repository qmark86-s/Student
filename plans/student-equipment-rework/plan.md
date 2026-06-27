# 학생 장비 전환 계획

## 목표
- 학생 탭의 동료/학습 도우미/로봇 도우미 개념을 장비로 전환한다.
- 장비는 v1에서 필기류 1슬롯, 책류 1슬롯만 제공한다.
- 상점에는 문방구와 서점 탭을 추가하고 각각 필기류/책류 장비 뽑기를 제공한다.
- 성장은 같은 슬롯과 같은 등급 장비 2개를 합성해 다음 등급 1개로 올리는 방식으로 구현한다.
- 기존 로봇 도우미 저장 데이터는 장비로 마이그레이션하고, 기존 직업 동료 데이터는 졸업생/원정대원 축으로 분리한다.

## 구현 범위
1. `save` 스키마를 v4로 올리고 `equipment.inventory`, `equipment.equipped`, `careerAlumni`를 추가한다.
2. 기존 로봇 도우미 항목은 normalize/migration 단계에서 장비 인벤토리로 변환한다.
3. 기존 직업 동료 항목은 `careerAlumni`로 이동하고 원정대 등록/직장/도감은 이 데이터를 읽게 한다.
4. 학생 하단 `동료` 탭은 `장비` 탭으로 바꾸고, 필기류/책류 슬롯, 보유 장비, 장착/합성 버튼을 표시한다.
5. 성장 패널과 Battle Road 전투력 계산은 장착 장비 스탯만 반영한다.
6. 상점 `로봇` 탭을 제거하고 `문방구`, `서점` 탭 및 장비 뽑기 결과 팝업으로 교체한다.
7. 원정대 사용자-facing 문구는 `동료` 대신 `대원` 중심으로 정리한다.
8. 스모크/패리티/문서 기준을 장비 흐름으로 갱신한다.

## 검증 기준
- `npm run react:build`
- `npm run react:save-smoke`
- `npm run react:battle-smoke`
- `npm run react:shop-debug-smoke`
- `npm run react:records-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `npm run react:deep-parity`
- `npm run react:full-parity`
- `npm run react:verify`
- `rg -n "로봇|학습 도우미|robot_gacha|robot-helper|student-동료" src/react tools README.md docs/react-vite-parity-migration.md`
- `rg -n "\\?\\?|fallback|Fallback|unknown" src/react`
- `git diff --check`
