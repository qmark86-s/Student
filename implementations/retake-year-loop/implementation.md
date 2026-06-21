# N수 1년 루프 구현

## 변경 요약

- N수 선택 직후 즉시 수능 전투가 시작되던 흐름을 재수/N수 1년 과정으로 변경했다.
- 현재 Battle Road 기준에서는 `REPEATER` 1년 과정이 3개월 조우 4회로 진행되고, 이후 수능 4개 조우를 새로 시작한다.
- N수 수능 전투 완료 시 수능 결과/직업 선택 화면으로 돌아오도록 했다.
- N수 회귀를 잡는 Playwright smoke를 추가하고 `verify:mobile`에 연결했다.

## 현재 기준

이 구현서는 N수 즉시 수능 진입 버그를 고친 1차 작업 기록이다. 현재 전투 표시는 `implementations/battle-road-encounter-flow/implementation.md` 기준으로 바뀌어, N수 1년은 12개월 카드 12개가 아니라 3개월 조우 4회로 진행되고 이후 수능 4개 조우로 이어진다.

## 주요 파일

- `src/snapshot/app.bundle.js`
  - `br(...)`: `H3` 또는 현재 road가 `suneung`일 때만 수능 조우를 생성하고, `REPEATER`는 일반 Battle Road 조우를 생성하도록 변경
  - `Er(...)`: 실제 `suneung` 전투일 때만 수능 시험 커브와 `수능시험` 이름을 사용하도록 정리
  - `Dr(...)`: `phase === "repeater"`의 4번째 Battle Road 조우 완료 시 수능 road를 생성하도록 변경
  - `Dr(...)`: `battle.kind === "suneung"` 전투 완료 시에만 `awaitingDecision`과 `outcome`을 생성
- `tools/apply-retake-year-patch.mjs`
  - 스냅샷 번들에 N수 1년 루프 패치를 재적용하는 보조 스크립트
- `tools/retake-year-smoke.mjs`
  - 결과 화면에서 `N수 선택`을 누른 뒤 3개월 조우 4회와 수능 4개 조우 완료 후 결과 복귀를 검증
- `package.json`
  - `patch:retake-year`, `retake:smoke` 명령 추가
  - `verify:mobile`에 `retake:smoke` 연결

## 동작 방식

기존에는 `REPEATER`가 `phase === "repeater"` 조건 때문에 `H3`와 함께 즉시 수능 전투 생성 함수로 들어갔다. 이제 최초 고3 수능은 수능 road로 들어가지만, N수 선택으로 진입한 `REPEATER`는 먼저 1년 Battle Road 과정을 사용한다.

현재 Battle Road 기준에서는 `REPEATER`가 3개월 단위 4개 조우로 진행된다. 4번째 조우가 완료되면 일반 학년처럼 다음 학년으로 넘어가지 않고, 현재 학년을 유지한 채 수능 4개 조우의 첫 전투를 새로 생성한다.

그 수능 4번째 조우가 완료되면 기존 결과 화면 로직에 들어가 대학 합격권과 직업 후보를 새로 계산한다.

## 검증

마지막 확인 명령:

```bash
npm run verify:mobile
```

통과 항목:

- `balance:verify`: 직업 밸런스 테이블 62개 검증
- `battle-road:verify`: 학년/N수 4조우와 수능 1/1/1/2 조우 데이터 검증
- `audit`: reference HTML 해시 확인
- `snapshot:build`: `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html` 재생성
- `mobile:smoke`: 360px, 412px 모바일 렌더링 확인
- `career:smoke`: 결과 화면 직업 랭킹 UI 확인
- `retake:smoke`: N수 선택 후 3개월 조우 4회, 수능 4개 조우, 마지막 탐구 2마리 동시 등장, 수능 완료 후 결과 대기 복귀 확인
