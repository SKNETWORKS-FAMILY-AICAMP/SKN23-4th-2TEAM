import sys
from app.db import get_db_connection

def main():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT prosrc FROM pg_proc WHERE proname = 'trgfn_validate_chat_rules';")
            row = cursor.fetchone()
            print("--- Trigger Code ---")
            if row:
                print(row[0])
            else:
                print("Trigger not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
