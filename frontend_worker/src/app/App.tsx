import { useState, useCallback, useEffect } from "react";
import { Header } from "./components/header";
import { MainMenu } from "./components/main-menu";
import { Keypad } from "./components/keypad";
import { AiResponse } from "./components/ai-response";
import { AdminPanel } from "./components/admin-panel";
import { DialogModal } from "./components/dialog-modal";
import { DeviceSelection } from "./components/DeviceSelection";
import { Lang } from "./components/language-pack";
import { api } from "../lib/api";
import { AdminLogin, Config } from "./components/AdminLogin";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

type AppView = "main" | "device_select" | "keypad" | "admin" | "admin-login";

interface ErrorHistory {
    code: string;
    timestamp: number;
    diagType: "robot" | "welder";
    device?: string;
    status?: string;
}

const genUuid = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function App() {
    // Load configuration from localStorage
    const [config, setConfig] = useState<Config>(() => {
        const saved = localStorage.getItem("weldbot-config");
        if (saved) return JSON.parse(saved);
        return {
            mode: "floating",
            line: "",
            robot: "",
            deviceId: "",
            apiUrl: "/api/v1",
            language: "KO"
        };
    });

    const [lang, setLang] = useState<Lang>(config.language);
    const [view, setView] = useState<AppView>("main");
    const [selectedDevice, setSelectedDevice] = useState({
        line: config.mode === "fixed" ? config.line : "",
        robot: config.mode === "fixed" ? config.robot : ""
    });
    const [deviceId, setDeviceId] = useState(config.mode === "fixed" ? config.deviceId : "");
    const [errorCode, setErrorCode] = useState("");
    const [diagType, setDiagType] = useState<"robot" | "welder">("robot");
    const [showDialog, setShowDialog] = useState(false);
    const [aiActive, setAiActive] = useState(false);
    const [aiMode, setAiMode] = useState<"diagnosis" | "history" | "related" | "followup">("diagnosis");
    const [aiKey, setAiKey] = useState(0);

    const [sessionId, setSessionId] = useState<number | null>(null);
    const [stepNo, setStepNo] = useState<number>(0);
    const [sessionStatus, setSessionStatus] = useState<string>("ongoing");
    const [aiMessage, setAiMessage] = useState<string>("");
    const [originalAiMessage, setOriginalAiMessage] = useState<string>("");
    const [aiChecklist, setAiChecklist] = useState<string[] | null>(null);
    const [originalAiChecklist, setOriginalAiChecklist] = useState<string[] | null>(null);
    const [aiResponseType, setAiResponseType] = useState<"overall" | "checklist" | "diagnosis" | null>(null);
    const [isOnline, setIsOnline] = useState(true);

    const [engineerCalls, setEngineerCalls] = useState<Array<{ code: string; timestamp: number; device: string }>>([]);
    const [errorHistory, setErrorHistory] = useState<ErrorHistory[]>([]);
    const [dashboardStats, setDashboardStats] = useState<{ today_total: number; today_resolution_rate: number; daily_trend: any[] }>({
        today_total: 0,
        today_resolution_rate: 0,
        daily_trend: []
    });
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);

    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvErrors, setCsvErrors] = useState<any[]>([]);
    const [csvSearch, setCsvSearch] = useState("");
    const [csvType, setCsvType] = useState("hyundai");
    const [isCsvKeyboardOpen, setIsCsvKeyboardOpen] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            const [logs, stats, calls] = await Promise.all([
                api.getRecentLogs(),
                api.getStats(),
                api.getEngineerCalls()
            ]);
            setErrorHistory(logs);
            setDashboardStats(stats);
            setEngineerCalls(calls);
        } catch (err) {
            console.error("Failed to fetch global data:", err);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        if (view === "admin") {
            const interval = setInterval(fetchHistory, 5000);
            return () => clearInterval(interval);
        }
    }, [view, fetchHistory]);

    useEffect(() => {
        const checkConnection = async () => {
            const ok = await api.checkHealth();
            setIsOnline(ok);
        };
        checkConnection();
        const interval = setInterval(checkConnection, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        localStorage.setItem("weldbot-lang", lang);
        setConfig(prev => ({ ...prev, language: lang }));
    }, [lang]);

    useEffect(() => {
        if (aiActive && sessionId) {
            if (lang === "KO") {
                if (originalAiMessage) setAiMessage(originalAiMessage);
                if (originalAiChecklist) setAiChecklist(originalAiChecklist);
                return;
            }

            const messageToTranslate = originalAiMessage || aiMessage;
            const checklistToTranslate = originalAiChecklist || aiChecklist;

            if (messageToTranslate) {
                api.translateText(messageToTranslate, lang as "ko" | "en" | "uz")
                    .then(res => { if (res && res.translated) setAiMessage(res.translated); })
                    .catch(() => { });
            }
            if (checklistToTranslate && checklistToTranslate.length > 0) {
                api.translateText(JSON.stringify(checklistToTranslate), lang as "ko" | "en" | "uz")
                    .then(res => { if (res && res.translated) setAiChecklist(JSON.parse(res.translated)); })
                    .catch(() => { });
            }
        }
    }, [lang, aiActive, sessionId, originalAiMessage, originalAiChecklist]);

    useEffect(() => {
        localStorage.setItem("weldbot-config", JSON.stringify(config));
    }, [config]);

    const handleBackToMain = useCallback(() => {
        setView("main");
        setErrorCode("");
        setAiActive(false);
        setAiMode("diagnosis");
        setSessionId(null);
        setSessionStatus("ongoing");
        fetchHistory(); // Refresh dashboard stats/logs immediately
    }, [fetchHistory]);

    const handleDiagnostic = useCallback((type: "robot" | "welder") => {
        setDiagType(type);
        if (config.mode === "fixed") {
            setSelectedDevice({ line: config.line, robot: config.robot });
            setDeviceId(config.deviceId);
            setView("keypad");
        } else {
            setView("device_select");
        }
    }, [config]);

    const handleDeviceSelect = useCallback((line: string, robot: string, devId: string) => {
        setSelectedDevice({ line, robot });
        setDeviceId(devId);
        setErrorCode("");
        setAiActive(false);
        setAiMode("diagnosis");
        setSessionId(null);
        setSessionStatus("ongoing");
        setView("keypad");
    }, []);

    const handleKeyInput = useCallback((char: string) => {
        setErrorCode((prev) => (prev.length >= 12 ? prev : prev + char));
    }, []);

    const handleClear = useCallback(() => {
        setErrorCode("");
        setAiActive(false);
        setAiMode("diagnosis");
        setSessionId(null);
        setSessionStatus("ongoing");
    }, []);

    const handleBackspace = useCallback(() => {
        setErrorCode((prev) => prev.slice(0, -1));
    }, []);

    const [isDiagnosing, setIsDiagnosing] = useState(false);

    const handleSubmit = useCallback(async () => {
        if (!isOnline) {
            toast.error(lang === "KO" ? "네트워크 연결을 확인하세요" : "Please check your network connection");
            return;
        }

        if (errorCode) {
            setIsDiagnosing(true);
            setAiActive(true);
            setAiMessage("");
            try {
                const res = await api.startConsultation({
                    request_id: genUuid(),
                    language: lang.toLowerCase() as "ko" | "en" | "uz",
                    device_id: deviceId || `${selectedDevice.line}-${selectedDevice.robot}`,
                    error_code: errorCode
                });
                if (res.status === "ok") {
                    setSessionId(res.session_id);
                    setStepNo(res.step_no);
                    setSessionStatus(res.session_status);
                    setOriginalAiMessage(res.assistant.message);
                    setOriginalAiChecklist(res.assistant.checklist || null);
                    setAiMessage(res.assistant.message);
                    setAiChecklist(res.assistant.checklist || null);
                    setAiResponseType(res.assistant.response_type);
                    setAiMode("diagnosis");
                    setAiKey(prev => prev + 1);
                    toast.success(lang === "KO" ? "진단 시작" : "Diagnosis started");
                    fetchHistory();
                }
            } catch (err: any) {
                let msg = lang === "KO" ? "서버와 연결 실패" : "Server connection failed";
                if (err.response) {
                    if (err.response.status === 404) {
                        msg = lang === "KO" ? "존재하지 않는 에러코드입니다" : "Error code not found";
                    } else if (err.response.status === 409) {
                        msg = lang === "KO" ? "이미 진행 중인 요청입니다" : "Request already in progress";
                    }
                }
                toast.error(`${msg} [상세: ${err.message || "Unknown Error"}]`);
                setAiMessage("");
                setAiMode("diagnosis");
                setAiActive(false); // Disable on actual failure
                setAiKey(prev => prev + 1);
            } finally {
                setIsDiagnosing(false);
            }
        }
    }, [errorCode, diagType, lang, selectedDevice, deviceId, fetchHistory, isOnline]);

    const handleFollowUp = useCallback(async (text: string, isChecklistSubmit?: boolean, selectedItems?: string[]) => {
        let isResolvedEvent = false;
        if (text.includes("해결 완료") || text.includes("(O)")) isResolvedEvent = true;

        if (text.includes("정비 이력") || text === "정비 이력 확인") {
            try {
                const logs = await api.getRecentLogs(deviceId || undefined);
                setHistoryLogs(logs);
                setIsHistoryModalOpen(true);
            } catch (err) {
                toast.error("이력을 불러오하지 못했습니다.");
            }
            return;
        }

        if (text.includes("관련 에러코드")) {
            try {
                const type = diagType === "robot" ? "hyundai" : "welding";
                const logs = await api.listCsvErrors(type);
                setCsvErrors(logs);
                setCsvType(type);
                setIsCsvModalOpen(true);
            } catch (err) {
                toast.error("에러코드 목록을 불러오지 못했습니다.");
            }
            return;
        }

        if (sessionId) {
            setIsDiagnosing(true);
            try {
                let selectedChoice: "O" | "X" | null = isResolvedEvent ? "O" : (isChecklistSubmit ? "X" : (text.includes("(X)") ? "X" : null));
                const res = await api.sendConsultationEvent(sessionId, {
                    request_id: genUuid(),
                    actor: "user",
                    step_no: stepNo + 1,
                    language: lang.toLowerCase() as "ko" | "en" | "uz",
                    selected_choice: selectedChoice,
                    message: text,
                    payload: isChecklistSubmit && selectedItems ? { checklist_results: selectedItems } : undefined
                });
                if (res.status === "ok") {
                    setStepNo(res.step_no);
                    setSessionStatus(res.session_status);
                    if (res.session_status === "resolved") {
                        toast.success("Resolved");
                        fetchHistory();
                        setTimeout(handleBackToMain, 1500);
                        return;
                    }
                    setOriginalAiMessage(res.assistant.message);
                    setOriginalAiChecklist(res.assistant.checklist || null);
                    setAiMessage(res.assistant.message);
                    setAiChecklist(res.assistant.checklist || null);
                    setAiResponseType(res.assistant.response_type);
                    setAiMode("diagnosis");
                    setAiActive(true);
                    setAiKey(prev => prev + 1);
                }
            } catch (err) {
                toast.error("Error");
            } finally {
                setIsDiagnosing(false);
            }
        } else if (isResolvedEvent) {
            setTimeout(handleBackToMain, 1500);
        }
    }, [errorCode, selectedDevice, deviceId, lang, handleBackToMain, sessionId, stepNo, fetchHistory]);

    const handleUpdateNotice = useCallback(() => {
        toast.info("Coming soon", { duration: 3000 });
    }, []);

    const renderContent = () => {
        if (view === "admin") {
            return (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <AdminPanel
                        lang={lang}
                        onBack={handleBackToMain}
                        errorHistory={errorHistory}
                        engineerCalls={engineerCalls}
                        onClearCalls={() => setEngineerCalls([])}
                        onResolveCall={(ts) => setEngineerCalls(p => p.filter(c => c.timestamp !== ts))}
                        stats={dashboardStats}
                        currentConfig={config}
                        onConfigChange={(c) => {
                            setConfig(c);
                            setLang(c.language);
                            if (c.mode === "fixed") {
                                setSelectedDevice({ line: c.line, robot: c.robot });
                                setDeviceId(c.deviceId);
                            }
                        }}
                    />
                </div>
            );
        }

        if (view === "admin-login") {
            return (
                <div className="flex-1 flex items-center justify-center bg-black relative">
                    <AdminLogin
                        lang={lang}
                        onSuccess={() => setView("admin")}
                        onBack={handleBackToMain}
                    />
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col min-h-0 container mx-auto px-4 max-w-7xl">
                <AnimatePresence mode="wait">
                    {view === "main" && (
                        <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
                            <MainMenu lang={lang} onDiagnostic={handleDiagnostic} onOpenTechDict={handleUpdateNotice} onOpenConsumables={handleUpdateNotice} />
                        </motion.div>
                    )}
                    {view === "device_select" && (
                        <motion.div key="device" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                            <DeviceSelection lang={lang} onSelect={handleDeviceSelect} />
                        </motion.div>
                    )}
                    {view === "keypad" && !aiActive && (
                        <motion.div key="keypad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
                            <Keypad
                                lang={lang} errorCode={errorCode} onInput={handleKeyInput} onDelete={handleBackspace} onSubmit={handleSubmit}
                                diagType={diagType} selectedDevice={selectedDevice} onSelectDevice={(l, r, d) => { setSelectedDevice({ line: l, robot: r }); setDeviceId(d); }}
                                floatingMode={config.mode === "floating"}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                <AiResponse
                    key={aiKey} lang={lang} errorCode={errorCode} isActive={aiActive}
                    mode={sessionStatus === "resolved" ? "diagnosis" : aiMode}
                    aiMessage={aiMessage} aiChecklist={aiChecklist} aiResponseType={aiResponseType}
                    onFollowUp={handleFollowUp}
                    isDiagnosing={isDiagnosing}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen max-h-screen bg-zinc-950 flex flex-col font-sans overflow-hidden">
            <Toaster position="top-center" richColors theme="dark" />
            <Header lang={lang} onLangChange={setLang} onAdminActivate={() => setView("admin-login")} onHome={handleBackToMain} isOnline={isOnline} />
            {renderContent()}
            <DialogModal lang={lang} isOpen={showDialog} onClose={() => setShowDialog(false)} />

            {/* Maintenance History Modal */}
            {isHistoryModalOpen && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ backgroundColor: "#1c1c1e", width: "100%", maxWidth: "800px", height: "80vh", borderRadius: "16px", border: "1px solid #2c2c2e", display: "flex", flexDirection: "column", padding: "24px", gap: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2c2c2e", paddingBottom: "16px" }}>
                            <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff" }}>🛠️ 해당 라인 정비 이력</h3>
                            <button style={{ color: "#a1a1aa", fontSize: "32px", background: "none", border: "none", cursor: "pointer" }} onClick={() => setIsHistoryModalOpen(false)}>×</button>
                        </div>

                        {/* Scrollable List */}
                        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px" }}>
                            {historyLogs.length === 0 ? (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a", fontSize: "18px" }}>정비 이력이 없습니다.</div>
                            ) : (
                                historyLogs.map((log, idx) => (
                                    <div key={idx} style={{ backgroundColor: "#18181b", padding: "16px", borderRadius: "12px", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <span style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>[{log.diagType.toUpperCase()}] {log.code || "N/A"}</span>
                                            <span style={{ fontSize: "14px", color: "#a1a1aa" }}>{new Date(log.timestamp).toLocaleString()}</span>
                                            <span style={{ fontSize: "14px", color: "#71717a" }}>{log.device}</span>
                                        </div>
                                        <span style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: "900", backgroundColor: log.status === "resolved" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: log.status === "resolved" ? "#4ade80" : "#f87171", border: log.status === "resolved" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)" }}>
                                            {log.status === "resolved" ? "조치완료" : "조치중"}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Errors Lookup Modal */}
            {isCsvModalOpen && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ backgroundColor: "#1c1c1e", width: "100%", maxWidth: "900px", height: "85vh", borderRadius: "16px", border: "1px solid #2c2c2e", display: "flex", flexDirection: "column", padding: "24px", gap: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2c2c2e", paddingBottom: "16px" }}>
                            <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff" }}>📋 관련 에러코드 기술 정보</h3>
                            <button style={{ color: "#a1a1aa", fontSize: "32px", background: "none", border: "none", cursor: "pointer" }} onClick={() => setIsCsvModalOpen(false)}>×</button>
                        </div>

                        {/* Controls: Type & Search */}
                        <div style={{ display: "flex", gap: "12px" }}>
                            <select
                                value={csvType}
                                onChange={async (e) => {
                                    setCsvType(e.target.value);
                                    const logs = await api.listCsvErrors(e.target.value, csvSearch);
                                    setCsvErrors(logs);
                                }}
                                style={{ backgroundColor: "#27272a", color: "#ffffff", padding: "12px 16px", borderRadius: "8px", border: "1px solid #3f3f46", fontSize: "16px", fontWeight: "800", outline: "none", cursor: "pointer" }}
                            >
                                <option value="hyundai">현대 로보틱스</option>
                                <option value="ur">UR (유니버설)</option>
                                <option value="welding">용접기 모듈</option>
                            </select>

                            <input
                                type="text"
                                placeholder="에러코드 또는 설명 검색..."
                                value={csvSearch}
                                onFocus={() => setIsCsvKeyboardOpen(true)}
                                onChange={async (e) => {
                                    setCsvSearch(e.target.value);
                                    const logs = await api.listCsvErrors(csvType, e.target.value);
                                    setCsvErrors(logs);
                                }}
                                style={{ flex: 1, backgroundColor: "#27272a", color: "#ffffff", padding: "12px 16px", borderRadius: "8px", border: "1px solid #3f3f46", fontSize: "16px", outline: "none" }}
                            />
                        </div>

                        {/* Virtual Keyboard */}
                        {isCsvKeyboardOpen && (
                            <div style={{ backgroundColor: "#27272a", padding: "16px", borderRadius: "12px", border: "1px solid #3f3f46", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button style={{ backgroundColor: "#1c1c1e", color: "#a1a1aa", padding: "8px 16px", borderRadius: "8px", border: "1px solid #3f3f46", fontSize: "14px", fontWeight: "900", cursor: "pointer" }} onClick={() => setIsCsvKeyboardOpen(false)}>키보드 닫기 ✕</button>
                                </div>

                                {[{
                                    keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"]
                                }, {
                                    keys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]
                                }, {
                                    keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"]
                                }, {
                                    keys: ["Z", "X", "C", "V", "B", "N", "M"]
                                }].map((row, rIdx) => (
                                    <div key={rIdx} style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                        {row.keys.map(key => (
                                            <button
                                                key={key}
                                                onClick={async () => {
                                                    const newVal = csvSearch + key;
                                                    setCsvSearch(newVal);
                                                    const logs = await api.listCsvErrors(csvType, newVal);
                                                    setCsvErrors(logs);
                                                }}
                                                style={{ flex: 1, minHeight: "60px", backgroundColor: "#1c1c1e", color: "#ffffff", borderRadius: "8px", border: "1px solid #3f3f46", fontSize: "20px", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                ))}

                                {/* Space & Backspace Row */}
                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                    <button
                                        onClick={async () => {
                                            const newVal = csvSearch + " ";
                                            setCsvSearch(newVal);
                                            const logs = await api.listCsvErrors(csvType, newVal);
                                            setCsvErrors(logs);
                                        }}
                                        style={{ flex: 3, minHeight: "60px", backgroundColor: "#3f3f46", color: "#ffffff", borderRadius: "8px", border: "1px solid #52525b", fontSize: "18px", fontWeight: "900" }}
                                    >
                                        Space
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const newVal = csvSearch.slice(0, -1);
                                            setCsvSearch(newVal);
                                            const logs = await api.listCsvErrors(csvType, newVal);
                                            setCsvErrors(logs);
                                        }}
                                        style={{ flex: 1, minHeight: "60px", backgroundColor: "rgba(239,68,68,0.2)", color: "#f87171", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", fontSize: "18px", fontWeight: "900" }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Scrollable List */}
                        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px" }}>
                            {csvErrors.length === 0 ? (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a", fontSize: "18px" }}>결과 데이터가 없습니다.</div>
                            ) : (
                                csvErrors.map((item, idx) => (
                                    <div key={idx} style={{ backgroundColor: "#18181b", padding: "16px", borderRadius: "12px", border: "1px solid #27272a", display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "18px", fontWeight: "900", color: "#ff4444" }}>{item.code}</span>
                                            <span style={{ fontSize: "12px", color: "#52525b" }}>#{(idx + 1).toString().padStart(3, '0')}</span>
                                        </div>
                                        <p style={{ fontSize: "16px", color: "#e4e4e7", lineHeight: "1.5" }}>{item.description}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}