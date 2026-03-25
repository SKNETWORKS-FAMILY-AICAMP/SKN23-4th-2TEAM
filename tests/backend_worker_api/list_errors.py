from app.db import get_db_connection

def main():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Let's check robot_devices or error logs for existing codes
            cursor.execute("SELECT error_code FROM robot_error_logs LIMIT 3")
            rows = cursor.fetchall()
            print("--- Valid error codes in robot_error_logs ---")
            for r in rows:
                print(r[0])
            
            cursor.execute("SELECT DISTINCT error_code FROM robot_error_logs LIMIT 5")
            rows2 = cursor.fetchall()
            print("--- Distinct codes ---")
            for r in rows2:
                print(r[0])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
