from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserThesisUpdate(BaseModel):
    content_md: str


class AiThesisCreate(BaseModel):
    content_md: str
    model: Optional[str] = None


class AiThesisResponse(BaseModel):
    id: str
    content_md: str
    model: Optional[str]
    version: int
    generated_at: datetime


class ThesisResponse(BaseModel):
    """Combined view shown on the stock detail page."""

    user_md: str = ""
    user_updated_at: Optional[datetime] = None
    ai: Optional[AiThesisResponse] = None
