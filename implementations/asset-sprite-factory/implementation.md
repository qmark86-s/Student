# Asset Sprite Factory 구현 설명서

## 개요

학생 이동 스프라이트 제작 방식을 재사용 가능한 자산 생산 라인으로 고정했다. 생성형 이미지 자체는 매번 달라질 수 있으므로, 최종 안정성은 repo에 보관된 원본 PNG와 결정적 전처리/검증 스크립트가 담당한다.

## 추가된 구성

- `tools/asset-factory/run.mjs`: 자산 팩토리 명령 실행기
- `tools/asset-factory/summarize-character-report.mjs`: 캐릭터 축 리포트 요약 및 실패 조건 검사
- `tools/asset-factory/make-character-review-sheet.py`: 캐릭터별 축 리뷰 시트 생성
- `tools/asset-factory/install-codex-skill.mjs`: repo Skill을 로컬 Codex Skill 디렉터리에 설치
- `tools/asset-factory/recipes/character-set.template.json`: 학생 외 캐릭터군으로 확장할 때 사용할 manifest 예시
- `codex/skills/asset-sprite-factory/`: 다른 Agent가 사용할 수 있는 Codex Skill 원본
- `docs/asset_sprite_factory.md`: 사용자 및 Agent용 사용 설명서

## npm 명령

- `npm run asset:factory:prepare`: `visual:build` 후 캐릭터 리포트 요약과 리뷰 시트를 생성한다.
- `npm run asset:factory:review`: 최신 리포트만 다시 검토한다.
- `npm run asset:factory:qa`: 웹 빌드, 비주얼 검증, 컨택트시트, 캐릭터 리뷰, 화면 스모크를 수행한다.
- `npm run asset:factory:install-skill`: `codex/skills/asset-sprite-factory`를 `~/.codex/skills/asset-sprite-factory`로 복사한다.

## 품질 기준

- 캐릭터 방향은 오른쪽이다.
- 4프레임 포즈 차이가 `minFrameDifference` 이상이어야 한다.
- 중심축은 1px 이하로 유지한다.
- 발 기준선은 0px 편차여야 한다.
- 실제 몸통 높이 흔들림은 3px 이하로 유지한다.
- 리뷰 시트에서 한 프레임만 커지거나 작아지는 경우 완료로 보지 않는다.

## 다음 Agent 작업 순서

1. `AGENTS.md`와 `docs/asset_sprite_factory.md`를 읽는다.
2. 필요하면 `npm run asset:factory:install-skill`로 Skill을 설치한다.
3. 원본 PNG를 `assets/visual-source/characters/`에 캐릭터별로 추가한다.
4. `npm run asset:factory:prepare`를 실행한다.
5. `artifacts/visual-asset-samples/character-axis-review-page-*.png`를 눈검수한다.
6. `npm run asset:factory:qa`와 `npm run verify:mobile`을 통과시킨다.

## 검증

이번 구현은 아래 명령으로 검증했다.

```powershell
npm run asset:factory:prepare
npm run asset:factory:qa
npm run verify:mobile
python C:\Users\상원\.codex\skills\.system\skill-creator\scripts\quick_validate.py codex\skills\asset-sprite-factory
python C:\Users\상원\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\상원\.codex\skills\asset-sprite-factory
```

검증 결과:

- `asset:factory:prepare`: 통과
- `asset:factory:qa`: 통과
- `verify:mobile`: 통과
- repo Skill 검증: 통과
- 로컬 설치 Skill 검증: 통과
- 캐릭터 리포트: 32명, 최소 포즈 차이 4.222, 최대 중심축 편차 0.5px, 발 기준선 편차 0px, 최대 solid height drift 2px
