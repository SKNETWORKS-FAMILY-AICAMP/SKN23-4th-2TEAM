import { useState } from "react";
import LogFilters from "../components/LogFilters";
import LogTable from "../components/LogTable";
import ExcelDownloadBtn from "../components/ExcelDownloadBtn";

// mock 데이터
const mockLogs = [
  {
    time: "2026-03-07 10:32",
    line: "A",
    device: "UR-10e",
    code: "",
    status: "normal",
  },
  {
    time: "2026-03-07 10:35",
    line: "B",
    device: "HA006B",
    code: "E110",
    status: "error",
  },
  {
    time: "2026-03-07 10:40",
    line: "A",
    device: "UR-5e",
    code: "",
    status: "processing",
  },
  {
    time: "2026-03-07 10:45",
    line: "B",
    device: "HA007B",
    code: "E203",
    status: "error",
  },
  {
    time: "2026-03-07 11:00",
    line: "A",
    device: "UR-10e",
    code: "E110",
    status: "error",
  },
  {
    time: "2026-03-07 11:05",
    line: "B",
    device: "HA008B",
    code: "",
    status: "normal",
  },
  // ... 추가 mock 로그
];

export default function Logs() {
  const [logs] = useState(mockLogs);

  const [filters, setFilters] = useState({
    line: "all",
    device: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 5; // 페이지당 표시 개수

  const filteredLogs = logs.filter((log) => {
    if (filters.line !== "all" && log.line !== filters.line) return false;
    if (
      filters.device &&
      !log.device.toLowerCase().includes(filters.device.toLowerCase())
    )
      return false;
    if (
      filters.code &&
      !log.code.toLowerCase().includes(filters.code.toLowerCase())
    )
      return false;
    if (filters.startDate && log.time.split(" ")[0] < filters.startDate)
      return false;
    if (filters.endDate && log.time.split(" ")[0] > filters.endDate)
      return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col p-6 space-y-4 w-full h-full">
      {/* 엑셀 버튼 오른쪽 끝 */}
      <div className="flex justify-end">
        <ExcelDownloadBtn className="px-2 py-1 text-sm" />
      </div>

      {/* 로그 테이블 */}
      <LogTable logs={pagedLogs} />

      {/* 페이지네이션: 가운데 정렬 */}
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
      {/* 필터 */}
      <LogFilters filters={filters} setFilters={setFilters} />
    </div>
  );
}
