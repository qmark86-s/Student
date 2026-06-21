# Sprite Reference Lock Fullbody Refresh

## Changes

- `data/sprite_reference_lock.json` 추가
  - 레퍼런스 이미지와 전신 SD 수치 기준을 고정했다.
- `data/sprite_style_profiles.json` 조정
  - 머리는 크게 유지하되 몸통/하체를 과도하게 압축하지 않도록 수정했다.
  - 전력질주처럼 낮게 누운 포즈를 레퍼런스식 보행에 가깝게 세우는 `uprightRotateDegrees`를 추가했다.
- `tools/asset-factory/check-reference-lock.mjs` 추가
  - 생성된 축 리포트가 레퍼런스락 기준을 통과하는지 검사한다.
- `tools/asset-factory/run.mjs` 갱신
  - prepare/review/qa/doctor 흐름에서 reference lock을 반드시 검사한다.
- `tools/build-visual-assets.mjs` 갱신
  - 전투 화면 학생 스프라이트 표시 셀을 풀바디 기준으로 키웠다.
- `tools/verify-visual-assets.mjs` 갱신
  - 하드코딩된 학생 폭/높이 기준 대신 `data/sprite_reference_lock.json`을 읽도록 바꿨다.

## Verification

- Passed: `npm run asset:factory:review`
- Passed: `npm run build:web`
- Passed: `npm run visual:smoke`
- Passed: `npm run verify:mobile`

## Notes

- `visual:build`는 `src/snapshot/visual-assets.css`와 아틀라스를 갱신하지만, 실제 웹 미리보기용 `dist/index.html`은 갱신하지 않는다.
- 화면 스크린샷을 확인할 때는 `npm run build:web` 또는 `npm run verify:mobile`로 최종 HTML까지 다시 묶는다.
