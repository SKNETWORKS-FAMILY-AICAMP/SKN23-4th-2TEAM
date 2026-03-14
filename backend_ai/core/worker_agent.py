import json
import os
import re
import sys
import time
from datetime import datetime

from dotenv import load_dotenv

try:
    from .pipeline import make_context_from_docs, search_manual_with_ranking
    from .prompts import CHECKLIST_PROMPT, FINAL_SOLUTION_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT, UNIFIED_DIAGNOSIS_PROMPT
except ImportError:
    from pipeline import make_context_from_docs, search_manual_with_ranking
    from prompts import CHECKLIST_PROMPT, FINAL_SOLUTION_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT, UNIFIED_DIAGNOSIS_PROMPT

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

LABELS = {
    'ko': {
        'result': '\uc5d0\ub7ec\ucf54\ub4dc \ubd84\uc11d \uacb0\uacfc',
        'cause': '\uc6d0\uc778 \ubd84\uc11d',
        'actions': '\uc870\uce58 \ubc29\ubc95',
        'urgency': '\uae34\uae09\ub3c4',
        'expected_time': '\uc608\uc0c1 \uc870\uce58 \uc2dc\uac04',
        'checklist': '\ucd94\uac00 \uc9c4\ub2e8 \uccb4\ud06c\ub9ac\uc2a4\ud2b8',
        'final_solution': '\ucd5c\uc885 \uc885\ud569 \ud310\ub2e8',
        'handling_direction': '\ucc98\ub9ac \ubc29\ud5a5',
        'work_priority': '\uc791\uc5c5 \uc6b0\uc120\uc21c\uc704',
        'default_cause': '\ubb38\uc11c \uae30\uc900 \uc0c1\uc138 \uc6d0\uc778 \ud655\uc778 \ud544\uc694',
        'default_action': '\ubb38\uc11c \uae30\uc900 \uc6b0\uc120 \ud655\uc778 \ud544\uc694',
        'default_urgency_level': '\ubcf4\ud1b5',
        'default_urgency_text': '\ubb38\uc11c \uae30\uc900 \uc6b0\uc120 \ud655\uc778 \ud544\uc694',
        'default_expected_time': '\ubb38\uc11c \uae30\uc900 \uc6b0\uc120 \ud655\uc778 \ud544\uc694',
        'default_checklist_item': '\uad00\ub828 \uc804\uc6d0, \ubc30\uc120, \ubcf4\ub4dc \uc0c1\ud0dc\ub97c \uc21c\uc11c\ub300\ub85c \uc810\uac80\ud558\uc2ed\uc2dc\uc624.',
        'default_final_summary': '\uccb4\ud06c\ub9ac\uc2a4\ud2b8\uc640 \uc9c4\ub2e8 \uacb0\uacfc\ub97c \uc885\ud569\ud574 \uc6d0\uc778 \ud655\uc815\uc744 \uc6b0\uc120\ud574\uc57c \ud569\ub2c8\ub2e4.',
        'default_handling_direction': '\uc810\uac80 \uacb0\uacfc\uc5d0 \ub530\ub77c \ud6c4\uc18d \uc870\uce58 \ubc29\ud5a5\uc744 \uacb0\uc815\ud558\uc2ed\uc2dc\uc624.',
        'default_work_priority': '\ud604\uc7ac\ub294 \uc815\uc0c1 \ubcf5\uadc0\ubcf4\ub2e4 \uc6d0\uc778 \ud655\uc815\uc774 \uc6b0\uc120\uc785\ub2c8\ub2e4.',
        'status_checked': '\uccb4\ud06c\ud568',
        'status_unchecked': '\uccb4\ud06c\uc548\ud568',
        'status_normal': '\uc815\uc0c1',
        'status_issue': '\uc774\uc0c1',
        'none': '\uc5c6\uc74c',
    },
    'en': {
        'result': 'Error Code Analysis',
        'cause': 'Cause Analysis',
        'actions': 'Action Steps',
        'urgency': 'Urgency',
        'expected_time': 'Estimated Action Time',
        'checklist': 'Additional Diagnostic Checklist',
        'final_solution': 'Final Combined Judgment',
        'handling_direction': 'Handling Direction',
        'work_priority': 'Work Priority',
        'default_cause': 'Refer to the manual for the detailed cause.',
        'default_action': 'Check the manual first.',
        'default_urgency_level': 'medium',
        'default_urgency_text': 'Manual-based verification is required.',
        'default_expected_time': 'Check the manual first.',
        'default_checklist_item': 'Inspect the related power, wiring, and board status in sequence.',
        'default_final_summary': 'Prioritize confirming the cause based on the diagnosis and checklist.',
        'default_handling_direction': 'Decide the next handling path based on the inspection results.',
        'default_work_priority': 'Cause confirmation takes priority over normal recovery at this stage.',
        'status_checked': 'checked',
        'status_unchecked': 'unchecked',
        'status_normal': 'normal',
        'status_issue': 'issue',
        'none': 'none',
    },
}

URGENCY_LEVEL_MAP = {
    'ko': {'\ub192\uc74c': '\ub192\uc74c', '\ubcf4\ud1b5': '\ubcf4\ud1b5', '\ub0ae\uc74c': '\ub0ae\uc74c'},
    'en': {'\ub192\uc74c': 'high', '\ubcf4\ud1b5': 'medium', '\ub0ae\uc74c': 'low', 'high': 'high', 'medium': 'medium', 'low': 'low'},
}

CHECK_STATUSES = {'unchecked', 'checked', 'normal', 'issue'}


def _build_chat_llm():
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model='gpt-4o-mini', temperature=0)


def _call_json_llm(prompt: str, fallback: dict) -> dict:
    llm = _build_chat_llm()
    response = llm.invoke(prompt)
    content = response.content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return fallback


def _labels_for(language: str) -> dict:
    return LABELS.get((language or 'ko').strip().lower(), LABELS['ko'])


def _normalize_action_lines(action_value, language: str = 'ko') -> list[str]:
    default_action = _labels_for(language)['default_action']
    if isinstance(action_value, list):
        items = [str(item).strip() for item in action_value if str(item).strip()]
    else:
        raw = str(action_value or '').strip()
        items = [line.strip('- ?\n ') for line in raw.splitlines() if line.strip()]
    return items or [default_action]


def _normalize_check_status(status_value) -> str:
    if isinstance(status_value, bool):
        return 'checked' if status_value else 'unchecked'
    normalized = str(status_value or 'unchecked').strip().lower()
    if normalized in {'y', 'yes', 'true', '1', 'checked', 'check', 'normal', 'issue'}:
        return 'checked'
    if normalized in {'n', 'no', 'false', '0', 'unchecked', 'uncheck'}:
        return 'unchecked'
    return normalized if normalized in CHECK_STATUSES else 'unchecked'


def _build_checklist_entry(index: int, item_text: str, status: str = 'unchecked') -> dict:
    return {
        'id': f'check_{index}',
        'item': item_text,
        'status': _normalize_check_status(status),
    }


def _normalize_checklist_entries(entries_value, language: str = 'ko') -> list[dict]:
    labels = _labels_for(language)
    default_item = labels['default_checklist_item']
    entries: list[dict] = []
    if isinstance(entries_value, list):
        for idx, entry in enumerate(entries_value, start=1):
            if isinstance(entry, dict):
                item_text = str(entry.get('item') or '').strip()
                if not item_text:
                    continue
                entry_id = str(entry.get('id') or f'check_{idx}').strip() or f'check_{idx}'
                entries.append({
                    'id': entry_id,
                    'item': item_text,
                    'status': _normalize_check_status(entry.get('status')),
                })
            else:
                item_text = str(entry).strip()
                if item_text:
                    entries.append(_build_checklist_entry(idx, item_text))
    if not entries:
        entries = [_build_checklist_entry(1, default_item)]
    while len(entries) < 5:
        entries.append(_build_checklist_entry(len(entries) + 1, default_item))
    normalized_entries = []
    for idx, entry in enumerate(entries[:5], start=1):
        normalized_entries.append({
            'id': str(entry.get('id') or f'check_{idx}').strip() or f'check_{idx}',
            'item': str(entry.get('item') or default_item).strip() or default_item,
            'status': _normalize_check_status(entry.get('status')),
        })
    return normalized_entries


def _normalize_handling_directions(direction_value, language: str = 'ko') -> list[str]:
    default_direction = _labels_for(language)['default_handling_direction']
    if isinstance(direction_value, list):
        items = [str(item).strip() for item in direction_value if str(item).strip()]
    else:
        raw = str(direction_value or '').strip()
        items = [line.strip('- ?\n ') for line in raw.splitlines() if line.strip()]
    if not items:
        items = [default_direction]
    if len(items) < 2:
        items.extend([default_direction] * (2 - len(items)))
    return items[:2]


def _serialize_checklist_results(entries: list[dict], language: str = 'ko') -> dict:
    labels = _labels_for(language)
    status_map = {
        'checked': labels['status_checked'],
        'unchecked': labels['status_unchecked'],
        'normal': labels['status_checked'],
        'issue': labels['status_checked'],
    }
    result_lines = [f"- {entry['item']}: {status_map.get(entry['status'], entry['status'])}" for entry in entries]
    unchecked_items = [entry['item'] for entry in entries if entry['status'] == 'unchecked']
    checked_items = [entry['item'] for entry in entries if entry['status'] != 'unchecked']
    none_text = labels['none']
    return {
        'checklist_results_text': '\n'.join(result_lines) if result_lines else none_text,
        'unchecked_items_text': '\n'.join(f'- {item}' for item in unchecked_items) if unchecked_items else none_text,
        'checked_items_text': '\n'.join(f'- {item}' for item in checked_items) if checked_items else none_text,
        'issue_items_text': none_text,
    }


def _clean_manual_text(value: str) -> str:
    text = str(value or '')
    text = re.sub(r'<br\s*/?>', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace('\n', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _extract_manual_row(error_code: str, manual_context: str) -> dict | None:
    pattern = re.compile(rf'^\|\s*{re.escape(error_code.strip().upper())}\s*\|', re.IGNORECASE)
    for raw_line in str(manual_context or '').splitlines():
        line = raw_line.strip()
        if not pattern.match(line):
            continue
        parts = [part.strip() for part in line.split('|')[1:-1]]
        if len(parts) < 4:
            continue
        code, title, cause, action = parts[:4]
        return {
            'code': code.strip().upper(),
            'title': _clean_manual_text(title),
            'cause': _clean_manual_text(cause),
            'action': _clean_manual_text(action),
        }
    return None


def _build_diagnosis_from_manual_row(error_code: str, manual_context: str) -> dict | None:
    row = _extract_manual_row(error_code, manual_context)
    if not row:
        return None

    cause_parts = [part for part in [row['title'], row['cause']] if part]
    cause_analysis = '. '.join(cause_parts).strip()
    action_line = row['action'] or LABELS['ko']['default_action']
    urgency_level, urgency_text = _rule_based_urgency(
        cause_analysis,
        [action_line],
        LABELS['ko']['default_urgency_level'],
        LABELS['ko']['default_urgency_text'],
    )
    return {
        'cause_analysis': cause_analysis or LABELS['ko']['default_cause'],
        'action_method': [action_line],
        'urgency_level': urgency_level,
        'urgency_text': urgency_text,
        'expected_action_time': '\ud604\uc7a5 1\ucc28 \uc810\uac80 \ud6c4 \ud310\ub2e8',
        'matched': True,
    }


def _build_rule_based_checklist(diagnosis_payload: dict) -> list[str]:
    source_text = ' '.join([
        str(diagnosis_payload.get('cause_analysis') or ''),
        ' '.join(_normalize_action_lines(diagnosis_payload.get('action_method'), language='ko')),
    ])

    items: list[str] = []

    def add(item: str):
        if item and item not in items:
            items.append(item)

    if any(keyword in source_text for keyword in ['??', 'PN??']):
        add('제어기 외부 및 내부 전원 연결 상태를 확인하십시오.')
    if any(keyword in source_text for keyword in ['??', '???']):
        add('관련 배선 및 커넥터 체결 상태를 확인하십시오.')
    if any(keyword in source_text for keyword in ['?? ??', 'AMP', '??']):
        add('서보 앰프 상태 이상 여부를 점검하십시오.')
    if any(keyword in source_text for keyword in ['F1', 'F2', '??']):
        add('F1/F2 퓨즈 단선 여부를 확인하십시오.')
    if any(keyword in source_text for keyword in ['????', '???', '???']):
        add('전원 입력부 이상 흔적과 전압 상태를 확인하십시오.')

    add('동일 에러가 재현되는지 안전하게 확인하십시오.')
    add('점검 후에도 지속되면 상위 지원 절차를 진행하십시오.')

    default_items = [
        '관련 전원 연결 상태를 먼저 확인하십시오.',
        '관련 배선 및 커넥터 체결 상태를 확인하십시오.',
        '보드 또는 앰프 상태 이상 여부를 점검하십시오.',
        '동일 에러가 재현되는지 안전하게 확인하십시오.',
        '점검 후에도 지속되면 상위 지원 절차를 진행하십시오.',
    ]
    for item in default_items:
        add(item)

    return items[:5]


def _diagnose_error_code(error_code: str, manual_context: str) -> dict:
    manual_payload = _build_diagnosis_from_manual_row(error_code, manual_context)
    if manual_payload:
        return manual_payload

    prompt = UNIFIED_DIAGNOSIS_PROMPT.format(error_code=error_code, manual_context=manual_context)
    fallback = {
        'cause_analysis': LABELS['ko']['default_cause'],
        'action_method': [LABELS['ko']['default_action']],
        'urgency_level': LABELS['ko']['default_urgency_level'],
        'urgency_text': LABELS['ko']['default_urgency_text'],
        'expected_action_time': LABELS['ko']['default_expected_time'],
        'matched': False,
    }
    payload = _call_json_llm(prompt, fallback)
    payload.setdefault('cause_analysis', fallback['cause_analysis'])
    payload['action_method'] = _normalize_action_lines(payload.get('action_method'), language='ko')
    payload.setdefault('urgency_level', fallback['urgency_level'])
    payload.setdefault('urgency_text', fallback['urgency_text'])
    payload.setdefault('expected_action_time', fallback['expected_action_time'])
    payload.setdefault('matched', False)
    return payload


def _generate_checklist_payload(error_code: str, diagnosis_payload: dict) -> dict:
    rule_based_items = _build_rule_based_checklist(diagnosis_payload)
    prompt = CHECKLIST_PROMPT.format(
        error_code=error_code,
        cause_analysis=diagnosis_payload['cause_analysis'],
        action_method='\n'.join(f'- {item}' for item in diagnosis_payload['action_method']),
        urgency_text=diagnosis_payload['urgency_text'],
    )
    fallback = {'checklist_items': rule_based_items}
    payload = _call_json_llm(prompt, fallback)
    items = _normalize_checklist_entries(payload.get('checklist_items'), language='ko')

    joined_items = ' '.join(entry['item'] for entry in items)
    if any(bad in joined_items for bad in ['AI', '??', '??? ??', '?? ??', '?? ??', '???']):
        items = _normalize_checklist_entries(rule_based_items, language='ko')

    return {
        'error_code': error_code,
        'checklist_items': items,
    }


def _summarize_items_for_text(items: list[str], language: str = 'ko') -> str:
    labels = _labels_for(language)
    if not items:
        return labels['none']
    trimmed = [str(item).strip().rstrip('.') for item in items if str(item).strip()]
    if not trimmed:
        return labels['none']
    if len(trimmed) == 1:
        return trimmed[0]
    if len(trimmed) == 2:
        return f"{trimmed[0]}, {trimmed[1]}"
    return f"{trimmed[0]}, {trimmed[1]} 외 {len(trimmed) - 2}개"


def _simplify_cause_summary(cause: str) -> str:
    text = str(cause or '').strip().rstrip('.')
    if '. ' in text:
        return text.split('. ', 1)[0].strip()
    return text


def _build_final_solution_fallback(error_code: str, diagnosis_payload: dict, checklist_entries: list[dict], language: str = 'ko') -> dict:
    labels = _labels_for(language)
    checked_items = [entry['item'] for entry in checklist_entries if entry['status'] != 'unchecked']
    unchecked_items = [entry['item'] for entry in checklist_entries if entry['status'] == 'unchecked']
    checked_summary = _summarize_items_for_text(checked_items, language=language)
    unchecked_summary = _summarize_items_for_text(unchecked_items, language=language)
    cause = _simplify_cause_summary(diagnosis_payload.get('cause_analysis') or labels['default_cause'])

    if language == 'ko':
        if checked_items and unchecked_items:
            return {
                'final_summary': f"{error_code}는 {cause} 상황으로 보이며, 체크리스트 기준 일부 항목은 확인되었지만 체크하지 않은 항목도 남아 있어 원인 확정 전 단계입니다.",
                'handling_direction': [
                    f"체크한 항목({checked_summary}) 기준으로 현재 상태를 정리하고, 체크하지 않은 항목({unchecked_summary})을 추가 확인한 뒤 처리 방향을 결정하십시오.",
                    "체크하지 않은 항목 점검 후에도 동일 증상이 재발하면 현장 조치만으로 종료하지 말고 상위 지원 여부를 검토하십시오.",
                ],
                'work_priority': "현재는 체크하지 않은 항목 확인을 통해 원인 확정 근거를 보강하는 것이 우선입니다.",
            }
        if checked_items:
            return {
                'final_summary': f"{error_code}는 {cause} 상황으로 보이며, 체크리스트 기준 1차 점검은 완료되어 후속 판단 단계로 볼 수 있습니다.",
                'handling_direction': [
                    f"체크한 항목({checked_summary})을 기준으로 전원부와 관련 부품 상태를 다시 정리하십시오.",
                    "동일 증상이 재발하면 재가동만으로 종료하지 말고 원인 분석 또는 상위 지원 검토로 진행하십시오.",
                ],
                'work_priority': "현재는 1차 점검 결과를 바탕으로 재발 여부와 후속 조치를 판단하는 것이 우선입니다.",
            }
        return {
            'final_summary': f"{error_code}는 {cause} 상황으로 보이며, 체크리스트 기준 체크하지 않은 항목이 남아 있어 아직 원인 확정 전 단계입니다.",
            'handling_direction': [
                f"체크하지 않은 항목({unchecked_summary})을 우선 확인하여 원인 후보를 좁히십시오.",
                "체크하지 않은 항목 점검 후에도 동일 증상이 재발하면 상위 지원 여부를 검토하십시오.",
            ],
            'work_priority': "현재는 체크하지 않은 항목 확인을 통해 원인 확정 근거를 보강하는 것이 우선입니다.",
        }

    return {
        'final_summary': labels['default_final_summary'],
        'handling_direction': [labels['default_handling_direction'], labels['default_handling_direction']],
        'work_priority': labels['default_work_priority'],
    }


def _is_generic_final_solution_payload(payload: dict, language: str = 'ko') -> bool:
    final_summary = str(payload.get('final_summary') or '').strip()
    handling_direction = _normalize_handling_directions(payload.get('handling_direction'), language=language)
    work_priority = str(payload.get('work_priority') or '').strip()
    generic_markers = {
        _labels_for(language)['default_final_summary'],
        _labels_for(language)['default_handling_direction'],
        _labels_for(language)['default_work_priority'],
    }
    too_short = len(final_summary) < 30 or len(work_priority) < 10
    vague_direction = any(len(item) < 18 for item in handling_direction)
    missing_status_context = not any(keyword in ' '.join([final_summary, *handling_direction, work_priority]) for keyword in ['체크', '원인', '재발', '상위 지원'])
    return (
        final_summary in generic_markers
        or work_priority in generic_markers
        or all(item in generic_markers for item in handling_direction)
        or too_short
        or vague_direction
        or missing_status_context
    )


def _generate_final_solution_payload(error_code: str, diagnosis_payload: dict, checklist_payload: dict) -> dict:
    checklist_entries = _normalize_checklist_entries(checklist_payload.get('checklist_items'), language='ko')
    summary = _serialize_checklist_results(checklist_entries, language='ko')
    _ = FINAL_SOLUTION_PROMPT.format(
        error_code=error_code,
        cause_analysis=diagnosis_payload['cause_analysis'],
        action_method='\n'.join(f'- {item}' for item in diagnosis_payload['action_method']),
        urgency_text=diagnosis_payload['urgency_text'],
        checklist_results=summary['checklist_results_text'],
        unchecked_items=summary['unchecked_items_text'],
        checked_items=summary['checked_items_text'],
    )
    return _build_final_solution_fallback(error_code, diagnosis_payload, checklist_entries, language='ko')


def _rule_based_urgency(cause: str, actions: list[str], llm_level: str, llm_text: str) -> tuple[str, str]:
    combined = ' '.join([cause, *actions]).lower()
    high_keywords = ['\uacfc\uc5f4', '\uc628\ub3c4 \uc2a4\uc704\uce58', '\ud654\uc7ac', '\ubc1c\ud654', '\uc5f0\uc18c', '\ubd88\uaf43', '\ud3ed\ubc1c', '\uac10\uc804', '\uacfc\uc804\ub958', '\ub2e8\uc120', '\uc570\ud504', '\uc11c\uc9c0\uc804\uc555', '\uc804\uc6d0 \uc774\uc0c1', '\uc1fc\ud2b8', '\ud569\uc120', 'overheat', 'overheating', 'fire', 'flame', 'smoke', 'burn', 'overcurrent', 'short', 'surge', 'amp']
    low_keywords = ['\uc124\uc815', '\uc7ac\uc124\uc815', '\ud30c\ub77c\ubbf8\ud130', '\uc870\uc815', '\uc7ac\uc2dc\ub3c4', 'setting', 'reset', 'parameter', 'adjust', 'retry']
    if any(keyword in combined for keyword in high_keywords):
        return '\ub192\uc74c', '\uacfc\uc5f4 \ub610\ub294 \uc804\uae30\uc801 \uc704\ud5d8 \uac00\ub2a5\uc131\uc774 \uc788\uc5b4 \uc989\uac01\uc801\uc778 \uc810\uac80\uacfc \uc870\uce58\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.'
    if any(keyword in combined for keyword in low_keywords):
        return '\ub0ae\uc74c', '\uc124\uc815 \ub610\ub294 \uc0c1\ud0dc \uc870\uc815 \uc911\uc2ec\uc758 \uc870\uce58\ub85c \ub300\uc751 \uac00\ub2a5\ud55c \uc218\uc900\uc785\ub2c8\ub2e4.'
    normalized = llm_level.strip()
    if normalized not in {'\ub192\uc74c', '\ubcf4\ud1b5', '\ub0ae\uc74c'}:
        normalized = '\ubcf4\ud1b5'
    return normalized, llm_text.strip() or LABELS['ko']['default_urgency_text']


def _normalize_urgency_level(level: str, language: str) -> str:
    mapping = URGENCY_LEVEL_MAP.get(language, URGENCY_LEVEL_MAP['ko'])
    normalized = str(level or '').strip().lower()
    if language == 'ko':
        if normalized in {'high', 'medium', 'low'}:
            return {'high': '\ub192\uc74c', 'medium': '\ubcf4\ud1b5', 'low': '\ub0ae\uc74c'}[normalized]
        return str(level or LABELS['ko']['default_urgency_level']).strip()
    return mapping.get(str(level or '').strip(), mapping.get(normalized, LABELS['en']['default_urgency_level']))


def _format_urgency(level: str, text: str, language: str = 'ko') -> str:
    normalized = _normalize_urgency_level(level, language)
    if normalized in {'\ub192\uc74c', 'high'}:
        icon = '\U0001F534'
    elif normalized in {'\ub0ae\uc74c', 'low'}:
        icon = '\U0001F7E2'
    else:
        normalized = '\ubcf4\ud1b5' if language == 'ko' else 'medium'
        icon = '\U0001F7E1'
    return f'{icon} {normalized} - {text.strip()}'


def translate_worker_payload(payload: dict, language: str = 'ko') -> dict:
    target_language = (language or 'ko').strip().lower()
    if target_language == 'ko':
        translated = dict(payload)
        translated['action_method'] = _normalize_action_lines(payload.get('action_method'), language='ko')
        translated['checklist_items'] = _normalize_checklist_entries(payload.get('checklist_items'), language='ko')
        translated['handling_direction'] = _normalize_handling_directions(payload.get('handling_direction'), language='ko')
        translated['work_priority'] = str(payload.get('work_priority') or _labels_for('ko')['default_work_priority']).strip()
        return translated

    fallback = {
        'cause_analysis': str(payload.get('cause_analysis') or _labels_for(target_language)['default_cause']).strip(),
        'action_method': _normalize_action_lines(payload.get('action_method'), language=target_language),
        'urgency_level': _normalize_urgency_level(payload.get('urgency_level'), target_language),
        'urgency_text': str(payload.get('urgency_text') or _labels_for(target_language)['default_urgency_text']).strip(),
        'expected_action_time': str(payload.get('expected_action_time') or _labels_for(target_language)['default_expected_time']).strip(),
        'checklist_items': _normalize_checklist_entries(payload.get('checklist_items'), language=target_language),
        'final_summary': str(payload.get('final_summary') or _labels_for(target_language)['default_final_summary']).strip(),
        'handling_direction': _normalize_handling_directions(payload.get('handling_direction'), language=target_language),
        'work_priority': str(payload.get('work_priority') or _labels_for(target_language)['default_work_priority']).strip(),
    }
    prompt = TRANSLATE_WORKER_PAYLOAD_PROMPT.format(
        target_language=target_language,
        payload_json=json.dumps({
            'cause_analysis': payload.get('cause_analysis', ''),
            'action_method': _normalize_action_lines(payload.get('action_method'), language='ko'),
            'urgency_level': payload.get('urgency_level', ''),
            'urgency_text': payload.get('urgency_text', ''),
            'expected_action_time': payload.get('expected_action_time', ''),
            'checklist_items': _normalize_checklist_entries(payload.get('checklist_items'), language='ko'),
            'final_summary': payload.get('final_summary', ''),
            'handling_direction': _normalize_handling_directions(payload.get('handling_direction'), language='ko'),
            'work_priority': payload.get('work_priority', ''),
        }, ensure_ascii=False),
    )
    translated = _call_json_llm(prompt, fallback)
    translated.setdefault('cause_analysis', fallback['cause_analysis'])
    translated['action_method'] = _normalize_action_lines(translated.get('action_method'), language=target_language)
    translated['urgency_level'] = _normalize_urgency_level(translated.get('urgency_level'), target_language)
    translated.setdefault('urgency_text', fallback['urgency_text'])
    translated.setdefault('expected_action_time', fallback['expected_action_time'])
    translated['checklist_items'] = _normalize_checklist_entries(translated.get('checklist_items'), language=target_language)
    translated.setdefault('final_summary', fallback['final_summary'])
    translated['handling_direction'] = _normalize_handling_directions(translated.get('handling_direction'), language=target_language)
    translated.setdefault('work_priority', fallback['work_priority'])
    merged = dict(payload)
    merged.update(translated)
    return merged


def build_checklist_payload(diagnosis_payload: dict, language: str | None = None) -> dict:
    target_language = (language or diagnosis_payload.get('language') or 'ko').strip().lower()
    return {
        'error_code': diagnosis_payload.get('error_code', ''),
        'language': target_language,
        'checklist_items': _normalize_checklist_entries(diagnosis_payload.get('checklist_items'), language=target_language),
    }


def build_final_solution_payload(solution_payload: dict, language: str | None = None) -> dict:
    target_language = (language or solution_payload.get('language') or 'ko').strip().lower()
    labels = _labels_for(target_language)
    return {
        'error_code': solution_payload.get('error_code', ''),
        'language': target_language,
        'final_summary': str(solution_payload.get('final_summary') or labels['default_final_summary']).strip(),
        'handling_direction': _normalize_handling_directions(solution_payload.get('handling_direction'), language=target_language),
        'work_priority': str(solution_payload.get('work_priority') or labels['default_work_priority']).strip(),
    }


def format_worker_response(error_code: str, payload: dict, language: str = 'ko') -> str:
    target_language = (language or 'ko').strip().lower()
    labels = _labels_for(target_language)
    cause = str(payload.get('cause_analysis') or labels['default_cause']).strip()
    urgency_level = str(payload.get('urgency_level') or labels['default_urgency_level']).strip()
    urgency_text = str(payload.get('urgency_text') or labels['default_urgency_text']).strip()
    expected_time = str(payload.get('expected_action_time') or labels['default_expected_time']).strip()
    action_lines = _normalize_action_lines(payload.get('action_method'), language=target_language)
    checklist_entries = _normalize_checklist_entries(payload.get('checklist_items'), language=target_language)
    final_summary = str(payload.get('final_summary') or labels['default_final_summary']).strip()
    handling_direction = _normalize_handling_directions(payload.get('handling_direction'), language=target_language)
    work_priority = str(payload.get('work_priority') or labels['default_work_priority']).strip()
    status_map = {
        'unchecked': labels['status_unchecked'],
        'normal': labels['status_normal'],
        'issue': labels['status_issue'],
    }
    action_text = '\n'.join(f': {line}' for line in action_lines)
    checklist_text = '\n'.join(f": [{status_map.get(entry['status'], entry['status'])}] {entry['item']}" for entry in checklist_entries)
    handling_direction_text = '\n'.join(f': {line}' for line in handling_direction)
    return (
        f'{labels["result"]}: {error_code}\n\n'
        f'{labels["cause"]}\n: {cause}\n\n'
        f'{labels["actions"]}\n{action_text}\n\n'
        f'{labels["urgency"]}\n: {_format_urgency(urgency_level, urgency_text, language=target_language)}\n\n'
        f'{labels["expected_time"]}\n: {expected_time}\n\n'
        f'{labels["checklist"]}\n{checklist_text}\n\n'
        f'{labels["final_solution"]}\n: {final_summary}\n\n'
        f'{labels["handling_direction"]}\n{handling_direction_text}\n\n'
        f'{labels["work_priority"]}\n: {work_priority}'
    )


def analyze_error_code(error_code: str, language: str = 'ko') -> dict:
    normalized_error_code = error_code.strip().upper()
    docs = search_manual_with_ranking(normalized_error_code, k=2)
    manual_context = make_context_from_docs(docs)
    diagnosed = _diagnose_error_code(normalized_error_code, manual_context)
    cause_analysis = str(diagnosed.get('cause_analysis') or LABELS['ko']['default_cause']).strip()
    action_method = _normalize_action_lines(diagnosed.get('action_method'), language='ko')
    urgency_level, urgency_text = _rule_based_urgency(
        cause_analysis,
        action_method,
        str(diagnosed.get('urgency_level') or LABELS['ko']['default_urgency_level']),
        str(diagnosed.get('urgency_text') or LABELS['ko']['default_urgency_text']),
    )
    return {
        'error_code': normalized_error_code,
        'cause_analysis': cause_analysis,
        'action_method': action_method,
        'urgency_level': urgency_level,
        'urgency_text': urgency_text,
        'expected_action_time': str(diagnosed.get('expected_action_time') or LABELS['ko']['default_expected_time']).strip(),
        'matched': bool(diagnosed.get('matched', False)),
        'documents': [{'metadata': doc.metadata, 'page_content': doc.page_content} for doc in docs],
        'manual_context': manual_context,
        'language': (language or 'ko').strip().lower(),
    }


def generate_followup_checklist(error_code: str, diagnosis_payload: dict | None = None, language: str = 'ko') -> dict:
    base_payload = diagnosis_payload or analyze_error_code(error_code, language=language)
    checklist_payload = _generate_checklist_payload(base_payload['error_code'], base_payload)
    base_payload = dict(base_payload)
    base_payload['checklist_items'] = checklist_payload['checklist_items']
    return build_checklist_payload(base_payload, language=language)


def generate_final_solution(error_code: str, diagnosis_payload: dict | None = None, checklist_payload: dict | None = None, checklist_results: list[dict] | None = None, language: str = 'ko') -> dict:
    base_diagnosis = diagnosis_payload or analyze_error_code(error_code, language=language)
    base_checklist = checklist_payload or generate_followup_checklist(error_code, diagnosis_payload=base_diagnosis, language=language)
    checklist_entries = checklist_results if checklist_results is not None else base_checklist.get('checklist_items')
    normalized_checklist = {
        'error_code': base_diagnosis['error_code'],
        'language': (language or base_diagnosis.get('language') or 'ko').strip().lower(),
        'checklist_items': _normalize_checklist_entries(checklist_entries, language='ko'),
    }
    solution_payload = _generate_final_solution_payload(base_diagnosis['error_code'], base_diagnosis, normalized_checklist)
    merged = dict(base_diagnosis)
    merged['checklist_items'] = normalized_checklist['checklist_items']
    merged.update(solution_payload)
    localized = translate_worker_payload(merged, language=language)
    merged.update(localized)
    return build_final_solution_payload(merged, language=language) | merged


def _apply_cli_checklist_statuses(checklist_items: list[dict], raw_statuses: str | None) -> list[dict]:
    if not raw_statuses:
        return checklist_items
    tokens = [token.strip() for token in str(raw_statuses).split(',')]
    normalized = [_normalize_check_status(token) for token in tokens if token.strip()]
    updated_items = [dict(item) for item in checklist_items]
    for idx, status in enumerate(normalized[:len(updated_items)]):
        updated_items[idx]['status'] = status
    return updated_items


def generate_worker_response(error_code: str, language: str = 'ko', checklist_statuses: str | None = None):
    diagnosis_payload = analyze_error_code(error_code, language=language)
    checklist_payload = generate_followup_checklist(error_code, diagnosis_payload=diagnosis_payload, language=language)
    checklist_payload = dict(checklist_payload)
    checklist_payload['checklist_items'] = _apply_cli_checklist_statuses(
        checklist_payload.get('checklist_items', []), checklist_statuses
    )
    solution_payload = generate_final_solution(
        error_code,
        diagnosis_payload=diagnosis_payload,
        checklist_payload=checklist_payload,
        checklist_results=checklist_payload.get('checklist_items'),
        language=language,
    )
    response_payload = dict(solution_payload)
    response_payload['formatted_text'] = format_worker_response(response_payload['error_code'], response_payload, language=response_payload['language'])
    print('\n[\uac80\uc0c9\ub41c \ubb38\ud5cc]\n')
    print(response_payload['manual_context'])
    return response_payload['formatted_text']


if __name__ == '__main__':
    started_at = datetime.now()
    started_perf = time.perf_counter()
    print(f'[timing] started_at={started_at.isoformat(timespec="seconds")}')
    error_code = sys.argv[1] if len(sys.argv) > 1 else input('\uc5d0\ub7ec\ucf54\ub4dc\ub97c \uc785\ub825\ud558\uc138\uc694: ').strip()
    language = sys.argv[2] if len(sys.argv) > 2 else 'ko'
    checklist_statuses = sys.argv[3] if len(sys.argv) > 3 else None
    result = generate_worker_response(error_code, language=language, checklist_statuses=checklist_statuses)
    print('\n[\uc791\uc5c5\uc790\uc6a9 \uc9c4\ub2e8 \uacb0\uacfc]\n')
    print(result)
    finished_at = datetime.now()
    elapsed_seconds = time.perf_counter() - started_perf
    print(f'\n[timing] finished_at={finished_at.isoformat(timespec="seconds")} elapsed_seconds={elapsed_seconds:.2f}')
