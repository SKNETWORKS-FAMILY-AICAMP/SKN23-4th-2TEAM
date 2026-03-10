import { mockdata } from "../mock/mockdata";

function KpiCards({ onErrorClick, onProcessingClick, onDoneClick }) {

  const { totalError, done, processing, runningRate } = calculateKpi(mockdata);

  const cards = [
    {
      title: "총 에러",
      value: totalError,
      color: "text-red-500",
      click: onErrorClick,
    },
    {
      title: "처리 완료",
      value: done,
      color: "text-green-500",
      click: onDoneClick,
    },
    {
      title: "처리중",
      value: processing,
      color: "text-yellow-500",
      click: onProcessingClick,
    },
    {
      title: "설비 가동률",
      value: runningRate,
      color: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

      {cards.map((card, i) => (
        <div
          key={i}
          onClick={card.click}
          className="bg-white p-5 rounded-lg shadow border flex flex-col cursor-pointer hover:bg-gray-50"
        >
          <p className="text-gray-500 text-sm">{card.title}</p>

          <p className={`text-2xl font-bold mt-1 ${card.color}`}>
            {card.value}
          </p>

        </div>
      ))}

    </div>
  );
}

export default KpiCards;

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function calculateKpi(data) {

  const today = new Date();

  const lastDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    lastDays.push(formatDate(d));
  }

  const recentData = data.filter(d => lastDays.includes(d.date));

  const totalError = recentData.filter(d => d.errorCode).length;

  const processing = Math.floor(totalError / 2);
  const done = totalError - processing;

  const devices = Array.from(new Set(recentData.map(d => d.device)));

  let runningCount = 0;

  devices.forEach(device => {
    const deviceErrors = recentData.filter(
      d => d.device === device && d.errorCode
    );

    if (deviceErrors.length === 0) runningCount++;
  });

  const runningRate =
    Math.round((runningCount / devices.length) * 100) + "%";

  return { totalError, done, processing, runningRate };
}

