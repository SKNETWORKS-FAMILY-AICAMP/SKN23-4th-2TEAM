# 사용자페이지 API 명세서

버전: 2026-03-12 기준
적용 대상: `SKN23-4th-2TEAM`

이 문서는 사용자페이지(`frontend_worker`)와 백엔드(`frontend_worker ↔ FastAPI`)의 API를 정의한다.
회원 계정 없이 `device_id` 기반 상담 흐름(비회원)을 기준으로 한다.
백엔드 저장 구조는 `DB명세서.md`의 도메인 규칙을 기준으로 정의한다.

---

## 1. 용어 정의

- `session`: 한 번의 에러 상담 시작 단위 (`robot_error_sessions`)
- `event`: 사용자/LLM 메시지 이벤트 (`robot_error_chat_histories`)
- `response_type` (DB 기준)
  - `overall`: 초기 대응 가이드
  - `checklist`: 체크리스트형 응답
  - `diagnosis`: 추가 진단형 응답
- `actor`
  - `user`: 사용자 입력 이벤트
  - `llm`: LLM 응답 이벤트
  - `system`: 시스템 이벤트(타임아웃, 강제종료 등)
- `selected_choice`: 사용자 선택 (`O`, `X`)
- `request_id`: 클라이언트 생성 이벤트 고유키(멱등성 키)

---

## 2. DB 정합 기본 규칙

- `language`는 DB 규칙에 맞춰 `ko`, `en` 사용
- `actor`는 DB 규칙에 맞춰 `user`/`llm`/`system` 사용
- `response_type`은 DB 규칙에 맞춰 `overall`/`checklist`/`diagnosis` 사용
- `robot_error_chat_histories`에 `request_id`를 저장해 중복 요청을 차단
- `request_id` 중복은 동일 `session_id` 내에서 1회만 허용(권장)
- `error_code`는 `start` 요청에서만 사용(세션/에러 로그 확정용), 이벤트(`events`) 요청에는 필수로 포함하지 않음
- `robot_error_chat_histories`에는 `error_code`, `line`을 저장하지 않음. 해당 값은 `session_id` 기준으로 `robot_error_sessions`/`robot_error_logs`/`robot_devices`에서 유도

---

## 3. 공통 헤더

| 항목                | 타입               | 필수 | 설명 |
| ------------------- | ------------------ | ---- | ---- |
| `Content-Type`      | `application/json` | O    | |
| `X-Client-Version` | `string`           | X    | 프론트 앱 버전 |
| `Authorization`     | `Bearer <token>`   | X    | 추후 인증 연동 시 사용 |

---

## 4. 엔드포인트

### 4.1 상담 시작

`POST /api/v1/consultations/start`

최초 에러 입력으로 세션을 생성한다.
시작 시점의 맥락은 DB 제약과 충돌하지 않도록 `robot_error_chat_histories`에 바로 `user` 이벤트를 남기지 않으며,
선택적으로 다음 중 하나로만 기록한다.

- 권장: `actor='system'`, `response_type=null`, `selected_choice=null`의 시스템 시작 이벤트 1건
- 대안: 시작 이벤트를 저장하지 않고(채팅 이력 미생성) 바로 `llm` 응답만 기록

#### Request Body

```json
{
  "request_id": "req-uuid-001",
  "language": "ko",
  "device_id": "ROBOT_07",
  "error_code": "E0123"
}
```

- `error_code`로 에러 로그가 없으면 세션은 `error_log_id` null로 시작 가능
- `request_id`는 시작 이벤트 저장 시 `robot_error_chat_histories`의 멱등성 키로 사용

#### Response Body

```json
{
  "status": "ok",
  "session_id": 1,
  "step_no": 1,
  "next_response_type": "overall",
  "assistant": {
    "actor": "llm",
    "response_type": "overall",
    "message": "E0123에 대한 초동 점검 가이드를 시작합니다.",
    "checklist": null
  },
  "session_status": "ongoing"
}
```

#### 에러

- `400` 필수값 누락 (`language`, `device_id`, `error_code`)
- `404` 존재하지 않는 `device_id`
- `409` 동일 `request_id` 중복
- `500` LLM 처리 실패

---

### 4.2 상담 진행(사용자 입력)

`POST /api/v1/consultations/{session_id}/events`

사용자 이벤트 또는 시스템/LLM 후속 응답을 처리한다.  
`session_id` 단위로 컨텍스트가 확정되어 있으므로 이벤트 요청에는 `device_id`, `error_code`를 포함하지 않는다.

#### Request Body (사용자 입력)

```json
{
  "request_id": "req-uuid-002",
  "actor": "user",
  "step_no": 2,
  "language": "ko",
  "response_type": null,
  "selected_choice": "X",
  "message": "미해결",
  "payload": {
    "selected_checklist": ["메인 PCB 상태 확인", "케이블 단자 점검"],
    "action": "back_or_diagnosis"
  }
}
```

#### Request Body (LLM 응답)

```json
{
  "request_id": "req-uuid-003",
  "actor": "llm",
  "step_no": 3,
  "language": "ko",
  "response_type": "checklist",
  "selected_choice": null,
  "message": "아래 항목을 확인해 주세요.",
  "payload": {
    "checklist": ["메인 PCB 발광 다이오드 상태", "토치 흔들림 시 아크 상태"]
  }
}
```

#### Response Body

```json
{
  "status": "ok",
  "session_id": 1,
  "step_no": 3,
  "next_response_type": "checklist",
  "assistant": {
    "actor": "llm",
    "response_type": "checklist",
    "message": "아래 항목을 확인해 주세요.",
    "checklist": [
      "메인 PCB 발광 다이오드 상태",
      "토치 흔들림 시 아크 상태",
      "케이블 커넥터 체결"
    ]
  },
  "session_status": "ongoing"
}
```

### 응답 처리 규칙

- 사용자 `selected_choice`
  - `O`: 세션을 `resolved`로 전환
  - `X`: 상담 지속(`ongoing`)
  - `null`: 선택 없음

- 사용자 종료(뒤로가기)
  - 별도 `event_type` 대신 시스템 이벤트에서 처리 가능
  - `actor: system`, `response_type: null`, `message: "user_back"` 또는 `is_resolved: false`

### 성능/정합 최적화 적용 포인트

- `start`에서만 `error_code` 수신 → 세션/로그 생성
- 이후 `events`는 `session_id`와 `step_no`, `actor`, `selected_choice`, `response_type`, `request_id`만 상태 반영
- 이벤트 중복은 `request_id`로 즉시 차단해 동일 요청 재전송 비용 및 중복 상태 전이를 방지
- `line`은 응답 조립 시 `robot_devices` 조인으로 계산해 반환(요청 바디에서 제거)

---

### 4.3 상담 상태 조회

`GET /api/v1/consultations/{session_id}`

현재 세션 상태 조회.

#### Response Body

```json
{
  "session_id": 1,
  "status": "ongoing",
  "language": "ko",
  "device_id": "ROBOT_07",
  "line": "A",
  "error_code": "E0123",
  "latest_response_type": "checklist",
  "step_no": 3,
  "updated_at": "2026-03-12T05:12:44.123Z"
}
```

---

### 4.4 상담 대화 이력 조회

`GET /api/v1/consultations/{session_id}/history`

세션 전체 이벤트 조회.

#### Response Body

```json
{
  "session_id": 1,
  "count": 3,
  "events": [
    {
      "event_no": 1,
      "actor": "system",
      "response_type": null,
      "selected_choice": null,
      "message": "ROBOT_07에서 E0123 발생 (상담 시작)",
      "created_at": "2026-03-12T05:11:10.120Z"
    },
    {
      "event_no": 2,
      "actor": "llm",
      "response_type": "overall",
      "selected_choice": null,
      "message": "안전 점검 우선 조치 가이드",
      "created_at": "2026-03-12T05:11:11.230Z"
    },
    {
      "event_no": 3,
      "actor": "user",
      "response_type": null,
      "selected_choice": "X",
      "message": "미해결",
      "created_at": "2026-03-12T05:11:40.900Z"
    }
  ]
}
```

---

## 5. 타입 정의

### 5.1 공통 요청 스키마

```ts
interface ConsultationEventRequest {
  request_id: string; // 재전송 중복 방지 키(UUID 권장)
  actor: "user" | "llm" | "system";
  step_no: number;
  language: "ko" | "en";
  response_type?: "overall" | "checklist" | "diagnosis" | null;
  selected_choice?: "O" | "X" | null;
  message: string;
  is_resolved?: boolean | null;
  payload?: ConsultationEventPayload;
  created_at?: string;
}

interface StartConsultationRequest {
  request_id: string;
  language: "ko" | "en";
  device_id: string;
  error_code: string;
}

interface ConsultationResponse {
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

type ConsultationEventPayload = Record<string, unknown>;
```

---

## 6. DB 연계 매핑(명세 반영)

- `robot_error_sessions`
  - `device_id`, `error_log_id`(선택), `language`, `final_status` 저장
  - 시작 시 `final_status='ongoing'`, 최종 상태 갱신 시 `resolved/unresolved/abandoned`
  - 시작 이벤트를 저장할 경우 `robot_error_chat_histories`에 `actor='system'`으로 한 건 기록 권장 (`response_type=null`, `selected_choice=null`)
- `robot_error_logs`
  - `device_id`, `error_code`, `occurred_at` 저장
- `robot_error_chat_histories`
  - `session_id`, `step_no`, `actor`, `response_type`, `selected_choice`, `message`, `is_resolved`, `request_id` 저장
  - `device_id`, `error_code`, `line`은 세션/장비 기준 조인으로 유도하므로 chat_histories에 중복 저장하지 않음
  - `response_type`은 DB enum(`overall|checklist|diagnosis`)만 사용
  - `request_id`는 `UUID`, 세션 내 중복 불가(유니크 권장)

---

## 7. 오류 코드

- `400` 유효성 오류
  - 필수값 누락, `actor/response_type/language` 값 불일치
- `404` 존재하지 않는 `device_id`
- `409` 동일 `request_id` 중복
- `500` LLM 처리 오류

---

## 8. 예시 플로우

1. `POST /start` (`request_id`, `ko`, `device_id`, `error_code`)
2. 응답: `session_id`, `next_response_type=overall`, `assistant` 메시지
3. 사용자가 `X` 전송 (`actor=user`, `selected_choice=X`)
4. 서버가 후속 `checklist` 또는 `diagnosis` 응답
5. 사용자가 `O` 전송 시 `session_status=resolved`
6. 사용자가 뒤로가기 시 `system` 이벤트로 `session_status=abandoned`

---

## 9. 보안/운영 권고

- `request_id` 중복 방지를 위한 `robot_error_chat_histories(session_id, request_id)` 유니크 제약 권장
- 이벤트 순서(`step_no`)를 매 이벤트 증가
- `device_id`는 서버에서 조회 확인 후 사용
- `language`는 저장 전 소문자(`ko|en`) 정규화
- `response_type`은 프론트에서 보내도 서버에서 재검증(화이트리스트)
