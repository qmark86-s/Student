# 몬스터 방향 및 피격 연출 폴리싱 계획

## 목표

- 학생탭/원정대 몬스터가 플레이어를 향해 `<-` 방향으로 읽히게 한다.
- 학생탭 몬스터의 셀 경계 클리핑, 반투명/투명 몸통, 잘린 장식을 제거한다.
- 피격 리액션을 현재 강한 흔들림/베기 플래시에서 약한 림라이트 중심으로 낮춘다.
- 보스/수능 몬스터 HP 바를 기존 대비 약 2배 크기로 키운다.
- 같은 문제가 재발하지 않도록 자동 검증에 셀 경계 접촉과 피격 모션 하한/상한 기준을 추가한다.

## 분석 결과

- 기존 학생탭 몬스터는 `assets/reference/age-grade-pixel-styleboard.png` crop/flood-fill 경로와 보조 배지를 사용해 `asset-003.png`로 만들었다.
- 해당 방식은 흰 종이/공책/OMR 몸통을 배경으로 오인해 내부가 투명해지고, crop 주변의 반쪽 소품/배지가 셀에 남는 문제가 있다.
- 사용자가 최종 기준으로 지정한 몬스터 레퍼런스는 `assets/reference/character-ref-cute-sd.png`이며, 이 레퍼런스 우측 몬스터의 명암/외곽선/손발/표정 밀도를 기준으로 삼아야 한다.
- 피격 연출은 `.battle-scene-enemy.active`, `.battle-scene-enemy.active::after`, `enemyEngagedStep`, `enemyHurtLoop`, `enemyHitSpark`가 큰 이동/회전/강한 플래시를 만든다.
- 원정대 피격도 `expeditionEnemyKnockback`, `expeditionEnemyHurtSprite`, `expeditionEnemyShock`, `expeditionImpactSlash`가 큰 이동/회전과 강한 쇼크링을 만든다.

## 작업 항목

1. 학생탭 몬스터 원본 추출 안정화
   - `tools/generate-main-monster-sources.py`를 `character-ref-cute-sd.png` 기반 개별 crop/GrabCut cutout 생성기로 전환한다.
   - `assets/visual-source/main-monsters/main-monsters-green.png` 형광 녹색 소스 시트를 매 빌드에서 재생성한다.
   - 학생전투 몬스터는 기존 styleboard crop/flood-fill 경로를 사용하지 않는다.
   - 주변 반쪽 소품, 배경선, 작은 분리 조각은 cutout preview 단계에서 제거한다.

2. 몬스터 방향 보정
   - 학생탭 몬스터는 소스 생성 단계에서 레퍼런스 컷아웃 방향을 유지해 이전 출력 대비 좌우대칭된 현재 기준이 `<-` 방향으로 읽히게 한다.
   - 원정대 몬스터 manifest의 `direction: "left"`와 실제 생성물/런타임 클래스가 일치하는지 검증한다.

3. 피격 리액션 축소
   - 학생탭 활성 몬스터 이동량/회전량/스케일 변형을 기존 대비 약 1/4 수준으로 낮춘다.
   - 강한 베기 플래시는 제거하고 얇은 림라이트/아웃라인 반짝임으로 교체한다.
   - 원정대 몬스터 피격도 같은 기준으로 낮춘다.

4. HP 바 확대
   - 학생탭 `battle-scene-hp` width/height/padding을 기존 대비 약 2배로 키운다.
   - 모바일 미디어쿼리에서도 같은 기준을 유지한다.

5. 검증 강화
   - `visual-asset-audit`에 mainMonsters 경계 접촉/최소 여백/형광 녹색 잔여 픽셀 검사를 추가한다.
   - `visual:smoke`에 HP바 실제 크기, 피격 이동량 상한, 림라이트 VFX 존재 여부를 추가한다.
   - `asset:factory:prepare`, `visual:verify`, `visual:smoke`, `verify:mobile`로 확인한다.

## 완료 기준

- `asset-003.png` 샘플 확대에서 몬스터 몸통/얼굴/장식이 잘리지 않는다.
- `reference-main-monster-cutouts-preview.png`에서 레퍼런스 몬스터 내부가 투명하게 뚫리지 않는다.
- `main-monster-green-source-vs-final.png`에서 형광 녹색 소스와 최종 alpha 결과가 일치하고, 최종 아틀라스에 녹색 잔여가 없다.
- 몬스터 셀의 alpha bounds가 96px 셀 경계에 닿지 않는다.
- 학생탭 보스/수능 HP바가 화면에서 명확히 읽힌다.
- 피격 중 몬스터가 크게 밀리거나 회전하지 않고, 외곽선만 짧게 반짝인다.
- `npm run asset:factory:prepare`, `npm run visual:verify`, `npm run visual:smoke`, `npm run verify:mobile`이 통과한다.
