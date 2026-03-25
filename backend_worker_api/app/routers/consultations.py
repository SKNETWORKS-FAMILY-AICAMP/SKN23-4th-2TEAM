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
                    l.device_id,
                    l.occurred_at AS timestamp,
                    COALESCE(s.final_status, 'ongoing') AS status,
                    l.error_code AS code,
                    d.line_name,
                    (
                        SELECT h.message FROM robot_error_chat_histories h 
                        WHERE h.session_id = s.session_id AND h.step_no = 1 AND h.actor = 'system' 
                        LIMIT 1
                    ) as fallback_message
                FROM robot_error_logs l
                JOIN robot_devices d ON d.device_id = l.device_id
                LEFT JOIN robot_error_sessions s ON s.error_log_id = l.error_log_id
            """
            where_clauses = []
            params = []

            if device_id:
                where_clauses.append("l.device_id = %s")
                params.append(device_id)
            if line_name:
                where_clauses.append("d.line_name = %s")
                params.append(line_name)

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            query += """
                ORDER BY l.occurred_at DESC
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
                SELECT c.call_id, c.session_id, c.created_at, s.device_id, c.error_code as code, d.line_name, c.status
                FROM engineer_calls c
                JOIN robot_error_sessions s ON c.session_id = s.session_id
                JOIN robot_devices d ON s.device_id = d.device_id
                ORDER BY c.created_at DESC
                LIMIT 500
                """
            )
            rows = cursor.fetchall()
            calls = []
            for row in rows:
                from datetime import datetime
                ts = row['created_at']
                ts_ms = ts.timestamp() * 1000 if isinstance(ts, datetime) else 0
                calls.append({
                    "call_id": row['call_id'],
                    "status": row['status'],
                    "code": row['code'] or '알 수 없음',
                    "timestamp": ts_ms,
                    "device": f"{row['line_name']} - {row['device_id']}",
                    "message": '엔지니어 호출'
                })
            return calls


@router.post('/engineer-calls/{call_id}/resolve')
def resolve_engineer_call(call_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "UPDATE engineer_calls SET status = 'resolved', updated_at = NOW() WHERE call_id = %s RETURNING session_id",
                (call_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Call not found")
            cursor.execute(
                "UPDATE robot_error_sessions SET final_status = 'resolved', last_updated_at = NOW() WHERE session_id = %s",
                (row['session_id'],)
            )
        conn.commit()
    return {"status": "ok"}


@router.post('/engineer-calls/resolve-all')
def resolve_all_engineer_calls():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE robot_error_sessions 
                SET final_status = 'resolved', last_updated_at = NOW() 
                FROM engineer_calls 
                WHERE robot_error_sessions.session_id = engineer_calls.session_id AND engineer_calls.status = 'pending'
                """
            )
            cursor.execute(
                "UPDATE engineer_calls SET status = 'resolved', updated_at = NOW() WHERE status = 'pending'"
            )
        conn.commit()
    return {"status": "ok"}


@router.post('/engineer-calls/{call_id}/unresolve')
def unresolve_engineer_call(call_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "UPDATE engineer_calls SET status = 'pending', updated_at = NOW() WHERE call_id = %s RETURNING session_id",
                (call_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Call not found")
            cursor.execute(
                "UPDATE robot_error_sessions SET final_status = 'ongoing', last_updated_at = NOW() WHERE session_id = %s",
                (row['session_id'],)
            )
        conn.commit()
    return {"status": "ok"}

@router.get('/stats')
def get_dashboard_stats():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # 1. Today's stats
            cursor.execute(
                """
                SELECT 
                    COUNT(l.error_log_id) as total,
                    COUNT(l.error_log_id) FILTER (WHERE s.final_status = 'resolved') as resolved
                FROM robot_error_logs l
                LEFT JOIN robot_error_sessions s ON l.error_log_id = s.error_log_id
                WHERE l.occurred_at >= CURRENT_DATE
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
                    SELECT l.occurred_at as started_at, d.line_name
                    FROM robot_error_logs l
                    JOIN robot_devices d ON d.device_id = l.device_id
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

            # DB/매뉴얼 에러코드 유효성 검사
            manual_found = is_valid_error_code(req.error_code, manufacturer=manufacturer)

            # Always insert a new record for manual consultation reporting to update Today logs
            cursor.execute(
                """
                INSERT INTO robot_error_logs (device_id, error_code, occurred_at)
                VALUES (%s, %s, NOW())
                RETURNING error_log_id
                """,
                (req.device_id, req.error_code),
            )
            error_log_id = cursor.fetchone()['error_log_id']

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

            if manual_found:
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
                
                # PREPEND NOTICE IF WELDING ERROR 
                is_welding = any('welding' in str(doc.get('metadata', {}).get('category', '')).lower() or 'welding' in str(doc.get('metadata', {}).get('source_file', '')).lower() for doc in diagnosis.get('documents', []))
                
                if is_welding:
                    notice = "⚠️ **[안내] 이 코드는 로봇 에러가 아닌 '용접기' 전용 에러 코드입니다.**\n\n"
                    if req.language.value == 'en':
                        notice = "⚠️ **[Notice] This code is a 'Welder' specific error, not a Robot error.**\n\n"
                    elif req.language.value == 'uz':
                        notice = "⚠️ **[Eslatma] Bu kod Robot xatosi emas, balki 'Payvandlash mashinasi' xatosi.**\n\n"
                    assistant_message = notice + assistant_message

                # Generate checklist items (using our service logic)
                followup = generate_followup_checklist(req.error_code, diagnosis_payload=diagnosis, language=req.language.value)
                checklist = followup['checklist_items']

                # 체크리스트 DB 적재 이력 기록 추가
                for c_idx, c_item in enumerate(checklist, start=1):
                    cursor.execute(
                        """
                        INSERT INTO robot_error_checklist_items 
                          (session_id, item_order, item_content, is_presented, is_checked, created_at, updated_at)
                        VALUES (%s, %s, %s, true, false, NOW(), NOW())
                        """,
                        (session_id, c_idx, c_item['item']),
                    )
            else:
                assistant_message = (
                    f"**[{req.error_code} 에러 보고]**\n\n"
                    f"해당 에러코드는 {manufacturer}의 시스템 매뉴얼 및 DB 문서에서 찾을 수 없습니다.\n"
                    f"에러 일시와 발생 내역은 **오늘의 통계 및 로그에 성공적으로 기록 대기**되었습니다.\n\n"
                    f"보다 정확한 대응을 위해 현장 장치 매뉴얼 또는 정비팀을 직접 참고해 주시기 바랍니다."
                )
                if req.language.value == 'en':
                    assistant_message = (
                        f"**[{req.error_code} Error Reported]**\n\n"
                        f"This error code could not be found in the {manufacturer} manual database.\n"
                        f"The event has been **logged successfully in the system records**.\n\n"
                        f"Please refer to your physical machine guide or contact maintenance."
                    )
                elif req.language.value == 'uz':
                     assistant_message = ( ... ) # Uzbekistan translation fallback later or none
                checklist = []

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
                        # 1. Fetch last response type
                        cursor.execute(
                            """
                            SELECT response_type 
                            FROM robot_error_chat_histories 
                            WHERE session_id = %s AND actor = 'llm' 
                            ORDER BY step_no DESC 
                            LIMIT 1
                            """,
                            (session_id,)
                        )
                        last_resp = cursor.fetchone()
                        last_type = last_resp['response_type'] if last_resp else 'overall'

                        # 2. Stage 1 -> Stage 2 (Overall to Checklist)
                        # 페이로드에 체크리스트 결과가 포함되어 있다면 Stage 3(진단)로 바로 이동하도록 조건을 수정합니다.
                        if last_type == 'overall' and not (req.payload and req.payload.get('checklist_results')):
                            followup = generate_followup_checklist(
                                session_ctx['error_code'], 
                                language=req.language.value
                            )
                            checklist = followup['checklist_items']
                            
                            # 기존 체크리스트 항목 초기화 후 신규 적재
                            cursor.execute("DELETE FROM robot_error_checklist_items WHERE session_id = %s", (session_id,))
                            for c_idx, c_item in enumerate(checklist, start=1):
                                cursor.execute(
                                    """
                                    INSERT INTO robot_error_checklist_items 
                                      (session_id, item_order, item_content, is_presented, is_checked, created_at, updated_at)
                                    VALUES (%s, %s, %s, true, false, NOW(), NOW())
                                    """,
                                    (session_id, c_idx, c_item['item']),
                                )

                            assistant_message = "상세 점검을 위해 아래 체크리스트를 확인하고 조치 결과를 제출해 주세요."
                            if req.language.value == 'en':
                                assistant_message = "Please review the checklist below and submit the results."
                            elif req.language.value == 'uz':
                                assistant_message = "Iltimos, quyidagi nazorat ro'yxatini ko'rib chiqing va natijalarni yuboring."

                            cursor.execute(
                                """
                                INSERT INTO robot_error_chat_histories
                                  (session_id, step_no, actor, response_type, selected_choice, message, is_resolved, request_id)
                                VALUES (%s, %s, 'llm', 'checklist', NULL, %s, false, %s)
                                """,
                                (session_id, req.step_no + 1, assistant_message, str(uuid.uuid4())),
                            )
                            update_session_status(cursor, session_id, SessionStatus.ONGOING)

                            return ConsultationResponse(
                                status='ok',
                                session_id=session_id,
                                step_no=req.step_no + 1,
                                next_response_type=ResponseType.CHECKLIST,
                                assistant=AssistantPayload(
                                    actor='llm',
                                    response_type=ResponseType.CHECKLIST,
                                    message=assistant_message,
                                    checklist=checklist,
                                ),
                                session_status=SessionStatus.ONGOING,
                                request_id=request_id,
                            )

                        # 3. Stage 2 -> Stage 3 (Checklist to Diagnosis)
                        else:
                            checklist_results = (req.payload or {}).get('checklist_results')
                            
                            # 체크리스트 점검 완료 시 DB 업데이트 연동
                            if checklist_results and isinstance(checklist_results, list):
                                for res_item in checklist_results:
                                    if isinstance(res_item, dict):
                                        item_text = res_item.get('item') or res_item.get('question')
                                        is_ok = bool(res_item.get('is_ok'))
                                        cursor.execute(
                                            """
                                            UPDATE robot_error_checklist_items
                                            SET is_checked = %s, updated_at = NOW()
                                            WHERE session_id = %s AND item_content = %s
                                            """,
                                            (is_ok, session_id, item_text)
                                        )

                            solution = generate_final_solution(
                                session_ctx['error_code'], 
                                checklist_results=checklist_results,
                                language=req.language.value
                            )
                            has_unchecked = any(isinstance(item, dict) and item.get('status') == 'unchecked' for item in solution.get('checklist_items', []))
                        
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
                                    checklist=[item['item'] for item in solution.get('checklist_items', []) if isinstance(item, dict) and item.get('status') == 'unchecked'],
                                    has_unchecked_items=has_unchecked
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

                        # 전용 호출 테이블에 적재 연동
                        cursor.execute(
                            """
                            INSERT INTO engineer_calls (session_id, device_id, error_code, status, created_at, updated_at)
                            VALUES (%s, %s, %s, 'pending', NOW(), NOW())
                            """,
                            (session_id, session_ctx['device_id'], session_ctx['error_code'])
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




@router.get('/recent-abandoned')
def get_recent_abandoned(device_id: str):
    """
    특정 디바이스의 가장 최근에 abandoned 처리된 세션을 가져옵니다.
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT s.session_id, s.device_id, s.language, s.final_status, s.last_updated_at,
                       l.error_code
                FROM robot_error_sessions s
                LEFT JOIN robot_error_logs l ON s.error_log_id = l.error_log_id
                WHERE s.device_id = %s AND s.final_status = 'abandoned'
                ORDER BY s.last_updated_at DESC
                LIMIT 1
                """,
                (device_id,)
            )
            row = cursor.fetchone()
            if not row:
                return {}
            
            # Timestamp conversion for safety
            if row.get('last_updated_at'):
                 row['last_updated_at'] = row['last_updated_at'].timestamp() * 1000
                 
            return row


@router.post('/{session_id}/resolve-abandoned')
def resolve_abandoned_session(session_id: int):
    """
    Abandoned 상태의 세션을 작업자가 Resolved로 처리합니다.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE robot_error_sessions SET final_status = 'resolved', last_updated_at = NOW() WHERE session_id = %s AND final_status = 'abandoned'",
                (session_id,)
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Abandoned session not found or already processed")
        conn.commit()
    return {"status": "ok"}


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
