"""
App configuration — pydantic-settings, loads from .env.

Referenced by:
- app/database.py (DATABASE_URL for the SQLAlchemy engine)
- app/services/auth_service.py (JWT_SECRET, JWT_ALGORITHM)
- app/auth/dependencies.py (JWT_SECRET, JWT_ALGORITHM — token validation)
- app/services/supabase_storage_service.py (SUPABASE_URL, SUPABASE_SERVICE_KEY)
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

    # --- Supabase Storage ---
    # SERVICE_KEY (not the anon/public key) — required since uploads/signed-URLs
    # go through the backend, not directly from the client, and the bucket is
    # private (service role bypasses RLS, which is fine here because ownership/
    # role checks already happen in the router before this key is ever used).
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str


@lru_cache
def get_settings() -> Settings:
    """Cached Settings instance — avoids re-parsing .env on every import."""
    return Settings()


settings = get_settings()