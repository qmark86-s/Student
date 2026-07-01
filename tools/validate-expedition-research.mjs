import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const research = JSON.parse(readFileSync(resolve("data/expedition_research.json"), "utf8"));
const combatBalance = JSON.parse(readFileSync(resolve("data/expedition_combat_balance.json"), "utf8"));

const roleIds = new Set(Object.keys(combatBalance.roleLabels || {}));
const combatStatIds = new Set(["hp", "attack", "defense", "healing", "attackSpeed"]);
const effectTypes = new Set(["partyPowerPercent", "combatStatPercent", "roleCombatStatPercent", "stageRewardPercent", "researchPointDropFlat"]);
const rewardIds = new Set(["trainingExp", "realEstateCash"]);
const bossTypes = new Set(["mid", "chapter", "all"]);
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

if (!isObject(research)) fail("expedition_research.json 루트 데이터가 객체가 아닙니다.");
else {
  requireInteger(research.version, "expedition_research.json.version", 1);
  requireHelp(research, "expedition_research.json", ["version", "rules", "lanes", "nodes"]);
  if (!isObject(research.rules)) fail("expedition_research.json.rules 값이 없습니다.");
  else {
    requireString(research.rules.currencyName, "rules.currencyName");
    requireNumber(research.rules.maxTotalCombatBonus, "rules.maxTotalCombatBonus", 0);
    if (Number(research.rules.maxTotalCombatBonus) > 0.2) fail("rules.maxTotalCombatBonus는 v1 기준 0.2 이하여야 합니다.");
    if (typeof research.rules.freeReset !== "boolean") fail("rules.freeReset 값은 boolean이어야 합니다.");
    if (research.rules.freeReset !== true) fail("v1 연구 초기화는 무료여야 합니다.");
    if (!isObject(research.rules.bossRewards)) fail("rules.bossRewards 값이 없습니다.");
    else {
      requireInteger(research.rules.bossRewards.mid, "rules.bossRewards.mid", 0);
      requireInteger(research.rules.bossRewards.chapter, "rules.bossRewards.chapter", 0);
    }
    requireHelp(research.rules, "rules", ["currencyName", "maxTotalCombatBonus", "freeReset", "bossRewards"]);
  }

  const declaredLaneNumbers = new Set();
  if (!Array.isArray(research.lanes) || research.lanes.length === 0) fail("expedition_research.json.lanes 값이 비어 있습니다.");
  else {
    const declaredLaneIds = new Set();
    for (const [laneIndex, lane] of research.lanes.entries()) {
      const path = `lanes[${laneIndex}]`;
      if (!isObject(lane)) {
        fail(`${path} 데이터가 객체가 아닙니다.`);
        continue;
      }
      requireString(lane.id, `${path}.id`);
      if (declaredLaneIds.has(lane.id)) fail(`${path}.id 값이 중복되었습니다: ${lane.id}`);
      declaredLaneIds.add(lane.id);
      requireString(lane.name, `${path}.name`);
      requireInteger(lane.lane, `${path}.lane`, 0);
      if (declaredLaneNumbers.has(Number(lane.lane))) fail(`${path}.lane 값이 중복되었습니다: ${lane.lane}`);
      declaredLaneNumbers.add(Number(lane.lane));
      requireString(lane.help, `${path}.help`);
    }
  }

  if (!Array.isArray(research.nodes) || research.nodes.length === 0) fail("expedition_research.json.nodes 값이 비어 있습니다.");
  else {
    const nodeIds = new Set();
    const laneIds = new Set();
    const occupiedPositions = new Set();
    let prerequisiteCount = 0;
    let multiPrerequisiteCount = 0;
    let partyPowerTotal = 0;
    for (const [nodeIndex, node] of research.nodes.entries()) {
      const path = `nodes[${nodeIndex}]`;
      if (!isObject(node)) {
        fail(`${path} 데이터가 객체가 아닙니다.`);
        continue;
      }
      requireString(node.id, `${path}.id`);
      if (nodeIds.has(node.id)) fail(`${path}.id 값이 중복되었습니다: ${node.id}`);
      nodeIds.add(node.id);
      requireString(node.name, `${path}.name`);
      requireString(node.shortName, `${path}.shortName`);
      requireString(node.description, `${path}.description`);
      requireInteger(node.cost, `${path}.cost`, 1);
      if (!Array.isArray(node.prerequisiteNodeIds)) fail(`${path}.prerequisiteNodeIds 값이 배열이 아닙니다.`);
      else {
        prerequisiteCount += node.prerequisiteNodeIds.length;
        if (node.prerequisiteNodeIds.length >= 2) multiPrerequisiteCount += 1;
      }
      if (!isObject(node.position)) fail(`${path}.position 값이 없습니다.`);
      else {
        requireInteger(node.position.depth, `${path}.position.depth`, 1);
        requireInteger(node.position.lane, `${path}.position.lane`, 0);
        if (!declaredLaneNumbers.has(Number(node.position.lane))) fail(`${path}.position.lane에 해당하는 lanes 정의가 없습니다: ${node.position.lane}`);
        const positionKey = `${Number(node.position.depth)}:${Number(node.position.lane)}`;
        if (occupiedPositions.has(positionKey)) fail(`${path}.position 값이 다른 노드와 겹칩니다: ${positionKey}`);
        occupiedPositions.add(positionKey);
        laneIds.add(Number(node.position.lane));
      }
      if (!Array.isArray(node.effects) || node.effects.length === 0) {
        fail(`${path}.effects 값이 비어 있습니다.`);
        continue;
      }
      for (const [effectIndex, effect] of node.effects.entries()) {
        const effectPath = `${path}.effects[${effectIndex}]`;
        if (!isObject(effect)) {
          fail(`${effectPath} 데이터가 객체가 아닙니다.`);
          continue;
        }
        if (!effectTypes.has(effect.type)) fail(`${effectPath}.type 값이 올바르지 않습니다: ${effect.type}`);
        requireString(effect.help, `${effectPath}.help`);
        if (effect.type === "partyPowerPercent") {
          requireNumber(effect.value, `${effectPath}.value`, 0);
          partyPowerTotal += Number(effect.value);
        } else if (effect.type === "combatStatPercent") {
          if (!combatStatIds.has(effect.stat)) fail(`${effectPath}.stat 값이 올바르지 않습니다: ${effect.stat}`);
          requireNumber(effect.value, `${effectPath}.value`, 0);
        } else if (effect.type === "roleCombatStatPercent") {
          if (!roleIds.has(effect.role)) fail(`${effectPath}.role 값이 올바르지 않습니다: ${effect.role}`);
          if (!combatStatIds.has(effect.stat)) fail(`${effectPath}.stat 값이 올바르지 않습니다: ${effect.stat}`);
          requireNumber(effect.value, `${effectPath}.value`, 0);
        } else if (effect.type === "stageRewardPercent") {
          if (!rewardIds.has(effect.reward)) fail(`${effectPath}.reward 값이 올바르지 않습니다: ${effect.reward}`);
          requireNumber(effect.value, `${effectPath}.value`, 0);
        } else if (effect.type === "researchPointDropFlat") {
          if (!bossTypes.has(effect.bossType)) fail(`${effectPath}.bossType 값이 올바르지 않습니다: ${effect.bossType}`);
          requireInteger(effect.value, `${effectPath}.value`, 0);
        }
      }
    }
    if (partyPowerTotal > Number(research.rules?.maxTotalCombatBonus || 0) + 0.000001) {
      fail(`partyPowerPercent 합계가 maxTotalCombatBonus를 초과합니다: ${partyPowerTotal}`);
    }
    if (research.nodes.length < 15) fail(`v1.1 연구 트리는 15개 이상의 노드를 가져야 합니다: ${research.nodes.length}`);
    if (laneIds.size < 5) fail(`v1.1 연구 트리는 5개 이상의 lane을 사용해야 합니다: ${laneIds.size}`);
    if (prerequisiteCount < research.nodes.length - 1) fail(`연구 트리 연결 수가 부족합니다: ${prerequisiteCount}`);
    if (multiPrerequisiteCount < 4) fail(`둘 이상의 선행 조건을 가진 교차 노드가 부족합니다: ${multiPrerequisiteCount}`);
    for (const [nodeIndex, node] of research.nodes.entries()) {
      if (!isObject(node) || !Array.isArray(node.prerequisiteNodeIds)) continue;
      const path = `nodes[${nodeIndex}]`;
      for (const prerequisiteId of node.prerequisiteNodeIds) {
        if (!nodeIds.has(prerequisiteId)) {
          fail(`${path}.prerequisiteNodeIds에 없는 노드 id가 있습니다: ${prerequisiteId}`);
          continue;
        }
        const prerequisite = research.nodes.find((candidate) => candidate.id === prerequisiteId);
        if (Number(prerequisite?.position?.depth || 0) >= Number(node.position?.depth || 0)) {
          fail(`${path}.prerequisiteNodeIds 선행 노드는 더 낮은 depth여야 합니다: ${prerequisiteId}`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const totalCost = research.nodes.reduce((sum, node) => sum + Number(node.cost), 0);
console.log(`EXPEDITION_RESEARCH_OK nodes=${research.nodes.length} totalCost=${totalCost}`);
