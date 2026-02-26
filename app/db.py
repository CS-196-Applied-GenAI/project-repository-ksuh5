"""
Database engine and session factory.

Configuration is driven entirely by the DATABASE_URL environment variable.
No domain models are defined here yet.
"""

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL: str | None = os.environ.get("DATABASE_URL")

# Engine is None when DATABASE_URL is absent (e.g. during unit tests that
# don't need a real database).  Callers that need the engine must check first.
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None

AsyncSessionLocal: async_sessionmaker[AsyncSession] | None = (
    async_sessionmaker(engine, expire_on_commit=False) if engine else None
)


class Base(DeclarativeBase):
    """Declarative base that all SQLAlchemy models will inherit from."""


async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency that yields an async DB session."""
    if AsyncSessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    async with AsyncSessionLocal() as session:
        yield session
