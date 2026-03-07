import { Lang, T } from "./language-pack";
import { motion } from "motion/react";

interface ErrorDisplayProps {
  errorCode: string;
  lang: Lang;
}

export function ErrorDisplay({ errorCode, lang }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center py-6">
      <motion.div
        className="w-full max-w-[1000px] rounded-2xl border-2 px-8 py-6 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a1a 0%, #16213e 100%)",
          borderColor: errorCode ? "#00d4ff" : "#333",
          boxShadow: errorCode ? "0 0 30px rgba(0,212,255,0.15)" : "none",
        }}
        animate={{
          borderColor: errorCode ? "#00d4ff" : "#333",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated background glow */}
        {errorCode && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        <motion.div
          className="tracking-[0.3em] relative z-10"
          style={{
            fontFamily: "monospace",
            fontWeight: "bold",
            color: errorCode ? "#00ff88" : "#555",
            textShadow: errorCode ? "0 0 20px rgba(0,255,136,0.4)" : "none",
          }}
          animate={{
            fontSize: errorCode ? "4rem" : "1.6rem",
          }}
          transition={{ duration: 0.3 }}
        >
          {errorCode || T[lang].errorCodePlaceholder}
        </motion.div>

        {/* Blinking cursor when empty */}
        {!errorCode && (
          <motion.div
            className="inline-block w-1 h-8 bg-[#555] ml-2"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    </div>
  );
}