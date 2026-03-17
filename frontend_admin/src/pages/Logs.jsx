import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LogFilters from "../components/LogFilters";
import LogTable from "../components/LogTable";
import ExcelDownloadBtn from "../components/ExcelDownloadBtn";
import { API } from "../utils/api";

export default function Logs() {
  const location = useLocation();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    line: "all",
    device: "",
    code: "",
    startDate: "",
    endDate: "",
    status: location.state?.status || "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    const params = new URLSearchParams({
      ...filters,
      page,
      size: pageSize
    });

    fetch(`${API.errorLogs}?${params}`)
      .then(res => res.json())
      .then(data => {
        const mapped = (data.results || []).map((log) => ({
          id: log.error_log_id,
          line: log.line,
          device: log.device,
          errorCode: log.error_code,
          date: log.occurred_at?.split("T")[0] || "",
          hour: parseInt(log.occurred_at?.split("T")[1]?.split(":")[0]) || 0,
        }));

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
        <ExcelDownloadBtn className="px-2 py-1 text-sm" />
      </div>

      <LogTable logs={logs} />

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