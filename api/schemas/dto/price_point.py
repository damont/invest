from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel


class PricePointCreate(BaseModel):
    date: Date
    open: float
    close: float
    high: float
    low: float
    volume: int


class PricePointResponse(BaseModel):
    id: str
    date: Date
    open: float
    close: float
    high: float
    low: float
    volume: int
    captured_at: datetime


class PricePointBulkCreate(BaseModel):
    points: list[PricePointCreate]
