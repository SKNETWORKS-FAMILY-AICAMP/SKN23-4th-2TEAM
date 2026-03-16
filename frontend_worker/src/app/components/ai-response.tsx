import { useState, useEffect, useRef } from "react";
import { Lang, AI_RESPONSES } from "./language-pack";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Bot, BookOpen, Wrench, ChevronRight, Loader2, AlertTriangle, Check } from "lucide-react";
import { SAFETY_TIPS_KO, SAFETY_TIPS_EN } from "../../lib/safetyTips";

interface AiResponseProps {
    lang: Lang;
    errorCode: string;
    isActive: boolean;
    mode: "diagnosis" | "history" | "related" | "followup" | "resolved";
    aiMessage?: string;
    aiChecklist?: string[] | null;
    aiResponseType?: "overall" | "checklist" | "diagnosis" | "related" | "history" | null;
    onFollowUp: (text: string, isChecklistSubmit?: boolean, selectedItems?: string[]) => void;
    isDiagnosing?: boolean;
}

export function AiResponse({ lang, errorCode, isActive, mode, aiMessage, aiChecklist, aiResponseType, onFollowUp, isDiagnosing }: AiResponseProps) {
    const [displayText, setDisplayText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const responseData = AI_RESPONSES[lang].default;
    const tips = lang === "KO" ? SAFETY_TIPS_KO : SAFETY_TIPS_EN;

    useEffect(() => {
        if (!isDiagnosing) return;
        setCurrentTipIndex(Math.floor(Math.random() * tips.length));

        const interval = setInterval(() => {
            setCurrentTipIndex(prev => {
                let next = Math.floor(Math.random() * tips.length);
                while (next === prev && tips.length > 1) {
                    next = Math.floor(Math.random() * tips.length);
                }
                return next;
            });
        }, 4500);

        return () => clearInterval(interval);
    }, [isDiagnosing, tips]);

    useEffect(() => {
        if (!isActive) return;
        setDisplayText("");
        setIsStreaming(true);
        setShowChecklist(false);
        setSelectedOptions([]);

        // Use custom message if provided, otherwise fallback to static dictionary
        let fullText = aiMessage || "";
        if (!fullText) {
            if (mode === "diagnosis") fullText = responseData.diagnosis;
            else if (mode === "history") fullText = responseData.history;
            else if (mode === "related") fullText = responseData.related;
            else if (mode === "followup") fullText = responseData.followup;
            else if (mode === "resolved") fullText = responseData.resolved;
        }

        let index = 0;
        const interval = setInterval(() => {
            if (index < fullText.length) {
                setDisplayText(fullText.slice(0, index + 1));
                index++;
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            } else {
                clearInterval(interval);
                setIsStreaming(false);
                // Only automatically show checklist if backend provided it
                if (aiResponseType === "checklist" && aiChecklist && aiChecklist.length > 0) {
                    setShowChecklist(true);
                }
            }
        }, 12);
        return () => clearInterval(interval);
    }, [isActive, lang, errorCode, mode, aiMessage, aiChecklist, aiResponseType, responseData]);

    const renderParsedText = (text: string) => {
        // 1. Diagnosis Template Parser
        const findIndex = (labels: string[]) => {
            const lowerText = text.toLowerCase();
            for (const l of labels) {
                const idx = lowerText.indexOf(l.toLowerCase());
                if (idx !== -1) return { index: idx, length: l.length };
            }
            return { index: -1, length: 0 };
        };

        const causeRes = findIndex(["원인 분석", "원인:", "원인 :", "Cause Analysis", "Cause:", "Sabab tahlili", "Sabab:", "Sabab"]);
        const actionRes = findIndex(["조치 방법", "조치:", "조치 :", "Action Steps", "Action:", "Harakatlar", "Harakat:", "Harakat"]);
        const urgencyRes = findIndex(["긴급도", "긴급성", "Urgency", "Shoshilinchlik", "Shoshilinch"]);

        const causeIdx = causeRes.index;
        const actionIdx = actionRes.index;
        const urgencyIdx = urgencyRes.index;

        if (causeIdx !== -1 && actionIdx !== -1 && urgencyIdx !== -1) {
            const header = text.substring(0, causeIdx).trim();
            const cause = text.substring(causeIdx + causeRes.length, actionIdx).trim().replace(/^:\s*/, "").replace(/^:*/, "").trim();
            const action = text.substring(actionIdx + actionRes.length, urgencyIdx).trim().replace(/^:\s*/, "").replace(/^:*/, "").trim();

            const urgencyEnd = text.indexOf("\n", urgencyIdx + urgencyRes.length + 2);
            const urgency = (urgencyEnd !== -1
                ? text.substring(urgencyIdx + urgencyRes.length, urgencyEnd).trim()
                : text.substring(urgencyIdx + urgencyRes.length).trim()
            ).replace(/^:\s*/, "").replace(/^:*/, "").trim();

            const footer = urgencyEnd !== -1 ? text.substring(urgencyEnd).trim() : "";

            return (
                <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", padding: "20px 0" }}>
                    {header && (
                        <div style={{ fontSize: "42px", fontWeight: "900", textAlign: "center", color: "#ffffff", marginBottom: "16px", letterSpacing: "-1px" }}>
                            {header.replace(/\*\*/g, "")}
                        </div>
                    )}

                    {/* 원인 Card */}
                    <div style={{ backgroundColor: "rgba(39, 39, 42, 0.4)", padding: "32px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                        <span style={{ fontSize: "20px", fontWeight: "900", color: "#f59e0b", letterSpacing: "1px" }}>
                            {lang === "KO" ? "원인 (CAUSE)" : lang === "EN" ? "CAUSE" : "SABAB"}
                        </span>
                        <span style={{ fontSize: "30px", fontWeight: "900", color: "#f4f4f5", lineHeight: "1.3", letterSpacing: "-0.5px" }}>{cause}</span>
                    </div>

                    {/* 조치 Card */}
                    <div style={{ backgroundColor: "rgba(39, 39, 42, 0.4)", padding: "32px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                        <span style={{ fontSize: "20px", fontWeight: "900", color: "#10b981", letterSpacing: "1px" }}>
                            {lang === "KO" ? "조치 (ACTION)" : lang === "EN" ? "ACTION" : "HARAKATLAR"}
                        </span>
                        <span style={{ fontSize: "30px", fontWeight: "900", color: "#f4f4f5", lineHeight: "1.3", letterSpacing: "-0.5px" }}>{action}</span>
                    </div>

                    {/* 긴급도 Card */}
                    <div style={{ backgroundColor: "rgba(39, 39, 42, 0.4)", padding: "32px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                        <span style={{ fontSize: "20px", fontWeight: "900", color: "#3b82f6", letterSpacing: "1px" }}>
                            {lang === "KO" ? "긴급도 (URGENCY)" : lang === "EN" ? "URGENCY" : "SHOSHILINCHLIK"}
                        </span>
                        <span style={{ fontSize: "30px", fontWeight: "900", color: "#f4f4f5", lineHeight: "1.3", letterSpacing: "-0.5px" }}>{urgency}</span>
                    </div>

                    {footer && (
                        <div style={{ fontSize: "32px", fontWeight: "bold", textAlign: "center", color: "#a1a1aa", marginTop: "24px", lineHeight: "1.5" }}>
                            {footer.replace(/\*\*/g, "")}
                        </div>
                    )}
                </div>
            );
        }

        // 2. General Fallback with Line Split
        const lines = text.split("\n");
        return (
            <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                {lines.map((line, index) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={index} style={{ height: "16px" }} />;

                    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                        const cleanTitle = trimmed.replace(/\*\*/g, "");
                        return (
                            <div key={index} style={{ fontSize: "42px", fontWeight: "900", color: "#ffffff", textAlign: "center", marginTop: "32px", marginBottom: "16px" }}>
                                {cleanTitle}
                            </div>
                        );
                    }

                    return (
                        <div key={index} style={{ fontSize: "36px", fontWeight: "900", color: "#d4d4d8", textAlign: "center", lineHeight: "1.6", letterSpacing: "-0.5px" }}>
                            {trimmed.replace(/\*\*/g, "")}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isActive) return null;

    return (
        <motion.div
            className="flex flex-col h-[calc(100vh-120px)] w-full max-w-full mx-auto p-10 lg:p-14 gap-12 !bg-black"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* 1. 메인 대화창: !rounded-none 유지, px-20으로 텍스트를 안쪽으로 밀어넣음 */}
            <div ref={scrollRef} className="flex-[1.5] !bg-[#18181B] !border !border-zinc-800/50 !rounded-none p-16 lg:p-20 overflow-y-auto !shadow-2xl relative custom-scrollbar">

                <div className="max-w-2xl mx-auto px-12">

                    {/* 텍스트 내용: px-4 추가로 벽에서 더 띄움 */}
                    <div className="whitespace-pre-wrap px-4">
                        {!showChecklist ? (
                            isDiagnosing ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        className="text-[#E82127]"
                                    >
                                        <Loader2 size={64} className="animate-pulse" />
                                    </motion.div>

                                    <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">
                                        <span className="text-[#E82127]">ANALYZING:</span> {lang === "KO" ? "진단 분석 중..." : "Analyzing Diagnosis..."}
                                    </h3>

                                    <p className="text-zinc-400 text-xl tracking-tight mb-8">
                                        {lang === "KO" ? "관련 매뉴얼 및 에러 이력을 가동 중입니다." : "Searching related manuals and error histories."}
                                    </p>

                                    <motion.div
                                        key={currentTipIndex}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.3 }}
                                        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 p-8 rounded-none flex items-start gap-4 text-left shadow-2xl relative"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#E82127]" />
                                        <AlertTriangle size={36} className="text-amber-500 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-xs font-black text-amber-500 tracking-widest uppercase mb-1">
                                                {lang === "KO" ? "안전 가이드 (TIPS)" : "SAFETY TIPS"}
                                            </div>
                                            <p className="text-2xl text-zinc-100 font-bold leading-snug tracking-tight">
                                                {tips[currentTipIndex]}
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                <>
                                    {renderParsedText(displayText)}
                                    {isStreaming && (
                                        <motion.span
                                            className="inline-block w-1.5 h-10 !bg-[#E82127] ml-2 align-middle"
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        />
                                    )}
                                </>
                            )
                        ) : (
                            <div className="flex flex-col gap-6 py-4">
                                <h3 className="text-5xl font-black text-white mb-12 tracking-tighter uppercase italic">
                                    <span className="text-[#E82127]">CHECKLIST:</span> {(!aiChecklist || aiChecklist.length === 0) ? (lang === "KO" ? "상세 점검 불가" : "Inspection Unavailable") : (lang === "KO" ? "추가 상황을 선택해 주세요" : "Select Additional Status")}
                                </h3>

                                <div className="grid grid-cols-1 gap-12">
                                    {(!aiChecklist || aiChecklist.length === 0) ? (
                                        <div className="text-3xl font-bold text-zinc-500 text-center py-20 border-4 border-dashed border-zinc-800 bg-zinc-900/40">
                                            {lang === "KO" 
                                                ? "⚠️ 매뉴얼 정보가 부재하여 상세 점검표를 구성할 수 없습니다." 
                                                : "⚠️ No detailed checklist available for this error code."}
                                        </div>
                                    ) : (
                                        (aiChecklist || []).map((item: any, idx: number) => {
                                            const isSelected = selectedOptions.includes(`${idx}`);
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedOptions(selectedOptions.filter(o => o !== `${idx}`));
                                                        } else {
                                                            setSelectedOptions([...selectedOptions, `${idx}`]);
                                                        }
                                                    }}
                                                    className={`flex items-center justify-between p-6 lg:p-8 border-4 transition-all active:scale-[0.98] text-left min-h-[90px] focus:!outline-none focus:!shadow-none ${isSelected
                                                        ? "bg-[#E82127]/20 border-[#E82127] text-white"
                                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                                        }`}
                                                >
                                                    <span className="text-3xl lg:text-4xl font-black leading-tight tracking-tighter" style={{ color: "white" }}>
                                                        {item.item || item}
                                                    </span>
                                                    <div className={`w-6 h-6 flex items-center justify-center border-4 ${isSelected ? "bg-[#E82127] border-[#E82127]" : "border-zinc-600"}`}>
                                                        {isSelected && <Check size={32} className="text-white" strokeWidth={5} style={{ stroke: "white" }} />}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. 중간 서브 버튼: !border와 shadow-xl로 각 버튼을 독립적으로 분리 */}
            <div className={`grid grid-cols-3 gap-10 shrink-0 transition-opacity duration-500 ${isStreaming ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                {responseData.followUps.map((text, i) => {
                    let Icon = ChevronRight;
                    if (text.includes("에러") || text.includes("Error")) Icon = Bot;
                    if (text.includes("이력") || text.includes("Log")) Icon = BookOpen;
                    if (text.includes("엔지니어") || text.includes("Engineer")) Icon = Wrench;

                    const isEngineerCall = text.includes("엔지니어") || text.includes("Engineer");
                    const isConfirming = confirmingIdx === i;

                    return (
                        <button
                            key={i}
                            className={`!border !rounded-xl h-[120px] flex flex-col items-center justify-center gap-3 font-bold !shadow-xl transition-all active:scale-95 ${isConfirming
                                ? "!bg-[#E82127] !text-white !border-white animate-pulse"
                                : "!bg-[#27272A] hover:!bg-[#3F3F46] !border-zinc-700/50 !text-gray-300"
                                }`}
                            onClick={() => {
                                if (isEngineerCall && !isConfirming) {
                                    setConfirmingIdx(i);
                                    // 3초 후 자동 리셋
                                    setTimeout(() => setConfirmingIdx(null), 3000);
                                    return;
                                }
                                onFollowUp(text);
                                setConfirmingIdx(null);
                            }}
                            disabled={isStreaming}
                        >
                            <Icon size={36} className={isConfirming ? "!text-white" : "!text-[#E82127]"} style={{ color: isConfirming ? "white" : "#E82127" }} />
                            <span className="text-[#d1d5db]" style={{ fontSize: "26px", letterSpacing: "-0.5px", fontWeight: "800", color: isConfirming ? "white" : "#d1d5db" }}>
                                {isConfirming ? "호출하시겠습니까?" : text}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 3. 하단 O/X 대형 버튼 */}
            <div className={`grid grid-cols-2 gap-12 shrink-0 pb-6 transition-opacity duration-500 ${isStreaming ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <button
                    className="!bg-green-600 hover:!bg-green-500 !border !border-white/10 !rounded-3xl h-48 flex flex-col items-center justify-center gap-3 !shadow-[0_20px_60px_rgba(22,163,74,0.3)] transition-all active:scale-95 focus:!outline-none focus:!shadow-none"
                    onClick={() => {
                        if (showChecklist) {
                            setShowChecklist(false);
                            setSelectedOptions([]);
                        } else {
                            onFollowUp("해결 완료 (O)");
                        }
                    }}
                    disabled={isStreaming}
                >
                    <CheckCircle size={80} className="!text-white" style={{ color: "white", stroke: "white" }} strokeWidth={2} />
                    <span className="text-2xl font-black text-white" style={{ color: "white" }}>
                        {showChecklist ? "돌아가기" : (lang === "KO" ? "조치 완료 (상담 종료)" : "Resolved (Finish)")}
                    </span>
                </button>

                <button
                    className="!bg-red-600 hover:!bg-red-500 !border !border-white/10 !rounded-3xl h-48 flex flex-col items-center justify-center gap-3 !shadow-[0_20px_60px_rgba(220,38,38,0.3)] transition-all active:scale-95 focus:!outline-none focus:!shadow-none"
                    onClick={() => {
                        if (showChecklist) {
                            const results = (aiChecklist || []).map((item: any, idx: number) => {
                                return {
                                    question: item.item || item,
                                    is_ok: selectedOptions.includes(`${idx}`)
                                };
                            });
                            onFollowUp("체크리스트 점검 완료", true, results as any);
                            setShowChecklist(false);
                            setSelectedOptions([]);
                        } else {
                            setShowChecklist(true);
                        }
                    }}
                    disabled={isStreaming}
                >
                    {!showChecklist && <XCircle size={80} className="!text-white" style={{ color: "white", stroke: "white" }} strokeWidth={2} />}
                    <span className={`font-black text-white text-center ${showChecklist ? "text-[30px] px-4 leading-tight" : "text-2xl"}`} style={{ color: "white" }}>
                        {showChecklist ? "점검 결과 및 최종 판단 요청" : (lang === "KO" ? "미해결 (상세 점검)" : "Unresolved (Checklist)")}
                    </span>
                </button>
            </div>
        </motion.div>
    );
}