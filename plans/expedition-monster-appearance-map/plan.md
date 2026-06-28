# 원정대 몬스터 출현 위치 확인표 계획

## 목표

원정대 몬스터 80종이 어디에서 나오는지 사람이 바로 확인할 수 있는 정적 HTML 리포트를 제공한다.

## 기준

- 원정대 몬스터 manifest: `data/professional_sprite_manifest.json`의 `expeditionEnemies`
- 일반 스테이지 매핑: `data/expedition_stages.json`의 `enemyAssets`
- 보스 매핑: `data/expedition_bosses.json`의 `bossAsset`
- 프레임 이미지: `src/snapshot/assets/individual/expedition-enemies/<id>/move_0.png`
- 챕터/스테이지 범위: `data/expedition_balance.json`의 `chapterSize`, `segmentSize`

## 산출물

- 생성 스크립트: `tools/generate-expedition-monster-appearance-map.mjs`
- HTML 리포트: `artifacts/expedition-monster-appearance-map/index.html`
- JSON 요약: `artifacts/expedition-monster-appearance-map/appearance-map.json`

## 표시 항목

- 요약 카드: 전체 80종, 일반 60종, 보스 20종, 일반 stage 100개, boss stage 100개
- 스테이지별 출현표: 챕터, stage 범위, 구간명, 적 이름, 슬롯별 몬스터 이미지/id/name
- 보스 출현표: 챕터, boss stage, boss type, boss asset 이미지/id/name
- 몬스터별 역색인: 각 몬스터가 어느 챕터/segment/boss에서 쓰이는지
- 필터: 검색어, tone, 일반/보스, 신규 여부

## 검증

- 리포트 생성 후 일반 몬스터 60종, 보스 몬스터 20종이 모두 출현 목록에 포함되는지 검사한다.
- stage `enemyAssets` 길이가 화면 적 수 3과 맞는지 확인한다.
- `node --check`와 실제 생성 명령을 통과시킨다.
