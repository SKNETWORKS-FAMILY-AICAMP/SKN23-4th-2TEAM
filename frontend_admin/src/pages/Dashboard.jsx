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
    <div className="flex flex-col flex-1 w-full h-full">

      <div className="p-4">
        <KpiCards
          onErrorClick={goErrorLogs}
          onProcessingClick={goProcessingLogs}
          onDoneClick={goDoneLogs}
        />
      </div>

      <div className="flex flex-1 gap-4 p-4 min-h-[400px]">

        <div className="flex-1 min-w-0">
          <ErrorChart />
        </div>

        <div className="flex-1 flex flex-col gap-6 min-w-0">

          <div className="overflow-auto max-h-[60%] bg-white p-4 rounded shadow border">
            <ErrorLog logs={mockLogs} />
          </div>

          <div className="flex-1 bg-white p-4 rounded shadow border">
            <StatsErrorTop5Bar data={top3Errors} />
          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;