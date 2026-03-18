import { useState } from "react";

export default function LogFilters({ filters, setFilters }) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // 초기값
  const [line, setLine] = useState(filters.line);
  const [device, setDevice] = useState(filters.device);
  const [code, setCode] = useState(filters.code);
  const [startDate, setStartDate] = useState(filters.startDate || todayStr);
  const [endDate, setEndDate] = useState(filters.endDate || todayStr);

  const applyFilters = () => {
    setFilters({ line, device, code, startDate, endDate });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") applyFilters();
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">

      {/* 라인 선택 */}
      <select
        value={line}
        onChange={(e) => setLine(e.target.value)}
        className="border px-2 py-1 rounded"
      >
        <option value="all">전체</option>
        <option value="A">A라인</option>
        <option value="B">B라인</option>
        <option value="C">C라인</option>
        <option value="D">D라인</option>
      </select>

      {/* 장비명 검색 */}
      <input
        type="text"
        placeholder="장비명"
        value={device}
        onChange={(e) => setDevice(e.target.value)}
        onKeyPress={handleKeyPress}
        className="border px-2 py-1 rounded"
      />

      {/* 에러코드 검색 */}
      <input
        type="text"
        placeholder="에러코드"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyPress={handleKeyPress}
        className="border px-2 py-1 rounded"
      />

      {/* 날짜 검색 */}
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <span className="text-gray-500">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>

      {/* 필터 적용 */}
      <button
        onClick={applyFilters}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        검색
      </button>

    </div>
  );
}