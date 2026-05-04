from datetime import datetime, timezone
from typing import Optional

import pymongo
from beanie import Document, Indexed
from pydantic import Field


class YouTubeLink(Document):
    stock_id: Indexed(str)
    title: str
    url: str
    channel: Optional[str] = None
    notes: Optional[str] = None
    duration_seconds: Optional[int] = None
    watched: bool = False
    published_at: Optional[datetime] = None
    curated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "youtube_links"
        indexes = [
            pymongo.IndexModel(
                [("stock_id", pymongo.ASCENDING), ("url", pymongo.ASCENDING)],
                unique=True,
                name="youtube_url_per_stock_unique",
            ),
        ]
