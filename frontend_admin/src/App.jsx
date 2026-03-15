import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Lines from "./pages/Lines";
import Logs from "./pages/Logs";
import Stats from "./pages/Stats";
import RagIngestion from "./pages/RAG_Ingestion";
import PinPage from "./pages/PinLoginPage";

function App() {
  const [pinVerified, setPinVerified] = useState(false);

  return (
    <BrowserRouter>
      {pinVerified ? (
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="lines" element={<Lines />} />
            <Route path="logs" element={<Logs />} />
            <Route path="stats" element={<Stats />} />
            <Route path="rag-ingestion" element={<RagIngestion />} />
          </Route>
        </Routes>
      ) : (
        <PinPage onSuccess={() => setPinVerified(true)} />
      )}
    </BrowserRouter>
  );
}

export default App;
