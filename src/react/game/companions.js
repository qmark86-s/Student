import careers from "../../../data/careers.json";
import { registerExpeditionMembersFromCompanions } from "./expedition.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCareerAlumniObject(alumni, path) {
  assert(alumni && typeof alumni === "object", `${path} 데이터가 객체가 아닙니다.`);
  return alumni;
}

function careerAlumniIdForError(alumni, path) {
  assertCareerAlumniObject(alumni, path);
  return String(alumni.id);
}

function finiteNumber(value, message) {
  const number = Number(value);
  assert(Number.isFinite(number), message);
  return number;
}

function cloneState(state) {
  return globalThis.structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function requireGender(value, label) {
  assert(value === "male" || value === "female", `${label} avatarGender 값이 올바르지 않습니다: ${value}`);
  return value;
}

function uniqueId(prefix, index = 0) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function careerStatsForRank(rank = 1) {
  const base = Math.max(80, 180 - rank * 2);
  return {
    korean: base + 18,
    english: base + 14,
    math: base + 22,
    social: base + 9,
    science: base + 16,
  };
}

function createDebugCareerAlumni(state, career, index) {
  const runNumber = finiteNumber(state.runNumber, "DEBUG 졸업생 생성 runNumber 값이 올바르지 않습니다.");
  const rank = finiteNumber(career.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${career.id}`);
  const incomePerMinute = finiteNumber(career.baseIncomePerMinute, `careers.json baseIncomePerMinute 값이 올바르지 않습니다: ${career.id}`);
  const powerMultiplier = finiteNumber(career.powerMultiplier, `careers.json powerMultiplier 값이 올바르지 않습니다: ${career.id}`);
  return {
    id: uniqueId(`debug-${career.id}`, index),
    name: `${career.name} DEBUG 졸업생`,
    careerId: career.id,
    careerName: career.name,
    avatarGender: Math.random() > 0.5 ? "female" : "male",
    age: 20 + (index % 8),
    status: "idle",
    incomePerMinute,
    powerMultiplier,
    careerRank: rank,
    stats: careerStatsForRank(rank),
    createdRun: runNumber,
    source: "debug",
    sourceUniversity: "DEBUG",
    createdAt: Date.now(),
  };
}

function normalizeCareerAlumniStatus(value, id) {
  if (value === "idle" || value === "work") return value;
  if (value === "study") return "idle";
  throw new Error(`지원하지 않는 졸업생 상태입니다: ${id} / ${value}`);
}

export function isCareerAlumni(alumni) {
  if (!alumni?.careerId) return false;
  assertCareerAlumniObject(alumni, "직업 졸업생");
  assert(careers.some((career) => career.id === alumni.careerId), `careers.json에서 직업을 찾을 수 없습니다: ${alumni.careerId}`);
  return true;
}

export function addRandomCareerAlumni(state, count) {
  assert(careers.length > 0, "careers.json이 비어 있어 DEBUG 졸업생을 추가할 수 없습니다.");
  const additionCount = finiteNumber(count, `DEBUG 졸업생 추가 수가 올바르지 않습니다: ${count}`);
  assert(Number.isInteger(additionCount) && additionCount > 0, `DEBUG 졸업생 추가 수는 1 이상의 정수여야 합니다: ${count}`);
  let next = cloneState(state);
  assert(Array.isArray(next.careerAlumni), "save.careerAlumni 데이터가 배열이 아닙니다.");
  assert(Array.isArray(next.log), "save.log 데이터가 배열이 아닙니다.");
  const existing = next.careerAlumni;
  const orderedCareers = careers.slice().sort((a, b) => finiteNumber(a.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${a.id}`) - finiteNumber(b.choiceRank, `careers.json choiceRank 값이 올바르지 않습니다: ${b.id}`));
  const additions = Array.from({ length: additionCount }, (_, index) => {
    const cursor = (existing.length + index + Math.floor(Math.random() * orderedCareers.length)) % orderedCareers.length;
    return createDebugCareerAlumni(next, orderedCareers[cursor], index);
  });

  next.careerAlumni = [...existing, ...additions];
  next = registerExpeditionMembersFromCompanions(next, additions, { autoParty: true }).state;
  next.log = [
    { type: "debug", message: `DEBUG 원정대원 후보 ${additions.length}명 추가`, createdAt: Date.now() },
    ...next.log,
  ].slice(0, 100);
  return { state: next, additions };
}

export function careerAlumniCareer(alumni) {
  if (!alumni?.careerId) return null;
  const career = careers.find((candidate) => candidate.id === alumni.careerId);
  assert(career, `careers.json에서 직업을 찾을 수 없습니다: ${alumni.careerId}`);
  return career;
}

export function careerAlumniGender(alumni) {
  assertCareerAlumniObject(alumni, "직업 졸업생");
  return requireGender(alumni.avatarGender, `직업 졸업생 ${careerAlumniIdForError(alumni, "직업 졸업생")}`);
}

export function normalizeCareerAlumniList(source = []) {
  assert(Array.isArray(source), "careerAlumni 데이터가 배열이 아닙니다.");
  return source.filter((item) => item && typeof item === "object" && item.careerId).map((item, index) => {
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : uniqueId("alumni", index);
    return {
      ...item,
      id,
      name: typeof item.name === "string" && item.name.length > 0 ? item.name.replace(" 동료", " 졸업생") : `${item.careerName || "직업"} 졸업생`,
      status: normalizeCareerAlumniStatus(item.status, id),
    };
  });
}
