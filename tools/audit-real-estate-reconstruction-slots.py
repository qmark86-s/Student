from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "real_estate_reconstruction_sources.json"
SLOTS_PATH = ROOT / "data" / "real_estate_reconstruction_slots.json"
GROWTH_DATA_PATH = ROOT / "data" / "real_estate_district_growth_assets.json"
ASSET_ROOT = ROOT / "src" / "snapshot" / "assets"
ARTIFACT_DIR = ROOT / "artifacts" / "real-estate-reconstruction"
DEFAULT_TARGET_DISTRICT = "small_studio"


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


def slug(value: str) -> str:
    return value.replace("_", "-")


def artifact_file(district_id: str, suffix: str) -> Path:
    return ARTIFACT_DIR / f"{slug(district_id)}-{suffix}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="부동산 지역별 finalReference reconstruction 결과를 픽셀 단위로 감사합니다.")
    parser.add_argument("--district", default=DEFAULT_TARGET_DISTRICT, help="감사할 부동산 지역 id입니다. 기본값은 small_studio입니다.")
    return parser.parse_args()


def find_district(data: dict, district_id: str) -> dict:
    for district in data["districts"]:
        if district["id"] == district_id:
            return district
    fail(f"district를 찾을 수 없습니다: {district_id}")


def sorted_growth_stages(growth_district: dict) -> list[dict]:
    stages = sorted(growth_district["stages"], key=lambda item: int(item["growthStage"]))
    require([int(stage["growthStage"]) for stage in stages] == list(range(len(stages))), "growthStage는 0부터 연속이어야 합니다.")
    return stages


def percent_point(point: list[float], width: int, height: int) -> tuple[float, float]:
    return (float(point[0]) / 100 * width, float(point[1]) / 100 * height)


def make_forbidden_mask(district: dict, width: int, height: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for item in district["forbiddenMasks"]:
        draw.polygon([percent_point(point, width, height) for point in item["polygon"]], fill=255)
    return mask


def rasterize_px_polygon(points: list[list[float]], width: int, height: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).polygon([(float(point[0]), float(point[1])) for point in points], fill=255)
    return mask


def count_overlap(a: Image.Image, b: Image.Image) -> int:
    overlap = ImageChops.multiply(a.convert("L"), b.convert("L"))
    return sum(overlap.histogram()[1:])


def assert_equal_image(actual: Image.Image, expected: Image.Image, label: str) -> None:
    require(actual.size == expected.size, f"{label} 해상도가 다릅니다: {actual.size} != {expected.size}")
    diff = ImageChops.difference(actual.convert("RGB"), expected.convert("RGB"))
    require(diff.getbbox() is None, f"{label} 이미지가 기대 이미지와 픽셀 단위로 다릅니다.")


def resize_to_slot(sprite: Image.Image, slot: dict) -> Image.Image:
    return sprite.convert("RGBA").resize((int(slot["targetWidthPx"]), int(slot["targetHeightPx"])), Image.Resampling.LANCZOS)


def sprite_alpha_mask(slot: dict, crop: dict, size: tuple[int, int]) -> Image.Image:
    if slot.get("renderSource") in {"finalReferencePatch", "finalReferenceVisualGroupPatch"}:
        patch_file = slot.get("patchFile")
        require(isinstance(patch_file, str) and patch_file, f"{slot['id']} patchFile이 없습니다.")
        source = ROOT / patch_file
        require(source.exists(), f"finalReference patch PNG가 없습니다: {patch_file}")
        patch = Image.open(source).convert("RGBA")
        paste_x, paste_y = [int(value) for value in slot["pastePx"]]
        mask = Image.new("L", size, 0)
        mask.paste(patch.getchannel("A"), (paste_x, paste_y))
        return mask
    source = ASSET_ROOT / crop["file"]
    require(source.exists(), f"건물 cutout PNG가 없습니다: {crop['file']}")
    sprite = resize_to_slot(Image.open(source), slot)
    paste_x, paste_y = [int(value) for value in slot["pastePx"]]
    mask = Image.new("L", size, 0)
    mask.paste(sprite.getchannel("A"), (paste_x, paste_y))
    return mask


def diff_mask(a: Image.Image, b: Image.Image, threshold: int = 32) -> Image.Image:
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    return diff.point(lambda value: 255 if value >= threshold else 0)


def count_nonzero(mask: Image.Image) -> int:
    return sum(mask.convert("L").histogram()[1:])


def alpha_bbox(mask: Image.Image) -> list[int]:
    bbox = mask.convert("L").getbbox()
    return list(bbox) if bbox else []


def crop_nonzero(mask: Image.Image, bbox: list[int]) -> int:
    return count_nonzero(mask.crop(tuple(bbox)))


def mean_absolute_delta(a: Image.Image, b: Image.Image) -> float:
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    hist = diff.histogram()
    return sum(value * count for value, count in enumerate(hist)) / max(1, a.width * a.height)


def manual_runtime_audit_reason(growth_stages: list[dict], generation_report: dict | None) -> str:
    if generation_report is None:
        return "생성 리포트가 없어 사용자가 직접 제공한 runtime PNG 목록을 감사합니다."
    if len(generation_report.get("stages", [])) != len(growth_stages):
        return f"성장 PNG 차수와 생성 리포트 차수가 다릅니다: {len(growth_stages)} != {len(generation_report.get('stages', []))}"
    report_files = [stage.get("file", "") for stage in generation_report.get("stages", [])]
    data_files = [stage.get("file", "") for stage in growth_stages]
    if report_files != data_files:
        return "성장 PNG 파일 목록이 생성 리포트와 다릅니다."
    runtime_size = generation_report.get("runtimeSize")
    if isinstance(runtime_size, list) and len(runtime_size) == 2:
        expected_size = (int(runtime_size[0]), int(runtime_size[1]))
        for stage in growth_stages:
            image_path = ASSET_ROOT / stage["file"]
            require(image_path.exists(), f"성장 PNG가 없습니다: {stage['file']}")
            with Image.open(image_path) as image:
                if image.size != expected_size:
                    return f"runtime PNG 해상도가 생성 리포트와 다릅니다: {stage['file']} {image.size} != {expected_size}"
    return ""


def audit_manual_runtime_stages(district_id: str, growth_district: dict, growth_stages: list[dict], reason: str) -> None:
    stage_reports = []
    first_image: Image.Image | None = None
    final_image: Image.Image | None = None
    for stage in growth_stages:
        image_path = ASSET_ROOT / stage["file"]
        require(image_path.exists(), f"성장 PNG가 없습니다: {stage['file']}")
        with Image.open(image_path) as loaded:
            require(loaded.width > 0 and loaded.height > 0, f"성장 PNG 해상도가 올바르지 않습니다: {stage['file']}")
            image = loaded.convert("RGB")
            stage_reports.append({
                "growthStage": int(stage["growthStage"]),
                "minOwnedCount": int(stage["minOwnedCount"]),
                "file": stage["file"],
                "width": int(loaded.width),
                "height": int(loaded.height),
                "mode": loaded.mode,
                "fileSizeBytes": image_path.stat().st_size,
            })
        if first_image is None:
            first_image = image
        final_image = image

    require(first_image is not None and final_image is not None, "성장 PNG stage가 비어 있습니다.")
    comparable_final = final_image.resize(first_image.size, Image.Resampling.LANCZOS) if final_image.size != first_image.size else final_image
    final_delta = mean_absolute_delta(first_image, comparable_final)
    require(final_delta > 0.1, f"0단계와 최종 성장 PNG 차이가 너무 작습니다: meanAbsDelta={final_delta:.4f}")

    report = {
        "districtId": district_id,
        "stageMode": "manualRuntimePng",
        "manualReason": reason,
        "growthStageCount": len(growth_stages),
        "maxOwnedCount": int(growth_district["maxOwnedCount"]),
        "firstFinalMeanAbsoluteDelta": round(final_delta, 4),
        "stageReports": stage_reports,
        "help": {
            "stageMode": "생성 리포트 산출물이 아니라 사용자가 직접 제공한 runtime 성장 PNG를 검사하는 모드입니다.",
            "manualReason": "왜 reconstruction 픽셀 감사 대신 runtime PNG 감사를 사용했는지 설명합니다."
        }
    }
    write_json(artifact_file(district_id, "reconstruction-audit-report.json"), report)
    print(f"{district_id} 수동 runtime 성장 PNG 감사 완료: stages={len(growth_stages)}, meanAbsDelta={final_delta:.2f}")
    print(f"reason={reason}")
    print(f"report={artifact_file(district_id, 'reconstruction-audit-report.json')}")


def audit_full_reference_final_only(
    district_id: str,
    base: Image.Image,
    final: Image.Image,
    source_district: dict,
    slot_district: dict,
    growth_district: dict,
    generation_report: dict,
    growth_stages: list[dict],
    slot_count: int,
) -> None:
    runtime_size = (int(round(base.width * float(read_json(SOURCE_PATH)["output"]["runtimeScale"]))), int(round(base.height * float(read_json(SOURCE_PATH)["output"]["runtimeScale"]))))
    slots = sorted(slot_district["slots"], key=lambda item: int(item["slotIndex"]))
    require(len(slots) == slot_count, f"slot 수가 {slot_count}개가 아닙니다: {len(slots)}")
    require([slot["slotIndex"] for slot in slots] == list(range(1, slot_count + 1)), "slotIndex는 1..16 연속이어야 합니다.")
    require(all(slot.get("renderSource") == "fullReferenceFinalOnly" for slot in slots), "fullReferenceFinalOnly slot renderSource가 누락되었습니다.")

    expected_runtime_base = base.resize(runtime_size, Image.Resampling.LANCZOS).convert("RGB")
    expected_runtime_final = final.resize(runtime_size, Image.Resampling.LANCZOS).convert("RGB")
    for stage in growth_stages:
        growth_stage = int(stage["growthStage"])
        reveal_slot_count = slot_count if growth_stage == int(growth_stages[-1]["growthStage"]) else 0
        expected_master = final.convert("RGB") if reveal_slot_count == slot_count else base.convert("RGB")
        expected_runtime = expected_runtime_final if reveal_slot_count == slot_count else expected_runtime_base
        master_stage = Image.open(ARTIFACT_DIR / "master" / district_id / f"{slug(district_id)}-growth-master-{growth_stage:02d}.png").convert("RGB")
        runtime_stage = Image.open(ASSET_ROOT / stage["file"]).convert("RGB")
        assert_equal_image(master_stage, expected_master, f"{district_id} master {growth_stage}단계")
        assert_equal_image(runtime_stage, expected_runtime, f"{district_id} runtime {growth_stage}단계")

    stage_reports = generation_report["stages"]
    require(len(stage_reports) == len(growth_stages), f"generation report stage 수가 다릅니다: {len(stage_reports)}")
    for stage in stage_reports:
        growth_stage = int(stage["growthStage"])
        reveal_slot_count = int(stage["revealSlotCount"])
        expected_placements = 1 if reveal_slot_count == slot_count else 0
        require(len(stage["placements"]) == expected_placements, f"{growth_stage}단계 fullReferenceFinalOnly placement 수가 다릅니다.")
        if reveal_slot_count == slot_count:
            require(stage["placements"][0].get("renderSource") == "fullReferenceFinalOnly", "최종 단계 placement renderSource가 올바르지 않습니다.")

    final_growth_stage = int(growth_stages[-1]["growthStage"])
    master_final_stage = Image.open(ARTIFACT_DIR / "master" / district_id / f"{slug(district_id)}-growth-master-{final_growth_stage:02d}.png").convert("RGB")
    mean_abs_delta = mean_absolute_delta(master_final_stage, final)
    require(mean_abs_delta == 0, f"최종 단계 finalReference 픽셀 일치 실패: meanAbsDelta={mean_abs_delta}")

    report = {
        "districtId": district_id,
        "stageMode": "fullReferenceFinalOnly",
        "growthStageCount": len(growth_stages),
        "slotCount": slot_count,
        "maxOwnedCount": int(growth_district["maxOwnedCount"]),
        "baseSize": list(base.size),
        "runtimeSize": list(runtime_size),
        "zeroStageMatchesBase": True,
        "finalStageMatchesFinalReference": True,
        "forbiddenOverlapPixels": 0,
        "prefixOverlapPixels": 0,
        "visualGroupCount": int(generation_report.get("visualGroupCount", 1)),
        "finalSimilarity": {
            "candidateFinalDiffPixels": 0,
            "candidateGeneratedDiffPixels": 0,
            "candidateOverlapPixels": 0,
            "candidateCoverage": 1,
            "meanAbsoluteDeltaAgainstFinalReference": round(mean_abs_delta, 4)
        },
        "splitSlotCount": 0,
        "slotReports": [{
            "slotIndex": slot["slotIndex"],
            "slotId": slot["id"],
            "visualGroupId": slot.get("visualGroupId", ""),
            "visualGroupRevealSlotIndex": slot.get("visualGroupRevealSlotIndex", slot_count),
            "renderSource": slot.get("renderSource", ""),
        } for slot in slots],
        "help": {
            "stageMode": "중간 단계 잘림 방지를 위해 중간 단계는 base, 최종 단계는 finalReference 전체 이미지를 사용합니다."
        }
    }
    write_json(artifact_file(district_id, "reconstruction-audit-report.json"), report)
    print(f"{district_id} reconstruction 감사 완료: final-only, coverage=1.000, meanAbsDelta={mean_abs_delta:.2f}")
    print(f"report={artifact_file(district_id, 'reconstruction-audit-report.json')}")


def main() -> None:
    args = parse_args()
    district_id = args.district
    sources = read_json(SOURCE_PATH)
    slots_data = read_json(SLOTS_PATH)
    growth_data = read_json(GROWTH_DATA_PATH)
    generation_report_path = artifact_file(district_id, "generation-report.json")
    generation_report = read_json(generation_report_path) if generation_report_path.exists() else None
    source_district = find_district(sources, district_id)
    slot_district = find_district(slots_data, district_id)
    growth_district = find_district(growth_data, district_id)
    growth_stages = sorted_growth_stages(growth_district)

    base = Image.open(ROOT / source_district["base"]).convert("RGBA")
    final = Image.open(ROOT / source_district["finalReference"]).convert("RGBA")
    require(base.size == final.size, "base/finalReference 해상도가 다릅니다.")
    slot_count = int(sources["output"]["slotCount"])
    require(len(slot_district["slots"]) == slot_count, f"slot 수가 {slot_count}개가 아닙니다: {len(slot_district['slots'])}")
    manual_reason = manual_runtime_audit_reason(growth_stages, generation_report)
    if manual_reason:
        audit_manual_runtime_stages(district_id, growth_district, growth_stages, manual_reason)
        return

    if source_district.get("stageMode") == "fullReferenceFinalOnly":
        require(generation_report is not None, f"생성 리포트가 없습니다: {generation_report_path}")
        audit_full_reference_final_only(
            district_id,
            base,
            final,
            source_district,
            slot_district,
            growth_district,
            generation_report,
            growth_stages,
            slot_count,
        )
        return
    require(generation_report is not None, f"생성 리포트가 없습니다: {generation_report_path}")

    slots = sorted(slot_district["slots"], key=lambda item: int(item["slotIndex"]))
    require([slot["slotIndex"] for slot in slots] == list(range(1, slot_count + 1)), "slotIndex는 1..16 연속이어야 합니다.")
    crop_by_asset = {crop["assetId"]: crop for crop in source_district["buildingSheet"]["crops"]}
    forbidden_mask = make_forbidden_mask(source_district, base.width, base.height)

    master_stage0 = Image.open(ARTIFACT_DIR / "master" / district_id / f"{slug(district_id)}-growth-master-00.png").convert("RGB")
    assert_equal_image(master_stage0, base.convert("RGB"), f"{district_id} master 0단계")
    runtime_size = (int(round(base.width * float(sources["output"]["runtimeScale"]))), int(round(base.height * float(sources["output"]["runtimeScale"]))))
    expected_runtime0 = base.resize(runtime_size, Image.Resampling.LANCZOS).convert("RGB")
    runtime_stage0 = Image.open(ASSET_ROOT / growth_stages[0]["file"]).convert("RGB")
    assert_equal_image(runtime_stage0, expected_runtime0, f"{district_id} runtime 0단계")

    stage_reports = generation_report["stages"]
    visual_groups = generation_report.get("visualGroups", [])
    group_reveal_by_index = {int(group["groupIndex"]): int(group["revealSlotIndex"]) for group in visual_groups}
    placement_by_slot_index: dict[int, dict] = {}
    if stage_reports:
        for placement in stage_reports[-1].get("placements", []):
            for slot_index in placement.get("slotIndexes", []):
                placement_by_slot_index[int(slot_index)] = placement
    for stage in stage_reports:
        growth_stage = int(stage["growthStage"])
        reveal_slot_count = int(stage["revealSlotCount"])
        if group_reveal_by_index:
            placement_groups = sorted(int(placement["groupIndex"]) for placement in stage["placements"])
            expected_groups = sorted(group_index for group_index, reveal_index in group_reveal_by_index.items() if reveal_index <= reveal_slot_count)
            require(placement_groups == expected_groups, f"{growth_stage}단계 visual group prefix가 올바르지 않습니다: {placement_groups} != {expected_groups}")
        else:
            placement_slots = [int(placement["slotIndex"]) for placement in stage["placements"]]
            require(sorted(placement_slots) == list(range(1, reveal_slot_count + 1)), f"{growth_stage}단계 prefix slot이 올바르지 않습니다: {placement_slots}")

    slot_reports = []
    prefix_alpha = Image.new("L", base.size, 0)
    seen_patch_files: set[str] = set()
    group_overlap_total = 0
    for slot in slots:
        slot_for_alpha = dict(slot)
        placement = placement_by_slot_index.get(int(slot["slotIndex"]))
        if placement and placement.get("renderSource") in {"finalReferencePatch", "finalReferenceVisualGroupPatch"}:
            for key in ("renderSource", "patchFile", "visualGroupId", "visualGroupRevealSlotIndex", "spriteAlphaBBox"):
                if key in placement and key not in slot_for_alpha:
                    slot_for_alpha[key] = placement[key]
            slot_for_alpha.setdefault("visualGroupRevealSlotIndex", placement.get("revealSlotIndex", slot["slotIndex"]))
        crop = crop_by_asset.get(slot["buildingAsset"])
        require(crop is not None, f"slot buildingAsset이 시트 crop에 없습니다: {slot['buildingAsset']}")
        alpha = sprite_alpha_mask(slot_for_alpha, crop, base.size)
        footprint = rasterize_px_polygon(slot["footprintPolygonPx"], base.width, base.height)
        alpha_forbidden = count_overlap(alpha, forbidden_mask)
        footprint_forbidden = count_overlap(footprint, forbidden_mask)
        patch_key = str(slot_for_alpha.get("patchFile") or slot["id"])
        is_first_patch = patch_key not in seen_patch_files
        prefix_overlap = count_overlap(alpha, prefix_alpha) if is_first_patch else 0
        is_reference_patch = slot_for_alpha.get("renderSource") in {"finalReferencePatch", "finalReferenceVisualGroupPatch"}
        require(alpha_forbidden == 0, f"{slot['id']} visual group alpha가 금지 마스크와 겹칩니다: pixels={alpha_forbidden}")
        if is_first_patch and not is_reference_patch:
            require(prefix_overlap == 0, f"{slot['id']} visual group alpha가 이전 visual group alpha와 겹칩니다: pixels={prefix_overlap}")
        if is_first_patch:
            prefix_alpha = ImageChops.lighter(prefix_alpha, alpha)
            seen_patch_files.add(patch_key)
            group_overlap_total += prefix_overlap
        slot_reports.append({
            "slotIndex": slot["slotIndex"],
            "slotId": slot["id"],
            "visualGroupId": slot_for_alpha.get("visualGroupId", ""),
            "visualGroupRevealSlotIndex": slot_for_alpha.get("visualGroupRevealSlotIndex", slot["slotIndex"]),
            "candidateBBox": slot["candidateBBox"],
            "anchorPx": slot["anchorPx"],
            "pastePx": slot["pastePx"],
            "spriteAlphaBBox": slot_for_alpha.get("spriteAlphaBBox") or alpha_bbox(alpha),
            "alphaForbiddenPixels": alpha_forbidden,
            "footprintForbiddenPixels": footprint_forbidden,
            "prefixOverlapPixels": prefix_overlap,
            "splitIndex": slot.get("splitIndex", 1),
            "splitCount": slot.get("splitCount", 1),
        })

    final_growth_stage = int(growth_stages[-1]["growthStage"])
    master_final_stage = Image.open(ARTIFACT_DIR / "master" / district_id / f"{slug(district_id)}-growth-master-{final_growth_stage:02d}.png").convert("RGB")
    final_diff = diff_mask(base, final, threshold=32)
    generated_diff = diff_mask(base, master_final_stage, threshold=32)
    final_candidate_pixels = 0
    generated_candidate_pixels = 0
    candidate_overlap_pixels = 0
    for slot in slots:
        bbox = slot["candidateBBox"]
        final_candidate_pixels += crop_nonzero(final_diff, bbox)
        generated_candidate_pixels += crop_nonzero(generated_diff, bbox)
        overlap = ImageChops.multiply(final_diff.crop(tuple(bbox)), generated_diff.crop(tuple(bbox)))
        candidate_overlap_pixels += count_nonzero(overlap)
    require(generated_candidate_pixels > 0, "최종 단계 generated diff가 비어 있습니다.")
    coverage = candidate_overlap_pixels / max(1, final_candidate_pixels)
    require(coverage >= 0.12, f"최종 단계 finalReference 후보 diff coverage가 너무 낮습니다: {coverage:.3f}")

    final_abs = ImageChops.difference(master_final_stage, final.convert("RGB")).convert("L")
    hist = final_abs.histogram()
    mean_abs_delta = sum(value * count for value, count in enumerate(hist)) / max(1, base.width * base.height)

    report = {
        "districtId": district_id,
        "growthStageCount": len(growth_stages),
        "slotCount": slot_count,
        "maxOwnedCount": int(growth_district["maxOwnedCount"]),
        "baseSize": list(base.size),
        "runtimeSize": list(runtime_size),
        "zeroStageMatchesBase": True,
        "forbiddenOverlapPixels": 0,
        "prefixOverlapPixels": group_overlap_total,
        "visualGroupCount": len(seen_patch_files),
        "finalSimilarity": {
            "candidateFinalDiffPixels": final_candidate_pixels,
            "candidateGeneratedDiffPixels": generated_candidate_pixels,
            "candidateOverlapPixels": candidate_overlap_pixels,
            "candidateCoverage": round(coverage, 4),
            "meanAbsoluteDeltaAgainstFinalReference": round(mean_abs_delta, 4)
        },
        "splitSlotCount": sum(1 for slot in slots if int(slot.get("splitCount", 1)) > 1),
        "slotReports": slot_reports,
    }
    write_json(artifact_file(district_id, "reconstruction-audit-report.json"), report)
    print(f"{district_id} reconstruction 감사 완료: slots={slot_count}, coverage={coverage:.3f}, meanAbsDelta={mean_abs_delta:.2f}")
    print(f"report={artifact_file(district_id, 'reconstruction-audit-report.json')}")


if __name__ == "__main__":
    main()
