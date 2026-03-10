import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockdata } from "../mock/mockdata"; // 기존 mockdata 그대로

function ErrorChart() {
  const [selectedLine, setSelectedLine] = useState("all");

  // 날짜별 라인별 에러 개수 집계
  const chartData = Object.values(
    mockdata.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) acc[date] = { time: date, a: 0, b: 0 };
      if (log.errorCode) {
        if (log.line === "A") acc[date].a += 1;
        if (log.line === "B") acc[date].b += 1;
      }
      return acc;
    }, {})
  );

  const lines = [
    { id: "all", label: "All" },
    { id: "a", label: "A라인" },
    { id: "b", label: "B라인" },
  ];

  return (
    <div className="h-full flex flex-col bg-white p-4 rounded-lg shadow border">
      <h2 className="font-bold mb-4">라인별 에러 발생 비교</h2>

      <div className="flex gap-2 mb-4">
        {lines.map((line) => (
          <button
            key={line.id}
            onClick={() => setSelectedLine(line.id)}
            className={`px-4 py-1 rounded-full font-semibold transition ${
              selectedLine === line.id
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {line.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            {(selectedLine === "all" || selectedLine === "a") && (
              <Line type="monotone" dataKey="a" stroke="#ef4444" strokeWidth={2} />
            )}
            {(selectedLine === "all" || selectedLine === "b") && (
              <Line type="monotone" dataKey="b" stroke="#3b82f6" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ErrorChart;