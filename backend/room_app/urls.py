# room_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # FastAPI의 GET, POST /rooms 
    path('', views.RoomListCreateAPIView.as_view(), name='room-list-create'),
    
    # FastAPI의 GET /rooms/my/{nickname} 
    #path('my/<str:nickname>/', views.MyRoomListView.as_view(), name='my-room-list'),
    
    # FastAPI의 GET, PUT, DELETE /rooms/{room_id} 
    path('<int:room_id>/', views.RoomDetailAPIView.as_view(), name='room-detail'),
    
    # FastAPI의 POST /rooms/join 
    path('join/', views.JoinSessionView.as_view(), name='join-session'),
    
    # FastAPI의 POST /rooms/leave 
    #path('leave/', views.LeaveSessionView.as_view(), name='leave-session'),
    
    # FastAPI의 POST /rooms/session/reserve 
    #path('session/reserve/', views.ReserveSessionView.as_view(), name='reserve-session'),
    
    # FastAPI의 POST /rooms/session/cancel-reservation 
    #path('session/cancel-reservation/', views.CancelReservationView.as_view(), name='cancel-reservation'),
    
    # FastAPI의 DELETE /rooms/{room_id}/members/{member_nickname} 
    #path('<int:room_id>/members/<str:member_nickname>/', views.KickMemberView.as_view(), name='kick-member'),
    
    # FastAPI의 POST /rooms/{room_id}/confirm 
    #path('<int:room_id>/confirm/', views.ConfirmRoomView.as_view(), name='confirm-room'),
    
    # FastAPI의 POST /rooms/{room_id}/end 
    #path('<int:room_id>/end/', views.EndRoomView.as_view(), name='end-room'),
    
    # FastAPI의 GET, POST /rooms/{room_id}/availability 
    #path('<int:room_id>/availability/', views.RoomAvailabilityView.as_view(), name='room-availability'),
    
    # FastAPI의 POST /evaluations 
    #path('evaluations/', views.SubmitMannerEvaluationView.as_view(), name='submit-evaluation'),
    
    # FastAPI의 GET, POST /chat/group 
    path('chat/group/<int:room_id>/', views.GroupChatView.as_view(), name='group-chat'),
]