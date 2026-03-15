// src/components/DeviceGrid.jsx
import DeviceCard from "./DeviceCard";

export default function DeviceGrid({ data = [] }) {
  return (
    <div className="grid gap-4 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((device, i) => (
        <DeviceCard key={device.device + i} device={device} />
      ))}
    </div>
  );
}
