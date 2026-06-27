from __future__ import annotations

import argparse
import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "real_estate_reconstruction_sources.json"
OUTPUT_PATH = ROOT / "data" / "real_estate_reconstruction_slots.json"
ARTIFACT_DIR = ROOT / "artifacts" / "real-estate-reconstruction"

DEFAULT_TARGET_DISTRICT = "small_studio"
SLOT_COUNT = 16


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


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def slug(value: str) -> str:
    return value.replace("_", "-")


def artifact_file(district_id: str, suffix: str) -> Path:
    return ARTIFACT_DIR / f"{slug(district_id)}-{suffix}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="부동산 finalReference PNG에서 지역별 성장 슬롯을 역산합니다.")
    parser.add_argument("--district", default=DEFAULT_TARGET_DISTRICT, help="역산할 부동산 지역 id입니다. 기본값은 small_studio입니다.")
    return parser.parse_args()


def percent(value: float, size: int) -> float:
    return round((value / size) * 100, 4)


def bbox_union(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def bbox_distance(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    dx = max(b[0] - a[2], a[0] - b[2], 0)
    dy = max(b[1] - a[3], a[1] - b[3], 0)
    return math.hypot(dx, dy)


def expanded_bbox(bbox: tuple[int, int, int, int], width: int, height: int, margin: int) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    return (
        max(0, left - margin),
        max(0, top - margin),
        min(width, right + margin),
        min(height, bottom + margin),
    )


def rgb_matches_rule(rgb: tuple[int, int, int], rule: dict) -> bool:
    r, g, b = rgb
    return (
        int(rule["minR"]) <= r <= int(rule["maxR"])
        and int(rule["minG"]) <= g <= int(rule["maxG"])
        and int(rule["minB"]) <= b <= int(rule["maxB"])
        and r - b >= int(rule["minRMinusB"])
        and g - b >= int(rule["minGMinusB"])
        and r - g >= int(rule["minRMinusG"])
        and r - g <= int(rule["maxRMinusG"])
    )


def connected_components(mask: Image.Image, min_area: int, bounds: tuple[int, int, int, int] | None = None) -> list[dict]:
    image = mask.convert("L")
    width, height = image.size
    left, top, right, bottom = bounds or (0, 0, width, height)
    pixels = image.load()
    seen = bytearray(width * height)
    components: list[dict] = []
    for y in range(top, bottom):
        for x in range(left, right):
            index = y * width + x
            if seen[index] or pixels[x, y] == 0:
                continue
            seen[index] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            coords: list[tuple[int, int]] = []
            area = 0
            sum_x = 0
            sum_y = 0
            min_x = width
            min_y = height
            max_x = 0
            max_y = 0
            while queue:
                cx, cy = queue.popleft()
                coords.append((cx, cy))
                area += 1
                sum_x += cx
                sum_y += cy
                min_x = min(min_x, cx)
                min_y = min(min_y, cy)
                max_x = max(max_x, cx)
                max_y = max(max_y, cy)
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if nx < left or ny < top or nx >= right or ny >= bottom:
                            continue
                        next_index = ny * width + nx
                        if seen[next_index] or pixels[nx, ny] == 0:
                            continue
                        seen[next_index] = 1
                        queue.append((nx, ny))
            if area >= min_area:
                components.append({
                    "area": area,
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "centroid": (sum_x / area, sum_y / area),
                    "coords": coords,
                })
    return components


def make_buildable_masks(base: Image.Image, district: dict) -> tuple[Image.Image, Image.Image, list[dict]]:
    width, height = base.size
    config = district["buildableMask"]
    rule = config["rgbRule"]
    raw = Image.new("L", (width, height), 0)
    raw_pixels = raw.load()
    base_pixels = base.convert("RGB").load()
    min_y = int(config["minY"])
    for y in range(min_y, height):
        for x in range(width):
            if rgb_matches_rule(base_pixels[x, y], rule):
                raw_pixels[x, y] = 255

    cleaned = raw.filter(ImageFilter.MaxFilter(int(config["cleanupCloseSize"])))
    cleaned = cleaned.filter(ImageFilter.MinFilter(int(config["cleanupCloseSize"])))
    cleaned = cleaned.filter(ImageFilter.MinFilter(int(config["cleanupOpenSize"])))
    cleaned = cleaned.filter(ImageFilter.MaxFilter(int(config["cleanupOpenSize"])))

    keep = Image.new("L", (width, height), 0)
    keep_pixels = keep.load()
    lot_reports = []
    components = connected_components(cleaned, int(config["minLotArea"]), (0, min_y, width, height))
    for index, component in enumerate(sorted(components, key=lambda item: (item["bbox"][1], item["bbox"][0])), 1):
        bbox = component["bbox"]
        if bbox[3] < 450:
            continue
        for x, y in component["coords"]:
            keep_pixels[x, y] = 255
        lot_reports.append({
            "id": f"lot-mask-{index:02d}",
            "area": component["area"],
            "bbox": list(bbox),
            "centroidPx": [round(component["centroid"][0], 2), round(component["centroid"][1], 2)],
        })

    expanded = keep
    for filter_size in config["dilateFilterSizes"]:
        expanded = expanded.filter(ImageFilter.MaxFilter(int(filter_size)))
    return keep, expanded, lot_reports


def make_restricted_diff_mask(base: Image.Image, final: Image.Image, buildable_mask: Image.Image, district: dict) -> tuple[Image.Image, Image.Image]:
    diff_config = district["diff"]
    diff = ImageChops.difference(base.convert("RGB"), final.convert("RGB")).convert("L")
    threshold = int(diff_config["threshold"])
    mask = diff.point(lambda value: 255 if value >= threshold else 0)
    cleanup = int(diff_config["cleanupFilterSize"])
    mask = mask.filter(ImageFilter.MaxFilter(cleanup)).filter(ImageFilter.MinFilter(cleanup))
    min_y = int(diff_config["minY"])
    pixels = mask.load()
    for y in range(0, min_y):
        for x in range(mask.width):
            pixels[x, y] = 0
    restricted = ImageChops.multiply(mask, buildable_mask)
    return diff, restricted


class UnionFind:
    def __init__(self, count: int) -> None:
        self.parent = list(range(count))

    def find(self, index: int) -> int:
        while self.parent[index] != index:
            self.parent[index] = self.parent[self.parent[index]]
            index = self.parent[index]
        return index

    def union(self, a: int, b: int) -> None:
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a != root_b:
            self.parent[root_b] = root_a


def merge_component_fragments(components: list[dict]) -> list[dict]:
    groups = UnionFind(len(components))
    for left_index, left in enumerate(components):
        for right_index, right in enumerate(components):
            if right_index <= left_index:
                continue
            distance = bbox_distance(left["bbox"], right["bbox"])
            merged_bbox = bbox_union(left["bbox"], right["bbox"])
            merged_width = merged_bbox[2] - merged_bbox[0]
            merged_height = merged_bbox[3] - merged_bbox[1]
            centroid_y_close = abs(left["centroid"][1] - right["centroid"][1]) < 65
            centroid_x_close = abs(left["centroid"][0] - right["centroid"][0]) < 120
            if distance <= 28 and centroid_y_close and merged_width <= 260 and merged_height <= 130:
                groups.union(left_index, right_index)
            elif min(left["area"], right["area"]) < 700 and distance <= 45 and centroid_y_close and centroid_x_close and merged_width <= 280 and merged_height <= 145:
                groups.union(left_index, right_index)

    merged: dict[int, list[dict]] = {}
    for index, component in enumerate(components):
        merged.setdefault(groups.find(index), []).append(component)

    clusters = []
    for members in merged.values():
        area = sum(member["area"] for member in members)
        coords = [coord for member in members for coord in member["coords"]]
        bbox = members[0]["bbox"]
        weighted_x = 0.0
        weighted_y = 0.0
        for member in members:
            bbox = bbox_union(bbox, member["bbox"])
            weighted_x += member["centroid"][0] * member["area"]
            weighted_y += member["centroid"][1] * member["area"]
        if area >= 500:
            clusters.append({
                "area": area,
                "bbox": bbox,
                "centroid": (weighted_x / area, weighted_y / area),
                "coords": coords,
                "sourceComponentCount": len(members),
                "sourceComponentBBoxes": [list(member["bbox"]) for member in sorted(members, key=lambda item: (item["bbox"][1], item["bbox"][0]))],
            })
    return sorted(clusters, key=lambda item: (item["bbox"][1], item["bbox"][0]))


def desired_split_count(cluster: dict) -> int:
    left, top, right, bottom = cluster["bbox"]
    width = right - left
    area = int(cluster["area"])
    if bottom > 900 and width > 250:
        return 3
    if top >= 580 and 900 <= left <= 1150 and bottom <= 730:
        return 1
    if top >= 630 and width > 250:
        return 3
    pieces = 1
    if top < 520 and width >= 190 and area >= 2500:
        pieces = max(pieces, 2)
    if area > 5500 and width > 150:
        pieces = max(pieces, 2)
    if area > 10000 and width > 230:
        pieces = max(pieces, 3)
    return pieces


def split_cluster_by_x_quantiles(cluster: dict, forced_pieces: int | None = None) -> list[dict]:
    left, top, right, bottom = cluster["bbox"]
    if forced_pieces is None and top >= 580 and 900 <= left <= 1150 and bottom <= 730:
        xs = sorted(coord[0] for coord in cluster["coords"])
        median_x = xs[len(xs) // 2]
        subset = [coord for coord in cluster["coords"] if coord[0] >= median_x]
        area = len(subset)
        require(area > 0, f"front-right 후보의 오른쪽 픽셀 subset이 비어 있습니다: {cluster['bbox']}")
        sub_xs = [coord[0] for coord in subset]
        sub_ys = [coord[1] for coord in subset]
        return [{
            "area": area,
            "bbox": (min(sub_xs), min(sub_ys), max(sub_xs) + 1, max(sub_ys) + 1),
            "centroid": (sum(sub_xs) / area, sum(sub_ys) / area),
            "coords": subset,
            "sourceClusterBBox": list(cluster["bbox"]),
            "sourceComponentBBoxes": cluster["sourceComponentBBoxes"],
            "splitIndex": 2,
            "splitCount": 2,
        }]
    pieces = forced_pieces or desired_split_count(cluster)
    if pieces <= 1:
        return [cluster]
    coords = sorted(cluster["coords"], key=lambda item: (item[0], item[1]))
    cuts = [coords[int(len(coords) * index / pieces)][0] for index in range(1, pieces)]
    left, _, right, _ = cluster["bbox"]
    bounds = [left, *cuts, right]
    slots = []
    for index in range(pieces):
        lower = bounds[index]
        upper = bounds[index + 1]
        subset = [coord for coord in cluster["coords"] if lower <= coord[0] < (upper if index < pieces - 1 else upper + 1)]
        if not subset:
            continue
        area = len(subset)
        xs = [coord[0] for coord in subset]
        ys = [coord[1] for coord in subset]
        slots.append({
            "area": area,
            "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
            "centroid": (sum(xs) / area, sum(ys) / area),
            "coords": subset,
            "sourceClusterBBox": list(cluster["bbox"]),
            "sourceComponentBBoxes": cluster["sourceComponentBBoxes"],
            "splitIndex": index + 1,
            "splitCount": pieces,
        })
    return slots


def split_counts_for_clusters(clusters: list[dict], district: dict) -> list[int]:
    counts = [desired_split_count(cluster) for cluster in clusters]
    if district.get("slotSplitMode") == "fillLargestClusters":
        max_per_cluster = int(district.get("maxSlotsPerCluster", 8))
        while sum(counts) < SLOT_COUNT:
            candidates = [index for index, count in enumerate(counts) if count < max_per_cluster]
            require(candidates, f"{district['id']} slotSplitMode가 {SLOT_COUNT}개 슬롯을 만들 수 없습니다.")
            best_index = max(candidates, key=lambda index: float(clusters[index]["area"]) / max(1, counts[index]))
            counts[best_index] += 1
    return counts


def build_slots(district_id: str, clusters: list[dict], base_size: tuple[int, int], crops: list[dict], district: dict) -> list[dict]:
    width, height = base_size
    split_slots = []
    for cluster, pieces in zip(clusters, split_counts_for_clusters(clusters, district)):
        split_slots.extend(split_cluster_by_x_quantiles(cluster, pieces))
    split_slots = sorted(split_slots, key=lambda item: (item["centroid"][1], item["centroid"][0]))
    require(len(split_slots) == SLOT_COUNT, f"diff 기반 slot 수가 {SLOT_COUNT}개가 아닙니다: {len(split_slots)}")

    slots = []
    for index, slot in enumerate(split_slots, 1):
        left, top, right, bottom = slot["bbox"]
        bbox_width = right - left
        bbox_height = bottom - top
        centroid_x, centroid_y = slot["centroid"]
        anchor_x = round((left + right) / 2, 2)
        anchor_y = round(bottom, 2)
        target_width = max(54, round(bbox_width * 1.0))
        target_height = max(42, round(bbox_height * 1.16))
        footprint_half_width = max(18, min(70, target_width * 0.36))
        footprint_depth = max(12, min(42, target_width * 0.22))
        footprint = [
            [round(anchor_x - footprint_half_width, 2), round(anchor_y - footprint_depth * 0.42, 2)],
            [round(anchor_x, 2), round(anchor_y - footprint_depth, 2)],
            [round(anchor_x + footprint_half_width, 2), round(anchor_y - footprint_depth * 0.42, 2)],
            [round(anchor_x, 2), round(anchor_y + footprint_depth * 0.18, 2)],
        ]
        crop = crops[(index - 1) % len(crops)]
        slots.append({
            "id": f"{slug(district_id)}-slot-{index:02d}",
            "slotIndex": index,
            "lotId": f"diff-lot-{index:02d}",
            "candidateBBox": [left, top, right, bottom],
            "candidateCentroidPx": [round(centroid_x, 2), round(centroid_y, 2)],
            "anchorPx": [anchor_x, anchor_y],
            "x": percent(anchor_x, width),
            "y": percent(anchor_y, height),
            "targetWidthPx": target_width,
            "targetHeightPx": target_height,
            "scale": round(target_width / max(1, bbox_width), 4),
            "rotation": -8.0,
            "z": round(anchor_y),
            "variant": crop["variant"],
            "buildingAsset": crop["assetId"],
            "assetMatch": {
                "assetId": crop["assetId"],
                "file": crop["file"],
                "sourceCropId": crop["id"],
                "selection": "slotIndex 순환 매칭. 배치 좌표와 크기는 finalReference diff 픽셀 bbox에서 산출합니다."
            },
            "pastePx": [0, 0],
            "footprintPolygonPx": footprint,
            "footprintPolygon": [[percent(point[0], width), percent(point[1], height)] for point in footprint],
            "sourceClusterBBox": slot.get("sourceClusterBBox", list(slot["bbox"])),
            "sourceComponentBBoxes": slot.get("sourceComponentBBoxes", [list(slot["bbox"])]),
            "splitIndex": slot.get("splitIndex", 1),
            "splitCount": slot.get("splitCount", 1),
            "help": {
                "slotIndex": "누적 baked 성장 단계에서 이 건물이 등장하는 순서입니다.",
                "candidateBBox": "base/finalReference diff와 빈 필지 마스크가 교차한 후보 영역 bbox입니다. [left, top, right, bottom] px입니다.",
                "candidateCentroidPx": "후보 diff 픽셀의 면적 중심입니다.",
                "anchorPx": "건물 cutout 하단 기준점을 둘 master 이미지 픽셀 좌표입니다.",
                "targetWidthPx": "건물 cutout을 합성할 목표 너비입니다. diff bbox에서 산출합니다.",
                "targetHeightPx": "건물 cutout을 합성할 목표 높이입니다. diff bbox에서 산출합니다.",
                "footprintPolygonPx": "도로/수로/인도 침범 검증용 master 픽셀 footprint polygon입니다.",
                "assetMatch": "이 slot에 매칭된 건물 시트 cutout 정보입니다."
            }
        })
    return slots


def build_final_only_slots(district_id: str, base_size: tuple[int, int]) -> list[dict]:
    width, height = base_size
    slots = []
    for index in range(1, SLOT_COUNT + 1):
        slots.append({
            "id": f"{slug(district_id)}-slot-{index:02d}",
            "slotIndex": index,
            "renderSource": "fullReferenceFinalOnly",
            "visualGroupId": f"{slug(district_id)}-final-only",
            "visualGroupSlotIndexes": list(range(1, SLOT_COUNT + 1)),
            "visualGroupRevealSlotIndex": SLOT_COUNT,
            "lotId": f"final-only-lot-{index:02d}",
            "candidateBBox": [0, 0, 0, 0],
            "candidateCentroidPx": [0, 0],
            "anchorPx": [0, 0],
            "x": 0,
            "y": 0,
            "targetWidthPx": 0,
            "targetHeightPx": 0,
            "scale": 1,
            "rotation": 0,
            "z": index,
            "variant": "final_reference",
            "buildingAsset": f"{district_id}_final_reference_only_{index:02d}",
            "assetMatch": {
                "assetId": f"{district_id}_final_reference_only_{index:02d}",
                "file": "",
                "sourceCropId": "",
                "selection": "fullReferenceFinalOnly 모드에서는 중간 건물 조각을 만들지 않고 최종 성장 단계에서 finalReference 전체 이미지만 사용합니다."
            },
            "pastePx": [0, 0],
            "footprintPolygonPx": [[0, 0], [0, 0], [0, 0], [0, 0]],
            "footprintPolygon": [[0, 0], [0, 0], [0, 0], [0, 0]],
            "sourceClusterBBox": [0, 0, width, height],
            "sourceComponentBBoxes": [],
            "splitIndex": index,
            "splitCount": SLOT_COUNT,
            "help": {
                "renderSource": "fullReferenceFinalOnly이면 중간 단계는 base, 최종 성장 단계는 finalReference 전체 이미지를 사용합니다.",
                "visualGroupRevealSlotIndex": "조각난 중간 건물을 방지하기 위해 finalReference가 나타나는 단계입니다."
            }
        })
    return slots


def make_final_only_review(district_id: str, base: Image.Image, final: Image.Image) -> None:
    thumb_width = 360
    thumb_height = 204
    gap = 12
    sheet = Image.new("RGB", (thumb_width * 2 + gap * 3, thumb_height + 42), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate((("base 00", base), ("final 16", final))):
        preview = image.convert("RGB").copy()
        preview.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        left = gap + index * (thumb_width + gap)
        sheet.paste(preview, (left, gap))
        draw.text((left, gap + thumb_height + 10), f"{district_id} {label}", fill=(226, 232, 240))
    sheet.save(artifact_file(district_id, "final-only-review.png"), quality=95)


def draw_mask_overlay(district_id: str, base: Image.Image, final: Image.Image, buildable: Image.Image, restricted: Image.Image, slots: list[dict]) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    buildable.save(artifact_file(district_id, "buildable-lot-expanded-mask.png"))
    restricted.save(artifact_file(district_id, "diff-mask.png"))

    image = final.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_pixels = overlay.load()
    buildable_pixels = buildable.load()
    restricted_pixels = restricted.load()
    for y in range(image.height):
        for x in range(image.width):
            if buildable_pixels[x, y]:
                overlay_pixels[x, y] = (34, 197, 94, 42)
            if restricted_pixels[x, y]:
                overlay_pixels[x, y] = (239, 68, 68, 128)
    draw = ImageDraw.Draw(overlay)
    palette = [(248, 113, 113, 255), (45, 212, 191, 255), (96, 165, 250, 255), (250, 204, 21, 255)]
    for slot in slots:
        left, top, right, bottom = slot["candidateBBox"]
        color = palette[(slot["slotIndex"] - 1) % len(palette)]
        draw.rectangle((left, top, right, bottom), outline=color, width=4)
        anchor_x, anchor_y = slot["anchorPx"]
        draw.line((anchor_x - 8, anchor_y, anchor_x + 8, anchor_y), fill=color, width=3)
        draw.line((anchor_x, anchor_y - 8, anchor_x, anchor_y + 8), fill=color, width=3)
        draw.text((left + 4, top + 4), f"{slot['slotIndex']:02d}", fill=(255, 255, 255, 255))
    image.alpha_composite(overlay)
    image.convert("RGB").save(artifact_file(district_id, "slot-candidate-overlay.png"), quality=95)

    diff_preview = ImageChops.difference(base.convert("RGB"), final.convert("RGB")).convert("RGB")
    diff_preview.save(artifact_file(district_id, "raw-rgb-diff.png"), quality=95)


def make_slot_contact_sheet(district_id: str, base: Image.Image, final: Image.Image, restricted: Image.Image, slots: list[dict]) -> None:
    columns = 4
    cell_width = 320
    cell_height = 220
    rows = math.ceil(len(slots) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)
    for index, slot in enumerate(slots):
        col = index % columns
        row = index // columns
        cell_left = col * cell_width
        cell_top = row * cell_height
        crop_box = expanded_bbox(tuple(slot["candidateBBox"]), final.width, final.height, 42)
        final_crop = final.crop(crop_box).convert("RGBA")
        mask_crop = restricted.crop(crop_box).convert("L")
        overlay = Image.new("RGBA", final_crop.size, (0, 0, 0, 0))
        overlay_pixels = overlay.load()
        mask_pixels = mask_crop.load()
        for y in range(final_crop.height):
            for x in range(final_crop.width):
                if mask_pixels[x, y]:
                    overlay_pixels[x, y] = (239, 68, 68, 132)
        crop_draw = ImageDraw.Draw(overlay)
        left, top, right, bottom = slot["candidateBBox"]
        local_box = (left - crop_box[0], top - crop_box[1], right - crop_box[0], bottom - crop_box[1])
        crop_draw.rectangle(local_box, outline=(34, 197, 94, 255), width=3)
        anchor_x, anchor_y = slot["anchorPx"]
        local_anchor = (anchor_x - crop_box[0], anchor_y - crop_box[1])
        crop_draw.ellipse((local_anchor[0] - 4, local_anchor[1] - 4, local_anchor[0] + 4, local_anchor[1] + 4), fill=(250, 204, 21, 255))
        final_crop.alpha_composite(overlay)
        final_crop.thumbnail((cell_width - 18, 160), Image.Resampling.NEAREST)
        paste_x = cell_left + (cell_width - final_crop.width) // 2
        sheet.paste(final_crop.convert("RGB"), (paste_x, cell_top + 8))
        draw.text((cell_left + 10, cell_top + 172), f"{slot['slotIndex']:02d} {slot['candidateBBox']} anchor={slot['anchorPx']}", fill=(226, 232, 240))
        draw.text((cell_left + 10, cell_top + 190), f"{slot['buildingAsset']} {slot['targetWidthPx']}x{slot['targetHeightPx']}", fill=(203, 213, 225))
    sheet.save(artifact_file(district_id, "slot-candidate-contact-sheet.png"), quality=95)


def make_zoom_review(district_id: str, final: Image.Image, slots: list[dict]) -> None:
    columns = 4
    cell_width = 360
    cell_height = 270
    rows = math.ceil(len(slots) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (10, 17, 29))
    draw = ImageDraw.Draw(sheet)
    for index, slot in enumerate(slots):
        col = index % columns
        row = index // columns
        cell_left = col * cell_width
        cell_top = row * cell_height
        crop_box = expanded_bbox(tuple(slot["candidateBBox"]), final.width, final.height, 24)
        crop = final.crop(crop_box).convert("RGBA")
        crop = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
        crop_draw = ImageDraw.Draw(crop)
        left, top, right, bottom = slot["candidateBBox"]
        local = ((left - crop_box[0]) * 3, (top - crop_box[1]) * 3, (right - crop_box[0]) * 3, (bottom - crop_box[1]) * 3)
        crop_draw.rectangle(local, outline=(34, 197, 94, 255), width=5)
        crop.thumbnail((cell_width - 16, cell_height - 42), Image.Resampling.NEAREST)
        sheet.paste(crop.convert("RGB"), (cell_left + 8, cell_top + 8))
        draw.text((cell_left + 10, cell_top + cell_height - 28), f"{slot['slotIndex']:02d} px bbox {slot['candidateBBox']}", fill=(226, 232, 240))
    sheet.save(artifact_file(district_id, "slot-zoom-review.png"), quality=95)


def find_district(data: dict, district_id: str) -> dict:
    for district in data["districts"]:
        if district["id"] == district_id:
            return district
    fail(f"reconstruction source district를 찾을 수 없습니다: {district_id}")


def upsert_district(records: list[dict], district: dict) -> list[dict]:
    next_records = [record for record in records if record.get("id") != district["id"]]
    next_records.append(district)
    return next_records


def main() -> None:
    args = parse_args()
    district_id = args.district
    sources = read_json(SOURCE_PATH)
    district = find_district(sources, district_id)
    base_path = ROOT / district["base"]
    final_path = ROOT / district["finalReference"]
    require(base_path.exists(), f"base PNG가 없습니다: {rel(base_path)}")
    require(final_path.exists(), f"finalReference PNG가 없습니다: {rel(final_path)}")
    base = Image.open(base_path).convert("RGBA")
    final = Image.open(final_path).convert("RGBA")
    require(base.size == final.size, f"base/finalReference 해상도가 다릅니다: {base.size} != {final.size}")

    if district.get("stageMode") == "fullReferenceFinalOnly":
        slots = build_final_only_slots(district_id, base.size)
        make_final_only_review(district_id, base, final)
        district_output = {
            "id": district_id,
            "width": base.width,
            "height": base.height,
            "slotCount": len(slots),
            "stageMode": "fullReferenceFinalOnly",
            "lotMaskComponents": [],
            "rawDiffComponentCount": 0,
            "mergedClusterCount": 0,
            "slots": slots,
            "help": {
                "stageMode": "fullReferenceFinalOnly이면 중간 조각 생성을 피하고 최종 성장 단계에서 finalReference 전체 이미지를 사용합니다.",
                "slots": "finalReference visual group patch 산출을 위한 placeholder slot 목록입니다."
            }
        }
        output = read_json(OUTPUT_PATH) if OUTPUT_PATH.exists() else {"version": 1, "districts": []}
        output["version"] = 1
        output["source"] = {
            "districtId": district_id,
            "base": district["base"],
            "finalReference": district["finalReference"],
            "stageMode": district["stageMode"],
            "help": {
                "districtId": "부동산 지역 id입니다.",
                "base": "0단계 원본 PNG 경로입니다.",
                "finalReference": "최종 성장 참조 PNG 경로입니다.",
                "stageMode": "이 지역 reconstruction 생성 방식입니다."
            }
        }
        output["districts"] = upsert_district(output.get("districts", []), district_output)
        output["help"] = {
            "version": "부동산 최종본 역산 슬롯 데이터 버전입니다.",
            "source": "마지막으로 역산한 원본과 추출 조건입니다.",
            "districts": "지역별 픽셀 기반 reconstruction slot 목록입니다."
        }
        write_json(OUTPUT_PATH, output)
        write_json(artifact_file(district_id, "slot-candidate-report.json"), {
            "stageMode": "fullReferenceFinalOnly",
            "slotCount": len(slots),
            "slots": [{"slotIndex": slot["slotIndex"], "visualGroupRevealSlotIndex": slot["visualGroupRevealSlotIndex"]} for slot in slots],
        })
        print(f"{district_id} final-only 슬롯 준비 완료: slots={len(slots)}")
        print(f"review={artifact_file(district_id, 'final-only-review.png')}")
        return

    lot_mask, expanded_lot_mask, lot_reports = make_buildable_masks(base.convert("RGB"), district)
    diff, restricted_diff = make_restricted_diff_mask(base, final, expanded_lot_mask, district)
    components = connected_components(restricted_diff, int(district["diff"]["minComponentArea"]), (0, int(district["diff"]["minY"]), base.width, base.height))
    components = sorted(components, key=lambda item: (item["bbox"][1], item["bbox"][0]))
    clusters = merge_component_fragments(components)
    slots = build_slots(district_id, clusters, base.size, district["buildingSheet"]["crops"], district)

    draw_mask_overlay(district_id, base, final, expanded_lot_mask, restricted_diff, slots)
    make_slot_contact_sheet(district_id, base, final, restricted_diff, slots)
    make_zoom_review(district_id, final, slots)

    district_output = {
        "id": district_id,
        "width": base.width,
        "height": base.height,
        "slotCount": len(slots),
        "lotMaskComponents": lot_reports,
        "rawDiffComponentCount": len(components),
        "mergedClusterCount": len(clusters),
        "slots": slots,
        "help": {
            "id": "부동산 지역 id입니다.",
            "width": "분석한 master 이미지 너비입니다.",
            "height": "분석한 master 이미지 높이입니다.",
            "slotCount": "diff에서 산출한 승인 슬롯 수입니다.",
            "lotMaskComponents": "base에서 추출한 빈 필지 픽셀 component 목록입니다.",
            "rawDiffComponentCount": "빈 필지 마스크와 교차한 raw diff component 수입니다.",
            "mergedClusterCount": "작은 조각을 건물군으로 병합한 cluster 수입니다.",
            "slots": "slotIndex 1..16 누적 합성에 사용할 픽셀 기준 슬롯 목록입니다."
        }
    }
    output = read_json(OUTPUT_PATH) if OUTPUT_PATH.exists() else {"version": 1, "districts": []}
    output["version"] = 1
    output["source"] = {
        "districtId": district_id,
        "base": district["base"],
        "finalReference": district["finalReference"],
        "diffThreshold": district["diff"]["threshold"],
        "buildableMask": district["buildableMask"]["source"],
        "help": {
            "districtId": "부동산 지역 id입니다.",
            "base": "0단계 원본 PNG 경로입니다.",
            "finalReference": "최종 성장 참조 PNG 경로입니다.",
            "diffThreshold": "후보 픽셀로 인정한 base/final RGB 차이 threshold입니다.",
            "buildableMask": "후보 diff를 제한한 빈 필지 마스크 출처입니다."
        }
    }
    output["districts"] = upsert_district(output.get("districts", []), district_output)
    output["help"] = {
        "version": "부동산 최종본 역산 슬롯 데이터 버전입니다.",
        "source": "마지막으로 역산한 원본과 추출 조건입니다.",
        "districts": "지역별 픽셀 기반 reconstruction slot 목록입니다."
    }
    write_json(OUTPUT_PATH, output)
    write_json(artifact_file(district_id, "slot-candidate-report.json"), {
        "lotMaskComponentCount": len(lot_reports),
        "rawDiffComponentCount": len(components),
        "mergedClusterCount": len(clusters),
        "slotCount": len(slots),
        "slots": [
            {
                "slotIndex": slot["slotIndex"],
                "candidateBBox": slot["candidateBBox"],
                "anchorPx": slot["anchorPx"],
                "targetSizePx": [slot["targetWidthPx"], slot["targetHeightPx"]],
                "asset": slot["buildingAsset"],
                "sourceClusterBBox": slot["sourceClusterBBox"],
            }
            for slot in slots
        ],
    })
    print(f"{district_id} diff 기반 슬롯 역산 완료: raw={len(components)}, clusters={len(clusters)}, slots={len(slots)}")
    print(f"overlay={artifact_file(district_id, 'slot-candidate-overlay.png')}")


if __name__ == "__main__":
    main()
