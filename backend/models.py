from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Card(BaseModel):
    id: str
    name: Optional[str] = None
    name_en: Optional[str] = None
    cost: Optional[int] = None
    color: Optional[str] = None
    category: Optional[str] = None
    power: Optional[int] = None
    counter: Optional[int] = None
    effect_text: Optional[str] = None
    effect_text_en: Optional[str] = None
    image_url: Optional[str] = None
    set_code: Optional[str] = None
    sub_types: Optional[str] = None
    attribute: Optional[str] = None
    life: Optional[str] = None
    rarity: Optional[str] = None


class DeckCardEntry(BaseModel):
    card_id: str
    quantity: int


class DeckCreate(BaseModel):
    name: str
    leader_id: str


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    leader_id: Optional[str] = None


class DeckCardItem(BaseModel):
    card: Card
    quantity: int


class DeckSummary(BaseModel):
    id: int
    name: str
    leader_id: str
    leader: Optional[Card] = None
    total_cards: int
    created_at: str
    updated_at: str


class DeckDetail(BaseModel):
    id: int
    name: str
    leader_id: str
    leader: Optional[Card] = None
    cards: list[DeckCardItem]
    total_cards: int
    created_at: str
    updated_at: str


class DeckCardsUpdate(BaseModel):
    cards: list[DeckCardEntry]
    save: bool = False
