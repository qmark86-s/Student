# PNG 스프라이트 패밀리 고도화 구현 기록

## 요약

학생 캐릭터 제작 방식과 같은 PNG 기반 파이프라인으로 직업동료, 학습도우미, 원정대 몬스터를 다시 만들었다. CSS 아이콘처럼 보이던 저밀도 자산을 160px 셀의 4프레임 스프라이트로 바꾸고, 런타임 애니메이션이 실제 프레임을 순환하도록 연결했다.

## 주요 변경

- `tools/generate-professional-sprite-sources.py`
  - 직업동료/학습도우미 75종 원본 시트 생성
  - 원정대 몬스터 40종 원본 시트 생성
  - `data/professional_sprite_manifest.json` 작성
- `tools/prepare-professional-sprites.py`
  - 형광 초록 chroma key 제거
  - 160x160 셀 정규화
  - `centerX=80`, `baselineY=148` 축 고정
  - 포즈 차이, 중심축, 발 기준선 검증
- `tools/build-visual-assets.mjs`
  - `visual-companions.png`를 4프레임/남녀 행 아틀라스로 패킹
  - `visual-enemies.png`를 4프레임 원정대 몬스터 아틀라스로 패킹
  - 학생 전투 몬스터를 스타일 보드 기반 PNG 컷으로 교체
- `tools/apply-visual-asset-patch.mjs`
  - 원정대 직업동료에 `unit-gender-male`/`unit-gender-female` 클래스를 부여
- `tools/verify-visual-assets.mjs`
  - 전문 스프라이트 축 리포트, 프레임 수, 성별 행, 방향, 아틀라스 메타 검증 추가
- `tools/asset-factory/run.mjs`
  - `asset:factory:review`, `asset:factory:qa`에서 전문 스프라이트 리포트 요약과 리뷰 시트 생성

## 산출물

- `assets/visual-source/companions/`
- `assets/visual-source/expedition-enemies/`
- `src/snapshot/assets/individual/companions/`
- `src/snapshot/assets/individual/expedition-enemies/`
- `src/snapshot/assets/visual-companions.png`
- `src/snapshot/assets/visual-enemies.png`
- `src/snapshot/assets/asset-003.png`
- `artifacts/visual-asset-samples/professional-axis-report.json`
- `artifacts/visual-asset-samples/professional-axis-review-page-*.png`

## 검증

- `npm run visual:build`
- `npm run visual:verify`
- `npm run visual:sheet`
- `npm run visual:smoke`
- `npm run build:web`
- `npm run mobile:smoke`
- `npm run asset:factory:review`

## 품질 메모

- 직업동료/학습도우미는 학생 캐릭터 최종본을 기반으로 직업별 복장, 큰 소품, 모자, 색상 차이를 얹어 직업 인지가 되도록 했다.
- 직업동료/학습도우미는 항상 오른쪽을 보고, 원정대 몬스터는 항상 왼쪽을 본다.
- 모든 정규화 프레임은 같은 중심축과 같은 발 기준선을 사용한다.
- 원정대 몬스터는 실제 4프레임을 순환한다. 학생 전투 몬스터는 스타일 보드 PNG 기반 외형과 전투장 transform/VFX를 함께 사용한다.
