# React/Vite no-fallback hardening 계획

## 목표

React/Vite 이식본에서 오류를 숨기는 fallback을 제거한다. 신규 세이브가 없는 상태의 기본 게임 시작만 허용하고, 깨진 세이브, 누락 필드, 누락 데이터, 잘못된 선택 ID, 알 수 없는 UI 매핑은 렌더링 또는 smoke 단계에서 즉시 실패하도록 만든다.

## 범위

- 세이브 로딩 실패를 기본 상태로 대체하지 않는다.
- 저장 데이터는 명시적 스키마 검증을 통과해야 한다.
- 상점/뽑기/진로 선택에서 알 수 없는 ID를 첫 항목이나 기본 등급으로 대체하지 않는다.
- UI 아이콘/등급/프레임 매핑 누락을 공용 아이콘이나 C등급으로 대체하지 않는다.
- React smoke seed도 같은 저장 스키마를 사용하도록 맞춘다.
- 기존 snapshot 빌드와 React parity 기준은 유지한다.

## 작업 순서

1. 세이브 스키마 검증과 fatal load 화면을 추가한다.
2. `normalizeGameState`의 default merge를 제거하고 필수 필드/배열을 검증한다.
3. 진로 수락, 로봇 뽑기, 상품 처리, UI 매핑에서 조용한 대체를 제거한다.
4. invalid save smoke를 추가하거나 기존 save smoke에 포함한다.
5. README와 React 이식 문서, 구현 문서를 최신화한다.
6. `react:verify`, `react:deep-parity`, strict `react:parity-audit`, `verify:mobile`을 통과시킨다.

## 완료 기준

- 깨진 `student-idle-rpg-save-v1`이 있으면 기본 상태로 플레이 화면을 띄우지 않고 fatal 안내 화면을 표시한다.
- 필수 저장 필드 누락은 `normalizeGameState`에서 실패한다.
- 잘못된 `universityId`, `careerId`, rarity, shop icon/category는 assert로 실패한다.
- 기존 정상 smoke와 parity 검증은 통과한다.
- 문서에 no-fallback 기준과 검증 명령이 반영된다.

## 구현 결과

- `loadGameState`는 localStorage가 비어 있을 때만 새 게임을 생성한다. JSON 파싱 실패, 스키마 불일치, 필수 필드 누락은 `LoadFailureScreen`으로 표시한다.
- `validateGameState`는 세이브 최상위 필드, `current`, `road`, `battle`, `outcome`, `expedition`을 검증한다. 결과 대기 상태에서는 완료된 `current.battle`과 `current.outcome`이 반드시 있어야 한다.
- `normalizeGameState`는 default merge로 누락 필드를 보충하지 않고, 검증된 객체를 얕게 정규화한다.
- 상점, 로봇 뽑기, 진로 수락, 동료/원정대, 교육, 학생 전투 UI에서 알 수 없는 ID/rarity/icon/frame/style을 조용히 대체하지 않고 즉시 실패하도록 바꿨다.
- React 런타임 소스(`src/react`)에서 `fallback`, `Fallback`, `??`, `unknown` 검색 결과를 0건으로 만들었다. 신규 save가 없는 첫 실행의 기본 상태 생성과 게임 규칙상 sparse level을 0으로 읽는 동작은 명시 함수로만 처리한다.
- 고3 수능 탐구 전투용 `suneung_social`, `suneung_science` 교과 VFX 토큰 풀을 추가했다. 완료된 battle에서는 공격 VFX를 계산하지 않는다.
- React smoke seed를 정식 세이브 스키마에 맞춰 보강했다. 특히 원정대 smoke의 결과 대기 seed는 완료된 수능 battle을 포함한다.
- 2026-06-24에 React smoke seed를 schema 2 전체 원정대 저장 형태로 갱신했다. 원본 HTML 비교 도구만 snapshot용 schema 1 seed와 React용 schema 2 seed를 분리해 사용한다.
- 초1/초2 탐구 VFX token pool을 추가해 초등 탐구 적 생성도 fallback 없이 데이터 검증으로 통과하게 했다.

## 검증 결과

2026-06-24 기준 통과:

- `npm run react:verify`
- `npm run react:deep-parity`
- `npm run react:interactive-parity`
- `npm run curriculum-vfx:verify`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`

주요 확인값:

- `src/react` 검색 결과 0건
- `react:responsive-audit` 8개 viewport 실패 0건
- `react:interactive-parity` 23개 조작 시나리오 실패 0건
- `react:shop-debug-smoke` 로봇 호출, 동료 탭, DEBUG 동료 +5, 원정대 5/5 편성, stage 돌파 통과
- `react:expedition-smoke` 직업 수락, 동료 등록, 원정대 stage 돌파 통과
- `curriculum-vfx:verify` 결과 `grades=16 pools=70 tokens=416 styles=5`
