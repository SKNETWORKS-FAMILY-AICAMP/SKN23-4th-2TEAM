import { useEffect, useState } from "react";
import DeviceGrid from "../components/DeviceGrid";
import { API } from "../utils/api";

export default function Lines() {
  const lineOrder = { A: 1, B: 2, C: 3, D: 4 };

  const [selectedLine, setSelectedLine] = useState("A");
  const [devices, setDevices] = useState([]);

  // 🔥 API 호출
  useEffect(() => {
  fetch(API.lines) // ✅ 이걸로 변경
    .then((res) => {
      if (!res.ok) throw new Error("API 실패");
      return res.json();
    })
    .then((data) => {
      const mapped = data.map((d) => ({
        device: d.device_id,
        line: d.line_name,
        lineNum: d.line_num,
        manufacturer: d.manufacturer,
        errorCode: d.error_code,
        occurredAt: d.occurred_at,
        status: d.final_status,
      }));

      setDevices(mapped);
    })
    .catch((err) => console.error("API error:", err));
}, []);
  // 🔥 라인별 그룹핑
  const linesGrouped = devices.reduce((acc, d) => {
    if (!acc[d.line]) acc[d.line] = [];
    acc[d.line].push(d);
    return acc;
  }, {});

  // 🔥 정렬
  Object.keys(linesGrouped).forEach((line) => {
    linesGrouped[line].sort((a, b) => a.lineNum - b.lineNum);
  });

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* 🔥 탭 */}
      <div className="flex gap-2">
        {Object.keys(lineOrder)
          .filter((line) => linesGrouped[line])
          .map((line) => (
            <button
              key={line}
              onClick={() => setSelectedLine(line)}
              className={`px-4 py-2 rounded-lg font-semibold border ${
                selectedLine === line
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              }`}
            >
              {line}라인
            </button>
          ))}
      </div>

      {/* 🔥 카드 영역 */}
      {linesGrouped[selectedLine] && (
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-6">
          <h2 className="text-2xl font-bold border-b pb-2">
            {selectedLine}라인
          </h2>

          <DeviceGrid data={linesGrouped[selectedLine]} />
        </div>
      )}
    </div>
  );
}