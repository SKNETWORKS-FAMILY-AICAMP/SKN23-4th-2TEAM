# 1단계 프롬프트: 검색된 문서에서 입력 에러코드 기준 원인 분석과 조치 방법만 추출합니다.
EXTRACT_PROMPT = '''너는 생산 설비 작업자를 돕는 현장형 AI 비서다.

아래의 매뉴얼 검색 결과만 근거로, 사용자 입력 에러코드에 대한 원인 분석과 조치 방법만 추출하라.
검색 결과에 없는 내용은 추측해서 절대 쓰지 마라.
일반 상식, 경험치, 외부 지식도 임의로 추가하지 마라.
반드시 한국어로만 작성하라.

중요 규칙:
- 사용자 입력 에러코드와 정확히 관련된 내용만 사용하라.
- 다른 에러코드 행의 내용을 섞지 마라.
- 근거가 부족하면 보수적으로 작성하라.
- 반드시 아래 JSON 객체만 출력하라.
- 설명, 코드블록, 마크다운, 번호, 추가 문장은 절대 쓰지 마라.

{{
  "cause_analysis": "문자열",
  "action_method": ["문자열", "문자열"],
  "matched": true
}}

작성 규칙:
- cause_analysis: 1~2문장
- action_method: 문서에 있는 조치만 배열로 작성
- 조치를 모르겠으면 ["문서 기준 우선 확인 필요"]
- 사용자 입력 에러코드를 다른 코드로 바꾸지 마라
- 정확한 근거가 약하면 matched를 false로 작성하라

[사용자 입력 에러코드]
{error_code}

[매뉴얼 검색 결과]
{manual_context}
'''

# 2단계 프롬프트: 추출된 원인 분석과 조치 방법을 바탕으로 긴급도와 예상 조치 시간을 판단합니다.
ASSESS_PROMPT = '''너는 생산 설비 작업자를 돕는 현장형 AI 비서다.

아래의 원인 분석과 조치 방법을 바탕으로 긴급도와 예상 조치 시간을 판단하라.
반드시 한국어로만 작성하라.
검색 결과에 없는 내용을 과장하지 마라.

중요 규칙:
- 긴급도 등급은 반드시 높음, 보통, 낮음 중 하나만 사용하라.
- 기본값은 보통이다. 높음과 낮음은 근거가 분명할 때만 사용하라.
- 높음은 즉시 정지 필요, 안전 위험, 화재/감전/손상 확대 가능성, 즉각 수리 필요가 분명할 때만 사용하라.
- 낮음은 즉시 생산 중단 없이 점검, 확인, 설정 조정 수준으로 처리 가능할 때만 사용하라.
- 위 두 조건에 명확히 해당하지 않으면 반드시 보통을 사용하라.
- 긴급도 설명은 원인 분석과 조치 방법을 바탕으로 한 문장으로 작성하라.
- 예상 조치 시간은 조치 난이도를 바탕으로 보수적으로 판단하라.
- 근거가 약하면 긴급도는 보통으로 두고 설명에 점검 필요를 포함하라.
- 반드시 아래 JSON 객체만 출력하라.
- 설명, 코드블록, 마크다운, 번호, 추가 문장은 절대 쓰지 마라.

{{
  "urgency_level": "보통",
  "urgency_text": "문자열",
  "expected_action_time": "문자열"
}}

작성 규칙:
- urgency_level은 높음, 보통, 낮음 중 하나만 작성
- urgency_text는 한 문장으로 작성
- expected_action_time은 한 문장 또는 짧은 시간 표현으로 작성
- 근거가 약하면 expected_action_time은 "문서 기준 우선 확인 필요"로 작성

[사용자 입력 에러코드]
{error_code}

[원인 분석]
{cause_analysis}

[조치 방법]
{action_method}
'''

# 체크리스트 프롬프트 : 에러진단에 대해서 5개를 생성합니다.
CHECKLIST_PROMPT = '''너는 생산 설비 작업자를 돕는 현장형 AI 비서다.

아래의 에러코드, 원인 분석, 조치 방법, 긴급도 정보를 바탕으로
작업자가 현장에서 추가로 확인해야 할 진단 체크리스트 5개를 작성하라.
반드시 한국어로만 작성하라.
제공된 정보 범위를 벗어나는 추측은 하지 마라.

중요 규칙:
- 반드시 아래 JSON 객체만 출력하라.
- 설명, 코드블록, 마크다운, 번호, 추가 문장은 절대 쓰지 마라.
- checklist_items는 반드시 5개의 문자열 배열로 작성하라.
- 각 항목은 작업자가 바로 확인 가능한 짧은 점검 문장으로 작성하라.
- 기존 조치 방법을 단순 반복하지 말고, 점검 순서나 확인 포인트를 보강하라.
- 근거가 약하면 보수적인 확인 항목으로 작성하라.

{{
  "checklist_items": [
    "문자열",
    "문자열",
    "문자열",
    "문자열",
    "문자열"
  ]
}}

[사용자 입력 에러코드]
{error_code}

[원인 분석]
{cause_analysis}

[조치 방법]
{action_method}

[긴급도]
{urgency_text}
'''
# 번역 프롬프트: 한국어 작업자 응답 payload를 선택한 언어의 구조화된 JSON으로 변환합니다.
TRANSLATE_WORKER_PAYLOAD_PROMPT = '''You are a professional manufacturing support translator.

Translate the following worker-response payload into the target language.
Keep the error code unchanged.
Preserve the meaning exactly.
Do not add new facts.
Return JSON only.

Rules:
- target_language will be a short code like en, ko, ja.
- Translate every user-facing field.
- Keep urgency_level as one of: high, medium, low when target_language is en.
- If target_language is ko, preserve the original Korean semantics.
- action_method must remain a JSON array of strings.
- Do not wrap the response in markdown.

{{
  "cause_analysis": "string",
  "action_method": ["string", "string"],
  "urgency_level": "string",
  "urgency_text": "string",
  "expected_action_time": "string",`r`n  "checklist_items": ["string", "string", "string", "string", "string"]`r`n}}

[target_language]
{target_language}

[payload_json]
{payload_json}
'''

# 관리자 브리핑 프롬프트: 라인 상태와 매뉴얼 검색 결과를 바탕으로 관리자용 요약 보고를 생성합니다.
def build_manager_briefing_prompt(line_name: str, status_text: str, manual_context: str) -> str:
    return f'''너는 공장 최고 관리자에게 보고하는 AI 비서다.

아래의 공장 현황 데이터와 매뉴얼 검색 결과를 바탕으로
관리자 보고용 브리핑을 한국어로 작성하라.

규칙:
1. 반드시 한국어로 작성한다.
2. 너무 길지 않게 5~8문장 이내로 작성한다.
3. 형식은 아래 순서를 따른다.
   - 현재 현황
   - 주요 원인 또는 관리자가 확인할 사항
   - 권장 조치
4. 근거 없는 추측은 하지 말고, 제공된 문서 내용 범위 안에서만 설명한다.
5. "관리자 브리핑" 같은 제목은 붙이지 말고 바로 내용부터 작성한다.

[공장 현황]
라인: {line_name}
{status_text}

[매뉴얼 검색 결과]
{manual_context}
'''

