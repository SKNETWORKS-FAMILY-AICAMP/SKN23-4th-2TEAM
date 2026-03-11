import { useState, useCallback, useEffect } from "react";
import { Header } from "./components/header";
import { MainMenu } from "./components/main-menu";
import { Keypad } from "./components/keypad";
import { AiResponse } from "./components/ai-response";
import { AdminPanel } from "./components/admin-panel";
import { DialogModal } from "./components/dialog-modal";
import { DeviceSelection } from "./components/DeviceSelection";
import { Lang } from "./components/language-pack";
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
    const [errorCode, setErrorCode] = useState("");
    const [diagType, setDiagType] = useState<"robot" | "welder">("robot");
    const [showDialog, setShowDialog] = useState(false);
    const [aiActive, setAiActive] = useState(false);
    const [aiKey, setAiKey] = useState(0);

    // Engineer call notifications
    const [engineerCalls, setEngineerCalls] = useState<Array<{ code: string; timestamp: number; device: string }>>([]);

    // Load error history from localStorage
    const [errorHistory, setErrorHistory] = useState<ErrorHistory[]>(() => {
        const saved = localStorage.getItem("weldbot-history");
        return saved ? JSON.parse(saved) : [];
    });

    // Save language preference
    useEffect(() => {
        localStorage.setItem("weldbot-lang", lang);
    }, [lang]);

    // Save error history
    useEffect(() => {
        localStorage.setItem("weldbot-history", JSON.stringify(errorHistory));
    }, [errorHistory]);

    const handleDiagnostic = useCallback((type: "robot" | "welder") => {
        setDiagType(type);
        setView("device_select");
    }, []);

    const handleDeviceSelect = useCallback((line: string, robot: string) => {
        setSelectedDevice({ line, robot });
        setErrorCode("");
        setAiActive(false);
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
    }, []);

    const handleSubmit = useCallback(() => {
        if (errorCode) {
            const newEntry: ErrorHistory = {
                code: errorCode,
                timestamp: Date.now(),
                diagType,
            };
            setErrorHistory((prev) => [newEntry, ...prev.slice(0, 49)]);

            setAiActive(true);
            setAiKey((prev) => prev + 1);

            toast.success(
                lang === "KO" ? "진단을 시작합니다..." : "Starting diagnosis...",
                { duration: 2000 }
            );
        }
    }, [errorCode, diagType, lang]);

    const handleBackToMain = useCallback(() => {
        setView("main");
        setErrorCode("");
        setAiActive(false);
    }, []);

    const handleFollowUp = useCallback((text: string) => {
        if (text.includes("해결 완료") || text.includes("미해결")) {
            toast.success("피드백이 전송되었습니다.", { duration: 2000 });
            return;
        }

        if (text.includes("엔지니어 호출") || text.includes("Call Engineer")) {
            setEngineerCalls(prev => [{
                code: errorCode,
                timestamp: Date.now(),
                device: `${selectedDevice.line} - ${selectedDevice.robot}`
            }, ...prev]);
            toast.success(lang === "KO" ? "엔지니어 호출이 요청되었습니다." : "Engineer call requested.");
            return;
        }

        setAiKey((prev) => prev + 1);
        setAiActive(true);
    }, [errorCode, selectedDevice, lang]);

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

                <AiResponse
                    key={aiKey}
                    lang={lang}
                    errorCode={errorCode}
                    isActive={aiActive}
                    onFollowUp={handleFollowUp}
                />
            </div>

            <DialogModal
                lang={lang}
                isOpen={showDialog}
                onClose={() => setShowDialog(false)}
            />
        </div>
    );
}