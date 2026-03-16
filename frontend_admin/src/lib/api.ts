/**
 * Admin UI API Client
 * 투트랙(Two-track) 아키텍처 지원: Django(8000) 및 FastAPI(8001)와 통신
 */

const BASE_URL = '/api/v1';

// --- Type Definitions ---

export interface ErrorLog {
  id: number;
  device_id: string;
  error_code: string;
  status: string;
  created_at: string;
}

export interface AIAnalysisRequest {
  log_ids: number[];
  query?: string;
}

export interface AIAnalysisResponse {
  summary: string;
  recommendations: string[];
  affected_components: string[];
}

// --- API Functions ---

/**
 * [Track 1: Django] 에러 로그 목록 가져오기
 */
export async function getDashboardLogs(): Promise<ErrorLog[]> {
  try {
    const response = await fetch(`${BASE_URL}/logs/`);
    if (!response.ok) {
      throw new Error(`Django API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch logs from Django:', error);
    throw error;
  }
}

/**
 * [Track 2: FastAPI] 선택한 로그들에 대한 AI 원인 분석 요청
 */
export async function analyzeLogsWithAI(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  try {
    const response = await fetch(`${BASE_URL}/admin-ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`FastAPI AI Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI analysis request failed:', error);
    throw error;
  }
}
