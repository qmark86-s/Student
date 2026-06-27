import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tablePath = resolve("data/curriculum_attack_vfx.json");
const gradeVisualsPath = resolve("data/grade_visuals.json");
const table = JSON.parse(readFileSync(tablePath, "utf8"));
const gradeVisuals = JSON.parse(readFileSync(gradeVisualsPath, "utf8"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function uniqueValues(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`${label} has duplicate value ${item}`);
    seen.add(item);
  }
  return seen;
}

function requireHelp(object, keys, path) {
  const help = object?.help ?? {};
  for (const key of keys) {
    if (typeof help[key] !== "string" || help[key].trim().length === 0) {
      fail(`${path}.help.${key} must be a non-empty Korean help string`);
    }
  }
}

if (table.version !== 1) fail("version must be 1");
if (typeof table.description !== "string" || table.description.trim().length === 0) fail("description is required");

const selection = table.selection ?? {};
if (selection.mode !== "random_one_per_attack") fail("selection.mode must be random_one_per_attack");
if (selection.tokensPerAttack !== 1) fail("selection.tokensPerAttack must be 1");
if (selection.source !== "current_grade_weighted_pool") fail("selection.source must be current_grade_weighted_pool");
if (!Number.isInteger(selection.repeatWindow) || selection.repeatWindow < 0) fail("selection.repeatWindow must be a non-negative integer");
if (!Array.isArray(selection.seedHint) || selection.seedHint.length < 1) fail("selection.seedHint must contain at least one key");
requireHelp(selection, ["mode", "tokensPerAttack", "source", "repeatWindow", "seedHint"], "selection");

const runtime = table.runtime ?? {};
if (runtime.renderer !== "dom_text_layer") fail("runtime.renderer must be dom_text_layer");
if (typeof runtime.skinKey !== "string" || runtime.skinKey.trim().length === 0) fail("runtime.skinKey is required");
if (typeof runtime.localizationKeyPrefix !== "string" || runtime.localizationKeyPrefix.trim().length === 0) {
  fail("runtime.localizationKeyPrefix is required");
}
if (runtime.tokenKeyStrategy !== "grade_pool_token") fail("runtime.tokenKeyStrategy must be grade_pool_token");
requireHelp(runtime, ["renderer", "skinKey", "localizationKeyPrefix", "tokenKeyStrategy"], "runtime");

const rules = table.rules ?? {};
if (!Number.isInteger(rules.maxTokenChars) || rules.maxTokenChars < 1 || rules.maxTokenChars > 12) {
  fail("rules.maxTokenChars must be an integer in 1..12");
}
if (!Number.isInteger(rules.minPoolsPerGrade) || rules.minPoolsPerGrade < 1) fail("rules.minPoolsPerGrade must be a positive integer");
if (!Number.isInteger(rules.minTokensPerPool) || rules.minTokensPerPool < 1) fail("rules.minTokensPerPool must be a positive integer");
if (!Array.isArray(rules.allowedSubjects) || rules.allowedSubjects.length < 1) fail("rules.allowedSubjects must contain at least one subject");
requireHelp(rules, ["maxTokenChars", "minPoolsPerGrade", "minTokensPerPool", "allowedSubjects", "inquirySubjectAliases"], "rules");

const allowedSubjects = new Set(rules.allowedSubjects ?? []);
const aliases = rules.inquirySubjectAliases ?? {};
for (const [subjectId, subjectAliases] of Object.entries(aliases)) {
  if (!allowedSubjects.has(subjectId)) fail(`rules.inquirySubjectAliases.${subjectId} is not an allowed subject`);
  if (!Array.isArray(subjectAliases) || subjectAliases.length < 1) {
    fail(`rules.inquirySubjectAliases.${subjectId} must contain at least one alias`);
    continue;
  }
  uniqueValues(subjectAliases, `rules.inquirySubjectAliases.${subjectId}`);
  for (const alias of subjectAliases) {
    if (!allowedSubjects.has(alias)) fail(`rules.inquirySubjectAliases.${subjectId} contains unknown subject ${alias}`);
  }
}

const requiredSubjectsByPhase = table.requiredSubjectsByPhase ?? {};
for (const phase of ["elementary", "middle", "high", "repeater"]) {
  const requiredSubjects = requiredSubjectsByPhase[phase] ?? [];
  if (!Array.isArray(requiredSubjects) || requiredSubjects.length < 1) {
    fail(`requiredSubjectsByPhase.${phase} must contain at least one subject`);
    continue;
  }
  uniqueValues(requiredSubjects, `requiredSubjectsByPhase.${phase}`);
  for (const subject of requiredSubjects) {
    if (!allowedSubjects.has(subject)) fail(`requiredSubjectsByPhase.${phase} contains unknown subject ${subject}`);
  }
}
requireHelp(requiredSubjectsByPhase, ["elementary", "middle", "high", "repeater"], "requiredSubjectsByPhase");

function coversSubject(poolSubjects, subject) {
  if (poolSubjects.has(subject)) return true;
  const subjectAliases = aliases[subject] ?? [];
  return subjectAliases.some((alias) => poolSubjects.has(alias));
}

const styles = table.styles ?? [];
if (!Array.isArray(styles) || styles.length < 1) fail("styles must contain at least one style");
const styleIds = uniqueValues(styles.map((style) => style.id), "styles.id");
for (const [index, style] of styles.entries()) {
  const path = `styles[${index}]`;
  if (!style.id || typeof style.id !== "string") fail(`${path}.id is required`);
  if (!style.label || typeof style.label !== "string") fail(`${path}.label is required`);
  if (!["text", "text_card"].includes(style.renderer)) fail(`${path}.renderer must be text or text_card`);
  if (!style.motion || typeof style.motion !== "string") fail(`${path}.motion is required`);
  if (!style.description || typeof style.description !== "string") fail(`${path}.description is required`);
}

const palettes = table.palettes ?? {};
for (const [id, palette] of Object.entries(palettes)) {
  for (const key of ["primary", "accent", "paper", "shadow"]) {
    if (typeof palette[key] !== "string" || !palette[key].startsWith("#")) fail(`palettes.${id}.${key} must be a hex color`);
  }
}

const bossStyleByVisualKey = table.bossStyleByVisualKey ?? {};
for (const key of ["march_eval", "midterm", "final", "year_boss", "march_mock", "june_mock", "september_mock", "suneung"]) {
  const styleId = bossStyleByVisualKey[key];
  if (!styleIds.has(styleId)) fail(`bossStyleByVisualKey.${key} must reference a known style`);
}

const mappings = table.gradeMappings ?? [];
if (!Array.isArray(mappings)) fail("gradeMappings must be an array");
if (mappings.length !== gradeVisuals.length) fail(`gradeMappings expected ${gradeVisuals.length} entries, got ${mappings.length}`);
const mappingOrders = uniqueValues(mappings.map((mapping) => mapping.gradeOrder), "gradeMappings.gradeOrder");

const gradeByOrder = new Map(gradeVisuals.map((grade) => [grade.order, grade]));
const tokenGlobal = [];
for (const [index, mapping] of mappings.entries()) {
  const path = `gradeMappings[${index}]`;
  const visual = gradeByOrder.get(mapping.gradeOrder);
  if (!Number.isInteger(mapping.gradeOrder)) fail(`${path}.gradeOrder must be an integer`);
  if (!visual) {
    fail(`${path}.gradeOrder ${mapping.gradeOrder} is not present in grade_visuals.json`);
    continue;
  }
  if (!mapping.gradeLabel || typeof mapping.gradeLabel !== "string") fail(`${path}.gradeLabel is required`);
  if (mapping.phase !== visual.phase) fail(`${path}.phase must match grade_visuals phase ${visual.phase}`);
  if (!palettes[mapping.palette]) fail(`${path}.palette must reference a known palette`);
  if (!styleIds.has(mapping.defaultStyle)) fail(`${path}.defaultStyle must reference a known style`);
  const tokenPools = mapping.tokenPools ?? [];
  if (!Array.isArray(tokenPools) || tokenPools.length < rules.minPoolsPerGrade) {
    fail(`${path}.tokenPools must contain at least ${rules.minPoolsPerGrade} pools`);
    continue;
  }
  uniqueValues(tokenPools.map((pool) => pool.id), `${path}.tokenPools.id`);
  const gradeTokens = [];
  const poolSubjects = new Set();
  for (const [poolIndex, pool] of tokenPools.entries()) {
    const poolPath = `${path}.tokenPools[${poolIndex}]`;
    if (!pool.id || typeof pool.id !== "string") fail(`${poolPath}.id is required`);
    if (!allowedSubjects.has(pool.subject)) fail(`${poolPath}.subject ${pool.subject} is not allowed`);
    if (allowedSubjects.has(pool.subject)) poolSubjects.add(pool.subject);
    if (!styleIds.has(pool.style)) fail(`${poolPath}.style must reference a known style`);
    if (!isPositiveNumber(pool.weight)) fail(`${poolPath}.weight must be a positive number`);
    if (!Array.isArray(pool.tokens) || pool.tokens.length < rules.minTokensPerPool) {
      fail(`${poolPath}.tokens must contain at least ${rules.minTokensPerPool} tokens`);
      continue;
    }
    uniqueValues(pool.tokens, `${poolPath}.tokens`);
    for (const token of pool.tokens) {
      if (typeof token !== "string" || token.trim().length === 0) {
        fail(`${poolPath}.tokens contains an empty token`);
        continue;
      }
      if (token !== token.trim()) fail(`${poolPath}.token "${token}" must not have leading or trailing whitespace`);
      if (/[\r\n\t]/.test(token)) fail(`${poolPath}.token "${token}" must be a single-line token`);
      if (token.length > rules.maxTokenChars) {
        fail(`${poolPath}.token "${token}" exceeds maxTokenChars ${rules.maxTokenChars}`);
      }
      gradeTokens.push(token);
      tokenGlobal.push(token);
    }
  }
  uniqueValues(gradeTokens, `${path}.allTokens`);
  const requiredSubjects = requiredSubjectsByPhase[mapping.phase] ?? [];
  for (const subject of requiredSubjects) {
    if (!coversSubject(poolSubjects, subject)) {
      fail(`${path}.tokenPools must cover ${subject} for ${mapping.phase}`);
    }
  }
}

for (const visual of gradeVisuals) {
  if (!mappingOrders.has(visual.order)) fail(`grade ${visual.order} ${visual.studentTitle} is missing curriculum attack VFX mapping`);
}

requireHelp(table, ["selection", "runtime", "rules", "requiredSubjectsByPhase", "styles", "palettes", "bossStyleByVisualKey", "gradeMappings"], "root");

if (failures.length) {
  console.error("CURRICULUM_ATTACK_VFX_INVALID");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const poolCount = mappings.reduce((sum, mapping) => sum + (mapping.tokenPools?.length ?? 0), 0);
console.log(
  `CURRICULUM_ATTACK_VFX_OK grades=${mappings.length} pools=${poolCount} tokens=${tokenGlobal.length} styles=${styles.length} mode=${selection.mode}`,
);
