// src/pages/RagIngestion.jsx
import { useState } from "react";

export default function RagIngestion() {
  const [adminName, setAdminName] = useState("");
  const [parser, setParser] = useState("marker");
  const [file, setFile] = useState(null);
  const [markdown, setMarkdown] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);

  const toErrorMessage = (value) => {
    if (!value) return "요청 처리에 실패했습니다.";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") {
      if (value.message) return String(value.message);
      if (value.detail) return toErrorMessage(value.detail);
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "요청 처리 중 알 수 없는 오류가 발생했습니다.";
      }
    }
    return String(value);
  };

  const parseJsonResponse = async (res) => {
    const text = await res.text();
    if (!text) {
      return {
        ok: false,
        data: null,
        error: {
          detail: `서버 응답이 비어있습니다. (HTTP ${res.status})`,
        },
      };
    }
    try {
      const data = JSON.parse(text);
      if (res.ok) {
        return { ok: true, data };
      }
      return {
        ok: false,
        data,
        error: {
          detail: data?.detail || data?.message || data?.error || "요청 처리에 실패했습니다.",
          raw: data,
        },
      };
    } catch {
      return {
        ok: false,
        data: null,
        error: {
          detail: `JSON 파싱 실패 (HTTP ${res.status})`,
          raw: text,
        },
      };
    }
  };

  // Step 1: Parse Preview
  const handlePreview = async () => {
    if (!file) return alert("파일 선택하세요");

    const formData = new FormData();
    formData.append("admin_name", adminName);
    formData.append("parser", parser);
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/v1/rag/preview", {
        method: "POST",
        body: formData,
      });
      const parsed = await parseJsonResponse(res);
      if (!parsed.ok) {
        throw new Error(
          toErrorMessage(
            parsed.error?.detail ||
              parsed.error?.message ||
              parsed.data?.detail ||
              parsed.data?.message ||
              "파싱에 실패했습니다."
          )
        );
      }
      const data = parsed.data;
      if (!data) {
        throw new Error("파싱 응답 데이터가 없습니다.");
      }
      setMarkdown(data.markdown || "");
      setMetadata(data.metadata || null);
      alert(`미리보기 파싱 완료 (parser: ${data.parser_used || parser})`);
    } catch (err) {
      alert(err.message || "파싱 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Commit
  const handleCommit = async () => {
    if (!markdown || !metadata) return alert("먼저 Preview를 완료하세요.");
    if (!file) return alert("커밋할 때도 PDF 파일이 필요합니다.");

    setCommitBusy(true);
    try {
      const formData = new FormData();
      formData.append("markdown", markdown);
      formData.append(
        "metadata",
        JSON.stringify({
          ...metadata,
          creator: adminName || metadata.creator || "admin",
        })
      );
      formData.append("file", file);

      const res = await fetch("/api/v1/rag/commit", {
        method: "POST",
        body: formData,
      });
      const parsed = await parseJsonResponse(res);
      if (!parsed.ok) {
        throw new Error(
          toErrorMessage(
            parsed.error?.detail ||
              parsed.error?.message ||
              parsed.data?.detail ||
              parsed.data?.message ||
              "저장에 실패했습니다."
          )
        );
      }
      const data = parsed.data;
      alert(`Vector DB 저장 완료: inserted=${data.inserted}, deleted=${data.deleted}, bm25=${data.bm25_status}`);
    } catch (err) {
      alert(err.message || "저장 요청에 실패했습니다.");
    } finally {
      setCommitBusy(false);
    }
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
              <option>pdfplumber</option>
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
              disabled={commitBusy}
              onClick={handleCommit}
              className={`px-4 py-2 rounded text-white ${commitBusy ? "bg-green-300" : "bg-green-600"}`}
            >
              {commitBusy ? "저장 중..." : "Commit to Vector DB"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
