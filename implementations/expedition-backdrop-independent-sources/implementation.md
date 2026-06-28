# 원정대 독립 배경 원본 구현

## 개요
- 원정대 챕터 배경을 단일 원본 파생 구조가 아니라 챕터별 10개 독립 원본 PNG 기반으로 빌드하도록 정리했다.
- `source-00.png`는 정상 원본이면 보존하고, 누락되었거나 런타임 타일 크기로 잘못 들어온 `source-01.png`~`source-09.png`는 빌드 단계에서 원본 규격 PNG로 재생성한다.
- `visual:verify`가 100개 source 파일, metadata의 `chapter-panorama`, `derived: false`, 원본 치수/비율을 모두 검사한다.

## 변경 사항
- `tools/build-visual-assets.mjs`
  - `ensureExpeditionBackdropSourceSet()`를 추가했다.
  - 빌드 전 `assets/visual-source/expedition-backdrops/<theme>/source-00..09.png`를 검사한다.
  - 정상 source 기준은 `width >= 1600`, `height >= 650`, `aspect 2.2~3.4`, 런타임 타일 크기 아님이다.
  - 비정상 source는 기존 원정대 배경 드로잉 함수로 같은 챕터 원본 규격에 맞춰 재생성한다.
- `tools/verify-visual-assets.mjs`
  - 원정대 배경이 `chapter-panorama`로 만들어졌는지 확인한다.
  - 모든 tile이 독립 source에서 왔고 `derived: false`인지 확인한다.
  - 100개 source 파일의 치수와 비율을 검사한다.
- `assets/visual-source/expedition-backdrops/`
  - 10개 챕터 x 10개 source 원본을 갖는다.
  - `shelter`의 기존 독립 원본은 유지했고, 잘못 복사된 런타임 타일 source는 원본 규격으로 교체했다.

## 검증
- `npm run visual:build` 통과.
- `npm run visual:verify` 통과.
- `npm run react:build` 통과.
- `npm run react:expedition-smoke` 통과.
- `npm run visual:smoke` 통과.
- `npm run react:verify` 통과.
- `npm run verify:mobile` 통과.
- `rg -n "fallback|Fallback|unknown" src/react -S` 출력 없음.

## 유지보수 기준
- 원정대 배경 source를 추가하거나 교체할 때는 `assets/visual-source/expedition-backdrops/<theme>/source-XX.png`에 원본 규격 파일을 넣는다.
- 런타임 산출물인 `src/snapshot/assets/visual-expedition-backdrop-*.png`를 source 폴더에 복사하면 검증에서 실패해야 한다.
- 정상 source 10장이 모두 있을 때만 해당 챕터는 `chapter-panorama` 모드로 빌드된다.
