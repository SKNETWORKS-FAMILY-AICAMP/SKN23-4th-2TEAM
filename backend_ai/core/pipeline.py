from langchain_core.documents import Document

try:
    from .config import COLLECTION_NAME
    from .reranker import rerank_documents
    from .retriever import get_hybrid_retriever, search_manual_exact
except ImportError:
    from config import COLLECTION_NAME
    from reranker import rerank_documents
    from retriever import get_hybrid_retriever, search_manual_exact


DEFAULT_HYBRID_BM25_WEIGHT = 0.8
DEFAULT_HYBRID_VECTOR_WEIGHT = 0.2


def search_manual_with_ranking(
    query: str,
    k: int = 2,
    collection_name: str = COLLECTION_NAME,
    vector_weight: float = DEFAULT_HYBRID_VECTOR_WEIGHT,
    bm25_weight: float = DEFAULT_HYBRID_BM25_WEIGHT,
) -> list[Document]:
    normalized_query = (query or '').strip().upper()
    exact_docs = search_manual_exact(normalized_query, collection_name=collection_name, k=max(k, 2))
    print(f'[pipeline] exact_docs={len(exact_docs)} query={normalized_query}')

    hybrid_retriever = get_hybrid_retriever(
        query=normalized_query,
        collection_name=collection_name,
        vector_weight=vector_weight,
        bm25_weight=bm25_weight,
        k=max(k, 5),
    )
    hybrid_docs = hybrid_retriever.invoke(normalized_query)
    print(f'[pipeline] hybrid_docs={len(hybrid_docs)}')

    combined_docs: list[Document] = []
    seen = set()
    for doc in [*exact_docs, *hybrid_docs]:
        metadata = getattr(doc, 'metadata', {}) or {}
        signature = (doc.page_content, tuple(sorted((str(key), str(value)) for key, value in metadata.items())))
        if signature in seen:
            continue
        seen.add(signature)
        combined_docs.append(doc)

    print(f'[pipeline] combined_docs={len(combined_docs)}')

    reranked_docs, has_match, top_score = rerank_documents(
        normalized_query,
        combined_docs,
        top_n=max(k, 2),
    )
    print(
        f'[pipeline] reranker_has_match={has_match} '
        f'reranked_docs={len(reranked_docs)} top_score={top_score}'
    )
    if has_match and reranked_docs:
        return reranked_docs[:k]

    fallback_docs = combined_docs[:k] if combined_docs else exact_docs[:k]
    print(f'[pipeline] fallback_docs={len(fallback_docs)}')
    return fallback_docs


def make_context_from_docs(docs: list[Document]) -> str:
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
