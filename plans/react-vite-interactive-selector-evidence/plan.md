# React/Vite interactive selector evidence 보강 계획

## 목표

- 기존 HTML과 React/Vite를 같은 조작 흐름으로 비교할 때 전체 screenshot diff만 보지 않고, 학생 `시험`/`도감`처럼 잔차가 남은 패널의 핵심 selector rect/style/text 증거를 함께 남긴다.
- 원정대처럼 최신 사용자 요청으로 의도적으로 달라진 영역은 실패 기준으로 오판하지 않고, 학생 패널 정밀 보정에 필요한 유지보수 근거만 추가한다.

## 작업 범위

- `tools/react-vite-interactive-parity-audit.mjs`
  - 학생 시험 패널: 제목, 요약 패널, 적 카드 그리드, 적 카드, 완료 버튼, 빈 상태 selector를 기록한다.
  - 학생 도감 패널: 제목, 요약 패널, 은퇴 도감 효과, 효과 타일, 직업 카드, 직업 메타, 분배 가이드, 가중치 row, 가중치 track/fill selector를 기록한다.
  - 각 selector의 count, 첫 요소들의 rect, 핵심 computed style, normalized text를 report에 저장한다.
  - selector 차이는 report evidence로 남기되, 기존 failure 조건은 그대로 유지한다.

## 검증 기준

- `npm run react:interactive-parity`가 failure 0건으로 통과한다.
- `artifacts/react-vite-interactive-parity/report.json`에 `selectorDiffs`와 `selectorMetrics`가 기록된다.
- 새 evidence를 바탕으로 `student-시험`, `student-도감`의 남은 실제 불일치가 수정 가능한 CSS/DOM 차이인지 판단한다.

## 2026-06-24 추가 기준

- 학생 `시험`은 적 카드 내부 selector까지 수집한다: 몬스터, 제목, 종류, HP bar, HP fill, HP text.
- selector style evidence는 opacity, background image/position/size, box-shadow, filter, transform까지 포함한다.
- Vite build hash가 붙은 asset URL은 같은 원본 자산이면 차이로 세지 않는다.
- React 전용 scoping class인 `exam-panel`은 `examPanel` 루트 className 비교에서 UI 차이로 세지 않는다.
- 최신 `react:interactive-parity` 기준 `student-시험` selector diff는 0건이고, `student-도감` selector diff도 0건이다.
- `student-도감` 감사는 원본 `.stack`과 React `.archive-panel` 루트 자체를 직접 비교하지 않고, 제목/요약/효과/직업 카드처럼 실제 화면 표면의 selector를 비교한다.
- 도감 초상 `translateY(-1px)`는 원본 픽셀 위치를 맞추기 위한 시각 보정으로 동등 처리한다.

## 2026-06-24 도감 bar evidence 추가 기준

- `student-도감` activePanel top hotspot은 첫 직업 카드 하단 bar 영역인 `x 320 / y 736 / threshold 469px`이다.
- 이를 확인하기 위해 `.career-card .weight-row > div`를 `careerWeightTrack`, `.career-card .weight-row > div > i`를 `careerWeightFill`로 추가 수집한다.
- 최신 `react:interactive-parity` 기준 `careerWeightTrack`과 `careerWeightFill`은 각각 snapshot/React 모두 310개이며, 첫 40개 rect/style 비교에서 selector diff 0건이다.
- 따라서 현재 도감 bar hotspot은 DOM/width/color 불일치가 아니라 같은 selector 표면 위의 렌더링 잔차로 취급한다.

## 2026-06-24 도감 가이드 아이콘 evidence 추가 기준

- `react:hotspot-crop` 확인 결과 기존 top hotspot은 weight bar가 아니라 첫 직업 카드의 `분배 가이드` 버튼 영역이었다.
- `careerGuideIcon`, `careerGuideIconPath`, `careerGuideText` selector를 수집해 SVG attribute, rect, text 흐름을 비교한다.
- 원본 HTML은 line 기반 SVG이고, React의 `lucide-react` path 기반 아이콘은 같은 크기라도 픽셀 잔차를 만든다.
- React 도감은 원본과 같은 line 기반 `ArchiveGuideIcon`을 사용해야 한다.
- 해당 보강 시점의 `react:interactive-parity` 기준 `student-도감` selector diff는 0건이며, top hotspot은 `x 352 / y 608 / threshold 346px`의 숫자 렌더링 잔차로 이동했다.

## 2026-06-24 도감 header/weight evidence 추가 기준

- `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue` selector를 추가 수집한다.
- `career-emblem` transform은 양쪽 모두 `none`이면 동등이며, `none`과 원본 1px y보정 matrix만 허용한다.
- `weight-row`의 label/value는 원본처럼 같은 색상/크기/굵기를 가져야 하며, React 전용 right-align이나 어두운 value 색상은 회귀로 본다.
- 최신 `react:interactive-parity` 기준 `student-도감` selector diff는 0건이며, visual diff는 `1.7317%`, activePanel diff는 `0.1656%`다.
- 최신 `react:hotspot-crop` 기준 top hotspot은 `x 704 / y 32 / threshold 280px`의 첫 직업 카드 상단 메달/상태 아이콘 영역이다.
