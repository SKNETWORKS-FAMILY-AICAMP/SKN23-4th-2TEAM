import React from "react";
import { Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function StatsErrorTop5Bar({ data }) {
  // data = [{ errorCode, count }, ...]
  const chartData = {
    labels: data.map((d) => d.errorCode),
    datasets: [
      {
        label: "Top 3 Error Codes",
        data: data.map((d) => d.count),
        backgroundColor: "rgba(255,99,132,0.6)",
      },
    ],
  };

  return (
    <div>
      <Bar
        data={chartData}
        options={{
          scales: {
            y: { ticks: { precision: 0 } },
          },
          plugins: {
            title: {
              display: true,
              text: "1주일 간 빈출 에러 TOP 3",
              font: { size: 18 },
            },
          },
        }}
      />
    </div>
  );
}