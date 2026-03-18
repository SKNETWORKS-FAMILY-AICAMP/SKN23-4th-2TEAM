import os
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

import psycopg2
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1].parent
load_dotenv(ROOT_DIR / '.env')


def _env_first(*keys: str, default: Optional[str] = None) -> Optional[str]:
    for key in keys:
        value = os.getenv(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return default


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)
    return value if value is not None else default


def _build_db_config() -> dict:
    if _to_bool(_get_env("SSH_TUNNEL_ENABLED", "false"), default=False):
        host = _env_first("SSH_LOCAL_BIND_HOST", default="127.0.0.1")
        port = int(_env_first("SSH_LOCAL_BIND_PORT", default="15432"))
    else:
        host = _env_first("DB_HOST", _env_first("PGHOST", "localhost"))
        port = int(_env_first("DB_PORT", _env_first("PGPORT", "5432")))

    return {
        'host': host,
        'port': port,
        'dbname': _get_env('PGDATABASE', 'postgres'),
        'user': _get_env('PGUSER', 'postgres'),
        'password': _get_env('PGPASSWORD', ''),
        'sslmode': _get_env('PGSSLMODE', 'prefer'),
        'connect_timeout': int(_get_env('PGCONNECT_TIMEOUT', '5')),
    }


def _build_conn_kwargs() -> dict:
    cfg = _build_db_config()
    return {k: v for k, v in cfg.items() if v}


@contextmanager
def get_db_connection():
    conn = psycopg2.connect(**_build_conn_kwargs())
    try:
        # Force timezone to Asia/Seoul for uniform stats & logs aggregation over Dates
        with conn.cursor() as cur:
            cur.execute("SET TIME ZONE 'Asia/Seoul'")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
