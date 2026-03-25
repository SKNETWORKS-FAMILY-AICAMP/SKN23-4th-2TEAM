import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, HardHat, Loader2 } from "lucide-react";
import { api, Device } from "../../lib/api";

interface DeviceSelectionProps {
    lang: "KO" | "EN" | "UZ";
    onSelect: (line: string, robot: string, deviceId: string) => void;
}

export function DeviceSelection({ lang, onSelect }: DeviceSelectionProps) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<"line" | "robot">("line");
    const [selectedLine, setSelectedLine] = useState("");

    useEffect(() => {
        api.listDevices()
            .then(data => {
                setDevices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch devices:", err);
                setLoading(false);
                // Fallback dummy data if API fails
                setDevices([
                    { device_id: "ROBOT_A1", line_name: "Line A", line_num: 1 },
                    { device_id: "ROBOT_A2", line_name: "Line A", line_num: 2 },
                    { device_id: "ROBOT_B1", line_name: "Line B", line_num: 1 }
                ]);
            });
    }, []);

    const formatLineDisplay = (lineName: string) => {
        // "Line A" -> "A라인", "A Line", or "A qatori" (example for UZ)
        const char = lineName.replace("Line ", "").trim();
        if (lang === "KO") {
            return `${char}라인`;
        }
        if (lang === "UZ") {
            return `${char} Line`;
        }
        return `${char} Line`;
    };

    const lines = Array.from(new Set(devices.map(d => d.line_name))).sort();
    const filteredRobots = devices.filter(d => d.line_name === selectedLine);

    const handleLineSelect = (line: string) => {
        setSelectedLine(line);
        setStep("robot");
    };

    const handleRobotSelect = (device: Device) => {
        onSelect(device.line_name, `Robot ${device.line_num}`, device.device_id);
    };

    const buttonClass = "h-[100px] w-full rounded-2xl flex items-center justify-between px-10 text-[2.2rem] font-black transition-all select-none shadow-2xl";

    return (
        <div className="flex-1 flex flex-col p-6 max-w-[800px] mx-auto w-full">
            <div className="mb-12 flex items-center justify-center">
                <div className="flex items-center gap-4 text-gray-500">
                    <HardHat size={28} />
                    <span className="text-2xl font-black uppercase tracking-[0.4em]">
                        STEP {step === "line" ? "1" : "2"} / 2
                    </span>
                </div>
            </div>

            <h2 className="text-[3rem] font-black mb-12 text-white text-center">
                {step === "line" 
                    ? (lang === "KO" ? "대상 라인을 선택하세요" : lang === "UZ" ? "Liniyani tanlang" : "Select Target Line") 
                    : `${formatLineDisplay(selectedLine)} - ${lang === "KO" ? "로봇을 선택하세요" : lang === "UZ" ? "Robotni tanlang" : "Select Robot"}`}
            </h2>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={48} />
                </div>
            ) : (
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
                                    style={{ borderLeft: "20px solid #E82127", color: "#ffffff" }}
                                >
                                    <span>{formatLineDisplay(line)}</span>
                                    <ChevronRight size={32} style={{ color: "#ffffff" }} />
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
                            {filteredRobots.map((device) => (
                                <button
                                    key={device.device_id}
                                    onClick={() => handleRobotSelect(device)}
                                    className={`${buttonClass} bg-zinc-900 text-white active:bg-[#E82127] border-2 border-zinc-800 rounded-none`}
                                    style={{ borderLeft: "20px solid #E82127", color: "#ffffff" }}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="leading-tight">{device.device_id}</span>
                                    </div>
                                    <ChevronRight size={32} style={{ color: "#ffffff" }} />
                                </button>
                            ))}
                            <button
                                onClick={() => setStep("line")}
                                className="mt-8 text-xl font-bold hover:text-white transition-colors"
                                style={{ color: "#a1a1aa" }}
                            >
                                {lang === "KO" ? "← 라인 다시 선택하기" : lang === "UZ" ? "← Liniyani qayta tanlash" : "← Reselect Line"}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
