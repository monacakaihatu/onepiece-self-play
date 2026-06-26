from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db
from models import Card

router = APIRouter(prefix="/cards", tags=["cards"])

_SORT_MAP = {
    "id":         "id ASC",
    "id_desc":    "id DESC",
    "cost_asc":   "cost IS NULL, cost ASC",
    "cost_desc":  "cost IS NULL, cost DESC",
    "power_asc":  "power IS NULL, power ASC",
    "power_desc": "power IS NULL, power DESC",
    "name":       "COALESCE(name, name_en) ASC",
    "set":        "set_code IS NULL, set_code ASC, id ASC",
}


def _safe_get(row, key):
    try:
        return row[key]
    except (IndexError, KeyError):
        return None


def row_to_card(row) -> Card:
    return Card(
        id=row["id"],
        name=_safe_get(row, "name"),
        name_en=_safe_get(row, "name_en"),
        cost=row["cost"],
        color=row["color"],
        category=row["category"],
        power=row["power"],
        counter=row["counter"],
        effect_text=_safe_get(row, "effect_text"),
        effect_text_en=_safe_get(row, "effect_text_en"),
        image_url=row["image_url"],
        set_code=row["set_code"],
        sub_types=row["sub_types"],
        attribute=row["attribute"],
        life=row["life"],
        rarity=row["rarity"],
    )


@router.get("", response_model=dict)
async def list_cards(
    q: Optional[str] = None,
    color: list[str] = Query(default=[]),
    cost: list[int] = Query(default=[]),
    category: list[str] = Query(default=[]),
    exclude_category: list[str] = Query(default=[]),
    set_code: list[str] = Query(default=[]),
    rarity: list[str] = Query(default=[]),
    sub_types: Optional[str] = None,
    sort: str = "id",
    limit: int = 100,
    offset: int = 0,
):
    conditions = ["1=1"]
    params: list = []

    if q:
        conditions.append("(name LIKE ? OR name_en LIKE ? OR id LIKE ? OR effect_text LIKE ? OR effect_text_en LIKE ? OR sub_types LIKE ?)")
        params += [f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"]

    if color:
        color_conditions = " OR ".join(["(' ' || color || ' ') LIKE ?" for _ in color])
        conditions.append(f"({color_conditions})")
        params += [f"% {c} %" for c in color]

    if cost:
        placeholders = ",".join("?" * len(cost))
        conditions.append(f"cost IN ({placeholders})")
        params += cost

    if category:
        placeholders = ",".join("?" * len(category))
        conditions.append(f"category IN ({placeholders})")
        params += category

    if exclude_category:
        placeholders = ",".join("?" * len(exclude_category))
        conditions.append(f"category NOT IN ({placeholders})")
        params += exclude_category

    if set_code:
        placeholders = ",".join("?" * len(set_code))
        conditions.append(f"set_code IN ({placeholders})")
        params += set_code

    if rarity:
        placeholders = ",".join("?" * len(rarity))
        conditions.append(f"rarity IN ({placeholders})")
        params += rarity

    if sub_types:
        conditions.append("sub_types LIKE ?")
        params += [f"%{sub_types}%"]

    where = " AND ".join(conditions)
    order_by = _SORT_MAP.get(sort, "id ASC")

    async with get_db() as db:
        async with db.execute(
            f"SELECT COUNT(*) as cnt FROM cards WHERE {where}", params
        ) as cur:
            total = (await cur.fetchone())["cnt"]

        async with db.execute(
            f"SELECT * FROM cards WHERE {where} ORDER BY {order_by} LIMIT ? OFFSET ?",
            params + [limit, offset],
        ) as cur:
            rows = await cur.fetchall()

    return {"total": total, "items": [row_to_card(r).model_dump() for r in rows]}


@router.get("/{card_id}", response_model=Card)
async def get_card(card_id: str):
    async with get_db() as db:
        async with db.execute("SELECT * FROM cards WHERE id = ?", [card_id]) as cur:
            row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Card not found")

    return row_to_card(row)
