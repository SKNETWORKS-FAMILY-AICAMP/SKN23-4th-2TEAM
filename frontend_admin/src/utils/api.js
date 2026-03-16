const BASE_URL = "http://localhost:8000/api/admin";

export const API = {
  dashboardSummary: `${BASE_URL}/dashboard/summary/`,
  lineTrends: `${BASE_URL}/dashboard/line-trends/`,
  recentLogs: `${BASE_URL}/dashboard/recent-logs/`,
  topErrors: `${BASE_URL}/dashboard/top-errors`,

  lines: `${BASE_URL}/lines/`,
  logs: `${BASE_URL}/logs/`,
  stats: `${BASE_URL}/stats/`
};