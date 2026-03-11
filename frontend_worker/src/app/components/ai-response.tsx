import { useState, useEffect, useRef } from "react";
import { Lang, AI_RESPONSES } from "./language-pack";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Bot, BookOpen, Wrench, ChevronRight } from "lucide-react";

interface AiResponseProps {
    lang: Lang;
    errorCode: string;
    isActive: boolean;
    onFollowUp: (text: string) => void;
}

export function AiResponse({ lang, errorCode, isActive, onFollowUp }: AiResponseProps) {
    const [displayText, setDisplayText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const responseData = AI_RESPONSES[lang].default;

    useEffect(() => {
        if (!isActive) return;
        setDisplayText("");
        setIsStreaming(true);

        const fullText = responseData.diagnosis;
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
    }, [isActive, lang, errorCode, responseData.diagnosis]);

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
                        {renderParsedText(displayText)}
                        {isStreaming && (
                            <motion.span
                                className="inline-block w-1.5 h-10 !bg-[#E82127] ml-2 align-middle"
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            />
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

                    return (
                        <button
                            key={i}
                            className="!bg-[#27272A] hover:!bg-[#3F3F46] !border !border-zinc-700/50 !rounded-xl h-[120px] flex flex-col items-center justify-center gap-3 !text-gray-300 font-bold !shadow-xl transition-all active:scale-95"
                            onClick={() => onFollowUp(text)}
                            disabled={isStreaming}
                        >
                            <Icon size={36} className="!text-[#E82127]" />
                            <span className="text-xl lg:text-2xl tracking-tight">{text}</span>
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
                    onClick={() => onFollowUp("미해결 (X)")}
                    disabled={isStreaming}
                >
                    <XCircle size={100} className="!text-white" strokeWidth={1.5} />
                </button>
            </div>
        </motion.div>
    );
}