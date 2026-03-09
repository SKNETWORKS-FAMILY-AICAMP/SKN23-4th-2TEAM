import { useState, useCallback, useEffect } from "react";
import { Header } from "./components/header";
import { ErrorDisplay } from "./components/error-display";
import { MainMenu } from "./components/main-menu";
import { Keypad } from "./components/keypad";
import { AiResponse } from "./components/ai-response";
import { AdminPanel } from "./components/admin-panel";
import { DialogModal } from "./components/dialog-modal";
import { TechDictionary } from "./components/tech-dictionary";
import { ConsumablesManager } from "./components/consumables-manager";
import { Lang } from "./components/language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

type AppView = "main" | "keypad" | "admin" | "techdict" | "consumables";

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
    const [errorCode, setErrorCode] = useState("");
    const [diagType, setDiagType] = useState<"robot" | "welder">("robot");
    const [showDialog, setShowDialog] = useState(false);
    const [aiActive, setAiActive] = useState(false);
    const [aiKey, setAiKey] = useState(0);

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
        setErrorCode("");
        setAiActive(false);
        setView("keypad");
    }, []);

    const handleKeyInput = useCallback((char: string) => {
        setErrorCode((prev) => {
            if (prev.length >= 12) {
                // Haptic-like feedback via toast
                toast.error(lang === "KO" ? "최대 12자까지 입력 가능합니다" : lang === "EN" ? "Max 12 characters" : "Maksimal 12 ta belgi", {
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
            // Add to history
            const newEntry: ErrorHistory = {
                code: errorCode,
                timestamp: Date.now(),
                diagType,
            };
            setErrorHistory((prev) => [newEntry, ...prev.slice(0, 49)]); // Keep last 50

            setAiActive(true);
            setAiKey((prev) => prev + 1);

            // Show success toast
            toast.success(
                lang === "KO" ? "진단을 시작합니다..." : lang === "EN" ? "Starting diagnosis..." : "Diagnostika boshlanmoqda...",
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
        // Handle different follow-up actions
        if (text.includes("관련 에러") || text.includes("Related") || text.includes("Tegishli")) {
            toast.info(
                lang === "KO" ? "유사한 에러코드를 검색 중..." : lang === "EN" ? "Searching similar errors..." : "O'xshash xatolar izlanmoqda...",
                { duration: 2000 }
            );
        } else if (text.includes("정비 이력") || text.includes("Maintenance") || text.includes("Ta'mirlash")) {
            toast.info(
                lang === "KO" ? "정비 이력을 불러오는 중..." : lang === "EN" ? "Loading maintenance log..." : "Ta'mirlash tarixini yuklash...",
                { duration: 2000 }
            );
        } else if (text.includes("엔지니어") || text.includes("Engineer") || text.includes("Muhandis")) {
            toast.success(
                lang === "KO" ? "엔지니어에게 알림을 전송했습니다" : lang === "EN" ? "Notification sent to engineer" : "Muhandisga xabar yuborildi",
                { duration: 3000 }
            );
            return; // Don't trigger new AI response for engineer call
        }

        setAiKey((prev) => prev + 1);
        setAiActive(true);
    }, [lang]);

    const handleOpenTechDict = useCallback(() => {
        setView("techdict");
    }, []);

    const handleOpenConsumables = useCallback(() => {
        setView("consumables");
    }, []);

    // Admin mode
    if (view === "admin") {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen bg-[#0a0a0f]"
            >
                <AdminPanel lang={lang} onBack={() => setView("main")} errorHistory={errorHistory} />
            </motion.div>
        );
    }

    // Tech Dictionary
    if (view === "techdict") {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="min-h-screen bg-[#0a0a0f]"
            >
                <TechDictionary lang={lang} onBack={handleBackToMain} />
            </motion.div>
        );
    }

    // Consumables Manager
    if (view === "consumables") {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="min-h-screen bg-[#0a0a0f]"
            >
                <ConsumablesManager lang={lang} onBack={handleBackToMain} />
            </motion.div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Toast notifications */}
            <Toaster position="top-center" richColors theme="dark" />

            {/* Header */}
            <Header
                lang={lang}
                onLangChange={setLang}
                onAdminActivate={() => setView("admin")}
            />

            {/* Error Code Display */}
            <ErrorDisplay errorCode={errorCode} lang={lang} />

            {/* Main Content Area with animations */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    {view === "main" && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MainMenu
                                lang={lang}
                                onDiagnostic={handleDiagnostic}
                                onOpenTechDict={handleOpenTechDict}
                                onOpenConsumables={handleOpenConsumables}
                            />
                        </motion.div>
                    )}

                    {view === "keypad" && !aiActive && (
                        <motion.div
                            key="keypad"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Keypad
                                lang={lang}
                                errorCode={errorCode}
                                onInput={handleKeyInput}
                                onClear={handleClear}
                                onSubmit={handleSubmit}
                                onBack={handleBackToMain}
                                diagType={diagType}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Response */}
                <AiResponse
                    key={aiKey}
                    lang={lang}
                    errorCode={errorCode}
                    isActive={aiActive}
                    onFollowUp={handleFollowUp}
                />
            </div>

            {/* Dialog */}
            <DialogModal
                lang={lang}
                isOpen={showDialog}
                onClose={() => setShowDialog(false)}
            />
        </div>
    );
}