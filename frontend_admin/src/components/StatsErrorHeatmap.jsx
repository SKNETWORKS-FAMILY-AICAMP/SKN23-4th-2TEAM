import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  MatrixController,
  MatrixElement
);

export default function StatsErrorHeatmap({ data }) {

  const lines = ["A", "B"];

  // 날짜 전체 추출
  const dateFull = [...new Set(data.map(d => d.date))].sort();

  // 표시용 날짜
  const dates = dateFull.map(d => d.slice(5,10));

  const matrixData = [];

  lines.forEach(line => {
    dateFull.forEach(fullDate => {

      const count = data.filter(
        d =>
          d.line === line &&
          d.date === fullDate &&
          d.errorCode
      ).length;

      matrixData.push({
        x: fullDate,   // ⭐ 문자열 날짜 그대로 사용
        y: line,
        v: count
      });

    });
  });

  const chartData = {
    datasets: [{
      label: "라인별 에러 히트맵",
      data: matrixData,

      backgroundColor: ctx => {
        const v = ctx.raw.v;
        return `rgba(255,0,0,${Math.min(v / 5, 1)})`;
      },

      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",

      width: 25,
      height: 25
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      title: {
        display: true,
        text: "라인별 에러 히트맵"
      },

      tooltip: {
        callbacks: {
          label: ctx =>
            `라인: ${ctx.raw.y} | 날짜: ${ctx.raw.x} | 에러: ${ctx.raw.v}`
        }
      }
    },

    scales: {
      x: {
        type: "category",
        labels: dateFull   // ⭐ 실제 날짜 사용
      },
      y: {
        type: "category",
        labels: lines
      }
    }
  };

  return (
    <div style={{ height: "240px" }}>
      <Chart type="matrix" data={chartData} options={options} />
    </div>
  );
}