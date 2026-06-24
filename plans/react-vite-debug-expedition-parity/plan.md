# React/Vite 디버그 원정대 동료 패리티 계획

## 목표
- React/Vite DEBUG 메뉴의 `동료 랜덤 +1/+5`가 원본 HTML처럼 학생 `companions`가 아니라 원정대 `expedition.members`에 직접 동료를 추가하도록 맞춘다.
- 디버그 동료는 원정대 파티 크기 안에서 자동 편성되고, 학생 동료 탭에는 로봇/학생 동료만 남도록 분리한다.
- 누락 데이터는 임의 기본값으로 숨기지 않고 `careers.json`, 원정대 저장 스키마, 승급 테이블 검증을 통과해야만 생성한다.

## 확인한 원본 기준
- 원본 HTML의 디버그 동료 추가는 `expedition.members`에 `debug:` sourceKey를 가진 원정대원을 추가한다.
- 파티가 비어 있으면 최대 `expeditionBalance.partySize`까지 `partyMemberIds`에 자동 편성한다.
- `companions` 배열에는 디버그 직업 동료를 추가하지 않는다.
- 로그 문구는 원정대 기록에 `디버그 동료 N명이 합류했다.` 형태로 남긴다.

## 구현 범위
1. `src/react/game/expedition.js`에 디버그 원정대 멤버 생성 및 추가 함수를 추가한다.
2. `src/react/App.jsx`의 DEBUG 버튼을 원정대 전용 추가 함수로 연결한다.
3. `tools/react-vite-shop-debug-smoke.mjs`의 기대값을 원본 기준으로 갱신한다.
4. 상호작용 패리티 스크립트에서 학생 동료 수와 원정대 멤버 수를 구분해 비교할 수 있게 보강한다.

## 검증 기준
- `npm run react:build`
- `npm run react:shop-debug-smoke`
- `npm run react:expedition-smoke`
- `npm run react:responsive-audit`
- `npm run react:interactive-parity`

## 비고
- 디버그 생성용 `avatarGender`는 React 원정대 시각화 검증 필드이므로 난수 소비 없이 생성 인덱스 기준으로 명시한다.
- 기존 `addRandomCareerCompanions`는 학생 동료 생성 helper로 남길 수 있지만 DEBUG UI에서는 사용하지 않는다.
