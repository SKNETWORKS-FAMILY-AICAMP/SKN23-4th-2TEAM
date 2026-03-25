import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import AdminChatBot from "../components/AdminChatBot";

function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <Sidebar />
      </aside>

      <main className="flex-1 p-6">
        <Outlet />

        {/* 챗봇 토글 버튼 */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition"
        >
          💬
        </button>

        {/* 실물 챗봇 UI 연결 */}
        {chatOpen && (
          <div className="fixed bottom-24 right-6 w-96 h-[550px] bg-white shadow-2xl rounded-lg z-50 overflow-hidden flex flex-col">
            <AdminChatBot />
          </div>
        )}
      </main>
    </div>
  );
}


export default MainLayout;
