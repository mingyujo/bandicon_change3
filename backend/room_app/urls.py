# room_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.RoomListCreateAPIView.as_view(), name='room-list-create'),
    path('<int:pk>/', views.RoomDetailAPIView.as_view(), name='room-detail'),
    
    # '내 방 목록'
    path('my/', views.MyRoomListView.as_view(), name='my-room-list'), 
    
    # [추가] 특정 유저의 방 목록 (예: /api/v1/rooms/my/cho)
    path('my/<str:nickname>/', views.UserRoomListView.as_view(), name='user-room-list'),

    path('<int:pk>/leave/', views.RoomLeaveView.as_view(), name='room-leave'),
    path('<int:pk>/kick/', views.RoomKickView.as_view(), name='room-kick'),
    path('<int:pk>/confirm/', views.RoomConfirmView.as_view(), name='room-confirm'),
    path('<int:pk>/end/', views.RoomEndView.as_view(), name='room-end'),
    path('<int:pk>/evaluate/', views.MannerEvaluationAPIView.as_view(), name='room-evaluate'),
    
    path('<int:room_id>/chat/', views.GroupChatView.as_view(), name='group-chat'),
    
    # [오류 수정] 존재하지 않는 JoinSessionView를 참조하는 불필요한 라인이어서 주석 처리
    # path('join/', views.JoinSessionView.as_view(), name='join-session'), 

    # 2순위 (예약, 일정)
    path('<int:room_id>/sessions/<int:session_id>/join/', views.RoomSessionJoinView.as_view(), name='room-session-join'),
    path('sessions/<int:session_id>/reserve/', views.ReserveSessionView.as_view(), name='reserve-session'),
    path('sessions/<int:session_id>/cancel-reserve/', views.CancelReservationView.as_view(), name='cancel-reservation'),
    path('<int:room_id>/availability/', views.RoomAvailabilityView.as_view(), name='room-availability'),
]