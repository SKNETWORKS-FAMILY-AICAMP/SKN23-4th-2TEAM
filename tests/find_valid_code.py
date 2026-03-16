import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # This is generally workspace root
sys.path.append(os.path.join(BASE_DIR, "backend_ai"))

from core.worker_core import is_valid_error_code

def main():
    test_codes = ["E0502", "E0101", "R0888", "E0123", "E001", "E123", "A01", "E-123"]
    valid = []
    print("Testing codes for '현대로보틱스'...")
    for c in test_codes:
        if is_valid_error_code(c, manufacturer="현대로보틱스"):
            valid.append(c)
    
    print(f"Valid codes: {valid}")
    if not valid:
        # Check without manufacturer
        print("Testing codes without manufacturer...")
        for c in test_codes:
             if is_valid_error_code(c):
                 print(f"Valid without brand: {c}")

if __name__ == "__main__":
    main()
