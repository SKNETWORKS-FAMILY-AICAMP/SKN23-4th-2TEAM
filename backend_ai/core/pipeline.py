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
    manufacturer: str | None = None,
) -> list[Document]:
    normalized_query = (query or '').strip().upper()
    exact_docs = search_manual_exact(normalized_query, collection_name=collection_name, k=max(k, 2), manufacturer=manufacturer)
    print(f'[pipeline] exact_docs={len(exact_docs)} query={normalized_query}')

    hybrid_retriever = get_hybrid_retriever(
        query=normalized_query,
        collection_name=collection_name,
        vector_weight=vector_weight,
        bm25_weight=bm25_weight,
        k=max(k, 5),
    )
    hybrid_docs = hybrid_retriever.invoke(normalized_query)
    
    if manufacturer:
        from .retriever import _is_manufacturer_match
        hybrid_docs = [doc for doc in hybrid_docs if _is_manufacturer_match(doc, manufacturer)]
        
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
        metadata = getattr(doc, 'metadata', {}) or {}
        source_file = metadata.get('source_file', '') or ''
        brand = "기타 (미분류)"
        
        lower_source = source_file.lower()
        if 'ur' in lower_source or 'e-series' in lower_source:
             brand = "UR 로봇 (Universal Robots)"
        elif 'hi6' in lower_source or 'hi5' in lower_source or 'hyundai' in lower_source or '로봇_setup' in lower_source:
             brand = "현대 로봇 (Hyundai)"
        elif 'welding' in lower_source or '용접' in lower_source:
             brand = "용접기"

        contexts.append(
            f'[문서 {i}] (제조사/장비: {brand})\n'
            f'출처: {source_file}\n'
            f'내용:\n{doc.page_content[:1200]}'
        )
    return '\n\n'.join(contexts)

