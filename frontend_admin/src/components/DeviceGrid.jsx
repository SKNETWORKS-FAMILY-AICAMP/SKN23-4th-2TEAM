// DeviceGrid.jsx
import DeviceCard from "./DeviceCard";

function DeviceGrid({ data = [] }) {
  // 라인 이름 → 열 번호 매핑
  const colMap = {
    "A-1": 1,
    "A-2": 2,
    "B-1": 3,
    "B-2": 4,
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      {data.map((device, i) => {
        const colStart = colMap[device.line] || 1; // 매핑 없는 라인은 1열
        return (
          <div key={device.device + i} className={`col-start-${colStart}`}>
            <DeviceCard device={device} />
          </div>
        );
      })}
    </div>
  );
}

export default DeviceGrid;