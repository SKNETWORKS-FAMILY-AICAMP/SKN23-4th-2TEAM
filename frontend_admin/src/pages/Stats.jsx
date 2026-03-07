import React, { useState } from "react";
import { statsData } from "../mock/mockStats";
import StatsFilters from "../components/StatsFilters";
import StatsErrorTop5Bar from "../components/StatsErrorTop5Bar";
import StatsErrorHeatmap from "../components/StatsErrorHeatmap";

export default function Stats() {
  const [filters, setFilters] = useState({
    period: "week", // week / month
    line: "all",
    device: "",
  });

  // 현재 날짜
  const now = new Date();

  // 필터 적용 (날짜 기준)
  const filteredData = statsData.filter((d) => {
    const dataDate = new Date(d.date);

    // line 필터
    if (filters.line !== "all" && d.line !== filters.line) return false;

    // device 필터
    if (filters.device && d.device !== filters.device) return false;

    // period 필터
    if (filters.period === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return dataDate >= oneWeekAgo && dataDate <= now;
    }

    if (filters.period === "month") {
      return (
        dataDate.getMonth() === now.getMonth() &&
        dataDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });

  return (
    <div className="flex flex-col p-6 space-y-6 w-full h-full">
      <StatsFilters filters={filters} setFilters={setFilters} />
      <div className="flex flex-col md:flex-row gap-6 flex-1">
        <div className="flex-1 bg-white p-4 rounded shadow border min-h-[16rem]">
          <StatsErrorTop5Bar data={filteredData} />
        </div>
        <div className="flex-1 bg-white p-4 rounded shadow border min-h-[16rem]">
          <StatsErrorHeatmap data={filteredData} />
        </div>
      </div>
    </div>
  );
}
