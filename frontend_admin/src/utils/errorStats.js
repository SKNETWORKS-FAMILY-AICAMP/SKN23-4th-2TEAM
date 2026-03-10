// src/utils/errorStats.js
export const getTopErrorCodes = (data, days = 7, topN = 3) => {
  const today = new Date();
  const lastDays = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    lastDays.push(d.toISOString().slice(0, 10)); // yyyy-mm-dd
  }

  // 최근 n일 + errorCode 있는 데이터만 필터링
  const recentErrors = data.filter(
    item => lastDays.includes(item.date) && item.errorCode
  );

  // errorCode별 카운트
  const errorCountMap = {};
  recentErrors.forEach(item => {
    if (!errorCountMap[item.errorCode]) errorCountMap[item.errorCode] = 0;
    errorCountMap[item.errorCode]++;
  });

  // 상위 N개 추출
  return Object.entries(errorCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([errorCode, count]) => ({ errorCode, count }));
};