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
  - `presentation.studentAttack`에서 학생 근접 공격 전진량, 먼지, 베기 VFX 이동량을 관리한다.
  - `presentation.enemySlots`에서 학년/수능 몬스터의 화면 위치와 배율을 관리한다.
- `tools/validate-battle-road-config.mjs`
  - 조우 데이터가 4개씩 존재하는지, 학교 조우가 일반 2마리와 보스 1마리인지, 수능이 1/1/1/2 구조인지 검증한다.
- `tools/apply-battle-road-patch.mjs`
  - minified snapshot bundle에 Battle Road 런타임, 전투 생성, 완료 처리, 렌더링 패치를 멱등 적용한다.
- `tools/build-visual-assets.mjs`
  - `road-travel`, `road-approach`, `road-combat`, `battle-road-lineup` CSS와 카메라 이동감 애니메이션을 생성한다.
- `tools/visual-asset-smoke.mjs`
  - 첫 전투가 3마리 조우, 보스 1마리, HP바 1개, 이동 중 몬스터 팩 transform 변화량을 갖는지 확인한다.
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
npm run retake:smoke
```

통과 기준:

- 기본 전투 첫 조우: 적 3마리, 보스 1마리, HP바 1개
- N수 진입 직후: 즉시 수능이 아니라 3개월 조우 1/4
- N수 4번째 조우 완료 후: 수능 1/4 국어 조우
- 수능 마지막 조우: 탐구 2마리 동시 등장
- 수능 마지막 조우 완료 후: 결과 대기와 직업 후보 62개 산출

## 확장 기준

원정대에도 같은 구조를 적용할 때는 `data/battle_road_config.json`에 `expedition` 섹션을 추가하는 방식이 가장 안정적이다. 이동 거리, 카메라 앵커, 적 접근 시간은 이미 CSS custom property로 분리되어 있으므로, 원정대 전용 파노라마와 enemy pack만 연결하면 같은 이동-조우-전투 루프를 재사용할 수 있다.
