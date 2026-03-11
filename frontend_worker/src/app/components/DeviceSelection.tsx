import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, HardHat } from "lucide-react";

interface DeviceSelectionProps {
    onSelect: (line: string, robot: string) => void;
}

export function DeviceSelection({ onSelect }: DeviceSelectionProps) {
    const [step, setStep] = useState<"line" | "robot">("line");
    const [selectedLine, setSelectedLine] = useState("");

    const lines = ["Line A", "Line B", "Line C", "Line D"];
    const robots = ["Robot 1", "Robot 2", "Robot 3", "Robot 4"];

    const handleLineSelect = (line: string) => {
        setSelectedLine(line);
        setStep("robot");
    };

    const handleRobotSelect = (robot: string) => {
        onSelect(selectedLine, robot);
    };

    const buttonClass = "h-[100px] w-full rounded-2xl flex items-center justify-between px-10 text-[2.2rem] font-black transition-all select-none shadow-2xl";

    return (
        <div className="flex-1 flex flex-col p-6 max-w-[800px] mx-auto w-full">
            <div className="mb-12 flex items-center justify-center">
                <div className="flex items-center gap-4 text-gray-500">
                    <HardHat size={28} />
                    <span className="text-2xl font-black uppercase tracking-[0.4em]">STEP {step === "line" ? "1" : "2"} / 2</span>
                </div>
            </div>

            <h2 className="text-[3rem] font-black mb-12 text-white text-center">
                {step === "line" ? "대상 라인을 선택하세요" : `${selectedLine} - 로봇을 선택하세요`}
            </h2>

            <AnimatePresence mode="wait">
                {step === "line" ? (
                    <motion.div
                        key="line-selection"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 gap-4"
                    >
                        {lines.map((line) => (
                            <button
                                key={line}
                                onClick={() => handleLineSelect(line)}
                                className={`${buttonClass} bg-zinc-900 text-white active:bg-[#E82127] border-2 border-zinc-800 rounded-none`}
                                style={{ borderLeft: "20px solid #E82127" }}
                            >
                                <span>{line}</span>
                                <ChevronRight size={32} style={{ color: "#007AFF" }} />
                            </button>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="robot-selection"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 gap-4"
                    >
                        {robots.map((robot) => (
                            <button
                                key={robot}
                                onClick={() => handleRobotSelect(robot)}
                                className={`${buttonClass} bg-zinc-900 text-white active:bg-[#E82127] border-2 border-zinc-800 rounded-none`}
                                style={{ borderLeft: "20px solid #E82127" }}
                            >
                                <span>{robot}</span>
                                <ChevronRight size={32} style={{ color: "#007AFF" }} />
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
