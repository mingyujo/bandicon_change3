# clan_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # (GET) /api/v1/clans/
    # (POST) /api/v1/clans/
    # --- 👇 [오류 수정] 'ClanListCreateView' -> 'ClanListCreateAPIView' ---
    path('', views.ClanListCreateAPIView.as_view(), name='clan-list-create'),
    
    # (GET) /api/v1/clans/<int:pk>/
    path('<int:pk>/', views.ClanDetailAPIView.as_view(), name='clan-detail'),

    # (POST) /api/v1/clans/<int:pk>/join/
    path('<int:pk>/join/', views.ClanJoinRequestCreateView.as_view(), name='clan-join'),
    
    # (POST) /api/v1/clans/<int:clan_id>/requests/<int:req_id>/
    path('<int:clan_id>/requests/<int:req_id>/', views.ClanJoinRequestUpdateView.as_view(), name='clan-request-update'),

    # (DELETE) /api/v1/clans/<int:clan_id>/members/<str:nickname>/
    path('<int:clan_id>/members/<str:nickname>/', views.ClanKickMemberView.as_view(), name='clan-kick-member'),
    
    # (POST) /api/v1/clans/<int:pk>/approve-all/
    path('<int:pk>/approve-all/', views.ClanApproveAllView.as_view(), name='clan-approve-all'),
    
    # (GET, POST) /api/v1/clans/<int:clan_id>/chat/
    path('<int:clan_id>/chat/', views.ClanChatListView.as_view(), name='clan-chat'),
    
    # (GET) /api/v1/clans/<int:pk>/rooms/
    path('<int:pk>/rooms/', views.ClanRoomListAPIView.as_view(), name='clan-room-list'),
    
    # (GET) /api/v1/clans/<int:pk>/activity/
    path('<int:pk>/activity/', views.ClanMemberActivityAPIView.as_view(), name='clan-activity'),

    # (GET, POST) /api/v1/clans/<int:clan_id>/announcements/
    path('<int:clan_id>/announcements/', views.ClanAnnouncementListCreateView.as_view(), name='clan-announcements'),
    
    # (GET, POST) /api/v1/clans/<int:clan_id>/events/
    path('<int:clan_id>/events/', views.ClanEventListCreateView.as_view(), name='clan-events'),
    
    # (GET, POST) /api/v1/clans/<int:clan_id>/boards/
    path('<int:clan_id>/boards/', views.ClanBoardListCreateView.as_view(), name='clan-boards'),


    # --- (이하 테스트용 URL) ---
    path('test/all/', views.TestAllView.as_view(), name='test-all'),
    path('test/auth/', views.TestAuthView.as_view(), name='test-auth'),
    path('1/test/owner/', views.TestClanOwnerView.as_view(), name='test-owner'),
    path('1/test/member/', views.TestClanMemberView.as_view(), name='test-member'),
]