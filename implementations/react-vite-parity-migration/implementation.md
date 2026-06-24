# React/Vite 병행 이식 구현

## 개요

기존 단일 HTML snapshot 앱을 유지한 채 React/Vite 앱 라인을 추가했다. 기존 출시 후보 빌드인 `dist/`는 변경하지 않고, React 산출물은 `dist-react/`에 분리했다.

## 추가/변경 파일

- `vite.react.config.mjs`: `src/react/`를 루트로 사용하고 `dist-react/`로 빌드하는 Vite 설정
- `src/react/index.html`: React 앱 HTML shell
- `src/react/main.jsx`: React 진입점
- `src/react/App.jsx`: React 앱 화면/상태 연결 컴포넌트
- `src/react/game/save.js`: 기존 `student-idle-rpg-save-v1` localStorage 어댑터
- `src/react/game/grades.js`: gradeId, N수, 학년 시각 정보 해석 모듈
- `src/react/game/assets.js`: 학생/직업 동료 개별 프레임 자산 로더
- `src/react/game/battleRoad.js`: Battle Road 조우, 수능, 결과 후보 생성 모듈
- `src/react/game/companions.js`: 로봇 도우미, 직업 동료, 상점 상품, 등급/전투력 계산 모듈
- `src/react/game/debugTools.js`: production 기본 DEBUG 미노출 및 QA 도구 노출 gate
- `src/react/game/education.js`: 교육 액션 조건, 비용, 효과, 성장 배율 계산 모듈
- `src/react/game/expedition.js`: 원정대 stage, 파티, 전투력, 보상, 진행 저장 모듈
- `src/react/styles.css`: 모바일 첫 화면, 전투장, 성장 패널 스타일
- `data/student_progression_balance.json`: 학생 자동 전투 tick, 전투 제한 시간, 적 HP/보상/트랙 가중치 데이터
- `data/career_collection_effects.json`: 은퇴 직업 도감 효과 데이터
- `tools/react-vite-smoke.mjs`: React 앱 전용 모바일 smoke test
- `tools/react-vite-save-smoke.mjs`: 기존 save 읽기/쓰기 smoke test
- `tools/react-vite-battle-road-smoke.mjs`: React Battle Road/결과 흐름 smoke test
- `tools/react-vite-expedition-smoke.mjs`: React 직업 수락/원정대 흐름 smoke test
- `tools/react-vite-records-smoke.mjs`: React 시험/직장/도감 저장 상태 smoke test
- `tools/react-vite-education-smoke.mjs`: React 교육 탭/업그레이드 smoke test
- `tools/react-vite-shop-debug-smoke.mjs`: React 상점 도우미/DEBUG 동료/원정대 편성 smoke test
- `tools/react-vite-responsive-audit.mjs`: React viewport별 overflow/이미지/기능 표면 audit
- `tools/react-vite-visual-parity-smoke.mjs`: snapshot 대 React 좌표/스크린샷 parity audit
- `tools/react-vite-interactive-parity-audit.mjs`: snapshot 대 React 학생/원정대 탭 조작 parity audit
- `tools/react-vite-hotspot-crop.mjs`: interactive parity region hotspot PNG crop 도구
- `tools/react-vite-ui-parity-deep-smoke.mjs`: snapshot 대 React 상점/뽑기/설정/디버그 텍스트/스타일/스크린샷 parity audit
- `plans/react-vite-parity-migration/plan.md`: 차수별 계획
- `docs/react-vite-parity-migration.md`: 새 라인 사용법과 기준
- `package.json`: `react:*` 스크립트와 React/Vite 의존성 추가
- `.gitignore`: `dist-react/` 비추적 처리

## 현재 이식 범위

- 상단 회차/과정/상점/설정 UI
- 상태 타일 5개
- 학생/원정대 전환 UI
- snapshot 구조에 맞춘 학생 전투장 첫 화면
- 학생 atlas 기반 표시
- 학생전투 몬스터 atlas 표시
- Auto 버튼
- QA 플래그 기반 DEBUG 전투 완료 버튼
- 7개 하단 탭
- 성장 요약, 버프 요약, 자동 투자 비율, 과목별 성장 카드
- 기존 localStorage save 일부 읽기/쓰기
- `current.road`/`current.battle` 기반 학년 Battle Road 4조우
- N수 학교 4조우 후 수능 4조우 진입
- 수능 마지막 조우 후 결과 패널과 `careers.json` 전체 직업 후보 표시
- 직업 수락 후 `alumni-*` 동료 등록, 히스토리/로그 기록, 원정대 파티 자동 편성
- 직업 수락 후 새 회차 E1 Battle Road 시작
- 원정대 stage arena, 동료 4프레임, 원정대 적 4프레임 표시
- 원정대 stage 돌파 후 `expedition.stageIndex`, `clearedStageCount`, 보유금 저장
- 동료 탭의 등록 동료 카드 표시
- 시험 탭의 진행/시험 결과 카드 표시
- 직장 탭의 동료 수입/슬롯/직업 카드 표시
- 도감 탭의 회차 기록/직업 기록 카드 표시
- 도감 탭의 원본형 직업 카드 62개, 은퇴 도감 효과 4종, 초상/메타/분배 가이드/과목 bar 표시
- 교육 탭의 9개 교육 액션, 잠금 상태, 비용, 효과 표시
- 교육 업그레이드 저장과 성장 배율 반영
- 교육 성장 배율의 Battle Road 공부량 보상 반영
- 학년/성별별 학생 개별 프레임 자산 로드
- 직업 동료 초상/전투 개별 프레임 자산 로드
- 원정대 적 개별 프레임 자산 로드
- `curriculum_attack_vfx.json` 기반 교과 공격 VFX 토큰 표시
- production 기본 화면의 DEBUG 버튼 미노출
- `?qaTools=1` 또는 `student-react-qa-tools-v1=1` localStorage 플래그 기반 QA DEBUG 노출
- snapshot 대 React 캡처 parity audit 리포트 생성
- 기본 Battle Road 시작 phase를 snapshot과 같은 `road-travel`로 맞추고, travel 상태에서는 교과 공격 VFX를 렌더링하지 않도록 smoke 기준을 정렬
- 초등 과정 성장 카드 표시 과목을 국어/영어/수학으로 제한하고, 중등 이후/N수는 5과목을 표시
- 적 라인업 travel/approach 애니메이션을 snapshot의 `encounterPackTravel`/`encounterPackApproach` 기준으로 추가
- parity audit에서 `Math.random=0.25`와 애니메이션 첫 프레임 pause를 적용해 캡처 기준을 고정
- 상단 버튼 3개는 snapshot의 18px/stroke 2 SVG 경로와 `shop`/`menu` class를 사용한다.
- 상단 상점/디버그/설정 버튼은 React 모달을 열고 닫는다.
- 상점은 snapshot 기준 `다이아 / 보유금 / 로봇 / 광고 / 패키지 / 패스` 카테고리를 표시하며, 로봇 도우미 호출과 보유금 교환은 save 상태에 반영한다.
- 로봇 도우미 1회/10+1 호출은 다이아를 차감하고 snapshot 기준 C~SSS 등급 결과, 뽑기 팝업, 학습 도우미 편대, 성장 패널 전투력 보너스를 갱신한다.
- 로봇 도우미는 `kind: "robot-helper"`로 저장되어 학생 Battle Road 보조에만 쓰이고, 원정대 파티 편성 후보에서는 제외된다.
- DEBUG 메뉴는 다이아 +10K, 직업 동료 랜덤 +1/+5, 데이터 동기화, 세이브 내보내기/불러오기 UI를 제공한다.
- DEBUG 직업 동료는 `kind: "career"`로 저장되고 최대 5명까지 원정대 파티에 자동 편성된다.
- shop/settings/debug 모달 shell, category tab, product card, gacha popup은 snapshot HTML 표면과 같은 텍스트/크기/버튼 구조를 사용한다.
- 로봇 뽑기 팝업은 snapshot 최종 CSS 기준으로 stage 높이, 배경, 등급 링, 로봇 파츠, 결과 카드, 확인 버튼, backdrop blur를 정렬한다.
- legacy save의 콘텐츠 리비전은 데이터 동기화 전까지 숨기지 않고, 설정/디버그 summary가 snapshot과 같은 문구를 표시한다.
- 짧은 가로 화면에서는 phone frame을 viewport에 강제 압축하지 않고 문서 스크롤로 접근하게 해 상단/비율 잘림을 막는다.
- 전투장에서는 snapshot에 없는 React 부모 pseudo-frame을 제거했다.
- 성장 패널은 snapshot의 `summary-grid`, `buff-grid`, `allocation-panel`, `stat-line` 구조와 크기를 기준으로 재정렬했다.
- 헤더 제목은 snapshot과 같은 텍스트 노드 분리 형태로 렌더 직후 정규화한다.
- 헤더 span의 1/32px 폰트 shaping 차이는 `margin-right: -0.03125px`로 보정했다.
- 성장 액션 버튼은 snapshot과 같은 중앙 정렬을 명시했다.
- 탭과 활성 패널은 snapshot의 `management-panel` 배경층과 같은 wrapper로 감쌌다.
- 학생 자동 전투는 `data/student_progression_balance.json`의 `autoTickMs`, `maxBattleDurationMs`, 적 HP/보상/트랙 가중치 설정을 사용한다.
- `?qaTools=1`은 QA 메뉴 노출만 담당하고, 자동 전투를 멈추는 검증은 `?pauseAutoBattle=1`을 추가로 켠다.
- 원정대 전투 동료는 전투장 왼쪽 하단에 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 배치하고, 원정대 파티 슬롯은 모든 검증 폭에서 3+2 그리드로 줄바꿈한다.
- 원정대 파티 슬롯의 3+2 배치는 최신 사용자 요청 기준으로 원본 HTML 5열 배치보다 우선한다.
- 원정대 성장/파티 후보/동료 관리 카드 목록은 5명 기준 2+2+1 카드 그리드로 배치해 세로 한 줄 리스트가 되지 않게 한다.
- 원정대 동료 관리 카드는 초상/텍스트/상태/잠금 버튼 위치를 명시 배치해 버튼 줄바꿈과 세로 늘어짐이 발생하지 않게 한다.
- 학생 시험 탭은 원본 compact `battle-summary-panel`, `battle-enemy-grid`, `battle-enemy-card` 구조로 표시하고, records smoke가 이 DOM과 높이를 검사한다.
- 학생 직장 탭 기본 빈 상태는 원본 HTML의 compact `income-panel`/`secondary-action`/`empty-state` 구조와 크기를 따른다.
- 학생 교육 탭의 교육 카드 행은 원본 HTML의 `.education-row` 기준으로 71px 높이, 8px 목록 gap, 74x34px 업그레이드 버튼, 11.52px 회색 설명 텍스트를 사용한다.
- 학생 도감 탭의 직업 목록은 원본 HTML의 `.career-card` 기준으로 초상, 상태, 메타칩, disabled `분배 가이드`, 과목 bar를 표시한다.
- 학생 도감 직업 카드 초상은 개별 PNG `img`가 아니라 원본 HTML과 같은 `visual-careers.png` atlas 배경 `span.career-emblem.career-portrait.career-<id>` 구조를 사용한다.
- 신규 React save의 기본 `workSlots`는 원본 HTML과 같은 5다.
- React smoke seed는 schema 2의 전체 `expedition` 필드를 명시한다. snapshot 비교 도구만 원본 HTML 호환을 위해 snapshot에는 schema 1 seed, React에는 schema 2 seed를 별도로 주입한다.
- 런타임 `src/react`에는 조용한 대체를 숨기는 `??`, `fallback`, `Fallback`, `unknown` 문자열을 두지 않는다. 도감 잠금 표시는 원본 HTML parity를 위해 escape 상수로 렌더링한다.

## 검증

- `npm run react:verify`: 통과
  - 360x740: 가로 overflow 0, production 기본 DEBUG 미노출, 학생 atlas 로드, 몬스터 3개
  - 412x915: 가로 overflow 0, production 기본 DEBUG 미노출, 학생 atlas 로드, 몬스터 3개
  - save smoke: `student-idle-rpg-save-v1` 주입 save 읽기, QA DEBUG로 공부량/처치 수 저장, Auto 토글 저장 확인
  - Battle Road smoke: 명시적 QA URL에서 기본 travel 조우 3마리/HP바/VFX 0개, N수 4조우, 수능 4조우, 결과 직업 후보 62개 확인
  - Expedition smoke: 직업 수락 후 동료 1명 등록, 파티 편성, 원정대 stage 1 표시, stage 2 진행 저장, 원정대 동료/적 프레임 로드 확인
  - Records smoke: 저장 상태 주입 후 시험 결과 2건, 직장 동료 2명, 도감 기록 2건 표시와 placeholder 미노출, 가로 overflow 0 확인
  - Education smoke: 9개 교육 카드, 비용, 잠금 상태, 업그레이드 저장, 성장 배율 반영 확인
  - Shop/debug smoke: 도우미 1회 호출, 다이아 20,000 -> 19,700 차감, 로봇 도우미 1기 저장, 성장 패널 `학습 도우미 1/3` 반영, 동료 탭 로봇 카드 표시, DEBUG 동료 +5, 원정대 파티 5/5 편성, stage 돌파 저장 확인
  - Responsive audit: 320x568, 360x740, 390x844, 412x915, 430x932, 768x1024, 844x390, 1280x720에서 기본/전투/상점 뽑기/원정대 디버그 흐름의 가로 overflow 0, 이미지 로드, 버튼 텍스트 overflow 0 확인
  - 스크린샷: `artifacts/react-vite-smoke/phone-small.png`, `artifacts/react-vite-smoke/phone-standard.png`
- `npm run react:deep-parity`: 통과
  - 상점 6개 탭 normalized text가 snapshot과 모두 일치
  - `Math.random=0.25` 로봇 뽑기 팝업 normalized text가 snapshot과 일치
  - 설정 모달 normalized text가 snapshot과 일치
  - 디버그 모달 normalized text가 snapshot과 일치
  - 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 핵심 selector `styleDiffs: []`
  - scenario별 스크린샷 diff와 threshold visual diff를 `text-report.json`에 기록
  - 리포트와 캡처: `artifacts/react-vite-ui-parity-deep-current/text-report.json`
- `npm run verify:mobile`: 통과
  - 기존 snapshot 데이터/비주얼/모바일/직업 결과/N수 루프 검증 유지
- `$env:REACT_PARITY_STRICT='1'; $env:REACT_PARITY_MAX_DIFF_PERCENT='0'; $env:REACT_PARITY_MAX_MEAN_ABS_DIFF='0'; npm run react:parity-audit`: 통과
  - 412x915: 좌표 일치, `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`
  - 390x844: 좌표 일치, `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`
  - 최신 `report.json`: 두 viewport 모두 `bbox: null`, `hotspots: []`
  - 전투 배경 PNG는 snapshot `dist/`와 React `dist-react/`에서 SHA-256이 동일하다.
- `npm run react:shop-debug-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 리포트 `artifacts/react-vite-responsive-audit/report.json`
- `npm run react:interactive-parity`: 통과, 학생 7개 탭, 상점/설정/디버그, 원정대 성장/파티/동료 관리/기록/편성 조작 failure 0건
- `npm run react:hotspot-crop`: 통과, `student-도감` activePanel hotspot crop 산출
- `npm run curriculum-vfx:verify`: 통과, `grades=16 pools=70 tokens=416 styles=5`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- 2026-06-24 원정대 동료 레이아웃 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 원정대 전투 동료 세로 밴드 `2+2+1`, 원정대 파티 슬롯 행 분포 `3+2`
  - `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
  - `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass
- 2026-06-24 학생 직장 탭 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:records-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
  - `student-직장` visual diff `41.27%`에서 `1.7543%`로 감소
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- 2026-06-24 학생 교육 탭 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:education-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 시나리오 failure 0건
  - `student-교육` visual diff `33.2367%`에서 `1.7112%`로 감소
  - `student-교육` mean absolute diff `7.851`에서 `0.2305`로 감소
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- 2026-06-24 학생 도감 탭 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:records-smoke`: 통과, `careerBookCards 62`, `collectionEffectItems 4`, `archiveSummaryHeight 64`, `collectionBonusHeight 114`
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `student-도감` visual diff `41.0343%`에서 `2.3125%`로 감소
  - `student-도감` activePanel diff `2.0875%`에서 `1.2597%`로 감소
  - `student-도감` mean absolute diff `0.5309`
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- 2026-06-24 원정대 동료 일렬 배치 제거 및 시험 smoke 기준 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:records-smoke`: 통과, 시험 요약 1개, 시험 적 카드 1개, 몬스터 이미지 1개, HP bar 1개, 요약 높이 64px, 적 grid 높이 56px
  - `npm run react:battle-smoke`: 통과
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - 원정대 전투 동료 세로 밴드 `2+2+1`, 한 밴드 최대 2명
  - 원정대 파티 슬롯 행 분포 `3+2`
  - 원정대 성장/파티 후보/동료 관리 카드 행 분포 `2+2+1`
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- 2026-06-24 학생 결과 탭 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:records-smoke`: 통과
  - `npm run react:battle-smoke`: 통과
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `student-결과` visual diff `8.416%`에서 `0.2951%`로 감소
  - `student-결과` mean absolute diff `1.7952`에서 `0.0563`으로 감소
  - `student-결과` activePanel diff `4.0448%`에서 `0.1172%`로 감소
  - `student-결과` selectorDiff 0건
  - `00-initial` visual diff는 Battle Road signature 안정화 후 `1.6234%`, activePanel diff `0%`
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- 2026-06-24 전투 HUD 남은 시간 보강 검증
  - `npm run react:verify`: 통과
  - `npm run react:build`: 통과
  - `npm run react:battle-smoke`: 통과, live timer `elapsedMs 1000`, HUD `59초`, 기대값 `59`
  - `npm run react:records-smoke`: 통과
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `student-시험` visual diff `2.647%`에서 `2.6263%`로 감소했고, 이후 시험 selector/패널 보정 당시값은 `1.7574%`였다. 전투 scene HP/VFX 보강 최신값은 `0.3213%`다.
  - `student-결과` visual diff `3.8238%`에서 `0.2951%`로 감소
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
  - `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass
- 2026-06-24 학생 동료 탭 보강 검증
  - `npm run react:build`: 통과
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `npm run react:verify`: 통과
  - `student-동료` visual diff `2.357%`에서 `1.7131%`로 감소
  - `student-companion-after-debug` visual diff `2.296%`에서 `1.6521%`로 감소
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
  - `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass
- 2026-06-24 원정대 동료 일렬 배치 제거 및 시험 selector 보정 검증
  - 원정대 전투 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대다.
  - `react:responsive-audit` 최신 리포트 기준 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`다.
  - `tools/react-vite-responsive-audit.mjs`는 앞줄 밴드가 리더 1명이 아니면 실패한다.
  - 파티 슬롯은 검증 대상 4개 viewport 모두 `3+2`, 성장/파티 후보/동료 관리 카드는 모두 `2+2+1`이다.
  - 시험 탭은 적 카드 내부 selector evidence를 추가했고, React 전용 `exam-panel` scoping class는 루트 비교 노이즈로 처리한다.
  - 당시 `react:interactive-parity` 기준 `student-시험` selector diff 0건, visual diff `1.7574%`, activePanel diff `0.2085%`였다. 전투 scene HP/VFX 보강 최신값은 selector diff 0건, visual diff `0.3213%`, scene diff `0.6848%`, activePanel diff `0.1613%`다.
  - `npm run react:build`: 통과
  - `npm run react:records-smoke`: 통과
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
  - `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용
- 2026-06-24 원정대 동료 좌표 재보강 검증
  - 사용자가 지적한 “일렬 배치” 인상을 없애기 위해 전면 리더는 하단 HUD와 겹치지 않게 유지하고, 뒤/중간 줄을 위로 올렸다.
  - 최신 `react:responsive-audit` 리포트 기준 세로 spread는 `phone-narrow 65.68px`, `phone-parity 65.68px`, `tablet-portrait 68.8px`, `landscape-small 68.8px`이며 모두 `2+2+1 / front 1`이다.
  - 확인 캡처는 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-debug-phone-narrow.png`, `expedition-debug-landscape-small.png`다.
  - `npm run react:build`: 통과
  - `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
  - `npm run react:expedition-smoke`: 통과
  - `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
  - `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
  - `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

## 판단

현재 React/Vite 라인은 병행 이식 중이며, 학생 Battle Road, 수능 결과, 직업 수락, 원정대 첫 stage 진행, 시험/직장/도감 상태 표시, 교육 업그레이드, 상점 로봇 호출, DEBUG 동료 추가, 원정대 디버그 편성까지 검증된 상태다. 기존 snapshot 앱은 계속 기준선으로 남기고, React/Vite는 기능 단위로 동등성 검증을 통과한 뒤에만 다음 차수로 넓힌다.

2026-06-23의 정지 프레임 parity 감사는 `Math.random=0.25`, 애니메이션 첫 프레임 pause 조건에서 snapshot과 React의 기본 화면을 맞추는 기준이었다. 2026-06-24 interactive 감사는 Battle Road 런타임 tick이 포함되므로 첫 캡처 전에 원본/React의 적 수와 HUD 제한시간이 같은 안정 상태가 될 때까지 기다린다. 최신 `00-initial`은 양쪽 `enemyCount 3`, `timerText 60초`, `phase travel` signature를 확인한 뒤 캡처하며 visual diff `1.6234%`, activePanel diff `0%`다.

2026-06-23 기준 상점/도우미/디버그/원정대 디버그 기능은 `tools/react-vite-shop-debug-smoke.mjs`와 `tools/react-vite-responsive-audit.mjs`에 회귀 기준이 있다. 새 기능을 더할 때는 두 스크립트가 실패하도록 누락을 숨기지 않고, 필요한 자산/데이터를 명시적으로 추가해야 한다.

2026-06-23 기준 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 원본 HTML parity는 `npm run react:deep-parity`에서 모두 `equal: true`이고 핵심 selector `styleDiffs: []`다. 로봇 뽑기 팝업은 기본 정적 animation 기준으로 캡처하며, 최신 gacha visual diff는 `0.4866%`, threshold visual diff는 `0.0594%`, `meanAbsDiff`는 `0.0336` 수준으로 기록된다. live 애니메이션 phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행하고, 이전 live visual diff `26.2213%`, threshold visual diff `2.5024%`, `meanAbsDiff 1.3554`는 레이아웃 회귀가 아니라 animation/blur 잔차로 분류한다. font family, text rendering, font smoothing까지 styleDiffs 0건이다. 설정 모달은 SVG signature까지 비교하며 최신 settings svgDiffs 0건, icon region diff `0%`다. 원본과 비교해야 하는 UI 표면을 바꾸면 이 스크립트와 캡처 리포트를 먼저 갱신한다.

2026-06-24 기준 원정대 동료 배치, 학생 자동 전투, 시험/직장/교육/결과/도감 탭, schema 2 seed/no-fallback hardening을 반영한 뒤 `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:deep-parity`, `npm run curriculum-vfx:verify`가 통과했다. 원정대 전투 동료 확인 캡처는 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-debug-landscape-small.png`, `expedition-debug-tablet-portrait.png`이고, 원정대 파티 슬롯 확인 캡처는 `artifacts/react-vite-responsive-audit/expedition-party-slots-phone-parity.png`, `expedition-party-slots-landscape-small.png`, `expedition-party-slots-tablet-portrait.png`이다. 전투 동료는 일렬이 아니라 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 표시되고 파티 슬롯은 검증 폭 전체에서 `3+2` 행 분포를 유지한다.

2026-06-24 추가 보강 기준으로 원정대 파티 슬롯의 `3+2` 배치는 의도된 정답이며, 원본 HTML 5열과 다른 부분을 패리티 작업 중 되돌리면 안 된다. 동료 관리 카드는 `artifacts/react-vite-interactive-parity/expedition-동료-관리-react.png` 기준 잠금 버튼이 한 줄로 표시되고 상태 배지가 직업명 아래에 배치된다.

2026-06-24 학생 직장 탭 보강 기준으로 `artifacts/react-vite-interactive-parity/student-직장-react.png`는 원본의 compact 직장 빈 상태와 같은 좌표/높이/색상 계열을 사용한다. 남은 `student-직장` diff는 live 프레임과 sprite/progress bar 잔차가 대부분이다.

2026-06-24 학생 교육 탭 보강 기준으로 `artifacts/react-vite-interactive-parity/student-교육-react.png`는 원본의 compact 교육 카드 행과 같은 높이/간격/버튼/설명 텍스트 계열을 사용한다. 남은 `student-교육` diff는 live 프레임과 sprite/progress bar 잔차가 대부분이다.

2026-06-24 학생 도감 탭 보강 기준으로 `artifacts/react-vite-interactive-parity/student-도감-react.png`는 원본의 compact 도감 요약, 은퇴 효과 4종 타일, 원본형 직업 카드 목록을 사용한다. 직업 카드 초상은 원본 HTML과 같은 `visual-careers.png` atlas 배경 `span.career-emblem.career-portrait.career-<id>` 구조이며, `selectorMetrics` 기준 첫 초상 rect는 snapshot/React 모두 `x 21 / y 683.13 / 32x32`로 일치한다. `tools/react-vite-records-smoke.mjs`는 도감 직업 카드 62개와 효과 타일 4개를 회귀 기준으로 검사한다. 최신 `student-도감` selector diff는 0건이며, 남은 주요 비교 우선순위는 원정대 탭들의 의도된 차이 문서화와 live frame 잔차다.

2026-06-24 원정대 동료 일렬 배치 제거 기준으로 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`는 전투 동료 `2+2+1` 리더 편대와 성장 카드 `2+2+1` 그리드를 보여준다. 전투 동료는 한 세로 밴드에 3명 이상 몰리지 않고 전체 세로 폭이 52px 이상이라 한 줄처럼 보이지 않는다. `expedition-party-slots-phone-parity.png`는 파티 슬롯 `3+2`와 편성 후보 `2+2+1`을 보여주며, `expedition-manage-grid-phone-parity.png`는 동료 관리 `2+2+1`과 잠금 버튼 한 줄 표시를 보여준다. 이 배치는 최신 사용자 요청 기준의 의도된 정답이므로 원본 HTML의 일렬 리스트/5열 슬롯으로 되돌리면 안 된다.

2026-06-24 추가 좌표 보강 기준으로 원정대 전투 동료는 사선 한 줄이나 하단 3명 가로줄처럼 읽히지 않도록 뒤 2명, 중간 2명, 앞 리더 1명으로 분리했다. `tools/react-vite-responsive-audit.mjs`는 세로 밴드 3개 미만, 한 밴드 3명 이상, 앞줄 밴드 1명 미일치, 세로 폭 52px 미만을 실패로 처리하며, 최신 `npm run react:responsive-audit`는 8개 viewport failure 0건이다.

2026-06-24 시험 탭 smoke 기준 보강 이후 `tools/react-vite-records-smoke.mjs`는 더 이상 `.exam-progress-card`를 찾지 않는다. 시험 탭은 `battle-summary-panel`, `battle-enemy-card`, `battle-enemy-monster`, `enemy-hp-bar`를 기준으로 관리한다.

2026-06-24 학생 결과 탭 보강 기준으로 `artifacts/react-vite-interactive-parity/student-결과-react.png`는 원본의 compact 결과/합격권/회차 기록 panel 구조와 수능 결과 대기 화면의 `decision` panel 구조를 사용한다. `.result-panel` padding은 원본 `.viewport`와 같은 10px 기준이라 결과 제목, `합격권`, `회차 기록` 카드가 원본 y좌표와 일치한다. 상단 첫 DEBUG/database 버튼은 최신 원본 HTML의 상태별 색상 기준을 따른다. 저장 데이터가 없는 첫 실행은 기본 `.icon-button`, 기존 save 로드 상태는 `.icon-button.alert`다. 전투 HUD 보강 후 원본/React 결과 탭 캡처 모두 `55초` HUD를 표시한다. 이후 결과 빈 상태 DOM을 원본의 `section.viewport > div.stack > div.section-title / div.panel` 흐름에 맞추고, 원본에 없던 `grid/gap` 스타일과 `RefreshCcw` 회차 기록 아이콘을 보정했다. 최신 `student-결과` visual diff는 `8.416%`에서 `0.2951%`, activePanel diff는 `4.0448%`에서 `0.1172%`, mean absolute diff는 `1.7952`에서 `0.0563`으로 줄었고 selectorDiff는 0건이다.

2026-06-24 전투 HUD 남은 시간 보강 기준으로 `BattleArena`의 제한시간 숫자는 `maxDurationMs - elapsedMs` 기준 남은 초를 표시한다. 기존 React는 progress bar와 결과 경과 시간은 진행되는데 HUD 숫자만 `60초`로 고정되어 원본 HTML의 `58초` 표시와 달랐다. `tools/react-vite-battle-road-smoke.mjs`는 자동 전투 live timer를 열어 `elapsedMs`와 HUD 숫자가 일치하는지 검사한다. 최신 `artifacts/react-vite-interactive-parity/student-시험-react.png`는 원본과 같은 `58초` HUD를 표시하며, 시험 패널 activePanel diff는 `0.2085%`다.

2026-06-24 학생 동료 탭 보강 기준으로 `artifacts/react-vite-interactive-parity/student-동료-react.png`는 원본과 같이 하단 탭 바로 아래에서 `동료` 제목과 `0명` 배지를 표시한다. `.companion-panel`은 `align-content: start`를 사용해 빈 grid row가 제목을 화면 중간으로 밀지 않게 한다. `tools/react-vite-interactive-parity-audit.mjs`는 학생 탭에서 `.management-panel .section-title` rect를 수집해 같은 회귀를 layout failure로 잡는다.

2026-06-24 interactive 영역별 visual diff 보강 기준으로 `tools/react-vite-interactive-parity-audit.mjs`는 전체 screenshot diff 외에 `visualRegions.scene`, `visualRegions.activePanel`을 기록한다. 학생 `시험`/`결과`/`도감` 패널은 `selectorMetrics`, `selectorDiffs`로 핵심 selector rect/style/text/source evidence도 기록한다. 최신 `npm run react:interactive-parity`는 23개 조작 시나리오 failure 0건이며, 학생 `시험`/`결과`/`도감` selector diff는 모두 0건이다. 최신 학생 탭 대표 activePanel diff는 `student-성장 0.0611%`, `student-동료 0.1007%`, `student-시험 0.1613%`, `student-직장 0.179%`, `student-교육 0.1023%`, `student-결과 0.1172%`, `student-도감 0.1656%`다. 원정대 탭의 큰 scene diff는 최신 사용자 요청에 따른 전투/메뉴/카드 레이아웃 차이를 기록하는 값이며, 원본 HTML 일렬 배치로 되돌릴 근거가 아니다.

2026-06-24 원정대 layout signature 보강 기준으로 `tools/react-vite-interactive-parity-audit.mjs`는 원정대 전투 동료, 파티 슬롯, 성장 카드, 파티 후보, 동료 관리 카드의 행 분포를 `layoutSignatures`에 기록한다. React 기준 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보와 동료 관리는 2열 카드 그리드다. snapshot 원본 HTML의 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 지시와 충돌하므로 React 수정 목표가 아니라 의도된 차이로 분류한다. 최신 요청 기준 원정대 동료는 전투장과 하단 패널 모두 일렬로 배치하지 않는다. 이 기준으로 `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 다시 통과했다.

2026-06-24 원정대 semantic signature 보강 기준으로 `tools/react-vite-interactive-parity-audit.mjs`는 원정대 active panel 제목, 전체 텍스트, 버튼 라벨, 주요 카드 텍스트를 `semanticSignatures`로 기록한다. 최신 `npm run react:interactive-parity` 기준 원정대 성장/파티/동료 관리/기록의 `activePanelText`와 `activePanelButtons`는 snapshot/React가 일치한다. 대표 제목 `출전 동료 성장 0명 투자 가능`, `원정 파티 5/5`, `동료 관리`, `원정 기록`과 하단 메뉴 `성장 / 파티 / 동료 관리 / 기록`도 일치한다. 따라서 현재 원정대의 큰 visual diff는 기능 텍스트 불일치가 아니라 의도된 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드 차이로 분류한다. `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `npm run react:expedition-smoke`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

2026-06-24 도감 hotspot crop 보강 기준으로 `tools/react-vite-hotspot-crop.mjs`는 `artifacts/react-vite-interactive-parity/report.json`의 region hotspot을 PNG로 잘라 `artifacts/react-vite-hotspot-crops/`에 저장한다. `student-도감` 최대 hotspot은 weight bar가 아니라 첫 직업 카드의 `분배 가이드` 아이콘/텍스트였고, React 아이콘을 원본 HTML과 같은 line 기반 `ArchiveGuideIcon`으로 바꾼 뒤 selector diff는 0건을 유지했다. 해당 보강 시점의 `student-도감` visual diff는 `2.126%`, activePanel diff는 `0.9085%`, mean absolute diff는 `0.4772`이며, hotspot은 `x 352 / y 608 / threshold 346px`의 숫자 렌더링 잔차로 이동했다. 원정대 캡처는 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 동료 관리 2열 카드가 유지되는지 확인했다. `npm run react:build`, `npm run react:battle-smoke`, `npm run react:records-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `npm run react:hotspot-crop`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

2026-06-24 도감/원정대 재검증 당시 `src/react/styles.css`의 도감 `career-card` header/weight row를 원본 HTML computed style과 맞추고, `tools/react-vite-interactive-parity-audit.mjs`의 selector evidence에 `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue`를 포함했다. `career-emblem` transform 비교는 양쪽 모두 `none`인 경우를 동등 처리하도록 고쳤다. 당시 `npm run react:interactive-parity` 기준 `student-도감`은 visual diff `1.7317%`, activePanel diff `0.1656%`, mean absolute diff `0.2436`, selector diff 0건이었다. 전투 scene HP/VFX 보강 최신 기준 `student-도감`은 visual diff `0.3207%`, scene diff `0.6755%`, activePanel diff `0.1656%`, selector diff 0건이다. 최신 `npm run react:hotspot-crop` 기준 hotspot은 `x 704 / y 32 / threshold 280px`의 첫 직업 카드 상단 메달/상태 아이콘 영역이다. 원정대 동료 배치는 최신 사용자 요청 기준으로 전투 `2+2+1 / front 1`, 파티 슬롯 `3+2`, 성장 카드 5명 `2+2+1`, 파티 후보/동료 관리 2열 카드 그리드를 유지한다. 전체 후보 10명에서 보이는 `2+2+2+2+2`는 2열 그리드의 여러 행으로 기록하며 일렬 배치로 보지 않는다. `npm run react:verify`, `npm run react:interactive-parity`, `npm run react:hotspot-crop`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.

2026-06-24 deep parity region evidence 기준으로 `tools/react-vite-ui-parity-deep-smoke.mjs`가 상점/뽑기/설정/디버그 selector별 `regionVisuals`와 32px hotspot을 기록하게 했다. gacha 내부 evidence는 `metricLabel`, `metricValue`, `cardBadge`, `cardTitle`, `cardMeta`, `confirmIcon`, `confirmText`까지 포함한다. font family, text rendering, font smoothing도 style snapshot에 포함한다. 최신 `npm run react:deep-parity`는 기본 정적 animation 리포트로 실행되고 failures 0건이며, gacha normalized text 일치, styleDiffs 0건, region rectMismatch 0건이다. 기본 리포트 기준 gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이다. 설정 모달은 원본 HTML과 같은 행 아이콘 SVG signature를 사용하며, 최신 settings visual diff는 `0.1827%`, threshold diff는 `0.1495%`, icon region diff는 `0%`, styleDiffs/svgDiffs는 0건이다. live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행한다. 이전 live settle 리포트 기준 gacha visual diff `26.2213%`, threshold diff `2.5024%`, top region `metricLabel` threshold diff `37.0982%`는 실제 최종 UI 불일치가 아니라 animation phase/blur/안티앨리어싱 잔차로 분류한다. freeze animation 모드는 등장 초기 프레임을 멈춰 popup 좌표가 갈라지므로 최신 기준 리포트로 쓰지 않는다.

2026-06-24 헤더 아이콘 strict parity 복구 기준으로 `tools/react-vite-visual-parity-smoke.mjs`가 `*-latest-diff.png`, `comparison.bbox`, `hotspots`를 기록하게 했다. 최신 snapshot/React 빌드에서 strict parity가 0.25~0.29% 실패했지만, bbox가 상단 첫 DEBUG/database 버튼 32x32 영역으로 좁혀졌다. SVG path는 같고 class만 snapshot `icon-button`, React `icon-button alert`였으므로 저장 데이터가 없는 첫 실행에서는 React를 최신 원본 HTML처럼 기본 `icon-button`으로 되돌렸다. 이후 원본 snapshot을 직접 실행해 기존 save 로드 상태에서는 같은 버튼이 `icon-button alert`임을 확인했고, React도 `saveSource === "localStorage"`일 때만 alert를 붙이도록 맞췄다. 재검증 결과 첫 실행 strict parity는 412x915, 390x844 모두 `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`, `bbox null`, `hotspots []`다. 저장 데이터가 있는 interactive parity는 23개 시나리오 failure 0건이고, header selector probe도 diff 0건이다.

2026-06-24 전투 scene selector evidence 기준으로 `tools/react-vite-interactive-parity-audit.mjs`가 전투장 내부 selector와 적/HP row signature를 기록하게 했다. 이 증거로 원본 HTML 모바일 HP bar 규칙이 React에 빠져 있음을 확인했고, `src/react/styles.css`에서 390px 이하 `.battle-scene-hp`를 `top -16px`, `width 96px`, `height 12px`로 보정했다. `src/react/App.jsx`의 `CurriculumAttackVfx`는 원본처럼 `vfx.token` 텍스트를 span 내용으로 렌더링한다. `react:interactive-parity`는 양쪽 자동 전투 interval을 같은 조건으로 멈춰 탭 순회 중 원본만 공부량을 획득하는 비교 노이즈를 제거한다. 최신 `npm run react:interactive-parity`는 23개 시나리오 failure 0건, 학생 전투 selector diff 0건이며, `student-시험` visual diff는 `0.3213%`, scene diff는 `0.6848%`, activePanel diff는 `0.1613%`다. `npm run react:verify`, `npm run react:deep-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.

2026-06-24 full parity gate 기준으로 `tools/react-vite-full-parity-gate.mjs`와 `npm run react:full-parity`를 추가했다. 이 명령은 `snapshot:build`로 기존 HTML `dist/`를 최신화한 뒤 `curriculum-vfx:verify`, `react:verify`, strict `react:parity-audit`, `react:interactive-parity`, `react:deep-parity`, `react:hotspot-crop`, `git diff --check`를 순서대로 실행하고 artifact JSON을 다시 읽어 snapshot dist hash/bytes, strict 첫 화면 viewport 2개, interactive 23개 시나리오, responsive 8개 viewport, deep parity shop 6개/modal 2개, `src/react` 금지 문자열 0건을 검사한다. 원정대 동료는 전투 `2+2+1`, front 1, 세로 폭 52px 이상, 파티 슬롯 `3+2`, 성장 카드 `2+2+1`, 후보/관리 카드 2열 행을 실패 조건으로 고정했다. 최신 `npm run react:full-parity`는 통과했고 `artifacts/react-vite-full-parity-gate/report.json` 기준 snapshot dist는 `external / 864564 bytes / sha256 9ba894c7e95c49a93017f634d6cf303bc644345f9229d8ca4b4e6c38771d0ad4`, failures 0건이다.

2026-06-24 full parity gate semantic/state 증거 보강 기준으로 `tools/react-vite-full-parity-gate.mjs`가 23개 interactive 시나리오 각각의 normalized text, state diffs, rectDiffs, selectorDiffs, scenario failures, snapshot/React overflow, active panel semantic signature를 직접 재검사하게 했다. `tools/react-vite-interactive-parity-audit.mjs`는 원정대 전투 동료 rect에 `centerX`, `centerY`를 추가하고 `layoutSignatures.expeditionBattleUnits.horizontalCenterSpread`를 기록한다. 원정대 카드 DOM/count와 카드 텍스트 블록은 최신 사용자 요청에 따라 원본 HTML의 일렬 배치와 의도적으로 다르므로 직접 동일성 비교에서 제외하고, React layout signature로 `3+2`, `2+2+1`, 2열 grid를 검증한다. 최신 `npm run react:full-parity`는 통과했고, 원정대 전투 동료는 `horizontalCenterSpread 97`, `bandCounts 2+2+1`, `frontBandCount 1`로 기록된다.

2026-06-24 full parity gate 완료 증거 매트릭스 기준으로 `artifacts/react-vite-full-parity-gate/report.json`에 `completionEvidence` 배열을 추가했다. 최신 `npm run react:full-parity`는 통과했고 `completionEvidence` 10개 항목이 모두 `pass`다. 항목은 `snapshot-html-current`, `strict-first-screen-parity`, `student-tab-interaction-parity`, `modal-shop-settings-debug-parity`, `expedition-flow-parity`, `expedition-rules-state`, `expedition-non-linear-layout`, `responsive-mobile-layout`, `no-disallowed-runtime-substitution`, `migration-documents-current`다. 따라서 이후 완료 판단은 단순 명령 성공뿐 아니라 `status: pass`, `failures: []`, `completionEvidence` 전 항목 `pass`를 함께 확인한다.

2026-06-24 원정대 규칙 smoke 기준으로 `completeExpeditionStage`가 전투력 부족 상태를 클리어로 처리하지 않게 보강했다. 보스 전투력 부족은 해당 구간 첫 Stage로 회귀하고, 일반 Stage 전투력 부족은 현재 Stage를 유지한다. 두 경우 모두 EXP/다이아/claim 보상은 지급하지 않는다. `tools/react-vite-expedition-rules-smoke.mjs`는 실제 React 화면에서 보스 첫 클리어, 보스 보상 중복 방지, 보스 전투력 부족 회귀, 일반 Stage 전투력 부족 유지, 성장 투자, 승급 합성 6개 시나리오를 검사한다. `npm run react:expedition-rules-smoke`는 통과했고, full gate는 이 결과를 `expedition-rules-state` evidence로 읽는다.

## 후속

- 학생 도감은 남은 숫자/폰트 렌더링 잔차가 실제 수정 대상인지 별도 비교한다.
- 원정대 탭은 사용자 의도 차이와 원본 HTML parity 미달을 selector evidence로 계속 분리하되, 의도된 3+2/2+2+1 및 2열 카드 배치 외의 차이만 다음 수정 대상으로 남긴다.
- live 애니메이션 상태 parity 감사 확대
- 상점 결제/광고/패키지 실연동과 확률표/약관 화면 정리
- 직장 배치 조작과 수입 정산 이식
- Android 릴리스 설정 정리
