from django.urls import path
from . import views

urlpatterns = [
    # dashboard
    path('admin/dashboard/summary/', views.DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('admin/dashboard/line-trends/', views.DashboardLineTrendsView.as_view(), name='dashboard-line-trends'),
    path('admin/dashboard/recent-logs/', views.DashboardRecentErrorLogsView.as_view(), name='dashboard-recent-logs'),
    path('admin/dashboard/top-errors/', views.DashboardTopErrorsView.as_view(), name='dashboard-top-errors'),
    # lines
    path('admin/lines/', views.RobotDeviceListView.as_view(), name='robot-device-list'),
    # logs
    path('admin/logs/', views.RobotErrorLogListView.as_view(), name='robot-error-log-list'),
]