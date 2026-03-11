# ============================
# JSON 형태로 변환(직렬화)
# ============================

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ChatHistory, Document, ErrorLog

# ============================
# user : 사용자 정보
# id, username, email만 json으로 변환
# ============================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

# ============================
# chat_history : 채팅 내역
# '__all__' : 모든 컬럼을 json으로 변환
# ============================
class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = '__all__'

# ============================
# Documents : 문서 정보
# '__all__' : 모든 컬럼을 json으로 변환
# ============================     
class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'   

# ============================
# ErrorLog : 오류 로그
# '__all__' : 모든 컬럼을 json으로 변환
# ============================     
class ErrorLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorLog
        fields = '__all__'   
