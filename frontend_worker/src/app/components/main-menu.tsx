import { Lang, T } from "./language-pack";
import { motion } from "motion/react";

interface MainMenuProps {
  lang: Lang;
  onDiagnostic: (type: "robot" | "welder") => void;
  onOpenTechDict: () => void;
  onOpenConsumables: () => void;
}

export function MainMenu({ lang, onDiagnostic, onOpenTechDict, onOpenConsumables }: MainMenuProps) {
  const buttonBase =
    "w-full py-8 rounded-2xl text-[1.5rem] cursor-pointer border-2 transition-all duration-200 select-none font-bold";

  const buttons = [
    { label: T[lang].robotDiag, onClick: () => onDiagnostic("robot"), color: "cyan", bg: "#16213e", border: "#00d4ff", text: "#00d4ff", hoverBg: "#1a3a5c" },
    { label: T[lang].welderDiag, onClick: () => onDiagnostic("welder"), color: "orange", bg: "#16213e", border: "#ff6b35", text: "#ff6b35", hoverBg: "#3a2a1c" },
    { label: T[lang].techDict, onClick: onOpenTechDict, color: "purple", bg: "#16213e", border: "#a78bfa", text: "#a78bfa", hoverBg: "#2a2141" },
    { label: T[lang].consumables, onClick: onOpenConsumables, color: "green", bg: "#16213e", border: "#10b981", text: "#10b981", hoverBg: "#1e3a2f" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-4 max-w-[1200px] mx-auto">
      {buttons.map((button, index) => (
        <motion.button
          key={index}
          className={buttonBase}
          style={{
            backgroundColor: button.bg,
            borderColor: button.border,
            color: button.text,
          }}
          onClick={button.onClick}
          whileHover={{ scale: 1.02, backgroundColor: button.hoverBg }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          {button.label}
        </motion.button>
      ))}
    </div>
  );
}