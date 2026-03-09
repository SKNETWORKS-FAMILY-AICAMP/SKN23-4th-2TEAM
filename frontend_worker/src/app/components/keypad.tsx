import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { ArrowLeft, Delete } from "lucide-react";

interface KeypadProps {
  lang: Lang;
  errorCode: string;
  onInput: (char: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onBack: () => void;
  diagType: "robot" | "welder";
}

export function Keypad({
  lang,
  errorCode,
  onInput,
  onClear,
  onSubmit,
  onBack,
  diagType,
}: KeypadProps) {
  const alphabets = ["E", "A", "C", "R", "L"];
  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0"];

  const keyBase =
    "flex items-center justify-center rounded-xl text-[1.8rem] font-bold cursor-pointer transition-all duration-150 select-none min-h-[70px]";

  const titleColor = diagType === "robot" ? "#00d4ff" : "#ff6b35";
  const primaryColor = diagType === "robot" ? "#00d4ff" : "#ff6b35";

  return (
    <div className="max-w-[600px] mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <motion.button
          onClick={onBack}
          className="text-[1.3rem] text-[#aaa] px-4 py-2 rounded-lg bg-[#1a1a2e] border-2 border-[#444] flex items-center gap-2"
          whileHover={{ scale: 1.05, borderColor: "#888" }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={24} />
        </motion.button>
        <h2 className="text-center text-[1.4rem] font-bold" style={{ color: titleColor, fontFamily: "monospace" }}>
          {diagType === "robot" ? "🤖 " : "⚡ "}
          {T[lang].keypadTitle}
        </h2>
        <div className="w-[60px]" />
      </div>

      {/* Alphabet row */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {alphabets.map((char, index) => (
          <motion.button
            key={char}
            className={keyBase}
            style={{
              backgroundColor: "#1a3a5c",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: primaryColor,
              color: primaryColor,
            }}
            onClick={() => onInput(char)}
            whileHover={{ scale: 1.05, backgroundColor: "#2a4a6c" }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {char}
          </motion.button>
        ))}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {numbers.map((char, index) => (
          <motion.button
            key={char}
            className={keyBase}
            style={{
              backgroundColor: "#16213e",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "#444",
              color: "white",
            }}
            onClick={() => onInput(char)}
            whileHover={{ scale: 1.05, borderColor: primaryColor, backgroundColor: "#1a3a5c" }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (alphabets.length + index) * 0.03 }}
          >
            {char}
          </motion.button>
        ))}
        <motion.button
          className={`${keyBase} bg-[#3a1a1a] border-2 border-[#ff4444] text-[#ff4444] flex items-center justify-center gap-2`}
          onClick={onClear}
          whileHover={{ scale: 1.05, backgroundColor: "#4a2a2a" }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (alphabets.length + numbers.length) * 0.03 }}
        >
          <Delete size={28} />
        </motion.button>
      </div>

      {/* Submit */}
      <motion.button
        onClick={onSubmit}
        disabled={!errorCode}
        className={`w-full py-5 rounded-2xl text-[1.5rem] font-bold cursor-pointer border-2 transition-all select-none ${
          errorCode
            ? "bg-[#003d2e] border-[#00ff88] text-[#00ff88]"
            : "bg-[#1a1a1a] border-[#333] text-[#555] cursor-not-allowed"
        }`}
        whileHover={errorCode ? { scale: 1.02, backgroundColor: "#005540" } : {}}
        whileTap={errorCode ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {T[lang].submitCode}
      </motion.button>
    </div>
  );
}