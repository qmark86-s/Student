from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = ROOT / "artifacts" / "visual-asset-samples" / "sprite-integrity-report.json"
REFERENCE_LOCK_PATH = ROOT / "data" / "sprite_reference_lock.json"
FACE_SAFE_ACCESSORIES = {"none", "pin", "hair-clip"}
FACE_SAFE_FEMALE_HAIR = {"bob", "short-bob", "side-pony", "soft-wave"}
FACE_RISK_ACCESSORIES = {"round-glasses", "earpiece", "small-ribbon", "star-pin"}
FACE_RISK_FEMALE_HAIR = {"bun", "twin-tail", "pony"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_student_reference_rules() -> dict[str, Any]:
    if not REFERENCE_LOCK_PATH.exists():
        return {"maxSolidHeightDrift": 6}
    payload = read_json(REFERENCE_LOCK_PATH)
    active = payload.get("activeLock")
    return ((payload.get("locks") or {}).get(active) or {}).get("characters") or {"maxSolidHeightDrift": 6}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def alpha_bbox(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    return alpha.point(lambda value: 255 if value > threshold else 0).getbbox()


def visible_color_count(image: Image.Image) -> int:
    pixels = image.load()
    colors: set[tuple[int, int, int, int]] = set()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a > 8:
                colors.add((r, g, b, a))
    return len(colors)


def neon_green_leaks(image: Image.Image) -> int:
    pixels = image.load()
    leaks = 0
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            green_bias = g - max(r, b)
            is_neon_key = g >= 235 and r <= 80 and b <= 80 and green_bias >= 130
            is_low_alpha_key_shadow = a <= 80 and r <= 90 and b <= 90 and g >= 60 and green_bias >= 20
            is_dark_key_shadow = a <= 180 and r <= 50 and b <= 50 and 50 <= g <= 140 and green_bias >= 25
            if a > 8 and (is_neon_key or is_low_alpha_key_shadow or is_dark_key_shadow):
                leaks += 1
    return leaks


def frame_gate(family: str) -> dict[str, int]:
    if family == "students":
        return {"min_width": 82, "min_height": 118, "min_colors": 260, "min_top_margin": 8, "min_bottom_margin": 8}
    if family == "companions":
        return {"min_width": 90, "min_height": 120, "min_colors": 260, "min_top_margin": 8, "min_bottom_margin": 8}
    return {"min_width": 64, "min_height": 92, "min_colors": 150, "min_top_margin": 8, "min_bottom_margin": 8}


def inspect_frame(frame_path: str, family: str, cell: int, failures: list[str]) -> dict[str, Any]:
    path = ROOT / frame_path
    if not path.exists():
        failures.append(f"{family}:{frame_path} missing")
        return {"path": frame_path, "status": "missing"}

    image = Image.open(path).convert("RGBA")
    gate = frame_gate(family)
    local_failures: list[str] = []
    if image.size != (cell, cell):
        local_failures.append(f"size {image.width}x{image.height} != {cell}x{cell}")

    bbox = alpha_bbox(image)
    solid_bbox = alpha_bbox(image, 160)
    if bbox is None or solid_bbox is None:
        local_failures.append("empty alpha")
        result = {"path": frame_path, "status": "failed", "failures": local_failures}
        failures.extend(f"{family}:{frame_path} {failure}" for failure in local_failures)
        return result

    left, top, right, bottom = bbox
    solid_left, solid_top, solid_right, solid_bottom = solid_bbox
    solid_width = solid_right - solid_left
    solid_height = solid_bottom - solid_top
    top_margin = top
    bottom_margin = cell - bottom
    if left <= 0 or top <= 0 or right >= cell or bottom >= cell:
        local_failures.append(f"alpha touches cell edge bbox={bbox}")
    if top_margin < gate["min_top_margin"]:
        local_failures.append(f"top margin {top_margin} < {gate['min_top_margin']}")
    if bottom_margin < gate["min_bottom_margin"]:
        local_failures.append(f"bottom margin {bottom_margin} < {gate['min_bottom_margin']}")
    if solid_width < gate["min_width"]:
        local_failures.append(f"solid width {solid_width} < {gate['min_width']}")
    if solid_height < gate["min_height"]:
        local_failures.append(f"solid height {solid_height} < {gate['min_height']}")

    colors = visible_color_count(image)
    if colors < gate["min_colors"]:
        local_failures.append(f"visible colors {colors} < {gate['min_colors']}")

    green_leaks = neon_green_leaks(image)
    if green_leaks > 0:
        local_failures.append(f"neon green matte leak pixels={green_leaks}")

    failures.extend(f"{family}:{frame_path} {failure}" for failure in local_failures)
    return {
        "path": frame_path,
        "family": family,
        "status": "failed" if local_failures else "ok",
        "bbox": list(bbox),
        "solidBbox": list(solid_bbox),
        "solidWidth": solid_width,
        "solidHeight": solid_height,
        "topMargin": top_margin,
        "bottomMargin": bottom_margin,
        "visibleColors": colors,
        "greenLeaks": green_leaks,
        "failures": local_failures,
    }


def summarize_frame_groups(inspected: list[dict[str, Any]], failures: list[str], student_rules: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in inspected:
        if item.get("status") == "missing":
            continue
        key = str(Path(item.get("path", "")).parent).replace("\\", "/")
        grouped.setdefault(key, []).append(item)

    summaries: list[dict[str, Any]] = []
    for key, frames in sorted(grouped.items()):
        solid_heights = [frame.get("solidHeight") for frame in frames if isinstance(frame.get("solidHeight"), int)]
        solid_widths = [frame.get("solidWidth") for frame in frames if isinstance(frame.get("solidWidth"), int)]
        top_margins = [frame.get("topMargin") for frame in frames if isinstance(frame.get("topMargin"), int)]
        bottom_margins = [frame.get("bottomMargin") for frame in frames if isinstance(frame.get("bottomMargin"), int)]
        family = frames[0].get("family", "unknown")
        height_drift = max(solid_heights) - min(solid_heights) if solid_heights else 999
        width_drift = max(solid_widths) - min(solid_widths) if solid_widths else 999
        max_height_drift = int(student_rules.get("maxSolidHeightDrift", 6)) if family == "students" else (10 if family == "expeditionEnemies" else 14)
        max_width_drift = 32 if family == "expeditionEnemies" else 44
        if height_drift > max_height_drift:
            failures.append(f"{family}:{key} solid height drift {height_drift} > {max_height_drift}")
        if width_drift > max_width_drift:
            failures.append(f"{family}:{key} solid width drift {width_drift} > {max_width_drift}")
        summaries.append(
            {
                "key": key,
                "family": family,
                "frames": len(frames),
                "solidHeightDrift": height_drift,
                "solidWidthDrift": width_drift,
                "minTopMargin": min(top_margins) if top_margins else None,
                "minBottomMargin": min(bottom_margins) if bottom_margins else None,
            }
        )
    return summaries


def audit_directions(failures: list[str]) -> dict[str, Any]:
    character_manifest = read_json(ROOT / "data" / "character_animation_manifest.json")
    professional_manifest = read_json(ROOT / "data" / "professional_sprite_manifest.json")
    character_bad = [item["id"] for item in character_manifest.get("characters", []) if item.get("direction") != "right"]
    if character_bad:
        failures.append(f"student directions must all be right: {', '.join(character_bad[:12])}")

    family_bad: dict[str, list[str]] = {}
    for family in professional_manifest.get("families", []):
        expected = "left" if family.get("id") == "expeditionEnemies" else "right"
        bad = [item["id"] for item in family.get("items", []) if item.get("direction") != expected]
        if bad:
            family_bad[family.get("id", "unknown")] = bad
            failures.append(f"{family.get('id')} directions must all be {expected}: {', '.join(bad[:12])}")

    return {
        "students": {"expected": "right", "bad": character_bad, "count": len(character_manifest.get("characters", []))},
        "families": family_bad,
    }


def audit_companion_face_safety(failures: list[str]) -> dict[str, Any]:
    professional_manifest = read_json(ROOT / "data" / "professional_sprite_manifest.json")
    checked = 0
    unsafe: list[dict[str, str]] = []
    for family in professional_manifest.get("families", []):
        if family.get("id") != "companions":
            continue
        for item in family.get("items", []):
            profiles = item.get("appearanceProfiles")
            if not isinstance(profiles, dict):
                unsafe.append({"id": item.get("id", "unknown"), "gender": "*", "reason": "missing appearanceProfiles"})
                continue
            for gender in item.get("genders", []):
                profile = profiles.get(gender)
                if not isinstance(profile, dict):
                    unsafe.append({"id": item.get("id", "unknown"), "gender": str(gender), "reason": "missing gender profile"})
                    continue
                checked += 1
                accessory = str(profile.get("accessory", ""))
                hair_style = str(profile.get("hairStyle", ""))
                if accessory not in FACE_SAFE_ACCESSORIES or accessory in FACE_RISK_ACCESSORIES:
                    unsafe.append(
                        {
                            "id": item.get("id", "unknown"),
                            "gender": str(gender),
                            "reason": f"face-risk accessory {accessory}",
                        }
                    )
                if gender == "female" and (hair_style not in FACE_SAFE_FEMALE_HAIR or hair_style in FACE_RISK_FEMALE_HAIR):
                    unsafe.append(
                        {
                            "id": item.get("id", "unknown"),
                            "gender": str(gender),
                            "reason": f"face-risk hairStyle {hair_style}",
                        }
                    )

    for item in unsafe[:80]:
        failures.append(f"companions:{item['id']} {item['gender']} {item['reason']}")
    return {"checkedProfiles": checked, "unsafeProfiles": unsafe[:80], "unsafeCount": len(unsafe)}


def main() -> None:
    failures: list[str] = []
    direction_report = audit_directions(failures)
    face_safety_report = audit_companion_face_safety(failures)
    character_report = read_json(ROOT / "artifacts" / "visual-asset-samples" / "character-axis-report.json")
    professional_report = read_json(ROOT / "artifacts" / "visual-asset-samples" / "professional-axis-report.json")
    cell = int(character_report.get("cell", 160))

    inspected: list[dict[str, Any]] = []
    for character in character_report.get("characters", []):
        if character.get("direction") != "right":
            failures.append(f"{character.get('id')} report direction must be right")
        for frame in character.get("frames", []):
            inspected.append(inspect_frame(frame, "students", cell, failures))

    professional_cell = int(professional_report.get("cell", 160))
    for item in professional_report.get("items", []):
        family = item.get("family")
        expected = "left" if family == "expeditionEnemies" else "right"
        if item.get("direction") != expected:
            failures.append(f"{item.get('id')} report direction must be {expected}")
        frame_family = "expeditionEnemies" if family == "expeditionEnemies" else "companions"
        for frame in item.get("frames", []):
            inspected.append(inspect_frame(frame, frame_family, professional_cell, failures))

    group_summaries = summarize_frame_groups(inspected, failures, read_student_reference_rules())
    ok_frames = sum(1 for item in inspected if item.get("status") == "ok")
    report = {
        "directions": direction_report,
        "companionFaceSafety": face_safety_report,
        "frames": len(inspected),
        "okFrames": ok_frames,
        "failedFrames": len(inspected) - ok_frames,
        "groups": len(group_summaries),
        "worstGroups": sorted(
            group_summaries,
            key=lambda item: (item.get("solidHeightDrift", 0), item.get("solidWidthDrift", 0)),
            reverse=True,
        )[:30],
        "sampleFailures": failures[:80],
        "inspected": inspected,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if failures:
        print(json.dumps({"failures": failures[:80], "report": rel(REPORT_PATH)}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    print(f"SPRITE_INTEGRITY_OK frames={len(inspected)} report={rel(REPORT_PATH)}")


if __name__ == "__main__":
    main()
