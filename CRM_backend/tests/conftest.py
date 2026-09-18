import os
import re
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from sqlalchemy import Engine, text

from app.config import Settings, get_settings
from app.database import make_engine, utc_now
from app.main import create_app

ROOT = Path(__file__).resolve().parent.parent
NOW = datetime(2026, 9, 18, 6, 30, tzinfo=UTC)  # Noon in Asia/Kolkata.


@pytest.fixture(scope="session")
def database_engine() -> Iterator[Engine]:
    try:
        url = os.environ.get("TEST_DATABASE_URL") or get_settings().database_url.get_secret_value()
    except ValidationError:
        pytest.skip("Set DATABASE_URL or TEST_DATABASE_URL to run PostgreSQL integration tests.")
    settings = Settings(database_url=SecretStr(url))
    admin = make_engine(settings.database_url.get_secret_value())
    schema = f"appra_test_{uuid4().hex}"
    assert re.fullmatch(r"appra_test_[a-f0-9]{32}", schema)
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = make_engine(
        settings.database_url.get_secret_value(),
        connect_args={"options": f"-csearch_path={schema}"},
    )
    try:
        config = Config(str(ROOT / "alembic.ini"))
        with engine.begin() as connection:
            assert connection.scalar(text("SELECT current_schema()")) == schema
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        yield engine
    finally:
        engine.dispose()
        # The only schema removed is the random schema created by this fixture.
        assert re.fullmatch(r"appra_test_[a-f0-9]{32}", schema)
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


@pytest.fixture
def engine(database_engine: Engine) -> Engine:
    with database_engine.begin() as connection:
        schema = connection.scalar(text("SELECT current_schema()"))
        assert isinstance(schema, str) and re.fullmatch(r"appra_test_[a-f0-9]{32}", schema)
        connection.execute(text("TRUNCATE follow_ups, customers RESTART IDENTITY CASCADE"))
    return database_engine


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    settings = Settings(
        database_url=SecretStr("postgresql+psycopg://test@localhost/test"),
        cors_origin="http://localhost:3000",
        app_env="test",
    )
    app = create_app(settings, engine)
    app.dependency_overrides[utc_now] = lambda: NOW
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def payload() -> dict[str, object]:
    return {
        "name": " Arun Kumar ",
        "phone": " 09876543210 ",
        "requirement": " Website Development ",
        "source": "WEBSITE",
        "location": " Coimbatore ",
        "notes": " Interested in a website ",
        "followUp": {"date": "2026-09-18", "time": "10:30", "preferredContact": "WHATSAPP"},
    }
