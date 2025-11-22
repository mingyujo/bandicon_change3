# user_app/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserDevice, FriendRequest, DirectChat, Alert

User = get_user_model() # 👈 [신규]

# --- 👇 [신규] (12:42 응답) ---
class UserBaseSerializer(serializers.ModelSerializer):
    """
    다른 Serializer에서 중첩으로 사용될 최소한의 유저 정보
    (board_app, clan_app 등에서 사용)
    """
    class Meta:
        model = User
        fields = ('id', 'nickname', 'profile_img')
# --- 👆 [신규] ---

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # (기존 로직 유지)
        return token

class UserCreateSerializer(serializers.ModelSerializer): # SignupSerializer로 이름 변경 고려
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'username', 
            'password', 
            'nickname', 
            'email', 
            'phone_number', # phone_number 필드 추가 (모델에 있다면)
            'introduction', 
            'instruments', 
            'genres', 
            'region', 
            'marketing_consent',
            'role' # role 필드 추가 (모델에 있다면)
        )
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        # role 처리 (기본값 MEMBER)
        role = validated_data.pop('role', 'MEMBER')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            nickname=validated_data['nickname'],
            email=validated_data['email'],
            phone_number=validated_data.get('phone_number', ''),
            introduction=validated_data.get('introduction', ''),
            instruments=validated_data.get('instruments', []),
            genres=validated_data.get('genres', []),
            region=validated_data.get('region', ''),
            marketing_consent=validated_data.get('marketing_consent', False),
            is_active=True, # 기본 활성화
            role=role
        )
        return user
# SignupView에서 사용할 Serializer 이름 맞추기 (별칭 사용)
SignupSerializer = UserCreateSerializer
class NicknameUpdateSerializer(serializers.Serializer):
    current_nickname = serializers.CharField()
    new_nickname = serializers.CharField()

class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = ('fcm_token',) # 👈 [수정] token -> fcm_token

class FriendRequestSerializer(serializers.ModelSerializer):
    """
    (12:37 응답)
    """
    # 👇 [수정] (12:42 응답) UserBaseSerializer 사용
    from_user = UserBaseSerializer(read_only=True)
    to_user = UserBaseSerializer(read_only=True)
    # 👆 [수정]

    class Meta:
        model = FriendRequest
        fields = ('id', 'from_user', 'to_user', 'status', 'created_at')

class FriendsListSerializer(serializers.Serializer):
    """
    (12:37 응답)
    """
    # 👇 [수정] (12:42 응답) UserBaseSerializer 사용
    friends = UserBaseSerializer(many=True, read_only=True)
    pending_requests = FriendRequestSerializer(many=True, read_only=True)
    # 👆 [수정]

class DirectChatSerializer(serializers.ModelSerializer):
    # (기존 로직 유지)
    class Meta:
        model = DirectChat
        fields = ('id', 'sender', 'receiver', 'message', 'timestamp', 'file_url')
        read_only_fields = ['id', 'timestamp']

# ▼▼▼ [4순위 작업] 알림 시리얼라이저 추가 ▼▼▼
class AlertSerializer(serializers.ModelSerializer):
    """
    user_app의 Alert 모델을 위한 시리얼라이저
    """
    class Meta:
        model = Alert
        # (user_app.Alert 모델이 이 필드들을 가지고 있다고 가정합니다)
        fields = ['id', 'user', 'message', 'link_url', 'is_read', 'created_at']
        # 'is_read'는 읽음 처리(PUT)를 위해 read_only가 아님
        read_only_fields = ['user', 'message', 'link_url', 'created_at']
# ▲▲▲ [4순위 작업] ▲▲▲