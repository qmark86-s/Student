# LLM 프로젝트 브리프 작성 구현 설명서

## 개요

- 다른 LLM에게 Student 프로젝트 구현 현황을 전달하기 위한 브리프 문서를 추가했다.
- 코드, 런타임 데이터, MCP surface는 변경하지 않았다.
- 기존 dirty worktree는 보존하고 새 문서만 추가했다.

## 산출물

- `docs/llm_project_brief.md`
  - 프로젝트 실행 라인, 주요 코드 구조, 핵심 데이터 규모, 학생/Battle Road, 원정대, 부동산, 비주얼 자산, 검증 명령, 다른 LLM 작업 지침을 정리했다.
- `plans/llm-project-brief/plan.md`
  - 분석 범위, 작성 계획, 검증 기준을 기록했다.
- `implementations/llm-project-brief/implementation.md`
  - 본 작업의 산출물과 검증 메모를 남긴다.

## 분석 근거

- `README.md`, `package.json`, `docs/react-vite-parity-migration.md`, `docs/asset_sprite_factory.md`, `docs/visual_asset_production.md`, `docs/mobile-apk-workflow.md`를 기준으로 요약했다.
- `src/react/App.jsx`와 `src/react/game/*.js`의 모듈 역할을 확인했다.
- `/implementations`와 `/plans`의 기존 구현 기록을 확인해 최신 React/Vite, no-fallback, 부동산, 자산 파이프라인 흐름을 반영했다.
- 현재 노출 MCP 표면은 UMG MCP 120개 active tool, S1 MCP 95개 tool로 확인했으나, 이번 작업은 문서 작성이라 직접 MCP 편집 도구를 사용하지 않았다.

## 검증

- `docs/llm_project_brief.md`가 독립 브리프 문서로 읽히도록 작성했다.
- 코드/데이터/자산 생성 스크립트는 변경하지 않았으므로 런타임 smoke는 대상이 아니다.
- MCP tool surface 변경이 없어 manifest/capabilities 직접 호출 smoke는 대상이 아니다.
- `rg -n "C:|Users|상원|file://|vscode://" docs/llm_project_brief.md plans/llm-project-brief/plan.md implementations/llm-project-brief/implementation.md`: 출력 없음. 새 문서에 절대 경로/로컬 사용자 경로 고정이 없다.
- `git diff --check`: 통과. 기존 dirty 파일들의 LF/CRLF 변환 경고만 출력되었고 공백 오류는 없었다.
