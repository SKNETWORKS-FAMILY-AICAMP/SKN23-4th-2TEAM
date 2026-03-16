// src/lib/api.ts

export interface Device {
    device_id: string;
    line_name: string;
    line_num: number;
}

export interface ConsultationEventRequest {
    request_id: string; // UUID
    actor: "user" | "llm" | "system";
    step_no: number;
    language: "ko" | "en" | "uz";
    response_type?: "overall" | "checklist" | "diagnosis" | null;
    selected_choice?: "O" | "X" | null;
    message: string;
    is_resolved?: boolean | null;
    payload?: Record<string, unknown>;
}

export interface StartConsultationRequest {
    request_id: string; // UUID
    language: "ko" | "en" | "uz";
    device_id: string;
    error_code: string;
}

export interface ConsultationResponse {
    status: "ok" | "error";
    session_id: number;
    step_no: number;
    next_response_type: "overall" | "checklist" | "diagnosis";
    assistant: {
        actor: "llm";
        response_type: "overall" | "checklist" | "diagnosis";
        message: string;
        checklist?: string[] | null;
    };
    session_status: "ongoing" | "resolved" | "unresolved" | "abandoned";
}

export interface SessionStatus {
    session_id: number;
    status: "ongoing" | "resolved" | "unresolved" | "abandoned";
    language: "ko" | "en" | "uz";
    device_id: string;
    line?: string;
    error_code: string;
    latest_response_type: "overall" | "checklist" | "diagnosis";
    step_no: number;
    updated_at: string;
}

export interface ChatHistoryEvent {
    event_no: number;
    actor: "user" | "llm" | "system";
    response_type: "overall" | "checklist" | "diagnosis" | null;
    selected_choice: "O" | "X" | null;
    message: string;
    created_at: string;
}

export interface HistoryResponse {
    session_id: number;
    count: number;
    events: ChatHistoryEvent[];
}

export class ApiError extends Error {
    response?: {
        status: number;
        statusText: string;
    };
    constructor(message: string, status?: number, statusText?: string) {
        super(message);
        if (status !== undefined) {
            this.response = { status, statusText: statusText || "" };
        }
    }
}

export class ApiClient {
    private baseUrl = localStorage.getItem("weldbot-api-url") || "/api/v1";

    /**
     * API 베이스 URL 설정 및 저장
     */
    setBaseUrl(url: string) {
        this.baseUrl = url;
        localStorage.setItem("weldbot-api-url", url);
    }

    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * 장비 목록 조회
     */
    async listDevices(): Promise<Device[]> {
        const response = await fetch(`${this.baseUrl}/consultations/devices`);
        if (!response.ok) {
            throw new ApiError(`Failed to list devices: ${response.status} ${response.statusText}`, response.status, response.statusText);
        }
        return response.json();
    }

    /**
     * 상담 시작
     */
    async startConsultation(req: StartConsultationRequest): Promise<ConsultationResponse> {
        const response = await fetch(`${this.baseUrl}/consultations/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });

        if (!response.ok) {
            throw new ApiError(`Failed to start consultation: ${response.status} ${response.statusText}`, response.status, response.statusText);
        }

        return response.json();
    }

    /**
     * 이벤트 전송 (사용자 선택/입력)
     */
    async sendConsultationEvent(sessionId: number, req: ConsultationEventRequest): Promise<ConsultationResponse> {
        const response = await fetch(`${this.baseUrl}/consultations/${sessionId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });

        if (!response.ok) {
            throw new Error(`Failed to send event: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 상담 상태 조회
     */
    async getConsultationStatus(sessionId: number): Promise<SessionStatus> {
        const response = await fetch(`${this.baseUrl}/consultations/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Failed to get status: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 대화 이력 조회
     */
    async getConsultationHistory(sessionId: number): Promise<HistoryResponse> {
        const response = await fetch(`${this.baseUrl}/consultations/${sessionId}/history`);

        if (!response.ok) {
            throw new Error(`Failed to get history: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 최근 에러 로그 조회 (글로벌 또는 장비/라인별 필터링)
     */
    async getRecentLogs(deviceId?: string, lineName?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (deviceId) params.append("device_id", deviceId);
        if (lineName) params.append("line_name", lineName);

        const queryString = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`${this.baseUrl}/consultations/recent-logs${queryString}`);

        if (!response.ok) {
            throw new Error(`Failed to get recent logs: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * CSV 에러 코드 목록 조회
     */
    async listCsvErrors(type: string = "hyundai", q?: string): Promise<any[]> {
        const params = new URLSearchParams();
        params.append("type", type);
        if (q) params.append("q", q);

        const response = await fetch(`${this.baseUrl}/consultations/csv-errors?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV errors: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * 엔지니어 호출 목록 조회
     */
    async getEngineerCalls(): Promise<Array<{ code: string; timestamp: number; device: string; message?: string }>> {
        const response = await fetch(`${this.baseUrl}/consultations/engineer-calls`);
        if (!response.ok) {
            throw new Error(`Failed to list engineer calls: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * 대시보드 통계 및 트렌드 조회
     */
    async getStats(): Promise<{ today_total: number; today_resolution_rate: number; daily_trend: any[] }> {
        const response = await fetch(`${this.baseUrl}/consultations/stats`);
        if (!response.ok) {
            throw new Error(`Failed to get stats: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/consultations/stats`, {
                method: "GET",
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 기본 텍스트 번역 요청 (LLM)
     */
    async translateText(text: string, lang: "ko" | "en" | "uz"): Promise<{ translated: string }> {
        const response = await fetch(`${this.baseUrl}/consultations/translate-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, target_lang: lang.toLowerCase() })
        });
        if (!response.ok) {
            throw new Error(`Translation failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
}

export const api = new ApiClient();
