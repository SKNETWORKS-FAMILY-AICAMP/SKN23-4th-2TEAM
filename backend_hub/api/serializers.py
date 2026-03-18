# ============================
# JSON 형태로 변환
# ============================

from rest_framework import serializers
from .models import RobotModel, RobotDevice, RobotErrorLog, RobotErrorSession, RobotErrorChatHistory, RobotErrorChecklistItem

# ============================
# RobotModel : 로봇 모델 정보
# ============================
class RobotModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RobotModel
        fields = ['model_id', 'manufacturer', 'model_name', 'manual_tag']

# ============================
# RobotDevice : 로봇 현황 카드용
# ============================
class RobotDeviceSerializer(serializers.ModelSerializer):
    manufacturer = serializers.ReadOnlyField(source='model.manufacturer')
    error_code = serializers.SerializerMethodField()
    occurred_at = serializers.SerializerMethodField()
    final_status = serializers.SerializerMethodField()

    class Meta:
        model = RobotDevice
        fields = [
            'device_id', 
            'line_name', 
            'line_num', 
            'manufacturer',
            'error_code', 
            'occurred_at', 
            'final_status'
        ]

    def get_last_session(self, obj):
        return RobotErrorSession.objects.filter(device_id=obj.device_id).order_by('-started_at').first()

    def get_occurred_at(self, obj):
        session = self.get_last_session(obj)
        
        if session:
            if session.error_log:
                return session.error_log.occurred_at.strftime('%Y-%m-%d %H:%M')
            else:
                return session.started_at.strftime('%Y-%m-%d %H:%M')   
        return "-" 

    def get_error_code(self, obj):
        session = self.get_last_session(obj)
        if session:
            return session.error_log.error_code if session.error_log else "-" 
        return "-"

    def get_final_status(self, obj): 
        session = self.get_last_session(obj)
        if session:
            return session.final_status
        return "resolved"

# ============================
# RobotErrorSession : 오류 세션 내부 관리용
# ============================
class RobotErrorSessionSerializer(serializers.ModelSerializer):
    # 초기 진단
    initial_diagnosis = serializers.SerializerMethodField()
    # 체크리스트
    checklist_items = serializers.SerializerMethodField()
    # 최종 진단
    final_diagnosis = serializers.SerializerMethodField()
    class Meta:
        model = RobotErrorSession
        fields = ['session_id', 'started_at', 'initial_diagnosis', 'checklist_items', 'final_diagnosis']
    def get_initial_diagnosis(self, obj):
        chat = obj.roboterrorchathistory_set.filter(response_type='overall').first()
        return chat.message if chat else None

    def get_checklist_items(self, obj):
        return obj.roboterrorchecklistitem_set.all().order_by('item_order').values('checklist_item_id', 'item_content', 'is_checked')
    
    def get_final_diagnosis(self, obj):
        chat = obj.roboterrorchathistory_set.filter(response_type='diagnosis').first()
        return chat.message if chat else None

# ============================
# RobotErrorLog : 전체 오류 로그 목록용
# ============================
class RobotErrorLogSerializer(serializers.ModelSerializer):
    line_name = serializers.ReadOnlyField(source='device.line_name')

    # 브랜드명
    manufacturer = serializers.ReadOnlyField(source='device.model.manufacturer')

    # 상태
    final_status = serializers.SerializerMethodField()

    # 에러내용 (세션별로 묶인 데이터 전체)
    sessions = RobotErrorSessionSerializer(source='roboterrorsession_set', many=True)

    class Meta:
        model = RobotErrorLog
        fields = [
            'error_log_id', 
            'occurred_at',   # 시간
            'line_name',     # 라인
            'device',        # 장비
            'manufacturer',  # 브랜드명
            'error_code',    # 코드
            'final_status',  # 상태
            'sessions'       # 에러내용 (클릭 시 보여줄 상세 데이터)
        ]

    def get_final_status(self, obj):
        # 해당 로그에 연결된 가장 최신 세션의 상태를 가져옵니다.
        latest_session = obj.roboterrorsession_set.order_by('-started_at').first()
        return latest_session.final_status if latest_session else "resolved"

# ============================
# RobotErrorChatHistory : 상세 채팅 내역용
# ============================
class RobotErrorChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RobotErrorChatHistory
        fields = [
            'chat_id',
            'session',
            'step_no',
            'actor',
            'response_type',
            'selected_choice',
            'request_id',
            'message',
            'is_resolved',
            'created_at'
        ]

# ============================
# RobotErrorChecklistItem : 체크리스트 항목용
# ============================
class RobotErrorChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RobotErrorChecklistItem
        fields = [
            'checklist_item_id',
            'session',
            'item_order',
            'is_presented',
            'is_checked',
            'item_content',
            'created_at',
            'updated_at'
        ]