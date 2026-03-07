// StatsErrorTop5Bar.jsx
import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";

export default function StatsErrorTop5Bar({ data }) {
  // data는 Stats.jsx에서 필터링된 데이터를 받음

  // 에러 코드별 합계 계산 + Top5
  const topErrors = useMemo(() => {
    const errorMap = {};

    data.forEach((d) => {
      if (!d.errorCode || typeof d.errors !== "number") return;
      if (!errorMap[d.errorCode]) errorMap[d.errorCode] = 0;
      errorMap[d.errorCode] += d.errors;
    });

    return Object.entries(errorMap)
      .map(([code, total]) => ({ code, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data]);

  const chartData = {
    labels: topErrors.map((e) => e.code),
    datasets: [
      {
        label: "Top 5 Error Codes",
        data: topErrors.map((e) => e.total),
        backgroundColor: "rgba(75,192,192,0.6)",
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
              text: "빈출 에러 TOP 5",
              font: { size: 18 },
            },
          },
        }}
      />
    </div>
  );
}
