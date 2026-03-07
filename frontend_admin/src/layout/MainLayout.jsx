import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar: 고정폭 */}
      <Sidebar />

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col bg-white min-h-screen w-full relative">
        <Outlet />

        {/* 챗봇 버튼 */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition"
        >
          💬
        </button>

        {/* 챗봇 모달 */}
        {chatOpen && (
          <div className="fixed bottom-20 right-6 w-96 h-96 bg-white border shadow-xl rounded-lg z-50 flex flex-col">
            <div className="flex justify-between items-center p-2 border-b">
              <h3 className="font-bold">Chatbot</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-gray-800 font-bold"
              >
                ✖
              </button>
            </div>

            <div className="flex-1 p-2 overflow-auto">
              {/* 챗봇 내용 */}
              <p>안녕하세요! 여기에 챗봇 UI 들어갑니다.</p>
            </div>

            <div className="p-2 border-t">
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
