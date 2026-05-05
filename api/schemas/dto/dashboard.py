from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from api.schemas.dto.stock import StockResponse


class DashboardThesis(BaseModel):
    """Subset of AiThesis surfaced on the dashboard."""

    content_md: str
    version: int
    generated_at: datetime
    recent_change: Optional[str] = None
    recent_change_at: Optional[datetime] = None


class DashboardSnapshot(BaseModel):
    """Subset of StockSnapshot surfaced on the dashboard."""

    price: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    avg_volume_30d: Optional[float] = None
    captured_at: datetime


class DashboardNews(BaseModel):
    headline: str
    url: str
    published_at: Optional[datetime] = None


class DashboardYouTube(BaseModel):
    title: str
    url: str
    channel: Optional[str] = None
    duration_seconds: Optional[int] = None
    published_at: Optional[datetime] = None
    curated_at: datetime


class DashboardStock(BaseModel):
    """Per-stock aggregation used by the dashboard view."""

    stock: StockResponse
    snapshot: Optional[DashboardSnapshot] = None
    # Last ~24 daily closes, oldest -> newest (ready for sparkline).
    spark: list[float] = []
    # Today's % change derived from the two most recent closes; null if insufficient data.
    change_pct: Optional[float] = None
    thesis: Optional[DashboardThesis] = None
    latest_news: Optional[DashboardNews] = None
    latest_video: Optional[DashboardYouTube] = None


class DashboardResponse(BaseModel):
    stocks: list[DashboardStock]
