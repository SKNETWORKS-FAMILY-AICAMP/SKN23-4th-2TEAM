// src/components/LogTable.jsx
import { useState } from "react";

function LogTable({ logs = [] }) {
  const [page, setPage] = useState(1);
  const perPage = 5; // 한 페이지당 행 수

  const totalPages = Math.ceil(logs.length / perPage);
  const paginatedLogs = logs.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="overflow-auto border rounded shadow bg-white">
      <table className="w-full text-sm table-fixed border-collapse">
        <thead className="border-b bg-gray-100">
          <tr>
            <th className="w-36 py-2">시간</th>
            <th className="w-20">라인</th>
            <th className="w-32">장비</th>
            <th className="w-24">코드</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {paginatedLogs.map((log, i) => (
            <tr key={i} className="hover:bg-gray-50 border-b">
              <td className="truncate">{log.time}</td>
              <td>{log.line}</td>
              <td>{log.device}</td>
              <td className="font-mono">{log.code || "-"}</td>
              <td
                className={
                  log.status === "error"
                    ? "text-red-500"
                    : log.status === "processing"
                      ? "text-yellow-500"
                      : "text-green-500"
                }
              >
                {log.status === "error"
                  ? "발생"
                  : log.status === "processing"
                    ? "처리중"
                    : "해결"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      {/* <div className="flex justify-end p-2 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            className={`px-2 py-1 rounded border ${
              page === i + 1 ? "bg-blue-500 text-white" : "bg-white"
            }`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div> */}
    </div>
  );
}

export default LogTable;
