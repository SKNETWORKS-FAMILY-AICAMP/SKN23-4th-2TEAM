import os
from pathlib import Path
from typing import List, Tuple

from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_core.documents import Document

try:
    from .config import (
        RERANKER_CACHE_DIR,
        RERANKER_DOWNLOAD_DIR,
        get_device,
        get_reranker_model_path,
    )
except ImportError:
    from config import (
        RERANKER_CACHE_DIR,
        RERANKER_DOWNLOAD_DIR,
        get_device,
        get_reranker_model_path,
    )

DEFAULT_TOP_N = 5
DEFAULT_THRESHOLD = 0.5
GLOBAL_RERANKER = None


def load_reranker_singleton(model_name: str | None = None):
    global GLOBAL_RERANKER
    if GLOBAL_RERANKER is not None:
        return GLOBAL_RERANKER

    os.environ["HF_HOME"] = str(RERANKER_CACHE_DIR)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(RERANKER_DOWNLOAD_DIR)
    os.environ["TRANSFORMERS_CACHE"] = str(RERANKER_DOWNLOAD_DIR)

    selected_model = model_name or get_reranker_model_path()
    selected_model_str = str(selected_model)
    local_candidate = Path(selected_model_str)
    local_config_path = local_candidate / "config.json"
    local_only = local_config_path.exists()
    resolved_model_name = str(local_candidate) if local_only else selected_model_str.replace("\\", "/")
    device = get_device()

    GLOBAL_RERANKER = HuggingFaceCrossEncoder(
        model_name=resolved_model_name,
        model_kwargs={"local_files_only": local_only, "device": device},
    )
    return GLOBAL_RERANKER

    os.environ["HF_HOME"] = str(RERANKER_CACHE_DIR)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(RERANKER_DOWNLOAD_DIR)
    os.environ["TRANSFORMERS_CACHE"] = str(RERANKER_DOWNLOAD_DIR)

    model_path = model_name or get_reranker_model_path()
    device = get_device()
    local_only = Path(str(model_path)).exists()

    GLOBAL_RERANKER = HuggingFaceCrossEncoder(
        model_name=str(model_path),
        model_kwargs={"local_files_only": local_only, "device": device},
    )
    return GLOBAL_RERANKER


def build_reranker_retriever(
    base_retriever,
    model_name: str | None = None,
    top_n: int = DEFAULT_TOP_N,
) -> ContextualCompressionRetriever:
    cross_encoder = load_reranker_singleton(model_name)
    compressor = CrossEncoderReranker(model=cross_encoder, top_n=top_n)
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=base_retriever,
    )


def rerank_documents(
    query: str,
    documents: List[Document],
    model_name: str | None = None,
    top_n: int = DEFAULT_TOP_N,
    threshold: float = DEFAULT_THRESHOLD,
) -> Tuple[List[Document], bool, float]:
    if not documents:
        return [], False, 0.0

    cross_encoder = load_reranker_singleton(model_name)
    pairs = [(query, doc.page_content) for doc in documents]
    raw_scores = cross_encoder.score(pairs)

    import math

    scores = [1 / (1 + math.exp(-score)) for score in raw_scores]
    scored = sorted(zip(scores, documents), key=lambda item: item[0], reverse=True)
    passed = [(score, doc) for score, doc in scored if score >= threshold]

    if not passed:
        return [], False, float(scored[0][0]) if scored else 0.0

    top_docs = [doc for _, doc in passed[:top_n]]
    top_score = float(passed[0][0]) if passed else 0.0
    return top_docs, True, top_score

