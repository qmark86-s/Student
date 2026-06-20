from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "character_animation_manifest.json"
OUT_ROOT = ROOT / "src" / "snapshot" / "assets" / "individual" / "students"
ARTIFACT_ROOT = ROOT / "artifacts" / "visual-asset-samples"
REPORT_PATH = ARTIFACT_ROOT / "character-axis-report.json"


def project_path(value: str) -> Path:
    return (ROOT / value).resolve()


def remove_green_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    corners = [
        pixels[0, 0],
        pixels[rgba.width - 1, 0],
        pixels[0, rgba.height - 1],
        pixels[rgba.width - 1, rgba.height - 1],
    ]
    key = max(corners, key=lambda color: color[1] - max(color[0], color[2]))
    kr, kg, kb, _ = key

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            distance = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            green_bias = g - max(r, b)
            if distance < 44 or green_bias > 92:
                pixels[x, y] = (r, g, b, 0)
            elif green_bias > 42:
                new_alpha = max(0, min(a, int((green_bias - 42) * 2.4)))
                pixels[x, y] = (r, g, b, 255 - new_alpha)
    return rgba


def remove_sheet_guides(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    clear_columns: set[int] = set()

    for x in range(width):
        edge_band = min(24, height)
        top_visible = any(pixels[x, y][3] > 10 for y in range(edge_band))
        bottom_visible = any(pixels[x, height - 1 - y][3] > 10 for y in range(edge_band))
        if not (top_visible or bottom_visible):
            continue
        visible = 0
        alphas = []
        for y in range(height):
            alpha_value = pixels[x, y][3]
            if alpha_value > 10:
                visible += 1
                alphas.append(alpha_value)
        median_alpha = sorted(alphas)[len(alphas) // 2] if alphas else 255
        if visible > height * 0.35 and median_alpha < 180:
            for nx in range(max(0, x - 2), min(width, x + 3)):
                clear_columns.add(nx)

    for x in clear_columns:
        for y in range(height):
            r, g, b, _a = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
    return rgba


def alpha_bbox(image: Image.Image, threshold: int = 10) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > threshold else 0).getbbox()
    if bbox is None:
        raise ValueError("source image has no visible alpha pixels")
    return bbox


def normalize_to_axis(image: Image.Image, config: dict) -> Image.Image:
    cell = int(config["cell"])
    center_x = int(config["centerX"])
    baseline_y = int(config["baselineY"])
    max_w = int(config["maxSpriteWidth"])
    max_h = int(config["maxSpriteHeight"])

    bbox = alpha_bbox(image)
    cropped = image.crop(bbox)
    scale = min(max_w / cropped.width, max_h / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    paste_x = round(center_x - resized.width / 2)
    paste_y = round(baseline_y - resized.height)
    canvas.alpha_composite(resized, (paste_x, paste_y))
    return canvas


def reanchor_to_axis(frame: Image.Image, config: dict) -> Image.Image:
    bbox = alpha_bbox(frame)
    left, _top, right, bottom = bbox
    center = (left + right) / 2
    dx = round(float(config["centerX"]) - center)
    dy = int(config["baselineY"]) - bottom
    result = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    result.alpha_composite(frame, (dx, dy))
    return result


def load_move_sheet(character: dict, frame_count: int) -> list[Image.Image] | None:
    move_sheet = character.get("moveSheet")
    if not move_sheet:
        return None
    path = project_path(move_sheet)
    if not path.exists():
        return None

    sheet = remove_green_key(Image.open(path).convert("RGBA"))
    layout = character.get("moveSheetLayout") or {}
    columns = int(layout.get("columns", frame_count))
    rows = int(layout.get("rows", 1))
    if columns < frame_count or rows < 1:
        raise ValueError(f"{character['id']} moveSheetLayout cannot fit {frame_count} frames")

    cell_w = int(layout.get("cellWidth", sheet.width // columns))
    cell_h = int(layout.get("cellHeight", sheet.height // rows))
    margin = int(layout.get("cellMargin", 18))
    frames = []
    for index in range(frame_count):
        col = index % columns
        row = index // columns
        frame = sheet.crop(
                (
                    col * cell_w + margin,
                    row * cell_h + margin,
                    (col + 1) * cell_w - margin,
                    (row + 1) * cell_h - margin,
                )
            )
        frames.append(remove_sheet_guides(frame))
    return frames


def load_source_frame_set(character: dict, frame_count: int) -> list[Image.Image] | None:
    move_frames = (character.get("sourceFrames") or {}).get("move")
    if not move_frames:
        return None
    if len(move_frames) < frame_count:
        raise ValueError(f"{character['id']} sourceFrames.move needs {frame_count} frames")

    frames = []
    for frame_path in move_frames[:frame_count]:
        path = project_path(frame_path)
        if not path.exists():
            return None
        frames.append(remove_green_key(Image.open(path).convert("RGBA")))
    return frames


def load_move_sources(character: dict, frame_count: int) -> tuple[list[Image.Image] | None, str]:
    sheet_frames = load_move_sheet(character, frame_count)
    if sheet_frames:
        return sheet_frames, "moveSheet"
    frame_set = load_source_frame_set(character, frame_count)
    if frame_set:
        return frame_set, "sourceFrames.move"
    return None, "missing"


def prepare_frame(frame: Image.Image, config: dict) -> Image.Image:
    cleaned = remove_sheet_guides(frame)
    normalized = reanchor_to_axis(normalize_to_axis(cleaned, config), config)
    cleaned_normalized = remove_sheet_guides(normalized)
    return reanchor_to_axis(normalize_to_axis(cleaned_normalized, config), config)


def frame_difference(a: Image.Image, b: Image.Image) -> float:
    diff = ImageChops.difference(a.convert("RGBA"), b.convert("RGBA"))
    histogram = diff.histogram()
    total = 0
    count = a.width * a.height * 4
    for value, amount in enumerate(histogram):
        total += (value % 256) * amount
    return round(total / max(1, count), 3)


def pose_difference_report(frames: list[Image.Image]) -> dict:
    adjacent = [frame_difference(frames[index], frames[index + 1]) for index in range(len(frames) - 1)]
    loop = frame_difference(frames[-1], frames[0]) if len(frames) > 1 else 0
    all_values = adjacent + ([loop] if len(frames) > 1 else [])
    return {
        "adjacent": adjacent,
        "loop": loop,
        "minimum": min(all_values) if all_values else 0,
    }


def frame_metrics(image: Image.Image, config: dict) -> dict:
    bbox = alpha_bbox(image)
    solid_bbox = alpha_bbox(image, 160)
    left, top, right, bottom = bbox
    solid_left, solid_top, solid_right, solid_bottom = solid_bbox
    center = (left + right) / 2
    baseline = bottom
    solid_center = (solid_left + solid_right) / 2
    return {
        "bbox": [left, top, right, bottom],
        "solidBbox": [solid_left, solid_top, solid_right, solid_bottom],
        "detectedCenterX": round(center, 2),
        "detectedBaselineY": baseline,
        "centerDelta": round(center - float(config["centerX"]), 2),
        "baselineDelta": baseline - int(config["baselineY"]),
        "solidCenterDelta": round(solid_center - float(config["centerX"]), 2),
        "solidHeight": solid_bottom - solid_top,
        "solidWidth": solid_right - solid_left,
    }


def write_axis_sheet(character_id: str, frames: list[Image.Image], config: dict) -> str:
    cell = int(config["cell"])
    sheet = Image.new("RGBA", (cell * len(frames), cell), (14, 20, 32, 255))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = index * cell
        sheet.alpha_composite(frame, (x, 0))
        draw.line((x + config["centerX"], 0, x + config["centerX"], cell), fill=(0, 255, 120, 180), width=1)
        draw.line((x, config["baselineY"], x + cell, config["baselineY"]), fill=(255, 214, 102, 180), width=1)
        draw.rectangle((x, 0, x + cell - 1, cell - 1), outline=(255, 255, 255, 70), width=1)
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_ROOT / f"{character_id}-axis-sheet.png"
    sheet.save(path)
    return str(path.relative_to(ROOT)).replace("\\", "/")


def load_source(character: dict) -> Image.Image:
    alpha_path = character.get("alpha")
    if alpha_path and project_path(alpha_path).exists():
        return Image.open(project_path(alpha_path)).convert("RGBA")

    source_path = project_path(character["source"])
    source = Image.open(source_path).convert("RGBA")
    return remove_green_key(source)


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    frame_count = int((manifest.get("animations") or {}).get("move", {}).get("frames", 4))
    min_frame_difference = float(manifest.get("minFrameDifference", 2.5))
    report = {
        "version": 1,
        "cell": manifest["cell"],
        "centerX": manifest["centerX"],
        "baselineY": manifest["baselineY"],
        "frameCount": frame_count,
        "minFrameDifference": min_frame_difference,
        "characters": [],
    }

    for character in manifest["characters"]:
        out_dir = OUT_ROOT / character["id"]
        raw_frames, source_type = load_move_sources(character, frame_count)
        if raw_frames is None:
            if out_dir.exists():
                shutil.rmtree(out_dir)
            report["characters"].append(
                {
                    "id": character["id"],
                    "status": "missing-move-source",
                    "gender": character["gender"],
                    "gradeOrder": character["gradeOrder"],
                    "studentFrame": character["studentFrame"],
                    "source": character.get("source"),
                    "moveSheet": character.get("moveSheet"),
                    "required": "moveSheet or sourceFrames.move[4]",
                }
            )
            continue

        frames = [prepare_frame(frame, manifest) for frame in raw_frames]
        pose_delta = pose_difference_report(frames)
        if pose_delta["minimum"] < min_frame_difference:
            if out_dir.exists():
                shutil.rmtree(out_dir)
            report["characters"].append(
                {
                    "id": character["id"],
                    "status": "pose-too-similar",
                    "gender": character["gender"],
                    "gradeOrder": character["gradeOrder"],
                    "studentFrame": character["studentFrame"],
                    "sourceType": source_type,
                    "poseDelta": pose_delta,
                }
            )
            continue

        out_dir.mkdir(parents=True, exist_ok=True)

        frame_paths = []
        metrics = []
        for index, frame in enumerate(frames):
            path = out_dir / f"move_{index}.png"
            frame.save(path)
            frame_paths.append(str(path.relative_to(ROOT)).replace("\\", "/"))
            metrics.append(frame_metrics(frame, manifest))

        sheet = write_axis_sheet(character["id"], frames, manifest)
        report["characters"].append(
            {
                "id": character["id"],
                "status": "ok",
                "gender": character["gender"],
                "gradeOrder": character["gradeOrder"],
                "studentFrame": character["studentFrame"],
                "direction": character.get("direction", "right"),
                "sourceType": source_type,
                "poseDelta": pose_delta,
                "frames": frame_paths,
                "axisSheet": sheet,
                "metrics": metrics,
            }
        )

    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CHARACTER_SPRITES_PREPARED report={REPORT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
