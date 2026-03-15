import { useState } from "react";
import { Lang, T } from "./language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Delete, Type } from "lucide-react";

interface KeypadProps {
  lang: Lang;
  errorCode: string;
  onInput: (char: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  diagType: "robot" | "welder";
  selectedDevice: { line: string; robot: string };
  onSelectDevice?: (line: string, robot: string, devId: string) => void;
  floatingMode?: boolean;
}

export function Keypad({
  lang,
  errorCode,
  onInput,
  onDelete,
  onSubmit,
  diagType,
  selectedDevice,
}: KeypadProps) {
  const [inputType, setInputType] = useState<"num" | "abc">("num");

  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0"];

  const keyBase =
    "flex items-center justify-center rounded-2xl font-black cursor-pointer transition-all duration-150 select-none bg-zinc-900 text-gray-100 border border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 active:bg-zinc-700";

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Section with breadcrumb - strictly matching user's reference with white horizontal lines */}
      <div className="mb-6">
        <div className="h-[1px] bg-zinc-800 w-full mb-4" />
        <div className="flex items-center justify-center">
          <span className="text-zinc-500 font-bold uppercase tracking-[0.6em] text-lg">
            {selectedDevice.line ? (selectedDevice.line.startsWith("LINE") ? selectedDevice.line : `LINE ${selectedDevice.line}`) : "LINE ?"} | {selectedDevice.robot ? (selectedDevice.robot.startsWith("ROBOT") ? selectedDevice.robot : `ROBOT ${selectedDevice.robot}`) : "ROBOT ?"} | {diagType.toUpperCase()}
          </span>
        </div>
        <div className="h-[1px] bg-zinc-800 w-full mt-4" />
      </div>

      {/* High Contrast Display Area - Clean style, no red lines */}
      <div className="bg-black rounded-3xl p-8 mb-8 text-center border border-zinc-800 flex flex-col items-center justify-center min-h-[220px] relative shadow-inner">
        <div className="text-zinc-600 font-bold text-sm mb-4 uppercase tracking-[0.8em]">
          ENTERING ERROR CODE
        </div>
        <div className={`font-black text-[10rem] leading-none tracking-widest uppercase ${errorCode ? "text-white" : "text-zinc-900"}`}>
          {errorCode || "--------"}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* Toggle Button - Even larger */}
        <button
          onClick={() => setInputType(inputType === "num" ? "abc" : "num")}
          className="w-full py-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-4 text-zinc-300 font-black text-2xl hover:bg-zinc-800 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.6)] border-b-4 border-b-zinc-700"
        >
          <Type size={32} /> {T[lang].toggleInput}
        </button>

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {inputType === "num" ? (
              <motion.div
                key="num"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-3 gap-6 w-full max-w-[800px]"
              >
                {numbers.map((n) => (
                  <button key={n} onClick={() => onInput(n)} className={`${keyBase} text-[2rem] min-h-[100px]`}>{n}</button>
                ))}
                <button
                  className={`${keyBase} bg-red-950/20 text-red-500 border-red-900/40 hover:bg-red-900/40 min-h-[100px]`}
                  onClick={onDelete}
                >
                  <Delete size={64} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="abc"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-4 w-full h-full justify-center"
              >
                {qwertyRows.map((row, idx) => (
                  <div key={idx} className="flex justify-center gap-3">
                    {row.map((char) => (
                      <button
                        key={char}
                        onClick={() => onInput(char)}
                        className={`${keyBase} flex-1 text-[3rem] min-h-[110px] max-w-[120px]`}
                      >
                        {char}
                      </button>
                    ))}
                    {idx === 2 && (
                      <button
                        className={`${keyBase} px-12 bg-red-950/20 text-red-500 border-red-900/40 hover:bg-red-900/40 min-h-[110px]`}
                        onClick={onDelete}
                      >
                        <Delete size={48} />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Primary Submit Button - Massive */}
        <div className="pt-4">
          <motion.button
            onClick={onSubmit}
            disabled={!errorCode}
            className={`w-full py-8 rounded-3xl text-[3rem] font-black cursor-pointer shadow-[0_15px_50px_rgba(0,0,0,0.7)] transition-all select-none border-l-[16px] border-l-[#E82127] ${errorCode
              ? "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-700 cursor-not-allowed grayscale"
              }`}
          >
            {T[lang].submitCode.toUpperCase()}
          </motion.button>
        </div>
      </div>
    </div>
  );
}