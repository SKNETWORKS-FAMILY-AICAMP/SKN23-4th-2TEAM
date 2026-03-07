function ErrorLog({ logs = [] }) {
  // 시간 포맷 함수
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
    <div className="bg-white p-4 rounded shadow border overflow-auto">
      <h3 className="font-bold mb-2">최근 에러 로그</h3>
      <table className="w-full table-fixed text-sm border-collapse">
        <thead className="border-b">
          <tr className="text-left">
            <th className="py-1 w-44">시간</th>
            <th className="w-32">장비</th>
            <th className="w-24">코드</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-2 text-gray-400">
                최근 로그가 없습니다.
              </td>
            </tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="py-1 truncate">{formatTime(log)}</td>
                <td className="truncate">{log.device}</td>
                <td className="font-mono truncate">{log.code || "-"}</td>
                <td
                  className={
                    log.status === "error"
                      ? "text-red-500"
                      : log.status === "processing"
                        ? "text-yellow-500"
                        : "text-green-500"
                  }
                >
                  {log.status === "error"
                    ? "발생"
                    : log.status === "processing"
                      ? "처리중"
                      : "해결"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ErrorLog;
