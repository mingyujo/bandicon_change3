# user_app/urls.py

from django.urls import path
from . import views
# 👇 [수정] TokenObtainPairView는 views.py의 커스텀 뷰를 사용
# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
# )
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [


# 2. 회원가입
    # Special Setup (No-Shell Environment)
    path('special-operator/', views.SpecialOperatorCreateView.as_view(), name='special-operator-create'),

    path('signup/', views.UserCreateAPIView.as_view(), name='signup'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # 1. 인증
    # 👇 [수정] CustomTokenObtainPairView 사용 (12:41 응답)
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeAPIView.as_view(), name='user-me'),
    # 3. SMS 인증
    # 👇 [수정] 이메일 인증으로 경로 변경
    path('send-verification-email/', views.SendVerificationSMSView.as_view(), name='send_email'),
    path('verify-email-code/', views.VerifySMSCodeView.as_view(), name='verify_email'),

    # 4. 프로필
    path('profile/<str:nickname>/', views.UserProfileAPIView.as_view(), name='profile_detail'),
    path('profile/update-nickname/', views.UpdateNicknameAPIView.as_view(), name='update_nickname'),
    path('profile/<str:nickname>/upload-image/', views.UploadProfileImageView.as_view(), name='upload_profile_image'),

    # 5. 친구 (12:37 응답)
    # 👇 [수정] <str:nickname>으로 변경
    # 5. 친구 (순서 변경: request가 nickname보다 먼저 와야 함)
    path('friends/request/', views.SendFriendRequestView.as_view(), name='friend_request'),
    path('friends/accept/', views.AcceptFriendRequestView.as_view(), name='friend_accept'),
    path('friends/reject/', views.RejectFriendRequestView.as_view(), name='friend_reject'),
    path('friends/<str:nickname>/', views.FriendListView.as_view(), name='friend_list'),
    
    # ▼▼▼ [수정] 순서 변경: 구체적인 URL이 변수 URL보다 먼저 와야 함 ▼▼▼
    path('alerts/read-by-url/', views.AlertReadByUrlView.as_view(), name='alert-read-by-url'),
    # ▲▲▲ [수정] ▲▲▲

    # 6. 알림 & 푸시
    path('alerts/<str:nickname>/', views.AlertListView.as_view(), name='alert_list'),
    # path('alerts/<int:alert_id>/read/', views.AlertReadView.as_view(), name='alert_read'), 
    # path('alerts/read-by-url/', views.AlertReadByUrlView.as_view(), name='alert_read_by_url'), 
    path('register-device/', views.RegisterDeviceView.as_view(), name='register_device'),

    path('notifications/counts', views.NotificationCountsView.as_view(), name='notification-counts'),
    path('counts', views.UserCountsView.as_view(), name='user-counts'),

    path('alerts/', views.AlertListView.as_view(), name='alert-list'),
    path('alerts/<int:pk>/', views.AlertReadView.as_view(), name='alert-read-update'),
    # ▼▼▼ [수정] URL을 더 명확하게 변경 ▼▼▼
    # (POST /api/v1/users/alerts/<int:pk>/read/)
    path('alerts/<int:pk>/read/', views.AlertReadView.as_view(), name='alert-read'),
    # ▲▲▲ [수정] ▲▲▲

   # 1. /api/v1/users/friends/<nickname>/ (기본)
    # path('friends/<str:nickname>/', views.FriendshipDetailView.as_view(), name='friend-detail'),

    # 2. /api/v1/chats/summary/ (채팅 요약)
    path('summary/', views.ChatSummaryView.as_view(), name='chat-summary'), 
    # 주의: 위 경로는 /api/v1/chats/summary/ 로 연결되도록 config설정과 맞춰야 함.
    
]