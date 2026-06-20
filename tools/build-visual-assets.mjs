import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const outDir = resolve("src/snapshot/assets");
const cssPath = resolve("src/snapshot/visual-assets.css");
const manifestPath = resolve("src/snapshot/manifest.json");
const visualDataPath = resolve("data/visual_assets.json");
const careersPath = resolve("data/careers.json");
const gradeVisualsPath = resolve("data/grade_visuals.json");
const stagesPath = resolve("data/expedition_stages.json");
const bossesPath = resolve("data/expedition_bosses.json");

const companionSprites = [
  { id: "helper-book", color: "#818cf8", prop: "book" },
  { id: "helper-bulb", color: "#fde047", prop: "bulb" },
  { id: "helper-chart", color: "#10b981", prop: "chart" },
  { id: "helper-chip", color: "#38bdf8", prop: "chip" },
  { id: "helper-files", color: "#f59e0b", prop: "files" },
  { id: "helper-flask", color: "#22c55e", prop: "flask" },
  { id: "helper-globe", color: "#38bdf8", prop: "globe" },
  { id: "helper-judge", color: "#f4d35e", prop: "gavel" },
  { id: "helper-laptop", color: "#60a5fa", prop: "laptop" },
  { id: "helper-medic", color: "#7ad7ff", prop: "medic" },
  { id: "helper-mic", color: "#f472b6", prop: "mic" },
  { id: "helper-palette", color: "#fb923c", prop: "palette" },
  { id: "helper-teacher", color: "#c4b5fd", prop: "teacher" },
];

const enemyTones = [
  { id: "shelter", color: "#e05267", accent: "#facc15" },
  { id: "studio", color: "#f97316", accent: "#f9a8d4" },
  { id: "neighborhood", color: "#22c55e", accent: "#93c5fd" },
  { id: "company", color: "#3b82f6", accent: "#f97316" },
  { id: "office", color: "#8b5cf6", accent: "#f0b84c" },
  { id: "asset", color: "#10b981", accent: "#facc15" },
  { id: "national", color: "#ef4444", accent: "#86efac" },
  { id: "global", color: "#0ea5e9", accent: "#fde047" },
  { id: "future", color: "#6366f1", accent: "#67e8f9" },
  { id: "summit", color: "#a855f7", accent: "#f0b84c" },
];

const expeditionBackdropThemes = [
  { id: "shelter", sky: "#52647f", horizon: "#38485e", far: "#223049", mid: "#2d3a54", floor: "#28313f", accent: "#facc15" },
  { id: "studio", sky: "#5b4968", horizon: "#393552", far: "#2b2741", mid: "#45304b", floor: "#272637", accent: "#fb923c" },
  { id: "neighborhood", sky: "#426c60", horizon: "#30534c", far: "#1f3c39", mid: "#284d45", floor: "#203536", accent: "#84cc16" },
  { id: "company", sky: "#2f6684", horizon: "#274b68", far: "#1d3650", mid: "#29435c", floor: "#1f2f42", accent: "#60a5fa" },
  { id: "office", sky: "#596078", horizon: "#3d425c", far: "#292e43", mid: "#373a52", floor: "#242939", accent: "#c4b5fd" },
  { id: "asset", sky: "#23665b", horizon: "#24483f", far: "#19352f", mid: "#255145", floor: "#1d322f", accent: "#34d399" },
  { id: "national", sky: "#405d7b", horizon: "#30445e", far: "#1f3047", mid: "#35455b", floor: "#202d3d", accent: "#f97316" },
  { id: "global", sky: "#2c6488", horizon: "#29466f", far: "#1f3153", mid: "#263f66", floor: "#1e2b4b", accent: "#38bdf8" },
  { id: "future", sky: "#3d4d81", horizon: "#2b3866", far: "#20294d", mid: "#2f3d70", floor: "#1b2543", accent: "#a78bfa" },
  { id: "summit", sky: "#614571", horizon: "#313d6f", far: "#20294e", mid: "#3a3464", floor: "#202642", accent: "#f0b84c" },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizeClass(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, "");
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
    a: 255,
  };
}

function mix(color, other, ratio) {
  return {
    r: Math.round(color.r * (1 - ratio) + other.r * ratio),
    g: Math.round(color.g * (1 - ratio) + other.g * ratio),
    b: Math.round(color.b * (1 - ratio) + other.b * ratio),
    a: Math.round((color.a ?? 255) * (1 - ratio) + (other.a ?? 255) * ratio),
  };
}

function alpha(color, a) {
  return { ...color, a };
}

function canvas(width, height) {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

function setPixel(target, x, y, color) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const i = (Math.floor(y) * target.width + Math.floor(x)) * 4;
  const a = (color.a ?? 255) / 255;
  const inv = 1 - a;
  target.pixels[i] = Math.round(color.r * a + target.pixels[i] * inv);
  target.pixels[i + 1] = Math.round(color.g * a + target.pixels[i + 1] * inv);
  target.pixels[i + 2] = Math.round(color.b * a + target.pixels[i + 2] * inv);
  target.pixels[i + 3] = Math.min(255, Math.round((color.a ?? 255) + target.pixels[i + 3] * inv));
}

function fillRect(target, x, y, w, h, color) {
  for (let yy = Math.floor(y); yy < Math.floor(y + h); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.floor(x + w); xx += 1) setPixel(target, xx, yy, color);
  }
}

function strokeRect(target, x, y, w, h, color, size = 2) {
  fillRect(target, x, y, w, size, color);
  fillRect(target, x, y + h - size, w, size, color);
  fillRect(target, x, y, size, h, color);
  fillRect(target, x + w - size, y, size, h, color);
}

function fillEllipse(target, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(target, x, y, color);
    }
  }
}

function fillPolygon(target, points, color) {
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y += 1) {
    const nodes = [];
    let j = points.length - 1;
    for (let i = 0; i < points.length; i += 1) {
      const pi = points[i];
      const pj = points[j];
      if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
        nodes.push(Math.round(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0])));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) {
      if (nodes[i + 1] === undefined) break;
      for (let x = nodes[i]; x < nodes[i + 1]; x += 1) setPixel(target, x, y, color);
    }
  }
}

function drawLine(target, x0, y0, x1, y1, color, size = 2) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(target, x - Math.floor(size / 2), y - Math.floor(size / 2), size, size, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function drawIsoBlock(target, x, y, w, h, base) {
  const outline = hexToRgb("#17212e");
  const light = mix(base, hexToRgb("#ffffff"), 0.28);
  const dark = mix(base, hexToRgb("#000000"), 0.34);
  fillPolygon(target, [[x, y + h * 0.25], [x + w * 0.52, y], [x + w, y + h * 0.25], [x + w * 0.48, y + h * 0.52]], outline);
  fillPolygon(target, [[x + 3, y + h * 0.25], [x + w * 0.52, y + 3], [x + w - 3, y + h * 0.25], [x + w * 0.48, y + h * 0.48]], light);
  fillPolygon(target, [[x, y + h * 0.25], [x + w * 0.48, y + h * 0.52], [x + w * 0.48, y + h], [x, y + h * 0.74]], base);
  fillPolygon(target, [[x + w, y + h * 0.25], [x + w * 0.48, y + h * 0.52], [x + w * 0.48, y + h], [x + w, y + h * 0.74]], dark);
}

function drawProp(target, type, x, y, baseColor) {
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const gold = hexToRgb("#facc15");
  const teal = hexToRgb("#67e8f9");
  const green = hexToRgb("#bbf7d0");
  const pink = hexToRgb("#f9a8d4");
  const accent = mix(baseColor, hexToRgb("#ffffff"), 0.24);
  switch (type) {
    case "book":
      fillRect(target, x, y, 22, 16, ink);
      fillRect(target, x + 3, y + 3, 8, 10, white);
      fillRect(target, x + 12, y + 3, 7, 10, mix(baseColor, white, 0.45));
      break;
    case "bulb":
      fillEllipse(target, x + 10, y + 8, 9, 9, gold);
      strokeRect(target, x + 6, y + 16, 9, 5, ink, 2);
      drawLine(target, x + 10, y - 4, x + 10, y - 12, gold, 2);
      break;
    case "chart":
      fillRect(target, x, y, 22, 16, ink);
      fillRect(target, x + 3, y + 10, 3, 3, green);
      fillRect(target, x + 8, y + 7, 3, 6, green);
      fillRect(target, x + 13, y + 4, 3, 9, green);
      break;
    case "chip":
      fillRect(target, x + 2, y + 2, 18, 18, ink);
      fillRect(target, x + 5, y + 5, 12, 12, teal);
      for (let i = 0; i < 4; i += 1) {
        fillRect(target, x - 1, y + 5 + i * 4, 4, 2, gold);
        fillRect(target, x + 19, y + 5 + i * 4, 4, 2, gold);
      }
      break;
    case "files":
      fillRect(target, x + 4, y, 18, 20, ink);
      fillRect(target, x + 1, y + 3, 18, 20, white);
      fillRect(target, x + 5, y + 8, 10, 2, baseColor);
      fillRect(target, x + 5, y + 13, 8, 2, baseColor);
      break;
    case "flask":
      fillRect(target, x + 8, y, 8, 8, ink);
      fillPolygon(target, [[x + 5, y + 8], [x + 19, y + 8], [x + 23, y + 22], [x + 1, y + 22]], ink);
      fillPolygon(target, [[x + 8, y + 10], [x + 16, y + 10], [x + 19, y + 19], [x + 5, y + 19]], green);
      break;
    case "globe":
      fillEllipse(target, x + 12, y + 11, 11, 11, ink);
      fillEllipse(target, x + 12, y + 11, 8, 8, teal);
      drawLine(target, x + 4, y + 11, x + 20, y + 11, ink, 2);
      drawLine(target, x + 12, y + 3, x + 12, y + 19, ink, 2);
      break;
    case "gavel":
      fillRect(target, x + 4, y + 4, 20, 7, ink);
      fillRect(target, x + 7, y + 2, 14, 7, gold);
      drawLine(target, x + 9, y + 12, x + 0, y + 22, ink, 4);
      break;
    case "laptop":
      fillRect(target, x + 1, y + 2, 21, 15, ink);
      fillRect(target, x + 4, y + 5, 15, 9, teal);
      fillRect(target, x - 1, y + 18, 25, 4, ink);
      break;
    case "medic":
      fillRect(target, x + 2, y + 4, 20, 16, white);
      strokeRect(target, x + 2, y + 4, 20, 16, ink, 2);
      fillRect(target, x + 10, y + 7, 4, 10, hexToRgb("#ef4444"));
      fillRect(target, x + 7, y + 10, 10, 4, hexToRgb("#ef4444"));
      break;
    case "mic":
      fillRect(target, x + 7, y + 2, 10, 15, ink);
      fillRect(target, x + 9, y + 4, 6, 11, pink);
      drawLine(target, x + 12, y + 17, x + 12, y + 23, ink, 3);
      break;
    case "palette":
      fillEllipse(target, x + 12, y + 11, 12, 10, ink);
      fillEllipse(target, x + 12, y + 11, 9, 7, mix(baseColor, white, 0.25));
      fillRect(target, x + 7, y + 8, 3, 3, hexToRgb("#ef4444"));
      fillRect(target, x + 13, y + 7, 3, 3, gold);
      fillRect(target, x + 17, y + 12, 3, 3, teal);
      break;
    case "teacher":
      fillRect(target, x, y + 2, 24, 17, ink);
      fillRect(target, x + 3, y + 5, 18, 10, hexToRgb("#d9f99d"));
      drawLine(target, x + 6, y + 17, x + 2, y + 23, ink, 2);
      drawLine(target, x + 18, y + 17, x + 22, y + 23, ink, 2);
      break;
    default:
      drawIsoBlock(target, x, y, 22, 22, accent);
  }
}

function drawCompanion(target, ox, oy, spec, variant = 0) {
  const base = hexToRgb(spec.color);
  const ink = hexToRgb("#17212e");
  const skin = hexToRgb(variant % 3 === 0 ? "#ffd39b" : variant % 3 === 1 ? "#f0c391" : "#eeb182");
  const hair = hexToRgb(variant % 4 === 0 ? "#1f2937" : variant % 4 === 1 ? "#3b2f2f" : variant % 4 === 2 ? "#553c24" : "#111827");
  fillEllipse(target, ox + 48, oy + 84, 28, 7, alpha(hexToRgb("#000000"), 70));
  fillRect(target, ox + 30, oy + 58, 10, 19, ink);
  fillRect(target, ox + 55, oy + 58, 10, 19, ink);
  fillRect(target, ox + 28, oy + 72, 15, 7, ink);
  fillRect(target, ox + 53, oy + 72, 15, 7, ink);
  fillRect(target, ox + 24, oy + 34, 48, 35, ink);
  fillRect(target, ox + 29, oy + 37, 35, 27, base);
  fillPolygon(target, [[ox + 64, oy + 37], [ox + 73, oy + 43], [ox + 73, oy + 64], [ox + 64, oy + 64]], mix(base, hexToRgb("#000000"), 0.28));
  fillRect(target, ox + 32, oy + 39, 9, 21, mix(base, hexToRgb("#ffffff"), 0.22));
  fillRect(target, ox + 22, oy + 40, 10, 25, ink);
  fillRect(target, ox + 64, oy + 40, 10, 25, ink);
  fillRect(target, ox + 25, oy + 44, 7, 19, mix(base, hexToRgb("#000000"), 0.12));
  fillRect(target, ox + 64, oy + 44, 7, 19, mix(base, hexToRgb("#000000"), 0.12));
  fillRect(target, ox + 31, oy + 11, 34, 28, ink);
  fillRect(target, ox + 35, oy + 15, 26, 21, skin);
  fillRect(target, ox + 34, oy + 8, 28, 12, hair);
  fillRect(target, ox + 30, oy + 16, 8, 11, hair);
  fillRect(target, ox + 57, oy + 17, 8, 9, hair);
  fillRect(target, ox + 42, oy + 25, 4, 4, ink);
  fillRect(target, ox + 54, oy + 25, 4, 4, ink);
  fillRect(target, ox + 46, oy + 32, 10, 2, mix(skin, ink, 0.55));
  fillRect(target, ox + 30, oy + 35, 36, 4, mix(skin, hexToRgb("#ffffff"), 0.18));
  drawProp(target, spec.prop, ox + 61, oy + 48, base);
  fillRect(target, ox + 26, oy + 34, 44, 3, alpha(hexToRgb("#ffffff"), 75));
  fillRect(target, ox + 72, oy + 42, 4, 20, alpha(hexToRgb("#ffffff"), 45));
}

function drawCareerPortrait(target, ox, oy, career, index) {
  const base = hexToRgb(career.auraColor ?? "#94a3b8");
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const bg = mix(base, hexToRgb("#0f172a"), 0.34);
  const frame = mix(base, white, 0.24);
  const helper = companionSprites.find((sprite) => sprite.id === career.helperSprite) ?? companionSprites[index % companionSprites.length];
  const helperBase = hexToRgb(career.auraColor ?? helper.color);
  const skin = hexToRgb(index % 3 === 0 ? "#ffd39b" : index % 3 === 1 ? "#f0c391" : "#e7b07c");
  const hair = hexToRgb(index % 5 === 0 ? "#111827" : index % 5 === 1 ? "#263043" : index % 5 === 2 ? "#3b2f2f" : index % 5 === 3 ? "#5b371c" : "#1f2937");

  fillRect(target, ox + 3, oy + 4, 58, 56, alpha(ink, 245));
  fillRect(target, ox + 5, oy + 6, 54, 52, alpha(bg, 235));
  fillRect(target, ox + 7, oy + 8, 50, 48, alpha(mix(base, white, 0.1), 58));
  fillPolygon(target, [[ox + 7, oy + 56], [ox + 58, oy + 56], [ox + 58, oy + 38], [ox + 44, oy + 56]], alpha(mix(base, ink, 0.45), 235));
  strokeRect(target, ox + 4, oy + 5, 56, 54, frame, 2);

  fillEllipse(target, ox + 31, oy + 58, 24, 5, alpha(hexToRgb("#000000"), 70));
  fillRect(target, ox + 15, oy + 40, 35, 18, ink);
  fillRect(target, ox + 18, oy + 42, 27, 14, helperBase);
  fillPolygon(target, [[ox + 45, oy + 42], [ox + 53, oy + 48], [ox + 53, oy + 56], [ox + 45, oy + 56]], mix(helperBase, ink, 0.35));
  fillRect(target, ox + 23, oy + 43, 4, 12, mix(helperBase, white, 0.35));
  fillRect(target, ox + 31, oy + 43, 4, 12, mix(helperBase, ink, 0.28));

  fillRect(target, ox + 20, oy + 18, 25, 22, ink);
  fillRect(target, ox + 23, oy + 21, 19, 17, skin);
  fillRect(target, ox + 21, oy + 14, 23, 9, hair);
  fillRect(target, ox + 18, oy + 20, 8, 9, hair);
  fillRect(target, ox + 39, oy + 20, 7, 8, hair);
  fillRect(target, ox + 28, oy + 29, 3, 3, ink);
  fillRect(target, ox + 37, oy + 29, 3, 3, ink);
  fillRect(target, ox + 31, oy + 36, 8, 2, mix(skin, ink, 0.55));

  drawProp(target, helper.prop, ox + 39, oy + 33, helperBase);
  fillRect(target, ox + 47, oy + 12, 8, 34, alpha(white, 44));
  fillRect(target, ox + 9, oy + 51, 16, 4, alpha(white, 78));

  const tierColors = ["#fde047", "#38bdf8", "#22c55e", "#f97316", "#94a3b8"];
  fillRect(target, ox + 7, oy + 8, 14, 14, ink);
  fillRect(target, ox + 9, oy + 10, 10, 10, hexToRgb(tierColors[Math.max(0, Math.min(4, career.tier - 1))]));
  fillRect(target, ox + 10, oy + 11, 8, 2, alpha(white, 86));
  const rankPips = Math.max(1, Math.min(4, 5 - career.tier));
  for (let i = 0; i < rankPips; i += 1) fillRect(target, ox + 9 + i * 4, oy + 24, 3, 3, frame);
}

function drawEnemy(target, ox, oy, tone, variant, boss = false) {
  const base = hexToRgb(tone.color);
  const accent = hexToRgb(tone.accent);
  const ink = hexToRgb("#17212e");
  fillEllipse(target, ox + 48, oy + 84, boss ? 34 : 27, boss ? 8 : 7, alpha(hexToRgb("#000000"), 78));
  if (boss) {
    fillPolygon(target, [[ox + 21, oy + 30], [ox + 34, oy + 10], [ox + 45, oy + 33]], accent);
    fillPolygon(target, [[ox + 75, oy + 30], [ox + 62, oy + 10], [ox + 51, oy + 33]], accent);
    fillRect(target, ox + 19, oy + 29, 58, 46, ink);
    fillRect(target, ox + 24, oy + 33, 48, 36, base);
    fillPolygon(target, [[ox + 72, oy + 33], [ox + 83, oy + 41], [ox + 83, oy + 70], [ox + 72, oy + 69]], mix(base, ink, 0.34));
    fillRect(target, ox + 30, oy + 38, 9, 11, ink);
    fillRect(target, ox + 57, oy + 38, 9, 11, ink);
    fillRect(target, ox + 37, oy + 59, 22, 5, ink);
    drawIsoBlock(target, ox + 60, oy + 44, 26, 26, accent);
    fillRect(target, ox + 13, oy + 46, 18, 23, ink);
    fillRect(target, ox + 16, oy + 49, 13, 17, mix(accent, hexToRgb("#ffffff"), 0.2));
    fillRect(target, ox + 36, oy + 25, 24, 5, mix(base, hexToRgb("#ffffff"), 0.24));
    return;
  }
  if (variant === 0) {
    fillRect(target, ox + 24, oy + 29, 43, 43, ink);
    fillRect(target, ox + 29, oy + 33, 34, 34, base);
    fillRect(target, ox + 34, oy + 21, 29, 18, ink);
    fillRect(target, ox + 38, oy + 24, 21, 13, mix(accent, hexToRgb("#ffffff"), 0.18));
    fillRect(target, ox + 37, oy + 44, 6, 8, ink);
    fillRect(target, ox + 54, oy + 44, 6, 8, ink);
    fillRect(target, ox + 41, oy + 60, 16, 4, ink);
    drawIsoBlock(target, ox + 59, oy + 50, 22, 20, accent);
  } else if (variant === 1) {
    fillEllipse(target, ox + 46, oy + 51, 29, 25, ink);
    fillEllipse(target, ox + 46, oy + 51, 23, 20, base);
    fillRect(target, ox + 33, oy + 42, 6, 8, ink);
    fillRect(target, ox + 54, oy + 42, 6, 8, ink);
    fillRect(target, ox + 40, oy + 58, 14, 4, ink);
    fillRect(target, ox + 19, oy + 54, 20, 15, ink);
    fillRect(target, ox + 22, oy + 56, 14, 11, mix(accent, hexToRgb("#ffffff"), 0.24));
  } else {
    drawIsoBlock(target, ox + 19, oy + 30, 54, 49, base);
    fillRect(target, ox + 36, oy + 45, 6, 8, ink);
    fillRect(target, ox + 55, oy + 45, 6, 8, ink);
    fillRect(target, ox + 42, oy + 62, 16, 4, ink);
    fillRect(target, ox + 57, oy + 24, 21, 18, ink);
    fillRect(target, ox + 61, oy + 27, 14, 12, accent);
  }
  fillRect(target, ox + 62, oy + 36, 6, 4, alpha(mix(accent, hexToRgb("#ffffff"), 0.28), 225));
  fillRect(target, ox + 24, oy + 68, 8, 3, alpha(mix(base, ink, 0.24), 230));
  fillRect(target, ox + 51, oy + 23, 4, 4, alpha(hexToRgb("#f8fafc"), 178));
  fillRect(target, ox + 29, oy + 33, 28, 3, alpha(hexToRgb("#ffffff"), 70));
}

function studentAgeProfile(visual) {
  const age = visual.age ?? 8;
  if (visual.phase === "elementary") {
    return age <= 9
      ? {
          band: "lower-elementary",
          head: [22, 18, 25, 24],
          hairY: 11,
          body: [23, 46, 22, 18],
          legsY: 64,
          legH: 11,
          footY: 75,
          bag: [7, 50, 15, 17],
          shirt: "#5aa7ff",
          vest: "#7cc3ff",
          pants: "#2563eb",
          accent: "#fde047",
          hair: "#7c2d12",
        }
      : {
          band: "upper-elementary",
          head: [22, 16, 24, 23],
          hairY: 9,
          body: [22, 43, 25, 21],
          legsY: 64,
          legH: 13,
          footY: 77,
          bag: [7, 49, 15, 20],
          shirt: "#38bdf8",
          vest: "#60a5fa",
          pants: "#2563eb",
          accent: "#f4d35e",
          hair: "#263043",
        };
  }
  if (visual.phase === "middle") {
    return {
      band: "middle",
      head: [23, 14, 23, 22],
      hairY: 8,
      body: [21, 41, 27, 25],
      legsY: 66,
      legH: 16,
      footY: 82,
      bag: [8, 47, 14, 24],
      shirt: "#e5e7eb",
      vest: "#31508f",
      pants: "#172554",
      accent: "#f472b6",
      hair: "#1f2937",
    };
  }
  if (visual.phase === "high") {
    return {
      band: "high",
      head: [23, 12, 23, 23],
      hairY: 6,
      body: [20, 40, 29, 27],
      legsY: 67,
      legH: 18,
      footY: 84,
      bag: [9, 50, 14, 28],
      shirt: "#f8fafc",
      vest: "#334155",
      pants: "#111827",
      accent: "#facc15",
      hair: "#111827",
    };
  }
  return {
    band: "repeater",
    head: [23, 12, 23, 23],
    hairY: 7,
    body: [19, 40, 30, 28],
    legsY: 68,
    legH: 18,
    footY: 85,
    bag: [8, 52, 15, 26],
    shirt: "#475569",
    vest: "#64748b",
    pants: "#17212e",
    accent: "#fb923c",
    hair: "#111827",
  };
}

function drawMainStudent(target, ox, oy, visual) {
  const index = visual.order - 1;
  const profile = studentAgeProfile(visual);
  const ink = hexToRgb("#17212e");
  const white = hexToRgb("#f8fafc");
  const skin = hexToRgb(index % 3 === 0 ? "#ffd39b" : index % 3 === 1 ? "#f0c391" : "#e7b07c");
  const shirt = hexToRgb(profile.shirt);
  const vest = hexToRgb(profile.vest);
  const pants = hexToRgb(profile.pants);
  const accent = hexToRgb(profile.accent);
  const hair = hexToRgb(profile.hair);
  const body = profile.body;
  const head = profile.head;
  const isElementary = profile.band === "lower-elementary" || profile.band === "upper-elementary";

  fillEllipse(target, ox + 33, oy + profile.footY + 9, profile.band === "lower-elementary" ? 17 : 22, 5, alpha(hexToRgb("#000000"), 72));

  if (isElementary) {
    fillRect(target, ox + 23, oy + profile.legsY, 6, profile.legH, skin);
    fillRect(target, ox + 38, oy + profile.legsY, 6, profile.legH, skin);
    fillRect(target, ox + 22, oy + profile.footY - 2, 8, 3, white);
    fillRect(target, ox + 37, oy + profile.footY - 2, 8, 3, white);
    fillRect(target, ox + 18, oy + profile.footY, 14, 6, profile.band === "lower-elementary" ? accent : pants);
    fillRect(target, ox + 35, oy + profile.footY, 15, 6, profile.band === "lower-elementary" ? hexToRgb("#ef4444") : pants);
  } else if (profile.band === "middle") {
    fillRect(target, ox + 22, oy + profile.legsY, 7, profile.legH, skin);
    fillRect(target, ox + 38, oy + profile.legsY, 7, profile.legH, skin);
    fillRect(target, ox + 22, oy + profile.footY - 4, 7, 4, white);
    fillRect(target, ox + 38, oy + profile.footY - 4, 7, 4, white);
    fillRect(target, ox + 18, oy + profile.footY, 14, 6, pants);
    fillRect(target, ox + 35, oy + profile.footY, 15, 6, pants);
  } else {
    fillRect(target, ox + 22, oy + profile.legsY, 7, profile.legH, pants);
    fillRect(target, ox + 39, oy + profile.legsY, 7, profile.legH, pants);
    fillRect(target, ox + 19, oy + profile.footY, 14, 6, profile.band === "repeater" ? hexToRgb("#0f172a") : pants);
    fillRect(target, ox + 36, oy + profile.footY, 15, 6, profile.band === "repeater" ? hexToRgb("#0f172a") : pants);
  }

  fillRect(target, ox + body[0] - 3, oy + body[1] - 3, body[2] + 7, body[3] + 5, ink);
  if (profile.band === "middle") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 6, 9, shirt);
    fillPolygon(target, [[ox + body[0] + 4, oy + body[1] + 4], [ox + body[0] + 12, oy + body[1] + 13], [ox + body[0] + 4, oy + body[1] + 15]], white);
    fillPolygon(target, [[ox + body[0] + body[2] - 4, oy + body[1] + 4], [ox + body[0] + 15, oy + body[1] + 13], [ox + body[0] + body[2] - 4, oy + body[1] + 15]], white);
    fillRect(target, ox + body[0] + 10, oy + body[1] + 12, 9, 4, accent);
    fillRect(target, ox + body[0] + 5, oy + body[1] + 20, 4, 4, mix(vest, white, 0.2));
    fillRect(target, ox + body[0] + 12, oy + body[1] + 20, 4, 4, mix(vest, white, 0.12));
    fillRect(target, ox + body[0] + 19, oy + body[1] + 20, 4, 4, mix(vest, white, 0.2));
  } else if (profile.band === "high") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 5, oy + body[1] + 3, body[2] - 10, 12, shirt);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 8, 5, body[3] - 12, mix(vest, white, 0.07));
    fillRect(target, ox + body[0] + body[2] - 8, oy + body[1] + 8, 5, body[3] - 12, mix(vest, white, 0.07));
    fillRect(target, ox + body[0] + 13, oy + body[1] + 5, 3, body[3] - 7, mix(vest, white, 0.22));
    fillRect(target, ox + body[0] + 7, oy + body[1] + 19, 6, 5, accent);
    fillRect(target, ox + body[0] + 20, oy + body[1] + 18, 5, 5, hexToRgb("#60a5fa"));
    fillRect(target, ox + body[0] + 7, oy + body[1] + 9, body[2] - 14, 3, mix(shirt, hexToRgb("#dbeafe"), 0.35));
  } else if (profile.band === "repeater") {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], vest);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 6, 9, shirt);
    fillPolygon(target, [[ox + body[0] + 4, oy + body[1]], [ox + body[0] + 14, oy + body[1] + 12], [ox + body[0] + 25, oy + body[1]]], mix(shirt, white, 0.08));
    fillRect(target, ox + body[0] + 8, oy + body[1] + 17, body[2] - 16, 6, mix(vest, ink, 0.28));
    fillRect(target, ox + body[0] + 12, oy + body[1] + 6, 2, 10, accent);
    fillRect(target, ox + body[0] + 18, oy + body[1] + 6, 2, 10, accent);
  } else {
    fillRect(target, ox + body[0], oy + body[1], body[2], body[3], shirt);
    fillRect(target, ox + body[0] + 3, oy + body[1] + 3, body[2] - 7, 5, mix(shirt, white, 0.22));
    fillRect(target, ox + body[0] + 5, oy + body[1] + body[3] - 5, body[2] - 10, 5, pants);
    fillRect(target, ox + body[0] + body[2] - 7, oy + body[1] + 6, 5, 6, vest);
    fillRect(target, ox + body[0] + 9, oy + body[1] + 8, 9, 3, accent);
  }

  const sleeveLeft = isElementary ? shirt : profile.band === "repeater" ? vest : mix(vest, white, 0.06);
  const sleeveRight = isElementary ? shirt : profile.band === "repeater" ? vest : mix(vest, white, 0.06);
  fillRect(target, ox + body[0] - 8, oy + body[1] + 5, 7, Math.max(12, body[3] - 8), sleeveLeft);
  fillRect(target, ox + body[0] + body[2], oy + body[1] + 6, 7, Math.max(11, body[3] - 10), sleeveRight);
  fillRect(target, ox + body[0] - 8, oy + body[1] + body[3] - 3, 7, 5, skin);
  fillRect(target, ox + body[0] + body[2], oy + body[1] + body[3] - 3, 7, 5, skin);

  const bag = profile.bag;
  fillRect(target, ox + bag[0], oy + bag[1], bag[2], bag[3], ink);
  fillRect(target, ox + bag[0] + 2, oy + bag[1] + 3, bag[2] - 4, bag[3] - 6, profile.band === "lower-elementary" ? hexToRgb("#38bdf8") : mix(vest, white, 0.12));
  fillRect(target, ox + bag[0] + 4, oy + bag[1] + 7, Math.max(4, bag[2] - 8), 3, accent);

  fillRect(target, ox + head[0] - 3, oy + head[1] - 3, head[2] + 7, head[3] + 7, ink);
  fillRect(target, ox + head[0], oy + head[1], head[2], head[3], skin);
  fillRect(target, ox + head[0] - 2, oy + profile.hairY, head[2] + 4, 10, hair);
  fillRect(target, ox + head[0] - 4, oy + head[1] + 2, 7, 10, hair);
  fillRect(target, ox + head[0] + head[2] - 3, oy + head[1] + 2, 6, 9, hair);
  fillRect(target, ox + head[0] + 6, oy + head[1] + 9, 3, 3, ink);
  fillRect(target, ox + head[0] + 16, oy + head[1] + 9, 3, 3, ink);
  fillRect(target, ox + head[0] + 9, oy + head[1] + 16, 8, 2, mix(skin, ink, 0.55));

  if (profile.band === "lower-elementary") {
    fillRect(target, ox + head[0] - 2, oy + 4, head[2] + 5, 6, hexToRgb("#fde047"));
    fillRect(target, ox + head[0] + head[2] - 1, oy + 8, 10, 4, hexToRgb("#fde047"));
    fillRect(target, ox + 47, oy + 56, 16, 9, accent);
    fillRect(target, ox + 51, oy + 52, 4, 17, hexToRgb("#ef4444"));
  } else if (profile.band === "upper-elementary") {
    fillRect(target, ox + 47, oy + 54, 15, 12, white);
    strokeRect(target, ox + 47, oy + 54, 15, 12, ink, 2);
    fillRect(target, ox + 51, oy + 58, 7, 2, accent);
  } else if (profile.band === "middle") {
    fillRect(target, ox + 49, oy + 50, 13, 18, hexToRgb("#dbeafe"));
    strokeRect(target, ox + 49, oy + 50, 13, 18, ink, 2);
    fillRect(target, ox + 52, oy + 56, 7, 2, accent);
  } else if (profile.band === "high") {
    fillRect(target, ox + 48, oy + 49, 14, 21, hexToRgb("#e5e7eb"));
    strokeRect(target, ox + 48, oy + 49, 14, 21, ink, 2);
    fillRect(target, ox + 51, oy + 54, 8, 2, accent);
    fillRect(target, ox + 51, oy + 60, 7, 2, hexToRgb("#94a3b8"));
  } else {
    fillRect(target, ox + 21, oy + 7, 26, 4, accent);
    fillRect(target, ox + 48, oy + 53, 13, 16, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 48, oy + 53, 13, 16, ink, 2);
    fillRect(target, ox + 52, oy + 57, 6, 2, accent);
    fillRect(target, ox + 10, oy + 66, 12, 11, hexToRgb("#f59e0b"));
    fillRect(target, ox + 12, oy + 64, 8, 3, white);
  }
}

function drawMonsterFace(target, ox, oy, leftX, rightX, y, mouthY, ink) {
  fillRect(target, ox + leftX, oy + y, 5, 6, ink);
  fillRect(target, ox + rightX, oy + y, 5, 6, ink);
  fillRect(target, ox + Math.min(leftX, rightX) + 8, oy + mouthY, 15, 3, ink);
}

function drawPaperLines(target, ox, oy, color, ink, count = 3) {
  for (let i = 0; i < count; i += 1) fillRect(target, ox, oy + i * 7, 18 - i * 2, 2, i % 2 ? ink : color);
}

function drawSchoolMonsterBase(target, ox, oy, body, base, accent, ink) {
  fillEllipse(target, ox + 48, oy + 85, 28, 7, alpha(hexToRgb("#000000"), 76));
  fillRect(target, ox + body.x - 4, oy + body.y - 4, body.w + 8, body.h + 8, ink);
  fillRect(target, ox + body.x, oy + body.y, body.w, body.h, base);
  fillRect(target, ox + body.x + 4, oy + body.y + 4, Math.max(4, body.w - 12), 4, mix(base, hexToRgb("#ffffff"), 0.25));
  fillRect(target, ox + body.x + body.w - 8, oy + body.y + 6, 5, Math.max(7, body.h - 12), mix(base, ink, 0.18));
  fillRect(target, ox + body.x + 6, oy + body.y + body.h - 9, Math.max(6, body.w - 14), 3, accent);
}

function drawElementaryMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const palette = ["#f472b6", "#60a5fa", "#facc15", "#34d399", "#fb923c", "#a78bfa"];
  const base = hexToRgb(palette[(visual.order + variant) % palette.length]);
  const accent = hexToRgb(palette[(visual.order + variant + 2) % palette.length]);
  const paper = hexToRgb("#fff7ed");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 36, 8, alpha(hexToRgb("#000000"), 84));
    fillRect(target, ox + 18, oy + 23, 58, 48, ink);
    fillRect(target, ox + 23, oy + 28, 48, 38, paper);
    fillRect(target, ox + 25, oy + 31, 44, 7, base);
    drawPaperLines(target, ox + 31, oy + 44, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 35, 56, 47, 60, ink);
    fillRect(target, ox + 10, oy + 50, 18, 19, ink);
    fillRect(target, ox + 13, oy + 53, 12, 13, accent);
    fillRect(target, ox + 66, oy + 17, 12, 37, ink);
    fillRect(target, ox + 69, oy + 20, 6, 31, hexToRgb("#fde047"));
    fillRect(target, ox + 41, oy + 13, 16, 9, hexToRgb("#fde047"));
    return;
  }

  if (variant % 4 === 0) {
    drawSchoolMonsterBase(target, ox, oy, { x: 28, y: 35, w: 36, h: 37 }, paper, accent, ink);
    fillRect(target, ox + 32, oy + 39, 28, 5, base);
    drawMonsterFace(target, ox, oy, 37, 53, 50, 63, ink);
    fillRect(target, ox + 16, oy + 56, 18, 13, accent);
    strokeRect(target, ox + 16, oy + 56, 18, 13, ink, 2);
  } else if (variant % 4 === 1) {
    fillEllipse(target, ox + 47, oy + 56, 28, 22, ink);
    fillEllipse(target, ox + 47, oy + 55, 22, 17, base);
    drawMonsterFace(target, ox, oy, 36, 53, 48, 60, ink);
    for (let i = 0; i < 5; i += 1) {
      fillRect(target, ox + 23 + i * 9, oy + 26 + (i % 2) * 5, 5, 23, palette[(i + variant) % palette.length] ? hexToRgb(palette[(i + variant) % palette.length]) : accent);
    }
  } else if (variant % 4 === 2) {
    drawIsoBlock(target, ox + 25, oy + 36, 43, 38, base);
    drawMonsterFace(target, ox, oy, 39, 54, 52, 64, ink);
    fillRect(target, ox + 12, oy + 44, 20, 19, paper);
    strokeRect(target, ox + 12, oy + 44, 20, 19, ink, 2);
    fillRect(target, ox + 16, oy + 50, 11, 2, accent);
  } else {
    fillRect(target, ox + 30, oy + 30, 36, 43, ink);
    fillRect(target, ox + 34, oy + 34, 28, 35, base);
    fillRect(target, ox + 32, oy + 23, 31, 11, accent);
    drawMonsterFace(target, ox, oy, 39, 54, 49, 62, ink);
    fillPolygon(target, [[ox + 66, oy + 35], [ox + 79, oy + 42], [ox + 66, oy + 48]], paper);
    strokeRect(target, ox + 68, oy + 39, 8, 6, ink, 2);
  }
}

function drawMiddleMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#60a5fa" : "#818cf8");
  const accent = hexToRgb(variant % 3 ? "#f8fafc" : "#facc15");
  const uniform = hexToRgb("#263b73");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 35, 8, alpha(hexToRgb("#000000"), 84));
    drawIsoBlock(target, ox + 19, oy + 25, 56, 51, uniform);
    fillRect(target, ox + 28, oy + 33, 39, 31, hexToRgb("#e5e7eb"));
    fillRect(target, ox + 45, oy + 35, 5, 27, hexToRgb("#ef4444"));
    drawMonsterFace(target, ox, oy, 36, 57, 45, 60, ink);
    fillRect(target, ox + 13, oy + 45, 18, 24, ink);
    fillRect(target, ox + 16, oy + 49, 12, 15, base);
    fillRect(target, ox + 65, oy + 19, 18, 22, ink);
    fillRect(target, ox + 68, oy + 22, 12, 16, accent);
    return;
  }

  if (variant % 4 === 0) {
    drawSchoolMonsterBase(target, ox, oy, { x: 26, y: 32, w: 42, h: 41 }, uniform, accent, ink);
    fillRect(target, ox + 32, oy + 38, 30, 5, hexToRgb("#e5e7eb"));
    fillRect(target, ox + 44, oy + 43, 4, 18, hexToRgb("#ef4444"));
    drawMonsterFace(target, ox, oy, 37, 55, 51, 65, ink);
  } else if (variant % 4 === 1) {
    fillRect(target, ox + 25, oy + 31, 43, 44, ink);
    fillRect(target, ox + 29, oy + 35, 35, 36, base);
    for (let i = 0; i < 4; i += 1) fillRect(target, ox + 33, oy + 41 + i * 7, 23, 2, accent);
    drawMonsterFace(target, ox, oy, 38, 54, 50, 65, ink);
    fillRect(target, ox + 65, oy + 42, 13, 25, ink);
    fillRect(target, ox + 68, oy + 45, 7, 19, accent);
  } else if (variant % 4 === 2) {
    drawIsoBlock(target, ox + 25, oy + 34, 45, 39, base);
    fillRect(target, ox + 33, oy + 38, 28, 25, hexToRgb("#dbeafe"));
    drawMonsterFace(target, ox, oy, 39, 54, 50, 64, ink);
    fillRect(target, ox + 12, oy + 54, 18, 14, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 12, oy + 54, 18, 14, ink, 2);
  } else {
    fillRect(target, ox + 30, oy + 28, 36, 47, ink);
    fillRect(target, ox + 34, oy + 32, 28, 39, hexToRgb("#f8fafc"));
    fillRect(target, ox + 36, oy + 36, 24, 6, base);
    drawPaperLines(target, ox + 39, oy + 49, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 39, 54, 43, 65, ink);
  }
}

function drawHighMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#334155" : "#475569");
  const accent = hexToRgb(variant % 3 ? "#7aa2ff" : "#facc15");
  const paper = hexToRgb("#f8fafc");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 37, 8, alpha(hexToRgb("#000000"), 86));
    fillRect(target, ox + 19, oy + 20, 58, 54, ink);
    fillRect(target, ox + 24, oy + 25, 48, 44, paper);
    fillRect(target, ox + 27, oy + 29, 42, 7, base);
    fillRect(target, ox + 30, oy + 43, 8, 8, ink);
    fillRect(target, ox + 53, oy + 43, 8, 8, ink);
    fillRect(target, ox + 36, oy + 60, 22, 4, ink);
    fillRect(target, ox + 64, oy + 16, 17, 17, accent);
    fillRect(target, ox + 68, oy + 20, 9, 9, ink);
    fillRect(target, ox + 11, oy + 47, 21, 21, hexToRgb("#dbeafe"));
    strokeRect(target, ox + 11, oy + 47, 21, 21, ink, 2);
    return;
  }

  if (variant % 4 === 0) {
    fillRect(target, ox + 27, oy + 29, 42, 47, ink);
    fillRect(target, ox + 31, oy + 33, 34, 39, paper);
    fillRect(target, ox + 35, oy + 39, 25, 5, base);
    for (let i = 0; i < 4; i += 1) fillRect(target, ox + 36, oy + 50 + i * 5, 18, 2, accent);
    drawMonsterFace(target, ox, oy, 39, 55, 47, 65, ink);
  } else if (variant % 4 === 1) {
    drawIsoBlock(target, ox + 24, oy + 33, 46, 40, base);
    fillRect(target, ox + 36, oy + 37, 22, 26, paper);
    fillRect(target, ox + 40, oy + 42, 4, 4, ink);
    fillRect(target, ox + 51, oy + 42, 4, 4, ink);
    fillRect(target, ox + 41, oy + 57, 13, 3, ink);
    fillRect(target, ox + 64, oy + 23, 18, 17, accent);
    strokeRect(target, ox + 64, oy + 23, 18, 17, ink, 2);
  } else if (variant % 4 === 2) {
    fillEllipse(target, ox + 47, oy + 51, 29, 24, ink);
    fillEllipse(target, ox + 47, oy + 51, 23, 18, base);
    fillRect(target, ox + 38, oy + 40, 18, 18, paper);
    drawMonsterFace(target, ox, oy, 37, 54, 49, 64, ink);
    fillRect(target, ox + 16, oy + 54, 20, 15, paper);
    strokeRect(target, ox + 16, oy + 54, 20, 15, ink, 2);
  } else {
    fillRect(target, ox + 24, oy + 31, 44, 43, ink);
    fillRect(target, ox + 29, oy + 36, 34, 33, hexToRgb("#dbeafe"));
    fillRect(target, ox + 34, oy + 42, 6, 6, ink);
    fillRect(target, ox + 52, oy + 42, 6, 6, ink);
    fillRect(target, ox + 40, oy + 60, 15, 3, ink);
    fillRect(target, ox + 66, oy + 46, 12, 18, accent);
  }
}

function drawRepeaterMonster(target, ox, oy, visual, variant, boss) {
  const ink = hexToRgb("#17212e");
  const base = hexToRgb(variant % 2 ? "#334155" : "#1f2937");
  const accent = hexToRgb(variant % 3 ? "#fb923c" : "#facc15");
  const lamp = hexToRgb("#fef3c7");

  if (boss) {
    fillEllipse(target, ox + 49, oy + 86, 38, 8, alpha(hexToRgb("#000000"), 88));
    fillRect(target, ox + 18, oy + 24, 60, 48, ink);
    fillRect(target, ox + 23, oy + 29, 50, 38, base);
    fillRect(target, ox + 28, oy + 33, 40, 8, accent);
    drawMonsterFace(target, ox, oy, 36, 57, 47, 60, ink);
    fillRect(target, ox + 12, oy + 43, 20, 25, hexToRgb("#f8fafc"));
    strokeRect(target, ox + 12, oy + 43, 20, 25, ink, 2);
    fillRect(target, ox + 65, oy + 18, 12, 35, ink);
    fillRect(target, ox + 57, oy + 18, 28, 9, lamp);
    fillEllipse(target, ox + 71, oy + 32, 25, 9, alpha(accent, 70));
    return;
  }

  if (variant % 4 === 0) {
    fillRect(target, ox + 28, oy + 31, 39, 43, ink);
    fillRect(target, ox + 32, oy + 35, 31, 35, base);
    fillRect(target, ox + 34, oy + 40, 26, 6, accent);
    drawMonsterFace(target, ox, oy, 39, 54, 51, 64, ink);
    fillRect(target, ox + 65, oy + 48, 12, 18, hexToRgb("#f59e0b"));
    fillRect(target, ox + 67, oy + 46, 8, 3, lamp);
  } else if (variant % 4 === 1) {
    drawIsoBlock(target, ox + 24, oy + 35, 47, 38, base);
    fillRect(target, ox + 34, oy + 38, 26, 24, hexToRgb("#f8fafc"));
    drawMonsterFace(target, ox, oy, 38, 55, 48, 63, ink);
    fillRect(target, ox + 14, oy + 54, 20, 15, accent);
    strokeRect(target, ox + 14, oy + 54, 20, 15, ink, 2);
  } else if (variant % 4 === 2) {
    fillEllipse(target, ox + 47, oy + 53, 28, 24, ink);
    fillEllipse(target, ox + 47, oy + 52, 22, 18, base);
    fillRect(target, ox + 37, oy + 38, 20, 12, lamp);
    drawMonsterFace(target, ox, oy, 37, 54, 52, 64, ink);
    fillRect(target, ox + 62, oy + 25, 14, 33, ink);
    fillRect(target, ox + 65, oy + 28, 8, 27, accent);
  } else {
    fillRect(target, ox + 26, oy + 28, 43, 47, ink);
    fillRect(target, ox + 30, oy + 32, 35, 39, hexToRgb("#f8fafc"));
    fillRect(target, ox + 34, oy + 36, 27, 6, base);
    drawPaperLines(target, ox + 37, oy + 48, accent, ink, 3);
    drawMonsterFace(target, ox, oy, 38, 55, 44, 65, ink);
    fillRect(target, ox + 67, oy + 53, 12, 13, hexToRgb("#f59e0b"));
  }
}

function drawAcademicMonsterFinish(target, ox, oy, visual, variant, boss) {
  const white = hexToRgb("#f8fafc");
  const ink = hexToRgb("#17212e");
  const palettes = {
    elementary: ["#fde047", "#fb7185", "#38bdf8", "#22c55e", "#a78bfa", "#fb923c"],
    middle: ["#60a5fa", "#facc15", "#ef4444", "#dbeafe", "#34d399", "#818cf8"],
    high: ["#7aa2ff", "#facc15", "#94a3b8", "#ef4444", "#dbeafe", "#22d3ee"],
    repeater: ["#fb923c", "#facc15", "#64748b", "#fef3c7", "#38bdf8", "#c084fc"],
  };
  const colors = palettes[visual.phase] ?? palettes.repeater;
  const offset = variant % 5;

  // Small study tabs/stickers keep each monster readable without turning it into a text card.
  fillRect(target, ox + 22 - (offset % 2), oy + 57, 5, 5, ink);
  fillRect(target, ox + 18 - (offset % 2), oy + 58, 6, 6, white);
  fillRect(target, ox + 68 + (offset % 2), oy + 57, 5, 5, ink);
  fillRect(target, ox + 72 + (offset % 2), oy + 58, 6, 6, white);
  fillRect(target, ox + 37, oy + 76, 6, 5, ink);
  fillRect(target, ox + 54, oy + 76, 6, 5, ink);
  fillRect(target, ox + 35, oy + 79, 11, 4, mix(ink, hexToRgb(colors[2]), 0.18));
  fillRect(target, ox + 52, oy + 79, 11, 4, mix(ink, hexToRgb(colors[2]), 0.18));
  fillRect(target, ox + 16 + offset, oy + 73, 8, 4, alpha(hexToRgb(colors[0]), 236));
  fillRect(target, ox + 24 + offset, oy + 77, 5, 3, hexToRgb(colors[1]));
  fillRect(target, ox + 67 - offset, oy + 70, 6, 5, alpha(hexToRgb(colors[2]), 230));
  fillRect(target, ox + 72 - offset, oy + 65, 3, 3, hexToRgb(colors[3]));
  fillRect(target, ox + 18, oy + 28 + offset, 4, 7, hexToRgb(colors[4]));
  fillRect(target, ox + 21, oy + 30 + offset, 2, 2, white);
  fillRect(target, ox + 76, oy + 39 + offset, 3, 7, hexToRgb(colors[5]));
  fillRect(target, ox + 78, oy + 37 + offset, 2, 2, mix(hexToRgb(colors[5]), white, 0.45));
  if (boss) {
    fillRect(target, ox + 39, oy + 9, 5, 5, hexToRgb(colors[0]));
    fillRect(target, ox + 49, oy + 8, 6, 6, hexToRgb(colors[1]));
    fillRect(target, ox + 60, oy + 10, 4, 5, mix(hexToRgb(colors[2]), ink, 0.12));
  }
}

function drawAcademicMonster(target, ox, oy, visual, variant, boss = false) {
  if (visual.phase === "elementary") drawElementaryMonster(target, ox, oy, visual, variant, boss);
  else if (visual.phase === "middle") drawMiddleMonster(target, ox, oy, visual, variant, boss);
  else if (visual.phase === "high") drawHighMonster(target, ox, oy, visual, variant, boss);
  else drawRepeaterMonster(target, ox, oy, visual, variant, boss);
  drawAcademicMonsterFinish(target, ox, oy, visual, variant, boss);
}

function buildMainStudentAtlas(gradeVisuals) {
  const cell = 64;
  const target = canvas(cell * 16, 96);
  const items = gradeVisuals
    .slice()
    .sort((a, b) => a.studentFrame - b.studentFrame)
    .map((visual) => {
      drawMainStudent(target, visual.studentFrame * cell, 0, visual);
      return {
        id: `main-student-${String(visual.studentFrame).padStart(3, "0")}`,
        frame: visual.studentFrame,
        phase: visual.phase,
        age: visual.age,
        title: visual.studentTitle,
        band: studentAgeProfile(visual).band,
      };
    });
  const path = resolve(outDir, "asset-002.png");
  writePng(path, target);
  return { path, width: target.width, height: target.height, cell, items };
}

function buildMainMonsterAtlas(gradeVisuals) {
  const cell = 96;
  const target = canvas(cell * 192, cell);
  const items = [];
  for (const visual of gradeVisuals) {
    visual.normalMonsterFrames.forEach((frame, variant) => {
      drawAcademicMonster(target, frame * cell, 0, visual, variant, false);
      items.push({
        id: `main-monster-${String(frame).padStart(3, "0")}`,
        frame,
        phase: visual.phase,
        age: visual.age,
        gradeTitle: visual.studentTitle,
        name: visual.normalMonsterNames[variant],
        type: "normal",
      });
    });
    for (const [type, frame] of Object.entries(visual.examMonsterFrames)) {
      drawAcademicMonster(target, frame * cell, 0, visual, frame, true);
      items.push({
        id: `main-monster-${String(frame).padStart(3, "0")}`,
        frame,
        phase: visual.phase,
        age: visual.age,
        gradeTitle: visual.studentTitle,
        name: visual.examMonsterNames[type],
        type,
      });
    }
  }
  const path = resolve(outDir, "asset-003.png");
  writePng(path, target);
  items.sort((a, b) => a.frame - b.frame);
  return { path, width: target.width, height: target.height, cell, items };
}

function writePng(path, target) {
  const raw = Buffer.alloc((target.width * 4 + 1) * target.height);
  for (let y = 0; y < target.height; y += 1) {
    const rowStart = y * (target.width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(target.pixels.subarray(y * target.width * 4, (y + 1) * target.width * 4)).copy(raw, rowStart + 1);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    chunk("IHDR", Buffer.concat([u32(target.width), u32(target.height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([signature, ...chunks]));
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPngRgba(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 33 || buffer.slice(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${path} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString("ascii");
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`${path} must be 8-bit RGB/RGBA PNG`);

  const raw = inflateSync(Buffer.concat(idat));
  const sourceChannels = colorType === 6 ? 4 : 3;
  const channels = 4;
  const sourceRowBytes = width * sourceChannels;
  const rowBytes = width * channels;
  const decoded = new Uint8Array(width * height * sourceChannels);
  const pixels = new Uint8Array(width * height * channels);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const rowStart = y * sourceRowBytes;
    const prevRowStart = rowStart - sourceRowBytes;
    for (let x = 0; x < sourceRowBytes; x += 1) {
      const rawByte = raw[rawOffset++];
      const left = x >= sourceChannels ? decoded[rowStart + x - sourceChannels] : 0;
      const up = y > 0 ? decoded[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= sourceChannels ? decoded[prevRowStart + x - sourceChannels] : 0;
      let value = rawByte;
      if (filter === 1) value = (rawByte + left) & 255;
      else if (filter === 2) value = (rawByte + up) & 255;
      else if (filter === 3) value = (rawByte + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (rawByte + paethPredictor(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`${path} uses unsupported PNG filter ${filter}`);
      decoded[rowStart + x] = value;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * sourceChannels;
      const dst = (y * width + x) * channels;
      pixels[dst] = decoded[src];
      pixels[dst + 1] = decoded[src + 1];
      pixels[dst + 2] = decoded[src + 2];
      pixels[dst + 3] = sourceChannels === 4 ? decoded[src + 3] : 255;
    }
  }

  return { width, height, pixels };
}

function drawSourceScaled(target, source, dx, dy, dw, dh, options = {}) {
  const sourceOffsetX = options.sourceOffsetX ?? 0;
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(source.height - 1, Math.max(0, Math.floor((y / dh) * source.height)));
    for (let x = 0; x < dw; x += 1) {
      const ratioX = x / dw;
      const rawSourceX = options.mirrorX ? source.width - 1 - Math.floor(ratioX * source.width) : Math.floor(ratioX * source.width);
      const sx = (rawSourceX + sourceOffsetX + source.width) % source.width;
      const src = (sy * source.width + sx) * 4;
      setPixel(target, dx + x, dy + y, {
        r: source.pixels[src],
        g: source.pixels[src + 1],
        b: source.pixels[src + 2],
        a: source.pixels[src + 3],
      });
    }
  }
}

function samplePixel(target, x, y) {
  const sx = Math.max(0, Math.min(target.width - 1, x));
  const sy = Math.max(0, Math.min(target.height - 1, y));
  const i = (sy * target.width + sx) * 4;
  return {
    r: target.pixels[i],
    g: target.pixels[i + 1],
    b: target.pixels[i + 2],
    a: target.pixels[i + 3],
  };
}

function writePixel(target, x, y, color) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const i = (y * target.width + x) * 4;
  target.pixels[i] = color.r;
  target.pixels[i + 1] = color.g;
  target.pixels[i + 2] = color.b;
  target.pixels[i + 3] = color.a;
}

function blendVerticalSeam(target, startX, width) {
  for (let x = 0; x < width; x += 1) {
    const ratio = x / Math.max(1, width - 1);
    const leftX = Math.max(0, startX - 1);
    const rightX = Math.min(target.width - 1, startX + width);
    const targetX = startX + x;
    for (let y = 0; y < target.height; y += 1) {
      writePixel(target, targetX, y, mix(samplePixel(target, leftX, y), samplePixel(target, rightX, y), ratio));
    }
  }
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(Buffer.concat([typeBuffer, data])))]); 
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildCompanionAtlas() {
  const cell = 96;
  const target = canvas(cell * companionSprites.length, cell);
  companionSprites.forEach((sprite, index) => drawCompanion(target, index * cell, 0, sprite, index));
  const path = resolve(outDir, "visual-companions.png");
  writePng(path, target);
  return { path, width: target.width, height: target.height, cell, items: companionSprites.map((sprite, index) => ({ id: sprite.id, index })) };
}

function buildEnemyAtlas() {
  const cell = 96;
  const items = [];
  for (const tone of enemyTones) {
    for (let variant = 0; variant < 3; variant += 1) items.push({ id: `${tone.id}-mob-${variant + 1}`, tone, variant, boss: false });
    items.push({ id: `${tone.id}-boss`, tone, variant: 0, boss: true });
  }
  const target = canvas(cell * items.length, cell);
  items.forEach((item, index) => drawEnemy(target, index * cell, 0, item.tone, item.variant, item.boss));
  const path = resolve(outDir, "visual-enemies.png");
  writePng(path, target);
  return { path, width: target.width, height: target.height, cell, items: items.map((item, index) => ({ id: item.id, index, tone: item.tone.id, boss: item.boss })) };
}

function buildCareerAtlas(careers) {
  const cell = 64;
  const ordered = careers.slice().sort((a, b) => (a.choiceRank ?? 999) - (b.choiceRank ?? 999));
  const target = canvas(cell * ordered.length, cell);
  ordered.forEach((career, index) => drawCareerPortrait(target, index * cell, 0, career, index));
  const path = resolve(outDir, "visual-careers.png");
  writePng(path, target);
  return { path, width: target.width, height: target.height, cell, items: ordered.map((career, index) => ({ id: `career-${career.id}`, careerId: career.id, index })) };
}

function gradientRect(target, x, y, w, h, top, bottom) {
  for (let yy = 0; yy < h; yy += 1) {
    const ratio = h <= 1 ? 0 : yy / (h - 1);
    fillRect(target, x, y + yy, w, 1, mix(top, bottom, ratio));
  }
}

function deterministicRange(seed, min, max) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const unit = value - Math.floor(value);
  return min + unit * (max - min);
}

function drawBackdropBuilding(target, ox, oy, width, height, base, accent, seed, lit = 0.42) {
  const ink = hexToRgb("#101827");
  const side = mix(base, ink, 0.18);
  const light = mix(base, hexToRgb("#ffffff"), 0.08);
  fillRect(target, ox, oy - height, width, height, side);
  fillRect(target, ox + 3, oy - height + 3, Math.max(2, width - 7), Math.max(2, height - 6), base);
  fillRect(target, ox + width - 8, oy - height + 5, 6, Math.max(5, height - 10), mix(base, ink, 0.24));
  fillRect(target, ox + 3, oy - height + 3, Math.max(2, width - 10), 4, light);

  const windowW = width > 58 ? 5 : 4;
  const gapX = width > 58 ? 10 : 8;
  const gapY = 13;
  for (let y = oy - height + 13; y < oy - 8; y += gapY) {
    for (let x = ox + 8; x < ox + width - 8; x += gapX) {
      const on = deterministicRange(seed + x * 0.17 + y * 0.31, 0, 1) < lit;
      if (!on) {
        fillRect(target, x, y, windowW, 4, alpha(mix(base, ink, 0.34), 190));
        continue;
      }
      const glow = deterministicRange(seed + x * 0.07, 0, 1) > 0.65 ? hexToRgb("#67e8f9") : accent;
      fillRect(target, x, y, windowW, 4, glow);
      fillRect(target, x + 1, y + 1, Math.max(1, windowW - 2), 2, mix(glow, hexToRgb("#ffffff"), 0.35));
    }
  }
}

function drawBackdropSign(target, x, y, color, seed) {
  const ink = hexToRgb("#111827");
  const w = Math.round(deterministicRange(seed, 22, 42));
  const h = Math.round(deterministicRange(seed + 5, 9, 16));
  fillRect(target, x, y, w, h, ink);
  strokeRect(target, x, y, w, h, color, 2);
  fillRect(target, x + 5, y + Math.floor(h / 2), Math.max(7, w - 12), 2, mix(color, hexToRgb("#ffffff"), 0.22));
}

function drawBackdropRow(target, yOffset, theme, rowIndex, width, height) {
  const sky = hexToRgb(theme.sky);
  const horizon = hexToRgb(theme.horizon);
  const far = hexToRgb(theme.far);
  const mid = hexToRgb(theme.mid);
  const floor = hexToRgb(theme.floor);
  const accent = hexToRgb(theme.accent);
  const ink = hexToRgb("#111827");
  const white = hexToRgb("#f8fafc");

  gradientRect(target, 0, yOffset, width, height, sky, horizon);
  fillEllipse(target, Math.round(width * 0.74), yOffset + 28, 58, 24, alpha(mix(sky, white, 0.24), 44));
  fillEllipse(target, Math.round(width * 0.22), yOffset + 48, 78, 22, alpha(mix(horizon, white, 0.18), 34));
  fillRect(target, 0, yOffset + 86, width, 5, alpha(mix(accent, white, 0.08), 128));

  for (let x = -40; x < width + 80; x += Math.round(deterministicRange(rowIndex + x * 0.021, 50, 86))) {
    const buildingWidth = Math.round(deterministicRange(rowIndex * 17 + x, 38, 82));
    const buildingHeight = Math.round(deterministicRange(rowIndex * 29 + x, 34, 88));
    drawBackdropBuilding(target, x, yOffset + 102, buildingWidth, buildingHeight, mix(far, sky, 0.12), mix(accent, white, 0.18), rowIndex * 101 + x, 0.32);
  }

  for (let x = -70; x < width + 100; x += Math.round(deterministicRange(rowIndex + x * 0.037, 96, 158))) {
    const buildingWidth = Math.round(deterministicRange(rowIndex * 47 + x, 74, 138));
    const buildingHeight = Math.round(deterministicRange(rowIndex * 53 + x, 58, 122));
    drawBackdropBuilding(target, x, yOffset + 124, buildingWidth, buildingHeight, mid, accent, rowIndex * 211 + x, 0.48);
    if (deterministicRange(rowIndex * 67 + x, 0, 1) > 0.55) drawBackdropSign(target, x + buildingWidth - 34, yOffset + 61, accent, rowIndex * 71 + x);
  }

  fillRect(target, 0, yOffset + 119, width, 7, mix(floor, ink, 0.18));
  gradientRect(target, 0, yOffset + 126, width, height - 126, mix(floor, white, 0.03), mix(floor, ink, 0.28));
  fillRect(target, 0, yOffset + 132, width, 3, alpha(mix(accent, white, 0.12), 170));
  fillRect(target, 0, yOffset + 164, width, 8, alpha(ink, 72));

  for (let x = -30; x < width + 90; x += 88) {
    const shade = x % 176 === 0 ? mix(floor, white, 0.06) : mix(floor, ink, 0.03);
    fillPolygon(target, [[x, yOffset + 139], [x + 68, yOffset + 135], [x + 103, yOffset + height], [x - 30, yOffset + height]], alpha(shade, 185));
    fillRect(target, x + 16, yOffset + 151, 44, 3, alpha(mix(white, accent, 0.35), 56));
  }

  for (let x = 42; x < width; x += 245) {
    fillRect(target, x, yOffset + 91, 4, 40, ink);
    fillRect(target, x - 5, yOffset + 87, 14, 10, accent);
    fillRect(target, x - 2, yOffset + 89, 8, 6, mix(accent, white, 0.42));
    fillEllipse(target, x + 2, yOffset + 98, 24, 10, alpha(accent, 44));
  }

  for (let i = 0; i < 22; i += 1) {
    const x = Math.round(deterministicRange(rowIndex * 503 + i, 12, width - 80));
    const y = yOffset + Math.round(deterministicRange(rowIndex * 607 + i, 136, 164));
    const w = Math.round(deterministicRange(rowIndex * 709 + i, 18, 46));
    const h = Math.round(deterministicRange(rowIndex * 811 + i, 8, 22));
    const color = deterministicRange(rowIndex * 919 + i, 0, 1) > 0.5 ? accent : mix(mid, white, 0.16);
    drawIsoBlock(target, x, y, w, h, color);
  }
}

function buildExpeditionBackdropAtlas() {
  const source = readPngRgba(resolve(outDir, "asset-005.png"));
  const segmentWidth = 1672;
  const width = segmentWidth * 3;
  const rowHeight = 540;
  const target = canvas(width, rowHeight);
  drawSourceScaled(target, source, 0, 0, segmentWidth, rowHeight, { mirrorX: false });
  drawSourceScaled(target, source, segmentWidth, 0, segmentWidth, rowHeight, { mirrorX: true });
  drawSourceScaled(target, source, segmentWidth * 2, 0, segmentWidth, rowHeight, { mirrorX: false, sourceOffsetX: Math.round(source.width * 0.18) });
  blendVerticalSeam(target, segmentWidth - 36, 72);
  blendVerticalSeam(target, segmentWidth * 2 - 36, 72);
  const path = resolve(outDir, "visual-expedition-backdrops.png");
  writePng(path, target);
  return {
    path,
    width: target.width,
    height: target.height,
    rowHeight,
    items: expeditionBackdropThemes.map((theme) => ({ id: `expedition-backdrop-${theme.id}`, backdrop: theme.id, row: 0 })),
  };
}

function positionPercent(index, total) {
  return total <= 1 ? "0%" : `${(index / (total - 1) * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
}

function buildCss(companions, enemies, careers, mainMonsters, expeditionBackdrops) {
  const lines = [
    "/* generated by tools/build-visual-assets.mjs */",
    ".expedition-unit-avatar,.helper-sprite:not(.helper-robot){background-image:url(__STUDENT_ASSET_007__);background-repeat:no-repeat;background-size:1300% 100%;background-position:var(--visual-unit-x,0%) 0;image-rendering:pixelated}",
    ".expedition-unit-avatar .unit-shadow,.expedition-unit-avatar .unit-leg,.expedition-unit-avatar .unit-arm,.expedition-unit-avatar .unit-head,.expedition-unit-avatar .unit-hair,.expedition-unit-avatar .unit-body,.expedition-unit-avatar .unit-prop,.helper-sprite:not(.helper-robot)>span{display:none}",
    ".helper-sprite:not(.helper-robot){filter:drop-shadow(4px 5px #00000045);background-size:1300% 100%}",
    ".expedition-arena{background:#111827;border-color:color-mix(in srgb,var(--stage-trim) 74%,#ffffff 8%);box-shadow:inset 0 0 0 1px #ffffff1f,0 12px 28px #0f172a2e}",
    ".expedition-background-sheet{display:none!important}",
    ".expedition-arena::before{content:\"\";z-index:0;pointer-events:none;position:absolute;top:0;left:0;width:360%;height:100%;background-image:url(__STUDENT_ASSET_010__);background-repeat:no-repeat;background-size:100% 100%;background-position:center center;filter:saturate(1.08) contrast(1.04);transform:translateX(0);animation:60s linear infinite expeditionBackdropPan}",
    ".expedition-arena::after{content:\"\";z-index:4;pointer-events:none;position:absolute;left:31%;bottom:10%;width:57%;height:32%;opacity:0;background:radial-gradient(ellipse at 35% 74%,#f8fafc66 0 8%,transparent 23%),radial-gradient(ellipse at 62% 68%,#ffd16666 0 7%,transparent 21%),radial-gradient(ellipse at 83% 74%,#9fd4c966 0 7%,transparent 20%);animation:1.28s steps(5,end) infinite expeditionDustBurst}",
    ".expedition-arena-info{background:#0f172a9c;border-color:#ffffff30;backdrop-filter:blur(1.5px)}",
    ".expedition-party-visual.running{animation:3.2s ease-in-out infinite expeditionPartyAdvance}",
    ".expedition-party-visual.running .expedition-unit-avatar.large{animation-duration:1.04s;animation-timing-function:steps(4,end);animation-iteration-count:infinite}",
    ".expedition-party-visual.running .unit-1,.expedition-party-visual.running .unit-4{animation-name:expeditionAllyMeleeA}",
    ".expedition-party-visual.running .unit-2,.expedition-party-visual.running .unit-5{animation-name:expeditionAllyMeleeB;animation-delay:.16s}",
    ".expedition-party-visual.running .unit-3{animation-name:expeditionAllyMeleeC;animation-delay:.28s}",
    ".expedition-party-visual.running .expedition-unit-avatar.large::after{content:\"\";pointer-events:none;position:absolute;left:64%;top:40%;width:30px;height:10px;opacity:0;background:linear-gradient(90deg,transparent,#fff,#9fd4c9,transparent);clip-path:polygon(0 45%,76% 0,100% 50%,76% 100%,0 58%);filter:drop-shadow(0 0 5px #fff7);animation:1.04s steps(4,end) infinite expeditionAllySpark;animation-delay:inherit}",
    ".expedition-enemy-group .expedition-enemy-visual,.expedition-enemy-visual.boss{filter:drop-shadow(4px 5px #00000052)}",
    ".expedition-enemy-group .expedition-enemy-visual{animation:1.2s steps(4,end) infinite expeditionEnemyIdle}",
    ".expedition-enemy-group .expedition-enemy-visual::before,.expedition-enemy-visual.boss::before{transform-origin:50% 100%;animation:1.18s steps(3,end) infinite expeditionEnemySpriteIdle}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child{animation:.78s steps(4,end) infinite expeditionEnemyKnockback}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child::before,.expedition-enemy-visual.boss::before{animation:.78s steps(4,end) infinite expeditionEnemyHurtSprite}",
    ".expedition-enemy-group .expedition-enemy-visual:first-child::after,.expedition-enemy-visual.boss::after{content:\"\";pointer-events:none;position:absolute;left:50%;top:43%;z-index:3;width:90%;height:58%;border:2px solid #fff9;border-radius:50%;opacity:0;transform:translate(-50%,-50%) scale(.38);box-shadow:0 0 0 3px #ffd16655,0 0 17px #ef476f70;animation:.78s steps(4,end) infinite expeditionEnemyShock}",
    ".expedition-impact{z-index:7;opacity:.95;background:linear-gradient(90deg,transparent,#fff 18%,#ffd166 52%,#ef476f 78%,transparent);width:74px;height:24px;top:40%;left:54%;clip-path:polygon(0 45%,78% 0,100% 50%,78% 100%,0 58%);filter:drop-shadow(0 0 8px #fff8);animation:.78s steps(4,end) infinite expeditionImpactSlash}",
    ".expedition-impact.ready{opacity:1;background:linear-gradient(90deg,transparent,#fff 15%,#fef3c7 42%,#9fd4c9 70%,transparent)}",
  ];
  expeditionBackdrops.items.forEach((item) => {
    lines.push(`.expedition-scene.backdrop-${item.backdrop}{--expedition-bg-y:${positionPercent(item.row, expeditionBackdrops.items.length)}}`);
  });
  companions.items.forEach((item) => {
    const x = positionPercent(item.index, companions.items.length);
    const className = item.id.replace(/^helper-/, "");
    lines.push(`.sprite-${item.id},.${item.id}{--visual-unit-x:${x}}`);
    lines.push(`.prop-${className}{--visual-unit-x:${x}}`);
  });

  lines.push(
    ".expedition-enemy-visual::before{content:\"\";z-index:1;pointer-events:none;background-image:url(__STUDENT_ASSET_008__);background-repeat:no-repeat;background-size:4000% 100%;background-position:var(--visual-enemy-x,0%) 0;image-rendering:pixelated;position:absolute;inset:-10px -12px 2px -12px}",
    ".expedition-enemy-visual .enemy-body{display:none}",
    ".expedition-enemy-visual .enemy-shadow{z-index:0}",
    ".expedition-enemy-visual .enemy-name,.expedition-enemy-visual strong,.expedition-enemy-visual small,.expedition-boss-health{z-index:2}",
    ".expedition-enemy-group .expedition-enemy-visual::before{inset:6px -7px 4px -7px}",
    ".expedition-enemy-visual.boss::before{inset:-2px 10px 14px 0}",
  );
  enemies.items.forEach((item) => {
    const x = positionPercent(item.index, enemies.items.length);
    if (item.boss) lines.push(`.expedition-enemy-visual.boss.enemy-tone-${item.tone}{--visual-enemy-x:${x}}`);
    else {
      const mob = item.id.split("-").at(-1);
      lines.push(`.expedition-enemy-visual.mob-${mob}.enemy-tone-${item.tone}{--visual-enemy-x:${x}}`);
    }
  });

  lines.push(
    ".career-portrait{background-image:url(__STUDENT_ASSET_009__);background-repeat:no-repeat;background-size:6200% 100%;background-position:var(--visual-career-x,0%) 0;image-rendering:pixelated;background-color:#eef2f7}",
    ".career-choice.ranked{grid-template-columns:42px 36px minmax(0,1fr) minmax(76px,auto)}",
    ".career-choice-aura{border:1px solid #20293824;border-radius:8px;width:34px;height:34px;box-shadow:inset 0 -8px #00000024,0 2px 7px #0f172a1f}",
    ".career-emblem{background-size:6200% 100%;background-position:var(--visual-career-x,0%) 0;box-shadow:inset 0 -8px #00000024,0 2px 7px #0f172a1f}",
    "@media (width<=390px){.career-choice.ranked{grid-template-columns:36px 32px minmax(0,1fr);gap:7px}.career-choice-aura{width:32px;height:32px}.career-choice.ranked .career-choice-state{grid-column:3}}",
  );
  careers.items.forEach((item) => {
    lines.push(`.career-${sanitizeClass(item.careerId)}{--visual-career-x:${positionPercent(item.index, careers.items.length)}}`);
  });

  lines.push(
    ".battle-enemy-card{grid-template-columns:32px minmax(0,1fr);align-items:center;column-gap:5px;overflow:hidden}",
    ".battle-enemy-card>.battle-enemy-monster{grid-column:1;grid-row:1/4}",
    ".battle-enemy-card>div:first-of-type,.battle-enemy-card>.enemy-hp-bar,.battle-enemy-card>small{grid-column:2}",
    ".battle-enemy-card>div:first-of-type{justify-content:space-between;align-items:center;gap:5px;min-width:0;display:flex}",
    ".battle-enemy-monster{width:32px;height:32px;display:block;background-image:url(__STUDENT_ASSET_003__);background-repeat:no-repeat;background-size:19200% 100%;background-position:var(--monster-frame-x,0%) 0;image-rendering:pixelated;filter:drop-shadow(2px 3px #00000052)}",
    ".battle-enemy-card.boss .battle-enemy-monster,.battle-enemy-card.suneung .battle-enemy-monster{width:36px;height:36px;margin-left:-3px;transform:scale(1.04)}",
    ".pixel-arena .battle-enemy-card{grid-template-columns:24px minmax(0,1fr);column-gap:2px;min-height:35px;padding:2px 3px}",
    ".pixel-arena .battle-enemy-card>.battle-enemy-monster{width:25px;height:25px;margin-left:-3px}",
    ".pixel-arena .battle-enemy-card.boss>.battle-enemy-monster,.pixel-arena .battle-enemy-card.suneung>.battle-enemy-monster{width:28px;height:28px;margin-left:-4px}",
    ".pixel-arena .battle-enemy-card>div:first-of-type{display:grid;gap:0}",
    ".pixel-arena .battle-enemy-card strong,.pixel-arena .battle-enemy-card span{line-height:1.05}",
    ".pixel-arena .enemy-stack{display:none}",
    ".pixel-arena .enemy-stack .encounter-name{display:none}",
    ".pixel-arena .arena-background-sheet{left:-4%;width:108%;animation:60s ease-in-out infinite alternate arenaTreadmill;filter:saturate(1.08) contrast(1.02)}",
    ".pixel-arena .arena-background-grid{display:none}",
    ".pixel-arena .pixel-floor{left:0;right:0;background:linear-gradient(180deg,transparent 0%,#0f172a54 82%,#0f172a7a 100%);animation:none;box-shadow:none}",
    ".pixel-arena .pencil-shot,.pixel-arena .pencil-shot.active{opacity:0;animation:none}",
    ".pixel-arena .student-sprite{z-index:8;animation:1.45s steps(6,end) infinite studentCombatLoop}",
    ".pixel-arena .student-art{transform-origin:50% 100%;animation:.58s steps(2,end) infinite studentSpriteIdle}",
    ".pixel-arena .student-sprite::before{content:\"\";pointer-events:none;position:absolute;left:30%;bottom:-5px;width:54px;height:14px;opacity:0;background:radial-gradient(ellipse at 35% 60%,#f8fafc99 0 18%,transparent 38%),radial-gradient(ellipse at 70% 50%,#9fd4c98a 0 16%,transparent 36%);filter:blur(.2px);animation:1.45s steps(6,end) infinite studentDashDust}",
    ".pixel-arena .student-sprite::after{content:\"\";pointer-events:none;position:absolute;left:55%;top:27%;width:72px;height:20px;opacity:0;background:linear-gradient(90deg,transparent,#fff 20%,#f4d35e 52%,#ef476f 76%,transparent);clip-path:polygon(0 45%,72% 0,100% 50%,72% 100%,0 55%);transform-origin:left center;filter:drop-shadow(0 0 5px #fff4);animation:1.45s steps(6,end) infinite studentMeleeSlash}",
    ".pixel-arena .helper-party{left:30%;bottom:20%;z-index:7;gap:0;transform:translateX(-50%)}",
    ".pixel-arena .helper-sprite{margin-left:-2px;animation:1.62s steps(4,end) infinite helperAllyLoop}",
    ".pixel-arena .helper-slot-1{--helper-x:-8px;--helper-y:5px;--helper-scale:.9;animation-delay:.16s}",
    ".pixel-arena .helper-slot-2{--helper-x:2px;--helper-y:-6px;--helper-scale:.98;animation-delay:.34s}",
    ".pixel-arena .helper-slot-3{--helper-x:12px;--helper-y:3px;--helper-scale:.9;animation-delay:.52s}",
    ".pixel-arena .helper-sprite::after{content:\"\";pointer-events:none;position:absolute;left:63%;top:35%;width:22px;height:9px;opacity:0;background:linear-gradient(90deg,transparent,#9fd4c9,#fff,transparent);clip-path:polygon(0 42%,75% 0,100% 50%,75% 100%,0 58%);animation:1.62s steps(4,end) infinite helperAssistSpark;animation-delay:inherit}",
    ".battle-scene-lineup{position:absolute;inset:0;z-index:5;pointer-events:none}",
    ".battle-scene-lineup::before{content:\"\";pointer-events:none;position:absolute;left:34%;bottom:16%;width:60%;height:20%;opacity:0;background:radial-gradient(ellipse at 24% 76%,#f8fafc66 0 7%,transparent 21%),radial-gradient(ellipse at 52% 68%,#ffd16666 0 6%,transparent 19%),radial-gradient(ellipse at 78% 72%,#9fd4c966 0 6%,transparent 18%);animation:1.45s steps(6,end) infinite battleDustBurst}",
    ".battle-scene-lineup::after{content:\"\";pointer-events:none;position:absolute;left:34%;top:23%;width:58%;height:56%;opacity:0;background:radial-gradient(circle at 50% 50%,#fff6 0 8%,#ffd16652 9% 18%,transparent 36%);animation:1.45s steps(6,end) infinite battleImpactFlash}",
    ".battle-scene-enemy{position:absolute;left:var(--scene-enemy-left,70%);top:var(--scene-enemy-top,70%);z-index:var(--scene-enemy-z,10);width:42px;height:42px;transform:translate(-50%,-100%) scale(var(--scene-enemy-scale,1));transform-origin:50% 100%;filter:drop-shadow(3px 5px #00000057);animation:1.36s steps(4,end) infinite enemyCombatStep;animation-delay:var(--scene-enemy-delay,0s)}",
    ".battle-scene-enemy.boss,.battle-scene-enemy.suneung{width:58px;height:58px;filter:drop-shadow(4px 6px #00000066)}",
    ".battle-scene-enemy.active{animation:.72s steps(4,end) infinite enemyEngagedStep}",
    ".battle-scene-enemy.active::before{content:\"\";pointer-events:none;position:absolute;left:50%;top:45%;z-index:2;width:92%;height:62%;border:2px solid #fff9;border-radius:50%;opacity:0;transform:translate(-50%,-50%) scale(.38);box-shadow:0 0 0 3px #ffd16655,0 0 18px #ef476f66;animation:.72s steps(4,end) infinite enemyShockRing}",
    ".battle-scene-enemy.active::after{content:\"\";pointer-events:none;position:absolute;left:-22%;top:18%;z-index:3;width:130%;height:42%;opacity:0;background:linear-gradient(90deg,transparent,#fff 24%,#ffd166 52%,#ef476f 74%,transparent);clip-path:polygon(0 45%,72% 0,100% 50%,72% 100%,0 56%);transform:rotate(-16deg);filter:drop-shadow(0 0 6px #fff8);animation:.72s steps(4,end) infinite enemyHitSpark}",
    ".battle-scene-enemy.boss.active::after,.battle-scene-enemy.suneung.active::after{left:-16%;top:20%;width:140%;height:38%}",
    ".battle-scene-enemy.defeated{opacity:.32;filter:grayscale(.75) drop-shadow(2px 3px #00000040);animation:none}",
    ".battle-scene-enemy.defeated .battle-scene-monster-art{animation:none}",
    ".battle-scene-enemy.slot-1{--scene-enemy-delay:-.04s}.battle-scene-enemy.slot-2{--scene-enemy-delay:-.18s}.battle-scene-enemy.slot-3{--scene-enemy-delay:-.31s}.battle-scene-enemy.slot-4{--scene-enemy-delay:-.09s}.battle-scene-enemy.slot-5{--scene-enemy-delay:-.24s}.battle-scene-enemy.slot-6{--scene-enemy-delay:-.39s}.battle-scene-enemy.slot-7{--scene-enemy-delay:-.13s}.battle-scene-enemy.slot-8{--scene-enemy-delay:-.27s}.battle-scene-enemy.slot-9{--scene-enemy-delay:-.43s}.battle-scene-enemy.slot-10{--scene-enemy-delay:-.2s}.battle-scene-enemy.slot-11{--scene-enemy-delay:-.35s}.battle-scene-enemy.slot-12{--scene-enemy-delay:-.49s}",
    ".battle-scene-monster-art{position:absolute;inset:0;background-image:url(__STUDENT_ASSET_003__);background-repeat:no-repeat;background-size:19200% 100%;background-position:var(--monster-frame-x,0%) 0;image-rendering:pixelated;transform-origin:50% 100%;animation:1.18s steps(3,end) infinite enemyCombatBreath;animation-delay:inherit}",
    ".battle-scene-enemy.active .battle-scene-monster-art{animation:.72s steps(4,end) infinite enemyHurtLoop}",
    ".battle-scene-hp{position:absolute;left:50%;top:-8px;z-index:2;width:44px;height:6px;padding:1px;background:#17212ed9;border:1px solid #fff6;border-radius:999px;transform:translateX(-50%);box-shadow:0 1px 4px #0008;overflow:hidden}",
    ".battle-scene-hp::after{content:\"\";position:absolute;inset:1px;width:55%;background:linear-gradient(90deg,transparent,#fff7,transparent);transform:translateX(-130%);animation:1.25s linear infinite bossHpShine}",
    ".battle-scene-hp i{display:block;height:100%;min-width:2px;background:linear-gradient(90deg,#ef476f,#ffd166);border-radius:inherit}",
    ".battle-scene-enemy.normal .battle-scene-hp{display:none}",
    ".battle-scene-lineup.suneung .battle-scene-enemy{width:60px;height:60px}",
    ".phone-frame.reduced-effects .expedition-arena::before,.phone-frame.reduced-effects .expedition-arena::after,.phone-frame.reduced-effects .expedition-party-visual.running,.phone-frame.reduced-effects .expedition-unit-avatar.large,.phone-frame.reduced-effects .expedition-unit-avatar.large::after,.phone-frame.reduced-effects .expedition-enemy-visual,.phone-frame.reduced-effects .expedition-enemy-visual::before,.phone-frame.reduced-effects .expedition-enemy-visual::after,.phone-frame.reduced-effects .expedition-impact,.phone-frame.reduced-effects .arena-background-sheet,.phone-frame.reduced-effects .arena-background-grid,.phone-frame.reduced-effects .pixel-floor,.phone-frame.reduced-effects .student-sprite,.phone-frame.reduced-effects .student-art,.phone-frame.reduced-effects .student-sprite::before,.phone-frame.reduced-effects .student-sprite::after,.phone-frame.reduced-effects .helper-sprite,.phone-frame.reduced-effects .helper-sprite::after,.phone-frame.reduced-effects .battle-scene-lineup::before,.phone-frame.reduced-effects .battle-scene-lineup::after,.phone-frame.reduced-effects .battle-scene-enemy,.phone-frame.reduced-effects .battle-scene-enemy::before,.phone-frame.reduced-effects .battle-scene-enemy::after,.phone-frame.reduced-effects .battle-scene-monster-art,.phone-frame.reduced-effects .battle-scene-hp::after{animation-duration:.01ms;animation-iteration-count:1}",
    "@keyframes expeditionBackdropPan{0%{transform:translateX(0)}100%{transform:translateX(-58%)}}",
    "@keyframes expeditionPartyAdvance{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}",
    "@keyframes expeditionAllyMeleeA{0%,16%,76%,100%{transform:translate(0,0) rotate(-1deg)}32%,46%{transform:translate(24px,-5px) rotate(4deg)}60%{transform:translate(7px,1px) rotate(-2deg)}}",
    "@keyframes expeditionAllyMeleeB{0%,18%,74%,100%{transform:translate(0,0) rotate(1deg)}34%,48%{transform:translate(28px,-7px) rotate(-5deg)}60%{transform:translate(8px,1px) rotate(2deg)}}",
    "@keyframes expeditionAllyMeleeC{0%,20%,76%,100%{transform:translate(0,0) scale(1)}36%,50%{transform:translate(32px,-4px) scale(1.04)}64%{transform:translate(9px,1px) scale(.98)}}",
    "@keyframes expeditionAllySpark{0%,30%,68%,100%{opacity:0;transform:translateX(-8px) scaleX(.45)}38%,52%{opacity:.95;transform:translateX(18px) scaleX(1.1)}}",
    "@keyframes expeditionEnemyIdle{0%,100%{transform:translate(0,0)}30%{transform:translate(-2px,-3px)}62%{transform:translate(2px,1px)}}",
    "@keyframes expeditionEnemySpriteIdle{0%,100%{filter:brightness(1);transform:translateY(0) scale(1)}50%{filter:brightness(1.08);transform:translateY(-3px) scale(1.04,.97)}}",
    "@keyframes expeditionEnemyKnockback{0%,100%{transform:translate(0,0) rotate(0)}30%{transform:translate(-20px,-5px) rotate(-7deg)}52%{transform:translate(8px,2px) rotate(4deg)}72%{transform:translate(-5px,1px) rotate(-2deg)}}",
    "@keyframes expeditionEnemyHurtSprite{0%,100%{filter:brightness(1);transform:translateY(0) rotate(0) scale(1)}30%{filter:brightness(1.95) saturate(1.45);transform:translate(-8px,-3px) rotate(-8deg) scale(.92,1.06)}52%{filter:brightness(1.22);transform:translate(5px,2px) rotate(4deg) scale(1.04,.96)}}",
    "@keyframes expeditionEnemyShock{0%,24%,70%,100%{opacity:0;transform:translate(-50%,-50%) scale(.35)}34%,52%{opacity:.9;transform:translate(-50%,-50%) scale(1.2)}}",
    "@keyframes expeditionImpactSlash{0%,28%,68%,100%{opacity:0;transform:rotate(-14deg) translateX(-14px) scaleX(.45)}38%,52%{opacity:1;transform:rotate(-14deg) translateX(12px) scaleX(1.12)}}",
    "@keyframes expeditionDustBurst{0%,30%,64%,100%{opacity:0;transform:translateX(0) scale(.7)}40%,54%{opacity:.72;transform:translateX(-10px) scale(1.08)}}",
    "@keyframes arenaTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-24px)}}",
    "@keyframes gridTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-18px)}}",
    "@keyframes floorTreadmill{0%{transform:translateX(0)}100%{transform:translateX(-28px)}}",
    "@keyframes studentCombatLoop{0%,18%,72%,100%{transform:translateX(-50%) translate(0,0) scale(var(--student-scale))}26%{transform:translateX(-50%) translate(12px,-3px) scale(var(--student-scale))}38%,48%{transform:translateX(-50%) translate(76px,-6px) scale(var(--student-scale))}60%{transform:translateX(-50%) translate(18px,2px) scale(var(--student-scale))}}",
    "@keyframes studentSpriteIdle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02,.98)}}",
    "@keyframes studentDashDust{0%,26%,64%,100%{opacity:0;transform:translate(0,0) scale(.45)}38%,50%{opacity:.72;transform:translate(60px,3px) scale(1)}}",
    "@keyframes studentMeleeSlash{0%,29%,58%,100%{opacity:0;transform:translate(14px,5px) rotate(-13deg) scaleX(.42)}38%,48%{opacity:.95;transform:translate(84px,-1px) rotate(-13deg) scaleX(1)}}",
    "@keyframes helperAllyLoop{0%,14%,76%,100%{transform:translate(var(--helper-x),var(--helper-y)) scale(var(--helper-scale))}24%{transform:translate(var(--helper-x),calc(var(--helper-y) - 3px)) scale(var(--helper-scale))}38%,48%{transform:translate(calc(var(--helper-x) + 20px),calc(var(--helper-y) - 5px)) scale(var(--helper-scale))}60%{transform:translate(calc(var(--helper-x) + 6px),calc(var(--helper-y) + 1px)) scale(var(--helper-scale))}}",
    "@keyframes helperAssistSpark{0%,34%,62%,100%{opacity:0;transform:translate(0,0) scaleX(.5)}42%,52%{opacity:.82;transform:translate(22px,-3px) scaleX(1)}}",
    "@keyframes enemyCombatStep{0%,100%{transform:translate(-50%,-100%) translate(0,0) scale(var(--scene-enemy-scale,1))}24%{transform:translate(-50%,-100%) translate(-3px,-4px) scale(var(--scene-enemy-scale,1))}50%{transform:translate(-50%,-100%) translate(2px,1px) scale(var(--scene-enemy-scale,1))}74%{transform:translate(-50%,-100%) translate(-1px,-2px) scale(var(--scene-enemy-scale,1))}}",
    "@keyframes enemyEngagedStep{0%,100%{transform:translate(-50%,-100%) translate(0,0) rotate(0) scale(var(--scene-enemy-scale,1))}28%{transform:translate(-50%,-100%) translate(-24px,-7px) rotate(-7deg) scale(var(--scene-enemy-scale,1))}50%{transform:translate(-50%,-100%) translate(10px,3px) rotate(4deg) scale(var(--scene-enemy-scale,1))}70%{transform:translate(-50%,-100%) translate(-8px,-2px) rotate(-3deg) scale(var(--scene-enemy-scale,1))}}",
    "@keyframes enemyCombatBreath{0%,100%{filter:brightness(1);transform:translateY(0) scale(1)}50%{filter:brightness(1.08);transform:translateY(-3px) scale(1.05,.96)}}",
    "@keyframes enemyHurtLoop{0%,100%{filter:brightness(1);transform:translate(0,0) rotate(0) scale(1)}30%{filter:brightness(1.95) saturate(1.45);transform:translate(-12px,-3px) rotate(-9deg) scale(.91,1.06)}52%{filter:brightness(1.25);transform:translate(7px,2px) rotate(5deg) scale(1.05,.96)}70%{filter:brightness(1.12);transform:translate(-4px,1px) rotate(-3deg) scale(.98)}}",
    "@keyframes enemyShockRing{0%,26%,72%,100%{opacity:0;transform:translate(-50%,-50%) scale(.35)}34%,50%{opacity:.9;transform:translate(-50%,-50%) scale(1.18)}}",
    "@keyframes enemyHitSpark{0%,26%,68%,100%{opacity:0;transform:rotate(-16deg) translateX(-14px) scaleX(.45)}34%,50%{opacity:1;transform:rotate(-16deg) translateX(14px) scaleX(1.18)}}",
    "@keyframes battleDustBurst{0%,30%,62%,100%{opacity:0;transform:translateX(0) scale(.72)}40%,52%{opacity:.62;transform:translateX(-8px) scale(1.08)}}",
    "@keyframes battleImpactFlash{0%,35%,58%,100%{opacity:0;transform:scale(.7)}44%,50%{opacity:.42;transform:scale(1)}}",
    "@keyframes bossHpShine{0%{transform:translateX(-130%)}100%{transform:translateX(210%)}}",
    "@media (width<=390px){.battle-enemy-grid.compact{gap:3px}.battle-enemy-card{grid-template-columns:28px minmax(0,1fr)}.battle-enemy-monster{width:29px;height:29px}.pixel-arena .battle-enemy-card{grid-template-columns:22px minmax(0,1fr);min-height:34px}.pixel-arena .battle-enemy-card>.battle-enemy-monster{width:23px;height:23px}}",
    "@media (width<=390px){.battle-scene-enemy{width:36px;height:36px}.battle-scene-enemy.boss,.battle-scene-enemy.suneung{width:50px;height:50px}.battle-scene-lineup.suneung .battle-scene-enemy{width:52px;height:52px}.battle-scene-hp{top:-7px;width:38px;height:5px}}",
  );
  const mainMonsterTotal = Math.max(1, Math.round(mainMonsters.width / mainMonsters.cell));
  mainMonsters.items.forEach((item) => {
    lines.push(`.${item.id}{--monster-frame-x:${positionPercent(item.frame, mainMonsterTotal)}}`);
  });
  return `${lines.join("\n")}\n`;
}

function upsertManifestAsset(manifest, token, file, atlas) {
  const buffer = readFileSync(atlas.path);
  const info = {
    token,
    file,
    mime: "image/png",
    bytes: buffer.length,
    sha256: sha256(buffer),
    width: atlas.width,
    height: atlas.height,
  };
  manifest.assets = (manifest.assets || []).filter((asset) => asset.token !== token);
  manifest.assets.push(info);
  manifest.assets.sort((a, b) => a.token.localeCompare(b.token));
  return info;
}

function enrichCareers(careers, careerAtlas) {
  const byId = new Map(careerAtlas.items.map((item) => [item.careerId, item]));
  return careers.map((career) => {
    const item = byId.get(career.id);
    const helper = sanitizeClass(career.helperSprite ?? "helper-files");
    return {
      ...career,
      portraitAsset: item?.id ?? `career-${career.id}`,
      spriteAsset: career.spriteAsset ?? `unit-${helper}`,
      iconAsset: career.iconAsset ?? `icon-${helper.replace(/^helper-/, "")}`,
    };
  });
}

function toneForChapter(chapter) {
  return enemyTones[Math.max(0, chapter - 1) % enemyTones.length].id;
}

function enrichStages(stages) {
  return stages.map((stage) => {
    const tone = toneForChapter(stage.chapter);
    const variant = ((stage.segment - 1) % 3) + 1;
    return {
      ...stage,
      enemyAsset: stage.enemyAsset ?? `${tone}-mob-${variant}`,
      enemyVariant: stage.enemyVariant ?? variant,
    };
  });
}

function enrichBosses(bosses) {
  return bosses.map((boss) => {
    const tone = toneForChapter(boss.chapter);
    return {
      ...boss,
      bossAsset: boss.bossAsset ?? `${tone}-boss`,
    };
  });
}

function enrichGradeVisuals(gradeVisuals) {
  return gradeVisuals.map((visual) => ({
    ...visual,
    studentAsset: `main-student-${String(visual.studentFrame).padStart(3, "0")}`,
    normalMonsterAssets: visual.normalMonsterFrames.map((frame) => `main-monster-${String(frame).padStart(3, "0")}`),
    examMonsterAssets: Object.fromEntries(
      Object.entries(visual.examMonsterFrames).map(([key, frame]) => [key, `main-monster-${String(frame).padStart(3, "0")}`]),
    ),
  }));
}

const careers = JSON.parse(readFileSync(careersPath, "utf8"));
const gradeVisuals = JSON.parse(readFileSync(gradeVisualsPath, "utf8"));
const stages = JSON.parse(readFileSync(stagesPath, "utf8"));
const bosses = JSON.parse(readFileSync(bossesPath, "utf8"));
const mainStudentAtlas = buildMainStudentAtlas(gradeVisuals);
const mainMonsterAtlas = buildMainMonsterAtlas(gradeVisuals);
const companionAtlas = buildCompanionAtlas();
const enemyAtlas = buildEnemyAtlas();
const careerAtlas = buildCareerAtlas(careers);
const expeditionBackdropAtlas = buildExpeditionBackdropAtlas();

writeFileSync(cssPath, buildCss(companionAtlas, enemyAtlas, careerAtlas, mainMonsterAtlas, expeditionBackdropAtlas), "utf8");
writeFileSync(careersPath, `${JSON.stringify(enrichCareers(careers, careerAtlas), null, 2)}\n`, "utf8");
writeFileSync(gradeVisualsPath, `${JSON.stringify(enrichGradeVisuals(gradeVisuals), null, 2)}\n`, "utf8");
writeFileSync(stagesPath, `${JSON.stringify(enrichStages(stages), null, 2)}\n`, "utf8");
writeFileSync(bossesPath, `${JSON.stringify(enrichBosses(bosses), null, 2)}\n`, "utf8");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifestAssets = [
  upsertManifestAsset(manifest, "__STUDENT_ASSET_002__", "assets/asset-002.png", mainStudentAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_003__", "assets/asset-003.png", mainMonsterAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_007__", "assets/visual-companions.png", companionAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_008__", "assets/visual-enemies.png", enemyAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_009__", "assets/visual-careers.png", careerAtlas),
  upsertManifestAsset(manifest, "__STUDENT_ASSET_010__", "assets/visual-expedition-backdrops.png", expeditionBackdropAtlas),
];
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const visualData = {
  version: 1,
  style: "pixel-voxel",
  generatedBy: "tools/build-visual-assets.mjs",
  atlases: [
    { id: "mainStudents", token: "__STUDENT_ASSET_002__", file: "assets/asset-002.png", cell: mainStudentAtlas.cell, width: mainStudentAtlas.width, height: mainStudentAtlas.height, items: mainStudentAtlas.items },
    { id: "mainMonsters", token: "__STUDENT_ASSET_003__", file: "assets/asset-003.png", cell: mainMonsterAtlas.cell, width: mainMonsterAtlas.width, height: mainMonsterAtlas.height, items: mainMonsterAtlas.items },
    { id: "companions", token: "__STUDENT_ASSET_007__", file: "assets/visual-companions.png", cell: companionAtlas.cell, width: companionAtlas.width, height: companionAtlas.height, items: companionAtlas.items },
    { id: "enemies", token: "__STUDENT_ASSET_008__", file: "assets/visual-enemies.png", cell: enemyAtlas.cell, width: enemyAtlas.width, height: enemyAtlas.height, items: enemyAtlas.items },
    { id: "careers", token: "__STUDENT_ASSET_009__", file: "assets/visual-careers.png", cell: careerAtlas.cell, width: careerAtlas.width, height: careerAtlas.height, items: careerAtlas.items },
  ],
  backgrounds: [
    {
      id: "expeditionBackdrops",
      token: "__STUDENT_ASSET_010__",
      file: "assets/visual-expedition-backdrops.png",
      width: expeditionBackdropAtlas.width,
      height: expeditionBackdropAtlas.height,
      rowHeight: expeditionBackdropAtlas.rowHeight,
      items: expeditionBackdropAtlas.items,
    },
  ],
};
mkdirSync(dirname(visualDataPath), { recursive: true });
writeFileSync(visualDataPath, `${JSON.stringify(visualData, null, 2)}\n`, "utf8");

console.log(`VISUAL_ASSETS_BUILT students=${mainStudentAtlas.items.length} mainMonsters=${mainMonsterAtlas.items.length} companions=${companionAtlas.items.length} enemies=${enemyAtlas.items.length} careers=${careerAtlas.items.length} backdrops=${expeditionBackdropAtlas.items.length}`);
for (const asset of manifestAssets) {
  console.log(`${asset.token} ${asset.file} ${asset.width}x${asset.height} bytes=${asset.bytes}`);
}

if (!existsSync(resolve("src/snapshot/index.template.html"))) {
  throw new Error("snapshot template missing");
}
