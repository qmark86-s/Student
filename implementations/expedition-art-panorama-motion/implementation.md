# 원정대 원화 파노라마 전투 구현

## 구현일

2026-06-20

## 변경 요약

- `tools/build-visual-assets.mjs`
  - 기존 원화급 도시 배경 `asset-005.png`를 읽어 `visual-expedition-backdrops.png` 파노라마를 생성한다.
  - 파노라마는 3구간으로 구성하고 구간 이음새를 블렌딩한다.
  - `__STUDENT_ASSET_010__`으로 매니페스트와 단일 HTML 주입 흐름에 연결했다.
  - 원정대 배경은 `expedition-arena::before`에서 60초 pan으로 재생된다.
  - 원정대 동료 melee, 적 idle/피격, shock ring, slash, dust burst VFX를 추가했다.

- `tools/verify-visual-assets.mjs`
  - 원정대 파노라마 토큰, metadata, pan keyframe, VFX keyframe 누락 검사를 추가했다.

- `tools/visual-asset-smoke.mjs`
  - 실제 원정대 화면에서 파노라마 data image, pan 이동량, 기존 배경 숨김, 적/동료/VFX 모션을 검증한다.

- `tools/visual-asset-contact-sheet.mjs`
  - 배경 파노라마 preview 섹션을 추가했다.

## 산출물

- `src/snapshot/assets/visual-expedition-backdrops.png`
  - 크기: `5016x540`
  - 생성 기준: 원화급 도시 배경 소스 재조립

## 검증 명령

```powershell
npm run visual:qa
npm run verify:mobile
```
