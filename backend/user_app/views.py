from django.shortcuts import render
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone # FriendRequest, VerificationCode
import os # for SMS
import random # for SMS
import uuid # for UploadProfileImageView
from django.db.models import Q
from rest_framework import generics, status, views, parsers, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from .serializers import (
    CustomTokenObtainPairSerializer, 
    UserCreateSerializer, 
    UserBaseSerializer, 
    FriendsListSerializer, 
    FriendRequestSerializer, 
    NicknameUpdateSerializer, 
    UserDeviceSerializer,
    DirectChatSerializer,
    AlertSerializer,
    UserProfileSerializer
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
# 1. 회원가입 뷰 (SignupView) - 이게 없어서 에러남!
class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny] # 누구나 가입 가능

# 2. 로그인 뷰 (LoginView)
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'nickname': user.nickname,
                'username': user.username,
                'role': user.role,
            })
        return Response({'detail': '아이디 또는 비밀번호가 잘못되었습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

# 3. 로그아웃 뷰 (LogoutView)
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist() # 토큰 만료 처리
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

# 4. 프로필 조회 (MyProfileView)
class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

# 5. 타인 프로필 조회 (ProfileView)
class ProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'nickname' # 닉네임으로 조회

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

    def get(self, request: Request, nickname: str = None):
        if nickname and request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        alerts = Alert.objects.filter(
            user=request.user,
            is_read=False
        ).order_by('-created_at')
        
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)

# ▼▼▼ [수정] PUT/PATCH 대신 POST로 읽음 처리 ▼▼▼
class AlertReadView(APIView):
    """
    특정 알림(pk)을 "읽음" 처리합니다. (POST 요청)
    (POST /api/v1/users/alerts/<int:pk>/read/)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        # 1. [보안] 로그인한 유저의 알림이 맞는지 확인
        alert = get_object_or_404(Alert, pk=pk, user=request.user)

        # 2. 이미 읽었다면 아무것도 안 함
        if alert.is_read:
            return Response({'detail': '이미 읽은 알림입니다.'}, status=status.HTTP_200_OK)

        # 3. 읽음 처리
        alert.is_read = True
        alert.save(update_fields=['is_read']) # is_read 필드만 업데이트

        return Response({'detail': '알림을 읽음 처리했습니다.'}, status=status.HTTP_200_OK)
# ▲▲▲ [수정] ▲▲▲
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


class AcceptFriendRequestView(views.APIView):
    """
    POST: /api/v1/users/friends/accept/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        if not request_id:
            return Response({"detail": "요청 ID(request_id)가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend_req = FriendRequest.objects.get(id=request_id)
            
            # 본인에게 온 요청인지 확인
            if friend_req.to_user != request.user:
                 return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
            if friend_req.status == 'accepted':
                 return Response({"detail": "이미 수락된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

            friend_req.status = 'accepted'
            friend_req.save()
            
            # 양방향 친구 추가
            friend_req.to_user.friends.add(friend_req.from_user)
            friend_req.from_user.friends.add(friend_req.to_user)
            
            # 알림 생성 (요청 보낸 사람에게)
            Alert.objects.create(
                user=friend_req.from_user,
                alert_type='FRIEND_Request_ACCEPTED', # or similar
                message=f"{friend_req.to_user.nickname}님이 친구 요청을 수락했습니다.",
                related_id=friend_req.to_user.id,
                related_url=f"/profile/{friend_req.to_user.nickname}"
            )

            return Response({"success": True, "message": "친구 요청을 수락했습니다."})
            
        except FriendRequest.DoesNotExist:
             return Response({"detail": "존재하지 않는 요청입니다."}, status=status.HTTP_404_NOT_FOUND)

class RejectFriendRequestView(views.APIView):
    """
    POST: /api/v1/users/friends/reject/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        if not request_id:
            return Response({"detail": "요청 ID(request_id)가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend_req = FriendRequest.objects.get(id=request_id)
            
            if friend_req.to_user != request.user:
                 return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
            # 거절 상태로 변경 또는 삭제 (여기선 삭제로 처리하거나 rejected로 변경)
            friend_req.status = 'rejected'
            friend_req.save()
            # 또는 friend_req.delete()
            
            return Response({"success": True, "message": "친구 요청을 거절했습니다."})
            
        except FriendRequest.DoesNotExist:
             return Response({"detail": "존재하지 않는 요청입니다."}, status=status.HTTP_404_NOT_FOUND)

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

# ▼▼▼ [4순위 작업] 알림 목록 뷰 추가 ▼▼▼
class AlertListView(generics.ListAPIView):
    """
    로그인한 유저의 알림 목록을 반환합니다.
    (GET /api/v1/users/alerts/)
    ?read=false (읽지 않은 알림)
    ?read=true (읽은 알림)
    (파라미터 없음: 전체 알림)
    """
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated] # 로그인한 유저만

    def get_queryset(self):
        # 1. 로그인한 유저(request.user)의 알림만 가져옵니다.
        queryset = Alert.objects.filter(user=self.request.user)
        
        # 2. 쿼리 파라미터로 '읽음 여부'를 필터링합니다.
        is_read_param = self.request.query_params.get('read')
        
        if is_read_param == 'false':
            queryset = queryset.filter(is_read=False)
        elif is_read_param == 'true':
            queryset = queryset.filter(is_read=True)
            
        # 최신순으로 정렬
        return queryset.order_by('-created_at')
# ▲▲▲ [4순위 작업] ▲▲▲

class AlertReadView(generics.RetrieveUpdateAPIView):
    """
    특정 알림(pk)을 조회(GET)하거나 "읽음" 처리(PUT/PATCH)합니다.
    (PUT /api/v1/users/alerts/<int:pk>/)
    """
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """
        [보안] 현재 로그인한 유저(request.user)의 알림만 접근/수정 가능하도록 제한
        """
        return Alert.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        # (프론트엔드에서 {"is_read": true} 데이터를 보낼 것입니다)
        return super().update(request, *args, **kwargs)
# ▲▲▲ [신규 추가] ▲▲▲

# ▼▼▼ [신규 추가] URL 기반 일괄 읽음 처리 뷰 ▼▼▼
class AlertReadByUrlView(APIView):
    """
    특정 URL과 관련된 (읽지 않은) 알림을 일괄 읽음 처리합니다.
    (POST /api/v1/users/alerts/read-by-url/)
    요청 Body: { "url": "/clans/1/" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. 요청 body에서 'url' 또는 'related_url' 값을 가져옵니다.
        url_to_read = request.data.get('url') or request.data.get('related_url')

        if not url_to_read:
            return Response(
                {'detail': '읽음 처리할 URL을 제공해야 합니다. ({"url": "/path/"})'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. 현재 유저의, 해당 URL을 가진, (아직) 읽지 않은 알림을 찾습니다.
        alerts_to_update = Alert.objects.filter(
            user=request.user,
            link_url=url_to_read,
            is_read=False
        )

        # 3. 해당 알림들을 '읽음(is_read=True)'으로 일괄 업데이트합니다.
        # .update()는 업데이트된 행의 수를 반환합니다.
        update_count = alerts_to_update.update(is_read=True)

        # 4. 결과 응답
        if update_count > 0:
            return Response(
                {'detail': f'총 {update_count}개의 알림을 읽음 처리했습니다.'}, 
                status=status.HTTP_200_OK
            )
        else:
            # 오류는 아니므로 200 OK
            return Response(
                {'detail': '해당 URL로 새로 읽음 처리할 알림이 없습니다.'}, 
                status=status.HTTP_200_OK
            )
# ▲▲▲ [신규 추가] ▲▲▲
# [추가] 친구 상태 조회 및 요청 처리

class FriendshipDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_user_by_nickname(self, nickname):
        try:
            return User.objects.get(nickname=nickname)
        except User.DoesNotExist:
            return None

    def get(self, request, nickname):
        """친구 상태 조회"""
        target_user = self.get_user_by_nickname(nickname)
        if not target_user:
            return Response({"detail": "존재하지 않는 사용자입니다."}, status=status.HTTP_404_NOT_FOUND)

        me = request.user
        
        # 1. 친구 관계 조회
        friend_req = FriendRequest.objects.filter(
            (Q(from_user=me) & Q(to_user=target_user)) | 
            (Q(from_user=target_user) & Q(to_user=me))
        ).first()

        if not friend_req:
            return Response({"status": "none"}, status=status.HTTP_200_OK)
        
        # [수정] status 필드를 확인합니다.
        if friend_req.status == 'accepted':
            return Response({"status": "friend"}, status=status.HTTP_200_OK)
        
        if friend_req.status == 'pending':
            if friend_req.from_user == me:
                return Response({"status": "pending_sent"}, status=status.HTTP_200_OK)
            else:
                return Response({"status": "pending_received"}, status=status.HTTP_200_OK)
        
        return Response({"status": "none"}, status=status.HTTP_200_OK)

    def post(self, request, nickname):
        """친구 요청 보내기"""
        target_user = self.get_user_by_nickname(nickname)
        if not target_user:
            return Response({"detail": "사용자 없음"}, status=404)

        me = request.user
        if me == target_user:
            return Response({"detail": "본인에게 요청 불가"}, status=400)

        # 이미 존재하는지 확인
        existing = FriendRequest.objects.filter(
            (Q(from_user=me) & Q(to_user=target_user)) | 
            (Q(from_user=target_user) & Q(to_user=me))
        ).first()

        if existing:
            if existing.status == 'accepted':
                 return Response({"detail": "이미 친구입니다."}, status=400)
            elif existing.status == 'pending':
                 return Response({"detail": "이미 요청 대기 중입니다."}, status=400)
            # rejected 상태라면 다시 요청 가능하게 할 수도 있음 (여기선 생략)

        # [수정] status='pending'으로 생성
        FriendRequest.objects.create(from_user=me, to_user=target_user, status='pending')
        return Response({"detail": "친구 요청 전송 완료", "status": "pending_sent"}, status=201)

    def patch(self, request, nickname):
        """친구 요청 수락 (status -> accepted)"""
        target_user = self.get_user_by_nickname(nickname)
        if not target_user:
            return Response({"detail": "사용자 없음"}, status=404)

        # 상대방이 나에게 보낸 'pending' 요청 찾기
        req = get_object_or_404(FriendRequest, from_user=target_user, to_user=request.user, status='pending')
        
        # [수정] 상태를 accepted로 변경
        req.status = 'accepted'
        req.save()
        
        return Response({"detail": "친구 수락 완료", "status": "friend"}, status=200)

    def delete(self, request, nickname):
        """친구 삭제 또는 요청 취소"""
        target_user = self.get_user_by_nickname(nickname)
        if not target_user:
             return Response({"detail": "사용자 없음"}, status=404)

        me = request.user
        deleted_count, _ = FriendRequest.objects.filter(
            (Q(from_user=me) & Q(to_user=target_user)) | 
            (Q(from_user=target_user) & Q(to_user=me))
        ).delete()

        if deleted_count > 0:
            return Response({"detail": "삭제되었습니다.", "status": "none"}, status=200)
        return Response({"detail": "삭제할 내용이 없습니다."}, status=400)
# [추가] 채팅 요약 정보 (안 읽은 메시지 등) - 빈 껍데기라도 있어야 404 안뜸
class ChatSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # TODO: 실제 안 읽은 메시지 개수 집계 로직 필요
        return Response({
            "total_unread": 0,
            "rooms": []
        }, status=status.HTTP_200_OK)

class SpecialOperatorCreateView(APIView):
    """
    (POST) /api/v1/users/special-operator/
    Render Shell을 사용할 수 없는 환경에서 비상용으로 운영자 계정을 생성/승급하는 API.
    보안을 위해 body에 'secret_key'를 포함해야 합니다.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        secret_key = request.data.get('secret_key')
        # [주의] 이 키는 배포 시점에만 잠깐 사용하거나, 아주 복잡하게 설정해야 합니다.
        if secret_key != "bandicon_emergency_operator_key_2025": 
            return Response({"detail": "Invalid secret key"}, status=status.HTTP_403_FORBIDDEN)
            
        username = request.data.get('username')
        if not username:
             return Response({"detail": "username is required"}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            # 1. 이미 존재하는 유저라면 -> 운영자로 승급
            user = User.objects.get(username=username)
            user.role = 'OPERATOR'
            user.is_staff = True
            user.is_superuser = True
            user.save()
            return Response({"message": f"User '{username}' promoted to OPERATOR"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            # 2. 없는 유저라면 -> 새로 생성
            password = request.data.get('password')
            nickname = request.data.get('nickname', 'Admin')
            email = request.data.get('email', 'admin@example.com')
            
            if not password:
                 return Response({"detail": "password is required for new user"}, status=status.HTTP_400_BAD_REQUEST)
                 
            User.objects.create_user(
                username=username,
                password=password,
                nickname=nickname,
                email=email,
                role='OPERATOR',
                is_staff=True,
                is_superuser=True
            )
            return Response({"message": f"New OPERATOR user '{username}' created"}, status=status.HTTP_201_CREATED)