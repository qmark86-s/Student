# 학생 장비 전환 구현 설명서

## 개요
- 학생 탭의 학습 지원 개념을 장비 시스템으로 전환했다.
- v1 장비 슬롯은 `필기류(stationery)` 1개, `책류(book)` 1개다.
- 상점은 `문방구`와 `서점` 탭에서 각각 필기류/책류 1회 및 10+1 뽑기를 제공한다.
- 같은 슬롯과 같은 등급 장비 2개를 합성하면 대상 장비가 다음 등급으로 승급되고 재료 1개가 제거된다.

## 주요 코드
- `src/react/game/equipment.js`
  - 장비 슬롯/등급/상점 상품/장비 카탈로그/뽑기/장착/합성/판매가/전투력 계산을 담당한다.
  - 빈 슬롯은 첫 획득 장비를 자동 장착하고, 이미 장착된 슬롯은 자동 교체하지 않는다.
  - 기존 학습 지원 저장 항목은 migration 전용 변환 함수로 장비 인스턴스에 매핑한다.
- `src/react/game/save.js`
  - 저장 스키마를 v4로 올리고 `equipment`와 `careerAlumni`를 정식 상태로 추가했다.
  - v1~v3 저장 데이터의 학생 지원 항목은 장비로, 직업 인물 항목은 `careerAlumni`로 분리한다.
  - schema 1처럼 원정대/부동산/road/battle/avatarGender가 없던 legacy 결과 대기 save는 v4 구조로 승격하며, 결과 화면과 `N수 선택` 흐름을 유지하도록 완료된 수능 battle snapshot을 생성한다.
- `src/react/game/companions.js`
  - 학생 장비와 무관한 직업 졸업생/원정대 등록 보조만 남겼다.
- `src/react/game/battleRoad.js`
  - 학생 전투력 계산은 `equipmentStatShare`와 장착된 필기류/책류 stats만 반영한다.
- `src/react/App.jsx`, `src/react/styles.css`
  - 학생 하단 탭을 `장비`로 교체하고 슬롯, 보유 장비, 장착, 합성 UI를 추가했다.
  - 상점 장비 뽑기 결과 팝업과 장착 장비 라인업을 추가했다.
- `src/react/game/expedition.js`
  - 원정대 기능은 유지하고 사용자-facing 용어를 `원정대원`, `대원 관리`, `출전 대원 성장` 중심으로 정리했다.

## 데이터와 문서
- `data/student_progression_balance.json`
  - `companionStatShare`를 `equipmentStatShare`로 교체했다.
- `README.md`
  - React 검증 설명을 장비 뽑기, 자동 장착, 원정대원 후보 흐름 기준으로 갱신했다.
- `docs/react-vite-parity-migration.md`
  - 상점 7개 탭, 장비 뽑기 팝업, 대원 관리 용어, 최신 패리티 기준을 반영했다.
- `plans/student-equipment-rework/plan.md`
  - 구현 전 계획 문서다.

## 검증 갱신
- `tools/react-vite-save-smoke.mjs`
  - legacy 저장 데이터가 장비 2개로 마이그레이션되고 두 슬롯에 자동 장착되는지 확인한다.
  - schema 1 결과 대기 save가 v4로 마이그레이션된 뒤 결과 탭에서 `N수 선택`을 눌러도 앱이 닫히지 않고 첫 N수 전투로 진입하는지 확인한다.
- `tools/react-vite-shop-debug-smoke.mjs`
  - 문방구 장비 뽑기, 자동 장착, 장비 탭 카드, DEBUG 원정대원 후보 추가를 확인한다.
- `tools/react-vite-expedition-smoke.mjs`, `tools/react-vite-expedition-rules-smoke.mjs`
  - `careerAlumni`와 `대원 관리` 기준으로 갱신했다.
- `tools/react-vite-records-smoke.mjs`, `tools/react-vite-responsive-audit.mjs`
  - 학생 장비/원정대원 용어와 상태 카운트를 기준으로 갱신했다.
- `tools/react-vite-interactive-parity-audit.mjs`, `tools/react-vite-ui-parity-deep-smoke.mjs`, `tools/react-vite-visual-parity-smoke.mjs`, `tools/react-vite-full-parity-gate.mjs`, `tools/react-vite-hotspot-crop.mjs`
  - 최신 React 장비 UI 기준으로 패리티와 산출물 생성을 검증하도록 갱신했다.

## 최종 검증 결과
- `npm run react:build`: 통과
- `npm run react:save-smoke`: 통과
- `npm run react:battle-smoke`: 통과
- `npm run react:shop-debug-smoke`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과
- `npm run react:interactive-parity`: 통과
- `npm run react:deep-parity`: 통과
- `npm run react:full-parity`: 통과
- `npm run react:verify`: `react:full-parity` 내부 실행 포함 통과
- live `http://127.0.0.1:5173/?qaTools=1` schema 1 결과 대기 save 재현: v4 승격 후 `N수 선택` 클릭 close/crash/pageerror 0건
- `rg -n "로봇|학습 도우미|robot_gacha|robot-helper|student-동료" src/react tools README.md docs/react-vite-parity-migration.md`: 매칭 0건
- `rg -n "\\?\\?|fallback|Fallback|unknown" src/react`: 매칭 0건
- `git diff --check`: 공백 오류 없음, 줄끝 변환 경고만 출력
