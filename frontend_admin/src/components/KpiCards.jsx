function KpiCards() {
  // 카드 데이터 정의
  const cards = [
    { title: "총 에러", value: 23, color: "text-red-500" },
    { title: "처리 완료", value: 18, color: "text-green-500" },
    { title: "처리중", value: 3, color: "text-yellow-500" },
    { title: "설비 가동률", value: "92%", color: "text-blue-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-lg shadow border flex flex-col"
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
