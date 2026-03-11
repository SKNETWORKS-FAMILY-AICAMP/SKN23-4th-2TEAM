import { useState, useCallback } from "react";
import { Lang, LANG_OPTIONS } from "./language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Shield } from "lucide-react";

interface HeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onAdminActivate: () => void;
  onHome: () => void;
}

export function Header({ lang, onLangChange, onAdminActivate, onHome }: HeaderProps) {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleTitleClick = useCallback(() => {
    const now = Date.now();

    // Single click for Home
    onHome();

    // Fast click detection for Admin (within 1 second)
    if (now - lastClickTime > 1000) {
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
  }, [clickCount, lastClickTime, onAdminActivate, onHome]);

  return (
    <div className="flex items-center justify-between pl-[10px] pr-[20px] pt-[5px] pb-6 bg-zinc-950 border-b border-zinc-800 relative shrink-0">
      <div className="flex items-center gap-6">
        <motion.div
          className="cursor-pointer select-none relative outline-none focus:outline-none"
          onClick={handleTitleClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-white text-[3rem] tracking-tight font-bold">
            WELD-BOT
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
      </div>

      <select
        value={lang}
        onChange={(e) => onLangChange(e.target.value as Lang)}
        className="bg-zinc-900 text-gray-200 border border-zinc-800 rounded-lg px-6 py-3 text-[1.4rem] font-black cursor-pointer min-w-[150px] focus:outline-none transition-all hover:bg-zinc-800"
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