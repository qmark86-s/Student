# 직업 결과 다양화 및 일렬 선택 Plan

## 목표

수능 결과와 진학 대학의 성취가 직업 선택과 직업 능력 편차에 더 명확하게 반영되도록, 현재 3개 후보만 제시하는 직업 선택 구조를 확장한다.

## 현재 분석

- 현재 직업 데이터는 `data/careers.json` 62종이다.
- 직업은 `tier`, `baseIncomePerMinute`, `minPrestige`, `preferredTrack`, `statWeights`를 가진다.
- 현재 대학 데이터는 `data/universities.json` 54개이며, 각 대학은 `gameRank`, `minScore`, `minNationalRank`, `prestige`, `trackBias`, `line`을 가진다.
- 수능 결과 산출 후 `Qr(...)` 로직이 합격 가능한 대학 목록을 만들고, 최상위 합격 대학의 `prestige`를 기준으로 직업 후보를 만든다.
- 현재 직업 후보 조건은 `topUniversityPrestige >= career.minPrestige`이며, 미합격 시에는 전체 직업을 후보 풀로 본다.
- 현재 직업 후보 점수는 학생 스탯, 적성, 대학 prestige, 문과/이과 적합도, 랜덤값으로 계산한다.
- 현재 UI는 `careerCandidates.slice(0, 3)` 결과만 보여주며, 화면 뱃지도 `3택`으로 고정되어 있다.
- 현재 선택된 직업 동료의 수입은 `baseIncomePerMinute + max(0, universityPrestige - minPrestige) * 0.18`이다.
- 원정대 기본 능력치는 학생 스탯과 직업 가중치 중심으로 변환되며, 대학 진학 난이도와 노력의 차이는 직접적인 능력 편차로 크게 드러나지 않는다.
- 직업 도감은 이미 직업을 `tier -> minPrestige -> 이름` 순으로 일렬 정렬하지만, 수능 결과 직업 선택 UI와는 분리되어 있다.

## 문제점

- 수능 성적에 따른 직업 풀 차이는 존재하지만, 결과 화면에서는 최대 3개만 보여 다양성이 약하다.
- 직업의 전체 서열과 잠금/도달 상태를 결과 화면에서 한눈에 보기 어렵다.
- 높은 대학에 들어간 노력은 수입에 약하게만 반영되고, 동료/원정대 능력 편차로는 충분히 체감되지 않는다.
- 후보 선택 로직에 랜덤값이 커서 같은 성적대의 선택 결과가 의도보다 흔들릴 수 있다.

## 구현 방향

1. 직업 서열화
   - 전체 직업을 `choiceRank` 기준으로 일렬 정렬한다.
   - 기본 산정 기준은 `tier`, `minPrestige`, `baseIncomePerMinute`, 이름 순으로 생성했다.
   - 결과 UI와 직업 도감 모두 `choiceRank`를 우선 사용한다.

2. 수능 성적 기반 직업 풀 확장
   - `careerCandidates`를 3개 제한에서 전체 랭킹형 목록으로 확장한다.
   - 대학 prestige가 직업 `minPrestige` 이상이면 선택 가능으로 표시한다.
   - 실제 선택 가능 수는 `careerSelectableCount`로 별도 보관한다.
   - 모바일 UI는 스크롤 가능한 단일 컬럼 리스트로 표시한다.

3. 대학 노력 기반 능력 편차
   - 직업 테이블에 `powerMultiplier`, `prestigeIncomeRate`, `prestigePowerRate`를 추가한다.
   - 선택 결과의 `incomePerMinute`와 `powerMultiplier`가 대학 prestige 초과분을 반영한다.
   - 선택된 직업의 `powerMultiplier`를 원정대 `baseStats` 계산에 반영한다.

4. UI
   - 결과 패널의 `3택` 문구를 `N개 가능` 문구로 교체한다.
   - 직업 선택 리스트에 순위, 등급 밴드, 요구 명성, 예상 수입, 전투 배율을 표시한다.
   - 모바일 화면에서 긴 직업 목록은 스크롤 가능한 단일 컬럼 리스트로 유지한다.

5. 검증
   - `npm run verify`
   - `npm run verify:mobile`
   - 필요 시 `npm run preview` 후 결과 화면 모바일 스모크를 추가 확인한다.
   - 변경 후 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`이 동일 소스에서 재생성되는지 확인한다.

## 사용 도구와 MCP

- Node 스크립트: 데이터 분석, 번들 패치, 스냅샷 재조립
- Playwright/Browser: 모바일 결과 화면 렌더링과 콘솔 오류 확인
- GitHub connector: 원격 동기화나 PR 작업이 필요할 때만 사용
- Godot/Unity/Unreal/UMG MCP: 이번 웹/APK 방향 작업에는 사용하지 않는다.

## 착수 전 결정

- 결과 화면에서 전체 62개 직업을 모두 보여줄지, 접근 가능/도전권 중심으로 접고 펼칠지 결정한다.
- 잠김 직업도 이름을 공개할지, 현재 도감처럼 `???`로 유지할지 결정한다.
- 능력 편차를 수입 중심으로 키울지, 원정대 전투 능력까지 함께 키울지 결정한다.

## 1차 완료 기준

- 수능 결과 후 직업 목록이 일렬 랭킹 형태로 표시된다. 완료
- 수능 성적과 대학 prestige에 따라 선택 가능 직업 범위가 명확히 달라진다. 완료
- 높은 대학 진학 결과가 동료 수입과 원정대 능력 차이로 체감된다. 완료
- 모바일 smoke에서 가로 overflow, 콘솔 오류, 버튼 렌더링 문제가 없다. 완료

## 구현 결과

- `data/careers.json`에 직업 밸런스 컬럼 5종을 추가했다.
  - `choiceRank`: 결과 선택/도감 표시 순위
  - `choiceBand`: 화면 표시용 랭크 밴드
  - `powerMultiplier`: 직업 기본 전투 배율
  - `prestigeIncomeRate`: 대학 prestige 초과분의 수입 보너스율
  - `prestigePowerRate`: 대학 prestige 초과분의 전투 배율 보너스율
- `src/snapshot/app.bundle.js`의 수능 결과 산출 로직을 전체 랭킹 목록 방식으로 패치했다.
- `src/snapshot/app.bundle.js`의 직업 선택 수락 로직에서 잠긴 직업을 선택하지 못하게 막고, 선택 직업의 전투 배율을 원정대 능력치에 반영했다.
- `src/snapshot/styles.css`에 랭킹형 직업 선택 리스트 모바일 스타일을 추가했다.
- `tools/validate-career-balance.mjs`로 밸런스 테이블 검증을 추가했다.
- `tools/career-outcome-smoke.mjs`로 결과 화면 전용 smoke를 추가했다.
- `npm run verify:mobile`이 기본 모바일 smoke와 결과 화면 smoke를 모두 수행하도록 연결했다.

## 검증 결과

- `npm run verify`: 통과
- `npm run verify:mobile`: 통과
- `career:smoke`: 62개 랭킹 직업 버튼 렌더링, 가로 overflow 0, 콘솔 오류 0
