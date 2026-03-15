import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";

export default function PinLoginPage({ onSuccess }) {
  const [pin, setPin] = useState("");

  const handleDigit = (digit) => {
    if (pin.length < 4) setPin(pin + digit);
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const handleSubmit = () => {
    if (pin === "1234") {
      onSuccess();
    } else {
      alert("PIN이 틀렸습니다!");
      setPin("");
    }
  };

  // 키보드 이벤트 등록
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter") {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-80 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-[#E82127] flex items-center justify-center rounded-full mb-2 shadow-lg">
            <TrendingUp size={28} color="white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold italic tracking-tight uppercase text-gray-800">
            WELD-BOT
          </span>
        </div>

        {/* PIN 표시 */}
        <div className="flex justify-center mb-6 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200"
              >
                {pin[i] ? "•" : ""}
              </div>
            ))}
        </div>

        {/* 숫자 버튼 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold py-4 rounded-xl shadow-md transition transform"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="bg-red-400 hover:bg-red-500 active:scale-95 text-white font-bold py-4 rounded-xl shadow-md transition transform"
          >
            ⬅
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold py-4 rounded-xl shadow-md transition transform"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-md transition transform"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
