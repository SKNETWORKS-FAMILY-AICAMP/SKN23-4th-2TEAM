import json
import re
import time
from typing import Any

PROCESS_START = time.perf_counter()

from dotenv import load_dotenv

try:
    from .config import DEFAULT_BM25_WEIGHT, DEFAULT_VECTOR_WEIGHT, TECHNICAL_BM25_WEIGHT
    from .manager_planner import build_default_manager_plan, classify_manager_intent
    from .manager_repository import collect_manager_data
    from .prompts import MANAGER_ANSWER_PROMPT, MANAGER_AUTO_BRIEFING_PROMPT, TRANSLATE_GENERAL_PROMPT
except ImportError:
    from config import DEFAULT_BM25_WEIGHT, DEFAULT_VECTOR_WEIGHT, TECHNICAL_BM25_WEIGHT
    from manager_planner import build_default_manager_plan, classify_manager_intent
    from manager_repository import collect_manager_data
    from prompts import MANAGER_ANSWER_PROMPT, MANAGER_AUTO_BRIEFING_PROMPT, TRANSLATE_GENERAL_PROMPT

load_dotenv()

NO_MANUAL_CONTEXT = "\uad00\ub828 \ub9e4\ub274\uc5bc \ubb38\ub9e5 \uc5c6\uc74c"
MANUAL_LOOKUP_FAILED = "\uad00\ub828 \ub9e4\ub274\uc5bc \ubb38\ub9e5 \uc870\ud68c \uc2e4\ud328"
NO_MANAGER_DATA = "\uc870\ud68c \uacb0\uacfc \uc5c6\uc74c"
CASUAL_MANAGER_RESPONSES = {
    "ko": "\uc548\ub155\ud558\uc138\uc694. \uad00\ub9ac\uc790 \ud604\ud669, \ub77c\uc778 \uc0c1\ud0dc, \ucd5c\uadfc \ub85c\uadf8, \ud2b9\uc815 \uc5d0\ub7ec\ucf54\ub4dc \uc9c8\ubb38\uc744 \uc8fc\uc2dc\uba74 \ubc14\ub85c \ud655\uc778\ud574\ub4dc\ub9ac\uaca0\uc2b5\ub2c8\ub2e4.",
    "en": "Hello. Ask about manager status, line status, recent logs, or a specific error code and I will check it right away.",
}

def _get_plan_task(plan: dict) -> str:
    return str(plan.get("task") or plan.get("intent") or "overview")



# Return the current retrieval weight configuration.
def get_manager_retrieval_weights() -> dict:
    return {
        "vector_weight": DEFAULT_VECTOR_WEIGHT,
        "bm25_weight": DEFAULT_BM25_WEIGHT,
        "technical_bm25_weight": TECHNICAL_BM25_WEIGHT,
    }


# Import pipeline utilities only when manual retrieval is needed.
def _load_pipeline_utils():
    try:
        from .pipeline import make_context_from_docs
        from .retriever import get_hybrid_retriever, search_manual_exact
    except ImportError:
        from pipeline import make_context_from_docs
        from retriever import get_hybrid_retriever, search_manual_exact
    return make_context_from_docs, get_hybrid_retriever, search_manual_exact


# Build the LLM client for manager responses.
def _build_chat_llm():
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(model="gpt-4o-mini", temperature=0)


# Translate the final text only when a non-Korean language is requested.
def _translate_text(text: str, target_language: str) -> str:
    language = (target_language or "ko").strip().lower()
    if language == "ko":
        return text
    llm = _build_chat_llm()
    prompt = TRANSLATE_GENERAL_PROMPT.format(target_language=language, text=text)
    return llm.invoke(prompt).content.strip()


# Build a deterministic answer for today error count questions.
def _build_today_error_count_answer(collected_data: dict) -> str:
    stats = list(collected_data.get("stats") or [])
    if not stats:
        return "\uc624\ub298 \uc5d0\ub7ec \ud1b5\uacc4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    first_date = str(stats[0].get("occurred_at") or "")
    today_rows = [row for row in stats if str(row.get("occurred_at") or "") == first_date]
    if not today_rows:
        return "\uc624\ub298 \uc5d0\ub7ec \ud1b5\uacc4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    total_count = sum(int(row.get("error_count") or 0) for row in today_rows)
    line_parts = [f"{row.get('line_name')}\ub77c\uc778 {int(row.get('error_count') or 0)}\uac74" for row in today_rows]
    return f"\uc624\ub298 \ubc1c\uc0dd\ud55c \uc5d0\ub7ec\ub294 \ucd1d {total_count}\uac74\uc785\ub2c8\ub2e4. \ub77c\uc778\ubcc4\ub85c\ub294 " + ", ".join(line_parts) + "\uc785\ub2c8\ub2e4."


def _build_today_line_error_count_answer(plan: dict, collected_data: dict) -> str:
    line_name = str((plan.get("filters") or {}).get("line_name") or "").strip().upper()
    stats = list(collected_data.get("stats") or [])
    recent_logs = list(collected_data.get("recent_logs") or [])

    if not line_name:
        return "\ub77c\uc778\uba85 \uc815\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    grouped_rows: dict[str, list[dict]] = {}
    for row in stats:
        date_key = str(row.get("occurred_at") or "")
        grouped_rows.setdefault(date_key, []).append(row)

    ordered_dates = sorted(grouped_rows.keys(), reverse=True)
    target_date = ordered_dates[0] if ordered_dates else ""
    target_rows = grouped_rows.get(target_date, [])
    target_row = next((row for row in target_rows if str(row.get("line_name") or "").upper() == line_name), None)

    recent_log_date = ""
    if recent_logs:
        recent_log_date = str(recent_logs[0].get("occurred_at") or "").split(" ")[0]

    if target_row:
        total_count = int(target_row.get("error_count") or 0)
        answer = f"\uc624\ub298 {line_name}\ub77c\uc778\uc5d0\uc11c \ubc1c\uc0dd\ud55c \uc5d0\ub7ec\ub294 \ucd1d {total_count}\uac74\uc785\ub2c8\ub2e4."
    elif recent_logs:
        total_count = len(recent_logs)
        target_date = recent_log_date
        answer = f"\uc624\ub298 \uae30\uc900 \uc9d1\uacc4\uac00 \uc5c6\uc5b4 \ucd5c\uadfc \ub85c\uadf8 \uc77c\uc790\uc778 {target_date} \uae30\uc900\uc73c\ub85c {line_name}\ub77c\uc778 \uc5d0\ub7ec\ub294 \ucd1d {total_count}\uac74\uc785\ub2c8\ub2e4."
    else:
        return f"\ucd5c\uadfc \uc9d1\uacc4\uc77c \uae30\uc900\uc73c\ub85c\ub3c4 {line_name}\ub77c\uc778 \uc5d0\ub7ec \ud1b5\uacc4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    ongoing_count = sum(1 for row in recent_logs if str(row.get("final_status") or "").lower() == "ongoing")
    unresolved_count = sum(1 for row in recent_logs if str(row.get("final_status") or "").lower() == "unresolved")

    status_parts = []
    if ongoing_count:
        status_parts.append(f"ongoing {ongoing_count}\uac74")
    if unresolved_count:
        status_parts.append(f"unresolved {unresolved_count}\uac74")

    if status_parts:
        answer += " \ucd5c\uadfc \uc870\ud68c\ub41c \ub85c\uadf8 \uae30\uc900\uc73c\ub85c " + ", ".join(status_parts) + "\uc774 \ud655\uc778\ub429\ub2c8\ub2e4."
    return answer


def _build_error_list_answer(plan: dict, collected_data: dict) -> str:
    line_name = str((plan.get("filters") or {}).get("line_name") or "").strip().upper()
    time_scope = str((plan.get("filters") or {}).get("time_scope") or "recent").strip().lower()
    recent_logs = list(collected_data.get("recent_logs") or [])
    stats = list(collected_data.get("stats") or [])

    if not line_name:
        return "라인명 정보가 없습니다."
    if not recent_logs:
        if time_scope == "today":
            return f"오늘 {line_name}라인 오류 로그가 없습니다."
        if time_scope == "yesterday":
            return f"어제 {line_name}라인 오류 로그가 없습니다."
        return f"최근 {line_name}라인 오류 로그가 없습니다."

    dates: list[str] = []
    for row in stats:
        date_key = str(row.get("occurred_at") or "")
        if date_key and date_key not in dates:
            dates.append(date_key)

    target_date = ""
    if time_scope == "today" and dates:
        target_date = dates[0]
    elif time_scope == "yesterday" and len(dates) >= 2:
        target_date = dates[1]
    elif recent_logs:
        target_date = str(recent_logs[0].get("occurred_at") or "").split(" ")[0]

    filtered_logs = recent_logs
    if target_date:
        filtered_logs = [row for row in recent_logs if str(row.get("occurred_at") or "").split(" ")[0] == target_date]

    if not filtered_logs:
        if time_scope == "today":
            return f"오늘 {line_name}라인 오류 로그가 없습니다."
        if time_scope == "yesterday":
            return f"어제 {line_name}라인 오류 로그가 없습니다."
        return f"최근 {line_name}라인 오류 로그가 없습니다."

    error_codes: list[str] = []
    seen = set()
    for row in filtered_logs:
        code = str(row.get("error_code") or "").strip()
        if not code or code in seen:
            continue
        seen.add(code)
        error_codes.append(code)

    ongoing_count = sum(1 for row in filtered_logs if str(row.get("final_status") or "").lower() == "ongoing")
    unresolved_count = sum(1 for row in filtered_logs if str(row.get("final_status") or "").lower() == "unresolved")

    if time_scope == "today":
        lead = f"오늘 기준 {line_name}라인에서 확인된 오류는 "
    elif time_scope == "yesterday":
        lead = f"어제 기준 {line_name}라인에서 확인된 오류는 "
    else:
        lead = f"최근 로그 일자인 {target_date} 기준으로 {line_name}라인에서 확인된 오류는 "

    answer = lead + ", ".join(error_codes) + "입니다."

    status_parts = []
    if ongoing_count:
        status_parts.append(f"ongoing {ongoing_count}건")
    if unresolved_count:
        status_parts.append(f"unresolved {unresolved_count}건")
    if status_parts:
        answer += " 상태는 " + ", ".join(status_parts) + "입니다."
    return answer

def _build_line_list_answer(plan: dict, collected_data: dict) -> str:
    stats = list(collected_data.get("stats") or [])
    time_scope = str((plan.get("filters") or {}).get("time_scope") or "recent").strip().lower()
    if not stats:
        if time_scope == "today":
            return "\uc624\ub298 \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        if time_scope == "yesterday":
            return "\uc5b4\uc81c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        return "\uc870\ud68c\ub41c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    dates: list[str] = []
    for row in stats:
        date_key = str(row.get("occurred_at") or "")
        if date_key and date_key not in dates:
            dates.append(date_key)

    if not dates:
        return "\uc870\ud68c\ub41c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    if time_scope == "today":
        target_date = dates[0]
        no_data_message = "\uc624\ub298 \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        lead = "\uc624\ub298 \uc624\ub958\uac00 \ubc1c\uc0dd\ud55c \ub77c\uc778\uc740 "
    elif time_scope == "yesterday":
        if len(dates) < 2:
            return "\uc5b4\uc81c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        target_date = dates[1]
        no_data_message = "\uc5b4\uc81c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        lead = "\uc5b4\uc81c \uc624\ub958\uac00 \ubc1c\uc0dd\ud55c \ub77c\uc778\uc740 "
    else:
        target_date = dates[0]
        no_data_message = "\uc870\ud68c\ub41c \ub77c\uc778\ubcc4 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        lead = "\ucd5c\uadfc \uc624\ub958\uac00 \ubc1c\uc0dd\ud55c \ub77c\uc778\uc740 "

    target_rows = [row for row in stats if str(row.get("occurred_at") or "") == target_date]
    if not target_rows:
        return no_data_message

    parts = []
    for row in target_rows:
        line_name = str(row.get("line_name") or "").strip().upper()
        count = int(row.get("error_count") or 0)
        if not line_name:
            continue
        parts.append(f"{line_name}\ub77c\uc778 {count}\uac74")

    if not parts:
        return no_data_message

    return lead + ", ".join(parts) + "\uc785\ub2c8\ub2e4."


def _build_top_error_answer(collected_data: dict) -> str:
    top_errors = list(collected_data.get("top_errors") or [])
    if not top_errors:
        return "\uc870\ud68c\ub41c \uc0c1\uc704 \uc5d0\ub7ec \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    top_item = top_errors[0]
    parts = [f"{item.get('error_code')} {int(item.get('error_count') or 0)}\uac74" for item in top_errors[:5]]
    return (
        f"\uac00\uc7a5 \ub9ce\uc774 \ubc1c\uc0dd\ud55c \uc5d0\ub7ec\ub294 {top_item.get('error_code')}\uc774\uba70, "
        f"{int(top_item.get('error_count') or 0)}\uac74\uc785\ub2c8\ub2e4. "
        f"\uc0c1\uc704 \uc5d0\ub7ec\ub294 " + ", ".join(parts) + "\uc785\ub2c8\ub2e4."
    )


def _build_unresolved_list_answer(plan: dict, collected_data: dict) -> str:
    line_name = str((plan.get("filters") or {}).get("line_name") or "").strip().upper()
    recent_logs = list(collected_data.get("recent_logs") or [])
    lines = list(collected_data.get("lines") or [])

    if not recent_logs and not lines:
        if line_name:
            return f"{line_name}\ub77c\uc778\uc5d0\uc11c \uc870\ud68c\ub41c \ubbf8\ud574\uacb0 \uc7a5\uc560 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
        return "\uc870\ud68c\ub41c \ubbf8\ud574\uacb0 \uc7a5\uc560 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    device_parts = []
    seen = set()
    for row in lines:
        status = str(row.get("final_status") or "normal").lower()
        if status not in {"ongoing", "unresolved"}:
            continue
        device_id = str(row.get("device_id") or "").strip()
        error_code = str(row.get("error_code") or "").strip() or "-"
        key = (device_id, error_code, status)
        if key in seen:
            continue
        seen.add(key)
        device_parts.append(f"{device_id}({error_code}, {status})")

    log_count = len(recent_logs)
    if line_name:
        answer = f"{line_name}\ub77c\uc778\uc5d0\uc11c \ubbf8\ud574\uacb0 \ub610\ub294 \uc9c4\ud589 \uc911 \uc7a5\uc560 \ub85c\uadf8\ub294 \ucd5c\uadfc {log_count}\uac74 \uc870\ud68c\ub429\ub2c8\ub2e4."
    else:
        answer = f"\ubbf8\ud574\uacb0 \ub610\ub294 \uc9c4\ud589 \uc911 \uc7a5\uc560 \ub85c\uadf8\ub294 \ucd5c\uadfc {log_count}\uac74 \uc870\ud68c\ub429\ub2c8\ub2e4."
    if device_parts:
        answer += " \uc7a5\ube44 \uae30\uc900\uc73c\ub85c\ub294 " + ", ".join(device_parts[:5]) + "\uac00 \ud655\uc778\ub429\ub2c8\ub2e4."
    return answer


def _build_line_status_answer(plan: dict, collected_data: dict) -> str:
    line_name = str((plan.get("filters") or {}).get("line_name") or "").strip().upper()
    lines = list(collected_data.get("lines") or [])
    stats = list(collected_data.get("stats") or [])

    if not line_name:
        return "\ub77c\uc778\uba85 \uc815\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."
    if not lines:
        return f"{line_name}\ub77c\uc778\uc5d0\uc11c \uc870\ud68c\ub41c \uc0c1\ud0dc \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    status_counts = {"resolved": 0, "ongoing": 0, "unresolved": 0, "normal": 0}
    device_parts = []
    for row in lines:
        status = str(row.get("final_status") or "normal").lower()
        status_counts[status] = status_counts.get(status, 0) + 1
        device_id = str(row.get("device_id") or "").strip()
        error_code = str(row.get("error_code") or "").strip() or "-"
        device_parts.append(f"{device_id}({error_code}, {status})")

    latest_stat = stats[0] if stats else None
    answer = f"{line_name}\ub77c\uc778 \uc0c1\ud0dc\ub294 resolved {status_counts.get('resolved', 0)}\ub300, ongoing {status_counts.get('ongoing', 0)}\ub300, unresolved {status_counts.get('unresolved', 0)}\ub300\uc785\ub2c8\ub2e4."
    if latest_stat:
        answer += f" \ucd5c\uadfc \uc9d1\uacc4\uc77c {latest_stat.get('occurred_at')} \uae30\uc900 \uc5d0\ub7ec\ub294 {int(latest_stat.get('error_count') or 0)}\uac74\uc785\ub2c8\ub2e4."
    if device_parts:
        answer += " \uc7a5\ube44 \ud604\ud669\uc740 " + ", ".join(device_parts[:4]) + "\uc785\ub2c8\ub2e4."
    return answer


def _build_line_risk_answer(collected_data: dict) -> str:
    stats = list(collected_data.get("stats") or [])
    if not stats:
        return "\uc870\ud68c\ub41c \ub77c\uc778 \uc704\ud5d8\ub3c4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    line_totals: dict[str, int] = {}
    for row in stats:
        line_name = str(row.get("line_name") or "").strip().upper()
        if not line_name:
            continue
        line_totals[line_name] = line_totals.get(line_name, 0) + int(row.get("error_count") or 0)

    if not line_totals:
        return "\uc870\ud68c\ub41c \ub77c\uc778 \uc704\ud5d8\ub3c4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    ranked = sorted(line_totals.items(), key=lambda item: (-item[1], item[0]))
    top_line, top_count = ranked[0]
    parts = [f"{line}\ub77c\uc778 {count}\uac74" for line, count in ranked[:4]]
    return (
        f"\ucd5c\uadfc 7\uc77c \uae30\uc900 \ubc18\ubcf5 \uc5d0\ub7ec\uac00 \uac00\uc7a5 \ub9ce\uc740 \ub77c\uc778\uc740 {top_line}\ub77c\uc778\uc774\uba70, \ucd1d {top_count}\uac74\uc785\ub2c8\ub2e4. "
        f"\ub77c\uc778\ubcc4 \ub204\uc801 \uc5d0\ub7ec\ub294 " + ", ".join(parts) + "\uc785\ub2c8\ub2e4."
    )


def _summarize_manual_context(manual_context: str) -> str:
    text = str(manual_context or "").strip()
    if not text or text == NO_MANUAL_CONTEXT or text.startswith(MANUAL_LOOKUP_FAILED):
        return ""

    content_match = re.search(r"content:\s*(.+)", text, re.S)
    if not content_match:
        return ""

    content = content_match.group(1)
    content = re.split(r"\[??\s*\d+\]", content)[0]
    content = content.replace("<br>", " ")
    content = content.replace("|", " ")
    content = re.sub(r"\s+", " ", content).strip()
    return content[:220]


def _build_error_code_analysis_answer(plan: dict, collected_data: dict, manual_context: str) -> str:
    error_code = str((plan.get("filters") or {}).get("error_code") or "").strip().upper()
    if not error_code:
        return "\uc5d0\ub7ec\ucf54\ub4dc \uc815\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."

    top_errors = list(collected_data.get("top_errors") or [])
    recent_logs = list(collected_data.get("recent_logs") or [])
    stats = list(collected_data.get("stats") or [])

    error_count = None
    for item in top_errors:
        if str(item.get("error_code") or "").strip().upper() == error_code:
            error_count = int(item.get("error_count") or 0)
            break

    recent_count = sum(1 for row in recent_logs if str(row.get("error_code") or "").strip().upper() == error_code)
    ongoing_count = sum(
        1 for row in recent_logs
        if str(row.get("error_code") or "").strip().upper() == error_code
        and str(row.get("final_status") or "").lower() == "ongoing"
    )

    line_totals: dict[str, int] = {}
    for row in stats:
        line_name = str(row.get("line_name") or "").strip().upper()
        if not line_name:
            continue
        line_totals[line_name] = line_totals.get(line_name, 0) + int(row.get("error_count") or 0)

    parts = [f"{error_code} \uad00\ub828 \uc870\ud68c \uacb0\uacfc\uc785\ub2c8\ub2e4."]
    if error_count is not None:
        parts.append(f"\ucd5c\uadfc 7\uc77c \uae30\uc900 \ubc1c\uc0dd \ud69f\uc218\ub294 {error_count}\uac74\uc785\ub2c8\ub2e4.")
    elif recent_count:
        parts.append(f"\ucd5c\uadfc \uc870\ud68c \ub85c\uadf8 \uae30\uc900\uc73c\ub85c {recent_count}\uac74\uc774 \ud655\uc778\ub429\ub2c8\ub2e4.")
    else:
        parts.append("\uc870\ud68c\ub41c \ubc1c\uc0dd \uc774\ub825 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.")

    if ongoing_count:
        parts.append(f"\ucd5c\uadfc \ub85c\uadf8 \uae30\uc900 ongoing \uc0c1\ud0dc\ub294 {ongoing_count}\uac74\uc785\ub2c8\ub2e4.")

    if line_totals:
        top_line, top_line_count = sorted(line_totals.items(), key=lambda item: (-item[1], item[0]))[0]
        parts.append(f"\ucd5c\uadfc \uc9d1\uacc4 \uae30\uc900\uc73c\ub85c\ub294 {top_line}\ub77c\uc778\uc5d0\uc11c {top_line_count}\uac74\uc774 \ud655\uc778\ub429\ub2c8\ub2e4.")

    manual_summary = _summarize_manual_context(manual_context)
    if manual_summary:
        parts.append(f"\ub9e4\ub274\uc5bc \uae30\uc900 \uc694\uc57d: {manual_summary}")
    else:
        parts.append("\uad00\ub828 \ub9e4\ub274\uc5bc \uc694\uc57d\uc740 \uc870\ud68c\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.")

    return " ".join(parts)


def build_manager_data_context(data: dict[str, Any]) -> str:
    sections: list[str] = []
    for key in ["summary", "line_trends", "recent_logs", "top_errors", "lines", "stats"]:
        if key not in data:
            continue
        payload = data.get(key)
        sections.append(f"[{key}]")
        sections.append(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
        sections.append("")
    return "\n".join(sections).strip() or NO_MANAGER_DATA


# Build manual search queries from the query plan and collected data.
def _extract_manual_queries(plan: dict, collected_data: dict) -> list[str]:
    queries: list[str] = []
    for query in list(plan.get("manual_queries") or []):
        text = str(query).strip()
        if text:
            queries.append(text)

    for item in list(collected_data.get("top_errors") or [])[:3]:
        code = str((item or {}).get("error_code") or "").strip()
        if code:
            queries.append(code)

    deduped: list[str] = []
    seen = set()
    for query in queries:
        if query in seen:
            continue
        seen.add(query)
        deduped.append(query)
    return deduped[:5]


def _load_pipeline_utils():
    """
    RAG 파이프라인에서 제공하는 가공 함수 및 리트리버를 매니저 코어에서 동적 로딩합니다.
    (경로 로딩 분리용)
    """
    from core.pipeline import make_context_from_docs
    from core.retriever import get_hybrid_retriever, search_manual_exact, search_manual_exact_async
    return make_context_from_docs, get_hybrid_retriever, search_manual_exact, search_manual_exact_async



# Retrieve related manual context only when the plan or data suggests it.
async def retrieve_manager_manual_context(plan: dict, collected_data: dict) -> str:
    queries = _extract_manual_queries(plan, collected_data)
    if not queries:
        return NO_MANUAL_CONTEXT

    make_context_from_docs, get_hybrid_retriever, _, search_manual_exact_async = _load_pipeline_utils()

    docs = []
    seen = set()
    for query in queries:
        normalized_query = str(query or '').strip().upper()
        try:
            # 워커(비동기)용 API 호출과 구조 통일
            exact_docs = await search_manual_exact_async(normalized_query, k=2)
            hybrid_retriever = get_hybrid_retriever(
                query=normalized_query,
                vector_weight=DEFAULT_VECTOR_WEIGHT,
                bm25_weight=DEFAULT_BM25_WEIGHT,
                k=5,
            )
            # EnsembleRetriever 내부 Concurrency 교착 현상 우회용 sync invoke 적용
            hybrid_docs = hybrid_retriever.invoke(normalized_query)
            found_docs = [*exact_docs, *hybrid_docs]
        except Exception as exc:
            # 검색 실패 원인 bypass 하고 연계 탐색 진행
            continue

        for doc in found_docs:

            metadata = getattr(doc, "metadata", {}) or {}
            signature = (
                doc.page_content,
                tuple(sorted((str(key), str(value)) for key, value in metadata.items())),
            )
            if signature in seen:
                continue
            seen.add(signature)
            docs.append(doc)

    if not docs:
        return NO_MANUAL_CONTEXT
    return make_context_from_docs(docs[:4])


# Generate the final answer for a manager question.
async def answer_manager_question(question: str, language: str = "ko") -> dict:
    plan = classify_manager_intent(question)
    normalized_language = (language or "ko").strip().lower()

    task = _get_plan_task(plan)


    if task == "casual_chat":
        answer_text = CASUAL_MANAGER_RESPONSES.get(normalized_language, CASUAL_MANAGER_RESPONSES["ko"])
        return {
            "language": normalized_language,
            "question": question,
            "plan": plan,
            "collected_data": {},
            "manager_data_context": NO_MANAGER_DATA,
            "manual_context": NO_MANUAL_CONTEXT,
            "answer_text": answer_text,
        }

    collected_data = await collect_manager_data(plan)
    manager_data_context = build_manager_data_context(collected_data)


    if task == "error_count" and not (plan.get("filters") or {}).get("line_name"):
        answer_text = _build_today_error_count_answer(collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "error_count" and (plan.get("filters") or {}).get("line_name"):
        answer_text = _build_today_line_error_count_answer(plan, collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "error_list":
        answer_text = _build_error_list_answer(plan, collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "line_list":
        answer_text = _build_line_list_answer(plan, collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "top_error":
        answer_text = _build_top_error_answer(collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "unresolved_list":
        answer_text = _build_unresolved_list_answer(plan, collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "line_status":
        answer_text = _build_line_status_answer(plan, collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    elif task == "line_risk":
        answer_text = _build_line_risk_answer(collected_data)
        manual_context = NO_MANUAL_CONTEXT
        localized = _translate_text(answer_text, language)
    else:
        manual_context = await retrieve_manager_manual_context(plan, collected_data)
        llm = _build_chat_llm()
        prompt = MANAGER_ANSWER_PROMPT.format(

            question=question.strip(),
            query_plan=json.dumps(plan, ensure_ascii=False, indent=2),
            manager_data_context=manager_data_context,
            manual_context=manual_context,
        )
        try:
            answer_text = llm.invoke(prompt).content.strip()
        except Exception:
            if task == "error_code_analysis":
                answer_text = _build_error_code_analysis_answer(plan, collected_data, manual_context)
            else:
                raise
        localized = _translate_text(answer_text, language)

    return {
        "language": (language or "ko").strip().lower(),
        "question": question,
        "plan": plan,
        "collected_data": collected_data,
        "manager_data_context": manager_data_context,
        "manual_context": manual_context,
        "answer_text": localized,
    }


# Generate an automatic manager briefing without a user question.
async def generate_manager_briefing(language: str = "ko") -> dict:
    plan = build_default_manager_plan()
    collected_data = await collect_manager_data(plan)
    manager_data_context = build_manager_data_context(collected_data)
    manual_context = await retrieve_manager_manual_context(plan, collected_data)


    llm = _build_chat_llm()
    prompt = MANAGER_AUTO_BRIEFING_PROMPT.format(
        manager_data_context=manager_data_context,
        manual_context=manual_context,
    )
    briefing_text = llm.invoke(prompt).content.strip()
    localized = _translate_text(briefing_text, language)

    return {
        "language": (language or "ko").strip().lower(),
        "plan": plan,
        "collected_data": collected_data,
        "manager_data_context": manager_data_context,
        "manual_context": manual_context,
        "briefing_text": localized,
    }

if __name__ == "__main__":
    import sys
    from datetime import datetime

    started_at = datetime.now()
    print(f"[timing] started_at={started_at.isoformat(timespec='seconds')}")

    default_question = "\uc624\ub298 \uac00\uc7a5 \uc704\ud5d8\ud55c \ub77c\uc778\uc774 \uc5b4\ub514\uc57c?"
    question = sys.argv[1] if len(sys.argv) > 1 else default_question
    language = sys.argv[2] if len(sys.argv) > 2 else "ko"
    mode = sys.argv[3] if len(sys.argv) > 3 else "qa"

    print("\n[retrieval_weights]\n")
    print(json.dumps(get_manager_retrieval_weights(), ensure_ascii=False, indent=2))

    if mode == "briefing":
        result = generate_manager_briefing(language=language)
        print("\n[manager_plan]\n")
        print(json.dumps(result.get("plan", {}), ensure_ascii=False, indent=2))
        print("\n[collected_data]\n")
        print(json.dumps(result.get("collected_data", {}), ensure_ascii=False, indent=2, default=str))
        print("\n[manual_context]\n")
        print(result.get("manual_context", ""))
        print("\n[manager_briefing]\n")
        print(result.get("briefing_text", ""))
    else:
        result = answer_manager_question(question=question, language=language)
        print("\n[manager_plan]\n")
        print(json.dumps(result.get("plan", {}), ensure_ascii=False, indent=2))
        print("\n[collected_data]\n")
        print(json.dumps(result.get("collected_data", {}), ensure_ascii=False, indent=2, default=str))
        print("\n[manual_context]\n")
        print(result.get("manual_context", ""))
        print("\n[manager_answer]\n")
        print(result.get("answer_text", ""))

    finished_at = datetime.now()
    elapsed_seconds = time.perf_counter() - PROCESS_START
    print(f"\n[timing] finished_at={finished_at.isoformat(timespec='seconds')} elapsed_seconds={elapsed_seconds:.2f}")

