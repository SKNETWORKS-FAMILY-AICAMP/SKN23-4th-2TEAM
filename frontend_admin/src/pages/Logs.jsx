import { useState } from "react";
import { useLocation } from "react-router-dom";
import { mockdata } from "../mock/mockdata";
import LogFilters from "../components/LogFilters";
import LogTable from "../components/LogTable";
import ExcelDownloadBtn from "../components/ExcelDownloadBtn";

export default function Logs() {

  const location = useLocation();

  const [logs] = useState(mockdata);

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

  const filteredLogs = logs
  .filter((log) => {

    if (filters.line !== "all" && log.line !== filters.line) return false;

    if (
      filters.device &&
      !log.device.toLowerCase().includes(filters.device.toLowerCase())
    )
      return false;

    if (
      filters.code &&
      !(log.errorCode || "")
        .toLowerCase()
        .includes(filters.code.toLowerCase())
    )
      return false;

    if (filters.startDate && log.date < filters.startDate) return false;

    if (filters.endDate && log.date > filters.endDate) return false;

    // 상태 필터
    if (filters.status === "error" && !log.errorCode) return false;

    if (filters.status === "normal" && log.errorCode) return false;

    return true;

  })
  .sort((a, b) => {

    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return b.hour - a.hour;

  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const pagedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="flex flex-col p-6 space-y-4 w-full h-full">

      <div className="flex items-center justify-between">
        <LogFilters filters={filters} setFilters={setFilters} />
        <ExcelDownloadBtn className="px-2 py-1 text-sm" />
      </div>

      <LogTable logs={pagedLogs} />

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