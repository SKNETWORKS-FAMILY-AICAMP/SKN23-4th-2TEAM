import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockdata } from "../mock/mockdata";

function ErrorChart() {
  const [selectedLine, setSelectedLine] = useState("all");

  // 오늘 기준 최근 7일 생성
  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  });

  // 7일 기본 데이터 생성
  const baseData = last7Days.reduce((acc, date) => {
    acc[date] = { time: date, a: 0, b: 0 };
    return acc;
  }, {});

  // mockdata 집계
  mockdata.forEach((log) => {
    if (!log.errorCode) return;
    if (!baseData[log.date]) return;

    if (log.line === "A") baseData[log.date].a += 1;
    if (log.line === "B") baseData[log.date].b += 1;
  });

  const chartData = Object.values(baseData);

  const lines = [
    { id: "all", label: "All" },
    { id: "a", label: "A라인" },
    { id: "b", label: "B라인" },
  ];

  return (
    <div className="h-full flex flex-col bg-white p-4 rounded-lg shadow border">
      <h2 className="font-bold mb-4">라인별 에러 발생 비교 (최근 7일)</h2>

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