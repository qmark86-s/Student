# 직업 밸런스 테이블

직업 결과 밸런스는 `data/careers.json`에서 조정한다. `npm run verify`는 직업 밸런스 컬럼을 먼저 검사하므로, 누락이나 중복 순위가 있으면 빌드 전에 실패한다.

## 컬럼

- `choiceRank`: 직업 선택 결과와 직업 도감에서 쓰는 일렬 순위다. 1부터 62까지 중복 없이 입력한다.
- `choiceBand`: UI 표시용 등급이다. 현재 값은 `S급`, `A급`, `B급`, `C급`, `D급`이다.
- `powerMultiplier`: 직업 기본 전투 배율이다. 선택된 동료가 원정대원으로 등록될 때 기본 능력치에 반영된다.
- `prestigeIncomeRate`: 진학 대학 `prestige`가 직업 `minPrestige`를 넘는 만큼 분당 수입에 더하는 비율이다.
- `prestigePowerRate`: 진학 대학 `prestige`가 직업 `minPrestige`를 넘는 만큼 전투 배율에 더하는 비율이다.

## 결과 공식

선택 가능 조건:

```text
university.prestige >= career.minPrestige
```

직업 수입:

```text
incomePerMinute = baseIncomePerMinute + max(0, university.prestige - minPrestige) * prestigeIncomeRate
```

직업 전투 배율:

```text
powerMultiplier = career.powerMultiplier * (1 + max(0, university.prestige - minPrestige) * prestigePowerRate)
```

## 검증

```bash
npm run balance:verify
npm run career:smoke
npm run verify:mobile
```

`career:smoke`는 결과 화면에 임시 세이브를 주입해 62개 직업 랭킹 버튼, 선택 가능 수, 전투 배율 라벨, 가로 overflow를 확인한다.
