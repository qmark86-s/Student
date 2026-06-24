# React/Vite 병행 이식 문서

## 목적

현재 snapshot 기반 앱을 유지하면서 React/Vite 앱을 별도 라인으로 이식한다. snapshot은 기존 상용화 백업선이며, React/Vite는 기능 동등성이 검증될 때까지 `dist-react/`에서만 빌드한다.

## 디렉터리

- `src/react/`: React/Vite 앱 루트
- `dist-react/`: React/Vite 빌드 산출물, git 비추적
- `tools/react-vite-smoke.mjs`: React 앱 모바일 smoke test
- `tools/react-vite-save-smoke.mjs`: React save/QA 조작 smoke test
- `tools/react-vite-battle-road-smoke.mjs`: React Battle Road/결과 흐름 smoke test
- `tools/react-vite-expedition-smoke.mjs`: React 직업 수락/원정대 흐름 smoke test
- `tools/react-vite-expedition-rules-smoke.mjs`: React 원정대 보스 보상, 전투력 부족, 성장 투자, 승급 합성 상태 규칙 smoke test
- `tools/react-vite-real-estate-smoke.mjs`: React 부동산 모드 탭, 도시 전체 보기, 지역 상세 보기, 원정대 부동산 자금, 구매/임대/랭킹/DEBUG 보상 smoke test
- `tools/react-vite-real-estate-visual-audit.mjs`: React 부동산 10개 지역 상세 배경/건물 오버레이 전수 시각 audit
- `tools/react-vite-records-smoke.mjs`: React 시험/직장/도감 저장 상태 smoke test
- `tools/react-vite-education-smoke.mjs`: React 교육 탭/업그레이드 smoke test
- `tools/react-vite-shop-debug-smoke.mjs`: React 상점 도우미/DEBUG 동료/원정대 편성 smoke test
- `tools/react-vite-responsive-audit.mjs`: React viewport별 overflow/이미지/기능 표면 audit
- `tools/react-vite-visual-parity-smoke.mjs`: snapshot 대 React 좌표/스크린샷 parity audit
- `tools/react-vite-interactive-parity-audit.mjs`: snapshot 대 React 학생/원정대 조작 parity audit
- `tools/react-vite-hotspot-crop.mjs`: interactive parity region hotspot PNG crop 도구
- `tools/react-vite-ui-parity-deep-smoke.mjs`: snapshot 대 React 상점/뽑기/설정/디버그 텍스트/스타일/스크린샷 parity audit
- `tools/react-vite-full-parity-gate.mjs`: React smoke, strict 첫 화면 parity, interactive parity, deep parity, responsive, no-fallback 감사를 묶은 상위 gate
- `tools/react-vite-goal-completion-audit.mjs`: full/interactive/deep/responsive/rules 산출물을 요구사항별 완료 증거 매트릭스로 정리하는 audit
- `tools/validate-real-estate-config.mjs`: 부동산 카탈로그/규모/밸런스/랭킹 보상/도시 레이아웃 JSON 검증
- `plans/react-vite-parity-migration/plan.md`: 차수별 이식 계획
- `implementations/react-vite-parity-migration/implementation.md`: 구현 이력

## 명령

```powershell
npm run react:dev
npm run react:build
npm run react:smoke
npm run react:save-smoke
npm run react:battle-smoke
npm run react:expedition-smoke
npm run react:expedition-rules-smoke
npm run real-estate:verify
npm run react:real-estate-smoke
npm run react:real-estate-visual-audit
npm run react:records-smoke
npm run react:education-smoke
npm run react:shop-debug-smoke
npm run react:responsive-audit
npm run react:parity-audit
npm run react:interactive-parity
npm run react:hotspot-crop
npm run react:deep-parity
npm run react:full-parity
npm run react:goal-audit
npm run react:completion-gate
npm run react:verify
```

- `react:dev`: Vite 개발 서버를 연다.
- `react:build`: `src/react/`를 `dist-react/`로 빌드한다.
- `react:smoke`: `dist-react/`를 임시 HTTP 서버로 띄워 360x740, 412x915 모바일 뷰포트와 production 기본 DEBUG 미노출을 검사한다.
- `react:save-smoke`: 기존 save key인 `student-idle-rpg-save-v1`에 테스트 save를 주입하고, 명시적 QA URL에서 읽기/쓰기와 DEBUG/Auto 조작 호환을 검사한다.
- `react:battle-smoke`: 명시적 QA URL에서 기본 조우, N수 4조우, 수능 4조우, 결과 패널과 직업 후보 렌더링을 검사한다.
- `react:expedition-smoke`: 수능 결과 직업 수락, 동료 등록, 원정대 파티 편성, stage 표시, stage 돌파 저장을 검사한다.
- `react:expedition-rules-smoke`: 보스 첫 클리어 보상, 보스 보상 중복 방지, 보스 전투력 부족 시 구간 시작 회귀, 일반 Stage 전투력 부족 시 현재 Stage 유지, 성장 투자, 승급 합성을 실제 React 화면 클릭과 저장 상태로 검사한다.
- `real-estate:verify`: `data/real_estates.json`, `data/real_estate_scale_tiers.json`, `data/real_estate_balance.json`, `data/real_estate_rank_rewards.json`, `data/real_estate_city_layout.json`, `data/real_estate_district_assets.json`의 id 중복, 수치 범위, 좌표 범위, 배경 파일 존재, 건물 패드/주민 경로, help 누락을 검사한다.
- `react:real-estate-smoke`: 상단 모드 탭 `학생/원정대/부동산`, 도시 전체 보기 기본 진입, 10개 지역 버튼, 잠김 안내, 지역별 상세 배경, 건물 theme/variant, 드래그 pan, 구매 후 건물 개발도 증가, 원정대 Stage 돌파 부동산 자금 지급, 매입 1/10/최대, 임대수익 자동 정산, 규모 명칭 변경, 랭킹 preview, 일반 주간 다이아 보상 수령, DEBUG 중복 방지를 검사한다.
- `react:real-estate-visual-audit`: 풀성장 seed로 10개 부동산 지역 상세 화면을 모두 열고, `backgroundAsset` 기반 배경 src, 건물 10개, `data-building-theme`, `data-building-variant`, horizontal overflow 0, screenshot 저장을 검사한다. 산출물은 `artifacts/real-estate-resource-quality-audit/`에 남긴다.
- `react:records-smoke`: 저장 상태를 주입하고 시험/직장/도감 탭이 placeholder 없이 카드로 렌더링되는지 검사한다.
- `react:education-smoke`: 교육 데이터 주입, 9개 교육 카드, 잠금 상태, 비용, 업그레이드 저장, 성장 배율 반영을 검사한다.
- `react:shop-debug-smoke`: 상점 도우미 호출, 다이아 차감, 로봇 도우미 저장, 성장 패널 학습 도우미 반영, 동료 탭 표시, DEBUG 동료 +5, 원정대 파티 5/5 편성, stage 돌파 저장을 검사한다.
- `react:responsive-audit`: 320x568, 360x740, 390x844, 412x915, 430x932, 768x1024, 844x390, 1280x720에서 기본/전투/상점 뽑기/원정대 디버그 흐름의 overflow, 버튼 텍스트, 이미지 로드, phone frame 위치, 원정대 전투 동료 `2+2+1` 세로 밴드, 전투 동료 발 하한 64%, 동료별 리듬 다양성, 원정대 파티 슬롯 `3+2` 행 분포, 원정대 성장/파티 후보/동료 관리 카드 `2+2+1` 행 분포를 검사하고 `artifacts/react-vite-responsive-audit/report.json`에 기록한다.
- `react:parity-audit`: `dist/` snapshot과 `dist-react/` React를 390x844, 412x915에서 캡처하고 좌표/픽셀 차이를 `artifacts/react-vite-parity/report.json`에 기록한다. 기본은 audit이며 실패시키지 않는다. `Math.random=0.25`를 주입하고 애니메이션은 첫 프레임 pause 상태로 비교한다. live 애니메이션 상태를 보려면 `REACT_PARITY_FREEZE_ANIMATIONS=0`으로 실행한다. `REACT_PARITY_STRICT=1`을 설정하면 `REACT_PARITY_MAX_DIFF_PERCENT`, `REACT_PARITY_MAX_MEAN_ABS_DIFF` 기준으로 실패시킬 수 있다.
- `react:interactive-parity`: `dist/` snapshot과 `dist-react/` React를 같은 의미의 저장 상태로 열고 학생 7개 탭, 상점/설정/디버그, 원정대 성장/파티/동료 관리/기록/편성 조작을 비교한다. snapshot에는 원본 HTML용 schema 1 seed, React에는 schema 2 seed를 주입한다. 첫 캡처는 양쪽 Battle Road 적 수와 HUD 제한시간이 같은 안정 상태가 된 뒤 진행한다. 전체 screenshot diff와 함께 `visualRegions.scene`, `visualRegions.activePanel`을 기록해 battle scene 잔차와 하단 패널 잔차를 분리한다. 학생 `시험`/`결과`/`도감` 패널은 핵심 selector의 rect/style/text/source evidence도 `selectorMetrics`, `selectorDiffs`로 기록한다. 원정대 전투 동료는 `layoutSignatures.expeditionBattleUnits`에 `2+2+1`, front 1, 세로 spread, 좌우 center spread를 기록한다.
- `react:hotspot-crop`: `artifacts/react-vite-interactive-parity/report.json`의 region hotspot을 PNG로 잘라 `artifacts/react-vite-hotspot-crops/`에 저장한다. 기본 대상은 `student-도감` / `activePanel` / hotspot 0이며, `REACT_HOTSPOT_LABEL`, `REACT_HOTSPOT_REGION`, `REACT_HOTSPOT_INDEX`, `REACT_HOTSPOT_PADDING` 환경 변수로 바꿀 수 있다.
- `react:deep-parity`: `dist/` snapshot과 `dist-react/` React를 같은 의미의 seed/save로 열고 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 normalized text, 핵심 selector computed style/rect, SVG signature, 스크린샷 diff를 비교한다. snapshot에는 원본 HTML용 schema 1 seed, React에는 schema 2 seed를 주입한다. 리포트와 캡처는 `artifacts/react-vite-ui-parity-deep-current/`에 기록한다. 텍스트 불일치와 핵심 selector `styleDiffs`, `svgDiffs`는 실패로 취급한다.
- `react:deep-parity`는 핵심 selector별 `regionVisuals`도 기록한다. region diff는 selector rect를 screenshot 좌표로 환산해 threshold diff와 32px hotspot을 남기며, rect가 3px 넘게 어긋나면 `rectMismatch`로 표시한다. style snapshot은 font family, text rendering, font smoothing 계열도 비교한다.
- `react:full-parity`: `snapshot:build`로 기존 HTML `dist/`를 최신화한 뒤 `curriculum-vfx:verify`, `react:verify`, strict `react:parity-audit`, `react:interactive-parity`, `react:deep-parity`, `react:hotspot-crop`, `git diff --check`를 순서대로 실행하고 최신 artifact JSON을 다시 읽어 목표 범위 조건을 검사한다. 결과는 `artifacts/react-vite-full-parity-gate/report.json`에 기록한다. 완료 판단에는 23개 interactive 시나리오 각각의 normalized text, state diffs, rectDiffs, selectorDiffs, overflow, active panel semantic signature와 `completionEvidence` 요구사항 매트릭스까지 포함한다.
- `react:goal-audit`: 최신 full gate, interactive parity, deep parity, responsive audit, 원정대 규칙 smoke 산출물을 읽어 목표 요구사항별 증거 매트릭스를 만든다. 결과는 `artifacts/react-vite-goal-completion-audit/report.json`과 `matrix.md`에 기록한다.
- `react:completion-gate`: `react:full-parity`를 새로 실행한 뒤 `react:goal-audit`를 이어서 실행한다. 완료 판단에는 이 명령을 우선 사용한다.
- `react:verify`: `real-estate:verify`, React 빌드, 모바일 smoke, save smoke, Battle Road smoke, 원정대 smoke, 원정대 규칙 smoke, records smoke, education smoke, shop/debug smoke, 부동산 smoke, 부동산 전수 시각 감사, responsive audit를 함께 실행한다.

## 현재 기준

- 기존 `npm run verify:mobile`이 계속 통과해야 한다.
- React 앱은 기존 `data/*.json`과 `src/snapshot/assets/`를 직접 import한다.
- localStorage save가 없을 때만 새 게임 상태를 생성한다. 깨진 JSON, schema mismatch, 필수 필드 누락은 기본 상태로 대체하지 않고 fatal load 화면으로 표시해야 한다.
- 결과 대기 상태는 `current.awaitingDecision=true`, 완료된 `current.battle`, `current.outcome`을 모두 가져야 한다. 이 중 하나라도 없으면 smoke 또는 load 단계에서 실패해야 한다.
- 런타임 소스에는 조용한 `fallback`, `??`, `unknown` 대체를 두지 않는다. sparse level map을 0으로 읽는 것은 명시 함수로만 허용한다.
- React 런타임 저장 schema는 3이며 `realEstate` 필드를 필수로 검증한다. schema 1/2 save는 migration에서 `realEstate` 기본 상태를 명시 추가한다. snapshot 비교 도구의 schema 1 seed는 원본 HTML 호환 입력일 뿐 React 런타임 fallback 기준이 아니다.
- 모바일 가로 overflow는 0이어야 한다.
- 첫 화면에는 상단 상태, 학생/원정대 전환, 학생 전투장, 7개 탭, 성장 패널, 자동 투자 슬라이더 5개가 있어야 한다.
- production 기본 화면에는 `.battle-debug-complete`와 `DEBUG` 텍스트가 없어야 한다.
- QA 검증이 필요한 경우 `?qaTools=1` URL 또는 `student-react-qa-tools-v1=1` localStorage 플래그에서만 DEBUG 전투 완료 버튼을 노출한다.
- 상단 상점/디버그/설정 버튼은 각각 React 모달을 열고 닫아야 한다.
- 상점 탭 순서는 snapshot 기준 `다이아 / 보유금 / 로봇 / 광고 / 패키지 / 패스`여야 한다.
- 상점 로봇 탭은 로봇 도우미 1회/10+1 호출 시 다이아를 차감하고, snapshot 기준 C~SSS 등급 결과와 뽑기 팝업을 표시해야 한다.
- 로봇 도우미는 학생 Battle Road 학습 도우미로 저장되어 성장 패널 `학습 도우미 n/3`과 전투력 보너스에 반영되어야 한다.
- 로봇 도우미는 원정대 파티 후보가 아니며, DEBUG 직업 동료만 원정대 파티에 편성되어야 한다.
- DEBUG 메뉴의 다이아 +10K, 동료 랜덤 +1/+5, 데이터 동기화, 세이브 내보내기/불러오기 UI는 save 상태와 연결되어야 한다.
- 설정/디버그 summary는 snapshot 기준 콘텐츠 리비전과 legacy save 상태를 표시해야 한다.
- 학생 atlas와 학생전투 몬스터 atlas 3개가 로드되어야 한다.
- 기존 localStorage save를 읽어 회차, 과정, 재화, 공부량, 학습 도우미, 자동 투자 값을 표시해야 한다.
- QA 플래그가 켜진 상태의 DEBUG/Auto 조작은 `student-idle-rpg-save-v1`에 다시 저장되어야 한다.
- Battle Road 조우 상태는 `current.road`와 `current.battle`에 저장되어야 한다.
- 기본 학년 조우는 snapshot과 같이 `road-travel`로 시작하고, 적 3마리와 보스 HP바 1개를 렌더링해야 한다. 기본 travel 상태의 교과 공격 VFX 토큰은 0개이며, 전투/피격 상태에서만 VFX가 표시된다.
- N수 과정은 학교 4조우 뒤 수능 4조우로 이어지고, 마지막 수능 조우 후 결과 패널을 열어야 한다.
- 결과 패널은 `careers.json`의 전체 직업 후보를 `.career-choice.ranked`로 표시하고 동료 초상 자산을 연결해야 한다.
- 직업 수락 후 `companions`, `history`, `log`, `expedition.partyMemberIds`가 저장되어야 한다.
- 직업 수락 후 새 회차는 E1 Battle Road 상태로 시작해야 한다.
- 원정대 화면은 `data/expedition_stages.json`의 stage와 원정대 적/동료 4프레임 PNG를 표시해야 한다.
- 원정대 stage 돌파 후 `expedition.stageIndex`, `clearedStageCount`, 부동산 자금 지급 결과가 저장되어야 한다.
- DEBUG 동료 +5 이후 원정대에는 직업 동료 5명이 자동 편성되어야 하고, stage 돌파가 가능해야 한다.
- 원정대 보스 첫 클리어는 다이아와 EXP를 지급하고 `claimedBossStages`를 기록해야 하며, 이미 claim된 보스는 다이아를 중복 지급하지 않아야 한다.
- 원정대 보스에서 전투력이 부족하면 해당 구간 첫 Stage로 회귀하고 보상을 지급하지 않아야 한다.
- 원정대 일반 Stage에서 전투력이 부족하면 현재 Stage를 유지하고 보상을 지급하지 않아야 한다.
- 원정대 성장 투자는 보유 EXP를 소모해 출전 동료 level을 올리고, 동료 관리 합성은 같은 직업/승급 동료 2명을 다음 승급 1명으로 바꿔야 한다.
- 원정대 전투 동료는 일렬 배치나 3명 가로줄이 아니라 전투장 왼쪽 하단에서 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대로 보여야 한다.
- 원정대 전투 동료는 배경 펜스/상자 위에 뜬 것처럼 보이면 실패다. 최신 기준은 `minimumFootPercent >= 64`이며, `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small`에서 각각 `67.06%`, `68.49%`, `67.66%`, `65.73%`로 확인했다.
- 원정대 전투 동료 5명은 같은 컨테이너 리듬으로만 움직이면 실패다. React는 슬롯별 motion duration, frame delay, spark delay를 5종으로 분리한다.
- 원정대 파티 슬롯은 모든 검증 폭에서 3+2 그리드로 줄바꿈되어야 한다. 최신 사용자 요청 기준으로 이 3+2 배치는 원본 HTML의 5열 슬롯보다 우선한다.
- 원정대 성장/파티 후보/동료 관리 카드 목록은 5명 기준 세로 한 줄 리스트가 아니라 2+2+1 카드 그리드로 보여야 한다.
- 원정대 동료 관리 카드의 잠금 버튼은 `잠금` 텍스트가 줄바꿈되지 않아야 하며, 상태 배지는 직업명 아래에 표시되어야 한다.

## 부동산 MVP 기준

- 상단 모드 탭은 `학생 / 원정대 / 부동산` 3개이며, 모바일 폭에서 버튼 텍스트와 아이콘이 겹치지 않아야 한다.
- 부동산 데이터는 루트 `data/`의 `real_estates`, `real_estate_scale_tiers`, `real_estate_balance`, `real_estate_rank_rewards`, `real_estate_city_layout`, `real_estate_district_assets` JSON으로 관리한다.
- 부동산 전용 재화는 기존 보유금/다이아와 분리된 `부동산 자금`이다.
- 원정대 Stage 돌파 성공 시 부동산 자금을 지급하고, 보스 Stage는 부동산 밸런스 배수를 적용한다.
- 원정대 방치 부동산 자금은 파티가 있고 최고 Stage가 1 이상일 때만 최대 8시간까지 정산한다.
- 부동산 탭 기본 화면은 `도시 전체 보기`이며, `visual-real-estate-city-map.png` 위에 10개 지역 버튼을 외곽에서 중심부로 갈수록 고등급이 되도록 배치한다.
- 지역 상세 화면은 `real_estate_district_assets.json.backgroundAsset`에 정의된 지역별 PNG 10장을 200% x 200% 대형 배경으로 표시하고, `real_estate_city_layout.json.detailFocus`로 초기 카메라 중심을 잡으며, pointer 기반 드래그 pan을 지원한다. 우상단 `전체 도시 보기` 버튼은 pan과 무관하게 고정되어야 한다.
- 구매 수량이 늘면 `createRealEstateViewModel()`의 `developmentLevel`, `developmentRatio`, `visibleBuildingSlots`에서 파생된 도시 전체 마커와 지역 상세 건물이 즉시 증가해야 한다.
- 지역 상세 화면은 `districtDetailPads` 기반 빈 부지 패드와 `real-estate-development-building` 레이어를 분리하고, 향후 주민/차량 이동을 올릴 수 있는 ambient 레이어를 유지한다. `futureResidentPaths`는 추후 주민이 도로를 따라 걷도록 쓰는 검증 대상 데이터다.
- 관리 패널은 도시 전체 보기에서는 매물 10개, 지역 상세 보기에서는 선택 지역 1개를 표시하며, 보유 수량, 규모 명칭, 임대/분, 개발도, 다음 구매가, `구매 / 10개 / 최대` 버튼을 제공한다.
- 총 자산가치는 `보유 부동산 평가액 + floor(부동산 자금 * cashAssetWeight)`이며 기본 `cashAssetWeight`는 `0.15`다.
- 일반 랭킹 영역은 예상 순위/예상 보상과 `주간 보상 수령` 버튼을 표시한다. 일반 수령은 `real_estate_balance.json.ranking.minimumWeeklyAssetGainForClaim` 이상의 주간 자산 증가량이 있을 때 가능하며, DEBUG/QA 수령 버튼과 같은 `claimedWeeklyRewardWeek`로 같은 주차 중복 수령을 막는다.
- 시험 탭은 `current.examResults`, `current.road`, `current.examIndex`를 읽어 원본 compact `battle-summary-panel`, `battle-enemy-card`, 결과 카드를 표시해야 한다.
- 직장 탭은 `companions`, `workSlots`, `incomePerMinute`, `powerMultiplier`를 읽어 동료 수입과 직업 카드 목록을 표시해야 한다.
- 직장 탭의 기본 빈 상태는 원본 HTML처럼 compact 요약 패널, 비활성 슬롯 확장 버튼, 테두리 없는 빈 상태 텍스트로 표시되어야 한다.
- 신규 React save의 기본 `workSlots`는 원본 HTML과 같은 5여야 한다.
- 도감 탭은 `history`, `archive`, `careers.json`을 읽어 회차 기록과 직업 기록을 표시해야 한다.
- 도감 탭의 직업 목록은 원본 HTML처럼 초상, 상태, 메타칩, 분배 가이드, 과목 bar를 가진 `career-card` 62개로 렌더링해야 한다. 직업 카드 초상은 개별 PNG `img`가 아니라 원본 HTML과 같은 `span.career-emblem.career-portrait.career-<id>` 및 `visual-careers.png` atlas 배경을 사용한다.
- 은퇴 도감 효과는 `career_collection_effects.json`의 4개 효과 타일을 표시하고, 도감 요약/효과 패널이 접히면 `react:records-smoke`에서 실패해야 한다.
- 시험/직장/도감 탭에는 `React/Vite 병행 이식 중입니다.` placeholder 문구가 남아 있으면 안 된다.
- 교육 탭은 `data/education_actions.json` 기준 9개 교육 카드, 비용, 잠금 상태, 현재/다음 효과를 표시해야 한다.
- 교육 업그레이드는 `current.educationLevels`, `money`, `log`에 저장되고 성장 패널의 `교육 성장 배율`에 반영되어야 한다.
- parity audit의 390x844, 412x915 좌표 기준은 phone/header/status/battle/tabs/active panel이 snapshot과 일치해야 한다.
- 첫 화면 strict parity residual은 `artifacts/react-vite-parity/report.json`의 `comparison.bbox`, `hotspots`, `screenshotPaths.diff`에 기록한다.
- responsive audit은 8개 viewport에서 가로 overflow 0, 버튼 텍스트 overflow 0, 표시 이미지 로드 성공, phone frame 상단/좌우 잘림 0을 유지해야 한다.
- deep parity audit은 상점/뽑기/설정/디버그 표면의 normalized text가 모두 일치하고, 핵심 selector `styleDiffs`와 설정 모달 SVG `svgDiffs`가 0건이어야 한다. 모달 전체 스크린샷 diff는 블러/안티앨리어싱 잔차를 포함한 추적 지표로 기록한다.

## no-fallback 감사 상태

2026-06-24 기준 `plans/react-vite-no-fallback-hardening/plan.md`와 `implementations/react-vite-no-fallback-hardening/implementation.md`에 맞춰 다음을 확인했다.

- `rg -n '\?\?|fallback|Fallback|unknown' src/react` 결과 0건
- `react:save-smoke`에서 invalid save는 정상 UI가 아니라 `세이브를 불러올 수 없습니다` fatal 화면으로 진입
- `react:expedition-smoke`의 결과 대기 seed는 완료된 수능 battle을 포함하고, 직업 수락 후 E1 Battle Road와 원정대 파티가 생성됨
- 초등 탐구와 고3 수능 탐구 VFX token pool 추가, `curriculum-vfx:verify` 통과
- React smoke seed는 schema 2 전체 원정대 저장 형태이며, snapshot 비교 도구만 원본 HTML용 schema 1 seed를 별도로 사용

## 현재 parity 감사 상태

2026-06-24 기준 `$env:REACT_PARITY_STRICT='1'; $env:REACT_PARITY_MAX_DIFF_PERCENT='0'; $env:REACT_PARITY_MAX_MEAN_ABS_DIFF='0'; npm run react:parity-audit` 결과:

- 412x915: 좌표 일치, `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`
- 390x844: 좌표 일치, `changedPixels 0`, `diffPercent 0`, `meanAbsDiff 0`, `maxChannelDiff 0`

최신 `artifacts/react-vite-parity/report.json`에서 두 viewport 모두 `bbox: null`, `hotspots: []`다. 이 결과는 `Math.random=0.25`, 애니메이션 첫 프레임 pause 조건에서의 캡처 기준이다. live 애니메이션 상태를 비교하려면 `REACT_PARITY_FREEZE_ANIMATIONS=0`으로 별도 감사한다.

## 현재 상점/디버그/해상도 감사 상태

2026-06-23 기준 `npm run react:deep-parity` 결과:

- 상점 6개 탭 모두 snapshot normalized text와 일치
- `Math.random=0.25` 로봇 뽑기 팝업이 snapshot normalized text와 일치
- 설정 모달이 snapshot normalized text와 일치
- 디버그 모달이 snapshot normalized text와 일치
- 상점 6개 탭, 로봇 뽑기 팝업, 설정, 디버그 모달의 핵심 selector `styleDiffs: []`
- `react:deep-parity` 기본 캡처는 정적 animation 기준이다. 최신 기본 리포트 기준 gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, `meanAbsDiff`는 `0.0336`이다. live 애니메이션 phase 확인이 필요할 때만 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`를 사용한다.
- 설정 모달은 원본 HTML의 각 행 아이콘 SVG signature까지 맞추며, 최신 live 리포트 기준 settings visual diff `0.1827%`, threshold diff `0.1495%`, icon region diff `0%`, styleDiffs 0건, svgDiffs 0건이다.
- 리포트와 캡처는 `artifacts/react-vite-ui-parity-deep-current/`에 기록

2026-06-23 기준 `npm run react:shop-debug-smoke` 결과:

- 도우미 1회 호출 후 다이아 20,000 -> 19,700, 로봇 도우미 1기 저장
- 학습 도우미 편대 1기 표시, helper frame 4/4 로드
- 동료 탭에 로봇 도우미 카드 표시
- DEBUG 동료 랜덤 +5 후 직업 동료 5명, 원정대 파티 5/5 편성
- 원정대 stage 1 돌파 후 `stageIndex 1`, `clearedStageCount 1`, 보유금 증가
- 원정대 동료 frame 20/20, 적 frame 12/12 로드

2026-06-23 기준 `npm run react:responsive-audit` 결과:

- 8개 viewport 모두 실패 0건
- 캡처와 리포트는 `artifacts/react-vite-responsive-audit/`에 기록
- 짧은 가로 화면은 UI를 압축하지 않고 문서 스크롤로 접근한다.

## 현재 학생/원정대/no-fallback 감사 상태

2026-06-24 기준 다음을 확인했다.

- `npm run react:verify`: 통과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `npm run react:deep-parity`: 통과, 상점/뽑기/설정/디버그 normalized text 일치 및 핵심 selector `styleDiffs: []`
- `npm run curriculum-vfx:verify`: 통과, `grades=16 pools=70 tokens=416 styles=5`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- 원정대 전투 동료 시각 확인: `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-debug-landscape-small.png`, `expedition-debug-tablet-portrait.png`
- 원정대 파티 슬롯 시각 확인: `artifacts/react-vite-responsive-audit/expedition-party-slots-phone-parity.png`, `expedition-party-slots-landscape-small.png`, `expedition-party-slots-tablet-portrait.png`
- `react:responsive-audit`가 원정대 전투 동료 세로 밴드와 파티 탭 슬롯 행 분포를 검사하며, 현재 전투 동료는 `2+2+1`, 파티 슬롯은 `3+2`이다.

2026-06-24 추가 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 원정대 전투 동료 세로 밴드 `phone-narrow`, `phone-parity`, `tablet-portrait`, `landscape-small` 모두 `2+2+1`, 원정대 파티 슬롯 행 분포 모두 `3+2`
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass
- `artifacts/react-vite-interactive-parity/expedition-파티-react.png`: 원정대 슬롯 1~3번 첫 줄, 4~5번 둘째 줄 중앙 배치 확인
- `artifacts/react-vite-interactive-parity/expedition-동료-관리-react.png`: 잠금 버튼 한 줄 표시, 상태 배지 위치 확인

2026-06-24 학생 직장 탭 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `student-직장` visual diff: `41.27%`에서 `1.7543%`로 감소
- `student-직장` mean absolute diff: `6.0049`에서 `0.2418`로 감소
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

2026-06-24 학생 교육 탭 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:education-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `student-교육` visual diff: `33.2367%`에서 `1.7112%`로 감소
- `student-교육` mean absolute diff: `7.851`에서 `0.2305`로 감소
- 원본/React computed style 비교에서 390x844 기준 목록 높이 703px, 카드 높이 71px, gap 8px, 버튼 74x34px, 설명 텍스트 11.52px/400이 일치
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

2026-06-24 학생 도감 탭 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과, `careerBookCards 62`, `collectionEffectItems 4`, `archiveSummaryHeight 64`, `collectionBonusHeight 114`
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `student-도감` visual diff: `41.0343%`에서 `2.3125%`로 감소
- `student-도감` activePanel diff: `2.0875%`에서 `1.2597%`로 감소
- `student-도감` mean absolute diff: `0.5309`
- 도감 직업 카드 초상은 원본과 같은 `visual-careers.png` atlas 배경으로 복구했고, `selectorMetrics` 기준 첫 초상 rect는 snapshot/React 모두 `x 21 / y 683.13 / 32x32`이다.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건

2026-06-24 원정대 동료 일렬 배치 제거와 시험 탭 스모크 기준 보강 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과, 시험 요약 1개, 시험 적 카드 1개, 몬스터 이미지 1개, HP bar 1개, 요약 높이 64px, 적 grid 높이 56px
- `npm run react:battle-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- 원정대 전투 동료 세로 밴드: 검증 대상 4개 viewport 모두 `2+2+1`, 한 밴드 최대 2명
- 원정대 파티 슬롯 행 분포: 검증 대상 4개 viewport 모두 `3+2`
- 원정대 성장/파티 후보/동료 관리 카드 행 분포: 검증 대상 4개 viewport 모두 `2+2+1`
- 시각 확인: `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-party-slots-phone-parity.png`, `expedition-manage-grid-phone-parity.png`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건

2026-06-24 원정대 전투 동료 최신 기준 다음을 추가 확인했다.

- 원정대 전투 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대다.
- `react:responsive-audit`는 세로 밴드 3개 미만, 한 밴드 3명 이상, 앞줄 밴드 1명 미일치, 세로 폭 52px 미만을 실패로 처리한다.
- 최신 측정값은 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`이다.
- `npm run react:build`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:expedition-smoke`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

2026-06-24 원정대 동료 일렬 배치 금지 기준을 다시 확인했다.

- 원정대 전투 동료, 파티 슬롯, 성장/파티 후보/동료 관리 카드는 원본 HTML의 한 줄 배치로 되돌리지 않는다.
- 최신 `react:interactive-parity` layout signature 기준 React 전투 동료는 `2+2+1 / front 1 / 65.68px`, 파티 슬롯은 `3+2`, 성장 카드는 `2+2+1`, 파티 후보/동료 관리 카드는 2열 카드 그리드다.
- snapshot 원본 HTML에서 관측되는 파티 슬롯 `5`, 성장 카드 `1+1+1+1+1`, 전투 동료 `2+3`은 최신 사용자 요청과 충돌하므로 패리티 수정 목표가 아니라 의도된 차이로 관리한다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `src/react` no-fallback 문자열 검색, `git diff --check`를 다시 통과했다.
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

2026-06-24 학생 결과 탭 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:records-smoke`: 통과
- `npm run react:battle-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `student-결과` visual diff: `8.416%`에서 `0.2951%`로 감소
- `student-결과` mean absolute diff: `1.7952`에서 `0.0563`으로 감소
- `student-결과` activePanel diff: `4.0448%`에서 `0.1172%`로 감소
- `student-결과` selectorDiff: `0`
- `00-initial` visual diff: 초기 Battle Road signature 안정화 후 `1.6234%`, activePanel diff `0%`
- 결과 탭의 빈 상태와 수능 결과 대기 화면은 원본 compact panel 구조를 사용한다.
- 상단 첫 DEBUG/database 아이콘 버튼은 최신 원본 HTML처럼 저장 데이터가 없는 첫 실행에서는 기본 `.icon-button`, 기존 save 로드 상태에서는 `.icon-button.alert` 색상 기준을 따른다.
- 이후 전투 HUD 남은 시간 보강으로 원본/React 결과 탭 캡처 모두 `55초`를 표시한다. 결과 탭 DOM/CSS와 회차 기록 아이콘 보정 뒤 남은 `student-결과` 시각 차이는 live scene 잔차와 소량의 렌더링 잔차가 중심이다.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력

2026-06-24 전투 HUD 남은 시간 보강 기준 다음을 확인했다.

- `npm run react:verify`: 통과
- `npm run react:build`: 통과
- `npm run react:battle-smoke`: 통과, live timer `elapsedMs 1000`, HUD `59초`, 기대값 `59`
- `npm run react:records-smoke`: 통과
- `npm run react:expedition-smoke`: 통과
- `npm run react:responsive-audit`: 통과, 8개 viewport failure 0건
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- 학생 전투 HUD 제한시간 숫자는 `maxDurationMs - elapsedMs` 기준 남은 초를 표시한다.
- `student-시험-react.png`는 원본과 같은 `58초` HUD를 표시한다.
- 학생 탭 visual diff 최신값: `00-initial 0.214%`, `student-시험 0.3213%`, `student-교육 0.2874%`, `student-결과 0.2951%`, `student-도감 0.3207%`
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

2026-06-24 학생 동료 탭 보강 기준 다음을 확인했다.

- `npm run react:build`: 통과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `npm run react:verify`: 통과
- 학생 `동료` 탭 빈 상태 제목은 원본처럼 하단 탭 바로 아래에서 시작한다.
- `react:interactive-parity`는 학생 관리 패널 제목 rect를 비교한다. 제목 위치가 크게 밀리면 layout failure로 기록된다.
- `student-동료` visual diff: `2.357%`에서 `1.7131%`로 감소
- `student-companion-after-debug` visual diff: `2.296%`에서 `1.6521%`로 감소
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: `src/react` 절대경로 기준 pass

2026-06-24 interactive 영역별 visual diff 기준 다음을 확인했다.

- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `artifacts/react-vite-interactive-parity/report.json`은 각 시나리오의 전체 visual diff와 함께 `scene`, `activePanel` 영역 diff를 기록한다. 학생 `시험`/`결과`/`도감`은 `selectorMetrics`와 `selectorDiffs`도 기록하며, 최신 selector diff는 모두 0건이다.
- 학생 탭 대표 activePanel diff는 `student-성장 0.0611%`, `student-동료 0.1007%`, `student-시험 0.1613%`, `student-직장 0.179%`, `student-교육 0.1023%`, `student-결과 0.1172%`, `student-도감 0.1656%`이다.
- 학생 activePanel top hotspot은 `student-성장 32,32 / 145px`, `student-시험 160,32 / 257px`, `student-동료 256,32 / 249px`, `student-직장 384,32 / 272px`, `student-교육 480,32 / 264px`, `student-결과 608,32 / 255px`, `student-도감 352,608 / 346px`이다.
- 도감 hotspot 검증을 위해 `careerWeightTrack`과 `careerWeightFill` selector evidence를 추가했다. 최신 리포트에서 둘 다 snapshot/React 310개이며, 첫 40개 rect/style diff 0건이므로 첫 직업 카드 하단 bar의 width/color 차이는 아니다.
- 원정대 탭의 큰 scene diff는 최신 React 기준의 의도된 전투/메뉴/카드 레이아웃 차이를 보여주는 기록이며, 원본 HTML 일렬 배치로 되돌릴 근거가 아니다.

2026-06-24 원정대 동료 일렬 배치 제거와 시험 selector 보정 최신 기준 다음을 확인했다.

- 원정대 전투 동료는 뒤 2명, 중간 2명, 앞 리더 1명의 `2+2+1` 편대다.
- `react:responsive-audit` 최신 리포트 기준 전투 동료 밴드는 `phone-narrow 2+2+1 / front 1 / 65.68px`, `phone-parity 2+2+1 / front 1 / 65.68px`, `tablet-portrait 2+2+1 / front 1 / 68.8px`, `landscape-small 2+2+1 / front 1 / 68.8px`다.
- `tools/react-vite-responsive-audit.mjs`는 앞줄 밴드가 리더 1명이 아니면 실패한다.
- 파티 슬롯은 검증 대상 4개 viewport 모두 `3+2`, 성장/파티 후보/동료 관리 카드는 모두 `2+2+1`이다.
- 시험 탭은 적 카드 내부의 몬스터, 제목, 종류, HP bar/fill/text selector evidence를 수집한다.
- Vite build hash가 붙은 asset URL은 같은 원본 자산이면 동일하게 보고, React 전용 `exam-panel` scoping class는 루트 비교 노이즈로 처리한다.
- 최신 `npm run react:interactive-parity` 기준 `student-시험` selector diff는 0건, visual diff는 `0.3213%`, scene diff는 `0.6848%`, activePanel diff는 `0.1613%`다.
- 해당 보강 시점의 `npm run react:interactive-parity` 기준 `student-도감` selector diff도 0건이며, visual diff는 `2.126%`, activePanel diff는 `0.9085%`였다.
- `npm run react:build`, `npm run react:records-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:interactive-parity`는 모두 통과했다.
- `rg -n '\?\?|fallback|Fallback|unknown' src/react`: 결과 0건
- `git diff --check`: 공백 오류 없음, 기존 워킹트리 줄끝 변환 경고만 출력
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용

2026-06-24 원정대 동료 좌표 재보강 기준 다음을 확인했다.

- 사용자가 지적한 “일렬 배치” 인상을 없애기 위해 전면 리더는 하단 HUD와 겹치지 않게 유지하고, 뒤/중간 줄을 위로 올렸다.
- 최신 `react:responsive-audit` 리포트 기준 세로 spread는 `phone-narrow 65.68px`, `phone-parity 65.68px`, `tablet-portrait 68.8px`, `landscape-small 68.8px`이며 모두 `2+2+1 / front 1`이다.
- 확인 캡처는 `artifacts/react-vite-responsive-audit/expedition-debug-phone-parity.png`, `expedition-debug-phone-narrow.png`, `expedition-debug-landscape-small.png`다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:expedition-smoke`, `npm run react:interactive-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`를 통과했다.

2026-06-24 원정대 메뉴 semantic signature 기준 다음을 확인했다.

- `react:interactive-parity` 리포트는 원정대 active panel 제목, 전체 텍스트, 버튼 라벨, 주요 카드 텍스트를 `semanticSignatures`로 기록한다.
- 원정대 성장/파티/동료 관리/기록의 `activePanelText`와 `activePanelButtons`는 snapshot/React가 일치한다.
- 대표 제목은 `출전 동료 성장 0명 투자 가능`, `원정 파티 5/5`, `동료 관리`, `원정 기록`으로 일치한다.
- 하단 메뉴 버튼은 양쪽 모두 `성장 / 파티 / 동료 관리 / 기록`이다.
- 따라서 원정대 큰 visual diff는 텍스트/버튼 불일치가 아니라 최신 사용자 요청에 따른 전투 동료 `2+2+1`, 파티 슬롯 `3+2`, 카드 2열 그리드 배치 차이로 분류한다.
- `npm run react:build`, `npm run react:responsive-audit`, `npm run react:interactive-parity`, `npm run react:expedition-smoke`, `src/react` no-fallback 문자열 검색, `git diff --check`를 통과했다.
- `mcp__UmgMcp.project_policy_gate`: pass, 단 `scanned_files=0`이므로 no-fallback 실제 근거는 `rg` 0건을 사용한다.

2026-06-24 도감 hotspot crop 보강 기준 다음을 확인했다.

- `npm run react:hotspot-crop`: 통과, `student-도감` activePanel hotspot crop 생성
- 기존 top hotspot은 첫 직업 카드 하단 bar가 아니라 `분배 가이드` 아이콘/텍스트 영역이었다.
- React는 원본 HTML과 같은 line 기반 `ArchiveGuideIcon`을 사용하고, React 전용 SVG margin/vertical-align 보정을 제거했다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건, `student-도감` selector diff 0건
- 당시 `student-도감` visual diff: `2.126%`, activePanel diff: `0.9085%`, mean absolute diff: `0.4772`
- 당시 activePanel hotspot: `x 352 / y 608 / threshold 346px`, 첫 직업 카드 상단 `명성 88` 숫자 렌더링 잔차
- 확인 산출물:
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-snapshot.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-react.png`
  - `artifacts/react-vite-hotspot-crops/student-도감-activePanel-hotspot-0-diff.png`

2026-06-24 최신 도감/원정대 재검증 기준 다음을 확인했다.

- `npm run react:verify`: 통과
- `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건
- `npm run react:hotspot-crop`: 통과, 최신 `student-도감` activePanel hotspot crop 재생성
- `student-도감` 최신값은 visual diff `0.3207%`, threshold diff `0.1192%`, scene diff `0.6755%`, activePanel diff `0.1656%`, selector diff 0건이다.
- 도감 selector evidence는 `careerCardHeader`, `careerCardTitle`, `careerCardSubtitle`, `careerCardStatus`, `careerEmblem`, `careerWeightLabel`, `careerWeightValue`, `careerWeightTrack`, `careerWeightFill`까지 포함한다.
- 도감 `career-emblem` transform 비교는 양쪽 모두 `none`인 경우를 동등 처리하고, 원본 1px 시각 보정만 별도 허용한다.
- 최신 도감 hotspot은 activePanel 기준 `x 704 / y 32 / threshold 280px`이며, crop은 첫 직업 카드 상단 메달/상태 아이콘 영역이다. 이전 `x 352 / y 608 / threshold 346px` 값은 과거 hotspot 기록으로만 본다.
- 원정대 동료는 최신 사용자 요청 기준상 일렬 배치로 되돌리지 않는다. 전투장은 `2+2+1 / front 1`, 파티 슬롯은 `3+2`, 성장 카드 5명 기준은 `2+2+1`, 파티 후보/동료 관리는 2열 카드 그리드다.
- 파티 후보/동료 관리가 전체 10명 seed로 보일 때 `2+2+2+2+2`가 될 수 있지만, 이는 2열 그리드의 여러 행이지 일렬 배치가 아니다.
- `npm run react:build`, `npm run react:records-smoke`, `npm run react:expedition-smoke`, `npm run react:responsive-audit`, `npm run react:battle-smoke`, `npm run react:interactive-parity`, `npm run react:verify`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`를 통과했다.

2026-06-24 deep parity region evidence 기준 다음을 확인했다.

- `tools/react-vite-ui-parity-deep-smoke.mjs`는 상점/뽑기/설정/디버그 selector별 `regionVisuals`와 32px hotspot을 기록한다.
- gacha 내부 selector evidence는 `metricLabel`, `metricValue`, `cardBadge`, `cardTitle`, `cardMeta`, `confirmIcon`, `confirmText`까지 포함한다.
- 최신 `npm run react:deep-parity`: 통과, failures 0건.
- gacha normalized text는 일치하고 font/rendering 속성까지 포함한 styleDiffs는 0건이다.
- 최신 기본 리포트는 정적 animation 기준이며 gacha visual diff는 `0.4866%`, threshold diff는 `0.0594%`, mean absolute diff는 `0.0336`이다.
- live animation phase 확인은 `REACT_DEEP_PARITY_STATIC_ANIMATIONS=0 npm run react:deep-parity`로 따로 수행한다. 이전 live settle 리포트의 gacha visual diff `26.2213%`, threshold diff `2.5024%`는 UI 레이아웃 회귀가 아니라 애니메이션 phase/blur 잔차로 분류한다.
- gacha region rectMismatch는 live/static 모두 0건이므로 최신 기준에서는 레이아웃 어긋남이 아니라 animation/blur/안티앨리어싱/glyph rasterization 잔차로 분류한다.
- 설정 모달 SVG signature 보강 기준으로 원본/React 설정 행 아이콘 path가 일치해야 한다. 최신 리포트에서 settings svgDiffs는 0건이고 icon region diff는 `0%`다.
- freeze animation 모드는 등장 애니메이션 초기 프레임을 멈춰 popup 좌표가 갈라지므로 최신 기준 리포트로 쓰지 않는다. 최종 UI 형태 확인에는 기본 정적 animation 리포트를 사용한다.

2026-06-24 상점 상품 설명 줄바꿈 패리티 기준 다음을 확인했다.

- React 상점 상품 카드의 subtitle/note가 한 줄 말줄임으로 잘리던 원인은 이전 공통 규칙의 `white-space: nowrap`이 parity layer 이후에도 남아 있던 것이다.
- `.shop-product-main p`, `.shop-product-bottom small`은 원본 HTML처럼 2줄 영역에서 줄바꿈되도록 `white-space: normal`을 명시한다.
- 상품명과 보상 배지는 기존처럼 한 줄 말줄임을 유지한다.
- 최신 `npm run react:deep-parity` 기본 정적 animation 리포트에서 shop threshold diff는 `보유금 0.4956%`, `로봇 0.0965%`, `다이아 0.149%`, `광고 0.0965%`, `패키지 0.1022%`, `패스 0.0965%`다.
- 같은 리포트에서 gacha threshold diff는 `0.0594%`, styleDiffs/svgDiffs는 0건, failures는 0건이다.

2026-06-24 전투 scene selector evidence와 HP bar parity 기준 다음을 확인했다.

- `tools/react-vite-interactive-parity-audit.mjs`는 전투장 내부 selector `battleScene`, `battlePixelArena`, `battleBackgroundSheet`, `battleSpeechBubble`, `battleStudentSprite`, `battleStudentArt`, `battleLineup`, `battleEnemy`, `battleEnemyMonsterArt`, `battleEnemyHp`, `battleEnemyHpFill`, `battleProgress`, `battleProgressFill`, `battleDebugButton`, `battleAutoToggle`를 기록한다.
- 원본 HTML 모바일 HP bar 규칙과 맞춰 React `.battle-scene-hp`를 390px 이하에서 `top -16px`, `width 96px`, `height 12px`로 보정했다.
- React `CurriculumAttackVfx`는 원본처럼 `vfx.token` 텍스트를 실제 span 내용으로 렌더링한다.
- `react:interactive-parity`는 양쪽 자동 전투 interval을 같은 조건으로 멈춰, 탭 순회 중 원본만 공부량을 획득하는 비교 노이즈를 제거한다.
- 최신 `npm run react:interactive-parity`: 통과, 23개 조작 시나리오 failure 0건, 학생 전투 selector diff 0건.
- `student-시험`은 visual diff `0.3213%`, scene diff `0.6848%`, activePanel diff `0.1613%`다. 전투 scene diff는 이전 약 `5.2302%`에서 크게 감소했다.
- `00-initial`은 visual diff `0.214%`, scene diff `0.6148%`, activePanel diff `0%`다.
- `student-교육`은 text 일치, state diff 0건, visual diff `0.2874%`, scene diff `0.6763%`, activePanel diff `0.1023%`다.
- `npm run react:verify`, `npm run react:deep-parity`, `rg -n '\?\?|fallback|Fallback|unknown' src/react`, `git diff --check`, `mcp__UmgMcp.project_policy_gate`를 통과했다.

2026-06-24 full parity gate 기준 다음을 확인했다.

- `tools/react-vite-full-parity-gate.mjs`와 `npm run react:full-parity`를 추가했다.
- 최신 `npm run react:full-parity`: 통과, failures 0건.
- gate는 `snapshot:build`, `curriculum-vfx:verify`, `react:verify`, strict `react:parity-audit`, `react:interactive-parity`, `react:deep-parity`, `react:hotspot-crop`, `git diff --check`를 순서대로 실행한다.
- 최신 gate 리포트는 `artifacts/react-vite-full-parity-gate/report.json`이며 요약값은 snapshot dist `external / 864564 bytes / sha256 9ba894c7e95c49a93017f634d6cf303bc644345f9229d8ca4b4e6c38771d0ad4`, `parityViewports 2`, `interactiveScenarios 23`, `responsiveViewports 8`, `deepSurfaces shop 6 / modals 2`, `expeditionRules.checked 6`, `disallowedTokenMatches 0`이다.
- 완료 판단은 빠른 `react:verify`가 아니라 strict parity와 interactive/deep parity까지 포함하는 `react:full-parity`를 우선 기준으로 삼는다.

2026-06-24 full parity gate semantic/state 증거 기준 다음을 추가 확인했다.

- `npm run react:full-parity`: 통과, failures 0건.
- full gate는 23개 interactive 시나리오 각각의 `textEqual`, `textDiff`, `state.diffs`, `rectDiffs`, `selectorDiffs`, scenario `failures`, snapshot/React overflow를 직접 검사한다.
- full gate는 active panel 제목, 본문, 버튼 semantic signature가 snapshot/React에서 일치하는지 직접 검사한다.
- 원정대 카드 DOM/count와 카드 텍스트 블록은 최신 사용자 요청의 `3+2`, `2+2+1`, 2열 grid 배치 때문에 원본 HTML의 일렬 배치와 의도적으로 다르므로, 원본 count 직접 비교 대신 React layout signature로 관리한다.
- 원정대 전투 동료 layout signature는 `horizontalCenterSpread 97`, `bandCounts 2+2+1`, `frontBandCount 1`로 기록된다.

2026-06-24 full parity gate 완료 증거 매트릭스 기준 다음을 추가 확인했다.

- `artifacts/react-vite-full-parity-gate/report.json`은 `completionEvidence` 배열을 가진다.
- 최신 `completionEvidence`는 10개 항목 모두 `pass`다.
- 항목은 기존 HTML snapshot 최신 build, 첫 화면 strict parity, 학생 탭 조작 parity, 상점/설정/디버그 parity, 원정대 조작 parity, 원정대 규칙 상태, 원정대 비일렬 레이아웃, 8개 viewport 반응형 기준, `src/react` 금지 대체 토큰 0건, 문서 존재를 포함한다.
- 완료 판단은 `status: pass`, `failures: []`, `completionEvidence` 전 항목 `pass`를 함께 본다.

2026-06-24 원정대 규칙 smoke 기준 다음을 추가 확인했다.

- `completeExpeditionStage`는 전투력 부족 상태를 클리어로 처리하지 않는다.
- `npm run react:expedition-rules-smoke`: 통과, 6개 시나리오 failure 0건.
- 검증 시나리오는 보스 첫 클리어, 보스 보상 중복 방지, 보스 전투력 부족 회귀, 일반 Stage 전투력 부족 유지, 성장 투자, 승급 합성이다.
- `tools/react-vite-full-parity-gate.mjs`는 `artifacts/react-vite-expedition-rules-smoke/report.json`을 읽어 `expedition-rules-state` evidence로 기록한다.
- full gate의 `completionEvidence`는 `expedition-rules-state`를 포함한 10개 항목을 기준으로 본다.

2026-06-24 목표 완료 감사 매트릭스 기준 다음을 추가 확인했다.

- `tools/react-vite-goal-completion-audit.mjs`와 `npm run react:goal-audit`를 추가했다.
- 최신 `npm run react:goal-audit`: 통과, 8개 요구사항 항목 failure 0건.
- 완료 판단용 단일 명령은 `npm run react:completion-gate`이며, 이 명령은 full parity를 새로 생성한 뒤 goal audit를 실행한다.
- 감사 입력은 `artifacts/react-vite-full-parity-gate/report.json`, `artifacts/react-vite-interactive-parity/report.json`, `artifacts/react-vite-ui-parity-deep-current/text-report.json`, `artifacts/react-vite-responsive-audit/report.json`, `artifacts/react-vite-expedition-rules-smoke/report.json`이다.
- 산출물은 `artifacts/react-vite-goal-completion-audit/report.json`과 `artifacts/react-vite-goal-completion-audit/matrix.md`이다.
- 원정대 후보/관리 카드는 인원 수가 10명 이상일 수 있으므로 정확한 `2+2+1`이 아니라 2열 그리드 유지 여부로 검사한다. 성장 카드처럼 5명 기준인 화면은 `2+2+1`을 유지한다.

2026-06-24 부동산 MVP 기준 다음을 추가 확인했다.

- 상단 모드 탭은 `학생 / 원정대 / 부동산` 3개이며, `react:responsive-audit` 8개 viewport에서 overflow failure 0건이다.
- `npm run real-estate:verify`: 통과, 매물 10종, 규모 6종, 랭킹 보상 6종 검증.
- `npm run react:real-estate-smoke`: 통과, 생성 배경 렌더링, 원정대 자금 지급, 구매 1/10/최대, 임대수익 정산, 규모 명칭 변경, 랭킹 preview, 일반 주간 보상 수령, DEBUG 중복 방지를 확인.
- 일반 주간 보상은 `minimumWeeklyAssetGainForClaim` 이상의 주간 증가량이 있을 때 수령 가능하며, 일반/DEBUG 버튼은 같은 `claimedWeeklyRewardWeek` 중복 방지 키를 공유한다.
- `npm run react:verify`: 통과, 부동산 검증과 smoke가 포함된다.
- `npm run visual:verify`, `npm run mobile:smoke`, `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`, `git diff --check`, `mcp__UmgMcp.project_policy_gate` strict를 통과했다.

2026-06-25 부동산 지역별 정식 리소스 기준 다음을 추가 확인했다.

- `data/real_estate_district_assets.json`을 추가해 10개 지역별 상세 배경, 건물 theme, 10개 detail pad, 향후 주민 경로, 말풍선 톤을 관리한다.
- 상세 배경은 `visual-real-estate-district-*.png` 10장으로 분리되며, smoke는 작은 원룸/상가/아파트 단지/오피스 빌딩/복합 개발지의 src와 theme가 데이터와 일치하는지 확인한다.
- `npm run real-estate:verify`: 통과, 상세 리소스 10종과 배경 파일 존재를 검증한다.
- `npm run react:build`: 통과, 지역별 배경 10장이 React 번들에 포함된다.
- `npm run react:real-estate-smoke`: 통과, 지역별 상세 배경, 건물 theme/variant, 구매 후 건물 렌더링을 확인한다.
- `npm run react:real-estate-visual-audit`: 통과, 10개 지역 풀성장 상세 화면을 전수 캡처하고 `backgroundAsset` src, 건물 10개, theme/variant, overflow 0을 확인한다.
- `npm run react:verify`, `npm run verify:mobile`, `rg -n '\?\?|fallback|Fallback|unknown' src/react -S`, `git diff --check`, `mcp__UmgMcp.project_policy_gate` strict를 통과했다.
- 전수 캡처 리포트는 `artifacts/real-estate-resource-quality-audit/report.json`, `report.html`, `contact-sheet.png`에 남긴다.

## 다음 차수

1. 부동산 주민/말풍선 시스템은 `futureResidentPaths`를 기반으로, 보유 건물 수와 렌더링 cap을 분리해 성능을 유지하면서 구현한다.
2. 학생 도감은 남은 숫자/폰트 렌더링 잔차가 실제 수정 대상인지 별도 비교한다.
3. 원정대 탭은 semantic/layout signature를 계속 보강해, 의도된 3+2/2+2+1 및 2열 카드 배치 외의 차이만 다음 수정 대상으로 남긴다.
4. live 애니메이션 상태와 다른 저장 상태의 parity 감사 범위를 넓힌다.
5. 상점 결제/광고/패키지 실연동, 확률표, 약관 화면을 정리한다.
6. Android AAB 릴리스 설정을 추가한다.

## 주의사항

- `dist/`와 `dist-react/`를 섞지 않는다.
- React 앱이 기존 검증을 모두 대체하기 전에는 Capacitor `webDir`을 바꾸지 않는다.
- 데이터 누락이나 자산 누락은 임시 fallback으로 숨기지 말고 smoke 실패로 드러낸다.
