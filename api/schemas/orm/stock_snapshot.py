from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class StockSnapshot(Document):
    """Point-in-time vitals for a stock. Latest snapshot is the "current" view.

    Every field optional so agents can fill what they have without breaking the schema.
    """

    stock_id: Indexed(str)
    price: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    high_all_time: Optional[float] = None
    low_all_time: Optional[float] = None
    avg_volume_30d: Optional[int] = None
    shares_outstanding: Optional[int] = None
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "stock_snapshots"
