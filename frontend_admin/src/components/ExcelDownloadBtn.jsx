import * as XLSX from "xlsx";

export default function ExcelDownloadBtn({ selectedLogs = [], className }) {

  const handleDownload = () => {
    if (selectedLogs.length === 0) {
      alert("선택된 데이터가 없습니다.");
      return;
    }

    // 👉 엑셀용 데이터 변환
    const excelData = selectedLogs.map(log => ({
      시간: `${log.date} ${String(log.hour).padStart(2,"0")}:00`,
      라인: log.line,
      장비: log.device,
      코드: log.errorCode || "-",
      상태: log.errorCode ? "에러" : "정상",
      에러내용 : log.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");

    // 👉 파일 다운로드
    XLSX.writeFile(workbook, `logs_${Date.now()}.xlsx`);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={selectedLogs.length === 0}
      className={`bg-green-500 hover:bg-green-600 text-white rounded ${
        selectedLogs.length === 0 ? "opacity-50 cursor-not-allowed" : ""
      } ${className || "px-3 py-1"}`}
    >
      엑셀 다운로드 ({selectedLogs.length})
    </button>
  );
}