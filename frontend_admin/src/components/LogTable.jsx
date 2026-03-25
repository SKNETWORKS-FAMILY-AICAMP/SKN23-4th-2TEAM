import { useState } from "react";

const formatText = (text) => {
  if (!text) return "-";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

function LogTable({ logs = [], selectedIds = [], onToggle, onToggleAll }) {
  const [modalLog, setModalLog] = useState(null); // 모달에 표시할 로그
  const [activeTab, setActiveTab] = useState("initial"); // 초기 탭

  return (
    <>
      <div className="overflow-x-auto border rounded shadow bg-white">
        <table className="min-w-full text-sm border-collapse table-auto font-sans">
          <thead className="border-b bg-gray-100">
            <tr>
              <th className="w-10 py-2 px-2 text-center">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    e.target.checked
                      ? onToggleAll(logs.map((l) => l.id))
                      : onToggleAll([])
                  }
                />
              </th>
              <th className="w-24 py-2 px-2 text-left whitespace-nowrap">발생 시각</th>
              <th className="w-28 py-2 px-2 text-left whitespace-nowrap">해결완료시간</th>
              <th className="w-16 py-2 px-2 text-left">라인</th>
              <th className="w-32 py-2 px-2 text-left">장비</th>
              <th className="w-20 py-2 px-2 text-left">브랜드</th>
              <th className="w-20 py-2 px-2 text-left">코드</th>
              <th className="w-16 py-2 px-2 text-center">언어</th>
              <th className="w-20 py-2 px-2 text-center">상태</th>
              <th className="w-24 py-2 px-2 text-center">에러 상세</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => {
              return (
                <tr key={log.id} className="hover:bg-gray-50 border-b">
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={() => onToggle(log.id)}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="text-xs">{log.date}</div>
                    <div className="text-xs text-gray-500">{log.time}</div>
                  </td>
                  <td className="py-2 px-2">
                    {log.resolvedAt !== "-" ? (
                      <>
                        <div className="text-xs">{log.resolvedAt.split(" ")[0]}</div>
                        <div className="text-xs text-gray-500">{log.resolvedAt.split(" ")[1]}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs">{log.line}</td>
                  <td className="py-2 px-2 text-xs font-semibold">{log.device}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{log.manufacturer}</td>
                  <td className="py-2 px-2 text-left text-xs font-mono text-gray-700">{log.errorCode || "-"}</td>
                  <td className="py-2 px-2 text-center text-xs font-semibold text-gray-500">{log.language}</td>
                  <td className={`py-2 px-2 text-center text-xs font-bold ${log.status === "미해결" ? "text-red-500" : "text-green-500"}`}>
                    {log.status}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => {
                        setModalLog(log);
                        setActiveTab("initial"); // 모달 열 때 초기 탭
                      }}
                      className="bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-blue-600 shadow-sm transition-colors"
                    >
                      자세히
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {modalLog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          onClick={() => setModalLog(null)} // 배경 클릭 시 닫기
        >
          <div
            className="bg-white p-6 rounded shadow-lg w-96 max-w-full"
            onClick={(e) => e.stopPropagation()} // 내부 클릭은 이벤트 전파 막기
          >
            <h2 className="text-lg font-bold mb-4">에러 상세</h2>

            {/* 탭 */}
            <div className="flex mb-4 border-b">
              {[
                { key: "initial", label: "초기답변" },
                { key: "checklist", label: "체크리스트" },
                { key: "final", label: "최종답변" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1 -mb-px border-b-2 ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-500 font-semibold"
                      : "border-transparent text-gray-500 hover:text-blue-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 내용 */}
            <div className="whitespace-pre-wrap mb-4 text-gray-800 text-sm leading-relaxed">
              {activeTab === "initial" && formatText(modalLog.initialResponse)}
              {activeTab === "checklist" && formatText(modalLog.checklistResponse)}
              {activeTab === "final" && formatText(modalLog.finalResponse)}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setModalLog(null)}
                className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LogTable;