export default function ExcelDownloadBtn({ className }) {
  return (
    <button
      className={`bg-green-500 hover:bg-green-600 text-white rounded ${className || "px-3 py-1"}`}
    >
      엑셀 다운로드
    </button>
  );
}
