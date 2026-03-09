import { useState, useEffect, useRef } from "react";
import { Lang, AI_RESPONSES } from "./language-pack";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";

interface AiResponseProps {
    lang: Lang;
    errorCode: string;
    isActive: boolean;
    onFollowUp: (text: string) => void;
}

export function AiResponse({ lang, errorCode, isActive, onFollowUp }: AiResponseProps) {
    const [displayText, setDisplayText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [showFollowUps, setShowFollowUps] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const responseData = AI_RESPONSES[lang].default;

    useEffect(() => {
        if (!isActive) return;

        setDisplayText("");
        setIsStreaming(true);
        setShowFollowUps(false);

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
                setTimeout(() => setShowFollowUps(true), 300);
            }
        }, 15); // Slightly faster streaming

        return () => clearInterval(interval);
    }, [isActive, lang, errorCode, responseData.diagnosis]);

    if (!isActive) return null;

    return (
        <motion.div
            className="max-w-[800px] mx-auto px-6 py-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* AI Chat Bubble */}
            <div className="bg-[#0d1b2a] rounded-2xl border-2 border-[#16213e] overflow-hidden shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#16213e] to-[#1a3a5c] border-b border-[#1a3a5c]">
                    <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                        <div className="w-3 h-3 rounded-full bg-[#00ff88] absolute top-0 left-0 animate-ping" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-[#00d4ff]" size={20} />
                        <span className="text-[#00d4ff] text-[1.1rem] font-bold" style={{ fontFamily: "monospace" }}>
                            WELD-BOT AI v4.5
                        </span>
                    </div>
                    {isStreaming && (
                        <div className="ml-auto flex items-center gap-2">
                            <Loader2 className="text-[#00d4ff] animate-spin" size={20} />
                            <span className="text-[#888] text-[0.9rem]">분석중...</span>
                        </div>
                    )}
                </div>

                <div
                    ref={scrollRef}
                    className="px-5 py-4 max-h-[350px] overflow-y-auto custom-scrollbar"
                    style={{ scrollBehavior: "smooth" }}
                >
                    <div
                        className="text-[1.15rem] text-[#d0d0d0] whitespace-pre-wrap"
                        style={{ fontFamily: "monospace", lineHeight: "1.7" }}
                    >
                        {displayText}
                        {isStreaming && (
                            <motion.span
                                className="inline-block w-2 h-5 bg-[#00d4ff] ml-1"
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Follow-up buttons */}
            <AnimatePresence>
                {showFollowUps && (
                    <motion.div
                        className="grid grid-cols-3 gap-3 mt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {responseData.followUps.map((text, i) => (
                            <motion.button
                                key={i}
                                className="py-5 px-3 rounded-xl bg-[#16213e] border-2 border-[#00d4ff33] text-[#00d4ff] text-[1rem] font-bold cursor-pointer select-none"
                                onClick={() => onFollowUp(text)}
                                whileHover={{ scale: 1.02, borderColor: "#00d4ff", backgroundColor: "#1a3a5c" }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                {text}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}