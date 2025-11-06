from django.shortcuts import render
# user_app/views.py
# user_app/views.py (파일 최상단)

from rest_framework import generics, status, views, parsers
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from .models import User, FriendRequest, Alert, DeviceToken, VerificationCode
from .serializers import (
    UserCreateSerializer, UserBaseSerializer, 
    FriendsListSerializer, FriendRequestSerializer, 
    NicknameUpdateSerializer, DeviceTokenSerializer
)

# SMS
import os
import random
import uuid # for UploadProfileImageView
from sdk.api.message import Message
from sdk.exceptions import CoolsmsException
from datetime import datetime, timedelta, timezone# FastAPI의 crud.py 와 notify.py  임포트 (추후 Django 스타일로 리팩토링 필요)
#from backend import crud, notify # (임시)
#from backend.database import get_db # (임시)

# --- 1. 회원가입 (FastAPI의 /signup ) ---
class UserCreateAPIView(generics.CreateAPIView):
    # ... (queryset, serializer_class, permission_classes는 동일) ...

    def create(self, request: Request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = serializer.save() 
            
            # --- 👇 crud.create_alert  로직을 Django ORM으로 변경 ---
            if user.role == '간부':
                # 'admin' 닉네임을 가진 유저를 찾음 (없을 수도 있음)
                # (참고: FastAPI에서는 'admin' 이었지만, Django Admin 계정 닉네임에 따라 변경 필요)
                admin_user_nickname = os.getenv("BANDICON_ADMIN_NICKNAME", "admin")
                
                # admin 유저가 존재하는지 확인할 필요 없이, 닉네임 기반으로 Alert 생성
                Alert.objects.create(
                    user_nickname=admin_user_nickname,
                    message=f"'{user.nickname}'님이 간부 가입을 신청했습니다.",
                    related_url="/admin/approvals"
                )
            # --- 👆 변경 완료 ---

            headers = self.get_success_headers(serializer.data)
            return Response({"success": True}, status=status.HTTP_201_CREATED, headers=headers)
        
        except IntegrityError as e:
            # --- 👇 Django ORM에 맞게 UNIQUE 제약조건 이름 수정 ---
            error_message = "데이터베이스 오류"
            error_info = str(e)
            if "UNIQUE constraint failed: user_app_user.username" in error_info:
                error_message = "이미 사용 중인 아이디입니다."
            elif "UNIQUE constraint failed: user_app_user.nickname" in error_info:
                error_message = "이미 사용 중인 닉네임입니다."
            elif "UNIQUE constraint failed: user_app_user.email" in error_info:
                error_message = "이미 등록된 이메일입니다."
            # --- 👆 변경 완료 ---
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"서버 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- 2. SMS 인증 (FastAPI의 /auth/... ) ---
# (이 로직은 FastAPI의 코드를 거의 그대로 가져와 DRF 뷰로 감쌉니다)
# (CoolsmsException 등은 pip install coolsms-python-sdk 필요)
import os
import random
from sdk.api.message import Message
from sdk.exceptions import CoolsmsException
from .models import VerificationCode
from datetime import datetime, timedelta, timezone

class SendVerificationSMSView(views.APIView):
    """
    FastAPI의 /auth/send-verification-sms  로직을 변환
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        phone = request.data.get('phone')
        if not phone:
            return Response({"detail": "휴대폰 번호가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(phone=phone).exists():
            return Response({"detail": "이미 가입된 휴대폰 번호입니다."}, status=status.HTTP_400_BAD_REQUEST)

        sms_api_key = os.getenv("COOLSMS_API_KEY")
        sms_api_secret = os.getenv("COOLSMS_API_SECRET")
        sms_sender_phone = os.getenv("COOLSMS_SENDER_PHONE")

        if not all([sms_api_key, sms_api_secret, sms_sender_phone]):
            return Response({"detail": "SMS 서비스 환경 변수를 찾을 수 없습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        code = str(random.randint(100000, 999999))
        params = {'to': phone, 'from': sms_sender_phone, 'text': f"[밴디콘] 인증번호는 [{code}] 입니다.", 'type': 'SMS'}

        try:
            cool = Message(sms_api_key, sms_api_secret)
            response = cool.send(params)
            
            if "error_list" in response or response.get("success_count", 0) != 1:
                 error_message = response.get("error_list", "알 수 없는 오류가 발생했습니다.")
                 return Response({"detail": str(error_message)}, status=status.HTTP_400_BAD_REQUEST)
            
            # crud.create_verification_code  로직
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
            VerificationCode.objects.update_or_create(
                phone=phone,
                defaults={'code': code, 'expires_at': expires_at}
            )
            return Response({"success": True, "message": "인증번호가 발송되었습니다."})

        except CoolsmsException as e:
            return Response({"detail": f"SMS 발송 실패: {e.msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"detail": f"SMS 발송 중 서버 오류 발생: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifySMSCodeView(views.APIView):
    """
    FastAPI의 /auth/verify-sms-code  로직을 변환
    """
    permission_classes = [AllowAny]

    def post(self, request: Request):
        phone = request.data.get('phone')
        code = request.data.get('code')
        if not phone or not code:
            return Response({"detail": "휴대폰 번호와 코드가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        # crud.verify_phone_code  로직
        try:
            db_code = VerificationCode.objects.get(phone=phone)
            if datetime.now(timezone.utc) > db_code.expires_at or db_code.code != code:
                raise VerificationCode.DoesNotExist
            
            db_code.delete() # 인증 성공 시 코드 삭제
            return Response({"success": True, "message": "인증에 성공했습니다."})
        except VerificationCode.DoesNotExist:
            return Response({"detail": "인증번호가 올바르지 않거나 만료되었습니다."}, status=status.HTTP_400_BAD_REQUEST)


# --- 3. 프로필 (FastAPI의 /profile/... ) ---
class UserProfileAPIView(views.APIView):
    """
    FastAPI의 /profile/{nickname}  로직을 변환.
    (로그인 응답과 동일한 데이터를 반환)
    """
    permission_classes = [AllowAny] # (테스트를 위해 AllowAny, 추후 IsAuthenticated로 변경)

    def get(self, request: Request, nickname: str):
        user = get_object_or_404(User, nickname=nickname)
        
        # FastAPI의 응답 형식 과 동일하게 clans 정보 조합
        # (owned_clan은 related_name="owned_clan"으로 User 모델에 자동 추가됨)
        all_clans = list(user.clan.all())
        if hasattr(user, 'owned_clan') and user.owned_clan:
            if user.owned_clan not in all_clans:
                all_clans.append(user.owned_clan)
        
        clans_info = [{"id": c.id, "name": c.name} for c in all_clans]

        return Response({
            "id": user.username,
            "nickname": user.nickname,
            "role": user.role,
            "clans": clans_info
        })


# user_app/views.py

class UpdateNicknameAPIView(views.APIView):
    """
    FastAPI의 /profile/update-nickname [cite: 823-1498] 로직을 변환.
    """
    permission_classes = [IsAuthenticated] # <-- 권한 변경

    def put(self, request: Request):
        serializer = NicknameUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        current_nickname = serializer.validated_data['current_nickname']
        new_nickname = serializer.validated_data['new_nickname']

        # [!] 토큰 소유자와 닉네임이 일치하는지 확인
        if request.user.nickname != current_nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        user = request.user # get_object_or_404(User, nickname=current_nickname)
        
        # crud.update_user_nickname 의 중복 확인 로직
        if User.objects.filter(nickname=new_nickname).exists():
            return Response({"detail": "이미 사용 중인 닉네임입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # --- 👇 crud  의존성 제거 ---
        user.nickname = new_nickname
        user.save()
        
        # TODO: FastAPI의 crud.update_user_nickname 처럼
        # Room, Session, Chat, Alert 등의 테이블에 저장된
        # 'old_nickname'도 'new_nickname'으로 변경하는 로직 추가 필요
        # (Celery를 사용한 비동기 작업으로 처리하는 것을 권장)
        
        # 헬퍼 함수를 사용해 FastAPI와 동일한 응답 반환
        response_data = get_user_profile_response(user)
        return Response(response_data)
        # --- 👆 변경 완료 ---
# (UploadProfileImageView는 파일 처리 로직이 필요하므로 추후 추가)
class UploadProfileImageView(views.APIView):
    """
    POST: FastAPI의 /profile/{nickname}/upload-image 
    FastAPI의 handle_image_upload  로직을 Django 스타일로 변환.
    """
    permission_classes = [AllowAny] # (추후 IsAuthenticated로 변경)
    parser_classes = [parsers.MultiPartParser] # 폼 데이터(이미지) 파싱

    def post(self, request: Request, nickname: str):
        user = get_object_or_404(User, nickname=nickname)
        
        # 1. 파일 가져오기 (FastAPI의 file: UploadFile = File(...) )
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "파일이 전송되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. 파일명/경로 생성 (FastAPI의 handle_image_upload  로직)
        subfolder = "profiles"
        ext = os.path.splitext(file.name)[1].lower()
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        if ext not in allowed_extensions:
            return Response({"detail": "지원하지 않는 이미지 형식입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        filename = f"{uuid.uuid4()}{ext}"
        save_path = os.path.join(subfolder, filename) # 예: "profiles/uuid.png"

        try:
            # 3. 파일 저장 (Django의 default_storage 사용)
            # (이 코드는 settings.py의 MEDIA_ROOT 폴더에 저장합니다)
            file_path = default_storage.save(save_path, ContentFile(file.read()))
            
            # 4. DB에 URL 저장 (FastAPI의 crud.update_user_profile_image [cite: 689-2169])
            # settings.py의 MEDIA_URL을 사용 (예: /media/profiles/uuid.png)
            image_url = default_storage.url(file_path)
            
            user.profile_img = image_url
            user.save()

            # 5. FastAPI와 동일한 유저 정보 응답 반환 
            all_clans = list(user.clan.all())
            if hasattr(user, 'owned_clan') and user.owned_clan:
                 if user.owned_clan not in all_clans:
                    all_clans.append(user.owned_clan)
            clans_info = [{"id": c.id, "name": c.name} for c in all_clans]

            return Response({
                "id": user.username,
                "nickname": user.nickname,
                "role": user.role,
                "clans": clans_info,
                "profile_img": user.profile_img # 새로 업데이트된 URL
            })

        except Exception as e:
            return Response({"detail": f"파일 저장 실패: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# --- 4. 친구 (FastAPI의 /friends/... ) ---
class FriendListView(views.APIView):
    """
    FastAPI의 /friends/{nickname} [cite: 823-1498] 로직을 변환.
    (77단계에서 누락되었던 뷰)
    """
    permission_classes = [IsAuthenticated] # <-- 권한 변경

    def get(self, request: Request, nickname: str):
        # [!] 토큰 소유자와 닉네임이 일치하는지 확인 (보안 강화)
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(
            User.objects.prefetch_related(
                'friends', 
                'received_friend_requests__sender'
            ), 
            nickname=nickname
        )
        
        friends = user.friends.all()
        pending_requests = user.received_friend_requests.filter(status='pending')
        
        serializer = FriendsListSerializer({
            "friends": friends,
            "pending_requests": pending_requests
        })
        return Response(serializer.data)
# (SendFriendRequestView, AcceptFriendRequestView 등은 추후 추가)

# --- 5. 알림 & 푸시 (FastAPI의 /alerts/..., /register-device ) ---
# (이 로직들은 대부분 FastAPI의 crud , notify  함수를 호출해야 하므로,
#  우선 간단한 뷰만 정의합니다.)

# --- 5. 알림 & 푸시 (FastAPI의 /register-device [cite: 823-1498]) ---
class RegisterDeviceView(views.APIView):
    """
    FastAPI의 /register-device [cite: 823-1498] 로직을 변환.
    (77단계에서 누락되었던 뷰)
    """
    permission_classes = [IsAuthenticated] # <-- 권한 변경
    
    def post(self, request: Request):
        token = request.data.get('token')
        nickname = request.data.get('nickname')
        
        # [!] 토큰 소유자와 닉네임이 일치하는지 확인 (보안 강화)
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        
        # crud.create_or_update_device_token  로직 (Django ORM)
        DeviceToken.objects.update_or_create(
            token=token,
            defaults={'user': user}
        )
        return Response({"success": True})
    
class AlertListView(views.APIView):
    """
    FastAPI의 /alerts/{user_nickname}  로직을 변환.
    """
    permission_classes = [AllowAny] # (추후 IsAuthenticated로 변경)
    
    def get(self, request: Request):
        # React가 닉네임을 쿼리 파라미터로 보낸다고 가정
        nickname = request.query_params.get('nickname') 
        if not nickname:
            return Response({"detail": "닉네임이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # (임시) FastAPI의 crud 함수 활용
        db = next(get_db())
        user = crud.get_current_user(db, nickname=nickname)
        alerts = db.query(models.Alert).filter(
            models.Alert.user_nickname == user.nickname,
            models.Alert.is_read == False
        ).order_by(models.Alert.created_at.asc()).all()
        db.close()
        
        # (임시) Pydantic 모델을 dict로 변환 (스키마가 없으므로)
        alert_list = [{"id": a.id, "message": a.message, "related_url": a.related_url, "is_read": a.is_read, "created_at": a.created_at} for a in alerts]
        return Response(alert_list)


# user_app/views.py

class AlertListView(views.APIView):
    """
    FastAPI의 /alerts/{user_nickname} [cite: 823-1498] 로직을 변환.
    """
    permission_classes = [IsAuthenticated] # <-- 권한 변경

    def get(self, request: Request):
        # React가 닉네임을 쿼리 파라미터로 보냄
        nickname = request.query_params.get('nickname') 
        if not nickname:
            return Response({"detail": "닉네임이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # [!] 토큰 소유자와 닉네임이 일치하는지 확인 (보안 강화)
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # --- 👇 Django ORM으로 변경 ---
        alerts = Alert.objects.filter(
            user_nickname=nickname,
            is_read=False
        ).order_by('created_at')
        
        # (임시) Pydantic 모델을 dict로 변환 (스키마가 없으므로)
        # (AlertSerializer를 만들어서 사용하는 것이 더 좋습니다)
        alert_list = [
            {"id": a.id, "message": a.message, "related_url": a.related_url, 
             "is_read": a.is_read, "created_at": a.created_at} 
            for a in alerts
        ]
        return Response(alert_list)
        # --- 👆 변경 완료 ---
# (UploadProfileImageView, FriendRequest 뷰 등 나머지 뷰는 생략)
# Create your views here.
# user_app/views.py 파일 맨 아래에 추가

# --- 👇 유저 정보 응답을 위한 헬퍼 함수 (중복 제거) ---



# user_app/views.py

# ... (파일 상단의 다른 import들) ...

# --- 👇 77단계에서 추가했던 헬퍼 함수를 이 내용으로 덮어쓰세요 ---
def get_user_profile_response(user):
    """
    FastAPI의 /login [cite: 823-1498] 또는 /profile/{nickname} [cite: 823-1498] 응답과
    동일한 JSON 구조를 반환합니다.
    """
    
    # 1. 사용자가 '멤버'로 속한 클랜 목록 (QuerySet)
    #    (clan_app.models.Clan의 members M2M 필드, related_name='clan')
    member_clans = user.clan.all()

    # 3. 사용자가 '소유한' 클랜 (Clan 객체 or None)
    #    (clan_app.models.Clan의 owner FK 필드, related_name='owned_clan')
    owned_clan = user.owned_clan.all() 
    
    # 2. 이 QuerySet을 실제 Clan 객체 리스트로 변환
    all_clans = (member_clans | owned_clan) #list(member_clans)
    
    # 4. 소유한 클랜이 있고, 그 클랜이 멤버 목록에 아직 없다면 추가
    if owned_clan and (owned_clan not in all_clans):
       # (member_clans | owned_clans) -> 두 쿼리셋을 합칩니다.
        # .distinct() -> 중복된 클랜(소유자이면서 멤버인 경우)을 제거합니다.
        all_clans = (member_clans | owned_clan).distinct()
    
    # 5. 최종 클랜 객체 리스트를 JSON 형식으로 변환
    clans_info = [{"id": c.id, "name": c.name} for c in all_clans]

    return {
        "id": user.username,
        "nickname": user.nickname,
        "role": user.role,
        "clans": clans_info
    }
# --- 👆 ---

# ... (UserCreateAPIView, MeAPIView 등 나머지 뷰 클래스들) ...



#def get_user_profile_response(user):
    """
    FastAPI의 /login 또는 /profile/{nickname} 응답과
    동일한 JSON 구조를 반환합니다.
    """
"""    # user.clan (ManyToMany)과 user.owned_clan (ForeignKey 역참조)을 모두 조회
    all_clans = list(user.clan.all())
    if hasattr(user, 'owned_clan') and user.owned_clan:
        if user.owned_clan not in all_clans:
            all_clans.append(user.owned_clan)
    
    clans_info = [{"id": c.id, "name": c.name} for c in all_clans]

    return {
        "id": user.username,
        "nickname": user.nickname,
        "role": user.role,
        "clans": clans_info
    }"""
# --- 👆 ---


# --- 👇 파일 맨 아래에 MeAPIView 클래스 추가 ---
class MeAPIView(views.APIView):
    """
    GET: /api/v1/users/me/
    토큰을 기반으로 "내" 정보를 반환합니다.
    (React의 2단계 로그인 로직에서 사용)
    """
    permission_classes = [IsAuthenticated] # [!] 인증된 유저만 접근 가능

    def get(self, request: Request):
        # IsAuthenticated 권한 덕분에 request.user에
        # 토큰의 소유자(User 모델 객체)가 자동으로 담겨 있습니다.
        user = request.user
        
        # 헬퍼 함수를 사용해 FastAPI와 동일한 응답 반환
        response_data = get_user_profile_response(user)
        return Response(response_data)
# --- 👆 ---

# --- 6. 프로필 이미지 업로드 (FastAPI의 /profile/.../upload-image [cite: 823-1498]) ---
class UploadProfileImageView(views.APIView):
    """
    POST: FastAPI의 /profile/{nickname}/upload-image [cite: 823-1498]
    (77단계에서 누락되었던 뷰)
    """
    permission_classes = [IsAuthenticated] # <-- 권한 변경
    parser_classes = [parsers.MultiPartParser] # 폼 데이터(이미지) 파싱

    def post(self, request: Request, nickname: str):
        # [!] 토큰 소유자와 닉네임이 일치하는지 확인 (보안 강화)
        if request.user.nickname != nickname:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "파일이 전송되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # (FastAPI의 handle_image_upload [cite: 823-1498] 로직)
        subfolder = "profiles"
        ext = os.path.splitext(file.name)[1].lower()
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        if ext not in allowed_extensions:
            return Response({"detail": "지원하지 않는 이미지 형식입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        filename = f"{uuid.uuid4()}{ext}"
        save_path = os.path.join(subfolder, filename) 

        try:
            file_path = default_storage.save(save_path, ContentFile(file.read()))
            image_url = default_storage.url(file_path)
            
            user.profile_img = image_url
            user.save()

            # (헬퍼 함수 사용)
            response_data = get_user_profile_response(user)
            # (profile_img는 FastAPI 응답 [cite: 823-1498]에 맞춰 별도로 추가)
            response_data['profile_img'] = user.profile_img 
            
            return Response(response_data)

        except Exception as e:
            return Response({"detail": f"파일 저장 실패: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)