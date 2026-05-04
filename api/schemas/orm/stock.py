from datetime import datetime, timezone
from typing import Optional

import pymongo
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class RelatedStock(BaseModel):
    """A ticker related to this stock. May or may not be tracked in the user's watchlist."""

    ticker: str
    name: Optional[str] = None
    relation: Optional[str] = None  # free-form: "competitor", "supplier", "customer", etc.


class Stock(Document):
    user_id: Indexed(str)
    ticker: Indexed(str)
    name: str
    sector: Optional[str] = None
    exchange: Optional[str] = None

    related: list[RelatedStock] = []

    archived: bool = False
    pinned: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "stocks"
        indexes = [
            pymongo.IndexModel(
                [("user_id", pymongo.ASCENDING), ("ticker", pymongo.ASCENDING)],
                unique=True,
                name="user_ticker_unique",
            ),
        ]
