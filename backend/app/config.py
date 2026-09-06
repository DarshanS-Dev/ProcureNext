"""
App configuration — pydantic-settings, loads from .env.

Referenced by:
- app/database.py (DATABASE_URL for the SQLAlchemy engine)
- app/services/auth_service.py (JWT_SECRET, JWT_ALGORITHM)
- app/auth/dependencies.py (JWT_SECRET, JWT_ALGORITHM — token validation)
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---
    DATABASE_URL: str

    # --- Auth / JWT ---
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 24 * 60 * 60  # 24h, no refresh token (Doc B Layer 1 #6)

    # --- App-level ---
    ENVIRONMENT: str = "development"  # development / production
    DEBUG: bool = True

    GROQ_API_KEY: str


@lru_cache
def get_settings() -> Settings:
    """Cached Settings instance — avoids re-parsing .env on every import."""
    return Settings()


settings = get_settings()