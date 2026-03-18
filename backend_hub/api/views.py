from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from .models import RobotDevice
from .serializers import RobotModelSerializer, RobotDeviceSerializer, RobotErrorLogSerializer, RobotErrorSessionSerializer, RobotErrorChatHistorySerializer
from .models import RobotModel, RobotDevice, RobotErrorLog, RobotErrorSession, RobotErrorChatHistory
from datetime import datetime, timedelta
from django.db.models.functions import TruncDate
from django.utils import timezone

# =========================
# 대시보드 관련 API
# =========================
# 종합 요약 정보
class DashboardSummaryView(APIView):
    """
    종합 요약 정보 수치를 반환하는 View(사이드바 - Dashboard)
    path :  /api/admin/dashboard/summary
    """
    def get(self, request):
            # 오늘 날짜 가져오기
            today = timezone.localdate()

            # 전체 에러 수
            total_errors = RobotErrorSession.objects.filter(started_at__date=today).count()
            
            # 처리 완료(정상) 수 (final_status가 resolved인 것)
            resolved_count = RobotErrorSession.objects.filter(started_at__date=today, final_status='resolved').count()
            
            # 미해결 수 (진행 중, 중단, 실패 등 resolved가 아닌 모든 건수)
            unresolved_count = total_errors - resolved_count
    
            # 에러 해결률 계산
            if total_errors > 0:
                resolution_rate = (resolved_count / total_errors) * 100
            else:
                resolution_rate = 0.0

            # 명세서 양식에 맞춰서 응답
            return Response({
                "total_errors": total_errors,
                "resolved_count": resolved_count,
                "unresolved_count": unresolved_count,
                "resolution_rate": round(resolution_rate, 1)
            })

# 라인별 에러 발생 그래프
class DashboardLineTrendsView(APIView):
    """
    라인별 에러 발생 비교를 반환하는 View(사이드바 - Dashboard)
    path :  /api/admin/dashboard/line-trends
    """
    def get(self, request):
        # 최근 7일
        last_week = datetime.now() - timedelta(days=7)
        # 데이터를 날짜 단위로 묶어서 집계
        trends = RobotErrorLog.objects.filter(occurred_at__gte=last_week).annotate(date=TruncDate('occurred_at')).values('date', 'device__line_name').annotate(count=Count('error_log_id')).order_by('date')
        
        # 명세서 양식에 맞춰서 응답
        return Response({"lines": trends})

# 최근 에러 로그 TOP 5
class DashboardRecentErrorLogsView(APIView):
    """
    최근 에러 로그를 반환하는 View(사이드바 - Dashboard)
    path :  /api/admin/dashboard/recent-logs
    """
    def get(self, request):
        # 최근 7일
        last_week = datetime.now() - timedelta(days=7)
        recent_logs = RobotErrorLog.objects.select_related('device', 'device__model').filter(occurred_at__gte=last_week).order_by('-occurred_at')[:5]

        status_mapping = {
            'normal' : '정상',
            'ongoing' : '발생',
            'processing' : '처리중',
            'resolved' : '해결'
        }

        results = []
        for log in recent_logs:
            session = RobotErrorSession.objects.filter(error_log=log).first()

            if session:
                display_status = status_mapping.get(session.final_status, '-')
            else:
                display_status = 'no_session'

            results.append({
                'occurred_at' : log.occurred_at.strftime('%Y-%m-%d %H:%M'),
                'device_info' : f"[라인 {log.device.line_name}-{log.device.line_num}] {log.device.device_id} ({log.error_code})",
                'final_status' : display_status
            })

        return Response({"recent_logs": results})

# 7일간 가장 많이 발생한 에러 코드 TOP 3
class DashboardTopErrorsView(APIView):
    """
    일주일 가장 많이 발생한 에러 코드 TOP 3를 반환하는 View(사이드바 - Dashboard)
    path :  /api/admin/dashboard/top-errors
    """
    def get(self, request):
        # 최근 7일
        last_week = datetime.now() - timedelta(days=7)
        top_errors = RobotErrorLog.objects.filter(occurred_at__gte=last_week).values('error_code').annotate(count=Count('error_log_id')).order_by('-count')[:3]
        return Response({"top_errors": list(top_errors)})

# =========================
# 라인별 로봇 현황(카드용)
# =========================
class RobotDeviceListView(APIView):
    """
    로봇 현황 카드용 view(사이드바 - Lines)
    path : /api/admin/lines
    """
    def get(self, request):
        devices = RobotDevice.objects.select_related('model').all()
        serializer = RobotDeviceSerializer(devices, many=True)
        return Response(serializer.data)

# =========================
# 전체 로봇 현황(리스트용) - 브랜드명, 에러 내용 추가해야함
# =========================
class RobotErrorLogListView(APIView):
    """
    전체 오류 로그 목록용 view(사이드바 - Logs)
    path : /api/admin/logs
    """
    def get(self, request):
        qs = RobotErrorLog.objects.select_related('device__model').prefetch_related(
            'roboterrorsession_set__roboterrorchathistory_set',
            'roboterrorsession_set__roboterrorchecklistitem_set'
        )

        # 필터
        line = request.GET.get('line')
        if line and line != 'all':
            qs = qs.filter(device__line_name=line)

        device = request.GET.get('device')
        if device:
            qs = qs.filter(device__device_id__icontains=device)

        code = request.GET.get('code')
        if code:
            qs = qs.filter(error_code__icontains=code)

        start = request.GET.get('startDate')
        end = request.GET.get('endDate')

        if start:
            qs = qs.filter(occurred_at__date__gte=start)
        if end:
            qs = qs.filter(occurred_at__date__lte=end)

        qs = qs.order_by('-occurred_at')

        # 페이지네이션
        page = int(request.GET.get('page', 1))
        size = int(request.GET.get('size', 20))

        start_idx = (page - 1) * size
        end_idx = start_idx + size

        total = qs.count()
        data = qs[start_idx:end_idx]

        serializer = RobotErrorLogSerializer(data, many=True)

        return Response({
            "total": total,
            "results": serializer.data
        })