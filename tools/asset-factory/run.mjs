import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const npmBin = platform() === "win32" ? "npm.cmd" : "npm";
const pythonBin = platform() === "win32" ? "python" : "python3";
const isWindows = platform() === "win32";

const workflows = {
  prepare: [
    [npmBin, ["run", "visual:build"]],
    ["node", ["tools/asset-factory/summarize-character-report.mjs"]],
    ["node", ["tools/asset-factory/check-reference-lock.mjs"]],
    [pythonBin, ["tools/asset-factory/make-character-review-sheet.py"]],
    ["node", ["tools/asset-factory/summarize-professional-report.mjs"]],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-axis-review",
        "--per-page",
        "18",
      ],
    ],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-zoom-review",
        "--per-page",
        "4",
        "--sheet-key",
        "zoomSheet",
      ],
    ],
    [pythonBin, ["tools/asset-factory/audit-sprite-integrity.py"]],
  ],
  review: [
    ["node", ["tools/asset-factory/summarize-character-report.mjs"]],
    ["node", ["tools/asset-factory/check-reference-lock.mjs"]],
    [pythonBin, ["tools/asset-factory/make-character-review-sheet.py"]],
    ["node", ["tools/asset-factory/summarize-professional-report.mjs"]],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-axis-review",
        "--per-page",
        "18",
      ],
    ],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-zoom-review",
        "--per-page",
        "4",
        "--sheet-key",
        "zoomSheet",
      ],
    ],
    [pythonBin, ["tools/asset-factory/audit-sprite-integrity.py"]],
  ],
  qa: [
    [npmBin, ["run", "build:web"]],
    [npmBin, ["run", "visual:verify"]],
    [npmBin, ["run", "visual:sheet"]],
    ["node", ["tools/asset-factory/summarize-character-report.mjs"]],
    ["node", ["tools/asset-factory/check-reference-lock.mjs"]],
    [pythonBin, ["tools/asset-factory/make-character-review-sheet.py"]],
    ["node", ["tools/asset-factory/summarize-professional-report.mjs"]],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-axis-review",
        "--per-page",
        "18",
      ],
    ],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-zoom-review",
        "--per-page",
        "4",
        "--sheet-key",
        "zoomSheet",
      ],
    ],
    [pythonBin, ["tools/asset-factory/audit-sprite-integrity.py"]],
    [npmBin, ["run", "visual:smoke"]],
  ],
  doctor: [
    [npmBin, ["run", "visual:verify"]],
    ["node", ["tools/asset-factory/summarize-character-report.mjs"]],
    ["node", ["tools/asset-factory/check-reference-lock.mjs"]],
    [pythonBin, ["tools/asset-factory/make-character-review-sheet.py"]],
    ["node", ["tools/asset-factory/summarize-professional-report.mjs"]],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-axis-review",
        "--per-page",
        "18",
      ],
    ],
    [
      pythonBin,
      [
        "tools/asset-factory/make-character-review-sheet.py",
        "--report",
        "artifacts/visual-asset-samples/professional-axis-report.json",
        "--prefix",
        "professional-zoom-review",
        "--per-page",
        "4",
        "--sheet-key",
        "zoomSheet",
      ],
    ],
    [pythonBin, ["tools/asset-factory/audit-sprite-integrity.py"]],
  ],
  "install-skill": [["node", ["tools/asset-factory/install-codex-skill.mjs"]]],
};

function usage() {
  console.log(`Asset Sprite Factory

Usage:
  node tools/asset-factory/run.mjs <command>

Commands:
  prepare        Rebuild visual assets, summarize axis quality, write review sheets
  review         Summarize the latest axis reports and write review sheets
  qa             Run the full visual QA path used before shipping asset changes
  doctor         Check current generated outputs without rebuilding the web snapshot
  install-skill  Install the repo skill into the local Codex skills directory
`);
}

function run(command, args) {
  console.log(`\n> ${[command, ...args].join(" ")}`);
  const result =
    isWindows && command.endsWith(".cmd")
      ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", [command, ...args].map(cmdQuote).join(" ")], { stdio: "inherit" })
      : spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function cmdQuote(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_:\\/.\-=]+$/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

const command = process.argv[2] ?? "qa";
const steps = workflows[command];
if (!steps) {
  usage();
  process.exit(1);
}

for (const [bin, args] of steps) run(bin, args);
console.log(`\nASSET_FACTORY_OK command=${command}`);
