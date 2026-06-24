# React/Vite no-fallback hardening 구현 설명서

## 목적

React/Vite 이식본에서 깨진 데이터나 누락 자산을 기본값으로 덮어 계속 진행하는 흐름을 제거했다. 신규 세이브가 없는 첫 실행만 새 게임을 생성하고, 그 외 저장 데이터 오류, 필수 필드 누락, 알 수 없는 ID/rarity/icon/frame/style은 화면 오류나 smoke 실패로 즉시 드러나게 했다.

## 핵심 변경

- `src/react/game/save.js`
  - `validateGameState`를 공개하고 세이브 최상위, `current`, `road`, `battle`, `outcome`, `expedition` 구조를 검증한다.
  - localStorage가 비어 있을 때만 `createDefaultGameState`를 사용한다.
  - invalid JSON, schema mismatch, 필수 필드 누락은 fatal load 결과로 반환한다.
  - 결과 대기 상태(`current.awaitingDecision=true`)는 완료된 `current.battle`과 `current.outcome`을 필수로 요구한다.
  - `normalizeGameState`는 default merge를 하지 않고 검증된 상태를 얕게 정리한다.

- `src/react/App.jsx`
  - fatal load 화면을 추가해 깨진 세이브를 정상 UI로 숨기지 않는다.
  - placeholder 탭과 알 수 없는 탭 fallback을 제거했다.
  - 결과, 동료, 상점, 디버그, 교육, 시험/직장/도감, 학생 전투 UI에서 누락 데이터를 assert로 드러낸다.
  - 결과 대기/완료 battle에서는 공격 VFX를 계산하지 않도록 `battleRoad` 조건과 맞췄다.

- `src/react/game/battleRoad.js`
  - `current.road`가 없는 legacy battle fallback을 제거했다.
  - 진행 중 battle에 활성 적이 없으면 실패한다. 완료된 battle만 표시용 첫 적을 사용할 수 있다.
  - 교과 VFX token pool/style 누락을 기본 style로 덮지 않는다.
  - `suneung_social`, `suneung_science` 풀 누락으로 고3 탐구 전투가 깨지지 않도록 데이터와 함께 보강했다.

- `src/react/game/companions.js`, `education.js`, `assets.js`, `grades.js`, `debugTools.js`
  - 로봇/직업 동료, 학습 도우미, 교육 레벨, 성별, 학년 ID 검증을 강화했다.
  - 에러 메시지용 `unknown` 대체와 optional fallback 표현도 제거했다.

- `data/curriculum_attack_vfx.json`
  - 고3 수능 탐구용 `suneung_social`, `suneung_science` token pool을 추가했다.
  - N수 탐구 token pool과 함께 `npm run curriculum-vfx:verify` 검증 대상에 포함된다.

- `tools/build-visual-assets.mjs`
  - 준비된 학생/직업/메인 몬스터 자산이 없으면 임시 드로잉이나 공용 자산으로 대체하지 않고 실패한다.
  - `visual_assets.json`의 `mainMonsters`에 `columns`, `rows`를 기록해 런타임이 atlas 구조를 추측하지 않는다.

- React smoke 도구
  - `react-vite-save-smoke`: invalid save가 normal UI로 진입하지 않고 fatal load 화면을 표시하는지 검사한다.
  - `react-vite-expedition-smoke`: 결과 대기 seed에 완료된 수능 battle을 포함하고, 직업 수락/동료 등록/원정대 stage 돌파를 검사한다.
  - `react-vite-shop-debug-smoke`: 로봇 호출, 동료 탭, DEBUG 동료 +5, 원정대 파티 5/5, stage 돌파를 검사한다.
  - React 전용 smoke seed는 schema 2 전체 `expedition` 필드를 명시한다.
  - snapshot 비교 도구인 `react-vite-interactive-parity-audit`, `react-vite-ui-parity-deep-smoke`는 원본 HTML에는 schema 1 seed, React에는 schema 2 seed를 별도로 주입한다.

## no-fallback 기준

- 허용: localStorage에 세이브가 전혀 없을 때 새 게임 상태를 생성한다.
- 허용: `studyLevels`, `educationLevels`처럼 게임 규칙상 sparse map인 레벨 데이터는 명시 함수에서 미작성 키를 0레벨로 읽는다.
- 금지: 깨진 세이브를 새 게임으로 덮기.
- 금지: 누락된 data/json 필드, asset 키, rarity, icon, frame, career/university ID를 첫 항목이나 공용 값으로 대체하기.
- 금지: 실행 시점에 누락 자산을 임시 드로잉, 샘플 자산, legacy 자산으로 조용히 대체하기.

## 검증

2026-06-24에 다음 명령을 통과했다.

```powershell
npm run react:verify
npm run react:interactive-parity
npm run react:deep-parity
npm run curriculum-vfx:verify
rg -n '\?\?|fallback|Fallback|unknown' src/react
```

확인 결과:

- React runtime source 검색: `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- responsive audit: 8개 viewport 실패 0건
- interactive parity: 23개 조작 시나리오 실패 0건
- deep parity: 상점/뽑기/설정/디버그 normalized text 일치, 핵심 selector `styleDiffs: []`
- shop/debug smoke: 로봇 도우미, 동료 탭, DEBUG 동료, 원정대 편성/돌파 통과
- VFX 검증: `grades=16 pools=70 tokens=416 styles=5`

## 유지보수 메모

- 새 저장 필드를 추가하면 `createDefaultGameState`, `validateGameState`, 관련 smoke seed를 함께 수정한다.
- 결과 대기 상태를 만드는 코드는 `current.battle`을 완료 상태로 보존해야 한다.
- 새 교과 VFX subject를 추가하면 모든 해당 grade mapping에 token pool을 추가하고 `curriculum-vfx:verify`를 먼저 돌린다.
- 새 UI mapping(icon, rarity, frame, category)을 추가할 때는 fallback을 넣지 말고 누락 시 assert 또는 검증 실패로 드러낸다.
- snapshot과 React를 동시에 비교하는 도구는 두 앱의 저장 스키마가 다를 수 있으므로 같은 의미의 seed를 각 스키마로 명시해 주입한다.
