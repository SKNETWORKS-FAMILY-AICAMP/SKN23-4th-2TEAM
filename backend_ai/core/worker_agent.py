import json
import os
import sys

from dotenv import load_dotenv
from langchain_core.documents import Document
from prompts import ASSESS_PROMPT, EXTRACT_PROMPT

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

COLLECTION_NAME = os.getenv('PGVECTOR_COLLECTION_NAME', 'welding_robotics_manuals')
HYBRID_BM25_WEIGHT = 0.8
HYBRID_VECTOR_WEIGHT = 0.2
_SSH_TUNNEL = None


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
    return {
        'host': _env_first('PGHOST', 'PG_HOST'),
        'port': int(_env_first('PGPORT', 'PG_PORT', default='5432')),
        'database': _env_first('PGDATABASE', 'PG_DB'),
        'user': _env_first('PGUSER', 'PG_USER'),
        'password': _env_first('PGPASSWORD', 'PG_PASSWORD'),
        'sslmode': _env_first('PGSSLMODE', default='require'),
        'connect_timeout': int(_env_first('PGCONNECT_TIMEOUT', default='5')),
    }


def _start_ssh_tunnel_if_needed(pg_settings: dict):
    global _SSH_TUNNEL

    if not _to_bool(os.getenv('SSH_TUNNEL_ENABLED'), default=False):
        return pg_settings['host'], pg_settings['port']

    if _SSH_TUNNEL and getattr(_SSH_TUNNEL, 'is_active', False):
        return '127.0.0.1', _SSH_TUNNEL.local_bind_port

    from sshtunnel import SSHTunnelForwarder

    ssh_host = os.getenv('SSH_HOST')
    ssh_port = int(os.getenv('SSH_PORT', '22'))
    ssh_user = os.getenv('SSH_USER')
    ssh_key_path = os.getenv('SSH_PRIVATE_KEY_PATH')
    ssh_key_passphrase = os.getenv('SSH_PRIVATE_KEY_PASSPHRASE')
    ssh_allow_agent = _to_bool(os.getenv('SSH_ALLOW_AGENT'), default=False)
    local_bind_port = int(os.getenv('SSH_LOCAL_BIND_PORT', '15432'))
    remote_bind_host = os.getenv('SSH_REMOTE_BIND_HOST', pg_settings['host'])
    remote_bind_port = int(os.getenv('SSH_REMOTE_BIND_PORT', str(pg_settings['port'])))

    if not all([ssh_host, ssh_user]):
        raise ValueError('SSH_TUNNEL_ENABLED=true 인데 SSH_HOST 또는 SSH_USER가 없습니다.')
    if not ssh_key_path and not ssh_allow_agent:
        raise ValueError('SSH 터널 연결에는 SSH_PRIVATE_KEY_PATH 또는 SSH_ALLOW_AGENT=true가 필요합니다.')

    tunnel_kwargs = {
        'ssh_address_or_host': (ssh_host, ssh_port),
        'ssh_username': ssh_user,
        'remote_bind_address': (remote_bind_host, remote_bind_port),
        'local_bind_address': ('127.0.0.1', local_bind_port),
        'allow_agent': ssh_allow_agent,
    }
    if ssh_key_path:
        tunnel_kwargs['ssh_pkey'] = ssh_key_path
    if ssh_key_passphrase:
        tunnel_kwargs['ssh_private_key_password'] = ssh_key_passphrase

    _SSH_TUNNEL = SSHTunnelForwarder(**tunnel_kwargs)
    _SSH_TUNNEL.start()
    return '127.0.0.1', _SSH_TUNNEL.local_bind_port


def _connect_postgres():
    import psycopg

    pg_settings = _get_pg_settings()
    host, port = _start_ssh_tunnel_if_needed(pg_settings)
    return psycopg.connect(
        host=host,
        port=port,
        dbname=pg_settings['database'],
        user=pg_settings['user'],
        password=pg_settings['password'],
        sslmode=pg_settings['sslmode'],
        connect_timeout=pg_settings['connect_timeout'],
    )


def _build_chat_llm():
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(model='gpt-4o-mini', temperature=0)


def _call_json_llm(prompt: str, fallback: dict) -> dict:
    llm = _build_chat_llm()
    response = llm.invoke(prompt)
    content = response.content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return fallback


def search_manual(query: str, k: int = 2):
    normalized_query = query.strip().upper()
    exact_sql = '''
        SELECT e.document, e.cmetadata
        FROM public.langchain_pg_embedding AS e
        JOIN public.langchain_pg_collection AS c
          ON e.collection_id = c.uuid
        WHERE c.name = %s
          AND %s = ANY(
            regexp_split_to_array(
              regexp_replace(UPPER(e.document), '[^A-Z0-9]+', ' ', 'g'),
              '\\s+'
            )
          )
        LIMIT %s
    '''

    with _connect_postgres() as conn:
        with conn.cursor() as cur:
            cur.execute(exact_sql, (COLLECTION_NAME, normalized_query, k))
            rows = cur.fetchall()

    return [
        Document(page_content=row[0] or '', metadata=row[1] or {})
        for row in rows
    ]


def search_manual_with_ranking(query: str, k: int = 2):
    normalized_query = query.strip().upper()
    exact_docs = search_manual(normalized_query, k=max(k, 2))

    try:
        try:
            from .retriever import get_hybrid_retriever
        except ImportError:
            from retriever import get_hybrid_retriever

        hybrid_retriever = get_hybrid_retriever(
            query=normalized_query,
            collection_name=COLLECTION_NAME,
            vector_weight=HYBRID_VECTOR_WEIGHT,
            bm25_weight=HYBRID_BM25_WEIGHT,
            k=max(k, 5),
        )
        hybrid_docs = hybrid_retriever.invoke(normalized_query)
    except Exception:
        hybrid_docs = []

    combined_docs = []
    seen = set()
    for doc in [*exact_docs, *hybrid_docs]:
        metadata = getattr(doc, 'metadata', {}) or {}
        signature = (doc.page_content, tuple(sorted((str(key), str(value)) for key, value in metadata.items())))
        if signature in seen:
            continue
        seen.add(signature)
        combined_docs.append(doc)

    try:
        try:
            from .reranker import rerank_documents
        except ImportError:
            from reranker import rerank_documents

        reranked_docs, has_match, _ = rerank_documents(
            normalized_query,
            combined_docs,
            top_n=max(k, 2),
        )
        if has_match and reranked_docs:
            return reranked_docs[:k]
    except Exception:
        pass

    return combined_docs[:k] if combined_docs else exact_docs[:k]


def make_context_from_docs(docs):
    if not docs:
        return '검색 결과 없음'

    contexts = []
    for i, doc in enumerate(docs, 1):
        contexts.append(
            f'[문서 {i}]\n'
            f'metadata: {doc.metadata}\n'
            f'content:\n{doc.page_content[:1200]}'
        )
    return '\n\n'.join(contexts)


def _normalize_action_lines(action_value) -> list[str]:
    if isinstance(action_value, list):
        items = [str(item).strip() for item in action_value if str(item).strip()]
    else:
        raw = str(action_value or '').strip()
        items = [line.strip('- •\n ') for line in raw.splitlines() if line.strip()]
    return items or ['문서 기준 우선 확인 필요']


def _extract_cause_and_actions(error_code: str, manual_context: str) -> dict:
    prompt = EXTRACT_PROMPT.format(
        error_code=error_code,
        manual_context=manual_context,
    )
    fallback = {
        'cause_analysis': '문서 기준 상세 원인 확인 필요',
        'action_method': ['문서 기준 우선 확인 필요'],
        'matched': False,
    }
    payload = _call_json_llm(prompt, fallback)
    payload.setdefault('cause_analysis', fallback['cause_analysis'])
    payload.setdefault('action_method', fallback['action_method'])
    payload.setdefault('matched', False)
    return payload


def _assess_urgency_and_time(error_code: str, cause_analysis: str, action_method: list[str]) -> dict:
    prompt = ASSESS_PROMPT.format(
        error_code=error_code,
        cause_analysis=cause_analysis,
        action_method='\n'.join(f'- {item}' for item in action_method),
    )
    fallback = {
        'urgency_level': '보통',
        'urgency_text': '문서 기준 우선 확인 필요',
        'expected_action_time': '문서 기준 우선 확인 필요',
    }
    payload = _call_json_llm(prompt, fallback)
    payload.setdefault('urgency_level', fallback['urgency_level'])
    payload.setdefault('urgency_text', fallback['urgency_text'])
    payload.setdefault('expected_action_time', fallback['expected_action_time'])
    return payload


def _rule_based_urgency(cause: str, actions: list[str], llm_level: str, llm_text: str) -> tuple[str, str]:
    combined = ' '.join([cause, *actions]).lower()

    high_keywords = [
        '과열', '온도 스위치', '화재', '발화', '연소', '불꽃', '폭발', '감전',
        '과전류', '단선', '앰프', '서지전압', '전원 이상', '쇼트', '합선',
        'overheat', 'overheating', 'fire', 'flame', 'smoke', 'burn',
        'overcurrent', 'short', 'surge', 'amp',
    ]
    low_keywords = [
        '설정', '재설정', '파라미터', '조정', '재시도',
    ]

    if any(keyword in combined for keyword in high_keywords):
        return '높음', '과열 또는 전기적 위험 가능성이 있어 즉각적인 점검과 조치가 필요합니다.'

    if any(keyword in combined for keyword in low_keywords):
        return '낮음', '설정 또는 상태 조정 중심의 조치로 대응 가능한 수준입니다.'

    normalized = llm_level.strip()
    if normalized not in {'높음', '보통', '낮음'}:
        normalized = '보통'
    return normalized, llm_text.strip() or '문서 기준 우선 확인 필요'


def _format_urgency(level: str, text: str) -> str:
    normalized = level.strip()
    if normalized == '높음':
        icon = '🛑'
    elif normalized == '낮음':
        icon = '🟢'
    else:
        normalized = '보통'
        icon = '🟡'
    return f'{icon} {normalized} - {text.strip()}'


def format_worker_response(error_code: str, payload: dict) -> str:
    cause = str(payload.get('cause_analysis') or '문서 기준 상세 원인 확인 필요').strip()
    urgency_level = str(payload.get('urgency_level') or '보통').strip()
    urgency_text = str(payload.get('urgency_text') or '문서 기준 우선 확인 필요').strip()
    expected_time = str(payload.get('expected_action_time') or '문서 기준 우선 확인 필요').strip()
    action_lines = _normalize_action_lines(payload.get('action_method'))
    action_text = '\n'.join(f': {line}' for line in action_lines)

    return (
        f'에러코드 분석 결과: {error_code}\n\n'
        f'원인 분석\n'
        f': {cause}\n\n'
        f'조치 방법\n'
        f'{action_text}\n\n'
        f'긴급도\n'
        f': {_format_urgency(urgency_level, urgency_text)}\n\n'
        f'예상 조치 시간\n'
        f': {expected_time}'
    )


def analyze_error_code(error_code: str) -> dict:
    normalized_error_code = error_code.strip().upper()
    docs = search_manual_with_ranking(normalized_error_code, k=2)
    manual_context = make_context_from_docs(docs)

    extracted = _extract_cause_and_actions(normalized_error_code, manual_context)
    cause_analysis = str(extracted.get('cause_analysis') or '문서 기준 상세 원인 확인 필요').strip()
    action_method = _normalize_action_lines(extracted.get('action_method'))
    assessed = _assess_urgency_and_time(
        normalized_error_code,
        cause_analysis,
        action_method,
    )
    urgency_level, urgency_text = _rule_based_urgency(
        cause_analysis,
        action_method,
        str(assessed.get('urgency_level') or '보통'),
        str(assessed.get('urgency_text') or '문서 기준 우선 확인 필요'),
    )

    payload = {
        'error_code': normalized_error_code,
        'cause_analysis': cause_analysis,
        'action_method': action_method,
        'urgency_level': urgency_level,
        'urgency_text': urgency_text,
        'urgency_display': _format_urgency(urgency_level, urgency_text),
        'expected_action_time': str(
            assessed.get('expected_action_time') or '문서 기준 우선 확인 필요'
        ).strip(),
        'matched': bool(extracted.get('matched', False)),
        'documents': [
            {
                'metadata': doc.metadata,
                'page_content': doc.page_content,
            }
            for doc in docs
        ],
        'manual_context': manual_context,
    }
    payload['formatted_text'] = format_worker_response(normalized_error_code, payload)
    return payload


def generate_worker_response(error_code: str):
    docs = search_manual_with_ranking(error_code, k=2)
    manual_context = make_context_from_docs(docs)

    print('\n[검색된 문헌]\n')
    print(manual_context)

    extracted = _extract_cause_and_actions(error_code, manual_context)
    cause_analysis = str(extracted.get('cause_analysis') or '문서 기준 상세 원인 확인 필요').strip()
    action_method = _normalize_action_lines(extracted.get('action_method'))
    assessed = _assess_urgency_and_time(
        error_code,
        cause_analysis,
        action_method,
    )
    urgency_level, urgency_text = _rule_based_urgency(
        cause_analysis,
        action_method,
        str(assessed.get('urgency_level') or '보통'),
        str(assessed.get('urgency_text') or '문서 기준 우선 확인 필요'),
    )

    return format_worker_response(
        error_code,
        {
            'cause_analysis': cause_analysis,
            'action_method': action_method,
            'urgency_level': urgency_level,
            'urgency_text': urgency_text,
            'expected_action_time': assessed.get('expected_action_time'),
        },
    )


if __name__ == '__main__':
    error_code = sys.argv[1] if len(sys.argv) > 1 else input('에러코드를 입력하세요: ').strip()
    result = generate_worker_response(error_code)

    print('\n[작업자용 진단 결과]\n')
    print(result)
