
# config/urls.py

from django.contrib import admin
from django.urls import path, include
# --- 👇 2줄 추가 ---
from django.conf import settings
from django.conf.urls.static import static
from user_app.views import ChatSummaryView, FriendshipDetailView
from .views import index # 추가 
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
   # 1. 채팅 요약 (/api/v1/chats/summary)
    path('api/v1/chats/summary/', ChatSummaryView.as_view(), name='chat-summary'),
    
    # 2. 친구 기능 (/api/v1/friends/cho)
    path('api/v1/friends/<str:nickname>', FriendshipDetailView.as_view(), name='friend-detail-direct'),

    # --- 👇 React (SPA) 서빙을 위한 Catch-all 패턴 ---
    # API나 Admin 등이 아닌 모든 요청은 index.html로 보냄 (클라이언트 라우팅 지원)
    path('', index, name='index'),
    path('<path:path>', index),
]
# --- 👇 개발 환경에서 MEDIA 파일을 서빙하기 위한 설정 ---
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# --- 👆 여기까지 추가 ---