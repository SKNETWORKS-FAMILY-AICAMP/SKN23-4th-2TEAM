// src/pages/Lines.jsx
import DeviceGrid from "../components/DeviceGrid";
import DeviceLogTable from "../components/DeviceLogTable";

const mockDevices = [
  { id: 1, name: "UR-10e", status: "error", currentError: "E101" },
  { id: 2, name: "HA006B", status: "ok", currentError: "" },
  { id: 3, name: "UR-10e", status: "ok", currentError: "" },
  { id: 4, name: "HA006B", status: "error", currentError: "E203" },
  { id: 5, name: "UR-10e", status: "ok", currentError: "" },
  { id: 6, name: "HA006B", status: "ok", currentError: "" },
  { id: 7, name: "UR-10e", status: "error", currentError: "E302" },
  { id: 8, name: "HA006B", status: "ok", currentError: "" },
];

const mockLogs = [
  { time: "10:32", device: "UR-10e", code: "E101", status: "error" },
  { time: "10:35", device: "HA006B", code: "E203", status: "error" },
  { time: "10:40", device: "UR-10e", code: "E302", status: "error" },
];

function Lines() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 4x4 장비 그리드 */}
      <DeviceGrid devices={mockDevices} />

      {/* 아래쪽 표 */}
      <DeviceLogTable logs={mockLogs} />
    </div>
  );
}

export default Lines;
