import { useState } from "react";
import { Lang, T } from "./language-pack";
import { motion } from "motion/react";
import { Search, Book, Zap, AlertCircle, Settings, ChevronDown, ChevronUp } from "lucide-react";

interface TechDictionaryProps {
  lang: Lang;
  onBack: () => void;
}

interface TechEntry {
  id: string;
  category: "welding" | "robot" | "safety" | "maintenance";
  titleKO: string;
  titleEN: string;
  titleUZ: string;
  contentKO: string;
  contentEN: string;
  contentUZ: string;
}

const techEntries: TechEntry[] = [
  {
    id: "arc-voltage",
    category: "welding",
    titleKO: "아크 전압 (Arc Voltage)",
    titleEN: "Arc Voltage",
    titleUZ: "Yoy kuchlanishi",
    contentKO: "용접 아크의 전압으로, 일반적으로 18-28V 범위입니다. 전압이 높으면 비드 폭이 넓어지고, 낮으면 좁아집니다. 스패터 발생을 줄이려면 적정 전압 유지가 중요합니다.",
    contentEN: "Voltage across the welding arc, typically ranging from 18-28V. Higher voltage results in wider bead width, while lower voltage creates narrower beads. Maintaining proper voltage is crucial for reducing spatter.",
    contentUZ: "Payvandlash yoyining kuchlanishi, odatda 18-28V oralig'ida. Yuqori kuchlanish kengroq bonchuqqa, past kuchlanish esa torroq bonchuqqa olib keladi. Chiqindilarni kamaytirish uchun to'g'ri kuchlanishni saqlash muhim.",
  },
  {
    id: "wire-feed",
    category: "welding",
    titleKO: "와이어 송급 속도",
    titleEN: "Wire Feed Speed",
    titleUZ: "Sim uzatish tezligi",
    contentKO: "와이어가 공급되는 속도로 m/min 단위로 측정됩니다. 일반적으로 6-12 m/min 범위이며, 용접 전류와 직접적인 관계가 있습니다. 속도가 너무 빠르면 언더컷, 너무 느리면 용입 부족이 발생합니다.",
    contentEN: "The rate at which welding wire is fed, measured in m/min. Typically ranges from 6-12 m/min and directly correlates with welding current. Too fast causes undercut, too slow results in lack of penetration.",
    contentUZ: "Payvandlash simining uzatilish tezligi, m/min da o'lchanadi. Odatda 6-12 m/min oralig'ida va payvandlash tokiga to'g'ridan-to'g'ri bog'liq. Juda tez bo'lsa, kesilishga, juda sekin bo'lsa penetratsiya yetishmasligiga olib keladi.",
  },
  {
    id: "joint-calibration",
    category: "robot",
    titleKO: "조인트 캘리브레이션",
    titleEN: "Joint Calibration",
    titleUZ: "Bo'g'in kalibrlash",
    contentKO: "로봇 축의 위치 정확도를 보정하는 작업입니다. 6개월마다 또는 위치 오차가 ±0.5mm 이상 발생 시 수행해야 합니다. 캘리브레이션 지그와 전용 소프트웨어가 필요합니다.",
    contentEN: "Process of correcting robot axis position accuracy. Should be performed every 6 months or when position error exceeds ±0.5mm. Requires calibration jig and dedicated software.",
    contentUZ: "Robot o'qining pozitsiya aniqligini to'g'rilash jarayoni. Har 6 oyda yoki pozitsiya xatosi ±0.5mm dan oshganda amalga oshirilishi kerak. Kalibrlash jig va maxsus dasturiy ta'minot talab qiladi.",
  },
  {
    id: "gas-flow",
    category: "safety",
    titleKO: "실딩 가스 유량",
    titleEN: "Shielding Gas Flow",
    titleUZ: "Himoya gaz oqimi",
    contentKO: "용접 부위를 산화로부터 보호하는 가스의 유량입니다. CO2 또는 혼합 가스를 사용하며, 적정 유량은 15-20 L/min입니다. 유량이 부족하면 기공이 발생하고, 과다하면 난류로 인해 오염됩니다.",
    contentEN: "Flow rate of gas protecting the weld from oxidation. Uses CO2 or mixed gas, with optimal flow of 15-20 L/min. Insufficient flow causes porosity, excessive flow creates turbulence and contamination.",
    contentUZ: "Payvandni oksidlanishdan himoya qiluvchi gaz oqimi. CO2 yoki aralash gaz ishlatiladi, optimal oqim 15-20 L/min. Yetarli bo'lmagan oqim g'ovaklikni keltirib chiqaradi, ortiqcha oqim esa turbulentlik va ifloslanishni yuzaga keltiradi.",
  },
  {
    id: "preventive",
    category: "maintenance",
    titleKO: "예방 정비 주기",
    titleEN: "Preventive Maintenance",
    titleUZ: "Profilaktik ta'mirlash",
    contentKO: "로봇 및 용접기 예방 정비 권장 주기:\n• 일일: 토치 청소, 스패터 제거\n• 주간: 케이블 점검, 와이어 피더 청소\n• 월간: 그리스 보충, 필터 교체\n• 분기: 조인트 점검, 전기 접점 청소\n• 반기: 캘리브레이션, 백래시 측정",
    contentEN: "Recommended preventive maintenance schedule:\n• Daily: Torch cleaning, spatter removal\n• Weekly: Cable inspection, wire feeder cleaning\n• Monthly: Grease replenishment, filter replacement\n• Quarterly: Joint inspection, electrical contact cleaning\n• Semi-annual: Calibration, backlash measurement",
    contentUZ: "Tavsiya etilgan profilaktik ta'mirlash jadvali:\n• Kunlik: Mash'ala tozalash, chiqindilarni olib tashlash\n• Haftalik: Kabelni tekshirish, sim beruvchini tozalash\n• Oylik: Moyni to'ldirish, filtrni almashtirish\n• Choraklik: Bo'g'inni tekshirish, elektr kontaktlarini tozalash\n• Yarim yillik: Kalibrlash, orqaga siljishni o'lchash",
  },
  {
    id: "spatter",
    category: "welding",
    titleKO: "스패터 (Spatter)",
    titleEN: "Spatter",
    titleUZ: "Chiqindilar (Spatter)",
    contentKO: "용접 중 발생하는 금속 입자로, 과도한 전류/전압, 부적절한 가스 유량, 오염된 모재가 원인입니다. 스패터 방지제 사용과 적정 용접 파라미터 설정으로 최소화할 수 있습니다.",
    contentEN: "Metal particles generated during welding, caused by excessive current/voltage, improper gas flow, or contaminated base metal. Can be minimized using anti-spatter spray and proper welding parameters.",
    contentUZ: "Payvandlash jarayonida hosil bo'ladigan metall zarralari, ortiqcha tok/kuchlanish, noto'g'ri gaz oqimi yoki ifloslangan asosiy metall sabab bo'ladi. Chiqindiga qarshi spray va to'g'ri payvandlash parametrlari bilan kamaytiriladi.",
  },
];

export function TechDictionary({ lang, onBack }: TechDictionaryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getTitle = (entry: TechEntry) => {
    return lang === "KO" ? entry.titleKO : lang === "EN" ? entry.titleEN : entry.titleUZ;
  };

  const getContent = (entry: TechEntry) => {
    return lang === "KO" ? entry.contentKO : lang === "EN" ? entry.contentEN : entry.contentUZ;
  };

  const filteredEntries = techEntries.filter((entry) => {
    const matchesSearch = searchQuery === "" || 
      getTitle(entry).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContent(entry).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: "all", labelKO: "전체", labelEN: "All", labelUZ: "Hammasi", icon: Book },
    { value: "welding", labelKO: "용접", labelEN: "Welding", labelUZ: "Payvandlash", icon: Zap },
    { value: "robot", labelKO: "로봇", labelEN: "Robot", labelUZ: "Robot", icon: Settings },
    { value: "safety", labelKO: "안전", labelEN: "Safety", labelUZ: "Xavfsizlik", icon: AlertCircle },
    { value: "maintenance", labelKO: "정비", labelEN: "Maintenance", labelUZ: "Ta'mirlash", icon: Settings },
  ];

  const getCategoryLabel = (cat: typeof categories[0]) => {
    return lang === "KO" ? cat.labelKO : lang === "EN" ? cat.labelEN : cat.labelUZ;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "welding": return "⚡";
      case "robot": return "🤖";
      case "safety": return "🛡️";
      case "maintenance": return "🔧";
      default: return "📖";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <div className="bg-[#16213e] p-6 border-b-2 border-[#a78bfa]">
        <div className="max-w-[900px] mx-auto">
          <motion.button
            className="mb-4 px-6 py-3 bg-[#1e293b] border-2 border-[#64748b] text-white rounded-xl text-xl font-bold"
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {T[lang].backToMain}
          </motion.button>
          <h1 className="text-3xl font-bold text-[#a78bfa] mb-4">{T[lang].techDict}</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input
              type="text"
              placeholder={lang === "KO" ? "검색..." : lang === "EN" ? "Search..." : "Qidirish..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 bg-[#0a0a0f] border-2 border-[#a78bfa] rounded-xl text-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#c4b5fd]"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-[900px] mx-auto px-6 py-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <motion.button
              key={cat.value}
              className={`px-6 py-3 rounded-xl text-lg font-bold whitespace-nowrap border-2 transition-all ${
                selectedCategory === cat.value
                  ? "bg-[#a78bfa] text-[#0a0a0f] border-[#a78bfa]"
                  : "bg-[#16213e] text-[#a78bfa] border-[#a78bfa] hover:bg-[#2a2141]"
              }`}
              onClick={() => setSelectedCategory(cat.value)}
              whileTap={{ scale: 0.95 }}
            >
              {getCategoryLabel(cat)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="max-w-[900px] mx-auto px-6 space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xl">
            {lang === "KO" ? "검색 결과가 없습니다" : lang === "EN" ? "No results found" : "Natijalar topilmadi"}
          </div>
        ) : (
          filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#16213e] border-2 border-[#a78bfa] rounded-xl overflow-hidden"
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#2a2141] transition-colors"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{getCategoryIcon(entry.category)}</span>
                  <span className="text-xl font-bold text-[#a78bfa]">{getTitle(entry)}</span>
                </div>
                {expandedId === entry.id ? (
                  <ChevronUp className="text-[#a78bfa]" size={28} />
                ) : (
                  <ChevronDown className="text-[#a78bfa]" size={28} />
                )}
              </button>
              
              {expandedId === entry.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-5 text-gray-300 text-lg leading-relaxed whitespace-pre-line border-t-2 border-[#2a2141] pt-4"
                >
                  {getContent(entry)}
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
