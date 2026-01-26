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
     # [수정] 회원가입 폼에서 받지 않는 필드들은 required=False로 설정하거나 read_only로 뺍니다.
    phone_number = serializers.CharField(required=False, allow_blank=True)
    marketing_consent = serializers.BooleanField(required=False, default=False)
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
            'role', # role 필드 추가 (모델에 있다면)
            'status'
        )
        extra_kwargs = {
            'password': {'write_only': True}
        }
        read_only_fields = ['status']
    def create(self, validated_data):
        # role 처리 (기본값 USER)
        role = validated_data.pop('role', 'USER')
        
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

class UserProfileSerializer(serializers.ModelSerializer):
    clan_affiliations = serializers.SerializerMethodField()
    mood_maker_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'nickname', 'email', 'profile_img', 
            'introduction', 'instruments', 'genres', 'region', 'score', 'role',
            'clan_affiliations', # 👈 추가
            'mood_maker_count'   # 👈 추가
        )
        read_only_fields = ('id', 'username', 'email', 'score', 'role')

    def get_mood_maker_count(self, obj):
        from room_app.models import Evaluation
        return Evaluation.objects.filter(target=obj, is_mood_maker=True).count()

    def get_clan_affiliations(self, obj):
        # 1. 유저가 속한 모든 클랜 (멤버, 운영진, 소유자 포함)
        # related_name: clans(멤버), admin_clans(운영진), owned_clans(소유자)
        
        affiliations = []
        
        # (1) 소유한 클랜 (OWNER)
        for clan in obj.owned_clans.all():
            affiliations.append({
                "clan_id": clan.id,
                "clan_name": clan.name,
                "role": "OWNER"
            })
            
        # (2) 운영진인 클랜 (ADMIN)
        for clan in obj.admin_clans.all():
            # 이미 OWNER로 추가된 경우 중복 방지 (보통 소유자는 admin_clans에 포함 안됨)
            if not any(a['clan_id'] == clan.id for a in affiliations):
                affiliations.append({
                    "clan_id": clan.id,
                    "clan_name": clan.name,
                    "role": "ADMIN"
                })
                
        # (3) 일반 멤버인 클랜 (MEMBER)
        for clan in obj.clans.all():
             if not any(a['clan_id'] == clan.id for a in affiliations):
                affiliations.append({
                    "clan_id": clan.id,
                    "clan_name": clan.name,
                    "role": "MEMBER"
                })
                
        return affiliations

class NicknameUpdateSerializer(serializers.Serializer):
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
    sender = serializers.SlugRelatedField(slug_field='nickname', queryset=User.objects.all())
    receiver = serializers.SlugRelatedField(slug_field='nickname', queryset=User.objects.all())

    class Meta:
        model = DirectChat
        fields = ('id', 'sender', 'receiver', 'message', 'timestamp', 'file_url', 'is_read')
        read_only_fields = ['id', 'timestamp']

# ▼▼▼ [4순위 작업] 알림 시리얼라이저 추가 ▼▼▼
class AlertSerializer(serializers.ModelSerializer):
    """
    user_app의 Alert 모델을 위한 시리얼라이저
    """
    class Meta:
        model = Alert
        # (user_app.Alert 모델이 이 필드들을 가지고 있다고 가정합니다)
        # [수정] 프론트엔드에서 알림 타입 구분(평가 모달 띄우기) 위해 alert_type, related_id 추가
        fields = ['id', 'user', 'message', 'alert_type', 'related_id', 'related_url', 'is_read', 'created_at']
        # 'is_read'는 읽음 처리(PUT)를 위해 read_only가 아님
        read_only_fields = ['user', 'message', 'alert_type', 'related_id', 'related_url', 'created_at']
# ▲▲▲ [4순위 작업] ▲▲▲