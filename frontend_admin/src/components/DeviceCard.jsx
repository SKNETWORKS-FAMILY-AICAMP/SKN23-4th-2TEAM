// DeviceCard.jsx
function DeviceCard({ device }) {
  const { device: deviceName, line, date, hour, errorCode } = device;

  // 시간 포맷
  const time = date && hour !== undefined ? `${date} ${hour}:00` : "-";
  const code = errorCode || "-";
  const status = errorCode ? "에러" : "정상";

  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-lg shadow border ${
        errorCode ? "bg-red-100 animate-pulse" : "bg-green-100"
      }`}
      style={{ minHeight: "180px" }}
    >
      {/* 장비명 크게 */}
      <span className="text-xl font-bold mb-2">{deviceName || "-"}</span>

      {/* 나머지 정보 */}
      <div className="flex flex-col gap-1 text-sm">
        <div><strong>시간:</strong> {time}</div>
        <div><strong>라인:</strong> {line || "-"}</div>
        <div><strong>에러 코드:</strong> {code}</div>
        <div><strong>상태:</strong> {status}</div>
      </div>
    </div>
  );
}

export default DeviceCard;