import { useState, useEffect } from "react";
import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { Package, AlertTriangle, CheckCircle, Plus, Minus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ConsumablesManagerProps {
  lang: Lang;
  onBack: () => void;
}

interface Consumable {
  id: string;
  nameKO: string;
  nameEN: string;
  nameUZ: string;
  current: number;
  max: number;
  unit: string;
  threshold: number; // Alert when below this percentage
  lastChanged: number; // timestamp
}

const INITIAL_CONSUMABLES: Consumable[] = [
  {
    id: "wire-1.2",
    nameKO: "용접 와이어 (1.2mm)",
    nameEN: "Welding Wire (1.2mm)",
    nameUZ: "Payvandlash simi (1.2mm)",
    current: 15,
    max: 20,
    unit: "kg",
    threshold: 30,
    lastChanged: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
  },
  {
    id: "wire-1.6",
    nameKO: "용접 와이어 (1.6mm)",
    nameEN: "Welding Wire (1.6mm)",
    nameUZ: "Payvandlash simi (1.6mm)",
    current: 8,
    max: 20,
    unit: "kg",
    threshold: 30,
    lastChanged: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "torch-nozzle",
    nameKO: "토치 노즐",
    nameEN: "Torch Nozzle",
    nameUZ: "Mash'ala nozul",
    current: 3,
    max: 10,
    unit: "EA",
    threshold: 40,
    lastChanged: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: "contact-tip",
    nameKO: "컨택트 팁",
    nameEN: "Contact Tip",
    nameUZ: "Kontakt uchi",
    current: 12,
    max: 20,
    unit: "EA",
    threshold: 40,
    lastChanged: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "gas-co2",
    nameKO: "CO2 가스",
    nameEN: "CO2 Gas",
    nameUZ: "CO2 gazi",
    current: 25,
    max: 50,
    unit: "kg",
    threshold: 30,
    lastChanged: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: "anti-spatter",
    nameKO: "스패터 방지제",
    nameEN: "Anti-Spatter Spray",
    nameUZ: "Chiqindiga qarshi spray",
    current: 500,
    max: 1000,
    unit: "ml",
    threshold: 40,
    lastChanged: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
];

export function ConsumablesManager({ lang, onBack }: ConsumablesManagerProps) {
  const [consumables, setConsumables] = useState<Consumable[]>(() => {
    const saved = localStorage.getItem("weldbot-consumables");
    return saved ? JSON.parse(saved) : INITIAL_CONSUMABLES;
  });

  useEffect(() => {
    localStorage.setItem("weldbot-consumables", JSON.stringify(consumables));
  }, [consumables]);

  const getName = (item: Consumable) => {
    return lang === "KO" ? item.nameKO : lang === "EN" ? item.nameEN : item.nameUZ;
  };

  const getPercentage = (item: Consumable) => {
    return Math.round((item.current / item.max) * 100);
  };

  const getStatus = (item: Consumable) => {
    const percentage = getPercentage(item);
    if (percentage <= item.threshold) return "critical";
    if (percentage <= 50) return "warning";
    return "ok";
  };

  const updateQuantity = (id: string, delta: number) => {
    setConsumables(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newCurrent = Math.max(0, Math.min(item.max, item.current + delta));
          return { ...item, current: newCurrent };
        }
        return item;
      })
    );
  };

  const refill = (id: string) => {
    setConsumables(prev =>
      prev.map(item => {
        if (item.id === id) {
          toast.success(
            lang === "KO" ? `${getName(item)} 충전 완료` :
              lang === "EN" ? `${getName(item)} refilled` :
                `${getName(item)} to'ldirildi`,
            { duration: 2000 }
          );
          return { ...item, current: item.max, lastChanged: Date.now() };
        }
        return item;
      })
    );
  };

  const getDaysAgo = (timestamp: number) => {
    const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
    if (days === 0) {
      return lang === "KO" ? "오늘" : lang === "EN" ? "Today" : "Bugun";
    }
    return lang === "KO" ? `${days}일 전` : lang === "EN" ? `${days} days ago` : `${days} kun oldin`;
  };

  const criticalItems = consumables.filter(item => getStatus(item) === "critical");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <div className="bg-[#16213e] p-6 border-b-2 border-[#10b981]">
        <div className="max-w-[900px] mx-auto">
          <motion.button
            className="mb-4 px-6 py-3 bg-[#1e293b] border-2 border-[#64748b] text-white rounded-xl text-xl font-bold"
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {T[lang].backToMain}
          </motion.button>
          <h1 className="text-3xl font-bold text-[#10b981] mb-2">{T[lang].consumables}</h1>

          {criticalItems.length > 0 && (
            <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 mt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={28} />
                <div className="text-lg">
                  <span className="font-bold text-red-400">
                    {lang === "KO" ? "긴급 보충 필요: " : lang === "EN" ? "Urgent Refill: " : "Shoshilinch to'ldirish: "}
                  </span>
                  <span className="text-red-300">
                    {criticalItems.map(getName).join(", ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consumables List */}
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-4">
        {consumables.map((item, index) => {
          const percentage = getPercentage(item);
          const status = getStatus(item);

          let statusColor = "#10b981"; // green
          let statusBg = "#10b981";
          if (status === "warning") {
            statusColor = "#f59e0b";
            statusBg = "#f59e0b";
          } else if (status === "critical") {
            statusColor = "#ef4444";
            statusBg = "#ef4444";
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#16213e] border-2 rounded-xl p-6"
              style={{ borderColor: statusColor }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="text-[#10b981]" size={32} />
                  <div>
                    <h3 className="text-xl font-bold text-white">{getName(item)}</h3>
                    <p className="text-sm text-gray-400">
                      {lang === "KO" ? "마지막 교체: " : lang === "EN" ? "Last changed: " : "Oxirgi almashtirish: "}
                      {getDaysAgo(item.lastChanged)}
                    </p>
                  </div>
                </div>

                {status === "ok" && <CheckCircle className="text-green-500" size={28} />}
                {status === "warning" && <AlertTriangle className="text-yellow-500" size={28} />}
                {status === "critical" && <AlertTriangle className="text-red-500" size={28} />}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold" style={{ color: statusColor }}>
                    {item.current} {item.unit}
                  </span>
                  <span className="text-xl text-gray-400">
                    / {item.max} {item.unit}
                  </span>
                </div>

                <div className="h-6 bg-[#0a0a0f] rounded-full overflow-hidden border-2 border-gray-700">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: statusBg }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>

                <div className="text-right mt-1">
                  <span className="text-lg font-bold" style={{ color: statusColor }}>
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <motion.button
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 border-2 border-red-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
                  onClick={() => updateQuantity(item.id, -1)}
                  whileTap={{ scale: 0.95 }}
                >
                  <Minus size={20} />
                  {lang === "KO" ? "사용" : lang === "EN" ? "Use" : "Ishlatish"}
                </motion.button>

                <motion.button
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 border-2 border-blue-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
                  onClick={() => updateQuantity(item.id, 1)}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus size={20} />
                  {lang === "KO" ? "추가" : lang === "EN" ? "Add" : "Qo'shish"}
                </motion.button>

                <motion.button
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 border-2 border-green-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
                  onClick={() => refill(item.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  <RotateCcw size={20} />
                  {lang === "KO" ? "충전" : lang === "EN" ? "Refill" : "To'ldirish"}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
