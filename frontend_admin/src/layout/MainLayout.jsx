import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <Sidebar />
      </aside>

      <main className="flex-1 p-6">
        <Outlet />

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition"
        >
          💬
        </button>

        {/* 챗봇 UI */}
        {chatOpen && (
          <div className="fixed bottom-20 right-6 w-80 h-96 bg-white shadow-lg rounded-lg z-50 p-4">
            <h2 className="font-bold text-lg">Chatbot</h2>
            <p>여기에 챗봇 메시지 표시</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default MainLayout;
