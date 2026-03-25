import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LogFilters from "../components/LogFilters";
import LogTable from "../components/LogTable";
import ExcelDownloadBtn from "../components/ExcelDownloadBtn";
import { API } from "../utils/api";


export default function Logs() {
  const [selectedIds, setSelectedIds] = useState([]);
  const location = useLocation();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    line: "all",
    device: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((v) => v !== id)
        : [...prev, id]
    );
  };

  const toggleAll = (ids) => {
    setSelectedIds(ids);
  };

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    const params = new URLSearchParams({
      ...filters,
      page,
      size: pageSize
    });

    console.log("🔹 요청 URL:", `${API.errorLogs}?${params}`); // 요청 URL 확인

    fetch(`${API.errorLogs}?${params}`)
      .then(res => res.json())
      .then(data => {
        const mapped = (data.results || []).map((log) => {
          const sessions = log.sessions || [];
          const latestSession = sessions[0] || {};
          
          let checklistText = "";
          if (latestSession.checklist_items && latestSession.checklist_items.length > 0) {
            checklistText = latestSession.checklist_items.map(i => `[${i.is_checked ? 'O' : 'X'}] ${i.item_content}`).join('\n');
          }

          return {
            id: log.error_log_id,
            line: log.line_name || "-",                      
            device: log.device?.device_name || log.device || "-", 
            errorCode: log.error_code || "-",
            language: log.language || "KO",
            status: log.final_status || "미해결",
            date: log.occurred_at?.split("T")[0] || "",
            time: log.occurred_at?.split("T")[1]?.slice(0, 5) || "",
            resolvedAt: log.resolved_at || "-",
            manufacturer: log.manufacturer || "-",
            initialResponse: latestSession.initial_diagnosis || "",
            checklistResponse: checklistText || "",
            finalResponse: latestSession.final_diagnosis || "",
          };
        });

        console.log("🔹 맵핑 후 로그:", mapped); // map 후 데이터 확인
        setLogs(mapped);
        setTotal(data.total || 0);
      })
      .catch(err => console.error("API error:", err));
  }, [filters, page]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="flex flex-col p-6 space-y-4 w-full h-full">
      <div className="flex items-center justify-between">
        <LogFilters filters={filters} setFilters={setFilters} />
        <ExcelDownloadBtn
          selectedLogs={logs.filter(log => selectedIds.includes(log.id))}
          className="px-2 py-1 text-sm"
        />
      </div>

      <LogTable 
        logs={logs}
        selectedIds={selectedIds}
        onToggle={toggleSelect}
        onToggleAll={toggleAll} 
      />

      <div className="flex justify-center mt-2 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 rounded ${
              page === i + 1
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}