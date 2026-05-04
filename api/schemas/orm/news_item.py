from datetime import datetime, timezone
from typing import Literal, Optional

import pymongo
from beanie import Document, Indexed
from pydantic import Field


NewsTag = Literal["recent", "long_term"]
Sentiment = Literal["bullish", "bearish", "neutral", "mixed"]


class NewsItem(Document):
    stock_id: Indexed(str)
    headline: str
    source: str
    url: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    tag: NewsTag = "recent"
    sentiment: Optional[Sentiment] = None
    relevance_score: Optional[float] = None  # 0..1
    is_read: bool = False
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "news_items"
        indexes = [
            pymongo.IndexModel(
                [("stock_id", pymongo.ASCENDING), ("url", pymongo.ASCENDING)],
                unique=True,
                name="news_url_per_stock_unique",
            ),
        ]
