import sys
import os
import traceback
from pydantic import BaseModel

# Add backend to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # backend_worker_api
ROOT_DIR = os.path.dirname(BASE_DIR)

sys.path.append(BASE_DIR)
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, "backend_ai"))

from app.routers.consultations import start_consultation
from app.schemas import StartConsultationRequest

class DummyLanguage:
    value = "ko"

class DummyRequest(BaseModel):
    request_id: str = "123e4567-e89b-12d3-a456-426614174000"
    language: str = "ko"
    device_id: str = "ROBOT_A1" # Need to check if this exists in DB
    error_code: str = "E123"

def main():
    try:
        # First find a valid device_id
        from app.db import get_db_connection
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT device_id FROM robot_devices LIMIT 1")
                row = cursor.fetchone()
                if row:
                    dev_id = row[0]
                    print(f"Using valid Device ID: {dev_id}")
                else:
                    print("No devices found in DB!")
                    return
        
        req = StartConsultationRequest(
            request_id="123e4567-e89b-12d3-a456-426614174000",
            language="ko",
            device_id=dev_id,
            error_code="E0502" # Valid error code from DB
        )
        print("Triggering start_consultation...")
        res = start_consultation(req)
        print(f"Success! Res: {res}")
    except Exception as e:
        print("--- Error in start_consultation ---")
        traceback.print_exc()

if __name__ == "__main__":
    main()
