from django.shortcuts import render
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone # FriendRequest, VerificationCode
import os # for SMS
import random # for SMS
import uuid # for UploadProfileImageView

from rest_framework import generics, status, views, parsers, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    CustomTokenObtainPairSerializer, 
    UserCreateSerializer, 
    UserBaseSerializer, 
    FriendsListSerializer, 
    FriendRequestSerializer, 
    NicknameUpdateSerializer, 
    UserDeviceSerializer,
    DirectChatSerializer,
    AlertSerializer
)

from .models import User, UserDevice, Alert, FriendRequest, VerificationCode, DirectChat

# SMS (임시)
# from sdk.api.message import Message
# from sdk.exceptions import CoolsmsException
from datetime import datetime, timedelta # timezone은 django.utils에서 임포트

User = get_user_model()

# --- (헬퍼 함수) ---
def get_user_profile_response(user):
    """
    FastAPI의 /login 또는 /profile/{nickname} 응답과
    동일한 JSON 구조를 반환합니다.
    """
    all_clans_query = user.clans.all() | user.owned_clans.all()
    all_clans = all_clans_query.distinct()
    
    clans_info = [{"id": c.id, "name": c.name} for c in all_clans]

    return {
        "id": user.username,
        "nickname": user.nickname,
        "role": user.role,
        "clans": clans_info,
        "profile_img": user.profile_img.url if user.profile_img else None,
        "introduction": user.introduction,
    }

# --- (View 클래스들) ---

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST: /api/v1/users/token/
    커스텀 JWT 토큰 발급 뷰
    """
    serializer_class = CustomTokenObtainPairSerializer

class UserCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request: Request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = serializer.save() 
            
            if user.role == '간부':
                admin_users = User.objects.filter(is_superuser=True)
                for admin_user in admin_users:
                    Alert.objects.create(
                        user=admin_user, 
                        alert_type='SYSTEM',
                        message=f"'{user.nickname}'님이 간부 가입을 신청했습니다.",
                        related_url="/admin/approvals"
                    )

            headers = self.get_success_headers(serializer.data)
            return Response({"success": True}, status=status.HTTP_201_CREATED, headers=headers)
        
        except IntegrityError as e:
            error_message = "데이터베이스 오류"
            error_info = str(e)
            if "UNIQUE constraint" in error_info:
                if "user_app_user.username" in error_info:
                    error_message = "이미 사용 중인 아이디입니다."
                elif "user_app_user.nickname" in error_info:
                    error_message = "이미 사용 중인 닉네임입니다."
                elif "user_app_user.email" in error_info:
                    error_message = "이미 등록된 이메일입니다."
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"서버 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SendVerificationSMSView(views.APIView):
    """
    [수정] 휴대폰 인증 -> 이메일 인증
    POST: /api/v1/users/send-verification-email/
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "이메일이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "이미 가입된 이메일입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        code = str(random.randint(100000, 999999))
        print(f"DEBUG: Email verification code for {email} is {code}")
        
        try:
            # (실제 이메일 전송 로직... )
            
            VerificationCode.objects.update_or_create(
                email=email,
                defaults={'code': code}
            )
            return Response({"success": True, "message": "인증번호가 발송되었습니다."})
            
        except Exception as e:
            return Response({"detail": f"인증번호 발송 중 서버 오류 발생: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifySMSCodeView(views.APIView):
    """
    [수정] 휴대폰 인증 -> 이메일 인증
    POST: /api/v1/users/verify-email-code/
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        email = request.data.get('email')
        code = request.data.get('code')
        if not email or not code:
            return Response({"detail": "이메일과 코드가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            db_code = VerificationCode.objects.get(email=email)
            
            if db_code.is_expired() or db_code.code != code: 
                raise VerificationCode.DoesNotExist
            
            db_code.delete()
            return Response({"success": True, "message": "인증에 성공했습니다."})
        except VerificationCode.DoesNotExist:
            return Response({"detail": "인증번호가 올바르지 않거나 만료되었습니다."}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileAPIView(views.APIView):
    """
    GET: /api/v1/users/profile/<nickname>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, nickname: str):
        user = get_object_or_404(User, nickname=nickname)
        response_data = get_user_profile_response(user)
        return Response(response_data)


class MeAPIView(views.APIView):
    """
    GET: /api/v1/users/me/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        user = request.user
        response_data = get_user_profile_response(user)
        return Response(response_data)


class UpdateNicknameAPIView(views.APIView):
    """
    PUT: /api/v1/users/profile/update-nickname/
    """
    permission_classes = [IsAuthenticated]

    def put(self, request: Request):
        serializer = NicknameUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        current_nickname = serializer.validated_data['current_nickname']
        new_nickname = serializer.validated_data['new_nickname']

        if request.user.nickname != current_nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        user = request.user 
        
        if User.objects.filter(nickname=new_nickname).exists():
            return Response({"detail": "이미 사용 중인 닉네임입니다."}, status=status.HTTP_400_BAD_REQUEST)

        user.nickname = new_nickname
        user.save()
        
        # (TODO: 다른 테이블 닉네임 변경)
        
        response_data = get_user_profile_response(user)
        return Response(response_data)

class UploadProfileImageView(views.APIView):
    """
    POST: /api/v1/users/profile/<nickname>/upload-image/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser] 

    def post(self, request: Request, nickname: str):
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        file = request.FILES.get('file')
        
        if not file:
            return Response({"detail": "파일이 전송되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if user.profile_img:
                user.profile_img.delete(save=False)
                
            user.profile_img.save(file.name, file, save=True)

            response_data = get_user_profile_response(user)
            return Response(response_data)
            
        except Exception as e:
            return Response({"detail": f"파일 저장 실패: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterDeviceView(views.APIView):
    """
    POST: /api/v1/users/register-device/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request):
        serializer = UserDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['fcm_token']
        user = request.user
        
        UserDevice.objects.update_or_create(
            user=user,
            defaults={'fcm_token': token}
        )
        return Response({"success": True})

class AlertListView(views.APIView):
    """
    GET: /api/v1/users/alerts/<nickname>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, nickname: str):
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        alerts = Alert.objects.filter(
            user=request.user,
            is_read=False
        ).order_by('-created_at')
        
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class NotificationCountsView(APIView):
    """
    GET: /api/v1/users/notifications/counts
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        chat_count = 0 
        profile_count = Alert.objects.filter(
            user=user, 
            is_read=False
        ).exclude(alert_type__in=['ROOM_INVITE']).count()
        
        return Response({
            'chat': chat_count,
            'profile': profile_count
        })

class UserCountsView(views.APIView):
    """
    GET: /api/v1/users/counts
    """
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            'posts': 0,
            'comments': 0,
            'likes': 0
        })

class SendFriendRequestView(views.APIView):
    """
    POST: /api/v1/users/friends/request/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        receiver_nickname = request.data.get('receiver_nickname')
        if not receiver_nickname:
             return Response({"detail": "수신자 닉네임(receiver_nickname)이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            to_user = User.objects.get(nickname=receiver_nickname)
            from_user = request.user
            
            if from_user == to_user:
                return Response({"detail": "자신에게 친구 요청을 보낼 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
            if from_user.friends.filter(pk=to_user.pk).exists():
                 return Response({"detail": "이미 친구입니다."}, status=status.HTTP_400_BAD_REQUEST)

            existing_request_reverse = FriendRequest.objects.filter(from_user=to_user, to_user=from_user, status='pending').first()
            if existing_request_reverse:
                existing_request_reverse.status = 'accepted'
                existing_request_reverse.save()
                from_user.friends.add(to_user)
                return Response({"success": True, "message": f"{to_user.nickname}님과 친구가 되었습니다."})
            
            existing_request, created = FriendRequest.objects.get_or_create(
                from_user=from_user,
                to_user=to_user,
                defaults={'status': 'pending'}
            )
            
            if not created and existing_request.status == 'pending':
                return Response({"detail": "이미 친구 요청을 보냈습니다."}, status=status.HTTP_400_BAD_REQUEST)
            elif not created and existing_request.status == 'rejected':
                 existing_request.status = 'pending'
                 existing_request.created_at = timezone.now()
                 existing_request.save()
                 
            Alert.objects.create(
                user=to_user,
                alert_type='FRIEND_REQUEST',
                message=f"{from_user.nickname}님이 친구 요청을 보냈습니다.",
                related_id=from_user.id,
                related_url=f"/profile/{from_user.nickname}"
            )
            return Response({"success": True, "message": "친구 요청을 보냈습니다."})
            
        except User.DoesNotExist:
            return Response({"detail": "해당 닉네임의 유저를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)


class FriendListView(views.APIView):
    """
    GET: /api/v1/users/friends/<nickname>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, nickname: str):
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        
        friends = user.friends.all()
        pending_requests = user.received_friend_requests.filter(status='pending').select_related('from_user')
        
        serializer = FriendsListSerializer({
            "friends": friends,
            "pending_requests": pending_requests
        })
        return Response(serializer.data)