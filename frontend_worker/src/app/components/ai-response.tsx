import { useState, useEffect, useRef } from "react";
import { Lang, AI_RESPONSES } from "./language-pack";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Bot, BookOpen, Wrench, ChevronRight, Check } from "lucide-react";

interface AiResponseProps {
    lang: Lang;
    errorCode: string;
    isActive: boolean;
    mode: "diagnosis" | "history" | "related" | "followup" | "resolved";
    onFollowUp: (text: string) => void;
}

export function AiResponse({ lang, errorCode, isActive, mode, onFollowUp }: AiResponseProps) {
    const [displayText, setDisplayText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const responseData = AI_RESPONSES[lang].default;

    useEffect(() => {
        if (!isActive) return;
        setDisplayText("");
        setIsStreaming(true);

        let fullText = responseData.diagnosis;
        if (mode === "history") fullText = responseData.history;
        else if (mode === "related") fullText = responseData.related;
        else if (mode === "followup") fullText = responseData.followup;
        else if (mode === "resolved") fullText = responseData.resolved;

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
            }
        }, 12);
        return () => clearInterval(interval);
    }, [isActive, lang, errorCode, mode, responseData.diagnosis, responseData.history, responseData.related, responseData.followup, responseData.resolved]);

    const renderParsedText = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, index) => {
            if (line.startsWith("**") && line.endsWith("**")) {
                const cleanTitle = line.replace(/\*\*/g, "");
                return (
                    <div key={index} className="block text-4xl font-black !text-white mt-12 mb-6 first:mt-0 tracking-tighter">
                        {cleanTitle}
                    </div>
                );
            }
            return (
                <div key={index} className="text-2xl lg:text-3xl !text-zinc-300 leading-[1.8] mb-4 tracking-tight min-h-[1.5em]">
                    {line.replace(/\*\*/g, "")}
                </div>
            );
        });
    };
    
    const checklistData = [
        "Main PCB 발광 다이오드가 깜빡이나요?",
        "토치를 흔들었을 때 아크 세기가 변하나요?",
        "최근 가스 실린더를 교체하셨나요?",
        "케이블 연결 부위에 변색이나 탄 흔적이 있나요?",
        "냉각수 레벨이 정상 범위 내에 있나요?"
    ];

    const toggleOption = (option: string) => {
        if (selectedOptions.includes(option)) {
            setSelectedOptions(selectedOptions.filter(item => item !== option));
        } else {
            setSelectedOptions([...selectedOptions, option]);
        }
    };

    const handleChecklistSubmit = () => {
        if (selectedOptions.length === 0) return;
        const queryText = `[추가 정보 확인] 작업자가 확인한 항목: ${selectedOptions.join(", ")}`;
        onFollowUp(queryText);
        setShowChecklist(false);
        setSelectedOptions([]);
    };

    if (!isActive) return null;

    return (
        <motion.div
            className="flex flex-col h-[calc(100vh-120px)] w-full max-w- mx-auto p-10 lg:p-14 gap-12 !bg-black"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* 1. 메인 대화창: !rounded-none 유지, px-20으로 텍스트를 안쪽으로 밀어넣음 */}
            <div ref={scrollRef} className="flex-[1.5] !bg-[#18181B] !border !border-zinc-800/50 !rounded-none p-16 lg:p-24 overflow-y-auto !shadow-2xl relative custom-scrollbar">

                <div className="max-w-4xl mx-auto">

                    {/* 텍스트 내용: px-4 추가로 벽에서 더 띄움 */}
                    <div className="whitespace-pre-wrap px-4">
                        {!showChecklist ? (
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
                        ) : (
                            <div className="flex flex-col gap-6 py-4">
                                <h3 className="text-5xl font-black text-white mb-12 tracking-tighter uppercase italic">
                                    <span className="text-[#E82127]">CHECKLIST:</span> 추가 상황을 선택해 주세요
                                </h3>
                                <div className="grid grid-cols-1 gap-10">
                                    {checklistData.map((option, idx) => {
                                        const isSelected = selectedOptions.includes(option);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => toggleOption(option)}
                                                className={`flex items-center justify-between p-12 lg:p-16 border-4 transition-all active:scale-[0.98] text-left ${
                                                    isSelected 
                                                    ? "bg-[#E82127]/20 border-[#E82127] text-white" 
                                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                                }`}
                                            >
                                                <span className="text-3xl lg:text-4xl font-black leading-tight tracking-tighter">{option}</span>
                                                <div className={`w-14 h-14 flex items-center justify-center border-4 ${isSelected ? "bg-[#E82127] border-[#E82127]" : "border-zinc-600"}`}>
                                                    {isSelected && <Check size={40} className="text-white" strokeWidth={5} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={handleChecklistSubmit}
                                    disabled={selectedOptions.length === 0}
                                    className={`mt-16 h-40 flex items-center justify-center font-black text-5xl tracking-tighter italic transition-all border-8 ${
                                        selectedOptions.length > 0 
                                        ? "bg-white text-black border-white hover:bg-zinc-200" 
                                        : "bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed"
                                    }`}
                                >
                                    [ 선택 완료 및 추가 진단 요청 ]
                                </button>
                                
                                <button 
                                    onClick={() => setShowChecklist(false)}
                                    className="text-zinc-500 font-bold text-xl hover:text-white transition-colors"
                                >
                                    돌아가기
                                </button>
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
                            className={`!border !rounded-xl h-[120px] flex flex-col items-center justify-center gap-3 font-bold !shadow-xl transition-all active:scale-95 ${
                                isConfirming 
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
                            <Icon size={36} className={isConfirming ? "!text-white" : "!text-[#E82127]"} />
                            <span className="text-xl lg:text-2xl tracking-tight">
                                {isConfirming ? "호출하시겠습니까?" : text}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 3. 하단 O/X 대형 버튼: 간격(gap-12) 유지 및 그림자 강화 */}
            <div className={`grid grid-cols-2 gap-12 shrink-0 pb-6 transition-opacity duration-500 ${isStreaming ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <button
                    className="!bg-green-600 hover:!bg-green-500 !border !border-white/10 !rounded-2xl h-40 flex items-center justify-center !shadow-[0_20px_50px_rgba(22,163,74,0.3)] transition-all active:scale-95"
                    onClick={() => onFollowUp("해결 완료 (O)")}
                    disabled={isStreaming}
                >
                    <CheckCircle size={100} className="!text-white" strokeWidth={1.5} />
                </button>

                <button
                    className="!bg-red-600 hover:!bg-red-500 !border !border-white/10 !rounded-2xl h-40 flex items-center justify-center !shadow-[0_20px_50px_rgba(220,38,38,0.3)] transition-all active:scale-95"
                    onClick={() => {
                        setShowChecklist(true);
                        // onFollowUp("미해결 (X)") -> 기존 호출 대신 체크리스트만 보여줌
                    }}
                    disabled={isStreaming || showChecklist}
                >
                    <XCircle size={100} className="!text-white" strokeWidth={1.5} />
                </button>
            </div>
        </motion.div>
    );
}