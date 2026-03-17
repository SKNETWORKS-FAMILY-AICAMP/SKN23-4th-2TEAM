import deviceImg from "../../../data/hyundai_device.png";

export default function DeviceCard({ device }) {
  const { device: name, line, lineNum, date, hour, errorCode } = device;
  const isError = !!errorCode;

  return (
    
    <div
      className={`flex flex-col p-4 rounded-lg shadow border w-full min-h-[450px] ${
      isError ? "bg-red-100 animate-pulse" : "bg-green-100"
      }`}
    >
      <span className="text-xl font-bold mb-2">{name}</span>
        
      <img
        src={deviceImg}
        alt="device"
        className="w-full h-40 object-contain mb-2"
      />
      
      <div className="flex flex-col gap-1 text-sm">
        <div>
          <strong>시간:</strong> {date} {hour}:00
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
          <strong>상태:</strong> {isError ? "에러" : "정상"}
        </div>
      </div>
    </div>
  );
}