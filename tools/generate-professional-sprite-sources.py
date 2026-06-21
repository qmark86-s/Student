from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CELL = 160
FRAMES = 4
GREEN = (0, 255, 0, 255)
ENEMY_SUPERSAMPLE = 3

COMPANION_SOURCE_DIR = ROOT / "assets" / "visual-source" / "companions"
ENEMY_SOURCE_DIR = ROOT / "assets" / "visual-source" / "expedition-enemies"
MANIFEST_PATH = ROOT / "data" / "professional_sprite_manifest.json"
CAREERS_PATH = ROOT / "data" / "careers.json"

BASE_STUDENT_POOLS = {
    "male": ["student-01", "student-03", "student-05", "student-07", "student-09", "student-11", "student-13", "student-15", "student-16"],
    "female": ["student-01", "student-03", "student-05", "student-07", "student-09", "student-11", "student-13", "student-14", "student-16"],
}

HAIR_COLORS = [
    (44, 28, 22, 255),
    (73, 45, 30, 255),
    (35, 39, 47, 255),
    (88, 57, 39, 255),
    (55, 46, 62, 255),
    (96, 72, 49, 255),
]

SKIN_COLORS = [
    (244, 190, 139, 255),
    (236, 176, 125, 255),
    (249, 204, 158, 255),
]

HELPER_SPRITES = [
    {"id": "helper-book", "color": "#818cf8", "prop": "book", "outfit": "scholar", "name": "책 도우미"},
    {"id": "helper-bulb", "color": "#fde047", "prop": "bulb", "outfit": "inventor", "name": "아이디어 도우미"},
    {"id": "helper-chart", "color": "#10b981", "prop": "chart", "outfit": "analyst", "name": "분석 도우미"},
    {"id": "helper-chip", "color": "#38bdf8", "prop": "chip", "outfit": "engineer", "name": "칩 도우미"},
    {"id": "helper-files", "color": "#f59e0b", "prop": "files", "outfit": "office", "name": "자료 도우미"},
    {"id": "helper-flask", "color": "#22c55e", "prop": "flask", "outfit": "lab", "name": "실험 도우미"},
    {"id": "helper-globe", "color": "#38bdf8", "prop": "globe", "outfit": "traveler", "name": "세계 도우미"},
    {"id": "helper-judge", "color": "#f4d35e", "prop": "gavel", "outfit": "legal", "name": "판정 도우미"},
    {"id": "helper-laptop", "color": "#60a5fa", "prop": "laptop", "outfit": "tech", "name": "노트북 도우미"},
    {"id": "helper-medic", "color": "#7ad7ff", "prop": "medic", "outfit": "medic", "name": "회복 도우미"},
    {"id": "helper-mic", "color": "#f472b6", "prop": "mic", "outfit": "media", "name": "발표 도우미"},
    {"id": "helper-palette", "color": "#fb923c", "prop": "palette", "outfit": "artist", "name": "창작 도우미"},
    {"id": "helper-teacher", "color": "#c4b5fd", "prop": "teacher", "outfit": "mentor", "name": "선생님 도우미"},
]

ENEMY_TONES = [
    {"id": "shelter", "color": "#e05267", "accent": "#facc15", "prop": "files", "motif": "rent", "name": "생활 기반"},
    {"id": "studio", "color": "#f97316", "accent": "#f9a8d4", "prop": "palette", "motif": "deadline", "name": "작업 마감"},
    {"id": "neighborhood", "color": "#22c55e", "accent": "#93c5fd", "prop": "book", "motif": "errand", "name": "동네 업무"},
    {"id": "company", "color": "#3b82f6", "accent": "#f97316", "prop": "laptop", "motif": "inbox", "name": "회사 업무"},
    {"id": "office", "color": "#8b5cf6", "accent": "#f0b84c", "prop": "chart", "motif": "meeting", "name": "회의 업무"},
    {"id": "asset", "color": "#10b981", "accent": "#facc15", "prop": "chart", "motif": "market", "name": "자산 시장"},
    {"id": "national", "color": "#ef4444", "accent": "#86efac", "prop": "gavel", "motif": "permit", "name": "행정 장벽"},
    {"id": "global", "color": "#0ea5e9", "accent": "#fde047", "prop": "globe", "motif": "passport", "name": "세계 관문"},
    {"id": "future", "color": "#6366f1", "accent": "#67e8f9", "prop": "chip", "motif": "circuit", "name": "미래 회로"},
    {"id": "summit", "color": "#a855f7", "accent": "#f0b84c", "prop": "teacher", "motif": "summit", "name": "정상 장벽"},
]


def project_path(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def hex_color(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    raw = value.strip().lstrip("#")
    return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16), alpha)


def mix(a: tuple[int, int, int, int], b: tuple[int, int, int, int], ratio: float) -> tuple[int, int, int, int]:
    return tuple(round(a[index] * (1 - ratio) + b[index] * ratio) for index in range(4))  # type: ignore[return-value]


class ScaledDraw:
    def __init__(self, draw: ImageDraw.ImageDraw, scale: int) -> None:
        self.draw = draw
        self.scale = scale

    def _value(self, value: float | int) -> int:
        return round(float(value) * self.scale)

    def _coords(self, values):
        if values and isinstance(values[0], (tuple, list)):
            return [(self._value(x), self._value(y)) for x, y in values]
        return tuple(self._value(value) for value in values)

    def _width(self, width: int | None) -> int | None:
        return None if width is None else max(1, round(width * self.scale))

    def rectangle(self, xy, **kwargs) -> None:
        if "width" in kwargs:
            kwargs["width"] = self._width(kwargs["width"])
        self.draw.rectangle(self._coords(xy), **kwargs)

    def rounded_rectangle(self, xy, radius=0, **kwargs) -> None:
        if "width" in kwargs:
            kwargs["width"] = self._width(kwargs["width"])
        self.draw.rounded_rectangle(self._coords(xy), radius=self._value(radius), **kwargs)

    def ellipse(self, xy, **kwargs) -> None:
        if "width" in kwargs:
            kwargs["width"] = self._width(kwargs["width"])
        self.draw.ellipse(self._coords(xy), **kwargs)

    def polygon(self, xy, **kwargs) -> None:
        self.draw.polygon(self._coords(xy), **kwargs)

    def line(self, xy, **kwargs) -> None:
        if "width" in kwargs:
            kwargs["width"] = self._width(kwargs["width"])
        self.draw.line(self._coords(xy), **kwargs)

    def arc(self, xy, start, end, **kwargs) -> None:
        if "width" in kwargs:
            kwargs["width"] = self._width(kwargs["width"])
        self.draw.arc(self._coords(xy), start, end, **kwargs)


def stable_index(value: str, modulo: int) -> int:
    total = 0
    for index, char in enumerate(value):
        total += (index + 1) * ord(char)
    return total % max(1, modulo)


def load_base_frames(student_id: str, gender: str) -> list[Image.Image]:
    base_dir = ROOT / "src" / "snapshot" / "assets" / "individual" / "students" / f"{student_id}-{gender}"
    frames: list[Image.Image] = []
    for index in range(FRAMES):
        path = base_dir / f"move_{index}.png"
        if not path.exists():
            raise FileNotFoundError(f"Base student frame missing: {project_path(path)}. Run python tools/prepare-character-sprites.py first.")
        frames.append(Image.open(path).convert("RGBA"))
    return frames


def load_base_frame_pool() -> dict[str, dict[str, list[Image.Image]]]:
    return {
        gender: {student_id: load_base_frames(student_id, gender) for student_id in pool}
        for gender, pool in BASE_STUDENT_POOLS.items()
    }


def appearance_profile(item: dict, gender: str, variant: int) -> dict:
    career = item.get("career")
    helper = item["helper"]
    key = f"{career.get('id') if career else helper.get('id')}-{gender}-{variant}"
    pool = BASE_STUDENT_POOLS[gender]
    base_id = pool[stable_index(key, len(pool))]
    hair_style_pool = (
        ["soft-bob", "side-part", "round-cap", "tuft", "short-wave"]
        if gender == "male"
        else ["bob", "short-bob", "side-pony", "soft-wave"]
    )
    hair_style = hair_style_pool[stable_index(key + "-hair", len(hair_style_pool))]
    accessory_pool = ["none", "pin", "hair-clip"]
    return {
        "baseId": base_id,
        "hairStyle": hair_style,
        "hairColor": HAIR_COLORS[stable_index(key + "-hair-color", len(HAIR_COLORS))],
        "skinColor": SKIN_COLORS[stable_index(key + "-skin", len(SKIN_COLORS))],
        "accessory": accessory_pool[stable_index(key + "-acc", len(accessory_pool))],
    }


def career_profile(career: dict | None, helper: dict) -> dict:
    text = " ".join(
        str(value).lower()
        for value in [
            career.get("id") if career else "",
            career.get("name") if career else "",
            career.get("battleProp") if career else "",
            career.get("supportRole") if career else "",
            helper.get("id", ""),
            helper.get("outfit", ""),
            helper.get("prop", ""),
        ]
    )
    family = helper.get("outfit", "scholar")
    hat = "none"
    prop = helper.get("prop", "book")

    def has(*words: str) -> bool:
        return any(word.lower() in text for word in words)

    if has("doctor", "surgeon", "dentist", "의사", "치과", "병원", "medic"):
        family, hat, prop = "medic", "medic", "medic"
    elif has("pharmacist", "약사", "pill"):
        family, hat, prop = "pharmacy", "medic", "pill"
    elif has("judge", "prosecutor", "lawyer", "법", "판사", "검사", "변호사", "gavel"):
        family, hat, prop = "legal", "judge", "gavel"
    elif has("software", "ai", "developer", "engineer", "개발", "연구원", "chip", "laptop"):
        family, hat, prop = "tech", "glasses", "laptop"
    elif has("professor", "teacher", "교수", "교사", "선생", "book"):
        family, hat, prop = "scholar", "glasses", "book"
    elif has("pilot", "항공", "승무", "globe", "travel"):
        family, hat, prop = "traveler", "pilot", "wing"
    elif has("police", "fire", "군", "soldier", "공무원", "소방", "경찰", "shield"):
        family, hat, prop = "uniform", "police", "shield"
    elif has("chef", "요리", "cook", "pan"):
        family, hat, prop = "chef", "chef", "pan"
    elif has("artist", "designer", "writer", "작가", "디자이너", "palette"):
        family, hat, prop = "artist", "cap", "palette"
    elif has("media", "mic", "anchor", "기자", "방송", "camera"):
        family, hat, prop = "media", "headset", "mic"
    elif has("finance", "bank", "invest", "회계", "투자", "은행", "chart"):
        family, hat, prop = "business", "tie", "chart"
    elif has("coach", "athlete", "sports", "운동", "whistle"):
        family, hat, prop = "coach", "cap", "whistle"
    elif has("lab", "flask", "science", "과학", "실험"):
        family, hat, prop = "lab", "glasses", "flask"
    elif has("architect", "builder", "건축", "hardhat", "wrench"):
        family, hat, prop = "engineer", "hardhat", "wrench"

    return {"family": family, "hat": hat, "prop": prop}


def draw_hat(draw: ImageDraw.ImageDraw, hat: str, accent: tuple[int, int, int, int], ink: tuple[int, int, int, int]) -> None:
    white = (248, 250, 252, 255)
    gold = (250, 204, 21, 255)
    if hat == "medic":
        draw.rounded_rectangle((58, 18, 98, 34), radius=4, fill=white, outline=ink, width=3)
        draw.rectangle((76, 21, 81, 31), fill=(239, 68, 68, 255))
        draw.rectangle((72, 25, 85, 29), fill=(239, 68, 68, 255))
    elif hat == "judge":
        draw.rectangle((56, 18, 98, 27), fill=ink)
        draw.rectangle((60, 15, 92, 25), fill=gold)
        draw.rectangle((70, 10, 83, 21), fill=gold)
    elif hat == "pilot":
        draw.rounded_rectangle((55, 17, 99, 31), radius=4, fill=ink)
        draw.rectangle((62, 14, 91, 24), fill=mix(accent, white, 0.24))
        draw.rectangle((73, 16, 82, 21), fill=gold)
    elif hat == "police":
        draw.rounded_rectangle((56, 18, 97, 31), radius=4, fill=ink)
        draw.rectangle((63, 14, 90, 24), fill=mix(accent, ink, 0.15))
        draw.rectangle((74, 17, 82, 22), fill=gold)
    elif hat == "chef":
        draw.ellipse((55, 12, 78, 33), fill=white, outline=ink, width=2)
        draw.ellipse((69, 8, 95, 33), fill=white, outline=ink, width=2)
        draw.ellipse((86, 14, 106, 34), fill=white, outline=ink, width=2)
        draw.rounded_rectangle((58, 27, 103, 41), radius=3, fill=white, outline=ink, width=2)
    elif hat == "hardhat":
        draw.ellipse((53, 15, 101, 35), fill=ink)
        draw.ellipse((59, 12, 96, 32), fill=gold)
        draw.rectangle((53, 29, 102, 36), fill=ink)
        draw.rectangle((75, 13, 81, 34), fill=mix(gold, white, 0.3))
    elif hat == "cap":
        draw.rounded_rectangle((56, 17, 94, 31), radius=4, fill=ink)
        draw.rectangle((64, 13, 88, 24), fill=mix(accent, white, 0.12))
        draw.rectangle((90, 24, 108, 29), fill=ink)
    elif hat == "headset":
        draw.arc((56, 17, 98, 54), 195, 350, fill=ink, width=3)
        draw.rectangle((52, 40, 57, 50), fill=ink)
        draw.line((96, 52, 111, 58), fill=ink, width=3)
        draw.rectangle((109, 56, 116, 60), fill=ink)
    elif hat == "glasses":
        draw.rectangle((66, 48, 78, 57), outline=ink, width=2)
        draw.rectangle((83, 47, 95, 56), outline=ink, width=2)
        draw.line((78, 52, 83, 51), fill=ink, width=2)
    elif hat == "tie":
        draw.polygon([(73, 88), (84, 88), (81, 122), (76, 122)], fill=(34, 197, 94, 255), outline=ink)


def draw_prop(draw: ImageDraw.ImageDraw, prop: str, x: int, y: int, accent: tuple[int, int, int, int], ink: tuple[int, int, int, int]) -> None:
    white = (248, 250, 252, 255)
    gold = (250, 204, 21, 255)
    red = (239, 68, 68, 255)
    cyan = (103, 232, 249, 255)
    if prop in {"medic", "stethoscope"}:
        draw.arc((x + 2, y + 1, x + 38, y + 38), 20, 330, fill=ink, width=5)
        draw.ellipse((x + 31, y + 29, x + 45, y + 43), fill=cyan, outline=ink, width=3)
        draw.line((x + 8, y + 5, x + 8, y + 25), fill=ink, width=3)
        draw.line((x + 30, y + 5, x + 30, y + 25), fill=ink, width=3)
    elif prop == "pill":
        draw.rounded_rectangle((x + 4, y + 13, x + 45, y + 33), radius=10, fill=white, outline=ink, width=3)
        draw.rectangle((x + 24, y + 13, x + 45, y + 33), fill=red)
        draw.line((x + 24, y + 14, x + 24, y + 32), fill=ink, width=3)
    elif prop == "gavel":
        draw.line((x + 8, y + 35, x + 45, y + 7), fill=ink, width=6)
        draw.rounded_rectangle((x + 0, y + 23, x + 28, y + 35), radius=3, fill=gold, outline=ink, width=3)
        draw.rounded_rectangle((x + 26, y + 5, x + 54, y + 18), radius=3, fill=gold, outline=ink, width=3)
    elif prop == "laptop":
        draw.rounded_rectangle((x + 0, y + 2, x + 45, y + 31), radius=3, fill=(15, 23, 42, 255), outline=ink, width=3)
        draw.rectangle((x + 6, y + 8, x + 39, y + 25), fill=mix(accent, white, 0.25))
        draw.rectangle((x - 3, y + 33, x + 52, y + 41), fill=ink)
        draw.rectangle((x + 10, y + 35, x + 43, y + 38), fill=cyan)
    elif prop == "chip":
        draw.rectangle((x + 7, y + 8, x + 42, y + 38), fill=(15, 23, 42, 255), outline=ink, width=3)
        draw.rectangle((x + 15, y + 16, x + 34, y + 30), fill=cyan)
        for dx in range(0, 5):
            draw.line((x + 3 + dx * 9, y + 5, x + 3 + dx * 9, y), fill=cyan, width=2)
            draw.line((x + 3 + dx * 9, y + 41, x + 3 + dx * 9, y + 47), fill=cyan, width=2)
    elif prop == "chart":
        draw.rounded_rectangle((x + 3, y + 4, x + 48, y + 40), radius=4, fill=white, outline=ink, width=3)
        draw.rectangle((x + 11, y + 28, x + 17, y + 35), fill=(34, 197, 94, 255))
        draw.rectangle((x + 23, y + 20, x + 29, y + 35), fill=gold)
        draw.rectangle((x + 35, y + 13, x + 41, y + 35), fill=red)
        draw.line((x + 10, y + 25, x + 26, y + 17, x + 40, y + 10), fill=ink, width=3)
    elif prop == "book":
        draw.rounded_rectangle((x + 0, y + 8, x + 49, y + 41), radius=4, fill=ink)
        draw.rectangle((x + 4, y + 12, x + 23, y + 37), fill=white)
        draw.rectangle((x + 26, y + 12, x + 45, y + 37), fill=mix(accent, white, 0.25))
        for yy in (18, 25, 32):
            draw.line((x + 8, y + yy, x + 20, y + yy), fill=accent, width=2)
    elif prop == "globe":
        draw.ellipse((x + 4, y + 2, x + 46, y + 43), fill=(56, 189, 248, 255), outline=ink, width=3)
        draw.arc((x + 10, y + 5, x + 42, y + 40), 80, 280, fill=white, width=2)
        draw.arc((x + 7, y + 10, x + 44, y + 35), 260, 80, fill=(34, 197, 94, 255), width=4)
        draw.line((x + 25, y + 44, x + 25, y + 52), fill=ink, width=3)
    elif prop == "wing":
        draw.polygon([(x + 1, y + 30), (x + 57, y + 7), (x + 44, y + 31), (x + 57, y + 41)], fill=white, outline=ink)
        draw.line((x + 13, y + 28, x + 45, y + 25), fill=accent, width=4)
    elif prop == "shield":
        draw.polygon([(x + 25, y + 4), (x + 48, y + 12), (x + 43, y + 39), (x + 25, y + 52), (x + 7, y + 39), (x + 2, y + 12)], fill=accent, outline=ink)
        draw.rectangle((x + 22, y + 14, x + 28, y + 39), fill=gold)
        draw.rectangle((x + 13, y + 24, x + 37, y + 30), fill=gold)
    elif prop == "pan":
        draw.ellipse((x + 0, y + 14, x + 42, y + 46), fill=(31, 41, 55, 255), outline=ink, width=3)
        draw.line((x + 38, y + 23, x + 62, y + 10), fill=ink, width=7)
        draw.ellipse((x + 12, y + 19, x + 28, y + 31), fill=gold)
    elif prop == "palette":
        draw.ellipse((x + 0, y + 6, x + 51, y + 44), fill=(254, 215, 170, 255), outline=ink, width=3)
        for cx, cy, color in [(14, 19, red), (28, 16, gold), (36, 27, cyan), (21, 31, accent)]:
            draw.ellipse((x + cx - 4, y + cy - 4, x + cx + 4, y + cy + 4), fill=color)
        draw.ellipse((x + 32, y + 32, x + 43, y + 41), fill=ink)
    elif prop == "mic":
        draw.ellipse((x + 17, y + 4, x + 39, y + 29), fill=(31, 41, 55, 255), outline=ink, width=3)
        draw.rectangle((x + 25, y + 28, x + 31, y + 49), fill=ink)
        draw.rectangle((x + 13, y + 48, x + 43, y + 54), fill=ink)
        draw.line((x + 20, y + 15, x + 36, y + 15), fill=accent, width=2)
    elif prop == "flask":
        draw.polygon([(x + 20, y + 4), (x + 34, y + 4), (x + 34, y + 19), (x + 50, y + 47), (x + 4, y + 47), (x + 20, y + 19)], fill=white, outline=ink)
        draw.rectangle((x + 21, y + 5, x + 33, y + 12), fill=cyan)
        draw.polygon([(x + 11, y + 38), (x + 44, y + 38), (x + 50, y + 47), (x + 4, y + 47)], fill=accent)
    elif prop == "wrench":
        draw.line((x + 10, y + 44, x + 45, y + 9), fill=ink, width=8)
        draw.line((x + 13, y + 41, x + 48, y + 6), fill=accent, width=4)
        draw.arc((x + 33, y + 0, x + 58, y + 24), 40, 310, fill=ink, width=5)
    elif prop == "whistle":
        draw.ellipse((x + 9, y + 15, x + 43, y + 39), fill=gold, outline=ink, width=3)
        draw.rectangle((x + 37, y + 22, x + 56, y + 32), fill=gold, outline=ink, width=3)
        draw.ellipse((x + 18, y + 22, x + 29, y + 33), fill=ink)
    else:
        draw_prop(draw, "book", x, y, accent, ink)


def draw_hair_variant(draw: ImageDraw.ImageDraw, appearance: dict, gender: str, bob: int, ink: tuple[int, int, int, int]) -> None:
    hair = appearance["hairColor"]
    shade = mix(hair, ink, 0.34)
    shine = mix(hair, (255, 255, 255, 255), 0.18)
    style = appearance["hairStyle"]
    y = bob
    draw.line((58, 24 + y, 94, 22 + y), fill=shine, width=2)
    if gender == "male":
        if style == "side-part":
            draw.polygon([(58, 29 + y), (80, 16 + y), (97, 29 + y), (73, 38 + y)], fill=shade)
            draw.rectangle((95, 39 + y, 102, 55 + y), fill=shade)
        elif style == "round-cap":
            draw.rounded_rectangle((59, 16 + y, 96, 31 + y), radius=8, fill=hair, outline=shade, width=2)
            draw.rectangle((57, 31 + y, 96, 38 + y), fill=shade)
        elif style == "tuft":
            for points in [
                [(59, 23 + y), (69, 7 + y), (75, 29 + y)],
                [(73, 20 + y), (87, 9 + y), (88, 31 + y)],
                [(88, 27 + y), (106, 20 + y), (98, 39 + y)],
            ]:
                draw.polygon(points, fill=hair, outline=shade)
        elif style == "short-wave":
            for x in (56, 68, 82, 94):
                draw.arc((x - 2, 17 + y, x + 15, 37 + y), 190, 350, fill=shade, width=4)
        else:
            draw.polygon([(50, 39 + y), (63, 28 + y), (67, 47 + y)], fill=shade)
            draw.polygon([(78, 26 + y), (98, 34 + y), (85, 46 + y)], fill=shade)
    else:
        if style == "bob":
            draw.rounded_rectangle((42, 40 + y, 54, 66 + y), radius=5, fill=shade)
            draw.rectangle((55, 36 + y, 62, 54 + y), fill=shade)
        elif style == "short-bob":
            draw.rectangle((48, 40 + y, 58, 59 + y), fill=shade)
            draw.rectangle((58, 35 + y, 65, 47 + y), fill=hair)
            draw.rectangle((76, 22 + y, 79, 38 + y), fill=shine)
        elif style == "bun":
            draw.rounded_rectangle((39, 34 + y, 52, 46 + y), radius=4, fill=shade, outline=ink, width=1)
            draw.polygon([(50, 43 + y), (58, 38 + y), (56, 58 + y), (49, 62 + y)], fill=shade, outline=ink)
        elif style == "twin-tail":
            draw.polygon([(39, 48 + y), (52, 41 + y), (57, 63 + y), (45, 70 + y)], fill=shade, outline=ink)
            draw.polygon([(45, 45 + y), (38, 40 + y), (39, 51 + y)], fill=shine, outline=shade)
        elif style == "side-pony":
            draw.polygon([(41, 47 + y), (54, 40 + y), (57, 61 + y), (48, 68 + y)], fill=shade, outline=ink)
            draw.rectangle((46, 43 + y, 55, 48 + y), fill=shine)
        elif style == "soft-wave":
            draw.polygon([(43, 42 + y), (56, 37 + y), (58, 57 + y), (49, 64 + y), (43, 57 + y)], fill=shade, outline=ink)
            draw.arc((56, 36 + y, 71, 55 + y), 100, 250, fill=shine, width=2)
        else:
            draw.polygon([(42, 44 + y), (56, 39 + y), (58, 60 + y), (48, 67 + y)], fill=shade, outline=ink)
            draw.rectangle((46, 42 + y, 55, 58 + y), fill=shade)


def draw_face_accessory(draw: ImageDraw.ImageDraw, appearance: dict, accent: tuple[int, int, int, int], ink: tuple[int, int, int, int], bob: int) -> None:
    accessory = appearance["accessory"]
    y = bob
    if accessory == "round-glasses":
        draw.rectangle((65, 49 + y, 78, 58 + y), outline=ink, width=2)
        draw.rectangle((84, 48 + y, 97, 57 + y), outline=ink, width=2)
        draw.line((78, 53 + y, 84, 52 + y), fill=ink, width=2)
    elif accessory == "pin":
        draw.rounded_rectangle((57, 32 + y, 72, 37 + y), radius=2, fill=accent, outline=ink, width=1)
    elif accessory == "small-ribbon":
        draw.polygon([(44, 43 + y), (36, 36 + y), (37, 50 + y)], fill=accent, outline=ink)
        draw.polygon([(48, 43 + y), (57, 36 + y), (56, 50 + y)], fill=accent, outline=ink)
        draw.ellipse((43, 39 + y, 50, 47 + y), fill=ink)
    elif accessory == "hair-clip":
        draw.rounded_rectangle((58, 33 + y, 75, 38 + y), radius=2, fill=accent, outline=ink, width=1)
        draw.line((59, 36 + y, 74, 35 + y), fill=mix(accent, (255, 255, 255, 255), 0.45), width=1)
    elif accessory == "star-pin":
        draw.polygon(
            [(47, 35 + y), (50, 42 + y), (58, 42 + y), (52, 47 + y), (55, 54 + y), (47, 50 + y), (40, 54 + y), (43, 47 + y), (37, 42 + y), (45, 42 + y)],
            fill=accent,
            outline=ink,
        )
    elif accessory == "earpiece":
        draw.rounded_rectangle((92, 34 + y, 108, 39 + y), radius=2, fill=accent, outline=ink, width=1)


def draw_companion_frame(base: Image.Image, item: dict, gender: str, frame_index: int, variant: int) -> Image.Image:
    image = base.copy()
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    career = item.get("career")
    helper = item["helper"]
    profile = career_profile(career, helper)
    accent = hex_color(career.get("auraColor", helper["color"]) if career else helper["color"])
    ink = (23, 33, 46, 255)
    white = (248, 250, 252, 255)
    dark = mix(accent, ink, 0.34)
    light = mix(accent, white, 0.28)
    bob = [0, -1, -3, -1][frame_index]
    arm = [0, 2, 6, 3][frame_index]
    family = profile["family"]
    appearance = item.get("appearance") or appearance_profile(item, gender, variant)
    body_top = 90 + bob
    body_bottom = 124 + bob
    body_left = 56
    body_right = 102

    draw.ellipse((34, 142, 122, 154), fill=(0, 0, 0, 64))
    draw_hair_variant(draw, appearance, gender, bob, ink)
    draw_face_accessory(draw, appearance, accent, ink, bob)
    if family in {"medic", "pharmacy", "lab", "chef", "scholar"}:
        torso = white
    elif family == "legal":
        torso = (17, 24, 39, 255)
    elif family == "uniform":
        torso = mix(accent, ink, 0.22)
    else:
        torso = mix(accent, white, 0.1)
    draw.rounded_rectangle((body_left - 5, body_top - 4, body_right + 5, body_bottom + 5), radius=9, fill=ink)
    draw.rounded_rectangle((body_left, body_top, body_right, body_bottom), radius=8, fill=torso)
    draw.polygon([(82, body_top), (body_right, body_top + 10), (96, body_bottom), (84, body_bottom - 2)], fill=dark)
    draw.rectangle((61, body_top + 6, 72, body_bottom - 5), fill=light)

    if family in {"medic", "pharmacy", "lab"}:
        draw.rectangle((59, body_top + 4, 78, body_bottom - 3), fill=white)
        draw.rectangle((82, body_top + 3, 99, body_bottom - 3), fill=mix(white, accent, 0.06))
        draw.rectangle((84, body_top + 20, 99, body_top + 26), fill=(239, 68, 68, 255))
        draw.rectangle((89, body_top + 15, 95, body_top + 32), fill=(239, 68, 68, 255))
    elif family == "legal":
        draw.rectangle((62, body_top + 5, 88, body_top + 19), fill=white)
        draw.rectangle((74, body_top + 8, 82, body_bottom - 6), fill=(250, 204, 21, 255))
    elif family == "tech":
        draw.rectangle((61, body_top + 8, 94, body_top + 16), fill=(103, 232, 249, 230))
        draw.rectangle((62, body_top + 23, 73, body_top + 34), fill=(250, 204, 21, 230))
        draw.rectangle((84, body_top + 22, 96, body_top + 34), fill=(56, 189, 248, 230))
        draw.line((67, body_top + 30, 91, body_top + 28), fill=ink, width=2)
    elif family == "business":
        draw.rectangle((61, body_top + 5, 92, body_top + 19), fill=white)
        draw.rectangle((74, body_top + 7, 82, body_bottom - 6), fill=(34, 197, 94, 255))
    elif family == "artist":
        draw.polygon([(55, body_top + 5), (87, body_top - 2), (105, body_top + 17), (87, body_top + 39), (58, body_top + 34)], fill=mix(accent, white, 0.18))
        for px, py, color in [(66, body_top + 13, (239, 68, 68, 255)), (78, body_top + 10, (250, 204, 21, 255)), (90, body_top + 17, (103, 232, 249, 255))]:
            draw.rectangle((px, py, px + 6, py + 6), fill=color)
    elif family == "media":
        draw.rounded_rectangle((45, body_top + 10, 61, body_top + 28), radius=4, fill=mix(accent, ink, 0.18), outline=ink, width=2)
        draw.rectangle((49, body_top + 15, 57, body_top + 21), fill=mix(accent, white, 0.3))
        draw.line((58, body_top + 19, 68, body_top + 25), fill=ink, width=2)
    elif family == "chef":
        draw.rectangle((64, body_top + 7, 70, body_bottom - 4), fill=(239, 68, 68, 255))
        draw.rectangle((84, body_top + 7, 90, body_bottom - 4), fill=(239, 68, 68, 255))

    if gender == "female":
        draw.polygon([(56, body_bottom - 7), (102, body_bottom - 7), (110, 136 + bob), (48, 136 + bob)], fill=mix(torso, ink, 0.16))

    draw.line((body_left + 2, body_top + 10, 42, body_top + 22), fill=ink, width=6)
    draw.ellipse((34, body_top + 17, 46, body_top + 29), fill=(239, 192, 141, 255), outline=ink, width=1)
    draw.line((body_right - 5, body_top + 9, 114 + arm, body_top + 19), fill=ink, width=6)
    draw.ellipse((111 + arm, body_top + 15, 124 + arm, body_top + 27), fill=(239, 192, 141, 255), outline=ink, width=1)

    draw_hat(draw, profile["hat"], accent, ink)
    prop_x = min(98 + arm, 106)
    draw_prop(draw, profile["prop"], prop_x, 88 + bob, accent, ink)
    if family == "media":
        draw.line((114 + arm, body_top + 24, 137 + arm, body_top + 17), fill=ink, width=4)
        draw.ellipse((134 + arm, body_top + 12, 146 + arm, body_top + 24), fill=mix(accent, white, 0.2), outline=ink, width=2)

    tier = max(1, min(5, int(career.get("tier", 3) if career else 3)))
    badge = [(253, 224, 71, 255), (56, 189, 248, 255), (34, 197, 94, 255), (251, 146, 60, 255), (148, 163, 184, 255)][tier - 1]
    draw.ellipse((50, body_top + 2, 66, body_top + 18), fill=ink)
    draw.ellipse((54, body_top + 6, 62, body_top + 14), fill=badge)
    draw.rectangle((104, body_top + 7, 110, body_bottom - 5), fill=(255, 255, 255, 44))

    image.alpha_composite(layer)
    return image


def sheet_from_companion(item: dict, base_frames: dict[str, dict[str, list[Image.Image]]], variant: int) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * FRAMES, CELL * 2), (0, 0, 0, 0))
    for row, gender in enumerate(["male", "female"]):
        appearance = appearance_profile(item, gender, variant)
        item_for_gender = {**item, "appearance": appearance}
        for frame_index, base in enumerate(base_frames[gender][appearance["baseId"]]):
            frame = draw_companion_frame(base, item_for_gender, gender, frame_index, variant)
            sheet.alpha_composite(frame, (frame_index * CELL, row * CELL))
    return sheet


def draw_enemy_prop(draw: ImageDraw.ImageDraw, tone: dict, x: int, y: int, scale: float) -> None:
    accent = hex_color(tone["accent"])
    ink = (23, 33, 46, 255)
    prop = tone["motif"]
    if prop == "rent":
        draw.rounded_rectangle((x, y, x + 36 * scale, y + 28 * scale), radius=4, fill=(248, 250, 252, 255), outline=ink, width=3)
        draw.rectangle((x + 5 * scale, y + 5 * scale, x + 31 * scale, y + 10 * scale), fill=accent)
        draw.rectangle((x + 8 * scale, y + 16 * scale, x + 24 * scale, y + 20 * scale), fill=ink)
    elif prop == "deadline":
        draw.ellipse((x, y, x + 42 * scale, y + 30 * scale), fill=(254, 215, 170, 255), outline=ink, width=3)
        for dx, color in [(9, (239, 68, 68, 255)), (20, (250, 204, 21, 255)), (31, (103, 232, 249, 255))]:
            draw.ellipse((x + dx * scale, y + 10 * scale, x + (dx + 7) * scale, y + 17 * scale), fill=color)
        draw.line((x + 35 * scale, y + 4 * scale, x + 49 * scale, y - 12 * scale), fill=ink, width=4)
    elif prop == "inbox":
        draw.rounded_rectangle((x, y, x + 43 * scale, y + 32 * scale), radius=4, fill=(15, 23, 42, 255), outline=ink, width=3)
        draw.rectangle((x + 7 * scale, y + 8 * scale, x + 36 * scale, y + 23 * scale), fill=accent)
        draw.rectangle((x - 3 * scale, y + 34 * scale, x + 50 * scale, y + 41 * scale), fill=ink)
    elif prop == "market":
        draw.rounded_rectangle((x, y, x + 44 * scale, y + 34 * scale), radius=4, fill=(248, 250, 252, 255), outline=ink, width=3)
        draw.line((x + 8 * scale, y + 25 * scale, x + 20 * scale, y + 14 * scale, x + 35 * scale, y + 20 * scale), fill=(34, 197, 94, 255), width=4)
        draw.ellipse((x + 31 * scale, y - 2 * scale, x + 47 * scale, y + 14 * scale), fill=(250, 204, 21, 255), outline=ink, width=2)
    elif prop == "circuit":
        draw.rectangle((x + 6 * scale, y + 4 * scale, x + 40 * scale, y + 38 * scale), fill=(15, 23, 42, 255), outline=ink, width=3)
        draw.rectangle((x + 15 * scale, y + 14 * scale, x + 31 * scale, y + 29 * scale), fill=(103, 232, 249, 255))
        draw.line((x + 39 * scale, y + 12 * scale, x + 54 * scale, y + 2 * scale), fill=accent, width=3)
        draw.line((x + 39 * scale, y + 28 * scale, x + 55 * scale, y + 39 * scale), fill=accent, width=3)
    else:
        draw.rounded_rectangle((x, y, x + 40 * scale, y + 32 * scale), radius=5, fill=accent, outline=ink, width=3)
        draw.rectangle((x + 8 * scale, y + 10 * scale, x + 32 * scale, y + 15 * scale), fill=(248, 250, 252, 255))


def draw_enemy_costume(
    draw,
    tone: dict,
    variant: int,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    boss: bool,
    frame_index: int,
    base: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    motif = tone["motif"]
    variant_index = max(0, variant - 1)
    shine = mix(base, white, 0.34)
    dark = mix(base, ink, 0.28)
    gold = (250, 204, 21, 255)
    red = (239, 68, 68, 255)
    cyan = (103, 232, 249, 255)
    cheek = (251, 146, 60, 170)
    inset = 9 if boss else 7

    draw.rounded_rectangle((left + inset, top + 21, left + body_w - inset, top + body_h - 11), radius=9, outline=mix(ink, white, 0.16), width=2)
    draw.rectangle((left + 16, top + 19, left + body_w - 19, top + 23), fill=shine)
    draw.ellipse((left + 13, top + int(body_h * 0.58), left + 23, top + int(body_h * 0.58) + 10), fill=cheek)
    draw.ellipse((left + body_w - 24, top + int(body_h * 0.58) + 1, left + body_w - 14, top + int(body_h * 0.58) + 11), fill=cheek)

    if motif == "rent":
        draw.polygon([(left + 24, top + 31), (left + body_w // 2, top + 18), (left + body_w - 24, top + 31)], fill=gold, outline=ink)
        draw.rounded_rectangle((left + 28, top + 31, left + body_w - 28, top + 53), radius=3, fill=white, outline=ink, width=2)
        draw.rectangle((left + 37, top + 39, left + 47, top + 53), fill=mix(base, white, 0.18), outline=ink)
        draw.rectangle((left + 54, top + 37, left + 66, top + 45), fill=cyan, outline=ink)
    elif motif == "deadline":
        draw.rounded_rectangle((left + 22, top + 28, left + body_w - 20, top + 58), radius=9, fill=(254, 215, 170, 255), outline=ink, width=2)
        for dx, dy, color in [(31, 39, red), (46, 34, gold), (61, 43, cyan), (75, 36, accent)]:
            draw.ellipse((left + dx, top + dy, left + dx + 8, top + dy + 8), fill=color, outline=ink, width=1)
        draw.line((left + body_w - 25, top + 23, left + body_w - 4, top + 4), fill=ink, width=4)
        draw.line((left + body_w - 27, top + 22, left + body_w - 8, top + 6), fill=white, width=2)
    elif motif == "errand":
        draw.rounded_rectangle((left + 24, top + 25, left + body_w - 26, top + 59), radius=5, fill=mix(base, white, 0.22), outline=ink, width=2)
        draw.rectangle((left + 29, top + 29, left + 38, top + 58), fill=dark)
        for yy in (33, 41, 49):
            draw.line((left + 44, top + yy, left + body_w - 35, top + yy - 2), fill=white, width=2)
        draw.rectangle((left + body_w - 39, top + 26, left + body_w - 31, top + 37), fill=gold)
    elif motif == "inbox":
        draw.rounded_rectangle((left + 20, top + 29, left + body_w - 18, top + 57), radius=5, fill=(15, 23, 42, 255), outline=ink, width=2)
        draw.rectangle((left + 27, top + 35, left + body_w - 25, top + 49), fill=mix(accent, white, 0.2))
        draw.rectangle((left + 16, top + 57, left + body_w - 12, top + 64), fill=ink)
        draw.ellipse((left + body_w - 18, top + 24, left + body_w - 4, top + 38), fill=red, outline=ink, width=2)
    elif motif == "meeting":
        draw.rounded_rectangle((left + 22, top + 25, left + body_w - 20, top + 59), radius=5, fill=white, outline=ink, width=2)
        for index, height in enumerate([12, 20, 27]):
            x = left + 32 + index * 15
            draw.rectangle((x, top + 55 - height, x + 8, top + 55), fill=[cyan, gold, red][index], outline=ink)
        draw.line((left + 30, top + 47, left + 45, top + 37, left + 64, top + 42), fill=ink, width=2)
    elif motif == "market":
        draw.rounded_rectangle((left + 23, top + 25, left + body_w - 21, top + 60), radius=5, fill=(236, 253, 245, 255), outline=ink, width=2)
        points = [(left + 31, top + 51), (left + 42, top + 39), (left + 54, top + 45), (left + 70, top + 30)]
        draw.line(points, fill=(34, 197, 94, 255), width=4)
        for x, y in points:
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=gold, outline=ink, width=1)
    elif motif == "permit":
        draw.rounded_rectangle((left + 25, top + 24, left + body_w - 25, top + 61), radius=4, fill=white, outline=ink, width=2)
        draw.rectangle((left + 33, top + 32, left + body_w - 34, top + 36), fill=accent)
        draw.rectangle((left + 33, top + 43, left + body_w - 34, top + 46), fill=mix(ink, white, 0.2))
        draw.ellipse((left + body_w - 45, top + 41, left + body_w - 23, top + 63), fill=red, outline=ink, width=2)
        draw.line((left + body_w - 41, top + 51, left + body_w - 28, top + 51), fill=white, width=2)
    elif motif == "passport":
        draw.ellipse((left + 23, top + 24, left + body_w - 22, top + 61), fill=(56, 189, 248, 255), outline=ink, width=2)
        draw.arc((left + 30, top + 25, left + body_w - 30, top + 60), 70, 290, fill=white, width=2)
        draw.arc((left + 27, top + 31, left + body_w - 25, top + 55), 250, 80, fill=(34, 197, 94, 255), width=3)
        draw.line((left + body_w // 2, top + 26, left + body_w // 2, top + 60), fill=white, width=2)
    elif motif == "circuit":
        draw.rectangle((left + 28, top + 26, left + body_w - 28, top + 61), fill=(15, 23, 42, 255), outline=ink, width=2)
        draw.rectangle((left + 42, top + 38, left + body_w - 28, top + 52), fill=cyan, outline=ink)
        for y in (32, 57):
            draw.line((left + 31, top + y, left + 21, top + y + (frame_index % 2) * 3), fill=accent, width=2)
            draw.line((left + body_w - 31, top + y, left + body_w - 18, top + y - (frame_index % 2) * 3), fill=accent, width=2)
    elif motif == "summit":
        draw.polygon([(left + 24, top + 57), (left + 40, top + 28), (left + 54, top + 57)], fill=mix(base, white, 0.2), outline=ink)
        draw.polygon([(left + 47, top + 57), (left + 66, top + 21), (left + body_w - 23, top + 57)], fill=white, outline=ink)
        draw.polygon([(left + body_w // 2 - 16, top + 24), (left + body_w // 2, top + 12), (left + body_w // 2 + 16, top + 24)], fill=gold, outline=ink)

    if boss:
        draw.ellipse((left + 8, top + 7, left + 20, top + 19), fill=gold, outline=ink, width=2)
        draw.ellipse((left + body_w - 20, top + 7, left + body_w - 8, top + 19), fill=gold, outline=ink, width=2)
    elif variant_index == 1:
        tab_x = left + body_w - 15
        for index, color in enumerate([accent, gold, cyan]):
            y = top + 23 + index * 12
            draw.rounded_rectangle((tab_x, y, tab_x + 13, y + 8), radius=2, fill=color, outline=ink, width=1)
        draw.line((left + 18, top + body_h - 17, left + body_w - 18, top + body_h - 17), fill=dark, width=3)
    elif variant_index == 2:
        draw.rectangle((left + 19, top + 16, left + body_w - 22, top + 22), fill=dark)
        draw.polygon([(left + 15, top + body_h - 14), (left + 27, top + body_h - 25), (left + 39, top + body_h - 14)], fill=accent, outline=ink)
        draw.polygon([(left + body_w - 40, top + body_h - 14), (left + body_w - 28, top + body_h - 25), (left + body_w - 16, top + body_h - 14)], fill=accent, outline=ink)


def draw_toy_tabs(draw, left: int, top: int, body_w: int, accent: tuple[int, int, int, int], ink: tuple[int, int, int, int], variant_index: int) -> None:
    tab_colors = [accent, (250, 204, 21, 255), (103, 232, 249, 255)]
    side = -1 if variant_index != 1 else 1
    x = left - 7 if side < 0 else left + body_w - 2
    for index, color in enumerate(tab_colors):
        y = top + 20 + index * 14
        draw.rounded_rectangle((x, y, x + 12, y + 9), radius=2, fill=color, outline=ink, width=1)


def draw_toy_body(
    draw,
    motif: str,
    variant_index: int,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    boss: bool,
    base: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    shine = mix(base, white, 0.34)
    side_dark = mix(base, ink, 0.18)
    radius = 18 if boss else [16, 13, 20][variant_index % 3]
    draw.rounded_rectangle((left - 5, top - 5, left + body_w + 5, top + body_h + 5), radius=radius + 3, fill=ink)

    if variant_index == 1:
        draw.rectangle((left + 7, top, left + body_w - 7, top + body_h), fill=base)
        draw.rounded_rectangle((left, top, left + body_w, top + body_h), radius=8, outline=ink, width=3)
        draw.rectangle((left + 8, top + 5, left + 17, top + body_h - 4), fill=side_dark)
    elif variant_index == 2:
        draw.rounded_rectangle((left, top + 4, left + body_w, top + body_h - 2), radius=radius, fill=base)
        draw.polygon([(left + 6, top + 6), (left - 9, top + 24), (left - 2, top + body_h - 7), (left + 15, top + body_h)], fill=mix(base, white, 0.24), outline=ink)
        draw.polygon([(left + body_w - 4, top + 6), (left + body_w + 7, top + 22), (left + body_w + 2, top + body_h - 10), (left + body_w - 15, top + body_h)], fill=side_dark, outline=ink)
    else:
        draw.rounded_rectangle((left, top, left + body_w, top + body_h), radius=radius, fill=base)

    if motif in {"errand", "permit", "passport"}:
        draw.rectangle((left + 12, top + 6, left + body_w - 11, top + body_h - 6), outline=mix(ink, white, 0.16), width=2)
    if motif in {"deadline", "meeting"}:
        for x in range(left + 19, left + body_w - 14, 15):
            draw.rounded_rectangle((x, top - 7, x + 7, top + 8), radius=2, fill=ink)
    if motif in {"inbox", "circuit"}:
        draw.rectangle((left + 16, top + 9, left + body_w - 17, top + 15), fill=shine)
        draw.rectangle((left + 20, top + body_h - 13, left + body_w - 20, top + body_h - 8), fill=side_dark)
    if motif in {"rent", "summit"}:
        draw.polygon([(left + 14, top + 15), (left + body_w // 2, top - 4), (left + body_w - 14, top + 15)], fill=accent, outline=ink)

    draw.rectangle((left + 15, top + 12, left + body_w - 22, top + 17), fill=(255, 255, 255, 72))
    draw_toy_tabs(draw, left, top, body_w, accent, ink, variant_index)


def draw_toy_detail(
    draw,
    motif: str,
    variant_index: int,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    boss: bool,
    frame_index: int,
    base: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    gold = (250, 204, 21, 255)
    red = (239, 68, 68, 255)
    cyan = (103, 232, 249, 255)
    panel_left = left + 18
    panel_top = top + 24
    panel_right = left + body_w - 18
    panel_bottom = top + body_h - 18

    if motif == "rent":
        draw.rounded_rectangle((panel_left + 2, panel_top + 9, panel_right - 2, panel_bottom), radius=4, fill=white, outline=ink, width=2)
        draw.polygon([(panel_left, panel_top + 10), (left + body_w // 2, panel_top - 7), (panel_right, panel_top + 10)], fill=gold, outline=ink)
        draw.rectangle((panel_left + 11, panel_top + 24, panel_left + 24, panel_bottom), fill=mix(base, white, 0.14), outline=ink)
        draw.rectangle((panel_right - 23, panel_top + 19, panel_right - 9, panel_top + 31), fill=cyan, outline=ink)
    elif motif == "deadline":
        draw.ellipse((panel_left, panel_top + 2, panel_right, panel_bottom + 4), fill=(254, 215, 170, 255), outline=ink, width=2)
        for dx, dy, color in [(11, 16, red), (26, 11, gold), (39, 22, cyan), (52, 15, accent)]:
            draw.ellipse((panel_left + dx, panel_top + dy, panel_left + dx + 8, panel_top + dy + 8), fill=color, outline=ink, width=1)
        draw.line((panel_right - 3, panel_top, panel_right + 16, panel_top - 17), fill=ink, width=4)
        draw.line((panel_right - 3, panel_top, panel_right + 13, panel_top - 14), fill=white, width=2)
    elif motif == "errand":
        draw.rounded_rectangle((panel_left, panel_top, panel_right, panel_bottom + 2), radius=5, fill=mix(base, white, 0.26), outline=ink, width=2)
        draw.rectangle((panel_left + 6, panel_top + 5, panel_left + 14, panel_bottom), fill=mix(base, ink, 0.22))
        for yy in (9, 18, 27):
            draw.line((panel_left + 22, panel_top + yy, panel_right - 9, panel_top + yy - 2), fill=white, width=2)
        draw.rectangle((panel_right - 14, panel_top + 3, panel_right - 5, panel_top + 15), fill=gold, outline=ink)
    elif motif == "inbox":
        draw.rounded_rectangle((panel_left - 2, panel_top + 1, panel_right + 2, panel_bottom - 2), radius=5, fill=(15, 23, 42, 255), outline=ink, width=2)
        draw.rectangle((panel_left + 6, panel_top + 9, panel_right - 6, panel_top + 25), fill=mix(accent, white, 0.24))
        draw.rectangle((panel_left - 7, panel_bottom - 2, panel_right + 7, panel_bottom + 5), fill=ink)
        draw.ellipse((panel_right - 4, panel_top - 5, panel_right + 12, panel_top + 11), fill=red, outline=ink, width=2)
    elif motif == "meeting":
        draw.rounded_rectangle((panel_left - 2, panel_top - 1, panel_right + 2, panel_bottom + 2), radius=5, fill=white, outline=ink, width=2)
        for index, height in enumerate([13, 23, 31]):
            x = panel_left + 8 + index * 16
            draw.rectangle((x, panel_bottom - height, x + 8, panel_bottom), fill=[cyan, gold, red][index], outline=ink)
        draw.line([(panel_left + 6, panel_bottom - 10), (panel_left + 23, panel_bottom - 23), (panel_left + 43, panel_bottom - 17)], fill=ink, width=2)
    elif motif == "market":
        draw.rounded_rectangle((panel_left - 1, panel_top, panel_right + 2, panel_bottom + 3), radius=5, fill=(236, 253, 245, 255), outline=ink, width=2)
        points = [(panel_left + 6, panel_bottom - 8), (panel_left + 19, panel_bottom - 22), (panel_left + 33, panel_bottom - 15), (panel_right - 5, panel_top + 7)]
        draw.line(points, fill=(34, 197, 94, 255), width=4)
        for x, y in points:
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=gold, outline=ink, width=1)
    elif motif == "permit":
        draw.rounded_rectangle((panel_left, panel_top - 2, panel_right, panel_bottom + 4), radius=4, fill=white, outline=ink, width=2)
        draw.rectangle((panel_left + 9, panel_top + 7, panel_right - 9, panel_top + 11), fill=accent)
        draw.rectangle((panel_left + 9, panel_top + 20, panel_right - 9, panel_top + 23), fill=mix(ink, white, 0.2))
        draw.ellipse((panel_right - 25, panel_bottom - 14, panel_right - 2, panel_bottom + 9), fill=red, outline=ink, width=2)
        draw.line((panel_right - 21, panel_bottom - 3, panel_right - 7, panel_bottom - 3), fill=white, width=2)
    elif motif == "passport":
        draw.rounded_rectangle((panel_left + 5, panel_top - 2, panel_right - 1, panel_bottom + 6), radius=5, fill=(14, 116, 144, 255), outline=ink, width=2)
        globe_left = panel_left + 12
        globe_right = max(globe_left + 18, panel_right - 8)
        globe_top = panel_top + 8
        globe_bottom = max(globe_top + 18, panel_bottom - 3)
        draw.ellipse((globe_left, globe_top, globe_right, globe_bottom), fill=(56, 189, 248, 255), outline=white, width=2)
        draw.arc((globe_left + 3, globe_top + 1, globe_right - 3, globe_bottom - 1), 75, 285, fill=white, width=2)
        draw.arc((globe_left + 1, globe_top + 6, globe_right - 1, globe_bottom - 5), 250, 80, fill=(34, 197, 94, 255), width=3)
    elif motif == "circuit":
        draw.rectangle((panel_left + 4, panel_top, panel_right - 2, panel_bottom + 2), fill=(15, 23, 42, 255), outline=ink, width=2)
        draw.rectangle((panel_left + 19, panel_top + 11, panel_right - 13, panel_top + 27), fill=cyan, outline=ink)
        for y in (panel_top + 6, panel_bottom - 5):
            draw.line((panel_left + 5, y, panel_left - 6, y + (frame_index % 2) * 4), fill=accent, width=2)
            draw.line((panel_right - 2, y, panel_right + 10, y - (frame_index % 2) * 4), fill=accent, width=2)
    elif motif == "summit":
        draw.polygon([(panel_left + 2, panel_bottom + 2), (panel_left + 19, panel_top + 10), (panel_left + 34, panel_bottom + 2)], fill=mix(base, white, 0.22), outline=ink)
        draw.polygon([(panel_left + 29, panel_bottom + 2), (panel_left + 52, panel_top - 1), (panel_right, panel_bottom + 2)], fill=white, outline=ink)
        draw.polygon([(left + body_w // 2 - 15, top + 17), (left + body_w // 2, top + 3), (left + body_w // 2 + 15, top + 17)], fill=gold, outline=ink)

    if boss:
        draw.ellipse((left + 9, top + 7, left + 22, top + 20), fill=gold, outline=ink, width=2)
        draw.ellipse((left + body_w - 22, top + 7, left + body_w - 9, top + 20), fill=gold, outline=ink, width=2)


def draw_toy_face(
    draw,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    boss: bool,
    frame_index: int,
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    cheek = (251, 146, 60, 180)
    eye_y = top + int(body_h * 0.43)
    eye_shift = [-1, -2, -2, -1][frame_index]
    draw.rounded_rectangle((left + 23, eye_y, left + 37, eye_y + 17), radius=4, fill=ink)
    draw.rounded_rectangle((left + body_w - 38, eye_y + 1, left + body_w - 24, eye_y + 18), radius=4, fill=ink)
    draw.rectangle((left + 25 + eye_shift, eye_y + 4, left + 30 + eye_shift, eye_y + 9), fill=white)
    draw.rectangle((left + body_w - 36 + eye_shift, eye_y + 5, left + body_w - 31 + eye_shift, eye_y + 10), fill=white)
    if boss:
        draw.line((left + 22, eye_y - 7, left + 39, eye_y - 1), fill=ink, width=3)
        draw.line((left + body_w - 23, eye_y - 7, left + body_w - 40, eye_y - 1), fill=ink, width=3)
    draw.ellipse((left + 12, eye_y + 21, left + 23, eye_y + 32), fill=cheek)
    draw.ellipse((left + body_w - 25, eye_y + 22, left + body_w - 14, eye_y + 33), fill=cheek)
    mouth_y = top + int(body_h * 0.72)
    if boss:
        draw.rounded_rectangle((left + 29, mouth_y, left + body_w - 28, mouth_y + 8), radius=2, fill=ink)
        draw.rectangle((left + 37, mouth_y + 8, left + 43, mouth_y + 15), fill=white)
        draw.rectangle((left + body_w - 45, mouth_y + 8, left + body_w - 39, mouth_y + 15), fill=white)
    else:
        draw.rounded_rectangle((left + 31, mouth_y, left + body_w - 32, mouth_y + 7), radius=3, fill=ink)


def draw_toy_limbs(
    draw,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    variant_index: int,
    frame_index: int,
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
) -> None:
    arm_y = top + int(body_h * 0.63)
    left_arm = [-3, -1, 2, -1][frame_index]
    right_arm = [2, 1, -2, 1][frame_index]
    draw.line((left + 4, arm_y, left - 5 + left_arm, arm_y + 5), fill=ink, width=5)
    draw.ellipse((left - 12 + left_arm, arm_y + 1, left - 1 + left_arm, arm_y + 13), fill=accent, outline=ink, width=2)
    draw.line((left + body_w - 2, arm_y - 1, left + body_w + 5 + right_arm, arm_y + 4), fill=ink, width=5)
    draw.ellipse((left + body_w + 2 + right_arm, arm_y, left + body_w + 13 + right_arm, arm_y + 12), fill=mix(accent, ink, 0.08), outline=ink, width=2)

    foot_y = top + body_h + 3
    foot_left = [-2, 0, 2, 0][frame_index]
    foot_right = [2, 0, -2, 0][frame_index]
    draw.rounded_rectangle((left + body_w * 0.24 - 10 + foot_left, foot_y, left + body_w * 0.24 + 14 + foot_left, foot_y + 8), radius=4, fill=ink)
    draw.rounded_rectangle((left + body_w * 0.72 - 11 + foot_right, foot_y, left + body_w * 0.72 + 15 + foot_right, foot_y + 8), radius=4, fill=ink)


def draw_enemy_frame(tone: dict, variant: int, boss: bool, frame_index: int) -> Image.Image:
    source = Image.new("RGBA", (CELL * ENEMY_SUPERSAMPLE, CELL * ENEMY_SUPERSAMPLE), (0, 0, 0, 0))
    draw = ScaledDraw(ImageDraw.Draw(source), ENEMY_SUPERSAMPLE)
    base = hex_color(tone["color"])
    accent = hex_color(tone["accent"])
    ink = (23, 33, 46, 255)
    white = (248, 250, 252, 255)
    motif = tone["motif"]
    bob = [0, -2, -3, -1][frame_index]
    recoil = [-1, 1, 2, 0][frame_index]
    variant_index = max(0, variant - 1)
    cx = 80 + recoil + ([-2, 1, 2][variant_index % 3] if not boss else 0)
    body_bottom = (134 if boss else 133) + bob
    if boss:
        body_w, body_h = 90, 88
    else:
        body_w, body_h = [(72, 86), (68, 92), (80, 84)][variant_index % 3]
    left = cx - body_w // 2
    top = body_bottom - body_h

    draw.ellipse((37, 143, 124, 155), fill=(0, 0, 0, 76 if boss else 58))
    if boss:
        draw.polygon([(left + 5, top + 14), (left - 7, top - 12), (left + 24, top + 6)], fill=accent, outline=ink)
        draw.polygon([(left + body_w - 21, top + 6), (left + body_w + 8, top - 14), (left + body_w - 2, top + 19)], fill=mix(accent, white, 0.12), outline=ink)

    draw_toy_limbs(draw, left, top, body_w, body_h, variant_index, frame_index, accent, ink)
    draw_toy_body(draw, motif, variant_index, left, top, body_w, body_h, boss, base, accent, ink, white)
    draw_toy_detail(draw, motif, variant_index, left, top, body_w, body_h, boss, frame_index, base, accent, ink, white)
    draw_toy_face(draw, left, top, body_w, body_h, boss, frame_index, ink, white)

    prop_x = max(9, left - [17, 19, 15][variant_index % 3])
    prop_y = top + [37, 42, 33][variant_index % 3]
    draw_enemy_prop(draw, tone, prop_x, prop_y, 0.48 if boss else [0.34, 0.32, 0.3][variant_index % 3])
    if boss:
        draw.rectangle((left + body_w // 2 - 16, top - 20, left + body_w // 2 + 16, top - 9), fill=ink)
        draw.polygon([(left + body_w // 2 - 11, top - 10), (left + body_w // 2 - 3, top - 25), (left + body_w // 2 + 5, top - 10), (left + body_w // 2 + 15, top - 24), (left + body_w // 2 + 18, top - 8)], fill=accent, outline=ink)
    else:
        draw.ellipse((left + body_w - 5, top + 13, left + body_w + 10, top + 28), fill=accent, outline=ink, width=2)

    return source.resize((CELL, CELL), Image.Resampling.LANCZOS)


def sheet_from_enemy(tone: dict, variant: int, boss: bool) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * FRAMES, CELL), (0, 0, 0, 0))
    for frame_index in range(FRAMES):
        frame = draw_enemy_frame(tone, variant, boss, frame_index)
        sheet.alpha_composite(frame, (frame_index * CELL, 0))
    return sheet


def appearance_profiles_for(career: dict | None, helper: dict, variant: int) -> dict[str, dict]:
    item = {"career": career, "helper": helper}
    return {gender: appearance_profile(item, gender, variant) for gender in ["male", "female"]}


def build_manifest(careers: list[dict]) -> dict:
    helper_by_id = {helper["id"]: helper for helper in HELPER_SPRITES}
    ordered = sorted(careers, key=lambda career: career.get("choiceRank", 999))
    companions = []
    for index, career in enumerate(ordered):
        helper = helper_by_id.get(career.get("helperSprite"), HELPER_SPRITES[index % len(HELPER_SPRITES)])
        item_id = f"career-unit-{career['id']}"
        companions.append(
            {
                "id": item_id,
                "type": "career",
                "careerId": career["id"],
                "name": career["name"],
                "helperId": helper["id"],
                "supportRole": career.get("supportRole"),
                "battleProp": career.get("battleProp"),
                "tier": career.get("tier"),
                "direction": "right",
                "genders": ["male", "female"],
                "appearanceProfiles": appearance_profiles_for(career, helper, index),
                "moveSheet": f"assets/visual-source/companions/{item_id}-move.png",
                "moveSheetLayout": {"columns": 4, "rows": 2, "cellWidth": CELL, "cellHeight": CELL, "cellMargin": 0},
            }
        )
    career_count = len(companions)
    for helper_index, helper in enumerate(HELPER_SPRITES):
        variant = career_count + helper_index
        companions.append(
            {
                "id": helper["id"],
                "type": "helper",
                "helperId": helper["id"],
                "name": helper["name"],
                "battleProp": helper["prop"],
                "direction": "right",
                "genders": ["male", "female"],
                "appearanceProfiles": appearance_profiles_for(None, helper, variant),
                "moveSheet": f"assets/visual-source/companions/{helper['id']}-move.png",
                "moveSheetLayout": {"columns": 4, "rows": 2, "cellWidth": CELL, "cellHeight": CELL, "cellMargin": 0},
            }
        )

    enemies = []
    for tone in ENEMY_TONES:
        for variant in range(3):
            enemy_id = f"{tone['id']}-mob-{variant + 1}"
            enemies.append(
                {
                    "id": enemy_id,
                    "type": "mob",
                    "name": f"{tone['name']} 몬스터 {variant + 1}",
                    "tone": tone["id"],
                    "motif": tone["motif"],
                    "variant": variant + 1,
                    "boss": False,
                    "direction": "left",
                    "moveSheet": f"assets/visual-source/expedition-enemies/{enemy_id}-move.png",
                    "moveSheetLayout": {"columns": 4, "rows": 1, "cellWidth": CELL, "cellHeight": CELL, "cellMargin": 0},
                }
            )
        boss_id = f"{tone['id']}-boss"
        enemies.append(
            {
                "id": boss_id,
                "type": "boss",
                "name": f"{tone['name']} 보스",
                "tone": tone["id"],
                "motif": tone["motif"],
                "variant": 0,
                "boss": True,
                "direction": "left",
                "moveSheet": f"assets/visual-source/expedition-enemies/{boss_id}-move.png",
                "moveSheetLayout": {"columns": 4, "rows": 1, "cellWidth": CELL, "cellHeight": CELL, "cellMargin": 0},
            }
        )

    return {
        "version": 1,
        "cell": CELL,
        "centerX": 80,
        "baselineY": 151,
        "maxSpriteWidth": 132,
        "maxSpriteHeight": 146,
        "minFrameDifference": 2.5,
        "animations": {"move": {"frames": FRAMES, "durationMs": 640}},
        "families": [
            {"id": "companions", "kind": "companion", "items": companions},
            {"id": "expeditionEnemies", "kind": "expeditionEnemy", "items": enemies},
        ],
    }


def main() -> None:
    careers = json.loads(CAREERS_PATH.read_text(encoding="utf-8"))
    manifest = build_manifest(careers)
    helper_by_id = {helper["id"]: helper for helper in HELPER_SPRITES}
    base_frames = load_base_frame_pool()
    COMPANION_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    ENEMY_SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    companion_items = manifest["families"][0]["items"]
    ordered_careers = sorted(careers, key=lambda career: career.get("choiceRank", 999))
    career_by_unit = {f"career-unit-{career['id']}": career for career in ordered_careers}
    for index, item in enumerate(companion_items):
        career = career_by_unit.get(item["id"])
        helper = helper_by_id.get(item.get("helperId"), HELPER_SPRITES[index % len(HELPER_SPRITES)])
        sheet = sheet_from_companion({"career": career, "helper": helper}, base_frames, index)
        sheet.save(ROOT / item["moveSheet"])

    tone_by_id = {tone["id"]: tone for tone in ENEMY_TONES}
    for item in manifest["families"][1]["items"]:
        tone = tone_by_id[item["tone"]]
        sheet = sheet_from_enemy(tone, int(item["variant"]), bool(item["boss"]))
        sheet.save(ROOT / item["moveSheet"])

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PROFESSIONAL_SPRITE_SOURCES_OK companions={len(companion_items)} enemies={len(manifest['families'][1]['items'])} manifest={project_path(MANIFEST_PATH)}")


if __name__ == "__main__":
    main()
