from __future__ import annotations

import hashlib
from contextlib import contextmanager
import os
import re
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import pdfplumber
import psycopg2
from fastapi import HTTPException
try:
    from langchain_community.vectorstores import PGVector
except Exception:
    from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from psycopg2.extras import execute_values

try:
    from core.config import COLLECTION_NAME, EMBEDDING_MODEL_NAME
except Exception:
    from app.core.config import COLLECTION_NAME, EMBEDDING_MODEL_NAME

try:
    from core.retriever import update_bm25_cache_for_uploaded_source
except Exception:
    from backend_ai.core.retriever import update_bm25_cache_for_uploaded_source

from app.db import _build_db_config

REGISTRY_TABLE = "admin_pdf_ingest_registry"


def _normalize_text(value: str) -> str:
    return (value or "").strip()


def _sha256_text(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_stem(filename: str) -> str:
    stem = Path(filename).stem
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", stem)
    return cleaned or "uploaded_pdf"


def _build_pg_config() -> dict:
    cfg = _build_db_config()
    return {
        "host": cfg["host"],
        "port": cfg["port"],
        "dbname": cfg["dbname"],
        "user": cfg["user"],
        "password": cfg.get("password", ""),
        "sslmode": cfg.get("sslmode", "prefer"),
        "connect_timeout": cfg.get("connect_timeout", 5),
    }


def _build_connection_string() -> str:
    cfg = _build_pg_config()
    return (
        f"postgresql+psycopg2://{quote_plus(cfg['user'])}:{quote_plus(cfg['password'])}"
        f"@{cfg['host']}:{cfg['port']}/{cfg['dbname']}?sslmode={cfg.get('sslmode', 'prefer')}"
    )


def _get_vector_store(collection_name: str):
    return PGVector(
        connection_string=_build_connection_string(),
        embedding_function=OpenAIEmbeddings(model=EMBEDDING_MODEL_NAME),
        collection_name=collection_name,
        use_jsonb=True,
    )


def _conn():
    return psycopg2.connect(**_build_pg_config())


def _write_temp_pdf(file_bytes: bytes, filename: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".pdf", prefix=f"{_safe_stem(filename)}_")
    with os.fdopen(fd, "wb") as fp:
        fp.write(file_bytes)
    return path


def _parse_with_marker(pdf_path: str, source_name: str) -> tuple[str, str, dict[str, Any]]:
    from marker.convert import convert_single_pdf
    from marker.models import load_all_models

    models = load_all_models()
    text, _meta = convert_single_pdf(pdf_path, models)
    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("Marker parser returned empty text.")
    return text.strip(), "marker", {
        "title": Path(source_name).stem,
        "filetype": "pdf",
        "parser": "marker",
    }


def _parse_with_pymupdf4llm(pdf_path: str, source_name: str) -> tuple[str, str, dict[str, Any]]:
    import fitz
    import pymupdf4llm

    text = pymupdf4llm.to_markdown(pdf_path) or ""
    if not text.strip():
        raise RuntimeError("pymupdf4llm parser returned empty text.")
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()
    return text.strip(), "pymupdf4llm", {
        "title": Path(source_name).stem,
        "total_pages": total_pages,
        "parser_engine": "pymupdf4llm",
    }


def _parse_with_pdfplumber(pdf_path: str, source_name: str) -> tuple[str, str, dict[str, Any]]:
    with pdfplumber.open(pdf_path) as pdf:
        pages: list[str] = []
        for idx, page in enumerate(pdf.pages, start=1):
            page_text = (page.extract_text() or "").strip()
            if not page_text:
                continue
            pages.append(f"## Page {idx}\n\n{page_text}")
        if not pages:
            raise RuntimeError("No extractable text from PDF.")
        return (
            f"# {Path(source_name).stem}\n\n" + "\n\n".join(pages),
            "pdfplumber",
            {"title": Path(source_name).stem, "total_pages": len(pdf.pages), "parser_engine": "pdfplumber"},
        )


def parse_pdf_to_markdown(
    file_bytes: bytes,
    filename: str,
    parser_choice: str = "marker",
    creator: str = "admin",
) -> tuple[str, str, dict[str, Any]]:
    parser_choice = (parser_choice or "").strip().lower()
    file_path = _write_temp_pdf(file_bytes, filename)
    file_hash = _sha256_bytes(file_bytes)
    parser_errors: list[str] = []

    try:
        if parser_choice == "pymupdf4llm":
            attempts = [_parse_with_pymupdf4llm, _parse_with_marker, _parse_with_pdfplumber]
        elif parser_choice == "marker":
            attempts = [_parse_with_marker, _parse_with_pymupdf4llm, _parse_with_pdfplumber]
        else:
            attempts = [_parse_with_pdfplumber, _parse_with_marker, _parse_with_pymupdf4llm]

        for parser in attempts:
            try:
                text, used_parser, metadata = parser(file_path, filename)
                now = datetime.now(timezone.utc).isoformat()
                merged_meta: dict[str, Any] = {
                    "source_file": filename,
                    "source_key": filename,
                    "source": filename,
                    "creator": _normalize_text(creator) or "admin",
                    "created_at": now,
                    "file_hash": file_hash,
                    "filetype": "pdf",
                    "parser_used": used_parser,
                }
                merged_meta.update(metadata or {})
                return text, used_parser, merged_meta
            except ImportError as exc:
                parser_errors.append(f"{parser.__name__}: import error ({exc})")
            except Exception as exc:
                parser_errors.append(f"{parser.__name__}: {exc}")

        raise RuntimeError("No parser succeeded: " + " | ".join(parser_errors[:3]))
    finally:
        try:
            os.remove(file_path)
        except OSError:
            pass


def _extract_metadata_from_path(file_path: str) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    lowered = [part.lower() for part in str(file_path).split(os.sep)]
    domain = "general"
    if "robotics" in lowered:
        domain = "robotics"
    elif "welding" in lowered:
        domain = "welding"
    elif "electrical" in lowered:
        domain = "electrical"
    meta["domain"] = domain

    filename = os.path.basename(file_path)
    match = re.search(r"([a-zA-Z0-9]+)_.+_([a-zA-Z0-9]+)\.md", filename)
    if match:
        meta["model_name"] = f"{match.group(1)}_{match.group(2)}"
    else:
        meta["model_name"] = Path(filename).with_suffix("").name
    return meta


def chunk_markdown_document(content: str, source_path: str = "unknown.md") -> list[Document]:
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]

    base_meta = _extract_metadata_from_path(source_path)
    base_meta["source"] = source_path

    try:
        splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on, strip_headers=False)
        level_documents = splitter.split_text(content)
    except Exception:
        level_documents = [Document(page_content=content, metadata={})]

    for doc in level_documents:
        chapter_parts = [doc.metadata.get("Header 1", ""), doc.metadata.get("Header 2", ""), doc.metadata.get("Header 3", "")]
        chapter_parts = [part for part in chapter_parts if part]
        doc.metadata = {
            **base_meta,
            "chapter_path": " > ".join(chapter_parts) if chapter_parts else "전체",
        }

    splitter_2 = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter_2.split_documents(level_documents)


def _ensure_registry_table() -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {REGISTRY_TABLE} (
                    collection_name TEXT NOT NULL,
                    source_key TEXT NOT NULL,
                    chunk_id TEXT NOT NULL,
                    chunk_hash TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    s3_pdf_key TEXT,
                    s3_md_key TEXT,
                    local_md_path TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (collection_name, chunk_id)
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_admin_pdf_ingest_registry_source "
                "ON admin_pdf_ingest_registry (collection_name, source_key)"
            )
        conn.commit()


def _ensure_use_yn_column() -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE langchain_pg_embedding ADD COLUMN IF NOT EXISTS use_yn CHAR(1)")
            cur.execute("ALTER TABLE langchain_pg_embedding ALTER COLUMN use_yn SET DEFAULT 'Y'")
        conn.commit()


def _ensure_use_yn_for_chunk_ids(collection_name: str, chunk_ids: list[str]) -> None:
    if not chunk_ids:
        return
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE langchain_pg_embedding e
                SET cmetadata = jsonb_set(
                    COALESCE(e.cmetadata, '{}'::jsonb),
                    '{use_yn}',
                    to_jsonb('Y'::text),
                    true
                )
                FROM langchain_pg_collection c
                WHERE e.collection_id = c.uuid
                  AND c.name = %s
                  AND e.custom_id = ANY(%s)
                  AND NOT COALESCE(e.cmetadata ? 'use_yn', false)
                """,
                (collection_name, chunk_ids),
            )
        conn.commit()


def _fetch_existing_registry_chunk_ids(collection_name: str, source_key: str) -> set[str]:
    _ensure_registry_table()
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT chunk_id FROM {REGISTRY_TABLE} WHERE collection_name=%s AND source_key=%s",
                (collection_name, source_key),
            )
            return {row[0] for row in cur.fetchall()}


def _delete_registry_rows(collection_name: str, chunk_ids: list[str]) -> None:
    if not chunk_ids:
        return
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {REGISTRY_TABLE} WHERE collection_name=%s AND chunk_id = ANY(%s)",
                (collection_name, chunk_ids),
            )
        conn.commit()


def _upsert_registry_rows(rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    with _conn() as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                f"""
                INSERT INTO {REGISTRY_TABLE} (
                    collection_name, source_key, chunk_id, chunk_hash, file_hash,
                    file_name, chunk_index, s3_pdf_key, s3_md_key, local_md_path
                ) VALUES %s
                ON CONFLICT (collection_name, chunk_id) DO UPDATE SET
                    source_key = EXCLUDED.source_key,
                    chunk_hash = EXCLUDED.chunk_hash,
                    file_hash = EXCLUDED.file_hash,
                    file_name = EXCLUDED.file_name,
                    chunk_index = EXCLUDED.chunk_index,
                    s3_pdf_key = EXCLUDED.s3_pdf_key,
                    s3_md_key = EXCLUDED.s3_md_key,
                    local_md_path = EXCLUDED.local_md_path,
                    updated_at = NOW()
                """,
                rows,
            )
        conn.commit()


def _update_vector_audit_columns(collection_name: str, chunk_ids: list[str], creator: str) -> None:
    if not chunk_ids:
        return
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE langchain_pg_embedding e
                SET created_at = NOW(),
                    creator = %s,
                    cmetadata = jsonb_set(
                        COALESCE(e.cmetadata, '{}'::jsonb),
                        '{use_yn}',
                        to_jsonb('Y'::text),
                        true
                    )
                FROM langchain_pg_collection c
                WHERE e.collection_id = c.uuid
                  AND c.name = %s
                  AND e.custom_id = ANY(%s)
                """,
                (creator, collection_name, chunk_ids),
            )
        conn.commit()


def embed_markdown_to_pgvector(
    *,
    markdown_text: str,
    original_filename: str,
    admin_name: str = "admin",
    file_bytes: bytes,
    extra_metadata: dict[str, Any] | None = None,
    collection_name: str = COLLECTION_NAME,
    s3_pdf_key: str | None = None,
    s3_md_key: str | None = None,
) -> dict[str, Any]:
    source_key = _normalize_text(original_filename)
    if not source_key:
        raise HTTPException(status_code=400, detail="filename is required")
    if not markdown_text or not markdown_text.strip():
        raise HTTPException(status_code=400, detail="markdown is empty")

    _ensure_registry_table()
    _ensure_use_yn_column()

    file_hash = _sha256_bytes(file_bytes)
    chunks = chunk_markdown_document(markdown_text, source_path=source_key)

    current_chunk_ids: list[str] = []
    docs_by_chunk_id: list[Document] = []
    rows: list[tuple[Any, ...]] = []

    for idx, doc in enumerate(chunks):
        chapter_path = str(doc.metadata.get("chapter_path", ""))
        chunk_hash = _sha256_text(f"{chapter_path}\n{doc.page_content}")
        chunk_id = _sha256_text(f"{source_key}\n{chunk_hash}")
        merged_meta = dict(doc.metadata)
        merged_meta.update(
            {
                "source_file": source_key,
                "source_key": source_key,
                "source": source_key,
                "use_yn": "Y",
                "creator": admin_name or "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        if extra_metadata:
            for key, value in extra_metadata.items():
                if isinstance(value, (str, int, float, bool)):
                    merged_meta[key] = value
                elif isinstance(value, (list, tuple)):
                    merged_meta[key] = ", ".join(map(str, value))
                else:
                    merged_meta[key] = str(value)
        doc.metadata = merged_meta

        current_chunk_ids.append(chunk_id)
        docs_by_chunk_id.append(doc)
        rows.append(
            (
                collection_name,
                source_key,
                chunk_id,
                chunk_hash,
                file_hash,
                source_key,
                idx,
                s3_pdf_key,
                s3_md_key,
                None,
            )
        )

    existing_ids = _fetch_existing_registry_chunk_ids(collection_name, source_key)
    current_ids = set(current_chunk_ids)
    stale_ids = list(existing_ids - current_ids)

    vector_store = _get_vector_store(collection_name)
    vector_store.delete(ids=stale_ids)
    _delete_registry_rows(collection_name, stale_ids)

    if docs_by_chunk_id:
        vector_store.delete(ids=list(current_ids))
        vector_store.add_documents(docs_by_chunk_id, ids=current_chunk_ids)
        _ensure_use_yn_for_chunk_ids(collection_name=collection_name, chunk_ids=current_chunk_ids)
        _update_vector_audit_columns(collection_name=collection_name, chunk_ids=current_chunk_ids, creator=admin_name)
        _upsert_registry_rows(rows)

    bm25_result: dict[str, Any]
    try:
        bm25_response = update_bm25_cache_for_uploaded_source([source_key, f"{Path(source_key).stem}.md"])
        if isinstance(bm25_response, dict):
            bm25_result = {
                "bm25_cache_updated": bool(bm25_response.get("bm25_cache_updated", False)),
                "bm25_status": str(bm25_response.get("bm25_status", "ok")),
                "bm25_total_docs": bm25_response.get("bm25_total_docs"),
            }
        else:
            bm25_result = {"bm25_cache_updated": True, "bm25_status": "ok", "bm25_total_docs": None}
    except Exception as exc:
        bm25_result = {"bm25_cache_updated": False, "bm25_status": f"error:{exc}", "bm25_total_docs": None}

    unchanged = bool(existing_ids and set(existing_ids) == current_ids)
    return {
        "message": "No change (already up-to-date)." if unchanged else "Embedding pipeline completed.",
        "local_md_path": None,
        "file_hash": file_hash,
        "total_chunks_parsed": len(current_chunk_ids),
        "db_chunks_inserted": len(current_chunk_ids),
        "db_chunks_skipped": 0,
        "db_chunks_deleted": len(stale_ids),
        **bm25_result,
    }


@contextmanager
def get_rag_preview_context(file_bytes: bytes, filename: str, parser: str, admin_name: str):
    parsed = parse_pdf_to_markdown(
        file_bytes=file_bytes,
        filename=filename,
        parser_choice=parser,
        creator=admin_name,
    )
    markdown_text, _used_parser, metadata = parsed
    try:
        yield {
            "markdown": markdown_text,
            "metadata": metadata,
            "parser_used": _normalize_text(_used_parser),
        }
    finally:
        pass
