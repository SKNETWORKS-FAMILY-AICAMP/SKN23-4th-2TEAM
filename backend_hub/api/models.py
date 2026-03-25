from django.db import models

# ============================
# RobotModel : 로봇 제조사 및 모델 마스터 정보 저장
# manufacturer : 제조사명
# model_name : 모델명
# manual_tag : 해당 모델의 매뉴얼 식별 태그
# unique_together : 제조사와 모델명의 중복 등록 방지
# ============================
class RobotModel(models.Model):
    model_id = models.BigAutoField(primary_key=True)
    manufacturer = models.CharField(max_length=100)
    model_name = models.CharField(max_length=100)
    manual_tag = models.CharField(max_length=120)
    
    # ----------------------------
    # class Meta : 모델의 메타데이터(설정) 정의
    # db_table : DB 테이블명 
    # unique_together : 특정 컬럼들의 조합이 중복되지 않도록 설정 (제조사+모델명 중복 방지)
    # ----------------------------
    class Meta:
        db_table = 'robot_models'
        unique_together = (('manufacturer', 'model_name'),)

    # ----------------------------
    # 출력 예시 : [현대] HS200
    # ----------------------------
    def __str__(self):
        return f"{self.manufacturer} {self.model_name}"

# ============================
# RobotDevice : 공장 내 설치된 개별 로봇(장비) 정보
# device_id : 장비 일련번호 (Primary Key)
# models.ForeignKey : 로봇 모델 정보를 RobotModel 테이블에서 가져옴
# on_delete=models.CASCADE : 모델 정보가 삭제되면 해당 모델의 장비 정보도 삭제
# unique_together : 동일 라인 내에서 번호 중복 방지
# ============================
class RobotDevice(models.Model):
    device_id = models.CharField(max_length=50, primary_key=True)
    line_name = models.CharField(max_length=20)
    line_num = models.IntegerField()
    model = models.ForeignKey(RobotModel, on_delete=models.CASCADE, db_column='model_id')

    class Meta:
        db_table = 'robot_devices'
        unique_together = (('line_name', 'line_num'),)

    @property
    def latest_error(self):
        # SQL에서의 JOIN + LIMIT 1과 같은 효과
        return self.roboterrorlog_set.order_by('-occurred_at').first()

    @property
    def current_status(self):
        # 최근 세션 JOIN
        session = self.roboterrorsession_set.order_by('-started_at').first()
        return session.final_status if session else "normal"
    
    # ----------------------------
    # 출력 예시 : A라인-1번 (ROBOT_07)
    # ----------------------------
    def __str__(self):
        return f"{self.line_name}라인-{self.line_num}번 ({self.device_id})"


# ============================
# RobotErrorLog : 로봇에서 발생한 원천 에러 로그 저장
# error_log_id : 에러 로그 고유 ID
# models.ForeignKey : 에러가 발생한 장비 정보를 RobotDevice에서 가져옴
# occurred_at : 에러 발생 시각 (기본값 현재 시간)
# ============================
class RobotErrorLog(models.Model):
    error_log_id = models.BigAutoField(primary_key=True)
    device = models.ForeignKey(RobotDevice, on_delete=models.CASCADE, db_column='device_id')
    error_code = models.CharField(max_length=50)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'robot_error_logs'

    # ----------------------------
    # 출력 예시 : 2026-03-14 14:00:00 | ROBOT_07 | C153
    # ----------------------------
    def __str__(self):
        return f"{self.occurred_at} | {self.device_id} | {self.error_code}"   

# ============================
# RobotErrorSession : 에러 조치를 위한 사용자-LLM 상담 세션 관리
# models.ForeignKey(RobotErrorLog) : 어떤 에러 로그에 대한 상담인지 연결 (null 허용)
# language : 상담 진행 언어 (ko, en 등)
# final_status : 세션의 최종 상태 (ongoing, resolved, unresolved, abandoned)
# on_delete=models.SET_NULL : 원천 로그가 삭제되어도 상담 내역은 유지
# ============================
class RobotErrorSession(models.Model):
    session_id = models.BigAutoField(primary_key=True)
    device = models.ForeignKey(RobotDevice, on_delete=models.CASCADE, db_column='device_id')
    error_log = models.ForeignKey(RobotErrorLog, on_delete=models.SET_NULL, null=True, db_column='error_log_id')
    language = models.CharField(max_length=10)
    started_at = models.DateTimeField(auto_now_add=True)
    last_updated_at = models.DateTimeField(auto_now=True)
    final_status = models.CharField(max_length=20, default='ongoing')

    class Meta:
        db_table = 'robot_error_sessions'

    # ----------------------------
    # 출력 예시 : 세션 1: ROBOT_07 (ongoing)
    # ----------------------------
    def __str__(self):
        return f"세션 {self.session_id}: {self.device_id} ({self.final_status})"

# ============================
# RobotErrorChatHistory : 세션 내 상세 채팅 내역 (턴 단위 저장)
# models.ForeignKey : 상담 세션 정보를 RobotErrorSession에서 가져옴
# actor : 메시지 주체 (user, llm, system)
# response_type : 응답 유형 (overall, checklist, diagnosis)
# selected_choice : 사용자 선택값 (O, X)
# request_id : 클라이언트 중복 요청 방지용 UUID
# ============================
class RobotErrorChatHistory(models.Model):
    chat_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(RobotErrorSession, on_delete=models.CASCADE, db_column='session_id')
    step_no = models.IntegerField()
    actor = models.CharField(max_length=20)
    response_type = models.CharField(max_length=30, null=True, blank=True)
    selected_choice = models.CharField(max_length=1, null=True, blank=True)
    request_id = models.UUIDField()
    message = models.TextField()
    is_resolved = models.BooleanField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'robot_error_chat_histories'

    # ----------------------------
    # 출력 예시 : 세션 1 - 단계 1 (user)
    # ----------------------------
    def __str__(self):
        return f"세션 {self.session_id} - 단계 {self.step_no} ({self.actor})"

# ============================
# RobotErrorChecklistItem : 체크리스트 항목
# ============================
from django.core.validators import MinValueValidator, MaxValueValidator

class RobotErrorChecklistItem(models.Model):
    checklist_item_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(RobotErrorSession, on_delete=models.CASCADE, db_column='session_id')
    item_order = models.SmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    is_presented = models.BooleanField(default=True)
    is_checked = models.BooleanField(default=False)
    item_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'robot_error_checklist_items'
        unique_together = (('session', 'item_order'),)

    # ----------------------------
    # 출력 예시 : 세션 1 - 체크리스트 항목 1 (O)
    # ----------------------------
    def __str__(self):
        return f"세션 {self.session_id} - 체크리스트 항목 {self.item_order} ({'O' if self.is_checked else 'X'})"

# ============================
# EngineerCall : 엔지니어 호출 요청 관리
# session : 호출이 발생한 상담 세션 (RobotErrorSession FK)
# device : 호출 대상 장비 (RobotDevice FK)
# status : 호출 상태 (pending, accepted, resolved, canceled)
# created_at : 호출 요청 시각
# updated_at : 상태 변경 시각
# ============================
class EngineerCall(models.Model):
    call_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(RobotErrorSession, on_delete=models.CASCADE, db_column='session_id')
    device = models.ForeignKey(RobotDevice, on_delete=models.CASCADE, db_column='device_id')
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'engineer_calls'

    # ----------------------------
    # 출력 예시 : 호출 1: ROBOT_07 (pending)
    # ----------------------------
    def __str__(self):
        return f"호출 {self.call_id}: {self.device_id} ({self.status})"

