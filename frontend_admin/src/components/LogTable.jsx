import { useState } from "react";

function LogTable({ logs = [], selectedIds = [], onToggle, onToggleAll }) {
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="overflow-x-auto border rounded shadow bg-white">
      <table className="min-w-full text-sm border-collapse table-auto font-sans">
        <thead className="border-b bg-gray-100">
          <tr>
            <th className="w-10 py-2 px-2 text-center">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    onToggleAll(logs.map(l => l.id));
                  } else {
                    onToggleAll([]);
                  }
                }}
              />
            </th>
            <th className="w-32 py-2 px-2 text-left">시간</th>
            <th className="w-20 py-2 px-2 text-left">라인</th>
            <th className="w-32 py-2 px-2 text-left">장비</th>
            <th className="w-24 py-2 px-2 text-right">코드</th>
            <th className="w-24 py-2 px-2 text-center">상태</th>
            <th className="py-2 px-2 text-left">에러내용</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log) => {
            const status = log.errorCode ? "error" : "normal";
            const isExpanded = expandedIds.includes(log.id);

            return (
              <tr key={log.id} className="hover:bg-gray-50 border-b">
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(log.id)}
                    onChange={() => onToggle(log.id)}
                  />
                </td>

                <td className="py-2 px-2">{log.date} {log.time}</td>
                <td className="py-2 px-2">{log.line}</td>
                <td className="py-2 px-2">{log.device}</td>
                <td className="py-2 px-2 text-right font-mono">{log.errorCode || "-"}</td>
                <td className={`py-2 px-2 text-center ${status === "error" ? "text-red-500" : "text-green-500"}`}>
                  {status === "error" ? "발생" : "정상"}
                </td>
                <td className="py-2 px-2">
                  <div
                    className={`cursor-pointer overflow-hidden transition-all duration-200`}
                    style={{
                      maxHeight: isExpanded ? "500px" : "1.25rem", // 1.25rem ≈ 1줄 높이
                    }}
                    onClick={() => toggleExpand(log.id)}
                    title={log.lastMessage}
                  >
                    {log.lastMessage || "-"}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LogTable;