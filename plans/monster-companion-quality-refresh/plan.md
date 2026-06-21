# 몬스터/직업동료 품질 리프레시 계획

## 목표

- 원정대 직업동료와 학습도우미를 `assets/reference/character-ref-cute-sd.png` 기준의 귀여운 3등신 SD 톤으로 통일한다.
- 직업동료는 같은 학생 베이스를 반복해 보이지 않도록 헤어, 얼굴 인상, 의상 실루엣, 손소품을 직업군별로 다양화한다.
- 원정대 몬스터는 길쭉한 팔다리형 박스 몬스터가 아니라 귀엽고 피규어 같은 학습/생활 오브젝트 몬스터로 재정의한다.
- 모든 직업동료는 `->`, 원정대 몬스터는 `<-` 방향으로 보이며, 4프레임 이동 포즈가 실제로 달라야 한다.
- 상단/하단 잘림, 프레임별 커졌다 작아짐, 중심축 흔들림, 누끼 잔여가 자동 검수와 확대 리뷰에서 드러나야 한다.

## 구현 범위

1. `tools/generate-professional-sprite-sources.py`
   - 직업동료 베이스 학생을 한 명으로 고정하지 않고 여러 SD 베이스에서 안정적으로 선택한다.
   - 직업/헬퍼별 deterministic appearance profile을 추가한다.
   - 헤어/얼굴/악세서리/의상/소품 오버레이를 직업군과 career id로 분기한다.
   - 몬스터 몸체를 motif별 노트, 폴더, 타이머, 모니터, 차트, 여권, 회로, 산봉우리 같은 피규어형 오브젝트로 교체한다.
   - 몬스터 손발은 선택사항으로 두되, 긴 팔다리는 제거하고 작은 장갑/발 받침/볼터치 중심으로 만든다.

2. `tools/prepare-professional-sprites.py`
   - 프레임별 bbox 상하 여백, alpha bbox, solid bbox를 리포트에 남긴다.
   - 원본 시트 프레임과 정규화 프레임을 나란히 확대 비교할 수 있는 리뷰 시트를 생성한다.

3. `tools/asset-factory/summarize-professional-report.mjs`
   - solid height/width drift, bbox height/width drift, top/bottom margin 최소값을 실패 기준에 포함한다.
   - 동료/몬스터가 같은 가족 안에서 지나치게 작거나 좁아진 경우 실패로 잡는다.

4. `tools/asset-factory/audit-sprite-integrity.py`
   - 상하 여백과 누끼 검사는 유지하고, 프레임별 크기 흔들림 요약을 더 명확히 남긴다.

5. 문서
   - `docs/asset_sprite_factory.md`
   - `docs/visual_asset_production.md`
   - `implementations/monster-companion-quality-refresh/implementation.md`

## 검수 기준

- `npm run asset:factory:review` 통과
- `npm run asset:integrity` 통과
- `npm run visual:smoke` 통과
- `npm run verify:mobile` 통과
- `professional-axis-review-page-*.png`에서 직업동료의 헤어/실루엣/소품이 반복되어 보이지 않을 것
- `professional-zoom-review-page-*.png`에서 원본 4프레임과 정규화 4프레임이 모두 잘리지 않을 것
- 원정대 실제 화면 스모크에서 캐릭터/몬스터 클리핑 0건
