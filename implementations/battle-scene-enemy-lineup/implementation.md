# 전투장 적 편대 표시 구현서

## 개요

사용자 요청에 맞춰 메인 전투장의 하단 적 체력바 카드를 제거하고, 몬스터가 전투장 안에 캐릭터로 직접 등장하도록 구현했다. 보스와 수능 적만 캐릭터 위에 HP바를 표시한다.

## 주요 변경

- 메인 전투장
  - `battle-enemy-card` compact 목록 대신 `battleSceneLineup` 렌더러를 사용한다.
  - 전투장 안에는 `battle-scene-enemy` 요소가 12개 또는 5개 표시된다.
  - 기존 단일 `enemy-stack`은 메인 전투장에서 숨긴다.

- 보스 HP바
  - `boss`, `suneung` 적에게만 `battle-scene-hp`가 생성된다.
  - 일반 몬스터에는 HP바를 생성하지 않는다.

- 프레임 선택
  - 일반 몬스터: 월 순서에 따라 `normalMonsterFrames`를 순환 사용한다.
  - 보스 몬스터: 3/6/9/12월에 맞춰 `march_eval`/`march_mock`, `midterm`/`june_mock`, `final`/`september_mock`, `year_boss`/`suneung` 순으로 프레임을 선택한다.
  - 수능 몬스터: 5과목에 서로 다른 수능/모의고사 계열 프레임을 배치한다.

## 변경 파일

- `tools/apply-visual-asset-patch.mjs`
  - 메인 전투장 렌더 호출을 `battleSceneLineup`으로 교체한다.
  - `battleSceneLineup` 함수를 번들에 삽입한다.

- `tools/build-visual-assets.mjs`
  - 전투장 적 편대 CSS를 생성한다.
  - `battle-scene-monster-art`가 메인 몬스터 아틀라스 `__STUDENT_ASSET_003__`을 사용한다.

- `tools/visual-asset-smoke.mjs`
  - 전투장 캐릭터 수, 보스 수, HP바 수, 텍스트 카드 제거를 검증한다.

- `tools/retake-year-smoke.mjs`
  - N수 12개월 전투와 수능 5마리 전투를 새 장면 기준으로 검증한다.

## 검증 결과

```powershell
npm run visual:qa
npm run retake:smoke
```

- 기본 전투: `battleLineupCount=12`, `battleLineupBosses=4`, `battleLineupHpBars=4`, `arenaTextCards=0`
- N수 전투: `sceneEnemies=12`, `sceneBosses=4`, `normalHpBars=0`
- 수능 전투: `sceneEnemies=5`, `sceneSuneungEnemies=5`, `sceneHpBars=5`

