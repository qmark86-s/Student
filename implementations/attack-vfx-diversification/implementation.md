# 공격 VFX 다양화 구현서

## 개요

학생탭 Battle Road 공격에 학년별 교과 토큰 VFX를 연결했다. 공격 루프 1회에는 `data/curriculum_attack_vfx.json`에서 현재 학년과 타깃 과목에 맞는 토큰 1개만 선택해 `.curriculum-attack-vfx-token`으로 표시한다. 원정대는 이번 범위에서 제외했다.

구현은 걷어내기 쉽게 분리했다. 교과 토큰과 런타임 메타는 독립 테이블, 표시 속도와 위치는 Battle Road config, 실제 렌더링은 Battle Road 패치와 생성 CSS가 담당한다.

## 주요 변경

- `data/curriculum_attack_vfx.json`
  - `runtime.renderer="dom_text_layer"`로 현재 렌더링 방식을 명시했다.
  - `skinKey`, `localizationKeyPrefix`, `tokenKeyStrategy`를 추가해 향후 스킨/성장/로컬라이제이션 분기를 받을 수 있게 했다.
  - `rules.inquirySubjectAliases`로 사회/과학 탐구 계열을 같은 탐구 풀처럼 선택할 수 있게 했다.
  - 고3 수능 탐구 전투용 `suneung_social`, `suneung_science` 풀을 포함한다.
  - 초1~N수까지 16개 단계, 68개 토큰 풀, 404개 토큰, 5개 스타일을 유지한다.

- `data/battle_road_config.json`
  - `presentation.curriculumAttackVfx`를 추가했다.
  - `enabled`, `cycleMs`, `durationMs`, `baseFontPx`, `minWidthPx`, `maxWidthPx`, source/impact/target offset을 한글 help와 함께 관리한다.
  - 현재 `sourceOffsetYPx`는 `-14`로 두어 토큰이 바닥이 아니라 학생 상체/손 쪽에서 날아오는 것처럼 보이게 한다.

- `tools/apply-battle-road-patch.mjs`
  - 스냅샷 번들에 `curriculumAttackVfxTable`을 주입한다.
  - `curriculumAttackVfxForBattle()`가 현재 phase, 학년, active target, 과목 alias, 보스 스타일을 기준으로 토큰 하나를 결정한다.
  - `curriculumAttackVfxLayer()`가 전투장에 레이어 1개와 토큰 1개를 렌더링한다.
  - 중복 주입을 막기 위해 기존 `curriculumAttackVfxLayer` 호출 조각을 제거한 뒤 의도한 아레나 위치에 1개만 다시 넣는다.

- `tools/build-visual-assets.mjs`
  - `presentation.curriculumAttackVfx` 값을 CSS custom property로 생성한다.
  - `glyph`, `word`, `formula`, `card`, `burst` 스타일별 텍스트 VFX와 keyframes를 생성한다.
  - `reduced-effects` 상태에서 새 토큰 애니메이션도 축소된다.
  - 학생 공격선과 전투 dust에서 빨강/노랑 불꽃 계열을 제거하고 흰색/청록/하늘색 계열로 통일했다.
  - 원정대 arena dust도 같은 차가운 계열로 맞춰 바닥에서 불꽃이 솟는 인상을 줄였다.

- `tools/validate-curriculum-attack-vfx.mjs`
  - `runtime`과 `rules.inquirySubjectAliases`를 검증한다.

- `tools/validate-battle-road-config.mjs`
  - `presentation.curriculumAttackVfx`의 모든 수치, boolean, 한글 help를 검증한다.
  - `sourceOffsetYPx`가 양수이면 토큰이 바닥에서 솟는 것처럼 보일 수 있으므로 실패시킨다.

- `tools/verify-visual-assets.mjs`
  - 생성 CSS에 curriculum VFX layer/token/keyframes/config-driven 값/reduced-effects 규칙이 있는지 확인한다.
  - 학생 공격선과 원정대 dust에 불꽃처럼 보이는 따뜻한 VFX 색이 되살아나지 않는지 확인한다.

- `tools/visual-asset-smoke.mjs`
  - 피해 발생 이후 실제 브라우저 DOM에서 교과 VFX layer 1개, token 1개, 텍스트, 스타일 class, animation name, 토큰 박스 크기를 검사한다.
  - 실제 computed style 기준으로 학생 공격선 색과 토큰 시작 Y offset, 원정대 dust 색을 검사한다.

## 런타임 기준

- 표시 범위는 학생탭 Battle Road 전투다.
- `battleRoadVisualPhase(battle)`가 `combat`일 때만 표시한다.
- 현재 전투 로직에 별도 `attackSerial`이 없으므로 1차는 `battle.elapsedMs / cycleMs` 기반 tick으로 공격 루프를 결정한다.
- 토큰 선택 seed는 `gradeOrder`, `gradeId`, `encounterId`, `target.id`, tick을 조합한다.
- 타깃 과목과 일치하는 토큰 풀을 우선 사용하고, 탐구 alias는 테이블에서 확장한다.
- 보스/시험 몬스터는 `bossStyleByVisualKey`가 있으면 그 스타일을 우선한다.
- 토큰 시작점은 `presentation.curriculumAttackVfx.sourceOffsetYPx <= 0`으로 유지해 학생 상체/손에서 출발하는 인상을 준다.
- 학생/원정대의 움직이는 공격 VFX는 불꽃색보다 흰색/청록/하늘색 계열을 우선한다.
- 알 수 없는 학년, 빈 토큰 풀, 긴 토큰, 알 수 없는 style은 런타임 fallback으로 숨기지 않고 검증 실패로 드러낸다.

## 검증 결과

```powershell
npm run curriculum-vfx:verify
npm run battle-road:verify
npm run build:web
npm run visual:smoke
npm run verify:mobile
```

확인된 주요 결과:

- `CURRICULUM_ATTACK_VFX_OK grades=16 pools=68 tokens=404 styles=5 mode=random_one_per_attack`
- `BATTLE_ROAD_CONFIG_OK schoolEncounters=4 suneungEncounters=4`
- `BUILD_WEB_OK`
- `VISUAL_ASSET_SMOKE_OK`
- `verify:mobile` 전체 통과
- 스모크 기준 피해 이후 `curriculumVfxLayerCount=1`, `curriculumVfxTokenCount=1`, `curriculumVfxSourceY=-14`, 예시 토큰 `cat`, animation `curriculumVfxCard`
- 학생 공격선 computed color는 흰색/청록/하늘색 계열로 확인

## 확장 기준

- 성장별 토큰 변화는 `gradeMappings` 또는 별도 skin/runtime key로 확장한다.
- 스킨별 색/모양은 `skinKey`와 `palettes`를 늘리고 CSS 생성기에서 style variant를 분기한다.
- 로컬라이제이션은 현재 토큰 literal을 유지하되, `localizationKeyPrefix + tokenKeyStrategy`로 키 기반 전환이 가능하게 한다.
- 실제 공격 이벤트가 생기면 `elapsedMs` tick 대신 `attackSerial`/`hitSerial`을 저장해 애니메이션 재시작 타이밍을 더 정확히 맞춘다.
- 기능을 걷어낼 때는 `presentation.curriculumAttackVfx.enabled=false`로 우선 비활성화하고, 완전 제거가 필요하면 `curriculumAttackVfxLayer` 주입, curriculum CSS block, 데이터 검증 script 연결을 순서대로 제거한다.
