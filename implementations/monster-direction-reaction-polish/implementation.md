# 몬스터 방향/피격/HP바 및 레퍼런스 컷아웃 폴리싱 구현 기록

## 요약

학생탭 메인 몬스터를 기존 styleboard crop/flood-fill 방식에서 `character-ref-cute-sd.png` 레퍼런스 컷아웃 기반으로 교체했다. 형광 녹색 소스 시트를 별도로 만들고, 최종 `asset-003.png`에는 녹색 잔여 픽셀이 남지 않도록 감사 기준을 추가했다.

## 주요 변경

- `tools/generate-main-monster-sources.py`
  - `assets/reference/character-ref-cute-sd.png` 우측 몬스터 16종을 한 개씩 crop한다.
  - OpenCV GrabCut으로 흰 종이, 스티커판, OMR 같은 밝은 몸통을 보존하면서 배경을 제거한다.
  - 작은 분리 조각을 제거하고, 레퍼런스 방향을 유지해 이전 출력 대비 좌우대칭된 현재 기준이 학생 쪽(`<-`)을 향하게 한다.
  - `assets/visual-source/main-monsters/main-monsters-green.png`를 생성한다.
  - `artifacts/visual-asset-samples/reference-main-monster-cutouts-preview.png`를 생성해 눈검수할 수 있게 했다.
- `tools/build-visual-assets.mjs`
  - 메인 몬스터 아틀라스는 `main-monsters-green.png`만 사용한다.
  - 녹색 소스가 없거나 크기가 맞지 않으면 빌드 실패로 드러낸다.
  - 학생탭 몬스터 피격 반응은 큰 흔들림 대신 약한 림라이트/엣지 스파클 중심으로 축소했다.
  - 보스/수능 HP바 크기는 `data/battle_road_config.json`의 `presentation.enemyHpBar`로 관리한다.
- `data/visual_asset_quality_gates.json`
  - `mainMonsters.maxCoverage`를 레퍼런스 컷아웃 밀도에 맞춰 조정했다.
  - `mainMonsters.maxChromaKeyResidue: 0`을 추가했다.
- `tools/visual-asset-audit.mjs`
  - 셀 경계 여백과 형광 녹색 잔여 픽셀을 검사한다.
- `tools/verify-visual-assets.mjs`
  - `visual:build`가 메인 몬스터 녹색 소스 생성기를 호출하는지 확인한다.

## 검수 포인트

- 컷아웃 preview: `artifacts/visual-asset-samples/reference-main-monster-cutouts-preview.png`
- 녹색 소스/최종 alpha 비교: `artifacts/visual-asset-samples/main-monster-green-source-vs-final.png`
- 실제 학생탭 화면: `artifacts/visual-asset-smoke/main-battle.png`

## 검증

- `npm run asset:factory:prepare`
- `npm run asset:factory:qa`
- `npm run verify:mobile`
- `npm run visual:build`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run build:web`

최종 `visual:smoke` 기준:

- 학생탭 몬스터 클리핑: 0건
- 일반 몬스터 최소 표시 크기: 72x72px
- 보스/수능 몬스터 최소 표시 크기: 92x92px
- 보스/수능 HP바 최소 크기: 96x12px
- `asset-003.png` 형광 녹색 잔여: 0px
- 메인 몬스터 셀 최소 경계 여백: 5px

## 주의

- 메인 몬스터 crop은 한 몬스터씩만 잡는다. 주변 반쪽 소품, 배경선, 다른 몬스터 일부를 포함하면 출시 품질 실패다.
- 방향을 바꿀 때는 런타임 CSS가 아니라 `tools/generate-main-monster-sources.py`의 cutout orientation을 바꾸고 `reference-main-monster-cutouts-preview.png`, `main-monster-green-source-vs-final.png`, `visual-asset-smoke/main-battle.png`를 함께 확인한다.
- 흰 종이 계열 몸통이 투명해지는 경우 flood-fill로 해결하지 말고 GrabCut rect/crop 좌표와 component pruning 기준을 조정한다.
- 학생탭 몬스터는 원정대 몬스터처럼 4프레임 시트가 아니라, `asset-003.png` 정적 컷아웃에 전투장 transform/VFX를 적용하는 구조다.
