import React from "react";

export default function ErrorLogFilters({ filters, setFilters }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
      {/* 날짜 */}
      <div>
        <label className="block text-sm font-medium mb-1">기간 선택</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        />{" "}
        ~
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        />
      </div>

      {/* 장비명 */}
      <div>
        <label className="block text-sm font-medium mb-1">장비명</label>
        <input
          type="text"
          name="deviceName"
          placeholder="검색..."
          value={filters.deviceName}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        />
      </div>

      {/* 라인 */}
      <div>
        <label className="block text-sm font-medium mb-1">라인</label>
        <select
          name="line"
          value={filters.line}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="">전체</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </div>

      {/* 엑셀 버튼 */}
      <div className="ml-auto">
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          엑셀 다운로드
        </button>
      </div>
    </div>
  );
}
