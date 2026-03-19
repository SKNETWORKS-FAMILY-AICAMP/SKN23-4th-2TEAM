// import deviceImg from "../../../data/hyundai_device.png";
import deviceImg from "../assets/hyundai_device.png";

export default function DeviceCard({ device }) {
  const {
    device: name,
    line,
    lineNum,
    occurredAt,
    errorCode,
    status,
    manufacturer,
  } = device;

  // 🔥 상태 처리
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

  const getAnimation = () => {
    if (isError) return "animate-pulse";
    return "";
  };

  return (
    <div
      className={`flex flex-col p-4 rounded-lg shadow border w-full min-h-[420px]
      ${getBgColor()} ${getAnimation()}`}
    >
      <span className="text-xl font-bold mb-2">{name}</span>

      <img
        src={deviceImg}
        alt="device"
        className="w-full h-40 object-contain mb-2"
      />

      <div className="flex flex-col gap-1 text-sm">
        <div>
          <strong>브랜드:</strong> {manufacturer || "-"}
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