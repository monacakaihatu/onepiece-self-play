from __future__ import annotations
import aiosqlite
from contextlib import asynccontextmanager
from pathlib import Path

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

        await db.execute("""
            CREATE TABLE IF NOT EXISTS cards (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                cost            INTEGER,
                color           TEXT,
                category        TEXT,
                power           INTEGER,
                counter         INTEGER,
                effect_text     TEXT,
                image_url       TEXT,
                set_code        TEXT,
                sub_types       TEXT,
                attribute       TEXT,
                life            TEXT,
                rarity          TEXT,
                name_ja         TEXT,
                effect_text_ja  TEXT
            )
        """)
        # 既存DBへのマイグレーション
        for col, coltype in [("name_ja", "TEXT"), ("effect_text_ja", "TEXT")]:
            try:
                await db.execute(f"ALTER TABLE cards ADD COLUMN {col} {coltype}")
            except Exception:
                pass  # already exists

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
        await db.execute("CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id)")

        await db.commit()
