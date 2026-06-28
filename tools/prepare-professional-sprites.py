from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

from sprite_style_utils import apply_cute_sd_style, fit_frames_to_common_axis, load_sprite_style_profile, sprite_style_metrics


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "professional_sprite_manifest.json"
OUT_ROOT = ROOT / "src" / "snapshot" / "assets" / "individual"
ARTIFACT_ROOT = ROOT / "artifacts" / "visual-asset-samples"
REPORT_PATH = ARTIFACT_ROOT / "professional-axis-report.json"


def project_path(value: str | Path) -> Path:
    return (ROOT / value).resolve() if isinstance(value, str) else value.resolve()


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


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
    if max(color[3] for color in corners) <= 8:
        return rgba

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            distance = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            green_bias = g - max(r, b)
            is_key_pixel = distance < 44
            is_neon_matte = green_bias > 92
            is_hard_key = g >= 210 and r < 80 and b < 80
            if is_key_pixel or is_neon_matte or is_hard_key:
                pixels[x, y] = (0, 0, 0, 0)
            elif green_bias > 42:
                new_alpha = max(0, min(a, int((green_bias - 42) * 2.4)))
                pixels[x, y] = (r, min(g, max(r, b) + 16), b, 255 - new_alpha)
    return rgba


def scrub_neon_green_matte(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    def has_clear_neighbor(x: int, y: int) -> bool:
        for yy in range(max(0, y - 1), min(rgba.height, y + 2)):
            for xx in range(max(0, x - 1), min(rgba.width, x + 2)):
                if xx == x and yy == y:
                    continue
                if pixels[xx, yy][3] <= 4:
                    return True
        return False

    for _pass in range(2):
        to_clear: list[tuple[int, int]] = []
        for y in range(rgba.height):
            for x in range(rgba.width):
                r, g, b, a = pixels[x, y]
                green_bias = g - max(r, b)
                is_neon_key = g >= 235 and r <= 80 and b <= 80 and green_bias >= 130
                is_tiny_alpha_key_shadow = a <= 10 and g >= 50 and green_bias >= 20
                is_low_alpha_green_edge = a <= 48 and g >= 150 and green_bias >= 52
                is_low_alpha_key_shadow = a <= 96 and r <= 70 and b <= 70 and g >= 78 and green_bias >= 42
                is_dark_key_shadow = a <= 184 and r <= 42 and b <= 42 and 70 <= g <= 156 and green_bias >= 46
                is_edge_fringe = a > 0 and g >= 76 and r <= 118 and b <= 118 and green_bias >= 18 and (a < 252 or has_clear_neighbor(x, y))
                if a <= 2 or (a > 0 and (is_neon_key or is_tiny_alpha_key_shadow or is_low_alpha_green_edge or is_low_alpha_key_shadow or is_dark_key_shadow or is_edge_fringe)):
                    to_clear.append((x, y))
                elif a < 248 and green_bias > 28:
                    pixels[x, y] = (r, min(g, max(r, b) + 14), b, a)
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)
    return rgba


def stabilize_final_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a > 10:
                pixels[x, y] = (r, g, b, max(a, 184))
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


def prepare_frame(frame: Image.Image, config: dict, style_profile: dict, family_id: str) -> Image.Image:
    normalized = normalize_to_axis(frame, config)
    restyled = apply_cute_sd_style(reanchor_to_axis(normalized, config), config, style_profile, "companions" if family_id == "companions" else "monsters")
    return reanchor_to_axis(restyled, config)


def prepare_frames(frames: list[Image.Image], config: dict, style_profile: dict, family_id: str) -> list[Image.Image]:
    family_key = "companions" if family_id == "companions" else "monsters"
    styled = [prepare_frame(frame, config, style_profile, family_id) for frame in frames]
    return [
        reanchor_to_axis(stabilize_final_alpha(scrub_neon_green_matte(reanchor_to_axis(frame, config))), config)
        for frame in fit_frames_to_common_axis(styled, config, style_profile, family_key)
    ]


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
    values = adjacent + ([loop] if len(frames) > 1 else [])
    return {"adjacent": adjacent, "loop": loop, "minimum": min(values) if values else 0}


def frame_metrics(image: Image.Image, config: dict) -> dict:
    bbox = alpha_bbox(image)
    solid_bbox = alpha_bbox(image, 160)
    left, top, right, bottom = bbox
    solid_left, solid_top, solid_right, solid_bottom = solid_bbox
    center = (left + right) / 2
    solid_center = (solid_left + solid_right) / 2
    return {
        "bbox": [left, top, right, bottom],
        "solidBbox": [solid_left, solid_top, solid_right, solid_bottom],
        "bboxWidth": right - left,
        "bboxHeight": bottom - top,
        "leftMargin": left,
        "rightMargin": int(config["cell"]) - right,
        "topMargin": top,
        "bottomMargin": int(config["cell"]) - bottom,
        "detectedCenterX": round(center, 2),
        "detectedBaselineY": bottom,
        "centerDelta": round(center - float(config["centerX"]), 2),
        "baselineDelta": bottom - int(config["baselineY"]),
        "solidCenterDelta": round(solid_center - float(config["centerX"]), 2),
        "solidHeight": solid_bottom - solid_top,
        "solidWidth": solid_right - solid_left,
    }


def load_sheet_frames(item: dict, variant_row: int, frame_count: int) -> list[Image.Image]:
    path = project_path(item["moveSheet"])
    if not path.exists():
        raise FileNotFoundError(f"{item['id']} moveSheet missing: {relative(path)}")
    sheet = remove_green_key(Image.open(path).convert("RGBA"))
    layout = item.get("moveSheetLayout") or {}
    columns = int(layout.get("columns", frame_count))
    cell_w = int(layout.get("cellWidth", sheet.width // columns))
    cell_h = int(layout.get("cellHeight", sheet.height // max(1, int(layout.get("rows", 1)))))
    margin = int(layout.get("cellMargin", 0))
    frames = []
    for index in range(frame_count):
        left = index * cell_w + margin
        top = variant_row * cell_h + margin
        frames.append(sheet.crop((left, top, left + cell_w - margin * 2, top + cell_h - margin * 2)))
    return frames


def write_axis_sheet(label: str, frames: list[Image.Image], config: dict) -> str:
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
    path = ARTIFACT_ROOT / f"{label}-axis-sheet.png"
    sheet.save(path)
    return relative(path)


def zoom_frame(frame: Image.Image, config: dict, scale: int) -> Image.Image:
    cell = int(config["cell"])
    bg = Image.new("RGBA", (cell, cell), (14, 20, 32, 255))
    bg.alpha_composite(frame.convert("RGBA"), (0, 0))
    enlarged = bg.resize((cell * scale, cell * scale), Image.Resampling.NEAREST)
    draw = ImageDraw.Draw(enlarged)
    center_x = int(config["centerX"]) * scale
    baseline_y = int(config["baselineY"]) * scale
    draw.line((center_x, 0, center_x, cell * scale), fill=(0, 255, 120, 180), width=2)
    draw.line((0, baseline_y, cell * scale, baseline_y), fill=(255, 214, 102, 180), width=2)
    draw.rectangle((0, 0, cell * scale - 1, cell * scale - 1), outline=(255, 255, 255, 80), width=2)
    return enlarged


def write_zoom_sheet(label: str, raw_frames: list[Image.Image], frames: list[Image.Image], config: dict) -> str:
    scale = 2
    cell = int(config["cell"])
    label_h = 28
    row_h = cell * scale
    width = cell * scale * len(frames)
    height = label_h * 2 + row_h * 2
    sheet = Image.new("RGBA", (width, height), (14, 20, 32, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 7), f"{label} source 4 frames", fill=(226, 232, 240, 235))
    y = label_h
    for index, frame in enumerate(raw_frames):
        sheet.alpha_composite(zoom_frame(frame, config, scale), (index * cell * scale, y))
    y += row_h
    draw.rectangle((0, y, width, y + label_h), fill=(14, 20, 32, 255))
    draw.text((8, y + 7), f"{label} normalized 4 frames", fill=(226, 232, 240, 235))
    y += label_h
    for index, frame in enumerate(frames):
        sheet.alpha_composite(zoom_frame(frame, config, scale), (index * cell * scale, y))

    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_ROOT / f"{label}-zoom-sheet.png"
    sheet.save(path)
    return relative(path)


def output_dir_for(family: dict, item: dict, variant_key: str) -> Path:
    if family["id"] == "companions":
        return OUT_ROOT / "companions" / item["id"] / variant_key
    if family["id"] == "expeditionEnemies":
        return OUT_ROOT / "expedition-enemies" / item["id"]
    return OUT_ROOT / family["id"] / item["id"] / variant_key


def prepare_variant(family: dict, item: dict, variant_key: str, variant_row: int, config: dict, frame_count: int, min_frame_difference: float, style_profile: dict) -> dict:
    out_dir = output_dir_for(family, item, variant_key)
    raw_frames = load_sheet_frames(item, variant_row, frame_count)
    frames = prepare_frames(raw_frames, config, style_profile, family["id"])
    pose_delta = pose_difference_report(frames)
    if pose_delta["minimum"] < min_frame_difference:
        if out_dir.exists():
            shutil.rmtree(out_dir)
        return {
            "family": family["id"],
            "id": item["id"],
            "variant": variant_key,
            "status": "pose-too-similar",
            "poseDelta": pose_delta,
            "moveSheet": item.get("moveSheet"),
        }

    out_dir.mkdir(parents=True, exist_ok=True)
    frame_paths = []
    metrics = []
    for index, frame in enumerate(frames):
        path = out_dir / f"move_{index}.png"
        frame.save(path)
        frame_paths.append(relative(path))
        metric = frame_metrics(frame, config)
        metric["style"] = sprite_style_metrics(frame)
        metrics.append(metric)

    return {
        "family": family["id"],
        "id": item["id"],
        "name": item.get("name"),
        "type": item.get("type"),
        "careerId": item.get("careerId"),
        "helperId": item.get("helperId"),
        "tone": item.get("tone"),
        "variant": variant_key,
        "direction": item.get("direction"),
        "status": "ok",
        "sourceType": "moveSheet",
        "moveSheet": item.get("moveSheet"),
        "poseDelta": pose_delta,
        "frames": frame_paths,
        "axisSheet": write_axis_sheet(f"{family['id']}-{item['id']}-{variant_key}", frames, config),
        "zoomSheet": write_zoom_sheet(f"{family['id']}-{item['id']}-{variant_key}", raw_frames, frames, config),
        "metrics": metrics,
    }


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
        "styleProfile": None,
        "items": [],
    }
    style_profile = load_sprite_style_profile()
    report["styleProfile"] = {
        "id": style_profile.get("id"),
        "enabled": bool(style_profile.get("enabled")),
        "reference": style_profile.get("reference"),
    }

    failures = []
    for family in manifest.get("families", []):
        for item in family.get("items", []):
            variants = item.get("genders") or ["default"]
            for row, variant_key in enumerate(variants):
                entry = prepare_variant(family, item, variant_key, row, manifest, frame_count, min_frame_difference, style_profile)
                report["items"].append(entry)
                if entry["status"] != "ok":
                    failures.append(f"{family['id']}/{item['id']}/{variant_key}: {entry['status']}")

    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if failures:
        print(json.dumps({"failures": failures[:40]}, ensure_ascii=False, indent=2))
        raise SystemExit(f"PROFESSIONAL_SPRITES_FAILED failures={len(failures)} report={relative(REPORT_PATH)}")
    print(f"PROFESSIONAL_SPRITES_PREPARED items={len(report['items'])} report={relative(REPORT_PATH)}")


if __name__ == "__main__":
    main()
