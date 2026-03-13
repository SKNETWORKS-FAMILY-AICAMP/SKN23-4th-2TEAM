# 관리자 대시보드 API 명세서

버전: 2026-03-13
관리자 페이지 (frontend_admin) ↔ 백엔드 (Django)

---

## 1. 대시보드 (Dashboard)
### 종합 요약 정보
- Method : GET
- Path : /api/v1/admin/dashboard/summary
- Description : 실시간 총 에러, 처리 완료, 처리중 수치 및 설비 가동률 반환
- Response Body
```json
{
  "error_log_id_count": 25,         <!-- 전체 에러 수(error_log_id의 총 합계) -->
  "final_status_resolved": 18,      <!-- 처리 완료 건 수(error_log_id 전체 수에서 final_status가 resolved인 것) -->
  "final_status_ongoing": 7,        <!-- 처리중인 건 수(error_log_id 전체 수에서 final_status가 ongoing인 것)-->
  "device_id_operation_rate": 85.5  <!-- 설비 가동률(전체 robot_devices 수 - ongoing 세션 장비 수) / 전체 장비 수 * 100 -->
}
```

### 라인별 에러 발생 비교
- Method : GET
- Path : /api/v1/admin/dashboard/line-trends
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
- Path : /api/v1/admin/dashboard/recent-logs
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
- Path : /api/v1/admin/dashboard/top-errors
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
- Path : /api/v1/admin/lines
- Description : 
  - 라인별 로봇의 현재 상태 반환
- Response Body
```json
{
  "lines": [
  {
    "device_id": "Device A",            <!-- 에러 발생 장비 ID -->
    "line_name": "A",                   <!-- 라인명 -->
    "line_num": 1,                      <!-- 라인 내 번호 -->
    "error_code": "C153",               <!-- 에러 코드 (final_status가 resolved이면 null 값) -->
    "occurred_at": "2026-02-20 09:00",  <!-- 에러 발생 시각 (final_status가 resolved이면 null 값) -->
    "final_status": "error"             <!-- 세션 상태 -->
  },
  {
    "device_id": "Device B",
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
- Path : /api/v1/admin/logs
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

## 4. 통계 (Stats)  
- Method : GET
- Path : /api/v1/admin/stats
- Description : 
  - 날짜별/라인별 에러 밀도를 표현하기 위한 통계 데이터 반환
- Response Body
```json
{
  "stats": [
  {
    "occurred_at": "2026-02-20", <!-- 에러 발생 시각 -->
    "line_name": "A",            <!-- 라인명 -->
    "error_count": 5             <!-- 에러 횟수(error_log_id의 총 합계) -->
  },
  {
    "occurred_at": "2026-02-20",
    "line_name": "B",
    "error_count": 2
  }
]
}
```

처리 상태"를 나타낼 때는 robot_error_sessions의 final_status를 기준