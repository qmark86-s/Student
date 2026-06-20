# Asset Sprite Factory 사용 설명서

## 목적

학생, RPG 캐릭터, 동료, 몬스터처럼 반복 생산해야 하는 스프라이트를 같은 방식으로 만들기 위한 repo-local 자산 생산 라인이다. AI 이미지는 원본 후보를 만드는 데만 쓰고, 프로젝트에 들어온 PNG 이후의 누끼, 축 정렬, 발 기준선, 아틀라스 패킹, CSS 연결, 검증은 결정적 스크립트로 처리한다.

## 핵심 원칙

- 원본 생성은 비결정적이지만, 원본 PNG가 repo에 들어온 뒤의 파이프라인은 멱등적이어야 한다.
- 캐릭터 한 명은 한 장의 `4 columns x 1 row` 이동 시트로 관리한다.
- 모든 이동 프레임은 `->` 방향이어야 한다.
- 배경은 형광 초록 `#00FF00` 계열로 두고, 전처리에서 chroma key와 반투명 가이드를 제거한다.
- 크롭으로 여러 캐릭터를 억지로 잘라 쓰지 않는다. 한 캐릭터씩 만들고 검증한다.
- 적용 전에는 반드시 수치 검증과 리뷰 시트를 모두 본다.

## 주요 파일

- 캐릭터 manifest: `data/character_animation_manifest.json`
- 원본 자산: `assets/visual-source/characters/`
- 전처리: `tools/prepare-character-sprites.py`
- manifest 동기화: `tools/sync-character-animation-manifest.mjs`
- 아틀라스 패킹: `tools/build-visual-assets.mjs`
- 품질 검증: `tools/verify-visual-assets.mjs`
- 팩토리 실행기: `tools/asset-factory/run.mjs`
- 리뷰 시트 생성: `tools/asset-factory/make-character-review-sheet.py`
- 리포트 요약: `tools/asset-factory/summarize-character-report.mjs`
- Codex Skill 원본: `codex/skills/asset-sprite-factory/SKILL.md`

## 명령

```powershell
npm run asset:factory:prepare
npm run asset:factory:review
npm run asset:factory:qa
npm run asset:factory:install-skill
```

- `asset:factory:prepare`: 비주얼 자산을 재생성하고 캐릭터 축 리포트와 리뷰 시트를 만든다.
- `asset:factory:review`: 이미 생성된 리포트를 요약하고 리뷰 시트를 다시 만든다.
- `asset:factory:qa`: 웹 빌드, manifest 검증, 컨택트시트, 캐릭터 리뷰, 브라우저 스모크를 모두 실행한다.
- `asset:factory:install-skill`: repo의 Skill 원본을 현재 사용자의 `~/.codex/skills/asset-sprite-factory`로 설치한다.

## 산출물

- 정규화된 프레임: `src/snapshot/assets/individual/students/<id>/move_0.png` ~ `move_3.png`
- 축 리포트: `artifacts/visual-asset-samples/character-axis-report.json`
- 캐릭터 리뷰 시트: `artifacts/visual-asset-samples/character-axis-review-page-01.png`
- 전체 자산 컨택트시트: `artifacts/visual-asset-contact-sheet/index.html`
- 실제 화면 스모크샷: `artifacts/visual-asset-smoke/`

`artifacts/`는 git에 커밋하지 않는 검수 산출물이다.

## 품질 게이트

- 캐릭터 manifest와 리포트의 캐릭터 수가 일치해야 한다.
- 모든 캐릭터는 오른쪽 방향이어야 한다.
- `poseDelta.minimum`은 `minFrameDifference` 이상이어야 한다.
- 중심축 편차는 1px 이하를 목표로 한다.
- 발 기준선 편차는 0px이어야 한다.
- 실제 몸통 기준 `solidHeight` 흔들림은 3px 이하이어야 한다.
- 작은 투명 가이드나 반투명 선이 bbox에 들어가면 실패로 보고 전처리를 보정한다.

## 다른 Agent 사용법

1. 먼저 `AGENTS.md`와 이 문서를 읽는다.
2. Skill이 설치되어 있지 않으면 `npm run asset:factory:install-skill`을 실행한다.
3. 새 자산은 `assets/visual-source/characters/`에 한 캐릭터씩 추가한다.
4. `npm run asset:factory:prepare`로 정규화와 리뷰 시트를 만든다.
5. 리뷰 시트에서 방향, 포즈 변화, 중심축, 발 기준선을 확인한다.
6. `npm run asset:factory:qa`를 통과시킨 뒤 앱 화면에서 본다.

## RPG 캐릭터로 확장할 때

`tools/asset-factory/recipes/character-set.template.json`을 참고한다. 현재 학생은 `data/character_animation_manifest.json`과 `mainStudents` 아틀라스에 연결되어 있지만, 같은 구조로 `rpgHeroes`, `companions`, `monsters` 같은 atlas family를 추가할 수 있다. 단, 새 family를 만들 때도 먼저 manifest, 전처리, 검증, 리뷰 시트를 고정하고 그 다음 런타임 CSS를 연결한다.
