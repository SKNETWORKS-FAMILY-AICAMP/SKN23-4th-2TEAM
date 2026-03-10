// Lines.jsx
import { useState } from "react";
import { mockdata } from "../mock/mockdata";
import DeviceGrid from "../components/DeviceGrid";

export default function Lines() {
  const [tab, setTab] = useState("all");

  // 선택된 라인 기준으로 장비 필터
  const filteredDevices = mockdata.filter((d) =>
    tab === "all" ? true : d.line.toLowerCase() === tab
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
            {t === "all" ? "전체" : t.toUpperCase() + "라인"}
          </button>
        ))}
      </div>

      {/* 장비 그리드 */}
      <DeviceGrid data={filteredDevices} />
    </div>
  );
}