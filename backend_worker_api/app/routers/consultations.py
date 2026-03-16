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
    TranslateTextRequest,
)
from app.services.consultation_rules import (
    build_llm_reply,
    create_request_fingerprint_event,
    get_session_device_and_error,
    next_response_type_from_step,
    resolve_error_log_id,
    update_session_status,
)

# AI Core Imports
try:
    from core.worker_core import (
        analyze_error_code,
        generate_followup_checklist,
        generate_final_solution,
        is_valid_error_code
    )
except ImportError:
    # Fallback if core is not properly in path or package structure differs
    from backend_ai.core.worker_core import (
        analyze_error_code,
        generate_followup_checklist,
        generate_final_solution,
        is_valid_error_code
    )

import uuid

router = APIRouter(prefix='/consultations', tags=['consultations'])


@router.get('/recent-logs')
def list_recent_logs(device_id: str | None = None, line_name: str | None = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            query = """
                SELECT
                    s.session_id,
                    s.device_id,
                    s.last_updated_at AS timestamp,
                    s.final_status AS status,
                    l.error_code AS code,
                    d.line_name,
                    (
                        SELECT h.message FROM robot_error_chat_histories h 
                        WHERE h.session_id = s.session_id AND h.step_no = 1 AND h.actor = 'system' 
                        LIMIT 1
                    ) as fallback_message
                FROM robot_error_sessions s
                JOIN robot_devices d ON d.device_id = s.device_id
                LEFT JOIN robot_error_logs l ON l.error_log_id = s.error_log_id
            """
            where_clauses = []
            params = []

            if device_id:
                where_clauses.append("s.device_id = %s")
                params.append(device_id)
            if line_name:
                where_clauses.append("d.line_name = %s")
                params.append(line_name)

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            query += """
                ORDER BY s.last_updated_at DESC
                LIMIT 500
            """
            
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            logs = []
            import re
            for row in rows:
                diag_type = "robot" if "ROBOT" in row['device_id'].upper() else "welder"
                code = row['code']
                if not code and row.get('fallback_message'):
                    m = re.search(r'([A-Z0-9]+)\s+에러', row['fallback_message'])
                    if m:
                        code = m.group(1).strip()
                    else:
                        m2 = re.search(r'([A-Z0-9]+)에러', row['fallback_message'])
                        if m2:
                            code = m2.group(1).strip()
                logs.append({
                    "code": code,
                    "timestamp": row['timestamp'].timestamp() * 1000, 
                    "diagType": diag_type,
                    "device": f"{row['line_name']} - {row['device_id']}",
                    "status": row['status']
                })
            return logs

@router.get('/engineer-calls')
def list_engineer_calls():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT s.session_id, h.created_at, h.message, s.device_id, l.error_code as code, d.line_name,
                    (
                        SELECT sub_h.message FROM robot_error_chat_histories sub_h 
                        WHERE sub_h.session_id = s.session_id AND sub_h.step_no = 1 AND sub_h.actor = 'system' 
                        LIMIT 1
                    ) as fallback_message
                FROM robot_error_chat_histories h
                JOIN robot_error_sessions s ON h.session_id = s.session_id
                JOIN robot_devices d ON s.device_id = d.device_id
                LEFT JOIN robot_error_logs l ON s.error_log_id = l.error_log_id
                WHERE (h.message ILIKE '%%호출%%' OR h.message ILIKE '%%call%%') AND h.actor = 'user'
                ORDER BY h.created_at DESC
                LIMIT 50
                """
            )
            rows = cursor.fetchall()
            calls = []
            for row in rows:
                from datetime import datetime
                ts = row['created_at']
                ts_ms = ts.timestamp() * 1000 if isinstance(ts, datetime) else 0
                code = row['code']
                if not code and row.get('fallback_message'):
                    import re
                    match = re.search(r'([A-Z0-9]+)\s+에러', row['fallback_message'])
                    if match:
                        code = match.group(1).strip()
                    else:
                        match2 = re.search(r'([A-Z0-9]+)에러', row['fallback_message'])
                        if match2:
                            code = match2.group(1).strip()
                calls.append({
                    "code": code,
                    "timestamp": ts_ms,
                    "device": f"{row['line_name']} - {row['device_id']}",
                    "message": row['message']
                })
            return calls

@router.get('/stats')
def get_dashboard_stats():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # 1. Today's stats
            cursor.execute(
                """
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE final_status = 'resolved') as resolved
                FROM robot_error_sessions
                WHERE started_at >= CURRENT_DATE
                """
            )
            today = cursor.fetchone()
            total = today['total'] if today else 0
            resolved = today['resolved'] if today else 0
            rate = (resolved / total * 100) if total > 0 else 0

            # 2. Daily trend (Last 10 days)
            cursor.execute(
                """
                SELECT 
                    TO_CHAR(day, 'MM/DD') as name,
                    COALESCE(SUM(CASE WHEN line_name = 'A' THEN 1 ELSE 0 END), 0) as "lineA",
                    COALESCE(SUM(CASE WHEN line_name = 'B' THEN 1 ELSE 0 END), 0) as "lineB",
                    COALESCE(SUM(CASE WHEN line_name = 'C' THEN 1 ELSE 0 END), 0) as "lineC",
                    COALESCE(SUM(CASE WHEN line_name = 'D' THEN 1 ELSE 0 END), 0) as "lineD"
                FROM (
                    SELECT CURRENT_DATE - i as day FROM generate_series(0, 9) i
                ) days
                LEFT JOIN (
                    SELECT s.started_at, d.line_name
                    FROM robot_error_sessions s
                    JOIN robot_devices d ON d.device_id = s.device_id
                ) sessions ON DATE_TRUNC('day', sessions.started_at) = days.day
                GROUP BY day
                ORDER BY day ASC
                """
            )
            trend = cursor.fetchall()

            return {
                "today_total": total,
                "today_resolution_rate": round(rate, 1),
                "daily_trend": trend
            }


@router.get('/devices')
def list_devices():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT device_id, line_name, line_num FROM robot_devices")
            return cursor.fetchall()


import csv
import os

@router.get('/csv-errors')
def list_csv_errors(type: str = "hyundai", q: str | None = None):
    errors = []
    try:
        from app.db import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT error_code, error_content FROM robot_error_manuals WHERE category = %s"
            params = [type.lower()]
            if q:
                query += " AND (error_code ILIKE %s OR error_content ILIKE %s)"
                params.extend([f"%{q}%", f"%{q}%"])
            query += " ORDER BY error_code ASC LIMIT 500"
            
            cursor.execute(query, params)
            for row in cursor.fetchall():
                errors.append({"code": row[0], "description": row[1]})
                
    except Exception as e:
        print(f"Error reading error manuals from DB: {e}")
        return []

    return errors


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

            # Fetch manufacturer for filtering
            cursor.execute(
                """
                SELECT m.manufacturer 
                FROM robot_devices d
                JOIN robot_models m ON d.model_id = m.model_id
                WHERE d.device_id = %s
                """,
                (req.device_id,),
            )
            device_row = cursor.fetchone()
            if device_row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='device_id not found',
                )
            manufacturer = device_row['manufacturer']

            # DB/매뉴얼 에러코드 유효성 검사 (필터링 방어막)
            if not is_valid_error_code(req.error_code, manufacturer=manufacturer):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"error_code '{req.error_code}' not found for brand '{manufacturer}'",
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

            # Real AI Analysis
            diagnosis = analyze_error_code(req.error_code, language=req.language.value, manufacturer=manufacturer)
            
            # Format message for initial response
            urgency_icon = '🔴' if diagnosis['urgency_level'] in ['높음', 'high'] else '🟡' if diagnosis['urgency_level'] in ['보통', 'medium'] else '🟢'
            if req.language.value == 'en':
                assistant_message = (
                    f"**[{req.error_code} Error Analysis]**\n"
                    f"Cause: {diagnosis['cause_analysis']}\n"
                    f"Action: {', '.join(diagnosis['action_method'])}\n"
                    f"Urgency: {urgency_icon} {diagnosis['urgency_level']}\n\n"
                    "Please review the checklist below for detailed inspection."
                )
            elif req.language.value == 'uz':
                assistant_message = (
                    f"**[{req.error_code} Xatolik tahlili]**\n"
                    f"Sababi: {diagnosis['cause_analysis']}\n"
                    f"Harakatlar: {', '.join(diagnosis['action_method'])}\n"
                    f"Shoshilinchlik: {urgency_icon} {diagnosis['urgency_level']}\n\n"
                    "Batafsil tekshirish uchun quyidagi nazorat ro'yxatini ko'rib chiqing."
                )
            else:
                assistant_message = (
                    f"**[{req.error_code} 에러 분석 결과]**\n"
                    f"원인: {diagnosis['cause_analysis']}\n"
                    f"조치: {', '.join(diagnosis['action_method'])}\n"
                    f"긴급도: {urgency_icon} {diagnosis['urgency_level']}\n\n"
                    "상세 점검을 위해 하단의 상세 점검 버튼을 선택해 주세요."
                )

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

            # Generate checklist items (using our service logic)
            followup = generate_followup_checklist(req.error_code, diagnosis_payload=diagnosis, language=req.language.value)
            checklist = followup['checklist_items']

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

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    "SELECT session_id, final_status, language FROM robot_error_sessions WHERE session_id = %s",
                    (session_id,),
                )
                session_row = cursor.fetchone()
                if session_row is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session not found')

                sess_lang = session_row.get('language', 'ko')

                if session_row['final_status'] in [SessionStatus.RESOLVED.value, SessionStatus.ABANDONED.value]:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='session is closed')

                if create_request_fingerprint_event(cursor, session_id, request_id):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='duplicate request_id')

                session_ctx = get_session_device_and_error(cursor, session_id)
                if session_ctx is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='session context lost')

                if req.actor == Actor.USER:
                    is_call_event = req.message and ("호출" in req.message or "call" in req.message.lower())
                    if req.selected_choice is None and not is_call_event:
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
                        (session_id, req.step_no, req.selected_choice, req.message, request_id), # .value 제거
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
                                 message='상담이 성공적으로 종료되었습니다. 더 이상 조치가 필요하지 않습니다.' if sess_lang == 'ko' else ('Konsultatsiya muvaffaqiyatli yakunlandi. Boshqa harakatlar talab qilinmaydi.' if sess_lang == 'uz' else 'Consultation completed successfully. No further action is required.'),
                                checklist=None,
                            ),
                            session_status=SessionStatus.RESOLVED,
                            request_id=request_id,
                        )

                    if req.selected_choice == 'X':
                        # Real AI Final Solution
                        checklist_results = (req.payload or {}).get('checklist_results')
                        solution = generate_final_solution(
                            session_ctx['error_code'], 
                            checklist_results=checklist_results,
                            language=req.language.value
                        )
                    
                        if sess_lang == 'en':
                            assistant_message = (
                                f"**[Final Assessment]**\n{solution['final_summary']}\n\n"
                                f"**[Handling Direction]**\n- " + "\n- ".join(solution['handling_direction']) + "\n\n"
                                f"**[Work Priority]**\n{solution['work_priority']}"
                            )
                        elif sess_lang == 'uz':
                            assistant_message = (
                                f"**[Yakuniy xulosa]**\n{solution['final_summary']}\n\n"
                                f"**[Yo'nalishni boshqarish]**\n- " + "\n- ".join(solution['handling_direction']) + "\n\n"
                                f"**[Ish ustuvorligi]**\n{solution['work_priority']}"
                            )
                        else:
                            assistant_message = (
                                f"**[최종 종합 판단]**\n{solution['final_summary']}\n\n"
                                f"**[처리 방향]**\n- " + "\n- ".join(solution['handling_direction']) + "\n\n"
                                f"**[작업 우선순위]**\n{solution['work_priority']}"
                            )
                    
                        cursor.execute(
                            """
                            INSERT INTO robot_error_chat_histories
                              (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                            VALUES (%s, %s, 'llm', 'diagnosis', NULL, %s, NULL, %s)
                            """,
                            (session_id, req.step_no + 1, assistant_message, str(uuid.uuid4())),
                        )
                        update_session_status(cursor, session_id, SessionStatus.ONGOING)

                        return ConsultationResponse(
                            status='ok',
                            session_id=session_id,
                            step_no=req.step_no + 1,
                            next_response_type=ResponseType.DIAGNOSIS,
                            assistant=AssistantPayload(
                                actor='llm',
                                response_type=ResponseType.DIAGNOSIS,
                                message=assistant_message,
                                checklist=None,
                            ),
                            session_status=SessionStatus.ONGOING,
                            request_id=request_id,
                        )

                    if is_call_event:
                        assistant_message = "엔지니어가 호출되었습니다. 잠시만 기다려 주십시오."
                        if req.language.value == 'en':
                            assistant_message = "Engineer has been called. Please wait."
                        elif req.language.value == 'uz':
                            assistant_message = "Muhandis chaqirildi. Iltimos, kuting."

                        cursor.execute(
                            """
                            INSERT INTO robot_error_chat_histories
                              (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                            VALUES (%s, %s, 'llm', 'overall', NULL, %s, NULL, %s)
                            """,
                            (session_id, req.step_no + 1, assistant_message, str(uuid.uuid4())),
                        )
                        update_session_status(cursor, session_id, SessionStatus.ONGOING)

                        return ConsultationResponse(
                            status='ok',
                            session_id=session_id,
                            step_no=req.step_no + 1,
                            next_response_type=ResponseType.OVERALL,
                            assistant=AssistantPayload(
                                actor='llm',
                                response_type=ResponseType.OVERALL,
                                message=assistant_message,
                                checklist=None,
                            ),
                            session_status=SessionStatus.ONGOING,
                            request_id=request_id,
                        )

                    # Fallback for unexpected choices
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
    except Exception as e:
        import traceback
        with open('/tmp/global_crash.txt', 'w') as f:
            f.write(traceback.format_exc())
        raise e




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


@router.post('/translate-text')
def translate_text(req: TranslateTextRequest):
    try:
        from core.worker_core import translate_general_text
    except ImportError:
        from backend_ai.core.worker_core import translate_general_text
        
    translated = translate_general_text(req.text, req.target_lang)
    return {"translated": translated}
