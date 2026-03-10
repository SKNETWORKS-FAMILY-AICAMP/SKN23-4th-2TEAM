from django.db import models
# from django.contrib.auth.models import User

# ============================
# 1. ChatHistory: 채팅 내역 저장
# ============================
class ChatHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE) 
    message = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# ============================
# 2. Documents: 업로드된 문서 관리
# ============================
class Document(models.Model):
    # 문서 상태값 관리 (데이터 유틸리티 역할)
    STATUS_CHOICES = [
        ('pending', '대기 중'),
        ('processing', '처리 중'),
        ('completed', '완료'),
        ('failed', '실패'),
    ]
    title = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    uploaded_at = models.DateTimeField(auto_now_add=True)

# ============================
# 3. ErrorLogs: 시스템 에러 기록 (운영 통제용)
# ============================
class ErrorLog(models.Model):
    error_code = models.CharField(max_length=50)
    message = models.TextField()
    occurred_at = models.DateTimeField(auto_now_add=True)