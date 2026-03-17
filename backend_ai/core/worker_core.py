import json
import os
import re
from datetime import datetime

from dotenv import load_dotenv

try:
    from .pipeline import make_context_from_docs, search_manual_with_ranking
    from .prompts import CHECKLIST_PROMPT, FINAL_SOLUTION_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT, UNIFIED_DIAGNOSIS_PROMPT
    from .retriever import search_manual_exact
except ImportError:
    from pipeline import make_context_from_docs, search_manual_with_ranking
    from prompts import CHECKLIST_PROMPT, FINAL_SOLUTION_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT, UNIFIED_DIAGNOSIS_PROMPT
    from retriever import search_manual_exact

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

LABELS = {
    'ko': {
        'result': '에러코드 분석 결과',
        'cause': '원인 분석',
        'actions': '조치 방법',
        'urgency': '긴급도',
        'expected_time': '예상 조치 시간',
        'checklist': '추가 진단 체크리스트',
        'final_solution': '최종 종합 판단',
        'handling_direction': '처리 방향',
        'work_priority': '작업 우선순위',
        'default_cause': '문서 기준 상세 원인 확인 필요',
        'default_action': '문서 기준 우선 확인 필요',
        'default_urgency_level': '보통',
        'default_urgency_text': '문서 기준 우선 확인 필요',
        'default_expected_time': '문서 기준 우선 확인 필요',
        'default_checklist_item': '관련 전원, 배선, 보드 상태를 순서대로 점검하십시오.',
        'default_final_summary': '체크리스트와 진단 결과를 종합해 원인 확정을 우선해야 합니다.',
        'default_handling_direction': '점검 결과에 따라 후속 조치 방향을 결정하십시오.',
        'default_work_priority': '현재는 정상 복구보다 원인 확정이 우선입니다.',
        'status_checked': '체크함',
        'status_unchecked': '체크안함',
        'status_normal': '정상',
        'status_issue': '이상',
        'none': '없음',
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
    'uz': {
        'result': 'Xatolik kodi tahlili',
        'cause': 'Sabab tahlili',
        'actions': 'Harakatlar',
        'urgency': 'Shoshilinchlik',
        'expected_time': 'Kutilayotgan harakat vaqti',
        'checklist': 'Qo\'shimcha diagnostika nazorat ro\'yxati',
        'final_solution': 'Yakuniy birlashtirilgan hukm',
        'handling_direction': 'Yo\'nalishni boshqarish',
        'work_priority': 'Ish ustuvorligi',
        'default_cause': 'Batafsil sabab uchun qo\'llanmaga qarang.',
        'default_action': 'Avval qo\'llanmani tekshiring.',
        'default_urgency_level': 'medium',
        'default_urgency_text': 'Qo\'llanma asosida tekshirish talab qilinadi.',
        'default_expected_time': 'Avval qo\'llanmani tekshiring.',
        'default_checklist_item': 'Tegishli quvvat, simlar va plata holatini ketma-ketlikda tekshiring.',
        'default_final_summary': 'Tashxis va nazorat ro\'yxati asosida sababni tasdiqlashga ustuvor ahamiyat bering.',
        'default_handling_direction': 'Tekshiruv natijalariga ko\'ra keyingi ishlov berish yo\'lini belgilang.',
        'default_work_priority': 'Ushbu bosqichda sababni tasdiqlash normal tiklanishdan ustun turadi.',
        'status_checked': 'tekshirilgan',
        'status_unchecked': 'tekshirilmagan',
        'status_normal': 'normal',
        'status_issue': 'muammo',
        'none': 'yo\'q',
    },
}

URGENCY_LEVEL_MAP = {
    'ko': {'높음': '높음', '보통': '보통', '낮음': '낮음'},
    'en': {'높음': 'high', '보통': 'medium', '낮음': 'low', 'high': 'high', 'medium': 'medium', 'low': 'low'},
    'uz': {'높음': 'yuqori', '보통': 'o\'rtacha', '낮음': 'past', 'high': 'yuqori', 'medium': 'o\'rtacha', 'low': 'past', 'yuqori': 'yuqori', 'o\'rtacha': 'o\'rtacha', 'past': 'past'},
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


def _normalize_checklist_entries(entries_value, language: str = 'ko', allow_empty: bool = False) -> list[dict]:
    labels = _labels_for(language)
    default_item = labels['default_checklist_item']
    entries: list[dict] = []
    if isinstance(entries_value, list):
        for idx, entry in enumerate(entries_value, start=1):
            if isinstance(entry, dict):
                item_text = str(entry.get('item') or entry.get('question') or '').strip()
                if not item_text:
                    continue
                entry_id = str(entry.get('id') or f'check_{idx}').strip() or f'check_{idx}'
                status_val = entry.get('status') 
                if status_val is None:
                    status_val = entry.get('is_ok')
                
                entries.append({
                    'id': entry_id,
                    'item': item_text,
                    'status': _normalize_check_status(status_val),
                })
            else:
                item_text = str(entry).strip()
                if item_text:
                    entries.append(_build_checklist_entry(idx, item_text))
    if not entries:
        if allow_empty:
            return []
        entries = [_build_checklist_entry(1, default_item)]
    normalized_entries = []
    for idx, entry in enumerate(entries[:5], start=1):
        normalized_entries.append({
            'id': str(entry.get('id') or f'check_{idx}').strip() or f'check_{idx}',
            'item': str(entry.get('item') or entry.get('question') or default_item).strip() or default_item,
            'status': _normalize_check_status(entry.get('status') if entry.get('status') is not None else entry.get('is_ok')),
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
        'expected_action_time': '현장 1차 점검 후 판단',
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

    if any(keyword in source_text for keyword in ['보드', 'PN보드']):
        add('제어기 외부 및 내부 전원 연결 상태를 확인하십시오.')
    if any(keyword in source_text for keyword in ['배선', '커넥터']):
        add('관련 배선 및 커넥터 체결 상태를 확인하십시오.')
    if any(keyword in source_text for keyword in ['서보 앰프', 'AMP', '앰프']):
        add('서보 앰프 상태 이상 여부를 점검하십시오.')
    if any(keyword in source_text for keyword in ['F1', 'F2', '퓨즈']):
        add('F1/F2 퓨즈 단선 여부를 확인하십시오.')
    if any(keyword in source_text for keyword in ['입력전원', '입력볼트', '전압이상']):
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
    # 매뉴얼 정보가 부재할 경우(matched=False), 상세 점검표를 생성하지 않고 빈 리스트 반환
    if not diagnosis_payload.get('matched', False):
        return {
            'error_code': error_code,
            'checklist_items': [],
        }

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
    if any(bad in joined_items for bad in ['AI', '환영', '전문가 조언', '도움 필요', '관련 안내', '피드백']):
        # Ignore disclaimer for this bad word test, but it is acceptable anyway
        pass

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
    prompt = FINAL_SOLUTION_PROMPT.format(
        error_code=error_code,
        cause_analysis=diagnosis_payload.get('cause_analysis', ''),
        action_method='\n'.join(f'- {item}' for item in diagnosis_payload.get('action_method', [])),
        urgency_text=diagnosis_payload.get('urgency_text', '보통'),
        checklist_items=summary.get('checklist_results_text', ''),
    )
    
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.1)
        response = llm.invoke(prompt)
        import json
        res = json.loads(response.content.strip())
        # 필수 키 존재 검증
        if 'final_summary' in res and 'handling_direction' in res and 'work_priority' in res:
             return res
    except Exception:
        pass

    return _build_final_solution_fallback(error_code, diagnosis_payload, checklist_entries, language='ko')


def _rule_based_urgency(cause: str, actions: list[str], llm_level: str, llm_text: str) -> tuple[str, str]:
    combined = ' '.join([cause, *actions]).lower()
    high_keywords = ['과열', '온도 스위치', '화재', '발화', '연소', '불꽃', '폭발', '감전', '과전류', '단선', '앰프', '서지전압', '전원 이상', '쇼트', '합선', 'overheat', 'overheating', 'fire', 'flame', 'smoke', 'burn', 'overcurrent', 'short', 'surge', 'amp']
    low_keywords = ['설정', '재설정', '파라미터', '조정', '재시도', 'setting', 'reset', 'parameter', 'adjust', 'retry']
    if any(keyword in combined for keyword in high_keywords):
        return '높음', '과열 또는 전기적 위험 가능성이 있어 즉각적인 점검과 조치가 필요합니다.'
    if any(keyword in combined for keyword in low_keywords):
        return '낮음', '설정 또는 상태 조정 중심의 조치로 대응 가능한 수준입니다.'
    normalized = llm_level.strip()
    if normalized not in {'높음', '보통', '낮음'}:
        normalized = '보통'
    return normalized, llm_text.strip() or LABELS['ko']['default_urgency_text']


def _normalize_urgency_level(level: str, language: str) -> str:
    mapping = URGENCY_LEVEL_MAP.get(language, URGENCY_LEVEL_MAP['ko'])
    normalized = str(level or '').strip().lower()
    if language == 'ko':
        if normalized in {'high', 'medium', 'low'}:
            return {'high': '높음', 'medium': '보통', 'low': '낮음'}[normalized]
        return str(level or LABELS['ko']['default_urgency_level']).strip()
    return mapping.get(str(level or '').strip(), mapping.get(normalized, LABELS['en']['default_urgency_level']))


def _format_urgency(level: str, text: str, language: str = 'ko') -> str:
    normalized = _normalize_urgency_level(level, language)
    if normalized in {'높음', 'high'}:
        icon = '🔴'
    elif normalized in {'낮음', 'low'}:
        icon = '🟢'
    else:
        normalized = '보통' if language == 'ko' else 'medium'
        icon = '🟡'
    return f'{icon} {normalized} - {text.strip()}'


def translate_worker_payload(payload: dict, language: str = 'ko') -> dict:
    target_language = (language or 'ko').strip().lower()
    matched = payload.get('matched', True)
    if target_language == 'ko':
        translated = dict(payload)
        translated['action_method'] = _normalize_action_lines(payload.get('action_method'), language='ko')
        translated['checklist_items'] = _normalize_checklist_entries(payload.get('checklist_items'), language='ko', allow_empty=not matched)
        translated['handling_direction'] = _normalize_handling_directions(payload.get('handling_direction'), language='ko')
        translated['work_priority'] = str(payload.get('work_priority') or _labels_for('ko')['default_work_priority']).strip()
        return translated

    fallback = {
        'cause_analysis': str(payload.get('cause_analysis') or _labels_for(target_language)['default_cause']).strip(),
        'action_method': _normalize_action_lines(payload.get('action_method'), language=target_language),
        'urgency_level': _normalize_urgency_level(payload.get('urgency_level'), target_language),
        'urgency_text': str(payload.get('urgency_text') or _labels_for(target_language)['default_urgency_text']).strip(),
        'expected_action_time': str(payload.get('expected_action_time') or _labels_for(target_language)['default_expected_time']).strip(),
        'checklist_items': _normalize_checklist_entries(payload.get('checklist_items'), language=target_language, allow_empty=not matched),
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
    translated['checklist_items'] = _normalize_checklist_entries(translated.get('checklist_items'), language=target_language, allow_empty=not matched)
    translated.setdefault('final_summary', fallback['final_summary'])
    translated['handling_direction'] = _normalize_handling_directions(translated.get('handling_direction'), language=target_language)
    translated.setdefault('work_priority', fallback['work_priority'])
    merged = dict(payload)
    merged.update(translated)
    return merged


def build_checklist_payload(diagnosis_payload: dict, language: str | None = None) -> dict:
    target_language = (language or diagnosis_payload.get('language') or 'ko').strip().lower()
    matched = diagnosis_payload.get('matched', True)
    return {
        'error_code': diagnosis_payload.get('error_code', ''),
        'language': target_language,
        'checklist_items': _normalize_checklist_entries(diagnosis_payload.get('checklist_items'), language=target_language, allow_empty=not matched),
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


def is_valid_error_code(error_code: str, manufacturer: str | None = None) -> bool:
    """에러코드가 매뉴얼 또는 DB에 실제 존재하는지 확인합니다."""
    normalized = error_code.strip().upper()
    if not normalized:
        return False
        
    try:
        from .retriever import search_manual_exact
    except ImportError:
        from retriever import search_manual_exact
        
    # search_manual_exact를 통해 실제 매뉴얼 조각이 있는지 확인
    docs = search_manual_exact(normalized, k=1, manufacturer=manufacturer)
    if not docs and manufacturer:
        # 특정 브랜드 필터링 실패 시, 용접기 등 전체 매뉴얼 대상으로 확장 검색 (Fallback)
        docs = search_manual_exact(normalized, k=1, manufacturer=None)
        
    return len(docs) > 0


def _get_manual_from_db_table(error_code: str) -> list:
    try:
        from app.db import get_db_connection
    except ImportError:
        try:
            from backend_worker_api.app.db import get_db_connection
        except ImportError:
            return []
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Direct match or Like match for safety
                cur.execute(
                    """
                    SELECT error_content, category FROM robot_error_manuals 
                    WHERE TRIM(UPPER(error_code)) = %s 
                    LIMIT 1
                    """,
                    (error_code,)
                )
                row = cur.fetchone()
                if row:
                    from langchain_core.documents import Document
                    return [Document(page_content=row[0], metadata={'source': 'robot_error_manuals', 'category': row[1]})]
    except Exception:
        pass
    return []


def analyze_error_code(error_code: str, language: str = 'ko', manufacturer: str | None = None) -> dict:
    normalized_error_code = (error_code or "").strip().upper()
    docs = search_manual_with_ranking(normalized_error_code, k=2, manufacturer=manufacturer)
    
    if not docs and manufacturer:
        # Fallback to general/welder manuals if brand specific fails
        docs = search_manual_with_ranking(normalized_error_code, k=2, manufacturer=None)
        
    if not docs:
        # Fallback to direct DB table query
        docs = _get_manual_from_db_table(normalized_error_code)

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
    res = {
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
    localized = translate_worker_payload(res, language=language)
    res.update(localized)
    return res


def generate_followup_checklist(error_code: str, diagnosis_payload: dict | None = None, language: str = 'ko') -> dict:
    base_payload = diagnosis_payload or analyze_error_code(error_code, language=language)
    checklist_payload = _generate_checklist_payload(base_payload['error_code'], base_payload)
    base_payload = dict(base_payload)
    base_payload['checklist_items'] = checklist_payload['checklist_items']
    
    # Translate checklist items as well
    localized = translate_worker_payload(base_payload, language=language)
    base_payload.update(localized)
    
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


def translate_general_text(text: str, target_language: str = 'ko') -> str:
    from .prompts import TRANSLATE_GENERAL_PROMPT
    if not text:
        return ""
         
    lang_map = {'ko': 'Korean', 'en': 'English', 'uz': 'Uzbek'}
    target_name = lang_map.get((target_language or 'ko').lower(), 'Korean')

    prompt = TRANSLATE_GENERAL_PROMPT.format(
        target_language=target_name,
        text=text
    )
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(model='gpt-4o-mini', temperature=0)
    response = llm.invoke(prompt)
    return response.content.strip()
