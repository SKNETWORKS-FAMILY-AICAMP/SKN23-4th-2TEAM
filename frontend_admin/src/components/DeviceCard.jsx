import HH7 from "../assets/HH7.png";
import UR3 from "../assets/UR3.webp";

export default function DeviceCard({ device, lineOverride }) {
  const {
    deviceId,
    line,
    lineNum,
    occurredAt,
    errorCode,
    status,
    manufacturer,
  } = device;

  // 🔥 override 적용
  const displayManufacturer = lineOverride || manufacturer;

  // 🔥 manufacturer → model_name
  const modelNameMap = {
    "현대로보틱스": "HH7",
    "Universal Robots": "UR3",
  };

  const displayModelName = modelNameMap[displayManufacturer] || "-";

  // 🔥 이미지 매핑
  const imageMap = {
    "현대로보틱스": HH7,
    "Universal Robots": UR3,
  };

  const displayImage = imageMap[displayManufacturer] || HH7;

  // 상태
  const isError = status === "error";
  const isProcessing = status === "processing";

  const getStatusText = () => {
    if (isError) return "에러";
    if (isProcessing) return "처리중";
    return "정상";
  };

  const getBgColor = () => {
    if (isError) return "bg-red-100";
    if (isProcessing) return "bg-yellow-100";
    return "bg-green-100";
  };

  return (
    <div
      className={`flex flex-col p-4 rounded-lg shadow border w-full min-h-[420px]
      ${getBgColor()} ${isError ? "animate-pulse" : ""}`}
    >
      {/* 🔥 모델명 */}
      <span className="text-xl font-bold mb-2">
        {displayModelName}
      </span>

      <img
        src={displayImage}
        alt="device"
        className="w-full h-40 object-contain mb-2"
      />

      <div className="flex flex-col gap-1 text-sm">
        <div>
          <strong>장비ID:</strong> {deviceId}
        </div>
        <div>
          <strong>브랜드:</strong> {displayManufacturer}
        </div>
        <div>
          <strong>시간:</strong> {occurredAt || "-"}
        </div>
        <div>
          <strong>라인:</strong> {line}
        </div>
        <div>
          <strong>라인넘버:</strong> {lineNum}
        </div>
        <div>
          <strong>에러 코드:</strong> {errorCode || "-"}
        </div>
        <div>
          <strong>상태:</strong> {getStatusText()}
        </div>
      </div>
    </div>
  );
}