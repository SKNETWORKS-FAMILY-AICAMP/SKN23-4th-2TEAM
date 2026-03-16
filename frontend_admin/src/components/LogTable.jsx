function LogTable({ logs = [] }) {
  return (
    <div className="overflow-x-auto border rounded shadow bg-white">
      <table className="min-w-full text-sm border-collapse table-auto font-sans">
        <thead className="border-b bg-gray-100">
          <tr>
            <th className="w-32 py-2 px-2 text-left">시간</th>
            <th className="w-20 py-2 px-2 text-left">라인</th>
            <th className="w-32 py-2 px-2 text-left">장비</th>
            <th className="w-24 py-2 px-2 text-right">코드</th>
            <th className="w-24 py-2 px-2 text-center">상태</th>
            <th className="py-2 px-2 text-left">에러내용</th> {/* 남는 공간 활용 */}
          </tr>
        </thead>

        <tbody>
          {logs.map((log, i) => {
            const status = log.errorCode ? "error" : "normal";
            return (
              <tr key={i} className="hover:bg-gray-50 border-b">
                <td className="py-2 px-2">{log.date} {String(log.hour).padStart(2,"0")}:00</td>
                <td className="py-2 px-2">{log.line}</td>
                <td className="py-2 px-2">{log.device}</td>
                <td className="py-2 px-2 text-right font-mono">{log.errorCode || "-"}</td>
                <td className={`py-2 px-2 text-center ${status === "error" ? "text-red-500" : "text-green-500"}`}>
                  {status === "error" ? "발생" : "정상"}
                </td>
                <td className="py-2 px-2">{log.errorMessage || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export default LogTable;