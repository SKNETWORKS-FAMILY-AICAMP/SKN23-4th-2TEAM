from app.db import get_db_connection

def main():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'robot_error_logs'
            """)
            rows = cursor.fetchall()
            print("--- Columns in robot_error_logs ---")
            for r in rows:
                print(f"{r[0]} ({r[1]})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
