"""
Integration tests for the health endpoint and DB connectivity.
"""

import os

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

# ---------------------------------------------------------------------------
# Test 1 — health endpoint
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_health_ok() -> None:
    """GET /api/v1/health should return 200 and {"status": "ok"}."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Test 2 — DB connectivity
# ---------------------------------------------------------------------------

_DB_URL = os.environ.get("DATABASE_URL")


@pytest.mark.anyio
@pytest.mark.skipif(
    not _DB_URL,
    reason="DATABASE_URL not set — skipping DB connectivity test. "
    "Set DATABASE_URL=postgresql+asyncpg://... to run.",
)
async def test_db_connectivity() -> None:
    """Verify that we can open an async session and execute a trivial query."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    assert _DB_URL is not None  # narrowing for type-checkers
    eng = create_async_engine(_DB_URL, pool_pre_ping=True)
    async with eng.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        row = result.scalar()
    await eng.dispose()
    assert row == 1
