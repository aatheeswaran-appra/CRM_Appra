"""Alembic reads DATABASE_URL from the same settings as the API."""

from alembic import context
from sqlalchemy import Connection

from app.config import get_settings
from app.database import make_engine
from app.models import Base

config = context.config
target_metadata = Base.metadata


def run_with_connection(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(
        url=get_settings().database_url.get_secret_value(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
elif "connection" in config.attributes:
    run_with_connection(config.attributes["connection"])
else:
    engine = make_engine(get_settings().database_url.get_secret_value())
    with engine.connect() as connection:
        run_with_connection(connection)
    engine.dispose()
