// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";
import KpiCards from "../components/KpiCards";
import ErrorChart from "../components/ErrorChart";
import ErrorLog from "../components/ErrorLog";
import StatsErrorTop5Bar from "../components/StatsErrorTop5Bar";
import { mockdata } from "../mock/mockdata";
import { getTopErrorCodes } from "../utils/errorStats";

const mockLogs = [
  { time: "10:32", device: "UR-10e", code: "", status: "normal" },
  { time: "10:35", device: "HA006B", code: "E110", status: "error" },
  { time: "10:40", device: "UR-5e", code: "", status: "processing" },
  { time: "10:45", device: "HA007B", code: "E203", status: "error" },
];

function Dashboard() {

  const navigate = useNavigate();

  const top3Errors = getTopErrorCodes(mockdata, 7, 3);

  const goErrorLogs = () => {
    navigate("/logs", { state: { status: "error" } });
  };

  const goProcessingLogs = () => {
    navigate("/logs", { state: { status: "processing" } });
  };

  const goDoneLogs = () => {
    navigate("/logs", { state: { status: "done" } });
  };

  return (
  <div className="flex flex-col h-screen w-full overflow-hidden">

  {/* KPI */}
  <div className="p-4 flex-shrink-0">
    <KpiCards
      onErrorClick={goErrorLogs}
      onProcessingClick={goProcessingLogs}
      onDoneClick={goDoneLogs}
    />
  </div>

  {/* main area */}
  <div className="flex flex-1 gap-4 p-4 overflow-hidden min-h-0">

    {/* chart */}
    <div className="flex-1 bg-white p-4 rounded shadow border overflow-hidden">
      <ErrorChart />
    </div>

    {/* right side */}
    <div className="flex flex-col flex-1 gap-4 overflow-hidden min-h-0">
      
      {/* 에러 로그 */}
      <div className="flex-[35] overflow-auto bg-white p-4 rounded shadow border min-h-0">
        <ErrorLog logs={mockLogs} />
      </div>

      {/* Top5 차트 */}
      <div className="flex-[65] bg-white p-4 rounded shadow border min-h-0">
        <StatsErrorTop5Bar data={top3Errors} />
      </div>

    </div>

  </div>

</div>
);
}

export default Dashboard;