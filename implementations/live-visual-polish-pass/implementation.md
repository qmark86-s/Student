# 실시간 화면 기반 비주얼 폴리싱 구현서

## 개요

학생탭과 원정대탭을 실제 미리보기 화면 기준으로 확인하면서 배경 연속성, 학생 위치, 몬스터 크기, 클리핑 여부를 폴리싱했다. 브라우저 플러그인은 내부 메타 오류로 직접 제어가 막혀 있어, 실제 브라우저는 `http://127.0.0.1:5173/`에 띄우고 Playwright 기반 검수 스크립트로 같은 화면을 반복 캡처했다.

## 주요 변경

### live 폴리싱 검수 도구

- `tools/live-visual-polish-check.mjs`를 추가했다.
- `npm run live:polish`로 실행한다.
- 매 실행마다 `livePolish` query를 붙여 오래된 HTML/캐시를 피한다.
- 모바일 390x844 기준으로 아래 화면을 캡처한다.
  - `student-start.png`
  - `student-travel-mid.png`
  - `student-approach.png`
  - `student-combat.png`
  - `expedition-start.png`
  - `expedition-combat.png`
- `artifacts/live-visual-polish/report.json`에 주요 rect, 애니메이션, 배경 transform, 몬스터 슬롯 값을 남긴다.
- 콘솔 오류, page error, 가로 overflow는 hard failure로 처리한다.

### 현재 React 산출물 동기화

- 이 구현 당시에는 단일 HTML 산출물을 동기화했지만, 현재 active workflow에서는 React/Vite가 `dist/index.html`을 직접 생성한다.
- 이제 `npm run build:web`는 시각 자산을 준비한 뒤 React 앱을 `dist/`로 빌드한다.
- 화면 확인은 현재 React `dist/`와 Vite 개발 서버를 기준으로 한다.

### 학생탭 몬스터 표시 보정

- `tools/build-visual-assets.mjs`
  - 학생탭 일반 몬스터 기본 크기를 38px로, 보스/수능 몬스터 기본 크기를 52px로 정리했다.
  - 390px 이하 모바일에서는 일반 32px, 보스/수능 46px로 표시한다.
  - fallback 슬롯을 `data/battle_road_config.json`과 같은 값으로 맞췄다.
- `tools/apply-battle-road-patch.mjs`
  - 런타임 renderer fallback 슬롯을 실제 설정값과 동일하게 맞췄다.
- `data/battle_road_config.json`
  - 학생탭 학년 조우 슬롯은 `[[60,80,1],[73,76,1.08],[85,80,1]]` 기준이다.
  - 수능 단일/탐구 동시 조우 슬롯도 데이터로 관리한다.

## 화면 확인 결과

- 학생탭 배경은 시작, 이동 중간, 접근, 전투 캡처에서 같은 교실 파노라마가 연속적으로 지나간다.
- 학생 스프라이트는 0.8배 표시 기준에서 상하 클리핑 없이 바닥 레인 위에 안정적으로 배치된다.
- 학생 공격 전진은 기존 장거리 돌진 느낌 없이 짧은 근접 타격/VFX 중심으로 보인다.
- 일반 몬스터와 보스는 모바일에서도 캐릭터형 오브젝트로 읽히며, 보스 HP 바도 캐릭터 위에 유지된다.
- 원정대 빈 파티 상태에서 몬스터와 배경 클리핑은 발생하지 않았다. 동료 클리핑은 `visual:smoke`의 companion probe로 추가 확인한다.

## 검증

통과한 명령:

```powershell
npm run build:web
npm run live:polish
npm run visual:verify
node tools\validate-battle-road-config.mjs
npm run verify:mobile
```

주요 결과:

- `LIVE_VISUAL_POLISH_OK`
- `VISUAL_ASSETS_OK students=32 mainMonsters=192 companions=75 enemies=40 careers=62`
- `VISUAL_ASSET_AUDIT_OK atlases=5 cells=463`
- `BATTLE_ROAD_CONFIG_OK schoolEncounters=4 suneungEncounters=4`
- `MOBILE_SMOKE_OK`
- `VISUAL_ASSET_SMOKE_OK`
- `CAREER_OUTCOME_SMOKE_OK`
- `RETAKE_YEAR_SMOKE_OK`

## 재검수 방법

1. 미리보기 서버가 없다면 `npm run serve` 또는 `npm run preview`를 실행한다.
2. 브라우저에서 `http://127.0.0.1:5173/`을 연다.
3. 수정 후 `npm run build:web`를 실행한다.
4. 브라우저를 새로고침하고 `npm run live:polish`를 실행한다.
5. `artifacts/live-visual-polish/`의 PNG와 `report.json`을 확인한다.
6. 출시 전에는 `npm run verify:mobile`을 통과시킨다.

## 주의점

- `visual:build`만 실행하면 최종 단일 HTML 산출물을 확인하는 단계가 빠질 수 있다. 화면 확인 전에는 `npm run build:web`를 우선 사용한다.
- 학생탭 몬스터 크기는 CSS 생성값과 `data/battle_road_config.json` 슬롯이 함께 맞아야 자연스럽다.
- fallback 값이 오래된 값으로 남으면 데이터가 정상이어도 패치 재적용이나 일부 미리보기에서 작은 몬스터가 다시 나타날 수 있다.
