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
# RobotErrorLog : 전체 오류 로그 목록용
# ============================
# class RobotErrorLogSerializer(serializers.ModelSerializer):
#     line_name = serializers.ReadOnlyField(source='device.line_name')
#     manufacturer = serializers.ReadOnlyField(source='device.model.manufacturer')
#     last_message = serializers.SerializerMethodField()

#     class Meta:
#         model = RobotErrorLog
#         fields = ['error_log_id', 'device', 'error_code', 'occurred_at', 'line_name', 'manufacturer', 'last_message']

#     def get_last_message(self, obj):
#         # 해당 에러 로그와 연결된 세션 찾기
#         session = RobotErrorSession.objects.filter(error_log=obj).order_by('-started_at').first()
#         if not session:
#             return None
#         # 세션의 마지막 LLM 메시지 가져오기
#         chat = RobotErrorChatHistory.objects.filter(session=session, actor='llm').order_by('-created_at').first()
#         return chat.message if chat else None

class RobotErrorLogSerializer(serializers.ModelSerializer):
    line = serializers.ReadOnlyField(source='device.line_name')
    device = serializers.ReadOnlyField(source='device.device_name')

    class Meta:
        model = RobotErrorLog
        fields = [
            'error_log_id',
            'line',
            'device',
            'error_code',
            'occurred_at'
        ]
    line_name = serializers.ReadOnlyField(source='device.line_name')
    # 1. 브랜드명
    manufacturer = serializers.ReadOnlyField(source='device.model.manufacturer')
    
    # 2. 마지막 에러 내용 (AI 메시지)
    last_message = serializers.SerializerMethodField()
    
    # 3. 체크리스트 해결 여부 요약
    checklist_status = serializers.SerializerMethodField()

    class Meta:
        model = RobotErrorLog
        fields = ['error_log_id', 'device', 'error_code', 'occurred_at', 'line_name', 'manufacturer', 'last_message', 'checklist_status']

    def get_last_message(self, obj):
        session = obj.roboterrorsession_set.order_by('-started_at').first()
        if session:
            chat = session.roboterrorchathistory_set.filter(actor='llm').order_by('-created_at').first()
            return chat.message if chat else None
        return None

    def get_checklist_status(self, obj):
        session = obj.roboterrorsession_set.order_by('-started_at').first()
        if session:
            items = session.roboterrorchecklistitem_set.all()
            total = items.count()
            checked = items.filter(is_checked=True).count()
            return f"{checked}/{total} 완료" if total > 0 else "항목 없음"
        return "세션 없음"


# ============================
# RobotErrorSession : 오류 세션 내부 관리용
# ============================
class RobotErrorSessionSerializer(serializers.ModelSerializer):

    class Meta:
        model = RobotErrorSession
        fields = [
            'session_id', 
            'device', 
            'error_log', 
            'started_at',
            'last_updated_at',
            'final_status',
        ]

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