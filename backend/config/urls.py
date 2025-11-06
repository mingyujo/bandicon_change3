"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
# config/urls.py

from django.contrib import admin
from django.urls import path, include
# --- 👇 2줄 추가 ---
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- 👇 여기에 API 라우팅 추가 ---
    # FastAPI의 /signup, /login, /profile/{nickname} 등을 처리
    path('api/v1/users/', include('user_app.urls')), 
    
    # FastAPI의 /rooms, /clans, /posts 등을 처리
    path('api/v1/rooms/', include('room_app.urls')),
    path('api/v1/boards/', include('board_app.urls')),
    path('api/v1/clans/', include('clan_app.urls')),
    path('api/v1/support/', include('support_app.urls')),
    path('api/v1/clan_app/', include('clan_app.urls')),
    # --- 👆 여기까지 추가 ---
    #path('api/v1/clan-requests/', include('clan_app.urls.requests')), # requests 관련 URL만 모은 파일
]
# --- 👇 개발 환경에서 MEDIA 파일을 서빙하기 위한 설정 ---
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# --- 👆 여기까지 추가 ---