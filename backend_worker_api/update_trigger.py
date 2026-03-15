import sys
from app.db import get_db_connection

def main():
    sql = """
CREATE OR REPLACE FUNCTION trgfn_validate_chat_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.actor = 'llm' THEN
        IF NEW.response_type IS NULL THEN
            RAISE EXCEPTION 'response_type is required when actor = llm';
        END IF;
        IF NEW.selected_choice IS NOT NULL THEN
            RAISE EXCEPTION 'selected_choice must be NULL when actor = llm';
        END IF;
    ELSIF NEW.actor = 'user' THEN
        -- Lift validation for Call events
        IF NEW.selected_choice IS NULL AND NOT (NEW.message ILIKE '%%호출%%' OR NEW.message ILIKE '%%call%%') THEN
            RAISE EXCEPTION 'selected_choice is required when actor = user';
        END IF;
        IF NEW.response_type IS NOT NULL THEN
            RAISE EXCEPTION 'response_type must be NULL when actor = user';
        END IF;
    ELSE
        IF NEW.selected_choice IS NOT NULL THEN
            RAISE EXCEPTION 'selected_choice must be NULL when actor = system';
        END IF;
        IF NEW.response_type IS NOT NULL THEN
            RAISE EXCEPTION 'response_type must be NULL when actor = system';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()
            print("Successfully updated trigger function 'trgfn_validate_chat_rules'")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
