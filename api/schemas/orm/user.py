from datetime import datetime, timezone
from typing import Optional

import pymongo
from beanie import Document, Indexed
from pydantic import EmailStr, Field


class User(Document):
    email: Indexed(EmailStr, unique=True)
    username: Indexed(str, unique=True)
    hashed_password: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    google_sub: Optional[str] = None
    email_verified: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            # Partial filter (not sparse) — Pydantic Optional fields serialize as `null`,
            # not as missing, so sparse doesn't skip them. partialFilterExpression
            # constrains uniqueness to docs where google_sub is actually a string.
            pymongo.IndexModel(
                [("google_sub", pymongo.ASCENDING)],
                unique=True,
                partialFilterExpression={"google_sub": {"$type": "string"}},
                name="google_sub_unique_partial",
            ),
        ]
