"""
JP/EN公式サイトからプロモカードを取得し、id でマージして DB UPSERT するスクリプト。

実行: python -m scripts.import_promos_jp  (backend/ ディレクトリから)

処理:
  1. JP公式 → 日本語情報取得 (name, effect_text, 数値フィールド)
  2. EN公式 → 英語情報取得 (name_en, effect_text_en)
  3. id でマージ（JP を基底に EN で英語フィールドを補完）
  4. DB UPSERT（COALESCE で既存の非 NULL 値を保護）
"""
from __future__ import annotations
import asyncio
import re
import sys
import urllib.request
import urllib.parse
import html as html_module
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import aiosqlite
from database import DB_PATH

JP_BASE = "https://www.onepiece-cardgame.com/cardlist/"
EN_BASE = "https://en.onepiece-cardgame.com/cardlist/"
IMAGE_BASE = "https://www.onepiece-cardgame.com/images/cardlist/card"

HEADERS_JP = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ja,en;q=0.9",
}
HEADERS_EN = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

# シリーズ選択肢のラベルがこのパターンにマッチすればプロモ系と判定
# 注意: "P-\d" は "[OP-01]" 等の通常弾ラベルにもマッチするため使用しない
_PROMO_RE = re.compile(r"PROMO|プロモ|ファミリー|FAMILY|ST-PROMO", re.IGNORECASE)

JP_COLOR_MAP = {
    "赤": "Red", "青": "Blue", "緑": "Green",
    "黄": "Yellow", "黒": "Black", "紫": "Purple",
}

JP_CATEGORY_MAP = {
    "リーダー": "Leader", "キャラクター": "Character",
    "イベント": "Event", "ステージ": "Stage", "DON!!": "DON!!",
}

# JP サイトの dt ラベル → フィールド名
JP_LABEL_MAP = {
    "レアリティ": "rarity",
    "種別": "category",
    "属性": "attribute",
    "コスト": "cost",
    "パワー": "power",
    "カウンター": "counter",
    "色": "color",
    "特徴": "sub_types",
    "ライフ": "life",
}

# EN サイトの dt ラベル → フィールド名
EN_LABEL_MAP = {
    "Rarity": "rarity",
    "Category": "category",
    "Type": "category",
    "Attribute": "attribute",
    "Cost": "cost",
    "Power": "power",
    "Counter": "counter",
    "Color": "color",
    "Feature": "sub_types",
    "Sub Type": "sub_types",
    "Life": "life",
}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _get(url: str, headers: dict) -> str:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def _post(base_url: str, series_id: str, headers: dict) -> str:
    data = urllib.parse.urlencode({"search": "true", "series": series_id}).encode()
    req = urllib.request.Request(base_url, data=data, headers={
        **headers, "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


# ---------------------------------------------------------------------------
# Series discovery
# ---------------------------------------------------------------------------

def _discover_promo_series(base_url: str, headers: dict) -> dict[str, str]:
    """サイトのシリーズ一覧からプロモ系を絞り込む {series_id: label}"""
    try:
        html = _get(base_url, headers)
    except Exception as e:
        print(f"  WARNING: シリーズ一覧の取得失敗 ({base_url}): {e}")
        return {}

    options = re.findall(r'<option\s+value="(\d+)"[^>]*>(.*?)</option>', html)
    result: dict[str, str] = {}
    for val, raw_label in options:
        if val == "0":
            continue
        label = html_module.unescape(raw_label).strip()
        if _PROMO_RE.search(label):
            result[val] = label
    return result


# ---------------------------------------------------------------------------
# HTML parser（JP / EN 共通構造）
# ---------------------------------------------------------------------------


def _safe_int(val: str | None) -> int | None:
    if not val or val.strip() in ("-", "", "NULL"):
        return None
    try:
        return int(re.sub(r"[^\d]", "", val))
    except ValueError:
        return None


def _clean(val: str | None) -> str | None:
    if not val:
        return None
    s = val.strip()
    return s if s and s not in ("-", "NULL") else None


def _map_color_jp(val: str | None) -> str | None:
    if not val or val.strip() == "-":
        return None
    parts = re.split(r"[/・]", val.strip())
    en = [JP_COLOR_MAP.get(p.strip(), p.strip()) for p in parts if p.strip()]
    return " ".join(en) if en else None


def _parse_cards_jp(html: str) -> dict[str, dict]:
    """JP公式プロモページ（div ベースレイアウト）をパースして {card_id: dict} を返す。

    プロモページは <div class="color">, <div class="cost"> 等の div 構造を使用しており、
    通常弾ページの dt/dd 構造とは異なる。
    """
    cards: dict[str, dict] = {}
    # id 属性が P-001 形式のものだけ取得（P-001_p2 等のバリアント版は _ を含むためスキップ）
    blocks = re.split(r'<dl[^>]+class="modalCol"[^>]+id="([A-Z0-9-]+)"', html)

    for i in range(1, len(blocks), 2):
        card_id = blocks[i].strip()
        content = blocks[i + 1] if i + 1 < len(blocks) else ""

        # DON!! は除外
        if "DON!!" in content[:500]:
            continue

        # カード名（日本語）
        name_m = re.search(r'class="cardName"[^>]*>(.*?)</div>', content, re.DOTALL)
        name_ja = re.sub(r"<[^>]+>", "", html_module.unescape(name_m.group(1))).strip() if name_m else None
        if not name_ja:
            continue

        # div クラスベースのフィールド抽出ヘルパー
        def _div_text(cls: str) -> str | None:
            m = re.search(
                rf'<div\s+class="{cls}"[^>]*>\s*(?:<h3>[^<]*</h3>)?(.*?)</div>',
                content, re.DOTALL
            )
            if not m:
                return None
            raw = re.sub(r"<[^>]+>", "", html_module.unescape(m.group(1)))
            return raw.strip() or None

        # 効果テキスト（<br> を改行に変換）
        text_m = re.search(
            r'<div\s+class="text"[^>]*>\s*(?:<h3>[^<]*</h3>)?(.*?)</div>',
            content, re.DOTALL
        )
        if text_m:
            raw = re.sub(r"<br\s*/?>", "\n", text_m.group(1))
            effect_text_ja = re.sub(r"<[^>]+>", "", html_module.unescape(raw)).strip() or None
        else:
            effect_text_ja = None

        # 色（日本語 → 英語マッピング）
        color = _map_color_jp(_div_text("color"))

        # 数値フィールド
        cost    = _safe_int(_div_text("cost"))
        power   = _safe_int(_div_text("power"))
        counter = _safe_int(_div_text("counter"))
        life    = _clean(_div_text("life"))

        # 特徴（サブタイプ）
        sub_types = _clean(_div_text("feature"))

        # 属性は <img alt="..."> から取得
        attr_m = re.search(
            r'<div\s+class="attribute"[^>]*>.*?<img[^>]+alt="([^"]*)"',
            content, re.DOTALL
        )
        attribute = _clean(html_module.unescape(attr_m.group(1))) if attr_m else None

        # カテゴリ: infoCol の 3 番目の <span>（英語表記）
        # 例: <span>P-001</span> | <span>P</span> | <span>CHARACTER</span>
        cat_m = re.search(
            r'class="infoCol"[^>]*>.*?<span>[^<]+</span>[^<]*\|[^<]*<span>[^<]+</span>[^<]*\|[^<]*<span>([^<]+)</span>',
            content, re.DOTALL
        )
        if cat_m:
            cat_raw = html_module.unescape(cat_m.group(1)).strip()
            category = JP_CATEGORY_MAP.get(cat_raw) or cat_raw.title()
        else:
            category = None

        if category == "DON!!":
            continue

        # レアリティ: infoCol の 2 番目の <span>（プロモは "P" → "PR"）
        rar_m = re.search(
            r'class="infoCol"[^>]*>.*?<span>[^<]+</span>[^<]*\|[^<]*<span>([^<]+)</span>',
            content, re.DOTALL
        )
        if rar_m:
            rar_raw = html_module.unescape(rar_m.group(1)).strip()
            rarity = "PR" if rar_raw == "P" else rar_raw
        else:
            rarity = "PR"

        set_m = re.match(r"^([A-Z]+)", card_id)
        card: dict = {
            "id": card_id,
            "name": name_ja,
            "name_en": None,
            "effect_text": effect_text_ja,
            "effect_text_en": None,
            "color": color,
            "cost": cost,
            "power": power,
            "counter": counter,
            "sub_types": sub_types,
            "attribute": attribute,
            "category": category,
            "rarity": rarity,
            "life": life,
            "set_code": set_m.group(1) if set_m else None,
            "image_url": f"{IMAGE_BASE}/{card_id}.png",
        }

        if card_id:
            cards[card_id] = card

    return cards


def _parse_cards_en(html: str) -> dict[str, dict]:
    """EN公式HTMLをパースして {card_id: {name, effect_text}} を返す"""
    cards: dict[str, dict] = {}
    blocks = re.split(r'<dl[^>]+class="modalCol"[^>]+id="([A-Z0-9-]+)"', html)

    for i in range(1, len(blocks), 2):
        card_id = blocks[i].strip()
        content = blocks[i + 1] if i + 1 < len(blocks) else ""

        # カード名（英語）
        name_m = re.search(r'class="cardName"[^>]*>(.*?)</div>', content, re.DOTALL)
        name = re.sub(r"<[^>]+>", "", html_module.unescape(name_m.group(1))).strip() if name_m else None

        # 効果テキスト（英語）
        text_m = re.search(
            r'class="text"[^>]*>.*?<h3>[^<]*</h3>(.*?)</div>', content, re.DOTALL
        )
        if text_m:
            raw = re.sub(r"<br\s*/?>", "\n", text_m.group(1))
            effect_text = re.sub(r"<[^>]+>", "", html_module.unescape(raw)).strip() or None
        else:
            effect_text = None

        if card_id and (name or effect_text):
            cards[card_id] = {"name_en": name, "effect_text_en": effect_text}

    return cards


# ---------------------------------------------------------------------------
# Fetch helpers
# ---------------------------------------------------------------------------

def _fetch_jp_series(series_id: str, label: str) -> dict[str, dict]:
    print(f"  JP [{label}] (id={series_id})...", end=" ", flush=True)
    try:
        html = _post(JP_BASE, series_id, HEADERS_JP)
        parsed = _parse_cards_jp(html)
        print(f"{len(parsed)} 件")
        return parsed
    except Exception as e:
        print(f"ERROR: {e}")
        return {}


def _fetch_en_series(series_id: str, label: str) -> dict[str, dict]:
    print(f"  EN [{label}] (id={series_id})...", end=" ", flush=True)
    try:
        html = _post(EN_BASE, series_id, HEADERS_EN)
        parsed = _parse_cards_en(html)
        print(f"{len(parsed)} 件")
        return parsed
    except Exception as e:
        print(f"ERROR: {e}")
        return {}


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------

def _merge(jp_cards: dict[str, dict], en_cards: dict[str, dict]) -> list[dict]:
    """JP を基底に EN の英語フィールドで補完してマージする"""
    all_ids = set(jp_cards) | set(en_cards)
    merged: list[dict] = []
    for card_id in all_ids:
        card = jp_cards.get(card_id, {"id": card_id})
        en = en_cards.get(card_id, {})
        if en.get("name_en"):
            card["name_en"] = en["name_en"]
        if en.get("effect_text_en"):
            card["effect_text_en"] = en["effect_text_en"]
        else:
            card.setdefault("effect_text_en", None)
        merged.append(card)
    return merged


# ---------------------------------------------------------------------------
# DB UPSERT
# ---------------------------------------------------------------------------

async def _upsert(db: aiosqlite.Connection, cards: list[dict]) -> tuple[int, int]:
    """挿入数・更新数を返す UPSERT。
    取得できた値のみで NULL を埋める（既存の非 NULL 値は COALESCE で保護する）。
    """
    inserted = updated = 0
    for card in cards:
        card_id = card["id"]
        async with db.execute("SELECT id FROM cards WHERE id=?", [card_id]) as cur:
            exists = await cur.fetchone()

        params = [
            card_id,
            card.get("name") or card.get("name_en") or card_id,
            card.get("name_en") or card.get("name") or card_id,  # NOT NULL 対応のフォールバック
            card.get("cost"),
            card.get("color"),
            card.get("category"),
            card.get("power"),
            card.get("counter"),
            card.get("effect_text"),
            card.get("effect_text_en"),
            card.get("image_url"),
            card.get("set_code"),
            card.get("sub_types"),
            card.get("attribute"),
            card.get("life"),
            card.get("rarity"),
        ]
        await db.execute(
            """INSERT INTO cards
               (id, name, name_en, cost, color, category, power, counter,
                effect_text, effect_text_en, image_url, set_code, sub_types, attribute, life, rarity)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                 name          = COALESCE(excluded.name,            name),
                 name_en       = COALESCE(excluded.name_en,         name_en),
                 cost          = COALESCE(excluded.cost,            cost),
                 color         = COALESCE(excluded.color,           color),
                 category      = COALESCE(excluded.category,        category),
                 power         = COALESCE(excluded.power,           power),
                 counter       = COALESCE(excluded.counter,         counter),
                 effect_text   = COALESCE(excluded.effect_text,     effect_text),
                 effect_text_en= COALESCE(excluded.effect_text_en,  effect_text_en),
                 image_url     = COALESCE(excluded.image_url,       image_url),
                 set_code      = COALESCE(excluded.set_code,        set_code),
                 sub_types     = COALESCE(excluded.sub_types,       sub_types),
                 attribute     = COALESCE(excluded.attribute,       attribute),
                 life          = COALESCE(excluded.life,            life),
                 rarity        = COALESCE(excluded.rarity,          rarity)""",
            params,
        )
        if exists:
            updated += 1
        else:
            inserted += 1

    return inserted, updated


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    # --- STEP 1: JP 取得 ---
    print("=== STEP 1: JP公式サイト ===")
    jp_series = _discover_promo_series(JP_BASE, HEADERS_JP)
    print(f"プロモ系シリーズ: {len(jp_series)} 件検出")

    jp_all: dict[str, dict] = {}
    for series_id, label in sorted(jp_series.items()):
        jp_all.update(_fetch_jp_series(series_id, label))

    print(f"JP合計: {len(jp_all)} 件")

    # --- STEP 2: EN 取得 ---
    print("\n=== STEP 2: EN公式サイト ===")
    en_series = _discover_promo_series(EN_BASE, HEADERS_EN)
    print(f"プロモ系シリーズ: {len(en_series)} 件検出")

    en_all: dict[str, dict] = {}
    for series_id, label in sorted(en_series.items()):
        en_all.update(_fetch_en_series(series_id, label))

    print(f"EN合計: {len(en_all)} 件")

    # --- STEP 3: マージ ---
    print("\n=== STEP 3: マージ ===")
    merged = _merge(jp_all, en_all)
    jp_only = sum(1 for c in merged if c["id"] not in en_all)
    en_only = sum(1 for c in merged if c["id"] not in jp_all)
    both = len(merged) - jp_only - en_only
    print(f"合計 {len(merged)} 件 (JP+EN: {both}, JPのみ: {jp_only}, ENのみ: {en_only})")

    # --- STEP 4: DB UPSERT ---
    print("\n=== STEP 4: DB UPSERT ===")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        db.row_factory = aiosqlite.Row
        inserted, updated = await _upsert(db, merged)
        await db.commit()

    print(f"完了: {inserted} 件新規追加, {updated} 件更新")


if __name__ == "__main__":
    asyncio.run(main())
