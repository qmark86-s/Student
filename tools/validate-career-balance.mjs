import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const careers = JSON.parse(readFileSync(resolve("data/careers.json"), "utf8"));
const requiredNumberFields = [
  "choiceRank",
  "powerMultiplier",
  "prestigeIncomeRate",
  "prestigePowerRate",
];
const failures = [];
const ranks = new Map();

function fail(id, message) {
  failures.push(`${id}: ${message}`);
}

for (const career of careers) {
  for (const field of requiredNumberFields) {
    if (typeof career[field] !== "number" || !Number.isFinite(career[field])) {
      fail(career.id, `${field} must be a finite number`);
    }
  }

  if (!Number.isInteger(career.choiceRank) || career.choiceRank < 1 || career.choiceRank > careers.length) {
    fail(career.id, `choiceRank must be an integer from 1 to ${careers.length}`);
  }

  if (typeof career.choiceBand !== "string" || career.choiceBand.trim() === "") {
    fail(career.id, "choiceBand must be a non-empty string");
  }

  if (career.powerMultiplier < 0.5 || career.powerMultiplier > 1.8) {
    fail(career.id, "powerMultiplier must stay between 0.5 and 1.8");
  }

  if (career.prestigeIncomeRate < 0 || career.prestigeIncomeRate > 1) {
    fail(career.id, "prestigeIncomeRate must stay between 0 and 1");
  }

  if (career.prestigePowerRate < 0 || career.prestigePowerRate > 0.05) {
    fail(career.id, "prestigePowerRate must stay between 0 and 0.05");
  }

  if (ranks.has(career.choiceRank)) {
    fail(career.id, `choiceRank duplicates ${ranks.get(career.choiceRank)}`);
  } else {
    ranks.set(career.choiceRank, career.id);
  }
}

if (ranks.size !== careers.length) {
  failures.push(`choiceRank count ${ranks.size} does not match careers count ${careers.length}`);
}

if (failures.length > 0) {
  console.error(`CAREER_BALANCE_INVALID failures=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`CAREER_BALANCE_OK careers=${careers.length}`);
