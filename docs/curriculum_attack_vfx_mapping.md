# 교과 공격 VFX 매핑

## 개요

학생탭 공격 VFX는 `data/curriculum_attack_vfx.json`에서 관리한다. 현재 범위는 학생 Battle Road 전투이며, 원정대는 제외한다.

핵심 정책:

- 공격 1회에는 교과 토큰 1개만 표시한다.
- 토큰은 현재 학년의 가중치 토큰 풀에서 랜덤 선택한다.
- 런타임 렌더링 방식은 `runtime.renderer`로 관리하며, 현재 값은 `dom_text_layer`다.
- 성장/스킨/로컬라이제이션 확장을 위해 `skinKey`, `localizationKeyPrefix`, `tokenKeyStrategy`를 테이블에 둔다.
- 런타임 누락을 숨기지 않기 위해 테이블은 `npm run curriculum-vfx:verify`로 검증한다.
- 모바일 전투장에서 겹치지 않도록 토큰은 8글자 이하로 제한한다.
- 수학과 탐구 계열은 가능한 한 한글 개념명보다 식, 기호, 약어를 우선 사용한다.
- 영어는 2022 영어과 교육과정의 초등 3~4학년군/5~6학년군 300단어 이내, 중학교 1~3학년군 1,500단어 이내 같은 어휘량 기준과 쉬운 일상 표현 중심 구조를 참고해 짧은 단어로 잡는다.

## 런타임 관리

| 필드 | 의미 |
| --- | --- |
| `runtime.renderer` | 현재 VFX 렌더러. 1차는 고정 DOM 텍스트 레이어인 `dom_text_layer`를 사용한다. |
| `runtime.skinKey` | 향후 스킨별 팔레트/모양 분기를 위한 기본 키다. |
| `runtime.localizationKeyPrefix` | 토큰 literal을 로컬라이제이션 키 방식으로 전환할 때 사용할 prefix다. |
| `runtime.tokenKeyStrategy` | 토큰 키 생성 전략. 현재는 `grade_pool_token`을 기준으로 한다. |
| `rules.inquirySubjectAliases` | 사회/과학 탐구 타깃이 서로의 탐구 토큰 풀도 사용할 수 있게 하는 alias다. |

Battle Road 표시 속도, 크기, 위치는 `data/battle_road_config.json`의 `presentation.curriculumAttackVfx`에서 조정한다. `sourceOffsetYPx`는 학생 상체/손에서 토큰이 출발하도록 0 이하로 유지한다. 기능을 잠시 걷어낼 때는 이 섹션의 `enabled`를 `false`로 둔다.

## 스타일

| id | 이름 | 용도 |
| --- | --- | --- |
| `glyph` | 낱글자 | 한글 자모, 알파벳, 숫자 같은 짧은 토큰 |
| `word` | 단어 | 쉬운 단어, 교과 키워드 |
| `formula` | 식 | 숫자식, 짧은 수학 기호 |
| `card` | 카드 | 작은 종이 카드형 강조 토큰 |
| `burst` | 버스트 | 보스/시험 타격 강조 토큰 |

## 학년별 매핑 초안

| 단계 | 기본 스타일 | 토큰 풀 방향 | 예시 토큰 |
| --- | --- | --- | --- |
| 초1 | `glyph` | 자모, 파닉스, 기초 수식 | `ㄱ`, `ㄴ`, `A-a`, `cat`, `1+1`, `1<2` |
| 초2 | `word` | 쉬운 한국어/영어 단어, 등식형 기초 연산 | `안녕`, `친구`, `hello`, `family`, `1+1=2` |
| 초3 | `word` | 문장/문단, 듣기·말하기 동사, 곱셈·나눗셈, 관찰 기호 | `문장`, `문단`, `listen`, `3x4`, `H2O` |
| 초4 | `word` | 설명문/비유, 의문사, 각도·소수, 전기/물질 기호 | `설명문`, `where`, `90°`, `A=bh`, `V=IR` |
| 초5 | `word` | 주장/근거, 접속어, 비율/넓이/부피, 기초 과학식 | `근거`, `because`, `2:3`, `V=lwh`, `NaCl` |
| 초6 | `word` | 논설/비문학, 예비중 단어, 속력/부피, 환경 기호 | `논설`, `future`, `v=d/t`, `V=Bh`, `kWh` |
| 중1 | `formula` | 시/소설, 기본 동사, 일차식/좌표, 힘·속력 | `화자`, `past`, `2x=6`, `(x,y)`, `F=ma` |
| 중2 | `formula` | 문법/매체, 문장 구조, 연립/확률, 전류·화학식 | `문법`, `voice`, `x+y=5`, `P(A)`, `I=V/R` |
| 중3 | `formula` | 독해/논술, 추론 영어, 이차식/피타고라스, 과학식 | `요지`, `infer`, `x^2`, `a^2+b^2`, `E=mc^2` |
| 고1 | `formula` | 공통국어, 독해 유형, 집합/명제/로그, 통합 기호 | `독서`, `blank`, `A∩B`, `p→q`, `GDP` |
| 고2 | `formula` | 선택 국어, 수능형 영어, 미적분/확률, 탐구 공식 | `담화`, `summary`, `dy/dx`, `nCr`, `PV=nRT` |
| 고3 | `burst` | 수능 국영수, OMR/등급컷 압박 | `수특`, `blank`, `f'(x)`, `OMR`, `1등급` |
| 1수 | `card` | 개념 재정리, 복습 영어, 수학 기호, 6/9평 | `1회독`, `review`, `P(A)`, `dy/dx`, `6평` |
| 2수 | `card` | 압축 루틴, 속도 영어, 실모 수학, 등급컷 | `2회독`, `speed`, `∫f(x)`, `nCr`, `1컷` |
| 장수 | `burst` | 멘탈 안정, 집중 영어, 핵심 수식, 파이널 | `불안컷`, `focus`, `dy/dx`, `P(A)`, `N제` |
| N수 | `burst` | 최종 마무리, 실전감, 핵심 수식, 시험장 압박 | `실전감`, `final`, `f'(x)`, `log`, `OMR` |

## 보스 스타일

| visualKey | 스타일 | 의도 |
| --- | --- | --- |
| `march_eval` | `card` | 첫 평가 느낌의 카드형 토큰 |
| `midterm` | `burst` | 중간고사 충돌감 강조 |
| `final` | `card` | 기말 시험지 느낌 |
| `year_boss` | `burst` | 학년 보스 타격감 |
| `march_mock` | `card` | 모의고사 카드형 압박 |
| `june_mock` | `burst` | 6월 평가원 강조 |
| `september_mock` | `burst` | 9월 평가원 강조 |
| `suneung` | `burst` | 수능 최종 타격감 |

## 검증

```powershell
npm run curriculum-vfx:verify
```

현재 기준:

- 16개 단계 매핑
- 62개 토큰 풀
- 368개 토큰
- 5개 스타일
- `runtime`, `rules.inquirySubjectAliases`, 모든 주요 help 필드 검증

실제 전투 화면 적용은 `npm run visual:smoke`에서 확인한다. 피해 발생 이후 `.curriculum-attack-vfx-layer` 1개와 `.curriculum-attack-vfx-token` 1개만 존재해야 한다.
