from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "real_estate_reconstruction_sources.json"
SLOTS_PATH = ROOT / "data" / "real_estate_reconstruction_slots.json"
GROWTH_DATA_PATH = ROOT / "data" / "real_estate_district_growth_assets.json"
ASSET_ROOT = ROOT / "src" / "snapshot" / "assets"
OUTPUT_DIR = ASSET_ROOT / "real-estate-district-growth"
ARTIFACT_DIR = ROOT / "artifacts" / "real-estate-reconstruction"

DEFAULT_TARGET_DISTRICT = "small_studio"
PATCH_ROOT_DIR = ARTIFACT_DIR / "patches"
VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT = {
    "small_studio": {
        (3, 4): 3,
        (5, 6): 6,
        (7,): 6,
        (8, 9): 9,
        (10,): 12,
        (1, 2): 16,
        (11, 12, 13): 16,
        (14, 15, 16): 16,
    },
    "two_room": {
        (1, 2): 4,
        (3, 4): 8,
        (5, 6): 8,
        (7,): 8,
        (8,): 8,
        (9, 10): 8,
        (11,): 12,
        (12,): 12,
        (13, 15, 16): 16,
        (14,): 16,
    },
    "villa": {
        (1, 2): 4,
        (3, 4): 8,
        (5, 6, 7): 12,
        (8,): 16,
        (9,): 16,
        (10, 14, 16): 16,
        (11,): 16,
        (12, 13, 15): 16,
    },
    "officetel": {
        (6, 7): 3,
        (14, 15, 16): 6,
        (10, 11): 9,
        (12, 13): 12,
        (1, 2): 16,
        (3, 4, 5): 16,
        (8, 9): 16,
    },
    "shop_unit": {
        (14, 15, 16): 4,
        (6, 10): 8,
        (3, 4, 5, 7, 8, 9): 12,
        (1, 2): 16,
        (11, 12, 13): 16,
    },
    "small_building": {
        (6, 8): 5,
        (9, 10, 11): 5,
        (4, 5): 5,
        (12, 13): 10,
        (14, 15, 16): 10,
        (1,): 16,
        (2, 3): 16,
        (7,): 16,
    },
    "apartment_building": {
        (1,): 4,
        (2,): 4,
        (3,): 4,
        (4,): 8,
        (5, 6): 8,
        (7,): 12,
        (8, 9): 12,
        (10,): 12,
        (11,): 12,
        (12,): 12,
        (13, 14, 16): 16,
        (15,): 16,
    },
    "apartment_complex": {
        (1,): 5,
        (2,): 5,
        (5,): 5,
        (6,): 5,
        (7,): 5,
        (10, 11): 5,
        (3,): 10,
        (4,): 10,
        (8,): 10,
        (9,): 10,
        (12,): 10,
        (13,): 16,
        (14,): 16,
        (15,): 16,
        (16,): 16,
    },
    "office_tower": {
        (1, 2, 3, 4): 4,
        (5, 6, 7, 10): 4,
        (8, 9): 8,
        (11, 12, 13): 12,
        (14, 15, 16): 16,
    },
    "mixed_development": {
        (1,): 3,
        (2,): 3,
        (3,): 3,
        (4,): 6,
        (5, 6): 6,
        (11,): 6,
        (12,): 6,
        (7,): 9,
        (8,): 9,
        (9, 10): 9,
        (13,): 16,
        (14, 15): 12,
        (16,): 16,
    },
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fail(message: str) -> None:
    raise RuntimeError(message)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="부동산 지역별 baked 성장 PNG를 finalReference visual group patch로 생성합니다.")
    parser.add_argument("--district", default=DEFAULT_TARGET_DISTRICT, help="생성할 부동산 지역 id입니다. 기본값은 small_studio입니다.")
    return parser.parse_args()


def slug(value: str) -> str:
    return value.replace("_", "-")


def artifact_file(district_id: str, suffix: str) -> Path:
    return ARTIFACT_DIR / f"{slug(district_id)}-{suffix}"


def find_district(data: dict, district_id: str) -> dict:
    for district in data["districts"]:
        if district["id"] == district_id:
            return district
    fail(f"district를 찾을 수 없습니다: {district_id}")


def asset_by_id(crops: list[dict]) -> dict[str, dict]:
    return {crop["assetId"]: crop for crop in crops}


def percent_point(point: list[float], width: int, height: int) -> tuple[float, float]:
    return (float(point[0]) / 100 * width, float(point[1]) / 100 * height)


def make_forbidden_mask(district: dict, width: int, height: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for item in district["forbiddenMasks"]:
        draw.polygon([percent_point(point, width, height) for point in item["polygon"]], fill=255)
    return mask


def low_reference_diff_mask(base: Image.Image, final: Image.Image, buildable: Image.Image, forbidden: Image.Image) -> Image.Image:
    diff = ImageChops.difference(base.convert("RGB"), final.convert("RGB")).convert("L")
    mask = diff.point(lambda value: 255 if value >= 56 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(3))
    mask = ImageChops.multiply(mask, buildable.convert("L"))
    mask = ImageChops.multiply(mask, ImageChops.invert(forbidden.convert("L")))
    return mask


def expanded_box(box: list[int], width: int, height: int, left: int = 90, top: int = 170, right: int = 90, bottom: int = 90) -> list[int]:
    return [
        max(0, int(box[0]) - left),
        max(0, int(box[1]) - top),
        min(width, int(box[2]) + right),
        min(height, int(box[3]) + bottom),
    ]


def point_in_box(x: int, y: int, box: list[int]) -> bool:
    return box[0] <= x < box[2] and box[1] <= y < box[3]


def visual_group_reveal_slot_index(district_id: str, slot_indexes: list[int]) -> int:
    overrides = VISUAL_GROUP_REVEAL_SLOT_OVERRIDES_BY_DISTRICT.get(district_id, {})
    return overrides.get(tuple(slot_indexes), min(slot_indexes))


def visual_groups_for_slots(district_id: str, slots: list[dict], width: int, height: int) -> list[dict]:
    grouped: dict[tuple[int, int, int, int], list[dict]] = {}
    for slot in slots:
        key = tuple(int(value) for value in slot["sourceClusterBBox"])
        grouped.setdefault(key, []).append(slot)

    groups = []
    ordered = sorted(grouped.items(), key=lambda item: min(int(slot["slotIndex"]) for slot in item[1]))
    for group_index, (key, group_slots) in enumerate(ordered, start=1):
        slot_indexes = sorted(int(slot["slotIndex"]) for slot in group_slots)
        reveal_slot_index = visual_group_reveal_slot_index(district_id, slot_indexes)
        centroid_x = sum(float(slot["candidateCentroidPx"][0]) for slot in group_slots) / len(group_slots)
        centroid_y = sum(float(slot["candidateCentroidPx"][1]) for slot in group_slots) / len(group_slots)
        group_bbox = [key[0], key[1], key[2], key[3]]
        groups.append({
            "id": f"{slug(district_id)}-visual-group-{group_index:02d}",
            "groupIndex": group_index,
            "slotIndexes": slot_indexes,
            "revealSlotIndex": reveal_slot_index,
            "z": max(int(slot["z"]) for slot in group_slots),
            "sourceClusterBBox": group_bbox,
            "expandedBBox": expanded_box(group_bbox, width, height),
            "centroidPx": [round(centroid_x, 2), round(centroid_y, 2)],
            "buildingAssets": [slot["buildingAsset"] for slot in sorted(group_slots, key=lambda item: int(item["slotIndex"]))],
        })
    return groups


def assign_reference_group_masks(district_id: str, base: Image.Image, final: Image.Image, groups: list[dict], source_district: dict) -> dict[int, Image.Image]:
    buildable_path = artifact_file(district_id, "buildable-lot-expanded-mask.png")
    require(buildable_path.exists(), f"buildable mask artifact가 없습니다: {buildable_path}")
    buildable = Image.open(buildable_path).convert("L")
    forbidden = make_forbidden_mask(source_district, base.width, base.height)
    reference_mask = low_reference_diff_mask(base, final, buildable, forbidden)
    reference_mask.save(artifact_file(district_id, "final-reference-patch-mask.png"))
    group_masks = {int(group["groupIndex"]): Image.new("L", base.size, 0) for group in groups}
    mask_pixels = reference_mask.load()
    group_pixels = {index: mask.load() for index, mask in group_masks.items()}
    centers = {
        int(group["groupIndex"]): (float(group["centroidPx"][0]), float(group["centroidPx"][1]))
        for group in groups
    }
    for y in range(base.height):
        for x in range(base.width):
            if mask_pixels[x, y] == 0:
                continue
            candidates = [group for group in groups if point_in_box(x, y, group["expandedBBox"])]
            if not candidates:
                continue
            best = min(
                candidates,
                key=lambda group: (x - centers[int(group["groupIndex"])][0]) ** 2 + (y - centers[int(group["groupIndex"])][1]) ** 2,
            )
            group_pixels[int(best["groupIndex"])][x, y] = 255
    return group_masks


def build_reference_patches(district_id: str, final: Image.Image, groups: list[dict], group_masks: dict[int, Image.Image]) -> dict[int, dict]:
    patch_dir = PATCH_ROOT_DIR
    patch_dir.mkdir(parents=True, exist_ok=True)
    for patch_file in patch_dir.glob(f"{slug(district_id)}-visual-group-*-final-reference-patch.png"):
        patch_file.unlink()
    patches: dict[int, dict] = {}
    for group in groups:
        group_index = int(group["groupIndex"])
        mask = group_masks[group_index]
        bbox = mask.getbbox()
        require(bbox is not None, f"{group['id']} finalReference visual group patch mask가 비어 있습니다.")
        patch = final.crop(bbox).convert("RGBA")
        patch.putalpha(mask.crop(bbox))
        patch_file = patch_dir / f"{group['id']}-final-reference-patch.png"
        patch.save(patch_file, optimize=True)
        patches[group_index] = {
            "visualGroupId": group["id"],
            "groupIndex": group_index,
            "slotIndexes": group["slotIndexes"],
            "revealSlotIndex": group["revealSlotIndex"],
            "buildingAssets": group["buildingAssets"],
            "renderSource": "finalReferenceVisualGroupPatch",
            "patchFile": str(patch_file.relative_to(ROOT)).replace("\\", "/"),
            "pastePx": [bbox[0], bbox[1]],
            "spriteSizePx": [patch.width, patch.height],
            "spriteAlphaBBox": [bbox[0], bbox[1], bbox[2], bbox[3]],
            "_image": patch,
        }
    return patches


def composite_slot(base: Image.Image, patch: dict) -> dict:
    base.alpha_composite(patch["_image"], tuple(patch["pastePx"]))
    return {key: value for key, value in patch.items() if not key.startswith("_")}


def reveal_slot_count_for_growth_stage(growth_stage: int, final_growth_stage: int, slot_count: int) -> int:
    if growth_stage <= 0:
        return 0
    if growth_stage >= final_growth_stage:
        return slot_count
    return max(1, min(slot_count, math.floor(growth_stage * slot_count / final_growth_stage)))


def make_stage_contact_sheet(district_id: str, max_owned_count: int, stage_records: list[dict]) -> None:
    sample_records = stage_records if len(stage_records) <= 6 else [stage_records[index] for index in sorted({0, 1, len(stage_records) // 4, len(stage_records) // 2, len(stage_records) - 2, len(stage_records) - 1})]
    thumb_width = 260
    thumb_height = 146
    label_height = 28
    gap = 10
    sheet_width = len(sample_records) * thumb_width + (len(sample_records) + 1) * gap
    sheet_height = thumb_height + label_height + gap * 2
    sheet = Image.new("RGB", (sheet_width, sheet_height), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)
    for index, stage in enumerate(sample_records):
        image = Image.open(ASSET_ROOT / stage["file"]).convert("RGB")
        image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        left = gap + index * (thumb_width + gap)
        top = gap
        sheet.paste(image, (left, top))
        draw.rectangle((left, top + thumb_height, left + thumb_width, top + thumb_height + label_height), fill=(30, 41, 59))
        draw.text((left + 8, top + thumb_height + 8), f"{district_id} {stage['growthStage']:02d} · {stage['minOwnedCount']}/{max_owned_count}", fill=(226, 232, 240))
    sheet.save(artifact_file(district_id, "stage-contact-sheet.png"), quality=95)


def update_slot_paste_data(slots_data: dict, district_id: str, groups: list[dict], placement_by_group: dict[int, dict]) -> dict:
    next_data = json.loads(json.dumps(slots_data))
    district = find_district(next_data, district_id)
    group_by_slot = {}
    for group in groups:
        for slot_index in group["slotIndexes"]:
            group_by_slot[int(slot_index)] = group
    for slot in district["slots"]:
        group = group_by_slot[int(slot["slotIndex"])]
        placement = placement_by_group[int(group["groupIndex"])]
        slot["visualGroupId"] = group["id"]
        slot["visualGroupSlotIndexes"] = group["slotIndexes"]
        slot["visualGroupRevealSlotIndex"] = group["revealSlotIndex"]
        slot["renderSource"] = placement["renderSource"]
        slot["patchFile"] = placement["patchFile"]
        slot["pastePx"] = placement["pastePx"]
        slot["spriteSizePx"] = placement["spriteSizePx"]
        slot["spriteAlphaBBox"] = placement["spriteAlphaBBox"]
    return next_data


def upsert_district(records: list[dict], district: dict) -> list[dict]:
    next_records = []
    replaced = False
    for record in records:
        if record.get("id") == district["id"]:
            next_records.append(district)
            replaced = True
        else:
            next_records.append(record)
    if not replaced:
        next_records.append(district)
    return next_records


def clean_existing_outputs(district_id: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for output_file in OUTPUT_DIR.glob(f"{slug(district_id)}-growth-*.png"):
        output_file.unlink()
    master_dir = ARTIFACT_DIR / "master" / district_id
    if master_dir.exists():
        shutil.rmtree(master_dir)
    master_dir.mkdir(parents=True, exist_ok=True)
    return master_dir


def write_full_reference_final_only_outputs(
    district_id: str,
    source_district: dict,
    growth_config: dict,
    base: Image.Image,
    final: Image.Image,
    runtime_scale: float,
    slot_count: int,
) -> None:
    master_dir = clean_existing_outputs(district_id)
    runtime_size = (max(1, int(round(base.width * runtime_scale))), max(1, int(round(base.height * runtime_scale))))
    configured_stages = growth_config["stages"]
    final_growth_stage = int(configured_stages[-1]["growthStage"])
    visual_group = {
        "id": f"{slug(district_id)}-final-only",
        "groupIndex": 1,
        "slotIndexes": list(range(1, slot_count + 1)),
        "revealSlotIndex": slot_count,
        "renderSource": "fullReferenceFinalOnly",
        "sourceClusterBBox": [0, 0, base.width, base.height],
        "expandedBBox": [0, 0, base.width, base.height],
        "centroidPx": [round(base.width / 2, 2), round(base.height / 2, 2)],
        "buildingAssets": [],
        "help": {
            "renderSource": "중간 단계 건물 잘림을 막기 위해 최종 성장 단계에서 finalReference 전체 이미지를 사용합니다."
        },
    }
    final_placement = {
        "groupIndex": 1,
        "visualGroupId": visual_group["id"],
        "slotIndexes": visual_group["slotIndexes"],
        "revealSlotIndex": slot_count,
        "renderSource": "fullReferenceFinalOnly",
        "sourceImage": source_district["finalReference"],
        "pastePx": [0, 0],
        "spriteSizePx": [base.width, base.height],
        "spriteAlphaBBox": [0, 0, base.width, base.height],
    }
    stage_entries = []
    stage_reports = []
    for stage_config in configured_stages:
        growth_stage = int(stage_config["growthStage"])
        reveal_slot_count = reveal_slot_count_for_growth_stage(growth_stage, final_growth_stage, slot_count)
        master = final.copy() if reveal_slot_count == slot_count else base.copy()
        master_file_name = f"{slug(district_id)}-growth-master-{growth_stage:02d}.png"
        master.convert("RGB").save(master_dir / master_file_name, optimize=True, compress_level=9)
        runtime = master.resize(runtime_size, Image.Resampling.LANCZOS).convert("RGB")
        relative_file = stage_config["file"]
        runtime.save(ASSET_ROOT / relative_file, optimize=True, compress_level=9)
        stage_entries.append({
            "growthStage": growth_stage,
            "minOwnedCount": int(stage_config["minOwnedCount"]),
            "file": relative_file,
            "help": {
                "growthStage": "지역 내 성장 PNG의 순번입니다. 0은 공터/base 단계입니다.",
                "minOwnedCount": "보유 수량이 이 값 이상일 때 이 PNG를 사용합니다.",
                "file": "src/snapshot/assets 기준 단계별 baked PNG 경로입니다."
            }
        })
        stage_reports.append({
            "growthStage": growth_stage,
            "minOwnedCount": int(stage_config["minOwnedCount"]),
            "revealSlotCount": reveal_slot_count,
            "file": relative_file,
            "masterFile": str((master_dir / master_file_name).relative_to(ROOT)).replace("\\", "/"),
            "activeVisualGroupCount": 1 if reveal_slot_count == slot_count else 0,
            "placements": [final_placement] if reveal_slot_count == slot_count else [],
        })

    make_stage_contact_sheet(district_id, int(growth_config["maxOwnedCount"]), stage_entries)
    growth_district = {
        **growth_config,
        "id": district_id,
        "sourceBackground": source_district["backgroundAsset"],
        "width": runtime_size[0],
        "height": runtime_size[1],
        "stages": stage_entries,
        "help": {
            "id": "부동산 매물/지역 id입니다.",
            "sourceBackground": "0단계 base와 같은 원본 상세 배경 PNG 파일명입니다.",
            "width": "baked 성장 PNG의 가로 해상도입니다.",
            "height": "baked 성장 PNG의 세로 해상도입니다.",
            "maxOwnedCount": "이 지역에서 구매 가능한 최대 보유 수량이며 다음 지역 해금 조건입니다.",
            "unlock": "이 지역을 매입 가능 상태로 여는 조건입니다.",
            "stages": "보유 수량에 따라 선택할 단계별 baked PNG 목록입니다."
        }
    }
    growth_data = read_json(GROWTH_DATA_PATH) if GROWTH_DATA_PATH.exists() else {"version": 1, "districts": []}
    growth_data["version"] = 2
    growth_data.pop("stageCount", None)
    growth_data.pop("slotCount", None)
    growth_data["outputScale"] = runtime_scale
    growth_data["districts"] = upsert_district(growth_data.get("districts", []), growth_district)
    growth_data["help"] = {
        "version": "부동산 지역 상세 baked 성장 이미지 테이블 버전입니다.",
        "outputScale": "원본 상세 배경 대비 앱용 baked PNG 산출 배율입니다.",
        "districts": "지역별 공터 베이스, 해금 조건, 최대 보유 수량, 단계별 baked PNG 목록입니다."
    }
    write_json(GROWTH_DATA_PATH, growth_data)
    write_json(artifact_file(district_id, "generation-report.json"), {
        "districtId": district_id,
        "stageMode": "fullReferenceFinalOnly",
        "slotCount": slot_count,
        "growthStageCount": len(stage_entries),
        "maxOwnedCount": int(growth_config["maxOwnedCount"]),
        "visualGroupCount": 1,
        "visualGroups": [visual_group],
        "runtimeSize": list(runtime_size),
        "stages": stage_reports,
    })
    total_bytes = sum((ASSET_ROOT / stage["file"]).stat().st_size for stage in stage_entries)
    print(f"{district_id} final-only baked 성장 PNG 생성 완료: stages={len(stage_entries)}, total={total_bytes / 1024 / 1024:.2f}MB")
    print(f"contact={artifact_file(district_id, 'stage-contact-sheet.png')}")


def main() -> None:
    args = parse_args()
    district_id = args.district
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    sources = read_json(SOURCE_PATH)
    slots_data = read_json(SLOTS_PATH)
    growth_data = read_json(GROWTH_DATA_PATH)
    source_district = find_district(sources, district_id)
    slot_district = find_district(slots_data, district_id)
    growth_config = find_district(growth_data, district_id)
    output_config = sources["output"]
    runtime_scale = float(output_config["runtimeScale"])
    slot_count = int(output_config["slotCount"])
    require(slot_count == len(slot_district["slots"]), f"slotCount가 데이터와 다릅니다: {slot_count} != {len(slot_district['slots'])}")
    configured_stages = sorted(growth_config["stages"], key=lambda item: int(item["growthStage"]))
    require([int(stage["growthStage"]) for stage in configured_stages] == list(range(len(configured_stages))), "growthStage는 0부터 연속이어야 합니다.")
    final_growth_stage = int(configured_stages[-1]["growthStage"])
    require(final_growth_stage >= 1, "성장 PNG 단계는 0단계와 최종 단계가 필요합니다.")

    base_path = ROOT / source_district["base"]
    require(base_path.exists(), f"base PNG가 없습니다: {source_district['base']}")
    final_path = ROOT / source_district["finalReference"]
    require(final_path.exists(), f"finalReference PNG가 없습니다: {source_district['finalReference']}")
    base = Image.open(base_path).convert("RGBA")
    final = Image.open(final_path).convert("RGBA")
    require(base.size == final.size, f"base/finalReference 해상도가 다릅니다: {base.size} != {final.size}")
    slots = sorted(slot_district["slots"], key=lambda item: int(item["slotIndex"]))
    require([slot["slotIndex"] for slot in slots] == list(range(1, slot_count + 1)), "slotIndex는 1..16 연속이어야 합니다.")
    if source_district.get("stageMode") == "fullReferenceFinalOnly":
        write_full_reference_final_only_outputs(
            district_id,
            source_district,
            growth_config,
            base,
            final,
            runtime_scale,
            slot_count,
        )
        return
    groups = visual_groups_for_slots(district_id, slots, base.width, base.height)
    patches = build_reference_patches(district_id, final, groups, assign_reference_group_masks(district_id, base, final, groups, source_district))

    master_dir = clean_existing_outputs(district_id)

    stage_entries = []
    stage_reports = []
    final_placements: dict[int, dict] = {}
    runtime_size = (max(1, int(round(base.width * runtime_scale))), max(1, int(round(base.height * runtime_scale))))
    for stage_config in configured_stages:
        growth_stage = int(stage_config["growthStage"])
        min_owned_count = int(stage_config["minOwnedCount"])
        reveal_slot_count = reveal_slot_count_for_growth_stage(growth_stage, final_growth_stage, slot_count)
        master = final.copy() if reveal_slot_count == slot_count else base.copy()
        placements = []
        active_groups = [group for group in groups if int(group["revealSlotIndex"]) <= reveal_slot_count]
        for group in sorted(active_groups, key=lambda item: int(item["z"])):
            placement = patches[int(group["groupIndex"])]
            if reveal_slot_count != slot_count:
                placement = composite_slot(master, placement)
            else:
                placement = {key: value for key, value in placement.items() if not key.startswith("_")}
            placements.append(placement)
            final_placements[int(group["groupIndex"])] = placement
        master_file_name = f"{slug(district_id)}-growth-master-{growth_stage:02d}.png"
        master.convert("RGB").save(master_dir / master_file_name, optimize=True, compress_level=9)
        runtime = master.resize(runtime_size, Image.Resampling.LANCZOS).convert("RGB")
        relative_file = stage_config["file"]
        runtime.save(ASSET_ROOT / relative_file, optimize=True, compress_level=9)
        stage_entries.append({
            "growthStage": growth_stage,
            "minOwnedCount": min_owned_count,
            "file": relative_file,
            "help": {
                "growthStage": "지역 내 성장 PNG의 순번입니다. 0은 공터/base 단계입니다.",
                "minOwnedCount": "보유 수량이 이 값 이상일 때 이 PNG를 사용합니다.",
                "file": "src/snapshot/assets 기준 단계별 baked PNG 경로입니다."
            }
        })
        stage_reports.append({
            "growthStage": growth_stage,
            "minOwnedCount": min_owned_count,
            "revealSlotCount": reveal_slot_count,
            "file": relative_file,
            "masterFile": str((master_dir / master_file_name).relative_to(ROOT)).replace("\\", "/"),
            "activeVisualGroupCount": len(active_groups),
            "placements": placements,
        })

    make_stage_contact_sheet(district_id, int(growth_config["maxOwnedCount"]), stage_entries)
    growth_district = {
        **growth_config,
        "id": district_id,
        "sourceBackground": source_district["backgroundAsset"],
        "width": runtime_size[0],
        "height": runtime_size[1],
        "stages": stage_entries,
        "help": {
            "id": "부동산 매물/지역 id입니다.",
            "sourceBackground": "0단계 base와 같은 원본 상세 배경 PNG 파일명입니다.",
            "width": "baked 성장 PNG의 가로 해상도입니다.",
            "height": "baked 성장 PNG의 세로 해상도입니다.",
            "maxOwnedCount": "이 지역에서 구매 가능한 최대 보유 수량이며 다음 지역 해금 조건입니다.",
            "unlock": "이 지역을 매입 가능 상태로 여는 조건입니다.",
            "stages": "보유 수량에 따라 선택할 단계별 baked PNG 목록입니다."
        }
    }
    growth_data["version"] = 2
    growth_data.pop("stageCount", None)
    growth_data.pop("slotCount", None)
    growth_data["outputScale"] = runtime_scale
    growth_data["districts"] = upsert_district(growth_data.get("districts", []), growth_district)
    growth_data["help"] = {
        "version": "부동산 지역 상세 baked 성장 이미지 테이블 버전입니다.",
        "outputScale": "원본 상세 배경 대비 앱용 baked PNG 산출 배율입니다.",
        "districts": "지역별 공터 베이스, 해금 조건, 최대 보유 수량, 단계별 baked PNG 목록입니다."
    }
    write_json(GROWTH_DATA_PATH, growth_data)
    write_json(artifact_file(district_id, "generation-report.json"), {
        "districtId": district_id,
        "slotCount": slot_count,
        "growthStageCount": len(stage_entries),
        "maxOwnedCount": int(growth_config["maxOwnedCount"]),
        "visualGroupCount": len(groups),
        "visualGroups": groups,
        "runtimeSize": list(runtime_size),
        "stages": stage_reports,
    })
    write_json(SLOTS_PATH, update_slot_paste_data(slots_data, district_id, groups, final_placements))
    total_bytes = sum((ASSET_ROOT / stage["file"]).stat().st_size for stage in stage_entries)
    print(f"{district_id} baked 성장 PNG 생성 완료: stages={len(stage_entries)}, total={total_bytes / 1024 / 1024:.2f}MB")
    print(f"contact={artifact_file(district_id, 'stage-contact-sheet.png')}")


if __name__ == "__main__":
    main()
