import sys
import os

# Add target relative workspace paths
sys.path.append("/Users/jy/SKN23-4th-2TEAM/backend_ai")

from core.worker_core import generate_final_solution

# Mock data
error_code = "E0502"
diagnosis_payload = {
    "error_code": "E0502",
    "cause_analysis": "모터 과부하가 발생했습니다.",
    "action_method": ["전원을 끄고 냉각하십시오.", "인버터 출력 전압을 확인하십시오."],
    "urgency_text": "높음"
}
checklist_results = [
    {"question": "모터가 정상적으로 작동 중인지 확인합니다.", "is_ok": True},
    {"question": "CB가 OFF 상태인지 확인합니다.", "is_ok": False}
]

try:
    print("Testing generate_final_solution...")
    result = generate_final_solution(
        error_code=error_code,
        diagnosis_payload=diagnosis_payload,
        checklist_results=checklist_results,
        language="ko"
    )
    print("\n✅ Success! Result:")
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"\n❌ Failed: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
