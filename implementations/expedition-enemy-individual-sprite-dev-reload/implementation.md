# 원정대 개별 몬스터 스프라이트 dev reload 구현

## 개요

새 원정대 몬스터 PNG가 생성된 뒤 이미 실행 중인 React Vite dev 서버에서 `원정대 적 스프라이트 자산 누락` 오류가 발생하는 문제를 수정했다. 원인은 파일 누락이 아니라 `src/react/game/assets.js`의 `import.meta.glob` 변환 결과가 dev 서버 시작 시점의 파일 목록을 유지한 것이었다.

## 원인

- 누락으로 표시된 `src/snapshot/assets/individual/expedition-enemies/studio-mob-4/move_0.png`는 실제로 존재했다.
- 하지만 `http://127.0.0.1:5174/game/assets.js`의 변환 결과에는 `studio-mob-4`가 없었다.
- 원정대 몬스터 런타임 로더는 `import.meta.glob("../../snapshot/assets/individual/expedition-enemies/*/move_*.png", { eager: true })`를 사용하므로, dev 서버가 해당 모듈을 다시 변환해야 새 파일이 포함된다.

## 변경 사항

- `tools/build-visual-assets.mjs`
  - `src/react/game/assets.js` 경로를 `reactAssetLoaderPath`로 정의했다.
  - `refreshReactAssetLoaderMtime()`을 추가했다.
  - `visualData` 작성 이후 loader 파일의 mtime을 갱신한다.
  - loader 파일이 없으면 명시적으로 실패한다.
  - 성공 로그로 `REACT_ASSET_LOADER_REFRESHED src/react/game/assets.js`를 출력한다.
- `docs/asset_sprite_factory.md`
  - `asset:factory:prepare`의 `visual:build` 단계가 Vite dev 서버 glob 갱신을 위해 loader mtime을 갱신한다고 기록했다.

## 정책

누락 자산을 레거시 이미지, 공용 이미지, 임시 이미지로 대체하는 fallback은 추가하지 않았다. 파일이 없거나 loader 파일이 없으면 기존 원칙대로 명시적으로 실패한다.

## 검증

통과한 명령과 확인:

```powershell
node tools/build-visual-assets.mjs
npm run expedition:combat-verify
npm run react:expedition-smoke
npm run asset:factory:prepare
```

주요 결과:

- `VISUAL_ASSETS_BUILT ... enemies=80`
- `REACT_ASSET_LOADER_REFRESHED src/react/game/assets.js`
- `EXPEDITION_COMBAT_BALANCE_OK careers=62 segments=100 bosses=100`
- `REACT_VITE_EXPEDITION_SMOKE_OK`
- `ASSET_FACTORY_OK command=prepare`
- 5174 dev 서버의 `game/assets.js` 변환 결과에 `studio-mob-4`, `future-boss-2` 포함 확인
- 브라우저 직접 호출에서 `getExpeditionEnemyFrameUrls("studio-mob-4")`가 4프레임 모두 반환

## 확인 산출물

- 5174 확인 스크린샷: `artifacts/visual-asset-smoke/expedition-5174-dev-reload.png`
- 계획 문서: `plans/expedition-enemy-individual-sprite-dev-reload/plan.md`
