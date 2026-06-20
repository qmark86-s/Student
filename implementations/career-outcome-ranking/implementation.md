# 직업 결과 다양화 및 일렬 선택 구현

## 변경 요약

- 수능 결과 후 직업 선택지를 3개 후보에서 전체 직업 랭킹 목록으로 확장했다.
- 직업 순위와 능력 보정값을 `data/careers.json` 테이블 컬럼으로 관리하도록 했다.
- 진학 대학 prestige가 직업 수입과 원정대 전투 능력에 반영되도록 했다.
- 결과 화면과 직업 도감이 같은 `choiceRank` 기준을 사용하도록 맞췄다.
- 결과 화면 전용 Playwright smoke와 직업 밸런스 검증을 추가했다.

## 주요 파일

- `data/careers.json`
  - `choiceRank`, `choiceBand`, `powerMultiplier`, `prestigeIncomeRate`, `prestigePowerRate` 추가
- `src/snapshot/app.bundle.js`
  - `Qr(...)`: 전체 직업 랭킹 목록 생성, 선택 가능 상태와 보너스 계산
  - `yi(...)`: 잠긴 직업 선택 방지, 선택 직업의 랭킹/전투 배율 저장
  - `Tt(...)`: 원정대 기본 능력치 계산에 직업 전투 배율 반영
  - `xa(...)`: 직업 선택 UI를 랭킹 리스트로 표시
- `src/snapshot/styles.css`
  - `.career-choice-ranked`와 랭킹 버튼 모바일 스타일 추가
- `tools/validate-career-balance.mjs`
  - 직업 밸런스 컬럼 타입, 범위, 순위 중복 검증
- `tools/career-outcome-smoke.mjs`
  - 결과 화면 직업 랭킹 UI smoke
- `tools/apply-career-outcome-patch.mjs`
  - 스냅샷 번들에 직업 결과 패치를 재적용하는 보조 스크립트

## 동작 방식

수능 결과가 확정되면 최상위 합격 대학의 `prestige`를 기준으로 전체 직업을 순회한다. 모든 직업은 `careerCandidates`에 들어가지만, `prestige`가 `minPrestige`보다 낮은 직업은 `selectable: false`로 잠긴다.

결과 화면은 `choiceRank` 순으로 전체 직업을 보여준다. 선택 가능한 직업 수는 `careerSelectableCount`로 표시하며, 예전 `3택` 문구는 사용하지 않는다.

선택된 직업은 분당 수입뿐 아니라 `powerMultiplier`를 함께 가진다. 이 값은 원정대원 등록 시 `baseStats` 계산에 들어가므로, 높은 대학에 진학한 결과가 전투 능력으로도 이어진다.

## 검증

마지막 확인 명령:

```bash
npm run verify:mobile
```

통과 항목:

- `balance:verify`: 직업 밸런스 테이블 62개 검증
- `audit`: reference HTML 해시 확인
- `snapshot:build`: `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html` 재생성
- `mobile:smoke`: 360px, 412px 모바일 렌더링 확인
- `career:smoke`: 결과 화면 62개 직업 랭킹 버튼, 선택 가능 라벨, 전투 배율 라벨, 가로 overflow 0 확인
