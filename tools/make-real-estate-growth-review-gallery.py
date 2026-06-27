from __future__ import annotations

import argparse
import html
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "src" / "snapshot" / "assets"
GROWTH_DIR = ASSET_ROOT / "real-estate-district-growth"
ARTIFACT_DIR = ROOT / "artifacts" / "real-estate-reconstruction"
GROWTH_DATA_PATH = ROOT / "data" / "real_estate_district_growth_assets.json"
DEFAULT_DISTRICTS = ["shop_unit", "two_room", "villa", "apartment_building"]


def slug(value: str) -> str:
    return value.replace("_", "-")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="부동산 성장 PNG 구매 수량 바인딩 검수 갤러리를 생성합니다.")
    parser.add_argument("--district", action="append", dest="districts", help="갤러리를 만들 지역 id입니다. 여러 번 지정할 수 있습니다.")
    parser.add_argument(
        "--index-file",
        default="four-reference-growth-review-gallery.html",
        help="artifacts/real-estate-reconstruction 아래에 쓸 인덱스 HTML 파일명입니다.",
    )
    return parser.parse_args()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def find_district(data: dict, district_id: str) -> dict:
    for district in data["districts"]:
        if district["id"] == district_id:
            return district
    raise RuntimeError(f"growth district를 찾을 수 없습니다: {district_id}")


def sorted_stages(district: dict) -> list[dict]:
    return sorted(district["stages"], key=lambda item: int(item["growthStage"]))


def make_all_stages_sheet(district_id: str, district: dict) -> Path:
    district_slug = slug(district_id)
    stages = sorted_stages(district)
    columns = 5
    thumb_width = 320
    thumb_height = 180
    label_height = 30
    gap = 10
    rows = math.ceil(len(stages) / columns)
    sheet = Image.new(
        "RGB",
        (columns * thumb_width + (columns + 1) * gap, rows * (thumb_height + label_height) + (rows + 1) * gap),
        (8, 17, 31),
    )
    draw = ImageDraw.Draw(sheet)
    for index, stage in enumerate(stages):
        source = ASSET_ROOT / stage["file"]
        require(source.exists(), f"성장 PNG가 없습니다: {source}")
        image = Image.open(source).convert("RGB")
        image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        column = index % columns
        row = index // columns
        cell_left = gap + column * (thumb_width + gap)
        cell_top = gap + row * (thumb_height + label_height + gap)
        paste_x = cell_left + (thumb_width - image.width) // 2
        paste_y = cell_top + (thumb_height - image.height) // 2
        sheet.paste(image, (paste_x, paste_y))
        label_top = cell_top + thumb_height
        draw.rectangle((cell_left, label_top, cell_left + thumb_width, label_top + label_height), fill=(30, 41, 59))
        draw.text((cell_left + 10, label_top + 8), f"{district_id} {stage['growthStage']:02d} · {stage['minOwnedCount']}/{district['maxOwnedCount']}채", fill=(226, 232, 240))
    output = ARTIFACT_DIR / f"{district_slug}-growth-all-stages-contact-sheet.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=95)
    return output


def make_gallery(district_id: str, district: dict) -> Path:
    district_slug = slug(district_id)
    sheet_name = f"{district_slug}-growth-all-stages-contact-sheet.png"
    figures = []
    stages = sorted_stages(district)
    for stage in stages:
        relative = f"../../src/snapshot/assets/{stage['file']}"
        figures.append(
            f'      <figure><img src="{relative}" alt="{stage["growthStage"]}단계"><figcaption>{stage["growthStage"]:02d} · {stage["minOwnedCount"]}/{district["maxOwnedCount"]}채부터</figcaption></figure>'
        )
    title = f"{district_id} 성장 PNG 검수"
    html_text = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    body {{
      margin: 0;
      padding: 24px;
      background: #08111f;
      color: #e5edf7;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    h1, h2 {{ margin: 0 0 14px; }}
    section {{ margin: 0 0 30px; }}
    img {{
      display: block;
      max-width: 100%;
      height: auto;
      border: 1px solid #3b536d;
      background: #0f172a;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }}
    figure {{ margin: 0; }}
    figcaption {{ margin-top: 8px; color: #b9c7d8; font-size: 14px; }}
  </style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <section>
    <h2>전체 단계</h2>
    <img src="{sheet_name}" alt="{html.escape(district_id)} 전체 성장 단계 contact sheet">
  </section>
  <section>
    <h2>개별 단계</h2>
    <div class="grid">
{chr(10).join(figures)}
    </div>
  </section>
</body>
</html>
"""
    output = ARTIFACT_DIR / f"{district_slug}-growth-review-gallery.html"
    output.write_text(html_text, encoding="utf-8")
    return output


def make_index(district_ids: list[str], index_file: str) -> Path:
    links = "\n".join(
        f'      <li><a href="{slug(district_id)}-growth-review-gallery.html">{html.escape(district_id)}</a></li>'
        for district_id in district_ids
    )
    html_text = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>부동산 성장 PNG 검수</title>
  <style>
    body {{
      margin: 0;
      padding: 24px;
      background: #08111f;
      color: #e5edf7;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    a {{ color: #93c5fd; }}
    li {{ margin: 8px 0; }}
  </style>
</head>
<body>
  <h1>부동산 성장 PNG 검수</h1>
  <ul>
{links}
  </ul>
</body>
</html>
"""
    output = ARTIFACT_DIR / index_file
    output.write_text(html_text, encoding="utf-8")
    return output


def main() -> None:
    args = parse_args()
    growth_data = read_json(GROWTH_DATA_PATH)
    district_ids = args.districts or DEFAULT_DISTRICTS
    for district_id in district_ids:
        district = find_district(growth_data, district_id)
        make_all_stages_sheet(district_id, district)
        gallery = make_gallery(district_id, district)
        print(f"{district_id} gallery={gallery}")
    print(f"index={make_index(district_ids, args.index_file)}")


if __name__ == "__main__":
    main()
