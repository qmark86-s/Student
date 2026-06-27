from __future__ import annotations

import argparse
import colorsys
import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "real_estate_reconstruction_sources.json"
ASSET_ROOT = ROOT / "src" / "snapshot" / "assets"
ARTIFACT_DIR = ROOT / "artifacts" / "real-estate-reconstruction"
DEFAULT_TARGET_DISTRICT = "small_studio"
MIN_ALPHA_MARGIN = 6


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
    parser = argparse.ArgumentParser(description="부동산 건물 reference sheet에서 지역별 cutout PNG를 추출합니다.")
    parser.add_argument("--district", default=DEFAULT_TARGET_DISTRICT, help="추출할 부동산 지역 id입니다. 기본값은 small_studio입니다.")
    return parser.parse_args()


def rgb_to_hsv_degrees(r: int, g: int, b: int) -> tuple[float, float, float]:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360, s, v


def is_purple_matte(r: int, g: int, b: int) -> bool:
    hue, saturation, value = rgb_to_hsv_degrees(r, g, b)
    return 256 <= hue <= 296 and saturation >= 0.28 and value >= 0.15 and b >= 70 and r >= 38 and g <= 120


def remove_edge_connected_purple_matte(crop: Image.Image) -> Image.Image:
    image = crop.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push_if_background(x: int, y: int) -> None:
        index = y * width + x
        if seen[index]:
            return
        r, g, b, a = pixels[x, y]
        if a > 0 and is_purple_matte(r, g, b):
            seen[index] = 1
            queue.append((x, y))

    for x in range(width):
        push_if_background(x, 0)
        push_if_background(x, height - 1)
    for y in range(height):
        push_if_background(0, y)
        push_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            push_if_background(nx, ny)

    source = image.copy()
    source_pixels = source.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = source_pixels[x, y]
            if a == 0 or not is_purple_matte(r, g, b):
                continue
            neighbor_transparent = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or ny < 0 or nx >= width or ny >= height:
                    continue
                if source_pixels[nx, ny][3] == 0:
                    neighbor_transparent = True
                    break
            if neighbor_transparent:
                pixels[x, y] = (r, g, b, 0)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0 and is_purple_matte(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    return image


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or alpha.getpixel((x, y)) <= 12:
                continue
            seen[index] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            component: list[tuple[int, int]] = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if nx < 0 or ny < 0 or nx >= width or ny >= height:
                            continue
                        next_index = ny * width + nx
                        if seen[next_index] or alpha.getpixel((nx, ny)) <= 12:
                            continue
                        seen[next_index] = 1
                        queue.append((nx, ny))
            components.append(component)
    require(components, "건물 cutout alpha component가 비어 있습니다.")
    largest = max(components, key=len)
    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    source_pixels = rgba.load()
    output_pixels = output.load()
    for x, y in largest:
        output_pixels[x, y] = source_pixels[x, y]
    return output


def crop_alpha(image: Image.Image, margin: int = 10) -> Image.Image:
    bbox = image.getbbox()
    require(bbox is not None, "건물 cutout alpha bbox가 비어 있습니다.")
    left = max(0, bbox[0] - margin)
    top = max(0, bbox[1] - margin)
    right = min(image.width, bbox[2] + margin)
    bottom = min(image.height, bbox[3] + margin)
    cropped = image.crop((left, top, right, bottom))
    output = Image.new("RGBA", (cropped.width + margin * 2, cropped.height + margin * 2), (0, 0, 0, 0))
    output.alpha_composite(cropped, (margin, margin))
    return output


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getbbox()
    require(bbox is not None, "건물 PNG alpha bbox가 비어 있습니다.")
    return bbox


def assert_alpha_margin(image: Image.Image, asset_id: str) -> None:
    left, top, right, bottom = alpha_bounds(image)
    margins = (left, top, image.width - right, image.height - bottom)
    require(min(margins) >= MIN_ALPHA_MARGIN, f"건물 PNG alpha 여백이 부족합니다: {asset_id} margins={margins}")


def assert_no_purple_residue(image: Image.Image, asset_id: str) -> None:
    pixels = image.convert("RGBA").load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a > 18 and is_purple_matte(r, g, b):
                fail(f"건물 PNG에 보라 배경 잔여가 남아 있습니다: {asset_id} {x},{y}")


def extract_asset(sheet: Image.Image, crop: dict, label_safe_bottom: int) -> tuple[Image.Image, dict]:
    left, top, right, bottom = [int(value) for value in crop["crop"]]
    require(left >= 0 and top >= 0 and right > left and bottom > top, f"crop 범위가 올바르지 않습니다: {crop['id']}")
    require(bottom <= label_safe_bottom, f"crop이 라벨 안전선 밖으로 내려갑니다: {crop['id']} bottom={bottom}")
    raw = sheet.crop((left, top, right, bottom))
    transparent = keep_largest_alpha_component(remove_edge_connected_purple_matte(raw))
    output = crop_alpha(transparent)
    assert_alpha_margin(output, crop["assetId"])
    assert_no_purple_residue(output, crop["assetId"])
    alpha = alpha_bounds(output)
    bounds = {
        "left": round(alpha[0] / output.width * 100, 2),
        "top": round(alpha[1] / output.height * 100, 2),
        "right": round(alpha[2] / output.width * 100, 2),
        "bottom": round(alpha[3] / output.height * 100, 2),
    }
    return output, bounds


def draw_checker(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], size: int = 8) -> None:
    colors = ((226, 232, 240), (148, 163, 184))
    left, top, right, bottom = box
    for y in range(top, bottom, size):
        for x in range(left, right, size):
            draw.rectangle((x, y, min(x + size, right), min(y + size, bottom)), fill=colors[((x - left) // size + (y - top) // size) % 2])


def make_contact_sheet(district_id: str, reports: list[dict]) -> None:
    columns = 4
    cell_width = 300
    cell_height = 210
    rows = math.ceil(len(reports) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)
    for index, report in enumerate(reports):
        col = index % columns
        row = index // columns
        left = col * cell_width
        top = row * cell_height
        preview = (left + 12, top + 12, left + cell_width - 12, top + 142)
        draw_checker(draw, preview)
        image = Image.open(ASSET_ROOT / report["file"]).convert("RGBA")
        scale = min((preview[2] - preview[0] - 12) / image.width, (preview[3] - preview[1] - 12) / image.height, 1)
        rendered = image if scale == 1 else image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        px = preview[0] + (preview[2] - preview[0] - rendered.width) // 2
        py = preview[1] + (preview[3] - preview[1] - rendered.height) // 2
        sheet.paste(rendered.convert("RGB"), (px, py), rendered.getchannel("A"))
        draw.text((left + 14, top + 154), report["assetId"], fill=(226, 232, 240))
        draw.text((left + 14, top + 174), f"{report['variant']} {report['width']}x{report['height']}", fill=(203, 213, 225))
    sheet.save(artifact_file(district_id, "building-sheet-cutouts.png"), quality=95)


def find_district(data: dict, district_id: str) -> dict:
    for district in data["districts"]:
        if district["id"] == district_id:
            return district
    fail(f"reconstruction source district를 찾을 수 없습니다: {district_id}")


def main() -> None:
    args = parse_args()
    district_id = args.district
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    sources = read_json(SOURCE_PATH)
    district = find_district(sources, district_id)
    if district.get("stageMode") == "fullReferenceFinalOnly" and "buildingSheet" not in district:
        write_json(artifact_file(district_id, "building-sheet-cutouts.json"), {
            "districtId": district_id,
            "stageMode": "fullReferenceFinalOnly",
            "assetCount": 0,
            "assets": [],
            "skipped": True,
            "reason": "fullReferenceFinalOnly 지역은 중간 건물 cutout을 만들지 않고 최종 성장 단계에서 finalReference 전체 이미지를 사용합니다.",
        })
        print(f"{district_id} 건물 시트 cutout 추출 생략: fullReferenceFinalOnly")
        return
    sheet_config = district["buildingSheet"]
    if sheet_config.get("source") == "existingRuntimeAssets":
        crops = sheet_config["crops"]
        write_json(artifact_file(district_id, "building-sheet-cutouts.json"), {
            "districtId": district_id,
            "source": "existingRuntimeAssets",
            "assetCount": len(crops),
            "assets": [{
                "id": crop["id"],
                "assetId": crop["assetId"],
                "variant": crop["variant"],
                "file": crop["file"],
            } for crop in crops],
            "skipped": True,
            "reason": "이 지역은 기존 런타임 건물 PNG를 슬롯 메타데이터로 사용하고, 화면 렌더는 finalReference visual group patch로 생성합니다.",
        })
        print(f"{district_id} 건물 시트 cutout 추출 생략: existingRuntimeAssets {len(crops)}개")
        return
    sheet_path = ROOT / sheet_config["file"]
    require(sheet_path.exists(), f"건물 시트 PNG가 없습니다: {sheet_config['file']}")
    sheet = Image.open(sheet_path).convert("RGBA")
    reports = []
    for crop in sheet_config["crops"]:
        image, alpha_bounds_percent = extract_asset(sheet, crop, int(sheet_config["labelSafeBottom"]))
        output_path = ASSET_ROOT / crop["file"]
        output_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(output_path, optimize=True)
        reports.append({
            "id": crop["id"],
            "assetId": crop["assetId"],
            "variant": crop["variant"],
            "file": crop["file"],
            "sourceCrop": crop["crop"],
            "width": image.width,
            "height": image.height,
            "alphaBounds": alpha_bounds_percent,
        })
    require(len(reports) == len(sheet_config["crops"]), f"{district_id} 건물 cutout 수가 crop 수와 다릅니다: {len(reports)} != {len(sheet_config['crops'])}")
    make_contact_sheet(district_id, reports)
    write_json(artifact_file(district_id, "building-sheet-cutouts.json"), {
        "districtId": district_id,
        "sourceSheet": sheet_config["file"],
        "assetCount": len(reports),
        "assets": reports,
    })
    print(f"{district_id} 건물 시트 cutout 추출 완료: {len(reports)}개")
    print(f"contact={artifact_file(district_id, 'building-sheet-cutouts.png')}")


if __name__ == "__main__":
    main()
