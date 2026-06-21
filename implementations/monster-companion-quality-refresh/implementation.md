# 몬스터/직업동료 품질 리프레시 구현 설명

## 목적

원정대 직업동료, 학습도우미, 원정대 몬스터를 레퍼런스 이미지의 귀여운 SD 피규어 톤에 맞게 개선했다. 핵심은 단순히 아틀라스 이미지를 바꾸는 것이 아니라, 같은 결과를 다시 만들 수 있는 deterministic 자산 팩토리와 검수 기준을 함께 강화하는 것이다.

## 변경 요약

- `tools/generate-professional-sprite-sources.py`
  - 직업동료/학습도우미가 `student-16` 한 쌍만 쓰던 구조에서 여러 SD 학생 베이스를 직업 id와 성별 기준으로 결정 선택하는 구조로 변경했다.
  - 헤어/악세서리/의상/손소품 변형을 추가했다. 얼굴 중앙을 덮지 않도록 헤어 보정은 최소화하고, 직업 가독성은 모자, 의상, 소품, 색상으로 확보한다.
  - 원정대 몬스터를 긴 팔다리형 사각 몬스터에서 노트, 폴더, 타이머, 모니터, 차트, 여권, 회로, 산봉우리 motif의 피규어형 오브젝트 몬스터로 다시 그렸다.
  - 몬스터의 외부 소품을 줄이고 몸통 motif 밀도를 높여 정규화 후 실제 화면에서 작아지는 문제를 막았다.

- `tools/prepare-professional-sprites.py`
  - bbox width/height, top/bottom/left/right margin을 리포트에 추가했다.
  - 원본 4프레임과 정규화 4프레임을 2배 확대 비교하는 `zoomSheet`를 항목별로 생성한다.

- `tools/asset-factory/make-character-review-sheet.py`
  - `--sheet-key` 옵션을 추가해 `axisSheet`와 `zoomSheet`를 같은 페이지 패커로 묶을 수 있게 했다.

- `tools/asset-factory/run.mjs`
  - `asset:factory:prepare`, `review`, `qa`, `doctor`에 `professional-zoom-review-page-*.png` 생성을 연결했다.

- `tools/asset-factory/summarize-professional-report.mjs`
  - 프레임별 solid/bbox width/height drift와 상하 여백을 실패 기준에 포함했다.

- `tools/asset-factory/audit-sprite-integrity.py`
  - 프레임 그룹별 solid width/height drift 요약을 `sprite-integrity-report.json`에 남긴다.

## 검수 기준

- 직업동료/학습도우미는 `direction: "right"`를 유지한다.
- 원정대 몬스터는 `direction: "left"`를 유지한다.
- 모든 정규화 프레임은 160x160 셀, `centerX=80`, `baselineY=151`, 상하 alpha 여백 8px 이상을 유지한다.
- `professional-axis-review-page-*.png`에서 축/방향/포즈를 확인한다.
- `professional-zoom-review-page-*.png`에서 원본과 정규화 4프레임의 잘림, 누끼, 스케일 튐을 확인한다.
- 원정대 실화면 smoke에서 유닛과 몬스터 클리핑은 0건이어야 한다.

## 주요 검증 결과

- `npm run asset:factory:review`
  - professional items 190/190 통과
  - companions `minPoseDelta=9.446`, `minTopMargin=9`, `minBottomMargin=9`
  - expeditionEnemies `minPoseDelta=4.605`, `minTopMargin=9`, `minBottomMargin=9`
- `npm run asset:integrity`
  - 888 frames 통과
- `npm run visual:smoke`
  - 원정대 `unitClipCount=0`
  - 원정대 enemy sprite L/R/T/B clipping 0
  - `enemyFrameSnapMaxError=0`, `unitFrameSnapMaxError=0`
- `npm run verify:mobile`
  - `VISUAL_ASSET_AUDIT_OK atlases=5 cells=463`
  - `MOBILE_SMOKE_OK`
  - `VISUAL_ASSET_SMOKE_OK`
  - `CAREER_OUTCOME_SMOKE_OK rankedButtons=62 enabledButtons=62`
  - `RETAKE_YEAR_SMOKE_OK`

## 다음 Agent 참고

이 작업의 기준은 repo-local `asset-sprite-factory` Skill에 반영했고, `npm run asset:factory:install-skill`로 로컬 Codex Skill에도 설치했다. 직업동료 또는 원정대 몬스터를 다시 손볼 때는 원본 PNG를 직접 편집하기보다 `tools/generate-professional-sprite-sources.py`의 deterministic 레시피를 고친 뒤 `npm run asset:factory:prepare`를 실행한다.
