# 공격 VFX 다양화 계획

## 목표

현재 학생탭 Battle Road 공격 연출이 단일 근접 slash, 공통 먼지, 공통 피격 spark 중심으로 반복되는 문제를 개선한다. 학생의 학년/교과 과정에 맞는 글자, 단어, 숫자, 식이 공격 VFX로 날아가도록 만들어 Student만의 학습 전투 정체성을 강화한다. 모바일 APK 성능과 기존 자산/검증 파이프라인은 유지한다.

## 현재 분석

- 저장소에는 이미 `data/battle_road_config.json`, `tools/apply-battle-road-patch.mjs`, `tools/build-visual-assets.mjs`, `tools/visual-asset-smoke.mjs` 중심의 Battle Road 전투 연출 파이프라인이 있다.
- 현재 공격 VFX는 대부분 생성 CSS 기반이다.
  - 학생: `studentCombatLoop`, `studentDashDust`, `studentMeleeSlash`
  - 적: `enemyEngagedStep`, `enemyHurtLoop`, `enemyShockRing`, `enemyHitSpark`
  - 전투장: `battleDustBurst`, `battleImpactFlash`
  - 도우미: `helperAllyLoop`, `helperAssistSpark`
- 현재 VFX는 실제 공격 이벤트마다 새 인스턴스를 생성하는 방식이 아니라, 전투/피격 상태에서 CSS loop가 반복되는 방식이다. 그래서 다양화를 하려면 먼저 렌더링에 `attackVfx`/`impactVfx` 선택 훅을 만들어야 한다.
- `data/battle_road_config.json`의 `presentation` 섹션은 이미 도움말이 있는 파라미터 구조를 따른다. 새 VFX 값도 이 구조 안에 한글 `help`를 포함해야 한다.
- `tools/apply-battle-road-patch.mjs`는 minified snapshot bundle을 문자열 치환한다. 런타임 렌더러를 바꾸면 이 패치 스크립트와 `src/snapshot/app.bundle.js`, 최종 HTML 산출물을 함께 갱신해야 한다.
- `visual:build`가 `tools/build-visual-assets.mjs`로 CSS와 자산 매니페스트를 재생성한다. 따라서 VFX CSS는 직접 산출물만 고치지 말고 생성기에서 만들어야 한다.
- dirty worktree에 Battle Road phase 전환 관련 변경이 이미 있다. 이 변경은 사용자/이전 작업 변경으로 보고 보존한다.

## MCP/도구 자산

- 현재 검색 가능한 MCP 표면에는 Unreal/Niagara 계열 VFX 도구가 있으나, Student는 웹 기반 APK 프로젝트이므로 이번 작업에는 직접 사용하지 않는다.
- 이번 작업에 실제로 활용할 로컬 검증 자산은 다음이다.
  - `npm run battle-road:verify`
  - `npm run visual:verify`
  - `npm run visual:smoke`
  - `npm run live:polish`
  - `npm run verify:mobile`
- 새 bitmap VFX atlas를 만들 경우에만 `docs/asset_sprite_factory.md`와 `tools/asset-factory/` 흐름을 검토한다. 1차 추천안은 CSS/SVG/gradient 계열 절차형 VFX라 별도 스프라이트 양산은 필요하지 않다.

## 추천 방향

기존 구현을 확장하는 방식을 권장한다. 신규 전투 VFX 시스템을 별도로 만들면 Battle Road phase, reduced-effects, visual build, smoke test를 다시 연결해야 해서 중복과 회귀 위험이 커진다.

CSS만으로 모든 품질을 보장하는 방식은 권장하지 않는다. 글자/단어 VFX는 브라우저 텍스트 렌더링을 쓰면 선명도는 좋지만, 어떤 글자와 단어를 어떤 학년에서 쓸지, 몇 개까지 보여줄지, 긴 단어가 겹치지 않을지는 데이터와 렌더링 구조가 함께 보장해야 한다.

추천 방식은 `데이터 기반 교과 VFX + 고정 DOM 레이어 + CSS 애니메이션`이다. 런타임에서 임의 노드를 계속 생성하지 않고, 전투장에 `curriculum-attack-vfx-layer` 1개를 렌더링한 뒤 현재 공격 루프의 토큰 1개만 넣어 움직인다.

권장 구조:

1. `data/battle_road_config.json`에 `presentation.curriculumAttackVfx`를 추가한다.
2. 런타임 `battleSceneLineup()` 또는 학생 전투 렌더러가 현재 학년/조우/과목에서 VFX 토큰 묶음을 결정한다.
3. 전투장에 고정된 텍스트 VFX 레이어 1개를 렌더링하고, 현재 공격 루프의 토큰과 스타일 class를 부여한다.
4. `tools/build-visual-assets.mjs`가 학년군별 CSS 애니메이션, 색상, 경로, reduced-effects 규칙을 생성한다.
5. `tools/validate-battle-road-config.mjs`, `tools/verify-visual-assets.mjs`, `tools/visual-asset-smoke.mjs`가 토큰 누락, 긴 텍스트, 겹침, 화면 적용을 검증한다.
6. 기존 구현 문서와 `docs/visual_asset_production.md`에 새 VFX 기준을 반영한다.

## VFX 표현 설계

### 1차 표현

- `glyph`: 짧은 글자/기호 1~2개가 튀어나가는 기본 VFX.
- `word`: 단어 하나가 획처럼 날아가는 VFX.
- `formula`: 짧은 숫자/수식이 타격 지점으로 들어가는 VFX.
- `card`: 작은 종이 조각 안에 글자나 단어가 들어간 VFX. 보스/시험지형 몬스터에 사용한다.
- `burst`: 처치 또는 보스 타격 시 여러 토큰이 짧게 퍼지는 VFX.

### 매핑 기준

- 학년군과 학년 order를 기준으로 토큰 풀을 나눈다.
- 초1은 `ㄱ`, `ㄴ`, `ㄷ`, `ㄹ`, `A`, `B`, `C`, `1`, `2`, `3`처럼 가장 짧은 문자 중심으로 둔다.
- 초2는 `안녕`, `고마워`, `사랑해`, `apple`, `baby`, `1+1`, `2+2`처럼 쉬운 단어와 기초 식을 사용한다.
- 초3~초6은 받침/영단어/분수/도형/단위 같은 토큰을 조금씩 확장한다.
- 중등은 방정식, 영단어, 과학/사회 핵심어처럼 과목성이 보이는 단어를 쓴다.
- 고등/N수는 OMR, 함수, 미분, 독해, 개념, 기출처럼 시험 압박이 느껴지는 토큰을 쓴다.
- 너무 복잡한 긴 문장은 쓰지 않는다. 1차는 단어 하나 또는 짧은 식 하나를 기본으로 한다.
- 원정대는 이번 범위에서 제외한다.

## 데이터 구조 초안

1차 테이블은 `presentation.curriculumAttackVfx`가 아니라 독립 데이터 파일 `data/curriculum_attack_vfx.json`으로 분리한다. 런타임에 연결할 때 Battle Road config에서 직접 관리할지, 별도 테이블을 앱 데이터로 주입할지 다시 결정한다.

초안 구조:

```json
{
  "enabled": true,
  "renderer": "dom_text_layer",
  "tokenKeyStrategy": "grade_pool_token",
  "defaultStyle": "glyph",
  "grades": {
    "1": {
      "styles": ["glyph"],
      "tokens": ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "A", "B", "C", "1", "2", "3"]
    },
    "2": {
      "styles": ["word", "formula"],
      "tokens": ["안녕", "고마워", "사랑해", "apple", "baby", "1+1", "2+2"]
    }
  },
  "bossStyleByVisualKey": {
    "march_eval": "card",
    "midterm": "burst",
    "final": "card",
    "year_boss": "burst"
  },
  "help": {
    "enabled": "교과과정 기반 공격 VFX를 사용할지 정합니다.",
    "renderer": "공격 VFX 렌더링 방식을 정합니다.",
    "tokenKeyStrategy": "로컬라이제이션과 스킨 확장에 사용할 토큰 키 생성 전략입니다.",
    "defaultStyle": "학년별 스타일을 찾지 못했을 때 검증 실패 전에 비교할 기본 스타일 이름입니다.",
    "grades": "학년 order별 공격 VFX 토큰과 스타일 목록입니다.",
    "bossStyleByVisualKey": "보스 visualKey별 강조 VFX 스타일입니다."
  }
}
```

fallback 정책상 알 수 없는 학년, 빈 토큰 목록, 너무 긴 토큰은 조용히 기본값으로 대체하지 않는다. 검증 단계에서 실패시키고 config를 고친다.

## 1차 테이블 작성 결과

- `data/curriculum_attack_vfx.json`
  - 공격 1회당 토큰 1개를 선택하는 `random_one_per_attack` 정책을 기록했다.
  - 16개 단계, 62개 토큰 풀, 368개 토큰, 5개 스타일을 정리했다.
  - 초1~N수까지 `gradeOrder` 기준으로 매핑한다.
  - 수학과 탐구 계열은 한글 개념명보다 공식, 기호, 약어를 우선 사용하도록 조정했다.
- `docs/curriculum_attack_vfx_mapping.md`
  - 사람이 읽기 쉬운 학년별 토큰 방향 테이블을 추가했다.
- `tools/validate-curriculum-attack-vfx.mjs`
  - 학년 누락, 스타일 누락, 긴 토큰, 중복 토큰, 잘못된 과목 id를 검증한다.
- `package.json`
  - `npm run curriculum-vfx:verify`를 추가했다.
  - 전체 `verify` 흐름에 교과 VFX 테이블 검증을 포함했다.

## 구현 계획

1. 계획 확정
   - 기존 구현 확장 방식으로 진행할지 사용자 확인을 받는다. 완료
   - CSS 절차형 VFX만으로 1차 진행할지, bitmap VFX atlas까지 포함할지 결정한다. 1차 테이블은 렌더링 방식과 분리 완료
   - 이번 런타임 연결은 `data/curriculum_attack_vfx.json`을 독립 테이블로 유지하고, `data/battle_road_config.json`에는 표시 크기/속도 같은 조정 파라미터만 둔다. 완료

2. 데이터/검증
   - `data/curriculum_attack_vfx.json`에 학년별 토큰 테이블을 추가하고 모든 주요 파라미터에 한글 help를 둔다. 완료
   - `tools/validate-curriculum-attack-vfx.mjs`가 학년 order, 토큰 수, 토큰 길이, style enum, 보스 visualKey 매핑을 검증한다. 완료
   - 알 수 없는 style, 비어 있는 tokens, 너무 긴 tokens는 실패시킨다. 완료
   - 런타임 렌더링 방식, 스킨 키, 로컬라이제이션 키 prefix, 탐구 과목 alias도 테이블에서 관리한다.

3. 런타임 렌더링 훅
   - `tools/apply-battle-road-patch.mjs`의 Battle Road 런타임 문자열에 `battleCurriculumVfxForGrade()` 같은 헬퍼를 추가한다.
   - 학생 전투 화면에 고정 `.curriculum-attack-vfx-layer`와 공격 1회당 1개 `.curriculum-attack-vfx-token`을 렌더링한다.
   - 각 span에는 `style`, `slot`, `token`을 반영한다.
   - 현재 active enemy의 과목, 보스 `visualKey`, 학년 order를 기준으로 토큰과 스타일을 결정한다.
   - 현재 전투 로직에는 별도 `attackSerial`이 없으므로 1차는 `battle.elapsedMs / combatLoopMs` 기반 결정적 tick을 사용해 공격 루프마다 토큰이 바뀌게 한다.
   - 구현 완료. 실제 helper 이름은 `curriculumAttackVfxForBattle()`와 `curriculumAttackVfxLayer()`다.

4. 생성 CSS
   - `tools/build-visual-assets.mjs`의 `battleRoadPresentation()`에서 curriculumAttackVfx 설정을 읽는다.
   - `glyph`, `word`, `formula`, `card`, `burst` 스타일별 CSS를 생성한다.
   - 텍스트는 `font-weight`, `text-shadow`, 얇은 outline, 작은 종이 배경 정도로 읽기 좋게 만들고, 화면을 덮는 큰 문장은 금지한다.
   - `transform`, `opacity` 중심 애니메이션으로 유지한다.
   - `reduced-effects` 규칙에 새 VFX 레이어를 포함한다.
   - 구현 완료. `visual:smoke`에서 실제 token count와 animation name을 확인한다.

5. 문서 최신화
   - `docs/visual_asset_production.md`에 공격 VFX variant 기준, 매핑 기준, 성능 원칙을 추가한다.
   - `implementations/battle-road-encounter-flow/implementation.md` 또는 새 구현서에 Battle Road VFX 확장 기준을 연결한다.
   - 구현 완료. 새 구현서는 `implementations/attack-vfx-diversification/implementation.md`다.

6. 검증
   - `npm run battle-road:verify`
   - `npm run visual:verify`
   - `npm run build:web`
   - `npm run visual:smoke`
   - `npm run live:polish`
   - `npm run verify:mobile`
   - 현재 완료: `curriculum-vfx:verify`, `battle-road:verify`, `visual:verify`, `build:web`, `visual:smoke`, `verify:mobile`

## 완료 기준

- 학생 학년 order에 맞는 교과 토큰이 공격 VFX로 표시된다.
- 초1/초2 테스트 상태에서 서로 다른 토큰 풀이 실제 화면에서 확인된다.
- 같은 전투 안에서도 glyph, word, formula, card/burst 중 최소 3종 이상의 스타일이 확인된다.
- `reduced-effects`에서 새 VFX가 과도하게 반복되지 않는다.
- `battle-road:verify`, `visual:verify`, `visual:smoke`, `verify:mobile`이 통과한다.
- 새 파라미터는 모두 한글 도움말을 갖는다.
- 런타임에 누락된 VFX 데이터가 조용히 기본값으로 숨지 않고 검증 실패로 드러난다.

## 리스크와 대응

- minified bundle 문자열 패치가 길어질 수 있다.
  - 대응: variant 결정 로직을 짧고 순수한 함수로 유지하고, smoke test로 패치 결과를 확인한다.
- pseudo-element 수가 부족할 수 있다.
  - 대응: 1차는 student slash, active enemy impact, lineup flash/dust 4면만 사용한다. 필요 시에만 DOM layer를 추가한다.
- VFX가 너무 화려하면 모바일에서 몬스터와 HP바를 가릴 수 있다.
  - 대응: opacity, transform 중심으로 만들고, smoke에서 클리핑/overflow/HP바 크기와 함께 검사한다.
- 글자가 너무 많으면 학습 UI가 아니라 광고 배너처럼 보일 수 있다.
  - 대응: 동시 표시 수를 3~4개로 제한하고, 단어 하나 또는 짧은 식 하나만 기본으로 둔다.
- 전투 로직이 실제 hit timing을 제공하지 않으면 토큰이 반복 loop처럼 보일 수 있다.
  - 대응: 1차는 학년별 loop 다양화, 2차는 실제 피해 변화 시점에 짧은 hit pulse class를 갱신하는 이벤트형 연출로 확장한다.

## 2차 고도화 후보

- 실제 `remainingHp` 변화나 처치 시점에 `hitSerial`을 증가시켜 CSS animation을 재시작하는 이벤트형 VFX.
- 치명타/처치/보스 브레이크 전용 `finishBurst`.
- 직업동료 `battleProp` 기반 지원 VFX.
- subject별 컬러 팔레트와 학년별 교과 토큰 확장.
- CSS 절차형으로 한계가 생기면 작은 PNG VFX atlas를 `visual-assets` 파이프라인에 연결.
