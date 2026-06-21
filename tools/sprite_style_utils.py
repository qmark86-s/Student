from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STYLE_PROFILE_PATH = ROOT / "data" / "sprite_style_profiles.json"


def alpha_bbox(image: Image.Image, threshold: int = 10) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > threshold else 0).getbbox()
    if bbox is None:
        raise ValueError("source image has no visible alpha pixels")
    return bbox


def load_sprite_style_profile() -> dict[str, Any]:
    if not STYLE_PROFILE_PATH.exists():
        return {"id": "none", "enabled": False}
    payload = json.loads(STYLE_PROFILE_PATH.read_text(encoding="utf-8"))
    active = payload.get("activeProfile")
    profile = (payload.get("profiles") or {}).get(active)
    if not profile:
        return {"id": "none", "enabled": False}
    return {"id": active, **profile}


def _resize(image: Image.Image, width: int, height: int) -> Image.Image:
    return image.resize((max(1, width), max(1, height)), Image.Resampling.LANCZOS)


def _fit_to_axis(image: Image.Image, axis_config: dict[str, Any], params: dict[str, Any]) -> Image.Image:
    cell = int(axis_config["cell"])
    center_x = int(axis_config["centerX"])
    baseline_y = int(axis_config["baselineY"])
    max_w = int(params.get("maxOutputWidth", axis_config.get("maxSpriteWidth", cell)))
    max_h = int(params.get("maxOutputHeight", axis_config.get("maxSpriteHeight", cell)))

    bbox = alpha_bbox(image)
    cropped = image.crop(bbox)
    scale = min(1.0, max_w / cropped.width, max_h / cropped.height)
    if scale < 1:
        cropped = _resize(cropped, round(cropped.width * scale), round(cropped.height * scale))

    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    paste_x = round(center_x - cropped.width / 2)
    paste_y = round(baseline_y - cropped.height)
    canvas.alpha_composite(cropped, (paste_x, paste_y))
    return canvas


def _rotate_sprite(image: Image.Image, degrees: float) -> Image.Image:
    if abs(degrees) < 0.01:
        return image
    rotated = image.rotate(
        degrees,
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )
    bbox = alpha_bbox(rotated)
    return rotated.crop(bbox)


def _equalize_final_solid_height(frames: list[Image.Image], axis_config: dict[str, Any], params: dict[str, Any]) -> list[Image.Image]:
    if not frames:
        return frames
    max_h = int(params.get("maxOutputHeight", axis_config.get("maxSpriteHeight", axis_config["cell"])))
    requested = int(params.get("heightOnlyTarget", 0))
    solid_boxes = [alpha_bbox(frame, 160) for frame in frames]
    target = min(max_h, max(requested, max(bottom - top for _left, top, _right, bottom in solid_boxes)))
    if target <= 0:
        return frames

    center_x = int(axis_config["centerX"])
    baseline_y = int(axis_config["baselineY"])
    cell = int(axis_config["cell"])
    result = []
    for frame, solid_box in zip(frames, solid_boxes):
        left, top, right, bottom = solid_box
        solid_height = bottom - top
        if solid_height >= target - 1:
            result.append(frame)
            continue
        crop_box = alpha_bbox(frame)
        crop = frame.crop(crop_box)
        scale_y = target / max(1, solid_height)
        resized = _resize(crop, crop.width, min(max_h, round(crop.height * scale_y)))
        canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
        paste_x = round(center_x - resized.width / 2)
        paste_y = round(baseline_y - resized.height)
        canvas.alpha_composite(resized, (paste_x, paste_y))
        result.append(canvas)
    return result


def _profile_params(profile: dict[str, Any], family: str) -> dict[str, Any]:
    if family == "characters":
        return dict(profile.get("characters") or {})
    if family in profile:
        return dict(profile.get(family) or {})
    return dict(profile.get("characters") or {})


def apply_cute_sd_style(frame: Image.Image, axis_config: dict[str, Any], profile: dict[str, Any], family: str) -> Image.Image:
    if not profile.get("enabled", False):
        return frame
    params = _profile_params(profile, family)
    if not params.get("enabled", True):
        return frame

    source = frame.convert("RGBA")
    bbox = alpha_bbox(source)
    cropped = source.crop(bbox)
    if cropped.width < 8 or cropped.height < 8:
        return frame

    cut = round(cropped.height * float(params.get("headCutRatio", 0.45)))
    cut = max(8, min(cropped.height - 12, cut))
    lower_start = round(cropped.height * float(params.get("lowerStartRatio", 0.72)))
    lower_start = max(cut + 8, min(cropped.height - 4, lower_start))
    head = cropped.crop((0, 0, cropped.width, cut))
    torso = cropped.crop((0, cut, cropped.width, lower_start))
    lower = cropped.crop((0, lower_start, cropped.width, cropped.height))

    head = _resize(
        head,
        round(head.width * float(params.get("headScaleX", 1.18))),
        round(head.height * float(params.get("headScaleY", 1.1))),
    )
    torso = _resize(
        torso,
        round(torso.width * float(params.get("bodyScaleX", 0.94))),
        round(torso.height * float(params.get("bodyScaleY", 0.8))),
    )
    lower = _resize(
        lower,
        round(lower.width * float(params.get("lowerScaleX", params.get("bodyScaleX", 0.94)))),
        round(lower.height * float(params.get("lowerScaleY", params.get("bodyScaleY", 0.8)))),
    )

    overlap = int(params.get("overlap", 8))
    lower_overlap = int(params.get("lowerOverlap", 2))
    pad = 18
    combined_w = max(head.width, torso.width, lower.width) + pad * 2
    combined_h = max(1, head.height + torso.height + lower.height - overlap - lower_overlap + pad)
    combined = Image.new("RGBA", (combined_w, combined_h), (0, 0, 0, 0))

    torso_x = round((combined_w - torso.width) / 2)
    torso_y = round(head.height - overlap + int(params.get("bodyOffsetY", 0)))
    lower_x = round((combined_w - lower.width) / 2)
    lower_y = round(torso_y + torso.height - lower_overlap + int(params.get("lowerOffsetY", 0)))
    head_x = round((combined_w - head.width) / 2)
    head_y = max(0, int(params.get("headOffsetY", 0)))

    combined.alpha_composite(lower, (lower_x, max(0, lower_y)))
    combined.alpha_composite(torso, (torso_x, max(0, torso_y)))
    combined.alpha_composite(head, (head_x, head_y))
    combined = _rotate_sprite(combined, float(params.get("uprightRotateDegrees", 0)))
    return _fit_to_axis(combined, axis_config, params)


def fit_frames_to_common_axis(frames: list[Image.Image], axis_config: dict[str, Any], profile: dict[str, Any], family: str) -> list[Image.Image]:
    if not frames:
        return frames
    params = _profile_params(profile, family)
    cell = int(axis_config["cell"])
    center_x = int(axis_config["centerX"])
    baseline_y = int(axis_config["baselineY"])
    max_w = int(params.get("maxOutputWidth", axis_config.get("maxSpriteWidth", cell)))
    max_h = int(params.get("maxOutputHeight", axis_config.get("maxSpriteHeight", cell)))
    max_upscale = float(params.get("maxUpscale", 1.16))

    crops = []
    for frame in frames:
        bbox = alpha_bbox(frame)
        crop = frame.crop(bbox)
        crops.append(crop)

    group_w = max(crop.width for crop in crops)
    group_h = max(crop.height for crop in crops)
    base_scale = min(max_w / group_w, max_h / group_h)
    base_scale = min(max_upscale, base_scale)
    target_h = group_h * base_scale
    min_equalize = float(params.get("minFrameEqualizeScale", 1.0))
    max_equalize = float(params.get("maxFrameEqualizeScale", 1.0))
    height_only_equalize = bool(params.get("heightOnlyEqualize", False))
    height_only_target = int(params.get("heightOnlyTarget", round(target_h)))
    height_only_target = max(1, min(max_h, height_only_target))

    result = []
    for crop in crops:
        equalize = target_h / max(1, crop.height * base_scale)
        equalize = max(min_equalize, min(max_equalize, equalize))
        scale = min(max_upscale, base_scale * equalize)
        scale = min(scale, max_w / crop.width, max_h / crop.height)
        resized = _resize(crop, round(crop.width * scale), round(crop.height * scale))
        if height_only_equalize and resized.height < height_only_target:
            resized = _resize(resized, resized.width, height_only_target)
        canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
        paste_x = round(center_x - resized.width / 2)
        paste_y = round(baseline_y - resized.height)
        canvas.alpha_composite(resized, (paste_x, paste_y))
        result.append(canvas)
    if height_only_equalize:
        result = _equalize_final_solid_height(result, axis_config, params)
    return result


def sprite_style_metrics(image: Image.Image) -> dict[str, float]:
    bbox = alpha_bbox(image)
    left, top, right, bottom = bbox
    cropped = image.crop(bbox)
    alpha = cropped.getchannel("A")
    pixels = alpha.load()
    cut = round(cropped.height * 0.45)
    upper = 0
    lower = 0
    for y in range(cropped.height):
        for x in range(cropped.width):
            if pixels[x, y] > 40:
                if y < cut:
                    upper += 1
                else:
                    lower += 1
    total = max(1, upper + lower)
    return {
        "height": float(bottom - top),
        "width": float(right - left),
        "aspect": round((bottom - top) / max(1, right - left), 3),
        "upperMassShare": round(upper / total, 3),
        "lowerMassShare": round(lower / total, 3),
    }
