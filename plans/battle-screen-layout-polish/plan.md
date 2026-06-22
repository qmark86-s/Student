# 전투화면 레이아웃 폴리싱 계획

## 목표

학생탭 전투 화면의 Battle Road 레이아웃을 모바일 APK 기준으로 다시 점검한다. 1차로 전투 진행 상태와 화면 phase가 어긋나 학생/도우미/몬스터 배치가 부자연스럽게 보이는 문제를 수정했고, 2차로 사용자가 제공한 기준 이미지처럼 전투장 내부에 진행 바와 Auto/DEBUG 조작을 넣어 상단 전투 영역을 압축했다. 3차로 학생탭 arena를 더 아래로 내려 전투 화면을 확보하고, 원정대탭도 같은 scene/arena/관리 패널 기준선으로 정리한다.

## 사전 확인

- 기준 커밋: `30ec0ee 원정대 몬스터 비주얼 품질 개선`
- 1차 작업 시작 dirty 상태: `git status --short` 출력 없음
- 2차 작업 시작 dirty 상태: 1차 전투/비주얼 변경 파일과 `plans/attack-vfx-diversification/` 미추적 폴더가 존재했다. 사용자 변경 가능성이 있으므로 되돌리지 않고 현재 작업 범위만 확장했다.
- 최종 `git status --short`에는 `attack-vfx`/`curriculum_attack_vfx` 관련 별도 변경도 보인다. 해당 변경은 이번 레이아웃 작업 범위가 아니므로 되돌리거나 정리하지 않았다.
- 최근 구현 문서 확인:
  - `implementations/expedition-monster-quality-redraw/implementation.md`
  - `implementations/monster-direction-reaction-polish/implementation.md`
  - `implementations/student-battle-road-background-depth-polish/implementation.md`
  - `implementations/student-battle-scale-quality-polish/implementation.md`
  - `implementations/student-battle-polishing-continuity/implementation.md`
  - `implementations/battle-road-encounter-flow/implementation.md`
- 관련 계획 문서 확인:
  - `plans/battle-road-encounter-flow/plan.md`
  - `plans/battle-scene-enemy-lineup/plan.md`

## MCP/검증 자산

- in-app Browser skill을 시도했으나 `node_repl/js`가 `codex/sandbox-state-meta: missing field sandboxPolicy` 오류로 실행되지 않았다.
- 대체 검증은 프로젝트 내 Playwright 기반 스크립트와 `view_image`로 수행한다.
- 사용 가능한 로컬 검증 자산:
  - `npm run battle-road:verify`
  - `npm run visual:verify`
  - `npm run visual:smoke`
  - `npm run mobile:smoke`
  - `npm run live:polish`
  - `npm run retake:smoke`
  - `npm run verify:mobile`
- 전투 화면 감사 산출물:
  - `artifacts/visual-asset-smoke/main-battle.png`
  - `artifacts/battle-layout-polish-audit/metrics.json`
  - `artifacts/battle-layout-polish-audit/*-travel.png`
  - `artifacts/battle-layout-polish-audit/*-damage.png`
  - `artifacts/live-visual-polish/*.png`

## 현재 구조 파악

- `data/battle_road_config.json`
  - 카메라, 이동 타이밍, 학생/도우미 위치, 몬스터 크기, HP바, 슬롯 위치를 관리한다.
  - 신규 파라미터는 한글 help 설명을 유지해야 한다.
- `tools/apply-battle-road-patch.mjs`
  - minified `src/snapshot/app.bundle.js`에 Battle Road 런타임과 `battleSceneLineup()`을 멱등 패치한다.
  - 직접 번들만 수정하면 다음 `visual:build`에서 되돌아가므로 patch script도 함께 수정해야 한다.
- `tools/build-visual-assets.mjs`
  - 전투 화면 CSS와 keyframes를 생성한다.
  - `presentation.*` 값이 CSS 변수와 keyframe에 반영된다.
- `tools/visual-asset-smoke.mjs`
  - 모바일 390px 기준 전투 화면의 클리핑, 가로 오버플로, 몬스터 수, HP바, 배경 pan, 도우미 크기를 검사한다.
- `tools/retake-year-smoke.mjs`
  - N수/수능 흐름을 검증한다.
  - 2차 레이아웃 기준으로 `Auto`, `DEBUG`, 결과 탭 결정 패널을 확인한다.

## 2차 레이아웃 계획

1. 전투 화면 외부 조작줄을 arena 내부 오버레이로 이동한다.
   - 기존 `scene-controls` 영역은 제거한다.
   - 전투 제한시간 progress는 `.pixel-arena` 하단 왼쪽에 둔다.
   - 자동 진행 버튼은 `Auto` 버튼으로 하단 오른쪽에 둔다.
2. 전투 화면에서 자동 분배/수동 분배 버튼을 제거한다.
   - 자동 투자 비율 조정은 성장 탭의 기존 UI에 맡긴다.
   - 전투 화면에는 `자동 분배`, `수동 분배` 문구가 노출되지 않아야 한다.
3. 결과 버튼은 전투 화면에서 제거하고 결과 탭 흐름으로 검증한다.
   - 수능 완료 후 `awaitingDecision`이 켜지면 결과 탭의 결정 패널에서 결과를 본다.
4. 디버그 전투 완료 기능은 일반 조작줄이 아니라 arena 내부 `DEBUG` 오버레이로 유지한다.
   - 테스트와 개발용 기능임을 버튼 텍스트로 드러낸다.
   - 기존 `전투 완료` 문구는 전투 화면에 노출하지 않는다.
5. 모바일 높이를 기준 이미지에 맞게 조정한다.
   - `.game-layout` 첫 행은 남은 공간 비율이 아니라 콘텐츠 높이로 잡는다.
   - 최초 390x620 기준 arena 높이를 186px로 압축했으나 전투 화면이 여전히 좁아 보여 211px 근처로 다시 키운다.

## 3차 레이아웃 계획

1. 학생탭 전투 화면을 사용자가 표시한 빨간 기준선까지 내려 전투장 높이를 더 확보한다.
   - 390px 폭 기준 scene/arena 하단을 관리 패널 시작선과 맞춘다.
   - arena 내부 progress, `Auto`, `DEBUG`는 기존 2차 구조를 유지한다.
2. 원정대탭의 X 표시 대상 정보를 전투 scene에서 제거한다.
   - `.expedition-scene-hud`의 Stage/상태 요약을 숨긴다.
   - `.expedition-reward-strip`의 EXP/자동/최고 요약을 숨긴다.
   - `.expedition-scene-tags`의 추천/약점/내성 칩을 숨긴다.
3. 원정대 progress와 돌파/편성 버튼을 학생탭처럼 arena 내부 하단 오버레이로 넣는다.
   - footer는 arena 내부에 들어가야 하며 버튼은 오른쪽 경계 밖으로 밀리지 않아야 한다.
   - 파티 미편성 상태의 `편성 필요` 문구도 360px 폭에서 줄바꿈/넘침 없이 보여야 한다.
4. 학생탭과 원정대탭의 기본 레이아웃 기준선을 맞춘다.
   - 같은 뷰포트에서 `.stage-scene`과 `.expedition-scene`의 bottom이 같아야 한다.
   - `.management-panel`과 `.expedition-management-panel`의 시작 y 좌표가 같아야 한다.

## 4차 레이아웃 계획

1. 전투장 하단 padding을 상단 padding과 같은 6px로 맞춘다.
   - arena 자체를 위로 밀지 않는다.
   - `.management-panel`/`.expedition-management-panel`을 scene 하단 padding만큼 아래로 내려 전투장 내부 여백을 확보한다.
2. 원정대 파티와 몬스터의 발 기준선을 다시 조정한다.
   - 직전 보정의 `24%` 기준은 5명 편성에서 길가 오브젝트 위에 떠 보일 수 있어 조금 낮춘다.
   - 최종 기준은 `.expedition-party-visual`/`.expedition-enemy-group` `bottom:21%`, 단일 `.expedition-enemy-visual` `bottom:26%`, 보스 `bottom:19%`로 둔다.
   - 360px~390px 폭에서 하단 footer와 겹치지 않고, 다인 편성/다수 몬스터가 도보 위로 과하게 올라가지 않아야 한다.

## 화면 감사 결과

- `npm run preview`로 `http://127.0.0.1:5173/`를 띄우고 360x780, 390x844, 430x880 모바일 폭을 확인했다.
- `npm run visual:smoke`는 통과했다.
  - 전투 적 3마리, 보스 1마리, HP바 1개
  - 몬스터/도우미 클리핑 0건
  - 가로 오버플로 0
  - arena 내 텍스트 카드 0
- 직접 캡처에서 확인한 핵심 문제:
  - 전투가 진행되어 일반 몬스터가 처치되고 다음 적이 active가 되어도 `data-road-phase`가 계속 `travel`로 남는다.
  - 이 때문에 학생/도우미는 계속 달리기 레이아웃/애니메이션을 사용하고, 근접 전투 phase의 배치/타격 연출로 전환되지 않는다.
  - 원인은 road phase가 실제 화면 표현 시간이나 적 피해 상태가 아니라 `battle.elapsedMs`만 보고 계산되는 데 있다. 고전투력 상태에서는 적이 빠르게 피해를 받아도 `elapsedMs < travelMs`라 travel이 유지된다.
- 보조 관찰:
  - 360px 폭 상단 상태 타일의 과정 텍스트는 말줄임 처리된다. 깨짐은 아니지만 차후 상단 HUD 밀도 조정 후보다.
  - 말풍선, HP바, 캐릭터/몬스터는 현재 스모크 기준 겹침과 클리핑이 없다.
- 2차 직접 캡처 결과:
  - `artifacts/battle-screen-layout-polish/mobile-620-expanded.png`: 390x620 기준 arena `y=140`, `height=211`, `bottom=351`.
  - `artifacts/battle-screen-layout-polish/mobile-844-expanded.png`: 390x844 기준 arena `height=242`, management panel이 `y=390`부터 시작.
  - `artifacts/battle-screen-layout-polish/mobile-360-expanded.png`: 360x780 기준 arena `height=242`, 가로 오버플로 0, `Auto`/`DEBUG` 버튼 노출.
- 3차 직접 캡처 결과(4차 하단 padding 적용 전 기준):
  - `artifacts/battle-screen-layout-polish/student-layout-unified-390-844.png`: 학생 scene `y=134`, `height=256`, arena `height=250`, management `y=390`.
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-390-844.png`: 원정대 scene `y=134`, `height=256`, arena `height=250`, management `y=390`.
  - `artifacts/battle-screen-layout-polish/student-layout-unified-390-620.png`: 학생 arena `height=226`, `bottom=366`, management `y=366`.
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-390-620.png`: 원정대 arena `height=226`, `bottom=366`, management `y=366`.
  - `artifacts/battle-screen-layout-polish/student-layout-unified-360-780.png`: 학생 arena `height=234`, `bottom=374`, management `y=374`.
  - `artifacts/battle-screen-layout-polish/expedition-layout-unified-360-780.png`: 원정대 arena `height=234`, `bottom=374`, management `y=374`.
  - 세 뷰포트 모두 scene bottom delta 0, arena bottom delta 0, management top delta 0, horizontal overflow 0.
  - 원정대 footer/button은 arena 내부에 포함되고, X 표시 대상 문구는 visible body text에 남지 않는다.
- 4차 직접 캡처 결과:
  - `artifacts/battle-screen-layout-polish/student-padding-polish-390-844.png`: 학생 scene `height=262`, arena `height=250`, top/bottom padding `6px/6px`, management `y=396`.
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-390-844.png`: 원정대 scene `height=262`, arena `height=250`, top/bottom padding `6px/6px`, management `y=396`, 파티/몬스터와 footer 사이 `12px`.
  - `artifacts/battle-screen-layout-polish/student-padding-polish-390-620.png`: 학생 scene `height=238`, arena `height=226`, top/bottom padding `6px/6px`, management `y=372`.
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-390-620.png`: 원정대 scene `height=238`, arena `height=226`, top/bottom padding `6px/6px`, management `y=372`, 파티/몬스터와 footer 사이 `7px`.
  - `artifacts/battle-screen-layout-polish/student-padding-polish-360-780.png`: 학생 scene `height=246`, arena `height=234`, top/bottom padding `6px/6px`, management `y=380`.
  - `artifacts/battle-screen-layout-polish/expedition-creature-lowered-360-780.png`: 원정대 scene `height=246`, arena `height=234`, top/bottom padding `6px/6px`, management `y=380`, 파티/몬스터와 footer 사이 `8px`.
  - 세 뷰포트 모두 footer는 arena 내부에 있고 horizontal overflow는 0이다.

## 구현 결과

1. Battle Road 표시 phase 정책을 데이터화했다.
   - `data/battle_road_config.json`의 `presentation.phasePolicy.damageStartsCombat`을 추가했다.
   - 적이 피해를 받거나 처치되면 표시 phase를 `combat`으로 전환한다.
   - 신규 파라미터 help는 한글로 작성했다.
2. 런타임 patch에 `battleRoadVisualPhase(battle)`를 추가했다.
   - 기존 travel/approach/combat 시간 기준은 유지한다.
   - `damageStartsCombat !== false`이고 적 피해/처치가 감지되면 `combat`을 우선한다.
   - `ca()`의 arena class와 `battleSceneLineup()`의 `data-road-phase`가 같은 헬퍼를 사용한다.
3. 검증 스크립트를 phase 회귀 기준으로 강화했다.
   - `tools/validate-battle-road-config.mjs`가 `presentation.phasePolicy.damageStartsCombat` boolean 여부를 검증한다.
   - `tools/visual-asset-smoke.mjs`가 피해 발생 후 `data-road-phase === "combat"`, 학생 애니메이션 `studentCombatLoop`, arena `road-combat` 여부를 확인한다.
   - `tools/live-visual-polish-check.mjs`가 피해 이후에도 `travel`이 남으면 노트로 드러낸다.
4. 빌드 산출물을 재생성했다.
   - `npm run build:web`와 최종 `npm run verify:mobile`을 통해 `src/snapshot/app.bundle.js`, `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`이 최신 패치 기준으로 갱신됐다.

## 2차 구현 결과

1. `tools/apply-battle-road-patch.mjs`에서 전투 화면 조작 구조를 재배치했다.
   - `scene-progress`를 `battle-arena-progress`로 arena 내부 하단 오버레이에 넣었다.
   - 자동 진행 버튼을 `.battle-auto-toggle`로 바꾸고 텍스트를 `Auto`로 고정했다.
   - 개발용 전투 완료 버튼은 `.battle-debug-complete` / `DEBUG`로 arena 우상단에 둔다.
   - 기존 `scene-controls`, 자동 분배 버튼, 결과 버튼은 전투 화면에서 제거했다.
2. `src/snapshot/styles.css`에 2차 레이아웃 override를 추가했다.
   - `.game-layout`은 `auto minmax(0,1fr)` 행 구조를 사용한다.
   - `.stage-scene`은 `clamp()` 기반 고정형 전투장 높이를 사용한다.
   - 전투 화면이 좁아 보인다는 피드백을 반영해 모바일 arena 높이를 390x620 기준 211px, 390x844 기준 242px로 확장했다.
   - 하단 progress와 `Auto` 버튼은 arena 내부에서 pointer 이벤트를 분리해 클릭 가능하게 했다.
3. `tools/retake-year-smoke.mjs`를 새 UI 기준으로 갱신했다.
   - `Auto`와 `DEBUG` 오버레이를 직접 찾는다.
   - 자동 분배/전투 완료 문구가 전투 화면에 남지 않는지 확인한다.
   - 수능 완료 결과는 현재 탭 버튼이 아니라 결과 탭의 `.panel.decision`으로 확인한다.
4. 빌드 산출물을 재생성했다.
   - `npm run build:web`와 `npm run verify:mobile`로 `src/snapshot/app.bundle.js`, `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 최신화했다.

## 3차 구현 결과

1. 학생탭 전투 scene 높이를 다시 확장했다.
   - `.stage-scene`을 `clamp(226px,30vh,260px)` 기준으로 재정의했다.
   - 390px 폭 모바일에서는 arena가 226~250px 사이에서 잡히고, 관리 패널은 arena 바로 아래에서 시작한다.
2. 원정대탭 scene을 학생탭 레이아웃과 맞췄다.
   - `.expedition-layout`을 `auto minmax(0,1fr)` 구조로 바꿨다.
   - `.expedition-scene`과 `.expedition-arena`를 학생탭과 같은 높이 기준으로 맞췄다.
   - `.expedition-scene-hud`, `.expedition-reward-strip`, `.expedition-scene-tags`는 숨겼다.
3. 원정대 하단 조작을 arena 내부 오버레이로 재배치했다.
   - `.expedition-scene-footer`를 absolute overlay로 바꾸고 progress와 버튼을 2열 grid에 넣었다.
   - 버튼 컬럼을 78px로 고정해 `편성 필요` 상태도 arena 밖으로 넘치지 않게 했다.
   - disabled 상태에서는 아이콘을 숨겨 텍스트 공간을 확보한다.
4. 빌드와 스냅샷을 재생성했다.
   - `npm run build:web`와 `npm run verify:mobile`로 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 최신화했다.

## 4차 구현 결과

1. 학생탭과 원정대탭 scene 하단 padding을 6px로 맞췄다.
   - arena top padding 6px와 하단 padding 6px가 동일해졌다.
   - arena를 위로 움직이지 않고 관리 패널 시작선을 아래로 내려 전투 화면의 내부 여백을 확보했다.
2. 원정대 크리처 위치를 최종 보정했다.
   - `tools/build-visual-assets.mjs`의 `.expedition-party-visual`과 `.expedition-enemy-group`을 `bottom:21%`로 조정했다.
   - 단일 몬스터는 `bottom:26%`, 보스는 `bottom:19%`로 조정했다.
   - `src/snapshot/styles.css`의 최종 override도 같은 값으로 맞췄다.
3. 빌드와 스냅샷을 재생성했다.
   - `npm run build:web`와 `npm run verify:mobile`로 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 최신화했다.

## 1차 구현 계획

1. Battle Road 표시 phase 정책을 데이터화한다.
   - `presentation.phasePolicy.damageStartsCombat`을 추가한다.
   - 적이 피해를 받았거나 처치되면 표시 phase를 `combat`으로 전환해 travel 레이아웃이 남지 않게 한다.
   - 신규 help 텍스트는 한글로 작성한다.
2. 런타임 patch에 phase 계산 헬퍼를 추가한다.
   - `battleRoadVisualPhase(battle)`가 기존 timing 기준 phase와 적 피해 상태를 함께 판단한다.
   - `ca()`의 `road-*` 클래스와 `battleSceneLineup()`의 `data-road-phase`가 같은 헬퍼를 사용하게 한다.
3. 검증 스크립트를 최신 기준으로 갱신한다.
   - `tools/validate-battle-road-config.mjs`가 신규 phasePolicy 파라미터를 검증한다.
   - `tools/visual-asset-smoke.mjs`가 피해/처치가 있는 전투에서 `travel` phase가 남지 않는지 검사한다.
   - `tools/live-visual-polish-check.mjs`도 같은 상태를 노트로 남긴다.
4. 빌드 산출물을 재생성한다.
   - `npm run visual:build` 또는 `npm run build:web`로 `src/snapshot/app.bundle.js`, `src/snapshot/visual-assets.css`, `index.html`, `dist/index.html`을 최신화한다.

## 검증 기준

- `npm run battle-road:verify`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run live:polish`
- 가능하면 최종 `npm run verify:mobile`

실행 결과:

- `npm run battle-road:verify` 통과
- `npm run visual:verify` 통과
- `npm run visual:smoke` 통과
- `npm run live:polish` 통과
- `npm run mobile:smoke` 통과
- `npm run retake:smoke` 통과
- `npm run verify:mobile` 통과
- 360x780, 390x844, 430x880 직접 감사에서 피해 후 `phase=combat`, `studentAnimation=studentCombatLoop`, `visibleEnemyClipCount=0`, `horizontalOverflow=0` 확인
- 2차 레이아웃 직접 감사에서 390x620, 390x844, 360x780 가로 오버플로 0 확인
- 3차 레이아웃 직접 감사에서 390x844/390x620/360x780 모두 학생탭과 원정대탭의 scene bottom, arena bottom, 관리 패널 시작 y 좌표가 동일함을 확인
- 4차 레이아웃 직접 감사에서 top/bottom padding이 모두 6px이고, 관리 패널 시작 y가 scene bottom과 일치함을 확인
- 390x620 기준 `sceneHudDisplay=none`, `sceneControls=0`, `autoText=Auto`, `debugText=DEBUG`, 자동 분배/전투 완료 문구 미노출 확인
- 최종 390x620 기준 학생/원정대 scene `bottom=372`, arena `height=226`, `bottom=366`, management `y=372`
- 최종 390x844 기준 학생/원정대 scene `bottom=396`, arena `height=250`, `bottom=390`, management `y=396`
- 최종 360x780 기준 학생/원정대 scene `bottom=380`, arena `height=234`, `bottom=374`, management `y=380`
- 원정대 5명 편성 probe 기준 크리처와 footer 사이 간격은 390x844 `12px`, 390x620 `7px`, 360x780 `8px`
- 원정대 X 표시 대상인 scene HUD, reward strip, tags는 `display:none`이고 visible body text에는 `파티 대기`, `돌파 가능`, `전력 보강`, 추천/약점/내성 요약이 남지 않음

통과 기준:

- 피해/처치가 발생한 현재 전투에서 `data-road-phase !== "travel"`
- 전투 중 학생은 `studentCombatLoop`를 사용한다.
- 전투장 몬스터/HP바/말풍선 클리핑 0건
- 360px~430px 모바일 폭에서 가로 오버플로 0
- 신규 fallback 로그나 조용한 대체 자산 추가 없음

## 문서 갱신 대상

- 구현 완료 후 `implementations/battle-screen-layout-polish/implementation.md` 작성
- 기존 Battle Road 기준이 바뀌면 `implementations/battle-road-encounter-flow/implementation.md`에 phase 정책 변경 내용을 덧붙인다.
