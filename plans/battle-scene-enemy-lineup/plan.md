# 전투장 적 편대 표시 Plan

## 목표

하단 체력바 카드가 아니라, 전투장 안에 몬스터들이 캐릭터로 직접 등장하게 만든다. 화면의 텍스트 밀도를 줄이고 게임 화면처럼 읽히게 하는 것이 핵심이다.

## 요구사항

- 12개월 전투는 전투장 안에 12마리 적을 모두 배치한다.
- 일반 몬스터와 보스 몬스터가 섞여 보여야 한다.
- 일반 몬스터는 별도 HP바를 표시하지 않는다.
- 보스 몬스터는 캐릭터 위에 작은 HP바를 표시한다.
- 수능 전투는 5마리 적을 전투장 안에 배치하고, 시험 보스처럼 HP바를 표시한다.
- 하단 카드에 월/과목/일반/보스 텍스트를 반복 표시하지 않는다.

## 구현 계획

1. `tools/apply-visual-asset-patch.mjs`
   - 메인 전투장의 compact `battle-enemy-card` 호출을 `battleSceneLineup`으로 교체한다.
   - `battleSceneLineup`은 `grade_visuals`의 몬스터 프레임을 사용해 적 캐릭터를 배치한다.
   - 보스 월은 3/6/9/12월에 맞는 시험 프레임을 우선 사용한다.

2. `tools/build-visual-assets.mjs`
   - `battle-scene-lineup`, `battle-scene-enemy`, `battle-scene-hp` CSS를 생성한다.
   - 기존 단일 `enemy-stack`은 메인 전투장에서 숨긴다.
   - 일반 몬스터에는 HP바를 만들지 않고, 보스/수능 적에게만 HP바를 표시한다.

3. 검증
   - `visual:smoke`: 기본 전투장에 적 12마리, 보스 4마리, 보스 HP바 4개, 텍스트 카드 0개인지 확인한다.
   - `retake:smoke`: N수 12개월 전투 뒤 수능 5마리 전투가 나오는지 확인한다.
   - 모바일 smoke에서 가로 overflow가 없어야 한다.

## 구현 결과

- 완료일: 2026-06-20
- 기본 전투장: 적 캐릭터 12마리, 보스 4마리, 보스 HP바 4개, 텍스트 카드 0개
- N수 12개월 전투: 적 캐릭터 12마리, 보스 HP바 4개
- 수능 전투: 수능 적 캐릭터 5마리, HP바 5개
- `npm run visual:qa`, `npm run retake:smoke` 통과

