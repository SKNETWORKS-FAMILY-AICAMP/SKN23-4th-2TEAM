import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "2026-03-01", a: 1, b: 4 },
  { time: "2026-03-02", a: 3, b: 2 },
  { time: "2026-03-03", a: 2, b: 3 },
  { time: "2026-03-04", a: 5, b: 1 },
  { time: "2026-03-05", a: 3, b: 6 },
  { time: "2026-03-06", a: 6, b: 4 },
  { time: "2026-03-07", a: 4, b: 2 },
];

function ErrorChart() {
  const [selectedLine, setSelectedLine] = useState("all"); // all, a, b

  // 토글 버튼 배열
  const lines = [
    { id: "all", label: "All" },
    { id: "a", label: "A라인" },
    { id: "b", label: "B라인" },
  ];

  return (
    <div className="h-full flex flex-col bg-white p-4 rounded-lg shadow border">
      <h2 className="font-bold mb-4">라인별 에러 발생 비교</h2>

      {/* 토글 버튼 */}
      <div className="flex gap-2 mb-4">
        {lines.map((line) => (
          <button
            key={line.id}
            onClick={() => setSelectedLine(line.id)}
            className={`
              px-4 py-1 rounded-full font-semibold transition
              ${
                selectedLine === line.id
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }
            `}
          >
            {line.label}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            {(selectedLine === "all" || selectedLine === "a") && (
              <Line
                type="monotone"
                dataKey="a"
                stroke="#ef4444" // 빨간색
                strokeWidth={2}
              />
            )}

            {(selectedLine === "all" || selectedLine === "b") && (
              <Line
                type="monotone"
                dataKey="b"
                stroke="#3b82f6" // 파란색
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ErrorChart;
