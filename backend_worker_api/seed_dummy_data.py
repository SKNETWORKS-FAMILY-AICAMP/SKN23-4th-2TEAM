import random
from datetime import datetime, timedelta
import pytz
from app.db import get_db_connection
from psycopg2.extras import RealDictCursor

def seed_data():
    error_codes = ["E0101", "E0123", "E0502", "E0999", "W1024", "R0888"]
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
                    
                    # Random time during that day
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
                        """,
                        (device_id, error_log_id, started_at, last_updated_at, "resolved", "ko")
                    )

            conn.commit()
            print("Successfully seeded 10 days of dummy data.")

if __name__ == "__main__":
    seed_data()
