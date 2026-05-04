from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class YouTubeLinkCreate(BaseModel):
    title: str
    url: str
    channel: Optional[str] = None
    notes: Optional[str] = None
    duration_seconds: Optional[int] = None
    published_at: Optional[datetime] = None


class YouTubeLinkUpdate(BaseModel):
    watched: Optional[bool] = None
    notes: Optional[str] = None


class YouTubeLinkResponse(BaseModel):
    id: str
    title: str
    url: str
    channel: Optional[str]
    notes: Optional[str]
    duration_seconds: Optional[int]
    watched: bool
    published_at: Optional[datetime]
    curated_at: datetime
