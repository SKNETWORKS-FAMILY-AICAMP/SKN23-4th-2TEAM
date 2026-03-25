import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Lines from "./pages/Lines";
import Logs from "./pages/Logs";
import Stats from "./pages/Stats";
import RagIngestion from "./pages/RAG_Ingestion";
import PinPage from "./pages/PinLoginPage";

function App() {
  const [pinVerified, setPinVerified] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("pinVerified");
    if (saved === "true") setPinVerified(true);
  }, []);

  const handlePinSuccess = () => {
    setPinVerified(true);
    sessionStorage.setItem("pinVerified", "true");
  };

  const handleChatClick = () => {
    if (!pinVerified) {
      alert("PIN 인증 후 사용할 수 있습니다.");
      return;
    }
    setChatOpen(!chatOpen);
  };

  return (
    <BrowserRouter>
      {/* 챗봇 버튼 */}
      {pinVerified && (
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition"
      >
      💬
    </button>
)}

      {/* 챗봇 내용 */}
      {chatOpen && pinVerified && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white shadow-lg rounded-lg z-50 p-4">
          <h2 className="font-bold text-lg">Chatbot</h2>
          {/* 챗봇 메시지나 UI */}
        </div>
      )}

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
        <PinPage onSuccess={handlePinSuccess} />
      )}
    </BrowserRouter>
  );
}
export default App;