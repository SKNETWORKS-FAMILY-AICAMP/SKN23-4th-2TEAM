import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = "/api/v1";

function AdminChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("데이터 집계 중...");
  const messagesEndRef = useRef(null);

  // 로딩 텍스트 전치 순환
  useEffect(() => {
    let interval;
    if (isLoading) {
      const tips = [
        "분석 데이터를 집계하고 있습니다...",
        "과거 로그를 대조 검토 중입니다...",
        "비정상 패턴 가이드 매뉴얼을 탐색 중입니다...",
        "AI 응답 가공 및 브리핑 문서 작성 중입니다...",
        "💡 팁: 우측 상단 갱신 버튼으로 실시간 상태 갱신이 가능합니다.",
        "💡 팁: 특정 로봇ID나 에러코드를 직접 질문하셔도 답변 드립니다!"
      ];
      let i = 0;
      setLoadingText(tips[0]);
      interval = setInterval(() => {
        i = (i + 1) % tips.length;
        setLoadingText(tips[i]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);


  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 최초 진입시 브리핑 로드
  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin-ai/briefing`);
      const data = response.data;

      setMessages([
        {
          id: Date.now(),
          sender: "assistant",
          text: data.briefing_text || data.answer_text || "브리핑을 불러오지 못했습니다.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

    } catch (error) {
      console.error("Failed to fetch briefing:", error);
      setMessages([
        {
          id: Date.now(),
          sender: "assistant",
          text: "에러가 발생했습니다. 브리핑을 불러올 수 없습니다.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e, directText = null) => {
    if (e) e.preventDefault();
    const messageText = directText || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!directText) setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/admin-ai/ask`, {
        question: messageText,
        language: "ko",
      });


      const data = response.data;
      const assistantMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: data.answer_text || "답변을 드릴 수 없습니다.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to ask manager:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "assistant",
          text: "시스템 에러로 답변을 생성하지 못했습니다.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-sm">관리자 AI 비서</h3>
        </div>
        <button
          onClick={fetchBriefing}
          className="text-xs text-blue-300 hover:text-blue-100"
          title="브리핑 다시 가져오기"
        >
          갱신
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl shadow-sm text-sm ${msg.sender === "user"
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div
                className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-blue-100" : "text-gray-400"
                  }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-3 rounded-xl rounded-bl-none shadow-sm flex flex-col space-y-1">
              <div className="text-[10px] text-gray-400 font-medium">AI 비서 분석 중</div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-normal">{loadingText}</span>
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />

      </div>

      {/* Quick Menu */}
      <div className="p-2 bg-gray-50 grid grid-cols-2 gap-1.5 border-t border-gray-100">
        {[
          "오늘의 주요 에러 요약",
          "미해결 에러",
          "최근 에러 많은 라인",
          "자주 발생하는 TOP 5 에러",
        ].map((menu, index) => (
          <button
            key={index}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendMessage(null, menu)}
            className="text-[11px] bg-white hover:bg-slate-100 disabled:opacity-50 border border-gray-200 text-gray-700 font-medium px-2 py-1.5 rounded-full shadow-sm transition text-center"
          >
            {menu}
          </button>
        ))}
      </div>


      {/* Input Form */}

      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AI에게 질문해보세요..."
          disabled={isLoading}
          className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition"
        >
          전송
        </button>
      </form>
    </div>
  );
}

export default AdminChatBot;
