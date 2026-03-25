import sys
import time
from datetime import datetime

try:
    from .worker_core import (
        analyze_error_code,
        generate_followup_checklist,
        generate_final_solution,
        format_worker_response,
        _normalize_check_status
    )
except ImportError:
    from worker_core import (
        analyze_error_code,
        generate_followup_checklist,
        generate_final_solution,
        format_worker_response,
        _normalize_check_status
    )


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
    
    print('\n[검색된 문헌]\n')
    print(response_payload.get('manual_context', 'No context available'))
    
    return response_payload['formatted_text']


if __name__ == '__main__':
    started_at = datetime.now()
    started_perf = time.perf_counter()
    print(f'[timing] started_at={started_at.isoformat(timespec="seconds")}')
    
    if len(sys.argv) > 1:
        error_code = sys.argv[1]
    else:
        error_code = input('에러코드를 입력하세요: ').strip()
        
    language = sys.argv[2] if len(sys.argv) > 2 else 'ko'
    checklist_statuses = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = generate_worker_response(error_code, language=language, checklist_statuses=checklist_statuses)
    
    print('\n[작업자용 진단 결과]\n')
    print(result)
    
    finished_at = datetime.now()
    elapsed_seconds = time.perf_counter() - started_perf
    print(f'\n[timing] finished_at={finished_at.isoformat(timespec="seconds")} elapsed_seconds={elapsed_seconds:.2f}')
