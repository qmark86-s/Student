import careers from "../../../data/careers.json";
import expeditionCombatBalance from "../../../data/expedition_combat_balance.json";
import expeditionBalance from "../../../data/expedition_balance.json";
import expeditionBosses from "../../../data/expedition_bosses.json";
import expeditionChapters from "../../../data/expedition_chapters.json";
import expeditionDispatches from "../../../data/expedition_dispatches.json";
import expeditionPromotions from "../../../data/expedition_promotions.json";
import expeditionResearch from "../../../data/expedition_research.json";
import expeditionSegments from "../../../data/expedition_stages.json";
import expeditionLevels from "../../../data/expedition_unit_levels.json";
import { grantRealEstateExpeditionPendingCash, realEstateExpeditionStageReward } from "./realEstate.js";

const subjectIds = ["korean", "english", "math", "social", "science"];
const expeditionRoleIds = ["tank", "dealer", "healer"];
const combatStatIds = ["hp", "attack", "defense", "healing", "attackSpeed"];
const subjectLabels = {
  korean: "국어",
  english: "영어",
  math: "수학",
  social: "사회",
  science: "과학",
};
const subjectShortLabels = {
  korean: "국",
  english: "영",
  math: "수",
  social: "사",
  science: "과",
};

const chapterByNumber = new Map(expeditionChapters.map((chapter) => [Number(chapter.chapter), chapter]));
const careerById = new Map(careers.map((career) => [career.id, career]));
const levelByLevel = new Map(expeditionLevels.map((level) => [Number(level.level), level]));
const promotionById = new Map(expeditionPromotions.map((promotion) => [promotion.id, promotion]));
const promotionByOrder = new Map(expeditionPromotions.map((promotion) => [Number(promotion.order), promotion]));
const segmentByKey = new Map(expeditionSegments.map((segment) => [`${Number(segment.chapter)}:${Number(segment.segment)}`, segment]));
const midBossByKey = new Map(
  expeditionBosses
    .filter((boss) => boss.bossType === "mid")
    .map((boss) => [`${Number(boss.chapter)}:${Number(boss.segment)}`, boss]),
);
const chapterBossByChapter = new Map(
  expeditionBosses
    .filter((boss) => boss.bossType === "chapter")
    .map((boss) => [Number(boss.chapter), boss]),
);
const dispatchBands = validateDispatchConfig(expeditionDispatches).bands.slice().sort((a, b) => Number(a.dailyOrder) - Number(b.dailyOrder));
const dispatchMissionById = new Map(dispatchBands.flatMap((band) => band.missions.map((mission) => [mission.id, { ...mission, band }])));
const researchConfig = validateResearchConfig(expeditionResearch);
const researchNodes = researchConfig.nodes.slice().sort((a, b) => Number(a.position.depth) - Number(b.position.depth) || Number(a.position.lane) - Number(b.position.lane));
const researchNodeById = new Map(researchNodes.map((node) => [node.id, node]));

export const expeditionPartySize = expeditionBalance.partySize;
export const expeditionAutoTickMs = expeditionCombatBalance.timing.onlineTickMs;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function assertObject(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} 데이터가 객체가 아닙니다.`);
}

function requireOwn(source, key, path) {
  assertObject(source, path);
  assert(hasOwn(source, key), `${path}.${key} 값이 없습니다.`);
  return source[key];
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function now() {
  return Date.now();
}

function positiveNumber(value, path) {
  const number = finiteNumber(value, `${path} 값이 올바르지 않습니다.`);
  assert(number > 0, `${path} 값은 0보다 커야 합니다.`);
  return number;
}

function nonNegativeNumber(value, path) {
  const number = finiteNumber(value, `${path} 값이 올바르지 않습니다.`);
  assert(number >= 0, `${path} 값은 0 이상이어야 합니다.`);
  return number;
}

function roundTo(value, digits = 2) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function statMap(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} 데이터가 객체가 아닙니다.`);
  return Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(source[subject], `${path}.${subject} 값이 올바르지 않습니다.`)]));
}

function blankStats() {
  return Object.fromEntries(subjectIds.map((subject) => [subject, 0]));
}

function addStats(target, source) {
  for (const subject of subjectIds) target[subject] += finiteNumber(source[subject], `원정대 합산 stats.${subject} 값이 올바르지 않습니다.`);
}

function pushExpeditionLog(expedition, text, tone = "info") {
  assert(Array.isArray(expedition.log), "save.expedition.log 데이터가 배열이 아닙니다.");
  expedition.log = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
      text,
      tone,
    },
    ...expedition.log,
  ].slice(0, 40);
}

function validateDispatchConfig(config) {
  assertObject(config, "expedition_dispatches.json");
  assertNumberInteger(config.version, "expedition_dispatches.json.version", 1);
  assertObject(config.rules, "expedition_dispatches.json.rules");
  assertNumberInteger(config.rules.activeSlotCount, "expedition_dispatches.json.rules.activeSlotCount", 1);
  assertNumberInteger(config.rules.dailyVisibleCount, "expedition_dispatches.json.rules.dailyVisibleCount", 1);
  assertNumberInteger(config.rules.maxMembersPerMission, "expedition_dispatches.json.rules.maxMembersPerMission", 1);
  assertNumberInteger(config.rules.historyLimit, "expedition_dispatches.json.rules.historyLimit", 1);
  nonNegativeNumber(config.rules.bonusPerMatchPoint, "expedition_dispatches.json.rules.bonusPerMatchPoint");
  nonNegativeNumber(config.rules.bonusCap, "expedition_dispatches.json.rules.bonusCap");
  assert(Array.isArray(config.bands), "expedition_dispatches.json.bands 데이터가 배열이 아닙니다.");
  assert(config.bands.length === Number(config.rules.dailyVisibleCount), "expedition_dispatches.json bands 수가 dailyVisibleCount와 다릅니다.");
  const missionIds = new Set();
  const bandOrders = new Set();
  for (const [bandIndex, band] of config.bands.entries()) {
    const bandPath = `expedition_dispatches.json.bands[${bandIndex}]`;
    assertObject(band, bandPath);
    assert(typeof band.id === "string" && band.id.length > 0, `${bandPath}.id 값이 없습니다.`);
    assert(typeof band.label === "string" && band.label.length > 0, `${bandPath}.label 값이 없습니다.`);
    assertNumberInteger(band.durationMinutes, `${bandPath}.durationMinutes`, 1);
    assertNumberInteger(band.dailyOrder, `${bandPath}.dailyOrder`, 1);
    assert(!bandOrders.has(Number(band.dailyOrder)), `${bandPath}.dailyOrder 값이 중복되었습니다: ${band.dailyOrder}`);
    bandOrders.add(Number(band.dailyOrder));
    assert(Array.isArray(band.missions) && band.missions.length > 0, `${bandPath}.missions 데이터가 비어 있습니다.`);
    for (const [missionIndex, mission] of band.missions.entries()) {
      const missionPath = `${bandPath}.missions[${missionIndex}]`;
      assertObject(mission, missionPath);
      assert(typeof mission.id === "string" && mission.id.length > 0, `${missionPath}.id 값이 없습니다.`);
      assert(!missionIds.has(mission.id), `${missionPath}.id 값이 중복되었습니다: ${mission.id}`);
      missionIds.add(mission.id);
      assert(typeof mission.title === "string" && mission.title.length > 0, `${missionPath}.title 값이 없습니다.`);
      assert(typeof mission.summary === "string" && mission.summary.length > 0, `${missionPath}.summary 값이 없습니다.`);
      assertNumberInteger(mission.requiredMemberCount, `${missionPath}.requiredMemberCount`, 1);
      assert(Number(mission.requiredMemberCount) <= Number(config.rules.maxMembersPerMission), `${missionPath}.requiredMemberCount 값이 최대 투입 수를 초과했습니다.`);
      assert(Array.isArray(mission.recommendedCareerIds) && mission.recommendedCareerIds.length > 0, `${missionPath}.recommendedCareerIds 값이 비어 있습니다.`);
      for (const careerId of mission.recommendedCareerIds) {
        assert(typeof careerId === "string" && careerById.has(careerId), `${missionPath}.recommendedCareerIds 값이 올바르지 않습니다: ${careerId}`);
      }
      assert(Array.isArray(mission.recommendedRoles) && mission.recommendedRoles.length > 0, `${missionPath}.recommendedRoles 값이 비어 있습니다.`);
      for (const roleId of mission.recommendedRoles) {
        assert(expeditionRoleIds.includes(roleId), `${missionPath}.recommendedRoles 값이 올바르지 않습니다: ${roleId}`);
      }
      assertObject(mission.rewards, `${missionPath}.rewards`);
      assertNumberInteger(mission.rewards.trainingExp, `${missionPath}.rewards.trainingExp`, 0);
      assertNumberInteger(mission.rewards.diamonds, `${missionPath}.rewards.diamonds`, 0);
      assertNumberInteger(mission.rewards.realEstateCash, `${missionPath}.rewards.realEstateCash`, 0);
      assert(Array.isArray(mission.rewards.future), `${missionPath}.rewards.future 데이터가 배열이 아닙니다.`);
    }
  }
  return config;
}

function validateResearchConfig(config) {
  assertObject(config, "expedition_research.json");
  assertNumberInteger(config.version, "expedition_research.json.version", 1);
  assertObject(config.help, "expedition_research.json.help");
  for (const key of ["version", "rules", "lanes", "nodes"]) {
    assert(typeof config.help[key] === "string" && config.help[key].length > 0, `expedition_research.json.help.${key} 값이 없습니다.`);
  }
  assertObject(config.rules, "expedition_research.json.rules");
  assert(typeof config.rules.currencyName === "string" && config.rules.currencyName.length > 0, "expedition_research.json.rules.currencyName 값이 없습니다.");
  nonNegativeNumber(config.rules.maxTotalCombatBonus, "expedition_research.json.rules.maxTotalCombatBonus");
  assert(typeof config.rules.freeReset === "boolean", "expedition_research.json.rules.freeReset 값이 boolean이 아닙니다.");
  assertObject(config.rules.bossRewards, "expedition_research.json.rules.bossRewards");
  assertNumberInteger(config.rules.bossRewards.mid, "expedition_research.json.rules.bossRewards.mid", 0);
  assertNumberInteger(config.rules.bossRewards.chapter, "expedition_research.json.rules.bossRewards.chapter", 0);
  assertObject(config.rules.help, "expedition_research.json.rules.help");
  for (const key of ["currencyName", "maxTotalCombatBonus", "freeReset", "bossRewards"]) {
    assert(typeof config.rules.help[key] === "string" && config.rules.help[key].length > 0, `expedition_research.json.rules.help.${key} 값이 없습니다.`);
  }
  assert(Array.isArray(config.lanes) && config.lanes.length > 0, "expedition_research.json.lanes 데이터가 비어 있습니다.");
  const laneIds = new Set();
  const laneNumbers = new Set();
  for (const [laneIndex, lane] of config.lanes.entries()) {
    const lanePath = `expedition_research.json.lanes[${laneIndex}]`;
    assertObject(lane, lanePath);
    assert(typeof lane.id === "string" && lane.id.length > 0, `${lanePath}.id 값이 없습니다.`);
    assert(!laneIds.has(lane.id), `${lanePath}.id 값이 중복되었습니다: ${lane.id}`);
    laneIds.add(lane.id);
    assert(typeof lane.name === "string" && lane.name.length > 0, `${lanePath}.name 값이 없습니다.`);
    assertNumberInteger(lane.lane, `${lanePath}.lane`, 0);
    assert(!laneNumbers.has(Number(lane.lane)), `${lanePath}.lane 값이 중복되었습니다: ${lane.lane}`);
    laneNumbers.add(Number(lane.lane));
    assert(typeof lane.help === "string" && lane.help.length > 0, `${lanePath}.help 값이 없습니다.`);
  }
  assert(Array.isArray(config.nodes) && config.nodes.length > 0, "expedition_research.json.nodes 데이터가 비어 있습니다.");
  const nodeIds = new Set();
  const occupiedPositions = new Set();
  const allowedEffectTypes = new Set(["partyPowerPercent", "combatStatPercent", "roleCombatStatPercent", "stageRewardPercent", "researchPointDropFlat"]);
  const allowedRewardIds = new Set(["trainingExp", "realEstateCash"]);
  const allowedBossTypes = new Set(["mid", "chapter", "all"]);
  for (const [nodeIndex, node] of config.nodes.entries()) {
    const nodePath = `expedition_research.json.nodes[${nodeIndex}]`;
    assertObject(node, nodePath);
    assert(typeof node.id === "string" && node.id.length > 0, `${nodePath}.id 값이 없습니다.`);
    assert(!nodeIds.has(node.id), `${nodePath}.id 값이 중복되었습니다: ${node.id}`);
    nodeIds.add(node.id);
    assert(typeof node.name === "string" && node.name.length > 0, `${nodePath}.name 값이 없습니다.`);
    assert(typeof node.shortName === "string" && node.shortName.length > 0, `${nodePath}.shortName 값이 없습니다.`);
    assert(typeof node.description === "string" && node.description.length > 0, `${nodePath}.description 값이 없습니다.`);
    assertNumberInteger(node.cost, `${nodePath}.cost`, 1);
    assert(Array.isArray(node.prerequisiteNodeIds), `${nodePath}.prerequisiteNodeIds 데이터가 배열이 아닙니다.`);
    assertObject(node.position, `${nodePath}.position`);
    assertNumberInteger(node.position.depth, `${nodePath}.position.depth`, 1);
    assertNumberInteger(node.position.lane, `${nodePath}.position.lane`, 0);
    assert(laneNumbers.has(Number(node.position.lane)), `${nodePath}.position.lane에 해당하는 lanes 정의가 없습니다: ${node.position.lane}`);
    const positionKey = `${Number(node.position.depth)}:${Number(node.position.lane)}`;
    assert(!occupiedPositions.has(positionKey), `${nodePath}.position 값이 다른 노드와 겹칩니다: ${positionKey}`);
    occupiedPositions.add(positionKey);
    assert(Array.isArray(node.effects) && node.effects.length > 0, `${nodePath}.effects 데이터가 비어 있습니다.`);
    for (const [effectIndex, effect] of node.effects.entries()) {
      const effectPath = `${nodePath}.effects[${effectIndex}]`;
      assertObject(effect, effectPath);
      assert(allowedEffectTypes.has(effect.type), `${effectPath}.type 값이 올바르지 않습니다: ${effect.type}`);
      assert(typeof effect.help === "string" && effect.help.length > 0, `${effectPath}.help 값이 없습니다.`);
      if (effect.type === "partyPowerPercent") {
        nonNegativeNumber(effect.value, `${effectPath}.value`);
      } else if (effect.type === "combatStatPercent") {
        assert(combatStatIds.includes(effect.stat), `${effectPath}.stat 값이 올바르지 않습니다: ${effect.stat}`);
        nonNegativeNumber(effect.value, `${effectPath}.value`);
      } else if (effect.type === "roleCombatStatPercent") {
        assert(expeditionRoleIds.includes(effect.role), `${effectPath}.role 값이 올바르지 않습니다: ${effect.role}`);
        assert(combatStatIds.includes(effect.stat), `${effectPath}.stat 값이 올바르지 않습니다: ${effect.stat}`);
        nonNegativeNumber(effect.value, `${effectPath}.value`);
      } else if (effect.type === "stageRewardPercent") {
        assert(allowedRewardIds.has(effect.reward), `${effectPath}.reward 값이 올바르지 않습니다: ${effect.reward}`);
        nonNegativeNumber(effect.value, `${effectPath}.value`);
      } else if (effect.type === "researchPointDropFlat") {
        assert(allowedBossTypes.has(effect.bossType), `${effectPath}.bossType 값이 올바르지 않습니다: ${effect.bossType}`);
        assertNumberInteger(effect.value, `${effectPath}.value`, 0);
      }
    }
  }
  for (const [nodeIndex, node] of config.nodes.entries()) {
    const nodePath = `expedition_research.json.nodes[${nodeIndex}]`;
    for (const prerequisiteId of node.prerequisiteNodeIds) {
      assert(typeof prerequisiteId === "string" && nodeIds.has(prerequisiteId), `${nodePath}.prerequisiteNodeIds 값이 올바르지 않습니다: ${prerequisiteId}`);
      const prerequisite = config.nodes.find((candidate) => candidate.id === prerequisiteId);
      assert(Number(prerequisite.position.depth) < Number(node.position.depth), `${nodePath}.prerequisiteNodeIds 선행 노드는 더 위 depth여야 합니다: ${prerequisiteId}`);
    }
  }
  return config;
}

function createEmptyDispatchState() {
  return {
    assignments: [],
    history: [],
  };
}

export function createEmptyResearchState() {
  return {
    points: 0,
    spentPoints: 0,
    unlockedNodeIds: [],
    resetCount: 0,
  };
}

function validateDispatchAssignment(assignment, path, memberIds) {
  assertObject(assignment, path);
  assert(typeof assignment.id === "string" && assignment.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof assignment.missionId === "string" && dispatchMissionById.has(assignment.missionId), `${path}.missionId 값이 올바르지 않습니다: ${assignment.missionId}`);
  assertNumberInteger(assignment.startedAt, `${path}.startedAt`, 0);
  assertNumberInteger(assignment.completeAt, `${path}.completeAt`, 0);
  assert(Number(assignment.completeAt) > Number(assignment.startedAt), `${path}.completeAt 값은 startedAt보다 커야 합니다.`);
  assert(Array.isArray(assignment.memberIds), `${path}.memberIds 데이터가 배열이 아닙니다.`);
  const memberIdSet = new Set(assignment.memberIds);
  assert(memberIdSet.size === assignment.memberIds.length, `${path}.memberIds 값이 중복되었습니다.`);
  const mission = dispatchMissionById.get(assignment.missionId);
  assert(assignment.memberIds.length >= Number(mission.requiredMemberCount), `${path}.memberIds 수가 의뢰 필요 인원보다 적습니다.`);
  assert(assignment.memberIds.length <= Number(expeditionDispatches.rules.maxMembersPerMission), `${path}.memberIds 수가 최대 파견 인원을 초과했습니다.`);
  for (const memberId of assignment.memberIds) {
    assert(typeof memberId === "string" && memberIds.has(memberId), `${path}.memberIds에서 원정대원을 찾을 수 없습니다: ${memberId}`);
  }
  if (assignment.dateKey !== undefined) assert(typeof assignment.dateKey === "string" && assignment.dateKey.length > 0, `${path}.dateKey 값이 올바르지 않습니다.`);
}

function validateDispatchHistoryEntry(entry, path, memberIds) {
  assertObject(entry, path);
  assert(typeof entry.id === "string" && entry.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof entry.missionId === "string" && dispatchMissionById.has(entry.missionId), `${path}.missionId 값이 올바르지 않습니다: ${entry.missionId}`);
  assert(typeof entry.title === "string" && entry.title.length > 0, `${path}.title 값이 없습니다.`);
  assertNumberInteger(entry.claimedAt, `${path}.claimedAt`, 0);
  assert(Array.isArray(entry.memberIds), `${path}.memberIds 데이터가 배열이 아닙니다.`);
  for (const memberId of entry.memberIds) {
    assert(typeof memberId === "string" && memberIds.has(memberId), `${path}.memberIds에서 원정대원을 찾을 수 없습니다: ${memberId}`);
  }
  assertObject(entry.rewards, `${path}.rewards`);
  for (const key of ["trainingExp", "diamonds", "realEstateCash"]) {
    assertNumberInteger(entry.rewards[key], `${path}.rewards.${key}`, 0);
  }
  positiveNumber(entry.bonusMultiplier, `${path}.bonusMultiplier`);
}

function validateDispatchState(dispatch, path, memberIds) {
  assertObject(dispatch, path);
  assert(Array.isArray(dispatch.assignments), `${path}.assignments 데이터가 배열이 아닙니다.`);
  assert(Array.isArray(dispatch.history), `${path}.history 데이터가 배열이 아닙니다.`);
  assert(dispatch.assignments.length <= Number(expeditionDispatches.rules.activeSlotCount), `${path}.assignments 수가 동시 파견 슬롯을 초과했습니다.`);
  const assignmentIds = new Set();
  const assignedMemberIds = new Set();
  for (const [index, assignment] of dispatch.assignments.entries()) {
    validateDispatchAssignment(assignment, `${path}.assignments[${index}]`, memberIds);
    assert(!assignmentIds.has(assignment.id), `${path}.assignments id가 중복되었습니다: ${assignment.id}`);
    assignmentIds.add(assignment.id);
    for (const memberId of assignment.memberIds) {
      assert(!assignedMemberIds.has(memberId), `${path}.assignments에서 같은 대원이 여러 의뢰에 배정되었습니다: ${memberId}`);
      assignedMemberIds.add(memberId);
    }
  }
  assert(dispatch.history.length <= Number(expeditionDispatches.rules.historyLimit), `${path}.history 수가 historyLimit을 초과했습니다.`);
  const historyIds = new Set();
  for (const [index, entry] of dispatch.history.entries()) {
    validateDispatchHistoryEntry(entry, `${path}.history[${index}]`, memberIds);
    assert(!historyIds.has(entry.id), `${path}.history id가 중복되었습니다: ${entry.id}`);
    historyIds.add(entry.id);
  }
}

function normalizeDispatchState(dispatch) {
  if (dispatch === undefined || dispatch === null) return createEmptyDispatchState();
  assertObject(dispatch, "save.expedition.dispatch");
  return {
    assignments: Array.isArray(dispatch.assignments) ? dispatch.assignments.map((assignment) => ({ ...assignment, memberIds: [...assignment.memberIds] })) : dispatch.assignments,
    history: Array.isArray(dispatch.history)
      ? dispatch.history.map((entry) => ({
          ...entry,
          memberIds: [...entry.memberIds],
          rewards: { ...entry.rewards },
        }))
      : dispatch.history,
  };
}

function researchNodeCost(nodeId) {
  const node = researchNodeById.get(nodeId);
  assert(node, `원정대 연구 노드를 찾을 수 없습니다: ${nodeId}`);
  return Math.max(0, Math.floor(finiteNumber(node.cost, `expedition_research.json ${nodeId}.cost 값이 올바르지 않습니다.`)));
}

function validateResearchState(research, path) {
  assertObject(research, path);
  assertNumberInteger(research.points, `${path}.points`, 0);
  assertNumberInteger(research.spentPoints, `${path}.spentPoints`, 0);
  assert(Array.isArray(research.unlockedNodeIds), `${path}.unlockedNodeIds 데이터가 배열이 아닙니다.`);
  const unlocked = new Set();
  for (const [index, nodeId] of research.unlockedNodeIds.entries()) {
    assert(typeof nodeId === "string" && researchNodeById.has(nodeId), `${path}.unlockedNodeIds[${index}] 값이 올바르지 않습니다: ${nodeId}`);
    assert(!unlocked.has(nodeId), `${path}.unlockedNodeIds 값이 중복되었습니다: ${nodeId}`);
    const node = researchNodeById.get(nodeId);
    for (const prerequisiteId of node.prerequisiteNodeIds) {
      assert(unlocked.has(prerequisiteId), `${path}.unlockedNodeIds 선행 연구가 먼저 저장되어야 합니다: ${nodeId} <- ${prerequisiteId}`);
    }
    unlocked.add(nodeId);
  }
  const expectedSpent = research.unlockedNodeIds.reduce((sum, nodeId) => sum + researchNodeCost(nodeId), 0);
  assert(Number(research.spentPoints) === expectedSpent, `${path}.spentPoints 값이 해금 노드 비용 합계와 다릅니다: ${research.spentPoints} !== ${expectedSpent}`);
  assertNumberInteger(research.resetCount, `${path}.resetCount`, 0);
}

function normalizeResearchState(research) {
  if (research === undefined || research === null) return createEmptyResearchState();
  assertObject(research, "save.expedition.research");
  const unlockedNodeIds = Array.isArray(research.unlockedNodeIds) ? [...research.unlockedNodeIds] : research.unlockedNodeIds;
  return {
    points: hasOwn(research, "points") ? Math.max(0, Math.floor(finiteNumber(research.points, "save.expedition.research.points 값이 올바르지 않습니다."))) : 0,
    spentPoints: hasOwn(research, "spentPoints") ? Math.max(0, Math.floor(finiteNumber(research.spentPoints, "save.expedition.research.spentPoints 값이 올바르지 않습니다."))) : 0,
    unlockedNodeIds,
    resetCount: hasOwn(research, "resetCount") ? Math.max(0, Math.floor(finiteNumber(research.resetCount, "save.expedition.research.resetCount 값이 올바르지 않습니다."))) : 0,
  };
}

function createEmptyPendingReward(createdAt = now(), previousLastBattle = null) {
  const timestamp = Math.max(0, Math.floor(finiteNumber(createdAt, "원정대 pendingReward createdAt 값이 올바르지 않습니다.")));
  return {
    money: 0,
    trainingExp: 0,
    diamonds: 0,
    realEstateCash: 0,
    researchPoints: 0,
    battles: 0,
    wins: 0,
    losses: 0,
    startedAt: 0,
    updatedAt: timestamp,
    fromStage: null,
    toStage: null,
    summaryText: "",
    lastBattle: previousLastBattle,
  };
}

function pendingRewardHasValue(pendingReward) {
  return Boolean(
    pendingReward &&
    (Number(pendingReward.money) > 0 ||
      Number(pendingReward.trainingExp) > 0 ||
      Number(pendingReward.diamonds) > 0 ||
      Number(pendingReward.realEstateCash) > 0 ||
      Number(pendingReward.researchPoints) > 0)
  );
}

function normalizeBattleReport(report) {
  if (report === null || report === undefined) return null;
  if (!report || typeof report !== "object" || Array.isArray(report)) return report;
  const normalized = { ...report };
  if (typeof normalized.result === "string" && typeof normalized.resultReason !== "string") {
    normalized.resultReason = battleResultReason(normalized.result);
  }
  if (!Array.isArray(normalized.partyHp)) normalized.partyHp = [];
  if (!Array.isArray(normalized.enemyHp)) normalized.enemyHp = [];
  if (!Array.isArray(normalized.enemyDefeatOrder)) normalized.enemyDefeatOrder = [];
  return normalized;
}

function normalizePendingReward(pendingReward, createdAt = now()) {
  const empty = createEmptyPendingReward(createdAt);
  if (!pendingReward || typeof pendingReward !== "object" || Array.isArray(pendingReward)) return empty;
  return {
    ...empty,
    ...pendingReward,
    money: Math.max(0, Math.floor(Number(pendingReward.money) || 0)),
    trainingExp: Math.max(0, Math.floor(Number(pendingReward.trainingExp) || 0)),
    diamonds: Math.max(0, Math.floor(Number(pendingReward.diamonds) || 0)),
    realEstateCash: Math.max(0, Math.floor(Number(pendingReward.realEstateCash) || 0)),
    researchPoints: Math.max(0, Math.floor(Number(pendingReward.researchPoints) || 0)),
    battles: Math.max(0, Math.floor(Number(pendingReward.battles) || 0)),
    wins: Math.max(0, Math.floor(Number(pendingReward.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(pendingReward.losses) || 0)),
    startedAt: Math.max(0, Math.floor(Number(pendingReward.startedAt) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(pendingReward.updatedAt) || Number(createdAt) || 0)),
    fromStage: pendingReward.fromStage === undefined ? null : pendingReward.fromStage,
    toStage: pendingReward.toStage === undefined ? null : pendingReward.toStage,
    summaryText: typeof pendingReward.summaryText === "string" ? pendingReward.summaryText : "",
    lastBattle: normalizeBattleReport(pendingReward.lastBattle),
  };
}

function validateCombatEvent(event, path) {
  assert(event && typeof event === "object" && !Array.isArray(event), `${path} 데이터가 객체가 아닙니다.`);
  nonNegativeNumber(event.time, `${path}.time`);
  assert(typeof event.actor === "string" && event.actor.length > 0, `${path}.actor 값이 없습니다.`);
  assert(typeof event.target === "string" && event.target.length > 0, `${path}.target 값이 없습니다.`);
  assert(["damage", "heal"].includes(event.kind), `${path}.kind 값이 올바르지 않습니다: ${event.kind}`);
  assertNumberInteger(event.value, `${path}.value`, 0);
  assert(typeof event.text === "string" && event.text.length > 0, `${path}.text 값이 없습니다.`);
  if (event.sequence !== undefined) assertNumberInteger(event.sequence, `${path}.sequence`, 1);
  for (const key of ["actorId", "actorLabel", "targetId", "targetLabel"]) {
    if (event[key] !== undefined) assert(typeof event[key] === "string" && event[key].length > 0, `${path}.${key} 값이 올바르지 않습니다.`);
  }
  for (const key of ["actorSide", "targetSide"]) {
    if (event[key] !== undefined) assert(["ally", "enemy"].includes(event[key]), `${path}.${key} 값이 올바르지 않습니다: ${event[key]}`);
  }
  for (const key of ["actorSlot", "targetSlot"]) {
    if (event[key] !== undefined) assertNumberInteger(event[key], `${path}.${key}`, 1);
  }
  for (const key of ["actorRole", "targetRole"]) {
    if (event[key] !== undefined && event[key] !== null) assert(expeditionRoleIds.includes(event[key]), `${path}.${key} 값이 올바르지 않습니다: ${event[key]}`);
  }
  for (const key of ["targetHpBefore", "targetHpAfter"]) {
    if (event[key] !== undefined) assertNumberInteger(event[key], `${path}.${key}`, 0);
  }
  if (event.targetMaxHp !== undefined) assertNumberInteger(event.targetMaxHp, `${path}.targetMaxHp`, 1);
  if (event.killed !== undefined) assert(typeof event.killed === "boolean", `${path}.killed 값이 boolean이 아닙니다.`);
}

function validateCombatantHpSnapshot(snapshot, path) {
  assert(snapshot && typeof snapshot === "object" && !Array.isArray(snapshot), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof snapshot.id === "string" && snapshot.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof snapshot.name === "string" && snapshot.name.length > 0, `${path}.name 값이 없습니다.`);
  assertNumberInteger(snapshot.slot, `${path}.slot`, 1);
  assertNumberInteger(snapshot.maxHp, `${path}.maxHp`, 1);
  assertNumberInteger(snapshot.remainingHp, `${path}.remainingHp`, 0);
  assert(snapshot.remainingHp <= snapshot.maxHp, `${path}.remainingHp 값이 maxHp보다 클 수 없습니다.`);
}

function validateEnemyDefeatEntry(entry, path) {
  assert(entry && typeof entry === "object" && !Array.isArray(entry), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof entry.id === "string" && entry.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof entry.name === "string" && entry.name.length > 0, `${path}.name 값이 없습니다.`);
  assertNumberInteger(entry.slot, `${path}.slot`, 1);
  assertNumberInteger(entry.sequence, `${path}.sequence`, 1);
  nonNegativeNumber(entry.time, `${path}.time`);
}

function validateBattleReport(report, path) {
  if (report === null) return;
  assert(report && typeof report === "object" && !Array.isArray(report), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof report.id === "string" && report.id.length > 0, `${path}.id 값이 없습니다.`);
  assertNumberInteger(report.stage, `${path}.stage`, 1);
  assert(typeof report.stageName === "string" && report.stageName.length > 0, `${path}.stageName 값이 없습니다.`);
  assert(typeof report.enemyName === "string" && report.enemyName.length > 0, `${path}.enemyName 값이 없습니다.`);
  assert(["win", "loss", "timeout"].includes(report.result), `${path}.result 값이 올바르지 않습니다: ${report.result}`);
  assert(typeof report.resultReason === "string" && report.resultReason.length > 0, `${path}.resultReason 값이 없습니다.`);
  nonNegativeNumber(report.durationSeconds, `${path}.durationSeconds`);
  assertNumberInteger(report.partyRemainingHp, `${path}.partyRemainingHp`, 0);
  assertNumberInteger(report.enemyRemainingHp, `${path}.enemyRemainingHp`, 0);
  assert(Array.isArray(report.partyHp), `${path}.partyHp 데이터가 배열이 아닙니다.`);
  report.partyHp.forEach((snapshot, index) => validateCombatantHpSnapshot(snapshot, `${path}.partyHp[${index}]`));
  assert(Array.isArray(report.enemyHp), `${path}.enemyHp 데이터가 배열이 아닙니다.`);
  report.enemyHp.forEach((snapshot, index) => validateCombatantHpSnapshot(snapshot, `${path}.enemyHp[${index}]`));
  assert(Array.isArray(report.enemyDefeatOrder), `${path}.enemyDefeatOrder 데이터가 배열이 아닙니다.`);
  report.enemyDefeatOrder.forEach((entry, index) => validateEnemyDefeatEntry(entry, `${path}.enemyDefeatOrder[${index}]`));
  assert(Array.isArray(report.events), `${path}.events 데이터가 배열이 아닙니다.`);
  report.events.forEach((event, index) => validateCombatEvent(event, `${path}.events[${index}]`));
}

function validatePendingReward(pendingReward, path) {
  assert(pendingReward && typeof pendingReward === "object" && !Array.isArray(pendingReward), `${path} 데이터가 객체가 아닙니다.`);
  for (const key of ["money", "trainingExp", "diamonds", "realEstateCash", "researchPoints", "battles", "wins", "losses"]) {
    assertNumberInteger(pendingReward[key], `${path}.${key}`, 0);
  }
  assertNumberInteger(pendingReward.startedAt, `${path}.startedAt`, 0);
  assertNumberInteger(pendingReward.updatedAt, `${path}.updatedAt`, 0);
  assert(pendingReward.fromStage === null || Number.isInteger(Number(pendingReward.fromStage)), `${path}.fromStage 값이 올바르지 않습니다.`);
  assert(pendingReward.toStage === null || Number.isInteger(Number(pendingReward.toStage)), `${path}.toStage 값이 올바르지 않습니다.`);
  assert(typeof pendingReward.summaryText === "string", `${path}.summaryText 값이 문자열이 아닙니다.`);
  validateBattleReport(pendingReward.lastBattle, `${path}.lastBattle`);
}

function createChapterRun(currentStage, tempExp = 0) {
  const stage = stageCoordinates(currentStage);
  const exp = Math.max(0, Math.floor(finiteNumber(tempExp, "원정대 chapterRun.tempExp 값이 올바르지 않습니다.")));
  const expPerLevel = finiteNumber(expeditionBalance.chapterRunExpPerLevel, "expedition_balance.json chapterRunExpPerLevel 값이 올바르지 않습니다.");
  return {
    chapter: stage.chapter,
    tempLevel: Math.max(1, Math.floor(exp / expPerLevel) + 1),
    tempExp: exp,
    boostMultiplier: Math.round((1 + Math.max(0, Math.floor(exp / expPerLevel)) * 0.01) * 1000) / 1000,
  };
}

export function createDefaultExpeditionState(createdAt = now()) {
  return {
    members: [],
    partyMemberIds: [],
    currentStage: 1,
    highestStage: 0,
    claimedBossStages: [],
    trainingExp: 0,
    chapterRun: createChapterRun(1, 0),
    lastResolvedAt: createdAt,
    pendingReward: createEmptyPendingReward(createdAt),
    dispatch: createEmptyDispatchState(),
    research: createEmptyResearchState(),
    log: [],
    stageIndex: 0,
    clearedStageCount: 0,
    lastStageId: null,
  };
}

function validatePromotionId(id, path) {
  assert(typeof id === "string" && promotionById.has(id), `${path} 값이 지원하지 않는 승급 단계입니다: ${id}`);
}

function validateExpeditionMember(member, path) {
  assert(member && typeof member === "object" && !Array.isArray(member), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof member.id === "string" && member.id.length > 0, `${path}.id 값이 없습니다.`);
  assert(typeof member.sourceKey === "string" && member.sourceKey.length > 0, `${path}.sourceKey 값이 없습니다.`);
  assertNumberInteger(member.sourceRunNumber, `${path}.sourceRunNumber`, 0);
  assert(typeof member.sourceCareerId === "string" && careerById.has(member.sourceCareerId), `${path}.sourceCareerId 값이 올바르지 않습니다: ${member.sourceCareerId}`);
  assert(typeof member.careerName === "string" && member.careerName.length > 0, `${path}.careerName 값이 없습니다.`);
  assert(typeof member.sourceUniversity === "string" && member.sourceUniversity.length > 0, `${path}.sourceUniversity 값이 없습니다.`);
  assertNumberInteger(member.level, `${path}.level`, 1);
  assertNumberInteger(member.exp, `${path}.exp`, 0);
  validatePromotionId(member.promotionTier, `${path}.promotionTier`);
  statMap(member.baseStats, `${path}.baseStats`);
  assert(typeof member.locked === "boolean", `${path}.locked 값이 boolean이 아닙니다.`);
  assertNumberInteger(member.createdAt, `${path}.createdAt`, 0);
  assert(member.avatarGender === "male" || member.avatarGender === "female", `${path}.avatarGender 값이 올바르지 않습니다: ${member.avatarGender}`);
}

function assertNumberInteger(value, path, min) {
  const number = finiteNumber(value, `${path} 값이 올바르지 않습니다.`);
  assert(Number.isInteger(number), `${path} 값은 정수여야 합니다.`);
  assert(number >= min, `${path} 값은 ${min} 이상이어야 합니다.`);
}

function validateLogEntry(entry, path) {
  assert(entry && typeof entry === "object" && !Array.isArray(entry), `${path} 데이터가 객체가 아닙니다.`);
  assert(typeof entry.id === "string" && entry.id.length > 0, `${path}.id 값이 없습니다.`);
  assertNumberInteger(entry.time, `${path}.time`, 0);
  assert(typeof entry.text === "string" && entry.text.length > 0, `${path}.text 값이 없습니다.`);
  assert(typeof entry.tone === "string" && entry.tone.length > 0, `${path}.tone 값이 없습니다.`);
}

export function validateExpeditionState(expedition, path = "save.expedition") {
  assert(expedition && typeof expedition === "object" && !Array.isArray(expedition), `${path} 데이터가 객체가 아닙니다.`);
  assert(Array.isArray(expedition.members), `${path}.members 데이터가 배열이 아닙니다.`);
  expedition.members.forEach((member, index) => validateExpeditionMember(member, `${path}.members[${index}]`));
  const memberIds = new Set(expedition.members.map((member) => member.id));
  assert(memberIds.size === expedition.members.length, `${path}.members id가 중복되었습니다.`);

  assert(Array.isArray(expedition.partyMemberIds), `${path}.partyMemberIds 데이터가 배열이 아닙니다.`);
  assert(expedition.partyMemberIds.length <= expeditionPartySize, `${path}.partyMemberIds 편성 수가 파티 크기를 초과했습니다.`);
  const partyUnique = new Set(expedition.partyMemberIds);
  assert(partyUnique.size === expedition.partyMemberIds.length, `${path}.partyMemberIds 값이 중복되었습니다.`);
  for (const id of expedition.partyMemberIds) {
    assert(typeof id === "string" && memberIds.has(id), `${path}.partyMemberIds에서 원정대원을 찾을 수 없습니다: ${id}`);
  }

  assertNumberInteger(expedition.currentStage, `${path}.currentStage`, 1);
  assert(Number(expedition.currentStage) <= expeditionBalance.maxStage, `${path}.currentStage 값이 최대 Stage를 초과했습니다.`);
  assertNumberInteger(expedition.highestStage, `${path}.highestStage`, 0);
  assert(Number(expedition.highestStage) <= expeditionBalance.maxStage, `${path}.highestStage 값이 최대 Stage를 초과했습니다.`);
  assert(Array.isArray(expedition.claimedBossStages), `${path}.claimedBossStages 데이터가 배열이 아닙니다.`);
  for (const stage of expedition.claimedBossStages) assertNumberInteger(stage, `${path}.claimedBossStages[]`, 1);
  assertNumberInteger(expedition.trainingExp, `${path}.trainingExp`, 0);
  assert(expedition.chapterRun && typeof expedition.chapterRun === "object", `${path}.chapterRun 데이터가 객체가 아닙니다.`);
  assertNumberInteger(expedition.chapterRun.chapter, `${path}.chapterRun.chapter`, 1);
  assertNumberInteger(expedition.chapterRun.tempLevel, `${path}.chapterRun.tempLevel`, 1);
  assertNumberInteger(expedition.chapterRun.tempExp, `${path}.chapterRun.tempExp`, 0);
  finiteNumber(expedition.chapterRun.boostMultiplier, `${path}.chapterRun.boostMultiplier 값이 올바르지 않습니다.`);
  assertNumberInteger(expedition.lastResolvedAt, `${path}.lastResolvedAt`, 0);
  validatePendingReward(expedition.pendingReward, `${path}.pendingReward`);
  validateDispatchState(expedition.dispatch, `${path}.dispatch`, memberIds);
  validateResearchState(expedition.research, `${path}.research`);
  assert(Array.isArray(expedition.log), `${path}.log 데이터가 배열이 아닙니다.`);
  expedition.log.forEach((entry, index) => validateLogEntry(entry, `${path}.log[${index}]`));

  assertNumberInteger(expedition.stageIndex, `${path}.stageIndex`, 0);
  assertNumberInteger(expedition.clearedStageCount, `${path}.clearedStageCount`, 0);
  assert(Number(expedition.stageIndex) === Number(expedition.currentStage) - 1, `${path}.stageIndex 값이 currentStage와 일치하지 않습니다: ${expedition.stageIndex} !== ${Number(expedition.currentStage) - 1}`);
  assert(Number(expedition.clearedStageCount) === Number(expedition.highestStage), `${path}.clearedStageCount 값이 highestStage와 일치하지 않습니다.`);
  assert(expedition.lastStageId === null || typeof expedition.lastStageId === "string", `${path}.lastStageId 값이 올바르지 않습니다.`);
}

function lastStageIdForAliases(expedition) {
  const lastStageId = requireOwn(expedition, "lastStageId", "save.expedition");
  assert(lastStageId === null || typeof lastStageId === "string", "save.expedition.lastStageId 값이 올바르지 않습니다.");
  return lastStageId;
}

function expeditionAliases(expedition, lastStageId) {
  const resolvedLastStageId = arguments.length >= 2 ? lastStageId : lastStageIdForAliases(expedition);
  assert(resolvedLastStageId === null || typeof resolvedLastStageId === "string", "save.expedition.lastStageId 값이 올바르지 않습니다.");
  return {
    ...expedition,
    stageIndex: Number(expedition.currentStage) - 1,
    clearedStageCount: Number(expedition.highestStage),
    lastStageId: resolvedLastStageId,
  };
}

function stageCoordinates(currentStage) {
  const globalStage = clamp(Math.floor(finiteNumber(currentStage, "원정대 currentStage 값이 올바르지 않습니다.")), 1, expeditionBalance.maxStage);
  const chapterSize = finiteNumber(expeditionBalance.chapterSize, "expedition_balance.json chapterSize 값이 올바르지 않습니다.");
  const segmentSize = finiteNumber(expeditionBalance.segmentSize, "expedition_balance.json segmentSize 값이 올바르지 않습니다.");
  const chapter = Math.floor((globalStage - 1) / chapterSize) + 1;
  const stageInChapter = ((globalStage - 1) % chapterSize) + 1;
  const segmentInChapter = Math.floor((stageInChapter - 1) / segmentSize) + 1;
  const stageInSegment = ((stageInChapter - 1) % segmentSize) + 1;
  const microStep = Math.floor((stageInSegment - 1) / 10) + 1;
  const isChapterBoss = stageInChapter === chapterSize;
  const isMidBoss = !isChapterBoss && stageInSegment === segmentSize;
  return {
    globalStage,
    chapter,
    stageInChapter,
    segmentInChapter,
    stageInSegment,
    microStep,
    isMidBoss,
    isChapterBoss,
    isBoss: isMidBoss || isChapterBoss,
  };
}

function uniqueSubjects(...groups) {
  const values = [];
  for (const group of groups) {
    assert(Array.isArray(group), "원정대 subject 그룹이 배열이 아닙니다.");
    for (const subject of group) {
      assert(subjectLabels[subject], `원정대 subject 라벨 누락: ${subject}`);
      if (!values.includes(subject)) values.push(subject);
    }
  }
  return values;
}

function withoutSubjects(subjects, remove) {
  return subjects.filter((subject) => !remove.includes(subject));
}

function combatEnemyConfigForSource(sourceId, isBoss) {
  assert(typeof sourceId === "string" && sourceId.length > 0, "원정대 enemy sourceId 값이 없습니다.");
  const root = isBoss ? expeditionCombatBalance.enemyStats?.bosses : expeditionCombatBalance.enemyStats?.segments;
  assert(root && typeof root === "object" && !Array.isArray(root), "expedition_combat_balance.json enemyStats 데이터가 올바르지 않습니다.");
  const config = root[sourceId];
  assert(config && typeof config === "object" && !Array.isArray(config), `expedition_combat_balance.json enemyStats 누락: ${sourceId}`);
  assert(Array.isArray(config.enemies) && config.enemies.length > 0, `expedition_combat_balance.json enemies가 비어 있습니다: ${sourceId}`);
  return config;
}

export function createStageView(currentStage) {
  assert(expeditionSegments.length > 0, "expedition_stages.json이 비어 있어 원정대를 표시할 수 없습니다.");
  assert(expeditionBosses.length > 0, "expedition_bosses.json이 비어 있어 보스 Stage를 표시할 수 없습니다.");
  const coords = stageCoordinates(currentStage);
  const chapter = chapterByNumber.get(coords.chapter);
  assert(chapter, `expedition_chapters.json에서 챕터를 찾을 수 없습니다: ${coords.chapter}`);
  const segment = segmentByKey.get(`${coords.chapter}:${coords.segmentInChapter}`);
  assert(segment, `expedition_stages.json에서 세그먼트를 찾을 수 없습니다: ${coords.chapter}:${coords.segmentInChapter}`);
  const boss = coords.isChapterBoss ? chapterBossByChapter.get(coords.chapter) : coords.isMidBoss ? midBossByKey.get(`${coords.chapter}:${coords.segmentInChapter}`) : null;
  if (coords.isBoss) assert(boss, `expedition_bosses.json에서 보스를 찾을 수 없습니다: ${coords.chapter}:${coords.segmentInChapter}`);
  const source = boss || segment;
  const enemyConfig = combatEnemyConfigForSource(source.id, Boolean(boss));
  const weakSubjects = uniqueSubjects(chapter.weakSubjects, source.weakSubjects);
  const resistSubjects = withoutSubjects(uniqueSubjects(chapter.resistSubjects, source.resistSubjects), weakSubjects);
  const enemyNames = enemyConfig.enemies.map((enemy) => {
    assert(enemy && typeof enemy === "object" && typeof enemy.name === "string" && enemy.name.length > 0, `expedition_combat_balance.json enemy name 누락: ${source.id}`);
    return enemy.name;
  });
  const enemyCount = enemyNames.length;
  const enemyAsset = boss ? boss.bossAsset : segment.enemyAsset;
  assert(enemyAsset, `원정대 적 asset이 비어 있습니다: ${source.id}`);
  const enemyAssets = boss ? [enemyAsset] : segment.enemyAssets;
  assert(Array.isArray(enemyAssets), `원정대 stage enemyAssets 누락: ${source.id}`);
  assert(enemyAssets.length === enemyCount, `원정대 stage enemyAssets 수가 전투 몬스터 수와 다릅니다: ${source.id}`);
  enemyAssets.forEach((asset, index) => {
    assert(typeof asset === "string" && asset.length > 0, `원정대 stage enemyAssets[${index}] 값이 비어 있습니다: ${source.id}`);
  });
  const variantMatch = String(enemyAsset).match(/-(?:mob|boss)-(\d+)$/);
  const enemyVariant = Number(variantMatch?.[1] ?? segment.enemyVariant);

  return {
    ...coords,
    id: `${chapter.id}:${source.id}`,
    sourceId: source.id,
    name: source.name,
    enemyName: enemyNames[0],
    normalEnemyNames: enemyNames,
    enemyCount,
    enemyAsset,
    enemyAssets,
    enemyVariant,
    chapterName: chapter.name,
    chapterSubtitle: chapter.subtitle,
    backdropClass: chapter.backdropClass,
    segmentName: segment.name,
    focusSubjects: uniqueSubjects(chapter.focusSubjects, source.focusSubjects),
    weakSubjects,
    resistSubjects,
    difficultyMultiplier: Math.round(finiteNumber(chapter.difficultyMultiplier, `expedition_chapters.json difficultyMultiplier 값이 올바르지 않습니다: ${chapter.id}`) * finiteNumber(source.difficultyMultiplier, `원정대 difficultyMultiplier 값이 올바르지 않습니다: ${source.id}`) * 1000) / 1000,
    description: boss ? source.description : `${chapter.subtitle} · ${segment.description}`,
    progressPercent: Math.max(0, Math.min(100, Math.round((coords.stageInChapter / expeditionBalance.chapterSize) * 100))),
    nextBossStageCount: coords.isBoss ? 0 : expeditionBalance.segmentSize - coords.stageInSegment,
  };
}

function stageStartForBoss(currentStage) {
  const coords = stageCoordinates(currentStage);
  if (!coords.isBoss) return coords.globalStage;
  const chapterBase = (coords.chapter - 1) * expeditionBalance.chapterSize;
  const segmentBase = Math.floor((coords.stageInChapter - 1) / expeditionBalance.segmentSize) * expeditionBalance.segmentSize;
  return chapterBase + segmentBase + 1;
}

function promotionMultiplier(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  return finiteNumber(promotion.combatMultiplier, `expedition_promotions.json combatMultiplier 값이 올바르지 않습니다: ${promotionId}`);
}

export function promotionName(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  return promotion.name;
}

function nextPromotionId(promotionId) {
  const promotion = promotionById.get(promotionId);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${promotionId}`);
  const next = promotionByOrder.get(Number(promotion.order) + 1);
  return next ? next.id : null;
}

export function expeditionLevelCost(member) {
  validateExpeditionMember(member, "원정대원");
  const configured = levelByLevel.get(Number(member.level));
  if (configured) return finiteNumber(configured.expCost, `expedition_unit_levels.json expCost 값이 올바르지 않습니다: ${member.level}`);
  const lastLevel = expeditionLevels.at(-1);
  assert(lastLevel, "expedition_unit_levels.json이 비어 있습니다.");
  const extraLevels = Math.max(0, Number(member.level) - Number(lastLevel.level));
  return Math.round(finiteNumber(lastLevel.expCost, "expedition_unit_levels.json 마지막 expCost 값이 올바르지 않습니다.") * 1.12 ** extraLevels);
}

function memberCombatStats(member) {
  validateExpeditionMember(member, "원정대원");
  const tierMultiplier = promotionMultiplier(member.promotionTier);
  const levelMultiplier = 1 + Math.max(0, Number(member.level) - 1) * 0.04;
  return Object.fromEntries(subjectIds.map((subject) => [subject, finiteNumber(member.baseStats[subject], `원정대원 baseStats.${subject} 값이 올바르지 않습니다.`) * tierMultiplier * levelMultiplier]));
}

function careerCombatConfig(careerId) {
  const config = expeditionCombatBalance.careerStats?.[careerId];
  assert(config && typeof config === "object" && !Array.isArray(config), `expedition_combat_balance.json careerStats 누락: ${careerId}`);
  assert(expeditionRoleIds.includes(config.role), `expedition_combat_balance.json role 값이 올바르지 않습니다: ${careerId}/${config.role}`);
  for (const key of combatStatIds) {
    const value = finiteNumber(config[key], `expedition_combat_balance.json ${careerId}.${key} 값이 올바르지 않습니다.`);
    if (key === "attackSpeed") assert(value > 0, `expedition_combat_balance.json ${careerId}.attackSpeed 값은 0보다 커야 합니다.`);
    else assert(value >= 0, `expedition_combat_balance.json ${careerId}.${key} 값은 0 이상이어야 합니다.`);
  }
  assert(config.levelGrowth && typeof config.levelGrowth === "object", `expedition_combat_balance.json ${careerId}.levelGrowth 값이 없습니다.`);
  return config;
}

function roleLabel(role) {
  const label = expeditionCombatBalance.roleLabels?.[role];
  assert(typeof label === "string" && label.length > 0, `expedition_combat_balance.json roleLabels 누락: ${role}`);
  return label;
}

function emptyResearchEffects() {
  return {
    partyPowerPercent: 0,
    combatStatPercent: Object.fromEntries(combatStatIds.map((stat) => [stat, 0])),
    roleCombatStatPercent: Object.fromEntries(expeditionRoleIds.map((role) => [role, Object.fromEntries(combatStatIds.map((stat) => [stat, 0]))])),
    stageRewardPercent: {
      trainingExp: 0,
      realEstateCash: 0,
    },
    researchPointDropFlat: {
      mid: 0,
      chapter: 0,
    },
  };
}

export function expeditionResearchEffects(expedition) {
  assertObject(expedition, "save.expedition");
  const research = normalizeResearchState(expedition.research);
  validateResearchState(research, "save.expedition.research");
  const effects = emptyResearchEffects();
  for (const nodeId of research.unlockedNodeIds) {
    const node = researchNodeById.get(nodeId);
    assert(node, `원정대 연구 노드를 찾을 수 없습니다: ${nodeId}`);
    for (const effect of node.effects) {
      const value = nonNegativeNumber(effect.value, `expedition_research.json ${nodeId}.${effect.type}.value`);
      if (effect.type === "partyPowerPercent") {
        effects.partyPowerPercent += value;
      } else if (effect.type === "combatStatPercent") {
        effects.combatStatPercent[effect.stat] += value;
      } else if (effect.type === "roleCombatStatPercent") {
        effects.roleCombatStatPercent[effect.role][effect.stat] += value;
      } else if (effect.type === "stageRewardPercent") {
        effects.stageRewardPercent[effect.reward] += value;
      } else if (effect.type === "researchPointDropFlat") {
        const amount = Math.max(0, Math.floor(value));
        if (effect.bossType === "all") {
          effects.researchPointDropFlat.mid += amount;
          effects.researchPointDropFlat.chapter += amount;
        } else {
          effects.researchPointDropFlat[effect.bossType] += amount;
        }
      }
    }
  }
  effects.partyPowerPercent = Math.min(Number(researchConfig.rules.maxTotalCombatBonus), effects.partyPowerPercent);
  return effects;
}

function researchStatMultiplier(effects, role, stat) {
  assert(effects && typeof effects === "object", "원정대 연구 효과 데이터가 없습니다.");
  assert(expeditionRoleIds.includes(role), `원정대 역할 값이 올바르지 않습니다: ${role}`);
  assert(combatStatIds.includes(stat), `원정대 전투 스탯 값이 올바르지 않습니다: ${stat}`);
  return 1 + Number(effects.combatStatPercent[stat] || 0) + Number(effects.roleCombatStatPercent[role]?.[stat] || 0);
}

function researchRewardMultiplier(expedition, rewardId) {
  const effects = expeditionResearchEffects(expedition);
  return 1 + Number(effects.stageRewardPercent[rewardId] || 0);
}

function combatPromotionMultiplier(promotionId) {
  const multiplier = finiteNumber(expeditionCombatBalance.promotionMultipliers?.[promotionId], `expedition_combat_balance.json promotionMultipliers 누락: ${promotionId}`);
  assert(multiplier > 0, `expedition_combat_balance.json promotion multiplier 값은 0보다 커야 합니다: ${promotionId}`);
  return multiplier;
}

function memberRawSubjectPower(member) {
  validateExpeditionMember(member, "원정대원");
  return subjectIds.reduce((sum, subject) => sum + finiteNumber(member.baseStats[subject], `원정대원 baseStats.${subject} 값이 올바르지 않습니다.`), 0);
}

function memberRoleCombatStats(member, expedition = null) {
  const config = careerCombatConfig(member.sourceCareerId);
  const role = config.role;
  const effects = expedition ? expeditionResearchEffects(expedition) : emptyResearchEffects();
  const rawPower = memberRawSubjectPower(member);
  const aptitudeScale = Math.max(0.05, rawPower / 160);
  const promotionScale = combatPromotionMultiplier(member.promotionTier);
  const level = Math.max(1, Number(member.level));
  const growth = config.levelGrowth;
  const scaled = {};
  for (const key of ["hp", "attack", "defense", "healing"]) {
    const base = nonNegativeNumber(config[key], `expedition_combat_balance.json ${member.sourceCareerId}.${key}`);
    const growthRate = nonNegativeNumber(growth[key] ?? 0, `expedition_combat_balance.json ${member.sourceCareerId}.levelGrowth.${key}`);
    scaled[key] = Math.max(key === "defense" || key === "healing" ? 0 : 1, Math.round(base * aptitudeScale * promotionScale * (1 + (level - 1) * growthRate) * researchStatMultiplier(effects, role, key)));
  }
  const speedGrowth = nonNegativeNumber(growth.attackSpeed ?? 0, `expedition_combat_balance.json ${member.sourceCareerId}.levelGrowth.attackSpeed`);
  scaled.attackSpeed = roundTo(positiveNumber(config.attackSpeed, `expedition_combat_balance.json ${member.sourceCareerId}.attackSpeed`) + (level - 1) * speedGrowth, 3);
  return {
    role,
    roleLabel: roleLabel(role),
    ...scaled,
  };
}

function memberPower(member) {
  const stats = memberCombatStats(member);
  return subjectIds.reduce((sum, subject) => sum + stats[subject], 0);
}

function partyMembers(expedition) {
  validateExpeditionState(expedition, "save.expedition");
  return expedition.partyMemberIds.map((id) => {
    const member = expedition.members.find((candidate) => candidate.id === id);
    assert(member, `원정대 편성 대원을 찾을 수 없습니다: ${id}`);
    return member;
  });
}

function partyPowerForStage(expedition, stageView) {
  const stats = blankStats();
  for (const member of partyMembers(expedition)) addStats(stats, memberCombatStats(member));
  const boost = finiteNumber(expedition.chapterRun.boostMultiplier, "save.expedition.chapterRun.boostMultiplier 값이 올바르지 않습니다.");
  const researchMultiplier = 1 + expeditionResearchEffects(expedition).partyPowerPercent;
  return subjectIds.reduce((sum, subject) => {
    let multiplier = 1;
    if (stageView.focusSubjects.includes(subject)) multiplier *= expeditionBalance.focusMultiplier;
    if (stageView.weakSubjects.includes(subject)) multiplier *= expeditionBalance.weakMultiplier;
    if (stageView.resistSubjects.includes(subject)) multiplier *= expeditionBalance.resistMultiplier;
    return sum + stats[subject] * multiplier;
  }, 0) * boost * researchMultiplier;
}

function requiredPowerForStage(currentStage) {
  const stageView = createStageView(currentStage);
  const bossMultiplier = stageView.isChapterBoss ? expeditionBalance.chapterBossPowerMultiplier : stageView.isMidBoss ? expeditionBalance.midBossPowerMultiplier : 1;
  const value =
    expeditionBalance.baseRequiredPower *
    expeditionBalance.chapterPowerGrowth ** (stageView.chapter - 1) *
    expeditionBalance.segmentPowerGrowth ** (stageView.segmentInChapter - 1) *
    expeditionBalance.stagePowerGrowth ** (stageView.stageInSegment - 1) *
    stageView.difficultyMultiplier *
    bossMultiplier;
  return Math.round(value * 10) / 10;
}

export function expeditionStageExpReward(currentStage) {
  const stageView = createStageView(currentStage);
  const bossMultiplier = stageView.isChapterBoss ? 8 : stageView.isMidBoss ? 4 : 1;
  const reward = (5 + stageView.chapter * 2 + stageView.segmentInChapter) * bossMultiplier * stageView.difficultyMultiplier;
  return Math.max(1, Math.round(reward));
}

function expeditionMoneyReward(currentStage) {
  createStageView(currentStage);
  return 0;
}

function battleDurationSeconds(stageView) {
  const timing = expeditionCombatBalance.timing;
  assert(timing && typeof timing === "object", "expedition_combat_balance.json timing 값이 없습니다.");
  if (stageView.isChapterBoss) return positiveNumber(timing.chapterBossSeconds, "expedition_combat_balance.json timing.chapterBossSeconds");
  if (stageView.isMidBoss) return positiveNumber(timing.midBossSeconds, "expedition_combat_balance.json timing.midBossSeconds");
  return positiveNumber(timing.normalSeconds, "expedition_combat_balance.json timing.normalSeconds");
}

function enemyCombatantsForStage(stageView) {
  const config = combatEnemyConfigForSource(stageView.sourceId, stageView.isBoss);
  return config.enemies.map((enemy, index) => {
    assert(enemy && typeof enemy === "object" && !Array.isArray(enemy), `expedition_combat_balance.json enemy 데이터가 객체가 아닙니다: ${stageView.sourceId}[${index}]`);
    const hp = Math.round(positiveNumber(enemy.hp, `expedition_combat_balance.json ${stageView.sourceId}.enemies[${index}].hp`));
    return {
      id: enemy.id || `${stageView.sourceId}-enemy-${index + 1}`,
      name: enemy.name,
      side: "enemy",
      slot: index + 1,
      maxHp: hp,
      hp,
      attack: Math.round(positiveNumber(enemy.attack, `expedition_combat_balance.json ${stageView.sourceId}.enemies[${index}].attack`)),
      defense: Math.round(nonNegativeNumber(enemy.defense, `expedition_combat_balance.json ${stageView.sourceId}.enemies[${index}].defense`)),
      attackSpeed: positiveNumber(enemy.attackSpeed, `expedition_combat_balance.json ${stageView.sourceId}.enemies[${index}].attackSpeed`),
      nextAt: roundTo(1 / positiveNumber(enemy.attackSpeed, `expedition_combat_balance.json ${stageView.sourceId}.enemies[${index}].attackSpeed`), 4),
    };
  });
}

function partyCombatantsForExpedition(expedition, stageView) {
  return partyMembers(expedition).map((member, index) => {
    const roleStats = memberRoleCombatStats(member, expedition);
    return {
      id: member.id,
      name: member.careerName,
      side: "ally",
      slot: index + 1,
      role: roleStats.role,
      roleLabel: roleStats.roleLabel,
      maxHp: roleStats.hp,
      hp: roleStats.hp,
      attack: roleStats.attack,
      defense: roleStats.defense,
      healing: roleStats.healing,
      attackSpeed: roleStats.attackSpeed,
      nextAt: roundTo(1 / roleStats.attackSpeed, 4),
      stagePower: Math.round(partyPowerForStage({ ...createDefaultExpeditionState(), members: [member], partyMemberIds: [member.id], currentStage: stageView.globalStage, highestStage: 0, claimedBossStages: [], trainingExp: 0, chapterRun: createChapterRun(stageView.globalStage, 0), lastResolvedAt: now(), pendingReward: createEmptyPendingReward(now()), research: normalizeResearchState(expedition.research), log: [], stageIndex: stageView.globalStage - 1, clearedStageCount: 0, lastStageId: null }, stageView)),
    };
  });
}

function firstAlive(list) {
  return list.find((item) => item.hp > 0) || null;
}

function firstInjuredAlly(allies) {
  return allies.find((ally) => ally.hp > 0 && ally.hp < ally.maxHp) || null;
}

function remainingHp(list) {
  return Math.max(0, Math.round(list.reduce((sum, item) => sum + Math.max(0, item.hp), 0)));
}

function battleResultReason(result) {
  if (result === "win") return "적 전멸";
  if (result === "loss") return "전멸";
  return "시간초과";
}

function combatantHpSnapshot(combatant) {
  const snapshot = {
    id: combatant.id,
    name: combatant.name,
    slot: combatant.slot,
    maxHp: Math.max(1, Math.round(combatant.maxHp)),
    remainingHp: Math.max(0, Math.round(combatant.hp)),
  };
  if (combatant.role) {
    snapshot.role = combatant.role;
    snapshot.roleLabel = combatant.roleLabel;
  }
  return snapshot;
}

function actionEvent(time, actor, target, kind, value, hpBefore, hpAfter, sequence) {
  const killed = kind === "damage" && hpBefore > 0 && hpAfter <= 0;
  const finishLabel = killed ? target.side === "ally" ? "전투불능" : "처치" : "";
  const text = kind === "heal"
    ? `${actor.name} → ${target.name} 회복 ${value}`
    : `${actor.name} → ${target.name} 피해 ${value}${finishLabel ? ` · ${finishLabel}` : ""}`;
  return {
    sequence,
    time: roundTo(time, 2),
    actorId: actor.id,
    actor: actor.name,
    actorLabel: actor.name,
    actorSide: actor.side,
    actorSlot: actor.slot,
    actorRole: actor.role || null,
    targetId: target.id,
    target: target.name,
    targetLabel: target.name,
    targetSide: target.side,
    targetSlot: target.slot,
    targetRole: target.role || null,
    targetHpBefore: Math.max(0, Math.round(hpBefore)),
    targetHpAfter: Math.max(0, Math.round(hpAfter)),
    targetMaxHp: Math.max(1, Math.round(target.maxHp)),
    kind,
    value,
    killed,
    text,
  };
}

function buildBattleReport(stageView, result, durationSeconds, party, enemies, events, actionCounts) {
  const roundedDuration = roundTo(durationSeconds, 2);
  const defeatOrder = events
    .filter((event) => event.killed && event.targetSide === "enemy")
    .map((event) => ({
      id: event.targetId,
      name: event.targetLabel || event.target,
      slot: event.targetSlot,
      sequence: event.sequence,
      time: event.time,
    }));
  return {
    id: `${stageView.globalStage}-${result}-${Math.round(roundedDuration * 1000)}-${events.length}`,
    stage: stageView.globalStage,
    stageId: stageView.id,
    stageName: stageView.name,
    enemyName: stageView.enemyName,
    result,
    resultReason: battleResultReason(result),
    durationSeconds: roundedDuration,
    partyRemainingHp: remainingHp(party),
    enemyRemainingHp: remainingHp(enemies),
    partyHp: party.map(combatantHpSnapshot),
    enemyHp: enemies.map(combatantHpSnapshot),
    enemyDefeatOrder: defeatOrder,
    events: events.slice(-160),
    actionCounts,
  };
}

export function simulateExpeditionBattle(state, currentStage = null) {
  const expedition = state?.expedition ? state.expedition : state;
  validateExpeditionState(expedition, "save.expedition");
  assert(expedition.partyMemberIds.length > 0, "원정대에 편성된 대원이 없어 전투를 시뮬레이션할 수 없습니다.");
  const stageView = createStageView(currentStage || expedition.currentStage);
  const party = partyCombatantsForExpedition(expedition, stageView);
  const enemies = enemyCombatantsForStage(stageView);
  const limitSeconds = battleDurationSeconds(stageView);
  const events = [];
  const actionCounts = { allies: {}, enemies: {} };
  let result = "timeout";
  let clock = 0;

  while (clock <= limitSeconds && firstAlive(party) && firstAlive(enemies)) {
    const aliveActors = [
      ...party.filter((actor) => actor.hp > 0).map((actor) => ({ side: "ally", actor })),
      ...enemies.filter((actor) => actor.hp > 0).map((actor) => ({ side: "enemy", actor })),
    ];
    const nextAt = Math.min(...aliveActors.map((item) => item.actor.nextAt));
    if (!Number.isFinite(nextAt) || nextAt > limitSeconds) break;
    clock = nextAt;
    const acting = aliveActors
      .filter((item) => Math.abs(item.actor.nextAt - nextAt) < 0.0001)
      .sort((a, b) => (a.side === b.side ? a.actor.slot - b.actor.slot : a.side === "ally" ? -1 : 1));

    for (const item of acting) {
      const actor = item.actor;
      if (actor.hp <= 0) continue;
      if (item.side === "ally") {
        actionCounts.allies[actor.id] = (actionCounts.allies[actor.id] || 0) + 1;
        if (actor.role === "healer") {
          const target = firstInjuredAlly(party);
          if (target && actor.healing > 0) {
            const hpBefore = target.hp;
            const value = Math.min(target.maxHp - target.hp, Math.max(1, Math.round(actor.healing)));
            target.hp += value;
            events.push(actionEvent(clock, actor, target, "heal", value, hpBefore, target.hp, events.length + 1));
          }
        } else {
          const target = firstAlive(enemies);
          if (target) {
            const hpBefore = target.hp;
            const value = Math.max(1, Math.round(actor.attack - target.defense * 0.6));
            target.hp = Math.max(0, target.hp - value);
            events.push(actionEvent(clock, actor, target, "damage", value, hpBefore, target.hp, events.length + 1));
          }
        }
      } else {
        actionCounts.enemies[actor.id] = (actionCounts.enemies[actor.id] || 0) + 1;
        const target = firstAlive(party);
        if (target) {
          const hpBefore = target.hp;
          const value = Math.max(1, Math.round(actor.attack - target.defense * 0.55));
          target.hp = Math.max(0, target.hp - value);
          events.push(actionEvent(clock, actor, target, "damage", value, hpBefore, target.hp, events.length + 1));
        }
      }
      actor.nextAt = roundTo(actor.nextAt + 1 / actor.attackSpeed, 4);
      if (!firstAlive(enemies)) {
        result = "win";
        break;
      }
      if (!firstAlive(party)) {
        result = "loss";
        break;
      }
    }
    if (result === "win" || result === "loss") break;
  }

  if (result === "timeout" && !firstAlive(enemies)) result = "win";
  if (result === "timeout" && !firstAlive(party)) result = "loss";

  return {
    stage: stageView,
    won: result === "win",
    result,
    durationSeconds: result === "timeout" ? limitSeconds : clock,
    party: party.map(({ nextAt, ...actor }) => actor),
    enemies: enemies.map(({ nextAt, ...enemy }) => enemy),
    events,
    actionCounts,
    report: buildBattleReport(stageView, result, result === "timeout" ? limitSeconds : clock, party, enemies, events, actionCounts),
  };
}

function createBaseStatsFromRawStats(rawStats, careerId, powerMultiplier, path) {
  const career = careerById.get(careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
  assert(career.statWeights && typeof career.statWeights === "object", `careers.json statWeights 값이 없습니다: ${careerId}`);
  const stats = statMap(rawStats, path);
  const tier = finiteNumber(career.tier, `careers.json tier 값이 올바르지 않습니다: ${careerId}`);
  const tierFactor = 1 + Math.max(0, 4 - tier) * 0.08;
  const averageWeight = subjectIds.reduce((sum, subject) => sum + finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${careerId}`), 0) / subjectIds.length;
  const multiplier = Math.max(0.25, finiteNumber(powerMultiplier, `원정대 powerMultiplier 값이 올바르지 않습니다: ${careerId}`));
  return Object.fromEntries(subjectIds.map((subject) => {
    const stat = Math.log10(Math.max(0, stats[subject]) + 10) ** 2 * 2.6;
    const weight = finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${careerId}`) / Math.max(0.1, averageWeight);
    return [subject, Math.round(stat * (0.55 + weight * 0.55) * tierFactor * multiplier * 10) / 10];
  }));
}

export function createExpeditionMemberFromCompanion(companion, createdAt = now()) {
  assert(companion && typeof companion === "object" && !Array.isArray(companion), "원정대원 후보 데이터가 객체가 아닙니다.");
  assert(typeof companion.id === "string" && companion.id.length > 0, "원정대원 후보 id 값이 없습니다.");
  assert(typeof companion.careerId === "string" && careerById.has(companion.careerId), `원정대 등록 가능한 직업을 찾을 수 없습니다: ${companion.careerId}`);
  assert(companion.avatarGender === "male" || companion.avatarGender === "female", `원정대원 후보 avatarGender 값이 올바르지 않습니다: ${companion.id}`);
  const career = careerById.get(companion.careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${companion.careerId}`);
  assert(typeof companion.careerName === "string" && companion.careerName.length > 0, `원정대원 후보 careerName 값이 없습니다: ${companion.id}`);
  assert(typeof companion.sourceUniversity === "string" && companion.sourceUniversity.length > 0, `원정대원 후보 sourceUniversity 값이 없습니다: ${companion.id}`);
  assert(hasOwn(companion, "createdRun"), `원정대원 후보 createdRun 값이 없습니다: ${companion.id}`);
  return {
    id: `expedition-member-${companion.id}`,
    sourceKey: `companion:${companion.id}`,
    sourceRunNumber: Math.max(0, Math.floor(finiteNumber(companion.createdRun, `원정대원 후보 createdRun 값이 올바르지 않습니다: ${companion.id}`))),
    sourceCareerId: companion.careerId,
    careerName: companion.careerName,
    sourceUniversity: companion.sourceUniversity,
    level: 1,
    exp: 0,
    promotionTier: "staff",
    baseStats: createBaseStatsFromRawStats(companion.stats, companion.careerId, companion.powerMultiplier, `원정대원 후보 ${companion.id}.stats`),
    locked: false,
    createdAt,
    avatarGender: companion.avatarGender,
  };
}

function createDebugRawStats(career, debugIndex) {
  assert(career && typeof career === "object" && !Array.isArray(career), "DEBUG 원정대 직업 데이터가 객체가 아닙니다.");
  assert(typeof career.id === "string" && careerById.has(career.id), `DEBUG 원정대 직업을 찾을 수 없습니다: ${career.id}`);
  assert(career.statWeights && typeof career.statWeights === "object", `careers.json statWeights 값이 없습니다: ${career.id}`);
  const tier = finiteNumber(career.tier, `careers.json tier 값이 올바르지 않습니다: ${career.id}`);
  const index = Math.max(0, Math.floor(finiteNumber(debugIndex, `DEBUG 원정대 index 값이 올바르지 않습니다: ${debugIndex}`)));
  const base = 1800 + Math.max(0, 5 - tier) * 180 + index * 35;
  return Object.fromEntries(subjectIds.map((subject) => {
    const weight = finiteNumber(career.statWeights[subject], `careers.json statWeights.${subject} 값이 올바르지 않습니다: ${career.id}`);
    return [subject, Math.round(base * (0.74 + weight * 0.32))];
  }));
}

export function createDebugExpeditionMember(career, debugIndex, createdAt = now()) {
  assert(career && typeof career === "object" && !Array.isArray(career), "DEBUG 원정대 직업 데이터가 객체가 아닙니다.");
  assert(typeof career.id === "string" && careerById.has(career.id), `DEBUG 원정대 직업을 찾을 수 없습니다: ${career.id}`);
  assert(typeof career.name === "string" && career.name.length > 0, `careers.json name 값이 없습니다: ${career.id}`);
  const index = Math.max(0, Math.floor(finiteNumber(debugIndex, `DEBUG 원정대 index 값이 올바르지 않습니다: ${debugIndex}`)));
  const timestamp = Math.max(0, Math.floor(finiteNumber(createdAt, `DEBUG 원정대 createdAt 값이 올바르지 않습니다: ${createdAt}`)));
  const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
  return {
    id: `expedition-debug-${timestamp}-${career.id}-${index}`,
    sourceKey: `debug:${timestamp}:${career.id}:${index}`,
    sourceRunNumber: 0,
    sourceCareerId: career.id,
    careerName: career.name,
    sourceUniversity: "디버그 아카데미",
    level: 1,
    exp: 0,
    promotionTier: "staff",
    baseStats: createBaseStatsFromRawStats(createDebugRawStats(career, index), career.id, powerMultiplier, `DEBUG 원정대 ${career.id}.stats`),
    locked: false,
    createdAt: timestamp,
    avatarGender: "male",
  };
}

export function migrateLegacyExpeditionState(expedition, companions = [], createdAt = now()) {
  assertObject(expedition, "legacy expedition");
  assert(Array.isArray(companions), "legacy companions 데이터가 배열이 아닙니다.");
  finiteNumber(createdAt, "legacy expedition createdAt 값이 올바르지 않습니다.");
  const currentStage = Math.max(1, Math.floor(finiteNumber(requireOwn(expedition, "currentStage", "legacy expedition"), "legacy expedition currentStage 값이 올바르지 않습니다.")));
  const highestStage = Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "highestStage", "legacy expedition"), "legacy expedition highestStage 값이 올바르지 않습니다.")));
  const members = requireOwn(expedition, "members", "legacy expedition");
  assert(Array.isArray(members), "legacy expedition.members 데이터가 배열이 아닙니다.");
  const memberBySourceKey = new Map(members.map((member) => [member.sourceKey, member]));
  const rawPartyMemberIds = requireOwn(expedition, "partyMemberIds", "legacy expedition");
  assert(Array.isArray(rawPartyMemberIds), "legacy expedition.partyMemberIds 데이터가 배열이 아닙니다.");
  const partyMemberIds = rawPartyMemberIds
    .map((id) => {
      assert(typeof id === "string" && id.length > 0, `legacy expedition.partyMemberIds 값이 올바르지 않습니다: ${id}`);
      if (members.some((member) => member.id === id)) return id;
      const member = memberBySourceKey.get(`companion:${id}`);
      assert(member, `legacy expedition.partyMemberIds에서 원정대원을 찾을 수 없습니다: ${id}`);
      return member.id;
    })
    .slice(0, expeditionPartySize);
  const migrated = expeditionAliases({
    members,
    partyMemberIds,
    currentStage,
    highestStage,
    claimedBossStages: requireOwn(expedition, "claimedBossStages", "legacy expedition"),
    trainingExp: Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "trainingExp", "legacy expedition"), "legacy expedition trainingExp 값이 올바르지 않습니다."))),
    chapterRun: requireOwn(expedition, "chapterRun", "legacy expedition"),
    lastResolvedAt: Math.max(0, Math.floor(finiteNumber(requireOwn(expedition, "lastResolvedAt", "legacy expedition"), "legacy expedition lastResolvedAt 값이 올바르지 않습니다."))),
    pendingReward: normalizePendingReward(hasOwn(expedition, "pendingReward") ? expedition.pendingReward : null, createdAt),
    dispatch: normalizeDispatchState(hasOwn(expedition, "dispatch") ? expedition.dispatch : null),
    research: normalizeResearchState(hasOwn(expedition, "research") ? expedition.research : null),
    log: requireOwn(expedition, "log", "legacy expedition"),
  }, requireOwn(expedition, "lastStageId", "legacy expedition"));
  validateExpeditionState(migrated, "save.expedition");
  return migrated;
}

export function registerExpeditionMembersFromCompanions(state, companions, { autoParty = true } = {}) {
  assert(Array.isArray(companions), "등록할 원정대원 후보 목록이 배열이 아닙니다.");
  const next = cloneState(state);
  validateExpeditionState(next.expedition, "save.expedition");
  const existingSourceKeys = new Set(next.expedition.members.map((member) => member.sourceKey));
  const wasPartyEmpty = next.expedition.partyMemberIds.length === 0;
  const added = [];
  for (const companion of companions) {
    assertObject(companion, "등록할 원정대원 후보");
    assert(typeof companion.careerId === "string" && companion.careerId.length > 0, `등록할 원정대원 후보 careerId 값이 없습니다: ${companion.id}`);
    const member = createExpeditionMemberFromCompanion(companion, now() + added.length);
    if (existingSourceKeys.has(member.sourceKey)) continue;
    next.expedition.members.push(member);
    existingSourceKeys.add(member.sourceKey);
    added.push(member);
    if (autoParty && next.expedition.partyMemberIds.length < expeditionPartySize) next.expedition.partyMemberIds.push(member.id);
  }
  if (wasPartyEmpty && next.expedition.partyMemberIds.length > 0) next.expedition.lastResolvedAt = now();
  if (added.length > 0) pushExpeditionLog(next.expedition, `원정대원 ${added.length}명이 등록되었다.`, "good");
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return { state: next, added };
}

export function addDebugExpeditionMembers(state, count, { autoParty = true } = {}) {
  assert(careers.length > 0, "careers.json이 비어 있어 DEBUG 원정대원을 추가할 수 없습니다.");
  const additionCount = finiteNumber(count, `DEBUG 원정대원 추가 수가 올바르지 않습니다: ${count}`);
  assert(Number.isInteger(additionCount) && additionCount > 0, `DEBUG 원정대원 추가 수는 1 이상의 정수여야 합니다: ${count}`);
  const next = cloneState(state);
  validateExpeditionState(next.expedition, "save.expedition");
  const existingSourceKeys = new Set(next.expedition.members.map((member) => member.sourceKey));
  const existingDebugCount = next.expedition.members.filter((member) => member.sourceKey.startsWith("debug:")).length;
  const wasPartyEmpty = next.expedition.partyMemberIds.length === 0;
  const createdAt = now();
  const added = [];
  for (let index = 0; index < additionCount; index += 1) {
    const careerIndex = Math.abs(Math.floor(Math.random() * careers.length) + index) % careers.length;
    const member = createDebugExpeditionMember(careers[careerIndex], existingDebugCount + index, createdAt);
    if (existingSourceKeys.has(member.sourceKey)) continue;
    next.expedition.members.push(member);
    existingSourceKeys.add(member.sourceKey);
    added.push(member);
    if (autoParty && next.expedition.partyMemberIds.length < expeditionPartySize) next.expedition.partyMemberIds.push(member.id);
  }
  if (wasPartyEmpty && next.expedition.partyMemberIds.length > 0) next.expedition.lastResolvedAt = now();
  if (added.length > 0) pushExpeditionLog(next.expedition, `디버그 대원 ${added.length}명이 합류했다.`, "good");
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return { state: next, added };
}

export function normalizeExpeditionState(state) {
  const next = cloneState(state);
  if (next.expedition) next.expedition.pendingReward = normalizePendingReward(next.expedition.pendingReward, now());
  if (next.expedition) next.expedition.dispatch = normalizeDispatchState(next.expedition.dispatch);
  if (next.expedition) next.expedition.research = normalizeResearchState(next.expedition.research);
  validateExpeditionState(next.expedition, "save.expedition");
  next.expedition = expeditionAliases(next.expedition);
  return next;
}

function localDateKeyForTimestamp(timestamp = now()) {
  const date = new Date(Math.max(0, Math.floor(finiteNumber(timestamp, "파견 날짜 기준 시각 값이 올바르지 않습니다."))));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextLocalDateRefreshAt(timestamp = now()) {
  const date = new Date(Math.max(0, Math.floor(finiteNumber(timestamp, "파견 갱신 기준 시각 값이 올바르지 않습니다."))));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

function hashString(value) {
  assert(typeof value === "string" && value.length > 0, "파견 회전 키 값이 없습니다.");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createDailyDispatchMissions(dateKey) {
  assert(typeof dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateKey), `파견 일일 날짜 키가 올바르지 않습니다: ${dateKey}`);
  return dispatchBands.map((band) => {
    const index = hashString(`${dateKey}:${band.id}`) % band.missions.length;
    const mission = band.missions[index];
    return {
      ...mission,
      bandId: band.id,
      bandLabel: band.label,
      durationMinutes: Number(band.durationMinutes),
      dailyOrder: Number(band.dailyOrder),
    };
  });
}

export function expeditionDispatchedMemberIds(expedition) {
  assertObject(expedition, "save.expedition");
  const dispatch = normalizeDispatchState(expedition.dispatch);
  assert(Array.isArray(dispatch.assignments), "save.expedition.dispatch.assignments 데이터가 배열이 아닙니다.");
  return new Set(dispatch.assignments.flatMap((assignment) => assignment.memberIds));
}

function dispatchMissionByIdStrict(missionId) {
  assert(typeof missionId === "string" && dispatchMissionById.has(missionId), `파견 의뢰를 찾을 수 없습니다: ${missionId}`);
  return dispatchMissionById.get(missionId);
}

function dispatchMatchScore(member, mission) {
  validateExpeditionMember(member, "파견 대원");
  assertObject(mission, "파견 의뢰");
  const role = careerCombatConfig(member.sourceCareerId).role;
  let score = 0;
  if (mission.recommendedCareerIds.includes(member.sourceCareerId)) score += 2;
  if (mission.recommendedRoles.includes(role)) score += 1;
  return score;
}

function dispatchBonusMultiplierForMembers(mission, members) {
  assert(Array.isArray(members), "파견 보너스 대원 목록이 배열이 아닙니다.");
  const score = members.reduce((sum, member) => sum + dispatchMatchScore(member, mission), 0);
  const bonus = Math.min(Number(expeditionDispatches.rules.bonusCap), score * Number(expeditionDispatches.rules.bonusPerMatchPoint));
  return Math.round((1 + bonus) * 1000) / 1000;
}

function dispatchRewardsForMembers(mission, members) {
  const multiplier = dispatchBonusMultiplierForMembers(mission, members);
  return {
    trainingExp: Math.floor(Number(mission.rewards.trainingExp) * multiplier),
    diamonds: Math.floor(Number(mission.rewards.diamonds) * multiplier),
    realEstateCash: Math.floor(Number(mission.rewards.realEstateCash) * multiplier),
    bonusMultiplier: multiplier,
  };
}

function dispatchRewardsForAssignment(expedition, assignment) {
  const mission = dispatchMissionByIdStrict(assignment.missionId);
  const members = assignment.memberIds.map((memberId) => {
    const member = expedition.members.find((candidate) => candidate.id === memberId);
    assert(member, `파견 보상 대원을 찾을 수 없습니다: ${memberId}`);
    return member;
  });
  return dispatchRewardsForMembers(mission, members);
}

function dispatchAssignmentStatus(assignment, timestamp) {
  const nowMs = Math.max(0, Math.floor(finiteNumber(timestamp, "파견 상태 기준 시각 값이 올바르지 않습니다.")));
  const startedAt = Number(assignment.startedAt);
  const completeAt = Number(assignment.completeAt);
  const durationMs = Math.max(1, completeAt - startedAt);
  const elapsedMs = Math.max(0, nowMs - startedAt);
  const remainingMs = Math.max(0, completeAt - nowMs);
  return {
    complete: remainingMs <= 0,
    elapsedMs,
    remainingMs,
    progressPercent: Math.max(0, Math.min(100, Math.floor((elapsedMs / durationMs) * 100))),
  };
}

function dispatchMemberView(member, stage, assignmentByMemberId, expedition) {
  const assignment = assignmentByMemberId.get(member.id);
  return {
    ...memberView(member, stage, null, expedition),
    dispatchAssignmentId: assignment ? assignment.id : null,
    dispatchMissionId: assignment ? assignment.missionId : null,
    dispatchStatusLabel: assignment ? "파견중" : "",
  };
}

function recommendedDispatchMemberIds(mission, availableMembers) {
  return availableMembers
    .slice()
    .map((member, index) => ({
      member,
      index,
      matchScore: dispatchMatchScore(member, mission),
      power: member.power,
      level: Number(member.level),
      createdAt: Number(member.createdAt),
    }))
    .sort((left, right) => (
      right.matchScore - left.matchScore ||
      right.power - left.power ||
      right.level - left.level ||
      left.createdAt - right.createdAt ||
      left.index - right.index
    ))
    .slice(0, Number(expeditionDispatches.rules.maxMembersPerMission))
    .map((entry) => entry.member.id);
}

function dispatchMissionView(mission, availableMembers) {
  const recommendedIds = recommendedDispatchMemberIds(mission, availableMembers);
  const recommendedMembers = availableMembers.filter((member) => recommendedIds.includes(member.id));
  const rewardPreview = recommendedMembers.length >= Number(mission.requiredMemberCount)
    ? dispatchRewardsForMembers(mission, recommendedMembers)
    : dispatchRewardsForMembers(mission, []);
  return {
    ...mission,
    durationMs: Number(mission.durationMinutes) * 60 * 1000,
    recommendedCareerNames: mission.recommendedCareerIds.map((careerId) => {
      const career = careerById.get(careerId);
      assert(career, `파견 추천 직업을 찾을 수 없습니다: ${careerId}`);
      return career.name;
    }),
    recommendedRoleLabels: mission.recommendedRoles.map((role) => roleLabel(role)),
    recommendedMemberIds: recommendedIds,
    rewardPreview,
    futureRewards: mission.rewards.future.map((reward) => ({ ...reward, statusLabel: "준비중" })),
  };
}

export function createExpeditionDispatchViewModel(state, timestamp = now()) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const stage = createStageView(expedition.currentStage);
  const partyIds = new Set(expedition.partyMemberIds);
  const assignmentByMemberId = new Map();
  for (const assignment of expedition.dispatch.assignments) {
    for (const memberId of assignment.memberIds) assignmentByMemberId.set(memberId, assignment);
  }
  const members = expedition.members.map((member) => dispatchMemberView(member, stage, assignmentByMemberId, expedition));
  const availableMembers = members.filter((member) => !partyIds.has(member.id) && !assignmentByMemberId.has(member.id));
  const dateKey = localDateKeyForTimestamp(timestamp);
  const missions = createDailyDispatchMissions(dateKey).map((mission) => dispatchMissionView(mission, availableMembers));
  const assignments = expedition.dispatch.assignments.map((assignment) => {
    const mission = dispatchMissionView(createDailyDispatchMissions(assignment.dateKey || dateKey).find((candidate) => candidate.id === assignment.missionId) || {
      ...dispatchMissionByIdStrict(assignment.missionId),
      bandId: dispatchMissionByIdStrict(assignment.missionId).band.id,
      bandLabel: dispatchMissionByIdStrict(assignment.missionId).band.label,
      durationMinutes: Number(dispatchMissionByIdStrict(assignment.missionId).band.durationMinutes),
      dailyOrder: Number(dispatchMissionByIdStrict(assignment.missionId).band.dailyOrder),
    }, members);
    const status = dispatchAssignmentStatus(assignment, timestamp);
    const reward = dispatchRewardsForAssignment(expedition, assignment);
    return {
      ...assignment,
      mission,
      members: assignment.memberIds.map((memberId) => {
        const member = members.find((candidate) => candidate.id === memberId);
        assert(member, `파견 중 대원을 찾을 수 없습니다: ${memberId}`);
        return member;
      }),
      reward,
      futureRewards: mission.futureRewards,
      ...status,
    };
  });
  const completedCount = assignments.filter((assignment) => assignment.complete).length;
  return {
    activeSlotCount: Number(expeditionDispatches.rules.activeSlotCount),
    usedSlotCount: expedition.dispatch.assignments.length,
    availableSlotCount: Math.max(0, Number(expeditionDispatches.rules.activeSlotCount) - expedition.dispatch.assignments.length),
    maxMembersPerMission: Number(expeditionDispatches.rules.maxMembersPerMission),
    dailyVisibleCount: Number(expeditionDispatches.rules.dailyVisibleCount),
    bonusPerMatchPoint: Number(expeditionDispatches.rules.bonusPerMatchPoint),
    bonusCap: Number(expeditionDispatches.rules.bonusCap),
    dateKey,
    nextRefreshAt: nextLocalDateRefreshAt(timestamp),
    members,
    availableMembers,
    partyIds,
    dispatchedMemberIds: new Set(assignmentByMemberId.keys()),
    assignments,
    completedCount,
    missions,
    history: expedition.dispatch.history,
  };
}

export function startExpeditionDispatch(state, missionId, memberIds, startedAt = now()) {
  assert(Array.isArray(memberIds), "파견 시작 대원 목록이 배열이 아닙니다.");
  const timestamp = Math.max(0, Math.floor(finiteNumber(startedAt, "파견 시작 시각 값이 올바르지 않습니다.")));
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  assert(expedition.dispatch.assignments.length < Number(expeditionDispatches.rules.activeSlotCount), "진행 가능한 파견 슬롯이 부족합니다.");
  const dateKey = localDateKeyForTimestamp(timestamp);
  const mission = createDailyDispatchMissions(dateKey).find((candidate) => candidate.id === missionId);
  assert(mission, `오늘의 파견 의뢰가 아닙니다: ${missionId}`);
  assert(memberIds.length >= Number(mission.requiredMemberCount), `${mission.title} 의뢰에 필요한 대원이 부족합니다.`);
  assert(memberIds.length <= Number(expeditionDispatches.rules.maxMembersPerMission), `${mission.title} 의뢰 파견 인원이 최대치를 초과했습니다.`);
  const uniqueMemberIds = new Set(memberIds);
  assert(uniqueMemberIds.size === memberIds.length, "파견 대원 목록에 중복이 있습니다.");
  const partyIds = new Set(expedition.partyMemberIds);
  const dispatchedIds = expeditionDispatchedMemberIds(expedition);
  for (const memberId of memberIds) {
    assert(typeof memberId === "string" && memberId.length > 0, `파견 대원 id 값이 올바르지 않습니다: ${memberId}`);
    assert(expedition.members.some((member) => member.id === memberId), `파견 대원을 찾을 수 없습니다: ${memberId}`);
    assert(!partyIds.has(memberId), `출전 중인 대원은 파견할 수 없습니다: ${memberId}`);
    assert(!dispatchedIds.has(memberId), `이미 파견 중인 대원입니다: ${memberId}`);
  }
  const completeAt = timestamp + Number(mission.durationMinutes) * 60 * 1000;
  const assignment = {
    id: `dispatch-${timestamp}-${mission.id}-${expedition.dispatch.assignments.length}`,
    missionId: mission.id,
    dateKey,
    startedAt: timestamp,
    completeAt,
    memberIds: [...memberIds],
  };
  expedition.dispatch.assignments.push(assignment);
  pushExpeditionLog(expedition, `${mission.title} 의뢰에 ${memberIds.length}명을 파견했다.`, "info");
  next.expedition = expeditionAliases(expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

export function claimExpeditionDispatch(state, assignmentId, claimedAt = now()) {
  assert(typeof assignmentId === "string" && assignmentId.length > 0, "수령할 파견 id 값이 없습니다.");
  const timestamp = Math.max(0, Math.floor(finiteNumber(claimedAt, "파견 보상 수령 시각 값이 올바르지 않습니다.")));
  let next = normalizeExpeditionState(state);
  let expedition = next.expedition;
  const assignment = expedition.dispatch.assignments.find((candidate) => candidate.id === assignmentId);
  assert(assignment, `파견 의뢰를 찾을 수 없습니다: ${assignmentId}`);
  assert(timestamp >= Number(assignment.completeAt), "아직 완료되지 않은 파견 의뢰입니다.");
  const mission = dispatchMissionByIdStrict(assignment.missionId);
  const reward = dispatchRewardsForAssignment(expedition, assignment);
  next.expedition.trainingExp += reward.trainingExp;
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + reward.diamonds;
  if (reward.realEstateCash > 0) next = grantRealEstateExpeditionPendingCash(next, reward.realEstateCash, timestamp);
  expedition = next.expedition;
  expedition.dispatch.assignments = expedition.dispatch.assignments.filter((candidate) => candidate.id !== assignmentId);
  expedition.dispatch.history = [
    {
      id: `${assignment.id}-claimed-${timestamp}`,
      missionId: mission.id,
      title: mission.title,
      claimedAt: timestamp,
      memberIds: [...assignment.memberIds],
      rewards: {
        trainingExp: reward.trainingExp,
        diamonds: reward.diamonds,
        realEstateCash: reward.realEstateCash,
      },
      bonusMultiplier: reward.bonusMultiplier,
    },
    ...expedition.dispatch.history,
  ].slice(0, Number(expeditionDispatches.rules.historyLimit));
  pushExpeditionLog(expedition, `파견 보상 수령: ${mission.title} · EXP ${reward.trainingExp} · 다이아 ${reward.diamonds} · 부동산 자금 ${reward.realEstateCash}`, "good");
  next.expedition = expeditionAliases(expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

function rewardForBattle(stageView, expedition) {
  const firstBossClear = stageView.isBoss && !expedition.claimedBossStages.includes(stageView.globalStage);
  const diamonds = firstBossClear
    ? stageView.isChapterBoss
      ? Math.round(expeditionBalance.chapterBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stageView.chapter - 1))
      : Math.round(expeditionBalance.midBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stageView.chapter - 1))
    : 0;
  const researchEffects = expeditionResearchEffects(expedition);
  const researchBase = firstBossClear
    ? stageView.isChapterBoss
      ? Number(researchConfig.rules.bossRewards.chapter)
      : Number(researchConfig.rules.bossRewards.mid)
    : 0;
  const researchBonus = firstBossClear
    ? stageView.isChapterBoss
      ? Number(researchEffects.researchPointDropFlat.chapter || 0)
      : Number(researchEffects.researchPointDropFlat.mid || 0)
    : 0;
  return {
    money: expeditionMoneyReward(stageView.globalStage),
    trainingExp: Math.floor(expeditionStageExpReward(stageView.globalStage) * researchRewardMultiplier(expedition, "trainingExp")),
    diamonds,
    realEstateCash: Math.floor(realEstateExpeditionStageReward(stageView) * researchRewardMultiplier(expedition, "realEstateCash")),
    researchPoints: Math.max(0, Math.floor(researchBase + researchBonus)),
  };
}

function pendingSummary(pending) {
  const pieces = [`전투 ${pending.battles}회`, `승리 ${pending.wins}회`];
  if (pending.losses > 0) pieces.push(`실패 ${pending.losses}회`);
  const rewards = [];
  if (pending.trainingExp > 0) rewards.push(`EXP ${pending.trainingExp}`);
  if (pending.money > 0) rewards.push(`돈 ${pending.money}`);
  if (pending.realEstateCash > 0) rewards.push(`부동산 ${pending.realEstateCash}`);
  if (pending.diamonds > 0) rewards.push(`다이아 ${pending.diamonds}`);
  if (pending.researchPoints > 0) rewards.push(`연구 ${pending.researchPoints}`);
  return rewards.length > 0 ? `${pieces.join(" · ")} / ${rewards.join(" · ")}` : pieces.join(" · ");
}

function emptyExpeditionReward() {
  return { money: 0, trainingExp: 0, diamonds: 0, realEstateCash: 0, researchPoints: 0 };
}

function addRewardTotals(total, reward) {
  total.money += Math.max(0, Math.floor(reward.money));
  total.trainingExp += Math.max(0, Math.floor(reward.trainingExp));
  total.diamonds += Math.max(0, Math.floor(reward.diamonds));
  total.realEstateCash += Math.max(0, Math.floor(reward.realEstateCash));
  total.researchPoints += Math.max(0, Math.floor(reward.researchPoints));
}

function rewardDeliveryOption(options) {
  const delivery = options?.rewardDelivery || "pending";
  assert(["instant", "pending"].includes(delivery), `원정대 보상 지급 방식이 올바르지 않습니다: ${delivery}`);
  return delivery;
}

function maxBattlesPerResolutionOption(options) {
  const configured = Math.max(1, Math.floor(positiveNumber(expeditionCombatBalance.timing.maxBattlesPerResolution, "expedition_combat_balance.json timing.maxBattlesPerResolution")));
  if (!hasOwn(options || {}, "maxBattles")) return configured;
  const requested = Math.floor(finiteNumber(options.maxBattles, "원정대 자동 정산 maxBattles 옵션 값이 올바르지 않습니다."));
  assert(requested > 0, `원정대 자동 정산 maxBattles 옵션은 1 이상이어야 합니다: ${options.maxBattles}`);
  return Math.min(configured, requested);
}

function instantRewardText(reward) {
  const pieces = [];
  if (reward.trainingExp > 0) pieces.push(`EXP +${reward.trainingExp}`);
  if (reward.realEstateCash > 0) pieces.push(`부동산 +${reward.realEstateCash}`);
  if (reward.researchPoints > 0) pieces.push(`연구 +${reward.researchPoints}`);
  if (reward.diamonds > 0) pieces.push(`다이아 +${reward.diamonds}`);
  if (reward.money > 0) pieces.push(`돈 +${reward.money}`);
  return pieces.join(" · ");
}

function grantInstantExpeditionReward(state, reward, rewardedAt) {
  let next = state;
  next.money = finiteNumber(next.money, "save.money 값이 올바르지 않습니다.") + Math.max(0, Math.floor(reward.money));
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + Math.max(0, Math.floor(reward.diamonds));
  next.expedition.trainingExp += Math.max(0, Math.floor(reward.trainingExp));
  next.expedition.research.points += Math.max(0, Math.floor(reward.researchPoints || 0));
  if (reward.realEstateCash > 0) {
    next = grantRealEstateExpeditionPendingCash(next, reward.realEstateCash, rewardedAt);
  }
  return next;
}

function recordLastBattleOnly(expedition, battle, resolvedAt) {
  const previous = expedition.pendingReward || createEmptyPendingReward(resolvedAt);
  const pending = { ...previous, lastBattle: battle.report };
  if (!pendingRewardHasValue(previous) && Number(previous.battles) <= 0 && Number(previous.updatedAt) <= 0) {
    pending.updatedAt = resolvedAt;
  }
  expedition.pendingReward = pending;
}

function addPendingBattleResult(expedition, battle, reward, fromStage, resolvedAt) {
  const previous = expedition.pendingReward || createEmptyPendingReward(resolvedAt);
  const pending = pendingRewardHasValue(previous) || Number(previous.battles) > 0
    ? { ...previous }
    : createEmptyPendingReward(resolvedAt, previous.lastBattle || null);
  if (pending.startedAt === 0) pending.startedAt = resolvedAt;
  if (pending.fromStage === null) pending.fromStage = fromStage;
  pending.money += Math.max(0, Math.floor(reward.money));
  pending.trainingExp += Math.max(0, Math.floor(reward.trainingExp));
  pending.diamonds += Math.max(0, Math.floor(reward.diamonds));
  pending.realEstateCash += Math.max(0, Math.floor(reward.realEstateCash));
  pending.researchPoints += Math.max(0, Math.floor(reward.researchPoints || 0));
  pending.battles += 1;
  if (battle.won) pending.wins += 1;
  else pending.losses += 1;
  pending.updatedAt = resolvedAt;
  pending.toStage = expedition.currentStage;
  pending.lastBattle = battle.report;
  pending.summaryText = pendingSummary(pending);
  expedition.pendingReward = pending;
}

function applyBattleResultToExpedition(state, battle, resolvedAt, options = {}) {
  let next = state;
  let expedition = next.expedition;
  const rewardDelivery = rewardDeliveryOption(options);
  const currentStage = expedition.currentStage;
  const stageView = battle.stage;
  let reward = emptyExpeditionReward();

  if (battle.won) {
    reward = rewardForBattle(stageView, expedition);
    const nextStage = clamp(currentStage + 1, 1, expeditionBalance.maxStage);
    expedition.chapterRun = createChapterRun(nextStage, stageView.isChapterBoss ? 0 : expedition.chapterRun.tempExp + reward.trainingExp);
    expedition.currentStage = nextStage;
    expedition.highestStage = Math.max(expedition.highestStage, currentStage);
    if (stageView.isBoss && !expedition.claimedBossStages.includes(currentStage)) {
      expedition.claimedBossStages.push(currentStage);
    }
  } else {
    const retryStage = stageView.isBoss ? stageStartForBoss(currentStage) : currentStage;
    expedition.currentStage = retryStage;
    expedition.chapterRun = createChapterRun(retryStage, expedition.chapterRun.tempExp);
    if (stageView.isBoss) battle.report.resultReason = "보스 실패 롤백";
  }

  expedition.lastResolvedAt = resolvedAt;
  if (rewardDelivery === "pending") {
    addPendingBattleResult(expedition, battle, reward, currentStage, resolvedAt);
  } else {
    next = grantInstantExpeditionReward(next, reward, resolvedAt);
    expedition = next.expedition;
    recordLastBattleOnly(expedition, battle, resolvedAt);
  }
  Object.assign(expedition, expeditionAliases(expedition, stageView.id));
  next.expedition = expedition;
  return { state: next, reward };
}

export function resolveExpeditionAutoCombat(state, resolvedAt = now(), options = {}) {
  assert(state && typeof state === "object", "원정대 자동 정산 state 데이터가 객체가 아닙니다.");
  if (!state.expedition || !Array.isArray(state.expedition.partyMemberIds) || state.expedition.partyMemberIds.length === 0) return state;

  let next = normalizeExpeditionState(state);
  let expedition = next.expedition;
  const rewardDelivery = rewardDeliveryOption(options);
  const timestamp = Math.max(0, Math.floor(finiteNumber(resolvedAt, "원정대 자동 정산 시각 값이 올바르지 않습니다.")));
  const elapsedMs = Math.max(0, timestamp - Number(expedition.lastResolvedAt));
  const capMs = positiveNumber(expeditionCombatBalance.timing.offlineCapHours, "expedition_combat_balance.json timing.offlineCapHours") * 60 * 60 * 1000;
  const effectiveMs = Math.min(elapsedMs, capMs);
  const resolutionStart = timestamp - effectiveMs;
  let consumedMs = 0;
  let processed = 0;
  let wins = 0;
  let losses = 0;
  const totalReward = emptyExpeditionReward();
  const maxBattles = maxBattlesPerResolutionOption(options);

  while (processed < maxBattles) {
    const stage = createStageView(expedition.currentStage);
    const durationMs = battleDurationSeconds(stage) * 1000;
    if (consumedMs + durationMs > effectiveMs) break;
    const battle = simulateExpeditionBattle({ ...next, expedition });
    const applied = applyBattleResultToExpedition(next, battle, Math.floor(resolutionStart + consumedMs + durationMs), { rewardDelivery });
    next = applied.state;
    expedition = next.expedition;
    addRewardTotals(totalReward, applied.reward);
    consumedMs += durationMs;
    processed += 1;
    if (battle.won) wins += 1;
    else losses += 1;
  }

  if (processed <= 0) return state;
  expedition.lastResolvedAt = processed >= maxBattles && consumedMs < effectiveMs ? timestamp : Math.floor(resolutionStart + consumedMs);
  next.expedition = expeditionAliases(expedition, expedition.pendingReward.lastBattle?.stageId || expedition.lastStageId);
  const rewardText = instantRewardText(totalReward);
  const logPrefix = rewardDelivery === "instant" ? "자동 원정 보상 지급" : "자동 원정 정산";
  pushExpeditionLog(next.expedition, `${logPrefix}: 전투 ${processed}회 · 승리 ${wins}회 · 실패 ${losses}회${rewardText ? ` · ${rewardText}` : ""}`, wins > 0 ? "good" : "warn");
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

export function claimExpeditionPendingReward(state, option = "base", claimedAt = now()) {
  assert(option === "base", `아직 지원하지 않는 원정대 보상 수령 방식입니다: ${option}`);
  let next = normalizeExpeditionState(state);
  const pending = next.expedition.pendingReward;
  if (!pendingRewardHasValue(pending)) return next;
  next.money = finiteNumber(next.money, "save.money 값이 올바르지 않습니다.") + pending.money;
  next.diamonds = finiteNumber(next.diamonds, "save.diamonds 값이 올바르지 않습니다.") + pending.diamonds;
  next.expedition.trainingExp += pending.trainingExp;
  next.expedition.research.points += pending.researchPoints;
  if (pending.realEstateCash > 0) {
    next = grantRealEstateExpeditionPendingCash(next, pending.realEstateCash, claimedAt);
  }
  const lastBattle = pending.lastBattle;
  pushExpeditionLog(next.expedition, `원정대 보상 수령: EXP ${pending.trainingExp} · 부동산 자금 ${pending.realEstateCash} · 연구 ${pending.researchPoints} · 다이아 ${pending.diamonds}`, "good");
  next.expedition.pendingReward = createEmptyPendingReward(claimedAt, lastBattle);
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

function memberView(member, stageView, slot = null, expedition = null) {
  const career = careerById.get(member.sourceCareerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${member.sourceCareerId}`);
  assert(typeof career.battleProp === "string" && career.battleProp.length > 0, `careers.json battleProp 값이 없습니다: ${career.id}`);
  const stats = memberCombatStats(member);
  const roleStats = memberRoleCombatStats(member, expedition);
  const research = expedition ? normalizeResearchState(expedition.research) : createEmptyResearchState();
  const topSubjects = subjectIds
    .slice()
    .sort((a, b) => stats[b] - stats[a])
    .slice(0, 2);
  return {
    ...member,
    career,
    careerId: member.sourceCareerId,
    careerName: member.careerName,
    slot,
    tierName: promotionName(member.promotionTier),
    nextPromotionId: nextPromotionId(member.promotionTier),
    levelCost: expeditionLevelCost(member),
    power: Math.round(memberPower(member)),
    stagePower: stageView ? Math.round(partyPowerForStage({ ...createDefaultExpeditionState(), members: [member], partyMemberIds: [member.id], currentStage: stageView.globalStage, highestStage: 0, claimedBossStages: [], trainingExp: 0, chapterRun: createChapterRun(stageView.globalStage, 0), lastResolvedAt: now(), research, log: [], stageIndex: stageView.globalStage - 1, clearedStageCount: 0, lastStageId: null }, stageView)) : Math.round(memberPower(member)),
    role: roleStats.role,
    roleLabel: roleStats.roleLabel,
    combatStats: roleStats,
    battleProp: career.battleProp,
    topSubjectLabels: topSubjects.map((subject) => subjectLabels[subject]),
    topSubjectShortLabels: topSubjects.map((subject) => subjectShortLabels[subject]),
  };
}

export function createExpeditionViewModel(state) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const stage = createStageView(expedition.currentStage);
  const baseParty = partyMembers(expedition).map((member, index) => memberView(member, stage, index + 1, expedition));
  const battlePreview = baseParty.length > 0 ? simulateExpeditionBattle(normalized) : null;
  const party = baseParty.map((member) => ({
    ...member,
    maxHp: member.combatStats.hp,
    remainingHp: member.combatStats.hp,
  }));
  const enemies = enemyCombatantsForStage(stage).map(({ nextAt, ...enemy }) => {
    return {
      ...enemy,
      remainingHp: enemy.hp,
    };
  });
  const partyPower = Math.round(party.reduce((sum, member) => sum + member.combatStats.hp * 0.35 + member.combatStats.attack * 1.4 + member.combatStats.defense * 2 + member.combatStats.healing * 1.15, 0));
  const enemyPower = Math.round(enemies.reduce((sum, enemy) => sum + enemy.maxHp * 0.3 + enemy.attack * 1.5 + enemy.defense * 2, 0));
  const previewReward = rewardForBattle(stage, expedition);
  const rewardExp = previewReward.trainingExp;
  const rewardMoney = previewReward.money;
  const rewardResearchPoints = previewReward.researchPoints;
  const bossReward = stage.isChapterBoss ? Math.round(expeditionBalance.chapterBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stage.chapter - 1)) : Math.round(expeditionBalance.midBossFirstClearDiamonds * expeditionBalance.bossDiamondGrowth ** (stage.chapter - 1));
  const pendingReward = expedition.pendingReward;

  return {
    stage,
    stageIndex: expedition.currentStage - 1,
    stageTotal: expeditionBalance.maxStage,
    stageLabel: `${stage.chapter}-${String(stage.segmentInChapter).padStart(2, "0")}`,
    currentStage: expedition.currentStage,
    highestStage: expedition.highestStage,
    progressPercent: stage.progressPercent,
    partyMembers: party,
    enemyMembers: enemies,
    partyPower,
    enemyPower,
    rewardExp,
    rewardMoney,
    rewardResearchPoints,
    bossReward,
    bossRewardClaimed: expedition.claimedBossStages.includes(expedition.currentStage),
    ready: party.length > 0,
    canClear: Boolean(battlePreview?.won),
    battlePreview,
    battleDurationSeconds: battleDurationSeconds(stage),
    pendingReward,
    hasPendingReward: pendingRewardHasValue(pendingReward),
    recentCombatEvents: pendingReward.lastBattle?.events?.slice(-6) || [],
    lastBattle: pendingReward.lastBattle,
    focusLabels: stage.focusSubjects.map((subject) => subjectLabels[subject]),
    weakLabels: stage.weakSubjects.map((subject) => subjectLabels[subject]),
    resistLabels: stage.resistSubjects.map((subject) => subjectLabels[subject]),
  };
}

function fusionCandidateGroups(expedition) {
  validateExpeditionState(expedition, "save.expedition");
  const partyIds = new Set(expedition.partyMemberIds);
  const dispatchedIds = expeditionDispatchedMemberIds(expedition);
  const groups = new Map();
  for (const member of expedition.members) {
    if (partyIds.has(member.id) || dispatchedIds.has(member.id) || member.locked || !nextPromotionId(member.promotionTier)) continue;
    const key = `${member.sourceCareerId}:${member.promotionTier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(member);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([key, members]) => {
      const [careerId, tier] = key.split(":");
      const nextTier = nextPromotionId(tier);
      const career = careerById.get(careerId);
      assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
      return {
        key,
        careerId,
        careerName: career.name,
        tier,
        tierName: promotionName(tier),
        nextTier,
        nextTierName: promotionName(nextTier),
        eligibleMemberIds: members.map((member) => member.id),
      };
    })
    .sort((a, b) => b.eligibleMemberIds.length - a.eligibleMemberIds.length || a.careerName.localeCompare(b.careerName));
}

export function createExpeditionManagementViewModel(state) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const stage = createStageView(expedition.currentStage);
  const partyIds = new Set(expedition.partyMemberIds);
  const assignmentByMemberId = new Map();
  for (const assignment of expedition.dispatch.assignments) {
    for (const memberId of assignment.memberIds) assignmentByMemberId.set(memberId, assignment);
  }
  const members = expedition.members.map((member, index) => {
    const assignment = assignmentByMemberId.get(member.id);
    return {
      ...memberView(member, stage, partyIds.has(member.id) ? expedition.partyMemberIds.indexOf(member.id) + 1 : null, expedition),
      rosterIndex: index,
      dispatchAssignmentId: assignment ? assignment.id : null,
      dispatchMissionId: assignment ? assignment.missionId : null,
      dispatchStatusLabel: assignment ? "파견중" : "",
    };
  });
  const party = expedition.partyMemberIds.map((id, index) => {
    const member = expedition.members.find((candidate) => candidate.id === id);
    assert(member, `원정대 편성 대원을 찾을 수 없습니다: ${id}`);
    const assignment = assignmentByMemberId.get(member.id);
    return {
      ...memberView(member, stage, index + 1, expedition),
      dispatchAssignmentId: assignment ? assignment.id : null,
      dispatchMissionId: assignment ? assignment.missionId : null,
      dispatchStatusLabel: assignment ? "파견중" : "",
    };
  });
  const growthMembers = party;
  const upgradeableCount = growthMembers.filter((member) => expedition.trainingExp >= member.levelCost).length;
  const fusionCandidates = fusionCandidateGroups(expedition);
  const visibleLog = expedition.log.filter((entry, index, list) => index === 0 || entry.text !== list[index - 1].text);
  const dispatchCompletedCount = expedition.dispatch.assignments.filter((assignment) => Number(assignment.completeAt) <= now()).length;
  return {
    stage,
    partySize: expeditionPartySize,
    party,
    partyIds,
    dispatchedMemberIds: new Set(assignmentByMemberId.keys()),
    partySlots: Array.from({ length: expeditionPartySize }, (_, index) => (index < party.length ? party[index] : null)),
    members,
    roster: members,
    growthMembers,
    upgradeableCount,
    fusionCandidates,
    dispatchCompletedCount,
    trainingExp: expedition.trainingExp,
    researchPoints: expedition.research.points,
    pendingReward: expedition.pendingReward,
    log: visibleLog,
    currentStage: expedition.currentStage,
    highestStage: expedition.highestStage,
    partyPower: Math.round(partyPowerForStage(expedition, stage)),
    enemyPower: requiredPowerForStage(expedition.currentStage),
  };
}

function researchEffectLabel(effect) {
  const percent = (value) => `+${Math.round(Number(value) * 100)}%`;
  if (effect.type === "partyPowerPercent") return `전투력 ${percent(effect.value)}`;
  if (effect.type === "combatStatPercent") {
    const statLabels = { hp: "체력", attack: "공격", defense: "방어", healing: "회복", attackSpeed: "속도" };
    return `전체 ${statLabels[effect.stat] || effect.stat} ${percent(effect.value)}`;
  }
  if (effect.type === "roleCombatStatPercent") {
    const statLabels = { hp: "체력", attack: "공격", defense: "방어", healing: "회복", attackSpeed: "속도" };
    return `${roleLabel(effect.role)} ${statLabels[effect.stat] || effect.stat} ${percent(effect.value)}`;
  }
  if (effect.type === "stageRewardPercent") {
    const rewardLabels = { trainingExp: "EXP", realEstateCash: "부동산" };
    return `${rewardLabels[effect.reward] || effect.reward} 보상 ${percent(effect.value)}`;
  }
  if (effect.type === "researchPointDropFlat") {
    const bossLabel = effect.bossType === "mid" ? "중간보스" : effect.bossType === "chapter" ? "챕터보스" : "보스";
    return `${bossLabel} 연구 +${effect.value}`;
  }
  return effect.help;
}

function researchNodeView(node, research) {
  const unlocked = research.unlockedNodeIds.includes(node.id);
  const unlockedSet = new Set(research.unlockedNodeIds);
  const prerequisitesMet = node.prerequisiteNodeIds.every((id) => unlockedSet.has(id));
  const affordable = Number(research.points) >= Number(node.cost);
  const canUnlock = !unlocked && prerequisitesMet && affordable;
  const missingPrerequisites = node.prerequisiteNodeIds
    .filter((id) => !unlockedSet.has(id))
    .map((id) => researchNodeById.get(id)?.shortName || researchNodeById.get(id)?.name || id);
  return {
    ...node,
    cost: Number(node.cost),
    unlocked,
    prerequisitesMet,
    affordable,
    canUnlock,
    missingPrerequisites,
    prerequisiteNames: node.prerequisiteNodeIds.map((id) => researchNodeById.get(id)?.shortName || researchNodeById.get(id)?.name || id),
    effectLabels: node.effects.map(researchEffectLabel),
    statusLabel: unlocked ? "완료" : !prerequisitesMet ? "잠김" : affordable ? "연구 가능" : "재화 부족",
  };
}

export function createExpeditionResearchViewModel(state) {
  const normalized = normalizeExpeditionState(state);
  const expedition = normalized.expedition;
  const research = normalizeResearchState(expedition.research);
  validateResearchState(research, "save.expedition.research");
  const effects = expeditionResearchEffects(expedition);
  const nodes = researchNodes
    .map((node) => researchNodeView(node, research))
    .sort((a, b) => Number(a.position.depth) - Number(b.position.depth) || Number(a.position.lane) - Number(b.position.lane) || a.name.localeCompare(b.name, "ko"));
  const unlockedCount = research.unlockedNodeIds.length;
  const nextNode = nodes.find((node) => node.canUnlock) || nodes.find((node) => !node.unlocked) || null;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const laneCount = Math.max(1, ...nodes.map((node) => Number(node.position.lane) + 1));
  const depthCount = Math.max(1, ...nodes.map((node) => Number(node.position.depth)));
  const lanes = researchConfig.lanes
    .slice()
    .sort((a, b) => Number(a.lane) - Number(b.lane))
    .map((lane) => ({ ...lane, lane: Number(lane.lane) }));
  const links = nodes.flatMap((node) =>
    node.prerequisiteNodeIds.map((sourceId) => {
      const source = nodeById.get(sourceId);
      assert(source, `원정대 연구 선행 노드를 찾을 수 없습니다: ${sourceId}`);
      const complete = source.unlocked && node.unlocked;
      const ready = source.unlocked && !node.unlocked && node.prerequisitesMet;
      return {
        id: `${sourceId}->${node.id}`,
        fromId: sourceId,
        toId: node.id,
        fromLane: Number(source.position.lane),
        fromDepth: Number(source.position.depth),
        toLane: Number(node.position.lane),
        toDepth: Number(node.position.depth),
        status: complete ? "complete" : ready ? "ready" : "locked",
      };
    }),
  );
  return {
    currencyName: researchConfig.rules.currencyName,
    points: research.points,
    spentPoints: research.spentPoints,
    totalEarnedPoints: research.points + research.spentPoints,
    resetCount: research.resetCount,
    freeReset: Boolean(researchConfig.rules.freeReset),
    unlockedCount,
    totalCount: nodes.length,
    maxTotalCombatBonus: Number(researchConfig.rules.maxTotalCombatBonus),
    totalCombatBonus: effects.partyPowerPercent,
    stageRewardBonus: effects.stageRewardPercent,
    researchDropBonus: effects.researchPointDropFlat,
    laneCount,
    depthCount,
    lanes,
    links,
    nodes,
    nextNode,
  };
}

export function unlockExpeditionResearchNode(state, nodeId) {
  assert(typeof nodeId === "string" && researchNodeById.has(nodeId), `원정대 연구 노드를 찾을 수 없습니다: ${nodeId}`);
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const research = expedition.research;
  const node = researchNodeById.get(nodeId);
  assert(!research.unlockedNodeIds.includes(nodeId), `${node.name} 연구는 이미 완료되었습니다.`);
  const unlocked = new Set(research.unlockedNodeIds);
  const missing = node.prerequisiteNodeIds.filter((id) => !unlocked.has(id));
  assert(missing.length === 0, `${node.name} 연구의 선행 조건이 부족합니다: ${missing.join(", ")}`);
  const cost = researchNodeCost(nodeId);
  assert(Number(research.points) >= cost, `${node.name} 연구 재화가 부족합니다.`);
  research.points -= cost;
  research.spentPoints += cost;
  research.unlockedNodeIds.push(nodeId);
  pushExpeditionLog(expedition, `연구 완료: ${node.name} · 연구 ${cost} 사용`, "good");
  next.expedition = expeditionAliases(expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

export function resetExpeditionResearch(state) {
  const next = normalizeExpeditionState(state);
  const research = next.expedition.research;
  if (Number(research.spentPoints) <= 0 && research.unlockedNodeIds.length === 0) return next;
  const returnedPoints = Number(research.spentPoints);
  research.points += returnedPoints;
  research.spentPoints = 0;
  research.unlockedNodeIds = [];
  research.resetCount += 1;
  pushExpeditionLog(next.expedition, `원정대 연구 초기화: 연구 ${returnedPoints} 반환`, "info");
  next.expedition = expeditionAliases(next.expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

export function createExpeditionSummary(state) {
  const view = createExpeditionViewModel(state);
  const expedition = state.expedition;
  validateExpeditionState(expedition, "save.expedition");
  return {
    headerPrefix: `CH.${view.stage.chapter} · 최고 Stage ${expedition.highestStage}`,
    stage: expedition.currentStage,
    partyCount: view.partyMembers.length,
    partySize: expeditionPartySize,
    partyPower: view.partyPower,
    enemyPower: view.enemyPower,
    trainingExp: expedition.trainingExp,
    researchPoints: expedition.research.points,
    researchSpentPoints: expedition.research.spentPoints,
    pendingTrainingExp: expedition.pendingReward.trainingExp,
    pendingResearchPoints: expedition.pendingReward.researchPoints,
    pendingRewards: expedition.pendingReward.battles,
    hasPendingReward: pendingRewardHasValue(expedition.pendingReward),
    diamonds: Number(state.diamonds),
  };
}

export function assignExpeditionMember(state, memberId, slotIndex = expeditionPartySize) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const member = expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  assert(!expeditionDispatchedMemberIds(expedition).has(memberId), `파견 중인 대원은 파티에 편성할 수 없습니다: ${member.careerName}`);
  if (expedition.partyMemberIds.includes(memberId)) return next;
  const wasPartyEmpty = expedition.partyMemberIds.length === 0;
  const slot = clamp(Math.floor(finiteNumber(slotIndex, "원정대 편성 슬롯 값이 올바르지 않습니다.")), 0, expeditionPartySize - 1);
  if (slot < expedition.partyMemberIds.length) expedition.partyMemberIds[slot] = memberId;
  else {
    assert(expedition.partyMemberIds.length < expeditionPartySize, "원정대 파티가 가득 찼습니다.");
    expedition.partyMemberIds.push(memberId);
  }
  if (wasPartyEmpty && expedition.partyMemberIds.length > 0) expedition.lastResolvedAt = now();
  pushExpeditionLog(expedition, `${member.careerName} 대원을 파티에 편성했다.`, "info");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function removeExpeditionMemberFromParty(state, memberId) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const before = expedition.partyMemberIds.length;
  expedition.partyMemberIds = expedition.partyMemberIds.filter((id) => id !== memberId);
  if (expedition.partyMemberIds.length < before) {
    const member = expedition.members.find((candidate) => candidate.id === memberId);
    assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
    pushExpeditionLog(expedition, `${member.careerName}를 파티에서 해제했다.`, "info");
  }
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function reorderExpeditionPartyMembers(state, fromSlotIndex, toSlotIndex) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const partyLength = expedition.partyMemberIds.length;
  assert(partyLength > 0, "순서를 변경할 원정대 파티원이 없습니다.");
  const from = Math.floor(finiteNumber(fromSlotIndex, "원정대 파티 이동 시작 슬롯 값이 올바르지 않습니다."));
  const to = Math.floor(finiteNumber(toSlotIndex, "원정대 파티 이동 대상 슬롯 값이 올바르지 않습니다."));
  assert(from >= 0 && from < partyLength, `이동할 원정대 파티 슬롯이 비어 있습니다: ${from + 1}`);
  assert(to >= 0 && to < expeditionPartySize, `원정대 파티 이동 대상 슬롯이 올바르지 않습니다: ${to + 1}`);
  if (from === to || partyLength <= 1) return next;

  const memberId = expedition.partyMemberIds[from];
  const targetIndex = to >= partyLength ? partyLength - 1 : to;
  if (from === targetIndex) return next;
  if (to >= partyLength) {
    expedition.partyMemberIds.splice(from, 1);
    expedition.partyMemberIds.push(memberId);
  } else {
    const targetMemberId = expedition.partyMemberIds[targetIndex];
    expedition.partyMemberIds[from] = targetMemberId;
    expedition.partyMemberIds[targetIndex] = memberId;
  }

  const member = expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  pushExpeditionLog(expedition, `${member.careerName} 배치를 ${from + 1}번에서 ${targetIndex + 1}번으로 변경했다.`, "info");
  next.expedition = expeditionAliases(expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

function promotionOrder(member) {
  const promotion = promotionById.get(member.promotionTier);
  assert(promotion, `지원하지 않는 원정대 승급 단계입니다: ${member.promotionTier}`);
  return Number(promotion.order);
}

export function assignRecommendedExpeditionParty(state) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  if (expedition.members.length === 0) return next;
  const stage = createStageView(expedition.currentStage);
  const dispatchedIds = expeditionDispatchedMemberIds(expedition);
  const recommended = expedition.members
    .slice()
    .filter((member) => !dispatchedIds.has(member.id))
    .map((member, index) => ({
      member,
      index,
      stagePower: memberView(member, stage, null, expedition).stagePower,
      promotionOrder: promotionOrder(member),
      level: Math.max(1, Math.floor(Number(member.level))),
      createdAt: Math.max(0, Math.floor(Number(member.createdAt))),
    }))
    .sort((left, right) => (
      right.stagePower - left.stagePower ||
      right.promotionOrder - left.promotionOrder ||
      right.level - left.level ||
      left.createdAt - right.createdAt ||
      left.index - right.index
    ))
    .slice(0, expeditionPartySize)
    .map((entry) => entry.member.id);
  const wasPartyEmpty = expedition.partyMemberIds.length === 0;
  expedition.partyMemberIds = recommended;
  if (wasPartyEmpty && recommended.length > 0) expedition.lastResolvedAt = now();
  pushExpeditionLog(expedition, `추천 편성: 전투력순 상위 ${recommended.length}명을 파티에 편성했다.`, "good");
  next.expedition = expeditionAliases(expedition);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}

export function levelUpExpeditionMember(state, memberId) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const member = expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  const cost = expeditionLevelCost(member);
  assert(expedition.trainingExp >= cost, `${member.careerName} 성장에 필요한 EXP가 부족합니다.`);
  expedition.trainingExp -= cost;
  member.level += 1;
  pushExpeditionLog(expedition, `${member.careerName} 대원이 Lv.${member.level}로 성장했다. EXP ${cost} 사용.`, "good");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function toggleExpeditionMemberLock(state, memberId) {
  const next = normalizeExpeditionState(state);
  const member = next.expedition.members.find((candidate) => candidate.id === memberId);
  assert(member, `원정대원을 찾을 수 없습니다: ${memberId}`);
  member.locked = !member.locked;
  pushExpeditionLog(next.expedition, `${member.careerName} 대원을 ${member.locked ? "잠금" : "잠금 해제"} 처리했다.`, "info");
  next.expedition = expeditionAliases(next.expedition);
  return next;
}

export function fuseExpeditionMembers(state, careerId, promotionTier) {
  const next = normalizeExpeditionState(state);
  const expedition = next.expedition;
  const nextTier = nextPromotionId(promotionTier);
  assert(nextTier, `다음 승급 단계를 찾을 수 없습니다: ${promotionTier}`);
  const partyIds = new Set(expedition.partyMemberIds);
  const dispatchedIds = expeditionDispatchedMemberIds(expedition);
  const candidates = expedition.members
    .filter((member) => member.sourceCareerId === careerId && member.promotionTier === promotionTier && !member.locked && !partyIds.has(member.id) && !dispatchedIds.has(member.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  assert(candidates.length >= 2, "합성 가능한 대원이 부족합니다.");
  const consumed = candidates.slice(0, 2);
  const consumedIds = new Set(consumed.map((member) => member.id));
  const baseStats = blankStats();
  for (const subject of subjectIds) baseStats[subject] = Math.round(((consumed[0].baseStats[subject] + consumed[1].baseStats[subject]) / 2) * 10) / 10;
  const createdAt = now();
  const career = careerById.get(careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${careerId}`);
  const fused = {
    id: `expedition-fusion-${createdAt}-${careerId}-${promotionTier}`,
    sourceKey: `fusion:${createdAt}:${careerId}:${promotionTier}:${consumed.map((member) => member.id).join("+")}`,
    sourceRunNumber: 0,
    sourceCareerId: careerId,
    careerName: career.name,
    sourceUniversity: "대원 관리",
    level: Math.max(consumed[0].level, consumed[1].level),
    exp: 0,
    promotionTier: nextTier,
    baseStats,
    locked: false,
    createdAt,
    avatarGender: consumed[0].avatarGender,
  };
  expedition.members = expedition.members.filter((member) => !consumedIds.has(member.id));
  expedition.members.push(fused);
  pushExpeditionLog(expedition, `${fused.careerName} ${promotionName(promotionTier)} 2명을 ${promotionName(nextTier)} 1명으로 합성했다.`, "good");
  next.expedition = expeditionAliases(expedition);
  return next;
}

export function completeExpeditionStage(state) {
  let next = normalizeExpeditionState(state);
  let expedition = next.expedition;
  assert(expedition.partyMemberIds.length > 0, "원정대에 편성된 대원이 없어 Stage를 돌파할 수 없습니다.");
  const battle = simulateExpeditionBattle(next);
  const stage = battle.stage;
  const currentStage = expedition.currentStage;
  const applied = applyBattleResultToExpedition(next, battle, now(), { rewardDelivery: "instant" });
  next = applied.state;
  expedition = next.expedition;
  if (battle.won) {
    const rewardText = instantRewardText(applied.reward);
    pushExpeditionLog(expedition, `${currentStage} Stage ${stage.enemyName} 전투 승리${rewardText ? `: ${rewardText}` : ""}`, "good");
  } else {
    pushExpeditionLog(expedition, `${currentStage} Stage ${stage.enemyName} 전투 실패: ${stage.isBoss ? "구간 시작으로 회귀" : "현재 Stage 유지"}`, "warn");
  }
  next.expedition = expeditionAliases(expedition, stage.id);
  validateExpeditionState(next.expedition, "save.expedition");
  return next;
}
