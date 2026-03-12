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
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

type AppView = "main" | "device_select" | "keypad" | "admin";

interface ErrorHistory {
    code: string;
    timestamp: number;
    diagType: "robot" | "welder";
}

export default function App() {
    // Load saved language from localStorage
    const [lang, setLang] = useState<Lang>(() => {
        const saved = localStorage.getItem("weldbot-lang");
        return (saved as Lang) || "KO";
    });

    const [view, setView] = useState<AppView>("main");
    const [selectedDevice, setSelectedDevice] = useState({ line: "", robot: "" });
    const [deviceId, setDeviceId] = useState("");
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
    const [aiChecklist, setAiChecklist] = useState<string[] | null>(null);
    const [aiResponseType, setAiResponseType] = useState<"overall" | "checklist" | "diagnosis" | null>(null);

    // Engineer call notifications
    const [engineerCalls, setEngineerCalls] = useState<Array<{ code: string; timestamp: number; device: string }>>([]);

    // Load error history from localStorage (for immediate display)
    const [errorHistory, setErrorHistory] = useState<ErrorHistory[]>(() => {
        const saved = localStorage.getItem("weldbot-history");
        return saved ? JSON.parse(saved) : [];
    });

    // Fetch history and stats from API
    const [dashboardStats, setDashboardStats] = useState<{ today_total: number; today_resolution_rate: number; daily_trend: any[] }>({
        today_total: 0,
        today_resolution_rate: 0,
        daily_trend: []
    });

    const fetchHistory = useCallback(async () => {
        try {
            const [logs, stats] = await Promise.all([
                api.getRecentLogs(),
                api.getStats()
            ]);
            setErrorHistory(logs);
            setDashboardStats(stats);
            localStorage.setItem("weldbot-history", JSON.stringify(logs));
        } catch (err) {
            console.error("Failed to fetch global data:", err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Polling when in Admin view
    useEffect(() => {
        if (view === "admin") {
            const interval = setInterval(fetchHistory, 5000); // 5s polling
            return () => clearInterval(interval);
        }
    }, [view, fetchHistory]);

    // Save language preference
    useEffect(() => {
        localStorage.setItem("weldbot-lang", lang);
    }, [lang]);

    const handleDiagnostic = useCallback((type: "robot" | "welder") => {
        setDiagType(type);
        setView("device_select");
    }, []);

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
        setErrorCode((prev) => {
            if (prev.length >= 12) {
                toast.error(lang === "KO" ? "최대 12자까지 입력 가능합니다" : "Max 12 characters", {
                    duration: 1500,
                });
                return prev;
            }
            return prev + char;
        });
    }, [lang]);

    const handleClear = useCallback(() => {
        setErrorCode("");
        setAiActive(false);
        setAiMode("diagnosis");
        setSessionId(null);
        setSessionStatus("ongoing");
    }, []);

    const handleSubmit = useCallback(async () => {
        if (errorCode) {
            const newEntry: ErrorHistory = {
                code: errorCode,
                timestamp: Date.now(),
                diagType,
            };
            setErrorHistory((prev) => [newEntry, ...prev.slice(0, 49)]);

            toast.loading(lang === "KO" ? "진단을 시작합니다..." : "Starting diagnosis...", { id: "diagnosis-toast", duration: 3000 });

            try {
                // Call API
                const reqId = crypto.randomUUID();
                const res = await api.startConsultation({
                    request_id: reqId,
                    language: lang.toLowerCase() as "ko" | "en",
                    device_id: deviceId || `${selectedDevice.line}-${selectedDevice.robot}`,
                    error_code: errorCode
                });

                if (res.status === "ok") {
                    setSessionId(res.session_id);
                    setStepNo(res.step_no);
                    setSessionStatus(res.session_status);
                    setAiMessage(res.assistant.message);
                    setAiChecklist(res.assistant.checklist || null);
                    setAiResponseType(res.assistant.response_type);

                    toast.success(lang === "KO" ? "진단 시작 완료" : "Diagnosis started", { id: "diagnosis-toast", duration: 2000 });

                    setAiMode("diagnosis");
                    setAiActive(true);
                    setAiKey((prev) => prev + 1);
                    
                    fetchHistory(); // Refresh history after starting
                }
            } catch (err: any) {
                console.error("Failed to start consultation API:", err);
                toast.error(lang === "KO" ? "서버와 연결할 수 없습니다. 로컬 모드로 진행합니다." : "Server connection failed. Using local mode.", { id: "diagnosis-toast", duration: 3000 });

                // Fallback to offline mode
                setAiMessage(""); // Clear out to use static fallback in AiResponse
                setAiResponseType(null);
                setAiMode("diagnosis");
                setAiActive(true);
                setAiKey((prev) => prev + 1);
            }
        }
    }, [errorCode, diagType, lang, selectedDevice, deviceId, fetchHistory]);

    const handleBackToMain = useCallback(() => {
        setView("main");
        setErrorCode("");
        setAiActive(false);
        setAiMode("diagnosis");
        setSessionId(null);
        setSessionStatus("ongoing");
    }, []);

    const handleFollowUp = useCallback(async (text: string, isChecklistSubmit?: boolean, selectedItems?: string[]) => {
        let isResolvedEvent = false;

        // Local logic first for fast actions
        if (text.includes("해결 완료") || text.includes("(O)")) {
            isResolvedEvent = true;
        } else if (text.includes("엔지니어 호출") || text.includes("Call Engineer")) {
            setEngineerCalls(prev => [{
                code: errorCode,
                timestamp: Date.now(),
                device: `${selectedDevice.line} - ${selectedDevice.robot}`
            }, ...prev]);
            toast.success(lang === "KO" ? "엔지니어 호출이 요청되었습니다." : "Engineer call requested.");
            return;
        } else if (text.includes("이력") || text.includes("Log") || text.includes("tarixini")) {
            setAiMode("history");
            setAiMessage(""); // fallback to static dict
            setAiKey((prev) => prev + 1);
            setAiActive(true);
            return;
        } else if (text.includes("코드") || text.includes("Error") || text.includes("xatolarni")) {
            setAiMode("related");
            setAiMessage(""); // fallback to static dict
            setAiKey((prev) => prev + 1);
            setAiActive(true);
            return;
        }

        if (sessionId) {
            // Call API
            try {
                const reqId = crypto.randomUUID();
                let selectedChoice: "O" | "X" | null = null;
                let payloadData = undefined;

                if (isResolvedEvent) {
                    selectedChoice = "O";
                } else if (!isChecklistSubmit && (text.includes("미해결") || text.includes("(X)"))) {
                    selectedChoice = "X";
                }

                if (isChecklistSubmit && selectedItems) {
                    payloadData = { selected_checklist: selectedItems };
                }

                const res = await api.sendConsultationEvent(sessionId, {
                    request_id: reqId,
                    actor: "user",
                    step_no: stepNo + 1,
                    language: lang.toLowerCase() as "ko" | "en",
                    selected_choice: selectedChoice,
                    message: text,
                    payload: payloadData
                });

                if (res.status === "ok") {
                    setStepNo(res.step_no);
                    setSessionStatus(res.session_status);

                    if (res.session_status === "resolved") {
                        toast.success(lang === "KO" ? "조치가 완료되었습니다." : "Action completed.", { duration: 2000 });
                        fetchHistory(); // Refresh
                        setTimeout(() => handleBackToMain(), 1500);
                        return;
                    }

                    setAiMessage(res.assistant.message);
                    setAiChecklist(res.assistant.checklist || null);
                    setAiResponseType(res.assistant.response_type);

                    setAiMode("diagnosis");
                    setAiKey((prev) => prev + 1);
                    setAiActive(true);
                    return;
                }
            } catch (err) {
                console.error("Error sending event:", err);
                toast.error(lang === "KO" ? "이벤트 전송 실패. 로컬 모드로 진행합니다." : "Failed to send event. Using local mode.");
                // Execute fallback below...
            }
        }

        // Fallback for offline mode or resolved without API session
        if (isResolvedEvent) {
            toast.success(lang === "KO" ? "조치가 완료되었습니다." : "Action completed.", { duration: 2000 });
            setTimeout(() => handleBackToMain(), 1500);
            return;
        } else if (text.includes("미해결") || text.includes("(X)")) {
            setAiMode("followup");
            setAiMessage(""); // fallback to static
            setAiKey((prev) => prev + 1);
            setAiActive(true);
            return;
        }

        // General fallback
        setAiMode("diagnosis");
        setAiMessage("");
        setAiKey((prev) => prev + 1);
        setAiActive(true);
    }, [errorCode, selectedDevice, lang, handleBackToMain, sessionId, stepNo, fetchHistory]);

    const handleUpdateNotice = useCallback(() => {
        toast.info("업데이트 중입니다.", {
            description: "해당 기능은 다음 버전에 추가될 예정입니다.",
            duration: 3000,
            icon: "⚙️"
        });
    }, []);

    if (view === "admin") {
        return (
            <div className="min-h-screen bg-zinc-950 font-sans">
                <Toaster position="top-center" richColors theme="dark" />
                <motion.div
                    key="admin"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AdminPanel
                        lang={lang}
                        onBack={handleBackToMain}
                        errorHistory={errorHistory}
                        engineerCalls={engineerCalls}
                        onClearCalls={() => setEngineerCalls([])}
                        onResolveCall={(timestamp) => setEngineerCalls(prev => prev.filter(c => c.timestamp !== timestamp))}
                        stats={dashboardStats}
                    />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
            <Toaster position="top-center" richColors theme="dark" />

            <Header
                lang={lang}
                onLangChange={setLang}
                onAdminActivate={() => setView("admin")}
                onHome={handleBackToMain}
            />

            <div className="flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                    {view === "main" && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex-1 flex items-center justify-center"
                        >
                            <MainMenu
                                lang={lang}
                                onDiagnostic={handleDiagnostic}
                                onOpenTechDict={handleUpdateNotice}
                                onOpenConsumables={handleUpdateNotice}
                            />
                        </motion.div>
                    )}

                    {view === "device_select" && (
                        <motion.div
                            key="device_select"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex-1 flex flex-col"
                        >
                            <DeviceSelection
                                lang={lang}
                                onSelect={handleDeviceSelect}
                            />
                        </motion.div>
                    )}

                    {view === "keypad" && !aiActive && (
                        <motion.div
                            key="keypad"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1"
                        >
                            <Keypad
                                lang={lang}
                                errorCode={errorCode}
                                onInput={handleKeyInput}
                                onClear={handleClear}
                                onSubmit={handleSubmit}
                                diagType={diagType}
                                selectedDevice={selectedDevice}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {sessionStatus === "resolved" ? (
                    <AiResponse
                        key={aiKey}
                        lang={lang}
                        errorCode={errorCode}
                        isActive={aiActive}
                        mode="resolved"
                        aiMessage={lang === "KO" ? "조치가 완료되었습니다. 홈 화면으로 이동합니다." : "Action completed. Moving to home."}
                        onFollowUp={handleBackToMain}
                    />
                ) : (
                    <AiResponse
                        key={aiKey}
                        lang={lang}
                        errorCode={errorCode}
                        isActive={aiActive}
                        mode={aiMode}
                        aiMessage={aiMessage}
                        aiChecklist={aiChecklist}
                        aiResponseType={aiResponseType}
                        onFollowUp={handleFollowUp}
                    />
                )}
            </div>

            <DialogModal
                lang={lang}
                isOpen={showDialog}
                onClose={() => setShowDialog(false)}
            />
        </div>
    );
}