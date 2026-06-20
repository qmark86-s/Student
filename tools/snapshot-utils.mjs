import { createHash } from "node:crypto";

export const snapshotSourceRoot = "src/snapshot";
export const styleToken = "__STUDENT_INLINE_STYLE__";
export const scriptToken = "__STUDENT_INLINE_SCRIPT__";
export const assetTokenPrefix = "__STUDENT_ASSET_";

export const dataTables = [
  "growth_levels.json",
  "universities.json",
  "careers.json",
  "grade_visuals.json",
  "expedition_unit_levels.json",
  "expedition_stages.json",
  "expedition_bosses.json",
];

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function readLiteral(source, start) {
  const quote = source[start];
  if (!["\"", "'", "`"].includes(quote)) return null;

  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === quote) {
      const literal = source.slice(start, index + 1);
      return { end: index + 1, raw: literal, value: Function(`return ${literal}`)() };
    }
  }
  return null;
}

export function classifyDataTable(keys) {
  const key = keys.join(",");
  if (key === "level,cost,statGain") return "growth_levels.json";
  if (key === "level,expCost") return "expedition_unit_levels.json";
  if (key === "id,chapter,segment,name,enemyName,normalEnemyNames,focusSubjects,weakSubjects,resistSubjects,difficultyMultiplier,description") return "expedition_stages.json";
  if (key === "id,bossType,chapter,segment,name,enemyName,focusSubjects,weakSubjects,resistSubjects,difficultyMultiplier,description") return "expedition_bosses.json";
  if (key === "id,name,tier,baseIncomePerMinute,minPrestige,preferredTrack,statWeights,helperSprite,battleProp,auraColor,dialogueTags,supportRole") return "careers.json";
  if (key === "id,gameRank,name,minScore,minNationalRank,prestige,trackBias,line,source,snapshotDate") return "universities.json";
  if (key === "order,phase,age,studentFrame,studentTitle,dialogueGroup,normalMonsterFrames,normalMonsterNames,examMonsterFrames,examMonsterNames") return "grade_visuals.json";
  return null;
}

export function pngInfo(buffer) {
  if (buffer.length >= 24 && buffer.slice(1, 4).toString("ascii") === "PNG") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return {};
}
