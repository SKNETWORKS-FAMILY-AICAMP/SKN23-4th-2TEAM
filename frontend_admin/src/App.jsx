import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Lines from "./pages/Lines";
import Logs from "./pages/Logs";
import Stats from "./pages/Stats";
import RagIngestion from "./pages/RAG_Ingestion";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* / 경로일 때 Dashboard 렌더링 */}
          <Route index element={<Dashboard />} />
          <Route path="lines" element={<Lines />} />
          <Route path="logs" element={<Logs />} />
          <Route path="stats" element={<Stats />} />
          <Route path="rag-ingestion" element={<RagIngestion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
