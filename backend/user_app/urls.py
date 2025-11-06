# user_app/urls.py

from django.urls import path
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# user_app/urls.py

# ... (import 구문은 그대로 둠) ...

urlpatterns = [
    # 1. 인증
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeAPIView.as_view(), name='user-me'),

    # 2. 회원가입
    path('signup/', views.UserCreateAPIView.as_view(), name='signup'),
    
    # 3. SMS 인증
    path('send-verification-sms/', views.SendVerificationSMSView.as_view(), name='send_sms'),
    path('verify-sms-code/', views.VerifySMSCodeView.as_view(), name='verify_sms'),

    # 4. 프로필
    path('profile/<str:nickname>/', views.UserProfileAPIView.as_view(), name='profile_detail'),
    path('profile/update-nickname/', views.UpdateNicknameAPIView.as_view(), name='update_nickname'),
    path('profile/<str:nickname>/upload-image/', views.UploadProfileImageView.as_view(), name='upload_profile_image'), # <-- 주석 해제

    # 5. 친구 (아직 뷰를 구현 안 한 것은 주석 처리)
    path('friends/<str:nickname>/', views.FriendListView.as_view(), name='friend_list'), # <-- 주석 해제
    # path('friends/request/', views.SendFriendRequestView.as_view(), name='friend_request'),
    # path('friends/accept/', views.AcceptFriendRequestView.as_view(), name='friend_accept'),
    # path('friends/reject/', views.RejectFriendRequestView.as_view(), name='friend_reject'),
    
    # 6. 알림 & 푸시
    path('alerts/', views.AlertListView.as_view(), name='alert_list'),
    # path('alerts/<int:alert_id>/read/', views.AlertReadView.as_view(), name='alert_read'), 
    # path('alerts/read-by-url/', views.AlertReadByUrlView.as_view(), name='alert_read_by_url'), 
    path('register-device/', views.RegisterDeviceView.as_view(), name='register_device'), # <-- 77단계에서 이미 활성화됨

    path('notifications/counts', views.NotificationCountsView.as_view(), name='notification-counts'),
    path('counts', views.UserCountsView.as_view(), name='user-counts'),
    path('alerts/<str:nickname>/', views.AlertListView.as_view(), name='alert-list'),
]

"""    # 1. 인증 (JWT 토큰 발급/재발급)
    # FastAPI의 /login  역할을 simple-jwt가 제공하는 뷰로 대체
    # (주의: React는 이제 /api/v1/users/token/ 으로 토큰을 요청해야 함)
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 2. 회원가입 (FastAPI의 /signup )
    path('signup/', views.UserCreateAPIView.as_view(), name='signup'),
    
    # 3. SMS 인증 (FastAPI의 /auth/... )
    path('send-verification-sms/', views.SendVerificationSMSView.as_view(), name='send_sms'),
    path('verify-sms-code/', views.VerifySMSCodeView.as_view(), name='verify_sms'),

    # 4. 프로필 (FastAPI의 /profile/... )
   # path('profile/<str:nickname>/', views.UserProfileAPIView.as_view(), name='profile_detail'),
   # path('profile/update-nickname/', views.UpdateNicknameAPIView.as_view(), name='update_nickname'),
   # path('profile/<str:nickname>/upload-image/', views.UploadProfileImageView.as_view(), name='upload_profile_image'),

    # 5. 친구 (FastAPI의 /friends/... )
   # path('friends/<str:nickname>/', views.FriendListView.as_view(), name='friend_list'),
   # path('friends/request/', views.SendFriendRequestView.as_view(), name='friend_request'),
   # path('friends/accept/', views.AcceptFriendRequestView.as_view(), name='friend_accept'),
   # path('friends/reject/', views.RejectFriendRequestView.as_view(), name='friend_reject'),
    
    # 6. 알림 & 푸시 (FastAPI의 /alerts/..., /register-device )
   # path('alerts/', views.AlertListView.as_view(), name='alert_list'),
   # path('alerts/<int:alert_id>/read/', views.AlertReadView.as_view(), name='alert_read'),
   # path('alerts/read-by-url/', views.AlertReadByUrlView.as_view(), name='alert_read_by_url'),
   # path('register-device/', views.RegisterDeviceView.as_view(), name='register_device'),
    #login 엔드 포인트
    path('me/', views.MeAPIView.as_view(), name='user-me'),"""
    # user_app/urls.py

# ... (import 구문은 그대로 둠) ...
