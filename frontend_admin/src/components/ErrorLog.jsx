function ErrorLog({ logs = [] }) {

  const getStatusColor = (status) => {
    if (status === "발생") return "text-red-500";
    if (status === "처리중") return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="bg-white p-4 rounded shadow border flex flex-col">

      <h3 className="font-bold mb-2">최근 에러 로그</h3>

      <div className="overflow-auto max-h-full">
        <table className="w-full table-fixed text-sm border-collapse">

          <thead className="border-b bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-1/3">발생 시각</th>
              <th className="px-4 py-3 text-left w-1/3">장치 식별자 및 에러</th>
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

                  {/* 발생 시각 */}
                  <td className="px-4 py-2 text-left w-1/4 truncate text-gray-500 font-mono">
                    {log.occurred_at}
                  </td>

                  {/* 장치 정보 */}
                  <td className="px-4 py-2 text-left w-1/2 truncate font-bold">
                    {log.device_info}
                  </td>

                  {/* 상태 */}
                  <td
                    className={`px-4 py-2 text-right w-1/4 font-semibold ${getStatusColor(
                      log.final_status
                    )}`}
                  >
                    {log.final_status}
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