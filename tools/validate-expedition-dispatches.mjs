import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const combatBalance = JSON.parse(readFileSync(resolve("data/expedition_combat_balance.json"), "utf8"));
const dispatches = JSON.parse(readFileSync(resolve("data/expedition_dispatches.json"), "utf8"));

const careerIds = new Set(careers.map((career) => career.id));
const roleIds = new Set(Object.keys(combatBalance.roleLabels || {}));
const allowedFutureLabels = new Set(["테크트리 포인트", "유물", "원정대 뽑기권"]);
const failures = [];

function fail(message) {
  failures.push(message);
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireString(value, path) {
  if (typeof value !== "string" || value.length === 0) fail(`${path} 값이 비어 있습니다.`);
}

function requireInteger(value, path, min) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) fail(`${path} 값은 ${min} 이상의 정수여야 합니다.`);
}

function requireNumber(value, path, min) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) fail(`${path} 값은 ${min} 이상의 숫자여야 합니다.`);
}

function requireHelp(source, path, keys) {
  if (!isObject(source.help)) {
    fail(`${path}.help 값이 없습니다.`);
    return;
  }
  for (const key of keys) requireString(source.help[key], `${path}.help.${key}`);
}

if (!isObject(dispatches)) fail("expedition_dispatches.json 루트 데이터가 객체가 아닙니다.");
else {
  requireInteger(dispatches.version, "expedition_dispatches.json.version", 1);
  requireHelp(dispatches, "expedition_dispatches.json", ["version", "rules", "bands"]);
  if (!isObject(dispatches.rules)) fail("expedition_dispatches.json.rules 값이 없습니다.");
  else {
    const rules = dispatches.rules;
    requireInteger(rules.activeSlotCount, "rules.activeSlotCount", 1);
    requireInteger(rules.dailyVisibleCount, "rules.dailyVisibleCount", 1);
    requireInteger(rules.maxMembersPerMission, "rules.maxMembersPerMission", 1);
    requireInteger(rules.historyLimit, "rules.historyLimit", 1);
    requireNumber(rules.bonusPerMatchPoint, "rules.bonusPerMatchPoint", 0);
    requireNumber(rules.bonusCap, "rules.bonusCap", 0);
    requireString(rules.localDateKeyFormat, "rules.localDateKeyFormat");
    if (Number(rules.activeSlotCount) !== 2) fail("rules.activeSlotCount는 v1 기준 2여야 합니다.");
    if (Number(rules.dailyVisibleCount) !== 4) fail("rules.dailyVisibleCount는 v1 기준 4여야 합니다.");
    if (Number(rules.maxMembersPerMission) !== 3) fail("rules.maxMembersPerMission는 v1 기준 3이어야 합니다.");
    requireHelp(rules, "rules", ["activeSlotCount", "dailyVisibleCount", "maxMembersPerMission", "historyLimit", "bonusPerMatchPoint", "bonusCap", "localDateKeyFormat"]);
  }

  if (!Array.isArray(dispatches.bands)) fail("expedition_dispatches.json.bands 값이 배열이 아닙니다.");
  else {
    if (dispatches.bands.length !== Number(dispatches.rules?.dailyVisibleCount || 0)) fail("bands 수는 dailyVisibleCount와 같아야 합니다.");
    const bandIds = new Set();
    const missionIds = new Set();
    const orders = new Set();
    for (const [bandIndex, band] of dispatches.bands.entries()) {
      const bandPath = `bands[${bandIndex}]`;
      if (!isObject(band)) {
        fail(`${bandPath} 데이터가 객체가 아닙니다.`);
        continue;
      }
      requireString(band.id, `${bandPath}.id`);
      if (bandIds.has(band.id)) fail(`${bandPath}.id 값이 중복되었습니다: ${band.id}`);
      bandIds.add(band.id);
      requireString(band.label, `${bandPath}.label`);
      requireInteger(band.durationMinutes, `${bandPath}.durationMinutes`, 1);
      requireInteger(band.dailyOrder, `${bandPath}.dailyOrder`, 1);
      if (orders.has(Number(band.dailyOrder))) fail(`${bandPath}.dailyOrder 값이 중복되었습니다: ${band.dailyOrder}`);
      orders.add(Number(band.dailyOrder));
      if (!Array.isArray(band.missions) || band.missions.length < 3) {
        fail(`${bandPath}.missions는 3개 이상의 의뢰를 가져야 합니다.`);
        continue;
      }
      for (const [missionIndex, mission] of band.missions.entries()) {
        const path = `${bandPath}.missions[${missionIndex}]`;
        if (!isObject(mission)) {
          fail(`${path} 데이터가 객체가 아닙니다.`);
          continue;
        }
        requireString(mission.id, `${path}.id`);
        if (missionIds.has(mission.id)) fail(`${path}.id 값이 중복되었습니다: ${mission.id}`);
        missionIds.add(mission.id);
        requireString(mission.title, `${path}.title`);
        requireString(mission.summary, `${path}.summary`);
        requireInteger(mission.requiredMemberCount, `${path}.requiredMemberCount`, 1);
        if (Number(mission.requiredMemberCount) > Number(dispatches.rules?.maxMembersPerMission || 0)) fail(`${path}.requiredMemberCount가 maxMembersPerMission을 초과했습니다.`);
        if (!Array.isArray(mission.recommendedCareerIds) || mission.recommendedCareerIds.length === 0) fail(`${path}.recommendedCareerIds 값이 비어 있습니다.`);
        else {
          for (const careerId of mission.recommendedCareerIds) {
            if (!careerIds.has(careerId)) fail(`${path}.recommendedCareerIds에 없는 직업 id가 있습니다: ${careerId}`);
          }
        }
        if (!Array.isArray(mission.recommendedRoles) || mission.recommendedRoles.length === 0) fail(`${path}.recommendedRoles 값이 비어 있습니다.`);
        else {
          for (const roleId of mission.recommendedRoles) {
            if (!roleIds.has(roleId)) fail(`${path}.recommendedRoles에 없는 역할 id가 있습니다: ${roleId}`);
          }
        }
        if (!isObject(mission.rewards)) fail(`${path}.rewards 값이 없습니다.`);
        else {
          requireInteger(mission.rewards.trainingExp, `${path}.rewards.trainingExp`, 0);
          requireInteger(mission.rewards.diamonds, `${path}.rewards.diamonds`, 0);
          requireInteger(mission.rewards.realEstateCash, `${path}.rewards.realEstateCash`, 0);
          if (!Array.isArray(mission.rewards.future)) fail(`${path}.rewards.future 값이 배열이 아닙니다.`);
          else {
            for (const [futureIndex, future] of mission.rewards.future.entries()) {
              const futurePath = `${path}.rewards.future[${futureIndex}]`;
              if (!isObject(future)) {
                fail(`${futurePath} 데이터가 객체가 아닙니다.`);
                continue;
              }
              requireString(future.id, `${futurePath}.id`);
              requireString(future.label, `${futurePath}.label`);
              requireInteger(future.amount, `${futurePath}.amount`, 1);
              if (!allowedFutureLabels.has(future.label)) fail(`${futurePath}.label 값은 준비중 보상 목록에 있어야 합니다: ${future.label}`);
            }
          }
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`EXPEDITION_DISPATCHES_OK bands=${dispatches.bands.length} missions=${dispatches.bands.reduce((sum, band) => sum + band.missions.length, 0)}`);
