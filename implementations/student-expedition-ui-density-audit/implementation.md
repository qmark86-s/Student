# 학생/원정대 UI 밀도 개선 구현

## 개요
- 원정대와 학생 탭의 긴 설명, 중복 카드, 항상 펼쳐진 세부 정보를 줄였다.
- 공통 접힘 컴포넌트 `CompactDisclosure`를 추가해 “요약 먼저, 세부는 요청 시” 패턴을 재사용한다.
- 게임 규칙, 저장 스키마, 런타임 데이터 생성 규칙은 변경하지 않았다.

## 주요 변경
- `src/react/App.jsx`
  - `CompactDisclosure`를 추가했다.
  - 학생 성장 탭의 자동 투자 비율을 기본 접힘 패널로 이동했다.
  - 성장/장비/교육/직장/도감 요약 라벨을 짧게 정리했다.
  - 직장 탭의 중복 수입 카드를 제거하고 요약 카드와 졸업생 목록만 남겼다.
  - 교육 카드의 효과 문구를 `현재 → 다음` 수치 중심으로 축약했다.
  - 도감의 발견 직업 요약 그리드를 제거하고, 62개 직업 카드의 과목 분배 가이드를 카드별 접힘 상세로 이동했다.
  - 원정대 성장/파티 헤더 문구를 줄이고, 대원 관리에서 합성 후보가 없을 때 빈 안내 카드를 숨겼다.
  - 원정 기록의 마지막 전투 이벤트를 접힘 상세로 이동했다.
- `src/react/styles.css`
  - 공통 `.compact-disclosure` 스타일을 추가했다.
  - 도감 분배 가이드 전용 `.career-guide-disclosure` 스타일을 추가했다.
  - 더 이상 쓰지 않는 발견 직업 요약 카드와 비활성 분배 버튼 스타일을 제거했다.
  - 반응형 audit 기준에 맞게 접힘 헤더의 폭, 줄 높이, 패딩을 고정했다.
- `tools/*smoke*.mjs`
  - 짧아진 성장/교육/장비 라벨 기대값을 갱신했다.
  - 기록 smoke가 중복 직장 수입 카드 제거, 도감 분배 가이드 기본 접힘, 세부 펼침 시 5개 과목 행 표시를 검사하게 했다.
  - 반응형 audit의 원정대 성장 제목 기준을 새 문구로 갱신했다.

## UI 기준
- 핵심 수치와 즉시 행동은 접힌 상태에서도 보여준다.
- 비교가 필요한 리스트는 항목 자체를 숨기지 않고, 보조 정보만 접는다.
- 반복 설명문은 라벨을 줄이고 카드 목적에 맞는 수치만 남긴다.
- 모바일에서 버튼 내부 텍스트가 넘치지 않도록 접힘 헤더는 고정 폭, 말줄임, 8px 라운드 기준을 따른다.

## 검증
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:education-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:verify`
- `npm run verify:mobile`
- `mcp__UmgMcp.project_policy_gate` strict
- `git diff --check`

위 검증은 2026-06-30 기준 통과했다.
