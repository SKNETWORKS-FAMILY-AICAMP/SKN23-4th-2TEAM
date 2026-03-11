from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import psycopg2
import os

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


# -----------------------
# RAG FUNCTIONS
# -----------------------

def parse_pdf(file_path, parser):

    markdown = "example markdown text"

    metadata = {
        "file": file_path.name,
        "parser": parser
    }

    return markdown, metadata


def chunk_text(text, size=500):

    chunks = []

    for i in range(0, len(text), size):
        chunks.append(text[i:i+size])

    return chunks


def create_embeddings(chunks):

    embeddings = []

    for c in chunks:
        embeddings.append({
            "text": c,
            "vector": [0.1,0.2,0.3]
        })

    return embeddings


def commit_to_vector_db(embeddings):

    print("vector DB 저장 완료")


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

    markdown, metadata = parse_pdf(file_path, parser)

    return {
        "markdown": markdown,
        "metadata": metadata
    }


@app.post("/api/rag/commit")
async def commit(data: dict):

    markdown = data["markdown"]

    chunks = chunk_text(markdown)

    embeddings = create_embeddings(chunks)

    commit_to_vector_db(embeddings)

    return {
        "status": "success",
        "chunks": len(chunks)
    }