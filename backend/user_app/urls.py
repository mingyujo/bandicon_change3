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
    # 1. 인증
    # 👇 [수정] CustomTokenObtainPairView 사용 (12:41 응답)
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeAPIView.as_view(), name='user-me'),

    # 2. 회원가입
    path('signup/', views.UserCreateAPIView.as_view(), name='signup'),
    
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
    path('friends/<str:nickname>/', views.FriendListView.as_view(), name='friend_list'),
    path('friends/request/', views.SendFriendRequestView.as_view(), name='friend_request'),
    # path('friends/accept/', views.AcceptFriendRequestView.as_view(), name='friend_accept'),
    # path('friends/reject/', views.RejectFriendRequestView.as_view(), name='friend_reject'),
    
    # 6. 알림 & 푸시
    path('alerts/<str:nickname>/', views.AlertListView.as_view(), name='alert_list'),
    # path('alerts/<int:alert_id>/read/', views.AlertReadView.as_view(), name='alert_read'), 
    # path('alerts/read-by-url/', views.AlertReadByUrlView.as_view(), name='alert_read_by_url'), 
    path('register-device/', views.RegisterDeviceView.as_view(), name='register_device'),

    path('notifications/counts', views.NotificationCountsView.as_view(), name='notification-counts'),
    path('counts', views.UserCountsView.as_view(), name='user-counts'),
]