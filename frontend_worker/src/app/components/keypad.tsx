import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { Delete } from "lucide-react";

interface KeypadProps {
  lang: Lang;
  errorCode: string;
  onInput: (char: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  diagType: "robot" | "welder";
  selectedDevice: { line: string; robot: string };
}

export function Keypad({
  lang,
  errorCode,
  onInput,
  onClear,
  onSubmit,
  diagType,
  selectedDevice,
}: KeypadProps) {
  const alphabets = ["E", "A", "C", "R", "L"];
  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0"];

  const keyBase =
    "flex items-center justify-center rounded-2xl text-[1.8rem] font-bold cursor-pointer transition-all duration-150 select-none min-h-[60px] bg-zinc-900 text-gray-200 border border-zinc-800 shadow-sm hover:bg-zinc-800";

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-2 flex flex-col h-full bg-zinc-950">
      {/* Top Section with breadcrumb */}
      <div className="flex items-center justify-center mb-4">
        <span className="text-zinc-500 font-bold uppercase tracking-[0.5em] text-lg">
          {selectedDevice.line} | {selectedDevice.robot} | {diagType.toUpperCase()}
        </span>
      </div>

      {/* Full-width High Contrast Display Area */}
      <div className="bg-black rounded-2xl p-6 mb-4 text-center border border-zinc-800 flex flex-col items-center justify-center min-h-[220px] shadow-2xl relative overflow-hidden">
        {/* Subtle red accent line at the top of display */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#E82127]" />

        <div className="text-zinc-600 font-bold text-lg mb-2 uppercase tracking-[0.6em]">
          ENTERING ERROR CODE
        </div>
        <div className={`font-black text-[8rem] leading-none tracking-wider uppercase ${errorCode ? "text-white" : "text-zinc-900"}`}>
          {errorCode || "--------"}
        </div>
      </div>

      <div className="flex-1 space-y-4 flex flex-col items-center w-full">
        {/* Alphabet row */}
        <div className="grid grid-cols-5 gap-3 w-full max-w-[700px]">
          {alphabets.map((char, index) => (
            <motion.button
              key={char}
              className={keyBase}
              onClick={() => onInput(char)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {char}
            </motion.button>
          ))}
        </div>

        {/* Number grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[700px]">
          {numbers.map((char, index) => (
            <motion.button
              key={char}
              className={keyBase}
              onClick={() => onInput(char)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (alphabets.length + index) * 0.02 }}
            >
              {char}
            </motion.button>
          ))}
          <motion.button
            className={`${keyBase} bg-red-950/20 text-red-500 border-red-900/30 hover:bg-red-900/40`}
            onClick={onClear}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (alphabets.length + numbers.length) * 0.02 }}
          >
            <Delete size={28} />
          </motion.button>
        </div>

        {/* Primary Submit Button */}
        <div className="w-full max-w-[700px] pt-4">
          <motion.button
            onClick={onSubmit}
            disabled={!errorCode}
            className={`w-full py-8 rounded-2xl text-[2rem] font-black cursor-pointer shadow-[0_10px_30px_rgba(232,33,39,0.2)] transition-all select-none border-l-[12px] border-l-[#E82127] ${errorCode
              ? "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950"
              : "bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50"
              }`}
            whileHover={errorCode ? { scale: 1.01 } : {}}
            whileTap={errorCode ? { scale: 0.98 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {T[lang].submitCode.toUpperCase()}
          </motion.button>
        </div>
      </div>
    </div>
  );
}