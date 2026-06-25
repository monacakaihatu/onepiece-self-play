"""
初回のカードデータを optcgapi.com から取得して SQLite に保存するスクリプト。
使い方: python scripts/import_cards.py
"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

import httpx
import aiosqlite

DB_PATH = Path(__file__).parent.parent / "db" / "cards.db"
IMAGE_BASE = "https://www.onepiece-cardgame.com/images/cardlist/card"

ENDPOINTS = [
    "https://www.optcgapi.com/api/allSetCards/",
    "https://www.optcgapi.com/api/allPromoCards/",
]


def _safe_int(val):
    if val is None:
        return None
    try:
        return int(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _clean_text(val):
    if val is None or str(val).strip().upper() == "NULL":
        return None
    return str(val).strip() or None


def _map_card(raw: dict) -> dict | None:
    card_type = raw.get("card_type", "")
    if card_type == "DON!!":
        return None

    card_id = raw.get("card_set_id", "").strip()
    if not card_id:
        return None

    image_id = raw.get("card_image_id") or card_id
    image_url = f"{IMAGE_BASE}/{image_id}.png"

    name_en = _clean_text(raw.get("card_name")) or card_id
    effect_text_en = _clean_text(raw.get("card_text"))
    return {
        "id": card_id,
        "name": name_en,          # JP インポート前の仮名（後で上書きされる）
        "name_en": name_en,
        "cost": _safe_int(raw.get("card_cost")),
        "color": _clean_text(raw.get("card_color")),
        "category": _clean_text(card_type),
        "power": _safe_int(raw.get("card_power")),
        "counter": _safe_int(raw.get("counter_amount")),
        "effect_text": effect_text_en,  # JP インポート前の仮テキスト
        "effect_text_en": effect_text_en,
        "image_url": image_url,
        "set_code": _clean_text(raw.get("set_id")),
        "sub_types": _clean_text(raw.get("sub_types")),
        "attribute": _clean_text(raw.get("attribute")),
        "life": _clean_text(raw.get("life")),
        "rarity": _clean_text(raw.get("rarity")),
    }


async def fetch_cards(url: str) -> list[dict]:
    print(f"Fetching {url} ...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
    print(f"  -> {len(data)} records received")
    return data


async def init_schema(db: aiosqlite.Connection):
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    await db.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            id              TEXT PRIMARY KEY,
            name            TEXT,
            name_en         TEXT,
            cost            INTEGER,
            color           TEXT,
            category        TEXT,
            power           INTEGER,
            counter         INTEGER,
            effect_text     TEXT,
            effect_text_en  TEXT,
            image_url       TEXT,
            set_code        TEXT,
            sub_types       TEXT,
            attribute       TEXT,
            life            TEXT,
            rarity          TEXT
        )
    """)
    for col, coltype in [("name_en", "TEXT"), ("effect_text_en", "TEXT")]:
        try:
            await db.execute(f"ALTER TABLE cards ADD COLUMN {col} {coltype}")
        except Exception:
            pass
    await db.execute("""
        CREATE TABLE IF NOT EXISTS decks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            leader_id   TEXT NOT NULL REFERENCES cards(id),
            created_at  DATETIME DEFAULT (datetime('now')),
            updated_at  DATETIME DEFAULT (datetime('now'))
        )
    """)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS deck_cards (
            deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
            card_id     TEXT    NOT NULL REFERENCES cards(id),
            quantity    INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (deck_id, card_id)
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_color    ON cards(color)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_cost     ON cards(cost)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id)")
    await db.commit()


async def main():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    all_raw: list[dict] = []
    for url in ENDPOINTS:
        try:
            all_raw.extend(await fetch_cards(url))
        except Exception as e:
            print(f"WARNING: Failed to fetch {url}: {e}", file=sys.stderr)

    mapped = [_map_card(r) for r in all_raw]
    cards = [c for c in mapped if c is not None]

    seen: dict[str, dict] = {}
    for card in cards:
        cid = card["id"]
        if cid not in seen:
            seen[cid] = card

    unique_cards = list(seen.values())
    print(f"\nTotal unique cards to import: {len(unique_cards)}")

    async with aiosqlite.connect(DB_PATH) as db:
        await init_schema(db)

        inserted = 0
        for card in unique_cards:
            await db.execute(
                """INSERT INTO cards
                   (id, name, name_en, cost, color, category, power, counter,
                    effect_text, effect_text_en, image_url, set_code, sub_types, attribute, life, rarity)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET
                     name_en=excluded.name_en,
                     cost=excluded.cost,
                     color=excluded.color,
                     category=excluded.category,
                     power=excluded.power,
                     counter=excluded.counter,
                     effect_text_en=excluded.effect_text_en,
                     image_url=excluded.image_url,
                     set_code=excluded.set_code,
                     sub_types=excluded.sub_types,
                     attribute=excluded.attribute,
                     life=excluded.life,
                     rarity=excluded.rarity""",
                [
                    card["id"], card["name"], card["name_en"], card["cost"], card["color"],
                    card["category"], card["power"], card["counter"],
                    card["effect_text"], card["effect_text_en"], card["image_url"], card["set_code"],
                    card["sub_types"], card["attribute"], card["life"], card["rarity"],
                ],
            )
            inserted += 1

        await db.commit()

    print(f"Done! {inserted} cards saved to {DB_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
