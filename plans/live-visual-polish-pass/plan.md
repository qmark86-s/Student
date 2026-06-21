# 실시간 화면 기반 비주얼 폴리싱 계획

## 목표

로컬 미리보기 화면을 실제로 띄운 상태에서 학생탭과 원정대탭의 주요 화면을 반복 확인하고, 배경/캐릭터/몬스터/여백/클리핑/텍스트 피로도를 상용 기준으로 폴리싱한다.

## 현재 분석

- 미리보기 서버는 `http://127.0.0.1:5173/`에서 `index.html`을 제공한다.
- 브라우저 플러그인은 현재 내부 메타 오류로 직접 제어가 막혀 있어, 실제 브라우저를 띄우고 repo-local Playwright 검수 스크립트로 화면을 캡처한다.
- 기존 `visual:smoke`는 기본 화면 검증에는 좋지만, 폴리싱 중 특정 시점/탭/상태를 반복 비교하기에는 캡처 목록이 제한적이다.
- 학생탭 배경, 캐릭터 위치, 공격 거리, 원정대 캐릭터/몬스터 클리핑은 실제 화면 캡처를 기준으로 판단해야 한다.
- `build:web`가 기존에는 `dist/index.html`만 갱신해 루트 `index.html` 미리보기와 `dist` 미리보기가 서로 다른 전투 배치 값을 보여줄 수 있었다.
- 학생탭 몬스터 슬롯 데이터는 새 값이었지만, 도구 fallback과 루트 단일 HTML에 옛 소형 슬롯 값이 남아 실제 화면에서 몬스터 존재감이 약해졌다.

## 사용 도구

- 실제 브라우저 미리보기: `http://127.0.0.1:5173/`
- `Asset Sprite Factory` 스킬
- `docs/asset_sprite_factory.md`
- `tools/visual-asset-smoke.mjs`
- 신규 `tools/live-visual-polish-check.mjs`
- 검증 명령: `npm run build:web`, `npm run visual:verify`, `npm run verify:mobile`

## 구현 계획

1. 실시간 검수 캡처 도구 추가
   - 모바일 비율 viewport로 학생탭 시작/전투/원정대 화면을 캡처한다.
   - 학생탭은 시작, 이동 중간, 접근, 전투 시점을 나눠 캡처한다.
   - 매 실행마다 `livePolish` query를 붙여 캐시와 오래된 HTML을 피한다.
   - 캡처 결과를 `artifacts/live-visual-polish/`에 저장한다.
   - 캡처별 현재 탭, 전투 문구, 주요 stage rect 정보를 JSON으로 남긴다.

2. 화면 품질 점검
   - 학생탭 배경이 바닥/벽 경계를 충분히 보여주는지 확인한다.
   - 캐릭터와 몬스터가 위/아래로 잘리거나 너무 위에 붙어 보이지 않는지 확인한다.
   - 원정대 캐릭터/몬스터가 실제 전투 화면에서 클리핑 없이 움직이는지 확인한다.
   - UI 텍스트가 전투 화면을 과하게 덮어 게임감을 낮추는지 확인한다.

3. 폴리싱 반영
   - 문제가 확인되면 `data/battle_road_config.json`과 `tools/build-visual-assets.mjs`의 데이터/생성 로직으로 우선 해결한다.
   - 런타임 하드코딩 대신 설정값과 생성 CSS를 통해 반영한다.
   - 자산 자체 문제이면 Asset Sprite Factory 검증 기준을 통과하도록 전처리/프로필을 수정한다.
   - `tools/apply-battle-road-patch.mjs`와 `tools/build-visual-assets.mjs`의 fallback 슬롯도 `data/battle_road_config.json`과 같은 값으로 맞춘다.
   - 모바일 미디어쿼리에서 줄어드는 몬스터 크기를 보정해 학생탭에서 일반 몬스터와 보스가 캐릭터형 오브젝트로 읽히게 한다.
   - `tools/prepare-web.mjs`는 `build:web` 실행 시 `index.html`, 공유 HTML, `dist/index.html`을 함께 생성한다.

4. 반복 검증
   - 변경 후 `npm run build:web`로 단일 HTML을 갱신한다.
   - 실제 브라우저는 새로고침해 확인하고, 자동 캡처를 다시 생성한다.
   - `npm run visual:verify`, `npm run verify:mobile`로 회귀를 확인한다.

## 완료 기준

- 학생탭 시작/전투 화면에서 바닥과 배경 경계가 명확하다.
- 학생, 학습 도우미, 몬스터가 화면 위/아래로 잘려 보이지 않는다.
- 원정대탭의 동료와 몬스터 스프라이트가 클리핑 없이 표시된다.
- 폴리싱 결과가 미리보기와 캡처 산출물에서 확인 가능하다.
- 신규 검수 도구와 구현 문서가 남아 다음 작업자가 같은 방식으로 재검수할 수 있다.

## 수행 결과

- `tools/live-visual-polish-check.mjs`를 추가하고 `npm run live:polish`로 실행 가능하게 했다.
- `build:web`가 `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`을 모두 갱신하도록 정리했다.
- 학생탭 몬스터 슬롯 fallback을 `school=[[60,80,1],[73,76,1.08],[85,80,1]]`, `suneungSingle=[[76,76,1]]`, `suneungPair=[[68,74,0.95],[82,80,0.9]]`로 통일했다.
- 모바일 학생탭 몬스터 표시 크기를 일반 32px, 보스/수능 46px로 보정했다.
- 초등 배경 시작 offset은 교실 바닥과 칠판이 안정적으로 보이는 구간으로 유지했다.

## 검증 결과

- `npm run live:polish`: 통과, console/page error 0건, horizontal overflow 0px
- `npm run visual:verify`: 통과
- `node tools/validate-battle-road-config.mjs`: 통과
- `npm run verify:mobile`: 통과

주요 확인 산출물:

- `artifacts/live-visual-polish/student-start.png`
- `artifacts/live-visual-polish/student-travel-mid.png`
- `artifacts/live-visual-polish/student-approach.png`
- `artifacts/live-visual-polish/student-combat.png`
- `artifacts/live-visual-polish/expedition-start.png`
- `artifacts/live-visual-polish/expedition-combat.png`
- `artifacts/live-visual-polish/report.json`
