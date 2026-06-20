import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("reference/Student-Idle-RPG-mobile-3.html"), "utf8");
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] ?? "";

function readLiteral(source, start) {
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
      return { end: index + 1, value: Function(`return ${literal}`)() };
    }
  }
  return null;
}

function classify(keys) {
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

mkdirSync("data", { recursive: true });

const written = [];
let position = 0;
while ((position = script.indexOf("JSON.parse(", position)) !== -1) {
  let literalStart = position + "JSON.parse(".length;
  while (/\s/.test(script[literalStart] || "")) literalStart += 1;

  const literal = readLiteral(script, literalStart);
  if (!literal) {
    position += 11;
    continue;
  }

  try {
    const value = JSON.parse(literal.value);
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      const fileName = classify(Object.keys(value[0]));
      if (fileName) {
        writeFileSync(resolve("data", fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
        written.push({ fileName, count: value.length });
      }
    }
  } catch {
    // Ignore JSON.parse calls that are not content tables.
  }

  position = literal.end;
}

console.log(`EXTRACT_DATA_OK ${written.map((item) => `${item.fileName}:${item.count}`).join(" ")}`);

