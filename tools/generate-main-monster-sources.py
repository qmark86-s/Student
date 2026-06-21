from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_PATH = ROOT / "assets" / "reference" / "character-ref-cute-sd.png"
GRADE_VISUALS_PATH = ROOT / "data" / "grade_visuals.json"
SOURCE_DIR = ROOT / "assets" / "visual-source" / "main-monsters"
SOURCE_PATH = SOURCE_DIR / "main-monsters-green.png"
SAMPLE_DIR = ROOT / "artifacts" / "visual-asset-samples"
CUTOUT_PREVIEW_PATH = SAMPLE_DIR / "reference-main-monster-cutouts-preview.png"

CELL = 96
FRAME_COUNT = 192
GREEN = (0, 255, 0, 255)
INK = (24, 27, 37, 255)

# Rects are intentionally one monster at a time. Do not widen these to include a row
# or neighboring object; that is how background fragments and half props leak in.
REFERENCE_RECTS = {
    "spiral_note": (784, 24, 228, 166),
    "crayon_box": (1018, 16, 230, 176),
    "sticker_sheet": (1240, 18, 214, 172),
    "open_book": (772, 202, 226, 172),
    "green_book": (1008, 194, 220, 188),
    "pencil_box": (1230, 198, 242, 176),
    "calendar": (762, 388, 232, 178),
    "locker": (1026, 374, 214, 194),
    "folder": (1240, 386, 224, 184),
    "omr": (780, 584, 222, 190),
    "paper_box": (1020, 580, 232, 196),
    "timer": (1260, 590, 212, 184),
    "coffee": (720, 774, 212, 230),
    "lamp": (936, 756, 184, 252),
    "desk_calendar": (1148, 774, 168, 220),
    "yellow_book": (1320, 774, 202, 228),
}

PHASE_MOTIFS = {
    "elementary": ["spiral_note", "crayon_box", "sticker_sheet", "open_book", "pencil_box", "calendar"],
    "middle": ["open_book", "green_book", "pencil_box", "calendar", "locker", "folder"],
    "high": ["calendar", "locker", "folder", "omr", "paper_box", "timer"],
    "repeater": ["omr", "paper_box", "timer", "coffee", "lamp", "desk_calendar", "yellow_book"],
}

EXAM_MOTIFS = {
    "elementary": {
        "march_eval": "spiral_note",
        "midterm": "crayon_box",
        "final": "sticker_sheet",
        "year_boss": "open_book",
    },
    "middle": {
        "march_eval": "calendar",
        "midterm": "green_book",
        "final": "folder",
        "year_boss": "locker",
    },
    "high": {
        "march_eval": "calendar",
        "midterm": "omr",
        "final": "paper_box",
        "year_boss": "timer",
    },
    "repeater": {
        "march_eval": "coffee",
        "midterm": "desk_calendar",
        "final": "omr",
        "year_boss": "yellow_book",
    },
}


def project_path(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def stable_index(value: str, modulo: int) -> int:
    total = 0
    for index, char in enumerate(value):
        total += (index + 1) * ord(char)
    return total % max(1, modulo)


def distance(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def chroma(color: tuple[int, int, int, int]) -> int:
    return max(color[:3]) - min(color[:3])


def is_protected_sprite_color(color: tuple[int, int, int, int]) -> bool:
    r, g, b, a = color
    if a <= 8:
        return False
    value = max(r, g, b)
    saturation = chroma(color)
    dark_outline = value < 105
    saturated_detail = saturation > 48
    warm_skin_or_shadow = r > g + 10 and g > b + 4 and r - b > 34 and r > 125
    blue_gray_object = b > r + 18 and value > 110 and saturation > 26
    return dark_outline or saturated_detail or warm_skin_or_shadow or blue_gray_object


def is_background_candidate(
    color: tuple[int, int, int, int],
    samples: list[tuple[int, int, int, int]],
) -> bool:
    r, g, b, a = color
    if a <= 8:
        return True
    if is_protected_sprite_color(color):
        return False
    value = max(r, g, b)
    low_chroma = chroma(color) <= 38
    beige_or_gray_matte = low_chroma and r >= 112 and g >= 108 and b >= 102
    row_rule_or_soft_shadow = low_chroma and 96 <= value <= 190
    close_to_edge = any(distance(color, sample) <= 58 for sample in samples)
    return close_to_edge or beige_or_gray_matte or row_rule_or_soft_shadow


def remove_reference_background(crop: Image.Image) -> Image.Image:
    image = crop.convert("RGBA")
    width, height = image.size
    rgb = np.array(image.convert("RGB"))
    mask = np.zeros((height, width), np.uint8)
    rect = (6, 6, max(1, width - 12), max(1, height - 12))
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, mask, rect, bgd_model, fgd_model, 6, cv2.GC_INIT_WITH_RECT)
    foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype("uint8")
    kernel = np.ones((3, 3), np.uint8)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, kernel, iterations=1)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, kernel, iterations=1)
    alpha = (foreground * 255).astype("uint8")
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    rgba = np.array(image)
    rgba[:, :, 3] = np.minimum(rgba[:, :, 3], alpha)
    return prune_alpha_components(crop_to_alpha_bounds(Image.fromarray(rgba, "RGBA"), pad=5))


def prune_alpha_components(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    visited = [[False] * width for _ in range(height)]
    components = []

    for start_y in range(height):
        for start_x in range(width):
            if visited[start_y][start_x] or pixels[start_x, start_y][3] <= 12:
                continue
            queue = deque([(start_x, start_y)])
            visited[start_y][start_x] = True
            area = 0
            min_x = max_x = start_x
            min_y = max_y = start_y
            points = []
            while queue:
                x, y = queue.popleft()
                area += 1
                points.append((x, y))
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if visited[ny][nx] or pixels[nx, ny][3] <= 12:
                        continue
                    visited[ny][nx] = True
                    queue.append((nx, ny))
            components.append(
                {
                    "area": area,
                    "minX": min_x,
                    "maxX": max_x,
                    "minY": min_y,
                    "maxY": max_y,
                    "points": points,
                }
            )

    if len(components) <= 1:
        return image

    largest = max(components, key=lambda item: item["area"])
    keep = set()
    for component in components:
        near_largest = (
            component["maxX"] >= largest["minX"] - 58
            and component["minX"] <= largest["maxX"] + 58
            and component["maxY"] >= largest["minY"] - 42
            and component["minY"] <= largest["maxY"] + 42
        )
        if component is largest or (component["area"] >= 120 and near_largest) or component["area"] >= largest["area"] * 0.1:
            keep.update(component["points"])

    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] > 0 and (x, y) not in keep:
                r, g, b, _a = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return crop_to_alpha_bounds(image, pad=5)


def crop_to_alpha_bounds(image: Image.Image, pad: int) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    min_x, min_y = width, height
    max_x, max_y = -1, -1
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] <= 8:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x < min_x or max_y < min_y:
        raise ValueError("Reference monster crop became empty after background removal.")
    return image.crop(
        (
            max(0, min_x - pad),
            max(0, min_y - pad),
            min(width, max_x + pad + 1),
            min(height, max_y + pad + 1),
        ),
    )


def load_reference_cutouts() -> dict[str, Image.Image]:
    if not REFERENCE_PATH.exists():
        raise FileNotFoundError(f"Reference image missing: {project_path(REFERENCE_PATH)}")
    reference = Image.open(REFERENCE_PATH).convert("RGBA")
    cutouts = {}
    for name, rect in REFERENCE_RECTS.items():
        x, y, w, h = rect
        cutout = remove_reference_background(reference.crop((x, y, x + w, y + h)))
        # Keep the reference cutout orientation. In the battle layout this is the
        # horizontal inverse of the previous output and reads as monsters facing
        # the student party from the right side of the arena.
        cutouts[name] = cutout
    return cutouts


def fit_to_cell(source: Image.Image, boss: bool, variant_key: str) -> Image.Image:
    max_w = 90 if boss else 86
    max_h = 88 if boss else 84
    width, height = source.size
    scale = min(max_w / width, max_h / height)
    draw_w = max(1, round(width * scale))
    draw_h = max(1, round(height * scale))
    sprite = source.resize((draw_w, draw_h), Image.Resampling.LANCZOS)

    # Keep subtle deterministic differences without losing the reference look.
    brightness = 0.98 + stable_index(variant_key + "-brightness", 5) * 0.01
    contrast = 1.0 + stable_index(variant_key + "-contrast", 4) * 0.015
    sprite = ImageEnhance.Brightness(sprite).enhance(brightness)
    sprite = ImageEnhance.Contrast(sprite).enhance(contrast)

    cell = Image.new("RGBA", (CELL, CELL), GREEN)
    offset_x = round((CELL - draw_w) / 2)
    offset_y = round(CELL - draw_h - (4 if boss else 5))
    paste_preserving_alpha(cell, sprite, offset_x, offset_y)
    return cell


def paste_preserving_alpha(target: Image.Image, source: Image.Image, offset_x: int, offset_y: int) -> None:
    target_pixels = target.load()
    source_pixels = source.load()
    for y in range(source.height):
        ty = offset_y + y
        if ty < 0 or ty >= target.height:
            continue
        for x in range(source.width):
            tx = offset_x + x
            if tx < 0 or tx >= target.width:
                continue
            pixel = source_pixels[x, y]
            if pixel[3] > 0:
                target_pixels[tx, ty] = pixel


def choose_normal_motif(visual: dict, variant: int, name: str) -> str:
    pool = PHASE_MOTIFS.get(visual["phase"], PHASE_MOTIFS["repeater"])
    return pool[(variant + stable_index(name, len(pool))) % len(pool)]


def choose_exam_motif(visual: dict, monster_type: str) -> str:
    by_phase = EXAM_MOTIFS.get(visual["phase"], EXAM_MOTIFS["repeater"])
    return by_phase.get(monster_type, by_phase["year_boss"])


def load_grade_visuals() -> list[dict]:
    return json.loads(GRADE_VISUALS_PATH.read_text(encoding="utf-8"))


def build_sheet(cutouts: dict[str, Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * FRAME_COUNT, CELL), GREEN)
    for visual in load_grade_visuals():
        for variant, frame in enumerate(visual["normalMonsterFrames"]):
            name = visual["normalMonsterNames"][variant]
            motif = choose_normal_motif(visual, variant, name)
            cell = fit_to_cell(cutouts[motif], False, f"{frame}-{name}-{motif}")
            sheet.paste(cell, (frame * CELL, 0))
        for monster_type, frame in visual["examMonsterFrames"].items():
            name = visual["examMonsterNames"][monster_type]
            motif = choose_exam_motif(visual, monster_type)
            cell = fit_to_cell(cutouts[motif], True, f"{frame}-{name}-{motif}")
            sheet.paste(cell, (frame * CELL, 0))
    return sheet


def write_cutout_preview(cutouts: dict[str, Image.Image]) -> None:
    cols = 4
    scale = 2
    pad = 10
    label_h = 18
    preview_cell = 116
    rows = math.ceil(len(cutouts) / cols)
    preview = Image.new(
        "RGBA",
        (cols * (preview_cell * scale + pad) + pad, rows * (preview_cell * scale + label_h + pad) + pad),
        (12, 18, 28, 255),
    )
    draw = ImageDraw.Draw(preview)
    for index, (name, cutout) in enumerate(cutouts.items()):
        cx = index % cols
        cy = index // cols
        x = pad + cx * (preview_cell * scale + pad)
        y = pad + cy * (preview_cell * scale + label_h + pad)
        tile = Image.new("RGBA", (preview_cell, preview_cell), (18, 24, 35, 255))
        fitted = fit_to_cell(cutout, False, name)
        fitted_pixels = fitted.load()
        alpha_tile = Image.new("RGBA", (CELL, CELL), (18, 24, 35, 255))
        alpha_pixels = alpha_tile.load()
        for yy in range(CELL):
            for xx in range(CELL):
                r, g, b, a = fitted_pixels[xx, yy]
                if a > 0 and not (g > 220 and r < 60 and b < 60):
                    alpha_pixels[xx, yy] = (r, g, b, a)
        tile.alpha_composite(alpha_tile, ((preview_cell - CELL) // 2, (preview_cell - CELL) // 2))
        tile = tile.resize((preview_cell * scale, preview_cell * scale), Image.Resampling.NEAREST)
        draw.rectangle((x, y, x + preview_cell * scale, y + label_h), fill=(31, 41, 55, 255))
        draw.text((x + 4, y + 3), name, fill=(226, 232, 240, 255))
        preview.alpha_composite(tile, (x, y + label_h))
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(CUTOUT_PREVIEW_PATH)


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    cutouts = load_reference_cutouts()
    sheet = build_sheet(cutouts)
    sheet.save(SOURCE_PATH)
    write_cutout_preview(cutouts)
    print(
        "MAIN_MONSTER_SOURCE_BUILT "
        f"{project_path(SOURCE_PATH)} frames={FRAME_COUNT} cell={CELL} "
        f"reference={project_path(REFERENCE_PATH)} cutouts={len(cutouts)} "
        f"preview={project_path(CUTOUT_PREVIEW_PATH)}"
    )


if __name__ == "__main__":
    main()
