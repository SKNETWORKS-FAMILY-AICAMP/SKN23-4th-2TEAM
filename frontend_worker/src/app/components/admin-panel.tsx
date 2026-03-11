import { useState, useEffect } from "react";
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
  Wrench
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  lang: Lang;
  onBack: () => void;
  errorHistory: Array<{ code: string; timestamp: number; diagType: "robot" | "welder" }>;
  engineerCalls: Array<{ code: string; timestamp: number; device: string }>;
  onClearCalls: () => void;
  onResolveCall: (timestamp: number) => void;
}

export function AdminPanel({ lang: _lang, onBack, errorHistory, engineerCalls, onClearCalls, onResolveCall }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "stats" | "settings">("dashboard");

  const chartData = [
    { name: "3/1", lineA: 12, lineB: 8 },
    { name: "3/2", lineA: 15, lineB: 12 },
    { name: "3/3", lineA: 8, lineB: 15 },
    { name: "3/4", lineA: 22, lineB: 18 },
    { name: "3/5", lineA: 18, lineB: 20 },
    { name: "3/6", lineA: 25, lineB: 12 },
    { name: "3/7", lineA: 10, lineB: 14 },
  ];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  };

  const menuItems = [
    { id: "dashboard", label: "대시보드 홈", icon: LayoutDashboard },
    { id: "history", label: "에러 로그", icon: ListOrdered },
    { id: "stats", label: "호출 현황", icon: AlertTriangle, badge: engineerCalls.length > 0 ? engineerCalls.length : undefined },
    { id: "settings", label: "시스템 설정", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black flex text-zinc-100 overflow-hidden font-sans">

      {/* 1. 사이드바: [320px], 직각[0px] */}
      <div className="w-[320px] bg-[#0c0c0e] flex flex-col shrink-0 border-r border-zinc-800">
        <div className="p-10 flex items-center gap-5 border-b border-zinc-800">
          <div className="w-14 h-14 bg-[#E82127] flex items-center justify-center shrink-0">
            <TrendingUp size={32} color="white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">ADMIN</h1>
        </div>

        <nav className="flex-1 py-10 px-6 space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-8 py-8 rounded-none font-black transition-all text-xl ${activeTab === item.id
                ? "bg-[#E82127] text-white"
                : "text-zinc-500 hover:bg-white/5"
                }`}
            >
              <div className="flex items-center gap-6">
                <item.icon size={28} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-white text-[#E82127] text-sm px-3 py-1 font-black animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-zinc-800">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-6 px-8 py-8 bg-zinc-900 text-zinc-400 font-black text-xl hover:bg-red-600 hover:text-white transition-all"
          >
            <LogOut size={28} />
            <span>EXIT SYSTEM</span>
          </button>
        </div>
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[120px] bg-black border-b border-zinc-800 flex items-center justify-between px-14 shadow-sm shrink-0">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            {activeTab} <span className="text-[#E82127]">.</span>
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-zinc-500 font-bold text-sm uppercase">Operator Status</p>
              <p className="font-black text-white text-xl uppercase italic tracking-widest">Master Admin</p>
            </div>
            <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Users size={32} className="text-zinc-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-14 space-y-14 custom-scrollbar">

          {/* 긴급 호출 배너: 직각 디자인 적용 */}
          <AnimatePresence>
            {engineerCalls.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-600/10 border-l-[12px] border-red-600 p-12 flex flex-col gap-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-red-500 font-black text-3xl flex items-center gap-4 uppercase italic tracking-tighter">
                    <AlertTriangle size={40} className="animate-pulse" />
                    Emergency Calls ({engineerCalls.length})
                  </h3>
                  <button onClick={onClearCalls} className="bg-red-600 text-white px-8 py-4 font-black text-sm uppercase">Clear All Logs</button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  {engineerCalls.map((call) => (
                    <div key={call.timestamp} className="bg-zinc-900 p-8 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="font-black text-white text-2xl uppercase italic tracking-tight">{call.device}</p>
                        <p className="text-red-500 font-bold mt-2 font-mono text-lg">{call.code} | {formatDate(call.timestamp)}</p>
                      </div>
                      <button onClick={() => onResolveCall(call.timestamp)} className="w-20 h-20 bg-green-600 text-white flex items-center justify-center">
                        <CheckCircle size={40} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid: [72px] 수치 강조 */}
              <div className="grid grid-cols-3 gap-10">
                {[
                  { label: "Today Errors", value: "124", sub: "+5.2%", icon: AlertTriangle, color: "#FF3B30" },
                  { label: "Engineer Calls", value: engineerCalls.length, sub: "URGENT", icon: Wrench, color: "#E82127", pulse: true },
                  { label: "Resolution Rate", value: "88.5%", sub: "GOAL OK", icon: CheckCircle, color: "#34C759" }
                ].map((stat, i) => (
                  <div key={i} className={`bg-[#18181B] p-12 border border-zinc-800 flex flex-col gap-6 ${stat.pulse && engineerCalls.length > 0 ? 'border-red-600 border-[3px]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <p className="text-zinc-500 font-black text-xl uppercase italic">{stat.label}</p>
                      <stat.icon size={40} style={{ color: stat.color }} />
                    </div>
                    <div className="flex items-baseline gap-4 mt-4">
                      <span className="text-7xl font-black text-white tracking-tighter italic">{stat.value}</span>
                      <span className="text-2xl font-bold italic" style={{ color: stat.color }}>{stat.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 차트 영역: 흰색 툴팁 완전 제거 및 커스텀 다크 스타일 적용 */}
              <div className="bg-[#18181B] p-14 border border-zinc-800">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-3xl font-black text-white uppercase italic flex items-center gap-4">
                    <div className="w-2 h-10 bg-[#E82127]" />
                    Error Trend Analysis
                  </h3>
                </div>
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E82127" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#E82127" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: '900', fontSize: 18 }} dy={20} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: '900', fontSize: 18 }} />

                      {/* 🔥 핵심 수정: 툴팁 완전 다크화 */}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c0c0e',
                          border: '2px solid #E82127',
                          borderRadius: '0px',
                          padding: '24px',
                        }}
                        itemStyle={{
                          color: '#ffffff',
                          fontWeight: '900',
                          fontSize: '22px',
                          textTransform: 'uppercase'
                        }}
                        labelStyle={{
                          color: '#71717a',
                          marginBottom: '12px',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}
                        cursor={{ stroke: '#E82127', strokeWidth: 3 }}
                      />

                      <Area type="monotone" dataKey="lineA" stroke="#E82127" strokeWidth={8} fill="url(#colorRed)" fillOpacity={1} activeDot={{ r: 12, stroke: '#fff', strokeWidth: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 로그 테이블: 행 높이 [120px] 확보 */}
              <div className="bg-[#18181B] border border-zinc-800 overflow-hidden">
                <div className="px-12 py-10 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Live Activity Logs</h3>
                  <button onClick={() => setActiveTab("history")} className="text-[#E82127] font-black text-xl hover:underline italic">FULL HISTORY →</button>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black text-zinc-500 font-black text-sm uppercase tracking-[0.3em]">
                      <th className="px-12 py-8">Timestamp</th>
                      <th className="px-12 py-8">Device Identifier</th>
                      <th className="px-12 py-8 text-right">Operation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorHistory.slice(0, 5).map((log, i) => (
                      <tr key={i} className="border-b border-zinc-800 h-[120px] hover:bg-white/5 transition-colors">
                        <td className="px-12 font-mono text-2xl text-zinc-400 font-bold tracking-tighter">{formatDate(log.timestamp)}</td>
                        <td className="px-12 font-black text-white text-3xl italic uppercase tracking-tight">WELD-{log.diagType.toUpperCase()}-{log.code}</td>
                        <td className="px-12 text-right">
                          <span className="text-green-500 font-black text-sm border-[2px] border-green-500/40 px-6 py-3 uppercase tracking-widest bg-green-500/5">Resolved</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}