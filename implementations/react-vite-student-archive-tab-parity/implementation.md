# React/Vite 학생 도감 탭 패리티 구현

## 목적
- React 도감 탭이 원본 HTML `직업 도감` 화면처럼 보이도록 요약 패널, 은퇴 도감 효과, 직업 카드 구조를 복구했다.
- 데이터 누락을 숨기는 대체값 없이 `career_collection_effects.json`, `careers.json`, 직업 초상 자산을 명시적으로 읽고 검증한다.

## 변경 내용
- `src/react/App.jsx`
  - `ArchivePanel` 요약을 `panel accent-panel income-panel archive-summary-grid` 구조로 변경했다.
  - 은퇴 도감 효과를 `.collection-bonus-panel` / `.collection-effect-item` 구조로 렌더링한다.
  - 직업 목록을 `.career-card` 기반으로 렌더링해 초상, 상태, 메타칩, disabled `분배 가이드`, 과목 가중치 bar를 표시한다.
  - `careerCollectionEffectInfo`, `careerSubjectWeights` helper를 추가해 직업별 도감 효과와 과목 가중치를 assert 기반으로 읽는다.
  - `careerAtlasStyle` helper를 추가해 `careers.json` 순서와 성별로 `visual-careers.png` atlas 위치를 계산한다.
  - 도감 직업 카드 초상은 원본 HTML처럼 `span.career-emblem.career-portrait.career-<id>`로 렌더링하고 개별 PNG `img`를 쓰지 않는다.
- `src/react/styles.css`
  - 원본 스냅샷 CSS의 `.collection-effect-item`, `.career-card`, `.career-meta`, `.career-guide-button`, `.weight-row` 수치를 React 구조에 맞게 적용했다.
  - 도감 요약 패널은 64px compact metric 형태로 맞췄다.
  - `.career-portrait`가 `visual-careers.png` atlas를 배경으로 사용하도록 추가했다.
  - 도감 카드 초상 y좌표와 `분배 가이드` 버튼 흐름을 원본 HTML computed rect/display 기준으로 보정했다.
- `tools/react-vite-records-smoke.mjs`
  - 도감 직업 카드 62개, 효과 타일 4개, 도감 요약/효과 패널 높이를 추가 검증한다.

## 검증
- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:responsive-audit`: 통과
- `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
- `student-도감` visual diff: `41.0343%`에서 `2.3125%`로 감소
- `student-도감` activePanel diff: `2.0875%`에서 `1.2597%`로 감소
- `student-도감` mean absolute diff: `0.5309`
- 최신 selector diff: 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건

## 2026-06-24 도감 hotspot 보정
- `tools/react-vite-hotspot-crop.mjs`로 `student-도감` activePanel의 최대 hotspot을 crop했다.
- weight bar selector인 `careerWeightTrack`, `careerWeightFill`은 snapshot/React 모두 310개이고 rect/style diff 0건이어서 원인이 아니었다.
- 실제 hotspot은 첫 직업 카드의 `분배 가이드` 버튼 아이콘/텍스트였다.
- `src/react/App.jsx`에 원본 HTML과 같은 line 기반 `ArchiveGuideIcon`을 추가하고, `lucide-react` path 기반 `SlidersHorizontal` 사용을 제거했다.
- `src/react/styles.css`에서 React 전용 `.career-guide-button svg` margin/vertical-align 보정을 제거해 원본 inline 흐름과 맞췄다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 해당 보강 시점의 `student-도감` visual diff는 `2.126%`, activePanel diff는 `0.9085%`, mean absolute diff는 `0.4772`였다.
- 최신 crop 산출물:
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-snapshot.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-react.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-diff.png`

## 2026-06-24 도감 header/weight 보정
- `src/react/styles.css`에서 `.career-card header div`의 추가 grid gap을 제거해 직업명/부제/상태 영역의 y좌표를 원본 HTML과 맞췄다.
- `.weight-row span, .weight-row b`는 원본처럼 같은 회색 계열/굵기/크기를 쓰게 하고, React 전용 overflow/right-align/dark color 규칙을 제거했다.
- `tools/react-vite-interactive-parity-audit.mjs`에 `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue` selector evidence를 추가했다.
- `career-emblem` transform 비교에서 양쪽 모두 `none`인 경우를 동등 처리해 실제 차이가 아닌 selector diff를 제거했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건, `student-도감` selector diff 0건.
- 최신 `student-도감` visual diff는 `1.7317%`, activePanel diff는 `0.1656%`, mean absolute diff는 `0.2436`이다.
- 최신 `npm run react:hotspot-crop` 기준 hotspot은 `x 704 / y 32 / threshold 280px`이며 첫 직업 카드 상단 메달/상태 아이콘 영역으로 이동했다.

## 유지보수 기준
- 직업 카드 수는 `careers.json` 전체 62개와 일치해야 한다.
- 도감 효과 타일 수는 `career_collection_effects.json`의 `collectionEffects` 수와 일치해야 한다.
- 직업 카드 초상은 원본 HTML과 같은 `visual-careers.png` atlas를 기준으로 한다. 개별 동료 PNG `img`로 되돌리면 도감 activePanel diff가 다시 커진다.
- 직업 초상 atlas 위치, 도감 효과, 과목 가중치가 누락되면 조용히 대체하지 말고 assert/smoke 실패로 드러낸다.
