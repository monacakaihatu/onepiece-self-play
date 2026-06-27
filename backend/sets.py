"""収録弾・ブロック対応表"""
from __future__ import annotations

SET_INFO: dict[str, dict[str, str]] = {
    "OP01": {"name": "ROMANCE DAWN",        "block": "S1"},
    "OP02": {"name": "頂上決戦",             "block": "S1"},
    "OP03": {"name": "強大な敵",             "block": "S1"},
    "OP04": {"name": "王国の陰謀",           "block": "S2"},
    "OP05": {"name": "新時代の夜明け",       "block": "S2"},
    "OP06": {"name": "双璧の覇者",           "block": "S2"},
    "OP07": {"name": "500年後の未来",        "block": "S3"},
    "OP08": {"name": "二つの伝説",           "block": "S3"},
    "OP09": {"name": "四皇",                 "block": "S3"},
    "OP10": {"name": "王の血脈",             "block": "S4"},
    "ST01": {"name": "ST-01 麦わらの一味",   "block": "S1"},
    "ST02": {"name": "ST-02 最悪の世代",     "block": "S1"},
    "ST03": {"name": "ST-03 七武海",         "block": "S1"},
    "ST04": {"name": "ST-04 動物系能力者",   "block": "S1"},
    "ST05": {"name": "ST-05 FILM",           "block": "S2"},
    "ST06": {"name": "ST-06 世界政府",       "block": "S2"},
    "ST07": {"name": "ST-07 赤紫ルフィ",     "block": "S2"},
    "ST08": {"name": "ST-08 ヤマト",         "block": "S2"},
    "ST09": {"name": "ST-09 ヤミとひかり",   "block": "S2"},
    "ST10": {"name": "ST-10 ビッグ・マム",   "block": "S2"},
    "ST11": {"name": "ST-11 麦わらの一味 2", "block": "S2"},
    "ST12": {"name": "ST-12 3D2Y",           "block": "S2"},
    "ST13": {"name": "ST-13 東の海",         "block": "S3"},
    "ST14": {"name": "ST-14 3キャプテン",    "block": "S3"},
    "ST15": {"name": "ST-15 黒黄ルフィ",     "block": "S3"},
    "ST16": {"name": "ST-16 黒紫ルフィ",     "block": "S3"},
    "ST17": {"name": "ST-17 紫黄ヤマト",     "block": "S3"},
    "ST18": {"name": "ST-18 赤緑ゾロ",       "block": "S3"},
    "ST19": {"name": "ST-19 白ひげ海賊団",   "block": "S3"},
    "ST20": {"name": "ST-20 四皇 vol.1",     "block": "S4"},
    "ST21": {"name": "ST-21 四皇 vol.2",     "block": "S4"},
    "EB01": {"name": "EXTRA BOOSTER",        "block": "PROMO"},
}

import re as _re


def get_block(set_code: str | None) -> str | None:
    if not set_code:
        return None
    if set_code in SET_INFO:
        return SET_INFO[set_code]["block"]
    m = _re.match(r"^OP(\d+)", set_code)
    if m:
        n = int(m.group(1))
        if n <= 3: return "S1"
        if n <= 6: return "S2"
        if n <= 9: return "S3"
        return "S4"
    m = _re.match(r"^ST(\d+)", set_code)
    if m:
        n = int(m.group(1))
        if n <= 4:  return "S1"
        if n <= 12: return "S2"
        if n <= 19: return "S3"
        return "S4"
    return "PROMO"


def get_expansion_name(set_code: str | None) -> str | None:
    if not set_code:
        return None
    return SET_INFO.get(set_code, {}).get("name")
