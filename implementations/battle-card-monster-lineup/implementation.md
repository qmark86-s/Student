# 전투 카드 몬스터 편대 표시 구현서

## 개요

전투 화면의 `battle-enemy-card`가 HP바 중심 목록처럼 보이던 문제를 개선해, 각 카드가 실제 몬스터 스프라이트를 포함하도록 변경했다.

## 현재 기준

이 구현서는 하단 카드에 미니 몬스터를 붙인 초기 개선 작업 기록이다. 현재 메인 전투는 카드 중심이 아니라 `implementations/battle-road-encounter-flow/implementation.md` 기준의 전투장 내 Battle Road 조우로 표시한다. 학년/N수는 한 화면 3마리 조우 4회, 수능은 1/1/1/2마리 조우 4회가 현재 검증 기준이다.

## 변경 파일

- `tools/apply-visual-asset-patch.mjs`
  - 메인 전투 렌더 호출에 `visual:d`를 전달한다.
  - 시험 탭 렌더 호출에 `visual:Ki(e)`를 전달한다.
  - `la()` 카드 렌더러를 확장해 `battle-enemy-monster main-monster-000` 형식의 span을 추가한다.

- `tools/build-visual-assets.mjs`
  - `src/snapshot/visual-assets.css`에 미니 몬스터 공통 스타일을 생성한다.
  - `mainMonsterAtlas` 기준으로 `main-monster-000`부터 `main-monster-191`까지 CSS 프레임 매핑을 생성한다.
  - compact 전투장에서는 큰 몬스터 이름 라벨을 숨겨 하단 카드와 겹치지 않게 했다.

- `tools/visual-asset-smoke.mjs`
  - 현재 Battle Road 첫 조우에서 3개 전투장 몬스터가 표시되고 실제 data image 배경을 갖는지 확인한다.

- `tools/retake-year-smoke.mjs`
  - N수 선택 직후 3개월 조우 1/4가 생성되는지 확인한다.
  - N수 4번째 조우 완료 후 수능 4개 조우가 순서대로 생성되는지 확인한다.

- `tools/verify-visual-assets.mjs`
  - 생성 CSS에 미니 몬스터 스타일, `__STUDENT_ASSET_003__`, 최종 프레임 매핑이 있는지 확인한다.

## 프레임 선택 규칙

- 일반 카드: `grade_visuals.normalMonsterFrames[(month - 1) % normalMonsterFrames.length]`
- 보스 카드: `year_boss`, `final`, `september_mock`, `suneung` 순서로 사용 가능한 시험 프레임을 선택한다.
- 수능 카드: `march_mock`, `june_mock`, `september_mock`, `suneung`, 첫 일반 몬스터 프레임을 과목 순서대로 배치한다.

현재 Battle Road에서는 같은 프레임 풀을 사용하되 `data/battle_road_config.json`의 현재 조우에 포함된 몬스터만 렌더링한다.

## 검증 결과

```powershell
npm run visual:qa
npm run retake:smoke
npm run verify:mobile
```

- 기본 전투 첫 조우: `battleLineupCount=3`, `battleLineupImages=3`, overflow 0
- N수 전투: 3개월 조우 4회 후 수능 1/4로 진입
- 수능 전투: 1/1/1/2마리 순차 조우 후 결과 대기 복귀
- 모바일 360px/412px smoke overflow 0
