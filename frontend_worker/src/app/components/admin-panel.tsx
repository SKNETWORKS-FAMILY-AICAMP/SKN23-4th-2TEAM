import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { useState } from "react";
import { History, Settings, Upload, Users, Database, TrendingUp } from "lucide-react";

interface AdminPanelProps {
  lang: Lang;
  onBack: () => void;
  errorHistory: Array<{ code: string; timestamp: number; diagType: "robot" | "welder" }>;
}

export function AdminPanel({ lang, onBack, errorHistory }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "history">("menu");

  const menuItems = [
    { icon: History, label: T[lang].systemLog, color: "#00d4ff" },
    { icon: Settings, label: T[lang].paramSettings, color: "#ff6b35" },
    { icon: Upload, label: T[lang].firmwareUpdate, color: "#10b981" },
    { icon: Users, label: T[lang].userManagement, color: "#a78bfa" },
  ];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1a0a0a] to-[#2a0a0a] border-b-2 border-[#ff4444]">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#ff4444] animate-pulse" />
          <span className="text-[#ff4444] text-[2rem] font-bold" style={{ fontFamily: "monospace" }}>
            {T[lang].adminMode}
          </span>
        </div>
        <motion.button
          onClick={onBack}
          className="text-[1.2rem] px-6 py-3 rounded-xl bg-[#2a1a1a] border-2 border-[#ff4444] text-[#ff4444] font-bold cursor-pointer"
          whileHover={{ scale: 1.05, backgroundColor: "#3a1a1a" }}
          whileTap={{ scale: 0.95 }}
        >
          {T[lang].backToMain}
        </motion.button>
      </div>

      <div className="p-6">
        <motion.div
          className="bg-[#1a0a0a] border border-[#ff444433] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[#ff8888] text-[1.3rem] font-bold" style={{ fontFamily: "monospace" }}>
            {T[lang].adminWelcome}
          </p>
          <div className="mt-3 flex gap-4">
            <motion.button
              className={`px-6 py-2 rounded-lg font-bold ${activeTab === "menu" ? "bg-[#ff4444] text-white" : "bg-[#2a1a1a] text-[#ff8888]"}`}
              onClick={() => setActiveTab("menu")}
              whileTap={{ scale: 0.95 }}
            >
              {lang === "KO" ? "관리 메뉴" : lang === "EN" ? "Admin Menu" : "Admin menyu"}
            </motion.button>
            <motion.button
              className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === "history" ? "bg-[#ff4444] text-white" : "bg-[#2a1a1a] text-[#ff8888]"}`}
              onClick={() => setActiveTab("history")}
              whileTap={{ scale: 0.95 }}
            >
              <Database size={20} />
              {lang === "KO" ? `에러 이력 (${errorHistory.length})` : lang === "EN" ? `Error History (${errorHistory.length})` : `Xato tarixi (${errorHistory.length})`}
            </motion.button>
          </div>
        </motion.div>

        {activeTab === "menu" ? (
          <div className="grid grid-cols-2 gap-4 max-w-[800px] mx-auto">
            {menuItems.map((item, i) => (
              <motion.button
                key={i}
                className="py-8 rounded-2xl bg-[#1a0a0a] border-2 text-[1.3rem] font-bold cursor-pointer select-none"
                style={{ borderColor: `${item.color}44`, color: item.color }}
                whileHover={{ scale: 1.02, borderColor: item.color, backgroundColor: "#2a1a1a" }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <item.icon className="mx-auto mb-3" size={48} />
                {item.label}
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div
            className="max-w-[900px] mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-[#1a0a0a] border-2 border-[#ff444444] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="text-[#ff4444]" size={32} />
                <h2 className="text-2xl font-bold text-[#ff8888]">
                  {lang === "KO" ? "최근 진단 이력" : lang === "EN" ? "Recent Diagnostic History" : "So'nggi diagnostika tarixi"}
                </h2>
              </div>

              {errorHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xl">
                  {lang === "KO" ? "아직 진단 이력이 없습니다" : lang === "EN" ? "No diagnostic history yet" : "Hali diagnostika tarixi yo'q"}
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {errorHistory.map((entry, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-[#ff444433] rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${entry.diagType === "robot" ? "bg-[#00d4ff]" : "bg-[#ff6b35]"}`} />
                        <span className="text-2xl font-bold text-[#ff8888]" style={{ fontFamily: "monospace" }}>
                          {entry.code}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${entry.diagType === "robot" ? "bg-[#00d4ff33] text-[#00d4ff]" : "bg-[#ff6b3533] text-[#ff6b35]"}`}>
                          {entry.diagType === "robot" ? (lang === "KO" ? "로봇" : lang === "EN" ? "Robot" : "Robot") : (lang === "KO" ? "용접기" : lang === "EN" ? "Welder" : "Payvandlash")}
                        </span>
                      </div>
                      <span className="text-gray-400 font-mono">
                        {formatDate(entry.timestamp)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}