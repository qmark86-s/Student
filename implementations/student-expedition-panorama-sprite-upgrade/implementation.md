# 학생/원정대 파노라마와 스프라이트 품질 업그레이드 구현서

## 개요

학생 전투 화면의 배경 이동감을 원정대 화면과 같은 파노라마 방식으로 바꾸고, 원정대 직업동료/학습도우미/몬스터를 Asset Sprite Factory 생성 흐름에 맞춰 재제작했다.

이번 변경의 기준은 다음과 같다.

- 학생 전투 배경은 CSS 격자나 단순 좌우 흔들림이 아니라 원화급 PNG 파노라마가 흐른다.
- 직업동료와 학습도우미는 항상 오른쪽을 본다.
- 원정대 몬스터는 항상 왼쪽을 본다.
- 생성 결과는 manifest, visual metadata, CSS token, smoke, contact sheet에서 재검증 가능해야 한다.

## 주요 변경

- `tools/build-visual-assets.mjs`
  - `visual-companions.png`를 직업동료 62개와 학습도우미 13개, 총 75개 구조로 확장했다.
  - 동료 아틀라스를 128px 단순 아이콘에서 160px 고밀도 캐릭터 셀로 올렸다.
  - 직업군별 프로필을 추가해 의료, 법조, 기술, 금융, 교육, 항공, 제복, 셰프, 미디어 계열의 복장/모자/소품 실루엣을 구분했다.
  - 직업동료는 `career-unit-{careerId}` CSS 클래스로 매핑한다.
  - companion item metadata에 한글 이름, 지원 역할, 전투 소품, 티어, 방향을 기록한다.
  - 원정대 표시 크기는 `.expedition-unit-avatar.large` 기준 약 42x62px로 보정해 실제 화면에서도 직업 소품이 읽히게 했다.
  - 원정대 몬스터는 tone별 일반 3종과 보스 1종을 왼쪽 방향으로 생성한다.
  - 학생 전투 파노라마 배경을 초등/중등/고등/N수 4개 PNG로 생성하고 `__STUDENT_ASSET_011__`~`__STUDENT_ASSET_014__`에 연결한다.
  - `.pixel-arena::before`가 `battleRoadBackdropPan` transform 애니메이션으로 긴 배경을 이동시킨다.
  - 원정대 배경은 최신 기준에서 챕터별 route tile `visual-expedition-backdrop-{theme}-{00..09}.png` 100개로 분리 생성한다. `visual-expedition-backdrops.png`와 `__STUDENT_ASSET_010__`은 호환용 기본 배경으로 유지한다.

- `tools/apply-visual-asset-patch.mjs`
  - 원정대 유닛 렌더링에서 직업 데이터가 있으면 helper sprite 대신 `career-unit-*` 클래스를 우선 반환하게 했다.
  - 기존 helper fallback은 유지했다.

- `tools/verify-visual-assets.mjs`
  - 새 배경 토큰 4개, `battleRoadBackdrops` metadata, companion count, career unit mapping, direction metadata, companion cell 160px 하한을 검증한다.

- `tools/visual-asset-smoke.mjs`
  - 학생 전투 파노라마 data image와 transform 이동량을 확인한다.
  - 원정대 직업동료 probe가 `career-unit-doctor` 이미지를 받는지 확인한다.
  - 원정대 실제 화면 크기에서 동료 샘플을 확인할 수 있도록 `expedition-companion-probe.png`를 남긴다.
  - 기존 저밀도 학생 전투 배경과 격자가 숨겨졌는지 확인한다.

- `tools/visual-asset-contact-sheet.mjs`
  - HTML 컨택트시트와 함께 PNG 스크린샷을 생성한다.
  - 배경 자산이 여러 파일일 때 각 배경을 개별 타일로 보여준다.

- `docs/visual_asset_production.md`
  - 학생 전투 파노라마 기준, 직업동료/원정대 몬스터 방향 기준, 컨택트시트 PNG 산출물을 문서화했다.

## 자산 토큰

- `__STUDENT_ASSET_007__`: `assets/visual-companions.png`
- `__STUDENT_ASSET_008__`: `assets/visual-enemies.png`
- `__STUDENT_ASSET_010__`: `assets/visual-expedition-backdrops.png` 호환용 기본 배경
- `__STUDENT_ASSET_011__`: `assets/visual-battle-road-backdrop-elementary.png`
- `__STUDENT_ASSET_012__`: `assets/visual-battle-road-backdrop-middle.png`
- `__STUDENT_ASSET_013__`: `assets/visual-battle-road-backdrop-high.png`
- `__STUDENT_ASSET_014__`: `assets/visual-battle-road-backdrop-repeater.png`

학생 전투 배경은 처음에는 단일 합본 PNG로 검토했지만, data URL이 너무 커져 브라우저 미리보기에서 누락될 수 있어 행별 파일로 분리했다.
원정대 배경도 최신 기준에서는 1~10챕터가 같은 파노라마를 공유하지 않고, `backdropClass`와 Stage tile index에 맞는 PNG 파일을 React에서 `--expedition-bg-image`로 바인딩한다.

## 검증 결과

마지막 확인 명령:

```powershell
npm run build:web
npm run visual:verify
npm run visual:sheet
npm run visual:smoke
npm run mobile:smoke
```

확인된 주요 수치:

- `visual:build`: students 32, mainMonsters 192, companions 75, enemies 40, careers 124, expeditionBackdrops 10, battleRoadBackdrops 4
- `visual:build`: `visual-companions.png` 12000x160, 75 items
- `visual:verify`: `VISUAL_ASSETS_OK`
- `visual:smoke`: 학생 배경 이동량 약 28px, 몬스터 팩 접근 약 82px, horizontal overflow 0
- `mobile:smoke`: 360px, 412px viewport 모두 horizontal overflow 0

## 산출물

- 컨택트시트 HTML: `artifacts/visual-asset-contact-sheet/index.html`
- 컨택트시트 PNG: 기본은 `artifacts/visual-asset-contact-sheet/contact-sheet.png`이며, 페이지가 길면 `contact-sheet-page-01.png`처럼 분할된다.
- 스모크샷: `artifacts/visual-asset-smoke/main-battle.png`, `artifacts/visual-asset-smoke/expedition.png`
- 원정대 동료 probe: `artifacts/visual-asset-smoke/expedition-companion-probe.png`
- 모바일 스모크샷: `artifacts/mobile-smoke/phone-small.png`, `artifacts/mobile-smoke/phone-standard.png`

`artifacts/`는 검수용 산출물이며 git 커밋 대상이 아니다.

## 재사용 기준

다른 Agent가 같은 방식으로 작업할 때는 다음 순서를 지킨다.

1. `AGENTS.md`, `docs/asset_sprite_factory.md`, `docs/visual_asset_production.md`를 읽는다.
2. 생성 로직은 `tools/build-visual-assets.mjs`에 추가하고, 런타임 patch는 별도 patch script에 멱등 적용한다.
3. 새 자산 token은 `src/snapshot/manifest.json`, `data/visual_assets.json`, CSS, verify script가 모두 같은 값을 보게 한다.
4. `npm run visual:sheet`로 컨택트시트 PNG를 확인한다.
5. `npm run visual:smoke`와 `npm run mobile:smoke`로 실제 화면을 확인한다.
