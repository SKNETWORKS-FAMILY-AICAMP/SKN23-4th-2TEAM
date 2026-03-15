import { useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, ArrowLeft, Delete } from "lucide-react";
import { Lang } from "./language-pack";

export interface Config {
  mode: "fixed" | "floating";
  line: string;
  robot: string;
  deviceId: string;
  apiUrl: string;
  language: Lang;
}

interface AdminLoginProps {
  lang: Lang;
  onSuccess: () => void;
  onBack: () => void;
}

export function AdminLogin({ lang, onSuccess, onBack }: AdminLoginProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      if (newPin === "1234") {
        setTimeout(onSuccess, 200);
      } else if (newPin.length === 4) {
        setError(lang === "KO" ? "비밀번호가 일치하지 않습니다" : "Incorrect PIN");
        setTimeout(() => setPin(""), 800);
      }
    }
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));
  const handleClear = () => setPin("");

  return (
    // 1. 전체 화면 덮기 (flex-col로 상/하단 분리)
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] flex flex-col font-sans">

      {/* 2. 상단 영역: 뒤로가기 버튼 (absolute 제거, 안전한 영역 확보) */}
      <div className="w-full p-8 md:p-12 flex justify-start shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-neutral-500 hover:text-white transition-colors outline-none"
        >
          <ArrowLeft size={32} />
          <span className="font-black text-xl uppercase tracking-widest">
            {lang === "KO" ? "뒤로가기" : "BACK"}
          </span>
        </button>
      </div>

      {/* 3. 중앙 영역: 핀패드 (남은 화면 공간의 정중앙에 배치) */}
      {/* pb-24를 줘서 상단 버튼 때문에 패드가 밑으로 밀려 보이는 걸 시각적으로 보정 */}
      <div className="flex-1 flex items-center justify-center pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-[450px]"
        >
          {/* 로고 & 타이틀 */}
          <div className="flex flex-col items-center mb-10 text-center">
            <ShieldCheck className="text-[#E82127] mb-6" size={64} strokeWidth={1.5} />
            <h1 className="text-[32px] font-black text-white tracking-tighter uppercase italic mb-2">
              MANAGER ACCESS
            </h1>
            <p className="text-[15px] text-zinc-500 font-bold uppercase tracking-widest">
              {lang === "KO" ? "관리자 핀 번호를 입력하세요" : "Enter Manager PIN"}
            </p>
          </div>

          {/* PIN Dots */}
          <div className="flex gap-6 mb-8 h-[24px]">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full transition-all duration-200 ${pin.length > i
                  ? "bg-[#E82127] scale-110 shadow-[0_0_15px_rgba(232,33,39,0.5)]"
                  : "bg-zinc-800"
                  }`}
              />
            ))}
          </div>

          {/* 에러 메시지 영역 */}
          <div className="h-[30px] mb-6 flex items-center justify-center">
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#E82127] font-black text-[18px] animate-pulse tracking-tight"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* 10키 핀패드 */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num)}
                className="h-[100px] bg-[#18181b] border border-neutral-800 text-white text-[40px] font-black hover:bg-[#E82127] hover:border-[#E82127] active:bg-red-700 transition-colors outline-none"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-[100px] bg-neutral-900 border border-neutral-800 text-red-500 text-[32px] font-black hover:bg-neutral-800 active:bg-neutral-700 transition-colors outline-none"
            >
              C
            </button>
            <button
              onClick={() => handlePinInput("0")}
              className="h-[100px] bg-[#18181b] border border-neutral-800 text-white text-[40px] font-black hover:bg-[#E82127] hover:border-[#E82127] active:bg-red-700 transition-colors outline-none"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-[100px] flex items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800 active:bg-neutral-700 transition-colors outline-none"
            >
              <Delete size={36} />
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}