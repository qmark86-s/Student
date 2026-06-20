import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("data/character_animation_manifest.json");
const gradeVisualsPath = resolve("data/grade_visuals.json");

const gradeVisuals = JSON.parse(readFileSync(gradeVisualsPath, "utf8"));
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const previousByKey = new Map((previous.characters ?? []).map((character) => [`${character.studentFrame}:${character.gender}`, character]));

const phaseLabel = {
  elementary: "초등",
  middle: "중등",
  high: "고등",
  repeater: "N수",
};

const characters = [];
for (const visual of gradeVisuals.slice().sort((a, b) => a.order - b.order)) {
  for (const gender of ["male", "female"]) {
    const key = `${visual.studentFrame}:${gender}`;
    const previousCharacter = previousByKey.get(key) ?? {};
    const id = `student-${String(visual.order).padStart(2, "0")}-${gender}`;
    const defaultMoveSheet = `assets/visual-source/characters/${id}-move.png`;
    const moveSheet = previousCharacter.moveSheet ?? (existsSync(resolve(defaultMoveSheet)) ? defaultMoveSheet : undefined);
    characters.push({
      id,
      kind: "student",
      gender,
      gradeOrder: visual.order,
      studentFrame: visual.studentFrame,
      phase: visual.phase,
      age: visual.age,
      title: `${visual.studentTitle} ${gender === "female" ? "여학생" : "남학생"}`,
      artBrief: `${phaseLabel[visual.phase] ?? visual.phase}, ${visual.age}세, ${visual.studentTitle}`,
      source: previousCharacter.source ?? `assets/visual-source/characters/${id}-source.png`,
      direction: previousCharacter.direction ?? "right",
      ...(moveSheet ? { moveSheet } : {}),
      ...(moveSheet ? { moveSheetLayout: previousCharacter.moveSheetLayout ?? { columns: 4, rows: 1 } } : {}),
      ...(previousCharacter.sourceFrames ? { sourceFrames: previousCharacter.sourceFrames } : {}),
      ...(previousCharacter.alpha ? { alpha: previousCharacter.alpha } : {}),
    });
  }
}

const manifest = {
  version: previous.version ?? 1,
  cell: previous.cell ?? 160,
  centerX: previous.centerX ?? 80,
  baselineY: previous.baselineY ?? 148,
  maxSpriteWidth: previous.maxSpriteWidth ?? 122,
  maxSpriteHeight: previous.maxSpriteHeight ?? 142,
  minFrameDifference: previous.minFrameDifference ?? 2.5,
  animations: previous.animations ?? {
    move: {
      frames: 4,
      durationMs: 640,
    },
  },
  characters,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`CHARACTER_MANIFEST_SYNCED characters=${characters.length}`);
