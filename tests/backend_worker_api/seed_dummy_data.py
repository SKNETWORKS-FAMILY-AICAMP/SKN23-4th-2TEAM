import random
from datetime import datetime, timedelta
import pytz
import uuid
from app.db import get_db_connection
from psycopg2.extras import RealDictCursor

def seed_data():
    error_codes = ["E30988", "E2771", "E23276", "E26103", "E2100"]
    status_options = ["resolved"] # As requested by user
    
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # 1. Get available devices
            cursor.execute("SELECT device_id FROM robot_devices")
            devices = [row['device_id'] for row in cursor.fetchall()]
            
            if not devices:
                print("No devices found. Please ensure robot_devices table is populated.")
                return

            print(f"Generating dummy data for {len(devices)} devices...")

            # 2. Generate data for the past 10 days
            now = datetime.now(pytz.UTC)
            for i in range(10):
                target_date = now - timedelta(days=i)
                # Random number of errors per day between 10 and 25
                num_errors = random.randint(10, 25)
                
                print(f"Seeding {num_errors} errors for {target_date.date()}...")
                
                for _ in range(num_errors):
                    device_id = random.choice(devices)
                    error_code = random.choice(error_codes)
                    
                    # Random time during that day (For today, don't go into the future)
                    if i == 0:
                        hour = random.randint(0, now.hour)
                        max_minute = now.minute if hour == now.hour else 59
                        minute = random.randint(0, max_minute)
                    else:
                        hour = random.randint(0, 23)
                        minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    occurred_at = target_date.replace(hour=hour, minute=minute, second=second)
                    
                    # Insert into robot_error_logs
                    cursor.execute(
                        """
                        INSERT INTO robot_error_logs (device_id, error_code, occurred_at)
                        VALUES (%s, %s, %s)
                        RETURNING error_log_id
                        """,
                        (device_id, error_code, occurred_at)
                    )
                    error_log_id = cursor.fetchone()['error_log_id']
                    
                    # Insert into robot_error_sessions
                    # last_updated_at is usually 5-20 mins after started_at
                    started_at = occurred_at
                    resolution_delay = random.randint(5, 45)
                    last_updated_at = started_at + timedelta(minutes=resolution_delay)
                    
                    cursor.execute(
                        """
                        INSERT INTO robot_error_sessions (device_id, error_log_id, started_at, last_updated_at, final_status, language)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING session_id
                        """,
                        (device_id, error_log_id, started_at, last_updated_at, "resolved", "ko")
                    )
                    session_id = cursor.fetchone()['session_id']

                    # Insert dummy checklist items
                    static_pool = [
                        '제어기 외부 및 내부 전원 연결 상태를 확인하십시오.',
                        '관련 배선 및 커넥터 체결 상태를 확인하십시오.',
                        '서보 앰프 상태 이상 여부를 점검하십시오.',
                        'F1/F2 퓨즈 단선 여부를 확인하십시오.',
                        '전원 입력부 이상 흔적과 전압 상태를 확인하십시오.'
                    ]
                    num_items = random.randint(1, 4)
                    sampled = random.sample(static_pool, k=num_items)
                    for c_idx, text in enumerate(sampled, start=1):
                        cursor.execute(
                            """
                            INSERT INTO robot_error_checklist_items 
                              (session_id, item_order, item_content, is_presented, is_checked, created_at, updated_at)
                            VALUES (%s, %s, %s, true, %s, %s, %s)
                            """,
                            (session_id, c_idx, text, random.choice([True, False]), started_at, last_updated_at)
                        )

                    # 3. Insert Random Engineer Call Event (20% chance)
                    if random.random() < 0.2:
                        cursor.execute(
                             """
                             INSERT INTO robot_error_chat_histories 
                               (session_id, step_no, actor, response_type, selected_choice, message, request_id, created_at)
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                             """,
                             (session_id, 3, 'user', None, None, '엔지니어 호출', str(uuid.uuid4()), started_at + timedelta(minutes=2))
                        )
                        cursor.execute(
                             """
                             INSERT INTO robot_error_chat_histories 
                               (session_id, step_no, actor, response_type, selected_choice, message, request_id, created_at)
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                             """,
                             (session_id, 4, 'llm', 'overall', None, '엔지니어가 호출되었습니다. 잠시만 기다려 주십시오.', str(uuid.uuid4()), started_at + timedelta(minutes=3))
                        )
                        
                        # 신규 전용 호출 테이블 동시 적재
                        cursor.execute(
                             """
                             INSERT INTO engineer_calls 
                               (session_id, device_id, error_code, status, created_at, updated_at)
                             VALUES (%s, %s, %s, 'pending', %s, %s)
                             """,
                             (session_id, device_id, error_code, started_at + timedelta(minutes=2), started_at + timedelta(minutes=2))
                        )

            conn.commit()
            print("Successfully seeded 10 days of dummy data.")

if __name__ == "__main__":
    seed_data()
