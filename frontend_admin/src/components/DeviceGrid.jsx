// src/components/DeviceGrid.jsx
import DeviceCard from "./DeviceCard";

export default function DeviceGrid({ data = [] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {data.map((device, i) => (
        <DeviceCard key={device.device + i} device={device} />
      ))}
    </div>
  );
}