#===========================
# 실제 DB의 표 만들기
#===========================

from django.db import models
from django.contrib.auth.models import User

# ============================
# ChatHistory : 채팅 내역 저장
# models.ForeignKey : 유저 정보를 User 테이블에서 가져옴
# User : 사용자 테이블과 연결
# on_delete=models.CASCADE : user가 탈퇴하면 user의 채팅내역도 삭제
# ============================
class ChatHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE) 
    message = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# ============================
# Document : 업로드된 문서 관리
# STATUS_CHOICES : 문서 상태값 관리
# ============================
class Document(models.Model):
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
    # __str__ : 관리자 페이지 목록에서 데이터를 어떻게 보여줄지 결정
    # '문서.pdf - 완료' 형태로 목록에 표시
    # ============================
    def __str__(self):
        return f"{self.title} - {self.status}"

# ============================
# ErrorLog : 시스템 에러 기록
# ============================
class ErrorLog(models.Model):
    error_code = models.CharField(max_length=50)
    message = models.TextField()
    occurred_at = models.DateTimeField(auto_now_add=True)