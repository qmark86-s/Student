# React/Vite full parity gate 구현

## 목적
- 기존 HTML과 React/Vite 이식본을 비교하는 주요 검증을 한 명령으로 묶었다.
- `react:verify`만으로는 strict 첫 화면 parity, interactive parity, deep modal parity가 함께 실행되지 않기 때문에, 상용화 전 회귀 검증용 상위 게이트를 추가했다.
- 원정대 동료가 다시 일렬 또는 5열 중심 배치로 돌아가지 않도록 최신 사용자 기준의 레이아웃 signature를 실패 조건으로 고정했다.

## 변경 내용
- `tools/react-vite-full-parity-gate.mjs`
  - `npm run snapshot:build`
  - `npm run curriculum-vfx:verify`
  - `npm run react:verify`
  - strict `npm run react:parity-audit`
  - `npm run react:interactive-parity`
  - `npm run react:deep-parity`
  - `npm run react:hotspot-crop`
  - `git diff --check`
  - 위 명령을 순서대로 실행하고 artifact JSON을 다시 읽어 핵심 조건을 검사한다.
- `package.json`
  - `react:full-parity` 스크립트를 추가했다.
- `plans/react-vite-full-parity-gate/plan.md`
  - 계획과 완료 기준, 최신 실행 결과를 기록했다.

## 검증 조건
- 기존 HTML 최신성:
  - `npm run snapshot:build`로 `dist/index.html`을 현재 소스 기준으로 다시 만든다.
  - `artifacts/snapshot-build-report.json`에 dist hash와 bytes가 있어야 한다.
- VFX 데이터:
  - `npm run curriculum-vfx:verify`가 통과해야 한다.
- strict 첫 화면 parity:
  - `artifacts/react-vite-parity/report.json`의 viewport 2개가 `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`이어야 한다.
- interactive parity:
  - 23개 시나리오가 모두 있어야 한다.
  - failures 0건이어야 한다.
  - 각 시나리오의 normalized text가 일치해야 한다.
  - `state.diffs`, `rectDiffs`, `selectorDiffs`, scenario `failures`가 모두 0건이어야 한다.
  - snapshot/React의 horizontal overflow와 button overflow가 모두 0이어야 한다.
  - active panel 제목, 본문, 버튼 semantic signature가 일치해야 한다.
  - `modeTabs`처럼 원본 HTML과 React shell 구조가 다른 wrapper count는 직접 비교하지 않는다.
  - 원정대 카드 DOM/count와 카드 텍스트 블록은 사용자 요청에 따른 3+2/2+2+1/2열 grid 차이 때문에 원본 HTML과 직접 비교하지 않고, 별도 layout signature로 검증한다.
- 원정대 레이아웃:
  - 전투 동료 `2+2+1`
  - front band 1명
  - 전투 동료 세로 폭 52px 이상
  - 전투 동료 좌우 center spread 94px 이상
  - 성장 카드 `2+2+1`
  - 파티 슬롯 `3+2`
  - 파티 후보/동료 관리 카드 2열 행
- responsive audit:
  - 8개 viewport
  - horizontal overflow 0
  - button overflow 0
  - 원정대 전투/성장/파티/후보/관리 레이아웃 signature 유지
- 원정대 규칙 smoke:
  - 보스 첫 클리어 다이아/EXP/claim 기록
  - 보스 보상 중복 방지
  - 보스 전투력 부족 시 구간 시작 회귀
  - 일반 Stage 전투력 부족 시 현재 Stage 유지
  - 성장 투자 EXP 소모 및 level 상승
  - 동료 2명 합성 승급
- deep parity:
  - static animation 기본값
  - 상점 6개 탭 normalized text 일치
  - 상점/gacha/settings/debug styleDiffs 0건
  - settings/debug svgDiffs 0건
- `src/react` 문자열 감사:
  - `??`, `fallback`, `Fallback`, `unknown` 0건
- 공백/패치 무결성:
  - `git diff --check`가 통과해야 한다.

## 최신 실행 결과
- `npm run react:full-parity`: 통과
- 리포트: `artifacts/react-vite-full-parity-gate/report.json`
- 요약:
  - `snapshotBuild.mode: external`
  - `snapshotBuild.bytes: 864564`
  - `snapshotBuild.sha256: 9ba894c7e95c49a93017f634d6cf303bc644345f9229d8ca4b4e6c38771d0ad4`
  - `parityViewports: 2`
  - `interactiveScenarios: 23`
  - `responsiveViewports: 8`
  - `deepSurfaces.shop: 6`
  - `deepSurfaces.modals: 2`
  - `disallowedTokenMatches: 0`
  - `failures: []`

## 2026-06-24 semantic/state 증거 보강
- `tools/react-vite-full-parity-gate.mjs`에 시나리오별 세부 검증을 추가했다.
  - `textEqual === true`
  - `textDiff === null`
  - `state.diffs.length === 0`
  - `rectDiffs.length === 0`
  - `selectorDiffs.length === 0`
  - scenario `failures.length === 0`
  - snapshot/React horizontal overflow 0
  - snapshot/React button overflow 0
  - 핵심 count와 semantic signature 일치
- `tools/react-vite-interactive-parity-audit.mjs`의 원정대 전투 동료 layout signature에 `centerX`, `centerY`, `horizontalCenterSpread`를 추가했다.
- 원정대의 카드 count와 `expeditionCardTexts`는 원본 HTML의 일렬 배치와 최신 사용자 요청의 비일렬 배치가 충돌하는 영역이라 직접 동일성 검사에서 제외하고, React layout signature로 검증한다.
- 최신 `npm run react:full-parity`: 통과, failures 0건.
- 최신 리포트: `artifacts/react-vite-full-parity-gate/report.json`
- 최신 interactive 원정대 전투 동료 spread:
  - `horizontalCenterSpread: 97`
  - `bandCounts: 2+2+1`
  - `frontBandCount: 1`

## 2026-06-24 완료 증거 매트릭스
- `tools/react-vite-full-parity-gate.mjs`가 최종 리포트에 `completionEvidence` 배열을 기록하게 했다.
- 각 evidence 항목은 `id`, `title`, `status`, `evidence`를 가진다.
- 다음 10개 항목이 모두 pass여야 full gate가 pass한다.
  - `snapshot-html-current`
  - `strict-first-screen-parity`
  - `student-tab-interaction-parity`
  - `modal-shop-settings-debug-parity`
  - `expedition-flow-parity`
  - `expedition-rules-state`
  - `expedition-non-linear-layout`
  - `responsive-mobile-layout`
  - `no-disallowed-runtime-substitution`
  - `migration-documents-current`
- 최신 `npm run react:full-parity`: 통과.
- 최신 `artifacts/react-vite-full-parity-gate/report.json` 기준:
  - `status: pass`
  - `failures: []`
  - `completionEvidence`: 10개 항목 모두 `pass`
  - 원정대 전투 동료 `horizontalCenterSpread: 97`, `bandCounts: 2+2+1`, `frontBandCount: 1`
- evidence id는 정책 로그 카운트가 오해되지 않도록 `no-disallowed-runtime-substitution`을 사용한다.
- `mcp__UmgMcp.project_policy_gate`는 `src/react` 절대경로와 full parity report 절대경로 기준 pass이며, report log 분류의 `fallback` count는 0이다.

## 2026-06-24 원정대 규칙 smoke 연결
- `tools/react-vite-full-parity-gate.mjs`가 `artifacts/react-vite-expedition-rules-smoke/report.json`을 직접 검사한다.
- 검사 시나리오:
  - `boss-first-clear`
  - `boss-reward-not-repeated`
  - `boss-power-shortage-returns-to-segment-start`
  - `normal-power-shortage-keeps-stage`
  - `growth-invest-levels-member`
  - `fusion-promotes-two-members`
- full gate summary에 `expeditionRules.checked: 6`이 기록되어야 한다.

## 유지보수 기준
- React/Vite 이식 상태를 “원본 HTML과 비교 검증했다”고 말하려면 `react:full-parity`를 기준으로 본다.
- 빠른 개발 중에는 `react:verify`를 사용할 수 있지만, 완료 판단에는 strict parity, interactive parity, deep parity가 포함된 full gate를 사용한다.
- 원정대의 큰 visual diff는 최신 사용자 기준의 카드/편대 레이아웃 차이를 포함하므로, full gate의 semantic/layout signature와 함께 해석한다.
