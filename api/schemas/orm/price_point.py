from datetime import date, datetime, timezone

import pymongo
from beanie import Document, Indexed
from pydantic import Field


class PricePoint(Document):
    """Daily OHLCV bar for a stock. Append-only time series; index by (stock_id, date)."""

    stock_id: Indexed(str)
    date: date
    open: float
    close: float
    high: float
    low: float
    volume: int
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "price_points"
        indexes = [
            pymongo.IndexModel(
                [("stock_id", pymongo.ASCENDING), ("date", pymongo.DESCENDING)],
                unique=True,
                name="price_per_stock_per_day",
            ),
        ]
