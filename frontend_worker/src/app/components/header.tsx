import { useState, useCallback } from "react";
import { Lang, LANG_OPTIONS } from "./language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Shield } from "lucide-react";

interface HeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onAdminActivate: () => void;
  onHome: () => void;
  isOnline: boolean;
}

export function Header({ lang, onLangChange, onAdminActivate, onHome, isOnline }: HeaderProps) {
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
    <div style={{ width: "100%", backgroundColor: "#09090b", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
      {/* Container: maxWidth를 1400px로 늘려 여백을 줄임 */}
      <div style={{ width: "100%", maxWidth: "1300px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 12px 20px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <motion.div
            style={{ cursor: "pointer", userSelect: "none", position: "relative", display: "flex", alignItems: "center", gap: "16px", outline: "none" }}
            onClick={handleTitleClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{ color: "#ffffff", fontSize: "40px", fontWeight: "900", letterSpacing: "-1.5px" }}>
              WELD-BOT
            </span>

            {/* vertical divider */}
            <div style={{ width: "2px", height: "24px", backgroundColor: "#27272a", margin: "0 16px" }} />

            {/* Badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: isOnline ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: isOnline ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              padding: "6px 14px",
              borderRadius: "16px",
              boxShadow: isOnline ? "0 0 10px rgba(34,197,94,0.15)" : "0 0 10px rgba(239,68,68,0.15)",
              alignSelf: "center",
              transform: "translateY(2px)"
            }}>
              <span style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: isOnline ? "#22c55e" : "#ef4444",
                boxShadow: isOnline ? "0 0 8px #22c55e" : "0 0 8px #ef4444"
              }} />
              <span style={{
                fontSize: "14px",
                fontWeight: "900",
                color: isOnline ? "#4ade80" : "#f87171",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

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

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginRight: "40px" }}>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Lang)}
            style={{
              backgroundColor: "#1c1c1e",
              color: "#f4f4f5",
              border: "1px solid #3f3f46",
              borderRadius: "10px",
              padding: "14px 12px",
              fontSize: "18px",
              fontWeight: "900",
              cursor: "pointer",
              minWidth: "130px",
              outline: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
            }}
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}