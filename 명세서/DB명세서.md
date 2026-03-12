# 🗂️ WELD-BOT DB 설계 명세서 (연습용)

## 1) 엔티티 관계

- `robot_models` (1) ↔ (N) `robot_devices`
- `robot_devices` (1) ↔ (N) `robot_error_logs`
- `robot_devices` (1) ↔ (N) `robot_error_sessions`
- `robot_error_logs` (1) ↔ (N) `robot_error_sessions` (선택적, nullable FK)
- `robot_error_sessions` (1) ↔ (N) `robot_error_chat_histories`

---

## 2) `robot_models` — 모델 마스터

### 목적

제조사/모델 단위 기준 정보(매뉴얼 태그 포함) 관리

### 컬럼

| 컬럼             | 타입             | 제약     | 설명                  |
| ---------------- | ---------------- | -------- | --------------------- |
| `model_id`     | `BIGSERIAL`    | PK       | 모델 고유 ID          |
| `manufacturer` | `VARCHAR(100)` | NOT NULL | 제조사명              |
| `model_name`   | `VARCHAR(100)` | NOT NULL | 모델명                |
| `manual_tag`   | `VARCHAR(120)` | NOT NULL | 모델 대응 매뉴얼 태그 |

### 제약/규칙

- `(manufacturer, model_name)` 중복 불가 (복합 유니크)

### 비고

- 모델 하나당 매뉴얼 하나(혹은 기본 매뉴얼군) 대응 전략에 맞는 구조

---

## 3) `robot_devices` — 로봇(장비) 마스터

### 목적

공장 내 개별 장비(일련번호 단위) 관리

### 컬럼

| 컬럼          | 타입            | 제약                              | 설명                 |
| ------------- | --------------- | --------------------------------- | -------------------- |
| `device_id` | `VARCHAR(50)` | PK                                | 장비 일련번호        |
| `line_name` | `VARCHAR(20)` | NOT NULL                          | 라인명 (예: A, B, C) |
| `line_num`  | `INTEGER`     | NOT NULL,`CHECK(line_num >= 1)` | 라인 내 번호         |
| `model_id`  | `BIGINT`      | FK (`robot_models.model_id`)    | 장비 모델 참조       |

### 제약/규칙

- `(line_name, line_num)` 유니크(같은 라인에서 번호 중복 방지)

### 비고

- `line_num`은 숫자형 저장 후 화면에서 정렬/필터링이 쉬움

---

## 4) `robot_error_logs` — 에러 발생 이력

### 목적

에러 발생 시각/장비/코드 단위의 원천 로그 저장

### 컬럼

| 컬럼             | 타입            | 제약                                       | 설명              |
| ---------------- | --------------- | ------------------------------------------ | ----------------- |
| `error_log_id` | `BIGSERIAL`   | PK                                         | 에러 로그 단건 ID |
| `device_id`    | `VARCHAR(50)` | NOT NULL, FK (`robot_devices.device_id`) | 발생 장비         |
| `error_code`   | `VARCHAR(50)` | NOT NULL                                   | 에러 코드         |
| `occurred_at`  | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                | 발생 시각         |

### 비고

- `error_message` 없이도 에러코드 기반 추적/통계에 충분
- 후속 분석에서 `에러코드 분포`, `장비별 발생률`, `시간대 분석`에 사용

---

## 5) `robot_error_sessions` — 상담 세션

### 목적

장비/에러 로그 단위의 사용자-LLM 상호작용 전체 단위를 관리

### 컬럼

| 컬럼                | 타입            | 제약                                                                                                     | 설명                                 |
| ------------------- | --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `session_id`      | `BIGSERIAL`   | PK                                                                                                       | 세션 ID                              |
| `device_id`       | `VARCHAR(50)` | NOT NULL, FK                                                                                             | 대상 장비                            |
| `error_log_id`    | `BIGINT`      | NULL, FK (`robot_error_logs.error_log_id`)                                                             | 대응 원천 로그                       |
| `language`        | `VARCHAR(10)` | NOT NULL, CHECK (language IN ('ko','en','ja'))                                                           | 응답 생성 언어 코드 (`ko`, `en`) |
| `started_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              | 세션 시작 시각                       |
| `last_updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              | 마지막 갱신 시각                     |
| `final_status`    | `VARCHAR(20)` | NOT NULL, DEFAULT `'ongoing'`, CHECK (final_status IN ('ongoing','resolved','unresolved','abandoned')) | 세션 상태                            |

### final_status 허용값 (권장)

- `ongoing` : 진행 중
- `resolved` : 사용자 `O` 눌러 해결 완료
- `unresolved` : 사용자 `X` 계속 진행했으나 미해결 종료
- `abandoned` : 중간 이탈/강제 종료

### 제약/규칙

- `device_id`는 세션의 대상 장비를 나타내며 필수값이다.
- `error_log_id`는 `NULL` 가능하다.
  - `error_log_id IS NULL`이면, 세션은 `device_id` 기반 생성 가능
  - `error_log_id IS NOT NULL`이면, `robot_error_logs.device_id`와 `robot_error_sessions.device_id` 일치 필요
- 정합성 강제(권장): 일치하지 않으면 세션 생성/수정 차단 트리거를 둔다.

```sql
-- robot_error_sessions: error_log_id와 device_id 일치 검증(권장)
CREATE OR REPLACE FUNCTION trgfn_validate_session_device_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.error_log_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM robot_error_logs l
      WHERE l.error_log_id = NEW.error_log_id
        AND l.device_id = NEW.device_id
    ) THEN
      RAISE EXCEPTION 'device_id must match robot_error_logs.device_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_device_match
BEFORE INSERT OR UPDATE OF device_id, error_log_id
ON robot_error_sessions
FOR EACH ROW
EXECUTE FUNCTION trgfn_validate_session_device_match();
```

---

## 6) `robot_error_chat_histories` — 채팅 이력

### 목적

O/X 버튼 기반 상호작용/LLM 응답 기록을 턴 단위 저장

### 컬럼

| 컬럼                | 타입            | 제약                                                                    | 설명                                                                                                    |
| ------------------- | --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `chat_id`         | `BIGSERIAL`   | PK                                                                      | 이력 ID                                                                                                 |
| `session_id`      | `BIGINT`      | NOT NULL, FK (`robot_error_sessions.session_id`)                      | 소속 세션                                                                                               |
| `step_no`         | `INTEGER`     | NOT NULL                                                                | 단계 번호                                                                                               |
| `actor`           | `VARCHAR(20)` | NOT NULL, CHECK (actor IN ('user','llm','system'))                      | `user` / `llm` / `system`                                                                         |
| `response_type`   | `VARCHAR(30)` | NULL,`CHECK (response_type IN ('overall', 'checklist', 'diagnosis'))` | LLM 응답 유형 (`overall`: 전체 대처 제안, `checklist`: 체크리스트형 대처, `diagnosis`: 추가 진단) |
| `selected_choice` | `VARCHAR(1)`  | NULL, CHECK (selected_choice IN ('O','X'))                              | 사용자 선택값                                                                                           |
| `request_id`     | `UUID`        | NOT NULL                                                                | 클라이언트 멱등성 키(중복 요청 방지)                                                                     |
| `message`         | `TEXT`        | NOT NULL                                                                | LLM 메시지 또는 시스템 안내                                                                             |
| `is_resolved`     | `BOOLEAN`     | NULL                                                                    | 해당 단계의 해결 판단                                                                                   |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                             | 기록 시각                                                                                               |

### 제약/규칙

- `actor='user'` 단계에서만 `selected_choice` 사용 권장 (`O`,`X`)
- `actor='llm'` 단계에서 `response_type`은 필수 권장, `actor!='llm'`에서는 NULL 허용
- `actor`/`response_type`/`selected_choice`의 조건부 규칙은 CHECK로 완전 강제 불가하므로, 운영이 중요하면 트리거 검증을 고려
- (권장) `(session_id, step_no, actor)` 유니크로 동시 충돌 방지
- `request_id`는 `session_id` + `request_id` 유니크로 중복 요청 1회 처리
- 조회 최적화: `(session_id, created_at)` 인덱스 권장

### response_type 분류 예시

- `overall` : 에러 발생 직후 제시하는 전체적인 대응 가이드
- `checklist` : 단계별 체크리스트 형태로 제시되는 후속 대응안
- `diagnosis` : 추가 질문/진단을 통해 원인 추적을 돕는 단계

---

## 7) 추천 인덱스

- `robot_devices(line_name, line_num)`
- `robot_devices(model_id)`
- `robot_error_logs(device_id, occurred_at)`
- `robot_error_logs(error_code)`
- `robot_error_sessions(device_id, final_status, last_updated_at DESC)`
- `robot_error_sessions(error_log_id)`
- `robot_error_chat_histories(session_id, created_at DESC)`
- `robot_error_chat_histories(session_id, step_no)`
- `robot_error_chat_histories(session_id, response_type)`
- `robot_error_chat_histories(session_id, request_id)` UNIQUE

## 부록) 생성 쿼리

```
-- WELD-BOT DB 스키마 (PostgreSQL)

BEGIN;

CREATE TABLE IF NOT EXISTS robot_models (
    model_id BIGSERIAL PRIMARY KEY,
    manufacturer VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    manual_tag VARCHAR(120) NOT NULL,
    CONSTRAINT uq_robot_models_manufacturer_model_name
        UNIQUE (manufacturer, model_name)
);

CREATE TABLE IF NOT EXISTS robot_devices (
    device_id VARCHAR(50) PRIMARY KEY,
    line_name VARCHAR(20) NOT NULL,
    line_num INTEGER NOT NULL CHECK (line_num >= 1),
    model_id BIGINT NOT NULL REFERENCES robot_models(model_id),
    CONSTRAINT uq_robot_devices_line_name_line_num UNIQUE (line_name, line_num)
);

CREATE TABLE IF NOT EXISTS robot_error_logs (
    error_log_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES robot_devices(device_id),
    error_code VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS robot_error_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES robot_devices(device_id),
    error_log_id BIGINT NULL REFERENCES robot_error_logs(error_log_id),
    language VARCHAR(10) NOT NULL
        CHECK (language IN ('ko', 'en')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    final_status VARCHAR(20) NOT NULL DEFAULT 'ongoing'
        CHECK (final_status IN ('ongoing', 'resolved', 'unresolved', 'abandoned'))
);

CREATE TABLE IF NOT EXISTS robot_error_chat_histories (
    chat_id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES robot_error_sessions(session_id),
    step_no INTEGER NOT NULL,
    actor VARCHAR(20) NOT NULL
        CHECK (actor IN ('user', 'llm', 'system')),
    response_type VARCHAR(30) NULL
        CHECK (response_type IN ('overall', 'checklist', 'diagnosis')),
    selected_choice VARCHAR(1) NULL
        CHECK (selected_choice IN ('O', 'X')),
    request_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 권장: 단계/역할 중복 기본 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_robot_error_chat_histories_step
ON robot_error_chat_histories (session_id, step_no, actor);

-- 세션-로그/장치 정합성 강제: error_log_id가 있으면 logs.device_id와 일치해야 함
CREATE OR REPLACE FUNCTION trgfn_validate_session_device_match()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.error_log_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM robot_error_logs l
            WHERE l.error_log_id = NEW.error_log_id
              AND l.device_id = NEW.device_id
        ) THEN
            RAISE EXCEPTION 'device_id must match robot_error_logs.device_id when error_log_id is provided';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_device_match ON robot_error_sessions;
CREATE TRIGGER trg_session_device_match
BEFORE INSERT OR UPDATE OF device_id, error_log_id
ON robot_error_sessions
FOR EACH ROW
EXECUTE FUNCTION trgfn_validate_session_device_match();

-- 채팅 규칙 강제(조건부 규칙)
CREATE OR REPLACE FUNCTION trgfn_validate_chat_rules()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actor = 'llm' THEN
        IF NEW.response_type IS NULL THEN
            RAISE EXCEPTION 'response_type is required when actor = llm';
        END IF;
        IF NEW.selected_choice IS NOT NULL THEN
            RAISE EXCEPTION 'selected_choice must be NULL when actor = llm';
        END IF;
    ELSIF NEW.actor = 'user' THEN
        IF NEW.selected_choice IS NULL THEN
            RAISE EXCEPTION 'selected_choice is required when actor = user';
        END IF;
        IF NEW.response_type IS NOT NULL THEN
            RAISE EXCEPTION 'response_type must be NULL when actor = user';
        END IF;
    ELSE
        IF NEW.selected_choice IS NOT NULL THEN
            RAISE EXCEPTION 'selected_choice must be NULL when actor = system';
        END IF;
        IF NEW.response_type IS NOT NULL THEN
            RAISE EXCEPTION 'response_type must be NULL when actor = system';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_histories_rules ON robot_error_chat_histories;
CREATE TRIGGER trg_chat_histories_rules
BEFORE INSERT OR UPDATE
ON robot_error_chat_histories
FOR EACH ROW
EXECUTE FUNCTION trgfn_validate_chat_rules();

-- 추천 인덱스
CREATE INDEX IF NOT EXISTS idx_robot_devices_line_line_num
ON robot_devices (line_name, line_num);

CREATE INDEX IF NOT EXISTS idx_robot_devices_model_id
ON robot_devices (model_id);

CREATE INDEX IF NOT EXISTS idx_robot_error_logs_device_occurred
ON robot_error_logs (device_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_robot_error_logs_error_code
ON robot_error_logs (error_code);

CREATE INDEX IF NOT EXISTS idx_robot_error_sessions_device_status_updated
ON robot_error_sessions (device_id, final_status, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_robot_error_sessions_error_log_id
ON robot_error_sessions (error_log_id);

CREATE INDEX IF NOT EXISTS idx_robot_error_chat_histories_session_created
ON robot_error_chat_histories (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_robot_error_chat_histories_session_step
ON robot_error_chat_histories (session_id, step_no);

CREATE INDEX IF NOT EXISTS idx_robot_error_chat_histories_session_response_type
ON robot_error_chat_histories (session_id, response_type);

CREATE UNIQUE INDEX IF NOT EXISTS ux_robot_error_chat_histories_session_request
ON robot_error_chat_histories (session_id, request_id);

COMMIT;


```

---
