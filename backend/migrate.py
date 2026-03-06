"""
Corsair — SQL Migration Runner

Applies numbered .sql files from the migrations/ directory in order.
Tracks applied migrations in a `schema_migrations` table.

Usage:
    python migrate.py                        # apply pending migrations
    python migrate.py --status               # show migration status
    DATABASE_URL=postgres://... python migrate.py
"""
from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

import re

import asyncpg

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

BOOTSTRAP_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version  VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def _parse_database_url(url: str) -> dict:
    """Convert a postgres:// URL into asyncpg connect kwargs.

    Parses with regex to avoid urllib IPv6 errors when the password
    contains special characters like brackets.
    """
    pattern = r"postgres(?:ql)?://(?P<user>[^:]+):(?P<password>.+)@(?P<host>[^:/]+)(?::(?P<port>\d+))?/(?P<database>.+)"
    m = re.match(pattern, url)
    if not m:
        # Fallback: let asyncpg try the DSN directly
        return {"dsn": url.replace("postgres://", "postgresql://", 1)}
    kwargs: dict = {
        "host": m.group("host"),
        "port": int(m.group("port")) if m.group("port") else 5432,
        "user": m.group("user"),
        "password": m.group("password"),
        "database": m.group("database"),
    }
    return kwargs


def _discover_migrations() -> list[Path]:
    """Return .sql files from the migrations directory, sorted by filename."""
    if not MIGRATIONS_DIR.is_dir():
        return []
    files = sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda p: p.name)
    return files


async def _get_applied(conn: asyncpg.Connection) -> set[str]:
    rows = await conn.fetch("SELECT version FROM schema_migrations ORDER BY version")
    return {row["version"] for row in rows}


async def _apply(conn: asyncpg.Connection, migration: Path) -> None:
    sql = migration.read_text(encoding="utf-8")
    await conn.execute(sql)
    await conn.execute(
        "INSERT INTO schema_migrations (version) VALUES ($1)", migration.name
    )


async def run_migrations(database_url: str) -> None:
    conn_kwargs = _parse_database_url(database_url)
    conn = await asyncpg.connect(**conn_kwargs)
    try:
        await conn.execute(BOOTSTRAP_SQL)

        applied = await _get_applied(conn)
        migrations = _discover_migrations()
        pending = [m for m in migrations if m.name not in applied]

        if not pending:
            logger.info("Database is up to date.")
            return

        for migration in pending:
            logger.info("Applying %s ...", migration.name)
            await _apply(conn, migration)
            logger.info("  done.")

        logger.info("Applied %d migration(s).", len(pending))
    finally:
        await conn.close()


async def show_status(database_url: str) -> None:
    conn_kwargs = _parse_database_url(database_url)
    conn = await asyncpg.connect(**conn_kwargs)
    try:
        await conn.execute(BOOTSTRAP_SQL)
        applied = await _get_applied(conn)
        migrations = _discover_migrations()

        for m in migrations:
            status = "applied" if m.name in applied else "pending"
            logger.info("  [%s]  %s", status, m.name)

        if not migrations:
            logger.info("  No migration files found.")
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Corsair SQL migration runner")
    parser.add_argument("--status", action="store_true", help="Show migration status")
    args = parser.parse_args()

    database_url = os.environ.get(
        "DATABASE_URL", "postgres://corsair:corsair@localhost:5432/corsair"
    )

    import asyncio

    if args.status:
        asyncio.run(show_status(database_url))
    else:
        asyncio.run(run_migrations(database_url))


if __name__ == "__main__":
    main()
