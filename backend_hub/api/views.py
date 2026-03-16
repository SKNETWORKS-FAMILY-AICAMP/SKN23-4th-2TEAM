from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from .models import RobotDevice
from .serializers import RobotModelSerializer, RobotDeviceSerializer, RobotErrorLogSerializer, RobotErrorSessionSerializer, RobotErrorChatHistorySerializer
from .models import RobotModel, RobotDevice, RobotErrorLog, RobotErrorSession, RobotErrorChatHistory

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
            # 전체 에러 수
            total_errors = RobotErrorSession.objects.count()
            
            # 처리 완료(정상) 수 (final_status가 resolved인 것)
            resolved_count = RobotErrorSession.objects.filter(final_status='resolved').count()
            
            # 처리중인 수 (final_status가 ongoing인 것)
            ongoing_count = RobotErrorSession.objects.filter(final_status='ongoing').count()
    
            # 설비 가동률 계산
            # 실제 에러 발생 중인 로봇 대수
            error_devices_count = RobotErrorSession.objects.filter(final_status='ongoing').values('device_id').distinct().count()
            # 전체 로봇 대수
            total_devices = RobotDevice.objects.count()
            
            if total_devices > 0:
                # 가동률 = (전체 로봇 - 에러 난 로봇 대수) / 전체 로봇 * 100
                op_rate = ((total_devices - error_devices_count) / total_devices) * 100
            else:
                op_rate = 0.0

            # 명세서 양식에 맞춰서 응답
            return Response({
                "total_errors": total_errors,
                "resolved_count": resolved_count,
                "ongoing_count": ongoing_count,
                "total_devices": round(op_rate, 1)
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
                'device_info' : f"[라인 {log.device.line_name}-{log.device.line_num}] {log.device.model.model_id} ({log.error_code})",
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
# 로봇 현황 관련 API
# =========================
class RobotDeviceListView(APIView):
    """
    로봇 현황 카드용 view(사이드바 - Lines)
    path : /api/admin/lines
    """
    def get(self, request):
        devices = RobotDevice.objects.all()                     # 모든 데이터 조회
        serializer = RobotDeviceSerializer(devices, many=True)  # 데이터 변환(리스트기에 many=True 작성)
        return Response(serializer.data)                        # JSON 형태의 데이터 반환

# =========================
# 로그 관련 API
# =========================
class RobotErrorLogListView(APIView):
    """
    전체 오류 로그 목록용 view(사이드바 - Logs)
    path : /api/admin/logs
    """
    def get(self, request):
        error_logs = RobotErrorLog.objects.all()
        serializer = RobotErrorLogSerializer(error_logs, many=True)
        return Response(serializer.data)

