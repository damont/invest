from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserThesisUpdate(BaseModel):
    content_md: str


class AiThesisCreate(BaseModel):
    content_md: str
    model: Optional[str] = None
    # Optional: set the recent-change note at creation time. If omitted on a new version,
    # the prior version's recent_change/recent_change_at are carried over.
    recent_change: Optional[str] = None


class AiThesisRecentChangeUpdate(BaseModel):
    """Independent update of the recent-change note on the latest AI thesis."""

    recent_change: Optional[str] = None


class AiThesisResponse(BaseModel):
    id: str
    content_md: str
    model: Optional[str]
    version: int
    generated_at: datetime
    recent_change: Optional[str] = None
    recent_change_at: Optional[datetime] = None


class ThesisResponse(BaseModel):
    """Combined view shown on the stock detail page."""

    user_md: str = ""
    user_updated_at: Optional[datetime] = None
    ai: Optional[AiThesisResponse] = None
