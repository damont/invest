from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StockSnapshotCreate(BaseModel):
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


class StockSnapshotResponse(StockSnapshotCreate):
    id: str
    captured_at: datetime
