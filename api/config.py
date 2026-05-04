from typing import Optional
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "invest"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # Email / SMTP (Gmail — for password reset + email verification)
    smtp_email: Optional[str] = None
    smtp_app_password: Optional[str] = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    password_reset_expire_minutes: int = 60
    email_verification_expire_minutes: int = 60 * 24  # 24 hours

    # Frontend base URL (used in email links — password reset, email verification)
    frontend_base_url: str = "https://localhost:8100"

    # Google OAuth (single Client ID for backend audience verification + frontend button)
    google_client_id: Optional[str] = None

    @field_validator("frontend_base_url")
    @classmethod
    def _ensure_scheme(cls, v: str) -> str:
        if v and not v.startswith(("http://", "https://")):
            return f"https://{v}"
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
