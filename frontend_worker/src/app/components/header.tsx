import { useState, useCallback } from "react";
import { Lang, LANG_OPTIONS } from "./language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Shield } from "lucide-react";

interface HeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onAdminActivate: () => void;
}

export function Header({ lang, onLangChange, onAdminActivate }: HeaderProps) {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleTitleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTime > 3000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        onAdminActivate();
        setClickCount(0);
      }
    }
    setLastClickTime(now);
  }, [clickCount, lastClickTime, onAdminActivate]);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-b-2 border-[#00d4ff] relative">
      <motion.div
        className="cursor-pointer select-none relative"
        onClick={handleTitleClick}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-[#00d4ff] text-[2rem] tracking-wider font-bold" style={{ fontFamily: "monospace" }}>
          🤖 WELD-BOT v4.5
        </span>
        
        {/* Admin mode click counter indicator */}
        <AnimatePresence>
          {clickCount > 0 && clickCount < 5 && (
            <motion.div
              className="absolute -top-2 -right-2 flex gap-1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {Array.from({ length: clickCount }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#ff4444]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin unlock animation */}
        {clickCount === 5 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: [0, 1, 0], scale: [2, 1.2, 3] }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="text-[#ff4444]" size={48} />
          </motion.div>
        )}
      </motion.div>

      <select
        value={lang}
        onChange={(e) => onLangChange(e.target.value as Lang)}
        className="bg-[#16213e] text-white border-2 border-[#00d4ff] rounded-lg px-5 py-3 text-[1.3rem] font-bold cursor-pointer min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all hover:bg-[#1a3a5c]"
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}