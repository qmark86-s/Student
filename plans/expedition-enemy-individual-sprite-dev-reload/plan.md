# 원정대 개별 몬스터 스프라이트 dev reload 계획

## 목표

원정대 몬스터 개별 PNG를 새로 생성한 뒤 이미 떠 있는 React Vite dev 서버에서 `import.meta.glob` 목록이 오래된 상태로 남아 `원정대 적 스프라이트 자산 누락` 오류가 발생하지 않게 한다.

## 원인 분석

- 오류 대상인 `src/snapshot/assets/individual/expedition-enemies/studio-mob-4/move_0.png` 파일은 디스크에 존재한다.
- 실행 중인 dev 서버의 `game/assets.js` 변환 결과에는 `studio-mob-4`가 포함되어 있지 않았다.
- 원정대 몬스터 런타임 로더는 `src/react/game/assets.js`에서 `import.meta.glob("../../snapshot/assets/individual/expedition-enemies/*/move_*.png", { eager: true })`를 사용한다.
- 새 PNG가 dev 서버 시작 이후 생성되면 Vite의 glob 변환 캐시가 기존 목록을 유지할 수 있다.
- 누락을 레거시 자산으로 대체하면 안 되므로 fallback은 추가하지 않는다.

## 구현 계획

1. `tools/build-visual-assets.mjs` 마지막 단계에서 `src/react/game/assets.js`의 mtime을 갱신한다.
2. mtime 갱신 대상 파일이 없으면 명시적으로 실패시킨다.
3. 자산 팩토리 문서에 dev 서버 glob 갱신 동작을 기록한다.
4. 기존 5174 dev 서버를 재기동하거나 모듈 갱신 여부를 확인해 실제 화면 오류가 사라졌는지 검증한다.

## 검증 계획

- `node tools/build-visual-assets.mjs`
- 실행 중인 dev 서버의 `/game/assets.js` 변환 결과에 `studio-mob-4`가 포함되는지 확인
- `npm run expedition:combat-verify`
- `npm run react:expedition-smoke`
- 브라우저 실제 화면에서 렌더링 오류가 사라졌는지 확인

## 완료 기준

- `studio-mob-4` 포함 신규 원정대 몬스터 개별 프레임 4장이 런타임 로더에서 접근 가능하다.
- 원정대 화면이 렌더링 오류 없이 열린다.
- 누락 fallback이나 임의 대체 자산 없이 검증이 통과한다.

## 구현 결과

- `tools/build-visual-assets.mjs`에 `refreshReactAssetLoaderMtime()`을 추가했다.
- 비주얼 자산 빌드가 끝나면 `src/react/game/assets.js`의 mtime을 갱신해 실행 중인 Vite dev 서버가 `import.meta.glob` 목록을 다시 만들도록 했다.
- 대상 loader 파일이 없으면 명시적으로 실패하게 했고, 누락 자산을 다른 이미지로 대체하는 fallback은 추가하지 않았다.
- `docs/asset_sprite_factory.md`에 dev 서버 glob 갱신 동작을 문서화했다.

## 검증 결과

- `node tools/build-visual-assets.mjs` 통과
  - `VISUAL_ASSETS_BUILT ... enemies=80`
  - `REACT_ASSET_LOADER_REFRESHED src/react/game/assets.js`
- `http://127.0.0.1:5174/game/assets.js` 변환 결과에 `studio-mob-4`, `future-boss-2` 포함 확인
- `npm run expedition:combat-verify` 통과
  - `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`
- `npm run react:expedition-smoke` 통과
  - `enemyFrameCount=12`, `enemyFramesLoaded=12`, `failures=[]`
- `npm run asset:factory:prepare` 통과
  - `ASSET_FACTORY_OK command=prepare`
  - 원정대 몬스터 `count=80`, `maxCenterDelta=0.5`, `maxBaselineDelta=0`
- 5174 브라우저 직접 호출 검증 통과
  - `getExpeditionEnemyFrameUrls("studio-mob-4")`가 4프레임 모두 반환
  - page error 0건
