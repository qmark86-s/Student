from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHEETS = [
    ROOT / "assets" / "visual-source" / "real-estate" / "real-estate-building-reference-sheet-magenta-a.png",
    ROOT / "assets" / "visual-source" / "real-estate" / "real-estate-building-reference-sheet-magenta-b.png",
]
OUTPUT_DIR = ROOT / "src" / "snapshot" / "assets" / "real-estate-buildings"
BUILDING_DATA = ROOT / "data" / "real_estate_building_assets.json"
DISTRICT_DATA = ROOT / "data" / "real_estate_district_assets.json"
CITY_LAYOUT_DATA = ROOT / "data" / "real_estate_city_layout.json"

BASE_GRID_COLUMNS = 4
BASE_GRID_ROWS = 4
DETAIL_GRID_SIDE = 4
DETAIL_SLOT_COUNT = DETAIL_GRID_SIDE * DETAIL_GRID_SIDE
CHROMA_KEY = (255, 0, 255)
CHROMA_HARD_DISTANCE = 42
CHROMA_SOFT_DISTANCE = 96
CHROMA_CORNER_DISTANCE = 24
CHROMA_REMAIN_DISTANCE = 14


DISTRICT_VARIANTS = {
    "small_studio": {
        "theme": "starter_lowrise",
        "displayWidth": 58,
        "rotation": -8,
        "variants": {
            "lowrise_roof": [0, 1, 16, 17],
            "rental_block": [0, 1, 18, 19],
        },
    },
    "two_room": {
        "theme": "residential_lowrise",
        "displayWidth": 62,
        "rotation": -9,
        "variants": {
            "rental_block": [1, 2, 17, 18],
            "lowrise_roof": [0, 1, 16, 19],
        },
    },
    "villa": {
        "theme": "villa_green",
        "displayWidth": 70,
        "rotation": -8,
        "variants": {
            "villa_block": [2, 3, 18, 19],
            "garden_villa": [2, 16, 17, 18],
        },
    },
    "officetel": {
        "theme": "mixed_midrise",
        "displayWidth": 70,
        "rotation": -7,
        "variants": {
            "officetel_block": [3, 7, 10, 26],
            "midrise_glass": [11, 25, 26, 27],
        },
    },
    "shop_unit": {
        "theme": "local_commercial",
        "displayWidth": 68,
        "rotation": -8,
        "variants": {
            "shopfront": [4, 5, 20, 21],
            "market_row": [5, 7, 20, 22],
        },
    },
    "small_building": {
        "theme": "compact_commercial",
        "displayWidth": 70,
        "rotation": -9,
        "variants": {
            "compact_building": [6, 7, 22, 23],
            "shopfront": [5, 20, 21, 22],
        },
    },
    "apartment_building": {
        "theme": "apartment_single",
        "displayWidth": 78,
        "rotation": -7,
        "variants": {
            "apartment_slab": [8, 9, 24, 25],
            "tower_podium": [10, 24, 26, 27],
        },
    },
    "apartment_complex": {
        "theme": "apartment_complex",
        "displayWidth": 80,
        "rotation": -7,
        "variants": {
            "complex_tower": [9, 11, 26, 27],
            "apartment_slab": [8, 9, 24, 25],
        },
    },
    "office_tower": {
        "theme": "office_core",
        "displayWidth": 78,
        "rotation": -8,
        "variants": {
            "office_tower": [12, 13, 28, 29],
            "glass_podium": [13, 14, 29, 30],
        },
    },
    "mixed_development": {
        "theme": "landmark_mixed",
        "displayWidth": 84,
        "rotation": -8,
        "variants": {
            "mixed_podium": [14, 15, 30, 31],
            "office_tower": [13, 14, 28, 30],
            "landmark_tower": [15, 31, 30, 14],
        },
    },
}


VARIANT_LABELS = {
    "lowrise_roof": "저층 지붕형",
    "rental_block": "임대 블록형",
    "villa_block": "빌라 블록형",
    "garden_villa": "정원 빌라형",
    "officetel_block": "오피스텔 블록형",
    "midrise_glass": "중층 유리형",
    "shopfront": "상가 점포형",
    "market_row": "시장 가로형",
    "compact_building": "꼬마빌딩형",
    "apartment_slab": "아파트 판상형",
    "tower_podium": "타워 포디움형",
    "complex_tower": "단지 타워형",
    "office_tower": "오피스 타워형",
    "glass_podium": "유리 포디움형",
    "mixed_podium": "복합 포디움형",
    "landmark_tower": "랜드마크 타워형",
}


DISTRICT_LABELS = {
    "small_studio": "작은 원룸",
    "two_room": "투룸",
    "villa": "빌라",
    "officetel": "오피스텔",
    "shop_unit": "상가 점포",
    "small_building": "꼬마빌딩",
    "apartment_building": "아파트 동",
    "apartment_complex": "아파트 단지",
    "office_tower": "오피스 빌딩",
    "mixed_development": "복합 개발지",
}


def slug(value: str) -> str:
    return value.replace("_", "-")


def color_distance(rgb: tuple[int, int, int], target: tuple[int, int, int] = CHROMA_KEY) -> float:
    return math.sqrt(sum((int(rgb[index]) - target[index]) ** 2 for index in range(3)))


def validate_chroma_source(sheet: Image.Image, source: Path) -> None:
    rgba = sheet.convert("RGBA")
    sample_size = max(10, min(28, rgba.width // 30, rgba.height // 30))
    corners = [
        (0, 0),
        (rgba.width - sample_size, 0),
        (0, rgba.height - sample_size),
        (rgba.width - sample_size, rgba.height - sample_size),
    ]
    for corner_index, (left, top) in enumerate(corners):
        total = sample_size * sample_size
        chroma = 0
        for y in range(top, top + sample_size):
            for x in range(left, left + sample_size):
                r, g, b, _ = rgba.getpixel((x, y))
                if color_distance((r, g, b)) <= CHROMA_CORNER_DISTANCE:
                    chroma += 1
        ratio = chroma / total
        if ratio < 0.96:
            raise RuntimeError(f"source sheet must use fluorescent magenta chroma background: {source} corner={corner_index} ratio={ratio:.3f}")


def remove_chroma_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            distance = color_distance((r, g, b))
            if distance <= CHROMA_HARD_DISTANCE:
                pixels[x, y] = (r, g, b, 0)
            elif distance <= CHROMA_SOFT_DISTANCE:
                alpha_ratio = (distance - CHROMA_HARD_DISTANCE) / (CHROMA_SOFT_DISTANCE - CHROMA_HARD_DISTANCE)
                pixels[x, y] = (r, g, b, max(0, min(a, int(a * alpha_ratio))))
    return rgba


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or alpha.getpixel((x, y)) <= 10:
                continue
            seen[index] = 1
            queue = deque([(x, y)])
            component = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if nx < 0 or ny < 0 or nx >= width or ny >= height:
                            continue
                        nindex = ny * width + nx
                        if seen[nindex] or alpha.getpixel((nx, ny)) <= 10:
                            continue
                        seen[nindex] = 1
                        queue.append((nx, ny))
            components.append(component)

    if not components:
        return image
    largest = max(components, key=len)
    keep = set(largest)
    cleaned = Image.new("RGBA", image.size, (0, 0, 0, 0))
    source = image.load()
    target = cleaned.load()
    for x, y in keep:
        target[x, y] = source[x, y]
    return cleaned


def assert_no_chroma_left(image: Image.Image, asset_id: str) -> None:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 18 and color_distance((r, g, b)) <= CHROMA_REMAIN_DISTANCE:
                raise RuntimeError(f"chroma pixel remained in generated building asset: {asset_id} at {x},{y}")


def strip_exact_chroma_pixels(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0 and color_distance((r, g, b)) <= CHROMA_REMAIN_DISTANCE:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def clear_transparent_chroma_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a <= 8:
                pixels[x, y] = (0, 0, 0, 0)
            elif a < 96 and color_distance((r, g, b)) <= CHROMA_SOFT_DISTANCE:
                pixels[x, y] = (r, g, b, 0)
    return rgba


def crop_base_cells(sheet: Image.Image, source: Path) -> list[Image.Image]:
    validate_chroma_source(sheet, source)
    cell_width = sheet.width // BASE_GRID_COLUMNS
    cell_height = sheet.height // BASE_GRID_ROWS
    cells = []
    for row in range(BASE_GRID_ROWS):
        for column in range(BASE_GRID_COLUMNS):
            left = column * cell_width
            upper = row * cell_height
            cell = sheet.crop((left, upper, left + cell_width, upper + cell_height))
            transparent = keep_largest_alpha_component(remove_chroma_background(cell))
            bbox = transparent.getbbox()
            if bbox is None:
                raise RuntimeError(f"empty building cell: {source} row={row} column={column}")
            pad = 10
            left = max(0, bbox[0] - pad)
            top = max(0, bbox[1] - pad)
            right = min(transparent.width, bbox[2] + pad)
            bottom = min(transparent.height, bbox[3] + pad)
            cells.append(transparent.crop((left, top, right, bottom)))
    return cells


def load_base_cells() -> list[Image.Image]:
    base_cells = []
    for source in SOURCE_SHEETS:
        if not source.exists():
            raise FileNotFoundError(f"missing chroma source sheet: {source}")
        sheet = Image.open(source)
        base_cells.extend(crop_base_cells(sheet, source))
    return base_cells


def tone_sprite(image: Image.Image, district_index: int, variant_index: int, asset_index: int) -> Image.Image:
    color = ImageEnhance.Color(image).enhance(0.95 + ((district_index + variant_index + asset_index) % 5) * 0.025)
    contrast = ImageEnhance.Contrast(color).enhance(0.98 + (asset_index % 4) * 0.02)
    brightness = ImageEnhance.Brightness(contrast).enhance(0.94 + ((district_index + asset_index) % 6) * 0.018)
    return brightness


def resize_sprite(image: Image.Image, display_width: int) -> tuple[Image.Image, int, int]:
    natural_width = display_width * 2
    natural_height = max(24, round(image.height * natural_width / image.width))
    resized = clear_transparent_chroma_rgb(image).resize((natural_width, natural_height), Image.Resampling.LANCZOS)
    resized = strip_exact_chroma_pixels(clear_transparent_chroma_rgb(resized))
    display_height = max(24, round(natural_height / 2))
    return resized, display_width, display_height


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_assets() -> tuple[dict, dict[str, dict[str, list[str]]]]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUTPUT_DIR.glob("*.png"):
        old.unlink()

    base_cells = load_base_cells()
    expected_base_count = len(SOURCE_SHEETS) * BASE_GRID_COLUMNS * BASE_GRID_ROWS
    if len(base_cells) != expected_base_count:
        raise RuntimeError(f"base cell count mismatch: {len(base_cells)} != {expected_base_count}")

    assets = []
    district_asset_ids: dict[str, dict[str, list[str]]] = {}

    for district_index, (district_id, config) in enumerate(DISTRICT_VARIANTS.items()):
        district_asset_ids[district_id] = {}
        for variant_index, (variant, base_indices) in enumerate(config["variants"].items()):
            district_asset_ids[district_id][variant] = []
            for asset_index, base_index in enumerate(base_indices):
                if base_index < 0 or base_index >= len(base_cells):
                    raise RuntimeError(f"base cell index out of range: {district_id}.{variant}[{asset_index}]={base_index}")
                asset_id = f"{district_id}_{variant}_{asset_index + 1}"
                file_name = f"real-estate-building-{slug(asset_id)}.png"
                sprite = tone_sprite(base_cells[base_index], district_index, variant_index, asset_index)
                display_width = int(config["displayWidth"]) + (asset_index - 1) * 2
                resized, display_width, display_height = resize_sprite(sprite, display_width)
                assert_no_chroma_left(resized, asset_id)
                resized.save(OUTPUT_DIR / file_name, optimize=True)
                district_asset_ids[district_id][variant].append(asset_id)
                assets.append({
                    "id": asset_id,
                    "file": f"real-estate-buildings/{file_name}",
                    "districtId": district_id,
                    "theme": config["theme"],
                    "variant": variant,
                    "displayWidth": display_width,
                    "displayHeight": display_height,
                    "anchorX": 50,
                    "anchorY": 88,
                    "shadow": "soft_ground",
                    "help": {
                        "file": f"{DISTRICT_LABELS[district_id]} 지역의 {VARIANT_LABELS[variant]} PNG 건물 리소스입니다.",
                        "districtId": "이 건물 리소스를 우선 사용하는 부동산 지역 id입니다.",
                        "theme": "건물 색감과 용도를 분류하는 테마입니다.",
                        "variant": "상세 pad의 variant와 맞춰 검증하는 건물 유형입니다.",
                        "displayWidth": "상세 지도에서 표시할 기준 너비(px)입니다.",
                        "displayHeight": "상세 지도에서 표시할 기준 높이(px)입니다.",
                        "anchorX": "건물 기준점을 좌우 몇 % 위치에 둘지 나타냅니다.",
                        "anchorY": "건물 기준점을 상하 몇 % 위치에 둘지 나타냅니다.",
                        "shadow": "건물 하단 그림자 표현 유형입니다.",
                    },
                })

    return {
        "version": 1,
        "assets": assets,
        "help": {
            "version": "부동산 PNG 건물 리소스 테이블 버전입니다.",
            "assets": "부동산 상세/도시 맵에 표시할 투명 PNG 건물 리소스 목록입니다.",
        },
    }, district_asset_ids


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def rounded(value: float, digits: int = 2) -> float:
    return round(value, digits)


def points_bounds(points: list[list[float]]) -> tuple[float, float, float, float]:
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def detail_pad_bounds(existing_pads: list[dict]) -> tuple[float, float, float, float]:
    if len(existing_pads) < 4:
        raise RuntimeError("district detailPads must exist before polish generation")
    xs = [float(pad["x"]) for pad in existing_pads]
    ys = [float(pad["y"]) for pad in existing_pads]
    return min(xs), min(ys), max(xs), max(ys)


def generate_detail_pad_layout(existing_pads: list[dict], district_id: str, district_index: int) -> list[dict]:
    min_x, min_y, max_x, max_y = detail_pad_bounds(existing_pads)
    center_x = sum(float(pad["x"]) for pad in existing_pads) / len(existing_pads)
    center_y = sum(float(pad["y"]) for pad in existing_pads) / len(existing_pads)
    width = max(36, max_x - min_x)
    height = max(30, max_y - min_y)
    config = DISTRICT_VARIANTS[district_id]
    variants = list(config["variants"].keys())
    dx = clamp(width / 7.7, 5.5, 8.8)
    dy = clamp(height / 7.2, 3.8, 6.2)
    base_rotation = float(config["rotation"])
    slots = []

    for row in range(DETAIL_GRID_SIDE):
        for column in range(DETAIL_GRID_SIDE):
            local_x = column - (DETAIL_GRID_SIDE - 1) / 2
            local_y = row - (DETAIL_GRID_SIDE - 1) / 2
            x = center_x + (local_x - local_y) * dx + local_y * 0.7
            y = center_y + (local_x + local_y) * dy
            x = clamp(x, min_x - 3, max_x + 3)
            y = clamp(y, min_y - 3, max_y + 3)
            variant = variants[(row + column + district_index) % len(variants)]
            slots.append({
                "sourceRow": row,
                "sourceColumn": column,
                "x": x,
                "y": y,
                "variant": variant,
                "rotation": base_rotation + (column - row) * 0.55,
            })

    slots.sort(key=lambda slot: (-slot["y"], abs(slot["x"] - center_x), slot["sourceRow"], slot["sourceColumn"]))
    pads = []
    for index, slot in enumerate(slots):
        depth_scale = 0.62 + (slot["y"] / 100) * 0.52
        width_px = int(clamp(int(config["displayWidth"]) * 0.68, 34, 58))
        pads.append({
            "id": f"pad-{index + 1:02d}",
            "x": rounded(slot["x"]),
            "y": rounded(slot["y"]),
            "scale": rounded(depth_scale, 3),
            "width": width_px,
            "height": int(round(width_px * 0.54)),
            "z": int(round(slot["y"] * 10 + index)),
            "rotation": rounded(slot["rotation"], 2),
            "variant": slot["variant"],
        })
    return pads


def generate_city_building_slots(district: dict) -> list[list[float]]:
    min_x, min_y, max_x, max_y = points_bounds(district["polygon"])
    center_x = float(district["labelAnchor"][0])
    center_y = float(district["labelAnchor"][1])
    width = max(10, max_x - min_x)
    height = max(8, max_y - min_y)
    dx = clamp(width / 8.4, 1.4, 3.0)
    dy = clamp(height / 7.6, 1.1, 2.3)
    slots = []
    for row in range(DETAIL_GRID_SIDE):
        for column in range(DETAIL_GRID_SIDE):
            local_x = column - (DETAIL_GRID_SIDE - 1) / 2
            local_y = row - (DETAIL_GRID_SIDE - 1) / 2
            x = center_x + (local_x - local_y) * dx
            y = center_y + (local_x + local_y) * dy
            slots.append([
                rounded(clamp(x, min_x + 1, max_x - 1)),
                rounded(clamp(y, min_y + 1, max_y - 1)),
            ])
    slots.sort(key=lambda point: (-point[1], abs(point[0] - center_x), point[0]))
    return slots


def attach_layouts_to_districts(district_asset_ids: dict[str, dict[str, list[str]]]) -> None:
    district_data = json.loads(DISTRICT_DATA.read_text(encoding="utf-8"))
    city_layout = json.loads(CITY_LAYOUT_DATA.read_text(encoding="utf-8"))
    city_by_id = {district["id"]: district for district in city_layout["districts"]}

    for district_index, district in enumerate(district_data["districts"]):
        district_id = district["id"]
        if district_id not in DISTRICT_VARIANTS:
            raise RuntimeError(f"district asset config missing: {district_id}")
        if district_id not in city_by_id:
            raise RuntimeError(f"city layout district missing: {district_id}")
        pads = generate_detail_pad_layout(district["detailPads"], district_id, district_index)
        variant_cursors: dict[str, int] = {}
        for pad in pads:
            variant = pad["variant"]
            choices = district_asset_ids[district_id][variant]
            cursor = variant_cursors.get(variant, 0)
            pad["buildingAsset"] = choices[cursor % len(choices)]
            variant_cursors[variant] = cursor + 1
        district["detailPads"] = pads
        district["help"]["rotation"] = "건물과 빈 필지를 배경 바닥 각도에 맞추기 위한 회전 각도(deg)입니다."
        district["help"]["buildingAsset"] = "각 상세 pad가 사용할 PNG 건물 리소스 id입니다."

        city_by_id[district_id]["buildingSlots"] = generate_city_building_slots(city_by_id[district_id])
        city_by_id[district_id]["help"]["buildingSlots"] = "보유 수량 증가에 따라 시각적으로 채워지는 4x4 쿼터뷰 건물 슬롯 좌표입니다."

    save_json(DISTRICT_DATA, district_data)
    save_json(CITY_LAYOUT_DATA, city_layout)


def main() -> None:
    asset_data, district_asset_ids = build_assets()
    save_json(BUILDING_DATA, asset_data)
    attach_layouts_to_districts(district_asset_ids)
    print(f"REAL_ESTATE_BUILDING_ASSETS_BUILT assets={len(asset_data['assets'])} slots={DETAIL_SLOT_COUNT} dir={OUTPUT_DIR}")


if __name__ == "__main__":
    main()
