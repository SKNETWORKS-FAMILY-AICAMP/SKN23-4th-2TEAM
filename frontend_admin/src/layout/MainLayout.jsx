import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col relative overflow-x-hidden">

        <div className="flex-1 px-8">
  <Outlet />
</div>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition"
        >
          💬
        </button>

        {chatOpen && (
          <div className="fixed bottom-20 right-6 w-96 h-96 bg-white border shadow-xl rounded-lg z-50 flex flex-col">
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="font-bold">Chatbot</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-gray-800 font-bold"
              >
                ✖
              </button>
            </div>

            <div className="flex-1 p-3 overflow-auto">
              <p>안녕하세요! 여기에 챗봇 UI 들어갑니다.</p>
            </div>

            <div className="p-3 border-t">
              <input
                type="text"
                placeholder="메시지 입력..."
                className="w-full border rounded p-2"
              />
            </div>
          </div>
        )}

      </main>

    </div>
  );
}

export default MainLayout;