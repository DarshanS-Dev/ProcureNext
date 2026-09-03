import os
from functools import lru_cache


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/sih26136"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-env")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24  # locked: access-token-only, 24h expiry, no refresh


@lru_cache
def get_settings() -> Settings:
    return Settings()
