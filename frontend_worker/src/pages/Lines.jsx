import { useState } from "react";
import DeviceGrid from "../components/DeviceGrid";
import DeviceLogTable from "../components/DeviceLogTable";

// 장비 데이터
const mockDevices = [
  { id: 1, line: "a", name: "UR-10e", status: "normal", currentError: "" },
  {
    id: 2,
    line: "b",
    name: "HA006B",
    status: "error",
    currentError: "E110: 과부하",
  },
  { id: 3, line: "a", name: "UR-5e", status: "normal", currentError: "" },
  {
    id: 4,
    line: "b",
    name: "HA007B",
    status: "error",
    currentError: "E203: 모터 이상",
  },
  { id: 5, line: "a", name: "UR-7e", status: "normal", currentError: "" },
  { id: 6, line: "b", name: "HA008B", status: "normal", currentError: "" },
];

// 로그 데이터
const mockLogs = [
  {
    time: "",
    line: "a",
    device: "UR-10e",
    code: "",
    status: "normal",
  },
  { time: "10:35", line: "b", device: "HA006B", code: "E110", status: "error" },
  { time: "", line: "a", device: "UR-5e", code: "", status: "normal" },
  { time: "10:45", line: "b", device: "HA007B", code: "E203", status: "error" },
];

function Lines() {
  const [tab, setTab] = useState("all");

  // 선택된 라인 기준으로 장비 필터
  const filteredDevices = mockDevices.filter((d) =>
    tab === "all" ? true : d.line === tab,
  );

  // 선택된 라인 기준으로 로그 필터
  const filteredLogs = mockLogs.filter((l) =>
    tab === "all" ? true : l.line === tab,
  );

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-6">
      {/* 탭 */}
      <div className="flex gap-4">
        {["all", "a", "b"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 rounded font-semibold ${
              tab === t
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {t === "all" ? "전체" : t === "a" ? "A라인" : "B라인"}
          </button>
        ))}
      </div>

      {/* 장비 그리드 */}
      <DeviceGrid devices={filteredDevices} />

      {/* 로그 테이블 */}
      <DeviceLogTable devices={filteredDevices} logs={filteredLogs} />
    </div>
  );
}

export default Lines;
