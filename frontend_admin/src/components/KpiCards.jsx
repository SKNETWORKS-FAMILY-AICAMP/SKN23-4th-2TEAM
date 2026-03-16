function KpiCards({ summary, onErrorClick, onProcessingClick, onDoneClick }) {

  const cards = [
    {
      title: "총 에러",
      value: summary?.total_errors ?? 0,
      color: "text-red-500",
      click: onErrorClick,
    },
    {
      title: "정상",
      value: summary?.resolved_count ?? 0,
      color: "text-green-500",
      click: onDoneClick,
    },
    {
      title: "처리중",
      value: summary?.ongoing_count ?? 0,
      color: "text-yellow-500",
      click: onProcessingClick,
    },
    {
      title: "설비 가동률",
      value: summary?.total_devices
        ? summary.total_devices + "%"
        : "0%",
      color: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          onClick={card.click}
          className="bg-white p-6 rounded-lg shadow border flex flex-col cursor-pointer hover:bg-gray-50 gap-2"
        >
          <p className="text-gray-500 text-sm font-medium">{card.title}</p>

          <p className={`text-3xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default KpiCards;