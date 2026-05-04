from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from api.schemas.orm.stock import RelatedStock


class StockCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=12)
    name: str
    sector: Optional[str] = None
    exchange: Optional[str] = None
    related: list[RelatedStock] = []


class StockUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None
    related: Optional[list[RelatedStock]] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    sort_order: Optional[int] = None


class StockResponse(BaseModel):
    id: str
    ticker: str
    name: str
    sector: Optional[str]
    exchange: Optional[str]
    related: list[RelatedStock]
    archived: bool
    pinned: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
