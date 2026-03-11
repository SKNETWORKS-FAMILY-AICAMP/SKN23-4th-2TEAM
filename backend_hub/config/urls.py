"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.views.static import serve # 🟢 추가: 파일을 직접 쏴주는 모듈

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('api/', include('api.urls')),  <-- 나중에 API 연동할 때 주석 해제하세요!
]

# 1. CSS, JS 파일들 (/assets/...) 서빙
urlpatterns += [
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': settings.FRONTEND_DIST_DIR / 'assets',
    }),
]

# 2. 루트 경로에 있는 개별 이미지/설정 파일들 (vite.svg, favicon.ico 등) 서빙
urlpatterns += [
    re_path(r'^(?P<path>.*\.(svg|ico|png|jpg|jpeg|json|txt))$', serve, {
        'document_root': settings.FRONTEND_DIST_DIR,
    }),
]

# 3. 위에서 걸러지지 않은 모든 주소( / 포함)는 무조건 리액트 화면(index.html) 띄우기!
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]