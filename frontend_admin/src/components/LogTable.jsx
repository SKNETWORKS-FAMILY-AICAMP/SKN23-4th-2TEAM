function LogTable({ logs = [] }) {

  return (
    <div className="overflow-auto border rounded shadow bg-white">
      <table className="w-full text-sm table-fixed border-collapse">
        <thead className="border-b bg-gray-100">
          <tr>
            <th className="w-36 py-2">시간</th>
            <th className="w-20">라인</th>
            <th className="w-32">장비</th>
            <th className="w-24">코드</th>
            <th>상태</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log, i) => {

            const status = log.errorCode ? "error" : "normal";

            return (
              <tr key={i} className="hover:bg-gray-50 border-b">

                <td>
                  {log.date} {String(log.hour).padStart(2,"0")}:00
                </td>

                <td>{log.line}</td>

                <td>{log.device}</td>

                <td className="font-mono">
                  {log.errorCode || "-"}
                </td>

                <td
                  className={
                    status === "error"
                      ? "text-red-500"
                      : "text-green-500"
                  }
                >
                  {status === "error" ? "발생" : "정상"}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LogTable;