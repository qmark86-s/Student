# 학년군 적합 학습 자산 구현 기록

## 변경 요약

- `imagegen` built-in 도구로 학년군별 픽셀 아트 참조 보드를 생성하고 `assets/reference/age-grade-pixel-styleboard.png`에 보관했다.
- `tools/build-visual-assets.mjs`에 `studentAgeProfile` 기반의 학년군별 학생 생성 규칙을 적용했다.
- 초등 저학년은 안전모와 밝은 책가방, 초등 고학년은 교과서/노트, 중등은 교복 리본, 고등은 OMR/학교 배지, N수는 후드/헤어밴드/커피로 구분한다.
- 초등 학생은 긴 바지/재킷형 실루엣을 줄이고 짧은 다리, 반바지, 운동화, 큰 머리 비율로 재조정했다.
- 중등 학생은 회사원 재킷처럼 보이지 않게 라펠/긴 넥타이를 제거하고, 교복 리본과 학생복 조끼 중심으로 수정했다.
- 고등 학생은 정장형 라펠을 제거하고 cardigan/조끼, 학교 배지, OMR 종이 중심으로 수정했다.
- N수 학생은 후드와 헤어밴드, 커피 소품을 유지해 직장인이 아니라 독서실 수험생처럼 읽히게 했다.
- `drawAcademicMonster`를 초등/중등/고등/N수 전용 몬스터 생성기로 분기했다.
- 초등 몬스터는 받아쓰기장, 색종이, 크레파스, 스티커 계열로 밝게 구성했다.
- 중등 몬스터는 시간표, 수행평가 파일, 교복형 워크북으로 구성했다.
- 고등 몬스터는 OMR, 모의고사 봉투, 타이머, 기출 문제집 중심으로 구성했다.
- N수 몬스터는 독서실, 커피, 루틴표, 파이널 봉투, 스탠드 조명 중심으로 구성했다.
- 모든 메인 몬스터에 공통 손/발/학습 스티커 디테일을 추가해 단순 아이콘이 아니라 전투 캐릭터처럼 보이게 했다.
- `tools/visual-asset-contact-sheet.mjs`가 학생 타이틀, 몬스터명, 나이, 학년군을 표시하도록 보강했다.
- `docs/visual_asset_production.md`에 학년군 자산 기준을 추가했다.

## 검수 포인트

- 참조 자산: `assets/reference/age-grade-pixel-styleboard.png`
- `artifacts/visual-asset-contact-sheet/index.html`에서 초1~N수 순서로 학생 스프라이트와 몬스터명을 확인한다.
- 초등 구간은 성인 재킷/넥타이처럼 보이는 요소가 없어야 한다.
- 중고등 구간은 정장보다 학교 교복, 책가방, 시험지 신호가 먼저 보여야 한다.
- N수 구간은 고등학생과 다르게 독서실/루틴/커피 분위기가 보여야 한다.

## Imagegen Prompt

```text
Use case: stylized-concept
Asset type: pixel art game asset reference board for a mobile idle RPG
Primary request: Create a clean pixel-art reference sheet showing age-appropriate Korean school RPG characters and study-themed monsters, designed as guidance for 64x96 game sprites.
Subject: Four rows: lower elementary student age 8-9, upper elementary student age 10-13, middle school student age 14-16, high school/repeater student age 17-23. Next to each row, show 3 matching study monsters.
Style/medium: high-quality 2D pixel art / voxel-influenced, cute chibi proportions, readable at small size, crisp square pixels, game sprite sheet style.
Constraints: avoid adult office clothing, avoid business suits, avoid ties that look corporate, avoid briefcases, avoid realistic adults, avoid text labels, avoid UI, no watermark.
```

## 관련 명령

```powershell
npm run visual:build
npm run visual:qa
npm run verify:mobile
```
