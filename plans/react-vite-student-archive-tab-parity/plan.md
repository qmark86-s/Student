# React/Vite 학생 도감 탭 패리티 보강 계획

## 목표
- 학생 도감 탭을 기존 HTML의 `직업 도감` 표면과 맞춘다.
- 상단 요약 카드, 은퇴 도감 효과 패널, 직업 카드의 이미지/메타/분배 가이드/과목 bar를 복구한다.
- 기존 도감 데이터, 회차 기록, 은퇴 보관 계산과 smoke 검증은 유지한다.

## 근거
- 원본 HTML 도감 요약은 `panel accent-panel income-panel` 구조로 64px 높이, 3개 metric을 표시한다.
- React 요약은 `record-summary-grid`가 2px 높이로 접혀 실제 화면에서 사라져 있다.
- 원본 직업 카드는 `.career-card locked` 235px 높이에 초상, 상태, 3개 메타칩, 분배 가이드 버튼, 5개 과목 bar를 표시한다.
- React 직업 카드는 `.career-book-card` 152px 높이의 텍스트 요약만 표시해 원본과 크게 다르다.

## 구현 범위
1. ArchivePanel 요약을 원본 `panel accent-panel income-panel` 기반 metric 카드로 변경한다.
2. 은퇴 도감 효과 패널을 원본 `panel collection-bonus-panel` 구조와 compact tile로 변경한다.
3. 직업 목록 카드를 원본 `career-card` 구조로 변경한다.
4. 직업 카드 초상은 원본 HTML처럼 `span.career-emblem.career-portrait.career-<id>`와 `visual-careers.png` atlas 배경으로 렌더링한다.
5. 직업별 과목 가중치 bar를 `careers.json` `statWeights`와 과목 색상 데이터로 렌더링한다.
6. 기존 `archive-career-card`, `archive-history-card` smoke 기준은 유지한다.

## 검증 기준
- `npm run react:build`
- `npm run react:records-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `git diff --check`
- `mcp__UmgMcp.project_policy_gate` pass
- `artifacts/react-vite-interactive-parity/student-도감-react.png` 시각 확인

## 구현 결과
- `ArchivePanel` 요약을 `panel accent-panel income-panel archive-summary-grid`로 변경해 64px compact metric 패널을 복구했다.
- 은퇴 도감 효과는 원본 `.collection-bonus-panel` / `.collection-effect-item` 구조와 같은 4열 compact tile, 중앙 정렬 텍스트, track/fill 막대로 표시한다.
- 직업 목록은 원본 `.career-card` 구조로 변경해 초상, 잠금/은퇴 상태, 3개 메타칩, disabled `분배 가이드`, 5개 과목 bar를 렌더링한다.
- 직업 카드 초상은 원본 HTML과 같은 `span.career-emblem.career-portrait.career-<id>` DOM과 `visual-careers.png` atlas 배경을 사용한다.
- atlas 위치는 `careers.json` 순서와 성별을 기준으로 계산하며, 직업/성별/색상 데이터가 없으면 assert로 실패한다.
- `tools/react-vite-records-smoke.mjs`는 도감 요약 높이, 효과 패널 높이, 직업 카드 62개, 효과 타일 4개를 추가 검증한다.

## 검증 결과
- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과, `careerBookCards 62`, `collectionEffectItems 4`, `archiveSummaryHeight 64`, `collectionBonusHeight 114`
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `student-도감` visual diff: `41.0343%`에서 `2.3125%`로 감소
- `student-도감` activePanel diff: `2.0875%`에서 `1.2597%`로 감소
- `student-도감` mean absolute diff: `0.5309`
- 최신 selector diff: 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건

## 2026-06-24 도감 hotspot 재검증
- `react:hotspot-crop`를 추가해 `student-도감` activePanel의 최대 hotspot을 PNG crop으로 확인한다.
- 기존 hotspot은 첫 직업 카드의 weight bar가 아니라 `분배 가이드` 버튼의 아이콘/텍스트 렌더링 차이였다.
- React 전용 `lucide-react` path 아이콘을 원본 HTML과 같은 line 기반 `ArchiveGuideIcon`으로 바꾸고, React 전용 SVG margin 보정을 제거했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 해당 보강 시점의 `student-도감` visual diff는 `2.126%`, activePanel diff는 `0.9085%`, mean absolute diff는 `0.4772`였다.
- 해당 보강 시점의 `react:hotspot-crop` 기준 최대 hotspot은 `x 352 / y 608 / threshold 346px`이며, crop은 직업 카드 상단 `명성 88` 숫자 렌더링 잔차로 이동했다.

## 2026-06-24 도감 header/weight 재검증
- 직업 카드 header 내부 grid gap과 weight row의 React 전용 value 정렬/색상을 제거해 원본 HTML computed style과 맞췄다.
- selector evidence에 `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue`를 추가했다.
- `career-emblem` transform 비교는 양쪽 `none`을 정상 동등 처리하고, 원본 1px 보정만 별도 허용한다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 최신 `student-도감` visual diff는 `1.7317%`, activePanel diff는 `0.1656%`, mean absolute diff는 `0.2436`이다.
- 최신 `react:hotspot-crop` 기준 top hotspot은 `x 704 / y 32 / threshold 280px`이며, crop은 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
