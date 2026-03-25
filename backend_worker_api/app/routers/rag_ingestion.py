from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.services import rag_ingestion_service as service

try:
    from infrastructure.aws.s3_client import S3Client
except Exception:
    from app.infrastructure.aws.s3_client import S3Client

router = APIRouter(prefix="/rag", tags=["rag-ingestion"])


def _multipart_max_part_bytes() -> int:
    raw = str(os.getenv("RAG_MULTIPART_MAX_PART_MB", "50")).strip()
    try:
        mb = int(raw)
    except ValueError:
        mb = 50
    mb = max(1, min(mb, 200))
    return mb * 1024 * 1024


async def _read_form_with_limit(request: Request):
    limit = _multipart_max_part_bytes()
    try:
        try:
            return await request.form(max_part_size=limit)
        except TypeError:
            # Backward compatibility for old Starlette versions
            return await request.form()
    except StarletteHTTPException as exc:
        if exc.status_code == 413:
            raise HTTPException(
                status_code=413,
                detail=f"uploaded part exceeds server limit ({limit // (1024 * 1024)}MB)",
            )
        raise HTTPException(status_code=exc.status_code, detail=str(exc.detail))
    except Exception as exc:
        text = str(exc).lower()
        if "maximum size" in text or "too large" in text:
            raise HTTPException(
                status_code=413,
                detail=f"uploaded part exceeds server limit ({limit // (1024 * 1024)}MB)",
            )
        raise HTTPException(status_code=400, detail=f"invalid multipart form: {exc}")


def _extract_upload(form_data, field_name: str = "file") -> UploadFile | StarletteUploadFile:
    uploaded = form_data.get(field_name)
    if uploaded is None:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    if not getattr(uploaded, "filename", None) or not callable(getattr(uploaded, "read", None)):
        raise HTTPException(status_code=400, detail=f"{field_name} is invalid")
    return uploaded


def _safe_slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", (value or "").strip()) or "file"


def _build_s3_keys(admin_name: str, filename: str, file_hash: str | None = None) -> tuple[str, str, str]:
    safe_admin = _safe_slug(admin_name)
    safe_filename = _safe_slug(filename)
    safe_stem = _safe_slug(Path(filename).stem)
    date_str = datetime.now().strftime("%Y%m%d")
    hash_suffix = f"_{file_hash[:8]}" if file_hash else ""
    base_prefix = f"ingested_docs/{date_str}_{safe_admin}_{safe_filename}{hash_suffix}"
    return (
        f"{base_prefix}/{safe_filename}",
        f"{base_prefix}/{safe_stem}.md",
        f"{base_prefix}/{safe_stem}.json",
    )


def _coerce_metadata(metadata: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(metadata, dict):
        return metadata
    if not isinstance(metadata, str):
        raise HTTPException(status_code=400, detail="metadata must be a JSON object or JSON string.")
    try:
        parsed = json.loads(metadata)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"metadata must be valid JSON: {exc}")
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="metadata must be a JSON object.")
    return parsed


@router.post("/preview")
async def preview_rag(
    request: Request,
):
    form = await _read_form_with_limit(request)
    admin_name = str(form.get("admin_name") or "")
    parser = str(form.get("parser") or "pdfplumber")
    file = _extract_upload(form, "file")
    if not file.filename:
        raise HTTPException(status_code=400, detail="file name is required")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="empty file")

    try:
        markdown_text, _used_parser, metadata = service.parse_pdf_to_markdown(
            file_bytes=file_bytes,
            filename=file.filename,
            parser_choice=parser,
            creator=admin_name or "admin",
        )
        response = {
            "status": "ok",
            "markdown": markdown_text,
            "metadata": metadata,
            "parser_used": _used_parser,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"preview failed: {exc}")
    return response


@router.post("/commit")
async def commit_rag(
    request: Request,
):
    form = await _read_form_with_limit(request)
    markdown = str(form.get("markdown") or "")
    metadata = str(form.get("metadata") or "")
    file = _extract_upload(form, "file")
    if not file.filename:
        raise HTTPException(status_code=400, detail="file name is required")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

    if not markdown.strip():
        raise HTTPException(status_code=400, detail="markdown is required")

    metadata_obj = _coerce_metadata(metadata)
    source_file = _pick_source_file(metadata_obj) or file.filename
    if not source_file:
        raise HTTPException(status_code=400, detail="source file is required")

    admin_name = (
        str(metadata_obj.get("creator") or "")
        .strip()
        or "admin"
    )
    file_hash = str(metadata_obj.get("file_hash") or "").strip() or None

    s3_pdf_key, s3_md_key, s3_json_key = _build_s3_keys(admin_name=admin_name, filename=source_file, file_hash=file_hash)
    metadata_json = json.dumps(metadata_obj, ensure_ascii=False)
    try:
        s3_client = S3Client()
        s3_client.upload_file_bytes(file_bytes, s3_pdf_key, "application/pdf")
        s3_client.upload_file_bytes(markdown.encode("utf-8"), s3_md_key, "text/markdown; charset=utf-8")
        s3_client.upload_file_bytes(metadata_json.encode("utf-8"), s3_json_key, "application/json; charset=utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"S3 Upload Error: {exc}")

    try:
        result = service.embed_markdown_to_pgvector(
            markdown_text=markdown,
            original_filename=source_file,
            admin_name=admin_name,
            file_bytes=file_bytes,
            extra_metadata=metadata_obj,
            s3_pdf_key=s3_pdf_key,
            s3_md_key=s3_md_key,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"commit failed ({type(exc).__name__}): {exc}",
        )

    return {
        "status": "success",
        "chunks": result.get("total_chunks_parsed", 0),
        "inserted": result.get("db_chunks_inserted", 0),
        "deleted": result.get("db_chunks_deleted", 0),
        "skipped": result.get("db_chunks_skipped", 0),
        "bm25_cache_updated": result.get("bm25_cache_updated", False),
        "bm25_status": result.get("bm25_status", ""),
        "file_hash": result.get("file_hash", ""),
        "message": result.get("message", ""),
        "s3_pdf_key": s3_pdf_key,
        "s3_md_key": s3_md_key,
        "s3_json_key": s3_json_key,
        "details": result,
    }


def _pick_source_file(metadata: dict[str, Any]) -> str | None:
    candidate = (
        metadata.get("source_file")
        or metadata.get("file")
        or metadata.get("filename")
        or metadata.get("file_name")
    )
    if isinstance(candidate, str) and candidate.strip():
        return candidate.strip()
    return None
