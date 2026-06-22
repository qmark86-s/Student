# 전투화면 레이아웃 폴리싱 구현서

## 개요

학생탭 Battle Road에서 전투가 이미 진행되어 적이 피해를 받았는데도 화면 표시 phase가 `travel`로 남아 학생과 도우미가 계속 달리는 문제를 수정했다. 이후 사용자가 제공한 기준 이미지에 맞춰 전투장 외부 조작줄을 제거하고, 진행 바와 `Auto`/`DEBUG` 조작을 arena 내부 오버레이로 재배치했다. 후속 레이아웃 요청에서는 학생탭 arena를 더 아래로 내려 전투 화면을 확보하고, 원정대탭도 학생탭과 같은 scene/arena/관리 패널 기준선으로 정리했다. 마지막 폴리싱에서는 전투장 상하 padding을 6px로 맞추고, 원정대 5명 편성/다수 몬스터가 길가 오브젝트 위로 떠 보이지 않도록 크리처 발 기준선을 살짝 낮췄다.

## 변경 내용

- `data/battle_road_config.json`
  - `presentation.phasePolicy.damageStartsCombat`을 추가했다.
  - 적이 피해를 받거나 처치되면 표시 phase를 `combat`으로 전환한다.
  - help 텍스트는 한글로 작성했다.
- `tools/apply-battle-road-patch.mjs`
  - `battleRoadVisualPhase(battle)` 헬퍼를 추가했다.
  - 시간 기준 travel/approach/combat 계산은 유지하되, 피해/처치 감지 시 `combat`을 우선한다.
  - `ca()`의 `road-*` class와 `battleSceneLineup()`의 `data-road-phase`가 동일한 헬퍼를 사용한다.
  - `scene-controls` 렌더링을 제거하고, `battle-arena-overlay` 내부에 제한시간 progress와 `Auto` 버튼을 렌더링한다.
  - 개발용 전투 완료 기능은 `battle-debug-complete` / `DEBUG` 오버레이 버튼으로 유지한다.
  - 결과 버튼은 전투 화면에서 제거하고 결과 탭 흐름으로 분리했다.
- `src/snapshot/styles.css`
  - 학생탭 `.game-layout` 첫 행을 콘텐츠 높이 기반으로 바꾸어 전투장이 화면을 과하게 차지하지 않게 했다.
  - `.stage-scene`의 HUD는 숨기고, `.pixel-arena` 높이는 모바일 기준 `clamp()`로 226-250px 근처에 고정한다.
  - 전투 화면이 좁아 보인다는 후속 피드백을 반영해 390x620에서는 186px에서 211px로, 390x844에서는 212px에서 242px로 키웠다.
  - 최종 레이아웃 피드백을 반영해 390x620에서는 226px, 390x844에서는 250px까지 다시 확장했다.
  - `battle-arena-progress`, `battle-auto-toggle`, `battle-debug-complete` 오버레이 스타일을 추가했다.
  - 원정대탭 `.expedition-scene`과 `.expedition-arena`를 학생탭과 같은 높이 기준으로 맞췄다.
  - `.expedition-scene-hud`, `.expedition-reward-strip`, `.expedition-scene-tags`를 숨겨 X 표시 대상 정보를 scene에서 제거했다.
  - `.expedition-scene-footer`를 arena 내부 하단 overlay로 바꿔 progress와 `돌파`/`편성 필요` 버튼을 학생탭의 progress/Auto 배치와 맞췄다.
  - 원정대 하단 버튼은 78px 컬럼 안에 고정하고 disabled 상태에서는 아이콘을 숨겨 360px 폭에서도 넘치지 않게 했다.
  - 최종 override에서 `.stage-scene`/`.expedition-scene` 하단 padding을 6px로 맞춰 arena를 위로 밀지 않고 관리 패널을 아래로 내렸다.
  - 원정대 크리처는 `.expedition-party-visual`/`.expedition-enemy-group` `bottom:21%`, 단일 `.expedition-enemy-visual` `bottom:26%`, 보스 `bottom:19%`로 맞췄다.
- `tools/build-visual-assets.mjs`
  - `src/snapshot/visual-assets.css` 재생성 시에도 같은 원정대 크리처 위치가 유지되도록 원본 CSS 생성 값을 갱신했다.
- `tools/validate-battle-road-config.mjs`
  - `presentation.phasePolicy.damageStartsCombat`이 boolean인지 검증한다.
- `tools/visual-asset-smoke.mjs`
  - 피해 발생 이후 phase가 `travel`로 남지 않는지 검사한다.
  - 피해 이후 학생 애니메이션이 `studentCombatLoop`이고 arena가 `road-combat`인지 확인한다.
- `tools/live-visual-polish-check.mjs`
  - 피해 이후에도 `roadPhase`가 `travel`이면 노트로 남겨 화면 감사에서 바로 보이게 했다.
- `tools/retake-year-smoke.mjs`
  - `Auto`/`DEBUG` 오버레이를 새 셀렉터로 클릭/검증한다.
  - 전투 화면에 `자동 분배`, `수동 분배`, `전투 완료` 문구가 남지 않는지 확인한다.
  - 수능 완료 후 결과 탭의 `.panel.decision`에서 결과와 직업 선택을 확인한다.
- 빌드 산출물
  - `src/snapshot/app.bundle.js`, `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 재생성했다.

## 화면 확인

- `npm run preview`로 `http://127.0.0.1:5173/`를 띄워 현재 화면을 확인했다.
- in-app Browser skill은 `node_repl/js` 실행 오류로 사용할 수 없어 프로젝트 Playwright 스크립트와 `view_image`로 대체 확인했다.
- 360x780, 390x844, 430x880에서 travel 샘플과 피해 이후 샘플을 직접 캡처했다.
- 2차 레이아웃은 390x620, 390x844, 360x780에서 직접 캡처했다.
- 3차 통합 레이아웃은 390x620, 390x844, 360x780에서 학생탭/원정대탭을 같은 조건으로 직접 캡처했다.
- 감사 산출물:
  - `artifacts/battle-layout-polish-audit/metrics.json`
  - `artifacts/battle-layout-polish-audit/*-travel.png`
  - `artifacts/battle-layout-polish-audit/*-damage.png`
  - `artifacts/visual-asset-smoke/main-battle.png`
  - `artifacts/battle-screen-layout-polish/mobile-620-expanded.png`
  - `artifacts/battle-screen-layout-polish/mobile-844-expanded.png`
  - `artifacts/battle-screen-layout-polish/mobile-360-expanded.png`
  - `artifacts/battle-screen-layout-polish/student-layout-unified-390-844.png`
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-390-844.png`
  - `artifacts/battle-screen-layout-polish/student-layout-unified-390-620.png`
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-390-620.png`
  - `artifacts/battle-screen-layout-polish/student-layout-unified-360-780.png`
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-360-780.png`
  - `artifacts/battle-screen-layout-polish/student-padding-polish-390-844.png`
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-390-844.png`
  - `artifacts/battle-screen-layout-polish/student-padding-polish-390-620.png`
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-390-620.png`
  - `artifacts/battle-screen-layout-polish/student-padding-polish-360-780.png`
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-360-780.png`

## 검증 결과

```powershell
npm run battle-road:verify
npm run visual:verify
npm run visual:smoke
npm run live:polish
npm run mobile:smoke
npm run retake:smoke
npm run verify:mobile
git diff --check
```

모두 통과했다.

직접 감사 결과:

- 피해 이후 `data-road-phase`: `combat`
- 피해 이후 학생 애니메이션: `studentCombatLoop`
- 피해 이후 arena 상태: `road-combat`
- 360x780, 390x844, 430x880 피해 샘플 클리핑: 0건
- 360x780, 390x844, 430x880 가로 오버플로: 0px
- 최종 390x620 학생탭 레이아웃 샘플: scene `bottom=372`, arena `y=140`, `height=226`, `bottom=366`, management `y=372`
- 최종 390x620 원정대탭 레이아웃 샘플: scene `bottom=372`, arena `y=140`, `height=226`, `bottom=366`, management `y=372`
- 최종 390x844 학생탭 레이아웃 샘플: scene `bottom=396`, arena `y=140`, `height=250`, `bottom=390`, management `y=396`
- 최종 390x844 원정대탭 레이아웃 샘플: scene `bottom=396`, arena `y=140`, `height=250`, `bottom=390`, management `y=396`
- 최종 360x780 학생탭/원정대탭 레이아웃 샘플: scene `bottom=380`, arena `height=234`, `bottom=374`, management `y=380`
- scene top padding과 bottom padding: 390x844, 390x620, 360x780 모두 `6px/6px`
- 원정대 5명 편성 probe 기준 크리처와 footer 사이 간격: 390x844 `12px`, 390x620 `7px`, 360x780 `8px`
- 전투 화면 문구: `자동 분배`, `수동 분배`, `전투 완료` 미노출
- 전투 화면 조작: `Auto`와 `DEBUG` 오버레이 노출, legacy `.scene-controls` 0개
- 원정대 X 표시 대상: `.expedition-scene-hud`, `.expedition-reward-strip`, `.expedition-scene-tags`는 `display:none`
- 원정대 오버레이: `.expedition-scene-footer`와 `.expedition-scene-run`은 arena 내부에 포함됨
- 390x844, 390x620, 360x780에서 학생탭과 원정대탭의 scene bottom delta, arena bottom delta, management top delta는 모두 0
- `git diff --check`는 오류 없이 통과했고 줄바꿈 경고만 출력했다.

## 후속 기준

- Battle Road 레이아웃을 조정할 때는 `presentation.phasePolicy.damageStartsCombat` 기본값을 유지한다.
- 전투 중 학생/도우미 위치를 바꾸면 `visual:smoke`의 피해 후 phase 검사와 360~430px 직접 감사를 함께 확인한다.
- `src/snapshot/app.bundle.js`만 직접 고치지 말고 `tools/apply-battle-road-patch.mjs`를 먼저 갱신한 뒤 `npm run patch:battle-road` 또는 `npm run build:web`로 산출물을 재생성한다.
- 전투 화면 조작 UI를 바꿀 때는 `tools/retake-year-smoke.mjs`의 `Auto`/`DEBUG`/결과 탭 검증 기준도 함께 갱신한다.
- 학생탭과 원정대탭의 scene 높이를 바꿀 때는 `student-layout-unified-*`, `expedition-layout-unified-*` 캡처처럼 같은 뷰포트에서 두 탭의 scene/arena/management y 좌표를 함께 비교한다.
- 원정대 크리처 위치를 바꿀 때는 5명 편성 probe 기준으로 footer와의 간격을 함께 확인한다. 현재 하한 검증값은 390x620 `7px`이며, 이보다 더 낮추면 작은 화면에서 progress/footer와 겹칠 수 있다.
