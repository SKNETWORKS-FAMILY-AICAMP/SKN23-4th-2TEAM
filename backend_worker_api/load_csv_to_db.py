import csv
import os
from app.db import get_db_connection

def main():
    print("🚀 Starting CSV to Database Migration...")
    
    table_sql = """
    CREATE TABLE IF NOT EXISTS robot_error_manuals (
        id SERIAL PRIMARY KEY,
        category VARCHAR(20) NOT NULL,
        error_code VARCHAR(50) NOT NULL,
        error_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, error_code)
    );
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(table_sql)
        print("✅ Table `robot_error_manuals` verified.")
        
        # Relative to backend_worker_api/
        csv_files = {
            "hyundai": "../error/hyundai_errors.csv",
            "ur": "../error/ur_errors.csv",
            "welding": "../error/welding_errors.csv"
        }
        
        for category, file_path in csv_files.items():
            if not os.path.exists(file_path):
                print(f"⚠️ {file_path} not found. Skipping.")
                continue
                
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                next(reader, None)  # Skip header
                
                rows = []
                for row in reader:
                    if len(row) < 2:
                        continue
                    code = row[0].strip()
                    content = row[1].strip()
                    if code and content:
                        rows.append((category, code, content))
                        
                if rows:
                    cursor.executemany(
                        """
                        INSERT INTO robot_error_manuals (category, error_code, error_content)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (category, error_code) DO UPDATE
                        SET error_content = EXCLUDED.error_content
                        """,
                        rows
                    )
                    print(f"✅ Loaded {len(rows)} records for `{category}`.")
                    
    print("🎉 CSV Migration Complete!")

if __name__ == "__main__":
    main()
