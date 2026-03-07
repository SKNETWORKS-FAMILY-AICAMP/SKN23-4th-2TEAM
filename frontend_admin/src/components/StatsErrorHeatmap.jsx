import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Title, // ✅ Title 플러그인 등록
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

export default function StatsErrorHeatmap({ data }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const counts = hours.map((h) =>
    data.filter((d) => d.hour === h).reduce((sum, d) => sum + d.errors, 0),
  );

  const chartData = {
    labels: hours.map((h) => `${h}:00`),
    datasets: [
      {
        label: "시간대별 에러",
        data: counts,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      title: {
        display: true,
        text: "시간대별 에러 히트맵", // ✅ 그래프 제목
        font: { size: 18 },
      },
    },
    scales: {
      y: {
        ticks: { precision: 0 },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
