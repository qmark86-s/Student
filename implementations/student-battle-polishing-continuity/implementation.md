# 학생탭 배경/전투/스프라이트 폴리싱 구현서

## 개요

학생탭 전투 화면의 배경 끊김, 바닥 레인 불명확, 긴 공격 전진, 학생 스프라이트 프레임 스케일 흔들림을 정리했다. 기존 Battle Road와 Asset Sprite Factory 파이프라인을 확장했고, 런타임 fallback은 추가하지 않았다.

## 주요 변경

### 배경 파노라마

- `tools/build-visual-assets.mjs`
  - `buildBattleRoadBackdropAtlas()`가 3구간 `원본 -> 반전 -> 오프셋 원본` 대신 4구간 `원본 -> 반전 -> 원본 -> 반전` 루프를 만든다.
  - 배경 폭은 5016px에서 6688px로 늘어났다.
  - `battleRoadBackdropRows`에 학년군별 `sourceOffsetX`를 둬 시작 화면이 책장 전경이 아니라 바닥/칠판 중심으로 보이게 했다.
  - 원본 행 사이의 얇은 구분선이 보이지 않도록 세로 인셋을 적용했다.
- `data/battle_road_config.json`
  - `presentation.backdrop.panWidthPercent`, `panLoopPercent`, `panDurationSec`로 CSS 파노라마 폭과 루프 이동량을 관리한다.
  - road phase별 `::before` animation-duration override를 제거해 phase 전환 시 배경이 리셋되지 않는다.

### 학생 위치와 공격 거리

- `data/battle_road_config.json`
  - `presentation.studentDisplay.scaleMultiplier=0.8`을 추가했다.
  - 학생/도우미 발 기준선 위치를 `studentDisplay.*BottomPercent`로 관리한다.
  - `presentation.studentAttack`으로 공격 전진량과 VFX 이동량을 관리한다.
- `tools/build-visual-assets.mjs`
  - 학생 transform은 `--student-motion-scale = --student-scale * --student-display-scale`을 사용한다.
  - `studentCombatLoop`의 공격 최대 전진은 config 기본값 `dashPx=25`를 사용한다.
  - 기존 장거리 값 `76px`, `84px`가 다시 들어오면 `tools/verify-visual-assets.mjs`가 실패한다.

### 몬스터 슬롯

- `data/battle_road_config.json`
  - `presentation.enemySlots.school`, `suneungSingle`, `suneungPair`를 추가했다.
- `tools/apply-battle-road-patch.mjs`
  - `battleSceneLineup()`이 슬롯 배열을 하드코딩하지 않고 config 값을 읽는다.

### 스프라이트 전수검사

- `data/sprite_reference_lock.json`
  - 학생 `maxSolidHeightDrift`를 10px에서 6px로 강화했다.
- `tools/asset-factory/summarize-character-report.mjs`
  - 레퍼런스락의 학생 기준을 읽어 요약 리포트 실패 기준으로 사용한다.
- `tools/asset-factory/audit-sprite-integrity.py`
  - 학생 프레임 그룹 높이 흔들림도 레퍼런스락 기준을 사용한다.
- `tools/prepare-character-sprites.py`, `tools/prepare-professional-sprites.py`
  - 형광 녹색 매트 제거 조건을 조정해 어두운 머리/윤곽 픽셀을 지우지 않게 했다.
  - 최종 알파를 안정화해 반투명 가장자리 때문에 한 프레임만 작아 보이는 문제를 줄였다.
  - alpha 10 이하 녹색 편향 찌꺼기는 제거해 matte leak 0건을 유지한다.
- `data/sprite_style_profiles.json`
  - 원정대 몬스터에 `heightOnlyEqualize`를 켜서 4프레임 높이 흔들림을 제거했다.
- `data/visual_asset_quality_gates.json`
  - 원정대 몬스터 SD 실루엣이 커진 것을 반영해 enemies `maxCoverage`를 0.60으로 조정했다.

## 검증 결과

마지막 검증 명령:

```powershell
npm run asset:factory:review
npm run visual:verify
npm run visual:smoke
npm run verify:mobile
```

통과 결과:

- 학생 32종 전수검사 통과
- 학생 최대 solid height drift: 3px
- 학생 중심축 최대 편차: 0.5px
- 학생 발 기준선 편차: 0px
- sprite integrity matte leak: 0건
- 직업동료/원정대 몬스터 전수검사 통과
- `visual:verify` 통과
- `visual:smoke` 통과
- `verify:mobile` 통과

주요 확인 스크린샷:

- `artifacts/visual-asset-smoke/main-battle.png`
- `artifacts/visual-asset-smoke/main-battle-combat-wait-8s.png`
- `artifacts/visual-asset-smoke/expedition.png`

## 조정 방법

- 학생 공격 거리를 더 줄이거나 늘릴 때:
  - `data/battle_road_config.json`의 `presentation.studentAttack.dashPx`, `slashPx`, `dustPx`를 조정한다.
  - 변경 후 `npm run visual:build && npm run visual:smoke`를 실행한다.
- 학생/도우미 위치가 떠 보일 때:
  - `presentation.studentDisplay.*BottomPercent` 값을 조정한다.
- 배경 이동이 너무 빠르거나 느릴 때:
  - `presentation.backdrop.panDurationSec`를 조정한다.
- 배경 시작 지점이 가구 위처럼 보일 때:
  - `tools/build-visual-assets.mjs`의 `battleRoadBackdropRows[].sourceOffsetX`를 조정한다.
  - 시작 구간은 학생 발이 바닥 레인 위에 보이는 원화 구간을 선택한다.

## 주의점

- `visual:build`만 실행하면 최종 단일 HTML 산출물은 갱신되지 않는다. 웹 미리보기, 파일 확인용 `index.html`, smoke에서 최신 화면을 보려면 `npm run build:web` 또는 `npm run verify:mobile`을 실행한다.
- 학생탭 배경 phase별 `animation-duration` override를 다시 넣으면 같은 학년 안에서도 배경 위치가 튈 수 있다.
- 스프라이트 누끼 보정은 녹색 매트만 제거해야 한다. 어두운 머리/윤곽을 녹색 shadow로 오판하면 프레임 높이와 얼굴 품질이 동시에 무너진다.
