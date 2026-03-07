// src/pages/Dashboard.jsx
import KpiCards from "../components/KpiCards";
import ErrorChart from "../components/ErrorChart";
import ErrorLog from "../components/ErrorLog";

// mock 로그
const mockLogs = [
  { time: "10:32", device: "UR-10e", code: "", status: "normal" },
  { time: "10:35", device: "HA006B", code: "E110", status: "error" },
  { time: "10:40", device: "UR-5e", code: "", status: "processing" },
  { time: "10:45", device: "HA007B", code: "E203", status: "error" },
];

function Dashboard() {
  return (
    <div className="flex flex-col flex-1 w-full h-full">
      {/* KPI 카드 */}
      <div className="p-6">
        <KpiCards />
      </div>

      {/* 차트 + 에러 로그 */}
      <div className="flex flex-col md:flex-row flex-1 gap-6 p-6 h-full">
        {/* 차트: 화면 절반 */}
        <div className="flex-1 min-w-0">
          <ErrorChart />
        </div>

        {/* 에러 로그: 화면 절반 */}
        <div className="flex-1 min-w-0 overflow-auto">
          <ErrorLog logs={mockLogs} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
