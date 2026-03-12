from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from psycopg2.extras import RealDictCursor

from app.schemas import ResponseType, SessionStatus


def resolve_error_log_id(cursor: RealDictCursor, device_id: str, error_code: str) -> Optional[int]:
    cursor.execute(
        """
        SELECT error_log_id
        FROM robot_error_logs
        WHERE device_id = %s AND error_code = %s
        ORDER BY occurred_at DESC
        LIMIT 1
        """,
        (device_id, error_code),
    )
    row = cursor.fetchone()
    return row['error_log_id'] if row else None


def get_session_device_and_error(cursor: RealDictCursor, session_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT
            s.device_id,
            s.language,
            s.final_status,
            l.error_code
        FROM robot_error_sessions s
        LEFT JOIN robot_error_logs l
            ON l.error_log_id = s.error_log_id
        WHERE s.session_id = %s
        """,
        (session_id,),
    )
    return cursor.fetchone()


def create_request_fingerprint_event(cursor: RealDictCursor, session_id: int, request_id: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM robot_error_chat_histories
        WHERE session_id = %s AND request_id = %s
        LIMIT 1
        """,
        (session_id, request_id),
    )
    return cursor.fetchone() is not None


def update_session_status(cursor: RealDictCursor, session_id: int, status: SessionStatus):
    cursor.execute(
        """
        UPDATE robot_error_sessions
        SET final_status = %s,
            last_updated_at = NOW()
        WHERE session_id = %s
        """,
        (status.value, session_id),
    )


def next_response_type_from_step(step_no: int) -> ResponseType:
    # 사용자 첫 X 응답 이후 checklist로, 2번째 이상은 diagnosis 단계로 이동
    if step_no <= 2:
        return ResponseType.CHECKLIST
    return ResponseType.DIAGNOSIS


def build_llm_reply(error_code: Optional[str], response_type: ResponseType, step_no: int) -> Tuple[str, Optional[List[str]]]:
    if response_type == ResponseType.OVERALL:
        msg = f"{error_code or '해당 에러'} 발생 초동 대응 가이드를 제시합니다. 안전 점검 후 조치 상태를 다시 보내주세요."
        return msg, None
    if response_type == ResponseType.CHECKLIST:
        checklist = [
            '전원 및 케이블 연결 상태를 확인하세요',
            '안전 커버 및 센서 연결 상태를 점검하세요',
            '경보 알람 이력에서 동일 증상을 확인하세요',
        ]
        msg = f"{error_code or '현재 에러'}에 대한 체크리스트입니다. 항목 확인 후 O/X로 진행 상태를 알려주세요."
        return msg, checklist
    msg = '추가 진단이 필요합니다. 최근 점검 항목의 결과를 바탕으로 상세 원인을 분리해 판단합니다.'
    return msg, None
