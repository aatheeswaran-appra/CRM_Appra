from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session


def make_engine(url: str, **kwargs: object) -> Engine:
    return create_engine(
        url,
        pool_pre_ping=True,
        isolation_level="REPEATABLE READ",
        **kwargs,
    )


def get_session(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine, expire_on_commit=False) as session:
        yield session


def utc_now() -> datetime:
    return datetime.now(UTC)


SessionDep = Annotated[Session, Depends(get_session)]
NowDep = Annotated[datetime, Depends(utc_now)]
