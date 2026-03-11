import json

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from prompts import build_manager_briefing_prompt

load_dotenv()

PERSIST_DIR = "chroma_db"


def load_factory_status():
    with open("factory_status.json", "r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def get_line_status(line_name: str):
    data = load_factory_status()
    return [item for item in data if item["line"] == line_name]


def search_manual(query: str, k: int = 2):
    embeddings = OpenAIEmbeddings()

    vectordb = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=embeddings,
        collection_name="hyundai_test",
    )

    retriever = vectordb.as_retriever(search_kwargs={"k": k})
    return retriever.invoke(query)


def make_context_from_docs(docs):
    contexts = []
    for i, doc in enumerate(docs, 1):
        contexts.append(
            f"[문서 {i}]\n"
            f"metadata: {doc.metadata}\n"
            f"content:\n{doc.page_content[:1200]}"
        )
    return "\n\n".join(contexts)


def generate_manager_briefing(line_name: str):
    line_data = get_line_status(line_name)

    if not line_data:
        return f"{line_name} 데이터가 없습니다."

    main_error = line_data[0]["error"]
    docs = search_manual(main_error, k=2)
    manual_context = make_context_from_docs(docs)

    status_text = "\n".join(
        [f"- 이상: {item['error']} | 발생: {item['count']}건" for item in line_data]
    )

    prompt = build_manager_briefing_prompt(
        line_name=line_name,
        status_text=status_text,
        manual_context=manual_context,
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    response = llm.invoke(prompt)
    return response.content


if __name__ == "__main__":
    line_name = "A라인"
    result = generate_manager_briefing(line_name)
    print("\n[최종 브리핑]\n")
    print(result)
