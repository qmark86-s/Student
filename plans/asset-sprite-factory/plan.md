# Asset Sprite Factory 시스템화 계획

## 목표

현재 학생 이동 스프라이트 제작 방식을 다른 캐릭터군에도 재사용할 수 있도록 도구, 문서, Codex Skill로 고정한다. 다른 Agent가 작업해도 같은 검증 명령과 품질 기준을 따라 자산을 만들 수 있어야 한다.

## 구현 범위

1. 기존 학생 자산 파이프라인을 유지한다.
2. `tools/asset-factory/`에 실행기, 리뷰 시트 생성기, 리포트 요약 검증기를 추가한다.
3. `docs/asset_sprite_factory.md`에 사용법과 품질 기준을 작성한다.
4. `codex/skills/asset-sprite-factory/`에 repo-local Skill 원본을 만든다.
5. 현재 PC의 Codex 홈에 Skill을 설치하는 명령을 제공한다.
6. `AGENTS.md`와 `docs/visual_asset_production.md`에서 새 명령과 기준을 참조한다.
7. `asset:factory:qa`와 기존 모바일/비주얼 검증을 통과시킨다.

## 안정성 기준

- AI 생성 단계는 비결정적이라고 보고, repo에 들어온 원본 PNG 이후만 멱등성을 보장한다.
- 같은 manifest와 같은 원본 PNG에서는 같은 정규화 프레임, 같은 아틀라스, 같은 CSS, 같은 검증 리포트가 나와야 한다.
- 축/발 기준선/몸통 높이 검증 실패는 작업 완료로 보지 않는다.

## 검증 명령

```powershell
npm run asset:factory:prepare
npm run asset:factory:qa
npm run verify:mobile
python C:\Users\상원\.codex\skills\.system\skill-creator\scripts\quick_validate.py codex\skills\asset-sprite-factory
```
