import { useEffect, useState } from "react";
import DeviceGrid from "../components/DeviceGrid";
import { API } from "../utils/api";

export default function Lines() {
  const lineOrder = { A: 1, B: 2, C: 3, D: 4 };

  const [selectedLine, setSelectedLine] = useState("A");
  const [devices, setDevices] = useState([]);
  const [lineModel, setLineModel] = useState({});

  // 🔥 model_id → manufacturer
  const modelMap = {
    1: "현대로보틱스",
    11: "Universal Robots",
  };

  useEffect(() => {
    fetch(API.lines)
      .then((res) => {
        if (!res.ok) throw new Error("API 실패");
        return res.json();
      })
      .then((data) => {
        const mapped = data.map((d) => ({
          deviceId: d.device_id,
          line: d.line_name,
          lineNum: d.line_num,
          manufacturer: d.manufacturer,
          errorCode: d.error_code,
          occurredAt: d.occurred_at,
          status: d.final_status,
        }));

        setDevices(mapped);
      })
      .catch((err) => console.error("API error:", err));
  }, []);

  // 🔥 그룹핑
  const linesGrouped = devices.reduce((acc, d) => {
    if (!acc[d.line]) acc[d.line] = [];
    acc[d.line].push(d);
    return acc;
  }, {});

  // 🔥 정렬
  Object.keys(linesGrouped).forEach((line) => {
    linesGrouped[line].sort((a, b) => a.lineNum - b.lineNum);
  });

  const handleLineSave = async (line) => {
  const modelId = lineModel[line];
  if (!modelId) return;

  if (!window.confirm("정말로 변경하시겠습니까?")) return;

  try {
    const res = await fetch(API.updateLineModel, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        line_name: line,
        model_id: modelId,
      }),
    });

    if (!res.ok) throw new Error("저장 실패");

    const data = await res.json();
    console.log("성공:", data);

    alert("저장 완료");

    // 🔥 새로고침 (추천)
    window.location.reload();

  } catch (err) {
    console.error(err);
    alert("저장 실패");
  }
};

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 라인 탭 */}
      <div className="flex gap-2">
        {Object.keys(lineOrder)
          .filter((line) => linesGrouped[line])
          .map((line) => (
            <button
              key={line}
              onClick={() => setSelectedLine(line)}
              className={`px-4 py-2 rounded-lg font-semibold border ${
                selectedLine === line
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              }`}
            >
              {line}라인
            </button>
          ))}
      </div>

      {/* 카드 */}
      {linesGrouped[selectedLine] && (
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-6">
          
          {/* 헤더 */}
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-2xl font-bold">
              {selectedLine}라인
            </h2>

            {/* 드롭다운 */}
            <div className="flex gap-2">
              <select
                value={lineModel[selectedLine] || ""}
                onChange={(e) =>
                  setLineModel({
                    ...lineModel,
                    [selectedLine]: e.target.value,
                  })
                }
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">선택</option>
                <option value="1">현대로보틱스</option>
                <option value="11">Universal Robots</option>
              </select>

              <button
                onClick={() => handleLineSave(selectedLine)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                저장
              </button>
            </div>
          </div>

          <DeviceGrid
            data={linesGrouped[selectedLine]}
            lineOverride={
              lineModel[selectedLine]
                ? modelMap[lineModel[selectedLine]]
                : null
            }
          />
        </div>
      )}
    </div>
  );
}