import os
import asyncio
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
load_dotenv(PROJECT_ROOT / '.env')

def _env_first(*keys: str, default: str | None = None) -> str | None:
    for key in keys:
        value = os.getenv(key)
        if value:
            return value
    return default

def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}

def _get_pg_settings() -> dict:
    if _to_bool(os.getenv('SSH_TUNNEL_ENABLED'), default=False):
        host = _env_first('SSH_LOCAL_BIND_HOST', default='127.0.0.1')
        port = int(_env_first('SSH_LOCAL_BIND_PORT', default='15432'))
    else:
        host = _env_first("DB_HOST", _env_first('PGHOST', default='localhost'))
        port = int(_env_first("DB_PORT", _env_first('PGPORT', default='5432')))

    return {
        'host': host,
        'port': port,
        'dbname': _env_first('PGDATABASE', 'PG_DB'),
        'user': _env_first('PGUSER', 'PG_USER'),
        'password': _env_first('PGPASSWORD', 'PG_PASSWORD'),
        'sslmode': _env_first('PGSSLMODE', default='require'),
        'connect_timeout': int(_env_first('PGCONNECT_TIMEOUT', default='5')),
    }

# 비동기 커넥션 객체 생성
async def _connect_postgres():
    import psycopg
    pg_settings = _get_pg_settings()
    # 비동기 연결 (AsyncConnection) 사용
    return await psycopg.AsyncConnection.connect(**pg_settings)

# 비동기 다중 행 조회
async def _fetch_all(query: str, params: tuple | None = None) -> list[dict]:
    import psycopg.rows
    conn = await _connect_postgres()
    try:
        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(query, params or ())
            rows = await cur.fetchall()
            return [dict(row) for row in rows]
    finally:
        await conn.close()

# 비동기 단일 행 조회
async def _fetch_one(query: str, params: tuple | None = None) -> dict:
    import psycopg.rows
    conn = await _connect_postgres()
    try:
        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(query, params or ())
            row = await cur.fetchone()
            return dict(row) if row else {}
    finally:
        await conn.close()

async def fetch_dashboard_summary() -> dict:
    query = """
    WITH total_device_count AS (
        SELECT COUNT(*)::int AS total_devices
        FROM robot_devices
    ),
    ongoing_device_count AS (
        SELECT COUNT(DISTINCT device_id)::int AS ongoing_devices
        FROM robot_error_sessions
        WHERE final_status = 'ongoing'
    ),
    session_counts AS (
        SELECT
            COUNT(*)::int AS total_errors,
            COUNT(*) FILTER (WHERE final_status = 'resolved')::int AS resolved_count,
            COUNT(*) FILTER (WHERE final_status = 'ongoing')::int AS ongoing_count
        FROM robot_error_sessions
    )
    SELECT
        s.total_errors,
        s.resolved_count,
        s.ongoing_count,
        CASE
            WHEN d.total_devices = 0 THEN 0
            ELSE ROUND(((d.total_devices - o.ongoing_devices)::numeric / d.total_devices) * 100, 1)
        END AS total_devices
    FROM session_counts AS s
    CROSS JOIN total_device_count AS d
    CROSS JOIN ongoing_device_count AS o
    """
    return await _fetch_one(query)

async def fetch_line_trends(days: int = 7, line_name: str | None = None, error_code: str | None = None) -> list[dict]:
    where_clauses = ["DATE(timezone('Asia/Seoul', l.occurred_at)) >= DATE(timezone('Asia/Seoul', CURRENT_TIMESTAMP)) - (%s::int - 1)"]
    params: list = [days]
    if line_name:
        where_clauses.append('d.line_name = %s')
        params.append(line_name)
    if error_code:
        where_clauses.append('l.error_code = %s')
        params.append(error_code)

    query = f"""
    SELECT
        DATE(timezone('Asia/Seoul', l.occurred_at)) AS occurred_at,
        d.line_name,
        COUNT(l.error_log_id)::int AS error_count
    FROM robot_error_logs AS l
    JOIN robot_devices AS d ON d.device_id = l.device_id
    WHERE {' AND '.join(where_clauses)}
    GROUP BY DATE(timezone('Asia/Seoul', l.occurred_at)), d.line_name
    ORDER BY occurred_at ASC, d.line_name ASC
    """
    rows = await _fetch_all(query, tuple(params))
    grouped: dict[str, dict] = {}
    for row in rows:
        date_key = str(row.get('occurred_at'))
        payload = grouped.setdefault(date_key, {'occurred_at': date_key})
        payload[f"line_name_{row.get('line_name', '-')}"] = row.get('error_count', 0)
    return list(grouped.values())

async def fetch_recent_logs(limit: int = 5, line_name: str | None = None, error_code: str | None = None, final_status: str | None = None) -> list[dict]:
    where_clauses = ['1=1']
    params: list = []
    if line_name:
        where_clauses.append('d.line_name = %s')
        params.append(line_name)
    if error_code:
        where_clauses.append('l.error_code = %s')
        params.append(error_code)
    if final_status:
        where_clauses.append("COALESCE(s.final_status, 'no_session') = %s")
        params.append(final_status)

    query = f"""
    SELECT
        l.error_log_id,
        l.occurred_at,
        d.device_id,
        l.error_code,
        d.line_name,
        COALESCE(s.final_status, 'no_session') AS final_status
    FROM robot_error_logs AS l
    JOIN robot_devices AS d ON d.device_id = l.device_id
    LEFT JOIN LATERAL (
        SELECT s.final_status
        FROM robot_error_sessions AS s
        WHERE s.error_log_id = l.error_log_id
        ORDER BY s.last_updated_at DESC
        LIMIT 1
    ) AS s ON TRUE
    WHERE {' AND '.join(where_clauses)}
    ORDER BY l.occurred_at DESC
    LIMIT %s
    """
    params.append(limit)
    return await _fetch_all(query, tuple(params))

async def fetch_top_errors(limit: int = 5, days: int = 7, line_name: str | None = None) -> list[dict]:
    where_clauses = ["DATE(timezone('Asia/Seoul', l.occurred_at)) >= DATE(timezone('Asia/Seoul', CURRENT_TIMESTAMP)) - (%s::int - 1)"]
    params: list = [days]
    if line_name:
        where_clauses.append('d.line_name = %s')
        params.append(line_name)

    query = f"""
    SELECT
        l.error_code,
        COUNT(l.error_log_id)::int AS error_count
    FROM robot_error_logs AS l
    JOIN robot_devices AS d ON d.device_id = l.device_id
    WHERE {' AND '.join(where_clauses)}
    GROUP BY l.error_code
    ORDER BY error_count DESC, l.error_code ASC
    LIMIT %s
    """
    params.append(limit)
    return await _fetch_all(query, tuple(params))

async def fetch_lines(line_name: str | None = None, final_status: str | None = None) -> list[dict]:
    where_clauses = ['1=1']
    params: list = []
    if line_name:
        where_clauses.append('d.line_name = %s')
        params.append(line_name)
    if final_status:
        where_clauses.append("COALESCE(latest_session.final_status, 'normal') = %s")
        params.append(final_status)

    query = f"""
    SELECT
        d.device_id,
        d.line_name,
        d.line_num,
        latest_log.error_code,
        latest_log.occurred_at,
        COALESCE(latest_session.final_status, 'normal') AS final_status
    FROM robot_devices AS d
    LEFT JOIN LATERAL (
        SELECT
            s.final_status,
            s.error_log_id,
            s.last_updated_at,
            s.session_id
        FROM robot_error_sessions AS s
        WHERE s.device_id = d.device_id
        ORDER BY s.last_updated_at DESC, s.session_id DESC
        LIMIT 1
    ) AS latest_session ON TRUE
    LEFT JOIN robot_error_logs AS latest_log
        ON latest_log.error_log_id = latest_session.error_log_id
    WHERE {' AND '.join(where_clauses)}
    ORDER BY d.line_name ASC, d.line_num ASC, d.device_id ASC
    """
    return await _fetch_all(query, tuple(params))

async def fetch_stats(days: int = 30, line_name: str | None = None, error_code: str | None = None) -> list[dict]:
    where_clauses = ["DATE(timezone('Asia/Seoul', l.occurred_at)) >= DATE(timezone('Asia/Seoul', CURRENT_TIMESTAMP)) - (%s::int - 1)"]
    params: list = [days]
    if line_name:
        where_clauses.append('d.line_name = %s')
        params.append(line_name)
    if error_code:
        where_clauses.append('l.error_code = %s')
        params.append(error_code)

    query = f"""
    SELECT
        DATE(timezone('Asia/Seoul', l.occurred_at)) AS occurred_at,
        d.line_name,
        COUNT(l.error_log_id)::int AS error_count
    FROM robot_error_logs AS l
    JOIN robot_devices AS d ON d.device_id = l.device_id
    WHERE {' AND '.join(where_clauses)}
    GROUP BY DATE(timezone('Asia/Seoul', l.occurred_at)), d.line_name
    ORDER BY occurred_at DESC, d.line_name ASC
    """
    return await _fetch_all(query, tuple(params))

# 가장 중요한 변경점: 여러 쿼리를 동시에 병렬(Parallel) 실행!
async def collect_manager_data(plan: dict) -> dict:
    filters = dict(plan.get('filters') or {})
    datasets = list(plan.get('datasets') or [])
    line_name = filters.get('line_name')
    error_code = filters.get('error_code')
    final_status = filters.get('final_status')
    days = int(filters.get('days') or 7)
    limit = int(filters.get('limit') or 5)

    # 실행할 비동기 작업들을 모아둡니다.
    tasks = {}
    if 'summary' in datasets:
        tasks['summary'] = fetch_dashboard_summary()
    if 'line_trends' in datasets:
        tasks['line_trends'] = fetch_line_trends(days=days, line_name=line_name, error_code=error_code)
    if 'recent_logs' in datasets:
        tasks['recent_logs'] = fetch_recent_logs(limit=limit, line_name=line_name, error_code=error_code, final_status=final_status)
    if 'top_errors' in datasets:
        tasks['top_errors'] = fetch_top_errors(limit=limit, days=days, line_name=line_name)
    if 'lines' in datasets:
        tasks['lines'] = fetch_lines(line_name=line_name, final_status=final_status)
    if 'stats' in datasets:
        tasks['stats'] = fetch_stats(days=days, line_name=line_name, error_code=error_code)

    if not tasks:
        return {}

    # asyncio.gather를 사용해 모든 쿼리를 DB에 "동시에" 날립니다. (응답 속도 비약적 상승)
    keys = list(tasks.keys())
    results = await asyncio.gather(*tasks.values())
    
    return dict(zip(keys, results))
