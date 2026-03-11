import { useState } from "react";
import { Lang } from "./language-pack";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  ListOrdered,
  Settings,
  LogOut,
  Users,
  Wrench,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  lang: Lang;
  onBack: () => void;
  errorHistory: Array<{
    code: string;
    timestamp: number;
    diagType: "robot" | "welder";
  }>;
  engineerCalls: Array<{ code: string; timestamp: number; device: string }>;
  onClearCalls: () => void;
  onResolveCall: (timestamp: number) => void;
}

export function AdminPanel({
  lang: _lang,
  onBack,
  errorHistory,
  engineerCalls,
  onClearCalls,
  onResolveCall,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "history" | "stats" | "settings"
  >("dashboard");
  const [selectedLine, setSelectedLine] = useState<
    "ALL" | "A" | "B" | "C" | "D"
  >("ALL");

  // --- 강화된 필터 상태 ---
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterHour, setFilterHour] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "robot" | "welder">(
    "ALL",
  );
  const [filterLine, setFilterLine] = useState<"ALL" | "A" | "B" | "C" | "D">(
    "ALL",
  );

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const chartData = [
    { name: "3/1", lineA: 12, lineB: 8, lineC: 15, lineD: 10 },
    { name: "3/2", lineA: 15, lineB: 12, lineC: 10, lineD: 15 },
    { name: "3/3", lineA: 8, lineB: 15, lineC: 12, lineD: 7 },
    { name: "3/4", lineA: 22, lineB: 18, lineC: 14, lineD: 14 },
    { name: "3/5", lineA: 18, lineB: 20, lineC: 12, lineD: 12 },
    { name: "3/6", lineA: 25, lineB: 12, lineC: 18, lineD: 17 },
    { name: "3/7", lineA: 10, lineB: 14, lineC: 16, lineD: 10 },
    { name: "3/8", lineA: 10, lineB: 14, lineC: 16, lineD: 10 },
  ];

  const lineColors = {
    A: "#E82127",
    B: "#3b82f6",
    C: "#eab308",
    D: "#22c55e",
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  };

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  // --- 정교화된 필터링 로직 ---
  const filteredHistory = errorHistory.filter((log) => {
    const date = new Date(log.timestamp);
    const matchYear =
      !filterYear || date.getFullYear().toString().includes(filterYear);
    const matchMonth =
      !filterMonth ||
      (date.getMonth() + 1).toString().padStart(2, "0") ===
      filterMonth.padStart(2, "0");
    const matchDay =
      !filterDay ||
      date.getDate().toString().padStart(2, "0") === filterDay.padStart(2, "0");
    const matchHour =
      !filterHour ||
      date.getHours().toString().padStart(2, "0") ===
      filterHour.padStart(2, "0");
    const matchType = filterType === "ALL" || log.diagType === filterType;
    // 참고: 실제 데이터에 line 정보가 있다면 아래 로직 활성화 (현재는 목업 대응)
    const matchLine = filterLine === "ALL" || true;

    return (
      matchYear && matchMonth && matchDay && matchHour && matchType && matchLine
    );
  });

  const totalPages = Math.ceil(filteredHistory.length / ROWS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "history", label: "에러 로그", icon: ListOrdered },
    {
      id: "stats",
      label: "호출 현황",
      icon: AlertTriangle,
      badge: engineerCalls.length > 0 ? engineerCalls.length : undefined,
    },
    { id: "settings", label: "시스템 설정", icon: Settings },
  ];

  return (
    <div className="h-screen bg-black flex text-zinc-100 overflow-hidden font-sans">
      {/* 1. 사이드바 */}
      <div className="w-[260px] bg-black flex flex-col shrink-0 border-r border-neutral-800">
        <div className="p-6 flex items-center space-x-4 border-b border-neutral-800 shrink-0">
          <div className="w-12 h-12 bg-[#E82127] flex items-center justify-center shrink-0">
            <TrendingUp size={28} color="white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">
            Admin
          </h1>
        </div>

        <nav className="flex-1 py-4 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-none font-black transition-all text-base outline-none focus:outline-none focus:ring-0 ${activeTab === item.id
                ? "bg-[#E82127] text-white"
                : "text-neutral-500 hover:bg-white/5"
                }`}
            >
              <div className="flex items-center space-x-4">
                <item.icon size={22} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-white text-[#E82127] text-sm px-2.5 py-0.5 font-black animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 shrink-0">
          <button
            onClick={onBack}
            className="w-full flex items-center space-x-4 px-5 py-3.5 bg-neutral-900 text-neutral-400 font-black text-base hover:bg-red-600 hover:text-white transition-all outline-none focus:outline-none focus:ring-0"
          >
            <LogOut size={22} />
            <span>시스템 종료</span>
          </button>
        </div>
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* 헤더 */}
        <header className="h-[70px] bg-black border-b border-neutral-800 flex items-center justify-between px-6 shadow-sm shrink-0">
          {/* 🔥 지긋지긋한 빨간 마침표(.) 완전 삭제 완료! */}
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            {activeTab === "dashboard"
              ? "대시보드"
              : activeTab === "history"
                ? "에러 로그"
                : activeTab === "stats"
                  ? "호출 현황"
                  : "시스템 설정"}
          </h2>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-neutral-800 border border-zinc-700 flex items-center justify-center shrink-0 rounded-full cursor-pointer hover:bg-neutral-700 transition-colors">
              <Users size={20} className="text-neutral-400" />
            </div>
          </div>
        </header>

        {/* 🔥 메인 영역: flex-col, overflow-hidden으로 스크롤 원천 차단 */}
        <main className="flex-1 overflow-hidden p-4 bg-black outline-none flex flex-col space-y-4">
          {/* 긴급 호출 배너 */}
          <AnimatePresence>
            {engineerCalls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="shrink-0"
              >
                <div className="bg-red-600/10 border-l-[8px] border-red-600 p-6 flex flex-col space-y-4 outline-none mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-red-500 font-black text-xl flex items-center space-x-3 uppercase italic tracking-tighter">
                      <AlertTriangle size={28} className="animate-pulse" />
                      긴급 호출 안내 ({engineerCalls.length})
                    </h3>
                    <button
                      onClick={onClearCalls}
                      className="bg-red-600 text-white px-4 py-2 font-black text-xs uppercase outline-none focus:outline-none focus:ring-0 hover:bg-red-500 transition-colors"
                    >
                      모든 로그 삭제
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid: 여백 확대 (iPad 해상도 대응) */}
              <div className="grid grid-cols-3 gap-6 shrink-0 outline-none ">
                {[
                  {
                    label: "금일 에러 발생",
                    value: "124",
                    sub: "+5.2%",
                    icon: AlertTriangle,
                    color: "#FF3B30",
                  },
                  {
                    label: "엔지니어 호출",
                    value: engineerCalls.length,
                    sub: "긴급",
                    icon: Wrench,
                    color: "#E82127",
                    pulse: true,
                  },
                  {
                    label: "에러 해결률",
                    value: "88.5%",
                    sub: "목표 달성",
                    icon: CheckCircle,
                    color: "#34C759",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`bg-[#18181B] p-8 border border-neutral-800 flex flex-col justify-center space-y-3 ${stat.pulse && engineerCalls.length > 0 ? "border-red-600 border-[2px]" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-neutral-400 font-bold text-lg uppercase tracking-tight">
                        {stat.label}
                      </p>
                      <stat.icon size={32} style={{ color: stat.color }} />
                    </div>
                    <div className="flex items-baseline space-x-3 mt-2">
                      <span className="text-6xl font-black text-white tracking-tighter italic">
                        {stat.value}
                      </span>
                      <span
                        className="text-sm font-bold italic"
                        style={{ color: stat.color }}
                      >
                        {stat.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🔥 차트 영역: flex-1 적용. 남는 공간을 자동으로 100% 꽉 채웁니다. (절대 스크롤 안생김) */}
              <div className="bg-[#18181B] p-8 border border-neutral-800 flex-1 flex flex-col min-h-[200px] outline-none ">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <h3 className="text-2xl font-black text-white uppercase italic flex items-center space-x-4">
                    <div className="w-2 h-7 bg-[#E82127]" />
                    에러 트렌드 분석
                  </h3>

                  <div className="flex space-x-3">
                    {["ALL", "A", "B", "C", "D"].map((line) => (
                      <button
                        key={line}
                        onClick={() => setSelectedLine(line as any)}
                        className={`px-5 py-2.5 font-black italic uppercase transition-all border text-sm outline-none focus:outline-none focus:ring-0 ${selectedLine === line
                          ? "bg-[#E82127] text-white border-[#E82127]"
                          : "bg-transparent text-neutral-500 border-zinc-700 hover:border-zinc-500 hover:text-white"
                          }`}
                      >
                        {line === "ALL" ? "전체 라인" : `라인 ${line}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 차트 컨테이너가 부모의 남은 공간(flex-1)을 100% 사용 */}
                <div
                  className="flex-1 w-full outline-none focus:outline-none min-h-0"
                  tabIndex={-1}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    style={{ outline: "none" }}
                  >
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      style={{ outline: "none" }}
                      accessibilityLayer={false}
                    >
                      <defs>
                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={lineColors.A}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={lineColors.A}
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={lineColors.B}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={lineColors.B}
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={lineColors.C}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={lineColors.C}
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="colorD" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={lineColors.D}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={lineColors.D}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="0"
                        vertical={false}
                        stroke="#27272a"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#9ca3af",
                          fontWeight: "bold",
                          fontSize: 13,
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#9ca3af",
                          fontWeight: "bold",
                          fontSize: 13,
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0c0c0e",
                          border: "1px solid #3f3f46",
                          borderRadius: "4px",
                          padding: "12px",
                          outline: "none",
                        }}
                        itemStyle={{ fontWeight: "bold", fontSize: "14px" }}
                        labelStyle={{
                          color: "#a1a1aa",
                          marginBottom: "4px",
                          fontWeight: "normal",
                          fontSize: "12px",
                        }}
                        cursor={{
                          stroke: "#52525b",
                          strokeWidth: 2,
                          strokeDasharray: "5 5",
                        }}
                      />

                      {(selectedLine === "ALL" || selectedLine === "A") && (
                        <Area
                          type="monotone"
                          dataKey="lineA"
                          name="라인 A"
                          stroke={lineColors.A}
                          strokeWidth={selectedLine === "ALL" ? 3 : 5}
                          fill="url(#colorA)"
                          fillOpacity={1}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                        />
                      )}
                      {(selectedLine === "ALL" || selectedLine === "B") && (
                        <Area
                          type="monotone"
                          dataKey="lineB"
                          name="라인 B"
                          stroke={lineColors.B}
                          strokeWidth={selectedLine === "ALL" ? 3 : 5}
                          fill="url(#colorB)"
                          fillOpacity={1}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                        />
                      )}
                      {(selectedLine === "ALL" || selectedLine === "C") && (
                        <Area
                          type="monotone"
                          dataKey="lineC"
                          name="라인 C"
                          stroke={lineColors.C}
                          strokeWidth={selectedLine === "ALL" ? 3 : 5}
                          fill="url(#colorC)"
                          fillOpacity={1}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                        />
                      )}
                      {(selectedLine === "ALL" || selectedLine === "D") && (
                        <Area
                          type="monotone"
                          dataKey="lineD"
                          name="라인 D"
                          stroke={lineColors.D}
                          strokeWidth={selectedLine === "ALL" ? 3 : 5}
                          fill="url(#colorD)"
                          fillOpacity={1}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 🔥 로그 테이블: shrink-0으로 높이 고정. 여백과 높이 최소화. 4줄만 노출 */}
              <div className="bg-[#18181B] border border-neutral-800 overflow-hidden outline-none shrink-0 min-h-[300px] flex flex-col">
                <div className="px-8 py-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/30">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    실시간 활동 로그
                  </h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-[#E82127] font-bold text-sm hover:underline outline-none focus:outline-none focus:ring-0"
                  >
                    전체 이력 보기 →
                  </button>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black text-neutral-500 font-bold text-sm tracking-tight border-b border-neutral-800">
                      <th className="px-8 py-4">발생 시각</th>
                      <th className="px-8 py-4">장치 식별자</th>
                      <th className="px-8 py-4 text-right">조치 상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 데이터 4개까지만 렌더링하여 화면 초과 방지 */}
                    {errorHistory.slice(0, 4).map((log, i) => (
                      <tr
                        key={i}
                        className="border-b border-neutral-800/50 h-[64px] hover:bg-white/5 transition-colors"
                      >
                        <td className="px-8 font-mono text-base text-neutral-400 font-medium">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-8 font-bold text-white text-lg tracking-tight">
                          WELD-{log.diagType === "robot" ? "로봇" : "용접기"}-
                          {log.code}
                        </td>
                        <td className="px-8 text-right">
                          <span className="text-green-500 font-bold text-xs tracking-tight px-3 py-1.5 bg-green-500/10 rounded-sm">
                            조치 완료
                          </span>
                        </td>
                      </tr>
                    ))}
                    {errorHistory.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-[80px] text-center text-neutral-600 font-black text-lg italic uppercase tracking-widest"
                        >
                          No Recent Activity
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "history" && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden h-full">
              {/* 1. 강화된 대형 필터 바 */}
              <div className="bg-[#111114] border border-neutral-800 p-6 flex flex-col space-y-6 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-6 bg-[#E82127]" />
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                      Advanced Search
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setFilterYear("");
                      setFilterMonth("");
                      setFilterDay("");
                      setFilterHour("");
                      setFilterType("ALL");
                      setFilterLine("ALL");
                      setCurrentPage(1);
                    }}
                    className="px-6 py-2 bg-neutral-800 text-neutral-400 font-black text-xs uppercase italic hover:bg-red-600 hover:text-white transition-all shadow-none outline-none focus:outline-none focus:ring-0 select-none"
                  >
                    Reset Filter
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  {/* 시간 필터들 */}
                  {[
                    {
                      label: "YEAR",
                      val: filterYear,
                      set: setFilterYear,
                      opts: ["2024", "2025", "2026"],
                    },
                    {
                      label: "MONTH",
                      val: filterMonth,
                      set: setFilterMonth,
                      opts: Array.from({ length: 12 }, (_, i) =>
                        String(i + 1).padStart(2, "0"),
                      ),
                    },
                    {
                      label: "DAY",
                      val: filterDay,
                      set: setFilterDay,
                      opts: Array.from({ length: 31 }, (_, i) =>
                        String(i + 1).padStart(2, "0"),
                      ),
                    },
                    {
                      label: "HOUR",
                      val: filterHour,
                      set: setFilterHour,
                      opts: Array.from({ length: 24 }, (_, i) =>
                        String(i).padStart(2, "0"),
                      ),
                    },
                  ].map((f) => (
                    <select
                      key={f.label}
                      value={f.val}
                      onChange={(e) => {
                        f.set(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-black border-2 border-zinc-700 p-6 text-[20px] font-black text-white outline-none focus:border-[#E82127] appearance-none cursor-pointer text-center"
                    >
                      <option value="">{f.label}</option>
                      {f.opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ))}

                  {/* 장치 타입 필터 */}
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="bg-black border-2 border-neutral-700 p-8 text-2xl font-black text-[#E82127] outline-none focus:border-[#E82127] appearance-none cursor-pointer text-center"
                  >
                    <option value="ALL">장치(전체)</option>
                    <option value="robot">ROBOT</option>
                    <option value="welder">WELDER</option>
                  </select>

                  {/* 라인 필터 */}
                  <select
                    value={filterLine}
                    onChange={(e) => {
                      setFilterLine(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="bg-black border-2 border-neutral-700 p-8 text-2xl font-black text-white outline-none focus:border-[#E82127] appearance-none cursor-pointer text-center"
                  >
                    <option value="ALL">라인(전체)</option>
                    {["A", "B", "C", "D"].map((l) => (
                      <option key={l} value={l}>
                        라인 {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. 로그 테이블 영역 */}
              <div className="bg-[#111114] border border-neutral-800 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-black text-neutral-500 font-black text-sm tracking-widest border-b border-neutral-800 uppercase italic">
                        <th className="px-10 py-6">Timestamp</th>
                        <th className="px-10 py-6 text-center">
                          Unit Identification
                        </th>
                        <th className="px-10 py-6 text-center">Error Code</th>
                        <th className="px-10 py-6 text-right">
                          Operation Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((log, i) => (
                        <tr
                          key={i}
                          className="border-b border-neutral-800/30 h-[90px] hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-10 font-mono text-xl text-neutral-500 font-bold tracking-tighter group-hover:text-neutral-300">
                            {formatFullDate(log.timestamp)}
                          </td>
                          <td className="px-10 text-center">
                            <span className="font-black text-white text-3xl tracking-tight italic uppercase">
                              WELD-
                              {log.diagType === "robot" ? "ROBOT" : "WELDER"}
                              <span className="ml-3 text-neutral-600 text-lg">
                                LINE-A
                              </span>
                            </span>
                          </td>
                          <td className="px-10 text-center">
                            <span className="font-black text-[#E82127] text-4xl tracking-widest">
                              {log.code}
                            </span>
                          </td>
                          <td className="px-10 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
                              <span className="text-green-500 font-black text-xl uppercase tracking-widest italic">
                                Resolved
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedHistory.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-40 text-center text-zinc-800 font-black text-5xl italic uppercase opacity-20 tracking-tighter"
                          >
                            No Results Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 3. 대형 페이징 컨트롤 */}
                <div className="px-8 py-8 border-t border-neutral-800 flex items-center justify-between bg-black shrink-0">
                  <div className="flex flex-col">
                    <span className="text-zinc-600 font-bold text-xs uppercase tracking-[0.2em]">
                      Data Filtering System
                    </span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-black text-white italic tracking-tighter">
                        {filteredHistory.length}
                      </span>
                      <span className="text-zinc-600 text-sm font-bold uppercase">
                        Matches Found
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      className="h-16 px-10 bg-neutral-900 border border-neutral-800 text-[30px] font-black text-white disabled:opacity-20 hover:bg-[#E82127] transition-all flex items-center space-x-3 uppercase italic outline-none focus:outline-none focus:ring-0 select-none"
                    >
                      <span>←</span> 이전
                    </button>

                    <div className="flex items-center space-x-4 px-4">
                      <span className="text-[30px] font-black text-[#E82127] italic">
                        {currentPage}
                      </span>
                      <div className="w-px h-8 bg-neutral-800 rotate-12" />
                      <span className="text-[30px] font-black text-zinc-600 italic">
                        {totalPages || 1}
                      </span>
                    </div>

                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      className="h-16 px-10 bg-neutral-900 border border-neutral-800 text-[30px] font-black text-white disabled:opacity-20 hover:bg-[#E82127] transition-all flex items-center space-x-3 uppercase italic outline-none focus:outline-none focus:ring-0 select-none"
                    >
                      다음 <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
