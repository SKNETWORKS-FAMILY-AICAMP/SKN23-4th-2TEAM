from fastapi import APIRouter, HTTPException, status
from psycopg2.extras import RealDictCursor

from app.db import get_db_connection
from app.schemas import (
    Actor,
    AssistantPayload,
    ConsultationEventRequest,
    ConsultationResponse,
    ConsultationStateResponse,
    HistoryEventItem,
    HistoryResponse,
    ResponseType,
    SessionStatus,
    StartConsultationRequest,
    StartConsultationResponse,
)
from app.services.consultation_rules import (
    build_llm_reply,
    create_request_fingerprint_event,
    get_session_device_and_error,
    next_response_type_from_step,
    resolve_error_log_id,
    update_session_status,
)

import uuid

router = APIRouter(prefix='/consultations', tags=['consultations'])


@router.post('/start', response_model=StartConsultationResponse)
def start_consultation(req: StartConsultationRequest):
    request_id = str(req.request_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT c.session_id
                FROM robot_error_chat_histories c
                JOIN robot_error_sessions s ON s.session_id = c.session_id
                WHERE c.request_id = %s
                ORDER BY c.created_at DESC
                LIMIT 1
                """,
                (request_id,),
            )
            duplicated = cursor.fetchone()
            if duplicated:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail='duplicate request_id: start flow already exists',
                )

            cursor.execute(
                "SELECT 1 FROM robot_devices WHERE device_id = %s",
                (req.device_id,),
            )
            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='device_id not found',
                )

            error_log_id = resolve_error_log_id(cursor, req.device_id, req.error_code)

            cursor.execute(
                """
                INSERT INTO robot_error_sessions (device_id, error_log_id, language)
                VALUES (%s, %s, %s)
                RETURNING session_id, final_status
                """,
                (req.device_id, error_log_id, req.language.value),
            )
            session = cursor.fetchone()
            session_id = session['session_id']
            session_status = session['final_status']

            cursor.execute(
                """
                INSERT INTO robot_error_chat_histories
                  (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                VALUES (%s, %s, 'system', NULL, NULL, %s, NULL, %s)
                """,
                (session_id, 1, f"{req.device_id}에서 {req.error_code} 에러가 보고되었습니다.", request_id),
            )

            assistant_message, checklist = build_llm_reply(req.error_code, ResponseType.OVERALL, 1)
            cursor.execute(
                """
                INSERT INTO robot_error_chat_histories
                  (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                VALUES (%s, %s, 'llm', 'overall', NULL, %s, false, %s)
                """,
                (session_id, 2, assistant_message, str(uuid.uuid4())),
            )
            cursor.execute(
                "UPDATE robot_error_sessions SET last_updated_at = NOW() WHERE session_id = %s",
                (session_id,),
            )

            return ConsultationResponse(
                status='ok',
                session_id=session_id,
                step_no=2,
                next_response_type=ResponseType.OVERALL,
                assistant=AssistantPayload(
                    actor='llm',
                    response_type=ResponseType.OVERALL,
                    message=assistant_message,
                    checklist=checklist,
                ),
                session_status=SessionStatus(session_status),
                request_id=request_id,
            )


@router.post('/{session_id}/events', response_model=ConsultationResponse)
def post_event(session_id: int, req: ConsultationEventRequest):
    request_id = str(req.request_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT session_id, final_status FROM robot_error_sessions WHERE session_id = %s",
                (session_id,),
            )
            session_row = cursor.fetchone()
            if session_row is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session not found')

            if session_row['final_status'] in [SessionStatus.RESOLVED.value, SessionStatus.ABANDONED.value]:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='session is closed')

            if create_request_fingerprint_event(cursor, session_id, request_id):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='duplicate request_id')

            session_ctx = get_session_device_and_error(cursor, session_id)
            if session_ctx is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session context lost')

            if req.actor == Actor.USER:
                if req.selected_choice is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='selected_choice is required when actor=user',
                    )

                cursor.execute(
                    """
                    INSERT INTO robot_error_chat_histories
                      (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                    VALUES (%s, %s, 'user', NULL, %s, %s, NULL, %s)
                    """,
                    (session_id, req.step_no, req.selected_choice.value, req.message, request_id),
                )

                if req.selected_choice == 'O':
                    update_session_status(cursor, session_id, SessionStatus.RESOLVED)
                    return ConsultationResponse(
                        status='ok',
                        session_id=session_id,
                        step_no=req.step_no,
                        next_response_type=None,
                        assistant=AssistantPayload(
                            actor='llm',
                            response_type=ResponseType.OVERALL,
                        message='상담이 성공적으로 종료되었습니다. 더 이상 조치가 필요하지 않습니다.',
                        checklist=None,
                    ),
                    session_status=SessionStatus.RESOLVED,
                    request_id=request_id,
                )

                next_type = next_response_type_from_step(req.step_no)
                assistant_message, checklist = build_llm_reply(session_ctx['error_code'], next_type, req.step_no)
                cursor.execute(
                    """
                    INSERT INTO robot_error_chat_histories
                      (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                    VALUES (%s, %s, 'llm', %s, NULL, %s, NULL, %s)
                    """,
                    (
                        session_id,
                        req.step_no + 1,
                        next_type.value,
                        assistant_message,
                        str(uuid.uuid4()),
                    ),
                )
                update_session_status(cursor, session_id, SessionStatus.ONGOING)

                return ConsultationResponse(
                    status='ok',
                    session_id=session_id,
                    step_no=req.step_no + 1,
                    next_response_type=next_type,
                    assistant=AssistantPayload(
                        actor='llm',
                        response_type=next_type,
                        message=assistant_message,
                        checklist=checklist,
                    ),
                    session_status=SessionStatus.ONGOING,
                    request_id=request_id,
                )

            if req.actor == Actor.SYSTEM:
                if req.selected_choice is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='selected_choice must be null when actor=system',
                    )
                if req.message == 'user_back':
                    next_status = SessionStatus.ABANDONED
                else:
                    next_status = SessionStatus.UNRESOLVED

                update_session_status(cursor, session_id, next_status)

                cursor.execute(
                    """
                    INSERT INTO robot_error_chat_histories
                      (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                    VALUES (%s, %s, 'system', NULL, NULL, %s, NULL, %s)
                    """,
                    (session_id, req.step_no, req.message, request_id),
                )

                return ConsultationResponse(
                    status='ok',
                    session_id=session_id,
                    step_no=req.step_no,
                    next_response_type=None,
                    assistant=None,
                    session_status=next_status,
                    request_id=request_id,
                )

            if req.actor == Actor.LLM and req.response_type is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='response_type is required when actor=llm',
                )
            if req.actor == Actor.LLM and req.selected_choice is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='selected_choice must be null when actor=llm',
                )

            cursor.execute(
                """
                INSERT INTO robot_error_chat_histories
                  (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                VALUES (%s, %s, 'llm', %s, NULL, %s, %s, %s)
                """,
                (
                    session_id,
                    req.step_no,
                    req.response_type.value if req.response_type else ResponseType.OVERALL.value,
                    req.message,
                    req.is_resolved,
                    request_id,
                ),
            )
            update_session_status(cursor, session_id, SessionStatus.ONGOING)

            return ConsultationResponse(
                status='ok',
                session_id=session_id,
                step_no=req.step_no,
                next_response_type=req.response_type,
                assistant=AssistantPayload(
                    actor='llm',
                    response_type=req.response_type or ResponseType.OVERALL,
                    message=req.message,
                ),
                session_status=SessionStatus.ONGOING,
                request_id=request_id,
            )


@router.get('/{session_id}', response_model=ConsultationStateResponse)
def get_session(session_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    s.session_id,
                    s.device_id,
                    s.language,
                    s.final_status,
                    s.last_updated_at,
                    d.line_name,
                    d.line_num,
                    l.error_code,
                    h.step_no,
                    h.response_type AS latest_response_type
                FROM robot_error_sessions s
                JOIN robot_devices d ON d.device_id = s.device_id
                LEFT JOIN robot_error_logs l ON l.error_log_id = s.error_log_id
                LEFT JOIN LATERAL (
                    SELECT step_no, response_type
                    FROM robot_error_chat_histories
                    WHERE session_id = s.session_id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) h ON TRUE
                WHERE s.session_id = %s
                """,
                (session_id,),
            )
            session = cursor.fetchone()
            if session is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session not found')

            return ConsultationStateResponse(
                session_id=session['session_id'],
                status=SessionStatus(session['final_status']),
                language=session['language'],
                device_id=session['device_id'],
                line=f"{session['line_name']}-{session['line_num']}",
                error_code=session['error_code'],
                latest_response_type=session['latest_response_type'],
                step_no=session['step_no'],
                updated_at=session['last_updated_at'],
            )


@router.get('/{session_id}/history', response_model=HistoryResponse)
def get_history(session_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT 1 FROM robot_error_sessions WHERE session_id = %s", (session_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session not found')

            cursor.execute(
                """
                SELECT
                    step_no,
                    actor,
                    response_type,
                    selected_choice,
                    message,
                    created_at
                FROM robot_error_chat_histories
                WHERE session_id = %s
                ORDER BY created_at ASC, chat_id ASC
                """,
                (session_id,),
            )
            rows = cursor.fetchall()

            events = [
                HistoryEventItem(
                    event_no=idx + 1,
                    actor=row['actor'],
                    response_type=row['response_type'],
                    selected_choice=row['selected_choice'],
                    message=row['message'],
                    created_at=row['created_at'],
                )
                for idx, row in enumerate(rows)
            ]

            return HistoryResponse(session_id=session_id, count=len(events), events=events)
