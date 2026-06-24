# React/Vite 원정대 전용 메뉴 패리티 계획

## 목표
- React/Vite 화면에서 원정대 탭 진입 시 원본 원정대 구조와 같이 전투 화면 아래에 `성장 / 파티 / 동료 관리 / 기록` 전용 메뉴를 표시한다.
- 학생 탭의 하단 메뉴와 원정대 탭의 하단 메뉴를 명확히 분리하여, 전투 화면 레이아웃만 공통 기준을 맞추고 관리 영역은 각 모드의 원본 UX를 따른다.
- 원정대 상태를 `data/` 테이블과 저장 스키마에 기반해 관리하며, 누락 데이터를 조용히 기본값으로 대체하지 않는다.

## 확인한 기준
- 원본 번들 원정대 상태는 `members`, `partyMemberIds`, `currentStage`, `highestStage`, `trainingExp`, `claimedBossStages`, `chapterRun`, `lastResolvedAt`, `log`를 가진다.
- 원본 원정대 메뉴는 `성장`, `파티`, `동료 관리`, `기록` 네 탭으로 구성된다.
- 원본 상단 상태는 학생 모드와 다르게 `Stage`, `파티`, `전투력`, `보유 EXP`, `다이아`를 표시한다.
- 원본 원정대 성장은 출전 중인 동료의 레벨업 비용을 `expedition_unit_levels.json`에서 계산한다.

## 구현 범위
1. 원정대 밸런스/승급 테이블을 JSON 데이터로 분리한다.
2. 저장 스키마에 원정대 전용 상태를 추가하고, 기존 v1 저장은 명시적 v2 마이그레이션으로 변환한다.
3. `src/react/game/expedition.js`에 원정대 상태 생성, 검증, 편성, 해제, 레벨업, 잠금, 합성, 클리어 처리를 구현한다.
4. `App.jsx`에서 학생 하단 탭과 원정대 하단 탭을 분리한다.
5. 원정대 전용 패널 UI를 원본 구조에 맞춰 구현한다.
6. CSS를 원정대 관리 영역 기준으로 정리하고 모바일 390px 및 데스크톱 프레임에서 깨지지 않게 검증한다.
7. React smoke와 responsive audit에 원정대 메뉴/성장/파티/관리/기록 검증을 추가한다.

## 검증 기준
- `npm run react:build`
- `npm run react:expedition-smoke`
- `npm run react:shop-debug-smoke`
- `npm run react:responsive-audit`
- `npm run react:verify`
- `npm run react:interactive-parity`
- 가능하면 원본 `verify:mobile`도 회귀 확인한다.

## 비고
- 개발 중 fallback 정책에 따라 원정대 데이터가 누락되면 명시적으로 검증 실패 또는 로드 실패가 나야 한다.
- 저장 데이터 변경은 무음 대체가 아니라 `schemaVersion` 기반 마이그레이션으로 처리한다.

## 2026-06-24 semantic signature 보강
- `tools/react-vite-interactive-parity-audit.mjs`가 원정대 active panel의 제목, 전체 텍스트, 버튼 라벨, 주요 카드 텍스트를 `semanticSignatures`로 기록한다.
- 최신 `npm run react:interactive-parity` 기준 원정대 성장/파티/동료 관리/기록의 `activePanelText`와 `activePanelButtons`는 snapshot/React가 일치한다.
- 대표 확인값:
  - 성장 제목: `출전 동료 성장 0명 투자 가능`
  - 파티 제목: `원정 파티 5/5`
  - 동료 관리 제목: `동료 관리`
  - 기록 제목: `원정 기록`
  - 하단 메뉴 버튼: `성장 / 파티 / 동료 관리 / 기록`
- 원정대 visual diff가 큰 이유는 텍스트/버튼 불일치가 아니라 최신 사용자 요청에 따른 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드 배치 차이다.
- `npm run react:build`: 통과.
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건.
- `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건.
- `npm run react:expedition-smoke`: 통과.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건.
- `git diff --check`: 공백 오류 없음, 기존 줄끝 변환 경고만 출력.
