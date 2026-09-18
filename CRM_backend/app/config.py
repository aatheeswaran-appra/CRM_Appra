"""Validated environment configuration; no credentials in log output."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    database_url: SecretStr
    port: int = 4000
    app_env: str = "development"
    cors_origin: str = ""
    app_timezone: str = "Asia/Kolkata"

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: SecretStr) -> SecretStr:
        try:
            url = make_url(value.get_secret_value())
            if url.get_backend_name() not in {"postgresql", "postgres"} or not url.database:
                raise ValueError
            url = url.set(drivername="postgresql+psycopg")
        except Exception:
            raise ValueError(
                "DATABASE_URL must be a PostgreSQL URL with a database name."
            ) from None
        return SecretStr(url.render_as_string(hide_password=False))

    @field_validator("port")
    @classmethod
    def port_range(cls, value: int) -> int:
        if not 1 <= value <= 65535:
            raise ValueError("PORT must be between 1 and 65535.")
        return value

    @field_validator("app_timezone")
    @classmethod
    def business_timezone(cls, value: str) -> str:
        if value != "Asia/Kolkata":
            raise ValueError("APP_TIMEZONE must be Asia/Kolkata.")
        return value

    @field_validator("app_env")
    @classmethod
    def environment(cls, value: str) -> str:
        if value not in {"development", "test", "production"}:
            raise ValueError("APP_ENV must be development, test, or production.")
        return value

    @field_validator("cors_origin")
    @classmethod
    def validate_origins(cls, value: str) -> str:
        from urllib.parse import urlsplit

        for origin in [item.strip() for item in value.split(",") if item.strip()]:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
            ):
                raise ValueError(
                    "CORS_ORIGIN must contain comma-separated HTTP(S) origins without paths."
                )
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origin.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
