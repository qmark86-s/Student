# React/Vite full parity gate 계획

## 목표
- 원본 HTML과 React/Vite 이식본을 비교하는 핵심 검증을 한 명령으로 묶는다.
- 학생/원정대 탭 조작, 상점/설정/디버그 모달, 첫 화면 strict visual parity, responsive audit, no-fallback 문자열 감사를 모두 현재 워킹트리 기준으로 증명한다.
- 원정대 동료는 최신 사용자 기준인 전투 `2+2+1`, 파티 슬롯 `3+2`, 성장/후보/관리 2열 그리드를 실패 조건으로 고정한다.

## 구현 범위
1. `tools/react-vite-full-parity-gate.mjs`를 추가한다.
2. 게이트는 다음 명령을 순서대로 실행한다.
   - `npm run snapshot:build`
   - `npm run curriculum-vfx:verify`
   - `npm run react:verify`
   - strict `npm run react:parity-audit`
   - `npm run react:interactive-parity`
   - `npm run react:deep-parity`
   - `npm run react:hotspot-crop`
   - `git diff --check`
3. 실행 후 최신 artifact JSON을 읽어 필요한 조건을 다시 검사한다.
4. `src/react`의 `??`, `fallback`, `Fallback`, `unknown` 문자열 0건을 Node 스크립트 내부에서 검사한다.
5. 결과 요약을 `artifacts/react-vite-full-parity-gate/report.json`에 저장한다.
6. `package.json`에 `react:full-parity` 스크립트를 추가한다.

## 검증 기준
- `npm run react:full-parity`
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate`

## 완료 기준
- full parity gate가 failure 0건으로 종료한다.
- interactive parity 23개 시나리오가 모두 존재하고 failure 0건이다.
- interactive parity 각 시나리오의 normalized text, state diffs, rectDiffs, selectorDiffs, button overflow, horizontal overflow가 모두 0 또는 일치 상태여야 한다.
- 학생/모달/디버그/원정대의 active panel 제목, 본문, 버튼 semantic signature가 snapshot/React에서 일치해야 한다.
- 원정대 React layout signature가 전투 `2+2+1`, front 1, 파티 슬롯 `3+2`, 성장 카드 `2+2+1`, 후보/관리 카드 2열 행으로 확인된다.
- 원정대 전투 동료는 세로 spread 52px 이상, 좌우 center spread 94px 이상이어야 한다.
- 원정대 규칙 smoke가 보스 보상, 전투력 부족, 성장 투자, 승급 합성 6개 시나리오를 failure 0건으로 통과해야 한다.
- deep parity가 static animation 기본값으로 실행되고 상점/뽑기/설정/디버그 style/svg failure 0건이다.

## 2026-06-24 구현 결과
- `tools/react-vite-full-parity-gate.mjs`를 추가했다.
- `package.json`에 `react:full-parity` 명령을 추가했다.
- 최신 `npm run react:full-parity`: 통과.
- 결과 리포트는 `artifacts/react-vite-full-parity-gate/report.json`에 저장된다.
- 최신 요약:
  - snapshot dist 빌드 `mode external`, `bytes 864564`, `sha256 9ba894c7e95c49a93017f634d6cf303bc644345f9229d8ca4b4e6c38771d0ad4`
  - strict parity viewport 2개
  - interactive parity 시나리오 23개
  - responsive viewport 8개
  - deep parity shop 6개, modal 2개
  - `src/react` 금지 문자열 match 0건
  - failures 0건

## 2026-06-24 semantic/state 증거 보강
- full gate가 `react:interactive-parity`의 상위 failure만 보지 않고, 23개 시나리오 각각의 `textEqual`, `textDiff`, `state.diffs`, `rectDiffs`, `selectorDiffs`, scenario `failures`, snapshot/React overflow를 직접 재검사한다.
- full gate는 active panel 제목/본문/버튼 semantic signature를 snapshot/React에서 직접 비교한다.
- 원정대 카드 DOM/count와 카드 텍스트 블록은 최신 사용자 요청의 `3+2`, `2+2+1`, 2열 카드 그리드 때문에 원본 HTML의 일렬 배치와 의도적으로 다르다. 따라서 full gate는 이 부분을 원본 count와 직접 비교하지 않고, React layout signature로 검증한다.
- `tools/react-vite-interactive-parity-audit.mjs`는 원정대 전투 동료 rect에 `centerX`, `centerY`, `horizontalCenterSpread`를 기록한다.
- 최신 `npm run react:full-parity`: 통과.
- 최신 interactive 원정대 전투 동료 `horizontalCenterSpread`: `97px`.

## 2026-06-24 완료 증거 매트릭스 보강
- full gate 리포트에 `completionEvidence` 배열을 추가한다.
- `completionEvidence`는 다음 요구사항을 각각 pass/fail로 남긴다.
  - 기존 HTML snapshot 최신 build
  - 첫 화면 strict visual parity
  - 학생 7개 탭 및 DEBUG 이후 학생 동료 탭 조작 parity
  - 상점/설정/디버그 parity
  - 원정대 성장/파티/관리/기록/편성/잠금/합성 조작 parity
  - 원정대 보스 보상/전투력 부족/성장 투자/승급 합성 상태 규칙
  - 원정대 비일렬 레이아웃
  - 8개 viewport 반응형/overflow 기준
  - `src/react` 금지 대체 토큰 0건
  - 계획/구현/마이그레이션 문서 존재
- 완료 판단은 `status: pass`, `failures: []`, `completionEvidence` 전 항목 `status: pass`를 함께 본다.
- 최신 `npm run react:full-parity`: 통과, `completionEvidence` 10개 항목 모두 pass.

## 2026-06-24 원정대 규칙 smoke 연결
- `react:verify`에 `react:expedition-rules-smoke`를 추가했다.
- full gate는 `artifacts/react-vite-expedition-rules-smoke/report.json`을 읽어 `expedition-rules-state` evidence를 기록한다.
- 완료 증거는 원정대 규칙 상태 evidence를 포함한 10개 항목이 모두 pass여야 한다.
