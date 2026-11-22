"""
APPLICATION CONFIGURATION
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "MindEase"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    SECRET_KEY: str = "mindease_super_secret_key_change_me_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    DATABASE_URL: str = "sqlite:///./mindease.db"
    CHROMA_DB_PATH: str = "./chroma_db"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_LLM_MODEL: str = "phi3"

    WHISPER_MODEL_SIZE: str = "small"
    WHISPER_DEVICE: str = "cpu"

    FREE_TIER_DAILY_MESSAGES: int = 50
    PREMIUM_TIER_DAILY_MESSAGES: int = 999999

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
