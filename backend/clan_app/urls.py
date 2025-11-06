# clan_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # FastAPI의 GET, POST /clans 
    path('', views.ClanListCreateView.as_view(), name='clan-list-create'),
    # FastAPI의 GET /clans/{clan_id} 
    path('<int:pk>/', views.ClanDetailView.as_view(), name='clan-detail'),
    
    # FastAPI의 GET /clans/{clan_id}/activity 
    path('<int:clan_id>/activity/', views.ClanActivityView.as_view(), name='clan-activity'),
    
    # FastAPI의 POST /clans/{clan_id}/join
    # clanjoinrequestcreativeview를 써야함 
    #path('<int:clan_id>/join/', views.ClanJoinRequestView.as_view(), name='clan-join'),
    
    # FastAPI의 POST /clans/{clan_id}/approve-all 
    #path('<int:clan_id>/approve-all/', views.ClanApproveAllView.as_view(), name='clan-approve-all'),
    
    # FastAPI의 POST /clans/requests/{request_id}/approve 
    path('requests/<int:request_id>/approve/', views.ClanApproveRequestView.as_view(), name='clan-approve-request'),
    
    # FastAPI의 POST /clans/requests/{request_id}/reject 
    #path('requests/<int:request_id>/reject/', views.ClanRejectRequestView.as_view(), name='clan-reject-request'),
    
    # FastAPI의 DELETE /clans/{clan_id}/members/{member_nickname} 
    #path('<int:clan_id>/members/<str:member_nickname>/', views.ClanKickMemberView.as_view(), name='clan-kick-member'),

    # FastAPI의 POST, DELETE /clans/{clan_id}/announcements 
    #path('<int:clan_id>/announcements/', views.ClanAnnouncementCreateView.as_view(), name='clan-announcement-create'),
    #path('announcements/<int:announcement_id>/', views.ClanAnnouncementDeleteView.as_view(), name='clan-announcement-delete'),

    # FastAPI의 GET, POST, DELETE /clans/{clan_id}/events 
    #path('<int:clan_id>/events/', views.ClanEventListCreateView.as_view(), name='clan-event-list-create'),
    #path('events/<int:event_id>/', views.ClanEventDeleteView.as_view(), name='clan-event-delete'),

    # FastAPI의 GET /clans/{clan_id}/dashboard  (room_app URL로 대체됨)
    # FastAPI의 GET /clans/{clan_id}/rooms  (room_app URL로 대체됨)
    # (이 로직은 room_app/views.py에서 처리하는 것이 더 효율적입니다)

    # FastAPI의 POST, DELETE /clans/boards/{board_id} 
    #path('<int:clan_id>/boards/', views.ClanBoardCreateView.as_view(), name='clan-board-create'),
    #path('boards/<int:board_id>/', views.ClanBoardDeleteView.as_view(), name='clan-board-delete'),
    
    # FastAPI의 GET /boards/clan/{board_id}  (board_app URL로 대체됨)

    # FastAPI의 GET, POST /chats/clan/{clan_id} 
    path('chat/<int:clan_id>/', views.ClanChatView.as_view(), name='clan-chat'),
    # ↓↓↓↓ 새로 추가할 URL (클랜 가입 신청) ↓↓↓↓
    path('<int:pk>/join/', views.ClanJoinRequestCreateView.as_view(), name='clan-join-request'),
    #가입신청목록보기
    path('<int:pk>/requests/', views.ClanJoinRequestListView.as_view(), name='clan-join-request-list'),
    # (주의: URL 경로를 'clans/'가 아닌 'clan-requests/'로 분리합니다)
    path('requests/<int:pk>/', views.ClanJoinRequestUpdateView.as_view(), name='clan-join-request-update'),

    # (URL 변수 이름을 'pk'가 아닌 'clan_pk'로 명확하게 지정)
    path('<int:clan_pk>/members/<str:nickname>/', views.ClanMemberRemoveView.as_view(), name='clan-member-remove'),

    # (URL 변수 이름을 'pk'로 통일합니다. IsClanOwner 권한이 'pk'를 찾기 때문입니다.)
    path('<int:pk>/announcements/', views.ClanAnnouncementView.as_view(), name='clan-announcement-create'),
]