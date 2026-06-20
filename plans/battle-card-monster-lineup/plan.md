# 전투 카드 몬스터 편대 표시 Plan

## 목표

전투 화면 하단의 체력바 카드가 단순 진행 목록처럼 보이지 않게, 각 카드마다 실제 몬스터 스프라이트를 표시한다.

## 요구사항

- 학년/N수 12개월 전투는 12장의 카드에 12마리 몬스터를 모두 보여준다.
- 일반 월에는 일반 몬스터를, 시험 월에는 보스 몬스터를 섞어서 보여준다.
- 수능 전투는 5과목 카드에 5마리 몬스터를 모두 보여준다.
- 큰 몬스터와 같은 `asset-003.png` 메인 몬스터 아틀라스를 사용해 화면 톤을 통일한다.
- 모바일 390px 기준에서 가로 overflow와 텍스트 겹침이 없어야 한다.

## 구현 계획

1. `tools/apply-visual-asset-patch.mjs`
   - 메인 전투와 시험 탭의 `battle-enemy-card` 렌더링에 `battle-enemy-monster` span을 추가한다.
   - `grade_visuals`의 `normalMonsterFrames`, `examMonsterFrames`를 기준으로 카드별 프레임을 결정한다.
   - 일반/보스/수능 카드에 `main-monster-000` 형식의 프레임 클래스를 부여한다.

2. `tools/build-visual-assets.mjs`
   - `src/snapshot/visual-assets.css`에 미니 몬스터 스타일과 메인 몬스터 프레임 매핑을 생성한다.
   - 모바일 compact 그리드에서도 6열 2줄이 유지되도록 크기를 제한한다.

3. 검증
   - `tools/visual-asset-smoke.mjs`: 기본 전투에서 12개 미니 몬스터와 실제 이미지 배경을 확인한다.
   - `tools/retake-year-smoke.mjs`: N수 12개월 전투 후 수능 5과목 전투가 각각 12/5개 미니 몬스터를 표시하는지 확인한다.
   - `tools/verify-visual-assets.mjs`: CSS 생성물에 미니 몬스터 스타일과 프레임 매핑이 있는지 확인한다.

## 품질 기준

- 레퍼런스 톤은 현재 컨택트시트 수준의 픽셀 & 복셀 캐릭터/소품 밀도다.
- 실제 게임 화면에서는 레퍼런스보다 조금 단순해도 되지만, CSS 도형처럼 보이면 실패로 본다.
- 미니 몬스터는 작은 크기에서도 실루엣과 보스 구분이 읽혀야 한다.

## 구현 결과

- 완료일: 2026-06-20
- 메인 전투 하단 카드와 시험 탭 카드에 `battle-enemy-monster` 스프라이트를 추가했다.
- 12개월 전투는 8종 일반 몬스터와 시험월 보스 몬스터가 섞인 12마리 편대로 표시된다.
- 수능 전투는 5과목 카드 각각에 5개 프레임을 배치한다.
- `src/snapshot/visual-assets.css` 생성물에 미니 몬스터 스타일과 `main-monster-000`부터 `main-monster-191`까지 프레임 매핑을 추가했다.
- 전투장 안에서 큰 몬스터 이름 라벨이 하단 카드와 겹치지 않도록 compact 전투장에서는 숨긴다.
- `npm run visual:qa`, `npm run retake:smoke`, `npm run verify:mobile`을 통과했다.

## 대체 구현

- 사용자가 원한 방향은 하단 카드 강화가 아니라 전투장 안 캐릭터 편대 표시였으므로, 메인 전투장에서는 이 카드 방식이 제거되었다.
- 현재 기준 문서는 `plans/battle-scene-enemy-lineup/plan.md`다.
- 시험 탭의 상세 목록은 관리용 UI로 남길 수 있지만, 메인 게임 화면은 `battleSceneLineup`을 사용한다.
