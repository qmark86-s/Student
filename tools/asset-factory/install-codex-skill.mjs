import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");
const source = resolve(root, "codex/skills/asset-sprite-factory");
const codexHome = resolve(process.env.CODEX_HOME || resolve(homedir(), ".codex"));
const skillsDir = resolve(codexHome, "skills");
const target = resolve(skillsDir, "asset-sprite-factory");

if (!existsSync(source)) {
  console.error(`Skill source is missing: ${source}`);
  process.exit(1);
}

const relativeTarget = relative(skillsDir, target);
if (relativeTarget.startsWith("..") || relativeTarget === "" || basename(target) !== "asset-sprite-factory") {
  console.error(`Refusing to install outside Codex skills dir: ${target}`);
  process.exit(1);
}

mkdirSync(skillsDir, { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

console.log(`ASSET_FACTORY_SKILL_INSTALLED source=${source} target=${target}`);
