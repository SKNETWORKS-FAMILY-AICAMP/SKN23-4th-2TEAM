# 관리자 대시보드 API 명세서

버전: 2026-03-13
관리자 페이지 (frontend_admin) ↔ 백엔드 (Django)

---

## 1. 대시보드 (Dashboard)
### 종합 요약 정보
- Method : GET
- Path : /api/admin/dashboard/summary
- Description : 실시간 총 에러, 처리 완료, 처리중 수치 및 설비 가동률 반환
- Response Body
```json
{
  "total_errors": 25,         <!-- 전체 에러 수(error_log_id의 총 합계) -->
  "resolved_count": 18,       <!-- 처리 완료 건 수(error_log_id 전체 수에서 final_status가 resolved인 것) -->
  "ongoing_count": 7,         <!-- 처리중인 건 수(error_log_id 전체 수에서 final_status가 ongoing인 것)-->
  "total_devices": 85.5       <!-- 설비 가동률(전체 robot_devices 수 - ongoing 세션 장비 수) / 전체 장비 수 * 100 -->
}
```

### 라인별 에러 발생 비교
- Method : GET
- Path : /api/admin/dashboard/line-trends
- Description : 
  - 최근 7일간의 날짜별, 라인별 에러 발생 건수 집계
- Response Body
```json
{
  "lines": [
  {
    "occurred_at": "2026-03-06",  <!-- 에러 발생 일자 -->
    "line_name_A": 0,             <!-- A라인 에러 총 건 수 -->
    "line_name_B": 0,             <!-- B라인 에러 총 건 수 -->
    "line_name_C": 0,             <!-- C라인 에러 총 건 수 -->
    "line_name_D": 0              <!-- D라인 에러 총 건 수 -->
  },
  {
    "occurred_at": "2026-03-07",
    "line_name_A": 0,
    "line_name_B": 1,
    "line_name_C": 0,
    "line_name_D": 0
  }
]
}
```
### 최근 에러 로그
- Method : GET
- Path : /api/admin/dashboard/recent-logs
- Description : 
  - 최근 에러 발생 순 N개 반환
- Response Body
```json
{
  "recent_errors": [
    {
	    "error_log_id": 1,                    <!-- 에러 로그 단건 ID -->
      "occurred_at": "2026-03-06T10:00:00", <!-- 에러 발생 시각 -->
      "device_id": "ROBOT_07",              <!-- 에러 발생 장비 -->
      "error_code": "E0123",                <!-- 에러 코드 -->
      "line_name": "A",                     <!-- 라인명 -->
      "final_status": "resolved"            <!-- 세션 상태 -->
    },
    {
      "error_log_id": 2,
      "occurred_at": "2026-03-06T10:00:00",
      "device_id": "ROBOT_08",
      "error_code": "E0124",
      "line_name": "B",
      "final_status": "ongoing"
    }
  ]
}
```

### 빈출 에러 TOP N
- Method : GET
- Path : /api/admin/dashboard/top-errors
- Description : 
  - 에러 코드별 발생 빈도수 계산 상위 N개 반환
- Response Body
```json
{
  "top_errors": [
    {
      "error_code": "E0123",  <!-- 에러 코드 -->
      "error_count": 10       <!-- 에러 횟수(error_log_id의 총 합계) -->
    },
    {
      "error_code": "E0124",
      "error_count": 5
    }
  ]
}
```

## 2. 로봇 현황 (Lines)
- Method : GET
- Path : /api/admin/lines
- Description : 
  - 라인별 로봇의 현재 상태 반환
- Response Body
```json
{
  "lines": [
  {
    "device_id": "ROBOT_A1",            <!-- 에러 발생 장비 ID -->
    "manufacturer" : "현대로보틱스",     <!-- 브랜드명 -->
    "line_name": "A",                   <!-- 라인명 -->
    "line_num": 1,                      <!-- 라인 내 번호 -->
    "error_code": "C153",               <!-- 에러 코드 (final_status가 resolved이면 null 값) -->
    "occurred_at": "2026-02-20 09:00",  <!-- 에러 발생 시각 (final_status가 resolved이면 null 값) -->
    "final_status": "error"             <!-- 세션 상태 -->
  },
  {
    "device_id": "ROBOT_A2",
    "manufacturer" : "현대로보틱스",
    "line_name": "A",
    "line_num": 2,
    "error_code": null,
    "occurred_at": null,
    "final_status": "normal"
  }
]
}
```

## 3. 로그 (Logs)
- Method : GET
- Path : /api/admin/logs
- Description : 
  - 전체 에러 발생 이력 조회 및 필터링
- Response Body
```json
{
  "logs": [
    {
      "error_log_id": 1,                    <!-- 에러 로그 단건 ID -->
      "occurred_at": "2026-03-06T10:00:00", <!-- 에러 발생 시각 -->
      "line_name": "A",                     <!-- 라인명 -->
      "device_id": "ROBOT_07",              <!-- 에러 발생 장비 ID -->
      "error_code": "E0123",                <!-- 에러 코드 -->
      "final_status": "resolved"            <!-- 세션 상태 -->
    },
    {
      "error_log_id": 2,
      "occurred_at": "2026-03-06T10:00:00", 
      "line_name": "B",
      "device_id": "ROBOT_08",
      "error_code": "E0124",
      "final_status": "ongoing"
    }
  ]
}
```



처리 상태"를 나타낼 때는 `robot_error_sessions`의 `final_status`를 기준으로 삼는 것을 권장합니다.

---

## 4. 관리자 AI 비서 (Admin AI Assistant)

> [!NOTE]
> 본 API는 **FastAPI 워커 서버 (Port 8001)** 에서 기동하며, Prefix `/api/v1`이 적용됩니다.

### 📊 데일리 브리핑 조회
- **Method** : `GET`
- **Path** : `/api/v1/admin-ai/briefing`
- **Description** : 
  - 현재 날짜 기준 전체 라인 가동률, 주요 에러 빈도수 및 가이드 매뉴얼 매칭 결과를 종합한 데일리 정기 보고(브리핑) 내용을 반환합니다.
- **Query Parameters** :
  | 파라미터   | 타입     | 필수 여부 | 설명                                          |
  | ---------- | -------- | --------- | --------------------------------------------- |
  | `language` | `string` | 선택      | 응답 생성 언어 (`ko` 기본, `en` 등 지원) |

- **Response Body** :
  ```json
  {
    "plan": { "task": "overview", "filters": {} },
    "collected_data": { "summary": { ... }, "top_errors": [ ... ] },
    "manager_data_context": "조회된 통계 텍스트...",
    "manual_context": "매뉴얼 검색 텍스트...",
    "answer_text": "안녕하세요 관장자님. 금일 주요 라인들의 가동 상태는 양호하나..."
  }
  ```

---

### 💬 실시간 질의응답 (챗봇)
- **Method** : `POST`
- **Path** : `/api/v1/admin-ai/ask`
- **Description** : 
  - 관리자가 입력한 공장 설비/라인 질문을 의도 분석(Intent) 후 최적화 대응 답변을 반환합니다.
- **Request Body** :
  ```json
  {
    "question": "오늘 A라인에서 에러가 몇 개 발생했어?",
    "language": "ko"
  }
  ```

- **Response Body** :
  ```json
  {
    "plan": { "task": "error_count", "filters": { "line_name": "A" } },
    "collected_data": { "line_totals": { "A": 5 } },
    "manager_data_context": "A라인 에러 5건 발생...",
    "manual_context": "매뉴얼 해당 없음...",
    "answer_text": "오늘 A라인의 에러 발생 건수는 총 5건입니다."
  }
  ```