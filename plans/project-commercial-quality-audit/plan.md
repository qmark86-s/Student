# 프로젝트 상용 품질 전수검사 계획

## 목표
- 현재 워킹트리 기준 Student 웹/Capacitor 프로젝트 전체를 상용 릴리즈 전 점검 관점으로 검사한다.
- 자동 검증으로 잡히는 문제와 사람이 판단해야 하는 제품 리스크를 분리한다.
- 해결 가능한 문제는 같은 작업 범위에서 수정하고, 애매하거나 후속 기획/자산/성능 결정이 필요한 항목은 보고 목록으로 남긴다.

## 범위
- React/Vite 앱, save migration, 원정대/학생/부동산/상점/기록/교육 smoke 흐름
- 데이터 검증, 시각 자산 생성/검증, 모바일 viewport, 반응형 overflow
- 보안/의존성 audit, fallback/placeholder/debug 노출 위험, 문서/검증 기준 최신성
- 현재 작업 중인 원정대 연구 v1 변경을 포함한 전체 워킹트리

## MCP 및 로컬 검증 자산
- 직접 유효한 MCP: `mcp__UmgMcp.project_policy_gate` strict
- S1/Unreal 계열 MCP는 Student 웹/Capacitor 기능 검증에는 사용하지 않는다.
- 로컬 검증:
  - `npm run verify:mobile`
  - `npm run react:verify`
  - `npm run visual:verify`
  - `npm run visual:smoke`
  - `npm run asset:integrity`
  - `npm audit`
  - `git diff --check`

## 작업 단계
1. 현재 dirty 범위와 기존 구현/계획 문서를 확인한다.
2. 공식 전체 검증과 보안/자산/정책 게이트를 실행한다.
3. 검색 기반으로 fallback, placeholder, production DEBUG 노출, 오래된 schema 문구를 확인한다.
4. 실패 또는 상용 기준에서 낮은 비용으로 해결 가능한 문제를 수정한다.
5. 해결이 애매한 항목은 영향, 판단 필요 지점, 권장 후속 작업으로 정리한다.
6. 구현 설명서를 작성하고, 필요한 경우 README/프로젝트 브리프/검증 문서를 최신화한다.

## 통과 기준
- `npm run verify:mobile` 통과
- `npm audit --audit-level=moderate` 통과 또는 조치 불가 사유 기록
- `npm run asset:integrity` 통과
- `mcp__UmgMcp.project_policy_gate` strict 통과
- `git diff --check` 통과
- 서버에서 확인 가능한 로컬 URL 제공
