from datetime import datetime, timezone
from typing import Optional

import pymongo
from beanie import Document, Indexed
from pydantic import Field


class UserThesis(Document):
    """User-authored thesis for a stock. One per (stock, user)."""

    stock_id: Indexed(str)
    user_id: Indexed(str)
    content_md: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_theses"
        indexes = [
            pymongo.IndexModel(
                [("stock_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)],
                unique=True,
                name="user_thesis_per_stock_unique",
            ),
        ]


class AiThesis(Document):
    """Agent-generated thesis. Versioned per stock; latest version is "current".

    `recent_change` is a short note describing the most recent meaningful change to the
    thesis. It is updated independently from `content_md` so that regenerating the full
    thesis does not erase the change note. On a new version, `recent_change` and
    `recent_change_at` carry over from the prior version unless explicitly set.
    """

    stock_id: Indexed(str)
    content_md: str
    model: Optional[str] = None
    version: int = 1
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    recent_change: Optional[str] = None
    recent_change_at: Optional[datetime] = None

    class Settings:
        name = "ai_theses"
