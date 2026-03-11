import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { Bot, Zap, BookOpen, Wrench } from "lucide-react";

interface MainMenuProps {
  lang: Lang;
  onDiagnostic: (type: "robot" | "welder") => void;
  onOpenTechDict: () => void;
  onOpenConsumables: () => void;
}

export function MainMenu({ lang, onDiagnostic, onOpenTechDict, onOpenConsumables }: MainMenuProps) {
  const buttons = [
    { label: T[lang].robotDiag, onClick: () => onDiagnostic("robot"), icon: Bot },
    { label: T[lang].welderDiag, onClick: () => onDiagnostic("welder"), icon: Zap },
    { label: T[lang].techDict, onClick: onOpenTechDict, icon: BookOpen },
    { label: T[lang].consumables, onClick: onOpenConsumables, icon: Wrench },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 pb-20">
      <div className="grid grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
        {buttons.map((button, index) => (
          <motion.button
            key={index}
            className="group w-full py-16 rounded-2xl text-[2.8rem] cursor-pointer text-gray-200 font-bold select-none transition-all flex flex-col items-center justify-center gap-6 bg-zinc-900 border border-zinc-800 border-l-[12px] border-l-[#E82127] shadow-xl"
            whileHover={{
              backgroundColor: "#27272a", // zinc-800
              scale: 1.01,
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={button.onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
          >
            <button.icon size={64} className="text-gray-400 group-hover:text-[#E82127] transition-colors" />
            <div className="flex items-center justify-center text-center px-4 tracking-tight">
              {button.label.toUpperCase()}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}