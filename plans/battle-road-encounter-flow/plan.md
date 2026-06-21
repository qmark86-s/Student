# Battle Road Encounter Flow 계획

## 목표

현재 전투장에 1년치 몬스터를 한 번에 세워두는 방식을, 방치형 RPG처럼 캐릭터 중심 카메라가 이동하다가 몬스터 무리와 조우하고 전투 후 다시 전진하는 구조로 바꾼다.

핵심 루프는 다음과 같다.

```text
이동 -> 조우/전투 -> 이동 -> 조우/전투 -> 이동 -> 조우/전투 -> 이동 -> 조우/전투 -> 클리어
```

학생 1년 과정은 3개월 단위 4개 구간으로 나눈다. 수능도 4개 조우로 나누되 마지막 조우는 사회탐구와 과학탐구가 함께 등장한다.

## 이해한 연출 기준

- 플레이어와 학습 도우미는 화면 왼쪽 28~35% 지점에 고정된 카메라 중심 피사체처럼 보인다.
- 이동 중에는 캐릭터가 오른쪽으로 달리는 느낌을 주되, 실제 구현은 배경/바닥/몬스터/전경 소품이 왼쪽으로 흐르는 방식이 안정적이다.
- 몬스터는 화면 오른쪽 밖에서 왼쪽으로 접근하거나, 이미 오른쪽에 대기했다가 카메라가 다가가는 것처럼 보인다.
- 조우하면 배경 흐름은 느려지고 학생/도우미는 근접 전투 루프를 돈다.
- 전투 종료 후 몬스터는 쓰러지거나 사라지고, 학생 파티만 다시 전진한다.
- 이 구조는 나중에 원정대에도 같은 state machine과 config를 재사용할 수 있어야 한다.

## 변경 전 구조 분석

- 현재 메인 전투는 `battle.enemies` 전체를 `.battle-scene-lineup`에 한꺼번에 렌더링한다.
- 학년 전투는 12마리 라인업, 수능은 5마리 라인업을 테스트에서 기대한다.
- CSS에는 이미 `studentCombatLoop`, `studentMoveFrames`, `enemyCombatStep`, `battleDustBurst`, `arenaTreadmill` 등이 있다.
- 즉, 완전히 새로 만드는 것이 아니라 정적 라인업을 `road phase + encounter pack` 구조로 바꾸는 작업이다.
- `tools/apply-visual-asset-patch.mjs`가 minified bundle을 패치하고 있으므로, 구현 시 런타임 수정과 patch script 수정이 함께 필요하다.

## 데이터 설계

새 파일을 추가한다.

```text
data/battle_road_config.json
```

초안 필드:

```json
{
  "version": 1,
  "camera": {
    "playerAnchorX": 31,
    "combatAnchorX": 34,
    "enemyMeetX": 72,
    "enemySpawnX": 118,
    "parallaxDistancePx": 128
  },
  "timing": {
    "travelMs": 2600,
    "approachMs": 850,
    "combatLoopMs": 1450,
    "clearHoldMs": 700
  },
  "schoolYear": {
    "encounters": [
      { "id": "q1", "label": "1분기", "monthRange": [1, 3], "normalSlots": [0, 1], "bossKey": "march_eval" },
      { "id": "q2", "label": "2분기", "monthRange": [4, 6], "normalSlots": [2, 3], "bossKey": "midterm" },
      { "id": "q3", "label": "3분기", "monthRange": [7, 9], "normalSlots": [4, 5], "bossKey": "final" },
      { "id": "q4", "label": "4분기", "monthRange": [10, 12], "normalSlots": [6, 7], "bossKey": "year_boss" }
    ]
  },
  "suneung": {
    "encounters": [
      { "id": "korean", "label": "국어", "subjects": ["korean"] },
      { "id": "math", "label": "수학", "subjects": ["math"] },
      { "id": "english", "label": "영어", "subjects": ["english"] },
      { "id": "inquiry", "label": "탐구", "subjects": ["social", "science"] }
    ]
  }
}
```

## 상태 설계

현재 save의 `current` 아래에 road 진행 상태를 추가한다.

```js
current.road = {
  mode: "school" | "suneung" | "expedition",
  phase: "travel" | "approach" | "combat" | "clear",
  encounterIndex: 0,
  encounterTotal: 4,
  phaseStartedAt: number,
  lastCompletedEncounterId: string | null
}
```

기존 `monthIndex`, `examIndex`, `battle.kind`, `waveProgressMs`는 호환을 위해 유지하되, 학년 진행의 기준은 `road.encounterIndex`로 옮긴다.

## 전투 생성 규칙

### 학년/N수 1년 과정

- 한 학년은 4개 encounter로 구성한다.
- 각 encounter는 기본적으로 일반 몬스터 2마리 + 해당 분기 보스 1마리로 구성한다.
- 총합은 기존 8 일반 몬스터 + 4 보스를 유지하되 한 화면에는 3마리만 나온다.
- 보스만 HP바를 가진다. 일반 몬스터는 HP바 없이 실루엣과 피격 연출로 읽힌다.

### 수능

- 총 4개 encounter로 구성한다.
- 1차: 국어 1마리
- 2차: 수학 1마리
- 3차: 영어 1마리
- 4차: 사회탐구 + 과학탐구 2마리
- 수능 몬스터는 모두 중요한 보스 성격이므로 HP바를 유지한다.

## 렌더링 구조

기존 `.battle-scene-lineup`을 다음 역할로 확장한다.

```text
.battle-road-scene
  .battle-road-camera
    .arena-background-sheet
    .battle-road-floor
    .student-sprite
    .helper-party
    .battle-encounter-pack
      .battle-scene-enemy ...
```

실제 DOM은 크게 바꾸지 않되 class와 CSS custom property를 추가한다.

- `data-road-phase`
- `data-encounter-index`
- `--road-player-x`
- `--road-enemy-start-x`
- `--road-enemy-meet-x`
- `--road-travel-ms`
- `--road-parallax-px`

## CSS 모션 설계

- `roadTravelPan`: 배경/바닥/전경이 왼쪽으로 흐른다.
- `encounterApproach`: 몬스터 팩이 오른쪽 밖에서 전투 위치로 들어온다.
- `encounterCombatHold`: 전투 중 팩은 흔들림/피격만 하고 큰 이동은 멈춘다.
- `encounterClearExit`: 처치 후 몬스터가 뒤로 밀리거나 페이드아웃된다.
- `studentRunLoop`: 이동 중 학생은 달리기 프레임 중심으로 재생한다.
- `studentCombatLoop`: 조우 후 기존 근접 타격 루프를 사용한다.

## 구현 단계

1. `data/battle_road_config.json` 추가
2. snapshot data 로더에 battle road config 연결
3. save migration에 `current.road` 기본값 추가
4. 학년 전투 생성 함수를 12마리 일괄 생성에서 encounter 단위 생성으로 변경
5. 수능 전투 생성 함수를 5마리 일괄 생성에서 4 encounter 생성으로 변경
6. 전투 완료 처리에서 다음 encounter가 있으면 `road.phase = "travel"`로 넘기고, 마지막 encounter면 기존 클리어 로직을 실행
7. `battleSceneLineup`을 encounter pack 렌더러로 교체
8. CSS에 road phase별 카메라/배경/몬스터 팩 모션 추가
9. `tools/apply-visual-asset-patch.mjs` 또는 별도 patch script에 변경 사항 반영
10. smoke test를 새 구조로 갱신

## 검증 계획

- `npm run build:web`
- `npm run visual:verify`
- `npm run visual:smoke`
- `npm run mobile:smoke`
- `npm run retake:smoke`
- `npm run verify:mobile`

검증 기준 변경:

- 메인 학년 전투 첫 화면은 3마리 조우를 기대한다.
- 학년 전투는 4번 완료 후 다음 학년 또는 수능으로 넘어간다.
- N수는 4번의 3개월 조우 후 수능 첫 조우로 넘어간다.
- 수능은 1마리, 1마리, 1마리, 2마리 순서로 나온다.
- 화면 이동감은 Playwright에서 배경 또는 enemy pack transform 변화량으로 측정한다.
- 모바일 360px에서 가로 overflow는 0이어야 한다.

## 구현 결과

- `data/battle_road_config.json`을 추가해 4개 학년/N수 조우와 4개 수능 조우를 테이블로 관리한다. 완료
- `tools/apply-battle-road-patch.mjs`를 추가해 minified snapshot bundle에 Battle Road 런타임을 멱등 적용한다. 완료
- `visual:build`에 `patch:battle-road`를 연결해 기존 visual patch 이후에도 Battle Road 렌더러가 유지되게 했다. 완료
- 학년/N수 조우는 일반 2마리 + 보스 1마리, 수능은 1/1/1/2마리 조우로 생성된다. 완료
- `road-travel`, `road-approach`, `road-combat` 클래스와 `battle-road-lineup`으로 이동감과 몬스터 접근감을 만든다. 완료
- `tools/visual-asset-smoke.mjs`와 `tools/retake-year-smoke.mjs`를 새 조우 기준으로 갱신했다. 완료
- `tools/validate-battle-road-config.mjs`를 추가하고 `verify` 흐름에 포함했다. 완료

## 1차 검증 결과

- `npm run battle-road:verify`: 통과
- `npm run build:web`: 통과
- `npm run visual:smoke`: 통과
- `npm run retake:smoke`: 통과

## 작업 중 확인한 위험 요소

- 현재 런타임이 minified bundle 중심이라 패치 문자열이 길고 깨지기 쉽다.
- `retake:smoke`와 `visual:smoke`는 기존 12마리/5마리 기준에서 Battle Road 3마리/1마리/2마리 기준으로 함께 갱신해야 했다.
- 전투 완료 버튼이 현재는 battle 하나를 끝내는 역할이므로, encounter 단위 진행으로 의미가 바뀐다.
- 수능 마지막 2마리 조우에서 결과 계산은 기존 5과목 점수 산식을 유지해야 한다.

## 권장 순서

1차에서는 메인 학년/N수/수능의 road encounter 시스템을 완성한다.
2차에서는 원정대에 같은 road config 구조를 적용한다.
3차에서는 배경 파노라마와 전경 소품을 더 늘려 60초 이동감 품질을 올린다.
