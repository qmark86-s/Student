from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CELL = 160
FRAMES = 4
GREEN = (0, 255, 0, 255)
ENEMY_SUPERSAMPLE = 3

COMPANION_SOURCE_DIR = ROOT / "assets" / "visual-source" / "companions"
ENEMY_SOURCE_DIR = ROOT / "assets" / "visual-source" / "expedition-enemies"
ENEMY_RASTER_SHEET_DIR = ROOT / "assets" / "visual-source" / "expedition-enemy-raster-sheets"
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
    {
        "id": "shelter",
        "color": "#e05267",
        "accent": "#facc15",
        "prop": "files",
        "motif": "rent",
        "name": "생활 기반",
        "designs": [
            {"form": "notice", "icon": "house", "name": "월세 고지함"},
            {"form": "ticket", "icon": "queue", "name": "대기 번호표"},
            {"form": "folder", "icon": "resume", "name": "구겨진 이력서"},
            {"form": "bill", "icon": "utility", "name": "공과금 고지서"},
            {"form": "meal", "icon": "meal", "name": "도시락 봉투"},
            {"form": "sleeping-bag", "icon": "shelter", "name": "임시 침낭"},
        ],
        "bossDesigns": [
            {"form": "gate", "icon": "lock", "name": "자립 게이트"},
            {"form": "maze", "icon": "living-cost", "name": "생활비 미로"},
        ],
    },
    {
        "id": "studio",
        "color": "#f97316",
        "accent": "#f9a8d4",
        "prop": "palette",
        "motif": "deadline",
        "name": "작업 마감",
        "designs": [
            {"form": "basket", "icon": "laundry", "name": "공용 세탁 바구니"},
            {"form": "cup", "icon": "night", "name": "야간 알바 컵"},
            {"form": "timer", "icon": "rush", "name": "주문 러시 타이머"},
            {"form": "receipt", "icon": "receipt", "name": "누적 영수증"},
            {"form": "schedule", "icon": "shift", "name": "교대 스케줄 보드"},
            {"form": "contract", "icon": "deposit", "name": "보증금 계약서"},
        ],
        "bossDesigns": [
            {"form": "safe", "icon": "deposit", "name": "보증금 금고"},
            {"form": "checkout", "icon": "rush", "name": "마감 폭주 계산대"},
        ],
    },
    {
        "id": "neighborhood",
        "color": "#22c55e",
        "accent": "#93c5fd",
        "prop": "book",
        "motif": "errand",
        "name": "동네 업무",
        "designs": [
            {"form": "tag", "icon": "price", "name": "시장 가격표"},
            {"form": "calendar", "icon": "clinic", "name": "병원 예약판"},
            {"form": "book", "icon": "academy", "name": "학원비 장부"},
            {"form": "estimate", "icon": "repair", "name": "수리 견적서"},
            {"form": "notice-board", "icon": "maintenance", "name": "관리비 게시판"},
            {"form": "map", "icon": "district", "name": "상권 지도"},
        ],
        "bossDesigns": [
            {"form": "folder", "icon": "loan", "name": "대출 심사철"},
            {"form": "contract-gate", "icon": "contract", "name": "동네 계약 괴물"},
        ],
    },
    {
        "id": "company",
        "color": "#3b82f6",
        "accent": "#f97316",
        "prop": "laptop",
        "motif": "inbox",
        "name": "회사 업무",
        "designs": [
            {"form": "gate", "icon": "pass", "name": "출입증 게이트"},
            {"form": "inbox", "icon": "mail", "name": "메일 인박스"},
            {"form": "monitor", "icon": "sheet", "name": "스프레드시트 모니터"},
            {"form": "popup", "icon": "meeting-invite", "name": "회의 초대 팝업"},
            {"form": "printer", "icon": "report", "name": "보고서 프린터"},
            {"form": "kpi", "icon": "kpi", "name": "KPI 표지판"},
        ],
        "bossDesigns": [
            {"form": "building", "icon": "office", "name": "오피스 로비"},
            {"form": "server-room", "icon": "overtime", "name": "야근 서버룸"},
        ],
    },
    {
        "id": "office",
        "color": "#8b5cf6",
        "accent": "#f0b84c",
        "prop": "chart",
        "motif": "meeting",
        "name": "회의 업무",
        "designs": [
            {"form": "board", "icon": "bars", "name": "회의 차트판"},
            {"form": "clipboard", "icon": "agenda", "name": "회의 안건철"},
            {"form": "podium", "icon": "presentation", "name": "발표 압박대"},
            {"form": "lawbook", "icon": "law", "name": "법률 조항 책"},
            {"form": "medical-chart", "icon": "clinic", "name": "진료 차트"},
            {"form": "notebook", "icon": "research", "name": "연구 노트"},
        ],
        "bossDesigns": [
            {"form": "stack", "icon": "minutes", "name": "회의록 더미"},
            {"form": "approval-tower", "icon": "approval", "name": "책임 결재탑"},
        ],
    },
    {
        "id": "asset",
        "color": "#10b981",
        "accent": "#facc15",
        "prop": "chart",
        "motif": "market",
        "name": "자산 시장",
        "designs": [
            {"form": "coin", "icon": "yield", "name": "수익률 코인"},
            {"form": "chart", "icon": "volatile", "name": "변동성 차트"},
            {"form": "safe", "icon": "risk", "name": "리스크 금고"},
            {"form": "calculator", "icon": "tax", "name": "세금 계산기"},
            {"form": "portfolio", "icon": "portfolio", "name": "포트폴리오 보드"},
            {"form": "policy-doc", "icon": "insurance", "name": "보험 증권"},
        ],
        "bossDesigns": [
            {"form": "vault", "icon": "market", "name": "시장 금고"},
            {"form": "crash-tower", "icon": "volatile", "name": "폭락 경보탑"},
        ],
    },
    {
        "id": "national",
        "color": "#ef4444",
        "accent": "#86efac",
        "prop": "gavel",
        "motif": "permit",
        "name": "행정 장벽",
        "designs": [
            {"form": "document", "icon": "stamp", "name": "민원 서류"},
            {"form": "seal", "icon": "approval", "name": "승인 도장"},
            {"form": "building", "icon": "policy", "name": "관공서 창구"},
            {"form": "budget-box", "icon": "budget", "name": "예산 서류함"},
            {"form": "envelope", "icon": "bid", "name": "입찰 봉투"},
            {"form": "checklist", "icon": "checklist", "name": "심사 체크리스트"},
        ],
        "bossDesigns": [
            {"form": "tower", "icon": "project", "name": "국가 과제탑"},
            {"form": "policy-maze", "icon": "policy", "name": "정책 미궁"},
        ],
    },
    {
        "id": "global",
        "color": "#0ea5e9",
        "accent": "#fde047",
        "prop": "globe",
        "motif": "passport",
        "name": "세계 관문",
        "designs": [
            {"form": "passport", "icon": "airport", "name": "공항 여권"},
            {"form": "crate", "icon": "trade", "name": "무역 화물"},
            {"form": "globe", "icon": "timezone", "name": "시차 지구본"},
            {"form": "headset", "icon": "translate", "name": "통역 헤드셋"},
            {"form": "exchange-board", "icon": "exchange", "name": "환율 전광판"},
            {"form": "visa", "icon": "visa", "name": "비자 서류"},
        ],
        "bossDesigns": [
            {"form": "podium", "icon": "conference", "name": "월드 컨퍼런스"},
            {"form": "global-gate", "icon": "contract", "name": "글로벌 계약 게이트"},
        ],
    },
    {
        "id": "future",
        "color": "#6366f1",
        "accent": "#67e8f9",
        "prop": "chip",
        "motif": "circuit",
        "name": "미래 회로",
        "designs": [
            {"form": "chip", "icon": "ai", "name": "AI 칩"},
            {"form": "cube", "icon": "data", "name": "데이터 큐브"},
            {"form": "flask", "icon": "bio", "name": "바이오 플라스크"},
            {"form": "robot-arm", "icon": "automation", "name": "로봇 팔 박스"},
            {"form": "circuit-board", "icon": "quantum", "name": "양자 회로판"},
            {"form": "drone-port", "icon": "drone", "name": "자동화 드론 포트"},
        ],
        "bossDesigns": [
            {"form": "core", "icon": "singularity", "name": "특이점 코어"},
            {"form": "mainframe", "icon": "ai", "name": "미래 도시 메인프레임"},
        ],
    },
    {
        "id": "summit",
        "color": "#a855f7",
        "accent": "#f0b84c",
        "prop": "teacher",
        "motif": "summit",
        "name": "정상 장벽",
        "designs": [
            {"form": "mountain", "icon": "flag", "name": "정상 깃발"},
            {"form": "planet", "icon": "climate", "name": "기후 의제"},
            {"form": "table", "icon": "peace", "name": "조정 회의장"},
            {"form": "treaty", "icon": "treaty", "name": "평화 조약 두루마리"},
            {"form": "capsule", "icon": "space", "name": "우주 개척 캡슐"},
            {"form": "council-seat", "icon": "ethics", "name": "윤리 위원회 의자"},
        ],
        "bossDesigns": [
            {"form": "network", "icon": "decision", "name": "의사결정망"},
            {"form": "ladder", "icon": "summit", "name": "사회 사다리 정점"},
        ],
    },
]


def project_path(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def hex_color(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    raw = value.strip().lstrip("#")
    return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16), alpha)


def mix(a: tuple[int, int, int, int], b: tuple[int, int, int, int], ratio: float) -> tuple[int, int, int, int]:
    return tuple(round(a[index] * (1 - ratio) + b[index] * ratio) for index in range(4))  # type: ignore[return-value]


def clamp_channel(value: float | int) -> int:
    return max(0, min(255, round(float(value))))


def shade(color: tuple[int, int, int, int], factor: float) -> tuple[int, int, int, int]:
    return (
        clamp_channel(color[0] * factor),
        clamp_channel(color[1] * factor),
        clamp_channel(color[2] * factor),
        color[3],
    )


def palette_noise(x: int, y: int, seed: int) -> float:
    value = (x * 37 + y * 23 + seed * 19) % 17
    return (value - 8) / 255


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


def draw_expedition_shadow(draw, cx: int, y: int, width: int, boss: bool) -> None:
    draw.ellipse((cx - width / 2, y - 5, cx + width / 2, y + 8), fill=(0, 0, 0, 72 if boss else 54))
    draw.ellipse((cx - width * 0.36, y - 3, cx + width * 0.36, y + 5), fill=(0, 0, 0, 42 if boss else 30))


def draw_expedition_limbs(
    draw,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    frame_index: int,
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
) -> None:
    # Enemies stand on the right side of the arena, so the left hand is the
    # forward-facing hand toward the party.
    arm_y = top + int(body_h * 0.62)
    left_wave = [-4, -2, 1, -2][frame_index]
    right_wave = [1, 2, 0, 2][frame_index]
    hand = mix(accent, (255, 255, 255, 255), 0.18)
    hand_light = mix(hand, (255, 255, 255, 255), 0.42)
    foot = mix(ink, (255, 255, 255, 255), 0.08)
    foot_light = mix(ink, (255, 255, 255, 255), 0.18)
    draw.line((left + 5, arm_y, left - 4 + left_wave, arm_y + 5), fill=ink, width=5)
    draw.ellipse((left - 11 + left_wave, arm_y + 1, left + 2 + left_wave, arm_y + 14), fill=hand, outline=ink, width=2)
    draw.ellipse((left - 8 + left_wave, arm_y + 4, left - 4 + left_wave, arm_y + 8), fill=hand_light)
    draw.line((left + body_w - 4, arm_y - 1, left + body_w + 2 + right_wave, arm_y + 5), fill=ink, width=4)
    draw.ellipse((left + body_w - 2 + right_wave, arm_y + 1, left + body_w + 10 + right_wave, arm_y + 13), fill=mix(hand, ink, 0.08), outline=ink, width=2)
    draw.ellipse((left + body_w + 1 + right_wave, arm_y + 4, left + body_w + 5 + right_wave, arm_y + 8), fill=hand_light)

    foot_y = top + body_h + 2
    foot_left = [-3, 0, 2, 0][frame_index]
    foot_right = [2, 0, -2, 0][frame_index]
    draw.rounded_rectangle((left + body_w * 0.25 - 13 + foot_left, foot_y, left + body_w * 0.25 + 13 + foot_left, foot_y + 9), radius=5, fill=foot, outline=ink, width=1)
    draw.rounded_rectangle((left + body_w * 0.72 - 13 + foot_right, foot_y, left + body_w * 0.72 + 13 + foot_right, foot_y + 9), radius=5, fill=foot, outline=ink, width=1)
    draw.line((left + body_w * 0.25 - 7 + foot_left, foot_y + 2, left + body_w * 0.25 + 7 + foot_left, foot_y + 2), fill=foot_light, width=1)
    draw.line((left + body_w * 0.72 - 7 + foot_right, foot_y + 2, left + body_w * 0.72 + 7 + foot_right, foot_y + 2), fill=foot_light, width=1)


def draw_expedition_face(
    draw,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    boss: bool,
    frame_index: int,
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
    design: dict | None = None,
) -> None:
    form = design["form"] if design else ""
    eye_y = top + int(body_h * 0.44)
    gaze = [-3, -4, -4, -3][frame_index]
    left_eye = left + int(body_w * 0.34)
    right_eye = left + int(body_w * 0.61)
    eye_w = 13 if boss else 12
    eye_h = 17 if boss else 15
    cheek = mix(accent, (255, 255, 255, 255), 0.24)

    if form in {"chip", "cube", "circuit-board", "monitor", "kpi", "exchange-board", "server-room", "mainframe", "robot-arm"}:
        visor_y = eye_y + (1 if frame_index % 2 else 0)
        draw.rounded_rectangle((left + body_w * 0.24, visor_y, left + body_w * 0.76, visor_y + 15), radius=5, fill=ink)
        draw.line((left + body_w * 0.28, visor_y + 2, left + body_w * 0.72, visor_y + 2), fill=mix(accent, white, 0.52), width=1)
        draw.rectangle((left + body_w * 0.31 + gaze, visor_y + 5, left + body_w * 0.43 + gaze, visor_y + 9), fill=accent)
        draw.rectangle((left + body_w * 0.56 + gaze, visor_y + 5, left + body_w * 0.68 + gaze, visor_y + 9), fill=white)
        draw.rounded_rectangle((left + body_w * 0.39, top + int(body_h * 0.73), left + body_w * 0.62, top + int(body_h * 0.73) + 5), radius=2, fill=ink)
        draw.rectangle((left + body_w * 0.46, top + int(body_h * 0.73) + 1, left + body_w * 0.53, top + int(body_h * 0.73) + 2), fill=mix(ink, white, 0.34))
        return

    if form in {"gate", "building", "tower", "contract-gate", "global-gate", "approval-tower", "crash-tower", "ladder"}:
        brow_y = eye_y - 4
        draw.rounded_rectangle((left + body_w * 0.27, eye_y, left + body_w * 0.43, eye_y + 9), radius=3, fill=ink)
        draw.rounded_rectangle((left + body_w * 0.57, eye_y + 1, left + body_w * 0.73, eye_y + 10), radius=3, fill=ink)
        draw.line((left + body_w * 0.25, brow_y, left + body_w * 0.46, brow_y + 4), fill=ink, width=3)
        draw.line((left + body_w * 0.75, brow_y, left + body_w * 0.54, brow_y + 4), fill=ink, width=3)
        draw.rectangle((left + body_w * 0.33 + gaze, eye_y + 3, left + body_w * 0.39 + gaze, eye_y + 6), fill=white)
        draw.rectangle((left + body_w * 0.63 + gaze, eye_y + 4, left + body_w * 0.69 + gaze, eye_y + 7), fill=white)
        draw.rounded_rectangle((left + body_w * 0.38, top + int(body_h * 0.72), left + body_w * 0.64, top + int(body_h * 0.72) + 7), radius=3, fill=ink)
        draw.rectangle((left + body_w * 0.46, top + int(body_h * 0.72) + 1, left + body_w * 0.56, top + int(body_h * 0.72) + 3), fill=mix(ink, white, 0.24))
        return

    if form in {"coin", "globe", "planet", "core", "seal", "timer"}:
        eye_shift = -1 if frame_index in {1, 2} else 0
        draw.ellipse((left_eye - 8, eye_y + eye_shift, left_eye + 7, eye_y + 16 + eye_shift), fill=ink)
        draw.ellipse((right_eye - 8, eye_y + 1 + eye_shift, right_eye + 7, eye_y + 17 + eye_shift), fill=ink)
        draw.ellipse((left_eye - 3 + gaze, eye_y + 4 + eye_shift, left_eye + 2 + gaze, eye_y + 9 + eye_shift), fill=white)
        draw.ellipse((right_eye - 3 + gaze, eye_y + 5 + eye_shift, right_eye + 2 + gaze, eye_y + 10 + eye_shift), fill=white)
        draw.ellipse((left_eye - 5 + gaze, eye_y + 3 + eye_shift, left_eye - 2 + gaze, eye_y + 6 + eye_shift), fill=mix(white, accent, 0.18))
        draw.ellipse((right_eye - 5 + gaze, eye_y + 4 + eye_shift, right_eye - 2 + gaze, eye_y + 7 + eye_shift), fill=mix(white, accent, 0.18))
        draw.arc((left + body_w * 0.40, top + int(body_h * 0.68), left + body_w * 0.62, top + int(body_h * 0.80)), 15, 165, fill=ink, width=3)
        return

    draw.rounded_rectangle((left_eye - eye_w // 2, eye_y, left_eye + eye_w // 2, eye_y + eye_h), radius=4, fill=ink)
    draw.rounded_rectangle((right_eye - eye_w // 2, eye_y + 1, right_eye + eye_w // 2, eye_y + eye_h + 1), radius=4, fill=ink)
    draw.rectangle((left_eye - 2 + gaze, eye_y + 4, left_eye + 3 + gaze, eye_y + 9), fill=white)
    draw.rectangle((right_eye - 2 + gaze, eye_y + 5, right_eye + 3 + gaze, eye_y + 10), fill=white)
    draw.rectangle((left_eye - 4 + gaze, eye_y + 3, left_eye - 2 + gaze, eye_y + 5), fill=mix(white, accent, 0.16))
    draw.rectangle((right_eye - 4 + gaze, eye_y + 4, right_eye - 2 + gaze, eye_y + 6), fill=mix(white, accent, 0.16))
    if boss:
        draw.line((left_eye - 12, eye_y - 8, left_eye + 7, eye_y - 3), fill=ink, width=3)
        draw.line((right_eye + 11, eye_y - 8, right_eye - 8, eye_y - 3), fill=ink, width=3)
    draw.ellipse((left + 12, eye_y + 21, left + 24, eye_y + 33), fill=cheek)
    draw.ellipse((left + body_w - 26, eye_y + 22, left + body_w - 14, eye_y + 34), fill=cheek)
    mouth_y = top + int(body_h * 0.72)
    if boss:
        draw.rounded_rectangle((left + body_w * 0.36, mouth_y, left + body_w * 0.65, mouth_y + 8), radius=3, fill=ink)
        draw.rectangle((left + body_w * 0.43, mouth_y + 8, left + body_w * 0.48, mouth_y + 15), fill=white)
        draw.line((left + body_w * 0.42, mouth_y + 2, left + body_w * 0.59, mouth_y + 2), fill=mix(ink, white, 0.24), width=1)
    else:
        draw.rounded_rectangle((left + body_w * 0.40, mouth_y, left + body_w * 0.62, mouth_y + 7), radius=3, fill=ink)
        draw.line((left + body_w * 0.43, mouth_y + 2, left + body_w * 0.57, mouth_y + 2), fill=mix(ink, white, 0.24), width=1)


def draw_ticket_cuts(draw, left: int, top: int, body_w: int, body_h: int, ink: tuple[int, int, int, int]) -> None:
    clear = (0, 0, 0, 0)
    for y in range(top + 15, top + body_h - 10, 16):
        draw.ellipse((left - 7, y, left + 5, y + 12), fill=clear)
        draw.ellipse((left + body_w - 5, y, left + body_w + 7, y + 12), fill=clear)
        draw.arc((left - 7, y, left + 5, y + 12), 270, 90, fill=ink, width=2)
        draw.arc((left + body_w - 5, y, left + body_w + 7, y + 12), 90, 270, fill=ink, width=2)


EXPEDITION_MOB_BODY_SIZES = {
    "notice": (80, 92),
    "ticket": (88, 54),
    "folder": (90, 76),
    "bill": (68, 102),
    "meal": (78, 90),
    "sleeping-bag": (106, 76),
    "basket": (96, 76),
    "cup": (68, 98),
    "timer": (84, 84),
    "receipt": (62, 104),
    "schedule": (98, 78),
    "contract": (76, 100),
    "tag": (92, 68),
    "calendar": (82, 90),
    "book": (98, 70),
    "estimate": (80, 94),
    "notice-board": (100, 76),
    "map": (106, 70),
    "gate": (100, 86),
    "inbox": (78, 82),
    "monitor": (98, 78),
    "popup": (88, 80),
    "printer": (92, 84),
    "kpi": (102, 76),
    "board": (100, 76),
    "clipboard": (78, 96),
    "podium": (94, 82),
    "lawbook": (80, 98),
    "medical-chart": (78, 96),
    "notebook": (78, 98),
    "coin": (88, 88),
    "chart": (94, 76),
    "safe": (86, 86),
    "calculator": (70, 100),
    "portfolio": (102, 76),
    "policy-doc": (72, 100),
    "document": (76, 100),
    "seal": (82, 90),
    "building": (100, 88),
    "budget-box": (90, 86),
    "envelope": (102, 68),
    "checklist": (78, 96),
    "passport": (70, 102),
    "crate": (100, 78),
    "globe": (90, 90),
    "headset": (88, 90),
    "exchange-board": (104, 76),
    "visa": (70, 102),
    "chip": (82, 82),
    "cube": (90, 82),
    "flask": (72, 102),
    "robot-arm": (98, 84),
    "circuit-board": (96, 82),
    "drone-port": (108, 68),
    "mountain": (110, 76),
    "planet": (92, 90),
    "table": (106, 72),
    "treaty": (106, 72),
    "capsule": (76, 104),
    "council-seat": (94, 86),
}


EXPEDITION_BOSS_BODY_SIZES = {
    "gate": (106, 88),
    "maze": (102, 88),
    "safe": (94, 88),
    "checkout": (96, 88),
    "folder": (94, 88),
    "contract-gate": (106, 88),
    "building": (106, 90),
    "server-room": (88, 94),
    "stack": (98, 88),
    "approval-tower": (84, 94),
    "vault": (98, 90),
    "crash-tower": (84, 94),
    "tower": (84, 92),
    "policy-maze": (102, 88),
    "podium": (98, 88),
    "global-gate": (106, 88),
    "core": (94, 92),
    "mainframe": (90, 94),
    "network": (98, 92),
    "ladder": (84, 94),
}


def expedition_body_size(design: dict, variant_index: int, boss: bool) -> tuple[int, int]:
    form = design["form"]
    if boss:
        return EXPEDITION_BOSS_BODY_SIZES.get(form, [(94, 91), (104, 86)][variant_index % 2])
    return EXPEDITION_MOB_BODY_SIZES.get(form, [(78, 88), (74, 92), (84, 86), (88, 82), (70, 96), (92, 78)][variant_index % 6])


PAPER_FORMS = {
    "notice",
    "ticket",
    "bill",
    "receipt",
    "estimate",
    "contract",
    "policy-doc",
    "document",
    "envelope",
    "checklist",
    "visa",
    "treaty",
}

BOOK_FORMS = {"folder", "book", "lawbook", "notebook", "clipboard", "passport", "schedule", "calendar", "medical-chart"}
TECH_FORMS = {"monitor", "popup", "printer", "kpi", "exchange-board", "chip", "cube", "robot-arm", "circuit-board", "drone-port", "core", "mainframe", "server-room"}
STRUCTURE_FORMS = {"gate", "building", "tower", "contract-gate", "global-gate", "approval-tower", "crash-tower", "ladder", "podium", "checkout"}
ROUND_FORMS = {"coin", "safe", "vault", "seal", "globe", "planet", "timer"}
SOFT_OBJECT_FORMS = {"meal", "sleeping-bag", "basket", "cup", "tag", "map", "inbox", "board", "budget-box", "crate", "flask", "mountain", "table", "capsule", "council-seat", "network", "maze", "policy-maze", "portfolio", "chart", "calculator"}


def draw_expedition_quality_details(
    draw,
    design: dict,
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
    form = design["form"]
    side = mix(base, ink, 0.26)
    deep = mix(base, ink, 0.42)
    light = mix(base, white, 0.48)
    pale = mix(base, white, 0.70)
    glow = mix(accent, white, 0.28)
    gold = (250, 204, 21, 255)

    # A restrained inner rim and tiny material marks give generated objects the
    # denser cutout finish of the student-tab monsters without changing IDs.
    if form in PAPER_FORMS:
        for row in range(3):
            yy = top + int(body_h * 0.25) + row * max(8, body_h // 8)
            draw.line((left + body_w * 0.20, yy, left + body_w * 0.78 - row * 5, yy), fill=[side, accent, pale][row], width=2)
        for x in range(left + 14, left + body_w - 12, 13):
            draw.rectangle((x, top + body_h - 11, x + 4, top + body_h - 7), fill=deep)
        draw.line((left + body_w - 8, top + 16, left + body_w - 8, top + body_h - 14), fill=mix(ink, white, 0.10), width=2)
        if boss:
            draw.ellipse((left + body_w - 28, top + body_h - 31, left + body_w - 11, top + body_h - 14), fill=gold, outline=ink, width=2)
    elif form in BOOK_FORMS:
        for offset in (0, 5, 10):
            draw.line((left + body_w - 15 - offset, top + 13 + offset, left + body_w - 15 - offset, top + body_h - 10), fill=[side, pale, white][offset // 5], width=2)
        for yy in range(top + 18, top + body_h - 12, 16):
            draw.line((left + 15, yy, left + body_w - 24, yy + 2), fill=mix(white, base, 0.22), width=2)
        for tab in range(3):
            draw.rounded_rectangle((left + body_w - 7, top + 20 + tab * 17, left + body_w + 5, top + 29 + tab * 17), radius=3, fill=[accent, glow, gold][tab], outline=ink, width=1)
    elif form in TECH_FORMS:
        for row in range(3):
            yy = top + 16 + row * max(13, body_h // 5)
            draw.line((left + 15, yy, left + body_w - 18, yy), fill=deep, width=2)
            draw.rectangle((left + 17 + row * 9, yy - 4, left + 24 + row * 9, yy + 3), fill=glow, outline=ink, width=1)
        for px, py in [(0.25, 0.22), (0.76, 0.24), (0.30, 0.78), (0.74, 0.73)]:
            x = left + int(body_w * px)
            y = top + int(body_h * py)
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=glow, outline=ink, width=1)
        draw.line((left + 12, top + body_h - 12, left + body_w - 13, top + body_h - 12), fill=mix(ink, white, 0.18), width=2)
    elif form in STRUCTURE_FORMS:
        for col in range(3):
            for row in range(2 if not boss else 3):
                wx = left + 19 + col * max(16, body_w // 4)
                wy = top + 22 + row * max(15, body_h // 5)
                draw.rounded_rectangle((wx, wy, wx + 10, wy + 9), radius=2, fill=[pale, glow, white][(col + row) % 3], outline=ink, width=1)
        draw.line((left + 10, top + body_h - 12, left + body_w - 10, top + body_h - 12), fill=deep, width=3)
        draw.line((left + 13, top + 12, left + 13, top + body_h - 13), fill=mix(white, base, 0.30), width=2)
    elif form in ROUND_FORMS:
        draw.arc((left + 12, top + 10, left + body_w - 12, top + body_h - 14), 205, 320, fill=light, width=4)
        draw.arc((left + 9, top + 13, left + body_w - 9, top + body_h - 7), 25, 135, fill=deep, width=3)
        draw.ellipse((left + int(body_w * 0.28), top + int(body_h * 0.25), left + int(body_w * 0.28) + 8, top + int(body_h * 0.25) + 8), fill=white, outline=mix(ink, white, 0.24), width=1)
    elif form in SOFT_OBJECT_FORMS:
        draw.line((left + 14, top + 17, left + body_w - 20, top + 12), fill=light, width=3)
        draw.line((left + body_w - 10, top + 20, left + body_w - 12, top + body_h - 12), fill=deep, width=3)
        for index in range(4):
            x = left + 18 + index * max(12, body_w // 6)
            y = top + body_h - 23 + (index % 2) * 5
            draw.ellipse((x, y, x + 5, y + 5), fill=[pale, accent, white, glow][index], outline=ink, width=1)
    else:
        draw.line((left + 14, top + 13, left + body_w - 16, top + 13), fill=light, width=3)
        draw.line((left + body_w - 9, top + 18, left + body_w - 11, top + body_h - 13), fill=deep, width=3)

    if boss:
        for index in range(3):
            x = left + int(body_w * (0.28 + index * 0.20))
            y = top + body_h - 11 - (index % 2) * 3
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=[accent, glow, gold][index], outline=ink, width=1)


def draw_expedition_negative_space(
    draw,
    design: dict,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    form = design["form"]
    if form == "ticket":
        clear = (0, 0, 0, 0)
        for px in (0.28, 0.72):
            cx = left + int(body_w * px)
            cy = top + int(body_h * 0.50)
            draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=clear)
            draw.arc((cx - 8, cy - 8, cx + 8, cy + 8), 0, 360, fill=ink, width=2)
        draw.rounded_rectangle((left + body_w * 0.40, top + body_h * 0.55, left + body_w * 0.60, top + body_h * 0.72), radius=4, fill=clear)
        draw.rounded_rectangle((left + body_w * 0.40, top + body_h * 0.55, left + body_w * 0.60, top + body_h * 0.72), radius=4, outline=ink, width=2)
        draw.line((left + body_w * 0.25, top + body_h * 0.28, left + body_w * 0.75, top + body_h * 0.28), fill=white, width=2)


def draw_expedition_body(
    draw,
    design: dict,
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
    form = design["form"]
    side = mix(base, ink, 0.18)
    shine = mix(base, white, 0.38)
    pale = mix(base, white, 0.72)
    gold = (250, 204, 21, 255)
    red = (239, 68, 68, 255)
    cyan = (103, 232, 249, 255)

    if form in {"notice", "document"}:
        if form == "notice":
            draw.rounded_rectangle((left + 6, top + 9, left + body_w - 3, top + body_h), radius=13, fill=white, outline=ink, width=4)
            draw.polygon([(left + 6, top + 28), (left + body_w // 2, top + 4), (left + body_w - 3, top + 28)], fill=base, outline=ink)
            draw.rectangle((left + 18, top + 33, left + body_w - 16, top + 49), fill=pale, outline=ink, width=2)
            draw.rectangle((left + 18, top + 57, left + body_w - 16, top + 66), fill=accent, outline=ink, width=2)
            for x in (left + 18, left + body_w - 26):
                draw.ellipse((x, top + 74, x + 10, top + 84), fill=cyan, outline=ink, width=1)
        else:
            draw.polygon(
                [
                    (left + 6, top),
                    (left + body_w - 19, top),
                    (left + body_w, top + 19),
                    (left + body_w - 2, top + body_h),
                    (left, top + body_h - 5),
                ],
                fill=white,
                outline=ink,
            )
            draw.polygon([(left + body_w - 19, top), (left + body_w, top + 19), (left + body_w - 21, top + 21)], fill=pale, outline=ink)
            draw.rectangle((left + 12, top + 12, left + body_w - 24, top + 25), fill=base)
            for row in range(4):
                yy = top + 39 + row * 12
                draw.line((left + 16, yy, left + body_w - 17, yy), fill=[side, accent, pale, side][row], width=3)
    elif form in {"bill", "receipt", "policy-doc", "visa"}:
        if form == "bill":
            draw.polygon(
                [
                    (left + 7, top + 2),
                    (left + body_w - 8, top),
                    (left + body_w - 2, top + body_h - 9),
                    (left + body_w - 11, top + body_h),
                    (left + 3, top + body_h - 4),
                ],
                fill=white,
                outline=ink,
            )
            draw.rectangle((left + 13, top + 10, left + body_w - 12, top + 23), fill=base)
            draw.polygon([(left + body_w - 29, top + 34), (left + body_w - 17, top + 34), (left + body_w - 27, top + 55), (left + body_w - 13, top + 55), (left + body_w - 34, top + 82), (left + body_w - 26, top + 60), (left + body_w - 39, top + 60)], fill=gold, outline=ink)
        else:
            draw.rounded_rectangle((left + 5, top, left + body_w - 2, top + body_h), radius=9, fill=white, outline=ink, width=4)
            draw.rectangle((left + 13, top + 10, left + body_w - 12, top + 23), fill=base)
        for row in range(4):
            yy = top + 34 + row * 12
            draw.line((left + 17, yy, left + body_w - 18, yy), fill=[side, accent, cyan, side][row], width=3)
        if form == "receipt":
            for x in range(left + 16, left + body_w - 13, 10):
                draw.line((x, top + 27, x, top + body_h - 12), fill=mix(side, white, 0.35), width=1)
            for x in range(left + 14, left + body_w - 10, 13):
                draw.polygon([(x, top + body_h), (x + 7, top + body_h), (x + 3, top + body_h - 7)], fill=white, outline=ink)
        elif form == "policy-doc":
            draw.ellipse((left + body_w - 32, top + body_h - 32, left + body_w - 10, top + body_h - 10), fill=gold, outline=ink, width=2)
            draw.polygon([(left + body_w - 26, top + body_h - 11), (left + body_w - 17, top + body_h + 5), (left + body_w - 10, top + body_h - 11)], fill=red, outline=ink)
        elif form == "visa":
            draw.ellipse((left + body_w - 34, top + 35, left + body_w - 13, top + 56), fill=cyan, outline=ink, width=2)
            draw.arc((left + body_w - 31, top + 38, left + body_w - 16, top + 53), 90, 270, fill=white, width=2)
    elif form == "meal":
        draw.rounded_rectangle((left + 7, top + 12, left + body_w - 5, top + body_h), radius=18, fill=base, outline=ink, width=4)
        draw.arc((left + 20, top - 4, left + body_w - 20, top + 45), 190, 350, fill=ink, width=4)
        draw.polygon([(left + 18, top + 36), (left + body_w - 16, top + 25), (left + body_w - 10, top + 59), (left + 15, top + 68)], fill=pale, outline=ink)
        draw.ellipse((left + body_w - 31, top + 22, left + body_w - 13, top + 40), fill=accent, outline=ink, width=2)
        draw.rounded_rectangle((left + 21, top + body_h - 31, left + body_w - 22, top + body_h - 16), radius=6, fill=white, outline=ink, width=2)
    elif form == "sleeping-bag":
        bag_top = top + int(body_h * 0.18)
        bag_bottom = top + body_h
        draw.rounded_rectangle((left + 2, bag_top, left + body_w - 2, bag_bottom), radius=int(body_h * 0.43), fill=base, outline=ink, width=4)
        draw.rounded_rectangle((left + 18, bag_top + 10, left + body_w - 17, bag_bottom - 11), radius=int(body_h * 0.28), fill=pale, outline=ink, width=3)
        zip_y = bag_top + int((bag_bottom - bag_top) * 0.52)
        draw.line((left + 22, zip_y, left + body_w - 21, zip_y), fill=accent, width=5)
        for x in range(left + 31, left + body_w - 25, 15):
            draw.line((x, zip_y - 7, x + 8, zip_y + 7), fill=side, width=3)
        draw.ellipse((left + 10, bag_top + 11, left + 34, bag_top + 35), fill=white, outline=ink, width=3)
    elif form == "ticket":
        draw.rounded_rectangle((left, top + 4, left + body_w, top + body_h - 2), radius=8, fill=pale, outline=ink, width=4)
        draw_ticket_cuts(draw, left, top + 4, body_w, body_h - 6, ink)
        draw.line((left + body_w * 0.22, top + 12, left + body_w * 0.22, top + body_h - 10), fill=mix(ink, white, 0.4), width=2)
    elif form in {"folder", "book"}:
        if form == "folder":
            draw.rounded_rectangle((left + 5, top + 13, left + body_w + 3, top + body_h), radius=10, fill=side, outline=ink, width=3)
            draw.rounded_rectangle((left, top + 5, left + body_w - 8, top + body_h - 2), radius=10, fill=base, outline=ink, width=4)
            draw.rounded_rectangle((left + 12, top - 5, left + body_w * 0.55, top + 13), radius=4, fill=accent, outline=ink, width=2)
            draw.polygon([(left + 7, top + 39), (left + body_w - 16, top + 27), (left + body_w - 6, top + body_h - 8), (left + 12, top + body_h - 4)], fill=mix(base, white, 0.16), outline=ink)
            draw.line((left + 20, top + 56, left + body_w - 27, top + 47), fill=pale, width=3)
        else:
            draw.polygon([(left + 2, top + 11), (left + body_w // 2, top + 2), (left + body_w // 2, top + body_h - 4), (left + 5, top + body_h)], fill=pale, outline=ink)
            draw.polygon([(left + body_w // 2, top + 2), (left + body_w - 4, top + 11), (left + body_w - 5, top + body_h), (left + body_w // 2, top + body_h - 4)], fill=base, outline=ink)
            draw.rectangle((left + body_w // 2 - 3, top + 4, left + body_w // 2 + 3, top + body_h - 3), fill=ink)
            for yy in range(top + 24, top + body_h - 13, 13):
                draw.line((left + 16, yy, left + body_w // 2 - 11, yy + 2), fill=side, width=2)
                draw.line((left + body_w // 2 + 13, yy + 2, left + body_w - 17, yy), fill=pale, width=2)
    elif form in {"contract", "lawbook", "notebook"}:
        draw.rounded_rectangle((left + 2, top + 3, left + body_w - 4, top + body_h), radius=10, fill=base, outline=ink, width=4)
        draw.rectangle((left + body_w - 22, top + 9, left + body_w - 13, top + body_h - 8), fill=side)
        for yy in range(top + 20, top + body_h - 17, 13):
            draw.line((left + 18, yy, left + body_w - 30, yy), fill=pale, width=3)
        if form == "contract":
            draw.ellipse((left + body_w - 35, top + body_h - 37, left + body_w - 13, top + body_h - 15), fill=gold, outline=ink, width=2)
            draw.polygon([(left + body_w - 29, top + body_h - 17), (left + body_w - 21, top + body_h + 1), (left + body_w - 13, top + body_h - 17)], fill=red, outline=ink)
            draw.line((left + 21, top + body_h - 25, left + body_w - 43, top + body_h - 18), fill=ink, width=2)
        elif form == "notebook":
            for yy in range(top + 13, top + body_h - 7, 12):
                draw.ellipse((left + 6, yy, left + 15, yy + 8), fill=white, outline=ink, width=1)
        elif form == "lawbook":
            draw.rectangle((left + 22, top + 14, left + body_w - 32, top + 25), fill=gold, outline=ink, width=2)
            draw.rectangle((left + 11, top + 6, left + 21, top + body_h - 4), fill=side, outline=ink, width=1)
    elif form == "basket":
        draw.rounded_rectangle((left, top + 13, left + body_w, top + body_h), radius=17, fill=base, outline=ink, width=4)
        draw.arc((left + 15, top - 5, left + body_w - 15, top + 43), 190, 350, fill=ink, width=4)
        for x in range(left + 16, left + body_w - 10, 17):
            draw.line((x, top + 29, x - 8, top + body_h - 10), fill=side, width=3)
    elif form == "cup":
        draw.rounded_rectangle((left + 5, top + 13, left + body_w - 7, top + body_h), radius=16, fill=base, outline=ink, width=4)
        draw.ellipse((left + 2, top + 4, left + body_w - 4, top + 30), fill=white, outline=ink, width=4)
        draw.rounded_rectangle((left + body_w - 8, top + 35, left + body_w + 16, top + 60), radius=9, fill=pale, outline=ink, width=3)
    elif form == "timer":
        draw.rounded_rectangle((left, top + 8, left + body_w, top + body_h), radius=18, fill=base, outline=ink, width=4)
        draw.rectangle((left + 22, top - 3, left + body_w - 22, top + 12), fill=ink)
        draw.ellipse((left + 20, top + 24, left + body_w - 20, top + body_h - 16), fill=pale, outline=ink, width=3)
    elif form in {"monitor", "board"}:
        draw.rounded_rectangle((left, top + 6, left + body_w, top + body_h - 16), radius=10, fill=base, outline=ink, width=4)
        draw.rectangle((left + 12, top + 18, left + body_w - 12, top + body_h - 31), fill=mix(white, base, 0.08), outline=ink, width=2)
        draw.rectangle((left + body_w * 0.43, top + body_h - 16, left + body_w * 0.57, top + body_h - 4), fill=ink)
        draw.rounded_rectangle((left + body_w * 0.28, top + body_h - 5, left + body_w * 0.72, top + body_h + 3), radius=4, fill=ink)
    elif form in {"schedule", "notice-board", "kpi", "portfolio", "exchange-board", "circuit-board"}:
        draw.rounded_rectangle((left, top + 7, left + body_w, top + body_h - 11), radius=11, fill=base, outline=ink, width=4)
        draw.rectangle((left + 12, top + 18, left + body_w - 12, top + body_h - 26), fill=mix(white, base, 0.14), outline=ink, width=2)
        if form == "notice-board":
            draw.rectangle((left + 9, top + 13, left + body_w - 9, top + 21), fill=side, outline=ink, width=1)
            for pin_x, pin_y, color in [(left + 24, top + 31, red), (left + body_w - 29, top + 35, gold), (left + body_w // 2, top + 53, cyan)]:
                draw.ellipse((pin_x - 4, pin_y - 4, pin_x + 4, pin_y + 4), fill=color, outline=ink, width=1)
            draw.rectangle((left + 24, top + body_h - 11, left + 32, top + body_h + 7), fill=ink)
            draw.rectangle((left + body_w - 32, top + body_h - 11, left + body_w - 24, top + body_h + 7), fill=ink)
        elif form == "exchange-board":
            draw.rectangle((left + 14, top + 20, left + body_w - 14, top + body_h - 28), fill=(15, 23, 42, 255), outline=ink, width=1)
            for row, color in enumerate([cyan, gold, red]):
                yy = top + 29 + row * 13
                draw.line((left + 22, yy, left + body_w - 22, yy + (3 if row != 2 else -3)), fill=color, width=3)
        elif form == "portfolio":
            draw.rectangle((left + 21, top + 12, left + body_w - 23, top + 25), fill=accent, outline=ink, width=1)
            for x in (left + 27, left + body_w - 34):
                draw.ellipse((x, top + 32, x + 9, top + 41), fill=gold, outline=ink, width=1)
        elif form == "kpi":
            draw.line((left + body_w // 2, top + body_h - 11, left + 18, top + body_h + 10), fill=ink, width=4)
            draw.line((left + body_w // 2, top + body_h - 11, left + body_w - 18, top + body_h + 10), fill=ink, width=4)
        elif form == "schedule":
            for x in (left + 24, left + body_w - 33):
                draw.rounded_rectangle((x, top + 1, x + 10, top + 18), radius=4, fill=ink)
        if form == "schedule":
            for col in range(3):
                for row in range(3):
                    color = [pale, accent, cyan][(col + row) % 3]
                    draw.rounded_rectangle((left + 19 + col * 18, top + 30 + row * 13, left + 31 + col * 18, top + 38 + row * 13), radius=2, fill=color, outline=ink, width=1)
        elif form in {"kpi", "portfolio", "exchange-board"}:
            draw.line((left + 17, top + body_h - 35, left + 34, top + 46, left + 51, top + 55, left + body_w - 16, top + 29), fill=accent, width=5)
            for x, y in [(left + 17, top + body_h - 35), (left + 34, top + 46), (left + 51, top + 55), (left + body_w - 16, top + 29)]:
                draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=gold, outline=ink, width=1)
        elif form == "circuit-board":
            for x in range(left + 21, left + body_w - 18, 19):
                draw.line((x, top + 24, x, top + body_h - 31), fill=cyan, width=3)
            for y in range(top + 31, top + body_h - 30, 17):
                draw.line((left + 18, y, left + body_w - 19, y), fill=accent, width=2)
        draw.rectangle((left + body_w * 0.44, top + body_h - 11, left + body_w * 0.56, top + body_h), fill=ink)
    elif form == "calendar":
        draw.rounded_rectangle((left, top + 5, left + body_w, top + body_h), radius=10, fill=white, outline=ink, width=4)
        draw.rectangle((left + 1, top + 6, left + body_w - 1, top + 25), fill=base)
        for x in (left + 20, left + body_w - 27):
            draw.rounded_rectangle((x, top - 4, x + 9, top + 13), radius=3, fill=ink)
        for row in range(3):
            for col in range(3):
                cell_x = left + 19 + col * 18
                cell_y = top + 37 + row * 14
                draw.rounded_rectangle((cell_x, cell_y, cell_x + 10, cell_y + 8), radius=2, fill=[pale, accent, cyan][(row + col) % 3], outline=ink, width=1)
    elif form in {"safe", "vault", "budget-box"}:
        if form == "budget-box":
            draw.rounded_rectangle((left + 3, top + 12, left + body_w - 1, top + body_h), radius=12, fill=base, outline=ink, width=4)
            draw.polygon([(left + 12, top + 22), (left + body_w - 11, top + 9), (left + body_w - 4, top + 34), (left + 16, top + 45)], fill=pale, outline=ink)
            draw.rounded_rectangle((left + 18, top + 51, left + body_w - 18, top + 64), radius=4, fill=side, outline=ink, width=2)
            draw.rectangle((left + body_w - 31, top + body_h - 32, left + body_w - 16, top + body_h - 17), fill=gold, outline=ink, width=2)
        else:
            draw.rounded_rectangle((left, top, left + body_w, top + body_h), radius=18 if boss else 14, fill=base, outline=ink, width=4)
            door_radius = 14 if form == "vault" else 10
            draw.rounded_rectangle((left + 13, top + 14, left + body_w - 12, top + body_h - 13), radius=door_radius, fill=side, outline=ink, width=3)
            draw.ellipse((left + body_w * 0.43, top + body_h * 0.36, left + body_w * 0.73, top + body_h * 0.66), fill=gold, outline=ink, width=3)
            draw.line((left + body_w * 0.58, top + body_h * 0.41, left + body_w * 0.58, top + body_h * 0.61), fill=ink, width=3)
            draw.line((left + body_w * 0.48, top + body_h * 0.51, left + body_w * 0.68, top + body_h * 0.51), fill=ink, width=3)
            if form == "vault":
                for angle_point in [(0.5, 0.22), (0.28, 0.5), (0.5, 0.78), (0.78, 0.5)]:
                    px = left + body_w * angle_point[0]
                    py = top + body_h * angle_point[1]
                    draw.ellipse((px - 4, py - 4, px + 4, py + 4), fill=cyan, outline=ink, width=1)
            draw.rectangle((left + body_w - 24, top + 11, left + body_w - 12, top + 24), fill=cyan, outline=ink, width=2)
    elif form in {"gate", "building", "tower", "contract-gate", "global-gate"}:
        if form == "building":
            draw.rectangle((left + 7, top + 13, left + body_w - 7, top + body_h), fill=base, outline=ink, width=4)
            draw.rectangle((left + 18, top + 4, left + body_w - 18, top + 20), fill=accent, outline=ink, width=3)
            for row in range(3):
                for col in range(3):
                    wx = left + 21 + col * 22
                    wy = top + 30 + row * 16
                    draw.rounded_rectangle((wx, wy, wx + 12, wy + 9), radius=2, fill=[pale, cyan, white][(row + col) % 3], outline=ink, width=1)
            draw.rounded_rectangle((left + body_w // 2 - 12, top + body_h - 28, left + body_w // 2 + 12, top + body_h), radius=4, fill=side, outline=ink, width=2)
        elif form == "tower":
            draw.rectangle((left + body_w // 2 - 24, top + 10, left + body_w // 2 + 24, top + body_h), fill=base, outline=ink, width=4)
            draw.polygon([(left + body_w // 2, top - 13), (left + body_w // 2 - 30, top + 14), (left + body_w // 2 + 30, top + 14)], fill=accent, outline=ink)
            for yy in range(top + 28, top + body_h - 12, 16):
                draw.rectangle((left + body_w // 2 - 14, yy, left + body_w // 2 + 14, yy + 7), fill=pale, outline=ink, width=1)
        else:
            draw.rectangle((left + 8, top + 20, left + body_w - 8, top + body_h), fill=base, outline=ink, width=4)
            draw.polygon([(left - 2, top + 23), (left + body_w // 2, top), (left + body_w + 2, top + 23)], fill=accent, outline=ink)
            draw.rounded_rectangle((left + body_w * 0.22, top + 39, left + body_w * 0.78, top + body_h), radius=24, fill=side, outline=ink, width=3)
            draw.rectangle((left + body_w * 0.45, top + 43, left + body_w * 0.55, top + body_h), fill=ink)
            if form in {"contract-gate", "global-gate"}:
                draw.rectangle((left + 18, top + body_h - 35, left + body_w - 18, top + body_h - 25), fill=gold, outline=ink, width=2)
                draw.ellipse((left + body_w // 2 - 11, top + body_h - 49, left + body_w // 2 + 11, top + body_h - 27), fill=red, outline=ink, width=2)
            if form == "global-gate":
                draw.arc((left + 18, top + 8, left + body_w - 18, top + 44), 185, 355, fill=cyan, width=4)
    elif form in {"tag", "clipboard", "estimate", "medical-chart", "checklist"}:
        if form == "tag":
            draw.polygon(
                [
                    (left + 8, top + 5),
                    (left + body_w - 14, top),
                    (left + body_w + 2, top + body_h * 0.48),
                    (left + body_w - 14, top + body_h),
                    (left + 8, top + body_h - 5),
                    (left - 7, top + body_h * 0.48),
                ],
                fill=base,
                outline=ink,
            )
            draw.ellipse((left + 12, top + body_h * 0.40, left + 25, top + body_h * 0.56), fill=white, outline=ink, width=2)
            draw.line((left + 29, top + 26, left + body_w - 21, top + 21), fill=pale, width=4)
            draw.line((left + 34, top + 44, left + body_w - 16, top + 51), fill=gold, width=5)
        else:
            draw.rounded_rectangle((left + 6, top + 3, left + body_w, top + body_h), radius=11, fill=base, outline=ink, width=4)
            draw.rectangle((left + 23, top - 6, left + body_w - 23, top + 12), fill=ink)
            draw.rounded_rectangle((left + 29, top - 11, left + body_w - 29, top + 4), radius=4, fill=accent, outline=ink, width=2)
            for row in range(3):
                yy = top + 29 + row * 15
                draw.rectangle((left + 24, yy, left + 35, yy + 8), fill=[cyan, gold, red][row], outline=ink, width=1)
                draw.line((left + 42, yy + 4, left + body_w - 18, yy + 4), fill=pale, width=3)
            if form == "estimate":
                draw.line((left + body_w - 33, top + body_h - 23, left + body_w - 17, top + body_h - 39), fill=ink, width=4)
                draw.ellipse((left + body_w - 25, top + body_h - 42, left + body_w - 10, top + body_h - 27), fill=white, outline=ink, width=2)
            elif form == "medical-chart":
                draw.rectangle((left + body_w - 34, top + body_h - 42, left + body_w - 24, top + body_h - 18), fill=white, outline=ink, width=1)
                draw.rectangle((left + body_w - 41, top + body_h - 35, left + body_w - 17, top + body_h - 25), fill=white, outline=ink, width=1)
            elif form == "checklist":
                for yy in (top + 29, top + 44, top + 59):
                    draw.line((left + 26, yy + 4, left + 30, yy + 9, left + 38, yy - 1), fill=(34, 197, 94, 255), width=3)
    elif form in {"inbox", "stack"}:
        if form == "inbox":
            envelopes = [
                (left + 9, top + 4, pale, -7),
                (left + 0, top + 22, mix(base, white, 0.30), 5),
                (left + 12, top + 40, base, -3),
            ]
            for ex, ey, color, slant in envelopes:
                draw.polygon([(ex + 2, ey + 6), (ex + body_w - 12, ey), (ex + body_w - 5 + slant, ey + 27), (ex + 8 + slant, ey + 33)], fill=color, outline=ink)
                draw.line((ex + 7, ey + 11, ex + body_w * 0.48, ey + 23, ex + body_w - 13, ey + 8), fill=white, width=2)
            draw.rounded_rectangle((left + 7, top + body_h - 24, left + body_w + 4, top + body_h + 6), radius=8, fill=side, outline=ink, width=3)
            draw.rectangle((left + 18, top + body_h - 19, left + body_w - 9, top + body_h - 9), fill=accent)
        else:
            for offset in (12, 6, 0):
                draw.rounded_rectangle((left + offset, top + offset, left + body_w + offset, top + body_h + offset), radius=10, fill=mix(base, white, offset / 36), outline=ink, width=3)
            draw.rectangle((left + 11, top + body_h * 0.58, left + body_w - 10, top + body_h * 0.7), fill=accent)
    elif form == "popup":
        draw.rounded_rectangle((left + 4, top + 9, left + body_w - 3, top + body_h - 10), radius=15, fill=pale, outline=ink, width=4)
        draw.polygon([(left + body_w - 22, top + body_h - 11), (left + body_w - 6, top + body_h + 4), (left + body_w - 35, top + body_h - 12)], fill=pale, outline=ink)
        for yy in (top + 32, top + 47, top + 62):
            draw.line((left + 19, yy, left + body_w - 20, yy), fill=[base, accent, cyan][(yy // 15) % 3], width=5)
    elif form == "printer":
        draw.rounded_rectangle((left + 5, top + 26, left + body_w - 5, top + body_h - 8), radius=12, fill=base, outline=ink, width=4)
        draw.rectangle((left + 17, top + 1, left + body_w - 17, top + 35), fill=white, outline=ink, width=3)
        draw.rectangle((left + 19, top + body_h - 34, left + body_w - 19, top + body_h + 1), fill=white, outline=ink, width=3)
        draw.rectangle((left + body_w - 27, top + 39, left + body_w - 14, top + 50), fill=cyan, outline=ink, width=2)
    elif form == "map":
        panels = [
            [(left + 4, top + 9), (left + body_w * 0.36, top), (left + body_w * 0.34, top + body_h), (left, top + body_h - 8)],
            [(left + body_w * 0.36, top), (left + body_w * 0.66, top + 10), (left + body_w * 0.64, top + body_h - 5), (left + body_w * 0.34, top + body_h)],
            [(left + body_w * 0.66, top + 10), (left + body_w, top + 3), (left + body_w - 4, top + body_h - 12), (left + body_w * 0.64, top + body_h - 5)],
        ]
        for index, points in enumerate(panels):
            draw.polygon(points, fill=[base, pale, accent][index], outline=ink)
        draw.line((left + 17, top + 54, left + body_w - 18, top + 37), fill=cyan, width=4)
    elif form in {"coin"}:
        draw.ellipse((left + 8, top + 14, left + body_w - 8, top + body_h - 1), fill=gold, outline=ink, width=4)
        draw.ellipse((left + 23, top + 28, left + body_w - 23, top + body_h - 17), fill=mix(gold, white, 0.25), outline=ink, width=3)
    elif form == "chart":
        draw.rounded_rectangle((left, top + 8, left + body_w, top + body_h), radius=11, fill=white, outline=ink, width=4)
        draw.line((left + 13, top + body_h - 20, left + 32, top + 47, left + 51, top + 56, left + body_w - 14, top + 25), fill=(34, 197, 94, 255), width=5)
    elif form == "calculator":
        draw.rounded_rectangle((left + 8, top + 2, left + body_w - 7, top + body_h), radius=14, fill=base, outline=ink, width=4)
        draw.rectangle((left + 22, top + 15, left + body_w - 21, top + 32), fill=(15, 23, 42, 255), outline=ink, width=2)
        for row in range(3):
            for col in range(3):
                draw.rounded_rectangle((left + 24 + col * 17, top + 45 + row * 14, left + 34 + col * 17, top + 55 + row * 14), radius=2, fill=[white, gold, cyan][(row + col) % 3], outline=ink, width=1)
    elif form == "seal":
        draw.ellipse((left + 7, top + 8, left + body_w - 7, top + body_h - 13), fill=base, outline=ink, width=4)
        draw.rounded_rectangle((left + 20, top + body_h - 17, left + body_w - 20, top + body_h + 2), radius=6, fill=accent, outline=ink, width=3)
    elif form == "envelope":
        draw.rounded_rectangle((left + 2, top + 15, left + body_w - 1, top + body_h - 3), radius=9, fill=pale, outline=ink, width=4)
        draw.polygon([(left + 5, top + 18), (left + body_w / 2, top + 62), (left + body_w - 4, top + 18)], fill=white, outline=ink)
        draw.polygon([(left + 5, top + body_h - 5), (left + body_w / 2, top + 49), (left + body_w - 4, top + body_h - 5)], fill=base, outline=ink)
    elif form in {"passport"}:
        draw.rounded_rectangle((left + 9, top, left + body_w - 4, top + body_h), radius=11, fill=base, outline=ink, width=4)
        draw.rectangle((left + 21, top + 13, left + 29, top + body_h - 10), fill=side)
        draw.ellipse((left + body_w * 0.45, top + 23, left + body_w * 0.72, top + 49), fill=cyan, outline=white, width=2)
    elif form == "crate":
        draw.polygon([(left + 9, top + 12), (left + body_w - 13, top), (left + body_w, top + body_h - 12), (left + 17, top + body_h)], fill=base, outline=ink)
        draw.line((left + 20, top + 17, left + body_w - 5, top + body_h - 18), fill=side, width=5)
        draw.line((left + body_w - 19, top + 12, left + 13, top + body_h - 17), fill=mix(base, white, 0.25), width=4)
    elif form == "globe":
        draw.ellipse((left + 4, top + 3, left + body_w - 4, top + body_h - 12), fill=cyan, outline=ink, width=4)
        draw.arc((left + 16, top + 7, left + body_w - 16, top + body_h - 16), 75, 285, fill=white, width=3)
        draw.arc((left + 10, top + 24, left + body_w - 8, top + body_h - 25), 205, 35, fill=(34, 197, 94, 255), width=5)
        draw.rounded_rectangle((left + body_w * 0.33, top + body_h - 14, left + body_w * 0.67, top + body_h), radius=5, fill=ink)
    elif form == "headset":
        draw.ellipse((left + 9, top + 7, left + body_w - 9, top + body_h - 3), fill=base, outline=ink, width=4)
        draw.arc((left + 14, top + 2, left + body_w - 14, top + 64), 190, 350, fill=ink, width=6)
        draw.rounded_rectangle((left + 8, top + 44, left + 23, top + 70), radius=6, fill=side, outline=ink, width=3)
        draw.rounded_rectangle((left + body_w - 23, top + 44, left + body_w - 8, top + 70), radius=6, fill=side, outline=ink, width=3)
        draw.line((left + body_w - 21, top + 67, left + body_w - 6, top + 75), fill=ink, width=4)
    elif form == "chip":
        draw.rectangle((left + 8, top + 8, left + body_w - 8, top + body_h - 8), fill=base, outline=ink, width=4)
        for x in range(left + 17, left + body_w - 14, 18):
            draw.line((x, top + 2, x, top + 10), fill=accent, width=3)
            draw.line((x, top + body_h - 10, x, top + body_h - 1), fill=accent, width=3)
        draw.rectangle((left + 25, top + 30, left + body_w - 25, top + body_h - 30), fill=cyan, outline=ink, width=3)
    elif form == "cube":
        draw.polygon([(left + 17, top + 7), (left + body_w - 12, top + 18), (left + body_w - 25, top + body_h), (left + 4, top + body_h - 13)], fill=base, outline=ink)
        draw.polygon([(left + 17, top + 7), (left + body_w // 2, top - 8), (left + body_w - 12, top + 18), (left + body_w * 0.48, top + 32)], fill=mix(base, white, 0.24), outline=ink)
    elif form == "flask":
        draw.rounded_rectangle((left + body_w * 0.42, top, left + body_w * 0.58, top + 32), radius=4, fill=white, outline=ink, width=3)
        draw.polygon([(left + 30, top + 32), (left + body_w - 30, top + 32), (left + body_w - 9, top + body_h), (left + 9, top + body_h)], fill=mix(base, white, 0.18), outline=ink)
        draw.rectangle((left + 20, top + body_h - 32, left + body_w - 20, top + body_h - 13), fill=cyan)
    elif form == "robot-arm":
        draw.rounded_rectangle((left + 10, top + 28, left + body_w - 7, top + body_h), radius=16, fill=base, outline=ink, width=4)
        draw.line((left + 28, top + 32, left + 43, top + 8, left + 64, top + 28), fill=ink, width=8)
        draw.line((left + 28, top + 32, left + 43, top + 8, left + 64, top + 28), fill=accent, width=4)
        draw.rounded_rectangle((left + 57, top + 23, left + 82, top + 42), radius=6, fill=pale, outline=ink, width=3)
    elif form == "drone-port":
        draw.ellipse((left + 4, top + 27, left + body_w - 4, top + body_h), fill=side, outline=ink, width=4)
        draw.ellipse((left + 18, top + 39, left + body_w - 18, top + body_h - 13), fill=base, outline=ink, width=3)
        for dx, dy in [(6, 8), (body_w - 26, 8), (8, 58), (body_w - 28, 58)]:
            draw.ellipse((left + dx, top + dy, left + dx + 20, top + dy + 20), fill=cyan, outline=ink, width=2)
    elif form == "core":
        draw.ellipse((left + 2, top + 6, left + body_w - 2, top + body_h - 5), fill=base, outline=ink, width=4)
        draw.ellipse((left + 20, top + 24, left + body_w - 20, top + body_h - 24), fill=cyan, outline=white, width=3)
        for dx, dy in [(0, -18), (-28, 10), (28, 10)]:
            draw.ellipse((left + body_w / 2 + dx - 7, top + body_h / 2 + dy - 7, left + body_w / 2 + dx + 7, top + body_h / 2 + dy + 7), fill=accent, outline=ink, width=2)
    elif form in {"mainframe", "server-room"}:
        draw.rounded_rectangle((left + 5, top, left + body_w - 5, top + body_h), radius=10, fill=(15, 23, 42, 255), outline=ink, width=4)
        for row in range(4):
            yy = top + 12 + row * 19
            draw.rectangle((left + 17, yy, left + body_w - 17, yy + 11), fill=[base, side, base, side][row], outline=ink, width=1)
            draw.ellipse((left + body_w - 28, yy + 3, left + body_w - 20, yy + 11), fill=[cyan, accent, gold, cyan][row])
    elif form == "mountain":
        draw.polygon([(left, top + body_h), (left + body_w * 0.34, top + 19), (left + body_w * 0.57, top + body_h)], fill=base, outline=ink)
        draw.polygon([(left + body_w * 0.3, top + body_h), (left + body_w * 0.66, top + 4), (left + body_w, top + body_h)], fill=white, outline=ink)
        draw.polygon([(left + body_w * 0.54, top + 26), (left + body_w * 0.66, top + 4), (left + body_w * 0.78, top + 26)], fill=accent, outline=ink)
    elif form == "planet":
        draw.ellipse((left + 5, top + 8, left + body_w - 5, top + body_h - 6), fill=base, outline=ink, width=4)
        draw.arc((left - 11, top + 31, left + body_w + 12, top + body_h - 17), 192, 345, fill=accent, width=7)
        draw.polygon([(left + 27, top + 45), (left + 38, top + 33), (left + 50, top + 45), (left + 39, top + 58)], fill=(34, 197, 94, 255), outline=ink)
    elif form == "table":
        draw.rounded_rectangle((left + 5, top + 18, left + body_w - 3, top + body_h - 8), radius=17, fill=base, outline=ink, width=4)
        draw.ellipse((left + 12, top + 6, left + body_w - 12, top + 42), fill=pale, outline=ink, width=3)
        draw.rectangle((left + 20, top + 43, left + body_w - 20, top + 53), fill=accent, outline=ink, width=2)
    elif form == "treaty":
        draw.rounded_rectangle((left + 5, top + 12, left + body_w - 5, top + body_h - 6), radius=20, fill=pale, outline=ink, width=4)
        draw.ellipse((left + 2, top + 8, left + 25, top + body_h - 4), fill=base, outline=ink, width=3)
        draw.ellipse((left + body_w - 25, top + 8, left + body_w - 2, top + body_h - 4), fill=base, outline=ink, width=3)
        draw.line((left + 31, top + 39, left + body_w - 31, top + 39), fill=accent, width=4)
    elif form == "capsule":
        draw.ellipse((left + 17, top, left + body_w - 17, top + 35), fill=white, outline=ink, width=3)
        draw.rounded_rectangle((left + 12, top + 18, left + body_w - 12, top + body_h - 3), radius=25, fill=base, outline=ink, width=4)
        draw.ellipse((left + body_w * 0.36, top + 37, left + body_w * 0.64, top + 61), fill=cyan, outline=white, width=2)
        draw.polygon([(left + 12, top + body_h - 20), (left - 3, top + body_h - 2), (left + 16, top + body_h - 5)], fill=accent, outline=ink)
        draw.polygon([(left + body_w - 12, top + body_h - 20), (left + body_w + 3, top + body_h - 2), (left + body_w - 16, top + body_h - 5)], fill=accent, outline=ink)
    elif form == "council-seat":
        draw.rounded_rectangle((left + 10, top + 10, left + body_w - 10, top + body_h - 16), radius=21, fill=base, outline=ink, width=4)
        draw.rounded_rectangle((left + 2, top + 52, left + body_w - 2, top + body_h), radius=14, fill=side, outline=ink, width=4)
        draw.rectangle((left + 22, top + body_h - 15, left + body_w - 22, top + body_h + 3), fill=ink)
    elif form == "network":
        draw.rounded_rectangle((left, top + 4, left + body_w, top + body_h), radius=21, fill=base, outline=ink, width=4)
        nodes = [(left + 23, top + 31), (left + body_w - 22, top + 28), (left + body_w // 2, top + 55), (left + 27, top + body_h - 22), (left + body_w - 26, top + body_h - 20)]
        for a, b in [(0, 2), (1, 2), (2, 3), (2, 4), (3, 4)]:
            draw.line((nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1]), fill=white, width=3)
        for x, y in nodes:
            draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=accent, outline=ink, width=2)
    elif form in {"maze", "policy-maze"}:
        draw.rounded_rectangle((left + 3, top + 3, left + body_w - 3, top + body_h), radius=14, fill=base, outline=ink, width=4)
        for offset in range(0, 42, 14):
            draw.line((left + 20 + offset, top + 18, left + 20 + offset, top + body_h - 15), fill=pale, width=4)
        for offset in range(0, 42, 14):
            draw.line((left + 16, top + 25 + offset, left + body_w - 16, top + 25 + offset), fill=side, width=4)
        draw.ellipse((left + body_w - 31, top + body_h - 31, left + body_w - 16, top + body_h - 16), fill=gold, outline=ink, width=2)
    elif form == "checkout":
        draw.rounded_rectangle((left + 8, top + 22, left + body_w - 8, top + body_h), radius=13, fill=base, outline=ink, width=4)
        draw.rectangle((left + 22, top + 3, left + body_w - 22, top + 29), fill=pale, outline=ink, width=3)
        draw.rectangle((left + 25, top + 12, left + body_w - 25, top + 22), fill=(15, 23, 42, 255))
        for col in range(3):
            draw.rounded_rectangle((left + 24 + col * 18, top + 51, left + 35 + col * 18, top + 62), radius=2, fill=[gold, cyan, white][col], outline=ink, width=1)
    elif form in {"approval-tower", "crash-tower"}:
        draw.rectangle((left + 15, top + 8, left + body_w - 15, top + body_h), fill=base, outline=ink, width=4)
        for row in range(4):
            yy = top + 18 + row * 18
            draw.rectangle((left + 25, yy, left + body_w - 25, yy + 10), fill=[pale, accent, cyan, pale][row], outline=ink, width=1)
        draw.polygon([(left + body_w / 2, top - 18), (left + body_w / 2 - 22, top + 11), (left + body_w / 2 + 22, top + 11)], fill=accent, outline=ink)
    elif form == "ladder":
        draw.rounded_rectangle((left + 10, top + 4, left + body_w - 10, top + body_h), radius=18, fill=base, outline=ink, width=4)
        draw.line((left + 28, top + 19, left + 28, top + body_h - 13), fill=white, width=5)
        draw.line((left + body_w - 28, top + 19, left + body_w - 28, top + body_h - 13), fill=white, width=5)
        for yy in range(top + 27, top + body_h - 18, 15):
            draw.line((left + 25, yy, left + body_w - 25, yy), fill=gold, width=4)
    elif form == "podium":
        draw.rounded_rectangle((left + 7, top + 25, left + body_w - 6, top + body_h), radius=12, fill=base, outline=ink, width=4)
        draw.rectangle((left + 20, top + 12, left + body_w - 20, top + 32), fill=pale, outline=ink, width=3)
        draw.polygon([(left + body_w - 13, top + 8), (left + body_w + 12, top + 18), (left + body_w - 13, top + 28)], fill=accent, outline=ink)
    else:
        draw.rounded_rectangle((left, top, left + body_w, top + body_h), radius=16, fill=base, outline=ink, width=4)


def draw_expedition_icon(
    draw,
    design: dict,
    left: int,
    top: int,
    body_w: int,
    body_h: int,
    frame_index: int,
    accent: tuple[int, int, int, int],
    ink: tuple[int, int, int, int],
    white: tuple[int, int, int, int],
) -> None:
    icon = design["icon"]
    gold = (250, 204, 21, 255)
    red = (239, 68, 68, 255)
    cyan = (103, 232, 249, 255)
    x = left + int(body_w * 0.22)
    y = top + int(body_h * 0.21)
    w = int(body_w * 0.55)
    h = int(body_h * 0.26)
    if icon in {"house", "office", "policy"}:
        draw.polygon([(x, y + h * 0.45), (x + w / 2, y), (x + w, y + h * 0.45)], fill=accent, outline=ink)
        draw.rectangle((x + w * 0.18, y + h * 0.45, x + w * 0.82, y + h), fill=white, outline=ink, width=2)
    elif icon in {"queue", "agenda", "minutes", "shift", "checklist"}:
        for index in range(3):
            yy = y + index * 10
            draw.rounded_rectangle((x + index * 3, yy, x + w - index * 5, yy + 5), radius=2, fill=[accent, white, cyan][index % 3], outline=ink, width=1)
    elif icon in {"resume", "loan", "stamp", "approval", "utility", "receipt", "visa", "insurance", "report", "law", "research", "contract", "treaty"}:
        draw.rounded_rectangle((x, y, x + w, y + h + 6), radius=4, fill=white, outline=ink, width=2)
        draw.rectangle((x + 7, y + 7, x + w - 8, y + 11), fill=accent)
        draw.ellipse((x + w - 20, y + h - 4, x + w, y + h + 16), fill=red, outline=ink, width=2)
    elif icon in {"laundry", "mail", "meal"}:
        for index, color in enumerate([white, cyan, accent]):
            draw.ellipse((x + index * 16, y + 5 + (index % 2) * 6, x + 12 + index * 16, y + 17 + (index % 2) * 6), fill=color, outline=ink, width=1)
    elif icon in {"night", "deposit", "risk", "living-cost", "overtime"}:
        draw.ellipse((x + 4, y + 2, x + 24, y + 22), fill=gold, outline=ink, width=2)
        draw.ellipse((x + 12, y - 1, x + 30, y + 18), fill=(15, 23, 42, 255))
    elif icon in {"rush", "volatile", "yield", "market", "tax", "portfolio", "exchange", "kpi", "budget"}:
        points = [(x + 2, y + h), (x + w * 0.32, y + h * 0.42), (x + w * 0.55, y + h * 0.62), (x + w - 4, y + 4)]
        draw.line(points, fill=accent, width=4)
        for px, py in points:
            draw.ellipse((px - 4, py - 4, px + 4, py + 4), fill=gold, outline=ink, width=1)
    elif icon in {"price", "pass", "bid"}:
        draw.polygon([(x, y + 4), (x + w - 9, y), (x + w, y + h / 2), (x + w - 9, y + h), (x, y + h - 4)], fill=accent, outline=ink)
        draw.ellipse((x + 7, y + 7, x + 15, y + 15), fill=white, outline=ink, width=1)
    elif icon in {"clinic", "bio"}:
        draw.rectangle((x + w / 2 - 4, y + 2, x + w / 2 + 4, y + h + 7), fill=red)
        draw.rectangle((x + w / 2 - 15, y + h / 2 - 4, x + w / 2 + 15, y + h / 2 + 4), fill=red)
    elif icon in {"academy", "sheet", "bars", "presentation", "repair", "maintenance"}:
        for index, height in enumerate([12, 20, 29]):
            bx = x + 8 + index * 16
            draw.rectangle((bx, y + h + 5 - height, bx + 9, y + h + 5), fill=[cyan, gold, red][index], outline=ink)
    elif icon in {"airport", "trade", "timezone", "conference", "translate", "district"}:
        draw.ellipse((x + 5, y, x + w - 5, y + h + 12), fill=cyan, outline=ink, width=2)
        draw.arc((x + 12, y + 2, x + w - 12, y + h + 11), 80, 280, fill=white, width=2)
        draw.line((x + w / 2, y + 2, x + w / 2, y + h + 12), fill=white, width=2)
    elif icon in {"ai", "data", "singularity", "automation", "quantum", "drone"}:
        draw.rectangle((x + 6, y + 2, x + w - 6, y + h + 8), fill=(15, 23, 42, 255), outline=ink, width=2)
        draw.rectangle((x + 17, y + 10, x + w - 17, y + h), fill=cyan)
        for index in range(3):
            draw.line((x + 2, y + 8 + index * 8, x + 8, y + 8 + index * 8), fill=accent, width=2)
            draw.line((x + w - 8, y + 8 + index * 8, x + w - 2, y + 8 + index * 8), fill=accent, width=2)
    elif icon in {"flag", "project", "decision", "space", "summit"}:
        draw.line((x + w * 0.35, y, x + w * 0.35, y + h + 17), fill=ink, width=3)
        draw.polygon([(x + w * 0.38, y + 1), (x + w, y + 8), (x + w * 0.38, y + 17)], fill=accent, outline=ink)
        draw.ellipse((x + 3, y + h + 7, x + 19, y + h + 23), fill=gold, outline=ink, width=2)
    elif icon in {"climate", "peace", "ethics"}:
        draw.polygon([(x + 8, y + h), (x + w * 0.35, y + 4), (x + w * 0.54, y + h), (x + w * 0.35, y + h + 15)], fill=(34, 197, 94, 255), outline=ink)
        draw.arc((x + 20, y + 3, x + w, y + h + 13), 190, 330, fill=accent, width=3)
    elif icon == "lock":
        draw.rounded_rectangle((x + 10, y + 14, x + w - 10, y + h + 17), radius=5, fill=gold, outline=ink, width=2)
        draw.arc((x + 19, y, x + w - 19, y + 27), 180, 360, fill=ink, width=4)
    else:
        draw.ellipse((x, y, x + w, y + h + 8), fill=accent, outline=ink, width=2)


def shifted_mask(mask: Image.Image, dx: int, dy: int) -> Image.Image:
    shifted = Image.new("L", mask.size, 0)
    shifted.paste(mask, (dx, dy))
    return shifted


def alpha_scaled(mask: Image.Image, ratio: float) -> Image.Image:
    return mask.point(lambda value: clamp_channel(value * ratio))


def polish_expedition_frame(image: Image.Image, ink: tuple[int, int, int, int], seed: int) -> Image.Image:
    frame = image.convert("RGBA")
    alpha = frame.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if not bbox:
        return frame

    # Student-tab monsters have a visible dark cutout edge. Build that from the
    # silhouette so every generated expedition monster receives the same finish.
    shadow_mask = shifted_mask(alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.0)), 2, 3)
    shadow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    shadow.putalpha(alpha_scaled(shadow_mask, 0.03))

    outline_mask = alpha.filter(ImageFilter.MaxFilter(3))
    outer = Image.new("RGBA", frame.size, (11, 18, 29, 255))
    outer.putalpha(alpha_scaled(outline_mask, 0.72))

    tight_outline_mask = alpha
    tight = Image.new("RGBA", frame.size, ink)
    tight.putalpha(alpha_scaled(tight_outline_mask, 0.24))

    pixels = frame.load()
    left, top, right, bottom = bbox
    width = max(1, right - left)
    height = max(1, bottom - top)
    for y in range(top, bottom):
        yr = (y - top) / height
        for x in range(left, right):
            r, g, b, a = pixels[x, y]
            if a <= 0:
                continue
            xr = (x - left) / width
            edge_darken = 0.0
            if x + 2 < frame.width and alpha.getpixel((x + 2, y)) < 24:
                edge_darken += 0.08
            if y + 2 < frame.height and alpha.getpixel((x, y + 2)) < 24:
                edge_darken += 0.10
            factor = 1.075 - yr * 0.16 - xr * 0.045 - edge_darken + palette_noise(x, y, seed)
            if ((x // 2 + y // 2 + seed) % 19) == 0 and a > 180:
                factor += 0.035
            if ((x + seed * 3) % 17 == 0 or (y + seed * 5) % 23 == 0) and a > 200:
                factor -= 0.025
            pixels[x, y] = (
                clamp_channel(r * factor),
                clamp_channel(g * factor),
                clamp_channel(b * factor),
                a,
            )

    composite = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    composite.alpha_composite(shadow)
    composite.alpha_composite(outer)
    composite.alpha_composite(tight)
    composite.alpha_composite(frame)

    highlight = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight, "RGBA")
    hdraw.arc((left + 8, top + 5, right - 8, top + max(22, height // 2)), 205, 320, fill=(255, 255, 255, 48), width=2)
    hdraw.line((left + 15, top + 11, left + max(18, width // 2), top + 9), fill=(255, 255, 255, 36), width=1)
    highlight.putalpha(Image.composite(highlight.getchannel("A"), Image.new("L", frame.size, 0), alpha.point(lambda value: 255 if value > 80 else 0)))
    composite.alpha_composite(highlight)
    return composite


def draw_enemy_frame(tone: dict, variant: int, boss: bool, frame_index: int) -> Image.Image:
    source = Image.new("RGBA", (CELL * ENEMY_SUPERSAMPLE, CELL * ENEMY_SUPERSAMPLE), (0, 0, 0, 0))
    draw = ScaledDraw(ImageDraw.Draw(source), ENEMY_SUPERSAMPLE)
    base = hex_color(tone["color"])
    accent = hex_color(tone["accent"])
    ink = (23, 33, 46, 255)
    white = (248, 250, 252, 255)
    variant_index = max(0, variant - 1)
    designs = tone["bossDesigns"] if boss else tone["designs"]
    design = designs[variant_index % len(designs)]
    bob = [0, -2, -3, -1][frame_index]
    recoil = [-2, -1, 1, -1][frame_index]
    cx = 80 + recoil + ([-5, -1, 4, 2, -3, 5][variant_index % 6] if not boss else [-2, 2][variant_index % 2])
    body_bottom = (134 if boss else 132) + bob
    body_w, body_h = expedition_body_size(design, variant_index, boss)
    left = cx - body_w // 2
    top = body_bottom - body_h

    shadow_w = min(122 if boss else 112, max(72, body_w + (18 if boss else 14)))
    draw_expedition_shadow(draw, cx, 145, shadow_w, boss)
    if boss:
        draw.polygon([(left + 4, top + 15), (left - 8, top - 12), (left + 24, top + 7)], fill=accent, outline=ink)
        draw.polygon([(left + body_w - 21, top + 7), (left + body_w + 8, top - 14), (left + body_w - 2, top + 20)], fill=mix(accent, white, 0.15), outline=ink)
    draw_expedition_body(draw, design, left, top, body_w, body_h, boss, frame_index, base, accent, ink, white)
    draw_expedition_quality_details(draw, design, left, top, body_w, body_h, boss, frame_index, base, accent, ink, white)
    draw_expedition_negative_space(draw, design, left, top, body_w, body_h, ink, white)
    draw_expedition_limbs(draw, left, top, body_w, body_h, frame_index, accent, ink)
    draw_expedition_icon(draw, design, left, top, body_w, body_h, frame_index, accent, ink, white)
    draw_expedition_face(draw, left, top, body_w, body_h, boss, frame_index, ink, white, accent, design)
    if boss:
        draw.rectangle((left + body_w // 2 - 17, top - 21, left + body_w // 2 + 17, top - 10), fill=ink)
        draw.polygon([(left + body_w // 2 - 13, top - 9), (left + body_w // 2 - 4, top - 27), (left + body_w // 2 + 5, top - 9), (left + body_w // 2 + 16, top - 25), (left + body_w // 2 + 19, top - 7)], fill=accent, outline=ink)

    frame = source.resize((CELL, CELL), Image.Resampling.LANCZOS)
    return polish_expedition_frame(frame, ink, variant_index + frame_index * 7 + (50 if boss else 0))


def sheet_from_enemy(tone: dict, variant: int, boss: bool) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * FRAMES, CELL), (0, 0, 0, 0))
    for frame_index in range(FRAMES):
        frame = draw_enemy_frame(tone, variant, boss, frame_index)
        sheet.alpha_composite(frame, (frame_index * CELL, 0))
    return sheet


def raster_sheet_path_for(tone_id: str) -> Path:
    path = ENEMY_RASTER_SHEET_DIR / f"{tone_id}.png"
    if not path.exists():
        raise FileNotFoundError(
            f"원정대 몬스터 래스터 PNG 원본 누락: {project_path(path)}. "
            "CSS/절차형 대체 경로 없이 assets/visual-source/expedition-enemy-raster-sheets/<tone>.png를 먼저 준비해야 합니다."
        )
    return path


def alpha_bbox(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > threshold else 0).getbbox()
    if bbox is None:
        raise ValueError("래스터 원정대 몬스터 셀에 보이는 픽셀이 없습니다.")
    return bbox


def chroma_key_from_corners(image: Image.Image) -> tuple[int, int, int]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    corners = [
        pixels[0, 0],
        pixels[rgba.width - 1, 0],
        pixels[0, rgba.height - 1],
        pixels[rgba.width - 1, rgba.height - 1],
    ]
    key = max(corners, key=lambda color: color[1] - max(color[0], color[2]))
    return key[:3]


def is_connected_chroma_pixel(color: tuple[int, int, int, int], key: tuple[int, int, int]) -> bool:
    r, g, b, a = color
    if a <= 8:
        return True
    kr, kg, kb = key
    distance = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
    green_bias = g - max(r, b)
    close_to_key = distance <= 82 and green_bias >= 34
    neon_green = g >= 190 and r <= 130 and b <= 130 and green_bias >= 66
    soft_matte_green = g >= 96 and r <= 116 and b <= 116 and green_bias >= 24
    return close_to_key or neon_green or soft_matte_green


def remove_connected_chroma_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    key = chroma_key_from_corners(rgba)
    queue: deque[tuple[int, int]] = deque()
    visited = bytearray(width * height)

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        index = y * width + x
        if visited[index]:
            return
        if not is_connected_chroma_pixel(pixels[x, y], key):
            return
        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    for y in range(height):
        for x in range(width):
            if visited[y * width + x]:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                r, g, b, a = pixels[x, y]
                if a > 0 and g - max(r, b) > 36:
                    pixels[x, y] = (r, min(g, max(r, b) + 26), b, a)
    return rgba


def scrub_transparent_matte(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    def has_clear_neighbor(x: int, y: int) -> bool:
        for yy in range(max(0, y - 1), min(rgba.height, y + 2)):
            for xx in range(max(0, x - 1), min(rgba.width, x + 2)):
                if xx == x and yy == y:
                    continue
                if pixels[xx, yy][3] <= 4:
                    return True
        return False

    for _pass in range(2):
        to_clear: list[tuple[int, int]] = []
        for y in range(rgba.height):
            for x in range(rgba.width):
                r, g, b, a = pixels[x, y]
                if a <= 2:
                    to_clear.append((x, y))
                    continue
                green_bias = g - max(r, b)
                fringe_green = g >= 76 and r <= 118 and b <= 118 and green_bias >= 18
                if fringe_green and (a < 252 or has_clear_neighbor(x, y)):
                    to_clear.append((x, y))
                elif a < 248 and green_bias > 28:
                    pixels[x, y] = (r, min(g, max(r, b) + 14), b, a)
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)
    return rgba


def extract_raster_contact_cell(sheet: Image.Image, index: int) -> Image.Image:
    columns = 4
    rows = 2
    cell_w = sheet.width // columns
    cell_h = sheet.height // rows
    col = index % columns
    row = index // columns
    if row >= rows:
        raise ValueError(f"원정대 래스터 시트 index 범위 초과: {index}")
    return sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))


def fit_raster_sprite(sprite: Image.Image, boss: bool) -> Image.Image:
    bbox = alpha_bbox(sprite)
    crop = sprite.crop(bbox)
    max_w = 136 if boss else 128
    max_h = 142 if boss else 136
    scale = min(max_w / crop.width, max_h / crop.height, 1.0)
    if scale < 1.0:
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    return crop


def posed_raster_sprite(sprite: Image.Image, frame_index: int) -> Image.Image:
    pose = [
        {"angle": -3.6, "scale_x": 1.018, "scale_y": 0.982},
        {"angle": 3.4, "scale_x": 0.984, "scale_y": 1.026},
        {"angle": 1.7, "scale_x": 1.012, "scale_y": 1.0},
        {"angle": -2.8, "scale_x": 0.992, "scale_y": 1.018},
    ][frame_index % FRAMES]
    resized = sprite.resize(
        (
            max(1, round(sprite.width * pose["scale_x"])),
            max(1, round(sprite.height * pose["scale_y"])),
        ),
        Image.Resampling.LANCZOS,
    )
    rotated = resized.rotate(pose["angle"], resample=Image.Resampling.BICUBIC, expand=True)
    rotated = scrub_transparent_matte(rotated)
    bbox = alpha_bbox(rotated)
    return rotated.crop(bbox)


def raster_move_sheet_from_contact_sprite(cell_image: Image.Image, boss: bool) -> Image.Image:
    transparent = scrub_transparent_matte(remove_connected_chroma_background(cell_image))
    sprite = fit_raster_sprite(transparent, boss)
    sheet = Image.new("RGBA", (CELL * FRAMES, CELL), GREEN)
    offsets = [(-1, 0), (1, -2), (0, -1), (-1, 1)]
    for frame_index in range(FRAMES):
        posed = posed_raster_sprite(sprite, frame_index)
        if posed.width > 138 or posed.height > 144:
            scale = min(138 / posed.width, 144 / posed.height)
            posed = posed.resize((max(1, round(posed.width * scale)), max(1, round(posed.height * scale))), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (CELL, CELL), GREEN)
        offset_x, offset_y = offsets[frame_index]
        paste_x = round(CELL / 2 - posed.width / 2 + offset_x)
        paste_y = round(150 - posed.height + offset_y)
        frame.alpha_composite(posed, (paste_x, paste_y))
        sheet.alpha_composite(frame, (frame_index * CELL, 0))
    return sheet


def sheet_from_enemy_raster(tone_sheet: Image.Image, item_index: int, item: dict) -> Image.Image:
    cell_image = extract_raster_contact_cell(tone_sheet, item_index)
    return raster_move_sheet_from_contact_sprite(cell_image, bool(item.get("boss")))


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
        for variant, design in enumerate(tone["designs"], start=1):
            enemy_id = f"{tone['id']}-mob-{variant}"
            enemies.append(
                {
                    "id": enemy_id,
                    "type": "mob",
                    "name": design["name"],
                    "tone": tone["id"],
                    "motif": tone["motif"],
                    "form": design["form"],
                    "icon": design["icon"],
                    "variant": variant,
                    "boss": False,
                    "direction": "left",
                    "moveSheet": f"assets/visual-source/expedition-enemies/{enemy_id}-move.png",
                    "moveSheetLayout": {"columns": 4, "rows": 1, "cellWidth": CELL, "cellHeight": CELL, "cellMargin": 0},
                }
            )
        for variant, boss_design in enumerate(tone["bossDesigns"], start=1):
            boss_id = f"{tone['id']}-boss-{variant}"
            enemies.append(
                {
                    "id": boss_id,
                    "type": "boss",
                    "name": boss_design["name"],
                    "tone": tone["id"],
                    "motif": tone["motif"],
                    "form": boss_design["form"],
                    "icon": boss_design["icon"],
                    "variant": variant,
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

    enemy_items = manifest["families"][1]["items"]
    for tone in ENEMY_TONES:
        tone_sheet = Image.open(raster_sheet_path_for(tone["id"])).convert("RGBA")
        tone_items = [item for item in enemy_items if item["tone"] == tone["id"]]
        if len(tone_items) != 8:
            raise ValueError(f"원정대 {tone['id']} 몬스터 수가 8이 아닙니다: {len(tone_items)}")
        for item_index, item in enumerate(tone_items):
            sheet = sheet_from_enemy_raster(tone_sheet, item_index, item)
            sheet.save(ROOT / item["moveSheet"])

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PROFESSIONAL_SPRITE_SOURCES_OK companions={len(companion_items)} enemies={len(enemy_items)} enemySource=raster-png manifest={project_path(MANIFEST_PATH)}")


if __name__ == "__main__":
    main()
