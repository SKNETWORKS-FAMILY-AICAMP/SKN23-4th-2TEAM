import re

ERROR_CODE_PATTERN = re.compile(r"([A-Z]{1,4}\d{1,5})(?![A-Za-z0-9])", re.IGNORECASE)


K_LINE = "라인"
K_UNRESOLVED = [
    "미해결",
    "처리 안 된",
    "처리안된",
    "아직",
    "처리중",
]
K_RISK = ["위험", "우선", "문제", "리스크"]
K_TOP = ["반복", "자주", "많이", "top", "최다", "가장 많이"]
K_STATUS = ["상태", "현황", "장비", f"{K_LINE} 현황", "보여줘"]
K_CAUSE = ["왜", "원인", "이유", "무슨 문제"]
K_TODAY = ["오늘", "today"]
K_YESTERDAY = ["어제", "yesterday"]
K_COUNT = ["몇건", "몇개", "몇 개", "건수", "count", "total"]
K_WHAT = ["뭐", "무슨", "어떤", "나왔", "발생한 오류"]
K_ALL = ["다", "전체", "모두", "전부", "보여줘", "말해봐"]
K_OCCURRED = ["났", "났던", "발생", "생긴", "에러가 났", "오류가 났"]
K_CASUAL = [
    "안녕",
    "안녕하세요",
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank you",
    "고마워",
    "고마움",
    "수고",
]

def is_casual_manager_chat(question: str) -> bool:
    # 특수문자 제거 후 유연하게 일상 대화 검사 (예: "안녕하세요~" 도 인식 가능)
    normalized = re.sub(r"[^\w\s가-힣]", "", str(question or "").strip().lower())
    if not normalized:
        return False
    return any(keyword in normalized for keyword in K_CASUAL) and len(normalized) < 15 # 문장이 짧을 때만 캐주얼 챗으로 인식

def extract_error_code(question: str) -> str | None:
    match = ERROR_CODE_PATTERN.search(str(question or "").upper())
    return match.group(1).upper() if match else None

def extract_line_name(question: str) -> str | None:
    text = str(question or "")
    # 수정: A-D뿐만 아니라 모든 영문/숫자 조합 라인명 유연하게 인식 (예: A라인, 1라인, E라인)
    line_match = re.search(r"([A-Z0-9]+)\s*" + K_LINE, text, re.IGNORECASE)
    if line_match:
        return line_match.group(1).upper()
    line_match = re.search(r"line\s*([A-Z0-9]+)", text, re.IGNORECASE)
    if line_match:
        return line_match.group(1).upper()
    return None

def _has_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)

def _build_plan(task: str, question: str, *, line_name: str | None, error_code: str | None, final_status: str | None = None, time_scope: str = "recent", days: int = 7, limit: int = 5, datasets: list[str] | None = None, manual_queries: list[str] | None = None) -> dict:
    return {
        "task": task,
        "intent": task,
        "question": question,
        "filters": {
            "line_name": line_name,
            "error_code": error_code,
            "final_status": final_status,
            "time_scope": time_scope,
            "days": days,
            "limit": limit,
        },
        "datasets": datasets or [],
        "manual_queries": manual_queries or [],
    }

def classify_manager_intent(question: str) -> dict:
    raw_question = str(question or "").strip()
    normalized = raw_question.lower()
    error_code = extract_error_code(raw_question)
    line_name = extract_line_name(raw_question)

    if is_casual_manager_chat(raw_question):
        return _build_plan(
            "casual_chat",
            raw_question,
            line_name=None,
            error_code=None,
            time_scope="none",
            days=0,
            limit=0,
            datasets=[],
        )

    has_today = _has_any(normalized, K_TODAY)
    has_yesterday = _has_any(normalized, K_YESTERDAY)
    has_count = _has_any(normalized, K_COUNT)
    has_what = _has_any(normalized, K_WHAT)
    has_all = _has_any(normalized, K_ALL)
    has_occurred = _has_any(normalized, K_OCCURRED)
    has_unresolved = _has_any(normalized, K_UNRESOLVED + ["ongoing"])
    has_risk = _has_any(normalized, K_RISK)
    has_top = _has_any(normalized, K_TOP)
    has_status = _has_any(normalized, K_STATUS)

    # 1. 에러코드 분석 최우선 처리: 에러코드가 언급되면 무조건 상세 분석으로 진입
    if error_code:
        return _build_plan(
            "error_code_analysis",
            raw_question,
            line_name=line_name,
            error_code=error_code,
            time_scope="recent",
            days=7,
            datasets=["recent_logs", "top_errors", "stats"],
            manual_queries=[error_code],
        )

    # 2. 미해결 장애 최우선 처리
    if has_unresolved:
        return _build_plan(
            "unresolved_list",
            raw_question,
            line_name=line_name,
            error_code=error_code,
            final_status="ongoing",
            time_scope="recent",
            days=7,
            datasets=["recent_logs", "lines"],
        )

    # 3. 에러 발생 건수 (라인 지정 또는 전체)
    if has_today and has_count:
        return _build_plan(
            "error_count",
            raw_question,
            line_name=line_name, # line_name이 없으면 None이 들어가서 전체 통계로 작동함
            error_code=None,
            time_scope="today",
            days=1,
            datasets=["stats", "recent_logs", "lines"] if line_name else ["stats"],
        )

    # 4. 에러 목록 조회 (특정 일자)
    if (has_today or has_yesterday) and (has_what or has_occurred or has_all):
        time_scope = "today" if has_today else "yesterday"
        return _build_plan(
            "error_list",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope=time_scope,
            days=1 if has_today else 2,
            datasets=["recent_logs", "lines", "stats"],
        )

    time_scope = "today" if has_today else ("yesterday" if has_yesterday else "recent")
    inferred_days = 1 if has_today else (2 if has_yesterday else 7)

    # 5. 라인별 리스크 및 탑 에러 조회
    if has_risk or has_top or "요약" in normalized:
        task_name = "line_risk" if has_risk else ("top_error" if has_top else "overview")
        return _build_plan(
            task_name,
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope=time_scope,
            days=inferred_days,
            datasets=["summary", "recent_logs", "top_errors", "lines", "stats"],
        )

    # 6. 특정 라인 상태 조회
    if line_name and has_status:
        return _build_plan(
            "line_status",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope=time_scope,
            days=inferred_days,
            datasets=["recent_logs", "lines", "stats"],
        )

    # 7. 기본 범용 오버뷰 (분류되지 않은 질문)
    return _build_plan(
        "overview",
        raw_question,
        line_name=line_name,
        error_code=error_code,
        time_scope=time_scope,
        days=inferred_days,
        datasets=["summary", "recent_logs", "top_errors", "lines", "stats"],
    )

def build_default_manager_plan(days: int = 7, limit: int = 5) -> dict:
    return _build_plan(
        "overview",
        "",
        line_name=None,
        error_code=None,
        time_scope="recent",
        days=days,
        limit=limit,
        datasets=["summary", "recent_logs", "top_errors", "lines", "stats"],
    )