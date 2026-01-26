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

    
    # [Fix] Calculate mood_maker_count
    from room_app.models import Evaluation
    mood_maker_count = Evaluation.objects.filter(target=user, is_mood_maker=True).count()

    return {
        "id": user.id, # [Fix] Return DB ID (int) instead of username
        "username": user.username, # Ensure username is present
        "nickname": user.nickname,
        "role": user.role,
        "clans": clans_info,
        "profile_img": user.profile_img.url if user.profile_img else None,
        "introduction": user.introduction,
        "score": user.score, # [Fix] Include manner score
        "mood_maker_count": mood_maker_count, # [Fix] Include mood maker count
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


# --- [신규] 아이디 찾기용 휴대폰 인증 뷰 ---
from .models import PhoneVerification

class SendPhoneVerificationCodeView(views.APIView):
    """
    POST: /api/v1/users/find-id/send-code/
    휴대폰으로 인증번호 발송 (아이디 찾기용)
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({"detail": "전화번호가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. 해당 번호로 가입된 유저가 있는지 확인
        if not User.objects.filter(phone_number=phone_number).exists():
             return Response({"detail": "등록되지 않은 전화번호입니다."}, status=status.HTTP_404_NOT_FOUND)

        code = str(random.randint(100000, 999999))
        print(f"DEBUG: Phone verification code for {phone_number} is {code}")
        
        try:
            # (여기에 실제 SMS 발송 로직 추가 가능)
            
            PhoneVerification.objects.update_or_create(
                phone_number=phone_number,
                defaults={'code': code, 'created_at': timezone.now()}
            )
            return Response({"success": True, "message": "인증번호가 발송되었습니다."})
            
        except Exception as e:
            return Response({"detail": f"서버 오류: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FindIdByPhoneView(views.APIView):
    """
    POST: /api/v1/users/find-id/verify/
    인증번호 확인 후 아이디(username) 반환
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        phone_number = request.data.get('phone_number')
        code = request.data.get('code')
        
        if not phone_number or not code:
            return Response({"detail": "전화번호와 인증번호가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verification = PhoneVerification.objects.get(phone_number=phone_number)
            
            if verification.is_expired():
                return Response({"detail": "인증번호가 만료되었습니다. 다시 요청해주세요."}, status=status.HTTP_400_BAD_REQUEST)
            
            if verification.code != code:
                return Response({"detail": "인증번호가 일치하지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
            # 인증 성공 -> 유저 찾기
            user = User.objects.get(phone_number=phone_number)
            
            # 인증 정보 삭제 (1회용)
            verification.delete()
            
            return Response({
                "success": True, 
                "username": user.username,
                "message": "인증에 성공했습니다."
            })
            
        except PhoneVerification.DoesNotExist:
             return Response({"detail": "인증 요청 내역이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
             return Response({"detail": "해당 전화번호로 가입된 유저를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)


class VerifyUserForPasswordResetView(views.APIView):
    """
    POST: /api/v1/users/find-password/verify-user/
    비밀번호 찾기: 아이디 + 전화번호 + 인증번호 검증 -> 임시 비밀번호 발급
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        from django.utils.crypto import get_random_string # Import here to avoid top-level clutter

        username = request.data.get('username')
        phone_number = request.data.get('phone_number')
        code = request.data.get('code')
        
        if not username or not phone_number or not code:
            return Response({"detail": "아이디, 전화번호, 인증번호가 모두 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. 유저 존재 확인 (아이디 + 전화번호 일치 여부)
        try:
            user = User.objects.get(username=username, phone_number=phone_number)
        except User.DoesNotExist:
            return Response({"detail": "입력하신 정보와 일치하는 회원이 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        # 2. 인증코드 확인
        try:
            verification = PhoneVerification.objects.get(phone_number=phone_number)
            
            if verification.is_expired():
                 return Response({"detail": "인증번호가 만료되었습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
            if verification.code != code:
                return Response({"detail": "인증번호가 일치하지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
            # 3. 인증 성공 -> 임시 비밀번호 생성 및 변경
            temp_password = get_random_string(length=8)
            user.set_password(temp_password)
            user.save()
            
            # 인증 정보 삭제
            verification.delete() 
            
            return Response({
                "success": True, 
                "message": "임시 비밀번호가 발급되었습니다.",
                "temp_password": temp_password 
            })
            
        except PhoneVerification.DoesNotExist:
            return Response({"detail": "인증 요청 내역이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)



class UserProfileAPIView(views.APIView):
    """
    GET: /api/v1/users/profile/<nickname>/
    """
    permission_classes = [IsAuthenticated]

    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request: Request, nickname: str):
        user = get_object_or_404(User, nickname=nickname)
        response_data = get_user_profile_response(user)
        return Response(response_data)

    def patch(self, request: Request, nickname: str):
        try:
            # 1. 권한 확인 (본인만 수정 가능)
            if request.user.nickname != nickname:
                return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
            user = request.user
            # request.data가 QueryDict(multipart/form-data)일 때, 이를 그대로 copy()하면 
            # 내부적으로 값을 수정할 때 문자열로 강제 변환되어 JSON 파싱된 객체(dict)가 
            # "{'key': 'value'}" 형태의 잘못된 문자열(double quote 아님)로 저장될 수 있음.
            # 따라서 순수 Python dict로 변환하여 사용해야 함.
            data = {key: value for key, value in request.data.items()}
            
            # 2. FormData로 들어온 'instruments' JSON 파싱
            import json
            if 'instruments' in data:
                instruments_val = data['instruments']
                # 문자열인 경우에만 파싱 (이미 리스트/딕셔너리면 pass)
                if isinstance(instruments_val, str):
                    if instruments_val.strip() == "": # 빈 문자열 처리
                        data['instruments'] = []
                    else:
                        try:
                            # '{"보컬": 1}' -> dict
                            data['instruments'] = json.loads(instruments_val)
                        except ValueError as e:
                            print(f"DEBUG: JSON parse error for instruments: {e}")
                            # 파싱 실패시, 에러를 내지 않고 원본 문자열을 넘기면 Serializer가 400 Bad Request를 낼 수 있음
                            # 하지만 500을 막기 위해 여기서 빈 객체로 fallback하거나 error return
                            # return Response({"detail": f"악기 데이터 형식이 올바르지 않습니다: {e}"}, status=status.HTTP_400_BAD_REQUEST)
                            # SignupForm 로직상 dict가 와야 함.
                            pass

            # 3. 닉네임 변경 시 로직 (중복 체크 및 Cascade Update)
            new_nickname = data.get('nickname')
            
            # 닉네임이 존재하고, 현재 닉네임과 다를 경우에만 변경 로직 수행
            if new_nickname and new_nickname != user.nickname:
                 if User.objects.filter(nickname=new_nickname).exists():
                     return Response({"detail": "이미 사용 중인 닉네임입니다."}, status=status.HTTP_400_BAD_REQUEST)
                 
                 # 닉네임 변경에 따른 연관 데이터 업데이트 (Atomic)
                 from django.db import transaction
                 from room_app.models import Room, Session, GroupChat
                 
                 try:
                     with transaction.atomic():
                         old_nickname = user.nickname
                         
                         # Cascade Updates
                         # (모델 필드가 존재하는지 확인했음: Step 1322)
                         Room.objects.filter(manager_nickname=old_nickname).update(manager_nickname=new_nickname)
                         Session.objects.filter(participant_nickname=old_nickname).update(participant_nickname=new_nickname)
                         GroupChat.objects.filter(sender=old_nickname).update(sender=new_nickname)
                         
                         # 프로필 업데이트 (Serializer)
                         serializer = UserProfileSerializer(user, data=data, partial=True)
                         if serializer.is_valid():
                            serializer.save()
                         else:
                            # 닉네임 변경 중 유효성 검사 실패 시 롤백됨 (transaction scope 안이라서? 아니, 에러 raise 안하면 롤백 안됨)
                            # 명시적 에러 반환
                            transaction.set_rollback(True)
                            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                            
                 except Exception as db_err:
                     import traceback
                     traceback.print_exc()
                     return Response({"detail": f"닉네임 변경 중 데이터베이스 오류: {str(db_err)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            else:
                # 닉네임 변경 없을 때 (단순 업데이트)
                serializer = UserProfileSerializer(user, data=data, partial=True)
                if serializer.is_valid():
                    try:
                        serializer.save()
                    except Exception as save_err:
                        return Response({"detail": f"프로필 저장 실패: {str(save_err)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # 4. 최신 프로필 정보 반환
            response_data = get_user_profile_response(user)
            return Response(response_data)

        except Exception as e:
            # View 전반적인 예외 포착
            import traceback
            traceback.print_exc()
            return Response({"detail": f"서버 내부 오류 (View): {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        
        new_nickname = serializer.validated_data['new_nickname']
        user = request.user 

        # 1. 변경하려는 닉네임이 현재와 같으면 Pass (프론트에서도 막지만 이중 체크)
        if user.nickname == new_nickname:
             return Response({"detail": "현재 닉네임과 동일합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 중복 체크
        if User.objects.filter(nickname=new_nickname).exists():
            return Response({"detail": "이미 사용 중인 닉네임입니다."}, status=status.HTTP_400_BAD_REQUEST)

        old_nickname = user.nickname
        
        from django.db import transaction
        from room_app.models import Room, Session, GroupChat

        with transaction.atomic():
            user.nickname = new_nickname
            user.save()
            
            # [수정] 닉네임 변경에 따른 종속 데이터 일괄 업데이트
            Room.objects.filter(manager_nickname=old_nickname).update(manager_nickname=new_nickname)
            Session.objects.filter(participant_nickname=old_nickname).update(participant_nickname=new_nickname)
            GroupChat.objects.filter(sender=old_nickname).update(sender=new_nickname)
            
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
        
        # [수정] 실제 안 읽은 채팅 개수 (DirectChat)
        # (추후 1:N 채팅이 추가되면 여기서 로직 추가 필요)
        chat_count = DirectChat.objects.filter(receiver=user, is_read=False).count()
        
        # 프로필 알림 (매너 평가, 시스템 알림 등)
        profile_count = Alert.objects.filter(user=user, is_read=False).count()
        
        # 기타 알림 (필요 시 확장)
        etc_count = 0 
        
        return Response({
            "chat": chat_count,
            "profile": profile_count,
            "etc": etc_count
        })

# [추가] 친구 상태 조회 및 요청 처리... (중략) ...

# [추가] 채팅 요약 정보 (안 읽은 메시지 등)
class ChatSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            response_data = {}

            # 1. 1:1 채팅 안 읽은 개수
            from django.db.models import Count
            unread_counts = DirectChat.objects.filter(
                receiver=user, 
                is_read=False
            ).exclude(sender__isnull=True).values('sender__nickname').annotate(count=Count('id'))

            total_unread = 0
            for item in unread_counts:
                sender_nick = item['sender__nickname']
                if not sender_nick: continue
                count = item['count']
                response_data[f"/chats/direct/{sender_nick}"] = count
                total_unread += count

            # 2. 클랜 채팅 안 읽은 개수
            # 내가 멤버로 속한 클랜의 메시지 중, read_by에 내가 없는 메시지
            from clan_app.models import ClanChat
            
            clan_unread_counts = ClanChat.objects.filter(
                clan__members=user
            ).exclude(
                read_by=user
            ).values('clan__id').annotate(count=Count('id'))

            for item in clan_unread_counts:
                clan_id = item['clan__id']
                count = item['count']
                response_data[f"/chats/clan/{clan_id}"] = count
                total_unread += count
            
            # 3. 그룹(합주방) 채팅 안 읽은 개수
            from room_app.models import GroupChat
            # User가 참여중인 방 (방장 or 세션참가자)
            group_unread_counts = GroupChat.objects.filter(
                Q(room__manager_nickname=user.nickname) |
                Q(room__sessions__participant_nickname=user.nickname)
            ).exclude(
                read_by=user
            ).distinct().values('room__id').annotate(count=Count('id'))

            for item in group_unread_counts:
                room_id = item['room__id']
                count = item['count']
                response_data[f"/chats/group/{room_id}"] = count
                total_unread += count
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            # [Soft Fail] Return empty data instead of 500 to prevent frontend crash loop
            return Response({}, status=status.HTTP_200_OK)

# [신규] URL 기반 읽음 처리 (Alert + GroupChat + ClanChat)
class AlertReadByUrlView(APIView):
    """
    (POST) /api/v1/users/alerts/read-by-url/
    Body: { "url": "/chats/group/123", "nickname": "..." }
    해당 URL과 관련된 알림을 읽음 처리하고,
    채팅방(그룹, 클랜)의 경우 메시지 read_by에도 사용자를 추가합니다.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            url = request.data.get('url') # e.g. "/chats/group/12"
            if not url:
                return Response({"detail": "URL required"}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user

            # 1. 알림 읽음 처리
            Alert.objects.filter(
                user=user,
                related_url__contains=url,
                is_read=False
            ).update(is_read=True)

            # 2. 채팅 읽음 처리 (URL 파싱)
            with open('debug_read.log', 'a', encoding='utf-8') as f:
                f.write(f"[AlertReadByUrlView] Processing url={url} for user={user.nickname}\n")

            if '/chats/group/' in url:
                # /chats/group/<room_id>
                try:
                    room_id = int(url.split('/')[-1])
                    from room_app.models import GroupChat
                    # 해당 방의 모든 메시지 중, 내가 아직 안 읽은 것에 대해 read_by 추가
                    unread_chats = GroupChat.objects.filter(room_id=room_id).exclude(read_by=user)
                    count = unread_chats.count()
                    with open('debug_read.log', 'a', encoding='utf-8') as f:
                        f.write(f"[AlertReadByUrlView] GroupChat Room {room_id}: Found {count} unread msgs for {user.nickname}\n")

                    for chat in unread_chats:
                        chat.read_by.add(user)
                    
                    if count > 0:
                        with open('debug_read.log', 'a', encoding='utf-8') as f:
                            f.write(f"[AlertReadByUrlView] Marked {count} msgs as read.\n")

                except ValueError:
                    with open('debug_read.log', 'a', encoding='utf-8') as f:
                        f.write(f"[AlertReadByUrlView] ValueError parsing group URL: {url}\n")
                    pass
            
            elif '/chats/clan/' in url:
                # /chats/clan/<clan_id>
                try:
                    clan_id = int(url.split('/')[-1])
                    from clan_app.models import ClanChat
                    unread_chats = ClanChat.objects.filter(clan_id=clan_id).exclude(read_by=user)
                    count = unread_chats.count()
                    print(f"[AlertReadByUrlView] ClanChat {clan_id}: Found {count} unread msgs")

                    for chat in unread_chats:
                        chat.read_by.add(user)
                except ValueError:
                    pass

            return Response({"detail": "Processed"}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in AlertReadByUrlView: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_200_OK) # Soft fail
class UserChatListView(APIView):
    """
    (GET) /api/v1/users/chats/list/
    통합 채팅방 목록 (합주방 + 클랜) - 최신 활동순 정렬
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.db.models import Max, Q
        from django.db.models.functions import Coalesce
        from room_app.models import Room
        from clan_app.models import Clan

        # 1. Rooms (Group Chat)
        rooms = Room.objects.filter(
            Q(manager_nickname=user.nickname) | 
            Q(sessions__participant_nickname=user.nickname) |
            Q(sessions__reservations__user=user)
        ).annotate(
            last_activity=Coalesce(Max('chats__timestamp'), 'created_at')
        ).prefetch_related('sessions').distinct()

        # 2. Clans (Clan Chat)
        clans = Clan.objects.filter(
             Q(members=user) | Q(owner=user)
        ).annotate(
             last_activity=Coalesce(Max('chats__timestamp'), 'created_at')
        ).distinct()

        chat_list = []

        for r in rooms:
            # Image logic: Room doesn't have image, use placeholder or passed from frontend logic
            # For correctness, if Room model doesn't have image, we send None.
            chat_list.append({
                'type': 'group',
                'id': r.id,
                'title': r.title,
                'image': None, 
                'last_activity': r.last_activity,
                'desc': f"{r.song} - {r.artist}"
            })
        
        for c in clans:
            chat_list.append({
                'type': 'clan',
                'id': c.id,
                'title': c.name,
                'image': c.image.url if c.image else None,
                'last_activity': c.last_activity,
                'desc': "[클랜]"
            })

        # 3. Sort by last_activity DESC
        chat_list.sort(key=lambda x: x['last_activity'], reverse=True)

        return Response(chat_list, status=status.HTTP_200_OK)

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
            related_url=url_to_read,
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

# ▼▼▼ [신규 추가] 모든 알림 읽음 처리 뷰 ▼▼▼
class AlertReadAllView(APIView):
    """
    현재 사용자의 모든 (읽지 않은) 알림을 읽음 처리합니다.
    (POST /api/v1/users/alerts/read-all/)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. 로그인한 유저의 읽지 않은 알림을 모두 찾습니다.
        unread_alerts = Alert.objects.filter(user=request.user, is_read=False)
        
        # 2. 일괄 업데이트 (update()는 업데이트된 레코드 수를 반환)
        count = unread_alerts.update(is_read=True)
        
        return Response(
            {'detail': f'총 {count}개의 알림을 읽음 처리했습니다.', 'count': count},
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

# ▼▼▼ [신규] 원격 마이그레이션 뷰 ▼▼▼
from django.core.management import call_command

class SpecialMigrateView(APIView):
    """
    (POST) /api/v1/users/special-migrate/
    Shell 접속이 불가능한 환경에서 API로 마이그레이션을 실행합니다.
    Authentication: None (Secret Key Required)
    Body: { "secret_key": "bandicon_emergency_operator_key_2025" }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        secret_key = request.data.get('secret_key')
        if secret_key != "bandicon_emergency_operator_key_2025":
            return Response({"detail": "Invalid secret key"}, status=status.HTTP_403_FORBIDDEN)

        try:
            call_command('migrate')
            return Response({"success": True, "message": "Database migration completed successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ▲▲▲ [신규] ▲▲▲
class DirectChatView(APIView):
    """
    1:1 채팅 메시지를 조회하거나 전송합니다.
    GET /api/v1/users/chat/direct/<str:nickname>/
    POST /api/v1/users/chat/direct/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, nickname):
        """
        특정 유저(nickname)와의 채팅 내역 조회
        """
        target_user = get_object_or_404(User, nickname=nickname)
        current_user = request.user

        # [신규] 읽음 처리: 상대방이 보낸 메시지 중, 내가 받는 메시지는 읽음 처리
        DirectChat.objects.filter(
            sender=target_user,
            receiver=current_user,
            is_read=False
        ).update(is_read=True)

        # 나와 상대방 사이의 메시지 (보낸 것 + 받은 것)
        chats = DirectChat.objects.filter(
            (Q(sender=current_user) & Q(receiver=target_user)) |
            (Q(sender=target_user) & Q(receiver=current_user))
        ).order_by('timestamp')

        serializer = DirectChatSerializer(chats, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        메시지 전송
        """
        sender = request.user
        receiver_nickname = request.data.get('receiver')
        
        # serializer data 준비
        data = request.data.copy()
        data['sender'] = sender.nickname # sender는 현재 유저로 강제

        serializer = DirectChatSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            
            # 알림 생성 (상대방에게)
            # 본인이 아닌 경우에만 알림
            if sender.nickname != receiver_nickname:
                try:
                    receiver = User.objects.get(nickname=receiver_nickname)
                    Alert.objects.create(
                        user=receiver,
                        alert_type='SYSTEM', # 또는 CHAT_MESSAGE 타입 추가 고려
                        message=f"{sender.nickname}님이 메시지를 보냈습니다.",
                        related_url=f"/chats/direct/{sender.nickname}",
                        related_id=sender.id
                    )
                except User.DoesNotExist:
                    pass # 이미 serializer에서 검증되겠지만 안전장치

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- [신규] 홈 화면 대시보드 뷰 ---
class HomeDashboardView(views.APIView):
    """
    GET: /api/v1/users/home/
    홈 화면에 필요한 모든 데이터를 집계하여 반환합니다.
    - 내 프로필 (이름, 이미지)
    - 광고 배너 리스트
    - 내 합주방 상태 (없음/있음)
    - 내 클랜 상태 (없음/있음)
    - 다가오는 일정 (Mock or aggregated)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        user = request.user
        
        # 1. 프로필 정보
        user_data = {
            "nickname": user.nickname,
            "profile_img": user.profile_img.url if user.profile_img else None,
            "role": user.role
        }
        
        # 2. 배너 리스트
        from support_app.models import Banner
        banners = Banner.objects.filter(is_active=True).order_by('order', '-created_at')
        banner_data = [
            {
                "id": b.id,
                "title": b.title,
                "image": b.image.url if b.image else None,
                "link": b.link
            }
            for b in banners
        ]
        
        # 3. 내 합주방 (가장 최근에 만든 방 보거나 참여중인 방)
        # 우선순위: 내가 매니저인 방 -> 내가 참여중인 세션의 방
        from room_app.models import Room, Session
        from django.db.models import Q
        
        my_room = None
        
        # 내가 매니저이고 아직 끝나지 않은 방
        managed_room = Room.objects.filter(manager_nickname=user.nickname, ended=False).order_by('-created_at').first()
        
        if managed_room:
             my_room = {
                 "id": managed_room.id,
                 "title": managed_room.title,
                 "status": "manager",
                 "image": managed_room.image.url if managed_room.image else None
             }
        else:
            # 내가 참여중인 세션이 있는 방 (최근)
            joined_session = Session.objects.filter(participant_nickname=user.nickname, room__ended=False).order_by('-room__created_at').first()
            if joined_session:
                my_room = {
                    "id": joined_session.room.id,
                    "title": joined_session.room.title,
                    "status": "participant",
                    "image": joined_session.room.image.url if joined_session.room.image else None
                }

        # 4. 내 클랜 (첫 번째 가입된 클랜)
        # User 모델의 related_name='clans' (멤버), 'owned_clans' (클랜장)
        my_clan = None
        
        # 클랜장인 클랜 우선 (거절된 것 제외)
        owned_clan = user.owned_clans.exclude(status='rejected').first()
        if owned_clan:
            my_clan = {
                "id": owned_clan.id,
                "name": owned_clan.name,
                "role": "owner",
                "member_count": owned_clan.members.count() + 1
            }
        else:
             # 가입된 클랜 (거절된 것 제외)
             joined_clan = user.clans.exclude(status='rejected').first()
             if joined_clan:
                 my_clan = {
                     "id": joined_clan.id,
                     "name": joined_clan.name,
                     "role": "member",
                     "member_count": joined_clan.members.count() + 1 
                 }

        # 5. 다가오는 일정 (Mock for UI first)
        # 추후 ClanEvent나 Room 예약을 쿼리하여 채움
        schedules = [
            # { "date": "2024-05-20", "day": "Mon", "title": "정기공연", "type": "event" }
        ]
        
        return Response({
            "user": user_data,
            "banners": banner_data,
            "my_room": my_room,
            "my_clan": my_clan,
            "schedules": schedules
        })
