// src/pages/RagIngestion.jsx
import { useState } from "react";

export default function RagIngestion() {
  const [adminName, setAdminName] = useState("");
  const [parser, setParser] = useState("marker");
  const [file, setFile] = useState(null);
  const [markdown, setMarkdown] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Parse Preview
  const handlePreview = async () => {
    if (!file) return alert("파일 선택하세요");

    const formData = new FormData();
    formData.append("admin_name", adminName);
    formData.append("parser", parser);
    formData.append("file", file);

    setLoading(true);
    const res = await fetch("http://localhost:8000/api/rag/preview", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMarkdown(data.markdown);
    setMetadata(data.metadata);
    setLoading(false);
  };

  // Step 3: Commit
  const handleCommit = async () => {
    const res = await fetch("http://localhost:8000/api/rag/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, metadata }),
    });
    await res.json();
    alert("Vector DB 저장 완료");
  };

  return (
    <div className="flex flex-col w-full p-8 bg-white">
      {/* 컨텐츠 영역: 사이드바 바로 옆 */}
      <div className="flex-1 p-8 w-full max-w-full">
        <h1 className="text-3xl font-bold mb-8">RAG Document Ingestion</h1>

        {/* Step 1 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 w-full max-w-full">
          <h2 className="font-semibold text-lg mb-4">Step 1 · Document Upload</h2>
          <div className="grid grid-cols-3 gap-4 w-full max-w-full">
            <input
              className="border p-2 rounded w-full"
              placeholder="관리자 이름"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
            <select
              className="border p-2 rounded w-full"
              value={parser}
              onChange={(e) => setParser(e.target.value)}
            >
              <option>marker</option>
              <option>pymupdf4llm</option>
            </select>
            <input
              type="file"
              accept="application/pdf"
              className="w-full"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <button
            onClick={handlePreview}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Parse Preview
          </button>
        </div>

        {/* Step 2 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 w-full max-w-full">
          <h2 className="font-semibold text-lg mb-4">Step 2 · Parse Preview</h2>
          {loading && <p>Parsing 중...</p>}
          <div className="grid grid-cols-2 gap-6 w-full max-w-full">
            <div className="border rounded p-4 h-96 overflow-auto w-full max-w-full">
              <h3 className="font-semibold mb-2">Markdown</h3>
              <pre className="text-sm">{markdown}</pre>
            </div>
            <div className="border rounded p-4 h-96 overflow-auto w-full max-w-full">
              <h3 className="font-semibold mb-2">Metadata JSON</h3>
              <pre className="text-sm">{JSON.stringify(metadata, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white shadow rounded-lg p-6 w-full max-w-full">
          <h2 className="font-semibold text-lg mb-4">Step 3 · Commit</h2>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-gray-400 text-white rounded">Cancel</button>
            <button
              onClick={handleCommit}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Commit to Vector DB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}