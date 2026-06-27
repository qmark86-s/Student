# LLM 프로젝트 브리프 작성 계획

## 목표

- 다른 LLM과 대화할 때 바로 전달할 수 있는 Student 프로젝트 구현 요약 파일을 작성한다.
- 요약은 프로젝트 구조, 주요 시스템, 데이터/자산 흐름, 검증 명령, 작업 주의사항을 한 문서에서 확인할 수 있게 한다.
- 코드와 런타임 동작은 변경하지 않고 문서 산출물만 추가한다.

## 분석 범위

- `git status --short`로 현재 dirty 범위를 확인했다.
  - 기존 사용자/타 에이전트 변경으로 보이는 React/부동산/자산 파일 변경과 untracked 계획/구현 폴더가 다수 존재한다.
  - 이번 작업은 새 브리프 문서와 해당 작업의 plan/implementation 문서만 추가한다.
- MCP 표면을 확인했다.
  - 현재 런타임에는 UMG MCP 120개 active tool, S1 MCP 95개 tool이 노출된다.
  - Student는 웹/Capacitor 프로젝트라 이번 문서 작성에는 MCP 편집 도구를 직접 사용하지 않는다.
  - 기존 문서에는 `mcp__UmgMcp.project_policy_gate` 통과 기록이 있으나, 이번 작업은 MCP tool surface를 변경하지 않는다.
- `/implementations`와 `/plans`의 기존 구현 기록을 확인했다.
- 주요 참조 파일:
  - `README.md`
  - `package.json`
  - `docs/react-vite-parity-migration.md`
  - `docs/asset_sprite_factory.md`
  - `docs/visual_asset_production.md`
  - `docs/mobile-apk-workflow.md`
  - `src/react/App.jsx`
  - `src/react/game/*.js`
  - 최신 부동산/React/Vite 구현 설명서

## 작성 계획

1. 프로젝트 한 줄 요약과 현재 개발 기준을 정리한다.
2. 실행 라인(snapshot HTML, React/Vite, Capacitor APK)을 구분해서 설명한다.
3. 핵심 런타임 모듈과 데이터 JSON의 역할을 정리한다.
4. 학생/Battle Road, 직업/동료, 원정대, 부동산, 비주얼 자산, no-fallback 정책을 시스템별로 요약한다.
5. 다른 LLM이 작업을 이어갈 때 지켜야 할 금지사항과 검증 명령을 명시한다.
6. 실제 전달용 문서는 `docs/llm_project_brief.md`에 작성한다.
7. 작업 완료 후 `implementations/llm-project-brief/implementation.md`에 산출물과 검증 결과를 기록한다.

## 검증 기준

- `docs/llm_project_brief.md`가 존재하고, LLM 전달용 문맥으로 독립적으로 읽힌다.
- `plans/llm-project-brief/plan.md` 내용과 실제 산출물이 일치한다.
- 코드/런타임/MCP surface 변경이 없다.
- `git diff --check`로 새 문서의 공백 오류를 확인한다.
