function DeviceLogTable({ devices = [], logs = [] }) {
  const statusColor = { normal: "text-green-500", error: "text-red-500" };

  // 날짜 표시 헬퍼
  const formatTime = (log) => {
    if (!log?.time) return "-";

    // log.time이 "HH:mm"이면 오늘 날짜 붙이기
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${log.time}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h2 className="font-bold mb-4 text-lg">장비 에러 로그</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left">시간</th>
            <th className="text-left">라인</th>
            <th className="text-left">장비</th>
            <th className="text-left">에러 코드</th>
            <th className="text-left">상태</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => {
            const log = logs.find((l) => l.device === device.name);

            return (
              <tr key={device.id} className="hover:bg-gray-50 border-b">
                <td className="py-2">{formatTime(log)}</td>
                <td>{device.line.toUpperCase()}</td>
                <td>{device.name}</td>
                <td className="font-mono">{log?.code || "-"}</td>
                <td
                  className={
                    statusColor[log?.status || device.status] || "text-gray-500"
                  }
                >
                  {log?.status === "normal" || !log ? "정상" : log.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DeviceLogTable;
