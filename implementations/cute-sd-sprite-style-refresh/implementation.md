# 귀여운 SD 스프라이트 스타일 전환 구현 기록

## 요약

첨부 레퍼런스의 큰 머리, 짧은 몸통, 짧은 팔다리 느낌을 기준으로 학생, 직업동료, 학습도우미, 원정대 파티 유닛, 원정대 몬스터, 직업 결과 초상을 SD 스타일로 통일했다. 원본 PNG 시트는 보존하고, repo-local 전처리 파이프라인에서 스타일 변환과 축 정렬을 적용한다.

## 주요 변경

- `assets/reference/character-ref-cute-sd.png`
  - 사용자가 제공한 SD 스타일 기준 이미지
- `data/sprite_style_profiles.json`
  - 활성 프로필 `cute-sd-reference`
  - 머리 확대, 몸통 압축, 공통 스케일, 출력 크기 파라미터
- `tools/sprite_style_utils.py`
  - 투명 PNG 프레임을 머리/몸 영역으로 나눠 SD 비율로 재조합
  - 4프레임 공통 스케일을 적용해 한 프레임만 커지거나 작아지는 문제 방지
- `tools/prepare-character-sprites.py`
  - 학생 4프레임 전처리에 SD 변환 적용
- `tools/prepare-professional-sprites.py`
  - 직업동료/학습도우미 전처리에 SD 변환과 공통 축 보정 적용
- `tools/generate-professional-sprite-sources.py`
  - 직업 오버레이를 SD 몸통 좌표로 이동해 얼굴을 덮지 않게 수정
  - 원정대 몬스터를 낮고 넓은 학습 도구형 SD 오브젝트로 재설계
- `tools/build-visual-assets.mjs`
  - 직업 결과 초상 `visual-careers.png`를 `career-unit-*` PNG 프레임 기반으로 생성
- `data/visual_asset_quality_gates.json`
  - 카드형 커리어 아이콘 기준을 투명 SD 초상 기준으로 조정

## 산출물

- `src/snapshot/assets/asset-002.png`
- `src/snapshot/assets/visual-companions.png`
- `src/snapshot/assets/visual-enemies.png`
- `src/snapshot/assets/visual-careers.png`
- `artifacts/visual-asset-samples/character-axis-report.json`
- `artifacts/visual-asset-samples/professional-axis-report.json`
- `artifacts/visual-asset-contact-sheet/contact-sheet.png`
- `artifacts/visual-asset-smoke/main-battle.png`
- `artifacts/visual-asset-smoke/expedition-companion-probe.png`
- `artifacts/career-outcome-smoke/career-choice-ranked.png`

## 검증

- `npm run visual:build`
- `npm run visual:verify`
- `npm run asset:factory:review`
- `npm run visual:sheet`
- `npm run visual:smoke`
- `npm run career:smoke`
- `npm run verify:mobile`

## 품질 메모

- 학생은 고학년/N수에서도 머리 비율을 크게 유지하고, 나이 차이는 복장과 소품으로 읽히게 했다.
- 직업동료와 파티 유닛은 직업 소품을 유지하되, 긴 몸통 오버레이가 얼굴을 덮지 않도록 좌표를 SD 몸통 위치로 내렸다.
- 원정대 몬스터는 레퍼런스의 오른쪽 학습 도구 몬스터처럼 낮고 넓은 몸통, 큰 눈, 짧은 팔다리를 기준으로 한다.
- 직업 결과 화면의 초상도 같은 PNG 직업동료 프레임에서 파생되어 다른 카드 아이콘처럼 보이지 않는다.
