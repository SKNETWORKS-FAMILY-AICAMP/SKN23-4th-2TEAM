from api.models import RobotErrorLog, RobotDevice, RobotErrorSession
from django.db.models.functions import TruncDate
from django.db.models import Count
from datetime import datetime, timedelta
# ============================
# 대시보드 (총 에러 수)
# ============================
print(f"전체 로그 수: {RobotErrorSession.objects.count()}")

# ============================
# 대시보드 (상태  = 정상/처리중)
# ============================
# 처리 중인
ongoing_count = RobotErrorSession.objects.filter(final_status='ongoing').count()
# 처리 완료(정상)
resolved_count = RobotErrorSession.objects.filter(final_status='resolved').count()

print(f"정상: {resolved_count}")
print(f"처리 중: {ongoing_count}")

# ============================
# 대시보드 (설비 가동률)
# ============================
error_devices_count = RobotErrorSession.objects.filter(final_status='ongoing').values('device_id').distinct().count()
total_devices = RobotDevice.objects.count()
if total_devices > 0:
    op_rate = ((total_devices - error_devices_count) / total_devices) * 100
else:
    op_rate = 0.0

print(f"진짜 에러 발생 중인 로봇 대수: {error_devices_count}")
print(f"설비 가동률: {op_rate}")

# ============================
# 대시보드 (라인별 에러 발생 그래프)
# ============================
last_week = datetime.now() - timedelta(days=7)
trends = RobotErrorLog.objects.filter(occurred_at__gte=last_week).annotate(date=TruncDate('occurred_at')).values('date', 'device__line_name').annotate(count=Count('error_log_id')).order_by('date')

print(f"\n{'날짜':<12} | {'라인':<10} | {'에러 건수'}")
print("-" * 35)
for t in trends:
    # t는 {'date': datetime.date(2026, 3, 15), 'device__line_name': 'A', 'count': 5} 형태의 딕셔너리예요.
    print(f"{str(t['date']):<12} | {t['device__line_name']:<10} | {t['count']}건")

# ============================
# 대시보드 (최근 에러 발생 로그 TOP 5)
# ============================
# 최근 7일 데이터 중 최신순으로 5개 추출
last_week = datetime.now() - timedelta(days=7)
recent_logs = RobotErrorLog.objects.filter(occurred_at__gte=last_week).order_by('-occurred_at')[:5]

# 상태값 매핑
status_mapping = {'normal': '정상', 'ongoing': '발생', 'processing': '처리중', 'resolved': '해결'}

# 데이터 반복 출력
if recent_logs:
    for log in recent_logs:
        # 연결된 세션 확인
        session = RobotErrorSession.objects.filter(error_log=log).first()
        display_status = status_mapping.get(session.final_status, '-') if session else '세션없음'
        
        # 출력용 데이터 가공
        time_str = log.occurred_at.strftime('%Y-%m-%d %H:%M')
        device_info = f"[라인 {log.device.line_name}-{log.device.line_num}] {log.device.model.model_id}"
        
        # 정렬 맞춰서 출력
        print(f"{time_str:^18} | {device_info:<45} | {log.error_code:^10} | {display_status:^8}")
else:
    print(f"{'최근 7일간 발생한 에러 로그가 없습니다.':^95}")



# ============================
# 대시보드 (7일간 가장 많이 발생한 에러 코드 TOP 3)
# ============================
# 1. 일주일 전 날짜 계산
last_week = datetime.now() - timedelta(days=7)

# 2. TOP 3 집계 로직
top_errors = RobotErrorLog.objects.filter(occurred_at__gte=last_week) \
    .values('error_code') \
    .annotate(count=Count('error_log_id')) \
    .order_by('-count')[:3]

# 3. 결과 출력
print(f"\n[최근 7일 에러 TOP 3]")
print(f"{'순위':<5} | {'에러코드':<10} | {'발생건수'}")
print("-" * 30)
for i, err in enumerate(top_errors, 1):
    print(f"{i:<5} | {err['error_code']:<10} | {err['count']}건")

# ============================
# 라인별 로봇 현황(카드용)
# ============================
devices = RobotDevice.objects.all()

for d in devices:
    # 모델에 만든 property 사용
    log = d.latest_error 
    status = d.current_status 
    err_time = log.occurred_at.strftime('%Y-%m-%d %H:%M') if log else "-"
    err_code = log.error_code if log else "-"
    print(f"장비ID: {d.device_id:<15} | 상태: {status:<10} | 에러코드: {err_code:<10} | 발생시간: {err_time} | 라인: {d.line_name} | 번호: {d.line_num}")

# ============================
# 전체 로봇 현황(리스트용)
# ============================
from api.models import RobotErrorLog
from api.serializers import RobotErrorLogSerializer
import json

# 1. [:10]을 지워서 전체 데이터를 가져옵니다.
# order_by('-occurred_at')은 최신순 정렬이라 그대로 두는 게 보기 편해요!
logs = RobotErrorLog.objects.all().order_by('-occurred_at')[:5]

# 2. 시리얼라이저 변환
serializer = RobotErrorLogSerializer(logs, many=True)

# 3. 결과 확인
print(f"\n총 {len(serializer.data)}건의 로그를 불러왔습니다.")

# 데이터가 너무 많으면 화면이 꽉 찰 수 있으니 주의하세요! 😊
print(f"\n{'발생 시간':<18} | {'장비 ID':<12} | {'에러 코드'}")
print("-" * 45)
for data in serializer.data:
    # serializer.data는 이제 딕셔너리 리스트입니다.
    print(f"{data['occurred_at']:<18} | {data['device']:<12} | {data['error_code']}")