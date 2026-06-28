# 원정대 몬스터 출현 위치 확인표 구현

## 개요

원정대 몬스터 80종이 어디에서 등장하는지 확인할 수 있는 정적 HTML 리포트를 추가했다.

## 추가 파일

- `tools/generate-expedition-monster-appearance-map.mjs`
  - `data/professional_sprite_manifest.json`의 `expeditionEnemies`를 읽는다.
  - `data/expedition_stages.json`의 `enemyAssets`로 일반 stage 출현표를 만든다.
  - `data/expedition_bosses.json`의 `bossAsset`으로 boss stage 출현표를 만든다.
  - `data/expedition_balance.json`의 `chapterSize`, `segmentSize`로 stage 범위를 계산한다.

- `artifacts/expedition-monster-appearance-map/index.html`
  - 브라우저에서 바로 여는 확인용 리포트다.
  - 스테이지별, 보스별, 몬스터별 역색인 탭을 제공한다.
  - 검색어, tone, 타입, 신규 ID 필터를 제공한다.

- `artifacts/expedition-monster-appearance-map/appearance-map.json`
  - HTML과 같은 데이터를 담은 기계 판독용 요약이다.

## 명령

`package.json`에 다음 명령을 추가했다.

```powershell
npm run expedition:monster-map
```

## 검증 결과

실행 결과:

```text
EXPEDITION_MONSTER_APPEARANCE_MAP_OK monsters=80 stageKinds=60 bossKinds=20
```

추가 확인:

- HTML 리포트 생성 성공
- JSON 요약 생성 성공
- 몬스터 80종
- 일반 stage 100개
- boss stage 100개
- 일반 stage 출현 몬스터 종류 60종
- boss 출현 몬스터 종류 20종
- `move_0.png` 누락 0건
