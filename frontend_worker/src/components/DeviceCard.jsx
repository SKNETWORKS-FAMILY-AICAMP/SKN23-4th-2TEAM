function DeviceCard({ device }) {
  return (
    <div
      className={`flex flex-col justify-between p-6 rounded-lg shadow border ${
        device.status === "normal" ? "bg-green-100" : "bg-red-100 animate-pulse"
      }`}
      style={{ height: "180px" }} // 큼직하게
    >
      <span className="text-xl font-bold">{device.name}</span>
      {device.currentError && (
        <p className="text-red-700 font-semibold mt-2">{device.currentError}</p>
      )}
    </div>
  );
}

export default DeviceCard;
