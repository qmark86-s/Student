# 프로젝트 상용 품질 전수검사 구현 설명

## 개요
- 원정대 연구 v1까지 포함한 현재 워킹트리를 상용 릴리즈 전 점검 관점으로 검사했다.
- 공식 전체 게이트와 보조 품질 게이트를 함께 돌리고, 검증 스크립트 자체가 낡아 실패한 항목은 수정했다.

## 수정한 항목
- `tools/live-visual-polish-check.mjs`
  - 기존에는 기본 URL이 dev 서버 `http://127.0.0.1:5173/`라서 `import.meta.env.PROD === false` 상태의 DEBUG UI가 시각 report에 섞일 수 있었다.
  - 기본 실행 시 `dist/`를 자체 정적 서버로 서빙하도록 바꿨다.
  - 외부 URL 검사가 필요하면 `LIVE_POLISH_URL`로 명시할 수 있다.
  - 원정대 탭 이동 selector를 오래된 `.screen-switch`에서 현재 `.mode-tab` 기준으로 고쳤다.

## 통과한 검사
- `npm audit --audit-level=moderate`
- `npm run asset:integrity`
- `npm run asset:factory:doctor`
- `npm run live:polish`
- `npm run visual:sheet`
- `npm run react:smoke`
- `npm run react:verify`
- `npm run verify:mobile`
- `mcp__UmgMcp.project_policy_gate` strict
- `git diff --check`

## 확인한 상용 리스크
- Vite build는 기존처럼 큰 chunk 경고를 낸다. 기능 실패는 아니며 gzip 기준 JS는 smoke에서 정상 로드되지만, 첫 다운로드 최적화가 필요하면 route/modal 단위 code splitting을 별도 차수로 잡는 편이 좋다.
- 원정대/부동산 고해상도 PNG가 제품 인상을 크게 끌어올리는 대신 APK/웹 자산 크기를 키운다. 현재 검증은 통과하지만, 출시 채널별 용량 목표를 정하면 WebP/AVIF 변환 또는 lazy loading 정책을 별도 판단해야 한다.
- DEBUG 도구는 production 기본 smoke에서 노출 0건이다. 다만 production에서도 `?qaTools=1` 또는 `student-react-qa-tools-v1=1` localStorage가 있으면 의도적으로 열리므로, 실제 배포 빌드/웹뷰 초기 상태에는 QA 플래그를 남기지 않아야 한다.
- Android release 서명/스토어 업로드 검증은 로컬 웹/Capacitor 검증 범위를 넘는다. 출시 직전에는 `npm run android:doctor`와 release build/signing 검증이 별도로 필요하다.

## 산출물
- 시각 polish report: `artifacts/live-visual-polish/report.json`
- contact sheet: `artifacts/visual-asset-contact-sheet/index.html`
- sprite integrity report: `artifacts/visual-asset-samples/sprite-integrity-report.json`
