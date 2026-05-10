"""
Configuration management for Crime-Connect backend.
All settings are loaded from environment variables via .env file.
"""

from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # =========================
    # App Configuration
    # =========================
    app_name: str = "crime-connect"
    debug: bool = True
    secret_key: str = "supersecretkey"

    # =========================
    # JWT Configuration
    # =========================
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # =========================
    # PostgreSQL Configuration
    # =========================
    database_url: str = "postgresql://postgres:postgres@localhost:5432/crimeconnect"

    # =========================
    # Neo4j Configuration
    # =========================
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    neo4j_database: Optional[str] = None
    neo4j_accounts: Optional[str] = None

    # =========================
    # Groq Configuration
    # =========================
    groq_api_key: str

    # =========================
    # Redis Configuration
    # =========================
    redis_url: str = "redis://localhost:6379/0"

    # =========================
    # ChromaDB Configuration
    # =========================
    chroma_persist_dir: str = "./chroma_db"

    # =========================
    # CORS Configuration
    # =========================
    frontend_url: str = "http://localhost:5173"

    # =========================
    # Gemini Configuration
    # =========================
    # Gemini OCR
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash-preview-04-17"
    
    # Gemini Timeline
    gemini_timeline_api_key: Optional[str] = None
    gemini_timeline_model: str = "gemini-2.5-flash"

    # =========================
    # Google OAuth Configuration
    # =========================
    google_client_secret_path: str = "./secrets/client_secret.json"

    class Config:
        env_file = ".env"
        case_sensitive = False   # Allow uppercase env vars to map to lowercase fields
        extra = "ignore"        # prevents crash on extra env vars


# Singleton instance
settings = Settings()