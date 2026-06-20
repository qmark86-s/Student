# N수 1년 루프 구현

## 변경 요약

- N수 선택 직후 즉시 수능 5과목 전투가 시작되던 흐름을 12개월 재수/N수 과정으로 변경했다.
- `REPEATER` 12개월 전투 완료 시 바로 결과로 가지 않고 수능 5과목 전투를 새로 시작하도록 했다.
- N수 수능 전투 완료 시 수능 결과/직업 선택 화면으로 돌아오도록 했다.
- N수 회귀를 잡는 Playwright smoke를 추가하고 `verify:mobile`에 연결했다.

## 주요 파일

- `src/snapshot/app.bundle.js`
  - `br(...)`: `H3`만 즉시 수능 전투를 생성하고, `REPEATER`는 일반 12개월 전투를 생성하도록 변경
  - `Er(...)`: 실제 `suneung` 전투일 때만 수능 시험 커브와 `수능시험` 이름을 사용하도록 정리
  - `Dr(...)`: `phase === "repeater"` 12개월 전투 완료 시 `yr(...)` 수능 전투를 생성하도록 변경
  - `Dr(...)`: `battle.kind === "suneung"` 전투 완료 시에만 `awaitingDecision`과 `outcome`을 생성
- `tools/apply-retake-year-patch.mjs`
  - 스냅샷 번들에 N수 1년 루프 패치를 재적용하는 보조 스크립트
- `tools/retake-year-smoke.mjs`
  - 결과 화면에서 `N수 선택`을 누른 뒤 12개월 전투 생성과 완료 후 결과 복귀를 검증
- `package.json`
  - `patch:retake-year`, `retake:smoke` 명령 추가
  - `verify:mobile`에 `retake:smoke` 연결

## 동작 방식

기존에는 `REPEATER`가 `phase === "repeater"` 조건 때문에 `H3`와 함께 즉시 수능 전투 생성 함수로 들어갔다. 이제 최초 고3 수능은 기존처럼 5과목 전투를 사용하지만, N수 선택으로 진입한 `REPEATER`는 이미 준비된 12개월 전투 데이터를 사용한다.

`REPEATER` 12개월 전투가 완료되면 일반 학년처럼 다음 학년으로 넘어가지 않는다. 대신 현재 학년을 유지한 채 수능 5과목 전투를 새로 생성한다.

그 수능 전투가 완료되면 기존 결과 화면 로직에 들어가 대학 합격권과 직업 후보를 새로 계산한다.

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
- `career:smoke`: 결과 화면 직업 랭킹 UI 확인
- `retake:smoke`: N수 선택 후 12개월 전투 카드 12개 생성, 즉시 수능 카드 0개, 12개월 완료 후 수능 카드 5개 생성, 수능 완료 후 결과 대기 복귀 확인
