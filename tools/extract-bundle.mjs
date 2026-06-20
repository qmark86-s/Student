import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("reference/Student-Idle-RPG-mobile-3.html"), "utf8");
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] ?? "";
const style = html.match(/<style>\s*([\s\S]*?)\s*<\/style>/)?.[1] ?? "";

mkdirSync("extracted", { recursive: true });
writeFileSync(resolve("extracted/latest.bundle.js"), `${script}\n`, "utf8");
writeFileSync(resolve("extracted/latest.styles.css"), `${style}\n`, "utf8");

console.log(`EXTRACT_BUNDLE_OK script=${script.length} style=${style.length}`);

