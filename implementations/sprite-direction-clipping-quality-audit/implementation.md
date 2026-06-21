# 스프라이트 방향/클리핑/품질 전수 검수 구현

## 배경

원정대 화면에서 적이 반쯤 잘린 것처럼 보이는 현상이 있었다. DOM에는 적이 1개만 있었고, 원인은 CSS `background-position` 키프레임이 퍼센트 값을 중간 보간하면서 아틀라스 옆 프레임을 샘플링한 것이었다.

또한 기존 검수는 셀 가장자리에 닿지만 않으면 통과했기 때문에, 머리와 발이 상하로 너무 붙어 보이는 프레임을 놓칠 수 있었다.

## 변경 사항

- `tools/build-visual-assets.mjs`
  - 원정대 동료/몬스터와 학습도우미 스프라이트 키프레임을 `step-end`와 분절된 퍼센트 구간으로 변경했다.
  - 프레임 전환 중 `background-position`이 A/B/C/D 사이 중간값으로 보간되지 않게 했다.

- `tools/visual-asset-smoke.mjs`
  - 원정대 동료/몬스터의 현재 `background-position`이 선언된 프레임 좌표 중 하나인지 검사한다.
  - `enemyFrameSnapMaxError`, `unitFrameSnapMaxError`가 0.05%를 넘으면 실패한다.

- `tools/generate-professional-sprite-sources.py`
  - 원정대 몬스터 `variant`별 몸통 비율, 장식, 소품 위치를 다르게 만들어 같은 톤의 mob-1/2/3이 구분되게 했다.
  - 원정대 몬스터 manifest 기준선을 `baselineY=151`로 생성한다.

- `tools/prepare-character-sprites.py`, `tools/prepare-professional-sprites.py`
  - 초록 matte 제거 후 다시 `reanchor_to_axis`를 수행해 기준선이 흔들리지 않게 했다.
  - 낮은 알파의 어두운 초록 key shadow까지 제거하도록 누끼 기준을 강화했다.

- `tools/asset-factory/audit-sprite-integrity.py`
  - 전체 정규화 프레임에 상단/하단 alpha 여백 8px 이상을 요구한다.
  - 낮은 알파 초록 matte leak도 실패로 잡는다.

- 기준 데이터/문서
  - 학생/동료/몬스터 기준선을 `centerX=80`, `baselineY=151`로 맞췄다.
  - `data/sprite_style_profiles.json` 학생 출력 높이를 `heightOnlyTarget=139`, `maxOutputHeight=143`으로 낮춰 상하 여백을 확보했다.
  - `docs/asset_sprite_factory.md`, `docs/visual_asset_production.md`, `data/sprite_reference_lock.json`에 상하 여백 기준을 반영했다.

## 검증 기준

- 학생/동료/학습도우미는 `direction: right`, 원정대 몬스터는 `direction: left`.
- 모든 정규화 PNG 프레임은 160x160 셀 안에서 상단/하단 8px 이상 여백을 가져야 한다.
- 모든 프레임은 기준선 편차 0px이어야 한다.
- 원정대 실제 화면에서 동료/몬스터 클리핑 0, 수평 오버플로 0, 프레임 스냅 오차 0이어야 한다.

## 검증 명령

```powershell
npm run asset:factory:review
npm run visual:smoke
npm run verify:mobile
```

## 주요 산출물

- `artifacts/visual-asset-samples/character-axis-review-page-*.png`
- `artifacts/visual-asset-samples/professional-axis-review-page-*.png`
- `artifacts/visual-asset-samples/sprite-integrity-report.json`
- `artifacts/visual-asset-smoke/main-battle.png`
- `artifacts/visual-asset-smoke/expedition.png`
- `artifacts/visual-asset-smoke/expedition-companion-probe.png`
