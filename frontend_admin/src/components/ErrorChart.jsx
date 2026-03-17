import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ErrorChart({ data }) {

  const [selectedLine, setSelectedLine] = useState("all");

  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const baseData = last7Days.reduce((acc, date) => {
    acc[date] = { time: date, a: 0, b: 0, c: 0, d: 0 };
    return acc;
  }, {});

  // API 데이터 반영
  data.forEach((item) => {
    const date = item.date;
    const line = item.device__line_name;
    const count = item.count;

    if (!baseData[date]) return;

    if (line === "A") baseData[date].a = count;
    if (line === "B") baseData[date].b = count;
    if (line === "C") baseData[date].c = count;
    if (line === "D") baseData[date].d = count;
  });

  const chartData = Object.values(baseData);

  const lines = [
    { id: "all", label: "All" },
    { id: "a", label: "A라인" },
    { id: "b", label: "B라인" },
    { id: "c", label: "C라인" },
    { id: "d", label: "D라인" },
  ];

  return (
    <div className="h-full flex flex-col bg-white p-4 rounded-lg shadow border">
      <h2 className="font-bold mb-4">라인별 에러 발생 비교 (최근 7일)</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
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

            {(selectedLine === "all" || selectedLine === "c") && (
              <Line type="monotone" dataKey="c" stroke="#f59e0b" strokeWidth={2} />
            )}

            {(selectedLine === "all" || selectedLine === "d") && (
              <Line type="monotone" dataKey="d" stroke="#22c55e" strokeWidth={2} />
            )}

          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ErrorChart;