from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


NewsTag = Literal["recent", "long_term"]
Sentiment = Literal["bullish", "bearish", "neutral", "mixed"]


class NewsCreate(BaseModel):
    headline: str
    source: str
    url: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    tag: NewsTag = "recent"
    sentiment: Optional[Sentiment] = None
    relevance_score: Optional[float] = None


class NewsUpdate(BaseModel):
    is_read: Optional[bool] = None
    sentiment: Optional[Sentiment] = None
    relevance_score: Optional[float] = None
    tag: Optional[NewsTag] = None


class NewsResponse(BaseModel):
    id: str
    headline: str
    source: str
    url: str
    summary: Optional[str]
    published_at: Optional[datetime]
    tag: NewsTag
    sentiment: Optional[Sentiment]
    relevance_score: Optional[float]
    is_read: bool
    ingested_at: datetime
