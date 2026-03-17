import os
import pickle
import re
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers.ensemble import EnsembleRetriever
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

try:
    from .config import (
        BM25_CACHE_PATH,
        COLLECTION_NAME,
        DEFAULT_BM25_WEIGHT,
        DEFAULT_VECTOR_WEIGHT,
        TECHNICAL_BM25_WEIGHT,
    )
except ImportError:
    from config import (
        BM25_CACHE_PATH,
        COLLECTION_NAME,
        DEFAULT_BM25_WEIGHT,
        DEFAULT_VECTOR_WEIGHT,
        TECHNICAL_BM25_WEIGHT,
    )

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
load_dotenv(PROJECT_ROOT / ".env")

CACHED_BM25_RETRIEVER = None
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
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_pg_settings() -> dict:
    if _to_bool(os.getenv("SSH_TUNNEL_ENABLED"), default=False):
        host = _env_first('SSH_LOCAL_BIND_HOST', default='127.0.0.1')
        port = int(_env_first('SSH_LOCAL_BIND_PORT', default='15432'))
    else:
        host = _env_first('PGHOST', default='localhost')
        port = int(_env_first('PGPORT', default='5432'))

    return {
        "host": host,
        "port": port,
        "database": _env_first("PGDATABASE", "PG_DB"),
        "user": _env_first("PGUSER", "PG_USER"),
        "password": _env_first("PGPASSWORD", "PG_PASSWORD"),
        "sslmode": _env_first("PGSSLMODE", default="require"),
        "connect_timeout": int(_env_first("PGCONNECT_TIMEOUT", default="5")),
    }


def _connect_postgres():
    import psycopg

    pg_settings = _get_pg_settings()
    return psycopg.connect(
        host=pg_settings["host"],
        port=pg_settings["port"],
        dbname=pg_settings["database"],
        user=pg_settings["user"],
        password=pg_settings["password"],
        sslmode=pg_settings["sslmode"],
        connect_timeout=pg_settings["connect_timeout"],
    )


class ExactMatchRetriever(BaseRetriever):
    collection_name: str = COLLECTION_NAME
    k: int = 5

    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        return search_manual_exact(query, collection_name=self.collection_name, k=self.k)


def _save_bm25_cache(retriever: BM25Retriever) -> None:
    BM25_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(BM25_CACHE_PATH, "wb") as file_obj:
        pickle.dump(retriever, file_obj)


def _source_key_variants(source_key: str) -> set[str]:
    key = (source_key or "").strip()
    if not key:
        return set()
    name = Path(key).name
    stem = Path(name).stem
    return {value for value in {key, name, stem, f"{stem}.pdf", f"{stem}.md"} if value}


def _doc_matches_source(doc: Document, source_keys: List[str]) -> bool:
    metadata = getattr(doc, "metadata", {}) or {}
    source_values = {
        str(metadata.get("source_key", "")).strip(),
        str(metadata.get("source_file", "")).strip(),
        Path(str(metadata.get("source_file", "")).strip()).name,
        Path(str(metadata.get("source", "")).strip()).name,
    }
    source_values = {value for value in source_values if value}

    for source_key in source_keys:
        if source_values & _source_key_variants(source_key):
            return True
    return False


def _is_doc_active(doc: Document) -> bool:
    metadata = getattr(doc, "metadata", {}) or {}
    return str(metadata.get("use_yn", "Y")).strip().upper() != "N"


def korean_custom_preprocess(text: str) -> List[str]:
    if not isinstance(text, str):
        return []
    text = re.sub(r"[^\uac00-\ud7a3A-Za-z0-9]", " ", text)
    return text.split()


def _is_manufacturer_match(doc: Document, manufacturer: str | None) -> bool:
    if not manufacturer:
        return True
    
    metadata = getattr(doc, 'metadata', {}) or {}
    source_file = str(metadata.get('source_file') or '').upper()
    
    if manufacturer == '현대로보틱스':
        # 숫자 접두사(예: "2. ")가 있을 경우 제거하고 검사
        import re
        clean_file = re.sub(r'^\d+[\.\s_]*', '', source_file)
        prefixes = ('HI', 'HH', 'HX', 'HS', 'HP', 'HR', 'YS', 'UA')
        return clean_file.startswith(prefixes) or '현대' in source_file
        
    # Standard manual / universal scripts
    if 'UNIVERSAL' in manufacturer.upper() or 'UR' in manufacturer.upper():
        return any(keyword in source_file for keyword in ['E-SERIES', 'UR', 'POLY', 'SCRIPT'])
        
    return True

def search_manual_exact(query: str, collection_name: str = COLLECTION_NAME, k: int = 2, manufacturer: str | None = None) -> List[Document]:
    normalized_query = (query or "").strip().upper()
    # INCREASING K to account for post-filtering losses
    fetch_k = k * 3 if manufacturer else k
    
    words = normalized_query.split()
    if not words:
        return []

    conditions = []
    params = [collection_name]
    for word in words:
        conditions.append(
            "%s = ANY(regexp_split_to_array(regexp_replace(UPPER(e.document), '[^A-Z0-9]+', ' ', 'g'), '\\s+'))"
        )
        params.append(word)

    sql = f"""
        SELECT e.document, e.cmetadata
        FROM public.langchain_pg_embedding AS e
        JOIN public.langchain_pg_collection AS c
          ON e.collection_id = c.uuid
        WHERE c.name = %s
          AND {" AND ".join(conditions)}
        LIMIT %s
    """
    params.append(fetch_k)

    with _connect_postgres() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()

    docs = [Document(page_content=row[0] or "", metadata=row[1] or {}) for row in rows]
    
    if manufacturer:
        docs = [doc for doc in docs if _is_manufacturer_match(doc, manufacturer)]
        
    return docs[:k]


def _fetch_all_documents_from_postgres(collection_name: str) -> List[Document]:
    sql = """
    SELECT e.document, e.cmetadata
    FROM langchain_pg_embedding AS e
    JOIN langchain_pg_collection AS c ON e.collection_id = c.uuid
    WHERE c.name = %s
      AND COALESCE((e.cmetadata->>'use_yn'), 'Y') <> 'N'
    ORDER BY e.uuid
    """

    documents: List[Document] = []
    with _connect_postgres() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (collection_name,))
            for page_content, metadata in cur.fetchall():
                documents.append(Document(page_content=page_content or "", metadata=metadata or {}))
    return documents


def _load_or_create_bm25_retriever(collection_name: str = COLLECTION_NAME, force_refresh: bool = False):
    global CACHED_BM25_RETRIEVER

    if CACHED_BM25_RETRIEVER is not None and not force_refresh:
        return CACHED_BM25_RETRIEVER

    BM25_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    if BM25_CACHE_PATH.exists() and not force_refresh:
        try:
            with open(BM25_CACHE_PATH, "rb") as file_obj:
                CACHED_BM25_RETRIEVER = pickle.load(file_obj)
                return CACHED_BM25_RETRIEVER
        except (ModuleNotFoundError, AttributeError, pickle.PickleError, EOFError) as exc:
            print(f"[retriever] bm25 cache reload failed, rebuilding cache: {exc}")
            CACHED_BM25_RETRIEVER = None

    all_docs = [doc for doc in _fetch_all_documents_from_postgres(collection_name) if _is_doc_active(doc)]
    bm25_retriever = BM25Retriever.from_documents(all_docs, preprocess_func=korean_custom_preprocess)
    bm25_retriever.k = 5
    _save_bm25_cache(bm25_retriever)
    CACHED_BM25_RETRIEVER = bm25_retriever
    return CACHED_BM25_RETRIEVER


def get_hybrid_retriever(
    query: str = "",
    collection_name: str = COLLECTION_NAME,
    vector_weight: float | None = None,
    bm25_weight: float | None = None,
    k: int = 5,
):
    tech_keywords = ["HH", "HI5", "HI6", "UR10", "UR5", "UR3", "DX100", "YRC1000", "TP630", "RB10"]
    regex_pattern = r"[A-Za-z]+\d+|\d{4,}"
    is_technical = any(keyword in query.upper() for keyword in tech_keywords) or bool(re.search(regex_pattern, query))

    if bm25_weight is None:
        bm25_weight = TECHNICAL_BM25_WEIGHT if is_technical else DEFAULT_BM25_WEIGHT
    if vector_weight is None:
        vector_weight = DEFAULT_VECTOR_WEIGHT if bm25_weight == DEFAULT_BM25_WEIGHT else 1.0 - bm25_weight

    exact_retriever = ExactMatchRetriever(collection_name=collection_name, k=k)
    bm25_retriever = _load_or_create_bm25_retriever(collection_name)
    bm25_retriever.k = k

    return EnsembleRetriever(
        retrievers=[exact_retriever, bm25_retriever],
        weights=[vector_weight, bm25_weight],
    )


def refresh_bm25_index():
    global CACHED_BM25_RETRIEVER
    CACHED_BM25_RETRIEVER = None
    _load_or_create_bm25_retriever(COLLECTION_NAME, force_refresh=True)


def update_bm25_cache_for_uploaded_source(source_keys: List[str]):
    global CACHED_BM25_RETRIEVER
    if not source_keys:
        return

    if CACHED_BM25_RETRIEVER is None:
        if not BM25_CACHE_PATH.exists():
            refresh_bm25_index()
            return
        with open(BM25_CACHE_PATH, "rb") as file_obj:
            CACHED_BM25_RETRIEVER = pickle.load(file_obj)

    filtered_docs = []
    for doc in list(getattr(CACHED_BM25_RETRIEVER, "docs", []) or []):
        if not _is_doc_active(doc):
            continue
        if not _doc_matches_source(doc, source_keys):
            filtered_docs.append(doc)

    new_docs = []
    all_docs = _fetch_all_documents_from_postgres(COLLECTION_NAME)
    for doc in all_docs:
        if _doc_matches_source(doc, source_keys):
            new_docs.append(doc)

    deduped = []
    seen = set()
    for doc in filtered_docs + new_docs:
        metadata = getattr(doc, "metadata", {}) or {}
        signature = (doc.page_content, tuple(sorted((str(key), str(value)) for key, value in metadata.items())))
        if signature in seen:
            continue
        seen.add(signature)
        deduped.append(doc)

    new_bm25 = BM25Retriever.from_documents(deduped, preprocess_func=korean_custom_preprocess)
    new_bm25.k = int(getattr(CACHED_BM25_RETRIEVER, "k", 5) or 5)
    _save_bm25_cache(new_bm25)
    CACHED_BM25_RETRIEVER = new_bm25


def remove_sources_from_bm25_cache(source_keys: List[str]) -> dict:
    global CACHED_BM25_RETRIEVER

    keys = [key.strip() for key in (source_keys or []) if isinstance(key, str) and key.strip()]
    if not keys:
        return {
            "bm25_cache_updated": False,
            "bm25_status": "skipped_empty_source_keys",
            "bm25_removed_docs": 0,
            "bm25_total_docs": None,
        }

    if CACHED_BM25_RETRIEVER is None:
        if not BM25_CACHE_PATH.exists():
            return {
                "bm25_cache_updated": False,
                "bm25_status": "skipped_cache_not_found",
                "bm25_removed_docs": 0,
                "bm25_total_docs": None,
            }
        with open(BM25_CACHE_PATH, "rb") as file_obj:
            CACHED_BM25_RETRIEVER = pickle.load(file_obj)

    current_docs = list(getattr(CACHED_BM25_RETRIEVER, "docs", []) or [])
    if not current_docs:
        return {
            "bm25_cache_updated": False,
            "bm25_status": "skipped_empty_cache",
            "bm25_removed_docs": 0,
            "bm25_total_docs": 0,
        }

    kept_docs = []
    removed_count = 0
    for doc in current_docs:
        if _doc_matches_source(doc, keys):
            removed_count += 1
            continue
        kept_docs.append(doc)

    if removed_count == 0:
        return {
            "bm25_cache_updated": False,
            "bm25_status": "no_match",
            "bm25_removed_docs": 0,
            "bm25_total_docs": len(current_docs),
        }

    preprocess_func = getattr(CACHED_BM25_RETRIEVER, "preprocess_func", None) or korean_custom_preprocess
    k_value = int(getattr(CACHED_BM25_RETRIEVER, "k", 5) or 5)
    rebuilt = BM25Retriever.from_documents(kept_docs, preprocess_func=preprocess_func)
    rebuilt.k = k_value
    _save_bm25_cache(rebuilt)
    CACHED_BM25_RETRIEVER = rebuilt

    return {
        "bm25_cache_updated": True,
        "bm25_status": "removed",
        "bm25_removed_docs": removed_count,
        "bm25_total_docs": len(kept_docs),
    }



