# 비주얼 자산 퀄리티 개선 구현

## 적용 일자

- 2026-06-20

## 구현 범위

- 기본 학년 전투 학생 시트 `src/snapshot/assets/asset-002.png`를 16프레임 픽셀 캐릭터 아틀라스로 재생성했다.
- 기본 학년/수능 전투 몬스터 시트 `src/snapshot/assets/asset-003.png`를 192프레임 학습 몬스터 아틀라스로 재생성했다.
- 원정대 동료용 `src/snapshot/assets/visual-companions.png` 13종을 추가했다.
- 원정대 일반 몬스터/보스용 `src/snapshot/assets/visual-enemies.png` 40종을 추가했다.
- 직업 선택/도감용 `src/snapshot/assets/visual-careers.png` 62종을 추가했다.
- `src/snapshot/visual-assets.css`를 생성해 CSS 도형 기반 원정대 유닛, 원정대 몬스터, 직업 색상 원형을 픽셀 아틀라스로 대체했다.

## 데이터 키

- `data/careers.json`
  - `portraitAsset`
  - `spriteAsset`
  - `iconAsset`
- `data/grade_visuals.json`
  - `studentAsset`
  - `normalMonsterAssets`
  - `examMonsterAssets`
- `data/expedition_stages.json`
  - `enemyAsset`
  - `enemyVariant`
- `data/expedition_bosses.json`
  - `bossAsset`
- `data/visual_assets.json`
  - 생성된 아틀라스, 토큰, 셀 크기, 항목 목록을 관리한다.

## 파이프라인

- `tools/build-visual-assets.mjs`
  - PNG 아틀라스 생성, 매니페스트 해시 갱신, 비주얼 CSS 생성, 데이터 키 보강을 수행한다.
- `tools/apply-visual-asset-patch.mjs`
  - 스냅샷 번들 내 직업 결과/도감 렌더링에 직업 초상화 클래스를 연결한다.
- `tools/verify-visual-assets.mjs`
  - 매니페스트 크기/해시, PNG 크기, CSS 토큰, 데이터 키와 아틀라스 항목의 연결을 검증한다.
- `tools/visual-asset-audit.mjs`
  - PNG 셀별 coverage, 색상 수, bounds를 검사해 빈 칸과 단순한 팔레트를 차단한다.
- `tools/visual-asset-contact-sheet.mjs`
  - 전체 아틀라스를 사람이 빠르게 검수할 수 있는 HTML 컨택트시트를 생성한다.
- `tools/visual-asset-smoke.mjs`
  - 메인 전투 학생/몬스터와 원정대 몬스터의 실제 data image 렌더링 및 모바일 overflow를 확인한다.
- `tools/snapshot-build.mjs`
  - `styles.css`와 `visual-assets.css`를 함께 단일 HTML에 인라인한다.

## 스크립트 연결

- `npm run visual:build`
- `npm run visual:verify`
- `npm run visual:audit`
- `npm run visual:sheet`
- `npm run visual:smoke`
- `npm run visual:qa`
- `npm run snapshot:build`
- `npm run build:web`
- `npm run preview`
- `npm run verify:mobile`

위 명령들은 비주얼 자산 생성/검증을 거치도록 연결했다.

## 검증 결과

- `npm run visual:verify`
  - 학생 16프레임, 메인 몬스터 192프레임, 원정대 동료 13종, 원정대 몬스터 40종, 직업 62종 검증 통과
  - 품질 감사 5개 아틀라스, 323개 셀 통과
- `npm run verify:mobile`
  - 밸런스 검증 통과
  - 레퍼런스 감사 통과
  - 단일 HTML 빌드 통과
  - 모바일 360/412 스모크 통과
  - 메인 전투/원정대 비주얼 스모크 통과
  - 직업 선택 62개 및 초상화 배경 62개 검증 통과
  - N수 12개월 후 수능 전투 흐름 검증 통과

## 산출물 스크린샷

- `artifacts/mobile-smoke/phone-small.png`
- `artifacts/mobile-smoke/phone-standard.png`
- `artifacts/career-outcome-smoke/career-choice-ranked.png`
- `artifacts/visual-asset-smoke/expedition.png`
