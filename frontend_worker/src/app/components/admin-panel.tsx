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

interface AdminPanelProps {
  lang: Lang;
  onBack: () => void;
  errorHistory: Array<{
    code: string;
    timestamp: number;
    diagType: "robot" | "welder";
    device?: string;
    status?: string;
  }>;
  engineerCalls: Array<{ code: string; timestamp: number; device: string }>;
  onClearCalls: () => void;
  onResolveCall: (timestamp: number) => void;
  stats?: {
    today_total: number;
    today_resolution_rate: number;
    daily_trend: any[];
  };
}

export function AdminPanel({
  lang: _lang,
  onBack,
  errorHistory,
  engineerCalls,
  onClearCalls,
  onResolveCall,
  stats,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "history" | "stats" | "settings"
  >("dashboard");
  const [selectedLine, setSelectedLine] = useState<"ALL" | "A" | "B" | "C" | "D">("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "robot" | "welder">("ALL");
  const [filterLine, setFilterLine] = useState<"ALL" | "A" | "B" | "C" | "D">("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [filterHour, setFilterHour] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // RESET PAGE ON FILTER CHANGE
  const handleFilterChange = (setter: (v: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };
  const ROWS_PER_PAGE = 10;

  const chartData = stats?.daily_trend?.length ? stats.daily_trend : [
    { name: "3/1", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/2", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/3", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/4", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/5", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/6", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/7", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
    { name: "3/8", lineA: 0, lineB: 0, lineC: 0, lineD: 0 },
  ];

  const lineColors = { A: "#E82127", B: "#3b82f6", C: "#eab308", D: "#22c55e" };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const formatFullDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const filteredHistory = errorHistory.filter((log) => {
    const date = new Date(log.timestamp);
    
    // Line filtering logic: parse "Line A" or "[Line A]" from the device string
    let lineMatch = true;
    if (filterLine !== "ALL") {
      const deviceStr = log.device || "";
      // Match "Line A", "LINE A", "A라인", or even "A-1"
      const normalizedDevice = deviceStr.toUpperCase();
      const lineChar = filterLine.toUpperCase();
      lineMatch = normalizedDevice.includes(`LINE ${lineChar}`) || 
                  normalizedDevice.includes(`${lineChar}라인`) || 
                  normalizedDevice.includes(`LINE${lineChar}`);
    }

    const logDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    return (
      (!filterDate || logDateStr === filterDate) &&
      (!filterHour || date.getHours().toString() === filterHour) &&
      (filterType === "ALL" || log.diagType === filterType) &&
      lineMatch
    );
  });

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "history", label: "에러 로그", icon: ListOrdered },
    {
      id: "stats", label: "호출 현황", icon: AlertTriangle,
      badge: engineerCalls.length > 0 ? engineerCalls.length : undefined
    },
    { id: "settings", label: "시스템 설정", icon: Settings },
  ];

  return (
    <div
      className="h-screen bg-black flex text-zinc-100 overflow-hidden"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <div className="w-[220px] bg-[#0a0a0a] flex flex-col shrink-0 border-r border-neutral-800/60">

        {/* Logo */}
        <div
          className="flex items-center gap-3 border-b border-neutral-800/60 shrink-0"
          style={{ padding: "18px 20px", paddingLeft: 0 }}
        >
          <div className="w-11 h-11 bg-[#E82127] flex items-center justify-center shrink-0">
            <TrendingUp size={22} color="white" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            WELD-BOT
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className="w-full flex items-center justify-between outline-none focus:outline-none transition-colors"
                style={{
                  padding: "13px 20px",
                  paddingLeft: 0,
                  background: active ? "#E82127" : "transparent",
                  color: active ? "#fff" : "#737373",
                  fontSize: 14,
                  fontWeight: 600,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className="animate-pulse"
                    style={{
                      background: "#fff",
                      color: "#E82127",
                      fontSize: 10,
                      fontWeight: 900,
                      padding: "2px 6px",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-neutral-800/60 shrink-0">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 outline-none transition-colors"
            style={{ padding: "16px 20px", color: "#737373", fontSize: 13, fontWeight: 600 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#737373"; }}
          >
            <LogOut size={16} />
            <span>시스템 종료</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
          MAIN
      ══════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">


        <main className="flex-1 overflow-hidden bg-black flex flex-col">

          {/* ══ DASHBOARD ══ */}
          {activeTab === "dashboard" && (
            <>
              {/* ── STAT CARDS: 3등분, 좌측 아이콘 + 우측 텍스트 수직중앙 ── */}
              <div className="grid grid-cols-3 shrink-0 border-b border-neutral-800/60" style={{ height: 90 }}>
                {[
                  { label: "금일 에러 발생", value: String(stats?.today_total ?? 0), sub: "건", icon: AlertTriangle, color: "#FF3B30" },
                  { label: "엔지니어 호출", value: String(engineerCalls.length), sub: "긴급", icon: Wrench, color: "#E82127", pulse: true },
                  { label: "에러 해결률", value: `${stats?.today_resolution_rate ?? 0}%`, sub: "목표 달성", icon: CheckCircle, color: "#34C759" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="flex items-center border-r border-neutral-800/60 last:border-r-0"
                    style={{
                      padding: "0 24px",
                      gap: 16,
                      background: (stat as any).pulse && engineerCalls.length > 0
                        ? "rgba(220,38,38,0.06)"
                        : "#0d0d0f",
                    }}
                  >
                    {/* 아이콘 */}
                    <stat.icon
                      size={28}
                      style={{ color: stat.color, flexShrink: 0 }}
                    />
                    {/* 텍스트 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#737373",
                          lineHeight: 1,
                        }}
                      >
                        {stat.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 38,
                            fontWeight: 900,
                            fontStyle: "italic",
                            letterSpacing: "-0.04em",
                            color: "#fff",
                            lineHeight: 1,
                          }}
                        >
                          {stat.value}
                        </span>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            fontStyle: "italic",
                            color: stat.color,
                          }}
                        >
                          {stat.sub}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── CHART: 고정 높이 ── */}
              <div
                className="bg-black border-b border-neutral-800/60 flex flex-col shrink-0"
                style={{ height: 380, padding: "20px 24px 16px" }}
              >
                {/* 차트 헤더 */}
                <div className="flex items-center justify-between shrink-0" style={{ marginBottom: 16 }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 5, height: 20, background: "#E82127" }} />
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontStyle: "italic",
                        textTransform: "uppercase",
                        letterSpacing: "-0.01em",
                        color: "#fff",
                      }}
                    >
                      에러 트렌드 분석
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["ALL", "A", "B", "C", "D"].map((line) => (
                      <button
                        key={line}
                        onClick={() => setSelectedLine(line as any)}
                        className="outline-none transition-all"
                        style={{
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 800,
                          fontStyle: "italic",
                          textTransform: "uppercase",
                          border: `1px solid ${selectedLine === line ? "#E82127" : "#2a2a2a"}`,
                          background: selectedLine === line ? "#E82127" : "transparent",
                          color: selectedLine === line ? "#fff" : "#737373",
                          cursor: "pointer",
                        }}
                      >
                        {line === "ALL" ? "전체" : `라인 ${line}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 차트 바디 */}
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        {["A", "B", "C", "D"].map(id => (
                          <linearGradient key={id} id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={lineColors[id as keyof typeof lineColors]} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={lineColors[id as keyof typeof lineColors]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="0" vertical={false} stroke="#1a1a1d" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fill: "#4a4a55", fontWeight: 600, fontSize: 10 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false}
                        tick={{ fill: "#4a4a55", fontWeight: 600, fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111114",
                          border: "1px solid #2a2a2e",
                          borderRadius: 0,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        labelStyle={{ fontWeight: 900, fontSize: 13, color: "#fff" }}
                        itemStyle={{ fontWeight: 700, fontSize: 12 }}
                      />
                      {["A", "B", "C", "D"].map(id =>
                        (selectedLine === "ALL" || selectedLine === id) && (
                          <Area key={id} type="monotone" dataKey={`line${id}`}
                            stroke={lineColors[id as keyof typeof lineColors]}
                            strokeWidth={2}
                            fill={`url(#cg${id})`}
                            fillOpacity={1}
                          />
                        )
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── RECENT LOG ── */}
              <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d0d0f" }}>
                {/* 섹션 헤더 */}
                <div
                  className="flex items-center justify-between border-b border-neutral-800/60 shrink-0"
                  style={{ padding: "14px 24px" }}
                >
                  <div className="flex items-center gap-3">
                    <div style={{ width: 4, height: 18, background: "#E82127" }} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        fontStyle: "italic",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#fff",
                      }}
                    >
                      실시간 활동 로그
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("history")}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#E82127",
                      letterSpacing: "0.08em",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    VIEW ALL →
                  </button>
                </div>

                {/* 테이블 */}
                <table className="w-full table-fixed">
                  <thead>
                    <tr
                      style={{
                        background: "#000",
                        borderBottom: "1px solid rgba(64,64,64,0.4)",
                      }}
                    >
                      {["TIMESTAMP", "DEVICE IDENTIFICATION", "STATUS"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 24px",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#525252",
                            textAlign: i === 2 ? "right" : "left",
                            width: i === 0 ? 160 : i === 2 ? 130 : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {errorHistory.slice(0, 8).map((log, i) => (
                      <tr
                        key={i}
                        style={{
                          height: 52,
                          borderBottom: "1px solid rgba(38,38,38,0.5)",
                        }}
                      >
                        <td style={{ padding: "0 24px", fontFamily: "monospace", fontSize: 13, color: "#ffffff" }}>
                          {formatDate(log.timestamp)}
                        </td>
                        <td style={{ padding: "0 24px", fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>
                          {(() => {
                            const devicePart = log.device || "";
                            const parts = devicePart.split(" - ");
                            const lineInfo = parts.length > 1 ? parts[0] : "LINE A-1";
                            const deviceId = parts.length > 1 ? parts[1] : (devicePart || (log.diagType === "robot" ? "ROBOT_07" : "WELDER_01"));
                            return (
                              <>
                                <span style={{ color: "#E82127", fontWeight: 700, marginRight: 8, fontSize: 12 }}>
                                  [{(lineInfo.toUpperCase().startsWith("LINE") ? lineInfo.replace(/line\s*/gi, "").trim() : lineInfo.trim()) + "라인"}]
                                </span>
                                {deviceId}
                              </>
                            );
                          })()}
                          <span style={{ color: "#a1a1aa", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                            (ERR: <span style={{ color: "#ffffff" }}>{log.code}</span>)
                          </span>
                        </td>
                        <td style={{ padding: "0 24px", textAlign: "right" }}>
                          <span
                            style={{
                              color: log.status === "resolved" ? "#22c55e" : "#eab308",
                              fontSize: 11,
                              fontWeight: 900,
                              fontStyle: "italic",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              padding: "4px 10px",
                              background: log.status === "resolved" ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
                              border: `1px solid ${log.status === "resolved" ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
                            }}
                          >
                            {log.status || "Ongoing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══ HISTORY ══ */}
          {activeTab === "history" && (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              <div
                className="border-b border-neutral-800/60 shrink-0"
                style={{ background: "#0d0d0f", padding: "16px 24px" }}
              >
                <div className="flex flex-col gap-4" style={{ marginBottom: 20 }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "#fff", letterSpacing: "0.05em" }}>
                      History Search Filter
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    {/* Device Type */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => handleFilterChange(setFilterType, e.target.value as any)}
                        style={{ 
                          background: "#1a1a1a", 
                          border: "1px solid #333", 
                          color: "#fff", 
                          fontSize: 13, 
                          padding: "0 12px", 
                          height: 42,
                          minWidth: 120,
                          outline: "none",
                          borderRadius: "4px",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="ALL">ALL TYPES</option>
                        <option value="robot">ROBOT</option>
                        <option value="welder">WELDER</option>
                      </select>
                    </div>

                    {/* Line Select */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>Line</label>
                      <select
                        value={filterLine}
                        onChange={(e) => handleFilterChange(setFilterLine, e.target.value as any)}
                        style={{ 
                          background: "#1a1a1a", 
                          border: "1px solid #333", 
                          color: "#fff", 
                          fontSize: 13, 
                          padding: "0 12px", 
                          height: 42,
                          minWidth: 120,
                          outline: "none",
                          borderRadius: "4px",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="ALL">ALL LINES</option>
                        {["A", "B", "C", "D"].map(l => <option key={l} value={l}>LINE {l}</option>)}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>Search Date</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => handleFilterChange(setFilterDate, e.target.value)}
                        style={{ 
                          background: "#1a1a1a", 
                          border: "1px solid #333", 
                          color: "#fff", 
                          fontSize: 13, 
                          padding: "0 12px", 
                          height: 42,
                          outline: "none",
                          borderRadius: "4px",
                          boxSizing: "border-box",
                          colorScheme: "dark"
                        }}
                      />
                    </div>

                    {/* Reset Button (Aligned to bottom) */}
                    <button
                      onClick={() => {
                        setFilterType("ALL");
                        setFilterLine("ALL");
                        setFilterDate("");
                        setFilterHour("");
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "0 20px",
                        background: "#1a1a1a",
                        color: "#ef4444",
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        height: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box"
                      }}
                    >
                      Reset All View
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr
                      style={{
                        background: "#000",
                        borderBottom: "1px solid rgba(64,64,64,0.4)",
                      }}
                    >
                      {["TIMESTAMP", "DEVICE IDENTIFICATION", "STATUS"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 24px",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#525252",
                            textAlign: i === 2 ? "right" : "left",
                            width: i === 0 ? 160 : i === 2 ? 130 : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((log, i) => (
                      <tr
                        key={i}
                        style={{
                          height: 52,
                          borderBottom: "1px solid rgba(38,38,38,0.5)",
                        }}
                      >
                        {/* TIMESTAMP (White font) */}
                        <td style={{ padding: "0 24px", fontFamily: "monospace", fontSize: 13, color: "#ffffff" }}>
                          {formatFullDate(log.timestamp)}
                        </td>
                        {/* DEVICE IDENTIFICATION */}
                        <td style={{ padding: "0 24px", fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>
                          {(() => {
                            const devicePart = log.device || "";
                            const parts = devicePart.split(" - ");
                            const lineInfo = parts.length > 1 ? parts[0] : "LINE A-1";
                            const deviceId = parts.length > 1 ? parts[1] : (devicePart || (log.diagType === "robot" ? "ROBOT_07" : "WELDER_01"));
                            return (
                              <>
                                <span style={{ color: "#E82127", fontWeight: 700, marginRight: 8, fontSize: 12 }}>
                                  [{(lineInfo.toUpperCase().startsWith("LINE") ? lineInfo.replace(/line\s*/gi, "").trim() : lineInfo.trim()) + "라인"}]
                                </span>
                                {deviceId}
                                <span style={{ color: "#a1a1aa", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                                  (ERR: <span style={{ color: "#ffffff" }}>{log.code}</span>)
                                </span>
                              </>
                            );
                          })()}
                        </td>
                        {/* STATUS (Status Badge) */}
                        <td style={{ padding: "0 24px", textAlign: "right" }}>
                          <span
                            style={{
                              color: log.status === "resolved" ? "#22c55e" : "#eab308",
                              fontSize: 11,
                              fontWeight: 900,
                              fontStyle: "italic",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              padding: "4px 10px",
                              background: log.status === "resolved" ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
                              border: `1px solid ${log.status === "resolved" ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
                            }}
                          >
                            {log.status || "Ongoing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div
                className="shrink-0 border-t border-neutral-800/60"
                style={{ background: "#0a0a0a", padding: "12px 24px" }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>
                    Page <span style={{ color: "#fff" }}>{currentPage}</span> of {Math.max(1, Math.ceil(filteredHistory.length / ROWS_PER_PAGE))}
                    <span style={{ marginLeft: 8, fontSize: 11 }}>({filteredHistory.length} Total Logs)</span>
                  </span>
                  <div className="flex gap-4">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{
                        padding: "10px 24px",
                        background: "#1a1a1a",
                        color: currentPage === 1 ? "#404040" : "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                        border: "1px solid #333",
                        borderRadius: "6px",
                        cursor: currentPage === 1 ? "default" : "pointer",
                        minWidth: 100,
                        transition: "all 0.2s ease"
                      }}
                    >
                      이전
                    </button>
                    <button
                      disabled={currentPage >= Math.ceil(filteredHistory.length / ROWS_PER_PAGE)}
                      onClick={() => setCurrentPage(p => p + 1)}
                      style={{
                        padding: "10px 24px",
                        background: "#1a1a1a",
                        color: currentPage >= Math.ceil(filteredHistory.length / ROWS_PER_PAGE) ? "#404040" : "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                        border: "1px solid #333",
                        borderRadius: "6px",
                        cursor: currentPage >= Math.ceil(filteredHistory.length / ROWS_PER_PAGE) ? "default" : "pointer",
                        minWidth: 100,
                        transition: "all 0.2s ease"
                      }}
                    >
                      다음
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