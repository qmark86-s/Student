# 원정대 원화 파노라마 전투 구현

## 구현일

2026-06-20

## 변경 요약

- `tools/build-visual-assets.mjs`
  - 생성형 PNG 원본 `assets/visual-source/expedition-backdrops/<theme>/source-00.png`를 읽어 원정대용 긴 파노라마 route tile을 생성한다.
  - 최신 기준에서는 챕터 1~10이 같은 배경을 공유하지 않도록 챕터별 10개, 총 `visual-expedition-backdrop-{theme}-{00..09}.png` 100장을 생성한다.
  - 각 tile은 같은 도로 폭과 수평선/바닥 구도를 유지하며, 쉼터/원룸촌/상권/회사/오피스/자산/국가/글로벌/미래/정상 콘셉트가 시간대와 구조물까지 다르게 드러나게 한다.
  - 기존 호환용 `visual-expedition-backdrops.png`는 `__STUDENT_ASSET_010__` 토큰으로 유지하며, 현재는 챕터 1 `shelter` tile 00과 같은 기본 배경 역할을 한다.
  - 원정대 배경은 React가 현재 Stage의 tile PNG를 `--expedition-bg-image`로 주입하고, CSS fallback은 호환용 PNG를 참조한다.
  - 원정대 동료 melee, 적 idle/피격, shock ring, slash, dust burst VFX를 추가했다.

- `tools/verify-visual-assets.mjs`
  - 원정대 파노라마 토큰, 챕터별 배경 metadata, 개별 PNG 파일 존재/크기, pan keyframe, VFX keyframe 누락 검사를 추가했다.

- `tools/visual-asset-smoke.mjs`
  - 실제 원정대 화면에서 배경 이미지, pan 이동량, 기존 배경 숨김, 적/동료/VFX 모션을 검증한다.

- `tools/visual-asset-contact-sheet.mjs`
  - 배경 파노라마 preview 섹션에서 원정대 챕터 배경과 route tile을 확인한다.

## 산출물

- `src/snapshot/assets/visual-expedition-backdrops.png`
  - 크기: `5016x540`
  - 생성 기준: 챕터 1 shelter tile 00 호환용 기본 배경
- `src/snapshot/assets/visual-expedition-backdrop-*-*.png`
  - 개수: 100개
  - 크기: 각 `5016x540`
  - 생성 기준: 같은 도로 폭을 유지한 챕터별 1000 Stage route tile 배경

## 검증 명령

```powershell
npm run visual:qa
npm run verify:mobile
```
