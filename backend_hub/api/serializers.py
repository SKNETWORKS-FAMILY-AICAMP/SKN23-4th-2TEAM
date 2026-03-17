# ============================
# JSON 형태로 변환
# ============================

from rest_framework import serializers
from .models import RobotModel, RobotDevice, RobotErrorLog, RobotErrorSession, RobotErrorChatHistory

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
    error_code = serializers.SerializerMethodField()
    occurred_at = serializers.SerializerMethodField()
    final_status = serializers.SerializerMethodField()

    class Meta:
        model = RobotDevice
        fields = [
            'device_id', 
            'line_name', 
            'line_num', 
            'model', 
            'error_code', 
            'occurred_at', 
            'final_status'
        ]

    def get_last_session(self, obj):
        return RobotErrorSession.objects.filter(device_id=obj.device_id).order_by('-started_at').first()

    def get_occurred_at(self, obj):
        session = self.get_last_session(obj)
        
        if session and session.final_status == 'ongoing':
            if session.error_log:
                return session.error_log.occurred_at.strftime('%Y-%m-%d %H:%M')
            else:
                return session.started_at.strftime('%Y-%m-%d %H:%M')   
        return "-" 

    def get_error_code(self, obj):
        session = self.get_last_session(obj)
        if session and session.final_status == "ongoing":
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