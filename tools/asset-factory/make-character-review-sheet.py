from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REPORT = ROOT / "artifacts" / "visual-asset-samples" / "character-axis-report.json"
DEFAULT_OUTPUT = ROOT / "artifacts" / "visual-asset-samples"


def project_path(value: str) -> Path:
    return (ROOT / value).resolve()


def metric_summary(character: dict) -> str:
    metrics = character.get("metrics") or []
    center = max((abs(item.get("centerDelta", 999)) for item in metrics), default=999)
    baseline = max((abs(item.get("baselineDelta", 999)) for item in metrics), default=999)
    heights = [item.get("solidHeight") for item in metrics if isinstance(item.get("solidHeight"), (int, float))]
    drift = max(heights) - min(heights) if heights else 999
    pose = (character.get("poseDelta") or {}).get("minimum", 0)
    return f"pose {pose:.2f} / center {center:.1f}px / base {baseline:.0f}px / h drift {drift:.0f}px"


def labelled_axis_sheet(character: dict) -> Image.Image:
    axis_sheet = character.get("axisSheet")
    if not axis_sheet:
        raise ValueError(f"{character.get('id')} missing axisSheet")

    image = Image.open(project_path(axis_sheet)).convert("RGBA")
    label_h = 34
    label = Image.new("RGBA", (image.width, label_h), (14, 20, 32, 255))
    draw = ImageDraw.Draw(label)
    status = character.get("status", "unknown")
    title = f"{character.get('id', 'unknown')}   {status}   {metric_summary(character)}"
    draw.text((7, 5), title, fill=(255, 255, 255, 235))
    draw.text((7, 20), f"source={character.get('sourceType', 'unknown')}", fill=(177, 191, 213, 235))

    combined = Image.new("RGBA", (image.width, image.height + label_h), (14, 20, 32, 255))
    combined.alpha_composite(label, (0, 0))
    combined.alpha_composite(image, (0, label_h))
    return combined


def write_page(rows: list[Image.Image], output_dir: Path, page_index: int) -> Path:
    width = max(row.width for row in rows)
    height = sum(row.height for row in rows)
    page = Image.new("RGBA", (width, height), (14, 20, 32, 255))
    y = 0
    for row in rows:
        page.alpha_composite(row, (0, y))
        y += row.height
    path = output_dir / f"character-axis-review-page-{page_index:02d}.png"
    page.save(path)
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Create review sheets from character axis report")
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="Path to character-axis-report.json")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Directory for review PNGs")
    parser.add_argument("--per-page", type=int, default=16, help="Character rows per review page")
    args = parser.parse_args()

    report_path = Path(args.report).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    report = json.loads(report_path.read_text(encoding="utf-8"))
    characters = report.get("characters") or []
    if not characters:
        raise SystemExit("No characters in axis report")

    pages = []
    for page_index, start in enumerate(range(0, len(characters), args.per_page), start=1):
        rows = [labelled_axis_sheet(character) for character in characters[start : start + args.per_page]]
        pages.append(write_page(rows, output_dir, page_index))

    index_path = output_dir / "character-axis-review-index.json"
    index_path.write_text(
        json.dumps(
            {
                "report": str(report_path.relative_to(ROOT)).replace("\\", "/"),
                "pages": [str(path.relative_to(ROOT)).replace("\\", "/") for path in pages],
                "characters": len(characters),
                "perPage": args.per_page,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"ASSET_FACTORY_REVIEW_SHEETS_OK pages={len(pages)} index={index_path}")


if __name__ == "__main__":
    main()
