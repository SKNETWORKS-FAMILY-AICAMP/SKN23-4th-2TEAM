// src/pages/Lines.jsx
import { mockdata } from "../mock/mockdata";
import DeviceGrid from "../components/DeviceGrid";

export default function Lines() {
  const lineOrder = { A: 1, B: 2, C: 3, D: 4 };

  const toTimestamp = (d) =>
    Date.parse(`${d.date}T${String(d.hour).padStart(2, "0")}:00:00`);

  const latestDevices = Object.values(
    mockdata.reduce((acc, d) => {
      const key = `${d.device}|${d.line}|${d.lineNum}`;
      const curr = acc[key];
      if (!curr || toTimestamp(d) > toTimestamp(curr)) acc[key] = d;
      return acc;
    }, {})
  );

  const linesGrouped = latestDevices.reduce((acc, d) => {
    if (!acc[d.line]) acc[d.line] = [];
    acc[d.line].push(d);
    return acc;
  }, {});

  Object.keys(linesGrouped).forEach((line) => {
    linesGrouped[line].sort((a, b) => a.lineNum - b.lineNum);
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 p-6 lg:p-10 overflow-auto ml-[0rem]">
      {/* 라인 영역 */}
      <div className="flex-1 flex flex-col gap-10 min-h-0 overflow-auto px-2 sm:px-4 lg:px-6 max-w-[1200px] mx-auto">
        {Object.keys(lineOrder)
          .filter((line) => linesGrouped[line])
          .map((line) => (
            <div
              key={line}
              className="bg-white rounded-2xl shadow-xl p-6 lg:p-10 w-full flex flex-col gap-6 min-h-[350px]"
            >
              {/* 라인 헤더 */}
              <h2 className="text-2xl lg:text-3xl font-bold mb-4 border-b pb-2">
                {line}라인
              </h2>

              {/* 카드 그리드 */}
              <DeviceGrid data={linesGrouped[line]} />
            </div>
          ))}
      </div>
    </div>
  );
}