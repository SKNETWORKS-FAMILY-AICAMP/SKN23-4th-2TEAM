import re

ERROR_CODE_PATTERN = re.compile(r"\b([A-Z]\d{3,5})\b", re.IGNORECASE)

K_LINE = "\ub77c\uc778"
K_UNRESOLVED = [
    "\ubbf8\ud574\uacb0",
    "\ucc98\ub9ac \uc548 \ub41c",
    "\ucc98\ub9ac\uc548\ub41c",
    "\uc544\uc9c1",
    "\ucc98\ub9ac\uc911",
]
K_RISK = ["\uc704\ud5d8", "\uc6b0\uc120", "\ubb38\uc81c", "\ub9ac\uc2a4\ud06c"]
K_TOP = ["\ubc18\ubcf5", "\uc790\uc8fc", "\ub9ce\uc774", "top", "\ucd5c\ub2e4", "\uac00\uc7a5 \ub9ce\uc774"]
K_STATUS = ["\uc0c1\ud0dc", "\ud604\ud669", "\uc7a5\ube44", f"{K_LINE} \ud604\ud669", "\ubcf4\uc5ec\uc918"]
K_CAUSE = ["\uc65c", "\uc6d0\uc778", "\uc774\uc720", "\ubb34\uc2a8 \ubb38\uc81c"]
K_TODAY = ["\uc624\ub298", "today"]
K_YESTERDAY = ["\uc5b4\uc81c", "yesterday"]
K_COUNT = ["\uba87\uac74", "\uba87\uac1c", "\uba87 \uac1c", "\uac74\uc218", "count", "total"]
K_WHAT = ["\ubb50", "\ubb34\uc2a8", "\uc5b4\ub5a4", "\ub098\uc654", "\ubc1c\uc0dd\ud55c \uc624\ub958"]
K_ALL = ["\ub2e4", "\uc804\uccb4", "\ubaa8\ub450", "\uc804\ubd80", "\ubcf4\uc5ec\uc918", "\ub9d0\ud574\ubd10"]
K_OCCURRED = ["\ub0ac", "\ub0ac\ub358", "\ubc1c\uc0dd", "\uc0dd\uae34", "\uc5d0\ub7ec\uac00 \ub0ac", "\uc624\ub958\uac00 \ub0ac"]
K_CASUAL = [
    "\uc548\ub155",
    "\uc548\ub155\ud558\uc138\uc694",
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank you",
    "\uace0\ub9c8\uc6cc",
    "\uace0\ub9c8\uc6c0",
]


def is_casual_manager_chat(question: str) -> bool:
    normalized = str(question or "").strip().lower()
    if not normalized:
        return False
    return normalized in K_CASUAL


def extract_error_code(question: str) -> str | None:
    match = ERROR_CODE_PATTERN.search(str(question or "").upper())
    return match.group(1).upper() if match else None


def extract_line_name(question: str) -> str | None:
    text = str(question or "")
    line_match = re.search(r"([A-D])\s*" + K_LINE, text, re.IGNORECASE)
    if line_match:
        return line_match.group(1).upper()
    line_match = re.search(r"line\s*([A-D])", text, re.IGNORECASE)
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
    has_unresolved = _has_any(normalized, K_UNRESOLVED + ["ongoing", "unresolved"])
    has_risk = _has_any(normalized, K_RISK)
    has_top = _has_any(normalized, K_TOP)
    has_status = _has_any(normalized, K_STATUS)
    has_cause = _has_any(normalized, K_CAUSE)

    if line_name and has_today and has_count:
        return _build_plan(
            "error_count",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope="today",
            days=1,
            datasets=["stats", "recent_logs", "lines"],
        )

    if has_today and has_count:
        return _build_plan(
            "error_count",
            raw_question,
            line_name=None,
            error_code=None,
            time_scope="today",
            days=1,
            datasets=["stats"],
        )

    if line_name and (has_today or has_yesterday or has_what or has_occurred):
        time_scope = "today" if has_today else "yesterday" if has_yesterday else "recent"
        return _build_plan(
            "error_list",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope=time_scope,
            days=1 if has_today else 2 if has_yesterday else 7,
            datasets=["recent_logs", "lines", "stats"],
        )

    if (has_today or has_yesterday) and K_LINE in normalized and (has_all or has_what or has_occurred):
        time_scope = "today" if has_today else "yesterday"
        return _build_plan(
            "line_list",
            raw_question,
            line_name=None,
            error_code=None,
            time_scope=time_scope,
            days=1 if has_today else 2,
            datasets=["stats"],
        )

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

    if error_code and (has_cause or has_top):
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

    if line_name and (has_risk or has_status):
        return _build_plan(
            "line_status",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope="recent",
            days=7,
            datasets=["recent_logs", "lines", "stats"],
        )

    if has_risk:
        return _build_plan(
            "line_risk",
            raw_question,
            line_name=None,
            error_code=None,
            time_scope="recent",
            days=7,
            datasets=["summary", "recent_logs", "top_errors", "lines", "stats"],
        )

    if has_top and K_LINE in normalized:
        return _build_plan(
            "line_risk",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope="recent",
            days=7,
            datasets=["summary", "recent_logs", "top_errors", "lines", "stats"],
        )

    if has_top:
        return _build_plan(
            "top_error",
            raw_question,
            line_name=line_name,
            error_code=None,
            time_scope="recent",
            days=7,
            datasets=["top_errors", "stats", "recent_logs"],
        )

    if has_status:
        return _build_plan(
            "overview",
            raw_question,
            line_name=line_name,
            error_code=error_code,
            time_scope="recent",
            days=7,
            datasets=["summary", "recent_logs", "lines"],
        )

    return _build_plan(
        "overview",
        raw_question,
        line_name=line_name,
        error_code=error_code,
        time_scope="recent",
        days=7,
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
