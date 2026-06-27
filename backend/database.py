from __future__ import annotations
import aiosqlite
from contextlib import asynccontextmanager
from pathlib import Path
from sets import SET_INFO, get_block, get_expansion_name

DB_PATH = Path(__file__).parent / "db" / "cards.db"


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        yield db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        # 旧スキーマ (name_ja カラムあり) → 新スキーマへ自動マイグレーション
        async with db.execute("PRAGMA table_info(cards)") as cur:
            existing_cols = {row[1] for row in await cur.fetchall()}
        if "name_ja" in existing_cols:
            await db.execute("ALTER TABLE cards RENAME COLUMN name TO name_en")
            await db.execute("ALTER TABLE cards RENAME COLUMN effect_text TO effect_text_en")
            await db.execute("ALTER TABLE cards RENAME COLUMN name_ja TO name")
            await db.execute("ALTER TABLE cards RENAME COLUMN effect_text_ja TO effect_text")
            await db.execute(
                "UPDATE cards SET name = COALESCE(name, name_en, id) WHERE name IS NULL"
            )

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
                rarity          TEXT,
                block           TEXT,
                expansion_name  TEXT
            )
        """)
        # 欠けているカラムを補完
        for col, coltype in [
            ("name_en", "TEXT"), ("effect_text_en", "TEXT"),
            ("block", "TEXT"), ("expansion_name", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE cards ADD COLUMN {col} {coltype}")
            except Exception:
                pass

        # block / expansion_name を set_code から一括補完
        await db.execute("""
            UPDATE cards SET
                block = CASE set_code
                    WHEN 'OP01' THEN 'S1' WHEN 'OP02' THEN 'S1' WHEN 'OP03' THEN 'S1'
                    WHEN 'OP04' THEN 'S2' WHEN 'OP05' THEN 'S2' WHEN 'OP06' THEN 'S2'
                    WHEN 'OP07' THEN 'S3' WHEN 'OP08' THEN 'S3' WHEN 'OP09' THEN 'S3'
                    WHEN 'OP10' THEN 'S4'
                    WHEN 'ST01' THEN 'S1' WHEN 'ST02' THEN 'S1' WHEN 'ST03' THEN 'S1' WHEN 'ST04' THEN 'S1'
                    WHEN 'ST05' THEN 'S2' WHEN 'ST06' THEN 'S2' WHEN 'ST07' THEN 'S2' WHEN 'ST08' THEN 'S2'
                    WHEN 'ST09' THEN 'S2' WHEN 'ST10' THEN 'S2' WHEN 'ST11' THEN 'S2' WHEN 'ST12' THEN 'S2'
                    WHEN 'ST13' THEN 'S3' WHEN 'ST14' THEN 'S3' WHEN 'ST15' THEN 'S3' WHEN 'ST16' THEN 'S3'
                    WHEN 'ST17' THEN 'S3' WHEN 'ST18' THEN 'S3' WHEN 'ST19' THEN 'S3'
                    WHEN 'ST20' THEN 'S4' WHEN 'ST21' THEN 'S4'
                    WHEN 'EB01' THEN 'PROMO'
                    ELSE 'PROMO'
                END
            WHERE block IS NULL AND set_code IS NOT NULL
        """)

        # image_url を EN → JP サイトに更新
        await db.execute(
            "UPDATE cards SET image_url = REPLACE(image_url, "
            "'https://en.onepiece-cardgame.com', 'https://www.onepiece-cardgame.com') "
            "WHERE image_url LIKE 'https://en.onepiece-cardgame.com%'"
        )

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
        await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_block    ON cards(block)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id)")

        await db.commit()
