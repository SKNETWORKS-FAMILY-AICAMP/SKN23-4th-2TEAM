// src/components/StatsFilters.jsx
import { useState } from "react";

export default function StatsFilters({ filters, setFilters }) {
  const [period, setPeriod] = useState(filters.period);
  const [line, setLine] = useState(filters.line);
  const [device, setDevice] = useState(filters.device);

  const applyFilters = () => {
    setFilters({ period, line, device });
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* 기간 선택 */}
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="border px-2 py-1 rounded"
      >
        <option value="week">주간</option>
        <option value="month">월간</option>
      </select>

      {/* 라인 선택 */}
      <select
        value={line}
        onChange={(e) => setLine(e.target.value)}
        className="border px-2 py-1 rounded"
      >
        <option value="all">전체</option>
        <option value="A">A라인</option>
        <option value="B">B라인</option>
      </select>

      {/* 장비명 입력 */}
      <input
        type="text"
        placeholder="장비명"
        value={device}
        onChange={(e) => setDevice(e.target.value)}
        className="border px-2 py-1 rounded"
      />

      <button
        onClick={applyFilters}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        적용
      </button>
    </div>
  );
}
