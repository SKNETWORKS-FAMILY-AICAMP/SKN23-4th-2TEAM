import { useState } from "react";
import { Lang, LANG_OPTIONS } from "./language-pack";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  ListOrdered,
  Settings,
  LogOut,
  Wrench,
  Globe,
  Link,
  Cpu,
  Save,
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

const ADMIN_T = {
  KO: {
    sidebarTitle: "Admin",
    dashboard: "대시보드",
    history: "에러 로그",
    stats: "호출 현황",
    settings: "시스템 설정",
    systemShutdown: "시스템 종료",
    todayErrors: "금일 에러 발생",
    engineerCalls: "엔지니어 호출",
    resolution: "에러 해결률",
    subErrors: "건",
    subCalls: "긴급",
    subGoal: "목표 달성",
    trendTitle: "에러 트렌드 분석",
    all: "전체",
    line: "라인",
    realtimeLog: "실시간 활동 로그",
    timestamp: "TIMESTAMP",
    deviceIdent: "DEVICE IDENTIFICATION",
    status: "STATUS",
    callTime: "호출 일시",
    callMessage: "호출 메시지",
    noCalls: "현재 접수된 고가동 호출 데이터가 없습니다.",
    resetFilter: "Reset All View",
    type: "Type",
    lineFilter: "Line",
    searchDate: "Search Date",
    searchFilter: "History Search Filter",
    allTypes: "ALL TYPES",
    allLines: "ALL LINES",
    saveApply: "설정 저장 및 적용",
    deviceBinding: "기기 고정 할당 (Device Binding Mode)",
    fixedMode: "고정 모드",
    fixedDesc: "특정 라인과 로봇에 기기를 영구히 고정합니다. 작업자는 에러코드만 입력하게 됩니다.",
    floatingMode: "이동 모드",
    floatingDesc: "들고 다니는 태블릿용입니다. 메인 화면에서 라인과 기기를 매번 변경할 수 있습니다.",
    lineName: "라인 이름",
    robotName: "로봇 명칭",
    deviceId: "장비 고유 ID",
    backendIp: "백엔드 서버 IP",
  },
  EN: {
    sidebarTitle: "Admin",
    dashboard: "Dashboard",
    history: "Error Logs",
    stats: "Call Status",
    settings: "System Settings",
    systemShutdown: "Shutdown",
    todayErrors: "Today's Errors",
    engineerCalls: "Engineer Calls",
    resolution: "Resolution Rate",
    subErrors: "cases",
    subCalls: "Urgent",
    subGoal: "Target",
    trendTitle: "Error Trend Analysis",
    all: "ALL",
    line: "Line",
    realtimeLog: "Real-time Activity Log",
    timestamp: "TIMESTAMP",
    deviceIdent: "DEVICE IDENTIFICATION",
    status: "STATUS",
    callTime: "Call Time",
    callMessage: "Message",
    noCalls: "No pending engineer calls.",
    resetFilter: "Reset All View",
    type: "Type",
    lineFilter: "Line",
    searchDate: "Search Date",
    searchFilter: "History Search Filter",
    allTypes: "ALL TYPES",
    allLines: "ALL LINES",
    saveApply: "Save & Apply Config",
    deviceBinding: "Device Binding Mode",
    fixedMode: "FIXED MODE",
    fixedDesc: "Lock this device to a specific station. Workers only see the error keypad.",
    floatingMode: "FLOATING MODE",
    floatingDesc: "Mobile tablet mode. Allows on-screen switching of stations/robots.",
    lineName: "Line Name",
    robotName: "Robot Name",
    deviceId: "Device ID",
    backendIp: "Backend Server IP",
  },
  UZ: {
    sidebarTitle: "Admin",
    dashboard: "Boshqaruv paneli",
    history: "Xatolar jurnali",
    stats: "Chaqiruv holati",
    settings: "Tizim sozlamalari",
    systemShutdown: "Tizimni o'chirish",
    todayErrors: "Bugungi xatolar",
    engineerCalls: "Muhandis chaqiruvi",
    resolution: "Hal qilish darajasi",
    subErrors: "ta",
    subCalls: "Shoshilinch",
    subGoal: "Maqsad",
    trendTitle: "Xatolar tendentsiyasi tahlili",
    all: "Barchasi",
    line: "Liniya",
    realtimeLog: "Haqiqiy vaqt jurnali",
    timestamp: "TIMESTAMP",
    deviceIdent: "DEVICE IDENTIFICATION",
    status: "STATUS",
    callTime: "Chaqiruv vaqti",
    callMessage: "Xabar",
    noCalls: "Kutilayotgan chaqiruvlar yo'q.",
    resetFilter: "Reset All View",
    type: "Type",
    lineFilter: "Line",
    searchDate: "Search Date",
    searchFilter: "Tarix qidirish filtri",
    allTypes: "BARCHA TURDAGI",
    allLines: "BARCHA LINIYALAR",
    saveApply: "Saqlash va qo'llash",
    deviceBinding: "Qurilmani biriktirish rejimi",
    fixedMode: "RUXSAT ETILGAN REJIM",
    fixedDesc: "Qurilmani aniq liniya/robotga mahkamlang. Faqat kadr klaviaturasini ko'rasiz.",
    floatingMode: "SUZUVCHI REJIM",
    floatingDesc: "Planshet rejimi. Liniya va robot stantsiyalarni qo'lda almashtirishga ruxsat beradi.",
    lineName: "Liniya nomi",
    robotName: "Robot nomi",
    deviceId: "Qurilma ID",
    backendIp: "Backend Server IP",
  }
};

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
  engineerCalls: Array<{ code: string; timestamp: number; device: string; message?: string }>;
  onClearCalls: () => void;
  onResolveCall: (timestamp: number) => void;
  stats?: {
    today_total: number;
    today_resolution_rate: number;
    daily_trend: any[];
  };
  currentConfig: any;
  onConfigChange: (config: any) => void;
}

export function AdminPanel({
  lang,
  onBack,
  errorHistory,
  engineerCalls,
  onClearCalls,
  onResolveCall,
  stats,
  currentConfig,
  onConfigChange,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "history" | "stats" | "settings"
  >("dashboard");
  const [tempConfig, setTempConfig] = useState(() => {
    const config = { ...currentConfig };
    if (!config.apiUrl) {
      config.apiUrl = (typeof window !== "undefined" ? window.location.origin : "") + "/api/v1";
    }
    return config;
  });
  const [showIpKeypad, setShowIpKeypad] = useState(false);
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
      const parts = deviceStr.split(" - ");
      const lineInfo = parts[0].toUpperCase().trim();
      const lineChar = filterLine.toUpperCase().trim();
      lineMatch = lineInfo.includes(lineChar) || lineInfo.replace(/\s+/g, "").includes(lineChar);
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

  const t = ADMIN_T[lang] || ADMIN_T.KO;

  const menuItems = [
    { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
    { id: "history", label: t.history, icon: ListOrdered },
    {
      id: "stats", label: t.stats, icon: AlertTriangle,
      badge: engineerCalls.length > 0 ? engineerCalls.length : undefined
    },
    { id: "settings", label: t.settings, icon: Settings },
  ];

  return (
    <div
      className="h-full flex-1 bg-black flex text-zinc-100 overflow-hidden"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <div className="w-[220px] bg-[#0a0a0a] flex flex-col shrink-0 border-r border-neutral-800/60">

        {/* Logo removed */}

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
            <span>{t.systemShutdown}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
          MAIN
      ══════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">


        <main className="flex-1 overflow-hidden bg-black flex flex-col">

          {/* ══ DASHBOARD ══ */}
          {activeTab === "dashboard" && (
            <>
              {/* ── STAT CARDS: 3등분, 좌측 아이콘 + 우측 텍스트 수직중앙 ── */}
              <div className="grid grid-cols-3 shrink-0 border-b border-neutral-800/60" style={{ height: 90 }}>
                {[
                  { label: t.todayErrors, value: String(stats?.today_total ?? 0), sub: t.subErrors, icon: AlertTriangle, color: "#FF3B30" },
                  { label: t.engineerCalls, value: String(engineerCalls.length), sub: t.subCalls, icon: Wrench, color: "#E82127", pulse: true },
                  { label: t.resolution, value: `${stats?.today_resolution_rate ?? 0}%`, sub: t.subGoal, icon: CheckCircle, color: "#34C759" },
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
                      {t.trendTitle}
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
                        {line === "ALL" ? t.all : `${t.line} ${line}`}
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
                      {t.realtimeLog}
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
                                  [{(lineInfo.toUpperCase().startsWith("LINE") ? lineInfo.replace(/line\s*/gi, "").trim() : lineInfo.trim()) + " " + t.line}]
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

          {/* ══ STATS (CALLS) ══ */}
          {activeTab === "stats" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="border-b border-neutral-800/60 shrink-0" style={{ background: "#0d0d0f", padding: "16px 24px" }}>
                <span style={{ fontSize: 14, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "#fff", letterSpacing: "0.05em" }}>
                  {t.engineerCalls}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ background: "#000" }}>
                <table className="w-full table-fixed">
                  <thead>
                    <tr style={{ background: "#0d0d0f", borderBottom: "1px solid rgba(64,64,64,0.4)" }}>
                      {[t.callTime, t.deviceIdent, t.callMessage].map((h, i) => (
                        <th key={h} style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: "#525252", textAlign: "left", width: i===0 ? "180px" : i===1 ? "220px" : undefined }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {engineerCalls.map((call, i) => (
                      <tr key={i} style={{ height: 60, borderBottom: "1px solid rgba(38,38,38,0.3)" }}>
                        <td style={{ padding: "0 24px", fontFamily: "monospace", fontSize: 13, color: "#e5e5e5" }}>
                          {formatDate(call.timestamp)}
                        </td>
                        <td style={{ padding: "0 24px", fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>
                          {(() => {
                            const parts = (call.device || "").split(" - ");
                            const line = parts[0] || "A";
                            const device = parts[1] || "";
                            return (
                              <>
                                <span style={{ color: "#E82127", fontWeight: 700, marginRight: 8 }}>[{line} {t.line}]</span>
                                {device} <span style={{ color: "#737373", fontSize: 11 }}>(ERR: {call.code})</span>
                              </>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "0 24px", fontSize: 13, color: "#a1a1aa" }}>{call.message}</td>
                      </tr>
                    ))}
                    {engineerCalls.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: 40, color: "#737373", fontSize: 13 }}>
                          {t.noCalls}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {activeTab === "history" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div
                className="border-b border-neutral-800/60 shrink-0"
                style={{ background: "#0d0d0f", padding: "16px 24px" }}
              >
                <div className="flex flex-col gap-4" style={{ marginBottom: 20 }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "#fff", letterSpacing: "0.05em" }}>
                      {t.searchFilter}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    {/* Device Type */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>{t.type}</label>
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
                        <option value="ALL">{t.allTypes}</option>
                        <option value="robot">ROBOT</option>
                        <option value="welder">WELDER</option>
                      </select>
                    </div>

                    {/* Line Select */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>{t.lineFilter}</label>
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
                        <option value="ALL">{t.allLines}</option>
                        {["A", "B", "C", "D"].map(l => <option key={l} value={l}>LINE {l}</option>)}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>{t.searchDate}</label>
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
                      {t.resetFilter}
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
                                  [{(lineInfo.toUpperCase().startsWith("LINE") ? lineInfo.replace(/line\s*/gi, "").trim() : lineInfo.trim()) + " " + t.line}]
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

          {/* ══ SETTINGS ══ */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-auto p-8 md:p-12 bg-[#0d0d0f]">
              <div className="max-w-5xl mx-auto space-y-12 pb-20">

                {/* 1. 설정 헤더 영역 */}
                <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-[#E82127]" />
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                      {lang === "KO" ? "시스템 환경설정" : "System Configuration"}
                    </h2>
                  </div>
                  <button
                    onClick={() => onConfigChange(tempConfig)}
                    className="px-8 py-4 bg-[#E82127] font-black text-lg italic tracking-tighter hover:bg-[#c41b21] transition-all flex items-center gap-3 shadow-2xl active:scale-95 rounded-md"
                    style={{ color: "#ffffff" }}
                  >
                    <Save size={20} />
                    {t.saveApply}
                  </button>
                </div>

                {/* 2. 설정 본문 (flex-col 기반의 완벽한 1단 세로 정렬) */}
                <div className="flex flex-col gap-10">

                  {/* --- 기기 고정 할당 섹션 --- */}
                  <div className="space-y-5">
                    <label className="flex items-center gap-3 text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">
                      <Cpu size={18} />
                      {t.deviceBinding}
                    </label>
                    <div className="grid grid-cols-2 gap-6 w-full">
                      <button
                        onClick={() => setTempConfig({ ...tempConfig, mode: "fixed" })}
                        className={`p-8 border transition-all flex flex-col items-start gap-3 text-left rounded-lg ${tempConfig.mode === "fixed" ? "bg-red-950/20 border-[#E82127] text-white" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          }`}
                      >
                        <span style={{ color: tempConfig.mode === "fixed" ? "#ffffff" : "#a1a1aa" }} className="text-2xl font-black italic">{t.fixedMode}</span>
                        <p style={{ color: tempConfig.mode === "fixed" ? "#ffffff" : "#a1a1aa" }} className="text-[13px] font-bold opacity-70 leading-relaxed uppercase">
                          {t.fixedDesc}
                        </p>
                      </button>
                      <button
                        onClick={() => setTempConfig({ ...tempConfig, mode: "floating" })}
                        className={`p-8 border transition-all flex flex-col items-start gap-3 text-left rounded-lg ${tempConfig.mode === "floating" ? "bg-red-950/20 border-[#E82127] text-white" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          }`}
                      >
                        <span style={{ color: tempConfig.mode === "floating" ? "#ffffff" : "#a1a1aa" }} className="text-2xl font-black italic">{t.floatingMode}</span>
                        <p style={{ color: tempConfig.mode === "floating" ? "#ffffff" : "#a1a1aa" }} className="text-[13px] font-bold opacity-70 leading-relaxed uppercase">
                          {t.floatingDesc}
                        </p>
                      </button>
                    </div>

                    {/* 고정 모드일 때 나타나는 상세 입력창 (그리드로 딱 맞게 배치) */}
                    {tempConfig.mode === "fixed" && (
                      <div className="grid grid-cols-3 gap-6 p-8 bg-black/50 border border-zinc-800 rounded-lg mt-4">
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{t.lineName}</label>
                          <input
                            type="text"
                            value={tempConfig.line}
                            onChange={(e) => setTempConfig({ ...tempConfig, line: e.target.value })}
                            className="w-full bg-black border border-zinc-700 py-4 px-6 text-white font-black italic outline-none focus:border-[#E82127] transition-all rounded-md"
                            placeholder="LINE A"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{t.robotName}</label>
                          <input
                            type="text"
                            value={tempConfig.robot}
                            onChange={(e) => setTempConfig({ ...tempConfig, robot: e.target.value })}
                            className="w-full bg-black border border-zinc-700 py-4 px-6 text-white font-black italic outline-none focus:border-[#E82127] transition-all rounded-md"
                            placeholder="ROBOT 1"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{t.deviceId}</label>
                          <input
                            type="text"
                            value={tempConfig.deviceId}
                            onChange={(e) => setTempConfig({ ...tempConfig, deviceId: e.target.value })}
                            className="w-full bg-black border border-zinc-700 py-4 px-6 text-white font-black italic outline-none focus:border-[#E82127] transition-all rounded-md"
                            placeholder="A_ROBOT1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 구분선 추가 */}
                  <div className="w-full h-px bg-neutral-800/80 my-2" />

                  {/* --- 네트워크 & 언어 설정 섹션 (가로 2단 분할) --- */}
                  <div className="grid grid-cols-2 gap-8 w-full">

                    {/* 백엔드 IP 설정 */}
                    <div className="space-y-5">
                      <label className="flex items-center gap-3 text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">
                        <Link size={18} />
                        {t.backendIp}
                      </label>
                      <input
                        type="text"
                        value={tempConfig.apiUrl}
                        readOnly
                        onClick={() => setShowIpKeypad(true)}
                        className="w-full bg-black border border-zinc-800 py-5 px-6 text-white font-black text-[16px] italic outline-none focus:border-[#E82127] transition-all cursor-pointer rounded-lg"
                        placeholder="http://192.168.0.10:8001/api/v1"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* IP Keypad Overlay */}
      <AnimatePresence>
        {showIpKeypad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-black italic text-white uppercase tracking-tighter">Enter Backend URL</span>
                <button onClick={() => setShowIpKeypad(false)} className="text-zinc-500 hover:text-white font-black">CLOSE</button>
              </div>

              <div className="bg-black border border-zinc-800 p-6 mb-8 text-3xl font-black italic text-[#E82127] break-all min-h-[80px]">
                {tempConfig.apiUrl}
              </div>

              <div className="grid grid-cols-4 gap-4">
                {["1", "2", "3", "HTTP://", "4", "5", "6", ".", "7", "8", "9", ":", "0", "/", "API/V1", "DEL"].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === "DEL") {
                        setTempConfig({ ...tempConfig, apiUrl: tempConfig.apiUrl.slice(0, -1) });
                      } else {
                        setTempConfig({ ...tempConfig, apiUrl: tempConfig.apiUrl + k.toLowerCase() });
                      }
                    }}
                    className="h-20 bg-zinc-900 border border-zinc-800 text-white font-black text-xl hover:bg-zinc-800 active:scale-95 transition-all"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}