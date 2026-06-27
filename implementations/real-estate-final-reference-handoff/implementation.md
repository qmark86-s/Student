# 부동산 최종본 역산 파이프라인 Handoff 구현

## 목적

새 세션에서 `small_studio` 최종본 역산 baked PNG 파이프라인을 다시 시작할 수 있도록, 현재 세션의 원본 리소스와 참고 산출물을 분리해서 정리했다.

## 추가 문서

- `plans/real-estate-final-reference-reconstruction/plan.md`
  - 새 세션 준비 범위와 handoff 산출물 기준을 정의한다.
- `docs/real_estate_final_reference_handoff.md`
  - 현재 방식이 왜 진짜 최종본 역산이 아닌지 설명한다.
  - 다음 세션에서 사용해야 할 원본과 참고만 해야 할 레거시 데이터를 구분한다.
- `artifacts/real-estate-final-reference-handoff/current-session-notes.md`
  - 현재 세션의 실패 원인과 사용 금지 데이터를 짧게 정리한다.
- `artifacts/real-estate-final-reference-handoff/next-session-prompt.md`
  - 새 세션 첫 메시지로 그대로 붙여넣을 수 있는 구현 요청문이다.

## 패키지 구성

`artifacts/real-estate-final-reference-handoff/`에 다음을 모았다.

- `resources/source/`
  - `small-studio-base.png`
  - `small-studio-final-reference.png`
  - `small-studio-building-sheet.png`
- `resources/current-review/`
  - 현재 baked contact sheet
  - 현재 forbidden mask overlay
  - 현재 0단계/16단계 runtime PNG
  - 현재 sheet cutout 리뷰 PNG
  - 현재 generation/audit report
- `data-reference/`
  - 현재 부동산 성장/시트/마스크/pad 관련 JSON 참고본
- `tools-reference/`
  - 현재 추출/생성/감사 스크립트 참고본
- `manifest.json`
  - 패키지 내 파일 목록, 크기, SHA256 해시

같은 내용을 다운로드 폴더에 `real-estate-final-reference-handoff-20260626.zip`으로 압축했다.

## 중요한 판단

현재 세션에서 만든 `small_studio` 슬롯은 최종본에서 자동 역산한 값이 아니다. 다음 세션에서는 기존 `detailPads`, 현재 baked PNG, 현재 footprint를 정답으로 사용하지 말고, `base`와 `finalReference`의 diff 후보 추출부터 다시 시작해야 한다.

## 확인

- handoff artifact 폴더 생성 완료
- 다운로드 zip 생성 완료
- zip 내부 파일 목록 확인 완료
- 필수 원본 3종 포함 확인 완료
- 실패한 baked PNG 런타임 연결, 수동 슬롯 JSON, 성장 PNG 산출물, 관련 검증 스크립트는 워킹트리에서 제거 완료
