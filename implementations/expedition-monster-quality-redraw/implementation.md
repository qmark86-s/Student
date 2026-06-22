# 원정대 몬스터 퀄리티 재제작 구현서

## 목적

원정대에 등장하는 몬스터만 대상으로 기존 반복 도형/텍스트형 표현을 버리고, 지역과 위치 특색이 읽히는 고품질 SD 오브젝트형 몬스터 40종으로 교체했다. 학생/동료 스프라이트와 같은 Asset Sprite Factory 파이프라인을 사용해 원본 생성, 정규화, 아틀라스 패킹, 화면 검증까지 한 흐름으로 묶었다.

## 변경 범위

- 생성기: `tools/generate-professional-sprite-sources.py`
- 아틀라스/CSS 패킹: `tools/build-visual-assets.mjs`
- 원정대 텍스트 스모크: `tools/visual-asset-smoke.mjs`
- 비주얼 검증: `tools/verify-visual-assets.mjs`
- 원본 시트: `assets/visual-source/expedition-enemies/`
- 정규화 프레임: `src/snapshot/assets/individual/expedition-enemies/`
- 최종 아틀라스: `src/snapshot/assets/visual-enemies.png`
- 런타임 CSS: `src/snapshot/visual-assets.css`, `src/snapshot/styles.css`
- 스냅샷 산출물: `index.html`, `share/Student-Idle-RPG-mobile.html`, `dist/index.html`

## 몬스터 디자인 기준

원정대 몬스터는 `direction: "left"` 기준이다. 단순 좌우 반전만으로 처리하지 않고, 눈동자 위치와 손소품 방향을 파티 쪽으로 보이게 생성한다. 몬스터 위에는 이름, WAVE, 숫자 텍스트를 표시하지 않는다.

지역별 motif는 다음 기준으로 고정했다.

- shelter: 월세 고지함, 대기 번호표, 구겨진 이력서, 자립 게이트
- studio: 세탁 바구니, 야간 컵, 주문 러시 타이머, 보증금 금고
- neighborhood: 가격표, 병원 예약 달력, 학원책, 대출 심사 폴더
- company: 출입 게이트, 메일 인박스, 스프레드시트 모니터, 오피스 빌딩
- office: 회의 보드, 안건 클립보드, 발표대, 회의록 더미
- asset: 수익 코인, 변동 차트, 리스크 금고, 시장 금고
- national: 민원 서류, 승인 도장, 관공서, 국가 과제탑
- global: 여권, 무역 상자, 시간대 글로브, 컨퍼런스 단상
- future: AI 칩, 데이터 큐브, 바이오 플라스크, 싱귤래리티 코어
- summit: 정상 깃발, 기후 행성, 평화 협상 테이블, 의사결정망

## 파이프라인

1. `tools/generate-professional-sprite-sources.py`가 형광 녹색 배경의 4프레임 원정대 몬스터 시트를 생성한다.
2. `tools/prepare-professional-sprites.py`가 chroma key 제거, 160x160 정규화, 중심축/발 기준선 고정을 수행한다.
3. `tools/build-visual-assets.mjs`가 `visual-enemies.png` 아틀라스와 런타임 CSS를 만든다.
4. 원정대 화면에서는 `.expedition-enemy-visual::before`만 실제 몬스터 스프라이트를 표시하고, 레거시 CSS body/text 레이어는 숨긴다.

## 검증 결과

- `npm run asset:factory:prepare`: 통과
  - `expeditionEnemies count=40`
  - `minPoseDelta=5.119`
  - `maxCenterDelta=0.5`
  - `maxBaselineDelta=0`
  - `minTopMargin=9`, `minBottomMargin=9`
  - `failures=[]`
- `npm run visual:verify`: 통과
  - `VISUAL_ASSETS_OK students=32 mainMonsters=192 companions=75 enemies=40 careers=62`
  - `VISUAL_ASSET_AUDIT_OK atlases=5 cells=463`
- `npm run build:web`: 통과
  - `dist/index.html` 생성, sha256 `f327b6ad21073de91bebd7c5d9ee94bebca627b8033f1475d297cbf6292b9109`
- `npm run visual:smoke`: 통과
  - `enemyTextVisibleCount=0`
  - 원정대 몬스터 클리핑 0건
- `npm run verify:mobile`: 통과

## 눈검수 산출물

- 원정대 실제 화면: `artifacts/visual-asset-smoke/expedition.png`
- 원정대 몬스터 아틀라스: `src/snapshot/assets/visual-enemies.png`
- 원본/정규화 확대 비교: `artifacts/visual-asset-samples/professional-zoom-review-page-38.png` 이후 원정대 몬스터 구간

`artifacts/`는 커밋 대상이 아닌 검수 산출물이다. 다른 Agent가 이어 작업할 때는 `npm run asset:factory:prepare` 후 professional zoom review와 실제 원정대 smoke screenshot을 같이 확인한다.
