# Battle Road Encounter Flow 구현서

## 개요

학년/N수/수능 전투를 한 화면에 모든 적을 세워두는 방식에서, 방치형 RPG처럼 이동과 조우가 반복되는 Battle Road 구조로 변경했다. 학생과 학습 도우미는 카메라 중심 피사체처럼 왼쪽에 고정되고, 몬스터 팩과 배경이 왼쪽으로 흐르며 접근해 전투가 시작되는 느낌을 만든다.

## 동작 기준

- 학년과 N수 1년 과정은 3개월 단위 4개 조우로 나뉜다.
- 학년/N수 각 조우는 일반 몬스터 2마리와 보스 1마리로 구성된다.
- 수능은 4개 조우로 나뉜다.
  - 1차: 국어 1마리
  - 2차: 수학 1마리
  - 3차: 영어 1마리
  - 4차: 사회탐구와 과학탐구 2마리
- 보스와 수능 몬스터만 캐릭터 위 HP바를 표시한다.
- 조우가 남아 있으면 전투 완료 후 다음 Battle Road 조우로 이동하고, 마지막 조우가 끝났을 때만 기존 학년 클리어 또는 수능 결과 로직을 실행한다.

## 주요 파일

- `data/battle_road_config.json`
  - 카메라 앵커, 몬스터 스폰/만남 위치, 이동/접근 타이밍, 학년/N수 조우, 수능 조우를 테이블로 관리한다.
  - `presentation.backdrop`에서 학생탭 파노라마 폭, 루프 이동량, 이동 시간, 색감 필터를 관리한다.
  - `presentation.studentDisplay`에서 학생 표시 배율과 학생/도우미 발 기준선 위치를 관리한다.
  - `presentation.phasePolicy.damageStartsCombat`에서 적 피해/처치 후 표시 phase를 `combat`으로 전환할지 관리한다.
  - `presentation.studentAttack`에서 학생 근접 공격 전진량, 먼지, 베기 VFX 이동량을 관리한다.
  - `presentation.curriculumAttackVfx`에서 교과 공격 VFX의 표시 여부, 주기, 지속 시간, 크기, 출발/도착 offset을 관리한다.
  - `presentation.enemySlots`에서 학년/수능 몬스터의 화면 위치와 배율을 관리한다.
- `tools/validate-battle-road-config.mjs`
  - 조우 데이터가 4개씩 존재하는지, 학교 조우가 일반 2마리와 보스 1마리인지, 수능이 1/1/1/2 구조인지, phase 정책 값이 올바른지 검증한다.
- `tools/apply-battle-road-patch.mjs`
  - minified snapshot bundle에 Battle Road 런타임, 전투 생성, 완료 처리, 렌더링 패치를 멱등 적용한다.
- `tools/build-visual-assets.mjs`
  - `road-travel`, `road-approach`, `road-combat`, `battle-road-lineup` CSS와 카메라 이동감 애니메이션을 생성한다.
- `tools/visual-asset-smoke.mjs`
  - 첫 전투가 3마리 조우, 보스 1마리, HP바 1개, 이동 중 몬스터 팩 transform 변화량을 갖는지 확인한다.
  - 피해 발생 이후 `data-road-phase`가 `combat`으로 전환되고 학생이 `studentCombatLoop`를 사용하는지 확인한다.
  - 피해 발생 이후 교과 공격 VFX layer/token이 각각 1개만 표시되는지 확인한다.
- `tools/retake-year-smoke.mjs`
  - N수 선택 후 4개 3개월 조우를 거쳐 수능 4개 조우로 들어가고, 마지막 탐구 조우 완료 후 결과 대기로 돌아오는지 확인한다.
- `package.json`
  - `patch:battle-road`, `battle-road:verify`를 추가하고 `visual:build`, `verify`, `verify:mobile` 흐름에 연결했다.

## 런타임 구조

`current.road`가 현재 진행 상태를 가진다.

```js
{
  mode: "school" | "suneung",
  phase: "travel" | "approach" | "combat",
  encounterIndex: 0,
  encounterTotal: 4,
  phaseStartedAt: 0,
  lastCompletedEncounterId: null
}
```

학년/N수 전투 생성은 `current.road.mode === "school"` 기준으로 현재 조우만 생성한다. 고3 또는 N수 1년 마지막 조우 완료 후에는 `current.road.mode = "suneung"`으로 전환하고 수능 첫 조우를 생성한다. 수능 중간 조우는 결과를 만들지 않고 다음 과목 조우만 생성하며, 네 번째 탐구 조우 완료 시에만 대학/직업 결과를 계산한다.

## 렌더링과 연출

`battleSceneLineup`은 기존 전체 라인업 대신 현재 조우 pack만 그린다. 렌더링 결과에는 다음 속성이 붙는다.

- `data-road-phase`
- `data-encounter-index`
- `--road-player-x`
- `--road-enemy-start-x`
- `--road-enemy-meet-x`
- `--road-travel-ms`
- `--road-approach-ms`
- `--road-parallax-px`

`road-travel` 상태에서는 학생/학습 도우미의 달리기 루프와 몬스터 팩의 접근 모션을 강조한다. `road-combat` 상태에서는 기존 근접 타격, 피격 흔들림, hit spark, dust burst를 사용한다.

교과 공격 VFX는 `curriculumAttackVfxLayer()`가 `battleSceneLineup` 앞에 1개만 렌더링한다. 토큰 데이터는 `data/curriculum_attack_vfx.json`, 표시 파라미터는 `presentation.curriculumAttackVfx`를 따른다. 현재는 별도 공격 이벤트 serial이 없어서 `elapsedMs / cycleMs` 기반 tick으로 공격 루프마다 토큰을 결정한다. 토큰 시작 Y는 학생 상체/손 쪽에서 출발하도록 0 이하로 유지하며, 학생 공격선은 불꽃색이 아니라 흰색/청록/하늘색 계열로 통일한다. 실제 공격 이벤트가 추가되면 이 tick을 `attackSerial` 또는 `hitSerial`로 교체한다.

표시 phase는 `battleRoadVisualPhase(battle)`가 계산한다. 기본적으로 `roadTiming.travelMs`와 `roadTiming.approachMs`를 따르지만, `presentation.phasePolicy.damageStartsCombat`이 `true`이면 적이 피해를 받거나 처치된 즉시 `combat` 표시로 전환한다. 이 정책은 고전투력 상태에서 적 처치가 빠르게 일어나도 학생/도우미가 계속 달리기 레이아웃에 남는 문제를 막기 위한 기준이다. arena의 `road-*` class와 `battleSceneLineup()`의 `data-road-phase`는 같은 헬퍼 결과를 사용해야 한다.

## 전투 화면 조작 UI

학생탭 전투 화면은 외부 `scene-controls` 조작줄을 사용하지 않는다. 조작과 상태는 `.pixel-arena` 내부 오버레이로 배치한다.

- 제한시간 progress: `.battle-arena-progress`
- 자동 진행 토글: `.battle-auto-toggle`, 표시 텍스트 `Auto`
- 개발용 전투 완료: `.battle-debug-complete`, 표시 텍스트 `DEBUG`

전투 화면에서 `자동 분배`, `수동 분배`, `전투 완료` 문구는 노출하지 않는다. 자동 투자 비율 조정은 성장 탭의 투자 UI가 담당한다. 수능 완료 후 결과 확인은 전투 화면 버튼이 아니라 결과 탭의 `.panel.decision`에서 처리한다.

레이아웃 높이는 모바일 화면에서 전투장이 좁아 보이지 않으면서 성장 패널이 바로 이어지도록 고정형에 가깝게 잡는다. 현재 390x620 직접 감사 기준 학생탭 arena는 `y=140`, `height=226`, `bottom=366`이고 scene bottom 및 management 시작선은 `372`다. 390x844 기준 arena는 `y=140`, `height=250`, `bottom=390`이고 scene bottom 및 management 시작선은 `396`이다. scene 상단/하단 padding은 모두 6px로 맞춘다. 같은 뷰포트에서 원정대탭의 `.expedition-scene`/`.expedition-arena`와 `.expedition-management-panel`도 학생탭 scene/arena/관리 패널 시작 y 좌표와 동일해야 한다.

원정대탭은 학생탭과 같은 화면 비중을 쓰기 위해 scene 외부 요약 UI를 전투장 내부 오버레이로 정리한다. `.expedition-scene-hud`, `.expedition-reward-strip`, `.expedition-scene-tags`는 숨기고, `.expedition-scene-footer`는 arena 하단에 progress와 `돌파`/`편성 필요` 버튼을 배치한다. 버튼은 360px 폭에서도 arena 오른쪽 경계 밖으로 나가면 안 된다. 원정대 크리처 발 기준선은 5명 편성과 다수 몬스터가 길가 오브젝트 위로 떠 보이지 않도록 `.expedition-party-visual`/`.expedition-enemy-group` `bottom:21%`, 단일 `.expedition-enemy-visual` `bottom:26%`, 보스 `bottom:19%`를 사용한다.

학생탭 배경은 `tools/build-visual-assets.mjs`의 `buildBattleRoadBackdropAtlas()`에서 학년군별 PNG로 생성된다. 현재 구조는 `원본 -> 반전 -> 원본 -> 반전` 4구간 루프이며, CSS는 `presentation.backdrop.panWidthPercent`로 파노라마 폭을 잡고 `panLoopPercent=-50` 위치까지 이동한다. 현재 모바일 기준 pan width는 720%다. 1400%처럼 큰 값은 배경을 과확대해 캐릭터와 배경이 따로 노는 느낌을 만들기 때문에 `visual:smoke`가 900% 초과를 실패로 처리한다.

파노라마 PNG 하단에는 `presentation.backdrop.roadTopPercent`, `roadBottomPercent`, `roadOpacity`, `roadDetailPx`를 읽어 학년군별 러닝 레인을 합성한다. 이 레인이 학생/학습 도우미/몬스터 발 기준선을 받쳐 원정대처럼 길 위에서 이동하는 느낌을 만든다. 기존 기본 CSS에 scene별 작은 `::before` 장식 배경이 있으므로, `.stage-scene.scene-* .pixel-arena::before`는 `background-size:100% 100%`, `background-repeat:no-repeat`, `background-position:center bottom`을 함께 고정한다.

road phase별 `::before` animation-duration override는 사용하지 않는다. 그래야 같은 학년/과정 안에서 travel/approach/combat 전환이 일어나도 배경이 처음 위치로 튀지 않는다.

학생 근접 공격 거리는 `studentCombatLoop`에 하드코딩하지 않고 `presentation.studentAttack.dashPx`를 주입해 생성한다. 기본값은 25px로, 이전 76px 장거리 돌진보다 짧게 유지한다.

## 검증

마지막 확인 명령:

```powershell
npm run battle-road:verify
npm run build:web
npm run visual:smoke
npm run live:polish
npm run retake:smoke
npm run verify:mobile
```

통과 기준:

- 기본 전투 첫 조우: 적 3마리, 보스 1마리, HP바 1개
- 적 피해/처치 이후: `data-road-phase=combat`, 학생 애니메이션 `studentCombatLoop`
- 교과 공격 VFX: 피해 이후 layer 1개, token 1개, animation name `curriculumVfx*`
- 전투 화면 조작: legacy `scene-controls` 0개, `Auto`/`DEBUG` 오버레이 노출, 자동 분배/전투 완료 문구 미노출
- 학생/원정대 통합 레이아웃: 390x844, 390x620, 360x780에서 scene bottom delta 0, arena bottom delta 0, management top delta 0
- 원정대 전투장: scene HUD/reward/tags 숨김, footer/button arena 내부 포함, 가로 오버플로 0
- N수 진입 직후: 즉시 수능이 아니라 3개월 조우 1/4
- N수 4번째 조우 완료 후: 수능 1/4 국어 조우
- 수능 마지막 조우: 탐구 2마리 동시 등장
- 수능 마지막 조우 완료 후: 결과 탭 결정 패널과 직업 후보 62개 산출

## 확장 기준

원정대에도 같은 구조를 적용할 때는 `data/battle_road_config.json`에 `expedition` 섹션을 추가하는 방식이 가장 안정적이다. 이동 거리, 카메라 앵커, 적 접근 시간은 이미 CSS custom property로 분리되어 있으므로, 원정대 전용 파노라마와 enemy pack만 연결하면 같은 이동-조우-전투 루프를 재사용할 수 있다.
