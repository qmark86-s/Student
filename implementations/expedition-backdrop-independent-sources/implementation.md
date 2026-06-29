# 원정대 독립 배경 원본 구현

## 개요
- 원정대 챕터 배경을 단일 원본 파생 구조에서 10개 챕터 x 10개 독립 생성형 source PNG 구조로 전환했다.
- source 100개는 `assets/visual-source/expedition-backdrops/<theme>/source-00..09.png`에 저장한다.
- 빌더는 source를 자동 생성하거나 조용히 fallback하지 않는다. 누락, 런타임 tile 복사본, 저품질 소형 PNG는 빌드 실패로 드러낸다.
- runtime tile은 챕터별 source 10장을 overlap blend한 chapter panorama에서 잘라 만든다.

## 변경 사항
- `assets/visual-source/expedition-backdrops/`
  - 10개 챕터 x 10개 source PNG를 실제 생성형 원본으로 채웠다.
  - 기존에 섞여 있던 플랫 절차형 source와 `5016x540` runtime tile 형태 source는 고품질 원본으로 교체했다.
- `tools/build-visual-assets.mjs`
  - `ensureExpeditionBackdropSourceSet()`가 source를 생성하지 않고 검증만 수행한다.
  - source 기준은 `width >= 1600`, `height >= 650`, aspect `2.2~3.4`, 최소 500KB 이상, runtime tile 크기 아님이다.
  - `buildExpeditionChapterPanorama()`로 챕터별 source를 세로 기준으로 맞추고 180~280px overlap blend한다.
  - `drawExpeditionBackdropPanoramaTile()`로 chapter panorama에서 `visual-expedition-backdrop-<theme>-00..09.png`를 잘라낸다.
  - metadata에 `sourceMode: "chapter-panorama"`를 기록한다.
- `tools/verify-visual-assets.mjs`
  - 100개 source 파일, 100개 runtime tile, `derived: false`, `sourceMode: "chapter-panorama"`를 검사한다.
  - source가 너무 작거나, aspect가 원본 규격에서 벗어나거나, runtime tile 크기와 같으면 실패한다.
- `src/react/App.jsx`, `src/react/styles.css`
  - Stage 이동 중 이전/다음 배경 layer를 동시에 렌더링해 tile 또는 챕터가 바뀌는 순간을 crossfade한다.
  - background는 `auto 100%`로 세로에 맞춰 표시하고, `background-position`만 이동한다.
  - Stage당 이동 거리는 `80px`, route tile 교체 주기는 `25 Stage`다. 모바일 화면에서 한 tile이 반복되기 전에 다음 route segment로 넘어가게 하기 위한 상용 품질 기준이다.
- `tools/expedition-backdrop-viewport-audit.mjs`
  - React 상수와 visual metadata가 `80px/25 Stage` 기준을 유지하는지 검사한다.
  - 대표 모바일 arena에서 한 tile 내부 누적 이동량이 렌더 폭을 넘지 않는지 검사한다.
  - route tile 간 시각 다양도와 smoke 캡처 존재 여부를 report로 남긴다.

## 검증 기록
- `node tools/build-visual-assets.mjs`: 통과.
- `node tools/verify-visual-assets.mjs`: 통과.
- `npm run visual:smoke`: 통과. 원정대 화면 캡처 `artifacts/visual-asset-smoke/expedition.png` 확인.
- `npm run react:build`: 통과.
- `npm run react:expedition-smoke`: 통과.
- `npm run expedition:backdrop-audit`: 통과.
- `npm run visual:verify`: 통과.
- `npm run react:verify`: 통과.
- `git diff --check`: 공백 오류 없음. PowerShell/Git 줄바꿈 변환 경고만 확인.

## 유지보수 기준
- 새 원정대 배경 source는 반드시 `assets/visual-source/expedition-backdrops/<theme>/source-XX.png`에 원본 규격 PNG로 넣는다.
- `src/snapshot/assets/visual-expedition-backdrop-*.png`는 runtime 산출물이므로 source 폴더에 복사하면 안 된다.
- source가 누락되면 빌드가 실패해야 정상이다. 임시 생성, legacy source, 공용 asset fallback으로 조용히 대체하지 않는다.
- 배경 전체 PNG에서 랜드마크가 반복되어 보여도 실제 게임은 crop 이동으로 보여준다. 실제 품질 판단은 대표 runtime tile, `expedition:backdrop-audit`, 화면 캡처를 같이 본다.
