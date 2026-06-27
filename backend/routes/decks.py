from __future__ import annotations
from fastapi import APIRouter, HTTPException
from database import get_db
from models import (
    DeckCreate, DeckUpdate, DeckSummary, DeckDetail, DeckCardItem, DeckCardsUpdate
)
from routes.cards import row_to_card

router = APIRouter(prefix="/decks", tags=["decks"])


def _parse_colors(color_str) -> set:
    if not color_str:
        return set()
    return set(color_str.split())


async def _validate_deck(db, leader: Card, cards: list[DeckCardItem]) -> list[str]:
    errors = []

    total = sum(item.quantity for item in cards)
    if total > 50:
        errors.append(f"メインデッキは50枚以内にしてください（現在 {total} 枚）")

    name_counts: dict[str, int] = {}
    for item in cards:
        name_counts[item.card.name] = name_counts.get(item.card.name, 0) + item.quantity
    for name, cnt in name_counts.items():
        if cnt > 4:
            errors.append(f"「{name}」が {cnt} 枚入っています（上限4枚）")

    leader_colors = _parse_colors(leader.color)
    for item in cards:
        card_colors = _parse_colors(item.card.color)
        if not card_colors.issubset(leader_colors):
            diff = card_colors - leader_colors
            errors.append(f"「{item.card.name}」の色 {', '.join(diff)} はリーダーの色に含まれません")

    return errors


async def _fetch_card(db, card_id: str):
    async with db.execute("SELECT * FROM cards WHERE id = ?", [card_id]) as cur:
        row = await cur.fetchone()
    return row_to_card(row) if row else None


async def _fetch_deck_cards(db, deck_id: int) -> list[DeckCardItem]:
    async with db.execute(
        """SELECT c.*, dc.quantity FROM cards c
           JOIN deck_cards dc ON c.id = dc.card_id
           WHERE dc.deck_id = ?
           ORDER BY c.id""",
        [deck_id],
    ) as cur:
        rows = await cur.fetchall()

    items = []
    for row in rows:
        items.append(DeckCardItem(card=row_to_card(row), quantity=row["quantity"]))
    return items


@router.get("", response_model=list[DeckSummary])
async def list_decks():
    async with get_db() as db:
        async with db.execute(
            """SELECT d.*, COALESCE(SUM(dc.quantity), 0) as total_cards
               FROM decks d
               LEFT JOIN deck_cards dc ON d.id = dc.deck_id
               GROUP BY d.id
               ORDER BY d.updated_at DESC"""
        ) as cur:
            deck_rows = await cur.fetchall()

        results = []
        for row in deck_rows:
            leader = await _fetch_card(db, row["leader_id"])
            results.append(DeckSummary(
                id=row["id"], name=row["name"], leader_id=row["leader_id"],
                leader=leader, total_cards=row["total_cards"],
                created_at=row["created_at"], updated_at=row["updated_at"],
            ))
    return results


@router.post("", response_model=DeckSummary, status_code=201)
async def create_deck(body: DeckCreate):
    async with get_db() as db:
        leader = await _fetch_card(db, body.leader_id)
        if not leader:
            raise HTTPException(status_code=404, detail="Leader card not found")
        if leader.category != "Leader":
            raise HTTPException(status_code=422, detail="指定されたカードはリーダーカードではありません")

        async with db.execute(
            "INSERT INTO decks (name, leader_id) VALUES (?, ?)",
            [body.name, body.leader_id],
        ) as cur:
            deck_id = cur.lastrowid
        await db.commit()

        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()

    return DeckSummary(
        id=row["id"], name=row["name"], leader_id=row["leader_id"],
        leader=leader, total_cards=0,
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_deck(deck_id: int):
    async with get_db() as db:
        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deck not found")

        leader = await _fetch_card(db, row["leader_id"])
        cards = await _fetch_deck_cards(db, deck_id)

    return DeckDetail(
        id=row["id"], name=row["name"], leader_id=row["leader_id"],
        leader=leader, cards=cards,
        total_cards=sum(c.quantity for c in cards),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.put("/{deck_id}", response_model=DeckSummary)
async def update_deck(deck_id: int, body: DeckUpdate):
    async with get_db() as db:
        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deck not found")

        name = body.name if body.name is not None else row["name"]
        leader_id = body.leader_id if body.leader_id is not None else row["leader_id"]

        if body.leader_id:
            leader = await _fetch_card(db, body.leader_id)
            if not leader:
                raise HTTPException(status_code=404, detail="Leader card not found")
            if leader.category != "Leader":
                raise HTTPException(status_code=422, detail="指定されたカードはリーダーカードではありません")

        await db.execute(
            "UPDATE decks SET name=?, leader_id=?, updated_at=datetime('now') WHERE id=?",
            [name, leader_id, deck_id],
        )
        await db.commit()

        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        leader = await _fetch_card(db, row["leader_id"])

        async with db.execute(
            "SELECT COALESCE(SUM(quantity),0) as total FROM deck_cards WHERE deck_id=?",
            [deck_id],
        ) as cur:
            total = (await cur.fetchone())["total"]

    return DeckSummary(
        id=row["id"], name=row["name"], leader_id=row["leader_id"],
        leader=leader, total_cards=total,
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(deck_id: int):
    async with get_db() as db:
        async with db.execute("SELECT id FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deck not found")
        await db.execute("DELETE FROM decks WHERE id = ?", [deck_id])
        await db.commit()


@router.put("/{deck_id}/cards", response_model=DeckDetail)
async def update_deck_cards(deck_id: int, body: DeckCardsUpdate):
    """
    デッキ内カードを更新する。
    save=True のときのみデッキバリデーションを実施し、違反があれば422を返す。
    quantity=0 のエントリは削除として扱う。
    """
    async with get_db() as db:
        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deck not found")

        leader = await _fetch_card(db, row["leader_id"])
        if not leader:
            raise HTTPException(status_code=404, detail="Leader card not found")

        for entry in body.cards:
            if entry.quantity <= 0:
                await db.execute(
                    "DELETE FROM deck_cards WHERE deck_id=? AND card_id=?",
                    [deck_id, entry.card_id],
                )
            else:
                await db.execute(
                    """INSERT INTO deck_cards (deck_id, card_id, quantity)
                       VALUES (?, ?, ?)
                       ON CONFLICT(deck_id, card_id) DO UPDATE SET quantity=excluded.quantity""",
                    [deck_id, entry.card_id, entry.quantity],
                )

        if body.save:
            cards = await _fetch_deck_cards(db, deck_id)
            errors = await _validate_deck(db, leader, cards)
            if errors:
                await db.rollback()
                raise HTTPException(status_code=422, detail={"errors": errors})

        await db.execute(
            "UPDATE decks SET updated_at=datetime('now') WHERE id=?", [deck_id]
        )
        await db.commit()

        async with db.execute("SELECT * FROM decks WHERE id = ?", [deck_id]) as cur:
            row = await cur.fetchone()
        cards = await _fetch_deck_cards(db, deck_id)

    return DeckDetail(
        id=row["id"], name=row["name"], leader_id=row["leader_id"],
        leader=leader, cards=cards,
        total_cards=sum(c.quantity for c in cards),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )
