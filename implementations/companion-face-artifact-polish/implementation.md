# 직업동료 얼굴 아티팩트 폴리싱 구현

## 변경 요약

- `tools/generate-professional-sprite-sources.py`
  - 직업동료 여자 헤어 풀에서 얼굴 옆에 큰 원형 덩어리로 읽히던 스타일을 제거하거나 축소했다.
  - 얼굴 가까이에 생기던 액세서리를 `none`, `pin`, `hair-clip` 중심으로 제한하고 위치를 머리 위쪽으로 옮겼다.
  - media 계열 `headset`은 큰 측면 패드 대신 얇은 헤드밴드와 작은 마이크 선으로 표현한다.
  - `appearanceProfiles`를 manifest에 기록해 생성 규칙을 추적할 수 있게 했다.

- `tools/asset-factory/audit-sprite-integrity.py`
  - 직업동료 face-safe 검사를 추가했다.
  - `round-glasses`, `earpiece`, `small-ribbon`, `star-pin`, 여자 `bun`, `twin-tail`, `pony`가 들어오면 실패한다.

- `tools/visual-asset-contact-sheet.mjs`
  - 자산 수가 많아 컨택트시트가 길어져도 PNG 캡처가 실패하지 않도록 분할 캡처를 지원한다.

## 검수 산출물

- 문제 확대 페이지: `artifacts/visual-asset-samples/professional-zoom-review-page-24.png`
- 전체 얼굴 검수 시트: `artifacts/visual-asset-samples/professional-face-review-page-01.png` ~ `professional-face-review-page-04.png`
- 실제 화면 캡처: `artifacts/live-visual-polish/student-combat.png`, `artifacts/live-visual-polish/expedition-combat.png`

## 검증

- `npm run asset:factory:review`
- `npm run asset:factory:qa`
- `npm run verify:mobile`
- `npm run live:polish`
- `npm run asset:integrity`
- `git diff --check`

위 검증은 모두 통과했다.
