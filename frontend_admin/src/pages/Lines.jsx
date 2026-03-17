import { useState } from "react";
import { mockdata } from "../mock/mockdata";
import DeviceGrid from "../components/DeviceGrid";

export default function Lines() {
  const lineOrder = { A: 1, B: 2, C: 3, D: 4 };

  const [selectedLine, setSelectedLine] = useState("A"); // 👈 추가

  const toTimestamp = (d) =>
    Date.parse(`${d.date}T${String(d.hour).padStart(2, "0")}:00:00`);

  const latestDevices = Object.values(
    mockdata.reduce((acc, d) => {
      const key = `${d.device}|${d.line}|${d.lineNum}`;
      const curr = acc[key];
      if (!curr || toTimestamp(d) > toTimestamp(curr)) acc[key] = d;
      return acc;
    }, {})
  );

  const linesGrouped = latestDevices.reduce((acc, d) => {
    if (!acc[d.line]) acc[d.line] = [];
    acc[d.line].push(d);
    return acc;
  }, {});

  Object.keys(linesGrouped).forEach((line) => {
    linesGrouped[line].sort((a, b) => a.lineNum - b.lineNum);
  });

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* 🔥 탭 영역 */}
      <div className="flex gap-2">
        {Object.keys(lineOrder)
          .filter((line) => linesGrouped[line])
          .map((line) => (
            <button
              key={line}
              onClick={() => setSelectedLine(line)}
              className={`px-4 py-2 rounded-lg font-semibold border
                ${
                  selectedLine === line
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100"
                }`}
            >
              {line}라인
            </button>
          ))}
      </div>

      {/* 🔥 선택된 라인만 표시 */}
      {linesGrouped[selectedLine] && (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full flex flex-col gap-6">
          <h2 className="text-2xl lg:text-3xl font-bold border-b pb-2">
            {selectedLine}라인
          </h2>

          <DeviceGrid data={linesGrouped[selectedLine]} />
        </div>
      )}
    </div>
  );
}