from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from shared.pdf_parser import parse_pdf as _real_parse_pdf
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _env_first(*keys: str, default: str | None = None) -> str | None:
    for key in keys:
        value = os.getenv(key)
        if value and value.strip():
            return value.strip()
    return default


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_db_connection_info() -> tuple[str, str]:
    if _to_bool(os.getenv("SSH_TUNNEL_ENABLED"), default=False):
        host = _env_first("SSH_LOCAL_BIND_HOST", default="127.0.0.1")
        port = _env_first("SSH_LOCAL_BIND_PORT", default="15432")
    else:
        host = _env_first("DB_HOST", _env_first("PGHOST", "127.0.0.1"))
        port = _env_first("DB_PORT", _env_first("PGPORT", "5432"))
    return host, port


# -----------------------
# RAG FUNCTIONS
# -----------------------

def chunk_text(text, size=1000):
    """헤더 기준 1차 분할 → 글자 수 기준 2차 분할"""
    headers_to_split = [("#", "H1"), ("##", "H2"), ("###", "H3")]
    md_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=150)
    
    header_splits = md_splitter.split_text(text)
    return text_splitter.split_documents(header_splits)
def commit_to_vector_db(markdown, metadata):
    """청킹 후 pgvector에 저장"""
    from langchain_openai import OpenAIEmbeddings
    from langchain_postgres import PGVector
    import os

    db_host, db_port = _get_db_connection_info()

    CONNECTION_STRING = (
        f"postgresql+psycopg://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}"
        f"@{db_host}:{db_port}/{os.getenv('PGDATABASE')}?sslmode=require"
    )
    
    chunks = chunk_text(markdown)
    for chunk in chunks:
        chunk.metadata.update(metadata)
    
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="welding_robotics_manuals",  # retriever.py의 COLLECTION_NAME과 동일
        connection=CONNECTION_STRING,
    )
    vector_store.add_documents(chunks)    


# -----------------------
# API
# -----------------------

@app.post("/api/rag/preview")
async def preview(
    admin_name: str = Form(...),
    parser: str = Form(...),
    file: UploadFile = File(...)
):
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    markdown, metadata = _real_parse_pdf(file_path, parser)
    return {
        "markdown": markdown,
        "metadata": metadata
    }


@app.post("/api/rag/commit")
async def commit(data: dict):
    markdown = data["markdown"]
    metadata = data.get("metadata", {})
    commit_to_vector_db(markdown, metadata)
    chunks = chunk_text(markdown)
    return {
        "status": "success",
        "chunks": len(chunks)
    }

