import sys
from app.db import get_db_connection

def main():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = cursor.fetchall()
            print("--- Database Tables ---")
            for t in tables:
                print(f"- {t[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
