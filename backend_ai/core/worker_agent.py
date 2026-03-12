import json
import os
import sys

from dotenv import load_dotenv

try:
    from .pipeline import make_context_from_
    docs, search_manual_with_ranking
    from .prompts import ASSESS_PROMPT, CHECKLIST_PROMPT, EXTRACT_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT
except ImportError:
    from pipeline import make_context_from_docs, search_manual_with_ranking
    from prompts import ASSESS_PROMPT, CHECKLIST_PROMPT, EXTRACT_PROMPT, TRANSLATE_WORKER_PAYLOAD_PROMPT

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
        'default_cause': '문서 기준 상세 원인 확인 필요',
        'default_action': '문서 기준 우선 확인 필요',
        'default_urgency_level': '보통',
        'default_urgency_text': '문서 기준 우선 확인 필요',
        'default_expected_time': '문서 기준 우선 확인 필요',
        'default_checklist_item': '관련 전원, 배선, 보드 상태를 순서대로 점검하십시오.',
    },
    'en': {
        'result': 'Error Code Analysis',
        'cause': 'Cause Analysis',
        'actions': 'Action Steps',
        'urgency': 'Urgency',
        'expected_time': 'Estimated Action Time',
        'checklist': 'Additional Diagnostic Checklist',
        'default_cause': 'Refer to the manual for the detailed cause.',
        'default_action': 'Check the manual first.',
        'default_urgency_level': 'medium',
        'default_urgency_text': 'Manual-based verification is required.',
        'default_expected_time': 'Check the manual first.',
        'default_checklist_item': 'Inspect the related power, wiring, and board status in sequence.',
    },
}


URGENCY_LEVEL_MAP = {
    'ko': {'높음': '높음', '보통': '보통', '낮음': '낮음'},
    'en': {'높음': 'high', '보통': 'medium', '낮음': 'low', 'high': 'high', 'medium': 'medium', 'low': 'low'},
}


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
        items = [line.strip('- •\n ') for line in raw.splitlines() if line.strip()]
    return items or [default_action]


def _normalize_checklist_items(items_value, language: str = 'ko') -> list[str]:
    default_item = _labels_for(language)['default_checklist_item']
    if isinstance(items_value, list):
        items = [str(item).strip() for item in items_value if str(item).strip()]
    else:
        raw = str(items_value or '').strip()
        items = [line.strip('- •\n ') for line in raw.splitlines() if line.strip()]
    if not items:
        items = [default_item]
    if len(items) < 5:
        items.extend([default_item] * (5 - len(items)))
    return items[:5]


def _extract_cause_and_actions(error_code: str, manual_context: str) -> dict:
    prompt = EXTRACT_PROMPT.format(
        error_code=error_code,
        manual_context=manual_context,
    )
    fallback = {
        'cause_analysis': LABELS['ko']['default_cause'],
        'action_method': [LABELS['ko']['default_action']],
        'matched': False,
    }
    payload = _call_json_llm(prompt, fallback)
    payload.setdefault('cause_analysis', fallback['cause_analysis'])
    payload.setdefault('action_method', fallback['action_method'])
    payload.setdefault('matched', False)
    return payload


def _assess_urgency_and_time(error_code: str, cause_analysis: str, action_method: list[str]) -> dict:
    prompt = ASSESS_PROMPT.format(
        error_code=error_code,
        cause_analysis=cause_analysis,
        action_method='\n'.join(f'- {item}' for item in action_method),
    )
    fallback = {
        'urgency_level': LABELS['ko']['default_urgency_level'],
        'urgency_text': LABELS['ko']['default_urgency_text'],
        'expected_action_time': LABELS['ko']['default_expected_time'],
    }
    payload = _call_json_llm(prompt, fallback)
    payload.setdefault('urgency_level', fallback['urgency_level'])
    payload.setdefault('urgency_text', fallback['urgency_text'])
    payload.setdefault('expected_action_time', fallback['expected_action_time'])
    return payload


def _build_followup_checklist(error_code: str, cause_analysis: str, action_method: list[str], urgency_text: str) -> list[str]:
    prompt = CHECKLIST_PROMPT.format(
        error_code=error_code,
        cause_analysis=cause_analysis,
        action_method='\n'.join(f'- {item}' for item in action_method),
        urgency_text=urgency_text,
    )
    fallback = {
        'checklist_items': [
            '관련 전원 연결 상태를 먼저 확인하십시오.',
            '관련 배선 및 커넥터 체결 상태를 확인하십시오.',
            '보드 또는 앰프 상태 이상 여부를 점검하십시오.',
            '동일 에러가 재현되는지 안전하게 확인하십시오.',
            '점검 후에도 지속되면 상위 지원 절차를 진행하십시오.',
        ]
    }
    payload = _call_json_llm(prompt, fallback)
    return _normalize_checklist_items(payload.get('checklist_items'), language='ko')


def _rule_based_urgency(cause: str, actions: list[str], llm_level: str, llm_text: str) -> tuple[str, str]:
    combined = ' '.join([cause, *actions]).lower()

    high_keywords = [
        '과열', '온도 스위치', '화재', '발화', '연소', '불꽃', '폭발', '감전',
        '과전류', '단선', '앰프', '서지전압', '전원 이상', '쇼트', '합선',
        'overheat', 'overheating', 'fire', 'flame', 'smoke', 'burn',
        'overcurrent', 'short', 'surge', 'amp',
    ]
    low_keywords = [
        '설정', '재설정', '파라미터', '조정', '재시도',
        'setting', 'reset', 'parameter', 'adjust', 'retry',
    ]

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
            reverse_map = {'high': '높음', 'medium': '보통', 'low': '낮음'}
            return reverse_map[normalized]
        return str(level or LABELS['ko']['default_urgency_level']).strip()
    return mapping.get(str(level or '').strip(), mapping.get(normalized, LABELS['en']['default_urgency_level']))


def _format_urgency(level: str, text: str, language: str = 'ko') -> str:
    normalized = _normalize_urgency_level(level, language)
    if normalized in {'높음', 'high'}:
        icon = '🛑'
    elif normalized in {'낮음', 'low'}:
        icon = '🟢'
    else:
        normalized = '보통' if language == 'ko' else 'medium'
        icon = '🟡'
    return f'{icon} {normalized} - {text.strip()}'


def translate_worker_payload(payload: dict, language: str = 'ko') -> dict:
    target_language = (language or 'ko').strip().lower()
    if target_language == 'ko':
        translated = dict(payload)
        translated['action_method'] = _normalize_action_lines(payload.get('action_method'), language='ko')
        translated['checklist_items'] = _normalize_checklist_items(payload.get('checklist_items'), language='ko')
        return translated

    fallback = {
        'cause_analysis': str(payload.get('cause_analysis') or _labels_for(target_language)['default_cause']).strip(),
        'action_method': _normalize_action_lines(payload.get('action_method'), language=target_language),
        'urgency_level': _normalize_urgency_level(payload.get('urgency_level'), target_language),
        'urgency_text': str(payload.get('urgency_text') or _labels_for(target_language)['default_urgency_text']).strip(),
        'expected_action_time': str(payload.get('expected_action_time') or _labels_for(target_language)['default_expected_time']).strip(),
        'checklist_items': _normalize_checklist_items(payload.get('checklist_items'), language=target_language),
    }
    prompt = TRANSLATE_WORKER_PAYLOAD_PROMPT.format(
        target_language=target_language,
        payload_json=json.dumps(
            {
                'cause_analysis': payload.get('cause_analysis', ''),
                'action_method': _normalize_action_lines(payload.get('action_method'), language='ko'),
                'urgency_level': payload.get('urgency_level', ''),
                'urgency_text': payload.get('urgency_text', ''),
                'expected_action_time': payload.get('expected_action_time', ''),
                'checklist_items': _normalize_checklist_items(payload.get('checklist_items'), language='ko'),
            },
            ensure_ascii=False,
        ),
    )
    translated = _call_json_llm(prompt, fallback)
    translated.setdefault('cause_analysis', fallback['cause_analysis'])
    translated['action_method'] = _normalize_action_lines(translated.get('action_method'), language=target_language)
    translated['urgency_level'] = _normalize_urgency_level(translated.get('urgency_level'), target_language)
    translated.setdefault('urgency_text', fallback['urgency_text'])
    translated.setdefault('expected_action_time', fallback['expected_action_time'])
    translated['checklist_items'] = _normalize_checklist_items(translated.get('checklist_items'), language=target_language)
    merged = dict(payload)
    merged.update(translated)
    return merged


def format_worker_response(error_code: str, payload: dict, language: str = 'ko') -> str:
    target_language = (language or 'ko').strip().lower()
    labels = _labels_for(target_language)
    cause = str(payload.get('cause_analysis') or labels['default_cause']).strip()
    urgency_level = str(payload.get('urgency_level') or labels['default_urgency_level']).strip()
    urgency_text = str(payload.get('urgency_text') or labels['default_urgency_text']).strip()
    expected_time = str(payload.get('expected_action_time') or labels['default_expected_time']).strip()
    action_lines = _normalize_action_lines(payload.get('action_method'), language=target_language)
    checklist_items = _normalize_checklist_items(payload.get('checklist_items'), language=target_language)
    action_text = '\n'.join(f': {line}' for line in action_lines)
    checklist_text = '\n'.join(f': {line}' for line in checklist_items)

    return (
        f'{labels["result"]}: {error_code}\n\n'
        f'{labels["cause"]}\n'
        f': {cause}\n\n'
        f'{labels["actions"]}\n'
        f'{action_text}\n\n'
        f'{labels["urgency"]}\n'
        f': {_format_urgency(urgency_level, urgency_text, language=target_language)}\n\n'
        f'{labels["expected_time"]}\n'
        f': {expected_time}\n\n'
        f'{labels["checklist"]}\n'
        f'{checklist_text}'
    )


def analyze_error_code(error_code: str, language: str = 'ko') -> dict:
    normalized_error_code = error_code.strip().upper()
    docs = search_manual_with_ranking(normalized_error_code, k=2)
    manual_context = make_context_from_docs(docs)

    extracted = _extract_cause_and_actions(normalized_error_code, manual_context)
    cause_analysis = str(extracted.get('cause_analysis') or LABELS['ko']['default_cause']).strip()
    action_method = _normalize_action_lines(extracted.get('action_method'), language='ko')
    assessed = _assess_urgency_and_time(
        normalized_error_code,
        cause_analysis,
        action_method,
    )
    urgency_level, urgency_text = _rule_based_urgency(
        cause_analysis,
        action_method,
        str(assessed.get('urgency_level') or LABELS['ko']['default_urgency_level']),
        str(assessed.get('urgency_text') or LABELS['ko']['default_urgency_text']),
    )
    checklist_items = _build_followup_checklist(
        normalized_error_code,
        cause_analysis,
        action_method,
        urgency_text,
    )

    payload = {
        'error_code': normalized_error_code,
        'cause_analysis': cause_analysis,
        'action_method': action_method,
        'urgency_level': urgency_level,
        'urgency_text': urgency_text,
        'urgency_display': _format_urgency(urgency_level, urgency_text, language='ko'),
        'expected_action_time': str(
            assessed.get('expected_action_time') or LABELS['ko']['default_expected_time']
        ).strip(),
        'checklist_items': checklist_items,
        'matched': bool(extracted.get('matched', False)),
        'documents': [
            {
                'metadata': doc.metadata,
                'page_content': doc.page_content,
            }
            for doc in docs
        ],
        'manual_context': manual_context,
        'language': (language or 'ko').strip().lower(),
    }
    localized_payload = translate_worker_payload(payload, language=payload['language'])
    payload.update(localized_payload)
    payload['urgency_display'] = _format_urgency(payload['urgency_level'], payload['urgency_text'], language=payload['language'])
    payload['formatted_text'] = format_worker_response(normalized_error_code, payload, language=payload['language'])
    return payload


def generate_worker_response(error_code: str, language: str = 'ko'):
    payload = analyze_error_code(error_code, language=language)

    print('\n[검색된 문헌]\n')
    print(payload['manual_context'])

    return payload['formatted_text']


if __name__ == '__main__':
    error_code = sys.argv[1] if len(sys.argv) > 1 else input('에러코드를 입력하세요: ').strip()
    language = sys.argv[2] if len(sys.argv) > 2 else 'ko'
    result = generate_worker_response(error_code, language=language)

    print('\n[작업자용 진단 결과]\n')
    print(result)
