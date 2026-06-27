from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET_DISTRICT = "small_studio"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="부동산 지역 1개의 reconstruction, sheet 추출, baked PNG 생성을 순서대로 실행합니다.")
    parser.add_argument("--district", default=DEFAULT_TARGET_DISTRICT, help="생성할 부동산 지역 id입니다. 기본값은 small_studio입니다.")
    return parser.parse_args()


def run_step(script: str, district_id: str) -> None:
    command = [sys.executable, str(ROOT / "tools" / script), "--district", district_id]
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> None:
    args = parse_args()
    district_id = args.district
    run_step("reconstruct-real-estate-slots-from-final-reference.py", district_id)
    run_step("extract-real-estate-building-sheet-assets.py", district_id)
    run_step("generate-real-estate-baked-district-growth.py", district_id)


if __name__ == "__main__":
    main()
