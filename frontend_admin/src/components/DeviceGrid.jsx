import DeviceCard from "./DeviceCard";

function DeviceGrid({ devices = [] }) {
  const maxPerRow = 4;

  // devices가 항상 배열이 되도록 기본값 설정
  const safeDevices = Array.isArray(devices) ? devices : [];

  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${maxPerRow}, 1fr)` }}
    >
      {safeDevices.slice(0, 16).map((device, i) => (
        <DeviceCard key={device.id || i} device={device} />
      ))}
    </div>
  );
}

export default DeviceGrid;
