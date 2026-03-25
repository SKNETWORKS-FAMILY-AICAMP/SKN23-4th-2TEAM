// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";
import KpiCards from "../components/KpiCards";
import ErrorChart from "../components/ErrorChart";
import ErrorLog from "../components/ErrorLog";
import StatsErrorTop5Bar from "../components/StatsErrorTop5Bar";
import { useEffect, useState } from "react";
import { API } from "../utils/api";


function Dashboard() {

  const navigate = useNavigate();

  const [summary, setSummary] = useState({});
  const [recentLogs, setRecentLogs] = useState([]);
  const [lineTrends, setLineTrends] = useState([]);
  const [topErrors, setTopErrors] = useState([]);

  useEffect(() => {

    fetch(API.dashboardSummary)
      .then(res => res.json())
      .then(data => setSummary(data));

    fetch(API.recentLogs)
  .then(res => res.json())
  .then(data => {
    console.log("recentLogs API:", data);
    setRecentLogs(data.recent_logs);   // ✅ 맞음
  });

    fetch(API.lineTrends)
      .then(res => res.json())
      .then(data => setLineTrends(data.lines));

    fetch(API.topErrors)
      .then(res => res.json())
      .then(data => setTopErrors(data.top_errors));

  }, []);

  // const top3Errors = getTopErrorCodes(mockdata, 7, 3);

  const goErrorLogs = () => {
    navigate("/logs", { state: { status: "ongoing" } });
  };

  const goProcessingLogs = () => {
    navigate("/logs", { state: { status: "ongoing" } });
  };

  const goDoneLogs = () => {
    navigate("/logs", { state: { status: "resolved" } });
  };

  

  return (
  <div className="flex flex-col h-screen w-full overflow-hidden">

  {/* KPI */}
  <div className="p-4 flex-shrink-0">
    <KpiCards
      summary={summary}
      onErrorClick={goErrorLogs}
      onProcessingClick={goProcessingLogs}
      onDoneClick={goDoneLogs}
    />
  </div>

  {/* main area */}
  <div className="flex flex-1 gap-4 p-4 overflow-hidden min-h-0">

    {/* chart */}
    <div className="flex-1 bg-white p-4 rounded shadow border overflow-hidden">
      <ErrorChart data={lineTrends}/>
    </div>

    {/* right side */}
    <div className="flex flex-col flex-1 gap-4 overflow-hidden min-h-0">
      
      {/* 에러 로그 */}
      <div className="flex-[35] overflow-auto bg-white p-4 rounded shadow border min-h-0">
        <ErrorLog logs={recentLogs} />
      </div>

      {/* Top5 차트 */}
      <div className="flex-[65] bg-white p-4 rounded shadow border min-h-0">
        <StatsErrorTop5Bar data={topErrors} />
      </div>

    </div>

  </div>

</div>
);
}

export default Dashboard;