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
    <div className="bg-white p-4 rounded shadow border flex flex-col">
  {/* 제목 */}
  <h3 className="font-bold mb-2">최근 에러 로그</h3>

  {/* 스크롤 영역 */}
  <div className="overflow-auto max-h-[20rem]">
    <table className="w-full table-fixed text-sm border-collapse">
      <thead className="border-b bg-gray-50 sticky top-0 z-10">
        <tr className="text-left">
          <th className="px-4 py-3 text-left w-1/4">발생 시각</th>
          <th className="px-4 py-3 text-left w-1/2">장치 식별자 및 에러</th>
          <th className="px-4 py-3 text-right w-1/4">조치 상태</th>
        </tr>
      </thead>
      <tbody>
        {logs.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-center py-6 text-gray-400">
              최근 로그가 없습니다.
            </td>
          </tr>
        ) : (
          logs.map((log, i) => (
            <tr key={i} className="border-b hover:bg-gray-50 h-14">
              <td className="px-4 py-2 text-left w-1/4 truncate text-gray-500 font-mono">
                {formatTime(log)}
              </td>
              <td className="px-4 py-2 text-left w-1/2 truncate font-bold">
                {/* 백엔드 API에서 line_name, line_num, error_code를 조인해서 내려주도록 수정 필요 */}
                [라인 A-1] {log.device} (에러: {log.code || "-"})
              </td>
              <td
                className={`px-4 py-2 text-right w-1/4 font-semibold ${
                  log.status === "error"
                    ? "text-red-500"
                    : log.status === "processing"
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
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
</div>
  );
}

export default ErrorLog;
